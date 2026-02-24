import { Router } from "express";
import { authenticateToken } from "../authMiddleware";
import pool from "../database";

const router = Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    const [todaySales]: any = await pool.query(
      `SELECT COUNT(*) as count, SUM(up.price) as total
       FROM user_promotions up
       WHERE up.business_id = ? AND up.status = 'redeemed' 
       AND DATE(up.redeemed_at) = CURDATE()`,
      [businessId]
    );

    const [totalRedemptions]: any = await pool.query(
      `SELECT COUNT(*) as count FROM user_promotions 
       WHERE business_id = ? AND status = 'redeemed'`,
      [businessId]
    );

    const [topPromotion]: any = await pool.query(
      `SELECT p.name, COUNT(*) as redemptions
       FROM user_promotions up
       JOIN promotions p ON up.promotion_id = p.id
       WHERE up.business_id = ? AND up.status = 'redeemed'
       GROUP BY p.id
       ORDER BY redemptions DESC
       LIMIT 1`,
      [businessId]
    );

    res.json({
      todaySales: todaySales[0]?.total || 0,
      todayRedemptions: todaySales[0]?.count || 0,
      totalRedemptions: totalRedemptions[0]?.count || 0,
      topPromotion: topPromotion[0] || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
