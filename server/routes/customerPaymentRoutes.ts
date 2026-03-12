import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";

// CREAR PAGO - Cliente paga con su cuenta MP
router.post("/create-payment", authenticateToken, requireRole("customer"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "transactionId requerido" });
    }

    // 1. Obtener access_token del cliente
    const accountResult: any = await db.execute(sql`
      SELECT access_token, mp_user_id 
      FROM customer_mercadopago_accounts
      WHERE user_id = ${userId} AND is_active = true
      LIMIT 1
    `);

    if (!accountResult[0] || accountResult[0].length === 0) {
      return res.status(400).json({ error: "No tienes cuenta de Mercado Pago conectada" });
    }

    const customerAccessToken = accountResult[0][0].access_token;

    // 2. Obtener datos de la transacción
    const txResult: any = await db.execute(sql`
      SELECT 
        pt.id,
        pt.amount_paid,
        pt.business_id,
        p.title,
        b.name as business_name
      FROM promotion_transactions pt
      JOIN promotions p ON pt.promotion_id = p.id
      JOIN businesses b ON pt.business_id = b.id
      WHERE pt.id = ${transactionId} AND pt.user_id = ${userId}
      LIMIT 1
    `);

    if (!txResult[0] || txResult[0].length === 0) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    const transaction = txResult[0][0];

    // 3. Obtener cuenta MP del bar para recibir el dinero
    const barMPResult: any = await db.execute(sql`
      SELECT mp_user_id, access_token
      FROM mercadopago_accounts
      WHERE business_id = ${transaction.business_id} AND is_active = true
      LIMIT 1
    `);

    if (!barMPResult[0] || barMPResult[0].length === 0) {
      return res.status(400).json({ error: "El bar no tiene Mercado Pago configurado" });
    }

    const barMPUserId = barMPResult[0][0].mp_user_id;

    // 4. Crear preference de pago
    const preference = {
      items: [
        {
          title: transaction.title,
          quantity: 1,
          unit_price: parseFloat(transaction.amount_paid),
          currency_id: "ARS",
        },
      ],
      payer: {
        email: req.user!.email,
      },
      back_urls: {
        success: `astrobar://payment-success?transactionId=${transactionId}`,
        failure: `astrobar://payment-failure?transactionId=${transactionId}`,
        pending: `astrobar://payment-pending?transactionId=${transactionId}`,
      },
      auto_return: "approved",
      external_reference: transactionId,
      notification_url: `${process.env.BACKEND_URL}/api/mp/webhook`,
      marketplace_fee: 0, // La comisión ya está incluida en amount_paid
      statement_descriptor: "AstroBar",
    };

    // 5. Crear preference en Mercado Pago usando access_token de AstroBar
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpData.id) {
      throw new Error("Error al crear preference en Mercado Pago");
    }

    // 6. Guardar preference_id en la transacción
    await db.execute(sql`
      UPDATE promotion_transactions
      SET mp_payment_id = ${mpData.id}
      WHERE id = ${transactionId}
    `);

    res.json({
      success: true,
      initPoint: mpData.init_point,
      preferenceId: mpData.id,
    });
  } catch (error: any) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: error.message || "Error al crear pago" });
  }
});

export default router;
