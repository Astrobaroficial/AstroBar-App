import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface StripeAccount {
  id: string;
  status: 'pending' | 'verified' | 'restricted' | 'rejected';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsNeeded: string[];
  onboardingUrl?: string;
  dashboardUrl?: string;
}

export default function StripeConnectStatusScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStripeAccount();
  }, []);

  const loadStripeAccount = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/stripe-connect');
      const data = await response.json();
      if (data.success) {
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Error loading Stripe account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!account?.onboardingUrl) return;
    
    try {
      await Linking.openURL(account.onboardingUrl);
    } catch (error) {
      showToast('Error al abrir enlace', 'error');
    }
  };

  const handleOpenDashboard = async () => {
    if (!account?.dashboardUrl) return;
    
    try {
      await Linking.openURL(account.dashboardUrl);
    } catch (error) {
      showToast('Error al abrir dashboard', 'error');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          color: AstroBarColors.success,
          text: 'Verificado',
          description: 'Tu cuenta está completamente verificada y puede recibir pagos'
        };
      case 'pending':
        return {
          color: AstroBarColors.warning,
          text: 'Pendiente',
          description: 'Completa la verificación para recibir pagos'
        };
      case 'restricted':
        return {
          color: AstroBarColors.error,
          text: 'Restringido',
          description: 'Tu cuenta tiene restricciones. Revisa los requisitos'
        };
      case 'rejected':
        return {
          color: AstroBarColors.error,
          text: 'Rechazado',
          description: 'Tu cuenta fue rechazada. Contacta soporte'
        };
      default:
        return {
          color: theme.textSecondary,
          text: 'Desconocido',
          description: 'Estado no disponible'
        };
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Cargando estado de cuenta...
          </ThemedText>
        </View>
      </LinearGradient>
    );
  }

  if (!account) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
        style={styles.container}
      >
        <View style={styles.noAccountContainer}>
          <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.warningLight }]}>
            <Feather name="credit-card" size={48} color={AstroBarColors.warning} />
          </View>
          <ThemedText type="h3" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
            Sin cuenta Stripe
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl }}>
            Configura tu cuenta bancaria primero para crear una cuenta Stripe Connect
          </ThemedText>
          <Pressable
            style={[styles.setupButton, { backgroundColor: AstroBarColors.primary }]}
            onPress={() => navigation.navigate('BankAccountSetup' as any)}
          >
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
              Configurar Cuenta
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const statusInfo = getStatusInfo(account.status);

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
      >
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: theme.card }, Shadows.md]}>
          <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}20` }]}>
            <Feather 
              name={account.status === 'verified' ? 'check-circle' : 'clock'} 
              size={32} 
              color={statusInfo.color} 
            />
          </View>
          <ThemedText type="h2" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
            Cuenta Stripe Connect
          </ThemedText>
          <Badge
            text={statusInfo.text}
            variant={account.status === 'verified' ? 'success' : account.status === 'pending' ? 'warning' : 'error'}
            style={{ alignSelf: 'center', marginBottom: Spacing.md }}
          />
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            {statusInfo.description}
          </ThemedText>
        </View>

        {/* Capabilities */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Capacidades</ThemedText>
          
          <View style={styles.capabilityItem}>
            <Feather 
              name={account.chargesEnabled ? 'check-circle' : 'x-circle'} 
              size={20} 
              color={account.chargesEnabled ? AstroBarColors.success : AstroBarColors.error} 
            />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              Recibir pagos
            </ThemedText>
          </View>

          <View style={styles.capabilityItem}>
            <Feather 
              name={account.payoutsEnabled ? 'check-circle' : 'x-circle'} 
              size={20} 
              color={account.payoutsEnabled ? AstroBarColors.success : AstroBarColors.error} 
            />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              Retiros automáticos
            </ThemedText>
          </View>
        </View>

        {/* Requirements */}
        {account.requirementsNeeded.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
            <ThemedText type="h4" style={styles.sectionTitle}>Requisitos Pendientes</ThemedText>
            {account.requirementsNeeded.map((requirement, index) => (
              <View key={index} style={styles.requirementItem}>
                <Feather name="alert-circle" size={16} color={AstroBarColors.warning} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                  {requirement}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Acciones</ThemedText>
          
          {account.onboardingUrl && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: AstroBarColors.primary }]}
              onPress={handleCompleteOnboarding}
            >
              <Feather name="external-link" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
                Completar Verificación
              </ThemedText>
            </Pressable>
          )}

          {account.dashboardUrl && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: AstroBarColors.info, marginTop: Spacing.sm }]}
              onPress={handleOpenDashboard}
            >
              <Feather name="bar-chart-2" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
                Ver Dashboard Stripe
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.sm }]}
            onPress={loadStripeAccount}
          >
            <Feather name="refresh-cw" size={20} color={theme.text} />
            <ThemedText type="body" style={{ color: theme.text, fontWeight: '600', marginLeft: Spacing.sm }}>
              Actualizar Estado
            </ThemedText>
          </Pressable>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={16} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              Stripe Connect permite recibir pagos directamente y automatizar retiros a tu cuenta bancaria configurada.
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
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noAccountContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  iconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  setupButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md },
  statusCard: { padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, alignItems: 'center' },
  statusIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  section: { borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionTitle: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  capabilityItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  requirementItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderRadius: BorderRadius.md, marginHorizontal: Spacing.lg },
  infoCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'flex-start' }
});