import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

import { ThemedText } from "@/components/ThemedText";
import { BarPinMarker, PinStatus } from "@/components/BarPinMarker";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SEARCH_RADIUS_OPTIONS = [1, 2, 5, 10, 15]; // km

export default function MapScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<MapScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [bars, setBars] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(5); // km
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  useEffect(() => {
    loadMapData();
    setupProximityNotifications();
  }, [searchRadius]);

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

      const response = await apiRequest('GET', `/api/businesses?lat=${currentLocation.coords.latitude}&lng=${currentLocation.coords.longitude}&radius=${searchRadius}`);
      const data = await response.json();
      
      if (data.success) {
        setBars(data.businesses || []);
        checkProximityNotifications(data.businesses || [], currentLocation);
      }
    } catch (err: any) {
      console.error('Error loading map:', err);
      setError(err.message || 'Error al cargar el mapa');
    } finally {
      setIsLoading(false);
    }
  };

  const setupProximityNotifications = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  };

  const checkProximityNotifications = async (businesses: any[], userLocation: any) => {
    const hotPromoBars = businesses.filter(bar => 
      bar.hasFlashPromo && 
      calculateDistance(userLocation.coords, { latitude: bar.latitude, longitude: bar.longitude }) <= 1 // 1km radius
    );

    if (hotPromoBars.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 ¡Promoción Flash Cerca!',
          body: `${hotPromoBars[0].name} tiene promociones activas a ${Math.round(calculateDistance(userLocation.coords, { latitude: hotPromoBars[0].latitude, longitude: hotPromoBars[0].longitude }) * 1000)}m`,
          data: { businessId: hotPromoBars[0].id, type: 'flash_promo_nearby' },
        },
        trigger: { seconds: 1 },
      });
    }
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

  const getBarStatus = (bar: any): PinStatus => {
    if (bar.hasFlashPromo) return 'hot_promo';
    if (bar.isOpen) return 'open';
    if (bar.openingSoon) return 'opening_soon';
    return 'closed';
  };

  const handleBarPress = (bar: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('BusinessDetail', { businessId: bar.id });
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
    <View style={[styles.fullContainer, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="h2">Bares Cercanos 🗺️</ThemedText>
          <Pressable
            style={[styles.radiusButton, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowRadiusSelector(!showRadiusSelector);
            }}
          >
            <Feather name="target" size={16} color={AstroBarColors.primary} />
            <ThemedText type="small" style={{ color: AstroBarColors.primary, marginLeft: 4 }}>
              {searchRadius}km
            </ThemedText>
          </Pressable>
        </View>
        
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {bars.length} bares en {searchRadius}km
        </ThemedText>

        {showRadiusSelector && (
          <View style={[styles.radiusSelector, { backgroundColor: theme.card }]}>
            {SEARCH_RADIUS_OPTIONS.map(radius => (
              <Pressable
                key={radius}
                style={[
                  styles.radiusOption,
                  {
                    backgroundColor: searchRadius === radius ? AstroBarColors.primaryLight : 'transparent'
                  }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSearchRadius(radius);
                  setShowRadiusSelector(false);
                }}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: searchRadius === radius ? AstroBarColors.primary : theme.text,
                    fontWeight: searchRadius === radius ? '600' : '400'
                  }}
                >
                  {radius}km
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContainer}>
        {bars.map((bar) => {
          const status = getBarStatus(bar);
          const distance = location ? calculateDistance(location.coords, { latitude: bar.latitude, longitude: bar.longitude }) : 0;
          
          return (
            <View key={bar.id} style={styles.barRow}>
              <BarPinMarker
                status={status}
                businessName={bar.name}
                onPress={() => handleBarPress(bar)}
                timeUntilOpen={bar.timeUntilOpen}
                hotPromoCount={bar.flashPromoCount}
              />
              
              <Pressable
                onPress={() => handleBarPress(bar)}
                style={[
                  styles.barCard,
                  { backgroundColor: theme.card },
                  status === 'hot_promo' && styles.barCardFlash,
                ]}
              >
                <View style={styles.barInfo}>
                  <ThemedText type="body" style={styles.barName}>
                    {bar.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {bar.address || 'Buenos Aires'} • {distance.toFixed(1)}km
                  </ThemedText>
                  <View style={styles.barMeta}>
                    <ThemedText type="caption" style={{
                      color: status === 'hot_promo' ? '#FFD700' : 
                             status === 'open' ? '#4CAF50' : 
                             status === 'opening_soon' ? '#FFB800' : '#999999',
                      fontWeight: '700'
                    }}>
                      {status === 'hot_promo' ? `⚡ ${bar.flashPromoCount || 1} FLASH ACTIVO` :
                       status === 'open' ? '● Abierto' :
                       status === 'opening_soon' ? `🕐 ${bar.timeUntilOpen || 'Próximo a abrir'}` :
                       '● Cerrado'}
                    </ThemedText>
                  </View>
                </View>

                <Feather name="chevron-right" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
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
  header: {
    padding: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  radiusSelector: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  radiusOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  barCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  barCardFlash: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  barInfo: {
    flex: 1,
  },
  barName: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  barMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
});
