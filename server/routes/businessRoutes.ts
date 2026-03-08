import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { businesses, promotionTransactions, products, promotions } from "@shared/schema-mysql";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

console.log('🔧 Business routes loaded');

// Test route
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Business routes working" });
});

// My businesses route (PROTECTED - debe ir antes de /:id)
router.get("/my-businesses", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const ownerBusinesses = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id));
    res.json({ success: true, businesses: ownerBusinesses });
  } catch (error: any) {
    console.error('My businesses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Products route (PROTECTED - debe ir antes de /:id)
router.get("/products", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    // Si no tiene negocio, crear uno automáticamente
    if (!business) {
      const businessId = uuidv4();
      const newBusiness = {
        id: businessId,
        name: "Mi Bar",
        address: "Buenos Aires, Argentina",
        latitude: -34.6037,
        longitude: -58.3816,
        phone: "+54 11 1234-5678",
        description: "Un bar increíble en Buenos Aires",
        ownerId: req.user!.id,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(businesses).values(newBusiness);
      business = newBusiness;
    }
    
    const businessProducts = await db.select().from(products).where(eq(products.businessId, business.id));
    res.json({ success: true, products: businessProducts, businessId: business.id });
  } catch (error: any) {
    console.error('Products route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard route (PROTECTED - debe ir antes de /:id)
router.get("/dashboard", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      const businessId = uuidv4();
      const newBusiness = {
        id: businessId,
        name: "Mi Bar",
        address: "Buenos Aires, Argentina",
        latitude: -34.6037,
        longitude: -58.3816,
        phone: "+54 11 1234-5678",
        description: "Un bar increíble en Buenos Aires",
        ownerId: req.user!.id,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(businesses).values(newBusiness);
      business = newBusiness;
    }
    const transactions = await db.select().from(promotionTransactions).where(eq(promotionTransactions.businessId, business.id)).orderBy(desc(promotionTransactions.createdAt));
    const pendingTransactions = transactions.filter(t => t.status === "pending");
    const today = new Date();
    const todayTransactions = transactions.filter(t => new Date(t.createdAt).toDateString() === today.toDateString());
    
    // INGRESOS = Todas las transacciones pagadas (pending + redeemed), NO canceladas
    const paidTransactions = todayTransactions.filter(t => t.status === "pending" || t.status === "redeemed");
    const todayRevenue = paidTransactions.reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    // Promociones activas
    const now = new Date();
    const { and, gte, lte, sql } = await import("drizzle-orm");
    const activePromotions = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.businessId, business.id),
          eq(promotions.isActive, true),
          lte(promotions.startTime, now),
          gte(promotions.endTime, now)
        )
      );
    const activeFlash = activePromotions.filter(p => p.type === 'flash');
    const activeCommon = activePromotions.filter(p => p.type === 'common');

    // Obtener comisión actual desde DB
    const commissionResult: any = await db.execute(sql`
      SELECT platform_commission
      FROM business_commissions
      WHERE business_id = ${business.id}
      LIMIT 1
    `);
    
    let platformCommission = 30;
    if (commissionResult && commissionResult[0] && commissionResult[0][0] && commissionResult[0][0].platform_commission) {
      platformCommission = parseFloat(commissionResult[0][0].platform_commission) * 100;
    }

    // Solo mostrar transacciones reales (redeemed o pending)
    const recentTransactions = transactions
      .filter(t => t.status === "redeemed" || t.status === "pending")
      .slice(0, 10)
      .map(t => ({ 
        id: t.id, 
        status: t.status === "redeemed" ? "delivered" : "pending", 
        subtotal: t.amountPaid || 0, 
        customerName: 'Cliente', 
        createdAt: t.createdAt 
      }));
    res.json({ 
      success: true, 
      dashboard: { 
        business, 
        isOpen: business.isActive, 
        pendingOrders: pendingTransactions.length, 
        todayOrders: todayTransactions.length, 
        todayRevenue, 
        totalOrders: transactions.length, 
        recentOrders: recentTransactions,
        activePromotions: {
          total: activePromotions.length,
          flash: activeFlash.length,
          common: activeCommon.length,
          flashList: activeFlash.map(p => ({ id: p.id, title: p.title, stock: p.stock - p.stockConsumed })),
          commonList: activeCommon.map(p => ({ id: p.id, title: p.title, stock: p.stock - p.stockConsumed }))
        },
        platformCommission
      } 
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stats route (PROTECTED - debe ir antes de /:id)
router.get("/stats", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    if (!business) {
      const businessId = uuidv4();
      const newBusiness = {
        id: businessId,
        name: "Mi Bar",
        address: "Buenos Aires, Argentina",
        latitude: -34.6037,
        longitude: -58.3816,
        phone: "+54 11 1234-5678",
        description: "Un bar increíble en Buenos Aires",
        ownerId: req.user!.id,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(businesses).values(newBusiness);
      business = newBusiness;
    }
    const transactions = await db.select().from(promotionTransactions).where(eq(promotionTransactions.businessId, business.id)).orderBy(desc(promotionTransactions.createdAt));
    const redeemedTransactions = transactions.filter(t => t.status === 'redeemed');
    
    // INGRESOS TOTALES = Todas las transacciones pagadas (pending + redeemed), NO canceladas
    const paidTransactions = transactions.filter(t => t.status === 'pending' || t.status === 'redeemed');
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    // Calcular ingresos por período
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayRevenue = paidTransactions
      .filter(t => new Date(t.createdAt) >= todayStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const weekRevenue = paidTransactions
      .filter(t => new Date(t.createdAt) >= weekStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const monthRevenue = paidTransactions
      .filter(t => new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const avgValue = redeemedTransactions.length > 0 
      ? Math.round(totalRevenue / redeemedTransactions.length)
      : 0;
    
    // Top productos
    const { sql } = await import("drizzle-orm");
    const topProductsResult = await db.execute(sql`
      SELECT p.title as name, COUNT(*) as quantity, SUM(pt.business_revenue) as revenue
      FROM promotion_transactions pt
      JOIN promotions p ON pt.promotion_id = p.id
      WHERE pt.business_id = ${business.id} AND pt.status = 'redeemed'
      GROUP BY p.id
      ORDER BY quantity DESC
      LIMIT 5
    `);
    const topProducts = (Array.isArray(topProductsResult[0]) ? topProductsResult[0] : topProductsResult).map((p: any) => ({
      name: p.name,
      quantity: Number(p.quantity),
      revenue: Number(p.revenue) / 100
    }));

    // Tasa de cancelación
    const cancelledCount = transactions.filter(t => t.status === 'cancelled').length;
    const cancellationRate = transactions.length > 0 ? Math.round((cancelledCount / transactions.length) * 100) : 0;

    // Horarios pico (horas con más canjes)
    const hourlyStats = new Map<number, number>();
    redeemedTransactions.forEach(t => {
      const hour = new Date(t.redeemedAt || t.createdAt).getHours();
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
    });
    const peakHours = Array.from(hourlyStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour, count }));

    // Top usuarios
    const topUsersResult = await db.execute(sql`
      SELECT u.name, u.phone, COUNT(*) as redemptions, SUM(pt.amount_paid) as totalSpent
      FROM promotion_transactions pt
      JOIN users u ON pt.user_id = u.id
      WHERE pt.business_id = ${business.id} AND pt.status = 'redeemed'
      GROUP BY u.id
      ORDER BY redemptions DESC
      LIMIT 5
    `);
    const topUsers = (Array.isArray(topUsersResult[0]) ? topUsersResult[0] : topUsersResult).map((u: any) => ({
      name: u.name,
      phone: u.phone,
      redemptions: Number(u.redemptions),
      totalSpent: Number(u.totalSpent) / 100
    }));
    
    res.json({ 
      success: true, 
      businessId: business.id, 
      businessName: business.name, 
      revenue: { 
        today: todayRevenue,
        week: weekRevenue, 
        month: monthRevenue,
        total: totalRevenue 
      }, 
      orders: { 
        total: transactions.length, 
        completed: redeemedTransactions.length,
        cancelled: cancelledCount,
        avgValue: avgValue
      },
      topProducts,
      cancellationRate,
      peakHours,
      topUsers
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Promotions route (PROTECTED - debe ir antes de /:id)
router.get("/promotions", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    
    // Si no tiene negocio, crear uno automáticamente
    if (!business) {
      const businessId = uuidv4();
      const newBusiness = {
        id: businessId,
        name: "Mi Bar",
        address: "Buenos Aires, Argentina",
        latitude: -34.6037,
        longitude: -58.3816,
        phone: "+54 11 1234-5678",
        description: "Un bar increíble en Buenos Aires",
        ownerId: req.user!.id,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(businesses).values(newBusiness);
      business = newBusiness;
    }
    const businessPromotions = await db.select().from(promotions).where(eq(promotions.businessId, business.id));
    const now = new Date();
    const activePromotions = businessPromotions.filter(p => p.isActive && new Date(p.endTime) > now);
    const flashPromotions = activePromotions.filter(p => p.type === 'flash');
    const commonPromotions = activePromotions.filter(p => p.type === 'common');
    const totalStock = activePromotions.reduce((sum, p) => sum + (p.stock || 0), 0);
    res.json({ 
      success: true, 
      promotions: businessPromotions,
      activePromotions: activePromotions.length,
      flashPromotions: flashPromotions.length,
      commonPromotions: commonPromotions.length,
      totalStock
    });
  } catch (error: any) {
    console.error('Promotions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get business limits status
router.get("/limits", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Contar productos
    const productCount = await db.select().from(products).where(eq(products.businessId, business.id));
    
    // Contar promociones activas
    const now = new Date();
    const { and, gte, lte } = await import("drizzle-orm");
    const activePromotions = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.businessId, business.id),
          eq(promotions.isActive, true),
          lte(promotions.startTime, now),
          gte(promotions.endTime, now)
        )
      );

    const activeFlash = activePromotions.filter(p => p.type === 'flash').length;
    const activeCommon = activePromotions.filter(p => p.type === 'common').length;

    const limits = {
      products: {
        current: productCount.length,
        max: 80,
        percentage: Math.round((productCount.length / 80) * 100),
        canAdd: productCount.length < 80
      },
      flashPromotions: {
        current: activeFlash,
        max: 3,
        percentage: Math.round((activeFlash / 3) * 100),
        canAdd: activeFlash < 3
      },
      commonPromotions: {
        current: activeCommon,
        max: 10,
        percentage: Math.round((activeCommon / 10) * 100),
        canAdd: activeCommon < 10
      }
    };

    res.json({ success: true, limits });
  } catch (error: any) {
    console.error('Limits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug commission (NO AUTH for testing)
router.get("/debug-commission-test", async (req, res) => {
  try {
    const { sql } = await import("drizzle-orm");
    
    // Query commission for test bar
    const commissionResult: any = await db.execute(sql`
      SELECT platform_commission
      FROM business_commissions
      WHERE business_id = 'bar_test_001'
      LIMIT 1
    `);

    const rawResult = commissionResult;
    const firstElement = commissionResult[0];
    const platformCommissionValue = commissionResult[0]?.platform_commission;
    const calculated = platformCommissionValue ? parseFloat(platformCommissionValue) * 100 : 30;

    res.json({ 
      success: true,
      businessId: 'bar_test_001',
      rawResult,
      firstElement,
      platformCommissionValue,
      calculated,
      type: typeof platformCommissionValue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug commission
router.get("/debug-commission", authenticateToken, async (req, res) => {
  try {
    const { sql } = await import("drizzle-orm");
    
    // Get user's business
    const [userBusiness] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);

    if (!userBusiness) {
      return res.json({ error: 'No business found' });
    }

    // Query commission
    const commissionResult: any = await db.execute(sql`
      SELECT platform_commission
      FROM business_commissions
      WHERE business_id = ${userBusiness.id}
      LIMIT 1
    `);

    const rawResult = commissionResult;
    const firstElement = commissionResult[0];
    const platformCommissionValue = commissionResult[0]?.platform_commission;
    const calculated = platformCommissionValue ? parseFloat(platformCommissionValue) * 100 : 30;

    res.json({ 
      success: true,
      businessId: userBusiness.id,
      businessName: userBusiness.name,
      rawResult,
      firstElement,
      platformCommissionValue,
      calculated,
      type: typeof platformCommissionValue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public route to list all businesses
router.get("/", async (req, res) => {
  try {
    const allBusinesses = await db.select().from(businesses).where(eq(businesses.isActive, true));
    res.json({ success: true, businesses: allBusinesses });
  } catch (error: any) {
    console.error('List businesses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Featured businesses route (PUBLIC)
router.get("/featured", async (req, res) => {
  try {
    const featuredBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true))
      .limit(10);
    res.json({ success: true, businesses: featuredBusinesses });
  } catch (error: any) {
    console.error('Featured businesses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public route to get business by ID (DEBE IR AL FINAL)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    res.json({ success: true, business });
  } catch (error: any) {
    console.error('Get business error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create product route
router.post("/products", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    let [business] = await db.select().from(businesses).where(eq(businesses.ownerId, req.user!.id)).limit(1);
    if (!business) return res.status(404).json({ error: "Business not found" });
    
    // Check product limit (80 products per bar)
    const existingProducts = await db.select().from(products).where(eq(products.businessId, business.id));
    if (existingProducts.length >= 80) {
      return res.status(400).json({ error: "Máximo 80 productos por bar. Elimina algunos productos para agregar nuevos." });
    }
    
    const { name, category, price, description, image, isAvailable } = req.body;
    const productId = uuidv4();
    
    const newProduct = {
      id: productId,
      businessId: business.id,
      name: name || "Nuevo Producto",
      category: category || "General",
      price: price || 1000,
      description: description || "",
      image: image,
      isAvailable: isAvailable !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(products).values(newProduct);
    res.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update business route
router.put("/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, address, phone, image } = req.body;
    
    // Verificar que el negocio pertenece al usuario
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!business || business.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes permiso para editar este negocio" });
    }
    
    const updatedBusiness = {
      name,
      description,
      type,
      address,
      phone,
      image,
      updatedAt: new Date()
    };
    
    await db.update(businesses).set(updatedBusiness).where(eq(businesses.id, id));
    res.json({ success: true, business: updatedBusiness });
  } catch (error: any) {
    console.error('Update business error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product route
router.put("/products/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, image, isAvailable } = req.body;
    
    const updatedProduct = {
      name,
      category,
      price,
      description,
      image,
      isAvailable,
      updatedAt: new Date()
    };
    
    await db.update(products).set(updatedProduct).where(eq(products.id, id));
    res.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product route
router.delete("/products/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el producto pertenece al negocio del usuario
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    const [business] = await db.select().from(businesses).where(eq(businesses.id, product.businessId)).limit(1);
    if (!business || business.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este producto" });
    }
    
    await db.delete(products).where(eq(products.id, id));
    res.json({ success: true, message: "Producto eliminado" });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;