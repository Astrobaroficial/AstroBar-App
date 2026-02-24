import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface UserStats {
  totalPoints: number;
  promotionsRedeemed: number;
  currentLevel: string;
  barsVisited: number;
  totalSpent: number;
  pointsToNextLevel: number;
}

export default function UserProfileStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const response = await api.get('/user/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'copper': return { name: 'Copper', color: '#CD7F32', min: 0, max: 99 };
      case 'bronze': return { name: 'Bronze', color: '#CD7F32', min: 100, max: 249 };
      case 'silver': return { name: 'Silver', color: '#C0C0C0', min: 250, max: 499 };
      case 'gold': return { name: 'Gold', color: '#FFD700', min: 500, max: 999 };
      case 'platinum': return { name: 'Platinum', color: '#E5E4E2', min: 1000, max: Infinity };
      default: return { name: 'Copper', color: '#CD7F32', min: 0, max: 99 };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error al cargar estadísticas</Text>
      </View>
    );
  }

  const levelInfo = getLevelInfo(stats.currentLevel);
  const progress = ((stats.totalPoints - levelInfo.min) / (levelInfo.max - levelInfo.min)) * 100;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadStats();
        }} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#FFF" />
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <Ionicons name="trophy" size={32} color={levelInfo.color} />
          <Text style={[styles.levelName, { color: levelInfo.color }]}>
            {levelInfo.name}
          </Text>
        </View>
        
        <View style={styles.pointsRow}>
          <Text style={styles.points}>{stats.totalPoints} puntos</Text>
          {levelInfo.max !== Infinity && (
            <Text style={styles.nextLevel}>
              {stats.pointsToNextLevel} para siguiente nivel
            </Text>
          )}
        </View>

        {levelInfo.max !== Infinity && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: levelInfo.color }]} />
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.promotionsRedeemed}</Text>
          <Text style={styles.statLabel}>Promociones Canjeadas</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="business" size={32} color="#FFD700" />
          <Text style={styles.statValue}>{stats.barsVisited}</Text>
          <Text style={styles.statLabel}>Bares Visitados</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cash" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>${stats.totalSpent}</Text>
          <Text style={styles.statLabel}>Total Gastado</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="star" size={32} color="#FFD700" />
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Puntos Totales</Text>
        </View>
      </View>

      <View style={styles.achievements}>
        <Text style={styles.sectionTitle}>Logros</Text>
        
        {stats.promotionsRedeemed >= 1 && (
          <View style={styles.achievement}>
            <Ionicons name="ribbon" size={24} color="#FFD700" />
            <Text style={styles.achievementText}>Primera Promoción Canjeada</Text>
          </View>
        )}

        {stats.promotionsRedeemed >= 10 && (
          <View style={styles.achievement}>
            <Ionicons name="ribbon" size={24} color="#FFD700" />
            <Text style={styles.achievementText}>10 Promociones Canjeadas</Text>
          </View>
        )}

        {stats.barsVisited >= 5 && (
          <View style={styles.achievement}>
            <Ionicons name="ribbon" size={24} color="#FFD700" />
            <Text style={styles.achievementText}>Explorador (5 bares)</Text>
          </View>
        )}

        {stats.currentLevel === 'platinum' && (
          <View style={styles.achievement}>
            <Ionicons name="ribbon" size={24} color="#E5E4E2" />
            <Text style={styles.achievementText}>Nivel Platinum Alcanzado</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  loadingText: { color: '#FFF', fontSize: 16 },
  errorText: { color: '#EF5350', fontSize: 16 },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1A1F3A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2A2F4A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  email: { fontSize: 14, color: '#999' },
  levelCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  levelName: { fontSize: 28, fontWeight: 'bold' },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  points: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  nextLevel: { fontSize: 12, color: '#999' },
  progressBar: {
    height: 8,
    backgroundColor: '#2A2F4A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  achievements: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  achievementText: { fontSize: 14, color: '#FFF', flex: 1 },
});
