import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
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

export default function BusinessMercadoPagoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [mpAccount, setMpAccount] = useState<MercadoPagoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    loadMercadoPagoStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMercadoPagoStatus();
    }, [])
  );

  const loadMercadoPagoStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/mp/status');
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

  const handleConnectMercadoPago = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnecting(true);
    try {
      const response = await apiRequest('GET', '/api/mp/connect');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        setAuthUrl(data.authUrl);
        setWebViewVisible(true);
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
    if (navState.url.includes('astrobar://mp-connected')) {
      setWebViewVisible(false);
      loadMercadoPagoStatus();
      showToast('¡Cuenta conectada exitosamente!', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDisconnectModal(false);
    
    try {
      const response = await apiRequest('POST', '/api/mp/disconnect');
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
            <Feather name="credit-card" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            Mercado Pago
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            Recibe pagos de tus clientes de forma segura
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
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.errorLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="alert-circle" size={24} color={AstroBarColors.error} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="h4" style={{ color: AstroBarColors.error }}>
                  ⚠️ Cuenta No Conectada
                </ThemedText>
                <ThemedText type="small" style={{ color: AstroBarColors.error, marginTop: Spacing.xs }}>
                  No puedes recibir pagos sin vincular Mercado Pago
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

        {/* Info Section */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>¿Por qué conectar?</ThemedText>
          
          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.primaryLight }]}>
              <ThemedText type="body" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>
                1
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Recibe Pagos Automáticos
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Los clientes pagan y tú recibes el dinero al instante
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.successLight }]}>
              <ThemedText type="body" style={{ color: AstroBarColors.success, fontWeight: '600' }}>
                2
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                100% del Precio del Producto
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Recibes el precio completo de tus promociones
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.infoLight }]}>
              <ThemedText type="body" style={{ color: AstroBarColors.info, fontWeight: '600' }}>
                3
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Seguridad Garantizada
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Mercado Pago protege todas las transacciones
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Beneficios</ThemedText>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="dollar-sign" size={20} color={AstroBarColors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Sin Costos Ocultos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                La comisión la paga el cliente
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="trending-up" size={20} color={AstroBarColors.success} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Aumenta tus Ventas</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Más clientes con pagos digitales
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="clock" size={20} color={AstroBarColors.info} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Pagos Instantáneos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Recibe el dinero en tu cuenta MP
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Conexión segura con OAuth 2.0{'\n'}
              • Tus datos están protegidos{'\n'}
              • Puedes desconectar en cualquier momento
            </ThemedText>
          </View>
        </View>
      </ScrollView>

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
              ¿Estás seguro? No podrás recibir pagos hasta reconectar tu cuenta.
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

      <Modal
        visible={webViewVisible}
        animationType="slide"
        onRequestClose={() => setWebViewVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.webViewHeader, { backgroundColor: theme.card }]}>
            <Pressable onPress={() => setWebViewVisible(false)} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h4">Conectar Mercado Pago</ThemedText>
            <View style={{ width: 24 }} />
          </View>
          <WebView
            source={{ uri: authUrl }}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            style={{ flex: 1 }}
          />
        </View>
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
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
    marginLeft: Spacing.md,
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
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: Spacing.sm,
  },
});
