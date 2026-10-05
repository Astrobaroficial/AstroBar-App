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
import { useNavigation } from "@react-navigation/native";
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
} from "@/components/admin/types/admin.types";

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  usersByRole: {
    customers: number;
    businesses: number;
    delivery: number;
    admins: number;
  };
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      console.log("=== INICIANDO CARGA DE DASHBOARD ADMIN ===");

      // 1. Cargar Métricas/Stats (El más importante)
      try {
        const metricsRes = await apiRequest("GET", "/api/admin/dashboard/metrics");
        const metricsText = await metricsRes.text();
        const metricsData = JSON.parse(metricsText);
        
        const payload = metricsData.metrics || metricsData.stats || metricsData.dashboard || metricsData;
        setDashboardMetrics(payload);
        
        // ¡Solución al espacio en blanco! Asignamos también a stats
        setStats(payload); 
      } catch (e: any) {
        console.error("❌ Error cargando metrics:", e.message);
      }

      // 2. Cargar Órdenes Activas
      try {
        const ordersRes = await apiRequest("GET", "/api/admin/dashboard/active-orders");
        const ordersData = await ordersRes.json();
        setActiveOrders(ordersData.orders || []);
      } catch (e: any) {
        console.error("❌ Error cargando órdenes:", e.message);
      }

      // 3. Cargar Conductores
      try {
        const driversRes = await apiRequest("GET", "/api/admin/dashboard/online-drivers");
        const driversData = await driversRes.json();
        setOnlineDrivers(driversData.drivers || []);
      } catch (e: any) {
        console.error("❌ Error cargando conductores:", e.message);
      }

    } catch (error) {
      console.error("Error general en dashboard:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
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