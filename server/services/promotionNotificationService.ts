import { db } from "../db";
import { businesses, users, promotions } from "@shared/schema-mysql";
import { eq, and, sql } from "drizzle-orm";

interface NotificationData {
  title: string;
  message: string;
  data?: any;
}

// Función para calcular distancia entre dos puntos (fórmula de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
}

export async function sendFlashPromotionNotifications(promotionId: string) {
  try {
    // Obtener la promoción y el bar
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) {
      console.error("Promotion not found:", promotionId);
      return;
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, promotion.businessId))
      .limit(1);

    if (!business) {
      console.error("Business not found:", promotion.businessId);
      return;
    }

    // Obtener usuarios con push tokens activos
    const activeUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`${users.pushToken} IS NOT NULL`,
          sql`${users.pushToken} != ''`
        )
      );

    if (activeUsers.length === 0) {
      console.log("No users with push tokens found");
      return;
    }

    // Filtrar usuarios cercanos (radio de 5km)
    const nearbyUsers = activeUsers.filter(user => {
      // Por ahora, enviar a todos los usuarios
      // En el futuro, se puede implementar geolocalización
      return true;
    });

    const discountPercentage = Math.round(((promotion.originalPrice - promotion.promoPrice) / promotion.originalPrice) * 100);

    const notificationData: NotificationData = {
      title: "🔥 ¡Promoción Flash Activa!",
      message: `${business.name}: ${promotion.title} - ${discountPercentage}% OFF`,
      data: {
        type: "flash_promotion",
        promotionId: promotion.id,
        businessId: business.id,
        businessName: business.name
      }
    };

    // Enviar notificaciones usando Expo Push Service
    const pushTokens = nearbyUsers.map(user => user.pushToken).filter(Boolean);
    
    if (pushTokens.length > 0) {
      await sendExpoPushNotifications(pushTokens, notificationData);
      console.log(`Flash promotion notifications sent to ${pushTokens.length} users`);
    }

  } catch (error) {
    console.error("Error sending flash promotion notifications:", error);
  }
}

async function sendExpoPushNotifications(pushTokens: string[], notification: NotificationData) {
  try {
    const messages = pushTokens.map(pushToken => ({
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: notification.data,
      priority: 'high',
      channelId: 'flash-promotions'
    }));

    // Enviar en lotes de 100 (límite de Expo)
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error('Failed to send push notifications:', response.statusText);
      }
    }
  } catch (error) {
    console.error('Error sending Expo push notifications:', error);
  }
}

export async function sendPromotionReminder(promotionId: string, minutesLeft: number) {
  try {
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);

    if (!promotion) return;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, promotion.businessId))
      .limit(1);

    if (!business) return;

    const activeUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`${users.pushToken} IS NOT NULL`,
          sql`${users.pushToken} != ''`
        )
      );

    const pushTokens = activeUsers.map(user => user.pushToken).filter(Boolean);

    if (pushTokens.length > 0) {
      const notificationData: NotificationData = {
        title: "⏰ ¡Últimos minutos!",
        message: `${business.name}: ${promotion.title} - Solo quedan ${minutesLeft} minutos`,
        data: {
          type: "promotion_reminder",
          promotionId: promotion.id,
          businessId: business.id,
          minutesLeft
        }
      };

      await sendExpoPushNotifications(pushTokens, notificationData);
      console.log(`Promotion reminder sent to ${pushTokens.length} users`);
    }
  } catch (error) {
    console.error("Error sending promotion reminder:", error);
  }
}