import { db } from "./db";
import { businesses, products, orders } from "@shared/schema-mysql";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "./logger";

export async function toggleSlammedMode(
  businessId: string,
  isSlammed: boolean,
): Promise<void> {
  await db
    .update(businesses)
    .set({
      isSlammed,
      slammedAt: isSlammed ? new Date() : null,
      slammedExtraMinutes: isSlammed ? 20 : 0,
    })
    .where(eq(businesses.id, businessId));

  logger.info(`Business ${isSlammed ? "entered" : "exited"} slammed mode`, {
    businessId,
  });
}

export async function toggleProduct86(
  productId: string,
  is86: boolean,
): Promise<void> {
  await db.update(products).set({ is86 }).where(eq(products.id, productId));
  logger.info(`Product ${is86 ? "marked" : "unmarked"} as 86`, { productId });
}

export async function getActiveOrders(businessId: string): Promise<number> {
  const active = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.businessId, businessId),
        inArray(orders.status, ["pending", "accepted", "preparing", "ready"]),
      ),
    );
  return active.length;
}

export async function autoToggleSlammedMode(businessId: string): Promise<void> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) return;

  const activeCount = await getActiveOrders(businessId);
  const threshold = business.maxSimultaneousOrders || 10;

  if (activeCount >= threshold && !business.isSlammed) {
    await toggleSlammedMode(businessId, true);
  } else if (activeCount < threshold * 0.7 && business.isSlammed) {
    await toggleSlammedMode(businessId, false);
  }
}
