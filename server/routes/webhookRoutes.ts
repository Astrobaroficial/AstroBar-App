import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * Webhook de Mercado Pago
 * Recibe notificaciones de pagos
 */
router.post('/mercadopago', async (req, res) => {
  try {
    console.log('🔔 Webhook de Mercado Pago recibido');
    
    const { action, data } = req.body;

    // Validar que sea una notificación de pago
    if (action !== 'payment.created' && action !== 'payment.updated') {
      console.log('⏭️ Acción ignorada:', action);
      return res.json({ success: true });
    }

    if (!data?.id) {
      console.log('⚠️ Sin ID de pago en webhook');
      return res.json({ success: true });
    }

    const paymentId = data.id;
    console.log(`💳 Procesando pago: ${paymentId}`);

    // Obtener detalles del pago desde Mercado Pago
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN no configurado');
      return res.status(500).json({ error: 'Mercado Pago no configurado' });
    }

    const axios = await import('axios');
    const paymentResponse = await axios.default.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    const payment = paymentResponse.data;
    console.log(`📊 Estado del pago: ${payment.status}`);

    // Buscar transacción por paymentId
    const { promotionTransactions } = await import('@shared/schema-mysql');
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');

    // Nota: Necesitamos agregar paymentId a la tabla promotionTransactions
    // Por ahora, usamos metadata para buscar
    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.id, payment.external_reference || ''))
      .limit(1);

    if (!transaction) {
      console.log('⚠️ Transacción no encontrada para pago:', paymentId);
      return res.json({ success: true });
    }

    // Actualizar estado según respuesta de Mercado Pago
    if (payment.status === 'approved') {
      console.log('✅ Pago aprobado');
      await db
        .update(promotionTransactions)
        .set({ status: 'confirmed' })
        .where(eq(promotionTransactions.id, transaction.id));
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      console.log('❌ Pago rechazado/cancelado');
      await db
        .update(promotionTransactions)
        .set({ status: 'cancelled' })
        .where(eq(promotionTransactions.id, transaction.id));
    } else if (payment.status === 'pending') {
      console.log('⏳ Pago pendiente');
      await db
        .update(promotionTransactions)
        .set({ status: 'pending' })
        .where(eq(promotionTransactions.id, transaction.id));
    }

    res.json({ success: true });
  } catch (error: any) {\n    console.error('❌ Error procesando webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verificar estado de pago
 * GET /webhooks/payment-status/:paymentId
 */
router.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!mpAccessToken) {
      return res.status(500).json({ error: 'Mercado Pago no configurado' });
    }

    const axios = await import('axios');
    const response = await axios.default.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      }
    );

    const payment = response.data;

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        amount: payment.transaction_amount,
        description: payment.description,
        createdAt: payment.date_created,
      },
    });
  } catch (error: any) {
    console.error('Error getting payment status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
