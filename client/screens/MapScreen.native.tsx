import React, { useState, useEffect, useRef, memo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import Svg, { Circle, Path, Polygon, G } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

// ==========================================
// RENDERIZADOR DE ÍCONOS SVG PUROS (24x24)
// ==========================================
const renderSvgIcon = (iconName: string) => {
  switch (iconName) {
    case "coffee":
      return (
        <Path
          d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "music":
      return (
        <Path
          d="M9 18V5l12-2v13M9 9l12-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "pie-chart":
      return (
        <Path
          d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "zap":
      return (
        <Polygon
          points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "speaker":
      return (
        <Path
          d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "moon":
      return (
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    default: // map-pin
      return (
        <>
          <Path
            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle
            cx="12"
            cy="10"
            r="3"
            stroke="#FFFFFF"
            strokeWidth="2"
            fill="none"
          />
        </>
      );
  }
};

// ==========================================
// COMPONENTE MARCADOR DE BARES (SVG DIRECTO)
// ==========================================
const TrackedMarker = memo(({ bar, design, onPress }: { bar: any, design: any, onPress: () => void }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{
        latitude: parseFloat(bar.latitude),
        longitude: parseFloat(bar.longitude),
      }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={Platform.OS === 'ios' ? false : tracksViewChanges}
    >
      <Svg width="60" height="60" viewBox="0 0 60 60">
        <Circle cx="30" cy="30" r="26" fill="#FFFFFF" />
        <Circle cx="30" cy="30" r="22" fill={design.color} fillOpacity={bar.isOpen ? 1 : 0.7} />
        
        <G transform="translate(18, 18)">
          {renderSvgIcon(design.iconName)}
        </G>

        {!bar.isOpen && (
          <G transform="translate(42, 4)">
            <Circle cx="7" cy="7" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
            <Path d="M4 7h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </G>
        )}
      </Svg>
    </Marker>
  );
});

// ==========================================
// COMPONENTE MARCADOR DE USUARIO (SVG DIRECTO)
// ==========================================
const TrackedUserMarker = memo(({ coordinate }: { coordinate: any }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={Platform.OS === 'ios' ? false : tracksViewChanges}
      zIndex={999}
    >
      <Svg width="30" height="30" viewBox="0 0 30 30">
        <Circle cx="15" cy="15" r="14" fill="#FFFFFF" />
        <Circle cx="15" cy="15" r="11" fill={AstroBarColors.primary} />
        <Circle cx="15" cy="15" r="4" fill="#FFFFFF" />
      </Svg>
    </Marker>
  );
});

export default function MapScreenNative() {
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

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const buscarMasCercano = (tipoBusqueda: 'bar' | 'nightclub' | 'restaurant') => {
    if (!location || bars.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const localesFiltrados = bars.filter((bar) => {
      const type = (bar.type || '').toLowerCase();
      if (tipoBusqueda === 'bar') return type.includes('bar') || type.includes('pub');
      if (tipoBusqueda === 'nightclub') return type.includes('nightclub') || type.includes('discoteca');
      if (tipoBusqueda === 'restaurant') return type.includes('restaurant');
      return false;
    });

    if (localesFiltrados.length === 0) {
      Alert.alert('Aviso', `No se encontraron lugares de tipo ${tipoBusqueda} cerca tuyo.`);
      return;
    }

    let masCercano = null;
    let distanciaMinima = Infinity;

    localesFiltrados.forEach((bar) => {
      const distancia = calcularDistancia(
        location.coords.latitude,
        location.coords.longitude,
        parseFloat(bar.latitude),
        parseFloat(bar.longitude)
      );
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = bar;
      }
    });

    if (masCercano) {
      handleMarkerPress(masCercano);
    }
  };

  const getDirections = async (bar: any) => {
    if (!location) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${bar.latitude},${bar.longitude}`;

      const response = await apiRequest('GET', `/api/directions?origin=${origin}&destination=${destination}`);
      const data = await response.json();

      if (data.success && data.route) {
        const points = decodePolyline(data.route.polyline);
        
        if (points.length === 0) {
          Alert.alert('Error', 'No se pudo generar la ruta');
          return;
        }
        
        setRouteCoords(points);
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
        });

        setTimeout(() => {
          const allCoords = [
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            ...points,
            { latitude: parseFloat(bar.latitude), longitude: parseFloat(bar.longitude) }
          ];
          
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }, 100);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorMsg = data.hint || data.details || data.error || 'No se pudo encontrar una ruta';
        Alert.alert('Error', errorMsg);
      }
    } catch (err: any) {
      Alert.alert('Error de Conexión', 'No se pudieron obtener las direcciones.');
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

  const getMarkerDesign = (bar: any) => {
    const type = (bar.type || '').toLowerCase();
    const isClosed = !bar.isOpen;
    
    let config = { color: "#64748b", iconName: "map-pin" }; 

    if (type.includes('nightclub') || type.includes('discoteca')) {
      config = { color: isClosed ? "#6b21a8" : "#9C27B0", iconName: "music" };
    } else if (type.includes('pub')) {
      config = { color: isClosed ? "#c2410c" : "#FF5722", iconName: "speaker" };
    } else if (type.includes('bar') || type.includes('restaurant_bar')) {
      config = { color: isClosed ? "#0284c7" : "#00f2fe", iconName: "coffee" };
    } else if (type.includes('lounge')) {
      config = { color: isClosed ? "#312e81" : "#3F51B5", iconName: "moon" };
    } else if (type.includes('restaurant')) {
      config = { color: isClosed ? "#b45309" : "#FF9800", iconName: "pie-chart" };
    }

    if (bar.hasFlashPromo && bar.isOpen) {
      config.color = "#FFD700";
      config.iconName = "zap";
    }

    return config;
  };

  const getStatusDotColor = (bar: any) => {
    if (bar.hasFlashPromo && bar.isOpen) return '#FFD700'; 
    if (bar.isOpen) return '#4CAF50'; 
    return '#EF4444'; 
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
        showsUserLocation={false} 
        showsMyLocationButton={false} 
        userInterfaceStyle="dark"
        customMapStyle={[
          { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
          { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
          { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
          { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
          { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
          { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
          { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
          { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
          { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
          { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
          { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
          { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
          { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
          { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
        ]}
      >
        {bars.map((bar) => (
          <TrackedMarker 
            key={bar.id} 
            bar={bar} 
            design={getMarkerDesign(bar)} 
            onPress={() => handleMarkerPress(bar)} 
          />
        ))}

        {location && (
          <TrackedUserMarker 
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }} 
          />
        )}

        {location && routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={AstroBarColors.primary}
            strokeWidth={5}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      <View style={styles.floatingButtonsContainer}>
        <Pressable 
          style={({ pressed }) => [styles.floatingButton, { opacity: pressed ? 0.7 : 1 }]} 
          onPress={() => buscarMasCercano('bar')}
        >
          <Feather name="coffee" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable 
          style={({ pressed }) => [styles.floatingButton, { backgroundColor: '#9C27B0', opacity: pressed ? 0.7 : 1 }]} 
          onPress={() => buscarMasCercano('nightclub')}
        >
          <Feather name="music" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable 
          style={({ pressed }) => [styles.floatingButton, { backgroundColor: '#FF9800', opacity: pressed ? 0.7 : 1 }]} 
          onPress={() => buscarMasCercano('restaurant')}
        >
          <Feather name="pie-chart" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.floatingDivider} />
        <Pressable 
          style={({ pressed }) => [styles.floatingButton, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            mapRef.current?.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }}
        >
          <Feather name="crosshair" size={22} color={theme.text} />
        </Pressable>
      </View>

      {selectedBar && (
        <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3">{selectedBar.name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {selectedBar.address || 'Buenos Aires'}
              </ThemedText>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusDotColor(selectedBar) }]} />
                <ThemedText type="small" style={{ color: getStatusDotColor(selectedBar), fontWeight: '600' }}>
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
              onPress={() => getDirections(selectedBar)}
            >
              <Feather name="navigation" size={18} color="#FFF" />
              <ThemedText type="small" style={{ color: '#FFF', marginLeft: 8, fontWeight: '600' }}>
                Cómo llegar
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => navigation.navigate('BusinessDetail', { businessId: selectedBar.id })}
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullContainer: { flex: 1 },
  map: { width, height },
  loadingText: { marginTop: Spacing.md },
  errorTitle: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  errorText: { textAlign: 'center', paddingHorizontal: Spacing.xl },
  floatingButtonsContainer: {
    position: 'absolute',
    right: Spacing.md,
    top: '15%',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  floatingDivider: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
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
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  closeButton: { padding: Spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  routeInfo: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  routeItem: { flexDirection: 'row', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', gap: Spacing.md },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
});