import { Router } from "express";
import Stripe from "stripe";
import { authenticateToken } from "../authMiddleware";
import pool from "../db";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18.acacia" });

// Create payment intent for promotion
router.post("/create-intent", authenticateToken, async (req, res) => {
  try {
    const { userPromotionId } = req.body;
    const userId = req.user?.id;

    const [userPromo]: any = await pool.query(
      `SELECT up.*, p.discounted_price, p.name as promo_name, b.name as bar_name, b.stripe_account_id
       FROM user_promotions up
       JOIN promotions p ON up.promotion_id = p.id
       JOIN businesses b ON p.business_id = b.id
       WHERE up.id = ? AND up.user_id = ?`,
      [userPromotionId, userId]
    );

    if (!userPromo[0]) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    const promo = userPromo[0];
    const amount = Math.round(promo.discounted_price * 100); // Convert to cents
    const platformFee = Math.round(amount * 0.30); // 30% platform

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "ars",
      application_fee_amount: platformFee,
      transfer_data: {
        destination: promo.stripe_account_id,
      },
      metadata: {
        userPromotionId: userPromotionId.toString(),
        userId: userId.toString(),
        barName: promo.bar_name,
        promoName: promo.promo_name,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Payment intent error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Confirm payment
router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { userPromotionId, paymentIntentId } = req.body;

    await pool.query(
      "UPDATE user_promotions SET payment_status = ?, payment_intent_id = ? WHERE id = ?",
      ["paid", paymentIntentId, userPromotionId]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Webhook for Stripe events
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const userPromotionId = paymentIntent.metadata.userPromotionId;

      await pool.query(
        "UPDATE user_promotions SET payment_status = ? WHERE id = ?",
        ["paid", userPromotionId]
      );
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(400).json({ message: error.message });
  }
});

export default router;
