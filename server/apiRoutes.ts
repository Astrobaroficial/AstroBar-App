import { Router } from "express";
import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import userRoutes from "./routes/userRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import cartRoutes from "./routes/cartRoutes";
import statsRoutes from "./routes/statsRoutes";
import adminPanelRoutes from "./routes/adminPanelRoutes";
import adminRoutes from "./routes/adminRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import auditRoutes from "./routes/auditRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/businesses", businessRoutes);
router.use("/user", userRoutes);
router.use("/payments", paymentRoutes);
router.use("/cart", cartRoutes);
router.use("/stats", statsRoutes);
router.use("/admin/panel", adminPanelRoutes);
router.use("/admin", adminRoutes);
router.use("/", notificationRoutes);
router.use("/admin", auditRoutes);

export default router;
