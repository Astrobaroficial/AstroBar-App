import express from "express";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        profileImage: users.profileImage,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

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
    const { userPoints, promotionTransactions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");

    const userId = req.user!.id;

    // Get points
    const [points] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    const totalPoints = points?.totalPoints || 0;
    const promotionsRedeemed = points?.promotionsRedeemed || 0;
    const currentLevel = points?.currentLevel || 'copper';

    // Get unique bars visited
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

    // Get total spent
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

    // Calculate points to next level
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

    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    await db
      .update(users)
      .set({ 
        name: name.trim(),
        phone: phone?.trim() || null
      })
      .where(eq(users.id, req.user!.id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
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

    // Total spent (all redeemed transactions)
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

    // This month spending
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

    // Pending (accepted but not redeemed)
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
        platformCommission: 0.10, // 10% for display
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
    // Por ahora retornamos una respuesta vacía
    // En el futuro se conectará con Mercado Pago para obtener tarjetas guardadas
    res.json({
      success: true,
      cards: [],
      mpConnected: false,
    });
  } catch (error: any) {
    console.error("Error loading payment methods:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add payment method (tarjeta)
router.post("/payment-methods", authenticateToken, async (req, res) => {
  try {
    const { cardNumber, cardholderName, expiryMonth, expiryYear, cvv, isDefault } = req.body;

    // Validar datos
    if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
      return res.status(400).json({ error: "Faltan datos de la tarjeta" });
    }

    // Aquí se enviaría a Mercado Pago para tokenizar la tarjeta
    // Por ahora solo retornamos éxito
    console.log(`💳 Tarjeta agregada para usuario ${req.user!.id}:`, {
      lastFourDigits: cardNumber.slice(-4),
      cardholderName,
      expiryMonth,
      expiryYear,
      isDefault,
    });

    res.json({
      success: true,
      message: "Tarjeta agregada exitosamente",
      card: {
        id: `card_${Date.now()}`,
        lastFourDigits: cardNumber.slice(-4),
        brand: 'Visa',
        expiryMonth,
        expiryYear,
        isDefault,
      },
    });
  } catch (error: any) {
    console.error("Error adding payment method:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete payment method
router.delete("/payment-methods/:cardId", authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    console.log(`🗑️ Tarjeta eliminada para usuario ${req.user!.id}:`, cardId);

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

// Update user notification preferences
router.put("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const { ProximityNotificationService } = await import("../proximityNotificationService");
    const userId = req.user!.id;
    const { flashPromosEnabled, soundEnabled, vibrationEnabled } = req.body;
    
    // Validate input
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