import { db } from "./db";
import {
  orders,
  payments,
  cancellations,
  wallets,
  walletTransactions,
} from "@shared/schema-mysql";
import { eq, and } from "drizzle-orm";

export async function checkCancellationEligibility(orderId: string) {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, canCancel: false, error: "Order not found" };
    }

    if (order.status === "delivered") {
      return {
        success: false,
        canCancel: false,
        error: "Cannot cancel delivered orders",
      };
    }

    if (order.status === "cancelled") {
      return {
        success: false,
        canCancel: false,
        error: "Order already cancelled",
      };
    }

    const now = new Date();
    const orderTime = new Date(order.createdAt);
    const minutesSinceOrder =
      (now.getTime() - orderTime.getTime()) / (1000 * 60);

    let penalty = 0;
    let refundAmount = order.total;

    if (minutesSinceOrder <= 1) {
      penalty = 0;
      refundAmount = order.total;
    } else {
      switch (order.status) {
        case "pending":
          penalty = order.total * 0.05;
          break;
        case "confirmed":
          penalty = order.total * 0.1;
          break;
        case "preparing":
          penalty = order.total * 0.25;
          break;
        case "assigned":
        case "picked_up":
          penalty = order.total * 0.5;
          break;
        default:
          penalty = order.total * 0.1;
      }
      refundAmount = order.total - penalty;
    }

    return {
      success: true,
      canCancel: true,
      penalty,
      refundAmount,
    };
  } catch (error: any) {
    console.error("Check cancellation eligibility error:", error);
    return { success: false, canCancel: false, error: error.message };
  }
}

export function getRegretTimerStatus(orderCreatedAt: Date) {
  const now = new Date();
  const orderTime = new Date(orderCreatedAt);
  const secondsSinceOrder = (now.getTime() - orderTime.getTime()) / 1000;
  const regretTimerSeconds = 60;

  const timeRemaining = Math.max(0, regretTimerSeconds - secondsSinceOrder);
  const canCancel = timeRemaining > 0;
  const penaltyApplies = timeRemaining === 0;

  return {
    canCancel,
    timeRemaining: Math.ceil(timeRemaining),
    penaltyApplies,
  };
}

export async function cancelOrder(
  orderId: string,
  userId: string,
  reason: string,
) {
  try {
    const eligibility = await checkCancellationEligibility(orderId);
    if (!eligibility.success || !eligibility.canCancel) {
      return eligibility;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, canCancel: false, error: "Order not found" };
    }

    if (order.customerId !== userId) {
      return {
        success: false,
        canCancel: false,
        error: "Unauthorized to cancel this order",
      };
    }

    const penalty = eligibility.penalty || 0;
    const refundAmount = eligibility.refundAmount || 0;

    await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancellationPenalty: penalty,
        refundAmount: refundAmount,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await db.insert(cancellations).values({
      orderId,
      userId,
      reason,
      penalty,
      refundAmount,
      status: "pending_refund",
      createdAt: new Date(),
    });

    if (refundAmount > 0) {
      await processRefund(orderId, refundAmount);
    }

    return {
      success: true,
      canCancel: true,
      penalty,
      refundAmount,
    };
  } catch (error: any) {
    console.error("Cancel order error:", error);
    return { success: false, canCancel: false, error: error.message };
  }
}

async function processRefund(orderId: string, refundAmount: number) {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error("Order not found for refund");
    }

    let [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, order.customerId))
      .limit(1);

    if (!wallet) {
      [wallet] = await db
        .insert(wallets)
        .values({
          userId: order.customerId,
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          createdAt: new Date(),
        })
        .returning();
    }

    await db
      .update(wallets)
      .set({
        balance: wallet.balance + refundAmount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, order.customerId));

    await db.insert(walletTransactions).values({
      walletId: wallet.id,
      userId: order.customerId,
      amount: refundAmount,
      type: "refund",
      status: "completed",
      description: `Refund for cancelled order ${orderId}`,
      orderId,
      createdAt: new Date(),
    });

    await db
      .update(cancellations)
      .set({
        status: "refunded",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cancellations.orderId, orderId));

    console.log(`💰 Processed refund of $${refundAmount} for order ${orderId}`);
  } catch (error) {
    console.error("Process refund error:", error);
    throw error;
  }
}

export async function getCancellationHistory(userId: string) {
  try {
    const history = await db
      .select({
        id: cancellations.id,
        orderId: cancellations.orderId,
        reason: cancellations.reason,
        penalty: cancellations.penalty,
        refundAmount: cancellations.refundAmount,
        status: cancellations.status,
        createdAt: cancellations.createdAt,
        processedAt: cancellations.processedAt,
      })
      .from(cancellations)
      .where(eq(cancellations.userId, userId))
      .orderBy(cancellations.createdAt)
      .limit(20);

    return {
      success: true,
      cancellations: history,
    };
  } catch (error: any) {
    console.error("Get cancellation history error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getAllCancellations() {
  try {
    const allCancellations = await db
      .select()
      .from(cancellations)
      .orderBy(cancellations.createdAt)
      .limit(100);

    return {
      success: true,
      cancellations: allCancellations,
    };
  } catch (error: any) {
    console.error("Get all cancellations error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
