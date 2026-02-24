import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../constants/config';

interface ConnectStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  canReceivePayments: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirements?: any;
  accountId?: string;
}

export default function PaymentMethodsScreen({ navigation }: any) {
  const { user, token, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  console.log('🔍 PaymentMethodsScreen - Auth state:', { 
    hasUser: !!user, 
    hasToken: !!token, 
    isAuthenticated,
    userRole: user?.role 
  });

  const fetchConnectStatus = async () => {
    try {
      if (!token) {
        console.log('❌ No token available for connect status');
        return;
      }
      
      console.log('🔗 Fetching connect status with token:', token ? 'present' : 'missing');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/connect/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectStatus(data);
      } else {
        console.error('Connect status error:', response.status, response.statusText);
        Alert.alert('Error', 'No se pudo obtener el estado de Stripe');
      }
    } catch (error) {
      console.error('Error fetching Connect status:', error);
      Alert.alert('Error', 'No se pudo obtener el estado de Stripe');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConnectStatus();
    } else {
      console.log('❌ No token available, skipping connect status fetch');
      setLoading(false);
    }
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnectStatus();
  };

  const openExternalUrl = async (rawUrl?: string) => {
    if (!rawUrl) {
      Alert.alert('Error', 'No se recibio el enlace de configuracion');
      return;
    }

    const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    try {
      await Linking.openURL(normalizedUrl);
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el enlace de configuracion');
    }
  };

  const startOnboarding = async () => {
    if (!user || !token) {
      console.log('❌ No user or token available for onboarding');
      return;
    }

    console.log('🔗 Starting onboarding with token:', token ? 'present' : 'missing');
    
    setOnboardingLoading(true);
    try {
      const role = user.role;
      const accountType =
        role === 'business' ||
        role === 'business_owner' ||
        role === 'admin' ||
        role === 'super_admin'
          ? 'business'
          : 'driver';
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/connect/onboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountType,
          businessId:
            user.role === 'business' || user.role === 'business_owner' ? user.id : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        await openExternalUrl(data.onboardingUrl);
      } else {
        const error = await response.json();
        console.error('Onboarding error:', response.status, error);
        Alert.alert('Error', error.error || 'Error al iniciar configuración');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const refreshOnboarding = async () => {
    if (!connectStatus?.accountId) {
      Alert.alert('Error', 'No hay cuenta Stripe para refrescar');
      return;
    }
    setOnboardingLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/connect/refresh-onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: connectStatus.accountId })
      });

      if (response.ok) {
        const data = await response.json();

        await openExternalUrl(data.onboardingUrl);
      } else {
        const error = await response.json().catch(() => ({}));
        Alert.alert('Error', error.error || 'Error al actualizar configuración');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const openDashboard = async () => {
    if (!connectStatus?.accountId) {
      Alert.alert('Error', 'No hay cuenta Stripe para abrir dashboard');
      return;
    }
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/connect/dashboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: connectStatus.accountId })
      });

      if (response.ok) {
        const data = await response.json();

        await openExternalUrl(data.dashboardUrl);
      } else {
        const error = await response.json().catch(() => ({}));
        Alert.alert('Error', error.error || 'Error al abrir dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    }
  };
  const getStatusColor = (status: boolean) => {
    return status ? '#10B981' : '#EF4444';
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Configurado' : 'Pendiente';
  };

  const getAccountTypeText = () => {
    if (!user) return '';
    switch (user.role) {
      case 'business':
      case 'business_owner':
      case 'admin':
      case 'super_admin':
        return 'Cuenta de Negocio';
      case 'driver':
      case 'delivery_driver':
        return 'Cuenta de Repartidor';
      default:
        return 'Cuenta de Usuario';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando información de pagos...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={24} color="#FF6B35" />
        </TouchableOpacity>
        <Ionicons name="card-outline" size={32} color="#FF6B35" />
        <Text style={styles.title}>Métodos de Pago</Text>
        <Text style={styles.subtitle}>{getAccountTypeText()}</Text>
      </View>

      {/* Mexican Bank Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta Bancaria Mexicana</Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={24} color="#6B7280" />
            <Text style={styles.cardTitle}>SPEI / CoDi</Text>
          </View>
          <Text style={styles.cardDescription}>
            Agrega tu cuenta bancaria mexicana para recibir transferencias SPEI o pagos CoDi.
          </Text>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('AddBankAccount')}
          >
            <Ionicons name="add-outline" size={18} color="#FF6B35" />
            <Text style={styles.secondaryButtonText}>Agregar Cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stripe Connect Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta Bancaria</Text>
        
        {!connectStatus?.hasAccount ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bank-outline" size={24} color="#6B7280" />
              <Text style={styles.cardTitle}>Configurar Stripe para Retiros</Text>
            </View>
            <Text style={styles.cardDescription}>
                {user?.role === 'driver' || user?.role === 'delivery_driver'
                  ? 'Configura Stripe Connect para recibir retiros automaticos por tus entregas.'
                  : 'Configura Stripe Connect para recibir retiros automaticos de tus ventas.'}
            </Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={startOnboarding}
              disabled={onboardingLoading}
            >
              {onboardingLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>Configurar Cuenta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons 
                name={connectStatus.canReceivePayments ? "checkmark-circle" : "time-outline"} 
                size={24} 
                color={getStatusColor(connectStatus.canReceivePayments)} 
              />
              <Text style={styles.cardTitle}>Estado de la Cuenta</Text>
            </View>

            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Información Completa</Text>
                <View style={styles.statusBadge}>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(connectStatus.detailsSubmitted || false) }
                  ]} />
                  <Text style={styles.statusValue}>
                    {getStatusText(connectStatus.detailsSubmitted || false)}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Recibir Pagos</Text>
                <View style={styles.statusBadge}>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(connectStatus.chargesEnabled || false) }
                  ]} />
                  <Text style={styles.statusValue}>
                    {getStatusText(connectStatus.chargesEnabled || false)}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Retiros</Text>
                <View style={styles.statusBadge}>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(connectStatus.payoutsEnabled || false) }
                  ]} />
                  <Text style={styles.statusValue}>
                    {getStatusText(connectStatus.payoutsEnabled || false)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              {!connectStatus.onboardingComplete && (
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={refreshOnboarding}
                  disabled={onboardingLoading}
                >
                  {onboardingLoading ? (
                    <ActivityIndicator color="#FF6B35" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={18} color="#FF6B35" />
                      <Text style={styles.secondaryButtonText}>Completar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {connectStatus.onboardingComplete && (
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={openDashboard}
                >
                  <Ionicons name="open-outline" size={18} color="#FF6B35" />
                  <Text style={styles.secondaryButtonText}>Ver Dashboard</Text>
                </TouchableOpacity>
              )}
            </View>

            {connectStatus.canReceivePayments && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.successText}>
                  ¡Tu cuenta está lista para recibir pagos!
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Pagos Seguros con Stripe</Text>
            <Text style={styles.infoText}>
              Utilizamos Stripe para procesar todos los pagos de forma segura. 
              Tus datos bancarios están protegidos con encriptación de nivel bancario.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  statusGrid: {
    marginVertical: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
});