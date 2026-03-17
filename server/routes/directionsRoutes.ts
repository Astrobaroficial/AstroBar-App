import express from "express";

const router = express.Router();

// Get directions from Google Maps API
router.get("/", async (req, res) => {
  try {
    const { origin, destination } = req.query;

    console.log('🗺️ [DIRECTIONS] Request received');
    console.log('  Origin:', origin);
    console.log('  Destination:', destination);

    if (!origin || !destination) {
      console.error('❌ [DIRECTIONS] Missing parameters');
      return res.status(400).json({ 
        success: false,
        error: "Origen y destino son requeridos" 
      });
    }

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ [DIRECTIONS] Google Maps API key not configured');
      console.error('   Set GOOGLE_MAPS_API_KEY in .env file');
      return res.status(500).json({ 
        success: false,
        error: "API de Google Maps no configurada",
        hint: "Configura GOOGLE_MAPS_API_KEY en el archivo .env del servidor"
      });
    }

    console.log('🔑 [DIRECTIONS] API Key found:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    console.log('📡 [DIRECTIONS] Calling Google Maps API...');

    const response = await fetch(url);
    const data = await response.json();

    console.log('📥 [DIRECTIONS] Google Maps response status:', data.status);
    
    if (data.error_message) {
      console.error('❌ [DIRECTIONS] Google Maps error:', data.error_message);
    }

    if (data.status === "REQUEST_DENIED") {
      console.error('❌ [DIRECTIONS] REQUEST_DENIED');
      console.error('   Error:', data.error_message);
      console.error('   Solución: Habilita "Directions API" en Google Cloud Console');
      return res.status(500).json({ 
        success: false,
        error: "API de Google Maps denegada",
        details: data.error_message,
        hint: "Habilita la API de Directions en Google Cloud Console: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com"
      });
    }

    if (data.status === "ZERO_RESULTS") {
      console.warn('⚠️ [DIRECTIONS] No route found');
      return res.status(404).json({ 
        success: false,
        error: "No se encontró una ruta",
        hint: "Verifica que las coordenadas sean válidas"
      });
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      console.error('❌ [DIRECTIONS] OVER_QUERY_LIMIT');
      return res.status(429).json({ 
        success: false,
        error: "Límite de consultas excedido",
        hint: "Espera unos minutos e intenta nuevamente"
      });
    }

    if (data.status === "INVALID_REQUEST") {
      console.error('❌ [DIRECTIONS] INVALID_REQUEST:', data.error_message);
      return res.status(400).json({ 
        success: false,
        error: "Parámetros inválidos",
        details: data.error_message
      });
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      console.log('✅ [DIRECTIONS] Route found successfully');
      console.log('   Distance:', leg.distance.text);
      console.log('   Duration:', leg.duration.text);
      console.log('   Polyline points:', route.overview_polyline.points.length, 'chars');
      
      return res.json({
        success: true,
        route: {
          polyline: route.overview_polyline.points,
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration.value,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
        },
      });
    }

    console.error('❌ [DIRECTIONS] No routes found in response');
    console.error('   Full response:', JSON.stringify(data, null, 2));
    
    res.status(404).json({ 
      success: false,
      error: "No se encontró una ruta",
      details: data.status
    });
  } catch (error: any) {
    console.error('❌ [DIRECTIONS] Exception:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: "Error al obtener direcciones",
      details: error.message
    });
  }
});

export default router;
