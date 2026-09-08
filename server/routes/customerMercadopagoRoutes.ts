import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const MP_CLIENT_ID = process.env.MERCADO_PAGO_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MERCADO_PAGO_CLIENT_SECRET || "";
const MP_REDIRECT_URI = process.env.MERCADO_PAGO_REDIRECT_URI || "https://astrobar-app-production-4821.up.railway.app/api/customer-mp/callback";

// 1. CONECTAR CUENTA MP - Cliente
router.get("/connect", authenticateToken, requireRole("customer"), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // URL de autorización de Mercado Pago
    const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${userId}&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}`;

    res.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating MP auth URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. CALLBACK - Recibir código de autorización
router.get("/callback", async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
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
      throw new Error(tokenData.message || "No se pudo obtener access_token");
    }

    // Guardar en base de datos
    const accountId = uuidv4();
    const { sql } = await import("drizzle-orm");
    
    await db.execute(sql`
      INSERT INTO customer_mercadopago_accounts 
      (id, user_id, mp_user_id, access_token, refresh_token, public_key, expires_at, is_active, created_at)
      VALUES (${accountId}, ${userId}, ${tokenData.user_id}, ${tokenData.access_token}, 
              ${tokenData.refresh_token || null}, ${tokenData.public_key || null}, 
              DATE_ADD(NOW(), INTERVAL ${tokenData.expires_in || 21600} SECOND), true, NOW())
      ON DUPLICATE KEY UPDATE 
        access_token = ${tokenData.access_token},
        refresh_token = ${tokenData.refresh_token || null},
        expires_at = DATE_ADD(NOW(), INTERVAL ${tokenData.expires_in || 21600} SECOND),
        is_active = true
    `);

    // Redirigir al frontend con respuesta HTML limpia + Deep Link
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Conexión Exitosa - AstroBar</title>
      </head>
      <body style="background-color:#11011E;color:#FFFFFF;font-family:sans-serif;text-align:center;padding-top:50px;">
        <h2>¡Billetera Vinculada con Éxito! 🎉</h2>
        <p>Redirigiendo a AstroBar App...</p>
        <a href="astrobar://mp-connected?success=true" style="color:#F16A30;font-weight:bold;">Volver a la App</a>
        <script>
          setTimeout(function() {
            window.location.href = "astrobar://mp-connected?success=true";
          }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error in MP callback:", error);
    res.redirect(`astrobar://mp-connected?success=false&error=${encodeURIComponent(error.message)}`);
  }
});

// 3. ESTADO DE CONEXIÓN - Cliente (Corregido y Normalizado)
router.get("/status", authenticateToken, requireRole("customer"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { sql } = await import("drizzle-orm");

    const result: any = await db.execute(sql`
      SELECT mp_user_id, is_active, created_at
      FROM customer_mercadopago_accounts
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    // Extraer filas de forma segura en MySQL
    const rows = Array.isArray(result[0]) ? result[0] : result;

    if (!rows || rows.length === 0) {
      return res.json({ success: true, connected: false });
    }

    const account = rows[0];

    // Verificar que la cuenta esté activa
    if (!account.is_active) {
      return res.json({ success: true, connected: false });
    }

    // Convertir fecha a string ISO de forma blindada
    let connectedAtFormatted = new Date().toISOString();
    if (account.created_at) {
      connectedAtFormatted = new Date(account.created_at).toISOString();
    }

    res.json({
      success: true,
      connected: true,
      mpUserId: String(account.mp_user_id),
      isActive: Boolean(account.is_active),
      connectedAt: connectedAtFormatted,
    });
  } catch (error: any) {
    console.error("Error checking MP status:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. DESCONECTAR CUENTA MP - Cliente
router.post("/disconnect", authenticateToken, requireRole("customer"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`
      DELETE FROM customer_mercadopago_accounts
      WHERE user_id = ${userId}
    `);

    res.json({ success: true, message: "Cuenta desconectada" });
  } catch (error: any) {
    console.error("Error disconnecting MP:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;