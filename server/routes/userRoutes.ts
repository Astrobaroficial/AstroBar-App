import express from "express";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();

// Get user profile (Sin la columna username para evitar errores)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");

    const userId = req.user!.id;
    const result: any = await db.execute(sql`
      SELECT id, name, email, phone, role, profile_image as profileImage, is_active as isActive, created_at as createdAt
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `);

    const rows = Array.isArray(result[0]) ? result[0] : result;
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Error loading user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user stats
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const { userPoints, promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const userId = req.user!.id;

    const [points] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    const totalPoints = points?.totalPoints || 0;
    const promotionsRedeemed = points?.promotionsRedeemed || 0;
    const currentLevel = points?.currentLevel || 'copper';

    const transactions = await db
      .select({ businessId: promotionTransactions.businessId })
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, 'redeemed')
        )
      );

    const uniqueBars = new Set(transactions.map(t => t.businessId));
    const barsVisited = uniqueBars.size;

    const redeemedTransactions = await db
      .select({ amountPaid: promotionTransactions.amountPaid })
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, 'redeemed')
        )
      );

    const totalSpent = redeemedTransactions.reduce((sum, t) => sum + t.amountPaid, 0);

    let pointsToNextLevel = 0;
    if (currentLevel === 'copper') pointsToNextLevel = 100 - totalPoints;
    else if (currentLevel === 'bronze') pointsToNextLevel = 250 - totalPoints;
    else if (currentLevel === 'silver') pointsToNextLevel = 500 - totalPoints;
    else if (currentLevel === 'gold') pointsToNextLevel = 1000 - totalPoints;

    res.json({
      success: true,
      stats: {
        totalPoints,
        promotionsRedeemed,
        currentLevel,
        barsVisited,
        totalSpent,
        pointsToNextLevel: Math.max(0, pointsToNextLevel),
      },
    });
  } catch (error: any) {
    console.error("Error loading user stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save push token
router.post("/push-token", authenticateToken, async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { token } = req.body;

    await db
      .update(users)
      .set({ pushToken: token })
      .where(eq(users.id, req.user!.id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving push token:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    const userId = req.user!.id;
    const { name, phone, profileImage, currentPassword, newPassword } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const updates: Record<string, any> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: "El nombre es requerido" });
      }
      updates.name = name.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone?.trim() || null;
    }

    if (profileImage !== undefined) {
      updates.profileImage = profileImage;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Debes ingresar tu contraseña actual para cambiarla" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.password = hashedPassword;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId));
    }

    const result: any = await db.execute(sql`
      SELECT id, name, email, phone, role, profile_image as profileImage, is_active as isActive, created_at as createdAt
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const updatedUser = rows[0];

    res.json({ success: true, message: "Perfil actualizado correctamente", user: updatedUser });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message || "Error al actualizar el perfil" });
  }
});

// Upload profile image (base64)
router.post("/profile-image", authenticateToken, async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { image } = req.body;

    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({ error: "Invalid image format" });
    }

    await db
      .update(users)
      .set({ profileImage: image })
      .where(eq(users.id, req.user!.id));

    res.json({ success: true, profileImage: image });
  } catch (error: any) {
    console.error("Error uploading profile image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get wallet stats for customer
router.get("/wallet-stats", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, sql } = await import("drizzle-orm");

    const userId = req.user!.id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allTransactions = await db
      .select({ amountPaid: promotionTransactions.amountPaid })
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, 'redeemed')
        )
      );

    const totalEarnings = allTransactions.reduce((sum, t) => sum + t.amountPaid, 0);
    const totalTransactions = allTransactions.length;

    const monthTransactions = await db
      .select({ amountPaid: promotionTransactions.amountPaid })
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, 'redeemed'),
          gte(promotionTransactions.redeemedAt, firstDayOfMonth)
        )
      );

    const thisMonthEarnings = monthTransactions.reduce((sum, t) => sum + t.amountPaid, 0);

    const pendingTransactions = await db
      .select({ amountPaid: promotionTransactions.amountPaid })
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, 'accepted')
        )
      );

    const pendingPayouts = pendingTransactions.reduce((sum, t) => sum + t.amountPaid, 0);

    res.json({
      success: true,
      stats: {
        totalEarnings,
        pendingPayouts,
        thisMonthEarnings,
        totalTransactions,
        platformCommission: 0.10,
        averageOrderValue: totalTransactions > 0 ? totalEarnings / totalTransactions : 0,
      },
    });
  } catch (error: any) {
    console.error("Error loading wallet stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user payment methods
router.get("/payment-methods", authenticateToken, async (req, res) => {
  try {
    const { paymentCards } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const cards = await db
      .select({
        id: paymentCards.id,
        lastFourDigits: paymentCards.lastFourDigits,
        brand: paymentCards.brand,
        expiryMonth: paymentCards.expiryMonth,
        expiryYear: paymentCards.expiryYear,
        isDefault: paymentCards.isDefault,
      })
      .from(paymentCards)
      .where(eq(paymentCards.userId, req.user!.id));

    res.json({
      success: true,
      cards,
      mpConnected: cards.length > 0,
    });
  } catch (error: any) {
    console.error("Error loading payment methods:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add payment method (tarjeta)
router.post("/payment-methods", authenticateToken, async (req, res) => {
  try {
    const { paymentCards } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");
    const MercadoPagoService = await import("../services/mercadoPagoService");
    const { cardNumber, cardholderName, expiryMonth, expiryYear, cvv, isDefault } = req.body;

    if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
      return res.status(400).json({ error: "Faltan datos de la tarjeta" });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const fullYear = expiryYear < 100 ? 2000 + expiryYear : expiryYear;

    if (fullYear < currentYear || (fullYear === currentYear && expiryMonth < currentMonth)) {
      return res.status(400).json({ error: "La tarjeta está vencida" });
    }

    if (expiryMonth < 1 || expiryMonth > 12) {
      return res.status(400).json({ error: "Mes de vencimiento inválido" });
    }

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      return res.status(500).json({ error: "Mercado Pago no está configurado" });
    }

    const mpService = new MercadoPagoService.default(mpAccessToken);
    const tokenResult = await mpService.tokenizeCard({
      cardNumber,
      cardholderName,
      expiryMonth,
      expiryYear: fullYear,
      cvv,
    });

    if (!tokenResult.success) {
      return res.status(400).json({ error: "Error al tokenizar tarjeta" });
    }

    let brand = tokenResult.cardBrand || "Visa";
    if (cardNumber.startsWith("5")) brand = "Mastercard";
    else if (cardNumber.startsWith("3")) brand = "Amex";

    const lastFourDigits = cardNumber.slice(-4);

    if (isDefault) {
      await db.update(paymentCards)
        .set({ isDefault: false })
        .where(eq(paymentCards.userId, req.user!.id));
    }

    const cardId = `card_${Date.now()}`;
    const yearToStore = fullYear > 100 ? fullYear % 100 : fullYear;
    await db.insert(paymentCards).values({
      id: cardId,
      userId: req.user!.id,
      lastFourDigits,
      brand,
      expiryMonth,
      expiryYear: yearToStore,
      isDefault,
      mpTokenId: tokenResult.token,
      isActive: true,
    });

    res.json({
      success: true,
      message: "Tarjeta agregada exitosamente",
      card: {
        id: cardId,
        lastFourDigits,
        brand,
        expiryMonth,
        expiryYear: yearToStore,
        isDefault,
      },
    });
  } catch (error: any) {
    console.error("Error adding payment method:", error);
    res.status(500).json({ error: error.message || "Error al agregar tarjeta" });
  }
});

// Delete payment method
router.delete("/payment-methods/:cardId", authenticateToken, async (req, res) => {
  try {
    const { paymentCards } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");
    const { cardId } = req.params;

    await db.delete(paymentCards)
      .where(
        and(
          eq(paymentCards.id, cardId),
          eq(paymentCards.userId, req.user!.id)
        )
      );

    res.json({
      success: true,
      message: "Tarjeta eliminada",
    });
  } catch (error: any) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user notification preferences
router.get("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const { ProximityNotificationService } = await import("../proximityNotificationService");
    const userId = req.user!.id;
    const preferences = await ProximityNotificationService.getUserNotificationPreferences(userId);
    
    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    console.error("Error getting notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for customer
router.get("/payment-history", authenticateToken, async (req, res) => {
  try {
    const { filter } = req.query;
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");

    const userId = req.user!.id;

    const result: any = await db.execute(sql`
      SELECT 
        pt.id,
        pt.amount_paid as amountPaid,
        pt.platform_commission as platformCommission,
        pt.business_revenue as businessRevenue,
        pt.status,
        pt.created_at as createdAt,
        pt.redeemed_at as redeemedAt,
        p.title as promotionTitle,
        b.name as businessName
      FROM promotion_transactions pt
      LEFT JOIN promotions p ON pt.promotion_id = p.id
      LEFT JOIN businesses b ON pt.business_id = b.id
      WHERE pt.user_id = ${userId}
      ${
        filter === 'completed' ? sql`AND pt.status = 'redeemed'` :
        filter === 'pending' ? sql`AND pt.status = 'pending'` :
        sql``
      }
      ORDER BY pt.created_at DESC
    `);

    const transactions = Array.isArray(result[0]) ? result[0] : result;

    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error("Error loading payment history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user notification preferences
router.put("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const { ProximityNotificationService } = await import("../proximityNotificationService");
    const userId = req.user!.id;
    const { flashPromosEnabled, soundEnabled, vibrationEnabled } = req.body;
    
    if (typeof flashPromosEnabled !== 'boolean' || 
        typeof soundEnabled !== 'boolean' || 
        typeof vibrationEnabled !== 'boolean') {
      return res.status(400).json({ error: "Invalid preferences format" });
    }
    
    const preferences = {
      flashPromosEnabled,
      soundEnabled,
      vibrationEnabled
    };
    
    const result = await ProximityNotificationService.updateUserNotificationPreferences(userId, preferences);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Preferences updated successfully"
      });
    } else {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;