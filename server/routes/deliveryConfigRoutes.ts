import express from "express";
import { authenticateToken, requireRole } from "../authMiddleware";
import { getDeliveryConfig, clearDeliveryConfigCache } from "../services/deliveryConfigService";
import { db } from "../db";
import { systemSettings } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";

const router = express.Router();

router.get("/config", async (req, res) => {
  try {
    const config = await getDeliveryConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/config", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { baseFee, perKm, minFee, maxFee, speedKmPerMin, defaultPrepTime } = req.body;

    const updates = [
      { key: 'delivery_base_fee', value: baseFee?.toString() },
      { key: 'delivery_per_km', value: perKm?.toString() },
      { key: 'delivery_min_fee', value: minFee?.toString() },
      { key: 'delivery_max_fee', value: maxFee?.toString() },
      { key: 'delivery_speed_km_per_min', value: speedKmPerMin?.toString() },
      { key: 'delivery_default_prep_time', value: defaultPrepTime?.toString() },
    ];

    for (const update of updates) {
      if (update.value) {
        await db
          .update(systemSettings)
          .set({ value: update.value, updatedBy: req.user!.id })
          .where(eq(systemSettings.key, update.key));
      }
    }

    clearDeliveryConfigCache();
    const newConfig = await getDeliveryConfig();

    res.json({ success: true, config: newConfig });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
