import { Request, Response } from "express";
import { calculateAndDistributeCommissions } from "./commissionService";
import { notifyOrderStatusChange } from "./pushNotificationService";
import { logger } from "./logger";
import { asyncHandler } from "./errors";

export const handleOrderDelivered = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    await calculateAndDistributeCommissions(orderId);

    const { db } = await import("./db");
    const { orders } = await import("@shared/schema-mysql");
    const { eq } = await import("drizzle-orm");

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order) {
      await notifyOrderStatusChange(orderId, order.userId, "delivered");
    }

    logger.order("Order delivered and commissions distributed", { orderId });

    res.json({ success: true, message: "Order completed successfully" });
  },
);
