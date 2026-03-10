import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
// @ts-ignore - react-native-maps solo funciona en build nativo
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PinStatus = 'closed' | 'opening_soon' | 'open' | 'hot_promo';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function MapScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [bars, setBars] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      const response = await apiRequest('GET', `/api/public/businesses`);
      const data = await response.json();
      
      if (data.success) {
        const activeBars = (data.businesses || []).filter((b: any) => b.latitude && b.longitude);
        setBars(activeBars);
      }
    } catch (err: any) {
      console.error('Error loading map:', err);
      setError(err.message || 'Error al cargar el mapa');
    } finally {
      setIsLoading(false);
    }
  };

  const getDirections = async (bar: any) => {
    if (!location) {
      console.log('No location available');
      return;
    }

    try {
      console.log('Getting directions from:', location.coords.latitude, location.coords.longitude);
      console.log('To:', bar.latitude, bar.longitude);
      
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${bar.latitude},${bar.longitude}`;

      console.log('Fetching directions from backend...');
      const response = await apiRequest('GET', `/api/directions?origin=${origin}&destination=${destination}`);
      const data = await response.json();

      console.log('Directions response:', data);

      if (data.success && data.route) {
        const points = decodePolyline(data.route.polyline);
        console.log('Route points:', points.length);
        
        setRouteCoords(points);
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
        });

        console.log('Distance:', data.route.distance);
        console.log('Duration:', data.route.duration);

        // Fit map to route
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }, 100);
      } else {
        console.log('No routes found');
        Alert.alert('Error', 'No se pudo encontrar una ruta');
      }
    } catch (err: any) {
      console.error('Error getting directions:', err);
      Alert.alert('Error', 'Error al obtener direcciones: ' + err.message);
    }
  };

  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const calculateDistance = (coord1: any, coord2: any) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getMarkerColor = (bar: any) => {
    if (bar.hasFlashPromo && bar.isOpen) return '#FFD700'; // Dorado para flash promo
    if (bar.isOpen) return '#4CAF50'; // Verde para abierto
    if (bar.openingSoon) return '#FFB800'; // Amarillo para próximo a abrir
    return '#EF4444'; // Rojo para cerrado
  };

  const handleMarkerPress = (bar: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBar(bar);
    setRouteCoords([]);
    setRouteInfo(null);
    mapRef.current?.animateToRegion({
      latitude: parseFloat(bar.latitude),
      longitude: parseFloat(bar.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const handleGetDirections = () => {
    if (selectedBar) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      getDirections(selectedBar);
    }
  };

  const handleViewDetails = () => {
    if (selectedBar) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('BusinessDetail', { businessId: selectedBar.id });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
        <ThemedText type="body" style={styles.loadingText}>
          Cargando mapa...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={AstroBarColors.error} />
        <ThemedText type="h3" style={styles.errorTitle}>
          Error
        </ThemedText>
        <ThemedText type="body" style={styles.errorText}>
          {error}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || -34.6037,
          longitude: location?.coords.longitude || -58.3816,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {bars.map((bar) => (
          <Marker
            key={bar.id}
            coordinate={{
              latitude: parseFloat(bar.latitude),
              longitude: parseFloat(bar.longitude),
            }}
            onPress={() => handleMarkerPress(bar)}
          >
            <View style={[styles.customMarker, { backgroundColor: getMarkerColor(bar) }]}>
              <Feather name="map-pin" size={24} color="#FFF" />
              {bar.hasFlashPromo && (
                <View style={styles.flashBadge}>
                  <Feather name="zap" size={10} color="#FFD700" />
                </View>
              )}
            </View>
          </Marker>
        ))}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={AstroBarColors.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {selectedBar && (
        <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3">{selectedBar.name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {selectedBar.address || 'Buenos Aires'}
              </ThemedText>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getMarkerColor(selectedBar) }]} />
                <ThemedText type="small" style={{ color: getMarkerColor(selectedBar), fontWeight: '600' }}>
                  {selectedBar.hasFlashPromo ? `⚡ ${selectedBar.flashPromoCount} Flash Activo` :
                   selectedBar.isOpen ? 'Abierto' : 'Cerrado'}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={() => setSelectedBar(null)} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {routeInfo && (
            <View style={styles.routeInfo}>
              <View style={styles.routeItem}>
                <Feather name="navigation" size={16} color={AstroBarColors.primary} />
                <ThemedText type="small" style={{ marginLeft: 8 }}>{routeInfo.distance}</ThemedText>
              </View>
              <View style={styles.routeItem}>
                <Feather name="clock" size={16} color={AstroBarColors.primary} />
                <ThemedText type="small" style={{ marginLeft: 8 }}>{routeInfo.duration}</ThemedText>
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: AstroBarColors.primary }]}
              onPress={handleGetDirections}
            >
              <Feather name="navigation" size={18} color="#FFF" />
              <ThemedText type="small" style={{ color: '#FFF', marginLeft: 8, fontWeight: '600' }}>
                Cómo llegar
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }]}
              onPress={handleViewDetails}
            >
              <Feather name="info" size={18} color={theme.text} />
              <ThemedText type="small" style={{ marginLeft: 8, fontWeight: '600' }}>
                Ver detalles
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullContainer: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  errorTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  flashBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
});
