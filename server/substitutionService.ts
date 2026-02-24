import { db } from "./db";
import {
  orders,
  orderItems,
  products,
  substitutions,
} from "@shared/schema-mysql";
import { eq, and } from "drizzle-orm";

export async function requestSubstitution(params: any) {
  try {
    const {
      orderId,
      originalProductId,
      substituteProductId,
      reason,
      requestedBy,
      userId,
    } = params;

    const [originalProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, originalProductId))
      .limit(1);

    if (!originalProduct) {
      return { success: false, error: "Producto original no encontrado" };
    }

    const [substituteProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, substituteProductId))
      .limit(1);

    if (!substituteProduct) {
      return { success: false, error: "Producto sustituto no encontrado" };
    }

    if (!substituteProduct.available) {
      return { success: false, error: "Producto sustituto no disponible" };
    }

    const priceDifference = substituteProduct.price - originalProduct.price;

    const [substitution] = await db
      .insert(substitutions)
      .values({
        orderId,
        originalProductId,
        substituteProductId,
        originalPrice: originalProduct.price,
        substitutePrice: substituteProduct.price,
        priceDifference,
        reason,
        requestedBy,
        requestedById: userId,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    return {
      success: true,
      substitution,
      priceDifference,
    };
  } catch (error: any) {
    console.error("Request substitution error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function approveSubstitution(
  substitutionId: string,
  approvedBy: string,
) {
  try {
    const [substitution] = await db
      .select()
      .from(substitutions)
      .where(eq(substitutions.id, substitutionId))
      .limit(1);

    if (!substitution) {
      return { success: false, error: "Sustitución no encontrada" };
    }

    if (substitution.status !== "pending") {
      return { success: false, error: "Sustitución ya procesada" };
    }

    await db
      .update(substitutions)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(substitutions.id, substitutionId));

    await db
      .update(orderItems)
      .set({
        productId: substitution.substituteProductId,
        price: substitution.substitutePrice,
        isSubstituted: true,
        substitutionId: substitutionId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orderItems.orderId, substitution.orderId),
          eq(orderItems.productId, substitution.originalProductId),
        ),
      );

    if (substitution.priceDifference !== 0) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, substitution.orderId))
        .limit(1);

      if (order) {
        const newTotal = order.total + substitution.priceDifference;
        await db
          .update(orders)
          .set({
            total: newTotal,
            hasSubstitutions: true,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, substitution.orderId));
      }
    }

    return {
      success: true,
      substitution: {
        ...substitution,
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
      },
    };
  } catch (error: any) {
    console.error("Approve substitution error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function rejectSubstitution(
  substitutionId: string,
  rejectedBy: string,
  rejectionReason?: string,
) {
  try {
    await db
      .update(substitutions)
      .set({
        status: "rejected",
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(substitutions.id, substitutionId));

    return {
      success: true,
      substitution: { status: "rejected" },
    };
  } catch (error: any) {
    console.error("Reject substitution error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getOrderSubstitutions(orderId: string) {
  try {
    const orderSubstitutions = await db
      .select({
        id: substitutions.id,
        originalProductName: products.name,
        substituteProductName: products.name,
        originalPrice: substitutions.originalPrice,
        substitutePrice: substitutions.substitutePrice,
        priceDifference: substitutions.priceDifference,
        reason: substitutions.reason,
        status: substitutions.status,
        requestedBy: substitutions.requestedBy,
        createdAt: substitutions.createdAt,
        approvedAt: substitutions.approvedAt,
        rejectedAt: substitutions.rejectedAt,
      })
      .from(substitutions)
      .leftJoin(products, eq(products.id, substitutions.originalProductId))
      .where(eq(substitutions.orderId, orderId))
      .orderBy(substitutions.createdAt);

    return {
      success: true,
      substitutions: orderSubstitutions,
    };
  } catch (error: any) {
    console.error("Get order substitutions error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function suggestSubstitutes(
  productId: string,
  businessId: string,
) {
  try {
    const [originalProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!originalProduct) {
      return { success: false, error: "Producto no encontrado" };
    }

    const similarProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.available, true),
          eq(products.category, originalProduct.category),
        ),
      )
      .limit(10);

    const suggestions = similarProducts
      .filter((p) => p.id !== productId)
      .map((p) => ({
        ...p,
        priceDifference: p.price - originalProduct.price,
        similarity: Math.abs(p.price - originalProduct.price),
      }))
      .sort((a, b) => a.similarity - b.similarity)
      .slice(0, 5);

    return {
      success: true,
      suggestions,
    };
  } catch (error: any) {
    console.error("Suggest substitutes error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
