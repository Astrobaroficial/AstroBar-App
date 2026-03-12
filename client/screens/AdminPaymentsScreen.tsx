import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface PaymentStats {
  totalRevenue: number;
  totalCommissions: number;
  totalTransactions: number;
  pendingPayments: number;
  completedPayments: number;
  barsWithoutMP: number;
  customersWithMP: number;
  averageCommission: number;
}

interface RecentTransaction {
  id: string;
  businessName: string;
  customerName: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
}

export default function AdminPaymentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPaymentStats();
  }, []);

  const loadPaymentStats = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/payment-stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setTransactions(data.recentTransactions || []);
      }
    } catch (error) {
      console.error('Error loading payment stats:', error);
      showToast('Error al cargar estadísticas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentStats();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'redeemed':
        return AstroBarColors.success;
      case 'pending':
        return AstroBarColors.warning;
      case 'cancelled':
        return AstroBarColors.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
      case 'redeemed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AstroBarColors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AstroBarColors.primary} />
        }
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: AstroBarColors.primary }, Shadows.lg]}>
          <View style={styles.headerIcon}>
            <Feather name="dollar-sign" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ color: '#FFFFFF', marginTop: Spacing.md }}>
            Pagos y Comisiones
          </ThemedText>
          <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9, marginTop: Spacing.xs }}>
            Monitoreo global de transacciones
          </ThemedText>
        </View>

        {/* Revenue Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="trending-up" size={20} color={AstroBarColors.success} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.success }}>
              {formatCurrency(stats?.totalRevenue || 0)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Ingresos Totales</ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="percent" size={20} color={AstroBarColors.primary} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
              {formatCurrency(stats?.totalCommissions || 0)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Comisiones</ThemedText>
          </View>
        </View>

        {/* Transaction Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="activity" size={20} color={AstroBarColors.info} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.info }}>
              {stats?.totalTransactions || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Transacciones</ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="clock" size={20} color={AstroBarColors.warning} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.warning }}>
              {stats?.pendingPayments || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Pendientes</ThemedText>
          </View>
        </View>

        {/* MP Connection Stats */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Estado de Mercado Pago</ThemedText>
          
          <View style={styles.mpStatItem}>
            <View style={styles.mpStatLeft}>
              <Feather name="check-circle" size={20} color={AstroBarColors.success} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Clientes con MP
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ color: AstroBarColors.success }}>
              {stats?.customersWithMP || 0}
            </ThemedText>
          </View>

          <View style={styles.mpStatItem}>
            <View style={styles.mpStatLeft}>
              <Feather name="alert-circle" size={20} color={AstroBarColors.error} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Bares sin MP
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ color: AstroBarColors.error }}>
              {stats?.barsWithoutMP || 0}
            </ThemedText>
          </View>

          <View style={styles.mpStatItem}>
            <View style={styles.mpStatLeft}>
              <Feather name="percent" size={20} color={AstroBarColors.info} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Comisión Promedio
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ color: AstroBarColors.info }}>
              {((stats?.averageCommission || 0) * 100).toFixed(1)}%
            </ThemedText>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Transacciones Recientes</ThemedText>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No hay transacciones recientes
              </ThemedText>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.border }]}>
                <View style={styles.transactionLeft}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    {transaction.businessName}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Cliente: {transaction.customerName}
                  </ThemedText>
                  <View style={styles.transactionMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                      <ThemedText type="small" style={{ color: getStatusColor(transaction.status) }}>
                        {getStatusText(transaction.status)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {new Date(transaction.createdAt).toLocaleDateString('es-AR')}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    {formatCurrency(transaction.amount)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: AstroBarColors.success }}>
                    +{formatCurrency(transaction.commission)}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Todos los pagos se procesan con Mercado Pago{'\n'}
              • Las comisiones se cobran adicional al cliente{'\n'}
              • Los bares reciben 100% del precio del producto{'\n'}
              • Reportes detallados disponibles en el panel
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  section: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  mpStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  mpStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-start',
  },
});
