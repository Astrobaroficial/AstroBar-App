import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';

type WalletScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface WalletStats {
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  totalTransactions: number;
  platformCommission: number;
  averageOrderValue: number;
}

export default function WalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<WalletScreenNavigationProp>();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletStats();
  }, []);

  const loadWalletStats = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/wallet-stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading wallet stats:', error);
      showToast('Error al cargar estadísticas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

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
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: AstroBarColors.primary }, Shadows.lg]}>
          <View style={styles.balanceHeader}>
            <Feather name="dollar-sign" size={24} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9 }}>
              Balance Total
            </ThemedText>
          </View>
          <ThemedText type="h1" style={{ color: '#FFFFFF', marginVertical: Spacing.sm }}>
            {loading ? '...' : formatCurrency(stats?.totalEarnings || 0)}
          </ThemedText>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceItem}>
              <ThemedText type="small" style={{ color: '#FFFFFF', opacity: 0.8 }}>Este mes</ThemedText>
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {loading ? '...' : formatCurrency(stats?.thisMonthEarnings || 0)}
              </ThemedText>
            </View>
            <View style={styles.balanceItem}>
              <ThemedText type="small" style={{ color: '#FFFFFF', opacity: 0.8 }}>Comisión</ThemedText>
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {loading ? '...' : `${((stats?.platformCommission || 0) * 100).toFixed(0)}%`}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="trending-up" size={20} color={AstroBarColors.success} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.success }}>
              {loading ? '...' : stats?.totalTransactions || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Transacciones</ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="clock" size={20} color={AstroBarColors.warning} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.warning }}>
              {loading ? '...' : formatCurrency(stats?.pendingPayouts || 0)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Pendiente</ThemedText>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
          
          <Pressable
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('MercadoPagoConnect' as any);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#009EE320' }]}>
              <Feather name="credit-card" size={20} color="#009EE3" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Mercado Pago</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Conectar cuenta para recibir pagos</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('WithdrawalRequest');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="download" size={20} color={AstroBarColors.primary} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Solicitar Retiro</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Transferir ganancias a tu cuenta</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('PaymentHistory');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="file-text" size={20} color={AstroBarColors.info} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Historial de Pagos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Ver todas las transacciones</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('BankAccountSetup');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="settings" size={20} color={AstroBarColors.warning} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Configurar Cuenta Bancaria</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Agregar datos para retiros</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.actionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('StripeConnectStatus');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="credit-card" size={20} color={AstroBarColors.success} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Estado Stripe Connect</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Verificar cuenta de pagos</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="body" style={{ color: AstroBarColors.info, fontWeight: '600' }}>Información Importante</ThemedText>
            <ThemedText type="small" style={{ color: AstroBarColors.info, marginTop: Spacing.xs }}>
              • Recibes el 100% del precio de tus productos{"\n"}
              • La comisión se cobra adicional al cliente{"\n"}
              • Los retiros se procesan en 2-3 días hábiles
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  balanceCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  balanceItem: {
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-start',
  },
});