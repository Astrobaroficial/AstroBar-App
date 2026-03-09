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

export default router;
