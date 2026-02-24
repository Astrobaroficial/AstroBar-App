import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";

const router = express.Router();

// PUBLIC ROUTES - No authentication required

// Get all businesses (public)
router.get("/", async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    res.json({ success: true, businesses: allBusinesses });
  } catch (error: any) {
    console.error("Error loading businesses:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get featured businesses (public)
router.get("/featured", async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const featuredBusinesses = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.isActive, true),
          eq(businesses.isFeatured, true)
        )
      )
      .limit(10);

    res.json({ success: true, businesses: featuredBusinesses });
  } catch (error: any) {
    console.error("Error loading featured businesses:", error);
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ROUTES - Authentication required

// Get business dashboard
router.get("/dashboard", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses, promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const transactions = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.businessId, business.id))
      .orderBy(desc(promotionTransactions.createdAt));

    const pendingTransactions = transactions.filter(t => t.status === "pending");
    const today = new Date();
    const todayTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate.toDateString() === today.toDateString();
    });

    const todayRevenue = todayTransactions
      .filter(t => t.status === "redeemed")
      .reduce((sum, t) => sum + t.businessRevenue, 0);

    res.json({
      success: true,
      dashboard: {
        business,
        isOpen: business.isActive,
        pendingOrders: pendingTransactions.length,
        todayOrders: todayTransactions.length,
        todayRevenue,
        totalOrders: transactions.length,
        recentOrders: transactions.slice(0, 10).map(t => ({
          id: t.id,
          status: t.status,
          subtotal: t.amountPaid,
          customerName: 'Cliente',
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business stats
router.get("/stats", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses, promotionTransactions, promotions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, desc } = await import("drizzle-orm");

    const requestedBusinessId = req.query.businessId as string | undefined;
    
    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    if (ownerBusinesses.length === 0) {
      return res.status(404).json({ error: "No businesses found" });
    }

    let targetBusiness;
    if (requestedBusinessId) {
      targetBusiness = ownerBusinesses.find(b => b.id === requestedBusinessId);
      if (!targetBusiness) {
        return res.status(403).json({ error: "No tienes acceso a este negocio" });
      }
    } else {
      targetBusiness = ownerBusinesses[0];
    }
    
    // Get all transactions for this business
    const transactions = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.businessId, targetBusiness.id))
      .orderBy(desc(promotionTransactions.createdAt));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const redeemedTransactions = transactions.filter(t => t.status === 'redeemed');
    const cancelledTransactions = transactions.filter(t => t.status === 'cancelled');
    
    const todayTransactions = redeemedTransactions.filter(t => new Date(t.createdAt) >= startOfToday);
    const weekTransactions = redeemedTransactions.filter(t => new Date(t.createdAt) >= startOfWeek);
    const monthTransactions = redeemedTransactions.filter(t => new Date(t.createdAt) >= startOfMonth);

    // Bar receives businessRevenue (100% of promo price)
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.businessRevenue, 0);
    const weekRevenue = weekTransactions.reduce((sum, t) => sum + t.businessRevenue, 0);
    const monthRevenue = monthTransactions.reduce((sum, t) => sum + t.businessRevenue, 0);
    const totalRevenue = redeemedTransactions.reduce((sum, t) => sum + t.businessRevenue, 0);

    const avgValue = redeemedTransactions.length > 0 ? Math.round(totalRevenue / redeemedTransactions.length) : 0;

    // Get top promotions
    const promoStats = new Map<string, { count: number; revenue: number; title: string }>();
    
    for (const transaction of redeemedTransactions) {
      const existing = promoStats.get(transaction.promotionId) || { count: 0, revenue: 0, title: '' };
      existing.count++;
      existing.revenue += transaction.businessRevenue;
      
      if (!existing.title) {
        const [promo] = await db
          .select({ title: promotions.title })
          .from(promotions)
          .where(eq(promotions.id, transaction.promotionId))
          .limit(1);
        existing.title = promo?.title || 'Promoción';
      }
      
      promoStats.set(transaction.promotionId, existing);
    }

    const topPromotions = Array.from(promoStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        name: p.title,
        quantity: p.count,
        revenue: p.revenue,
      }));

    res.json({
      success: true,
      businessId: targetBusiness.id,
      businessName: targetBusiness.name,
      revenue: {
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        total: totalRevenue,
      },
      orders: {
        total: transactions.length,
        completed: redeemedTransactions.length,
        cancelled: cancelledTransactions.length,
        avgValue,
      },
      topProducts: topPromotions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business orders
router.get("/orders", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses, orders, users, addresses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc, inArray } = await import("drizzle-orm");

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    if (ownerBusinesses.length === 0) {
      return res.status(404).json({ error: "No businesses found for this user" });
    }

    const businessIds = ownerBusinesses.map(b => b.id);

    const businessOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.businessId, businessIds))
      .orderBy(desc(orders.createdAt));

    const enrichedOrders = await Promise.all(
      businessOrders.map(async (order) => {
        let customer = null;
        if (order.userId) {
          const customerResult = await db
            .select({ id: users.id, name: users.name, phone: users.phone })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
          customer = customerResult[0] || null;
        }

        let address = null;
        if (order.addressId) {
          const addressResult = await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, order.addressId))
            .limit(1);
          address = addressResult[0] || null;
        }

        const business = ownerBusinesses.find(b => b.id === order.businessId);

        return {
          ...order,
          customer,
          address,
          businessName: business?.name || 'Negocio',
        };
      })
    );

    res.json({ success: true, orders: enrichedOrders });
  } catch (error: any) {
    console.error("Error loading business orders:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my businesses
router.get("/my-businesses", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses, orders } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, inArray } = await import("drizzle-orm");

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    const businessIds = ownerBusinesses.map(b => b.id);
    
    let allOrders: any[] = [];
    if (businessIds.length > 0) {
      allOrders = await db
        .select()
        .from(orders)
        .where(inArray(orders.businessId, businessIds));
    }

    const businessesWithStats = ownerBusinesses.map(business => {
      const businessOrders = allOrders.filter(o => o.businessId === business.id);
      const today = new Date();
      const todayOrders = businessOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === today.toDateString();
      });
      const todayRevenue = todayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => {
          const subtotalWithMarkup = (o.total || 0) - (o.deliveryFee || 0);
          const productBase = Math.round(subtotalWithMarkup / 1.15);
          return sum + productBase;
        }, 0);
      const pendingOrders = businessOrders.filter(o => 
        ["pending", "confirmed", "preparing"].includes(o.status)
      );

      return {
        ...business,
        stats: {
          pendingOrders: pendingOrders.length,
          todayOrders: todayOrders.length,
          todayRevenue: todayRevenue,
          totalOrders: businessOrders.length,
        },
      };
    });

    res.json({ success: true, businesses: businessesWithStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business products
router.get("/products", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { products, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const requestedBusinessId = req.query.businessId as string | undefined;

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    if (ownerBusinesses.length === 0) {
      return res.status(404).json({ error: "No businesses found" });
    }

    const ownerBusinessIds = ownerBusinesses.map(b => b.id);

    let targetBusinessId: string;
    if (requestedBusinessId) {
      if (!ownerBusinessIds.includes(requestedBusinessId)) {
        return res.status(403).json({ error: "No tienes acceso a este negocio" });
      }
      targetBusinessId = requestedBusinessId;
    } else {
      targetBusinessId = ownerBusinesses[0].id;
    }

    const businessProducts = await db
      .select()
      .from(products)
      .where(eq(products.businessId, targetBusinessId));

    res.json({ success: true, products: businessProducts, businessId: targetBusinessId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put("/orders/:id/status", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { orders, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { status } = req.body;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    const ownerBusinessIds = ownerBusinesses.map(b => b.id);

    if (!ownerBusinessIds.includes(order.businessId)) {
      return res.status(403).json({ error: "No tienes acceso a este pedido" });
    }

    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, req.params.id));

    res.json({ success: true, message: "Order status updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post("/products", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { products, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");
    const { v4: uuidv4 } = await import("uuid");

    const { businessId, name, description, price, image, category, isAvailable } = req.body;

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    const ownerBusinessIds = ownerBusinesses.map(b => b.id);

    if (!ownerBusinessIds.includes(businessId)) {
      return res.status(403).json({ error: "No tienes acceso a este negocio" });
    }

    const productData = {
      id: uuidv4(),
      businessId,
      name,
      description: description || null,
      price: parseInt(price) || 0,
      image: image || null,
      category: category || null,
      isAvailable: isAvailable !== false,
    };

    await db.insert(products).values(productData);
    res.json({ success: true, productId: productData.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put("/products/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { products, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    const ownerBusinessIds = ownerBusinesses.map(b => b.id);

    if (!ownerBusinessIds.includes(product.businessId)) {
      return res.status(403).json({ error: "No tienes acceso a este producto" });
    }

    await db
      .update(products)
      .set(req.body)
      .where(eq(products.id, req.params.id));

    res.json({ success: true, message: "Product updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete("/products/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { products, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const ownerBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id));

    const ownerBusinessIds = ownerBusinesses.map(b => b.id);

    if (!ownerBusinessIds.includes(product.businessId)) {
      return res.status(403).json({ error: "No tienes acceso a este producto" });
    }

    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle business status (pause/resume)
router.put("/:id/toggle-status", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, req.params.id),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    await db
      .update(businesses)
      .set({ isActive: !business.isActive })
      .where(eq(businesses.id, req.params.id));

    res.json({ 
      success: true, 
      isActive: !business.isActive,
      message: !business.isActive ? "Negocio activado" : "Negocio pausado"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business hours (simplified - auto-detect business)
router.get("/hours", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const defaultHours = [
      { day: "Lunes", isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { day: "Martes", isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { day: "Miércoles", isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { day: "Jueves", isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { day: "Viernes", isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { day: "Sábado", isOpen: true, openTime: "09:00", closeTime: "14:00" },
      { day: "Domingo", isOpen: false, openTime: "09:00", closeTime: "14:00" },
    ];

    const hours = business.openingHours ? JSON.parse(business.openingHours) : defaultHours;
    res.json({ success: true, hours });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update business hours (simplified - auto-detect business)
router.put("/hours", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, req.user!.id))
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    await db
      .update(businesses)
      .set({ openingHours: JSON.stringify(req.body.hours) })
      .where(eq(businesses.id, business.id));

    res.json({ success: true, message: "Horarios actualizados" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business hours
router.get("/:id/hours", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, req.params.id),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const hours = business.openingHours ? JSON.parse(business.openingHours) : {};
    res.json({ success: true, hours });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set business hours
router.put("/:id/hours", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, req.params.id),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    await db
      .update(businesses)
      .set({ openingHours: JSON.stringify(req.body.hours) })
      .where(eq(businesses.id, req.params.id));

    res.json({ success: true, message: "Horarios actualizados" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
