import { db } from "./db";
import { coupons, couponUsage, orders } from "@shared/schema-mysql";
import { eq, and, gte, lte, lt, count } from "drizzle-orm";

export async function validateCoupon(
  code: string,
  userId: string,
  orderTotal: number,
) {
  try {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)),
      )
      .limit(1);

    if (!coupon) {
      return { valid: false, error: "Cupón no válido" };
    }

    const now = new Date();

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, error: "Cupón expirado" };
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, error: "Cupón aún no válido" };
    }

    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return {
        valid: false,
        error: `Pedido mínimo de $${coupon.minOrderAmount} requerido`,
      };
    }

    if (coupon.maxOrderAmount && orderTotal > coupon.maxOrderAmount) {
      return {
        valid: false,
        error: `Pedido máximo de $${coupon.maxOrderAmount} permitido`,
      };
    }

    if (coupon.maxUses) {
      const [usageCount] = await db
        .select({ count: count() })
        .from(couponUsage)
        .where(eq(couponUsage.couponId, coupon.id));

      if (usageCount.count >= coupon.maxUses) {
        return { valid: false, error: "Cupón agotado" };
      }
    }

    if (coupon.maxUsesPerUser) {
      const [userUsageCount] = await db
        .select({ count: count() })
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponId, coupon.id),
            eq(couponUsage.userId, userId),
          ),
        );

      if (userUsageCount.count >= coupon.maxUsesPerUser) {
        return {
          valid: false,
          error: "Ya has usado este cupón el máximo de veces permitido",
        };
      }
    }

    return {
      valid: true,
      discount: coupon.discountValue,
      discountType: coupon.discountType,
      coupon,
    };
  } catch (error: any) {
    console.error("Validate coupon error:", error);
    return { valid: false, error: "Error validando cupón" };
  }
}

export async function applyCoupon(
  code: string,
  userId: string,
  orderId: string,
  orderTotal: number,
) {
  try {
    const validation = await validateCoupon(code, userId, orderTotal);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const { coupon, discount, discountType } = validation;
    let discountAmount = 0;

    if (discountType === "percentage") {
      discountAmount = (orderTotal * discount!) / 100;
      if (
        coupon.maxDiscountAmount &&
        discountAmount > coupon.maxDiscountAmount
      ) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = discount!;
    }

    const finalAmount = Math.max(0, orderTotal - discountAmount);

    await db.insert(couponUsage).values({
      couponId: coupon.id,
      userId,
      orderId,
      discountAmount,
      originalAmount: orderTotal,
      finalAmount,
      createdAt: new Date(),
    });

    await db
      .update(orders)
      .set({
        couponCode: code.toUpperCase(),
        couponDiscount: discountAmount,
        total: finalAmount,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await db
      .update(coupons)
      .set({
        usedCount: coupon.usedCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, coupon.id));

    return {
      success: true,
      discount: discountAmount,
      finalAmount,
    };
  } catch (error: any) {
    console.error("Apply coupon error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function createCoupon(couponData: any) {
  try {
    const [coupon] = await db
      .insert(coupons)
      .values({
        ...couponData,
        code: couponData.code.toUpperCase(),
        usedCount: 0,
        createdAt: new Date(),
      })
      .returning();

    return {
      success: true,
      coupon,
    };
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getAllCoupons() {
  try {
    const allCoupons = await db
      .select()
      .from(coupons)
      .orderBy(coupons.createdAt);

    return {
      success: true,
      coupons: allCoupons,
    };
  } catch (error: any) {
    console.error("Get all coupons error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getActiveCoupons() {
  try {
    const now = new Date();
    const activeCoupons = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.isActive, true), gte(coupons.expiresAt, now)))
      .orderBy(coupons.createdAt);

    return {
      success: true,
      coupons: activeCoupons,
    };
  } catch (error: any) {
    console.error("Get active coupons error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getUserCouponUsage(userId: string) {
  try {
    const usage = await db
      .select({
        id: couponUsage.id,
        couponCode: coupons.code,
        discountAmount: couponUsage.discountAmount,
        originalAmount: couponUsage.originalAmount,
        finalAmount: couponUsage.finalAmount,
        orderId: couponUsage.orderId,
        createdAt: couponUsage.createdAt,
      })
      .from(couponUsage)
      .innerJoin(coupons, eq(coupons.id, couponUsage.couponId))
      .where(eq(couponUsage.userId, userId))
      .orderBy(couponUsage.createdAt)
      .limit(20);

    return {
      success: true,
      usage,
    };
  } catch (error: any) {
    console.error("Get user coupon usage error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function deactivateCoupon(couponId: string) {
  try {
    await db
      .update(coupons)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, couponId));

    return {
      success: true,
      message: "Cupón desactivado",
    };
  } catch (error: any) {
    console.error("Deactivate coupon error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
