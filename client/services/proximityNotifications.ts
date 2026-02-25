import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { apiRequest } from '@/lib/query-client';

interface ProximityConfig {
  flashPromoRadius: number; // km
  reminderRadius: number; // km
  checkInterval: number; // minutes
}

const DEFAULT_CONFIG: ProximityConfig = {
  flashPromoRadius: 1, // 1km for flash promos
  reminderRadius: 0.5, // 500m for QR reminders
  checkInterval: 5, // check every 5 minutes
};

class ProximityNotificationService {
  private config: ProximityConfig = DEFAULT_CONFIG;
  private lastKnownLocation: Location.LocationObject | null = null;
  private notifiedBusinesses: Set<string> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  async initialize() {
    // Request permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Start monitoring
    this.startLocationMonitoring();
  }

  private async startLocationMonitoring() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    // Check immediately
    await this.checkProximity();

    // Set up interval checking
    this.intervalId = setInterval(() => {
      this.checkProximity();
    }, this.config.checkInterval * 60 * 1000);
  }

  private async checkProximity() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.lastKnownLocation = location;

      // Get nearby businesses with flash promos
      const response = await apiRequest('GET', 
        `/api/businesses/nearby?lat=${location.coords.latitude}&lng=${location.coords.longitude}&radius=${this.config.flashPromoRadius}&hasFlash=true`
      );
      
      const data = await response.json();
      if (data.success && data.businesses) {
        await this.processNearbyBusinesses(data.businesses, location);
      }
    } catch (error) {
      console.error('Error checking proximity:', error);
    }
  }

  private async processNearbyBusinesses(businesses: any[], userLocation: Location.LocationObject) {
    for (const business of businesses) {
      const distance = this.calculateDistance(
        userLocation.coords,
        { latitude: business.latitude, longitude: business.longitude }
      );

      // Flash promo notifications
      if (business.hasFlashPromo && distance <= this.config.flashPromoRadius) {
        const notificationKey = `flash_${business.id}_${business.flashPromoId}`;
        
        if (!this.notifiedBusinesses.has(notificationKey)) {
          await this.sendFlashPromoNotification(business, distance);
          this.notifiedBusinesses.add(notificationKey);
        }
      }

      // QR reminder notifications (for active transactions)
      if (business.hasActiveQR && distance <= this.config.reminderRadius) {
        const reminderKey = `qr_${business.id}`;\n        
        if (!this.notifiedBusinesses.has(reminderKey)) {
          await this.sendQRReminderNotification(business, distance);
          this.notifiedBusinesses.add(reminderKey);
        }
      }
    }
  }

  private async sendFlashPromoNotification(business: any, distance: number) {
    const distanceText = distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 ¡Promoción Flash Cerca!',
        body: `${business.name} tiene ${business.flashPromoCount} promoción(es) activa(s) a ${distanceText}`,
        data: { 
          businessId: business.id, 
          type: 'flash_promo_nearby',
          distance: distance 
        },
        sound: 'default',
      },
      trigger: { seconds: 1 },
    });
  }

  private async sendQRReminderNotification(business: any, distance: number) {
    const distanceText = distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📱 ¡Estás cerca del bar!',
        body: `${business.name} está a ${distanceText}. ¿Listo para canjear tu QR?`,
        data: { 
          businessId: business.id, 
          type: 'qr_reminder',
          distance: distance 
        },
      },
      trigger: { seconds: 1 },
    });
  }

  private calculateDistance(coord1: any, coord2: any): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  updateConfig(newConfig: Partial<ProximityConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  clearNotificationHistory() {
    this.notifiedBusinesses.clear();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const proximityNotificationService = new ProximityNotificationService();