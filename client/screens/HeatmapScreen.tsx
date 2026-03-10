import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface DemandData {
  totalActiveUsers: number;
  businessesWithDemand: number;
  averageUsersPerBusiness: number;
  peakHours: Array<{ hour: number; users: number }>;
  topBusinesses: Array<{ 
    id: string; 
    name: string; 
    nearbyUsers: number; 
    hasFlashPromo: boolean;
  }>;
}

export default function HeatmapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [demandData, setDemandData] = useState<DemandData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadDemandData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDemandData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDemandData = async () => {
    try {
      const [heatmapResponse, businessesResponse] = await Promise.all([
        apiRequest('GET', '/api/geolocation/heatmap'),
        apiRequest('GET', '/api/geolocation/businesses-status')
      ]);

      const heatmapData = await heatmapResponse.json();
      const businessesData = await businessesResponse.json();

      if (heatmapData.success && businessesData.success) {
        const businesses = businessesData.businesses || [];
        const businessesWithUsers = businesses.filter((b: any) => b.nearbyUsers > 0);
        
        // Calculate peak hours (mock data for now)
        const peakHours = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          users: Math.floor(Math.random() * heatmapData.totalActiveUsers)
        })).sort((a, b) => b.users - a.users).slice(0, 5);

        const topBusinesses = businesses
          .filter((b: any) => b.nearbyUsers > 0)
          .sort((a: any, b: any) => b.nearbyUsers - a.nearbyUsers)
          .slice(0, 10);

        setDemandData({
          totalActiveUsers: heatmapData.totalActiveUsers,
          businessesWithDemand: businessesWithUsers.length,
          averageUsersPerBusiness: businessesWithUsers.length > 0 
            ? Math.round(businessesWithUsers.reduce((sum: number, b: any) => sum + b.nearbyUsers, 0) / businessesWithUsers.length)
            : 0,
          peakHours,
          topBusinesses
        });

        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading demand data:', err);
      setError(err.message || 'Error al cargar datos de demanda');
    } finally {
      setIsLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AstroBarColors.primary} />
          <ThemedText type="body" style={styles.loadingText}>
            Analizando demanda en tiempo real...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2">Análisis de Demanda</ThemedText>
        </View>
        
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={AstroBarColors.error} />
          <ThemedText type="h3" style={styles.errorTitle}>Error</ThemedText>
          <ThemedText type="body" style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={loadDemandData} style={styles.retryButton}>
            <ThemedText style={styles.retryText}>Reintentar</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText type="h2">Análisis de Demanda</ThemedText>
          {lastUpdate && (
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </ThemedText>
          )}
        </View>
        <Pressable onPress={loadDemandData} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color={AstroBarColors.primary} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Métricas principales */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.metricIcon, { backgroundColor: AstroBarColors.primary + '20' }]}>
              <Feather name="users" size={24} color={AstroBarColors.primary} />
            </View>
            <ThemedText type="h1" style={styles.metricValue}>
              {demandData?.totalActiveUsers || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Usuarios activos
            </ThemedText>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.metricIcon, { backgroundColor: '#4CAF50' + '20' }]}>
              <Feather name="map-pin" size={24} color="#4CAF50" />
            </View>
            <ThemedText type="h1" style={styles.metricValue}>
              {demandData?.businessesWithDemand || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Bares con demanda
            </ThemedText>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.metricIcon, { backgroundColor: '#FF9800' + '20' }]}>
              <Feather name="trending-up" size={24} color="#FF9800" />
            </View>
            <ThemedText type="h1" style={styles.metricValue}>
              {demandData?.averageUsersPerBusiness || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Promedio por bar
            </ThemedText>
          </View>
        </View>

        {/* Top bares con demanda */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Feather name="bar-chart-2" size={20} color={AstroBarColors.primary} />
            <ThemedText type="h3" style={styles.sectionTitle}>
              Bares con Mayor Demanda
            </ThemedText>
          </View>
          
          {demandData?.topBusinesses && demandData.topBusinesses.length > 0 ? (
            demandData.topBusinesses.map((business, index) => (
              <View key={business.id} style={styles.businessRow}>
                <View style={styles.businessRank}>
                  <ThemedText type="small" style={styles.rankText}>
                    #{index + 1}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={styles.businessName}>
                    {business.name}
                  </ThemedText>
                  <View style={styles.businessMeta}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      👥 {business.nearbyUsers} usuarios cerca
                    </ThemedText>
                    {business.hasFlashPromo && (
                      <View style={styles.flashBadge}>
                        <Feather name="zap" size={10} color="#FFD700" />
                        <ThemedText type="caption" style={styles.flashText}>
                          Flash
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.demandBar, { width: `${(business.nearbyUsers / (demandData?.totalActiveUsers || 1)) * 100}%` }]} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="map" size={32} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: 8 }}>
                No hay demanda activa en este momento
              </ThemedText>
            </View>
          )}
        </View>

        {/* Horarios pico */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={20} color={AstroBarColors.primary} />
            <ThemedText type="h3" style={styles.sectionTitle}>
              Horarios de Mayor Actividad
            </ThemedText>
          </View>
          
          {demandData?.peakHours && demandData.peakHours.length > 0 ? (
            demandData.peakHours.map((peak, index) => (
              <View key={peak.hour} style={styles.peakHourRow}>
                <ThemedText type="body" style={styles.hourText}>
                  {formatHour(peak.hour)}
                </ThemedText>
                <View style={styles.peakBarContainer}>
                  <View 
                    style={[
                      styles.peakBar, 
                      { 
                        width: `${(peak.users / (demandData?.totalActiveUsers || 1)) * 100}%`,
                        backgroundColor: index === 0 ? AstroBarColors.primary : '#E0E0E0'
                      }
                    ]} 
                  />
                </View>
                <ThemedText type="small" style={styles.peakUsers}>
                  {peak.users}
                </ThemedText>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="clock" size={32} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: 8 }}>
                Datos insuficientes para análisis horario
              </ThemedText>
            </View>
          )}
        </View>

        {/* Información adicional */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.primary + '10' }]}>
          <Feather name="info" size={20} color={AstroBarColors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText type="small" style={{ fontWeight: '600', color: AstroBarColors.primary }}>
              Análisis en Tiempo Real
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Los datos se actualizan automáticamente cada 30 segundos basándose en usuarios activos de la aplicación dentro de un radio de 2km de cada bar.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: AstroBarColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metricValue: {
    marginBottom: Spacing.xs,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: Spacing.md,
  },
  businessRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AstroBarColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: AstroBarColors.primary,
  },
  businessName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  flashText: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 10,
  },
  demandBar: {
    height: 4,
    backgroundColor: AstroBarColors.primary,
    borderRadius: 2,
    minWidth: 8,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  hourText: {
    width: 60,
    fontWeight: '600',
  },
  peakBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  peakBar: {
    height: '100%',
    borderRadius: 4,
  },
  peakUsers: {
    width: 40,
    textAlign: 'right',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
});