import { Router } from "express";
import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import cartRoutes from "./routes/cartRoutes";
import statsRoutes from "./routes/statsRoutes";
import adminPanelRoutes from "./routes/adminPanelRoutes";
import adminRoutes from "./routes/adminRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/businesses", businessRoutes);
router.use("/payments", paymentRoutes);
router.use("/cart", cartRoutes);
router.use("/stats", statsRoutes);
router.use("/admin/panel", adminPanelRoutes);
router.use("/admin", adminRoutes);

export default router;
