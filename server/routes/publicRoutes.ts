import express from "express";
import { db } from "../db";
import { businesses } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get all active businesses (public)
router.get("/businesses", async (req, res) => {
  try {
    const allBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true));

    res.json({ success: true, businesses: allBusinesses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
