import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { apiRequest } from '@/lib/query-client';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

class GPSService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private webWatchId: number | null = null;
  private isTracking = false;
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 10000; // 10 seconds

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            resolve(false);
            return;
          }
          
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            resolve(result.state === 'granted' || result.state === 'prompt');
          }).catch(() => {
            resolve(true); // Assume permission available if query fails
          });
        });
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      if (!granted) {
        const message = canAskAgain
          ? 'Activa el GPS para continuar con las entregas.'
          : 'Activa el GPS desde ajustes para continuar con las entregas.';
        Alert.alert('GPS requerido', message);
      }

      return granted;
    } catch (error) {
      console.error('Error requesting GPS permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<GPSLocation | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp
              });
            },
            (error) => {
              console.error('Web geolocation error:', error);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        });
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeoutMs: 10000
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async startTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('GPS permission denied');
      this.isTracking = false;
      return false;
    }

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) return false;

        this.webWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const now = Date.now();
            if (now - this.lastUpdate >= this.UPDATE_INTERVAL) {
              this.updateLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp
              });
              this.lastUpdate = now;
            }
          },
          (error) => {
            console.error('Web GPS tracking error:', error);
            this.stopTracking();
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          }
        );
      } else {
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: this.UPDATE_INTERVAL,
            distanceInterval: 50,
          },
          (location) => {
            this.updateLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp
            });
          }
        );
      }

      this.isTracking = true;
      console.log('✅ GPS tracking started');
      return true;
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      this.stopTracking();
      return false;
    }
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    try {
      if (Platform.OS === 'web') {
        if (this.webWatchId !== null) {
          navigator.geolocation.clearWatch(this.webWatchId);
          this.webWatchId = null;
        }
      } else {
        if (this.locationSubscription) {
          this.locationSubscription.remove();
          this.locationSubscription = null;
        }
      }

      this.isTracking = false;
      console.log('🛑 GPS tracking stopped');
    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
    }
  }

  private async updateLocation(location: GPSLocation): Promise<void> {
    try {
      await apiRequest('POST', '/api/delivery/location', {
        latitude: location.latitude,
        longitude: location.longitude
      });
      console.log('📍 Location updated:', location.latitude, location.longitude);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  async getLocationForDelivery(): Promise<GPSLocation | null> {
    console.log('🎯 Getting location for delivery confirmation...');
    return await this.getCurrentLocation();
  }
}

export const gpsService = new GPSService();