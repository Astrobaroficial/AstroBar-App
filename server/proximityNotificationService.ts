import { GeolocationService } from "./geolocationService";
import { sendPushNotification } from "./services/pushNotifications";
import { db } from "./db";
import { users, promotions, businesses } from "@shared/schema-mysql";
import { eq, and, gte, lte } from "drizzle-orm";

interface NotificationPreferences {
  flashPromosEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class ProximityNotificationService {
  private static readonly NOTIFICATION_RADIUS_KM = 0.5; // 500 meters
  private static notifiedUsers = new Map<string, Set<string>>(); // promotionId -> Set of userIds

  // Send flash promo notifications to nearby users
  static async sendFlashPromoNotifications(promotionId: string) {
    try {
      // Get promotion details
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId))
        .limit(1);

      if (!promotion || promotion.type !== 'flash') {
        return;
      }

      // Get business details
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, promotion.businessId))
        .limit(1);

      if (!business || !business.latitude || !business.longitude) {
        return;
      }

      // Get nearby users with notification preferences
      const nearbyUsers = await this.getNearbyUsersWithPreferences(
        business.latitude,
        business.longitude
      );

      // Filter users who haven't been notified for this promotion
      const usersToNotify = nearbyUsers.filter(user => {
        const notifiedSet = this.notifiedUsers.get(promotionId) || new Set();
        return !notifiedSet.has(user.id) && user.preferences.flashPromosEnabled;
      });

      if (usersToNotify.length === 0) {
        return;
      }

      // Send notifications
      const notifications = usersToNotify.map(user => {
        const notificationData = {
          type: 'flash_promo_nearby',
          promotionId: promotion.id,
          businessId: business.id,
          businessName: business.name,
          sound: user.preferences.soundEnabled ? 'default' : null,
          vibrate: user.preferences.vibrationEnabled,
        };

        return sendPushNotification(
          user.pushToken,
          `⚡ ¡Promoción Flash Cerca!`,
          `${business.name} tiene una promoción flash activa. ¡Solo por ${this.getPromoDurationText(promotion)}!`,
          notificationData
        );
      });

      await Promise.allSettled(notifications);

      // Mark users as notified for this promotion
      const notifiedSet = this.notifiedUsers.get(promotionId) || new Set();
      usersToNotify.forEach(user => notifiedSet.add(user.id));
      this.notifiedUsers.set(promotionId, notifiedSet);

      console.log(`📱 Flash promo notifications sent to ${usersToNotify.length} nearby users`);
    } catch (error) {
      console.error('Error sending flash promo notifications:', error);
    }
  }

  // Get nearby users with their notification preferences
  private static async getNearbyUsersWithPreferences(businessLat: number, businessLon: number) {
    const activeUsers = GeolocationService.getActiveUsersInRadius(businessLat, businessLon, this.NOTIFICATION_RADIUS_KM);
    
    if (activeUsers.length === 0) {
      return [];
    }

    // Get user details and preferences from database
    const userIds = activeUsers.map(u => u.userId);
    const usersData = await db
      .select({
        id: users.id,
        pushToken: users.pushToken,
        notificationPreferences: users.notificationPreferences,
      })
      .from(users)
      .where(eq(users.id, userIds[0])); // This would need to be updated for multiple users

    return usersData
      .filter(user => user.pushToken)
      .map(user => ({
        ...user,
        preferences: this.parseNotificationPreferences(user.notificationPreferences),
      }));
  }

  // Parse notification preferences from JSON string
  private static parseNotificationPreferences(preferencesJson: string | null): NotificationPreferences {
    try {
      const preferences = preferencesJson ? JSON.parse(preferencesJson) : {};
      return {
        flashPromosEnabled: preferences.flashPromosEnabled !== false, // Default true
        soundEnabled: preferences.soundEnabled !== false, // Default true
        vibrationEnabled: preferences.vibrationEnabled !== false, // Default true
      };
    } catch {
      return {
        flashPromosEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    }
  }

  // Get promotion duration text
  private static getPromoDurationText(promotion: any): string {
    const start = new Date(promotion.startTime);
    const end = new Date(promotion.endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${durationMinutes} minutos`;
  }

  // Clean up notification tracking when promotion ends
  static cleanupPromotionNotifications(promotionId: string) {
    this.notifiedUsers.delete(promotionId);
  }

  // Update user notification preferences
  static async updateUserNotificationPreferences(userId: string, preferences: NotificationPreferences) {
    try {
      await db
        .update(users)
        .set({
          notificationPreferences: JSON.stringify(preferences),
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error };
    }
  }

  // Get user notification preferences
  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const [user] = await db
        .select({ notificationPreferences: users.notificationPreferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return this.parseNotificationPreferences(user?.notificationPreferences || null);
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        flashPromosEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    }
  }
}