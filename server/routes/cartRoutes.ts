import { Router } from "express";
import { authenticateToken } from "../authMiddleware";
import pool from "../database";

const router = Router();

// Get user's cart
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const [items]: any = await pool.query(
      `SELECT pc.*, 
        p.name, p.discounted_price, p.original_price, p.stock,
        fp.name as flash_name, fp.discounted_price as flash_price, fp.stock as flash_stock,
        b.name as bar_name
       FROM promotion_cart pc
       LEFT JOIN promotions p ON pc.promotion_id = p.id AND pc.type = 'common'
       LEFT JOIN flash_promotions fp ON pc.promotion_id = fp.id AND pc.type = 'flash'
       LEFT JOIN businesses b ON (p.business_id = b.id OR fp.business_id = b.id)
       WHERE pc.user_id = ?`,
      [userId]
    );

    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add to cart
router.post("/add", authenticateToken, async (req, res) => {
  try {
    const { promotionId, type } = req.body;
    const userId = req.user?.id;

    // Check if already in cart
    const [existing]: any = await pool.query(
      "SELECT * FROM promotion_cart WHERE user_id = ? AND promotion_id = ? AND type = ?",
      [userId, promotionId, type]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Ya está en el carrito" });
    }

    await pool.query(
      "INSERT INTO promotion_cart (user_id, promotion_id, type) VALUES (?, ?, ?)",
      [userId, promotionId, type]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Remove from cart
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await pool.query(
      "DELETE FROM promotion_cart WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Clear cart
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    await pool.query("DELETE FROM promotion_cart WHERE user_id = ?", [userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
