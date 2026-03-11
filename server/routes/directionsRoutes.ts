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
      console.error("Google Maps API key not configured");
      return res.status(500).json({ error: "Google Maps API key not configured" });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    console.log("Requesting directions from Google Maps API...");
    console.log("Origin:", origin);
    console.log("Destination:", destination);

    const response = await fetch(url);
    const data = await response.json();

    console.log("Google Maps API response status:", data.status);
    
    if (data.error_message) {
      console.error("Google Maps API error message:", data.error_message);
    }

    if (data.status === "REQUEST_DENIED") {
      console.error("Google Maps API REQUEST_DENIED:", data.error_message);
      return res.status(500).json({ 
        error: "Google Maps API error",
        details: data.error_message,
        hint: "Verifica que la API de Directions esté habilitada en Google Cloud Console"
      });
    }

    if (data.status === "ZERO_RESULTS") {
      return res.status(404).json({ error: "No route found" });
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      console.error("Google Maps API OVER_QUERY_LIMIT");
      return res.status(429).json({ error: "API quota exceeded" });
    }

    if (data.status === "INVALID_REQUEST") {
      console.error("Google Maps API INVALID_REQUEST:", data.error_message);
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      console.log("Route found successfully");
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

    console.error("No routes found in response");
    res.status(404).json({ error: "No route found" });
  } catch (error: any) {
    console.error("Error getting directions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
