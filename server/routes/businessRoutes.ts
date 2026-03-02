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
    const transactions = await db.select().from(promotionTransactions).where(eq(promotionTransactions.businessId, business.id)).orderBy(desc(promotionTransactions.createdAt));
    const pendingTransactions = transactions.filter(t => t.status === "pending");
    const today = new Date();
    const todayTransactions = transactions.filter(t => new Date(t.createdAt).toDateString() === today.toDateString());
    const todayRevenue = todayTransactions.filter(t => t.status === "redeemed").reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
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
        recentOrders: recentTransactions 
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
    const transactions = await db.select().from(promotionTransactions).where(eq(promotionTransactions.businessId, business.id)).orderBy(desc(promotionTransactions.createdAt));
    const redeemedTransactions = transactions.filter(t => t.status === 'redeemed');
    const totalRevenue = redeemedTransactions.reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    // Calcular ingresos por período
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayRevenue = redeemedTransactions
      .filter(t => new Date(t.createdAt) >= todayStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const weekRevenue = redeemedTransactions
      .filter(t => new Date(t.createdAt) >= weekStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const monthRevenue = redeemedTransactions
      .filter(t => new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => sum + (Number(t.businessRevenue) || 0), 0);
    
    const avgValue = redeemedTransactions.length > 0 
      ? Math.round(totalRevenue / redeemedTransactions.length)
      : 0;
    
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
        cancelled: transactions.filter(t => t.status === 'cancelled').length,
        avgValue: avgValue
      } 
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