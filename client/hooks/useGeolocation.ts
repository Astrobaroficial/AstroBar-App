import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/contexts/AuthContext';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number; // milliseconds
  autoStart?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 60000,
    updateInterval = 30000, // 30 seconds
    autoStart = true
  } = options;

  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Request location permission
  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const permissionResponse = { status } as Location.LocationPermissionResponse;
      setPermission(permissionResponse);
      return status === 'granted';
    } catch (err) {
      setError('Failed to request location permission');
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeout,
        maximumAge,
      });

      const locationData: LocationData = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
      };

      setLocation(locationData);
      setError(null);
      return locationData;
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      return null;
    }
  };

  // Update location on server
  const updateServerLocation = async (locationData: LocationData) => {
    if (!user) return;

    try {
      await apiRequest('POST', '/api/geolocation/update-location', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    } catch (err) {
      console.warn('Failed to update server location:', err);
    }
  };

  // Start tracking
  const startTracking = async () => {
    if (isTracking) return;

    const hasPermission = permission?.status === 'granted' || await requestPermission();
    if (!hasPermission) {
      setError('Location permission denied');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial location
    const initialLocation = await getCurrentLocation();
    if (initialLocation) {
      await updateServerLocation(initialLocation);
    }

    // Set up periodic updates
    intervalRef.current = setInterval(async () => {
      const currentLocation = await getCurrentLocation();
      if (currentLocation) {
        await updateServerLocation(currentLocation);
      }
    }, updateInterval);
  };

  // Stop tracking
  const stopTracking = async () => {
    if (!isTracking) return;

    setIsTracking(false);

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clear watch
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    // Remove from server tracking
    if (user) {
      try {
        await apiRequest('POST', '/api/geolocation/remove-location');
      } catch (err) {
        console.warn('Failed to remove server location:', err);
      }
    }
  };

  // Auto-start tracking
  useEffect(() => {
    if (autoStart && user) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [user, autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    location,
    error,
    isTracking,
    permission,
    startTracking,
    stopTracking,
    getCurrentLocation,
    requestPermission,
  };
}