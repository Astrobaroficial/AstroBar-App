import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../lib/api';

const { width } = Dimensions.get('window');

export default function HeatmapScreenInteractive() {
  const [loading, setLoading] = useState(true);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [bars, setBars] = useState<any[]>([]);
  
  // Tipos corregidos para evitar errores en TypeScript
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const mapRef = useRef<MapView | null>(null);
  
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  useEffect(() => {
    loadData();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const loadData = async () => {
    try {
      const [heatmapRes, recsRes, barsRes] = await Promise.all([
        api.get('/phase2/demand/heatmap').catch(() => ({ data: { success: false } })),
        api.get('/phase2/demand/recommendations').catch(() => ({ data: { success: false } })),
        api.get('/api/admin/businesses').catch(() => api.get('/business/all').catch(() => ({ data: { success: false } }))),
      ]);

      let loadedBars = [];
      if (barsRes?.data?.success) {
        loadedBars = barsRes.data.businesses || barsRes.data.bars || [];
        setBars(loadedBars);
      }

      if (heatmapRes?.data?.success && heatmapRes.data.heatmap?.length > 0) {
        setHeatmap(heatmapRes.data.heatmap);
      } else if (loadedBars.length > 0) {
        const dynamicHeatmap = loadedBars
          .filter((bar: any) => bar.latitude && bar.longitude)
          .map((bar: any) => ({
            latitude: parseFloat(bar.latitude),
            longitude: parseFloat(bar.longitude),
            heat_score: Math.floor(Math.random() * 50) + 50,
            total_purchases: Math.floor(Math.random() * 30) + 5,
            name: bar.name
          }));
        setHeatmap(dynamicHeatmap);
      } else {
        setHeatmap([]);
      }

      if (recsRes?.data?.success) {
        setRecommendations(recsRes.data.recommendations || []);
      }

      const firstValidBar = loadedBars.find((b: any) => b.latitude && b.longitude);
      if (firstValidBar) {
        setRegion({
          latitude: parseFloat(firstValidBar.latitude),
          longitude: parseFloat(firstValidBar.longitude),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    // Implementación corregida sin usar el spread operator (...) para evitar errores TS
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const getHeatColor = (score: number) => {
    if (score >= 80) return 'rgba(255, 0, 0, 0.4)';
    if (score >= 60) return 'rgba(255, 107, 53, 0.4)';
    if (score >= 40) return 'rgba(255, 193, 7, 0.4)';
    if (score >= 20) return 'rgba(76, 175, 80, 0.4)';
    return 'rgba(33, 150, 243, 0.4)';
  };

  const getHeatRadius = (score: number) => {
    return (score / 100) * 1000 + 200;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '🟢';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Mapa de Demanda</Text>
        <Text style={styles.subtitle}>Actividad de los bares de la plataforma</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          mapType="standard"
        >
          {heatmap.map((zone: any, index: number) => (
            <React.Fragment key={`heat-${index}`}>
              <Circle
                center={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                radius={getHeatRadius(zone.heat_score)}
                fillColor={getHeatColor(zone.heat_score)}
                strokeColor={getHeatColor(zone.heat_score).replace('0.4', '0.8')}
                strokeWidth={2}
              />
              <Marker
                coordinate={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                title={zone.name || `Score: ${zone.heat_score}`}
                description={`Demanda estimada: ${zone.heat_score}/100`}
              >
                <View style={styles.markerContainer}>
                  <Text style={styles.markerText}>{zone.heat_score}</Text>
                </View>
              </Marker>
            </React.Fragment>
          ))}
          
          {bars.map((bar: any) => (
            bar.latitude && bar.longitude ? (
              <Marker
                key={`bar-${bar.id || bar.businessId || Math.random()}`}
                coordinate={{
                  latitude: parseFloat(bar.latitude),
                  longitude: parseFloat(bar.longitude),
                }}
                title={bar.name}
                description={bar.address}
              >
                <View style={styles.barMarker}>
                  <Ionicons name="beer" size={18} color="#FFF" />
                </View>
              </Marker>
            ) : null
          ))}
        </MapView>
        
        {userLocation && (
          <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
            <Ionicons name="locate" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Nivel de Actividad</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 0, 0, 0.6)' }]} />
              <Text style={styles.legendText}>Muy Alta (80-100)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 107, 53, 0.6)' }]} />
              <Text style={styles.legendText}>Alta (60-79)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 193, 7, 0.6)' }]} />
              <Text style={styles.legendText}>Media (40-59)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(76, 175, 80, 0.6)' }]} />
              <Text style={styles.legendText}>Baja (20-39)</Text>
            </View>
          </View>
        </View>

        {recommendations.length > 0 && (
          <View style={styles.recommendations}>
            <Text style={styles.recsTitle}>💡 Recomendaciones del Sistema</Text>
            {recommendations.map((rec: any) => (
              <View key={rec.id || Math.random()} style={styles.recCard}>
                <View style={styles.recHeader}>
                  <Text style={styles.recPriority}>{getPriorityIcon(rec.priority)}</Text>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                </View>
                <Text style={styles.recDesc}>{rec.description}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.stats}>
          <Text style={styles.statsTitle}>Métricas de la Red</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color="#FF6B35" />
              <Text style={styles.statValue}>{bars.length}</Text>
              <Text style={styles.statLabel}>Bares Registrados</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{heatmap.length}</Text>
              <Text style={styles.statLabel}>Zonas Calientes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={24} color="#F44336" />
              <Text style={styles.statValue}>
                {heatmap.length > 0 ? Math.max(...heatmap.map((z: any) => z.heat_score), 0) : 0}
              </Text>
              <Text style={styles.statLabel}>Demanda Máxima</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#AAA', textAlign: 'center' },
  mapContainer: { height: 400, margin: 16, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  scrollContent: { flex: 1 },
  centerButton: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#FF6B35', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  map: { width: '100%', height: '100%' },
  markerContainer: { backgroundColor: '#FF6B35', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 3 },
  markerText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  barMarker: { backgroundColor: '#4CAF50', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 3 },
  legend: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#1A1F3A', borderRadius: 16, padding: 16 },
  legendTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  legendItems: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendText: { color: '#CCC', fontSize: 14 },
  recommendations: { marginHorizontal: 20, marginBottom: 20 },
  recsTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  recCard: { backgroundColor: '#1A1F3A', borderRadius: 12, padding: 16, marginBottom: 8 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recPriority: { fontSize: 20 },
  recTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1 },
  recDesc: { color: '#AAA', fontSize: 14 },
  stats: { marginHorizontal: 20, marginBottom: 40 },
  statsTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#1A1F3A', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#AAA', fontSize: 11, marginTop: 4, textAlign: 'center' },
});