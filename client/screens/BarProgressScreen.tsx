import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import api from '../lib/api';

export default function BarProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await api.get('/phase2/bar-progress/my');
      if (response.data.success) {
        setProgress(response.data.progress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: any = {
      bronze: ['#CD7F32', '#8B4513'],
      silver: ['#C0C0C0', '#808080'],
      gold: ['#FFD700', '#FFA500'],
      platinum: ['#E5E4E2', '#B0B0B0'],
      diamond: ['#B9F2FF', '#4FC3F7'],
    };
    return colors[level?.toLowerCase()] || ['#666', '#333'];
  };

  const getLevelIcon = (level: string) => {
    const icons: any = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '💠',
    };
    return icons[level?.toLowerCase()] || '⭐';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No se encontró información de progreso</Text>
      </View>
    );
  }

  const benefits = progress.benefits ? JSON.parse(progress.benefits) : { features: [] };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={getLevelColor(progress.current_level)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.levelIcon}>{getLevelIcon(progress.current_level)}</Text>
        <Text style={styles.levelName}>{progress.current_level?.toUpperCase()}</Text>
        <Text style={styles.levelNumber}>Nivel {progress.current_level_number}</Text>
      </LinearGradient>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Progreso al Siguiente Nivel</Text>
          <Text style={styles.progressPercent}>{progress.progress_percentage || 0}%</Text>
        </View>

        <Progress.Bar
          progress={(progress.progress_percentage || 0) / 100}
          width={null}
          height={12}
          color="#FF6B35"
          unfilledColor="#1A1F3A"
          borderWidth={0}
          borderRadius={6}
        />

        {progress.next_level && (
          <Text style={styles.nextLevel}>
            Próximo nivel: {progress.next_level.toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Estadísticas del Mes</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>${((progress.monthly_sales || 0) / 100).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Ventas Mensuales</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="pricetag" size={32} color="#FF6B35" />
            <Text style={styles.statValue}>{progress.monthly_promotions || 0}</Text>
            <Text style={styles.statLabel}>Promociones</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <Text style={styles.statValue}>{progress.avg_rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating Promedio</Text>
          </View>
        </View>
      </View>

      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Beneficios Actuales</Text>

        {progress.commission_discount > 0 && (
          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Ionicons name="trending-down" size={24} color="#4CAF50" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Descuento en Comisión</Text>
              <Text style={styles.benefitDesc}>
                {(progress.commission_discount * 100).toFixed(0)}% de descuento en la comisión de plataforma
              </Text>
            </View>
          </View>
        )}

        {benefits.features && benefits.features.map((feature: string, index: number) => (
          <View key={index} style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{feature.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Totales Históricos</Text>

        <View style={styles.historyCard}>
          <View style={styles.historyItem}>
            <Text style={styles.historyLabel}>Ventas Totales</Text>
            <Text style={styles.historyValue}>${((progress.total_sales || 0) / 100).toFixed(0)}</Text>
          </View>

          <View style={styles.historyItem}>
            <Text style={styles.historyLabel}>Promociones Totales</Text>
            <Text style={styles.historyValue}>{progress.total_promotions || 0}</Text>
          </View>

          {progress.last_level_up && (
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Último Ascenso</Text>
              <Text style={styles.historyValue}>
                {new Date(progress.last_level_up).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 40,
    alignItems: 'center',
  },
  levelIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  levelName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  progressSection: {
    margin: 20,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressPercent: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
  },
  nextLevel: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  statsSection: {
    margin: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  benefitsSection: {
    margin: 20,
  },
  benefitCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  benefitDesc: {
    color: '#AAA',
    fontSize: 14,
  },
  historySection: {
    margin: 20,
    marginBottom: 40,
  },
  historyCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  historyLabel: {
    color: '#AAA',
    fontSize: 14,
  },
  historyValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
