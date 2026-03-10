import express from "express";
import { authenticateToken } from "../authMiddleware";
import { ProximityNotificationService } from "../proximityNotificationService";

const router = express.Router();

// Get user notification preferences
router.get("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await ProximityNotificationService.getUserNotificationPreferences(userId);
    
    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    console.error("Error getting notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user notification preferences
router.put("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { flashPromosEnabled, soundEnabled, vibrationEnabled } = req.body;
    
    // Validate input
    if (typeof flashPromosEnabled !== 'boolean' || 
        typeof soundEnabled !== 'boolean' || 
        typeof vibrationEnabled !== 'boolean') {
      return res.status(400).json({ error: "Invalid preferences format" });
    }
    
    const preferences = {
      flashPromosEnabled,
      soundEnabled,
      vibrationEnabled
    };
    
    const result = await ProximityNotificationService.updateUserNotificationPreferences(userId, preferences);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Preferences updated successfully"
      });
    } else {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;