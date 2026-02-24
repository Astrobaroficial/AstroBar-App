import express from "express";
import { authenticateToken } from "../authMiddleware";

const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const { users } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        profileImage: users.profileImage,
        birthDate: users.birthDate,
        ageVerified: users.ageVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Error loading user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
