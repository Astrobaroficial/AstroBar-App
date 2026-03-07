import { db } from "../db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Registrar evento de demanda
export const trackDemandEvent = async (
  userId: string | null,
  businessId: string | null,
  eventType: 'search' | 'view' | 'click' | 'purchase',
  latitude: number,
  longitude: number,
  amount: number = 0
) => {
  const now = new Date();
  const hour = now.getHours();
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = daysOfWeek[now.getDay()];

  await db.execute(sql`
    INSERT INTO demand_events (id, user_id, business_id, event_type, latitude, longitude, hour, day_of_week, amount)
    VALUES (${uuidv4()}, ${userId}, ${businessId}, ${eventType}, ${latitude}, ${longitude}, ${hour}, ${dayOfWeek}, ${amount})
  `);

  // Actualizar zona de demanda
  await updateDemandZone(latitude, longitude, eventType, amount);
};

// Actualizar zona de demanda
const updateDemandZone = async (
  latitude: number,
  longitude: number,
  eventType: string,
  amount: number
) => {
  // Buscar zona existente cercana (radio de 1km)
  const [zone] = await db.execute(sql`
    SELECT id, total_searches, total_views, total_purchases, avg_purchase_amount, heat_score
    FROM demand_zones
    WHERE (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) <= radius_km
    LIMIT 1
  `);

  if (zone && Array.isArray(zone) && zone.length > 0) {
    const zoneData = zone[0] as any;
    const updates: any = {};

    if (eventType === 'search') updates.total_searches = zoneData.total_searches + 1;
    if (eventType === 'view') updates.total_views = zoneData.total_views + 1;
    if (eventType === 'purchase') {
      updates.total_purchases = zoneData.total_purchases + 1;
      updates.avg_purchase_amount = Math.floor(
        ((zoneData.avg_purchase_amount * zoneData.total_purchases) + amount) / (zoneData.total_purchases + 1)
      );
    }

    // Calcular heat score (0-100)
    const heatScore = Math.min(100, Math.floor(
      (updates.total_searches || zoneData.total_searches) * 0.1 +
      (updates.total_views || zoneData.total_views) * 0.3 +
      (updates.total_purchases || zoneData.total_purchases) * 2
    ));

    await db.execute(sql`
      UPDATE demand_zones
      SET 
        total_searches = ${updates.total_searches || zoneData.total_searches},
        total_views = ${updates.total_views || zoneData.total_views},
        total_purchases = ${updates.total_purchases || zoneData.total_purchases},
        avg_purchase_amount = ${updates.avg_purchase_amount || zoneData.avg_purchase_amount},
        heat_score = ${heatScore},
        last_updated = NOW()
      WHERE id = ${zoneData.id}
    `);
  } else {
    // Crear nueva zona
    await db.execute(sql`
      INSERT INTO demand_zones (id, zone_name, latitude, longitude, heat_score)
      VALUES (${uuidv4()}, 'Zona Auto', ${latitude}, ${longitude}, 10)
    `);
  }
};

// Obtener mapa de calor
export const getHeatmapData = async () => {
  const [zones] = await db.execute(sql`
    SELECT latitude, longitude, heat_score, total_purchases, avg_purchase_amount
    FROM demand_zones
    WHERE heat_score > 0
    ORDER BY heat_score DESC
  `);

  return zones;
};

// Generar recomendaciones para un bar
export const generateBarRecommendations = async (businessId: string) => {
  // Obtener datos del bar
  const [business] = await db.execute(sql`
    SELECT latitude, longitude FROM businesses WHERE id = ${businessId}
  `);

  if (!business || !Array.isArray(business) || business.length === 0) return;

  const { latitude, longitude } = business[0] as any;

  // Analizar eventos cercanos
  const [events] = await db.execute(sql`
    SELECT hour, day_of_week, COUNT(*) as count, AVG(amount) as avg_amount
    FROM demand_events
    WHERE (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) <= 2
    AND event_type = 'purchase'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY hour, day_of_week
    ORDER BY count DESC
    LIMIT 5
  `);

  if (!events || !Array.isArray(events) || events.length === 0) return;

  // Crear recomendación de mejor horario
  const bestTime = events[0] as any;
  await db.execute(sql`
    INSERT INTO bar_recommendations (id, business_id, recommendation_type, title, description, priority)
    VALUES (
      ${uuidv4()},
      ${businessId},
      'best_time',
      'Mejor horario para promociones',
      ${`Los ${bestTime.day_of_week}s a las ${bestTime.hour}:00 hs tienen mayor demanda en tu zona`},
      'high'
    )
  `);
};
