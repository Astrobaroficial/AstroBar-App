import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// PUBLIC ROUTES

// Get active promotions (all or by business)
router.get("/", async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, lte, sql, desc } = await import("drizzle-orm");

    const businessId = req.query.businessId as string | undefined;
    const type = req.query.type as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const now = new Date();
    
    let conditions = [];

    // Si no se pide incluir inactivas, filtrar solo activas
    if (!includeInactive) {
      conditions.push(
        eq(promotions.isActive, true),
        lte(promotions.startTime, now),
        gte(promotions.endTime, now),
        sql`${promotions.stock} > ${promotions.stockConsumed}`
      );
    }

    if (businessId) {
      conditions.push(eq(promotions.businessId, businessId));
    }

    if (type) {
      conditions.push(eq(promotions.type, type));
    }

    const query = conditions.length > 0
      ? db.select().from(promotions).where(and(...conditions)).orderBy(desc(promotions.createdAt))
      : db.select().from(promotions).orderBy(desc(promotions.createdAt));

    const allPromotions = await query;

    // Enrich with business data
    const enriched = await Promise.all(
      allPromotions.map(async (promo) => {
        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, promo.businessId))
          .limit(1);

        return {
          ...promo,
          business: business || null,
          businessName: business?.name || 'Bar',
          stockRemaining: promo.stock - promo.stockConsumed,
        };
      })
    );

    res.json({ success: true, promotions: enriched });
  } catch (error: any) {
    console.error("Error loading promotions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get promotion by ID
router.get("/:id", async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, req.params.id))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, promotion.businessId))
      .limit(1);

    res.json({
      success: true,
      promotion: {
        ...promotion,
        business: business || null,
        stockRemaining: promotion.stock - promotion.stockConsumed,
      },
    });
  } catch (error: any) {
    console.error("Error loading promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// PROTECTED ROUTES

// Accept promotion (create transaction)
router.post("/:id/accept", authenticateToken, async (req, res) => {
  try {
    const { promotions, promotionTransactions, userPoints, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");

    const promotionId = req.params.id;
    const userId = req.user!.id;

    // Check if promotion exists and is active
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    const now = new Date();
    if (!promotion.isActive || promotion.startTime > now || promotion.endTime < now) {
      return res.status(400).json({ error: "Promoción no disponible" });
    }

    if (promotion.stock <= promotion.stockConsumed) {
      return res.status(400).json({ error: "Promoción agotada" });
    }

    // Check if user already has a pending transaction for THIS promotion
    const [existingTransaction] = await db
      .select()
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.userId, userId),
          eq(promotionTransactions.promotionId, promotionId),
          eq(promotionTransactions.status, "pending")
        )
      )
      .limit(1);

    if (existingTransaction) {
      return res.status(400).json({ error: "Ya aceptaste esta promoción" });
    }

    // Calculate amounts using progressive commission system
    const { ProgressiveCommissionService } = await import("../progressiveCommissionService");
    const split = await ProgressiveCommissionService.calculateProgressiveSplit(promotion.businessId, promotion.promoPrice);
    
    const promoPrice = promotion.promoPrice; // Bar receives this (en centavos)
    const platformCommission = split.platform; // Progressive commission
    const totalAmount = split.total; // User pays this (en centavos)

    // Generate unique QR code
    const qrCode = `ASTRO-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create transaction
    const canCancelUntil = new Date(now.getTime() + 60 * 1000); // 60 seconds

    const transactionId = uuidv4();
    await db.insert(promotionTransactions).values({
      id: transactionId,
      promotionId,
      userId,
      businessId: promotion.businessId,
      qrCode,
      status: "pending",
      amountPaid: totalAmount,
      platformCommission,
      businessRevenue: promoPrice,
      canCancelUntil,
    });

    // Update stock
    await db
      .update(promotions)
      .set({ stockConsumed: sql`${promotions.stockConsumed} + 1` })
      .where(eq(promotions.id, promotionId));

    // Notify business owner
    try {
      const [business] = await db.select().from(businesses).where(eq(businesses.id, promotion.businessId)).limit(1);
      if (business?.ownerId) {
        const [owner] = await db.select().from(users).where(eq(users.id, business.ownerId)).limit(1);
        if (owner?.pushToken) {
          const { sendPushNotification } = await import("../services/pushNotifications");
          await sendPushNotification(
            owner.pushToken,
            "¡Nueva promoción aceptada!",
            `${promotion.title} - $${promoPrice.toFixed(2)}`,
            { type: 'promotion_accepted', promotionId, transactionId }
          );
        }
      }
    } catch (error) {
      console.error('Error sending notification to business:', error);
    }

    res.json({
      success: true,
      transaction: {
        id: transactionId,
        qrCode,
        canCancelUntil,
        amountPaid: totalAmount,
      },
    });
  } catch (error: any) {
    console.error("Error accepting promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel transaction (within 60 seconds)
router.post("/transactions/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions, promotions } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");

    const transactionId = req.params.id;
    const userId = req.user!.id;

    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.id, transactionId),
          eq(promotionTransactions.userId, userId)
        )
      )
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "No se puede cancelar esta transacción" });
    }

    const now = new Date();
    if (transaction.canCancelUntil && now > transaction.canCancelUntil) {
      return res.status(400).json({ error: "Tiempo de cancelación expirado" });
    }

    // Cancel transaction
    await db
      .update(promotionTransactions)
      .set({ status: "cancelled" })
      .where(eq(promotionTransactions.id, transactionId));

    // Restore stock
    await db
      .update(promotions)
      .set({ stockConsumed: sql`${promotions.stockConsumed} - 1` })
      .where(eq(promotions.id, transaction.promotionId));

    res.json({ success: true, message: "Promoción cancelada" });
  } catch (error: any) {
    console.error("Error cancelling transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's transactions
router.get("/transactions/my", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions, promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc } = await import("drizzle-orm");

    const userId = req.user!.id;

    const transactions = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.userId, userId))
      .orderBy(desc(promotionTransactions.createdAt));

    // Enrich with promotion and business data
    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const [promotion] = await db
          .select()
          .from(promotions)
          .where(eq(promotions.id, transaction.promotionId))
          .limit(1);

        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.id, transaction.businessId))
          .limit(1);

        return {
          ...transaction,
          promotion: promotion || null,
          business: business || null,
        };
      })
    );

    res.json({ success: true, transactions: enriched });
  } catch (error: any) {
    console.error("Error loading transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction by ID
router.get("/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const { promotionTransactions, promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const transactionId = req.params.id;
    const userId = req.user!.id;

    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(
        and(
          eq(promotionTransactions.id, transactionId),
          eq(promotionTransactions.userId, userId)
        )
      )
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, transaction.promotionId))
      .limit(1);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, transaction.businessId))
      .limit(1);

    res.json({
      success: true,
      transaction: {
        ...transaction,
        promotion: promotion || null,
        business: business || null,
      },
    });
  } catch (error: any) {
    console.error("Error loading transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

// BUSINESS OWNER ROUTES

// Create promotion
router.post("/", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, gte, lte } = await import("drizzle-orm");

    const {
      businessId,
      title,
      description,
      type,
      originalPrice,
      promoPrice,
      stock,
      startTime,
      endTime,
      image,
    } = req.body;

    // Get business automatically if not provided
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);
      
      if (!business) {
        return res.status(404).json({ error: "No tienes un bar registrado" });
      }
      targetBusinessId = business.id;
    }

    // Verify business ownership
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, targetBusinessId),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(403).json({ error: "No tienes acceso a este bar" });
    }

    // Check promotion limits
    const now = new Date();
    const activePromotions = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.businessId, targetBusinessId),
          eq(promotions.isActive, true),
          lte(promotions.startTime, now),
          gte(promotions.endTime, now)
        )
      );

    const activeFlash = activePromotions.filter(p => p.type === 'flash').length;
    const activeCommon = activePromotions.filter(p => p.type === 'common').length;

    // Validate limits
    if (type === 'flash' && activeFlash >= 3) {
      return res.status(400).json({ error: "Máximo 3 promociones flash activas simultáneamente" });
    }
    if (type === 'common' && activeCommon >= 10) {
      return res.status(400).json({ error: "Máximo 10 promociones comunes activas simultáneamente" });
    }

    const discountPercentage = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);

    const promotionId = uuidv4();
    await db.insert(promotions).values({
      id: promotionId,
      businessId: targetBusinessId,
      title,
      description,
      type,
      originalPrice,
      promoPrice,
      discountPercentage,
      stock,
      stockConsumed: 0,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: true,
      image,
    });

    // Enviar notificaciones push para promociones flash
    if (type === 'flash') {
      try {
        const { ProximityNotificationService } = await import("../proximityNotificationService");
        await ProximityNotificationService.sendFlashPromoNotifications(promotionId);
      } catch (error) {
        console.error('Error sending flash promotion notifications:', error);
        // No fallar la creación de la promoción por errores de notificación
      }
    }

    res.json({ success: true, promotionId });
  } catch (error: any) {
    console.error("Error creating promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update promotion (pause/activate)
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const promotionId = req.params.id;
    const { isActive } = req.body;
    const userRole = req.user!.role;

    // Verify ownership
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    // Admin can modify any promotion
    if (userRole === 'admin' || userRole === 'super_admin') {
      await db
        .update(promotions)
        .set({ isActive })
        .where(eq(promotions.id, promotionId));
      return res.json({ success: true });
    }

    // Business owner can only modify their own
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, promotion.businessId),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(403).json({ error: "No tienes acceso a esta promoción" });
    }

    await db
      .update(promotions)
      .set({ isActive })
      .where(eq(promotions.id, promotionId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update promotion (full edit)
router.put("/:id", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const promotionId = req.params.id;
    const { title, description, originalPrice, promoPrice, stock, startTime, endTime, image } = req.body;

    // Verify ownership
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, promotion.businessId),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(403).json({ error: "No tienes acceso a esta promoción" });
    }

    const discountPercentage = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);

    await db
      .update(promotions)
      .set({
        title,
        description,
        originalPrice,
        promoPrice,
        discountPercentage,
        stock,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        image,
      })
      .where(eq(promotions.id, promotionId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete promotion (business owner can delete expired, admin can delete any)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { promotions, businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    const promotionId = req.params.id;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    console.log('🗑️ DELETE PROMOTION REQUEST:', {
      promotionId,
      userId,
      userRole
    });

    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      console.error('❌ Promotion not found:', promotionId);
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    console.log('📋 Promotion found:', {
      id: promotion.id,
      title: promotion.title,
      type: promotion.type,
      businessId: promotion.businessId,
      isActive: promotion.isActive
    });

    // Admin can delete any promotion
    if (userRole === 'admin' || userRole === 'super_admin') {
      console.log('✅ Admin deleting promotion');
      await db
        .delete(promotions)
        .where(eq(promotions.id, promotionId));
      return res.json({ success: true, message: "Promoción eliminada" });
    }

    // Business owner can only delete their own promotions
    if (userRole === 'business_owner') {
      console.log('🏢 Business owner attempting to delete');
      const [business] = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.id, promotion.businessId),
            eq(businesses.ownerId, userId)
          )
        )
        .limit(1);

      if (!business) {
        console.error('❌ Business not found or not owned by user:', {
          businessId: promotion.businessId,
          userId
        });
        return res.status(403).json({ error: "No tienes acceso a esta promoción" });
      }

      console.log('✅ Business owner verified, deleting promotion');
      // Business owner can delete any of their promotions (active or expired)
      await db
        .delete(promotions)
        .where(eq(promotions.id, promotionId));
      return res.json({ success: true, message: "Promoción eliminada" });
    }

    console.error('❌ User does not have permission:', { userRole });
    return res.status(403).json({ error: "No tienes permiso para eliminar promociones" });
  } catch (error: any) {
    console.error("❌ Error deleting promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Pay for promotion with saved card
router.post("/:id/pay", authenticateToken, async (req, res) => {
  try {
    const { promotions, paymentCards, promotionTransactions, userPoints, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and, sql } = await import("drizzle-orm");
    const MercadoPagoService = await import("../services/mercadoPagoService");

    const promotionId = req.params.id;
    const userId = req.user!.id;
    const { cardId } = req.body;

    // Get promotion
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    const now = new Date();
    if (!promotion.isActive || promotion.startTime > now || promotion.endTime < now) {
      return res.status(400).json({ error: "Promoción no disponible" });
    }

    if (promotion.stock <= promotion.stockConsumed) {
      return res.status(400).json({ error: "Promoción agotada" });
    }

    // Get saved card
    const [card] = await db
      .select()
      .from(paymentCards)
      .where(
        and(
          eq(paymentCards.id, cardId),
          eq(paymentCards.userId, userId),
          eq(paymentCards.isActive, true)
        )
      )
      .limit(1);

    if (!card || !card.mpTokenId) {
      return res.status(404).json({ error: "Tarjeta no encontrada o no tokenizada" });
    }

    // Calculate amounts
    const { ProgressiveCommissionService } = await import("../progressiveCommissionService");
    const split = await ProgressiveCommissionService.calculateProgressiveSplit(promotion.businessId, promotion.promoPrice);
    
    const promoPrice = promotion.promoPrice;
    const platformCommission = split.platform;
    const totalAmount = split.total;

    // Create payment with Mercado Pago
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      return res.status(500).json({ error: "Mercado Pago no está configurado" });
    }

    const mpService = new MercadoPagoService.default(mpAccessToken);
    
    // Get user email for payment
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('💳 Procesando pago con Mercado Pago...');
    const paymentResult = await mpService.createPayment({
      token: card.mpTokenId,
      amount: totalAmount / 100, // Convertir de centavos a pesos
      description: `${promotion.title} - AstroBar`,
      payer: {
        email: user?.email || 'customer@astrobar.com',
        firstName: user?.name?.split(' ')[0] || 'Customer',
        lastName: user?.name?.split(' ')[1] || '',
      },
    });

    if (!paymentResult.success || paymentResult.status !== 'approved') {
      console.error('❌ Pago rechazado:', paymentResult.statusDetail);
      return res.status(400).json({ 
        error: "Pago rechazado",
        detail: paymentResult.statusDetail 
      });
    }

    // Generate unique QR code
    const qrCode = `ASTRO-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create transaction
    const transactionId = uuidv4();
    const canCancelUntil = new Date(now.getTime() + 60 * 1000); // 60 seconds

    await db.insert(promotionTransactions).values({
      id: transactionId,
      promotionId,
      userId,
      businessId: promotion.businessId,
      qrCode,
      mpPaymentId: paymentResult.paymentId,
      status: "confirmed",
      amountPaid: totalAmount,
      platformCommission,
      businessRevenue: promoPrice,
      canCancelUntil,
    });

    // Update stock
    await db
      .update(promotions)
      .set({ stockConsumed: sql`${promotions.stockConsumed} + 1` })
      .where(eq(promotions.id, promotionId));

    // Award points to user
    const [existingPoints] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    if (existingPoints) {
      const newTotal = existingPoints.totalPoints + 10;
      let newLevel = "copper";
      if (newTotal >= 1000) newLevel = "platinum";
      else if (newTotal >= 500) newLevel = "gold";
      else if (newTotal >= 250) newLevel = "silver";
      else if (newTotal >= 100) newLevel = "bronze";

      await db
        .update(userPoints)
        .set({
          totalPoints: newTotal,
          currentLevel: newLevel,
        })
        .where(eq(userPoints.userId, userId));
    } else {
      await db.insert(userPoints).values({
        id: uuidv4(),
        userId,
        totalPoints: 10,
        promotionsRedeemed: 0,
        currentLevel: "copper",
      });
    }

    // Notify business owner
    try {
      const [business] = await db.select().from(businesses).where(eq(businesses.id, promotion.businessId)).limit(1);
      if (business?.ownerId) {
        const [owner] = await db.select().from(users).where(eq(users.id, business.ownerId)).limit(1);
        if (owner?.pushToken) {
          const { sendPushNotification } = await import("../services/pushNotifications");
          await sendPushNotification(
            owner.pushToken,
            "¡Pago recibido!",
            `${promotion.title} - $${(promoPrice / 100).toFixed(2)}`,
            { type: 'payment_received', promotionId, transactionId, qrCode }
          );
        }
      }
    } catch (error) {
      console.error('Error sending notification to business:', error);
    }

    console.log(`✅ Pago procesado exitosamente. Transacción: ${transactionId}`);

    res.json({
      success: true,
      transaction: {
        id: transactionId,
        qrCode,
        status: "confirmed",
        amountPaid: totalAmount,
        paymentId: paymentResult.paymentId,
      },
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: error.message || "Error al procesar pago" });
  }
});

// Redeem promotion with QR code (business owner scans)
router.post("/redeem", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const { promotionTransactions, userPoints } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, sql } = await import("drizzle-orm");

    const { qrCode } = req.body;

    const [transaction] = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.qrCode, qrCode))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: "Código QR inválido" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Esta promoción ya fue canjeada o cancelada" });
    }

    // Mark as redeemed
    await db
      .update(promotionTransactions)
      .set({
        status: "redeemed",
        redeemedAt: new Date(),
      })
      .where(eq(promotionTransactions.id, transaction.id));

    // Award points to user (10 points per redemption)
    const [existingPoints] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, transaction.userId))
      .limit(1);

    if (existingPoints) {
      const newTotal = existingPoints.totalPoints + 10;
      const newRedeemed = existingPoints.promotionsRedeemed + 1;
      
      // Calculate level
      let newLevel = "copper";
      if (newTotal >= 1000) newLevel = "platinum";
      else if (newTotal >= 500) newLevel = "gold";
      else if (newTotal >= 250) newLevel = "silver";
      else if (newTotal >= 100) newLevel = "bronze";

      await db
        .update(userPoints)
        .set({
          totalPoints: newTotal,
          promotionsRedeemed: newRedeemed,
          currentLevel: newLevel,
        })
        .where(eq(userPoints.userId, transaction.userId));
    } else {
      await db.insert(userPoints).values({
        id: uuidv4(),
        userId: transaction.userId,
        totalPoints: 10,
        promotionsRedeemed: 1,
        currentLevel: "copper",
      });
    }

    res.json({ success: true, message: "Promoción canjeada exitosamente" });
  } catch (error: any) {
    console.error("Error redeeming promotion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get business transactions
router.get("/business/transactions", authenticateToken, requireRole("business_owner"), async (req, res) => {
  try {
    const businessId = req.query.businessId as string | undefined;
    
    const { promotionTransactions, promotions, businesses, users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, desc, and } = await import("drizzle-orm");

    // Get business
    let business;
    if (businessId) {
      // Verify ownership
      [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.ownerId, req.user!.id)))
        .limit(1);
    } else {
      // Get first business
      [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);
    }

    

    if (!business) {
      
      return res.status(404).json({ error: "No tienes un bar registrado" });
    }

    const transactions = await db
      .select()
      .from(promotionTransactions)
      .where(eq(promotionTransactions.businessId, business.id))
      .orderBy(desc(promotionTransactions.createdAt));

    

    // Enrich with promotion and user data
    const enriched = await Promise.all(
      transactions.map(async (transaction) => {
        const [promotion] = await db
          .select()
          .from(promotions)
          .where(eq(promotions.id, transaction.promotionId))
          .limit(1);

        const [user] = await db
          .select({ name: users.name, phone: users.phone })
          .from(users)
          .where(eq(users.id, transaction.userId))
          .limit(1);

        return {
          ...transaction,
          promotionTitle: promotion?.title || 'Promoción',
          userName: user?.name || 'Cliente',
          userPhone: user?.phone || '',
        };
      })
    );

    
    res.json({ success: true, transactions: enriched });
  } catch (error: any) {
    console.error("Error loading business transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
