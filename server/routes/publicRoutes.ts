import express from "express";
import { db } from "../db";
import { businesses, promotions } from "@shared/schema-mysql";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = express.Router();

// Get all active businesses with flash promo status (public)
router.get("/businesses", async (req, res) => {
  try {
    const now = new Date();
    
    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    // Check flash promos for each business
    const businessesWithStatus = await Promise.all(
      allBusinesses.map(async (business) => {
        const activeFlashPromos = await db
          .select()
          .from(promotions)
          .where(
            and(
              eq(promotions.businessId, business.id),
              eq(promotions.type, 'flash'),
              eq(promotions.isActive, true),
              lte(promotions.startTime, now),
              gte(promotions.endTime, now)
            )
          );

        return {
          ...business,
          hasFlashPromo: activeFlashPromos.length > 0,
          flashPromoCount: activeFlashPromos.length,
          isOpen: true, // TODO: Implement real hours check
          openingSoon: false,
          timeUntilOpen: null
        };
      })
    );

    res.json({ success: true, businesses: businessesWithStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
