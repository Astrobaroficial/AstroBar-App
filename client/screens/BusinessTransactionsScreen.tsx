import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { AstroBarColors, Spacing } from "@/constants/theme";

interface Transaction {
  id: string;
  promotionId: string;
  userId: string;
  status: string;
  amountPaid: number;
  businessRevenue: number;
  platformCommission: number;
  createdAt: string;
  redeemedAt?: string;
  cancelledAt?: string;
}

export default function BusinessTransactionsScreen() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    try {
      const response = await apiRequest("/api/business/transactions");
      if (response.success) {
        setTransactions(response.transactions || []);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "redeemed": return "#4CAF50";
      case "cancelled": return "#F44336";
      case "pending": return "#FF9800";
      default: return theme.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "redeemed": return "Canjeado";
      case "cancelled": return "Cancelado";
      case "pending": return "Pendiente";
      default: return status;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.id, { color: theme.textSecondary }]}>#{item.id.slice(0, 8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Total pagado:</Text>
        <Text style={[styles.value, { color: theme.text }]}>${item.amountPaid}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Tu ingreso:</Text>
        <Text style={[styles.revenue, { color: AstroBarColors.primary }]}>${item.businessRevenue}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Comisión plataforma:</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>${item.platformCommission}</Text>
      </View>
      
      <Text style={[styles.date, { color: theme.textSecondary }]}>
        {new Date(item.createdAt).toLocaleString("es-AR")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AstroBarColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No hay transacciones aún
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  id: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  revenue: {
    fontSize: 16,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
