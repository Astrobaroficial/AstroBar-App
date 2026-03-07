import { db } from "../db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import cron from "node-cron";

// Crear promoción programada
export const createScheduledPromotion = async (data: {
  businessId: string;
  templateId?: string;
  title: string;
  description: string;
  type: 'flash' | 'common';
  originalPrice: number;
  promoPrice: number;
  stock: number;
  image?: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  daysOfWeek?: string[];
  targetZoneIds?: string[];
  targetUserLevels?: string[];
  minUserPoints?: number;
}) => {
  const id = uuidv4();
  const discountPercentage = Math.round(((data.originalPrice - data.promoPrice) / data.originalPrice) * 100);

  await db.execute(sql`
    INSERT INTO scheduled_promotions (
      id, business_id, template_id, title, description, type,
      original_price, promo_price, stock, image,
      schedule_type, start_date, end_date, start_time, end_time,
      days_of_week, target_zone_ids, target_user_levels, min_user_points
    ) VALUES (
      ${id}, ${data.businessId}, ${data.templateId || null}, ${data.title}, ${data.description}, ${data.type},
      ${data.originalPrice}, ${data.promoPrice}, ${data.stock}, ${data.image || null},
      ${data.scheduleType}, ${data.startDate}, ${data.endDate || null}, ${data.startTime}, ${data.endTime},
      ${JSON.stringify(data.daysOfWeek || [])}, ${JSON.stringify(data.targetZoneIds || [])},
      ${JSON.stringify(data.targetUserLevels || [])}, ${data.minUserPoints || 0}
    )
  `);

  // Calcular próxima activación
  await calculateNextActivation(id);

  return id;
};

// Calcular próxima activación
const calculateNextActivation = async (scheduledPromotionId: string) => {
  const [promo] = await db.execute(sql`
    SELECT schedule_type, start_date, start_time, days_of_week
    FROM scheduled_promotions
    WHERE id = ${scheduledPromotionId}
  `);

  if (!promo || !Array.isArray(promo) || promo.length === 0) return;

  const promoData = promo[0] as any;
  const now = new Date();
  const [hours, minutes] = promoData.start_time.split(':');
  
  let nextActivation = new Date(promoData.start_date);
  nextActivation.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  if (nextActivation < now) {
    if (promoData.schedule_type === 'daily') {
      nextActivation.setDate(nextActivation.getDate() + 1);
    } else if (promoData.schedule_type === 'weekly') {
      nextActivation.setDate(nextActivation.getDate() + 7);
    }
  }

  await db.execute(sql`
    UPDATE scheduled_promotions
    SET next_activation = ${nextActivation.toISOString()}
    WHERE id = ${scheduledPromotionId}
  `);
};

// Activar promoción programada
export const activateScheduledPromotion = async (scheduledPromotionId: string) => {
  const [scheduled] = await db.execute(sql`
    SELECT * FROM scheduled_promotions WHERE id = ${scheduledPromotionId}
  `);

  if (!scheduled || !Array.isArray(scheduled) || scheduled.length === 0) return;

  const data = scheduled[0] as any;

  // Crear promoción real
  const promotionId = uuidv4();
  const now = new Date();
  const [endHours, endMinutes] = data.end_time.split(':');
  const endTime = new Date(now);
  endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

  await db.execute(sql`
    INSERT INTO promotions (
      id, business_id, title, description, type,
      original_price, promo_price, discount_percentage,
      stock, stock_consumed, start_time, end_time, image, is_active
    ) VALUES (
      ${promotionId}, ${data.business_id}, ${data.title}, ${data.description}, ${data.type},
      ${data.original_price}, ${data.promo_price}, ${Math.round(((data.original_price - data.promo_price) / data.original_price) * 100)},
      ${data.stock}, 0, ${now.toISOString()}, ${endTime.toISOString()}, ${data.image}, 1
    )
  `);

  // Registrar activación
  await db.execute(sql`
    INSERT INTO promotion_activation_history (id, scheduled_promotion_id, promotion_id, total_stock)
    VALUES (${uuidv4()}, ${scheduledPromotionId}, ${promotionId}, ${data.stock})
  `);

  // Actualizar scheduled promotion
  await db.execute(sql`
    UPDATE scheduled_promotions
    SET 
      status = 'active',
      created_promotion_id = ${promotionId},
      last_activation = NOW(),
      activation_count = activation_count + 1
    WHERE id = ${scheduledPromotionId}
  `);

  // Calcular próxima activación
  await calculateNextActivation(scheduledPromotionId);

  return promotionId;
};

// Cron job para activar promociones automáticamente
export const startPromotionScheduler = () => {
  // Ejecutar cada minuto
  cron.schedule('* * * * *', async () => {
    const [pending] = await db.execute(sql`
      SELECT id FROM scheduled_promotions
      WHERE status = 'scheduled'
      AND auto_activate = 1
      AND next_activation <= NOW()
      AND (end_date IS NULL OR end_date >= CURDATE())
    `);

    if (!pending || !Array.isArray(pending)) return;

    for (const promo of pending) {
      await activateScheduledPromotion((promo as any).id);
    }
  });

  console.log('📅 Promotion scheduler started');
};
