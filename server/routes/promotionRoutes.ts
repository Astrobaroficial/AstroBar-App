import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// PUBLIC ROUTES

// Get active promotions (all or by business)
router.get("/", async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, lte, sql } = await import("drizzle-orm");

    const businessId = req.query.businessId as string | undefined;
    const type = req.query.type as string | undefined; // flash or common

    const now = new Date();
    
    let conditions = [
      eq(promotions.isActive, true),
      lte(promotions.startTime, now),
      gte(promotions.endTime, now),
      sql`${promotions.stock} > ${promotions.stockConsumed}`,
    ];

    if (businessId) {
      conditions.push(eq(promotions.businessId, businessId));
    }

    if (type) {
      conditions.push(eq(promotions.type, type));
    }

    const activePromotions = await db
      .select()
      .from(promotions)
      .where(and(...conditions));

    // Enrich with business data
    const enriched = await Promise.all(
      activePromotions.map(async (promo) => {
        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, promo.businessId))
          .limit(1);

        return {
          ...promo,
          business: business || null,
          stockRemaining: promo.stock - promo.stockConsumed,
        };
      })
    );

    res.json({ success: true, promotions: enriched });
  } catch (error: any) {
    console.error("Error loading promotions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get promotion by ID
router.get("/:id", async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, req.params.id))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, promotion.businessId))
      .limit(1);

    res.json({
      success: true,
      promotion: {
        ...promotion,
        business: business || null,
        stockRemaining: promotion.stock - promotion.stockConsumed,
      },
    });
  } catch (error: any) {
    console.error("Error loading promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ROUTES

// Accept promotion (create transaction)
router.post("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const { promotions, promotionTransactions, userPoints } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");

    const promotionId = req.params.id;
    const userId = req.user!.id;

    // Check if promotion exists and is active
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    const now = new Date();
    if (!promotion.isActive || promotion.startTime > now || promotion.endTime < now) {
      return res.status(400).json({ error: "Promoción no disponible" });
    }

    if (promotion.stock <= promotion.stockConsumed) {
      return res.status(400).json({ error: "Promoción agotada" });
    }

    // Check if user already has an active promotion
    const [existingTransaction] = await db
      .select()
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.status, "pending")
        )
      )
      .limit(1);

    if (existingTransaction) {
      return res.status(400).json({ error: "Ya tienes una promoción activa" });
    }

    // Calculate amounts (bar gets 100%, platform charges commission on top)
    const promoPrice = promotion.promoPrice; // Bar receives this
    const platformCommission = Math.round(promoPrice * 0.30); // 30% additional
    const totalAmount = promoPrice + platformCommission; // User pays this

    // Generate unique QR code
    const qrCode = `ASTRO-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create transaction
    const canCancelUntil = new Date(now.getTime() + 60 * 1000); // 60 seconds

    const transactionId = uuidv4();
    await db.insert(promotionTransactions).values({
      id: transactionId,
      promotionId,
      userId,
      businessId: promotion.businessId,
      qrCode,
      status: "pending",
      amountPaid: totalAmount,
      platformCommission,
      businessRevenue: promoPrice,
      canCancelUntil,
    });

    // Update stock
    await db
      .update(promotions)
      .set({ stockConsumed: sql`${promotions.stockConsumed} + 1` })
      .where(eq(promotions.id, promotionId));

    res.json({
      success: true,
      transaction: {
        id: transactionId,
        qrCode,
        canCancelUntil,
        amountPaid: totalAmount,
      },
    });
  } catch (error: any) {
    console.error("Error accepting promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel transaction (within 60 seconds)
router.post("/transactions/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions, promotions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");

    const transactionId = req.params.id;
    const userId = req.user!.id;

    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.id, transactionId),
          eq(promotionTransactions.userId, userId)
        )
      )
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "No se puede cancelar esta transacción" });
    }

    const now = new Date();
    if (transaction.canCancelUntil && now > transaction.canCancelUntil) {
      return res.status(400).json({ error: "Tiempo de cancelación expirado" });
    }

    // Cancel transaction
    await db
      .update(promotionTransactions)
      .set({ status: "cancelled" })
      .where(eq(promotionTransactions.id, transactionId));

    // Restore stock
    await db
      .update(promotions)
      .set({ stockConsumed: sql`${promotions.stockConsumed} - 1` })
      .where(eq(promotions.id, transaction.promotionId));

    res.json({ success: true, message: "Promoción cancelada" });
  } catch (error: any) {
    console.error("Error cancelling transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's transactions
router.get("/transactions/my", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions, promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const userId = req.user!.id;

    const transactions = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.userId, userId))
      .orderBy(desc(promotionTransactions.createdAt));

    // Enrich with promotion and business data
    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const [promotion] = await db
          .select()
          .from(promotions)
          .where(eq(promotions.id, transaction.promotionId))
          .limit(1);

        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, transaction.businessId))
          .limit(1);

        return {
          ...transaction,
          promotion: promotion || null,
          business: business || null,
        };
      })
    );

    res.json({ success: true, transactions: enriched });
  } catch (error: any) {
    console.error("Error loading transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// BUSINESS OWNER ROUTES

// Create promotion
router.post("/", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const {
      businessId,
      title,
      description,
      type,
      originalPrice,
      promoPrice,
      stock,
      startTime,
      endTime,
      image,
    } = req.body;

    // Verify business ownership
    const { and } = await import("drizzle-orm");
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(403).json({ error: "No tienes acceso a este bar" });
    }

    const discountPercentage = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);

    const promotionId = uuidv4();
    await db.insert(promotions).values({
      id: promotionId,
      businessId,
      title,
      description,
      type,
      originalPrice,
      promoPrice,
      discountPercentage,
      stock,
      stockConsumed: 0,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: true,
      image,
    });

    res.json({ success: true, promotionId });
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Redeem QR code (bar scans)
router.post("/redeem", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { promotionTransactions, userPoints } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, sql } = await import("drizzle-orm");

    const { qrCode } = req.body;

    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.qrCode, qrCode))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: "Código QR inválido" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Esta promoción ya fue canjeada o cancelada" });
    }

    // Mark as redeemed
    await db
      .update(promotionTransactions)
      .set({
        status: "redeemed",
        redeemedAt: new Date(),
      })
      .where(eq(promotionTransactions.id, transaction.id));

    // Award points to user (10 points per redemption)
    const [existingPoints] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, transaction.userId))
      .limit(1);

    if (existingPoints) {
      const newTotal = existingPoints.totalPoints + 10;
      const newRedeemed = existingPoints.promotionsRedeemed + 1;
      
      // Calculate level
      let newLevel = "copper";
      if (newTotal >= 1000) newLevel = "platinum";
      else if (newTotal >= 500) newLevel = "gold";
      else if (newTotal >= 250) newLevel = "silver";
      else if (newTotal >= 100) newLevel = "bronze";

      await db
        .update(userPoints)
        .set({
          totalPoints: newTotal,
          promotionsRedeemed: newRedeemed,
          currentLevel: newLevel,
        })
        .where(eq(userPoints.userId, transaction.userId));
    } else {
      await db.insert(userPoints).values({
        id: uuidv4(),
        userId: transaction.userId,
        totalPoints: 10,
        promotionsRedeemed: 1,
        currentLevel: "copper",
      });
    }

    res.json({ success: true, message: "Promoción canjeada exitosamente" });
  } catch (error: any) {
    console.error("Error redeeming promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
