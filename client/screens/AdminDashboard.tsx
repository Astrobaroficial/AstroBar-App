import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
// CAMBIO CRÍTICO: Usamos el apiRequest nativo de tu app, eliminando el viejo '../lib/api' que causaba el crash
import { apiRequest } from '@/lib/query-client';
import { AstroBarColors } from '@/constants/theme';
import { useTheme } from "@/hooks/useTheme";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalBars: 0, activePromotions: 0, promotions: { totalActive: 0, acceptanceRate: 0, topBars: [] } });
  const [revenue, setRevenue] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [pointsStats, setPointsStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { theme } = useTheme();
  const isDark = theme?.background === "#000000" || theme?.background === "black" || theme?.background === "#121212";

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    // 1. Métricas Principales
    try {
      const res = await apiRequest("GET", "/api/admin/dashboard/metrics");
      if (res.ok) {
        const data = await res.json();
        const payload = data?.metrics || data?.stats || data;
        if (typeof payload === 'object' && !Array.isArray(payload)) {
          setStats((prev: any) => ({ ...prev, ...payload }));
        }
      }
    } catch (error: any) {
      console.log('❌ Error metrics:', error.message);
    }

    // 2. Promociones
    try {
      const res = await apiRequest("GET", "/api/admin/promotions/dashboard");
      if (res.ok) {
        const data = await res.json();
        const promoData = data?.dashboard || data;
        if (typeof promoData === 'object' && !Array.isArray(promoData)) {
          setStats((prev: any) => ({ ...prev, promotions: promoData }));
        }
      }
    } catch (error: any) {
      console.log('❌ Error promotions:', error.message);
    }

    // 3. Ingresos (Revenue)
    try {
      const res = await apiRequest("GET", "/api/admin/revenue/stats");
      if (res.ok) {
        const data = await res.json();
        const revData = data?.stats || data;
        if (typeof revData === 'object') setRevenue(revData);
      }
    } catch (error: any) {
      console.log('❌ Error revenue:', error.message);
    }

    // 4. Top Usuarios
    try {
      const res = await apiRequest("GET", "/api/admin/users/top");
      if (res.ok) {
        const data = await res.json();
        const usersData = data?.users || data;
        setTopUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (error: any) {
      console.log('❌ Error top users:', error.message);
      setTopUsers([]);
    }

    // 5. Sistema de Puntos
    try {
      const res = await apiRequest("GET", "/api/admin/points/stats");
      if (res.ok) {
        const data = await res.json();
        const ptsData = data?.stats || data;
        if (typeof ptsData === 'object') setPointsStats(ptsData);
      }
    } catch (error: any) {
      console.log('❌ Error points:', error.message);
    }

    setLoading(false);
  };

  const bgContainer = isDark ? '#0b111e' : '#f5f5f5';
  const bgSurface = isDark ? '#111927' : '#ffffff';
  const bgElement = isDark ? '#1f293d' : '#f5f5f5';
  const textTitle = isDark ? '#ffffff' : '#333333';
  const textSub = isDark ? '#94a3b8' : '#666666';
  const borderStyle = isDark ? '#1e293b' : '#f0f0f0';

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: bgContainer }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={textTitle} />}
    >
      <View style={[styles.header, { backgroundColor: bgSurface }]}>
        <Text style={[styles.title, { color: textTitle }]}>Panel de Control</Text>
        <Text style={[styles.subtitle, { color: textSub }]}>Métricas comerciales en tiempo real</Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: isDark ? '#152238' : '#4CAF50', borderColor: isDark ? '#00f2fe' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
          <Feather name="users" size={26} color={isDark ? '#00f2fe' : '#fff'} />
          <Text style={styles.cardValue}>{Number(stats.totalUsers) || 0}</Text>
          <Text style={[styles.cardLabel, { color: isDark ? '#94a3b8' : '#fff' }]}>Usuarios Totales</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#152238' : '#2196F3', borderColor: isDark ? '#3b82f6' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
          <Feather name="briefcase" size={26} color={isDark ? '#3b82f6' : '#fff'} />
          <Text style={styles.cardValue}>{Number(stats.totalBars) || 0}</Text>
          <Text style={[styles.cardLabel, { color: isDark ? '#94a3b8' : '#fff' }]}>Bares Aliados</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#152238' : '#FF9800', borderColor: isDark ? '#ff9f43' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
          <Feather name="zap" size={26} color={isDark ? '#ff9f43' : '#fff'} />
          <Text style={styles.cardValue}>{Number(stats.activePromotions || stats.promotions?.totalActive) || 0}</Text>
          <Text style={[styles.cardLabel, { color: isDark ? '#94a3b8' : '#fff' }]}>Promos Activas</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? '#152238' : '#9C27B0', borderColor: isDark ? '#a55eea' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
          <Feather name="trending-up" size={26} color={isDark ? '#a55eea' : '#fff'} />
          <Text style={styles.cardValue}>{Number(stats.promotions?.acceptanceRate) || 0}%</Text>
          <Text style={[styles.cardLabel, { color: isDark ? '#94a3b8' : '#fff' }]}>% Aceptación</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: bgSurface }]}>
        <Text style={[styles.sectionTitle, { color: textTitle }]}>Top Rankings de Bares</Text>
        {Array.isArray(stats?.promotions?.topBars) && stats.promotions.topBars.map((bar: any, index: number) => (
          <View key={index} style={[styles.listItem, { borderBottomColor: borderStyle }]}>
            <View style={[styles.rank, { backgroundColor: AstroBarColors.primary }]}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={[styles.listItemTitle, { color: textTitle }]}>{String(bar.name || 'Desconocido')}</Text>
              <Text style={[styles.listItemSubtitle, { color: textSub }]}>{Number(bar.count) || 0} canjes completados</Text>
            </View>
          </View>
        ))}
      </View>

      {revenue && typeof revenue === 'object' && (
        <View style={[styles.section, { backgroundColor: bgSurface }]}>
          <Text style={[styles.sectionTitle, { color: textTitle }]}>Caja e Ingresos de Plataforma</Text>
          <View style={styles.revenueGrid}>
            <View style={[styles.revenueItem, { backgroundColor: bgElement }]}>
              <Text style={[styles.revenueLabel, { color: textSub }]}>Facturación Total</Text>
              <Text style={[styles.revenueValue, { color: textTitle }]}>${Number(revenue.totalRevenue || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.revenueItem, { backgroundColor: bgElement, borderColor: isDark ? '#39ff14' : 'transparent', borderWidth: isDark ? 0.5 : 0 }]}>
              <Text style={[styles.revenueLabel, { color: textSub }]}>Comisión Neta</Text>
              <Text style={[styles.revenueValue, { color: isDark ? '#39ff14' : AstroBarColors.primary }]}>${Number(revenue.platformRevenue || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.revenueItem, { backgroundColor: bgElement }]}>
              <Text style={[styles.revenueLabel, { color: textSub }]}>Volumen Transacciones</Text>
              <Text style={[styles.revenueValue, { color: textTitle }]}>{Number(revenue.totalTransactions) || 0}</Text>
            </View>
            <View style={[styles.revenueItem, { backgroundColor: bgElement }]}>
              <Text style={[styles.revenueLabel, { color: textSub }]}>Ticket Promedio</Text>
              <Text style={[styles.revenueValue, { color: textTitle }]}>${Number(revenue.avgTransaction || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {Array.isArray(topUsers) && topUsers.length > 0 && (
        <View style={[styles.section, { backgroundColor: bgSurface }]}>
          <Text style={[styles.sectionTitle, { color: textTitle }]}>Clientes Premium (Mayor Canje)</Text>
          {topUsers.slice(0, 5).map((user: any, index: number) => (
            <View key={index} style={[styles.listItem, { borderBottomColor: borderStyle }]}>
              <View style={[styles.rank, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: textTitle }]}>{String(user.name || 'Cliente')}</Text>
                <Text style={[styles.listItemSubtitle, { color: textSub }]}>{Number(user.redemptions) || 0} visitas • Consumo: ${Number(user.totalSpent || 0).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {pointsStats && typeof pointsStats === 'object' && (
        <View style={[styles.section, { backgroundColor: bgSurface, marginBottom: 25 }]}>
          <Text style={[styles.sectionTitle, { color: textTitle }]}>Distribución de Rangos de Clientes</Text>
          <View style={styles.pointsGrid}>
            <View style={styles.pointsItem}>
              <Feather name="award" size={22} color="#CD7F32" />
              <Text style={[styles.pointsLabel, { color: textSub }]}>Copper</Text>
              <Text style={[styles.pointsValue, { color: textTitle }]}>{Number(pointsStats.copper) || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={22} color="#b87333" />
              <Text style={[styles.pointsLabel, { color: textSub }]}>Bronze</Text>
              <Text style={[styles.pointsValue, { color: textTitle }]}>{Number(pointsStats.bronze) || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={22} color="#C0C0C0" />
              <Text style={[styles.pointsLabel, { color: textSub }]}>Silver</Text>
              <Text style={[styles.pointsValue, { color: textTitle }]}>{Number(pointsStats.silver) || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={22} color="#FFD700" />
              <Text style={[styles.pointsLabel, { color: textSub }]}>Gold</Text>
              <Text style={[styles.pointsValue, { color: textTitle }]}>{Number(pointsStats.gold) || 0}</Text>
            </View>
            <View style={styles.pointsItem}>
              <Feather name="award" size={22} color="#E5E4E2" />
              <Text style={[styles.pointsLabel, { color: textSub }]}>Platinum</Text>
              <Text style={[styles.pointsValue, { color: textTitle }]}>{Number(pointsStats.platinum) || 0}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 22, paddingBottom: 18, borderBottomWidth: 0.5, borderBottomColor: '#1e293b20' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  card: { flex: 1, minWidth: '45%', padding: 18, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardValue: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 8, letterSpacing: 0.5 },
  cardLabel: { fontSize: 12, marginTop: 4, fontWeight: '600', opacity: 0.9 },
  section: { margin: 12, padding: 18, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 0.2 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: '600' },
  listItemSubtitle: { fontSize: 12, marginTop: 3 },
  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  revenueItem: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 10 },
  revenueLabel: { fontSize: 11, marginBottom: 6, fontWeight: '600' },
  revenueValue: { fontSize: 19, fontWeight: 'bold' },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-around' },
  pointsItem: { alignItems: 'center', padding: 10, minWidth: '18%' },
  pointsLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  pointsValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
});
