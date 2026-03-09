import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { mercadopagoAccounts, promotionTransactions, businesses, promotions } from "@shared/schema-mysql";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Configuración de Mercado Pago
const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET || "";
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI || "https://astrobar-backend.onrender.com/api/mp/callback";
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""; // Token de la plataforma

// 1. OAUTH - Conectar cuenta MP del bar
router.get("/connect", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    // Obtener negocio del usuario
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    // URL de autorización de Mercado Pago
    const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${business.id}&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}`;

    res.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating MP auth URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. CALLBACK - Recibir código de autorización
router.get("/callback", async (req, res) => {
  try {
    const { code, state: businessId } = req.query;

    if (!code || !businessId) {
      return res.status(400).send("Código o estado faltante");
    }

    // Intercambiar código por access_token
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: MP_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("No se pudo obtener access_token");
    }

    // Guardar en base de datos
    const accountId = uuidv4();
    await db.insert(mercadopagoAccounts).values({
      id: accountId,
      businessId: businessId as string,
      mpUserId: tokenData.user_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      publicKey: tokenData.public_key,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      isActive: true,
    });

    // Redirigir al frontend con éxito
    res.redirect(`astrobar://mp-connected?success=true`);
  } catch (error: any) {
    console.error("Error in MP callback:", error);
    res.redirect(`astrobar://mp-connected?success=false&error=${encodeURIComponent(error.message)}`);
  }
});

// 3. ESTADO DE CONEXIÓN
router.get("/status", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    const [mpAccount] = await db.select().from(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, business.id)).limit(1);

    if (!mpAccount) {
      return res.json({ success: true, connected: false });
    }

    res.json({
      success: true,
      connected: true,
      mpUserId: mpAccount.mpUserId,
      isActive: mpAccount.isActive,
      expiresAt: mpAccount.expiresAt,
    });
  } catch (error: any) {
    console.error("Error checking MP status:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. DESCONECTAR CUENTA MP
router.post("/disconnect", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    await db.delete(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, business.id));

    res.json({ success: true, message: "Cuenta desconectada" });
  } catch (error: any) {
    console.error("Error disconnecting MP:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. CREAR PAGO CON SPLIT (Usuario acepta promoción)
router.post("/create-payment", authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.body;

    // Obtener transacción
    const [transaction] = await db.select().from(promotionTransactions).where(eq(promotionTransactions.id, transactionId)).limit(1);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    // Obtener cuenta MP del bar
    const [mpAccount] = await db.select().from(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, transaction.businessId)).limit(1);

    if (!mpAccount) {
      return res.status(400).json({ error: "El bar no tiene Mercado Pago conectado" });
    }

    // Obtener comisión específica del bar
    const { sql } = await import("drizzle-orm");
    const commissionResult: any = await db.execute(sql`
      SELECT platform_commission
      FROM business_commissions
      WHERE business_id = ${transaction.businessId}
      LIMIT 1
    `);
    
    // Usar comisión del bar o 30% por defecto
    let commissionRate = 0.30;
    if (commissionResult && commissionResult[0] && commissionResult[0][0] && commissionResult[0][0].platform_commission) {
      commissionRate = parseFloat(commissionResult[0][0].platform_commission);
    }

    // Calcular montos (la transacción ya tiene los valores correctos)
    const totalAmount = transaction.amountPaid; // Total que paga el usuario
    const platformFee = transaction.platformCommission; // Comisión de la plataforma
    const businessAmount = transaction.businessRevenue; // Lo que recibe el bar

    console.log(`💰 Split: Usuario paga $${totalAmount/100} | Bar recibe $${businessAmount/100} | Plataforma $${platformFee/100} (${(commissionRate*100).toFixed(0)}%)`);

    // Crear preferencia de pago con split
    const preference = {
      items: [
        {
          title: "Promoción AstroBar",
          quantity: 1,
          unit_price: totalAmount / 100, // Convertir de centavos a pesos
        },
      ],
      marketplace_fee: platformFee / 100, // Comisión de la plataforma en pesos
      external_reference: transaction.id,
      notification_url: `https://astrobar-backend.onrender.com/api/mp/webhook`,
      back_urls: {
        success: `astrobar://payment-success`,
        failure: `astrobar://payment-failure`,
        pending: `astrobar://payment-pending`,
      },
      auto_return: "approved",
    };

    // Crear preferencia en MP
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccount.accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!data.id) {
      throw new Error("Error al crear preferencia de pago");
    }

    res.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point, // URL para abrir checkout de MP
      commission: `${(commissionRate*100).toFixed(0)}%`,
      businessAmount: businessAmount / 100,
      platformFee: platformFee / 100,
    });
  } catch (error: any) {
    console.error("Error creating MP payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. WEBHOOK - Recibir notificaciones de MP
router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const paymentId = data.id;

      // Obtener detalles del pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      const payment = await paymentResponse.json();

      if (payment.status === "approved") {
        const transactionId = payment.external_reference;

        // Actualizar transacción a confirmada
        await db.update(promotionTransactions)
          .set({ status: "confirmed" })
          .where(eq(promotionTransactions.id, transactionId));

        console.log(`✅ Pago aprobado para transacción ${transactionId}`);
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("Error processing MP webhook:", error);
    res.status(500).send("Error");
  }
});

// 7. ADMIN - Ver todas las cuentas MP conectadas
router.get("/admin/accounts", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { sql } = await import("drizzle-orm");
    
    const result: any = await db.execute(sql`
      SELECT 
        ma.id,
        ma.business_id as businessId,
        b.name as businessName,
        ma.mp_user_id as mpUserId,
        ma.is_active as isActive,
        ma.expires_at as expiresAt,
        ma.created_at as createdAt
      FROM mercadopago_accounts ma
      JOIN businesses b ON ma.business_id = b.id
      ORDER BY ma.created_at DESC
    `);

    const accounts = result[0] || [];

    res.json({ success: true, accounts });
  } catch (error: any) {
    console.error("Error fetching MP accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
