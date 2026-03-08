import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Crear pedido y procesar pago
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { items, businessId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay items en el pedido' });
    }

    // Obtener comisión del bar
    const [commissionResult]: any = await db.execute(
      'SELECT platform_commission FROM business_commissions WHERE business_id = ?',
      [businessId]
    );

    const platformCommission = commissionResult[0]?.platform_commission || 0.30;

    // Calcular totales
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const subtotal = item.productPrice * item.quantity;
      totalAmount += subtotal;
      
      orderItems.push({
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        subtotal,
        notes: item.notes || null,
      });
    }

    const commissionAmount = Math.round(totalAmount * platformCommission);
    const businessRevenue = totalAmount;
    const totalWithCommission = totalAmount + commissionAmount;

    // Crear pedido
    const orderId = uuidv4();
    const qrCode = `ORDER-${orderId}-${Date.now()}`;
    const canCancelUntil = new Date(Date.now() + 60000); // 60 segundos

    await db.execute(
      `INSERT INTO orders (
        id, user_id, business_id, total_amount, platform_commission_amount,
        business_revenue, platform_commission_rate, status, qr_code, can_cancel_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [orderId, userId, businessId, totalAmount, commissionAmount, businessRevenue, platformCommission, qrCode, canCancelUntil]
    );

    // Insertar items
    for (const item of orderItems) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, orderId, item.productId, item.productName, item.productPrice, item.quantity, item.subtotal, item.notes]
      );
    }

    // Actualizar paid_at y otorgar puntos inmediatamente
    const pointsAwarded = Math.floor(totalAmount / 100); // 1 punto por cada $1 USD
    
    await db.execute(
      'UPDATE orders SET paid_at = NOW(), points_awarded = ? WHERE id = ?',
      [pointsAwarded, orderId]
    );

    // Otorgar puntos al usuario inmediatamente
    await db.execute(
      `UPDATE user_points 
       SET total_points = total_points + ?,
           orders_completed = orders_completed + 1,
           points_from_orders = points_from_orders + ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [pointsAwarded, pointsAwarded, userId]
    );

    res.json({
      success: true,
      order: {
        id: orderId,
        qrCode,
        totalAmount,
        commissionAmount,
        total: totalWithCommission,
        canCancelUntil,
      },
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener mis pedidos
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [orders]: any = await db.execute(
      `SELECT o.*, b.name as business_name, b.address as business_address
       FROM orders o
       JOIN businesses b ON o.business_id = b.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // Obtener items de cada pedido
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
    const userId = req.user!.userId;
    const { id } = req.params;

    const [orders]: any = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    }

    const order = orders[0];

    if (order.status !== 'paid') {
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
    const businessOwnerId = req.user!.userId;

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

    // Actualizar pedido a entregado (puntos ya fueron otorgados al pagar)
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
    const businessOwnerId = req.user!.userId;

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
