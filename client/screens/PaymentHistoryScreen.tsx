import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface Transaction {
  id: string;
  type: 'promotion_sale' | 'payout' | 'commission';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
  promotionTitle?: string;
  customerName?: string;
}

export default function PaymentHistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sales' | 'payouts'>('all');

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      const response = await apiRequest('GET', `/api/business/payment-history?filter=${filter}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      showToast('Error al cargar historial', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'promotion_sale': return 'trending-up';
      case 'payout': return 'download';
      case 'commission': return 'minus-circle';
      default: return 'dollar-sign';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return AstroBarColors.success;
      case 'pending': return AstroBarColors.warning;
      case 'failed': return AstroBarColors.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'sales') return t.type === 'promotion_sale';
    if (filter === 'payouts') return t.type === 'payout';
    return true;
  });

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filter Tabs */}
        <View style={[styles.filterTabs, { backgroundColor: theme.card }, Shadows.sm]}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'sales', label: 'Ventas' },
            { key: 'payouts', label: 'Retiros' }
          ].map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filter === tab.key ? AstroBarColors.primary : 'transparent'
                }
              ]}
              onPress={() => setFilter(tab.key as any)}
            >
              <ThemedText
                type="body"
                style={{
                  color: filter === tab.key ? '#FFFFFF' : theme.text,
                  fontWeight: filter === tab.key ? '600' : '400'
                }}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Cargando historial...
            </ThemedText>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Sin transacciones
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Aquí aparecerán tus ventas y retiros
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.transactionsList, { backgroundColor: theme.card }, Shadows.sm]}>
            {filteredTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < filteredTransactions.length - 1 ? 1 : 0
                  }
                ]}
              >
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: `${getStatusColor(transaction.status)}20` }
                ]}>
                  <Feather
                    name={getTransactionIcon(transaction.type)}
                    size={20}
                    color={getStatusColor(transaction.status)}
                  />
                </View>

                <View style={styles.transactionContent}>
                  <View style={styles.transactionHeader}>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>
                      {transaction.description}
                    </ThemedText>
                    <ThemedText
                      type="body"
                      style={{
                        color: transaction.type === 'commission' ? AstroBarColors.error : AstroBarColors.success,
                        fontWeight: '600'
                      }}
                    >
                      {transaction.type === 'commission' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </ThemedText>
                  </View>

                  <View style={styles.transactionDetails}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {formatDate(transaction.createdAt)}
                    </ThemedText>
                    <Badge
                      text={getStatusText(transaction.status)}
                      variant={
                        transaction.status === 'completed' ? 'success' :
                        transaction.status === 'pending' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </View>

                  {transaction.promotionTitle && (
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                      Promoción: {transaction.promotionTitle}
                    </ThemedText>
                  )}

                  {transaction.customerName && (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Cliente: {transaction.customerName}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  filterTabs: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center'
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center'
  },
  transactionsList: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden'
  },
  transactionItem: {
    flexDirection: 'row',
    padding: Spacing.lg,
    alignItems: 'flex-start'
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md
  },
  transactionContent: { flex: 1 },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});