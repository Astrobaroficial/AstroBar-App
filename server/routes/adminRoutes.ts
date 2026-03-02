import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { sql } from "drizzle-orm";

const router = express.Router();

// Dashboard metrics
router.get("/dashboard/metrics", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { users, businesses, promotions, promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const allUsers = await db.select().from(users);
    const allBusinesses = await db.select().from(businesses);
    const allPromotions = await db.select().from(promotions);
    const allTransactions = await db.select().from(promotionTransactions);

    const activePromotions = allPromotions.filter(p => p.isActive).length;
    const pausedBusinesses = allBusinesses.filter(b => !b.isActive).length;
    const totalBars = allBusinesses.length;
    const totalUsers = allUsers.filter(u => u.role === 'customer').length;

    res.json({
      totalBars,
      activePromotions,
      totalUsers,
      pausedBusinesses,
      totalBusinesses: totalBars,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Get all transactions (promotions)
router.get("/transactions", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotionTransactions, promotions, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const allTransactions = await db
      .select()
      .from(promotionTransactions)
      .orderBy(desc(promotionTransactions.createdAt));

    const enriched = await Promise.all(
      allTransactions.map(async (transaction) => {
        const [user] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, transaction.userId))
          .limit(1);

        const [business] = await db
          .select({ name: businesses.name })
          .from(businesses)
          .where(eq(businesses.id, transaction.businessId))
          .limit(1);

        const [promotion] = await db
          .select({ title: promotions.title, type: promotions.type })
          .from(promotions)
          .where(eq(promotions.id, transaction.promotionId))
          .limit(1);

        return {
          ...transaction,
          user: user || { name: 'Usuario', email: '' },
          business: business || { name: 'Bar' },
          promotion: promotion || { title: 'Promoción', type: 'common' },
        };
      })
    );

    res.json({ success: true, transactions: enriched });
  } catch (error: any) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get promotions dashboard
router.get("/promotions/dashboard", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotions, promotionTransactions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, lte, sql } = await import("drizzle-orm");

    const now = new Date();

    // Get active promotions
    const activePromotions = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          lte(promotions.startTime, now),
          gte(promotions.endTime, now),
          sql`${promotions.stock} > ${promotions.stockConsumed}`
        )
      );

    const totalFlash = activePromotions.filter(p => p.type === 'flash').length;
    const totalCommon = activePromotions.filter(p => p.type === 'common').length;

    // Get all transactions
    const allTransactions = await db.select().from(promotionTransactions);
    const acceptedCount = allTransactions.length;
    const redeemedCount = allTransactions.filter(t => t.status === 'redeemed').length;
    const acceptanceRate = acceptedCount > 0 ? Math.round((redeemedCount / acceptedCount) * 100) : 0;

    // Calculate avg redemption time
    const redeemedTransactions = allTransactions.filter(t => t.status === 'redeemed' && t.redeemedAt);
    const avgRedemptionTime = redeemedTransactions.length > 0
      ? Math.round(
          redeemedTransactions.reduce((sum, t) => {
            const created = new Date(t.createdAt).getTime();
            const redeemed = new Date(t.redeemedAt!).getTime();
            return sum + (redeemed - created) / 60000; // minutes
          }, 0) / redeemedTransactions.length
        )
      : 0;

    // Get top bars by redemptions
    const barStats = new Map<string, { name: string; count: number }>();
    for (const transaction of redeemedTransactions) {
      const existing = barStats.get(transaction.businessId) || { name: '', count: 0 };
      existing.count++;
      
      if (!existing.name) {
        const [business] = await db
          .select({ name: businesses.name })
          .from(businesses)
          .where(eq(businesses.id, transaction.businessId))
          .limit(1);
        existing.name = business?.name || 'Bar';
      }
      
      barStats.set(transaction.businessId, existing);
    }

    const topBars = Array.from(barStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      dashboard: {
        totalActive: activePromotions.length,
        totalFlash,
        totalCommon,
        acceptanceRate,
        avgRedemptionTime,
        topBars,
      },
    });
  } catch (error: any) {
    console.error('Promotions dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get("/users", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
      
    res.json({ success: true, users: allUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all businesses with commissions
router.get("/commissions", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { businesses: businessesTable } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");

    const result = await db.execute(sql`
      SELECT 
        b.id as businessId,
        b.name as businessName,
        COALESCE(bc.platform_commission, 0.30) as commission,
        bc.updated_at as lastUpdated
      FROM businesses b
      LEFT JOIN business_commissions bc ON b.id = bc.business_id
      WHERE b.is_active = 1
      ORDER BY b.name
    `);

    const businesses = Array.isArray(result[0]) ? result[0] : result;
    res.json({ success: true, businesses });
  } catch (error: any) {
    console.error('Commissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update business commission
router.post("/commissions", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    const { v4: uuidv4 } = await import("uuid");

    const { businessId, commission, notes } = req.body;

    if (commission < 0.05 || commission > 0.30) {
      return res.status(400).json({ error: 'La comisión debe estar entre 5% y 30%' });
    }

    await db.execute(sql`
      INSERT INTO business_commissions (id, business_id, platform_commission, notes, created_by)
      VALUES (${uuidv4()}, ${businessId}, ${commission}, ${notes || ''}, ${req.user!.id})
      ON DUPLICATE KEY UPDATE 
        platform_commission = ${commission},
        notes = ${notes || ''},
        updated_at = CURRENT_TIMESTAMP
    `);

    res.json({ success: true, message: 'Comisión actualizada' });
  } catch (error: any) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put("/users/:id", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { name, email, phone, role } = req.body;
    const userId = req.params.id;

    await db
      .update(users)
      .set({
        name,
        email,
        phone,
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
      
    res.json({ success: true, message: "Usuario actualizado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
router.get("/orders", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { orders, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const enrichedOrders = [];
    for (const order of allOrders) {
      const business = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, order.businessId))
        .limit(1);
        
      const customer = await db
        .select({ name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      enrichedOrders.push({
        id: order.id,
        userId: order.userId,
        businessId: order.businessId,
        businessName: business[0]?.name || order.businessName || "Negocio",
        businessImage: order.businessImage,
        customerName: customer[0]?.name || "Cliente",
        customerPhone: customer[0]?.phone || "",
        status: order.status,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        items: order.items,
        notes: order.notes,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        deliveryPersonId: order.deliveryPersonId,
      });
    }
    
    res.json({ success: true, orders: enrichedOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business products
router.get("/businesses/:id/products", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { products } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const businessProducts = await db
      .select()
      .from(products)
      .where(eq(products.businessId, req.params.id));
      
    res.json({ success: true, products: businessProducts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all businesses
router.get("/businesses", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const allBusinesses = await db
      .select()
      .from(businesses)
      .orderBy(desc(businesses.createdAt));

    console.log('📊 Found businesses:', allBusinesses.length);

    const enriched = await Promise.all(
      allBusinesses.map(async (business) => {
        if (!business.ownerId) {
          return {
            ...business,
            ownerName: 'Sin propietario',
          };
        }

        const [owner] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, business.ownerId))
          .limit(1);

        return {
          ...business,
          ownerName: owner?.name || 'Propietario',
        };
      })
    );

    console.log('📊 Enriched businesses:', enriched);
      
    res.json({ success: true, businesses: enriched });
  } catch (error: any) {
    console.error('Get businesses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update business verification status
router.patch("/businesses/:id/verification", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { isActive } = req.body;

    await db
      .update(businesses)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(businesses.id, req.params.id));

    res.json({ success: true, message: isActive ? 'Bar aprobado' : 'Bar rechazado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Zones
router.get("/zones", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ success: true, zones: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery zones
router.get("/delivery-zones", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { deliveryZones } = await import("@shared/schema-mysql");
    const { db } = await import("../db");

    const zones = await db.select().from(deliveryZones);
    
    res.json({ 
      success: true, 
      zones: zones
    });
  } catch (error: any) {
    console.error('Delivery zones error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Drivers
router.get("/drivers", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");

    res.json({ success: true, drivers: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Check database wallets (no auth for testing)
router.get("/debug/wallets-noauth", async (req, res) => {
  try {
    const { db } = await import("../db");
    
    const result = await db.execute(sql`
      SELECT 
        w.id, w.user_id, w.balance, w.pending_balance, w.total_earned, w.total_withdrawn,
        u.name, u.email, u.role, u.phone
      FROM wallets w 
      LEFT JOIN users u ON w.user_id = u.id 
      ORDER BY w.total_earned DESC
    `);
    
    res.json({ success: true, wallets: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: Check database wallets
router.get("/debug/wallets", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    
    const result = await db.execute(sql`
      SELECT 
        w.id, w.userId, w.balance, w.pendingBalance, w.totalEarned, w.totalWithdrawn,
        u.name, u.email, u.role, u.phone
      FROM wallets w 
      LEFT JOIN users u ON w.userId = u.id 
      ORDER BY w.totalEarned DESC
    `);
    
    res.json({ success: true, wallets: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all wallets (admin)
router.get("/wallets", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    
    const result = await db.execute(sql`
      SELECT 
        w.id, w.user_id as userId, w.balance, w.pending_balance as pendingBalance, 
        w.total_earned as totalEarned, w.total_withdrawn as totalWithdrawn,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.role as user_role
      FROM wallets w 
      LEFT JOIN users u ON w.user_id = u.id
    `);
    
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const walletsWithUsers = rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      balance: row.balance || 0,
      pendingBalance: row.pendingBalance || 0,
      totalEarned: row.totalEarned || 0,
      totalWithdrawn: row.totalWithdrawn || 0,
      user: row.user_name ? {
        id: row.user_id,
        name: row.user_name,
        phone: row.user_phone,
        role: row.user_role
      } : null
    }));

    res.json({ success: true, wallets: walletsWithUsers });
  } catch (error: any) {
    console.error('Wallets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release pending balance (admin action)
router.post("/wallets/:walletId/release", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { wallets } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, req.params.walletId))
      .limit(1);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (wallet.pendingBalance <= 0) {
      return res.status(400).json({ error: "No pending balance to release" });
    }

    await db
      .update(wallets)
      .set({
        balance: wallet.balance + wallet.pendingBalance,
        pendingBalance: 0,
        updatedAt: new Date()
      })
      .where(eq(wallets.id, req.params.walletId));

    res.json({ success: true, message: "Balance released successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance data
router.get("/finance", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { transactions, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const allTransactions = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
    
    const enrichedTransactions = [];
    for (const transaction of allTransactions) {
      const user = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, transaction.userId))
        .limit(1);
        
      enrichedTransactions.push({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        userId: transaction.userId,
        userName: user[0]?.name || 'Usuario desconocido',
        userEmail: user[0]?.email || '',
        userRole: user[0]?.role || ''
      });
    }

    res.json({ 
      success: true, 
      transactions: enrichedTransactions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Coupons
router.get("/coupons", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ success: true, coupons: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Support tickets
router.get("/support/tickets", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ success: true, tickets: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Support tickets
router.get("/support", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ success: true, tickets: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin logs
router.get("/logs", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ success: true, logs: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// System settings
router.get("/settings", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { systemSettings } = await import("@shared/schema-mysql");
    const { db } = await import("../db");

    const settings = await db.select().from(systemSettings);
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send push notification
router.post("/notifications/push", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, isNotNull } = await import("drizzle-orm");
    const { sendBulkPushNotifications } = await import("../services/pushNotifications");

    const { title, body, target } = req.body; // target: 'all' | 'customers' | 'businesses'

    let targetUsers;
    if (target === 'customers') {
      targetUsers = await db.select().from(users).where(eq(users.role, 'customer'));
    } else if (target === 'businesses') {
      targetUsers = await db.select().from(users).where(eq(users.role, 'business_owner'));
    } else {
      targetUsers = await db.select().from(users).where(isNotNull(users.pushToken));
    }

    const tokens = targetUsers
      .filter(u => u.pushToken)
      .map(u => u.pushToken!);

    if (tokens.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No hay usuarios con tokens' });
    }

    await sendBulkPushNotifications(tokens, title, body);

    res.json({ success: true, sent: tokens.length });
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

// Bank account (placeholder)
router.get("/bank-account", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    res.json({ 
      success: true, 
      bankAccount: null,
      message: "No bank account configured" 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
