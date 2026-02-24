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
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        setIsLoading(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // Load bars
      const response = await apiRequest('GET', '/api/businesses');
      const data = await response.json();
      
      if (data.success) {
        setBars(data.businesses || []);
      }
    } catch (err: any) {
      console.error('Error loading map:', err);
      setError(err.message || 'Error al cargar el mapa');
    } finally {
      setIsLoading(false);
    }
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
        <ThemedText type="h2">Bares Cercanos 🗺️</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {bars.length} bares disponibles
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContainer}>
        {bars.map((bar) => {
          const isOpen = bar.is_open || bar.isOpen;
          const hasFlash = false;
          
          return (
            <Pressable
              key={bar.id}
              onPress={() => handleBarPress(bar)}
              style={[
                styles.barCard,
                { backgroundColor: theme.card },
                hasFlash && styles.barCardFlash,
              ]}
            >
              <View style={[
                styles.statusDot,
                { backgroundColor: hasFlash ? '#FFD700' : isOpen ? '#4CAF50' : '#999999' }
              ]} />
              
              <View style={styles.barInfo}>
                <ThemedText type="body" style={styles.barName}>
                  {bar.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {bar.address || 'Buenos Aires'}
                </ThemedText>
                <View style={styles.barMeta}>
                  <View style={styles.statusBadge}>
                    <ThemedText type="caption" style={[
                      styles.statusText,
                      { color: hasFlash ? '#FFD700' : isOpen ? '#4CAF50' : '#999999' }
                    ]}>
                      {hasFlash ? '⚡ FLASH ACTIVO' : isOpen ? '● Abierto' : '● Cerrado'}
                    </ThemedText>
                  </View>
                </View>
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
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  barCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
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
