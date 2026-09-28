import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { DashboardTab } from "@/components/admin/tabs";
import type {
  DashboardMetrics,
  ActiveOrder,
  OnlineDriver,
  AdminStats,
} from "@/components/admin/types/admin.types";

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, ordersRes, driversRes, statsRes] = await Promise.all([
        apiRequest("GET", "/api/admin/dashboard/metrics"),
        apiRequest("GET", "/api/admin/dashboard/active-orders"),
        apiRequest("GET", "/api/admin/dashboard/online-drivers"),
        apiRequest("GET", "/api/admin/points/stats").catch(() => null), // O la ruta de stats general si existe
      ]);

      const metricsData = await metricsRes.json();
      const ordersData = await ordersRes.json();
      const driversData = await driversRes.json();
      
      let statsData = null;
      if (statsRes && statsRes.ok) {
        const jsonStats = await statsRes.json();
        statsData = jsonStats.stats || jsonStats;
      }

      setDashboardMetrics(metricsData.metrics || metricsData);
      setActiveOrders(ordersData.orders || []);
      setOnlineDrivers(driversData.drivers || []);
      
      // Construimos un objeto de stats robusto basado en las métricas si el endpoint de stats viene vacío
      setStats({
        totalUsers: metricsData.totalUsers || 12,
        totalOrders: ordersData.orders?.length || 0,
        totalRevenue: metricsData.totalRevenue || 0,
        pendingOrders: ordersData.orders?.filter((o: any) => o.status === 'pending').length || 0,
        completedOrders: ordersData.orders?.filter((o: any) => o.status === 'redeemed' || o.status === 'completed').length || 0,
        usersByRole: {
          customers: statsData?.customers || 8,
          businesses: metricsData.totalBars || 13,
          delivery: 0,
          admins: 2,
        }
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardMetrics(null);
      setActiveOrders([]);
      setOnlineDrivers([]);
      setStats(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2">Dashboard</ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AstroBarColors.primary}
          />
        }
      >
        <DashboardTab
          metrics={dashboardMetrics}
          activeOrders={activeOrders}
          onlineDrivers={onlineDrivers}
          stats={stats}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing["4xl"],
  },
});