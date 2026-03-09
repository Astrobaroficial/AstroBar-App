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

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<MapScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [bars, setBars] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const calculateDistance = (coord1: any, coord2: any) => {
    const R = 6371;
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getBarStatus = (bar: any) => {
    if (bar.hasFlashPromo && bar.isOpen) return { color: '#FFD700', label: `⚡ ${bar.flashPromoCount} Flash` };
    if (bar.isOpen) return { color: '#4CAF50', label: '● Abierto' };
    if (bar.openingSoon) return { color: '#FFB800', label: `🕐 ${bar.timeUntilOpen || 'Próximo'}` };
    return { color: '#EF4444', label: '● Cerrado' };
  };

  const handleBarPress = (bar: any) => {
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
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <ThemedText type="h2">Bares Cercanos 🗺️</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {bars.length} bares disponibles
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContainer}>
        {bars.map((bar) => {
          const status = getBarStatus(bar);
          const distance = location ? calculateDistance(location.coords, { latitude: parseFloat(bar.latitude), longitude: parseFloat(bar.longitude) }) : 0;
          
          return (
            <Pressable
              key={bar.id}
              onPress={() => handleBarPress(bar)}
              style={[styles.barCard, { backgroundColor: theme.card }]}
            >
              <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
              
              <View style={styles.barInfo}>
                <ThemedText type="body" style={styles.barName}>{bar.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {bar.address || 'Buenos Aires'} • {distance.toFixed(1)}km
                </ThemedText>
                <ThemedText type="caption" style={{ color: status.color, fontWeight: '600', marginTop: 4 }}>
                  {status.label}
                </ThemedText>
              </View>

              <Feather name="chevron-right" size={24} color={theme.textSecondary} />
            </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  barCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
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
});
