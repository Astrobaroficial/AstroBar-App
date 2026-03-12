import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

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

export default function CustomerWalletScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [mpAccount, setMpAccount] = useState<MercadoPagoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

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
        const result = await WebBrowser.openBrowserAsync(data.authUrl);
        
        if (result.type === 'success') {
          setTimeout(() => {
            loadMercadoPagoStatus();
            showToast('¡Cuenta conectada exitosamente!', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 1500);
        }
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

        {/* Info Section */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>¿Cómo funciona?</ThemedText>
          
          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.primaryLight }]}>
              <ThemedText type="body" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>
                1
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                Vincula tu Cuenta
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Conecta tu cuenta de Mercado Pago de forma segura
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
                Compra Promociones
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Agrega promociones al carrito y paga directamente
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
                Recibe tu QR
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Canjea tu promoción en el bar con el código QR
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Beneficios</ThemedText>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="shield" size={20} color={AstroBarColors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Pagos Seguros</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Encriptación de nivel bancario
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="zap" size={20} color={AstroBarColors.success} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Pagos Instantáneos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Compra sin esperas
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="gift" size={20} color={AstroBarColors.info} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Gana Puntos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                +10 puntos por promoción canjeada
              </ThemedText>
            </View>
          </View>
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
});
