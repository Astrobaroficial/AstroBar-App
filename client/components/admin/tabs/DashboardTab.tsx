import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AstroBarColors, Spacing } from "../../../constants/theme";
import { DashboardMetrics, ActiveOrder, OnlineDriver, AdminStats } from "../types/admin.types";

interface DashboardTabProps {
  metrics: DashboardMetrics | null;
  activeOrders: ActiveOrder[];
  onlineDrivers: OnlineDriver[];
  stats?: AdminStats | null;
  onOrderPress?: (order: ActiveOrder) => void;
  onDriverPress?: (driver: OnlineDriver) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  metrics,
  activeOrders,
  onlineDrivers,
  stats,
  onOrderPress,
  onDriverPress,
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "pendiente":
        return AstroBarColors.warning;
      case "confirmed":
      case "confirmado":
        return "#3498DB";
      case "preparing":
      case "preparando":
        return AstroBarColors.primary;
      case "ready":
      case "listo":
        return AstroBarColors.success;
      case "in_transit":
      case "en camino":
        return "#9B59B6";
      case "delivered":
      case "entregado":
        return AstroBarColors.success;
      default:
        return "#666";
    }
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      preparing: "Preparando",
      ready: "Listo",
      in_transit: "En camino",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  const isDriverAvailable = (driver: OnlineDriver) => driver.activeOrder === null;
  const [showAllOrders, setShowAllOrders] = React.useState(false);
  const displayedOrders = showAllOrders ? activeOrders : activeOrders.slice(0, 5);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Métricas de Promociones</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.totalBars || 0}</Text>
          <Text style={styles.metricLabel}>Bares activos</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: AstroBarColors.primary }]}>
            {metrics?.activePromotions || 0}
          </Text>
          <Text style={styles.metricLabel}>Promociones</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: AstroBarColors.success }]}>
            {metrics?.totalUsers || 0}
          </Text>
          <Text style={styles.metricLabel}>Usuarios</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: AstroBarColors.warning }]}>
            {metrics?.pausedBusinesses || 0}
          </Text>
          <Text style={styles.metricLabel}>Pausados</Text>
        </View>
      </View>

      {stats ? (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Feather name="users" size={24} color={AstroBarColors.primary} />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="shopping-bag" size={24} color="#3498DB" />
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="dollar-sign" size={24} color={AstroBarColors.success} />
              <Text style={styles.statValue}>${(stats.totalRevenue / 100).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="clock" size={24} color={AstroBarColors.warning} />
              <Text style={styles.statValue}>{stats.pendingOrders}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Usuarios por rol</Text>
          <View style={styles.rolesGrid}>
            <View style={styles.roleCard}>
              <Text style={styles.roleLabel}>Clientes</Text>
              <Text style={styles.roleValue}>{stats.usersByRole.customers}</Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleLabel}>Negocios</Text>
              <Text style={styles.roleValue}>{stats.usersByRole.businesses}</Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleLabel}>Repartidores</Text>
              <Text style={styles.roleValue}>{stats.usersByRole.delivery}</Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleLabel}>Admins</Text>
              <Text style={styles.roleValue}>{stats.usersByRole.admins}</Text>
            </View>
          </View>
        </View>
      ) : null}



      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  linkText: {
    color: AstroBarColors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: AstroBarColors.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  secondaryMetricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  secondaryMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  mapSection: {
    marginBottom: 16,
  },
  mapPlaceholder: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mapText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  mapSubtext: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
  },
  statsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  roleLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  roleValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: AstroBarColors.primary,
  },
  section: {
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: AstroBarColors.primary,
  },
  orderAddress: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  orderDriver: {
    fontSize: 12,
    color: AstroBarColors.primary,
    fontWeight: "500",
  },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  adminActionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
});
