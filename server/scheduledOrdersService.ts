import { db } from './db';
import { scheduledOrders, orders, users, businesses } from '@shared/schema-mysql';
import { eq, and, lte, gte } from 'drizzle-orm';

// Helper function to send SMS notifications
async function sendNotificationSMS(phone: string, message: string): Promise<void> {
  try {
    const { sendVerificationSMS } = await import('./smsService');
    // Use the existing SMS infrastructure to send a notification
    console.log(`📱 Sending SMS to ${phone}: ${message}`);
    // In production, this would use Twilio messaging API
    // For now, just log it
  } catch (error) {
    console.error('Failed to send notification SMS:', error);
  }
}

interface ScheduledOrderData {
  userId: string;
  businessId: string;
  items: any[];
  scheduledFor: Date;
  deliveryAddress: string;
  deliveryLatitude?: string;
  deliveryLongitude?: string;
  paymentMethod: 'card' | 'cash';
  notes?: string;
}

export async function createScheduledOrder(
  data: ScheduledOrderData
): Promise<string> {
  const now = new Date();
  const scheduledTime = new Date(data.scheduledFor);

  // Validar que la fecha sea futura
  if (scheduledTime <= now) {
    throw new Error('La fecha programada debe ser futura');
  }

  // Validar que sea al menos 1 hora en el futuro
  const minTime = new Date(now.getTime() + 60 * 60 * 1000);
  if (scheduledTime < minTime) {
    throw new Error('Los pedidos deben programarse con al menos 1 hora de anticipación');
  }

  // Validar que no sea más de 7 días en el futuro
  const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (scheduledTime > maxTime) {
    throw new Error('Los pedidos no pueden programarse con más de 7 días de anticipación');
  }

  const result = await db
    .insert(scheduledOrders)
    .values({
      userId: data.userId,
      businessId: data.businessId,
      items: JSON.stringify(data.items),
      scheduledFor: scheduledTime,
      deliveryAddress: data.deliveryAddress,
      deliveryLatitude: data.deliveryLatitude,
      deliveryLongitude: data.deliveryLongitude,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      status: 'pending',
    });

  // Get the inserted ID using $returningId pattern for MySQL
  const insertedId = result[0].insertId;
  
  // Fetch the created order to get its UUID
  const [created] = await db
    .select()
    .from(scheduledOrders)
    .orderBy(scheduledOrders.createdAt)
    .limit(1);

  return created?.id || insertedId.toString();
}

export async function processScheduledOrders(): Promise<void> {
  const now = new Date();
  const processingWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos

  // Obtener pedidos que deben procesarse
  const pendingOrders = await db
    .select()
    .from(scheduledOrders)
    .where(
      and(
        eq(scheduledOrders.status, 'pending'),
        lte(scheduledOrders.scheduledFor, processingWindow)
      )
    );

  for (const scheduled of pendingOrders) {
    try {
      // Verificar que el negocio esté abierto
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, scheduled.businessId))
        .limit(1);

      if (!business || !business.isOpen) {
        await markScheduledOrderFailed(
          scheduled.id,
          'El negocio no está disponible'
        );
        continue;
      }

      // Crear el pedido real
      const items = JSON.parse(scheduled.items);
      const total = items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0
      );

      const orderResult = await db
        .insert(orders)
        .values({
          userId: scheduled.userId,
          businessId: scheduled.businessId,
          businessName: business.name,
          items: scheduled.items,
          total,
          subtotal: total,
          deliveryFee: 0,
          deliveryAddress: scheduled.deliveryAddress,
          paymentMethod: scheduled.paymentMethod,
          notes: scheduled.notes,
          status: 'pending',
        });

      // Get the new order ID
      const orderId = orderResult[0].insertId.toString();

      // Marcar como procesado
      await db
        .update(scheduledOrders)
        .set({ 
          status: 'processed',
          orderId: orderId,
        })
        .where(eq(scheduledOrders.id, scheduled.id));

      // Notificar al usuario
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, scheduled.userId))
        .limit(1);

      if (user?.phone) {
        await sendNotificationSMS(
          user.phone,
          `¡Tu pedido programado ha sido creado! Pedido #${orderId} de ${business.name}. Síguelo en la app.`
        );
      }

    } catch (error) {
      console.error(`Error processing scheduled order ${scheduled.id}:`, error);
      await markScheduledOrderFailed(
        scheduled.id,
        'Error al procesar el pedido'
      );
    }
  }
}

async function markScheduledOrderFailed(
  scheduledOrderId: string,
  reason: string
): Promise<void> {
  await db
    .update(scheduledOrders)
    .set({ 
      status: 'failed',
      notes: reason,
    })
    .where(eq(scheduledOrders.id, scheduledOrderId));

  // Notificar al usuario
  const [scheduled] = await db
    .select()
    .from(scheduledOrders)
    .where(eq(scheduledOrders.id, scheduledOrderId))
    .limit(1);

  if (scheduled) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, scheduled.userId))
      .limit(1);

    if (user?.phone) {
      await sendNotificationSMS(
        user.phone,
        `Tu pedido programado no pudo ser procesado: ${reason}. Por favor intenta de nuevo.`
      );
    }
  }
}

export async function sendScheduledOrderReminders(): Promise<void> {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora

  const upcomingOrders = await db
    .select()
    .from(scheduledOrders)
    .where(
      and(
        eq(scheduledOrders.status, 'pending'),
        gte(scheduledOrders.scheduledFor, now),
        lte(scheduledOrders.scheduledFor, reminderWindow)
      )
    );

  for (const scheduled of upcomingOrders) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, scheduled.userId))
      .limit(1);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, scheduled.businessId))
      .limit(1);

    if (user?.phone && business) {
      const timeUntil = Math.round(
        (scheduled.scheduledFor.getTime() - now.getTime()) / (1000 * 60)
      );

      await sendNotificationSMS(
        user.phone,
        `Recordatorio: Tu pedido de ${business.name} será procesado en ${timeUntil} minutos.`
      );
    }
  }
}

export async function cancelScheduledOrder(
  scheduledOrderId: string,
  userId: string
): Promise<void> {
  const [scheduled] = await db
    .select()
    .from(scheduledOrders)
    .where(
      and(
        eq(scheduledOrders.id, scheduledOrderId),
        eq(scheduledOrders.userId, userId)
      )
    )
    .limit(1);

  if (!scheduled) {
    throw new Error('Pedido programado no encontrado');
  }

  if (scheduled.status !== 'pending') {
    throw new Error('Solo se pueden cancelar pedidos pendientes');
  }

  await db
    .update(scheduledOrders)
    .set({ status: 'cancelled' })
    .where(eq(scheduledOrders.id, scheduledOrderId));
}

export async function getUserScheduledOrders(userId: string) {
  return db
    .select()
    .from(scheduledOrders)
    .where(
      and(
        eq(scheduledOrders.userId, userId),
        eq(scheduledOrders.status, 'pending')
      )
    );
}

// Start background processors (only in production)
let processInterval: ReturnType<typeof setInterval> | null = null;
let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduledOrdersProcessor() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Scheduled orders processor disabled in development');
    return;
  }

  // Ejecutar cada 5 minutos
  processInterval = setInterval(() => {
    processScheduledOrders().catch(console.error);
  }, 5 * 60 * 1000);

  // Enviar recordatorios cada 15 minutos
  reminderInterval = setInterval(() => {
    sendScheduledOrderReminders().catch(console.error);
  }, 15 * 60 * 1000);

  console.log('Scheduled orders processor started');
}

export function stopScheduledOrdersProcessor() {
  if (processInterval) {
    clearInterval(processInterval);
    processInterval = null;
  }
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  console.log('Scheduled orders processor stopped');
}
