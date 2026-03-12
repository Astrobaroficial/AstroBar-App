import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
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

interface MercadoPagoStatus {
  connected: boolean;
  mpUserId?: string;
  publicKey?: string;
}

export default function WalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<WalletScreenNavigationProp>();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [mpStatus, setMpStatus] = useState<MercadoPagoStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletStats();
    if (user?.role === 'business_owner') {
      loadMercadoPagoStatus();
    }
  }, [user?.role]);

  const loadWalletStats = async () => {
    try {
      let endpoint = '/api/business/wallet-stats';
      
      if (user?.role === 'customer') {
        endpoint = '/api/user/wallet-stats';
      } else if (user?.role === 'admin' || user?.role === 'super_admin') {
        endpoint = '/api/admin/wallet-stats';
      }
      
      const response = await apiRequest('GET', endpoint);
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

  const loadMercadoPagoStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/mp/status');
      const data = await response.json();
      if (data.success) {
        setMpStatus({
          connected: data.connected,
          mpUserId: data.mpUserId,
          publicKey: data.publicKey
        });
      }
    } catch (error) {
      console.error('Error loading MP status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount); // Precio ya está en pesos
  };

  const openMercadoPago = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Abrir Mercado Pago en el navegador
    Linking.openURL('https://www.mercadopago.com.ar/balance');
  };

  // Vista para CLIENTES
  if (user?.role === 'customer') {
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
              <Feather name="shopping-bag" size={24} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9 }}>
                Total Gastado
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
                <ThemedText type="small" style={{ color: '#FFFFFF', opacity: 0.8 }}>Promociones</ThemedText>
                <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {loading ? '...' : stats?.totalTransactions || 0}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
            <ThemedText type="h4" style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
            
            <Pressable
              style={[styles.actionItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('CustomerWallet' as any);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#009EE320' }]}>
                <Feather name="credit-card" size={20} color="#009EE3" />
              </View>
              <View style={styles.actionContent}>
                <ThemedText type="body">Configurar Método de Pago</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Conectar Mercado Pago para pagar
                </ThemedText>
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
                <ThemedText type="body">Historial de Compras</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Ver todas las transacciones</ThemedText>
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
                • Todos los pagos se procesan con Mercado Pago{"\n"}
                • Tus tarjetas están protegidas y encriptadas{"\n"}
                • Recibes 10 puntos por cada promoción canjeada
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Vista para BARES (business_owner)
  if (user?.role === 'business_owner') {
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
        {/* Sales Card */}
        <View style={[styles.balanceCard, { backgroundColor: '#4CAF50' }, Shadows.lg]}>
          <View style={styles.balanceHeader}>
            <Feather name="trending-up" size={24} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9 }}>
              Total Vendido
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
                {loading ? '...' : `${stats?.platformCommission || 0}%`}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="check-circle" size={20} color={AstroBarColors.success} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.success }}>
              {loading ? '...' : stats?.totalTransactions || 0}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Ventas</ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="dollar-sign" size={20} color={AstroBarColors.primary} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
              {loading ? '...' : formatCurrency(stats?.averageOrderValue || 0)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Promedio</ThemedText>
          </View>
        </View>

        {/* Mercado Pago Status */}
        <View style={[styles.mpCard, { backgroundColor: mpStatus.connected ? '#E8F5E9' : '#FFF3E0' }, Shadows.sm]}>
          <View style={styles.mpHeader}>
            <View style={[styles.mpIcon, { backgroundColor: mpStatus.connected ? '#4CAF50' : '#FF9800' }]}>
              <Feather name={mpStatus.connected ? "check" : "alert-circle"} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Mercado Pago {mpStatus.connected ? 'Conectado' : 'No Conectado'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {mpStatus.connected 
                  ? 'Recibiendo pagos correctamente' 
                  : 'Conecta tu cuenta para recibir pagos'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
          
          <Pressable
            style={[styles.actionItem, { borderBottomColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('BusinessMercadoPago');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#009EE320' }]}>
              <Feather name="credit-card" size={20} color="#009EE3" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Configurar Mercado Pago</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {mpStatus.connected ? 'Gestionar cuenta conectada' : 'Conectar cuenta para recibir pagos'}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          {mpStatus.connected && (
            <Pressable
              style={[styles.actionItem, { borderBottomColor: theme.border }]}
              onPress={openMercadoPago}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#009EE320' }]}>
                <Feather name="external-link" size={20} color="#009EE3" />
              </View>
              <View style={styles.actionContent}>
                <ThemedText type="body">Ver en Mercado Pago</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Consultar saldo y movimientos
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          )}

          <Pressable
            style={[styles.actionItem, { borderBottomColor: 'transparent' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('PaymentHistory');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="file-text" size={20} color={AstroBarColors.info} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Historial Completo</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Ver todas las transacciones</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="body" style={{ color: AstroBarColors.info, fontWeight: '600' }}>Cómo Funciona</ThemedText>
            <ThemedText type="small" style={{ color: AstroBarColors.info, marginTop: Spacing.xs }}>
              • Recibes el 100% del precio de tus productos{"\n"}
              • La comisión ({stats?.platformCommission || 0}%) se cobra adicional al cliente{"\n"}
              • El dinero llega directo a tu cuenta de Mercado Pago{"\n"}
              • Puedes retirar desde Mercado Pago cuando quieras
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
  }

  // Vista para ADMIN/SUPER_ADMIN
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
        {/* Platform Revenue Card */}
        <View style={[styles.balanceCard, { backgroundColor: '#9C27B0' }, Shadows.lg]}>
          <View style={styles.balanceHeader}>
            <Feather name="trending-up" size={24} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9 }}>
              Ingresos de Plataforma (Comisiones)
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
              <ThemedText type="small" style={{ color: '#FFFFFF', opacity: 0.8 }}>Transacciones</ThemedText>
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {loading ? '...' : stats?.totalTransactions || 0}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Mercado Pago Platform Status */}
        <View style={[styles.mpCard, { backgroundColor: '#E8F5E9' }, Shadows.sm]}>
          <View style={styles.mpHeader}>
            <View style={[styles.mpIcon, { backgroundColor: '#4CAF50' }]}>
              <Feather name="check" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Mercado Pago Conectado
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Cuenta de la plataforma configurada
              </ThemedText>
            </View>
          </View>
          <View style={{ marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#C8E6C9' }}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              • Las comisiones se cobran automáticamente{"\n"}
              • El dinero llega directo a tu cuenta MP{"\n"}
              • Split payment configurado correctamente{"\n"}
              • "Pendiente Entrega" = Ya pagado, esperando escaneo QR
            </ThemedText>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="clock" size={20} color={AstroBarColors.warning} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.warning }}>
              {loading ? '...' : formatCurrency(stats?.pendingPayouts || 0)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Pendiente Entrega</ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }, Shadows.sm]}>
            <View style={[styles.statIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="percent" size={20} color={AstroBarColors.primary} />
            </View>
            <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
              {loading ? '...' : `${stats?.platformCommission || 0}%`}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Comisión Promedio</ThemedText>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
          
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
              <ThemedText type="body">Historial Completo</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Ver todas las transacciones del sistema</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: 'transparent' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openMercadoPago();
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#009EE320' }]}>
              <Feather name="external-link" size={20} color="#009EE3" />
            </View>
            <View style={styles.actionContent}>
              <ThemedText type="body">Ver en Mercado Pago</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Consultar saldo y movimientos</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="body" style={{ color: AstroBarColors.info, fontWeight: '600' }}>Cómo Funciona</ThemedText>
            <ThemedText type="small" style={{ color: AstroBarColors.info, marginTop: Spacing.xs }}>
              • Los clientes pagan el precio + comisión{"\n"}
              • Los bares reciben el 100% del precio de sus productos{"\n"}
              • La plataforma recibe la comisión automáticamente{"\n"}
              • Todo se procesa con Mercado Pago Split Payment{"\n"}
              • El dinero llega directo a cada cuenta{"\n"}
              • "Pendiente Entrega" = Pagos confirmados esperando QR
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
  mpCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  mpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  mpCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  mpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
