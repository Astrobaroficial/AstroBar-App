import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authenticateToken } from '../authMiddleware';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://astrobar-app-production-4821.up.railway.app";

// Instancia maestra con las credenciales de AstroBar
const platformClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// Crear pedido y generar pasarela de pago Mercado Pago (Split Payment)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Normalización de ID de usuario desde JWT
    const userId = req.user!.id || req.user!.userId;
    const { items, businessId: bodyBusinessId, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay items en el pedido' });
    }

    // Obtener el ID del negocio (del cuerpo o del primer ítem)
    const businessId = bodyBusinessId || items[0]?.businessId;

    if (!businessId) {
      return res.status(400).json({ success: false, error: 'No se especificado el bar para este pedido.' });
    }

    // 1. Obtener la cuenta de Mercado Pago vinculada al Bar
    const [mpAccounts]: any = await db.execute(
      'SELECT mp_user_id, access_token FROM mercadopago_accounts WHERE business_id = ? LIMIT 1',
      [businessId]
    );

    const mpAccount = mpAccounts[0];

    if (!mpAccount || !mpAccount.mp_user_id) {
      return res.status(400).json({
        success: false,
        error: 'El bar seleccionado aún no vinculó su cuenta de Mercado Pago para recibir ventas.',
      });
    }

    // 2. Obtener comisión configurada para el bar
    const [commissionResult]: any = await db.execute(
      'SELECT platform_commission FROM business_commissions WHERE business_id = ? LIMIT 1',
      [businessId]
    );

    const commissionRate = commissionResult[0]?.platform_commission 
      ? parseFloat(commissionResult[0].platform_commission) / 100 
      : 0.15;

    // 3. Procesar Ítems y Calcular Totales
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const price = Number(item.price || item.productPrice || 0);
      const qty = Number(item.quantity || 1);
      const itemPriceInPesos = price > 1000 ? price / 100 : price; // Convierte si viene en centavos
      const subtotal = itemPriceInPesos * qty;
      totalAmount += subtotal;

      orderItems.push({
        id: uuidv4(),
        productId: String(item.id || item.productId || uuidv4()),
        productName: item.name || item.productName || 'Producto de Menú',
        productPrice: itemPriceInPesos,
        quantity: qty,
        subtotal,
        notes: item.notes || null,
      });
    }

    const platformFee = Math.round(totalAmount * commissionRate);
    const businessRevenue = totalAmount - platformFee;

    // 4. Registrar Pedido en estado 'pending'
    const orderId = uuidv4();
    const qrCode = `ORDER-${orderId}-${Date.now()}`;
    const canCancelUntil = new Date(Date.now() + 60000); // 60 segundos

    await db.execute(
      `INSERT INTO orders (
        id, user_id, business_id, total_amount, platform_commission_amount,
        business_revenue, platform_commission_rate, status, qr_code, can_cancel_until, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
      [
        orderId,
        userId,
        businessId,
        totalAmount,
        platformFee,
        businessRevenue,
        commissionRate,
        qrCode,
        canCancelUntil,
      ]
    );

    // Insertar detalles de los ítems
    for (const item of orderItems) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, orderId, item.productId, item.productName, item.productPrice, item.quantity, item.subtotal, item.notes]
      );
    }

    // 5. Generar la Preferencia de Mercado Pago con Split Payment
    const mpPreference = new Preference(platformClient);

    const preferenceResult = await mpPreference.create({
      body: {
        items: orderItems.map((item) => ({
          id: item.productId,
          title: item.productName,
          quantity: item.quantity,
          unit_price: item.productPrice,
          currency_id: 'ARS',
        })),
        marketplace_fee: platformFee, // Comisión para AstroBar
        sponsor_id: Number(mpAccount.mp_user_id), // ID de Mercado Pago del Bar
        external_reference: orderId,
        notification_url: `${BASE_URL}/api/mp/webhook`,
        back_urls: {
          success: 'astrobar://payment-success',
          failure: 'astrobar://payment-failure',
          pending: 'astrobar://payment-pending',
        },
        auto_return: 'approved',
      },
    });

    res.json({
      success: true,
      transactionId: orderId,
      initPoint: preferenceResult.init_point,
    });
  } catch (error: any) {
    console.error('Error creating order with MP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener mis pedidos
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id || req.user!.userId;

    const [orders]: any = await db.execute(
      `SELECT o.*, b.name as business_name, b.address as business_address
       FROM orders o
       JOIN businesses b ON o.business_id = b.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    for (const order of orders) {
      const [items]: any = await db.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancelar pedido
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { id } = req.params;

    const [orders]: any = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    }

    const order = orders[0];

    if (order.status !== 'pending' && order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'El pedido no se puede cancelar' });
    }

    if (new Date() > new Date(order.can_cancel_until)) {
      return res.status(400).json({ success: false, error: 'Tiempo de cancelación expirado' });
    }

    await db.execute(
      'UPDATE orders SET status = ?, cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?',
      ['cancelled', 'Cancelado por el usuario', id]
    );

    res.json({ success: true, message: 'Pedido cancelado' });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Escanear QR y entregar pedido (business_owner)
router.post('/deliver', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
    const businessOwnerId = req.user!.id || req.user!.userId;

    const [orders]: any = await db.execute(
      `SELECT o.*, b.owner_id FROM orders o
       JOIN businesses b ON o.business_id = b.id
       WHERE o.qr_code = ?`,
      [qrCode]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    }

    const order = orders[0];

    if (order.owner_id !== businessOwnerId) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Pedido ya entregado' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Pedido cancelado' });
    }

    await db.execute(
      'UPDATE orders SET status = ?, delivered_at = NOW() WHERE id = ?',
      ['delivered', order.id]
    );

    res.json({
      success: true,
      message: 'Pedido entregado',
      pointsAwarded: order.points_awarded,
    });
  } catch (error: any) {
    console.error('Error delivering order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener pedidos del bar (business_owner)
router.get('/business', authenticateToken, async (req, res) => {
  try {
    const businessOwnerId = req.user!.id || req.user!.userId;

    const [orders]: any = await db.execute(
      `SELECT o.*, u.name as user_name, u.phone as user_phone
       FROM orders o
       JOIN businesses b ON o.business_id = b.id
       JOIN users u ON o.user_id = u.id
       WHERE b.owner_id = ?
       ORDER BY o.created_at DESC`,
      [businessOwnerId]
    );

    for (const order of orders) {
      const [items]: any = await db.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching business orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;