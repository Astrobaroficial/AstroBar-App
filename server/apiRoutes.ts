import { Router } from "express";
import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import userRoutes from "./routes/userRoutes";
import promotionRoutes from "./routes/promotionRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import cartRoutes from "./routes/cartRoutes";
import statsRoutes from "./routes/statsRoutes";
import adminPanelRoutes from "./routes/adminPanelRoutes";
import adminRoutes from "./routes/adminRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import auditRoutes from "./routes/auditRoutes";
import stripePaymentRoutes from "./routes/stripePaymentRoutes";

const router = Router();

// Test route
router.get("/test", (req, res) => {
  res.json({ success: true, message: "API routes working" });
});

router.use("/auth", authRoutes);
router.use("/business", businessRoutes);
router.use("/businesses", businessRoutes); // Alias plural
router.use("/user", userRoutes);
router.use("/promotions", promotionRoutes);
router.use("/payments", paymentRoutes);
router.use("/cart", cartRoutes);
router.use("/stats", statsRoutes);
router.use("/admin/panel", adminPanelRoutes);
router.use("/admin", adminRoutes);
router.use("/", notificationRoutes);
router.use("/admin", auditRoutes);
router.use("/stripe", stripePaymentRoutes);

export default router;
