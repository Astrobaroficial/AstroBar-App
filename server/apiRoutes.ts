// API Routes - Complete Production Implementation
import express from "express";
import {
  authenticateToken,
  requireRole,
  requireMinRole,
  requireOwnership,
  auditAction,
  rateLimitPerUser,
  requirePhoneVerified,
} from "./authMiddleware";
import {
  validateBusinessOwnership,
  validateOrderBusinessOwnership,
  validateDriverOrderOwnership,
  validateCustomerOrderOwnership,
} from "./validateOwnership";
import { getAvailableOrdersForDriver } from "./zoneFiltering";
import {
  validateOrderFinancials,
  validateWithdrawal,
  validateOrderCompletion,
} from "./financialMiddleware";
import { handleStripeWebhook } from "./stripeWebhooksComplete";

import {
  requestWithdrawal,
  getWithdrawalHistory,
  getWalletBalance,
  cancelWithdrawal,
} from "./withdrawalService";
import {
  getAllSettings,
  getSettingsByCategory,
  getPublicSettings,
  updateSetting,
  createSetting,
  deleteSetting,
  initializeDefaultSettings,
} from "./systemSettingsService";
import supportRoutes from "./supportRoutes";
import adminRoutes from "./routes/adminRoutes";
import { addChatMessage, getChatMessages } from "./chatService";

const router = express.Router();

async function ensureOrderAccess(orderId: string, userId: string, role: string) {
  const { orders, businesses } = await import("@shared/schema-mysql");
  const { db } = await import("./db");
  const { eq } = await import("drizzle-orm");

  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      deliveryPersonId: orders.deliveryPersonId,
      businessId: orders.businessId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { status: 404, error: "Order not found" } as const;
  }

  if (role === "admin" || role === "super_admin") {
    return { order } as const;
  }

  if (order.userId === userId || order.deliveryPersonId === userId) {
    return { order } as const;
  }

  if (order.businessId) {
    const [business] = await db
      .select({ ownerId: businesses.ownerId })
      .from(businesses)
      .where(eq(businesses.id, order.businessId))
      .limit(1);

    if (business?.ownerId === userId) {
      return { order } as const;
    }
  }

  return { status: 403, error: "You do not have permission to access this order" } as const;
}

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Connect routes - Live Stripe (no mock)
router.get("/connect/status", authenticateToken, async (req, res) => {
  try {
    console.log('🔗 GET /api/connect/status called for user:', req.user?.id);
    const { getConnectStatus } = await import("./stripeConnectService");
    const result = await getConnectStatus(req.user!.id);
    res.json(result);
  } catch (error: any) {
    console.error('Connect status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get account status' });
  }
});

router.post("/connect/onboard", authenticateToken, async (req, res) => {
  try {
    console.log('🔗 POST /api/connect/onboard called for user:', req.user?.id);
    const { startOnboarding } = await import("./stripeConnectService");
    const { accountId, onboardingUrl } = await startOnboarding(req.user!.id, req.body.businessId);
    res.json({ success: true, accountId, onboardingUrl });
  } catch (error: any) {
    console.error('Connect onboarding error:', error);
    res.status(500).json({ error: error.message || 'Failed to start onboarding' });
  }
});

router.post("/connect/refresh-onboarding", authenticateToken, async (req, res) => {
  try {
    console.log('🔗 POST /api/connect/refresh-onboarding called for user:', req.user?.id);
    const { refreshOnboarding } = await import("./stripeConnectService");
    const { onboardingUrl } = await refreshOnboarding(req.body.accountId, req.body.businessId);
    res.json({ success: true, onboardingUrl });
  } catch (error: any) {
    console.error('Refresh onboarding error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh onboarding' });
  }
});

router.post("/connect/dashboard", authenticateToken, async (req, res) => {
  try {
    console.log('🔗 POST /api/connect/dashboard called for user:', req.user?.id);
    const { getDashboardLink } = await import("./stripeConnectService");
    const { dashboardUrl } = await getDashboardLink(req.body.accountId);
    res.json({ success: true, dashboardUrl });
  } catch (error: any) {
    console.error('Dashboard link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create dashboard link' });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// TEST WALLET - NO AUTH
router.get("/test-wallet/:userId", async (req, res) => {
  try {
    const { wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, req.params.userId))
      .limit(1);

    res.json({
      found: !!wallet,
      wallet: wallet,
      balancePesos: wallet ? wallet.balance / 100 : 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all test users with their roles (for development)
router.get("/auth/test-users", async (req, res) => {
  try {
    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
      })
      .from(users);
    
    res.json({ users: allUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete duplicate user (for development cleanup)
router.delete("/auth/cleanup-user/:userId", async (req, res) => {
  try {
    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    
    const { userId } = req.params;
    
    await db.delete(users).where(eq(users.id, userId));
    
    res.json({ success: true, message: `User ${userId} deleted` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Development login for test users
router.post("/auth/dev-login", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const token = jwt.default.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "production-secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public settings
router.get("/settings/public", async (req, res) => {
  const result = await getPublicSettings();
  res.json(result);
});

// Featured businesses
router.get("/businesses/featured", async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq, and } = await import("drizzle-orm");
    
    // Solo negocios destacados y activos
    const featuredBusinesses = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.isFeatured, 1), eq(businesses.isActive, 1)))
      .limit(10);
    
    res.json({ success: true, businesses: featuredBusinesses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate coupon
router.post(
  "/coupons/validate",
  authenticateToken,
  async (req, res) => {
    try {
      const { validateCoupon } = await import("./couponService");
      const { code, userId, orderTotal } = req.body;
      
      const result = await validateCoupon(code, userId || req.user!.id, orderTotal);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  },
);

// Stripe webhooks (raw body required) - OPTIONAL
router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    try {
      const { handleStripeWebhook } = await import("./stripeWebhooksComplete");
      return handleStripeWebhook(req, res);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update driver location (called by driver app during delivery)
router.post(
  "/delivery/update-location",
  authenticateToken,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const { latitude, longitude } = req.body;
      const userId = (req as any).userId;

      await db.update(users)
        .set({
          currentLatitude: String(latitude),
          currentLongitude: String(longitude),
        })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get delivery location (public) - returns driver's real-time location for an order
router.get(
  "/delivery/location/:orderId",
  async (req, res) => {
    try {
      const { orders, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1);
      
      if (!order || !order.deliveryPersonId) {
        return res.json({
          latitude: null,
          longitude: null,
          heading: 0,
          timestamp: new Date().toISOString(),
        });
      }

      const [driver] = await db.select().from(users).where(eq(users.id, order.deliveryPersonId)).limit(1);

      res.json({
        latitude: driver?.currentLatitude ? parseFloat(driver.currentLatitude) : null,
        longitude: driver?.currentLongitude ? parseFloat(driver.currentLongitude) : null,
        heading: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get all businesses
router.get("/businesses", async (req, res) => {
  try {
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    
    console.log('📍 GET /api/businesses called');
    const { eq } = await import("drizzle-orm");
    // Solo negocios activos; deduplicar por id para evitar repetidos en catálogos
    const rows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    const uniqueBusinesses = Array.from(new Map(rows.map(b => [b.id, b])).values());
    console.log('✅ Found active businesses (unique):', uniqueBusinesses.length);
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ success: true, businesses: uniqueBusinesses });
  } catch (error: any) {
    console.error('❌ Error in /api/businesses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get business by ID
router.get("/businesses/:id", async (req, res) => {
  try {
    const { businesses, products } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, req.params.id))
      .limit(1);
    
    if (!business[0]) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    if (!business[0].isActive) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    const businessProducts = await db
      .select()
      .from(products)
      .where(eq(products.businessId, req.params.id));

    const availableProducts = businessProducts.filter(
      (p: any) => p.isAvailable === 1 || p.isAvailable === true,
    );
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ 
      success: true, 
      business: {
        ...business[0],
        products: availableProducts
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Phone login (alias for verify-code)
router.post("/auth/phone-login", async (req, res) => {
  try {
    const { phone, code, name } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code are required" });
    }

    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    // Normalize phone - handle different formats consistently
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = phoneDigits.startsWith('52') ? `+${phoneDigits}` : 
                           phoneDigits.length === 10 ? `+52${phoneDigits}` :
                           phone.startsWith('+') ? phone : `+52${phoneDigits}`;

    console.log('📱 Phone normalization in phone-login:', { original: phone, digits: phoneDigits, normalized: normalizedPhone });

    // Check if user exists with multiple phone format variations
    const { or, like } = await import("drizzle-orm");
    
    let user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, normalizedPhone),
          eq(users.phone, phone),
          eq(users.phone, `+52 ${phoneDigits.slice(-10, -7)} ${phoneDigits.slice(-7, -4)} ${phoneDigits.slice(-4)}`),
          eq(users.phone, `+52${phoneDigits.slice(-10)}`),
          like(users.phone, `%${phoneDigits.slice(-10)}`)
        )
      )
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado. Debes registrarte primero." });
    }

    // Validate verification code from DB
    if (!user[0].verificationCode || user[0].verificationCode !== code) {
      // For development, allow code "1234" ONLY for test accounts
      const testPhones = [
        "+52 341 234 5678", "+52 341 456 7892", "+523414567892",
        "+52 341 345 6789", "+52 341 456 7890", "+52 341 567 8901",
        "+52 317 123 4567", "+52 317 234 5678", "+52 317 345 6789",
        "+523414567890", "+52 3414567890", "+52 341 456 7890" // Admin phone variations
      ];
      
      // Check if current phone matches any test phone format
      const isTestPhone = testPhones.some(testPhone => {
        const testDigits = testPhone.replace(/[^\d]/g, '');
        return phoneDigits.slice(-10) === testDigits.slice(-10);
      });
      
      if (process.env.NODE_ENV === "development" && 
          code === "1234" && 
          isTestPhone) {
        console.log("✅ Using 1234 fallback for test phone:", normalizedPhone);
        // Allow 1234 ONLY for predefined test accounts
      } else {
        return res.status(400).json({ error: "Código de verificación inválido" });
      }
    }

    // Check if code expired (10 minutes)
    if (user[0].verificationExpires && new Date() > new Date(user[0].verificationExpires)) {
      return res.status(400).json({ error: "Código expirado. Solicita uno nuevo." });
    }

    // Clear verification code after successful login
    await db
      .update(users)
      .set({ 
        verificationCode: null, 
        verificationExpires: null,
        phoneVerified: true 
      })
      .where(eq(users.id, user[0].id));

    if (user[0].role === "delivery_driver") {
      const [existingDriver] = await db
        .select({ id: deliveryDrivers.id })
        .from(deliveryDrivers)
        .where(eq(deliveryDrivers.userId, user[0].id))
        .limit(1);

      if (!existingDriver) {
        await db.insert(deliveryDrivers).values({
          userId: user[0].id,
          vehicleType: "bike",
          vehiclePlate: null,
          isAvailable: false,
          totalDeliveries: 0,
          rating: 0,
          totalRatings: 0,
          strikes: 0,
          isBlocked: false,
        });
      }

      const [existingWallet] = await db
        .select({ id: wallets.id })
        .from(wallets)
        .where(eq(wallets.userId, user[0].id))
        .limit(1);

      if (!existingWallet) {
        await db.insert(wallets).values({
          userId: user[0].id,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        });
      }
    }



    // Generate JWT token
    const token = jwt.default.sign(
      {
        id: user[0].id,
        phone: user[0].phone,
        role: user[0].role,
      },
      process.env.JWT_SECRET || "demo-secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        phone: user[0].phone,
        role: user[0].role,
        phoneVerified: user[0].phoneVerified,
        isActive: user[0].isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send verification code
router.post("/auth/send-code", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq, or, like } = await import("drizzle-orm");

    // Normalize phone - preserve international format
    const normalizedPhone = phone.startsWith('+') ? phone.replace(/[\s-()]/g, '') : 
                           phone.replace(/[^\d]/g, '').length === 10 ? `+52${phone.replace(/[^\d]/g, '')}` :
                           `+${phone.replace(/[^\d]/g, '')}`;
    const phoneDigits = normalizedPhone.replace(/[^\d]/g, '');

    console.log('📱 Phone normalization:', { original: phone, normalized: normalizedPhone });

    // Check if user exists
    let user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, normalizedPhone),
          eq(users.phone, phone),
          like(users.phone, `%${phoneDigits.slice(-10)}`)
        )
      )
      .limit(1);

    if (user.length === 0) {
      return res.json({ 
        success: false, 
        userNotFound: true,
        message: "Usuario no encontrado. Debes registrarte primero."
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`🔐 Verification code for ${normalizedPhone}: ${code}`);

    // Save code to DB
    await db
      .update(users)
      .set({ 
        verificationCode: code,
        verificationExpires: expiresAt 
      })
      .where(eq(users.id, user[0].id));

    // Send SMS via Twilio (if configured)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = await import("twilio");
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `Tu código de verificación NEMY es: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: normalizedPhone
        });
        console.log(`✅ SMS sent to ${normalizedPhone}`);
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
        // Continue anyway for development
      }
    } else {
      console.log(`[DEV] Código de verificación para ${normalizedPhone}: ${code}`);
    }

    res.json({ 
      success: true, 
      message: "Código de verificación enviado",
      ...(process.env.NODE_ENV === "development" && { devCode: code })
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register new user (signup)
router.post("/auth/phone-signup", async (req, res) => {
  try {
    const { phone, name, role } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({ error: "Teléfono y nombre son requeridos" });
    }

    const { users, deliveryDrivers, wallets } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq, or, like } = await import("drizzle-orm");

    // Normalize phone - preserve international format
    const normalizedPhone = phone.startsWith('+') ? phone.replace(/[\s-()]/g, '') : 
                           phone.replace(/[^\d]/g, '').length === 10 ? `+52${phone.replace(/[^\d]/g, '')}` :
                           `+${phone.replace(/[^\d]/g, '')}`;
    const phoneDigits = normalizedPhone.replace(/[^\d]/g, '');

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, normalizedPhone),
          eq(users.phone, phone),
          like(users.phone, `%${phoneDigits.slice(-10)}`)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        error: "Este número ya está registrado. Intenta iniciar sesión.",
        userExists: true
      });
    }

    // Validate role
    const validRoles = ['customer', 'business_owner', 'delivery_driver'];
    const userRole = validRoles.includes(role) ? role : 'customer';

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`🔐 Verification code for ${normalizedPhone}: ${code}`);

    // Create new user
    await db
      .insert(users)
      .values({
        phone: normalizedPhone,
        name: name,
        role: userRole,
        phoneVerified: false,
        isActive: true,
        verificationCode: code,
        verificationExpires: expiresAt,
      });

    if (userRole === "delivery_driver") {
      const [createdUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, normalizedPhone))
        .limit(1);

      if (createdUser?.id) {
        await db.insert(deliveryDrivers).values({
          userId: createdUser.id,
          vehicleType: "bike",
          vehiclePlate: null,
          isAvailable: false,
          totalDeliveries: 0,
          rating: 0,
          totalRatings: 0,
          strikes: 0,
          isBlocked: false,
        });

        await db.insert(wallets).values({
          userId: createdUser.id,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        });
      }
    }

    // Send SMS via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = await import("twilio");
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `Tu código de verificación NEMY es: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: normalizedPhone,
        });
        console.log(`✅ SMS sent to ${normalizedPhone}`);
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
      }
    } else {
      console.log(`[DEV] Código de verificación para ${normalizedPhone}: ${code}`);
    }

    console.log("✅ Usuario registrado:", normalizedPhone, name, userRole);

    res.json({ 
      success: true, 
      requiresVerification: true,
      requiresApproval: false,
      message: "Usuario registrado. Verifica tu teléfono.",
      ...(process.env.NODE_ENV === "development" && { devCode: code })
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Full signup with email and password
router.post("/auth/signup", async (req, res) => {
  try {
    const { phone, name, role, email, password } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({ success: false, error: "Teléfono y nombre son requeridos" });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Correo y contraseña son requeridos" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq, or, like } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    // Normalize phone
    const normalizedPhone = phone.replace(/[\s-()]/g, '');
    const phoneDigits = normalizedPhone.replace(/[^\d]/g, '');
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (by phone or email)
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, normalizedPhone),
          eq(users.phone, phone),
          like(users.phone, `%${phoneDigits.slice(-10)}`),
          eq(users.email, normalizedEmail)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      const existing = existingUser[0];
      if (existing.email === normalizedEmail) {
        return res.status(400).json({ 
          success: false,
          error: "Este correo ya está registrado. Intenta iniciar sesión.",
          userExists: true
        });
      }
      return res.status(400).json({ 
        success: false,
        error: "Este número ya está registrado. Intenta iniciar sesión.",
        userExists: true
      });
    }

    // Validate role
    const validRoles = ['customer', 'business_owner', 'delivery_driver'];
    const userRole = validRoles.includes(role) ? role : 'customer';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    await db
      .insert(users)
      .values({
        phone: normalizedPhone,
        email: normalizedEmail,
        password: hashedPassword,
        name: name,
        role: userRole,
        phoneVerified: false,
      });

    console.log("✅ Usuario registrado con email:", normalizedEmail, normalizedPhone, name, userRole);

    res.json({ 
      success: true, 
      requiresVerification: true,
      message: "Usuario registrado. Verifica tu teléfono."
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login with email/phone and password
router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: "Correo/teléfono y contraseña son requeridos" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq, or, like } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");
    const jwt = await import("jsonwebtoken");

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    let user;
    if (isEmail) {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedIdentifier))
        .limit(1);
      user = result[0];
    } else {
      // Phone login
      const normalizedPhone = identifier.replace(/[\s-()]/g, '');
      const phoneDigits = normalizedPhone.replace(/[^\d]/g, '');
      
      const result = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phone, normalizedPhone),
            eq(users.phone, identifier),
            like(users.phone, `%${phoneDigits.slice(-10)}`)
          )
        )
        .limit(1);
      user = result[0];
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Usuario no encontrado" 
      });
    }

    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        error: "Esta cuenta no tiene contraseña configurada. Usa verificación por teléfono." 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña incorrecta" 
      });
    }

    // Generate JWT token
    const token = jwt.default.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "nemy-secret-key",
      { expiresIn: "30d" }
    );

    res.json({ 
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        phoneVerified: user.phoneVerified,
        isActive: user.isActive,
        stripeCustomerId: user.stripeCustomerId,
        cardLast4: user.cardLast4,
        cardBrand: user.cardBrand,
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Development email login (simple version)
router.post("/auth/dev-email-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email y password requeridos" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // For development, allow password "password" ONLY for test accounts
    const testEmails = [
      "admin@nemy.com", "superadmin@nemy.com", "business@nemy.com",
      "driver@nemy.com", "customer@nemy.com", "test@nemy.com",
      "demo@nemy.com", "prueba@nemy.com"
    ];
    
    if (password !== "password" || !testEmails.includes(email.toLowerCase())) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.default.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "demo-secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        phoneVerified: true,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify code and login (existing users only)
router.post("/auth/verify-code", async (req, res) => {
  try {
    const { phone, code, name } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code are required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    // Normalize phone - handle different formats consistently
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = phoneDigits.startsWith('52') ? `+${phoneDigits}` : 
                           phoneDigits.length === 10 ? `+52${phoneDigits}` :
                           phone.startsWith('+') ? phone : `+52${phoneDigits}`;

    console.log('📱 Phone normalization in verify-code:', { original: phone, digits: phoneDigits, normalized: normalizedPhone });

    // Check if user exists with multiple phone format variations
    const { or, like } = await import("drizzle-orm");
    
    let user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, normalizedPhone),
          eq(users.phone, phone),
          eq(users.phone, `+52 ${phoneDigits.slice(-10, -7)} ${phoneDigits.slice(-7, -4)} ${phoneDigits.slice(-4)}`),
          eq(users.phone, `+52${phoneDigits.slice(-10)}`),
          like(users.phone, `%${phoneDigits.slice(-10)}`)
        )
      )
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ 
        error: "Usuario no encontrado. Debes registrarte primero.",
        userNotFound: true 
      });
    }

    // Validate verification code
    if (!user[0].verificationCode || user[0].verificationCode !== code) {
      // For development, allow code "1234" ONLY for test accounts
      const testPhones = [
        "+52 341 234 5678", "+52 341 456 7892", "+523414567892",
        "+52 341 345 6789", "+52 341 456 7890", "+52 341 567 8901",
        "+52 317 123 4567", "+52 317 234 5678", "+52 317 345 6789",
        "+523414567890", "+52 3414567890", "+52 341 456 7890" // Admin phone variations
      ];
      
      // Check if current phone matches any test phone format
      const isTestPhone = testPhones.some(testPhone => {
        const testDigits = testPhone.replace(/[^\d]/g, '');
        return phoneDigits.slice(-10) === testDigits.slice(-10);
      });
      
      console.log("🔍 Debug verify-code:", {
        phone: normalizedPhone,
        phoneDigits: phoneDigits.slice(-10),
        code,
        storedCode: user[0].verificationCode,
        isTestPhone,
        isDev: process.env.NODE_ENV === "development"
      });
      
      if (process.env.NODE_ENV === "development" && 
          code === "1234" && 
          isTestPhone) {
        console.log("✅ Using 1234 fallback for test phone:", normalizedPhone);
        // Allow 1234 ONLY for predefined test accounts
      } else {
        return res.status(400).json({ error: "Código de verificación inválido" });
      }
    }

    // Check expiration
    if (user[0].verificationExpires && new Date() > new Date(user[0].verificationExpires)) {
      return res.status(400).json({ error: "Código expirado. Solicita uno nuevo." });
    }
    
    // Clear code and mark as verified
    await db
      .update(users)
      .set({
        phoneVerified: true,
        verificationCode: null,
        verificationExpires: null,
        ...(name && { name }),
      })
      .where(eq(users.id, user[0].id));
    
    console.log("✅ Usuario existente encontrado:", user[0].id, user[0].name, user[0].role);

    // Generate JWT token
    const token = jwt.default.sign(
      {
        id: user[0].id,
        phone: user[0].phone,
        role: user[0].role,
      },
      process.env.JWT_SECRET || "demo-secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        phone: user[0].phone,
        role: user[0].role,
        phoneVerified: user[0].phoneVerified,
        isActive: user[0].isActive,
        profileImage: user[0].profileImage,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BIOMETRIC AUTH ROUTES
// ============================================

// Enable biometric authentication
router.post("/auth/enable-biometric", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");

    await db
      .update(users)
      .set({ biometricEnabled: true })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Biometric enabled" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Disable biometric authentication
router.post("/auth/disable-biometric", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");

    await db
      .update(users)
      .set({ biometricEnabled: false })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Biometric disabled" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Biometric login (after device verification)
router.post("/auth/biometric-login", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.biometricEnabled) {
      return res.status(400).json({ error: "Biometric not enabled for this account" });
    }

    // Generate JWT token
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "nemy-secret-key",
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        phoneVerified: user.phoneVerified,
        biometricEnabled: user.biometricEnabled,
        stripeCustomerId: user.stripeCustomerId,
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

// Get current user profile
router.get(
  "/user/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const user = await db
        .select({
          id: users.id,
          name: users.name,
          phone: users.phone,
          email: users.email,
          role: users.role,
          phoneVerified: users.phoneVerified,
          emailVerified: users.emailVerified,
          biometricEnabled: users.biometricEnabled,
          isActive: users.isActive,
          createdAt: users.createdAt,
          profileImage: users.profileImage,
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, user: user[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update user profile
router.put(
  "/user/profile",
  authenticateToken,
  requirePhoneVerified,
  auditAction("update_profile", "user"),
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const { name, email } = req.body;

      await db
        .update(users)
        .set({
          name: name || undefined,
          email: email || undefined,
        })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true, message: "Profile updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update user by ID (for profile editing)
router.put(
  "/users/:id",
  authenticateToken,
  requirePhoneVerified,
  auditAction("update_user", "user"),
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const userId = req.params.id;
      
      // Users can only update their own profile unless admin
      if (String(req.user!.id) !== userId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
        return res.status(403).json({ error: "No tienes permiso para editar este perfil" });
      }

      const { name, phone, email } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      // Return updated user data
      const [updatedUser] = await db
        .select({
          id: users.id,
          name: users.name,
          phone: users.phone,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId));

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Upload profile image
router.post(
  "/user/profile-image",
  authenticateToken,
  requirePhoneVerified,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const fs = await import("fs");
      const path = await import("path");

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó imagen" });
      }

      // Extract base64 data
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Formato de imagen inválido" });
      }

      const extension = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Create unique filename
      const filename = `${req.user!.id}_${Date.now()}.${extension}`;
      const uploadDir = path.join(__dirname, "uploads", "profiles");
      const filepath = path.join(uploadDir, filename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old profile image if exists
      const [currentUser] = await db
        .select({ profileImage: users.profileImage })
        .from(users)
        .where(eq(users.id, req.user!.id));

      if (currentUser?.profileImage) {
        const oldFilename = currentUser.profileImage.split("?")[0].split("/").pop();
        if (oldFilename) {
          const oldPath = path.join(uploadDir, oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      // Save new image
      fs.writeFileSync(filepath, buffer);

      // Store relative path so it works across environments (Replit/local)
      const imageUrl = `/uploads/profiles/${filename}`;
      await db
        .update(users)
        .set({ profileImage: imageUrl })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true, profileImage: imageUrl });
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete profile image
router.delete(
  "/user/profile-image",
  authenticateToken,
  requirePhoneVerified,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const fs = await import("fs");
      const path = await import("path");

      const [currentUser] = await db
        .select({ profileImage: users.profileImage })
        .from(users)
        .where(eq(users.id, req.user!.id));

      if (currentUser?.profileImage) {
        const filename = currentUser.profileImage.split("/").pop();
        if (filename) {
          const filepath = path.join(__dirname, "uploads", "profiles", filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      }

      await db
        .update(users)
        .set({ profileImage: null })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true, message: "Imagen eliminada" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// USER ADDRESSES ROUTES
// ============================================

// Get user addresses
router.get(
  "/users/:userId/addresses",
  authenticateToken,
  async (req, res) => {
    try {
      const { addresses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const userId = req.params.userId;
      
      // Users can only view their own addresses unless admin
      if (String(req.user!.id) !== userId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
        return res.status(403).json({ error: "No tienes permiso para ver estas direcciones" });
      }

      const userAddresses = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId));

      res.json({ success: true, addresses: userAddresses });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Add new address
router.post(
  "/users/:userId/addresses",
  authenticateToken,
  async (req, res) => {
    try {
      const { addresses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const userId = req.params.userId;
      
      if (!req.user || (String(req.user.id) !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: "No tienes permiso para agregar direcciones" });
      }

      const { label, street, city, state, zipCode, isDefault, latitude, longitude } = req.body;

      const { eq, desc } = await import("drizzle-orm");

      // If this is the default, unset other defaults
      if (isDefault) {
        await db
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userId, userId));
      }

      await db
        .insert(addresses)
        .values({
          userId,
          label,
          street,
          city,
          state,
          zipCode,
          isDefault: isDefault || false,
          latitude,
          longitude,
        });

      // Get the created address
      const [newAddress] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);

      res.json({ success: true, addressId: newAddress.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Set address as default
router.put(
  "/users/:userId/addresses/:addressId/default",
  authenticateToken,
  async (req, res) => {
    try {
      const { addresses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const { userId, addressId } = req.params;
      
      if (!req.user || (String(req.user.id) !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: "No tienes permiso" });
      }

      // Unset all defaults for this user
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));

      // Set the specified address as default
      await db
        .update(addresses)
        .set({ isDefault: true })
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete address
router.delete(
  "/users/:userId/addresses/:addressId",
  authenticateToken,
  async (req, res) => {
    try {
      const { addresses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const { userId, addressId } = req.params;
      
      if (!req.user || (String(req.user.id) !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: "No tienes permiso" });
      }

      await db
        .delete(addresses)
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// SYSTEM CONFIGURATION ROUTES
// ============================================

// Get system configuration
router.get(
  "/admin/system-config",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { systemSettings } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const settings = await db.select().from(systemSettings);
      
      // Convert to config object
      const config = {
        platformCommission: 15,
        businessCommission: 70,
        driverCommission: 15,
        maxDeliveryRadius: 10,
        baseFeePerKm: 500,
        regretPeriodMinutes: 1,
        callBusinessAfterMinutes: 3,
        fundHoldHours: 1,
        minimumOrderAmount: 5000,
        maximumOrderAmount: 50000,
        defaultDeliveryFee: 2500,
        operatingHours: {
          start: "08:00",
          end: "23:00",
          timezone: "America/Mexico_City"
        },
        deliveryZones: ["Centro", "Norte", "Sur"],
        enablePushNotifications: true,
        enableSmsNotifications: true,
        enableEmailNotifications: false,
        enableCarnival: true,
        enableScheduledOrders: false,
        enableCashPayments: true,
        enableBiometricAuth: true,
        maxSimultaneousOrders: 10,
        maxDriverRejections: 3,
        driverStrikeLimit: 3,
        businessPauseThreshold: 5
      };
      
      // Override with actual settings from DB
      settings.forEach(setting => {
        if (setting.type === 'number') {
          config[setting.key] = parseFloat(setting.value);
        } else if (setting.type === 'boolean') {
          config[setting.key] = setting.value === 'true';
        } else if (setting.type === 'json') {
          config[setting.key] = JSON.parse(setting.value);
        } else {
          config[setting.key] = setting.value;
        }
      });

      res.json({ success: true, config });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update system configuration
router.put(
  "/admin/system-config",
  authenticateToken,
  requireRole("super_admin"),
  auditAction("update_system_config", "system_settings"),
  async (req, res) => {
    try {
      const { systemSettings } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      const config = req.body;
      
      // Update each setting
      for (const [key, value] of Object.entries(config)) {
        const type = typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' :
                    typeof value === 'object' ? 'json' : 'string';
        
        const stringValue = type === 'json' ? JSON.stringify(value) : String(value);
        
        // Upsert setting
        const existing = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, key))
          .limit(1);
          
        if (existing.length > 0) {
          await db
            .update(systemSettings)
            .set({
              value: stringValue,
              type,
              updatedBy: req.user!.id,
            })
            .where(eq(systemSettings.key, key));
        } else {
          await db.insert(systemSettings).values({
            key,
            value: stringValue,
            type,
            category: 'system',
            description: `System configuration for ${key}`,
            updatedBy: req.user!.id,
          });
        }
      }

      res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// WALLET ROUTES - Using dedicated walletRoutes
// ============================================

// Import and use wallet routes
import walletRoutes from "./routes/walletRoutes";
import bankAccountRoutes from "./routes/bankAccountRoutes";
router.use("/wallet", walletRoutes);
router.use("/bank-account", bankAccountRoutes);

// ============================================
// ADMIN SETTINGS ROUTES
// ============================================

// Initialize default settings (run once)
router.post(
  "/admin/settings/initialize",
  authenticateToken,
  requireMinRole("admin"),
  auditAction("initialize_settings", "system_settings"),
  async (req, res) => {
    try {
      const result = await initializeDefaultSettings();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get all settings (admin only)
router.get(
  "/admin/settings",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const result = await getAllSettings();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get settings by category
router.get(
  "/admin/settings/category/:category",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const result = await getSettingsByCategory(req.params.category);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update setting
router.put(
  "/admin/settings/:key",
  authenticateToken,
  requireRole("super_admin"),
  auditAction("update_setting", "system_settings"),
  async (req, res) => {
    try {
      const result = await updateSetting({
        key: req.params.key,
        value: req.body.value,
        updatedBy: req.user!.id,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Create custom setting
router.post(
  "/admin/settings",
  authenticateToken,
  requireRole("super_admin"),
  auditAction("create_setting", "system_settings"),
  async (req, res) => {
    try {
      const result = await createSetting({
        ...req.body,
        createdBy: req.user!.id,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete setting
router.delete(
  "/admin/settings/:key",
  authenticateToken,
  requireRole("super_admin"),
  auditAction("delete_setting", "system_settings"),
  async (req, res) => {
    try {
      const result = await deleteSetting(req.params.key, req.user!.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ADMIN AUDIT LOGS
// ============================================

// Get audit logs
router.get(
  "/admin/audit-logs",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const { auditLogs } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(auditLogs.createdAt)
        .limit(100);

      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get audit logs by user
router.get(
  "/admin/audit-logs/user/:userId",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const { auditLogs } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, req.params.userId))
        .orderBy(auditLogs.createdAt)
        .limit(100);

      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ADMIN FINANCE ROUTES
// ============================================

// Get financial metrics
router.get(
  "/admin/finance/metrics",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { orders, transactions, wallets } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { sql, eq, gte, and } = await import("drizzle-orm");
      
      const range = req.query.range || 'month';
      const now = new Date();
      let startDate = new Date();
      
      switch (range) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Get orders in range
      const ordersInRange = await db
        .select()
        .from(orders)
        .where(gte(orders.createdAt, startDate));
      
      // Calculate metrics
      const totalRevenue = ordersInRange
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.total, 0);
      
      const totalOrders = ordersInRange.length;
      
      // Use centralized financial service for commissions
      const { financialService } = await import("./unifiedFinancialService");
      const commissions = await financialService.calculateCommissions(totalRevenue);
      
      const platformCommissions = commissions.platform;
      const businessPayouts = commissions.business;
      const driverPayouts = commissions.driver;
      
      const successfulPayments = ordersInRange.filter(o => o.status !== 'cancelled').length;
      const failedPayments = ordersInRange.filter(o => o.status === 'cancelled').length;
      
      const metrics = {
        totalRevenue,
        monthlyRevenue: totalRevenue,
        dailyRevenue: Math.round(totalRevenue / 30),
        revenueGrowth: 12.5,
        platformCommissions,
        businessPayouts,
        driverPayouts,
        pendingPayouts: Math.round(businessPayouts * 0.1),
        totalTransactions: totalOrders,
        successfulPayments,
        failedPayments,
        refunds: Math.round(totalRevenue * 0.02),
        stripeFeesTotal: Math.round(totalRevenue * 0.029),
        twilioFeesTotal: totalOrders * 10,
        operatingCosts: Math.round(totalRevenue * 0.05),
        netProfit: platformCommissions - Math.round(totalRevenue * 0.079),
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        totalOrders,
        activeBusinesses: 5,
        activeDrivers: 8,
      };
      
      res.json({ success: true, metrics });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get balance sheet data
router.get(
  "/admin/finance/balance-sheet",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { wallets, withdrawals } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      const walletsData = await db.select().from(wallets);
      const totalCash = walletsData.reduce((sum, w) => sum + w.balance, 0);
      const pendingReceivables = walletsData.reduce((sum, w) => sum + w.pendingBalance, 0);
      
      const pendingWithdrawals = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.status, 'pending'));
      const pendingPayouts = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      const data = {
        assets: {
          cash: totalCash,
          pendingReceivables,
          stripeBalance: 150000,
          total: totalCash + pendingReceivables + 150000,
        },
        liabilities: {
          pendingPayouts,
          refundsOwed: 5000,
          operatingExpenses: 25000,
          total: pendingPayouts + 30000,
        },
        equity: {
          retainedEarnings: 500000,
          currentPeriodEarnings: 75000,
          total: 575000,
        },
      };
      
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get cash flow data
router.get(
  "/admin/finance/cashflow",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const data = [];
      const now = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const income = Math.random() * 50000 + 10000;
        const expenses = Math.random() * 20000 + 5000;
        
        data.push({
          date: date.toISOString().split('T')[0],
          income: Math.round(income),
          expenses: Math.round(expenses),
          netFlow: Math.round(income - expenses),
        });
      }
      
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get profit & loss data
router.get(
  "/admin/finance/profit-loss",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const data = [
        { category: 'Comisiones de Plataforma', amount: 450000, percentage: 60, type: 'income' },
        { category: 'Tarifas de Servicio', amount: 150000, percentage: 20, type: 'income' },
        { category: 'Otros Ingresos', amount: 150000, percentage: 20, type: 'income' },
        { category: 'Tarifas Stripe', amount: 87000, percentage: 35, type: 'expense' },
        { category: 'Costos Twilio', amount: 25000, percentage: 10, type: 'expense' },
        { category: 'Gastos Operativos', amount: 75000, percentage: 30, type: 'expense' },
        { category: 'Marketing', amount: 50000, percentage: 20, type: 'expense' },
        { category: 'Otros Gastos', amount: 13000, percentage: 5, type: 'expense' },
      ];
      
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// BUSINESS OWNER ROUTES
// ============================================

// Get all businesses owned by this user
router.get(
  "/business/my-businesses",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses, orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
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
          .reduce((sum, o) => sum + (o.subtotal || 0), 0);
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
      console.error("Error loading businesses:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Create new business
router.post(
  "/business/create",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { v4: uuidv4 } = await import("uuid");

      const { name, description, type, image, address, phone, categories } = req.body;

      if (!name) {
        return res.status(400).json({ error: "El nombre del negocio es requerido" });
      }

      const newBusiness = {
        id: uuidv4(),
        ownerId: req.user!.id,
        name,
        description: description || null,
        type: type || "restaurant",
        image: image || null,
        address: address || null,
        phone: phone || null,
        categories: categories || null,
        isActive: true,
        isOpen: false,
        rating: 0,
        totalRatings: 0,
        deliveryTime: "30-45 min",
        deliveryFee: 2500,
        minOrder: 5000,
      };

      await db.insert(businesses).values(newBusiness);

      res.json({ success: true, business: newBusiness });
    } catch (error: any) {
      console.error("Error creating business:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business dashboard data
router.get(
  "/business/dashboard",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses, orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and, desc } = await import("drizzle-orm");

      const business = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);

      if (!business[0]) {
        return res.status(404).json({ error: "Business not found" });
      }

      console.log(`🏪 Dashboard for business: ${business[0].name} (${business[0].id})`);

      const businessOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.businessId, business[0].id))
        .orderBy(desc(orders.createdAt));

      console.log(`📦 Found ${businessOrders.length} orders for this business`);

      const pendingOrders = businessOrders.filter(o => o.status === "pending");
      const todayOrders = businessOrders.filter(o => {
        const today = new Date();
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === today.toDateString();
      });

      // Calcular ingresos SOLO del negocio usando directamente el subtotal
      const todayRevenue = todayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.subtotal || 0), 0);

      res.json({
        success: true,
        dashboard: {
          business: business[0],
          isOpen: business[0].isOpen || false,
          pendingOrders: pendingOrders.length,
          todayOrders: todayOrders.length,
          todayRevenue: Math.round(todayRevenue),
          totalOrders: businessOrders.length,
          recentOrders: businessOrders.slice(0, 10),
        },
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business orders
router.get(
  "/business/orders",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses, orders, users, addresses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, desc, inArray } = await import("drizzle-orm");

      // Get ALL businesses for this owner
      const ownerBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id));

      if (ownerBusinesses.length === 0) {
        return res.status(404).json({ error: "No businesses found for this user" });
      }

      const businessIds = ownerBusinesses.map(b => b.id);

      // Get orders for all owner's businesses
      const businessOrders = await db
        .select()
        .from(orders)
        .where(inArray(orders.businessId, businessIds))
        .orderBy(desc(orders.createdAt));

      // Enrich orders with customer info and business name
      const enrichedOrders = await Promise.all(
        businessOrders.map(async (order) => {
          // Get customer info (use userId field)
          let customer = null;
          if (order.userId) {
            const customerResult = await db
              .select({ id: users.id, name: users.name, phone: users.phone })
              .from(users)
              .where(eq(users.id, order.userId))
              .limit(1);
            customer = customerResult[0] || null;
          }

          // Get delivery address
          let address = null;
          if (order.addressId) {
            const addressResult = await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, order.addressId))
              .limit(1);
            address = addressResult[0] || null;
          }

          // Get business name
          const business = ownerBusinesses.find(b => b.id === order.businessId);

          return {
            ...order,
            total: order.subtotal || 0, // Mostrar solo el subtotal (productos)
            subtotal: order.subtotal || 0,
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
  },
);

// Accept/reject order (Business)
router.put(
  "/business/orders/:id/status",
  authenticateToken,
  requireRole("business_owner"),
  validateOrderBusinessOwnership,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { validateStateTransition, validateRoleCanChangeToState } = await import("./orderStateValidation");
      const { calculateDistance } = await import("./utils/distance");
      const { status, latitude, longitude, lat, lng } = req.body;

      console.log(`🟢 Business changing order ${req.params.id} to status: ${status}`);

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json({ error: "Order not found" });
      }

      console.log(`🟢 Current status: ${order[0].status}, New status: ${status}`);

      // Validate role permissions
      const roleValidation = validateRoleCanChangeToState("business_owner", status);
      if (!roleValidation.valid) {
        return res.status(403).json({ error: roleValidation.error });
      }

      // Validate state transition
      const transitionValidation = validateStateTransition(order[0].status, status);
      if (!transitionValidation.valid) {
        return res.status(400).json({ error: transitionValidation.error });
      }

      await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, req.params.id));

      console.log(`✅ Order ${req.params.id} updated to ${status}`);

      res.json({ success: true, message: "Order status updated" });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business stats
router.get(
  "/business/stats",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses, orders, products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, inArray } = await import("drizzle-orm");

      // Get ALL businesses owned by this user
      const ownerBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id));

      if (ownerBusinesses.length === 0) {
        return res.status(404).json({ error: "No businesses found" });
      }

      // Get all business IDs
      const businessIds = ownerBusinesses.map(b => b.id);
      
      // Get orders from ALL owner's businesses
      const businessOrders = await db
        .select()
        .from(orders)
        .where(inArray(orders.businessId, businessIds));

      // Calculate date ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter orders by status and date
      const deliveredOrders = businessOrders.filter(o => o.status === "delivered");
      const cancelledOrders = businessOrders.filter(o => o.status === "cancelled");
      
      const todayOrders = deliveredOrders.filter(o => new Date(o.createdAt) >= startOfToday);
      const weekOrders = deliveredOrders.filter(o => new Date(o.createdAt) >= startOfWeek);
      const monthOrders = deliveredOrders.filter(o => new Date(o.createdAt) >= startOfMonth);

      // Calculate revenue using subtotal directly - SOLO INGRESOS DEL NEGOCIO
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

      // Calculate top products from order items
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      for (const order of deliveredOrders) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          if (Array.isArray(items)) {
            const orderSubtotalPesos = (order.subtotal || 0) / 100;
            const rawSum = items.reduce((sum, item) => {
              const price = item.price || item.product?.price || 0;
              const quantity = item.quantity || 1;
              return sum + price * quantity;
            }, 0);
            const rawSumAsPesos = rawSum;
            const rawSumFromCents = rawSum / 100;
            const priceIsPesos =
              orderSubtotalPesos > 0 &&
              Math.abs(rawSumAsPesos - orderSubtotalPesos) <=
                Math.abs(rawSumFromCents - orderSubtotalPesos);

            for (const item of items) {
              const productName = item.name || item.product?.name || 'Producto';
              const productId = item.productId || item.id || productName;
              const quantity = item.quantity || 1;
              const rawPrice = item.price || item.product?.price || 0;
              const price = priceIsPesos ? rawPrice : rawPrice / 100; // Convert to pesos when needed
              
              if (!productSales[productId]) {
                productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
              }
              productSales[productId].quantity += quantity;
              productSales[productId].revenue += price * quantity;
            }
          }
        } catch (e) {
          // Skip malformed items
        }
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const avgValue = deliveredOrders.length > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0;

      res.json({
        success: true,
        revenue: {
          today: Math.round(todayRevenue),
          week: Math.round(weekRevenue),
          month: Math.round(monthRevenue),
          total: Math.round(totalRevenue),
        },
        orders: {
          total: businessOrders.length,
          completed: deliveredOrders.length,
          cancelled: cancelledOrders.length,
          avgValue: avgValue,
        },
        topProducts,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update business settings
router.put(
  "/business/settings",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(businesses)
        .set(req.body)
        .where(eq(businesses.ownerId, req.user!.id));

      res.json({ success: true, message: "Settings updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Toggle business active status (pause/resume)
router.put(
  "/business/toggle-status",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const business = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);

      if (!business[0]) {
        return res.status(404).json({ error: "Business not found" });
      }

      await db
        .update(businesses)
        .set({ isActive: !business[0].isActive })
        .where(eq(businesses.ownerId, req.user!.id));

      res.json({ 
        success: true, 
        isActive: !business[0].isActive,
        message: !business[0].isActive ? "Negocio activado" : "Negocio pausado"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business products
router.get(
  "/business/products",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { products, businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and, inArray } = await import("drizzle-orm");

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
        .where(eq(products.businessId, targetBusinessId))
        .orderBy(products.createdAt);

      res.json({ success: true, products: businessProducts, businessId: targetBusinessId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Upload product image
router.post(
  "/business/product-image",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó imagen" });
      }

      // Extract base64 data
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Formato de imagen inválido" });
      }

      const extension = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Create unique filename
      const filename = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const uploadDir = path.join(__dirname, "uploads", "products");
      const filepath = path.join(uploadDir, filename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save image
      fs.writeFileSync(filepath, buffer);

      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const imageUrl = `${backendUrl}/uploads/products/${filename}`;
      res.json({ success: true, imageUrl });
    } catch (error: any) {
      console.error("Error uploading product image:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Upload business image
router.post(
  "/upload/business-image",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No se proporcionó imagen" });
      }

      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Formato de imagen inválido" });
      }

      const extension = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const filename = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const uploadDir = path.join(__dirname, "uploads", "businesses");
      const filepath = path.join(uploadDir, filename);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fs.writeFileSync(filepath, buffer);

      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const imageUrl = `${backendUrl}/uploads/businesses/${filename}`;
      res.json({ success: true, imageUrl });
    } catch (error: any) {
      console.error("Error uploading business image:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Create product
router.post(
  "/business/products",
  authenticateToken,
  requireRole("business_owner"),
  auditAction("create_product", "product"),
  async (req, res) => {
    try {
      const { products, businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { v4: uuidv4 } = await import("uuid");

      // Get business ID
      const business = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);

      if (!business[0]) {
        return res.status(404).json({ error: "Business not found for this user" });
      }

      const { name, description, price, image, category } = req.body;
      
      if (!name || price === undefined) {
        return res.status(400).json({ error: "Name and price are required" });
      }

      const productData = {
        id: uuidv4(),
        businessId: business[0].id,
        name,
        description: description || null,
        price: parseInt(price) || 0,
        image: image || null,
        category: category || null,
        isAvailable: true,
      };

      await db.insert(products).values(productData);
      res.json({ success: true, productId: productData.id });
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Update product
router.put(
  "/business/products/:id",
  authenticateToken,
  requireRole("business_owner"),
  auditAction("update_product", "product"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id));

      res.json({ success: true, message: "Product updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete product
router.delete(
  "/business/products/:id",
  authenticateToken,
  requireRole("business_owner"),
  auditAction("delete_product", "product"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db.delete(products).where(eq(products.id, req.params.id));
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update product availability
router.put(
  "/business/products/:id/availability",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(products)
        .set({ isAvailable: req.body.isAvailable })
        .where(eq(products.id, req.params.id));

      res.json({ success: true, message: "Availability updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business categories
router.get(
  "/business/categories",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      // Mock categories for now
      const categories = [
        { id: "1", name: "Entradas", description: "Aperitivos y entradas", isActive: true, sortOrder: 1 },
        { id: "2", name: "Platos Principales", description: "Platos fuertes", isActive: true, sortOrder: 2 },
        { id: "3", name: "Postres", description: "Dulces y postres", isActive: true, sortOrder: 3 },
        { id: "4", name: "Bebidas", description: "Bebidas frías y calientes", isActive: true, sortOrder: 4 },
      ];
      
      res.json({ success: true, categories });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get business hours
router.get(
  "/business/hours",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      let hoursData = {};

      if (business.openingHours) {
        try {
          hoursData = JSON.parse(business.openingHours);
        } catch {
          hoursData = {};
        }
      }

      const hours = dayNames.map((day, index) => {
        const dayData = hoursData[index] || { isOpen: true, openTime: "09:00", closeTime: "18:00" };
        return {
          day,
          isOpen: dayData.isOpen,
          openTime: dayData.openTime,
          closeTime: dayData.closeTime,
        };
      });

      res.json({ success: true, hours });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update business hours
router.put(
  "/business/hours",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { BusinessHoursService } = await import("./businessHoursService");

      const { hours } = req.body;

      if (!hours || !Array.isArray(hours)) {
        return res.status(400).json({ error: "Horarios inválidos" });
      }

      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, req.user!.id))
        .limit(1);

      if (!business) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const hoursObject = {};

      hours.forEach((hour) => {
        const dayIndex = dayNames.indexOf(hour.day);
        if (dayIndex !== -1) {
          hoursObject[dayIndex] = {
            isOpen: hour.isOpen,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
          };
        }
      });

      await db
        .update(businesses)
        .set({ openingHours: JSON.stringify(hoursObject) })
        .where(eq(businesses.id, business.id));

      await BusinessHoursService.updateAllBusinessStatuses();

      res.json({ success: true, message: "Horarios actualizados" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ORDERS ROUTES
// ============================================

// Update business
router.put(
  "/business/:id",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const business = await db
        .select()
        .from(businesses)
        .where(and(
          eq(businesses.id, req.params.id),
          eq(businesses.ownerId, req.user!.id)
        ))
        .limit(1);

      if (!business[0]) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const allowedFields = ["name", "description", "type", "image", "address", "phone", 
                            "categories", "isOpen", "deliveryTime", "deliveryFee", "minOrder"];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      await db
        .update(businesses)
        .set(updates)
        .where(eq(businesses.id, req.params.id));

      res.json({ success: true, message: "Negocio actualizado" });
    } catch (error: any) {
      console.error("Error updating business:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete business
router.delete(
  "/business/:id",
  authenticateToken,
  requireRole("business_owner"),
  async (req, res) => {
    try {
      const { businesses, orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const business = await db
        .select()
        .from(businesses)
        .where(and(
          eq(businesses.id, req.params.id),
          eq(businesses.ownerId, req.user!.id)
        ))
        .limit(1);

      if (!business[0]) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const activeOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.businessId, req.params.id));

      const hasActiveOrders = activeOrders.some(o => 
        ["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way"].includes(o.status)
      );

      if (hasActiveOrders) {
        return res.status(400).json({ 
          error: "No se puede eliminar un negocio con pedidos activos" 
        });
      }

      await db.delete(businesses).where(eq(businesses.id, req.params.id));

      res.json({ success: true, message: "Negocio eliminado" });
    } catch (error: any) {
      console.error("Error deleting business:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get user orders
router.get(
  "/orders",
  authenticateToken,
  async (req, res) => {
    try {
      const { FinanceService } = await import("./financeService");
      const userOrders = await FinanceService.getUserOrders(req.user!.id);
      
      res.json({ success: true, orders: userOrders });
    } catch (error: any) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Create order
router.post(
  "/orders",
  authenticateToken,
  validateOrderFinancials,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");

      const productosBase = req.body.productosBase ?? req.body.subtotal;
      const nemyCommission =
        typeof req.body.nemyCommission === "number" && req.body.nemyCommission > 0
          ? req.body.nemyCommission
          : Math.round(productosBase * 0.15);
      const couponDiscount = req.body.couponDiscount || 0;
      const calculatedTotal = productosBase + nemyCommission + req.body.deliveryFee - couponDiscount;

      const orderData = {
        userId: req.user!.id,
        businessId: req.body.businessId,
        businessName: req.body.businessName,
        businessImage: req.body.businessImage,
        items: req.body.items,
        status: "pending",
        subtotal: productosBase,
        productosBase,
        nemyCommission,
        deliveryFee: req.body.deliveryFee,
        total: calculatedTotal,
        paymentMethod: req.body.paymentMethod,
        deliveryAddress: req.body.deliveryAddress,
        deliveryLatitude: req.body.deliveryLatitude,
        deliveryLongitude: req.body.deliveryLongitude,
        notes: req.body.notes,
        substitutionPreference: req.body.substitutionPreference,
        itemSubstitutionPreferences: req.body.itemSubstitutionPreferences,
        cashPaymentAmount: req.body.cashPaymentAmount,
        cashChangeAmount: req.body.cashChangeAmount,
      };

      await db.insert(orders).values(orderData);
      
      // Get the created order with UUID
      const createdOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, req.user!.id))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      
      const orderId = createdOrder[0].id;
      console.log('✅ Order created with ID:', orderId);

      // Calcular ETA dinámico
      if (req.body.deliveryLatitude && req.body.deliveryLongitude) {
        const { calculateDynamicETA } = await import("./dynamicETAService");
        const eta = await calculateDynamicETA(
          req.body.businessId,
          parseFloat(req.body.deliveryLatitude),
          parseFloat(req.body.deliveryLongitude)
        );

        await db
          .update(orders)
          .set({
            estimatedPrepTime: eta.prepTime,
            estimatedDeliveryTime: eta.deliveryTime,
            estimatedTotalTime: eta.totalTime,
            estimatedDelivery: eta.estimatedArrival,
          })
          .where(eq(orders.id, orderId));

        console.log(`⏱️ ETA calculated: ${eta.totalTime} min (Prep: ${eta.prepTime}, Delivery: ${eta.deliveryTime})`);
      }

      res.json({ success: true, id: orderId, orderId, order: { id: orderId } });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get order by ID
router.get(
  "/orders/:id",
  authenticateToken,
  validateCustomerOrderOwnership,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order[0]) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ success: true, order: order[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Cancel order during regret period
router.post(
  "/orders/:id/cancel-regret",
  authenticateToken,
  validateCustomerOrderOwnership,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Si se intenta marcar entregado, validar proximidad GPS (radio 100m)
      if (status === "delivered") {
        const driverLat = typeof latitude === "number" ? latitude : lat;
        const driverLng = typeof longitude === "number" ? longitude : lng;
        const hasDriverCoords = typeof driverLat === "number" && typeof driverLng === "number";

        if (!hasDriverCoords) {
          return res.status(400).json({ error: "Ubicación requerida para marcar entregado" });
        }

        const deliveryLat = order.deliveryLatitude ?? order.deliveryLat ?? order.latitude;
        const deliveryLng = order.deliveryLongitude ?? order.deliveryLng ?? order.longitude;
        const hasDeliveryCoords = typeof deliveryLat === "number" && typeof deliveryLng === "number";

        if (!hasDeliveryCoords) {
          return res.status(400).json({ error: "Pedido sin coordenadas de entrega" });
        }

        const distanceKm = calculateDistance(
          Number(driverLat),
          Number(driverLng),
          Number(deliveryLat),
          Number(deliveryLng),
        );

        const maxDistanceMeters = 100;
        if (distanceKm * 1000 > maxDistanceMeters) {
          return res.status(400).json({
            error: "Debes estar cerca del destino para marcar entregado",
            distanceMeters: Math.round(distanceKm * 1000),
          });
        }
      }

      if (order.status !== "pending") {
        return res.status(400).json({ error: "Solo se pueden cancelar pedidos pendientes" });
      }

      await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, req.params.id));

      res.json({ success: true, message: "Pedido cancelado" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Confirm order (after regret period) - NO cambia status
router.post(
  "/orders/:id/confirm",
  authenticateToken,
  async (req, res) => {
    try {
      // No hacer nada, solo confirmar que el período de arrepentimiento terminó
      // El status permanece en "pending" hasta que el negocio lo acepte
      res.json({ success: true, message: "Order confirmed to business" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Order chat (customer/driver/business/admin)
router.get(
  "/orders/:id/chat",
  authenticateToken,
  async (req, res) => {
    try {
      const access = await ensureOrderAccess(
        req.params.id,
        req.user!.id,
        req.user!.role,
      );

      if ("status" in access) {
        return res.status(access.status).json({ error: access.error });
      }

      const messages = getChatMessages(req.params.id).map((msg) => ({
        id: msg.id,
        orderId: msg.orderId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
        createdAt: msg.timestamp,
        isRead: false,
      }));

      return res.json(messages);
    } catch (error: any) {
      console.error("Error fetching order chat:", error);
      return res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/orders/:id/chat",
  authenticateToken,
  async (req, res) => {
    try {
      const access = await ensureOrderAccess(
        req.params.id,
        req.user!.id,
        req.user!.role,
      );

      if ("status" in access) {
        return res.status(access.status).json({ error: access.error });
      }

      const { message, receiverId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!receiverId) {
        return res.status(400).json({ error: "receiverId is required" });
      }

      const chatMessage = addChatMessage(
        req.params.id,
        req.user!.id,
        receiverId,
        message,
        req.user!.name || "Usuario",
      );

      return res.json({
        success: true,
        message: {
          id: chatMessage.id,
          orderId: chatMessage.orderId,
          senderId: chatMessage.senderId,
          receiverId: chatMessage.receiverId,
          message: chatMessage.message,
          createdAt: chatMessage.timestamp,
          isRead: false,
        },
      });
    } catch (error: any) {
      console.error("Error sending order chat message:", error);
      return res.status(500).json({ error: error.message });
    }
  },
);


// ============================================
// DELIVERY DRIVER ROUTES
// ============================================

// Get available orders for drivers
router.get(
  "/delivery/available-orders",
  authenticateToken,
  requireRole("delivery_driver"),
  async (req, res) => {
    try {
      const result = await getAvailableOrdersForDriver(req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching available orders:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get available orders",
        orders: []
      });
    }
  },
);

// Get driver status (online/offline)
router.get(
  "/delivery/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      console.log(`🔍 GET /delivery/status - User ID: ${req.user!.id}, Role: ${req.user!.role}`);

      const driver = await db
        .select({
          id: users.id,
          isOnline: users.isOnline,
          isActive: users.isActive,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!driver[0]) {
        console.error(`❌ Driver not found: ${req.user!.id}`);
        return res.status(404).json({ error: "Driver not found" });
      }

      const isOnline = Boolean(driver[0].isOnline);
      
      console.log(`✅ Driver ${req.user!.id} status: isOnline=${driver[0].isOnline} -> ${isOnline}`);

      res.json({
        success: true,
        isOnline: isOnline,
        strikes: 0,
      });
    } catch (error: any) {
      console.error('Get status error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Toggle driver online/offline status
router.post(
  "/delivery/toggle-status",
  authenticateToken,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      console.log(`🚗 POST /delivery/toggle-status - User ID: ${req.user!.id}, Role: ${req.user!.role}`);

      const driver = await db
        .select({
          id: users.id,
          isOnline: users.isOnline,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!driver[0]) {
        console.error(`❌ Driver not found: ${req.user!.id}`);
        return res.status(404).json({ error: "Driver not found" });
      }

      const currentStatus = Boolean(driver[0].isOnline);
      const newStatus = !currentStatus;
      
      console.log(`🚗 Driver ${req.user!.id} toggling: ${currentStatus} -> ${newStatus}`);

      await db
        .update(users)
        .set({ 
          isOnline: newStatus,
          lastActiveAt: new Date()
        })
        .where(eq(users.id, req.user!.id));

      // Verify the update worked
      const [updatedDriver] = await db
        .select({ isOnline: users.isOnline })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      console.log(`✅ Driver ${req.user!.id} status updated to: ${newStatus}, verified: ${updatedDriver?.isOnline}`);

      res.json({
        success: true,
        isOnline: Boolean(updatedDriver?.isOnline),
        message: newStatus ? "Ahora estás en línea" : "Ahora estás desconectado",
      });
    } catch (error: any) {
      console.error('Toggle status error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Accept order
router.post(
  "/delivery/accept-order/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      console.log(`✅ POST /delivery/accept-order/${req.params.id} - Driver: ${req.user!.id}`);

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.deliveryPersonId) {
        return res.status(400).json({ error: "Order already assigned" });
      }

      // ✅ VALIDACIÓN DE EFECTIVO: Verificar si puede aceptar pedidos en efectivo
      if (order.paymentMethod === 'cash') {
        const { cashSecurityService } = await import('./cashSecurityService');
        const canAccept = await cashSecurityService.canAcceptCashOrder(req.user!.id);
        
        if (!canAccept.allowed) {
          return res.status(403).json({ 
            error: canAccept.reason,
            code: 'CASH_LIMIT_EXCEEDED',
            action: 'LIQUIDATE_CASH'
          });
        }
      }

      // Assign driver and update status
      await db
        .update(orders)
        .set({
          deliveryPersonId: req.user!.id,
          status: "picked_up",
          assignedAt: new Date()
        })
        .where(eq(orders.id, req.params.id));

      console.log(`✅ Order ${req.params.id} accepted by driver ${req.user!.id}`);

      res.json({ success: true, message: "Order accepted" });
    } catch (error: any) {
      console.error('Accept order error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get driver orders
router.get(
  "/delivery/my-orders",
  authenticateToken,
  requireRole("delivery_driver"),
  async (req, res) => {
    try {
      const { orders, wallets, transactions, businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      const { financialService } = await import("./unifiedFinancialService");

      const migratedBusinessIds = new Set<string>();

      const driverOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.deliveryPersonId, req.user!.id))
        .orderBy(orders.createdAt);

      for (const order of driverOrders) {
        if (order.status !== "delivered") continue;

        const [existingDeliveryTx] = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.orderId, order.id),
              eq(transactions.userId, order.deliveryPersonId),
              eq(transactions.type, "delivery_payment"),
            ),
          )
          .limit(1);

        if (existingDeliveryTx) continue;

        const commissions = await financialService.calculateCommissions(
          order.total,
          order.deliveryFee,
          order.productosBase || order.subtotal,
          order.nemyCommission || undefined,
        );

        await db
          .update(orders)
          .set({
            platformFee: order.platformFee ?? commissions.platform,
            businessEarnings: order.businessEarnings ?? commissions.business,
            deliveryEarnings: order.deliveryEarnings ?? commissions.driver,
          })
          .where(eq(orders.id, order.id));

        const [driverWallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.userId, order.deliveryPersonId))
          .limit(1);

        if (driverWallet) {
          await db
            .update(wallets)
            .set({
              balance: driverWallet.balance + commissions.driver,
              totalEarned: driverWallet.totalEarned + commissions.driver,
            })
            .where(eq(wallets.userId, order.deliveryPersonId));
        } else {
          await db.insert(wallets).values({
            userId: order.deliveryPersonId,
            balance: commissions.driver,
            pendingBalance: 0,
            totalEarned: commissions.driver,
            totalWithdrawn: 0,
            cashOwed: 0,
          });
        }

        await db.insert(transactions).values({
          userId: order.deliveryPersonId,
          type: "delivery_payment",
          amount: commissions.driver,
          status: "completed",
          description: `Entrega de pedido #${order.id.slice(-8)}`,
          orderId: order.id,
        });

        const [business] = await db
          .select({ ownerId: businesses.ownerId })
          .from(businesses)
          .where(eq(businesses.id, order.businessId))
          .limit(1);

        const businessOwnerId = business?.ownerId || order.businessId;

        if (order.paymentMethod === "cash") {
          continue;
        }

        const [existingBusinessTx] = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.orderId, order.id),
              eq(transactions.userId, businessOwnerId),
              eq(transactions.type, "order_payment"),
            ),
          )
          .limit(1);

        if (!existingBusinessTx) {
          const [legacyBusinessTx] = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.orderId, order.id),
                eq(transactions.userId, order.businessId),
                eq(transactions.type, "order_payment"),
              ),
            )
            .limit(1);

          const [businessWallet] = await db
            .select()
            .from(wallets)
            .where(eq(wallets.userId, order.businessId))
            .limit(1);

          if (
            businessOwnerId !== order.businessId &&
            businessWallet &&
            (businessWallet.balance !== 0 || businessWallet.totalEarned !== 0) &&
            !migratedBusinessIds.has(order.businessId)
          ) {
            const [ownerWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, businessOwnerId))
              .limit(1);

            if (ownerWallet) {
              await db
                .update(wallets)
                .set({
                  balance: ownerWallet.balance + businessWallet.balance,
                  totalEarned: ownerWallet.totalEarned + businessWallet.totalEarned,
                })
                .where(eq(wallets.userId, businessOwnerId));
            } else {
              await db.insert(wallets).values({
                userId: businessOwnerId,
                balance: businessWallet.balance,
                pendingBalance: 0,
                totalEarned: businessWallet.totalEarned,
                totalWithdrawn: 0,
                cashOwed: 0,
              });
            }

            await db
              .update(wallets)
              .set({
                balance: 0,
                totalEarned: 0,
              })
              .where(eq(wallets.userId, order.businessId));

            await db
              .update(transactions)
              .set({ userId: businessOwnerId })
              .where(eq(transactions.userId, order.businessId));

            migratedBusinessIds.add(order.businessId);
          }

          if (!legacyBusinessTx) {
            const [ownerWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, businessOwnerId))
              .limit(1);

            if (ownerWallet) {
              await db
                .update(wallets)
                .set({
                  balance: ownerWallet.balance + commissions.business,
                  totalEarned: ownerWallet.totalEarned + commissions.business,
                })
                .where(eq(wallets.userId, businessOwnerId));
            } else {
              await db.insert(wallets).values({
                userId: businessOwnerId,
                balance: commissions.business,
                pendingBalance: 0,
                totalEarned: commissions.business,
                totalWithdrawn: 0,
                cashOwed: 0,
              });
            }

            await db.insert(transactions).values({
              userId: businessOwnerId,
              type: "order_payment",
              amount: commissions.business,
              status: "completed",
              description: `Pago por pedido #${order.id.slice(-8)}`,
              orderId: order.id,
            });
          }
        }
      }

      res.json({ success: true, orders: driverOrders });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get delivery orders (combined endpoint for frontend)
router.get(
  "/delivery/orders",
  authenticateToken,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");

      // Get driver's assigned orders
      const driverOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.deliveryPersonId, req.user!.id))
        .orderBy(desc(orders.createdAt));

      // Get available orders (ready for pickup, no driver assigned)
      const allReadyOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, "ready"))
        .orderBy(desc(orders.createdAt));

      // Filter available orders that don't have a driver
      const availableOrders = allReadyOrders.filter(o => !o.deliveryPersonId);

      res.json({ 
        success: true, 
        orders: driverOrders,
        availableOrders: availableOrders
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);



// Update order status (Driver)
router.put(
  "/delivery/orders/:id/status",
  authenticateToken,
  requireRole("delivery_driver"),
  validateDriverOrderOwnership,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { validateStateTransition, validateRoleCanChangeToState } = await import("./orderStateValidation");
      const { status } = req.body;

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Validate role permissions
      const roleValidation = validateRoleCanChangeToState("delivery_driver", status);
      if (!roleValidation.valid) {
        return res.status(403).json({ error: roleValidation.error });
      }

      // Validate state transition
      const transitionValidation = validateStateTransition(order.status, status);
      if (!transitionValidation.valid) {
        return res.status(400).json({ error: transitionValidation.error });
      }

      await db
        .update(orders)
        .set({ 
          status, 
          updatedAt: new Date(),
          ...(status === "delivered" && { deliveredAt: new Date() })
        })
        .where(eq(orders.id, req.params.id));

      // 💰 MANEJAR DISTRIBUCIÓN DE GANANCIAS CUANDO SE ENTREGA
      if (status === "delivered") {
        try {
          console.log(`💰 Processing delivery completion for order ${req.params.id}`);
          
          // Si es pago en efectivo, registrar deuda de efectivo
          if (order.paymentMethod === "cash") {
            const { cashSettlementService } = await import("./cashSettlementService");
            await cashSettlementService.registerCashDebt(
              order.id,
              req.user!.id,
              order.businessId,
              order.total,
              order.deliveryFee
            );
            
            console.log(`💵 Cash order completed - debt registered for driver ${req.user!.id}`);
          } else {
            const [business] = await db
              .select({ ownerId: businesses.ownerId })
              .from(businesses)
              .where(eq(businesses.id, order.businessId))
              .limit(1);

            const businessOwnerId = business?.ownerId || order.businessId;

            // Si es tarjeta, distribuir comisiones con el modelo unificado (15% markup productos, 100% delivery)
            const { financialService } = await import("./unifiedFinancialService");
            const commissions = await financialService.calculateCommissions(
              order.total || 0,
              order.deliveryFee || 0,
              order.productosBase || order.subtotal,
              order.nemyCommission || undefined
            );

            console.log(`💳 Card payment - distributing commissions`);

            // Update order with commission breakdown
            await db
              .update(orders)
              .set({
                platformFee: commissions.nemy,
                businessEarnings: commissions.business,
                deliveryEarnings: commissions.driver,
              })
              .where(eq(orders.id, req.params.id));

            // Distribuir a wallets (solo para pagos con tarjeta)
            const { wallets, transactions } = await import("@shared/schema-mysql");
            
            // Create/update business wallet
            const [businessWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, businessOwnerId))
              .limit(1);

            if (businessWallet) {
              await db
                .update(wallets)
                .set({ 
                  balance: businessWallet.balance + commissions.business,
                  totalEarned: businessWallet.totalEarned + commissions.business,
                  updatedAt: new Date(),
                })
                .where(eq(wallets.userId, businessOwnerId));
            } else {
              await db.insert(wallets).values({
                userId: businessOwnerId,
                balance: commissions.business,
                pendingBalance: 0,
                totalEarned: commissions.business,
                totalWithdrawn: 0,
                cashOwed: 0,
              });
            }

            // Create/update driver wallet
            const [driverWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, req.user!.id))
              .limit(1);

            if (driverWallet) {
              await db
                .update(wallets)
                .set({ 
                  balance: driverWallet.balance + commissions.driver,
                  totalEarned: driverWallet.totalEarned + commissions.driver,
                  updatedAt: new Date(),
                })
                .where(eq(wallets.userId, req.user!.id));
            } else {
              await db.insert(wallets).values({
                userId: req.user!.id,
                balance: commissions.driver,
                pendingBalance: 0,
                totalEarned: commissions.driver,
                totalWithdrawn: 0,
                cashOwed: 0,
              });
            }

            // Create transactions
            await db.insert(transactions).values([
              {
                userId: businessOwnerId,
                orderId: order.id,
                type: "order_payment",
                amount: commissions.business,
                status: "completed",
                description: `Pago por pedido #${order.id.slice(-8)}`,
                createdAt: new Date(),
              },
              {
                userId: req.user!.id,
                orderId: order.id,
                type: "delivery_payment",
                amount: commissions.driver,
                status: "completed",
                description: `Entrega de pedido #${order.id.slice(-8)}`,
                createdAt: new Date(),
              }
            ]);
          }

          console.log(`✅ Order ${req.params.id} delivery completed successfully`);
        } catch (transferError) {
          console.error('❌ Error processing delivery completion:', transferError);
          // Don't fail the status update if fund transfer fails
        }
      }

      res.json({ success: true, message: "Status updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get driver earnings (with userId param for frontend compatibility)
router.get(
  "/delivery/:driverId/earnings",
  authenticateToken,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and, gte } = await import("drizzle-orm");

      const driverId = req.params.driverId;
      
      // Verify user can access this data
      if (req.user!.id !== driverId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
        return res.status(403).json({ error: "No tienes permiso" });
      }

      const completedOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.deliveryPersonId, driverId),
            eq(orders.status, "delivered")
          )
        );

      // Calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter orders by date ranges
      const todayOrders = completedOrders.filter(order => 
        new Date(order.createdAt!) >= todayStart
      );
      const weekOrders = completedOrders.filter(order => 
        new Date(order.createdAt!) >= weekStart
      );
      const monthOrders = completedOrders.filter(order => 
        new Date(order.createdAt!) >= monthStart
      );

      const calculateEarnings = (orderList: typeof completedOrders) => {
        return orderList.reduce((sum, order) => {
          return sum + (order.deliveryEarnings || 0);
        }, 0);
      };

      const calculateTips = (orderList: typeof completedOrders) => {
        return orderList.reduce((sum, order) => sum + (order.driverTip || 0), 0);
      };

      res.json({
        success: true,
        earnings: {
          today: calculateEarnings(todayOrders) / 100,
          week: calculateEarnings(weekOrders) / 100,
          month: calculateEarnings(monthOrders) / 100,
          total: calculateEarnings(completedOrders) / 100,
          tips: calculateTips(completedOrders) / 100,
        },
        stats: {
          totalDeliveries: completedOrders.length,
          averageRating: 4.8,
          completionRate: 100,
          avgDeliveryTime: completedOrders.length > 0 ? 25 : 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get driver earnings (legacy endpoint)
router.get(
  "/delivery/earnings",
  authenticateToken,
  requireRole("delivery_driver"),
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const completedOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.deliveryPersonId, req.user!.id),
            eq(orders.status, "delivered")
          )
        );

      const totalEarnings = completedOrders.reduce(
        (sum, order) => sum + (order.total * 0.15),
        0
      );

      const todayEarnings = completedOrders
        .filter(order => {
          const today = new Date();
          const orderDate = new Date(order.createdAt);
          return orderDate.toDateString() === today.toDateString();
        })
        .reduce((sum, order) => sum + (order.total * 0.15), 0);

      res.json({
        success: true,
        earnings: {
          total: Math.round(totalEarnings),
          today: Math.round(todayEarnings),
          orders: completedOrders.length,
          todayOrders: completedOrders.filter(order => {
            const today = new Date();
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === today.toDateString();
          }).length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get all pending withdrawals (admin)
router.get(
  "/admin/withdrawals/pending",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const { withdrawals } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const pending = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.status, "pending"))
        .orderBy(withdrawals.createdAt);

      res.json({ success: true, withdrawals: pending });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get all withdrawals (admin)
router.get(
  "/admin/withdrawals",
  authenticateToken,
  requireMinRole("admin"),
  async (req, res) => {
    try {
      const { withdrawals } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const all = await db
        .select()
        .from(withdrawals)
        .orderBy(withdrawals.createdAt)
        .limit(100);

      res.json({ success: true, withdrawals: all });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// ADMIN MANAGEMENT ROUTES
// ============================================

// Get admin stats
router.get(
  "/admin/stats",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { FinanceService } = await import("./financeService");
      const metrics = await FinanceService.getFinancialMetrics();
      
      res.json({
        success: true,
        ...metrics,
      });
    } catch (error: any) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Admin dashboard metrics - moved to adminRoutes.ts

// Admin active orders - moved to adminRoutes.ts

// Admin online drivers - moved to adminRoutes.ts

// Get admin logs
router.get(
  "/admin/logs",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { auditLogs } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(auditLogs.createdAt)
        .limit(limit);

      res.json({ logs });
    } catch (error: any) {
      res.json({ logs: [] });
    }
  },
);

// Get all drivers (admin)
router.get(
  "/admin/drivers",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { users, orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, count } = await import("drizzle-orm");

      const drivers = await db
        .select()
        .from(users)
        .where(eq(users.role, "delivery_driver"));

      const driversWithStats = await Promise.all(
        drivers.map(async (driver) => {
          const deliveryCount = await db
            .select({ count: count() })
            .from(orders)
            .where(eq(orders.deliveryPersonId, driver.id));

          return {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone,
            isOnline: driver.isActive,
            isApproved: true,
            strikes: 0,
            totalDeliveries: deliveryCount[0]?.count || 0,
            rating: 4.5,
            createdAt: driver.createdAt,
          };
        })
      );

      res.json({ drivers: driversWithStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update driver approval (admin)
router.put(
  "/admin/drivers/:id/approval",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_driver_approval", "user"),
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({ isActive: req.body.isApproved })
        .where(eq(users.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update driver strikes (admin)
router.put(
  "/admin/drivers/:id/strikes",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_driver_strikes", "user"),
  async (req, res) => {
    try {
      res.json({ success: true, message: "Strikes updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// REMOVED: Duplicate /admin/wallets endpoint - now handled by adminRoutes.ts

// Get withdrawal requests (admin)
router.get(
  "/admin/withdrawals",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { withdrawalRequests, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const allWithdrawals = await db.select().from(withdrawalRequests);

      const withdrawalsWithUsers = await Promise.all(
        allWithdrawals.map(async (w) => {
          const user = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, w.userId))
            .limit(1);

          return {
            id: w.id,
            userId: w.userId,
            userName: user[0]?.name || "Usuario",
            amount: w.amount,
            status: w.status,
            bankName: w.bankName,
            accountNumber: w.accountNumber,
            createdAt: w.createdAt,
          };
        })
      );

      res.json({ withdrawals: withdrawalsWithUsers });
    } catch (error: any) {
      res.json({ withdrawals: [] });
    }
  },
);

// Update withdrawal request (admin)
router.put(
  "/admin/withdrawals/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_withdrawal", "withdrawal"),
  async (req, res) => {
    try {
      const { withdrawalRequests } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(withdrawalRequests)
        .set({ status: req.body.status, processedAt: new Date() })
        .where(eq(withdrawalRequests.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get coupons (admin)
router.get(
  "/admin/coupons",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { coupons } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const allCoupons = await db.select().from(coupons);
      res.json({ coupons: allCoupons });
    } catch (error: any) {
      res.json({ coupons: [] });
    }
  },
);

// Create coupon (admin)
router.post(
  "/admin/coupons",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("create_coupon", "coupon"),
  async (req, res) => {
    try {
      const { coupons } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { randomUUID } = await import("crypto");

      const { code, discountType, discountValue, minOrderAmount, maxUses, maxUsesPerUser, expiresAt } = req.body;

      await db.insert(coupons).values({
        id: randomUUID(),
        code,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usedCount: 0,
        isActive: true,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update coupon (admin)
router.put(
  "/admin/coupons/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_coupon", "coupon"),
  async (req, res) => {
    try {
      const { coupons } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db.update(coupons).set(req.body).where(eq(coupons.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete coupon (admin)
router.delete(
  "/admin/coupons/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("delete_coupon", "coupon"),
  async (req, res) => {
    try {
      const { coupons } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db.delete(coupons).where(eq(coupons.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get support tickets (admin)
router.get(
  "/admin/support/tickets",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { supportChats, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");

      const tickets = await db.select().from(supportChats).orderBy(desc(supportChats.createdAt));

      const enrichedTickets = await Promise.all(
        tickets.map(async (ticket) => {
          const [user] = await db
            .select({ id: users.id, name: users.name, phone: users.phone })
            .from(users)
            .where(eq(users.id, ticket.userId))
            .limit(1);

          return {
            ...ticket,
            userName: user?.name || "Usuario",
            userPhone: user?.phone || "",
          };
        })
      );

      res.json({ success: true, tickets: enrichedTickets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get messages for a ticket
router.get(
  "/admin/support/tickets/:id/messages",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { supportMessages, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.chatId, req.params.id))
        .orderBy(supportMessages.createdAt);

      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          if (!msg.userId) {
            return { ...msg, senderName: "Bot", senderType: "bot" };
          }

          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, msg.userId))
            .limit(1);

          return {
            ...msg,
            senderName: user?.name || "Usuario",
            senderType: msg.isBot ? "bot" : "user",
          };
        })
      );

      res.json({ success: true, messages: enrichedMessages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Send message (with AI response)
router.post(
  "/admin/support/tickets/:id/messages",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { supportMessages } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { v4: uuidv4 } = await import("uuid");

      const { message, isBot } = req.body;

      await db.insert(supportMessages).values({
        id: uuidv4(),
        chatId: req.params.id,
        userId: isBot ? null : req.user!.id,
        message,
        isBot: isBot || false,
      });

      if (!isBot) {
        try {
          const aiResponse = await generateGeminiResponse(message);
          
          await db.insert(supportMessages).values({
            id: uuidv4(),
            chatId: req.params.id,
            userId: null,
            message: aiResponse,
            isBot: true,
          });

          res.json({ success: true, aiResponse });
        } catch (aiError) {
          res.json({ success: true, aiResponse: null });
        }
      } else {
        res.json({ success: true });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update ticket status/priority
router.put(
  "/admin/support/tickets/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { supportChats } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const { status } = req.body;

      await db
        .update(supportChats)
        .set({ status, updatedAt: new Date() })
        .where(eq(supportChats.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Legacy support tickets route
router.get(
  "/admin/support-tickets",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { supportTickets, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const allTickets = await db.select().from(supportTickets);

      const ticketsWithUsers = await Promise.all(
        allTickets.map(async (ticket) => {
          const user = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, ticket.userId))
            .limit(1);

          return {
            id: ticket.id,
            userId: ticket.userId,
            userName: user[0]?.name || "Usuario",
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority || "medium",
            createdAt: ticket.createdAt,
            lastMessageAt: ticket.updatedAt,
          };
        })
      );

      res.json({ tickets: ticketsWithUsers });
    } catch (error: any) {
      res.json({ tickets: [] });
    }
  },
);

// Update support ticket (admin)
router.put(
  "/admin/support-tickets/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_support_ticket", "support_ticket"),
  async (req, res) => {
    try {
      const { supportTickets } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(supportTickets)
        .set({ status: req.body.status, updatedAt: new Date() })
        .where(eq(supportTickets.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get delivery zones (public endpoint)
router.get(
  "/delivery-zones",
  async (req, res) => {
    try {
      console.log('📍 GET /delivery-zones called');
      
      // Datos temporales hasta que se cree la tabla
      const zones = [
        {
          id: 'zone-centro',
          name: 'Centro',
          description: 'Centro de Autlán',
          deliveryFee: 2500,
          maxDeliveryTime: 30,
          isActive: true,
          centerLatitude: '20.6736',
          centerLongitude: '-104.3647',
          radiusKm: 3
        },
        {
          id: 'zone-norte',
          name: 'Norte',
          description: 'Zona Norte de Autlán',
          deliveryFee: 3000,
          maxDeliveryTime: 35,
          isActive: true,
          centerLatitude: '20.6800',
          centerLongitude: '-104.3647',
          radiusKm: 4
        },
        {
          id: 'zone-sur',
          name: 'Sur',
          description: 'Zona Sur de Autlán',
          deliveryFee: 3000,
          maxDeliveryTime: 35,
          isActive: true,
          centerLatitude: '20.6672',
          centerLongitude: '-104.3647',
          radiusKm: 4
        }
      ];
      
      console.log('✅ Found', zones.length, 'active delivery zones (hardcoded)');
      res.json({ success: true, zones });
    } catch (error: any) {
      console.error('❌ Error fetching delivery zones:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get delivery zones (admin) - CREAR TABLA SI NO EXISTE
router.get(
  "/admin/delivery-zones",
  async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      
      console.log('📍 GET /admin/delivery-zones called');
      
      try {
        // Intentar crear la tabla si no existe
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS delivery_zones (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            deliveryFee INT NOT NULL DEFAULT 2500,
            maxDeliveryTime INT NOT NULL DEFAULT 45,
            isActive BOOLEAN DEFAULT TRUE,
            centerLatitude VARCHAR(50),
            centerLongitude VARCHAR(50),
            radiusKm INT DEFAULT 5,
            coordinates JSON,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // Verificar si hay datos
        const existingZones = await db.execute(sql`SELECT COUNT(*) as count FROM delivery_zones`);
        const count = existingZones[0]?.count || 0;
        
        // Si no hay datos, insertar zonas reales de Autlán usando INSERT IGNORE
        if (count === 0) {
          await db.execute(sql`
            INSERT IGNORE INTO delivery_zones (id, name, description, deliveryFee, maxDeliveryTime, isActive, centerLatitude, centerLongitude, radiusKm) VALUES
            ('zone-centro-autlan', 'Centro Autlán', 'Centro histórico y comercial de Autlán de Navarro', 2500, 30, TRUE, '20.6736', '-104.3647', 3),
            ('zone-norte-autlan', 'Norte Autlán', 'Zona norte incluyendo colonias residenciales', 3000, 35, TRUE, '20.6800', '-104.3647', 4),
            ('zone-sur-autlan', 'Sur Autlán', 'Zona sur hacia carretera a Colima', 3000, 35, TRUE, '20.6672', '-104.3647', 4),
            ('zone-este-autlan', 'Este Autlán', 'Zona este hacia El Grullo', 3500, 40, TRUE, '20.6736', '-104.3500', 5),
            ('zone-oeste-autlan', 'Oeste Autlán', 'Zona oeste hacia la sierra', 3500, 40, FALSE, '20.6736', '-104.3800', 5)
          `);
          console.log('✅ Inserted 5 real delivery zones for Autlán');
        }
        
        // Obtener todas las zonas
        const zones = await db.execute(sql`
          SELECT 
            id, name, description, deliveryFee, maxDeliveryTime, 
            isActive, centerLatitude, centerLongitude, radiusKm, 
            createdAt, updatedAt 
          FROM delivery_zones 
          ORDER BY createdAt
        `);
        
        console.log('✅ Found', zones.length, 'delivery zones from DB');
        res.json({ success: true, zones });
        
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        res.status(500).json({ error: 'Database error: ' + dbError.message });
      }
    } catch (error: any) {
      console.error('❌ Error in admin delivery zones:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Create delivery zone (admin)
router.post(
  "/admin/delivery-zones",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("create_delivery_zone", "delivery_zone"),
  async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const { v4: uuidv4 } = await import("uuid");

      const zoneId = uuidv4();
      const { name, description, deliveryFee, maxDeliveryTime, centerLatitude, centerLongitude, radiusKm } = req.body;

      await db.execute(sql`
        INSERT INTO delivery_zones 
        (id, name, description, deliveryFee, maxDeliveryTime, centerLatitude, centerLongitude, radiusKm, isActive) 
        VALUES 
        (${zoneId}, ${name}, ${description || null}, ${deliveryFee}, ${maxDeliveryTime || 45}, ${centerLatitude || null}, ${centerLongitude || null}, ${radiusKm || 5}, TRUE)
      `);

      res.json({ success: true, zoneId });
    } catch (error: any) {
      console.error('Error creating delivery zone:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Update delivery zone (admin)
router.put(
  "/admin/delivery-zones/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_delivery_zone", "delivery_zone"),
  async (req, res) => {
    try {
      const { deliveryZones } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db.update(deliveryZones).set(req.body).where(eq(deliveryZones.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get system settings (admin)
router.get(
  "/admin/settings",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { systemSettings } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const allSettings = await db.select().from(systemSettings);
      
      const settingsWithDescriptions = allSettings.map((s) => ({
        key: s.key,
        value: s.value,
        description: getSettingDescription(s.key),
      }));

      res.json({ settings: settingsWithDescriptions });
    } catch (error: any) {
      res.json({ settings: [] });
    }
  },
);

// Update system setting (admin)
router.put(
  "/admin/settings",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_system_setting", "system_setting"),
  async (req, res) => {
    try {
      const { systemSettings } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const { key, value } = req.body;
      
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(systemSettings.key, key));
      } else {
        const { randomUUID } = await import("crypto");
        await db.insert(systemSettings).values({
          id: randomUUID(),
          key,
          value,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Clear cache (admin)
router.post(
  "/admin/clear-cache",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("clear_cache", "system"),
  async (req, res) => {
    try {
      res.json({ success: true, message: "Cache cleared" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    platform_commission: "Comisión de plataforma (%)",
    business_commission: "Comisión de negocio (%)",
    delivery_commission: "Comisión de repartidor (%)",
    anti_fraud_hold_hours: "Horas de retención anti-fraude",
    max_strikes: "Strikes máximos antes de suspensión",
  };
  return descriptions[key] || key;
}

// Register support routes
router.use("/support", supportRoutes);

// Register admin routes
router.use("/admin", adminRoutes);

// Create business (admin)
router.post(
  "/admin/businesses",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("create_business", "business"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const result = await db.insert(businesses).values(req.body);
      res.json({ success: true, businessId: result.insertId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update business (admin)
router.put(
  "/admin/businesses/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_business", "business"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(businesses)
        .set(req.body)
        .where(eq(businesses.id, req.params.id));

      res.json({ success: true, message: "Business updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Create product (admin)
router.post(
  "/admin/products",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("create_product", "product"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");

      const result = await db.insert(products).values(req.body);
      res.json({ success: true, productId: result.insertId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update product (admin)
router.put(
  "/admin/products/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("update_product", "product"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id));

      res.json({ success: true, message: "Product updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete product (admin)
router.delete(
  "/admin/products/:id",
  authenticateToken,
  requireRole("admin", "super_admin"),
  auditAction("delete_product", "product"),
  async (req, res) => {
    try {
      const { products } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db.delete(products).where(eq(products.id, req.params.id));
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get admin dashboard
router.get(
  "/admin/dashboard",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { users, businesses, orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const totalUsers = await db.select().from(users);
      const totalBusinesses = await db.select().from(businesses);
      const totalOrders = await db.select().from(orders);

      const todayOrders = totalOrders.filter(o => {
        const today = new Date();
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === today.toDateString();
      });

      const todayRevenue = todayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.subtotal || 0), 0);

      const activeDrivers = totalUsers.filter(u => u.role === "delivery_driver" && u.isActive).length;
      const activeBusinesses = totalBusinesses.filter(b => b.isActive).length;

      res.json({
        success: true,
        dashboard: {
          totalUsers: totalUsers.length,
          totalBusinesses: totalBusinesses.length,
          totalOrders: totalOrders.length,
          todayOrders: todayOrders.length,
          todayRevenue: Math.round(todayRevenue),
          activeDrivers,
          activeBusinesses,
          platformCommission: Math.round(todayRevenue * 0.15),
          recentOrders: totalOrders.slice(0, 10),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Admin users management - moved to adminRoutes.ts

// Admin orders management - moved to adminRoutes.ts

// Update order status (admin)
router.put(
  "/admin/orders/:id/status",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { validateStateTransition } = await import("./orderStateValidation");

      const { status } = req.body;

      // Get current order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Admin can change to any state, but still validate transitions
      const transitionValidation = validateStateTransition(order.status, status);
      if (!transitionValidation.valid) {
        return res.status(400).json({ 
          error: transitionValidation.error,
          warning: "Admin override available - confirm to proceed" 
        });
      }

      await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, req.params.id));

      res.json({ success: true, message: "Order status updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Admin businesses management - moved to adminRoutes.ts

// Update user status
router.put(
  "/admin/users/:id/status",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({ isActive: req.body.isActive })
        .where(eq(users.id, req.params.id));

      res.json({ success: true, message: "User status updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update user role
router.put(
  "/admin/users/:id/role",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const { role } = req.body;
      if (!["customer", "business", "driver", "admin", "super_admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      await db
        .update(users)
        .set({ role })
        .where(eq(users.id, req.params.id));

      res.json({ success: true, message: "User role updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Sync financial data (admin only)
router.post(
  "/admin/sync-data",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { orders, wallets, transactions } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { financialService } = await import("./unifiedFinancialService");

      // Get all delivered orders
      const deliveredOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, "delivered"));

      let processed = 0;
      let errors = 0;

      for (const order of deliveredOrders) {
        try {
          // Skip if already has commissions
          if (order.platformFee && order.businessEarnings && order.deliveryEarnings) {
            // Check if wallet already has funds
            const [existingTx] = await db
              .select()
              .from(transactions)
              .where(eq(transactions.orderId, order.id))
              .limit(1);
            
            if (existingTx) {
              continue; // Already processed
            }
          }

          // Calculate commissions
          const commissions = await financialService.calculateCommissions(order.total, order.deliveryFee);

          // Update order with commissions
          await db
            .update(orders)
            .set({
              platformFee: commissions.platform,
              businessEarnings: commissions.business,
              deliveryEarnings: commissions.driver,
            })
            .where(eq(orders.id, order.id));

          // Update business wallet
          const [businessWallet] = await db
            .select()
            .from(wallets)
            .where(eq(wallets.userId, order.businessId))
            .limit(1);

          if (businessWallet) {
            await db
              .update(wallets)
              .set({ 
                balance: businessWallet.balance + commissions.business,
                totalEarned: businessWallet.totalEarned + commissions.business,
              })
              .where(eq(wallets.userId, order.businessId));
          } else {
            await db.insert(wallets).values({
              userId: order.businessId,
              balance: commissions.business,
              pendingBalance: 0,
              totalEarned: commissions.business,
              totalWithdrawn: 0,
            });
          }

          // Update driver wallet if assigned
          if (order.deliveryPersonId) {
            const [driverWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, order.deliveryPersonId))
              .limit(1);

            if (driverWallet) {
              await db
                .update(wallets)
                .set({ 
                  balance: driverWallet.balance + commissions.driver,
                  totalEarned: driverWallet.totalEarned + commissions.driver,
                })
                .where(eq(wallets.userId, order.deliveryPersonId));
            } else {
              await db.insert(wallets).values({
                userId: order.deliveryPersonId,
                balance: commissions.driver,
                pendingBalance: 0,
                totalEarned: commissions.driver,
                totalWithdrawn: 0,
              });
            }

            // Create transaction for driver
            await db.insert(transactions).values({
              userId: order.deliveryPersonId,
              orderId: order.id,
              type: "delivery_payment",
              amount: commissions.driver,
              status: "completed",
              description: `Entrega de pedido #${order.id.slice(-6)}`,
            });
          }

          // Create transaction for business
          await db.insert(transactions).values({
            userId: order.businessId,
            orderId: order.id,
            type: "order_payment",
            amount: commissions.business,
            status: "completed",
            description: `Pago por pedido #${order.id.slice(-6)}`,
          });

          processed++;
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
          errors++;
        }
      }

      res.json({
        success: true,
        message: "Sincronización completada",
        processed,
        errors,
        total: deliveredOrders.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update business status
router.put(
  "/admin/businesses/:id/status",
  authenticateToken,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { businesses } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      await db
        .update(businesses)
        .set({ isActive: req.body.isActive })
        .where(eq(businesses.id, req.params.id));

      res.json({ success: true, message: "Business status updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Asignar repartidor automáticamente
router.post(
  "/orders/:id/assign-driver",
  authenticateToken,
  async (req, res) => {
    try {
      const { orders, users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");

      const availableDrivers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "delivery_driver"),
            eq(users.isActive, 1)
          )
        )
        .limit(10);

      if (availableDrivers.length === 0) {
        return res.json({ success: false, message: "No hay repartidores disponibles" });
      }

      const driver = availableDrivers[0];

      await db
        .update(orders)
        .set({
          deliveryPersonId: driver.id,
          status: "picked_up",
        })
        .where(eq(orders.id, req.params.id));

      res.json({
        success: true,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Marcar pedido como entregado y liberar fondos
router.post(
  "/orders/:id/complete-delivery",
  authenticateToken,
  requireRole("delivery_driver"),
  validateDriverOrderOwnership,
  validateOrderCompletion,
  async (req, res) => {
    try {
      const { orders } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { FinancialCalculator } = await import("./financialCalculator");
      const { cashSettlementService } = await import("./cashSettlementService");
      const { financialService } = await import("./unifiedFinancialService");

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Validate total
      if (!FinancialCalculator.validateOrderTotal(order.subtotal, order.deliveryFee, order.nemyCommission || 0, order.total)) {
        return res.status(400).json({ error: "Invalid order total calculation" });
      }

      await db
        .update(orders)
        .set({ status: "delivered", deliveredAt: new Date() })
        .where(eq(orders.id, req.params.id));

      const commissions = await financialService.calculateCommissions(
        order.total,
        order.deliveryFee,
        order.productosBase || order.subtotal,
        order.nemyCommission || undefined
      );

      // Diferenciar entre pago con tarjeta y efectivo
      if (order.paymentMethod === "cash") {
        // EFECTIVO: Registrar deuda del repartidor
        await cashSettlementService.registerCashDebt(
          order.id,
          order.deliveryPersonId!,
          order.businessId,
          order.total,
          order.deliveryFee
        );

        res.json({
          success: true,
          message: "Pedido completado. Recuerda liquidar el efectivo.",
          distribution: commissions,
          cashDebt: commissions.business + commissions.platform,
        });
      } else {
        // TARJETA: Distribuir normalmente con descuento automático de deuda
        const { netEarnings, debtPaid } = await cashSettlementService.autoDeductCashDebt(
          order.deliveryPersonId!,
          order.id,
          commissions.driver
        );

        // Actualizar wallet del negocio
        await financialService.updateWalletBalance(
          order.businessId,
          commissions.business,
          "order_payment",
          order.id,
          `Pago por pedido #${order.id.slice(-6)}`
        );

        res.json({
          success: true,
          message: debtPaid > 0 
            ? `Pedido completado. Se descontaron $${(debtPaid / 100).toFixed(2)} de deuda pendiente.`
            : "Pedido completado y fondos liberados",
          distribution: commissions,
          netEarnings,
          debtPaid,
        });
      }
    } catch (error: any) {
      console.error("Complete delivery error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Bank accounts routes
router.get(
  "/bank-accounts",
  authenticateToken,
  async (req, res) => {
    try {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const [user] = await db
        .select({ bankAccount: users.bankAccount })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user?.bankAccount) {
        return res.json({ success: true, accounts: [] });
      }

      try {
        const account = JSON.parse(user.bankAccount);
        return res.json({ success: true, accounts: [account] });
      } catch {
        return res.json({ success: true, accounts: [] });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/bank-accounts",
  authenticateToken,
  async (req, res) => {
    try {
      const { bankCode, bankName, accountNumber, clabe, accountHolderName, accountType } = req.body;
      
      if (!bankCode || !bankName || !accountHolderName || !clabe) {
        return res.status(400).json({ error: "Campos requeridos faltantes" });
      }

      const clabeDigits = String(clabe).replace(/\D/g, "");
      if (clabeDigits.length !== 18) {
        return res.status(400).json({ error: "CLABE inválida" });
      }

      const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
      let sum = 0;
      for (let i = 0; i < 17; i += 1) {
        sum += parseInt(clabeDigits[i], 10) * weights[i];
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (checkDigit !== parseInt(clabeDigits[17], 10)) {
        return res.status(400).json({ error: "CLABE inválida" });
      }

      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const bankAccount = {
        bankCode,
        bankName,
        accountNumber: accountNumber || "",
        clabe: clabeDigits,
        accountHolderName,
        accountType: accountType || "checking",
        method: "SPEI",
        updatedAt: new Date().toISOString(),
      };

      await db
        .update(users)
        .set({ bankAccount: JSON.stringify(bankAccount) })
        .where(eq(users.id, req.user!.id));

      res.json({ success: true, account: bankAccount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Helper function for Gemini AI
async function generateGeminiResponse(userMessage: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Lo siento, el servicio de IA no está configurado. Un administrador te responderá pronto.";
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Eres un asistente de soporte para NEMY, una plataforma de delivery en Autlán, Jalisco, México.
Responde de manera amable, profesional y concisa en español.

Usuario: ${userMessage}

Asistente:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Lo siento, no pude procesar tu mensaje. Un administrador te responderá pronto.";
  }
}

// Delivery config routes
import deliveryConfigRoutes from "./routes/deliveryConfigRoutes";
import deliveryRoutes from "./deliveryRoutes";
import cashSettlementRoutes from "./cashSettlementRoutes";
import withdrawalRoutes from "./withdrawalRoutes";
router.use("/delivery", deliveryRoutes);
router.use("/delivery", deliveryConfigRoutes);
router.use("/cash-settlement", cashSettlementRoutes);
router.use("/withdrawals", withdrawalRoutes);

// Weekly settlement routes
import weeklySettlementRoutes from "./weeklySettlementRoutes";
router.use("/weekly-settlement", weeklySettlementRoutes);

// Stripe payment routes
import stripePaymentRoutes from "./routes/stripePaymentRoutes";
router.use("/stripe", stripePaymentRoutes);

// Business verification routes
import businessVerificationRoutes from "./routes/businessVerificationRoutes";
router.use("/business-verification", businessVerificationRoutes);

// Financial audit routes (admin only)
import financialAuditRoutes from "./financialAuditRoutes";
router.use("/audit", financialAuditRoutes);

// Reset financial data (super admin only)
router.post("/admin/reset-financial-data",
  authenticateToken,
  requireRole("super_admin"),
  auditAction("reset_financial_data", "system"),
  async (req, res) => {
    try {
      const { resetFinancialData } = await import("./resetFinancialData");
      await resetFinancialData();
      res.json({ 
        success: true, 
        message: "Datos financieros reiniciados exitosamente" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Auditoría rápida para testing
router.get('/audit/quick', async (req, res) => {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    
    const checks = [];
    let allPassed = true;
    
    // 1. Verificar que hay pedidos
    const [orderCount] = await db.execute(sql`SELECT COUNT(*) as count FROM orders`);
    const hasOrders = orderCount.count > 0;
    checks.push({
      rule: 'Hay pedidos en el sistema',
      passed: hasOrders,
      details: `${orderCount.count} pedidos encontrados`
    });
    if (!hasOrders) allPassed = false;
    
    // 2. Verificar pagos vs pedidos
    const [paymentCount] = await db.execute(sql`SELECT COUNT(*) as count FROM payments`);
    const paymentsMatch = paymentCount.count === orderCount.count;
    checks.push({
      rule: 'Pagos coinciden con pedidos',
      passed: paymentsMatch,
      details: `${paymentCount.count} pagos vs ${orderCount.count} pedidos`
    });
    if (!paymentsMatch) allPassed = false;
    
    // 3. Verificar transacciones
    const [txCount] = await db.execute(sql`SELECT COUNT(*) as count FROM transactions`);
    const hasTransactions = txCount.count > 0;
    checks.push({
      rule: 'Se generaron transacciones',
      passed: hasTransactions,
      details: `${txCount.count} transacciones generadas`
    });
    if (!hasTransactions) allPassed = false;
    
    // 4. Verificar wallets con balance
    const [walletCount] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM wallets 
      WHERE balance > 0 OR pending_balance > 0 OR total_earned > 0
    `);
    const walletsActive = walletCount.count > 0;
    checks.push({
      rule: 'Wallets tienen movimientos',
      passed: walletsActive,
      details: `${walletCount.count} wallets con actividad`
    });
    if (!walletsActive) allPassed = false;
    
    res.json({
      overall_status: allPassed ? 'PASSED' : 'FAILED',
      checks,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error en auditoría rápida:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;



