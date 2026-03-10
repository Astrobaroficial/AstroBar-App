import { db } from "./db";
import { users, businesses, promotions } from "@shared/schema-mysql";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
}

interface BusinessWithStatus {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  hasFlashPromo: boolean;
  nearbyUsers: number;
}

export class GeolocationService {
  private static activeUsers = new Map<string, UserLocation>();
  private static readonly PROXIMITY_RADIUS_KM = 2; // 2km radius
  private static readonly USER_TIMEOUT_MINUTES = 5; // Consider user inactive after 5 minutes

  // Update user location
  static updateUserLocation(userId: string, latitude: number, longitude: number) {
    this.activeUsers.set(userId, {
      userId,
      latitude,
      longitude,
      lastUpdate: new Date()
    });
    
    // Clean up inactive users
    this.cleanupInactiveUsers();
  }

  // Remove inactive users
  private static cleanupInactiveUsers() {
    const cutoff = new Date(Date.now() - this.USER_TIMEOUT_MINUTES * 60 * 1000);
    
    for (const [userId, location] of this.activeUsers.entries()) {
      if (location.lastUpdate < cutoff) {
        this.activeUsers.delete(userId);
      }
    }
  }

  // Calculate distance between two points in km
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get businesses with real-time status
  static async getBusinessesWithStatus(): Promise<BusinessWithStatus[]> {
    try {
      // Get all active businesses
      const allBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.isActive, true));

      const now = new Date();
      const businessesWithStatus: BusinessWithStatus[] = [];

      for (const business of allBusinesses) {
        if (!business.latitude || !business.longitude) continue;

        // Check for active flash promotions
        const flashPromos = await db
          .select()
          .from(promotions)
          .where(
            and(
              eq(promotions.businessId, business.id),
              eq(promotions.type, 'flash'),
              eq(promotions.isActive, true),
              lte(promotions.startTime, now),
              gte(promotions.endTime, now)
            )
          );

        // Count nearby users
        let nearbyUsers = 0;
        for (const [_, userLocation] of this.activeUsers.entries()) {
          const distance = this.calculateDistance(
            business.latitude,
            business.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          
          if (distance <= this.PROXIMITY_RADIUS_KM) {
            nearbyUsers++;
          }
        }

        businessesWithStatus.push({
          id: business.id,
          name: business.name,
          latitude: business.latitude,
          longitude: business.longitude,
          isOpen: business.isOpen,
          hasFlashPromo: flashPromos.length > 0,
          nearbyUsers
        });
      }

      return businessesWithStatus;
    } catch (error) {
      console.error("Error getting businesses with status:", error);
      return [];
    }
  }

  // Get demand heatmap data
  static getDemandHeatmap() {
    this.cleanupInactiveUsers();
    
    const heatmapData = Array.from(this.activeUsers.values()).map(user => ({
      latitude: user.latitude,
      longitude: user.longitude,
      intensity: 1
    }));

    return {
      points: heatmapData,
      totalActiveUsers: this.activeUsers.size,
      lastUpdate: new Date()
    };
  }

  // Get users near a specific business
  static getUsersNearBusiness(businessLat: number, businessLon: number): number {
    this.cleanupInactiveUsers();
    
    let count = 0;
    for (const [_, userLocation] of this.activeUsers.entries()) {
      const distance = this.calculateDistance(
        businessLat,
        businessLon,
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (distance <= this.PROXIMITY_RADIUS_KM) {
        count++;
      }
    }
    
    return count;
  }

  // Remove user from tracking
  static removeUser(userId: string) {
    this.activeUsers.delete(userId);
  }

  // Get users within radius
  static getActiveUsersInRadius(centerLat: number, centerLon: number, radiusKm: number) {
    this.cleanupInactiveUsers();
    
    const nearbyUsers = [];
    for (const [userId, userLocation] of this.activeUsers.entries()) {
      const distance = this.calculateDistance(
        centerLat,
        centerLon,
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (distance <= radiusKm) {
        nearbyUsers.push({ userId, ...userLocation, distance });
      }
    }
    
    return nearbyUsers;
  }

  // Get active users count
  static getActiveUsersCount(): number {
    this.cleanupInactiveUsers();
    return this.activeUsers.size;
  }
}