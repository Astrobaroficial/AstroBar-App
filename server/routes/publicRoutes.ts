import express from "express";
import { db } from "../db";
import { businesses, promotions } from "@shared/schema-mysql";
import { eq, and, lte, gte, sql } from "drizzle-orm";

const router = express.Router();

// Get all active businesses (public)
router.get("/businesses", async (req, res) => {
  try {
    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    const now = new Date();

    // Enrich with flash promo status
    const enrichedBusinesses = await Promise.all(
      allBusinesses.map(async (business) => {
        // Count active flash promotions
        const flashPromos = await db
          .select()
          .from(promotions)
          .where(
            and(
              eq(promotions.businessId, business.id),
              eq(promotions.type, 'flash'),
              eq(promotions.isActive, true),
              lte(promotions.startTime, now),
              gte(promotions.endTime, now),
              sql`${promotions.stock} > ${promotions.stockConsumed}`
            )
          );

        const hasFlashPromo = flashPromos.length > 0;
        const flashPromoCount = flashPromos.length;

        // TODO: Implement real business hours logic
        // For now, assume all businesses are open
        const isOpen = true;
        const openingSoon = false;
        const timeUntilOpen = null;

        return {
          ...business,
          hasFlashPromo,
          flashPromoCount,
          isOpen,
          openingSoon,
          timeUntilOpen,
        };
      })
    );

    res.json({ success: true, businesses: enrichedBusinesses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
