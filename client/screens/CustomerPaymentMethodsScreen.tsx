import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { api } from '@/lib/api';

interface PaymentCard {
  id: string;
  lastFourDigits: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export default function CustomerPaymentMethodsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mpConnected, setMpConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPaymentMethods();
    }, [])
  );

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/user/payment-methods');
      if (response.data.success) {
        setCards(response.data.cards || []);
        setMpConnected(response.data.mpConnected === true);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      showToast('Error al cargar métodos de pago', 'error');
      setMpConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AddPaymentCard' as any);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert(
      'Eliminar Tarjeta',
      '¿Estás seguro de que deseas eliminar esta tarjeta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/user/payment-methods/${cardId}`);
              if (response.data.success) {
                showToast('Tarjeta eliminada', 'success');
                loadPaymentMethods();
              }
            } catch (error) {
              showToast('Error al eliminar tarjeta', 'error');
            }
          },
        },
      ]
    );
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
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
          <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.primary }]}>
            <Feather name="credit-card" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md }}>
            Métodos de Pago
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            Gestiona tus tarjetas para comprar promociones
          </ThemedText>
        </View>

        {/* Status Card */}
        {mpConnected ? (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.successLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="check-circle" size={24} color={AstroBarColors.success} />
              <ThemedText type="h4" style={{ color: AstroBarColors.success, marginLeft: Spacing.sm }}>
                ✅ Cuenta Conectada
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.sm }}>
              Ya puedes realizar pagos con tus tarjetas
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: AstroBarColors.warningLight }, Shadows.sm]}>
            <View style={styles.statusHeader}>
              <Feather name="alert-circle" size={24} color={AstroBarColors.warning} />
              <ThemedText type="h4" style={{ color: AstroBarColors.warning, marginLeft: Spacing.sm }}>
                Agrega una Tarjeta
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: AstroBarColors.warning, marginTop: Spacing.sm }}>
              Necesitas agregar una tarjeta para comprar promociones
            </ThemedText>
          </View>
        )}

        {/* Saved Cards */}
        {cards.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
            <ThemedText type="h4" style={styles.sectionTitle}>Tarjetas Guardadas</ThemedText>
            
            {cards.map((card) => (
              <View key={card.id} style={[styles.cardItem, { borderBottomColor: theme.border }]}>
                <View style={styles.cardInfo}>
                  <ThemedText type="body" style={{ fontSize: 20, marginRight: Spacing.sm }}>
                    {getBrandIcon(card.brand)}
                  </ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>
                      {card.brand} •••• {card.lastFourDigits}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Vence {card.expiryMonth}/{card.expiryYear}
                    </ThemedText>
                  </View>
                  {card.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: AstroBarColors.primaryLight }]}>
                      <ThemedText type="small" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>
                        Predeterminada
                      </ThemedText>
                    </View>
                  )}
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCard(card.id)}
                >
                  <Feather name="trash-2" size={18} color={AstroBarColors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add Card Button */}
        <Pressable
          style={[styles.button, { backgroundColor: AstroBarColors.primary }]}
          onPress={handleAddCard}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
            Agregar Tarjeta
          </ThemedText>
        </Pressable>

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
                Compra promociones al instante
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
                10 puntos por cada promoción canjeada
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Tus datos de tarjeta están protegidos{'\n'}
              • Procesamos pagos con Mercado Pago{'\n'}
              • Puedes eliminar tarjetas en cualquier momento
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
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  deleteButton: {
    padding: Spacing.sm,
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
});
