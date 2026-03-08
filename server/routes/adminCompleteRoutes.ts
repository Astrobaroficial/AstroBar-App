import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// ==================== TRANSACCIONES DETALLADAS ====================

// Get all transactions with filters
router.get("/transactions/detailed", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotionTransactions, promotions, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, lte, desc } = await import("drizzle-orm");

    const { startDate, endDate, status, businessId, userId } = req.query;

    let query = db.select().from(promotionTransactions);

    const conditions = [];
    if (startDate) conditions.push(gte(promotionTransactions.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(promotionTransactions.createdAt, new Date(endDate as string)));
    if (status) conditions.push(eq(promotionTransactions.status, status as string));
    if (businessId) conditions.push(eq(promotionTransactions.businessId, businessId as string));
    if (userId) conditions.push(eq(promotionTransactions.userId, userId as string));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const transactions = await query.orderBy(desc(promotionTransactions.createdAt));

    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const [user] = await db.select().from(users).where(eq(users.id, t.userId)).limit(1);
        const [business] = await db.select().from(businesses).where(eq(businesses.id, t.businessId)).limit(1);
        const [promotion] = await db.select().from(promotions).where(eq(promotions.id, t.promotionId)).limit(1);

        return {
          ...t,
          userName: user?.name || "Usuario",
          userEmail: user?.email,
          businessName: business?.name || "Bar",
          promotionTitle: promotion?.title || "Promoción",
          promotionType: promotion?.type,
        };
      })
    );

    res.json({ success: true, transactions: enriched, total: enriched.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export transactions to CSV
router.get("/transactions/export", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");

    const transactions = await db.select().from(promotionTransactions);

    const csv = [
      "ID,Usuario,Bar,Promoción,Monto,Comisión,Estado,Fecha",
      ...transactions.map(t =>
        `${t.id},${t.userId},${t.businessId},${t.promotionId},${t.amountPaid},${t.platformCommission},${t.status},${t.createdAt}`
      )
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GESTIÓN DE PROMOCIONES ====================

// Get all promotions with filters
router.get("/promotions/all", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const { status, type, businessId } = req.query;

    let allPromotions = await db.select().from(promotions).orderBy(desc(promotions.createdAt));

    if (status === "active") allPromotions = allPromotions.filter(p => p.isActive);
    if (status === "inactive") allPromotions = allPromotions.filter(p => !p.isActive);
    if (type) allPromotions = allPromotions.filter(p => p.type === type);
    if (businessId) allPromotions = allPromotions.filter(p => p.businessId === businessId);

    const enriched = await Promise.all(
      allPromotions.map(async (promo) => {
        const [business] = await db.select().from(businesses).where(eq(businesses.id, promo.businessId)).limit(1);
        return { ...promo, businessName: business?.name || "Bar" };
      })
    );

    res.json({ success: true, promotions: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle promotion status (admin override)
router.patch("/promotions/:id/toggle", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [promo] = await db.select().from(promotions).where(eq(promotions.id, req.params.id)).limit(1);

    await db.update(promotions)
      .set({ isActive: !promo.isActive, updatedAt: new Date() })
      .where(eq(promotions.id, req.params.id));

    await logAuditAction(req.user!.id, "promotion_toggle", "promotion", req.params.id, 
      `${promo.isActive}`, `${!promo.isActive}`);

    res.json({ success: true, message: "Promoción actualizada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete promotion (admin only)
router.delete("/promotions/:id", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    await db.delete(promotions).where(eq(promotions.id, req.params.id));

    await logAuditAction(req.user!.id, "promotion_delete", "promotion", req.params.id, null, null);

    res.json({ success: true, message: "Promoción eliminada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GESTIÓN DE PUNTOS ====================

// Get all user points
router.get("/points", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { userPoints, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const allPoints = await db.select().from(userPoints);

    const enriched = await Promise.all(
      allPoints.map(async (points) => {
        const [user] = await db.select().from(users).where(eq(users.id, points.userId)).limit(1);
        return { ...points, userName: user?.name || "Usuario", userEmail: user?.email };
      })
    );

    res.json({ success: true, points: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Adjust user points manually
router.post("/points/adjust", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { userPoints } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const { userId, points, reason } = req.body;

    const [current] = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);

    if (!current) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const newTotal = current.totalPoints + points;

    await db.update(userPoints)
      .set({ totalPoints: newTotal, updatedAt: new Date() })
      .where(eq(userPoints.userId, userId));

    await logAuditAction(req.user!.id, "points_adjust", "user_points", userId, 
      `${current.totalPoints}`, `${newTotal}`, reason);

    res.json({ success: true, message: "Puntos ajustados", newTotal });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== QR CODES ====================

// Get active QR codes
router.get("/qr-codes/active", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotionTransactions, promotions, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const activeQRs = await db.select()
      .from(promotionTransactions)
      .where(and(
        eq(promotionTransactions.status, "accepted"),
        sql`${promotionTransactions.qrCode} IS NOT NULL`
      ));

    const enriched = await Promise.all(
      activeQRs.map(async (qr) => {
        const [user] = await db.select().from(users).where(eq(users.id, qr.userId)).limit(1);
        const [promo] = await db.select().from(promotions).where(eq(promotions.id, qr.promotionId)).limit(1);
        return { ...qr, userName: user?.name, promotionTitle: promo?.title };
      })
    );

    res.json({ success: true, qrCodes: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Invalidate QR code
router.post("/qr-codes/:id/invalidate", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { promotionTransactions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    await db.update(promotionTransactions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(promotionTransactions.id, req.params.id));

    await logAuditAction(req.user!.id, "qr_invalidate", "transaction", req.params.id, null, null);

    res.json({ success: true, message: "QR code invalidado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SOPORTE Y TICKETS ====================

// Get all support tickets
router.get("/support/tickets", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");

    const tickets = await db.execute(sql`
      SELECT t.*, u.name as user_name, u.email as user_email,
             a.name as assigned_name
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      ORDER BY t.created_at DESC
    `);

    res.json({ success: true, tickets: Array.isArray(tickets[0]) ? tickets[0] : tickets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket messages
router.get("/support/tickets/:id/messages", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");

    const messages = await db.execute(sql`
      SELECT m.*, u.name as user_name
      FROM ticket_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = ${req.params.id}
      ORDER BY m.created_at ASC
    `);

    res.json({ success: true, messages: Array.isArray(messages[0]) ? messages[0] : messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reply to ticket
router.post("/support/tickets/:id/reply", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { message } = req.body;

    await db.execute(sql`
      INSERT INTO ticket_messages (id, ticket_id, user_id, message, is_admin)
      VALUES (${uuidv4()}, ${req.params.id}, ${req.user!.id}, ${message}, TRUE)
    `);

    await db.execute(sql`
      UPDATE support_tickets 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${req.params.id}
    `);

    res.json({ success: true, message: "Respuesta enviada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Close ticket
router.patch("/support/tickets/:id/close", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");

    await db.execute(sql`
      UPDATE support_tickets 
      SET status = 'closed', resolved_at = CURRENT_TIMESTAMP 
      WHERE id = ${req.params.id}
    `);

    res.json({ success: true, message: "Ticket cerrado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NOTIFICACIONES PROGRAMADAS ====================

// Get scheduled notifications
router.get("/notifications/scheduled", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");

    const notifications = await db.execute(sql`
      SELECT n.*, u.name as created_by_name
      FROM scheduled_notifications n
      LEFT JOIN users u ON n.created_by = u.id
      ORDER BY n.scheduled_for DESC
    `);

    res.json({ success: true, notifications: Array.isArray(notifications[0]) ? notifications[0] : notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule notification
router.post("/notifications/schedule", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { title, body, targetType, targetFilter, scheduledFor } = req.body;

    await db.execute(sql`
      INSERT INTO scheduled_notifications 
      (id, title, body, target_type, target_filter, scheduled_for, created_by)
      VALUES (${uuidv4()}, ${title}, ${body}, ${targetType}, ${JSON.stringify(targetFilter || {})}, 
              ${scheduledFor}, ${req.user!.id})
    `);

    res.json({ success: true, message: "Notificación programada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTES Y ANALYTICS ====================

// Revenue report by period
router.get("/reports/revenue", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { startDate, endDate } = req.query;

    const report = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(amount_paid) as total_revenue,
        SUM(platform_commission) as platform_earnings,
        SUM(business_revenue) as business_earnings
      FROM promotion_transactions
      WHERE status = 'redeemed'
        AND created_at >= ${startDate || '2024-01-01'}
        AND created_at <= ${endDate || new Date().toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({ success: true, report: Array.isArray(report[0]) ? report[0] : report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Top bars by sales
router.get("/reports/top-bars", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { limit = 10 } = req.query;

    const topBars = await db.execute(sql`
      SELECT 
        b.id, b.name, b.address,
        COUNT(pt.id) as total_transactions,
        SUM(pt.business_revenue) as total_revenue
      FROM businesses b
      LEFT JOIN promotion_transactions pt ON b.id = pt.business_id AND pt.status = 'redeemed'
      GROUP BY b.id, b.name, b.address
      ORDER BY total_revenue DESC
      LIMIT ${Number(limit)}
    `);

    res.json({ success: true, topBars: Array.isArray(topBars[0]) ? topBars[0] : topBars });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Top users by consumption
router.get("/reports/top-users", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { limit = 10 } = req.query;

    const topUsers = await db.execute(sql`
      SELECT 
        u.id, u.name, u.email,
        up.total_points, up.promotions_redeemed, up.current_level,
        COUNT(pt.id) as total_transactions,
        SUM(pt.amount_paid) as total_spent
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      LEFT JOIN promotion_transactions pt ON u.id = pt.user_id AND pt.status = 'redeemed'
      WHERE u.role = 'customer'
      GROUP BY u.id, u.name, u.email, up.total_points, up.promotions_redeemed, up.current_level
      ORDER BY total_spent DESC
      LIMIT ${Number(limit)}
    `);

    res.json({ success: true, topUsers: Array.isArray(topUsers[0]) ? topUsers[0] : topUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUDITORÍA ====================

// Get audit logs
router.get("/audit/logs", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");
    const { limit = 100, entityType, adminId } = req.query;

    let query = sql`
      SELECT a.*, u.name as admin_name
      FROM admin_audit_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      WHERE 1=1
    `;

    if (entityType) query = sql`${query} AND a.entity_type = ${entityType}`;
    if (adminId) query = sql`${query} AND a.admin_id = ${adminId}`;

    query = sql`${query} ORDER BY a.created_at DESC LIMIT ${Number(limit)}`;

    const logs = await db.execute(query);

    res.json({ success: true, logs: Array.isArray(logs[0]) ? logs[0] : logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get commission history
router.get("/audit/commissions", authenticateToken, requireRole("admin", "super_admin"), async (req, res) => {
  try {
    const { db } = await import("../db");

    const history = await db.execute(sql`
      SELECT ch.*, b.name as business_name, u.name as changed_by_name
      FROM commission_history ch
      LEFT JOIN businesses b ON ch.business_id = b.id
      LEFT JOIN users u ON ch.changed_by = u.id
      ORDER BY ch.created_at DESC
    `);

    res.json({ success: true, history: Array.isArray(history[0]) ? history[0] : history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function logAuditAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: string | null,
  newValue: string | null,
  notes?: string
) {
  try {
    const { db } = await import("../db");

    await db.execute(sql`
      INSERT INTO admin_audit_logs 
      (id, admin_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (${uuidv4()}, ${adminId}, ${action}, ${entityType}, ${entityId}, 
              ${oldValue}, ${newValue})
    `);
  } catch (error) {
    console.error("Error logging audit action:", error);
  }
}

export default router;
