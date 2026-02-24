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
        birthDate: users.birthDate,
        ageVerified: users.ageVerified,
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

export default router;
