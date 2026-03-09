import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

export default function MercadoPagoConnectScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/mp/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking MP status:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const response = await apiRequest('GET', '/api/mp/connect');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        await Linking.openURL(data.authUrl);
        showToast('Redirigiendo a Mercado Pago...', 'info');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo conectar con Mercado Pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Mercado Pago',
      '¿Estás seguro? No podrás recibir pagos hasta que vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('POST', '/api/mp/disconnect');
              showToast('Cuenta desconectada', 'success');
              checkStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
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
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.card }, Shadows.md]}>
          <View style={[styles.iconContainer, { backgroundColor: '#009EE3' }]}>
            <Feather name="credit-card" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md }}>
            Mercado Pago
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            Conectá tu cuenta para recibir pagos
          </ThemedText>
        </View>

        {/* Status Card */}
        {status?.connected ? (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.successLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="check-circle" size={24} color={AstroBarColors.success} />
              <ThemedText type="h4" style={{ color: AstroBarColors.success, marginLeft: Spacing.sm }}>
                Cuenta Conectada
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.sm }}>
              Usuario MP: {status.mpUserId}
            </ThemedText>
            <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.xs }}>
              Estado: {status.isActive ? 'Activa' : 'Inactiva'}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.warningLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="alert-circle" size={24} color={AstroBarColors.warning} />
              <ThemedText type="h4" style={{ color: AstroBarColors.warning, marginLeft: Spacing.sm }}>
                No Conectada
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: AstroBarColors.warning, marginTop: Spacing.sm }}>
              Conectá tu cuenta para empezar a recibir pagos
            </ThemedText>
          </View>
        )}

        {/* Benefits */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Beneficios</ThemedText>
          
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name="dollar-sign" size={20} color={AstroBarColors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Recibís el 100% del precio</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                La comisión se cobra adicional al cliente
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="zap" size={20} color={AstroBarColors.success} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Pagos instantáneos</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                El dinero llega directo a tu cuenta MP
              </ThemedText>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: AstroBarColors.infoLight }]}>
              <Feather name="shield" size={20} color={AstroBarColors.info} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body">Seguro y confiable</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Protección de comprador y vendedor
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {status?.connected ? (
          <Pressable
            style={[styles.button, { backgroundColor: AstroBarColors.error }]}
            onPress={handleDisconnect}
          >
            <Feather name="x-circle" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
              Desconectar Cuenta
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: '#009EE3', opacity: loading ? 0.6 : 1 }]}
            onPress={handleConnect}
            disabled={loading}
          >
            <Feather name="link" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
              {loading ? 'Conectando...' : 'Conectar Mercado Pago'}
            </ThemedText>
          </Pressable>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Necesitás una cuenta de Mercado Pago verificada{'\n'}
              • El proceso es seguro y toma menos de 1 minuto{'\n'}
              • Podés desconectar en cualquier momento
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
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
  button: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-start',
  },
});
