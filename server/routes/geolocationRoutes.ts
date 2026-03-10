import express from "express";
import { authenticateToken } from "../authMiddleware";
import { GeolocationService } from "../geolocationService";

const router = express.Router();

// Update user location (authenticated users only)
router.post("/update-location", authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user!.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    GeolocationService.updateUserLocation(userId, parseFloat(latitude), parseFloat(longitude));

    res.json({ 
      success: true, 
      message: "Location updated",
      activeUsers: GeolocationService.getActiveUsersCount()
    });
  } catch (error: any) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get businesses with real-time status (public)
router.get("/businesses-status", async (req, res) => {
  try {
    const businessesWithStatus = await GeolocationService.getBusinessesWithStatus();
    
    res.json({
      success: true,
      businesses: businessesWithStatus,
      totalActiveUsers: GeolocationService.getActiveUsersCount(),
      lastUpdate: new Date()
    });
  } catch (error: any) {
    console.error("Error getting businesses status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get demand heatmap (public)
router.get("/heatmap", async (req, res) => {
  try {
    const heatmapData = GeolocationService.getDemandHeatmap();
    
    res.json({
      success: true,
      ...heatmapData
    });
  } catch (error: any) {
    console.error("Error getting heatmap:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove user from tracking (when app closes)
router.post("/remove-location", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    GeolocationService.removeUser(userId);
    
    res.json({ 
      success: true, 
      message: "User removed from tracking" 
    });
  } catch (error: any) {
    console.error("Error removing user location:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get users near specific business (business owners only)
router.get("/nearby-users/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { businesses } = await import("@shared/schema-mysql");
    const { db } = await import("../db");
    const { eq, and } = await import("drizzle-orm");

    // Verify business ownership
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.ownerId, req.user!.id)
        )
      )
      .limit(1);

    if (!business) {
      return res.status(404).json({ error: "Business not found or access denied" });
    }

    if (!business.latitude || !business.longitude) {
      return res.status(400).json({ error: "Business location not configured" });
    }

    const nearbyUsers = GeolocationService.getUsersNearBusiness(
      business.latitude, 
      business.longitude
    );

    res.json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      nearbyUsers,
      radius: "2km"
    });
  } catch (error: any) {
    console.error("Error getting nearby users:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;