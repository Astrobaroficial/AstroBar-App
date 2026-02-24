// Google Maps Service para AstroBar
import * as Location from 'expo-location';

export interface BarLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  status: 'closed' | 'opening_soon' | 'open' | 'open_with_flash';
}

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const getNearbyBars = async (
  bars: BarLocation[],
  radiusKm: number = 5
): Promise<BarLocation[]> => {
  const userLocation = await getCurrentLocation();
  if (!userLocation) return bars;

  return bars
    .map((bar) => ({
      ...bar,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        bar.latitude,
        bar.longitude
      ),
    }))
    .filter((bar) => bar.distance! <= radiusKm)
    .sort((a, b) => a.distance! - b.distance!);
};

export const getBarStatus = (
  openingHour: number,
  closingHour: number,
  hasFlashPromo: boolean
): 'closed' | 'opening_soon' | 'open' | 'open_with_flash' => {
  const now = new Date();
  const currentHour = now.getHours();

  if (hasFlashPromo && currentHour >= openingHour && currentHour < closingHour) {
    return 'open_with_flash';
  }

  if (currentHour >= openingHour && currentHour < closingHour) {
    return 'open';
  }

  // Próximo a abrir (1 hora antes)
  if (currentHour === openingHour - 1) {
    return 'opening_soon';
  }

  return 'closed';
};
