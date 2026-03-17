import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// CREAR PAGO CON CHECKOUT PRO + SPLIT (MARKETPLACE)
router.post("/create-payment", authenticateToken, requireRole("customer"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "transactionId requerido" });
    }

    // 1. Obtener datos de la transacción con comisión
    const txResult: any = await db.execute(sql`
      SELECT 
        pt.id,
        pt.amount_paid,
        pt.platform_commission,
        pt.business_revenue,
        pt.business_id,
        pt.promotion_id,
        p.title,
        p.promo_price,
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

    // 2. Obtener cuenta MP del bar (collector_id)
    const barMPResult: any = await db.execute(sql`
      SELECT mp_user_id, access_token
      FROM mercadopago_accounts
      WHERE business_id = ${transaction.business_id} AND is_active = true
      LIMIT 1
    `);

    if (!barMPResult[0] || barMPResult[0].length === 0) {
      return res.status(400).json({ 
        error: "El bar no tiene Mercado Pago configurado",
        hint: "El bar debe conectar su cuenta de Mercado Pago primero"
      });
    }

    const barMPUserId = barMPResult[0][0].mp_user_id;
    const productPrice = parseFloat(transaction.promo_price); // Precio del producto
    const platformFee = parseFloat(transaction.platform_commission); // Comisión de AstroBar
    const totalAmount = parseFloat(transaction.amount_paid); // Total que paga el cliente

    console.log('💰 Payment Split:');
    console.log('  - Product Price:', productPrice);
    console.log('  - Platform Fee:', platformFee);
    console.log('  - Total Amount:', totalAmount);
    console.log('  - Bar receives:', productPrice);
    console.log('  - AstroBar receives:', platformFee);

    // 3. Crear preference con SPLIT (Marketplace)
    const preference = {
      items: [
        {
          id: transaction.promotion_id,
          title: `${transaction.title} - ${transaction.business_name}`,
          description: `Promoción en ${transaction.business_name}`,
          quantity: 1,
          unit_price: productPrice, // Solo el precio del producto
          currency_id: "ARS",
        },
      ],
      payer: {
        email: req.user!.email,
        name: req.user!.name,
      },
      back_urls: {
        success: `astrobar://payment-success?transactionId=${transactionId}`,
        failure: `astrobar://payment-failure?transactionId=${transactionId}`,
        pending: `astrobar://payment-pending?transactionId=${transactionId}`,
      },
      auto_return: "approved",
      external_reference: transactionId,
      notification_url: `${BACKEND_URL}/api/webhooks/mercadopago`,
      
      // 🔥 MARKETPLACE SPLIT - Aquí está la magia
      marketplace: "AstroBar",
      marketplace_fee: platformFee, // AstroBar se queda con la comisión
      
      // Información adicional
      statement_descriptor: "AstroBar",
      binary_mode: false,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      
      // Metadata para tracking
      metadata: {
        transaction_id: transactionId,
        business_id: transaction.business_id,
        promotion_id: transaction.promotion_id,
        user_id: userId,
        platform_fee: platformFee,
        product_price: productPrice,
      },
    };

    console.log('📝 Creating Checkout Pro preference with split...');

    // 4. Crear preference en Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": transactionId, // Evitar duplicados
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpData.id) {
      console.error('❌ Mercado Pago error:', mpData);
      throw new Error(mpData.message || "Error al crear preference en Mercado Pago");
    }

    console.log('✅ Preference created:', mpData.id);

    // 5. Guardar preference_id en la transacción
    await db.execute(sql`
      UPDATE promotion_transactions
      SET 
        mp_payment_id = ${mpData.id},
        mp_preference_id = ${mpData.id},
        updated_at = NOW()
      WHERE id = ${transactionId}
    `);

    res.json({
      success: true,
      initPoint: mpData.init_point,
      preferenceId: mpData.id,
      sandboxInitPoint: mpData.sandbox_init_point, // Para testing
      amount: totalAmount,
      breakdown: {
        productPrice,
        platformFee,
        total: totalAmount,
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating payment:", error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Error al crear pago",
      details: error.response?.data || null,
    });
  }
});

// VERIFICAR ESTADO DE PAGO
router.get("/payment-status/:transactionId", authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    const result: any = await db.execute(sql`
      SELECT 
        pt.id,
        pt.status,
        pt.mp_payment_id,
        pt.amount_paid,
        pt.platform_commission,
        pt.business_revenue,
        pt.created_at,
        pt.redeemed_at,
        p.title,
        b.name as business_name
      FROM promotion_transactions pt
      JOIN promotions p ON pt.promotion_id = p.id
      JOIN businesses b ON pt.business_id = b.id
      WHERE pt.id = ${transactionId} AND pt.user_id = ${userId}
      LIMIT 1
    `);

    if (!result[0] || result[0].length === 0) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    const transaction = result[0][0];

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: parseFloat(transaction.amount_paid),
        platformFee: parseFloat(transaction.platform_commission),
        businessRevenue: parseFloat(transaction.business_revenue),
        title: transaction.title,
        businessName: transaction.business_name,
        createdAt: transaction.created_at,
        redeemedAt: transaction.redeemed_at,
      },
    });
  } catch (error: any) {
    console.error("Error getting payment status:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
