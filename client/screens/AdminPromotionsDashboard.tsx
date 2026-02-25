import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../lib/query-client';

interface PromoDashboard {
  totalActive: number;
  totalFlash: number;
  totalCommon: number;
  acceptanceRate: number;
  avgRedemptionTime: number;
  topBars: { name: string; count: number }[];
}

export default function AdminPromotionsDashboard() {
  const [dashboard, setDashboard] = useState<PromoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/promotions/dashboard');
      const data = await response.json();
      setDashboard(data.dashboard);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error al cargar dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadDashboard();
        }} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard de Promociones</Text>
        <Text style={styles.subtitle}>Métricas en tiempo real</Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.card, styles.primaryCard]}>
          <Ionicons name="flash" size={32} color="#FFD700" />
          <Text style={styles.cardValue}>{dashboard.totalActive}</Text>
          <Text style={styles.cardLabel}>Promociones Activas</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="zap" size={28} color="#FFA726" />
          <Text style={styles.cardValue}>{dashboard.totalFlash}</Text>
          <Text style={styles.cardLabel}>Flash Activas</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="gift" size={28} color="#4CAF50" />
          <Text style={styles.cardValue}>{dashboard.totalCommon}</Text>
          <Text style={styles.cardLabel}>Comunes Activas</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="trending-up" size={28} color="#2196F3" />
          <Text style={styles.cardValue}>{dashboard.acceptanceRate}%</Text>
          <Text style={styles.cardLabel}>Tasa Aceptación</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tiempo Promedio de Canje</Text>
        <View style={styles.timeCard}>
          <Ionicons name="time" size={48} color="#FFD700" />
          <Text style={styles.timeValue}>{dashboard.avgRedemptionTime} min</Text>
          <Text style={styles.timeLabel}>Desde aceptación hasta canje</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Bares por Canjes</Text>
        {dashboard.topBars.map((bar, index) => (
          <View key={index} style={styles.barRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={styles.barName}>{bar.name}</Text>
            <Text style={styles.barCount}>{bar.count} canjes</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  loadingText: { color: '#FFF', fontSize: 16 },
  errorText: { color: '#EF5350', fontSize: 16 },
  header: { padding: 20, backgroundColor: '#1A1F3A', borderBottomWidth: 1, borderBottomColor: '#2A2F4A' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  card: {
    width: '48%',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  primaryCard: { borderColor: '#FFD700', borderWidth: 2 },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginTop: 8 },
  cardLabel: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 },
  section: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  timeCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  timeValue: { fontSize: 36, fontWeight: 'bold', color: '#FFD700', marginTop: 12 },
  timeLabel: { fontSize: 12, color: '#999', marginTop: 8 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  barName: { flex: 1, fontSize: 14, color: '#FFF' },
  barCount: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50' },
});
