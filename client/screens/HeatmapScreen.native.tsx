import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

const { width } = Dimensions.get('window');

export default function HeatmapScreen() {
  const [loading, setLoading] = useState(true);
  const [heatmap, setHeatmap] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [heatmapRes, recsRes] = await Promise.all([
        api.get('/phase2/demand/heatmap'),
        api.get('/phase2/demand/recommendations'),
      ]);

      if (heatmapRes.data.success) {
        setHeatmap(heatmapRes.data.heatmap || []);
      }

      if (recsRes.data.success) {
        setRecommendations(recsRes.data.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Mapa de Demanda</Text>
        <Text style={styles.subtitle}>Zonas de alto consumo en tiempo real</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={region}
          customMapStyle={darkMapStyle}
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
                strokeColor="transparent"
              />
              <Marker
                coordinate={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                title={`Score: ${zone.heat_score}`}
                description={`Compras: ${zone.total_purchases}`}
              >
                <View style={styles.markerContainer}>
                  <Text style={styles.markerText}>{zone.heat_score}</Text>
                </View>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>
      </View>

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
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
];

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
    height: 300,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: '#FF6B35',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
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
