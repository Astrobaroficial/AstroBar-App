import express from "express";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "AstroBar_local_secret_key";

// Phone login
router.post("/phone-login", async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code are required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, or, like } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    const phoneDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = phoneDigits.startsWith('54') ? `+${phoneDigits}` : 
                           phoneDigits.length === 10 ? `+54${phoneDigits}` :
                           phone.startsWith('+') ? phone : `+54${phoneDigits}`;

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
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (!user[0].verificationCode || user[0].verificationCode !== code) {
      const testPhones = ["+54 341 234 5678", "+54 341 456 7892", "+543414567892"];
      const isTestPhone = testPhones.some(testPhone => {
        const testDigits = testPhone.replace(/[^\d]/g, '');
        return phoneDigits.slice(-10) === testDigits.slice(-10);
      });
      
      if (process.env.NODE_ENV === "development" && code === "1234" && isTestPhone) {
        console.log("? Using 1234 fallback for test phone");
      } else {
        return res.status(400).json({ error: "C�digo inv�lido" });
      }
    }

    if (user[0].verificationExpires && new Date() > new Date(user[0].verificationExpires)) {
      return res.status(400).json({ error: "C�digo expirado" });
    }

    await db
      .update(users)
      .set({ 
        verificationCode: null, 
        verificationExpires: null,
        phoneVerified: true 
      })
      .where(eq(users.id, user[0].id));

    const token = jwt.default.sign(
      { id: user[0].id, phone: user[0].phone, role: user[0].role },
      JWT_SECRET,
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
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login alias for compatibility
router.post("/login", async (req, res) => {
  try {
    const { identifier, password, phone, code } = req.body;
    
    // If phone and code provided, use phone login logic
    if (phone && code) {
      const { users } = await import("@shared/schema-mysql");
      const { db } = await import("../db");
      const { eq, or, like } = await import("drizzle-orm");
      const jwt = await import("jsonwebtoken");

      const phoneDigits = phone.replace(/[^\d]/g, '');
      const normalizedPhone = phoneDigits.startsWith('54') ? `+${phoneDigits}` : 
                             phoneDigits.length === 10 ? `+54${phoneDigits}` :
                             phone.startsWith('+') ? phone : `+54${phoneDigits}`;

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
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      if (!user[0].verificationCode || user[0].verificationCode !== code) {
        const testPhones = ["+54 341 234 5678", "+54 341 456 7892", "+543414567892"];
        const isTestPhone = testPhones.some(testPhone => {
          const testDigits = testPhone.replace(/[^\d]/g, '');
          return phoneDigits.slice(-10) === testDigits.slice(-10);
        });
        
        if (process.env.NODE_ENV === "development" && code === "1234" && isTestPhone) {
          console.log("⚡ Using 1234 fallback for test phone");
        } else {
          return res.status(400).json({ error: "Código inválido" });
        }
      }

      if (user[0].verificationExpires && new Date() > new Date(user[0].verificationExpires)) {
        return res.status(400).json({ error: "Código expirado" });
      }

      await db
        .update(users)
        .set({ 
          verificationCode: null, 
          verificationExpires: null,
          phoneVerified: true 
        })
        .where(eq(users.id, user[0].id));

      const token = jwt.default.sign(
        { id: user[0].id, phone: user[0].phone, role: user[0].role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user[0].id,
          name: user[0].name,
          phone: user[0].phone,
          role: user[0].role,
          phoneVerified: user[0].phoneVerified,
        },
      });
    }
    
    // If identifier and password provided, handle as password login
    if (identifier && password) {
      return res.status(400).json({ error: "Password login not implemented. Use phone verification." });
    }
    
    return res.status(400).json({ error: "Phone and code required" });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Development email login (for testing)
router.post("/dev-email-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    // Find user by email
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // For development, accept any password or check if it matches a simple pattern
    // Allow in production for testing purposes
    if (password !== "password") {
      return res.status(401).json({ error: "Contrase�a incorrecta" });
    }

    const token = jwt.default.sign(
      { id: user[0].id, phone: user[0].phone, role: user[0].role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        phone: user[0].phone,
        role: user[0].role,
        phoneVerified: user[0].phoneVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send code
router.post("/send-code", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, or, like } = await import("drizzle-orm");

    const phoneDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = phoneDigits.startsWith('54') ? `+${phoneDigits}` : `+54${phoneDigits}`;

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
        message: "Usuario no encontrado"
      });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(users)
      .set({ 
        verificationCode: code,
        verificationExpires: expiresAt 
      })
      .where(eq(users.id, user[0].id));

    if (process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilio = await import("twilio");
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `Tu c�digo AstroBar: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: normalizedPhone
        });
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
      }
    } else {
      console.log(`[DEV] C�digo para ${normalizedPhone}: ${code}`);
    }

    res.json({ 
      success: true, 
      message: "C�digo enviado",
      ...(process.env.NODE_ENV === "development" && { devCode: code })
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Signup alias
router.post("/signup", async (req, res) => {
  // Redirect to phone-signup for compatibility
  req.url = '/phone-signup';
  return router.handle(req, res);
});

// Signup
router.post("/phone-signup", async (req, res) => {
  try {
    const { phone, name, role, email } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({ error: "Tel�fono y nombre requeridos" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, or, like } = await import("drizzle-orm");

    const normalizedPhone = phone.replace(/[\s-()]/g, '');
    const phoneDigits = normalizedPhone.replace(/[^\d]/g, '');

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
        error: "N�mero ya registrado",
        userExists: true
      });
    }

    // Check if email already exists (if provided)
    if (email && email.trim()) {
      const existingEmailUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim()))
        .limit(1);

      if (existingEmailUser.length > 0) {
        return res.status(400).json({ 
          error: "Email ya registrado",
          userExists: true
        });
      }
    }

    const validRoles = ['customer', 'business_owner'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    const requiresApproval = false;

    await db
      .insert(users)
      .values({
        phone: normalizedPhone,
        name: name,
        email: email && email.trim() ? email.trim() : null,
        role: userRole,
        phoneVerified: false,
        isActive: true,
      });



    res.json({ 
      success: true, 
      requiresVerification: true,
      requiresApproval,
      message: "Registro exitoso."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Biometric login endpoints (for development/testing)
router.post("/biometric-login", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone required" });
    }

    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, or, like } = await import("drizzle-orm");
    const jwt = await import("jsonwebtoken");

    const phoneDigits = phone.replace(/[^\d]/g, '');
    const normalizedPhone = phoneDigits.startsWith('54') ? `+${phoneDigits}` : `+54${phoneDigits}`;

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
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const token = jwt.default.sign(
      { id: user[0].id, phone: user[0].phone, role: user[0].role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        phone: user[0].phone,
        role: user[0].role,
        phoneVerified: user[0].phoneVerified,
        biometricEnabled: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/enable-biometric", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // For now, just return success - biometric is handled client-side
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/disable-biometric", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // For now, just return success - biometric is handled client-side
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
