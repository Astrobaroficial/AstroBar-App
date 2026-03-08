import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TextInput, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { AstroBarColors, Spacing } from "@/constants/theme";

interface Transaction {
  id: string;
  promotionId: string;
  userId: string;
  userName?: string;
  promotionTitle?: string;
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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTransactions = async () => {
    try {
      const response = await apiRequest("GET", "/api/business/transactions");
      if (response.success) {
        setTransactions(response.transactions || []);
        setFilteredTransactions(response.transactions || []);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [transactions, filterStatus, searchQuery]);

  const applyFilters = () => {
    let filtered = [...transactions];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.promotionTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTransactions(filtered);
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
      
      {item.promotionTitle && (
        <Text style={[styles.promoTitle, { color: theme.text }]}>{item.promotionTitle}</Text>
      )}
      
      {item.userName && (
        <Text style={[styles.userName, { color: theme.textSecondary }]}>Cliente: {item.userName}</Text>
      )}
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Total pagado:</Text>
        <Text style={[styles.value, { color: theme.text }]}>${(item.amountPaid / 100).toFixed(2)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Tu ingreso:</Text>
        <Text style={[styles.revenue, { color: AstroBarColors.primary }]}>${(item.businessRevenue / 100).toFixed(2)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Comisión plataforma:</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>${(item.platformCommission / 100).toFixed(2)}</Text>
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
      <View style={styles.filters}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Buscar por ID, usuario o promoción..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterButtons}>
          {['all', 'pending', 'redeemed', 'cancelled'].map(status => (
            <Pressable
              key={status}
              style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'redeemed' ? 'Canjeadas' : 'Canceladas'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AstroBarColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery || filterStatus !== 'all' ? 'No se encontraron transacciones' : 'No hay transacciones aún'}
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
  filters: {
    padding: Spacing.md,
    backgroundColor: 'transparent',
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 14,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: AstroBarColors.primary,
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    marginBottom: 8,
  },
});
