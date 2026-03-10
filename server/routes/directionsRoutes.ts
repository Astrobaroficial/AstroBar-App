import express from "express";

const router = express.Router();

// Get directions from Google Maps API
router.get("/", async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination are required" });
    }

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "Google Maps API key not configured" });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "REQUEST_DENIED") {
      console.error("Google Maps API error:", data.error_message);
      return res.status(500).json({ error: "Google Maps API error" });
    }

    if (data.status === "ZERO_RESULTS") {
      return res.status(404).json({ error: "No route found" });
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return res.json({
        success: true,
        route: {
          polyline: route.overview_polyline.points,
          distance: route.legs[0].distance.text,
          duration: route.legs[0].duration.text,
          distanceValue: route.legs[0].distance.value,
          durationValue: route.legs[0].duration.value,
        },
      });
    }

    res.status(404).json({ error: "No route found" });
  } catch (error: any) {
    console.error("Error getting directions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
