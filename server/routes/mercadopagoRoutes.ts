import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { mercadopagoAccounts, promotionTransactions, businesses, promotions } from "@shared/schema-mysql";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { MercadoPagoConfig, Preference } from 'mercadopago'; // ✅ SDK Oficial v2

const router = express.Router();

// Configuración de Mercado Pago unificada
const MP_CLIENT_ID = process.env.MERCADO_PAGO_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MERCADO_PAGO_CLIENT_SECRET || "";
const MP_REDIRECT_URI = process.env.MERCADO_PAGO_REDIRECT_URI || "https://astrobar-app-production-4821.up.railway.app/api/mercadopago/callback";
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || ""; // Token Maestro de AstroBar

// ==========================================
// 1. OAUTH - Iniciar vinculación de cuenta MP del bar
// ==========================================
router.get("/connect", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    // Construcción de la URL de autorización oficial de Mercado Pago
    const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${business.id}&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}`;

    // Si la llamada acepta HTML o viene de redirección directa de navegador:
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.redirect(authUrl);
    }

    // Si viene desde la App Móvil por API Client:
    res.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating MP auth URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CALLBACK - Recibir el código de autorización tras login en MP
// ==========================================
router.get("/callback", async (req, res) => {
  try {
    const { code, state: businessId } = req.query;

    if (!code || !businessId) {
      return res.status(400).send("Código de autorización o negocio faltante.");
    }

    // Intercambio de código temporal por Access Token del Vendedor
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
      console.error("Respuesta fallida de MP Token:", tokenData);
      throw new Error(tokenData.message || "No se pudo obtener el token de acceso de Mercado Pago.");
    }

    // Eliminar vinculación previa si existía para este bar
    await db.delete(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, businessId as string));

    // Guardar nuevas credenciales de la subcuenta en la base de datos
    const accountId = uuidv4();
    await db.insert(mercadopagoAccounts).values({
      id: accountId,
      businessId: businessId as string,
      mpUserId: String(tokenData.user_id),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      publicKey: tokenData.public_key,
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 15552000) * 1000),
      isActive: true,
    });

    console.log(`✅ Cuenta de Mercado Pago conectada con éxito para el Bar ID: ${businessId}`);

    // Página HTML de éxito amigable tanto para Web como para Celular
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conexión Exitosa - AstroBar</title>
        <style>
          body {
            background-color: #11011E;
            color: #FFFFFF;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
          }
          .card {
            background: #1A042B;
            border: 2px solid #F16A30;
            border-radius: 20px;
            padding: 30px;
            max-width: 360px;
            box-shadow: 0 0 30px rgba(241, 106, 48, 0.3);
          }
          h1 { color: #22c55e; font-size: 24px; margin-bottom: 10px; }
          p { color: #cbd5e1; font-size: 14px; line-height: 1.5; }
          .btn {
            display: inline-block;
            margin-top: 20px;
            background: #F16A30;
            color: #fff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>¡Mercado Pago Conectado! 🎉</h1>
          <p>Tu bar ya está listo para recibir pagos e ingresos automáticos por la venta de promociones.</p>
          <a href="astrobar://mp-connected?success=true" class="btn">Volver a AstroBar App</a>
        </div>
        <script>
          // Intenta redirigir a la App automáticamente
          setTimeout(function() {
            window.location.href = "astrobar://mp-connected?success=true";
          }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error in MP callback:", error);
    res.status(500).send(`
      <body style="background:#11011E;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
        <h2 style="color:#ef4444;">Error al conectar Mercado Pago</h2>
        <p>${error.message}</p>
        <a href="astrobar://mp-connected?success=false" style="color:#F16A30;">Volver a la App</a>
      </body>
    `);
  }
});

// ==========================================
// 3. ESTADO DE CONEXIÓN
// ==========================================
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

// ==========================================
// 4. DESCONECTAR CUENTA MP
// ==========================================
router.post("/disconnect", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    await db.delete(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, business.id));

    res.json({ success: true, message: "Cuenta de Mercado Pago desconectada con éxito" });
  } catch (error: any) {
    console.error("Error disconnecting MP:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. CREAR PAGO CON SPLIT MARKETPLACE (SDK Oficial v2 💎)
// ==========================================
router.post("/create-payment", authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const [transaction] = await db.select().from(promotionTransactions).where(eq(promotionTransactions.id, transactionId)).limit(1);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    const [mpAccount] = await db.select().from(mercadopagoAccounts).where(eq(mercadopagoAccounts.businessId, transaction.businessId)).limit(1);

    if (!mpAccount || !mpAccount.accessToken) {
      return res.status(400).json({ error: "El bar aún no vinculó su cuenta de Mercado Pago para recibir ventas." });
    }

    const { sql } = await import("drizzle-orm");
    const commissionResult: any = await db.execute(sql`
      SELECT platform_commission
      FROM business_commissions
      WHERE business_id = ${transaction.businessId}
      LIMIT 1
    `);
    
    let commissionRate = 0.30;
    if (commissionResult && commissionResult[0] && commissionResult[0][0] && commissionResult[0][0].platform_commission) {
      commissionRate = parseFloat(commissionResult[0][0].platform_commission) / 100;
    }

    const totalAmount = Number(transaction.amountPaid); 
    const platformFee = Number(transaction.platformCommission) || (totalAmount * commissionRate); 
    const businessAmount = totalAmount - platformFee; 

    console.log(`💰 Split Marketplace: Pago total $${totalAmount} | Bar recibe $${businessAmount} | Comisión AstroBar $${platformFee}`);

    // Inicialización pasándole el token específico del bar (vendedor)
    const barClient = new MercadoPagoConfig({ accessToken: mpAccount.accessToken });
    const mpPreference = new Preference(barClient);

    const result = await mpPreference.create({
      body: {
        items: [
          {
            id: String(transaction.id),
            title: "Promoción AstroBar",
            quantity: 1,
            unit_price: totalAmount,
            currency_id: 'ARS'
          },
        ],
        marketplace_fee: platformFee, // Comisión de AstroBar que va a tu cuenta administradora
        external_reference: String(transaction.id),
        notification_url: `https://astrobar-app-production-4821.up.railway.app/api/mercadopago/webhook`,
        back_urls: {
          success: `astrobar://payment-success`,
          failure: `astrobar://payment-failure`,
          pending: `astrobar://payment-pending`,
        },
        auto_return: "approved",
      }
    });

    res.json({
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point, 
      commission: `${(commissionRate * 100).toFixed(0)}%`,
      businessAmount,
      platformFee,
    });
  } catch (error: any) {
    console.error("Error creating MP payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. WEBHOOK - Recibir notificaciones de MP
// ==========================================
router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment" && data?.id) {
      const paymentId = data.id;

      // Consulta del pago usando el Token Maestro de AstroBar
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      const payment = await paymentResponse.json();

      if (payment.status === "approved") {
        const transactionId = payment.external_reference;

        await db.update(promotionTransactions)
          .set({ status: "confirmed" })
          .where(eq(promotionTransactions.id, transactionId));

        console.log(`✅ Pago aprobado y confirmado para la transacción ${transactionId}`);
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("Error processing MP webhook:", error);
    res.status(500).send("Error");
  }
});

// ==========================================
// 7. ADMIN - Ver todas las cuentas MP conectadas
// ==========================================
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

    const accounts = Array.isArray(result[0]) ? result[0] : result;

    res.json({ success: true, accounts });
  } catch (error: any) {
    console.error("Error fetching MP accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;