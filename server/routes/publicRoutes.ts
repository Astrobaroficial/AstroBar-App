import express from "express";
import { db } from "../db";
import { businesses, promotions } from "@shared/schema-mysql";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = express.Router();

const checkBusinessHours = (business: any) => {
  if (!business.openingHours) return { isOpen: true, openingSoon: false, timeUntilOpen: null };

  try {
    const hours = JSON.parse(business.openingHours);
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    const todayHours = hours[today];

    if (!todayHours || todayHours.closed) {
      return { isOpen: false, openingSoon: false, timeUntilOpen: null };
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    let closeTime = closeHour * 60 + closeMin;

    // Handle overnight hours (e.g., 18:00 - 03:00)
    if (closeTime < openTime) closeTime += 24 * 60;

    const isOpen = currentTime >= openTime && currentTime < closeTime;
    const openingSoon = !isOpen && (openTime - currentTime) > 0 && (openTime - currentTime) <= 60;
    const timeUntilOpen = openingSoon ? `${Math.round((openTime - currentTime))} min` : null;

    return { isOpen, openingSoon, timeUntilOpen };
  } catch {
    return { isOpen: true, openingSoon: false, timeUntilOpen: null };
  }
};

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
              gte(promotions.endTime, now),
              sql`${promotions.stock} > ${promotions.stockConsumed}`
            )
          );

        // Use database isOpen field (updated by cron) and calculate openingSoon
        const hoursStatus = checkBusinessHours(business);

        return {
          ...business,
          isOpen: business.isOpen, // Use DB value updated by cron
          hasFlashPromo: activeFlashPromos.length > 0,
          flashPromoCount: activeFlashPromos.length,
          openingSoon: hoursStatus.openingSoon,
          timeUntilOpen: hoursStatus.timeUntilOpen
        };
      })
    );

    res.json({ success: true, businesses: businessesWithStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
