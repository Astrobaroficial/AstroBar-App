import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { supportChats, supportMessages } from '../shared/schema-mysql';
import { eq, desc } from 'drizzle-orm';

// Usando Replit AI Integrations para Gemini 2.5 Flash
const genAI = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const NEMY_CONTEXT = `
Eres un asistente de soporte para NEMY, una plataforma de delivery en Autlán, Jalisco, México.

INFORMACIÓN CLAVE:
- NEMY significa "vivir" en náhuatl
- Conectamos negocios locales, clientes y repartidores
- Comisiones: 15% del producto para NEMY, 100% del producto para el negocio, 100% del delivery para el repartidor
- Pagos con tarjeta (Stripe) o efectivo
- Autenticación solo por teléfono con SMS
- Zona de cobertura: Autlán y alrededores

FUNCIONALIDADES:
- Pedidos de comida y productos de mercado
- Seguimiento en tiempo real
- Sistema de reseñas
- Modo saturado para negocios (cuando están llenos)
- Menú 86 (productos agotados)
- Wallets internas para repartidores y negocios
- Pedidos programados
- Cupones de descuento

POLÍTICAS DE CANCELACIÓN:
- Pedido pendiente/confirmado: 100% reembolso
- Pedido en preparación: 80% reembolso
- Pedido listo: 50% reembolso
- Pedido recogido: Sin reembolso

TIEMPOS:
- Cronómetro de arrepentimiento: 60 segundos
- Llamada automática a negocio: 3 minutos si no confirma
- Retención de fondos anti-fraude: 1 hora

SOPORTE:
- Responde de manera amigable y profesional
- Usa emojis ocasionalmente 🚀
- Si no sabes algo, ofrece contactar a soporte humano
- Siempre en español
`;

const FAQS = `
PREGUNTAS FRECUENTES:

¿Cómo me registro?
- Solo necesitas tu número de teléfono
- Recibirás un código SMS de 4 dígitos
- Puedes activar login biométrico después

¿Cómo hago un pedido?
1. Explora negocios disponibles
2. Agrega productos al carrito
3. Confirma tu dirección de entrega
4. Elige método de pago (tarjeta o efectivo)
5. Confirma el pedido

¿Cuánto tarda la entrega?
- Depende de la distancia y disponibilidad
- Promedio: 30-45 minutos
- Puedes seguir tu pedido en tiempo real

¿Puedo cancelar un pedido?
- Sí, pero el reembolso depende del estado
- Tienes 60 segundos de arrepentimiento con reembolso completo
- Después aplican las políticas de cancelación

¿Cómo me convierto en repartidor?
- Regístrate en la app
- Sube tus documentos (INE, licencia, fotos)
- Proporciona tu CLABE bancaria
- Espera aprobación del equipo

¿Cómo cobro como repartidor?
- Ganas 15% de cada pedido
- Los fondos van a tu wallet interna
- Puedes retirar a tu cuenta bancaria

¿Cómo registro mi negocio?
- Contacta al equipo de NEMY
- Proporciona información del negocio
- Configura tu menú y horarios
- Conecta tu cuenta bancaria para recibir pagos
`;

export async function createSupportChat(userId: number): Promise<number> {
  const [chat] = await db
    .insert(supportChats)
    .values({
      userId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return chat.id;
}

export async function sendSupportMessage(
  chatId: number,
  userId: number,
  message: string
): Promise<string> {
  // Guardar mensaje del usuario
  await db.insert(supportMessages).values({
    chatId,
    userId,
    message,
    isBot: false,
    createdAt: new Date(),
  });

  // Obtener historial de conversación
  const history = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.chatId, chatId))
    .orderBy(desc(supportMessages.createdAt))
    .limit(10);

  // Construir historial para Gemini
  const chatMessages = history.reverse().map(msg => ({
    role: msg.isBot ? 'model' : 'user',
    parts: [{ text: msg.message }],
  }));

  try {
    const chat = model.startChat({
      history: chatMessages,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
      systemInstruction: NEMY_CONTEXT + '\n\n' + FAQS,
    });

    const result = await chat.sendMessage(message);
    const botResponse = result.response.text() || 
      'Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?';

    // Guardar respuesta del bot
    await db.insert(supportMessages).values({
      chatId,
      userId: null,
      message: botResponse,
      isBot: true,
      createdAt: new Date(),
    });

    // Actualizar timestamp del chat
    await db
      .update(supportChats)
      .set({ updatedAt: new Date() })
      .where(eq(supportChats.id, chatId));

    return botResponse;
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    const fallbackResponse = 
      'Disculpa, estoy teniendo problemas técnicos. ' +
      'Por favor contacta a soporte humano o intenta más tarde. 🙏';

    await db.insert(supportMessages).values({
      chatId,
      userId: null,
      message: fallbackResponse,
      isBot: true,
      createdAt: new Date(),
    });

    return fallbackResponse;
  }
}

export async function getChatHistory(chatId: number) {
  return db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.chatId, chatId))
    .orderBy(supportMessages.createdAt);
}

export async function closeSupportChat(chatId: number): Promise<void> {
  await db
    .update(supportChats)
    .set({ 
      status: 'closed',
      updatedAt: new Date(),
    })
    .where(eq(supportChats.id, chatId));
}

export async function escalateToHuman(chatId: number): Promise<void> {
  await db
    .update(supportChats)
    .set({ 
      status: 'escalated',
      updatedAt: new Date(),
    })
    .where(eq(supportChats.id, chatId));

  // Aquí podrías enviar notificación al equipo de soporte
  console.log(`Chat ${chatId} escalated to human support`);
}
