import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authenticateToken } from '../authMiddleware';

const router = express.Router();

// Create payment intent and order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { items, businessId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay items en el pedido' });
    }

    // Get commission
    const [commissionResult]: any = await db.execute(
      'SELECT platform_commission FROM business_commissions WHERE business_id = ?',
      [businessId]
    );

    const platformCommission = commissionResult[0]?.[0]?.platform_commission || 0.15;

    // Calculate totals
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

    // Create Stripe payment intent
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalWithCommission,
      currency: 'usd',
      metadata: {
        userId,
        businessId,
        type: 'order',
      },
    });

    // Create order
    const orderId = uuidv4();
    const qrCode = `ORDER-${orderId.substring(0, 8).toUpperCase()}`;
    const canCancelUntil = new Date(Date.now() + 60000);

    await db.execute(
      `INSERT INTO orders (
        id, user_id, business_id, total_amount, platform_commission_amount,
        business_revenue, platform_commission_rate, status, qr_code, 
        payment_intent_id, can_cancel_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [orderId, userId, businessId, totalAmount, commissionAmount, businessRevenue, 
       platformCommission, qrCode, paymentIntent.id, canCancelUntil]
    );

    // Insert items
    for (const item of orderItems) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, orderId, item.productId, item.productName, item.productPrice, item.quantity, item.subtotal, item.notes]
      );
    }

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId,
      qrCode,
      totalAmount,
      commissionAmount,
      total: totalWithCommission,
      canCancelUntil,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm payment and award points
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user!.userId;

    const [orders]: any = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    }

    const order = orders[0];

    // Update order status and award points
    const pointsAwarded = Math.floor(order.total_amount / 100);
    
    await db.execute(
      'UPDATE orders SET status = ?, paid_at = NOW(), points_awarded = ? WHERE id = ?',
      ['paid', pointsAwarded, orderId]
    );

    // Award points
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
      pointsAwarded,
      qrCode: order.qr_code,
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get my orders
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

// Deliver order (business scans QR)
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

    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Pedido no pagado' });
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

export default router;
