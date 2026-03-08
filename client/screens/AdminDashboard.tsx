import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../lib/api';
import { AstroBarColors } from '@/constants/theme';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalBars: 0, promotions: { totalActive: 0, acceptanceRate: 0, topBars: [] } });
  const [revenue, setRevenue] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [pointsStats, setPointsStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [metricsRes, promoRes, revenueRes, topUsersRes, pointsRes] = await Promise.all([
        api.get('/admin/dashboard/metrics'),
        api.get('/admin/promotions/dashboard'),
        api.get('/admin/revenue/stats'),
        api.get('/admin/users/top'),
        api.get('/admin/points/stats')
      ]);
      setStats({ ...metricsRes.data, promotions: promoRes.data.dashboard });
      setRevenue(revenueRes.data.stats);
      setTopUsers(topUsersRes.data.users || []);
      setPointsStats(pointsRes.data.stats);
    } catch (error: any) {
      console.error('Error loading stats:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Métricas en tiempo real</Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: '#4CAF50' }]}>
          <Feather name="users" size={32} color="#fff" />
          <Text style={styles.cardValue}>{stats.totalUsers}</Text>
          <Text style={styles.cardLabel}>Usuarios</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#2196F3' }]}>
          <Feather name="briefcase" size={32} color="#fff" />
          <Text style={styles.cardValue}>{stats.totalBars}</Text>
          <Text style={styles.cardLabel}>Bares</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#FF9800' }]}>
          <Feather name="zap" size={32} color="#fff" />
          <Text style={styles.cardValue}>{stats.promotions?.totalActive || 0}</Text>
          <Text style={styles.cardLabel}>Promociones</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#9C27B0' }]}>
          <Feather name="trending-up" size={32} color="#fff" />
          <Text style={styles.cardValue}>{stats.promotions?.acceptanceRate || 0}%</Text>
          <Text style={styles.cardLabel}>Aceptación</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Bares por Canjes</Text>
        {stats.promotions?.topBars?.map((bar: any, index: number) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{bar.name}</Text>
              <Text style={styles.listItemSubtitle}>{bar.count} canjes</Text>
            </View>
          </View>
        ))}
      </View>

      {revenue && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingresos de la Plataforma</Text>
          <View style={styles.revenueGrid}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Ingresos Totales</Text>
              <Text style={styles.revenueValue}>${(revenue.totalRevenue / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Comisión Plataforma</Text>
              <Text style={[styles.revenueValue, { color: AstroBarColors.primary }]}>${(revenue.platformRevenue / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Transacciones</Text>
              <Text style={styles.revenueValue}>{revenue.totalTransactions}</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Ticket Promedio</Text>
              <Text style={styles.revenueValue}>${(revenue.avgTransaction / 100).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {topUsers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Usuarios por Canjes</Text>
          {topUsers.slice(0, 5).map((user: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{user.name}</Text>
                <Text style={styles.listItemSubtitle}>{user.redemptions} canjes • ${(user.totalSpent / 100).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {pointsStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistema de Puntos</Text>
          <View style={styles.pointsGrid}>
            <View style={styles.pointsItem}>
              <Feather name="award" size={20} color="#CD7F32" />
              <Text style={styles.pointsLabel}>Copper</Text>
              <Text style={styles.pointsValue}>{pointsStats.copper || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={20} color="#CD7F32" />
              <Text style={styles.pointsLabel}>Bronze</Text>
              <Text style={styles.pointsValue}>{pointsStats.bronze || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={20} color="#C0C0C0" />
              <Text style={styles.pointsLabel}>Silver</Text>
              <Text style={styles.pointsValue}>{pointsStats.silver || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={20} color="#FFD700" />
              <Text style={styles.pointsLabel}>Gold</Text>
              <Text style={styles.pointsValue}>{pointsStats.gold || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={20} color="#E5E4E2" />
              <Text style={styles.pointsLabel}>Platinum</Text>
              <Text style={styles.pointsValue}>{pointsStats.platinum || 0}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { textAlign: 'center', padding: 32, fontSize: 16, color: '#666' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  card: { flex: 1, minWidth: '45%', padding: 20, borderRadius: 12, alignItems: 'center' },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  cardLabel: { fontSize: 12, color: '#fff', marginTop: 4, opacity: 0.9 },
  section: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: AstroBarColors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  listItemSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  revenueItem: { flex: 1, minWidth: '45%', padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 },
  revenueLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  revenueValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-around' },
  pointsItem: { alignItems: 'center', padding: 12 },
  pointsLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  pointsValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 2 },
});
