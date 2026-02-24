import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NemyColors, Spacing } from "../../../constants/theme";
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
        return NemyColors.warning;
      case "confirmed":
      case "confirmado":
        return "#3498DB";
      case "preparing":
      case "preparando":
        return NemyColors.primary;
      case "ready":
      case "listo":
        return NemyColors.success;
      case "in_transit":
      case "en camino":
        return "#9B59B6";
      case "delivered":
      case "entregado":
        return NemyColors.success;
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
      <Text style={styles.sectionTitle}>Métricas en Tiempo Real</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.ordersToday || 0}</Text>
          <Text style={styles.metricLabel}>Pedidos hoy</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: NemyColors.error }]}>
            {metrics?.cancelledToday || 0}
          </Text>
          <Text style={styles.metricLabel}>Cancelados</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.avgDeliveryTime || 35}m</Text>
          <Text style={styles.metricLabel}>Tiempo prom.</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: NemyColors.success }]}>
            {metrics?.driversOnline || 0}/{metrics?.totalDrivers || 1}
          </Text>
          <Text style={styles.metricLabel}>Repartidores</Text>
        </View>
      </View>

      <View style={styles.secondaryMetricsGrid}>
        <View style={[styles.metricCard, styles.secondaryMetric]}>
          <Feather name="package" size={20} color={NemyColors.primary} />
          <Text style={styles.secondaryValue}>{activeOrders.length}</Text>
          <Text style={styles.metricLabel}>Pedidos activos</Text>
        </View>
        <View style={[styles.metricCard, styles.secondaryMetric]}>
          <Feather name="pause-circle" size={20} color={NemyColors.warning} />
          <Text style={styles.secondaryValue}>{metrics?.pausedBusinesses || 0}</Text>
          <Text style={styles.metricLabel}>Pausados</Text>
        </View>
      </View>

      {/* Liquidaciones y Cuenta Bancaria */}
      <View style={styles.adminActionsGrid}>
        <View style={[styles.actionCard, { backgroundColor: NemyColors.warning + "15" }]}>
          <Feather name="dollar-sign" size={32} color={NemyColors.warning} />
          <Text style={styles.actionTitle}>Liquidaciones</Text>
          <Text style={styles.actionSubtitle}>Aprobar pagos semanales</Text>
        </View>
        <View style={[styles.actionCard, { backgroundColor: NemyColors.primary + "15" }]}>
          <Feather name="credit-card" size={32} color={NemyColors.primary} />
          <Text style={styles.actionTitle}>Cuenta Bancaria</Text>
          <Text style={styles.actionSubtitle}>Configurar datos</Text>
        </View>
      </View>

      <View style={styles.mapSection}>
        <Text style={styles.sectionTitle}>Mapa en tiempo real</Text>
        <View style={styles.mapPlaceholder}>
          <Feather name="map" size={48} color="#ccc" />
          <Text style={styles.mapText}>
            {Platform.OS === "web" 
              ? "Mapa disponible en la app móvil" 
              : "Cargando mapa..."}
          </Text>
          <Text style={styles.mapSubtext}>
            {onlineDrivers.length} repartidores | {activeOrders.length} pedidos activos
          </Text>
        </View>
      </View>

      {stats ? (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Feather name="users" size={24} color={NemyColors.primary} />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="shopping-bag" size={24} color="#3498DB" />
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="dollar-sign" size={24} color={NemyColors.success} />
              <Text style={styles.statValue}>${(stats.totalRevenue / 100).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="clock" size={24} color={NemyColors.warning} />
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

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pedidos activos hoy ({activeOrders.length})</Text>
          {activeOrders.length > 5 ? (
            <TouchableOpacity onPress={() => setShowAllOrders((prev) => !prev)}>
              <Text style={styles.linkText}>{showAllOrders ? "Ver menos" : "Ver todos"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No hay pedidos activos</Text>
          </View>
        ) : (
          displayedOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              activeOpacity={0.8}
              onPress={() => onOrderPress?.(order)}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderCustomer}>{order.customer?.name || "Cliente"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {translateStatus(order.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderTotal}>${((order.total || 0) / 100).toFixed(2)}</Text>
              </View>
              <Text style={styles.orderAddress} numberOfLines={1}>
                {order.deliveryAddress?.address || "Sin dirección"}
              </Text>
              <Text style={styles.orderDriver}>
                {order.driver?.name || "Sin asignar"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repartidores Online ({onlineDrivers.length})</Text>
        {onlineDrivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="truck" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No hay repartidores online</Text>
          </View>
        ) : (
          onlineDrivers.map((driver) => (
            <TouchableOpacity
              key={driver.id}
              style={styles.driverCard}
              activeOpacity={0.8}
              onPress={() => onDriverPress?.(driver)}
            >
              <View style={styles.driverInfo}>
                <View style={[styles.driverAvatar, { backgroundColor: NemyColors.primaryLight }]}>
                  <Feather name="user" size={16} color={NemyColors.primary} />
                </View>
                <Text style={styles.driverName}>{driver.name}</Text>
              </View>
              <View style={[
                styles.availabilityBadge, 
                { backgroundColor: isDriverAvailable(driver) ? NemyColors.success + "20" : NemyColors.warning + "20" }
              ]}>
                <View style={[
                  styles.availabilityDot,
                  { backgroundColor: isDriverAvailable(driver) ? NemyColors.success : NemyColors.warning }
                ]} />
                <Text style={[
                  styles.availabilityText,
                  { color: isDriverAvailable(driver) ? NemyColors.success : NemyColors.warning }
                ]}>
                  {isDriverAvailable(driver) ? "Disponible" : "Ocupado"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

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
    color: NemyColors.primary,
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
    color: NemyColors.primary,
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
    color: NemyColors.primary,
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
    color: NemyColors.primary,
  },
  orderAddress: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  orderDriver: {
    fontSize: 12,
    color: NemyColors.primary,
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
