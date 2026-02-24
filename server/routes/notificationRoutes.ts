import express from 'express';
import { authenticateToken } from '../authMiddleware';
import { Expo } from 'expo-server-sdk';

const router = express.Router();
const expo = new Expo();

// Guardar push token
router.post('/users/push-token', authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?.id;

    if (!Expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({ error: 'Invalid push token' });
    }

    const { users } = await import('@shared/schema-mysql');
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');

    await db
      .update(users)
      .set({ pushToken, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar notificación de promo flash
router.post('/notifications/flash-promo', authenticateToken, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    const { users } = await import('@shared/schema-mysql');
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({ pushToken: users.pushToken })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
      return res.status(400).json({ error: 'Invalid or missing push token' });
    }

    const messages = [{
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    }];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    res.json({ success: true, tickets });
  } catch (error: any) {
    console.error('Push notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar notificación masiva (admin)
router.post('/notifications/broadcast', authenticateToken, async (req, res) => {
  try {
    const { title, body, data, targetRole } = req.body;

    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { users } = await import('@shared/schema-mysql');
    const { db } = await import('../db');
    const { eq, isNotNull } = await import('drizzle-orm');

    let query = db
      .select({ pushToken: users.pushToken })
      .from(users)
      .where(isNotNull(users.pushToken));

    if (targetRole) {
      query = query.where(eq(users.role, targetRole));
    }

    const usersWithTokens = await query;
    const validTokens = usersWithTokens
      .map(u => u.pushToken)
      .filter(token => token && Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    let totalSent = 0;

    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
      totalSent += chunk.length;
    }

    res.json({ success: true, sent: totalSent });
  } catch (error: any) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
