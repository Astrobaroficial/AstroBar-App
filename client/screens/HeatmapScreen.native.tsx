import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../lib/api';

const { width } = Dimensions.get('window');

// Datos de ejemplo de zonas de Buenos Aires
const SAMPLE_ZONES = [
  { latitude: -34.5889, longitude: -58.3974, heat_score: 85, total_purchases: 45, name: 'Palermo' },
  { latitude: -34.6037, longitude: -58.3816, heat_score: 72, total_purchases: 38, name: 'Recoleta' },
  { latitude: -34.6158, longitude: -58.4333, heat_score: 68, total_purchases: 32, name: 'Caballito' },
  { latitude: -34.6345, longitude: -58.3678, heat_score: 55, total_purchases: 28, name: 'San Telmo' },
  { latitude: -34.6092, longitude: -58.4370, heat_score: 48, total_purchases: 22, name: 'Almagro' },
];

export default function HeatmapScreen() {
  const [loading, setLoading] = useState(true);
  const [heatmap, setHeatmap] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [bars, setBars] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });
  const mapRef = React.useRef(null);

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
        api.get('/phase2/demand/heatmap'),
        api.get('/phase2/demand/recommendations'),
        api.get('/business/all'),
      ]);

      if (heatmapRes.data.success && heatmapRes.data.heatmap?.length > 0) {
        setHeatmap(heatmapRes.data.heatmap);
      } else {
        setHeatmap(SAMPLE_ZONES);
      }

      if (recsRes.data.success) {
        setRecommendations(recsRes.data.recommendations || []);
      }

      if (barsRes.data.success) {
        setBars(barsRes.data.businesses || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setHeatmap(SAMPLE_ZONES);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
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
        <Text style={styles.subtitle}>Zonas de alto consumo en tiempo real</Text>
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
            <React.Fragment key={index}>
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
                description={`Compras: ${zone.total_purchases} | Demanda: ${zone.heat_score}/100`}
              >
                <View style={styles.markerContainer}>
                  <Text style={styles.markerText}>{zone.heat_score}</Text>
                </View>
              </Marker>
            </React.Fragment>
          ))}
          
          {bars.map((bar: any) => (
            <Marker
              key={`bar-${bar.id}`}
              coordinate={{
                latitude: parseFloat(bar.latitude),
                longitude: parseFloat(bar.longitude),
              }}
              title={bar.name}
              description={bar.address}
            >
              <View style={styles.barMarker}>
                <Ionicons name="beer" size={20} color="#FFF" />
              </View>
            </Marker>
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
        <Text style={styles.legendTitle}>Leyenda</Text>
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
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(33, 150, 243, 0.6)' }]} />
            <Text style={styles.legendText}>Muy Baja (0-19)</Text>
          </View>
        </View>
      </View>

      {recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.recsTitle}>💡 Recomendaciones para tu Bar</Text>
          {recommendations.map((rec: any) => (
            <View key={rec.id} style={styles.recCard}>
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
        <Text style={styles.statsTitle}>Estadísticas Generales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="location" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{heatmap.length}</Text>
            <Text style={styles.statLabel}>Zonas Activas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>
              {heatmap.reduce((sum: number, z: any) => sum + z.total_purchases, 0)}
            </Text>
            <Text style={styles.statLabel}>Compras Totales</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#F44336" />
            <Text style={styles.statValue}>
              {Math.max(...heatmap.map((z: any) => z.heat_score), 0)}
            </Text>
            <Text style={styles.statLabel}>Score Máximo</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  mapContainer: {
    height: 400,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollContent: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FF6B35',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  markerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barMarker: {
    backgroundColor: '#9C27B0',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
  },
  legend: {
    margin: 20,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
  },
  legendTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    color: '#CCC',
    fontSize: 14,
  },
  recommendations: {
    margin: 20,
  },
  recsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recPriority: {
    fontSize: 20,
  },
  recTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  recDesc: {
    color: '#AAA',
    fontSize: 14,
  },
  stats: {
    margin: 20,
  },
  statsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
