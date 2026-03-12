import express from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { promotionTransactions } from "@shared/schema-mysql";

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";

/**
 * Webhook de Mercado Pago
 * Recibe notificaciones cuando cambia el estado de un pago
 * 
 * Tipos de notificaciones:
 * - payment: Cambio en estado de pago
 * - merchant_order: Cambio en orden
 */
router.post("/webhook", async (req, res) => {
  try {
    console.log("🔔 Webhook MP recibido:", JSON.stringify(req.body, null, 2));
    
    const { type, action, data } = req.body;

    // Responder rápido a MP (200 OK)
    res.status(200).send("OK");

    // Procesar notificación de forma asíncrona
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      await processPaymentNotification(data?.id);
    }
  } catch (error: any) {
    console.error("❌ Error en webhook MP:", error);
    // Siempre responder 200 para que MP no reintente
    res.status(200).send("OK");
  }
});

/**
 * Procesar notificación de pago
 */
async function processPaymentNotification(paymentId: string) {
  if (!paymentId) {
    console.log("⚠️ Webhook sin payment ID");
    return;
  }

  try {
    console.log(`🔍 Consultando pago ${paymentId} en MP...`);

    // Obtener detalles del pago desde MP
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      throw new Error(`MP API error: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    console.log(`💳 Pago ${paymentId}:`, {
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    });

    const transactionId = payment.external_reference;
    if (!transactionId) {
      console.log("⚠️ Pago sin external_reference");
      return;
    }

    // Obtener transacción de la BD
    const { sql } = await import("drizzle-orm");
    const result: any = await db.execute(sql`
      SELECT id, status, mp_payment_id
      FROM promotion_transactions
      WHERE id = ${transactionId}
      LIMIT 1
    `);

    if (!result[0] || result[0].length === 0) {
      console.log(`⚠️ Transacción ${transactionId} no encontrada en BD`);
      return;
    }

    const transaction = result[0][0];
    console.log(`📦 Transacción actual:`, {
      id: transaction.id,
      status: transaction.status,
      mp_payment_id: transaction.mp_payment_id,
    });

    // Actualizar según estado del pago
    let newStatus = transaction.status;
    let updateData: any = {
      mp_payment_id: paymentId,
    };

    switch (payment.status) {
      case "approved":
        newStatus = "pending_redemption";
        console.log(`✅ Pago aprobado - Transacción ${transactionId} lista para canje`);
        break;

      case "pending":
        newStatus = "pending_payment";
        console.log(`⏳ Pago pendiente - Transacción ${transactionId}`);
        break;

      case "in_process":
        newStatus = "pending_payment";
        console.log(`🔄 Pago en proceso - Transacción ${transactionId}`);
        break;

      case "rejected":
      case "cancelled":
        newStatus = "cancelled";
        console.log(`❌ Pago ${payment.status} - Transacción ${transactionId} cancelada`);
        break;

      case "refunded":
      case "charged_back":
        newStatus = "refunded";
        console.log(`💸 Pago reembolsado - Transacción ${transactionId}`);
        break;

      default:
        console.log(`⚠️ Estado desconocido: ${payment.status}`);
        return;
    }

    // Solo actualizar si cambió el estado
    if (newStatus !== transaction.status) {
      updateData.status = newStatus;
      
      await db.execute(sql`
        UPDATE promotion_transactions
        SET status = ${newStatus}, mp_payment_id = ${paymentId}
        WHERE id = ${transactionId}
      `);

      console.log(`✅ Transacción ${transactionId} actualizada: ${transaction.status} → ${newStatus}`);
    } else {
      console.log(`ℹ️ Transacción ${transactionId} ya está en estado ${newStatus}`);
    }
  } catch (error: any) {
    console.error(`❌ Error procesando pago ${paymentId}:`, error.message);
  }
}

export default router;
