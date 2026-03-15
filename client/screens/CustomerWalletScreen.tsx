import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface MercadoPagoAccount {
  mpUserId: string;
  isActive: boolean;
  connectedAt: string;
}

interface Transaction {
  id: string;
  promotionTitle: string;
  businessName: string;
  amountPaid: number;
  status: string;
  createdAt: string;
  redeemedAt: string | null;
}

export default function CustomerWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [mpAccount, setMpAccount] = useState<MercadoPagoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'completed' | 'pending'>('all');
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');

  useEffect(() => {
    loadMercadoPagoStatus();
    loadTransactions();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMercadoPagoStatus();
      loadTransactions();
    }, [])
  );

  const loadMercadoPagoStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/customer-mp/status');
      const data = await response.json();
      if (data.success && data.connected) {
        setMpAccount(data);
      } else {
        setMpAccount(null);
      }
    } catch (error) {
      console.error('Error loading MP status:', error);
      setMpAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await apiRequest('GET', `/api/user/payment-history?filter=${filterTab}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filterTab]);

  const handleConnectMercadoPago = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnecting(true);
    try {
      const response = await apiRequest('GET', '/api/customer-mp/connect');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        setWebViewUrl(data.authUrl);
        setShowWebView(true);
      } else {
        showToast('Error al conectar Mercado Pago', 'error');
      }
    } catch (error: any) {
      console.error('Error connecting MP:', error);
      showToast(error.message || 'Error al conectar', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    // Detectar cuando Mercado Pago redirige de vuelta a tu callback URL
    if (url.includes('/api/customer-mp/callback') || url.includes('success') || url.includes('code=')) {
      setShowWebView(false);
      setWebViewUrl('');
      
      setTimeout(() => {
        loadMercadoPagoStatus();
        showToast('¡Cuenta conectada exitosamente!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 500);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDisconnectModal(false);
    
    try {
      const response = await apiRequest('POST', '/api/customer-mp/disconnect');
      const data = await response.json();
      
      if (data.success) {
        setMpAccount(null);
        showToast('Cuenta desconectada', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showToast('Error al desconectar', 'error');
      }
    } catch (error: any) {
      console.error('Error disconnecting MP:', error);
      showToast('Error al desconectar', 'error');
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
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.card }, Shadows.md]}>
          <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.primary }]}>
            <Feather name="wallet" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            Mi Billetera
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            Vincula tu cuenta de Mercado Pago para pagar promociones
          </ThemedText>
        </View>

        {/* Status Card */}
        {mpAccount ? (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.successLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="check-circle" size={24} color={AstroBarColors.success} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="h4" style={{ color: AstroBarColors.success }}>
                  ✅ Cuenta Conectada
                </ThemedText>
                <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.xs }}>
                  ID: {mpAccount.mpUserId}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.md }}>
              Conectada desde: {new Date(mpAccount.connectedAt).toLocaleDateString('es-AR')}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.warningLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="alert-circle" size={24} color={AstroBarColors.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="h4" style={{ color: AstroBarColors.warning }}>
                  Conecta tu Cuenta
                </ThemedText>
                <ThemedText type="small" style={{ color: AstroBarColors.warning, marginTop: Spacing.xs }}>
                  Necesitas vincular Mercado Pago para pagar
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Main Action Button */}
        <Pressable
          style={[
            styles.mainButton,
            {
              backgroundColor: mpAccount ? AstroBarColors.error : AstroBarColors.primary,
              opacity: connecting ? 0.6 : 1,
            }
          ]}
          onPress={mpAccount ? () => setShowDisconnectModal(true) : handleConnectMercadoPago}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather 
                name={mpAccount ? "link-2" : "link"} 
                size={20} 
                color="#FFFFFF" 
              />
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
                {mpAccount ? 'Desconectar Mercado Pago' : 'Conectar Mercado Pago'}
              </ThemedText>
            </>
          )}
        </Pressable>

        {/* Compact Info */}
        <View style={[styles.compactInfo, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 20 }}>
            💳 Vincula tu cuenta • 🛒 Compra promociones • 📱 Recibe QR • 🏆 Gana puntos
          </ThemedText>
        </View>

        {/* Stats Summary */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>📊 Resumen</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
                ${transactions.reduce((sum, t) => sum + t.amountPaid, 0).toLocaleString('es-AR')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Total Gastado
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h3" style={{ color: AstroBarColors.success }}>
                {transactions.filter(t => t.status === 'redeemed').length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Completadas
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h3" style={{ color: AstroBarColors.warning }}>
                {transactions.filter(t => t.status === 'pending').length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Pendientes
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>📜 Historial de Pagos</ThemedText>
          
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <Pressable
              style={[
                styles.filterTab,
                filterTab === 'all' && { backgroundColor: AstroBarColors.primary },
              ]}
              onPress={() => {
                setFilterTab('all');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterTab === 'all' ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: filterTab === 'all' ? '600' : '400',
                }}
              >
                Todas
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterTab,
                filterTab === 'completed' && { backgroundColor: AstroBarColors.success },
              ]}
              onPress={() => {
                setFilterTab('completed');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterTab === 'completed' ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: filterTab === 'completed' ? '600' : '400',
                }}
              >
                Completadas
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterTab,
                filterTab === 'pending' && { backgroundColor: AstroBarColors.warning },
              ]}
              onPress={() => {
                setFilterTab('pending');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterTab === 'pending' ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: filterTab === 'pending' ? '600' : '400',
                }}
              >
                Pendientes
              </ThemedText>
            </Pressable>
          </View>

          {/* Transactions List */}
          {loadingTransactions ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={AstroBarColors.primary} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No hay transacciones
              </ThemedText>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.border }]}>
                <View style={styles.transactionHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>
                      {transaction.promotionTitle}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                      {transaction.businessName}
                    </ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText type="body" style={{ fontWeight: '600', color: AstroBarColors.primary }}>
                      ${transaction.amountPaid.toLocaleString('es-AR')}
                    </ThemedText>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            transaction.status === 'redeemed'
                              ? AstroBarColors.successLight
                              : AstroBarColors.warningLight,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color:
                            transaction.status === 'redeemed'
                              ? AstroBarColors.success
                              : AstroBarColors.warning,
                          fontWeight: '600',
                        }}
                      >
                        {transaction.status === 'redeemed' ? 'Entregado' : 'Pendiente Entrega'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  {new Date(transaction.createdAt).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Tu información está protegida{'\n'}
              • Procesamos pagos con Mercado Pago{'\n'}
              • Puedes desconectar en cualquier momento
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          setShowWebView(false);
          setWebViewUrl('');
        }}
      >
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.backgroundRoot }}>
          <View style={[styles.webViewHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <ThemedText type="h4">Conectar Mercado Pago</ThemedText>
            <Pressable
              style={[styles.closeWebViewButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => {
                setShowWebView(false);
                setWebViewUrl('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          {webViewUrl ? (
            <WebView
              source={{ uri: webViewUrl }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={AstroBarColors.primary} />
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>

      {/* Disconnect Modal */}
      <Modal
        visible={showDisconnectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisconnectModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDisconnectModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalIcon, { backgroundColor: AstroBarColors.errorLight }]}>
              <Feather name="alert-circle" size={32} color={AstroBarColors.error} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>
              Desconectar Mercado Pago
            </ThemedText>
            <ThemedText type="body" style={[styles.modalMessage, { color: theme.textSecondary }]}>
              ¿Estás seguro? No podrás hacer pagos hasta reconectar tu cuenta.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowDisconnectModal(false)}
              >
                <ThemedText type="body" style={{ color: theme.text }}>
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: AstroBarColors.error }]}
                onPress={handleDisconnectMercadoPago}
              >
                <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  Desconectar
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainButton: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
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
  compactInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  transactionItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  emptyState: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeWebViewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
