import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";
import { useUnifiedCart } from "@/contexts/UnifiedCartContext";

type ActivePromotionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ActivePromotionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<ActivePromotionsScreenNavigationProp>();
  const route = useRoute<any>();
  const businessId = route.params?.businessId;
  const { addItem, currentBusinessId } = useUnifiedCart();
  
  const [activeTransaction, setActiveTransaction] = useState<any>(null);
  const [businessPromotions, setBusinessPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadBusinessPromotions();
    } else {
      loadActivePromotion();
    }
  }, [businessId]);

  useEffect(() => {
    if (!activeTransaction) return;

    const cancelDeadline = new Date(activeTransaction.canCancelUntil);
    const now = new Date();
    const secondsLeft = Math.max(0, Math.floor((cancelDeadline.getTime() - now.getTime()) / 1000));
    
    setTimeLeft(secondsLeft);
    setCanCancel(secondsLeft > 0 && activeTransaction.status === 'pending');

    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanCancel(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTransaction]);

  const loadActivePromotion = async () => {
    try {
      const response = await apiRequest('GET', '/api/promotions/transactions/my');
      const data = await response.json();
      
      if (data.success && data.transactions) {
        // Find pending transaction
        const pending = data.transactions.find((t: any) => t.status === 'pending');
        setActiveTransaction(pending || null);
      }
    } catch (error) {
      console.error('Error loading active promotion:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBusinessPromotions = async () => {
    try {
      const response = await apiRequest('GET', `/api/promotions?businessId=${businessId}`);
      const data = await response.json();

      if (data.success && data.promotions) {
        setBusinessPromotions(data.promotions);
      }
    } catch (error) {
      console.error('Error loading business promotions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (businessId) {
      loadBusinessPromotions();
    } else {
      loadActivePromotion();
    }
  };

  const handleCancel = async () => {
    if (!activeTransaction) return;

    setIsCancelling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await apiRequest('POST', `/api/promotions/transactions/${activeTransaction.id}/cancel`);
      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert('Promoción cancelada exitosamente');
        loadActivePromotion();
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert(error.message || 'Error al cancelar');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  if (businessId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: AstroBarColors.primary }]}>
          <Pressable onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
            Promociones
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={{ padding: Spacing.lg }}>
            {businessPromotions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl * 2 }}>
                <Feather name="tag" size={64} color={theme.textSecondary} />
                <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
                  Sin promociones activas
                </ThemedText>
              </View>
            ) : (
              businessPromotions.map((promo) => {
                const canAdd = !currentBusinessId || currentBusinessId === businessId;
                return (
                  <Pressable
                    key={promo.id}
                    onPress={() => {
                      if (!canAdd) {
                        alert('Solo puedes agregar promociones del mismo bar');
                        return;
                      }
                      try {
                        addItem({
                          id: `promo-${promo.id}`,
                          type: 'promotion',
                          name: promo.title,
                          price: promo.promoPrice,
                          businessId: businessId,
                          businessName: promo.businessName || 'Bar',
                          image: promo.image,
                          promotionId: promo.id,
                          originalPrice: promo.originalPrice,
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        alert('Promoción agregada al carrito');
                      } catch (error: any) {
                        alert(error.message);
                      }
                    }}
                    style={[styles.promoCard, { backgroundColor: theme.card, marginBottom: Spacing.md, padding: Spacing.lg, borderRadius: 12, opacity: canAdd ? 1 : 0.5 }]}
                  >
                    <ThemedText type="h3">{promo.title}</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                      {promo.description}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm, alignItems: 'center' }}>
                      <ThemedText style={{ textDecorationLine: 'line-through', color: theme.textSecondary }}>
                        ${(promo.originalPrice / 100).toFixed(2)}
                      </ThemedText>
                      <ThemedText type="h3" style={{ color: '#4CAF50' }}>
                        ${(promo.promoPrice / 100).toFixed(2)}
                      </ThemedText>
                    </View>
                    <View style={{ marginTop: Spacing.md, backgroundColor: AstroBarColors.primary, paddingVertical: Spacing.sm, borderRadius: 8, alignItems: 'center' }}>
                      <ThemedText style={{ color: '#FFFFFF', fontWeight: '700' }}>AGREGAR AL CARRITO</ThemedText>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!activeTransaction) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#1A1A2E', theme.gradientEnd || '#16213E']}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.navigate('Home' as never)}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
            Promoción Activa
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.emptyTitle}>
            No hay promoción activa
          </ThemedText>
          <ThemedText type="body" style={styles.emptyText}>
            Aceptá una promoción para verla aquí
          </ThemedText>
          <Button
            onPress={() => navigation.navigate('MainTabs')}
            style={styles.emptyButton}
          >
            Ver Bares
          </Button>
        </View>
      </LinearGradient>
    );
  }

  const promotion = activeTransaction.promotion;
  const business = activeTransaction.business;

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#1A1A2E', theme.gradientEnd || '#16213E']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.navigate('Home' as never)}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
          Promoción Activa
        </ThemedText>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* QR Code */}
        <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
          <QRCode
            value={activeTransaction.qrCode}
            size={220}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
          <ThemedText type="h3" style={styles.qrCode}>
            {activeTransaction.qrCode}
          </ThemedText>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.detailRow}>
            <Feather name="zap" size={20} color="#FFD700" />
            <View style={styles.detailContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Promoción
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                {promotion?.title || 'Promoción'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={20} color={AstroBarColors.primary} />
            <View style={styles.detailContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Bar
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                {business?.name || 'Bar'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Feather name="dollar-sign" size={20} color="#4CAF50" />
            <View style={styles.detailContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Total pagado
              </ThemedText>
              <ThemedText type="h3" style={{ color: '#4CAF50' }}>
                ${activeTransaction.amountPaid.toLocaleString('es-AR')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Cancel Timer */}
        {canCancel && (
          <View style={[styles.cancelCard, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
            <View style={styles.cancelTimer}>
              <ThemedText type="h3" style={{ color: '#F44336' }}>
                {timeLeft}s
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: '#F44336' }}>
                Podés cancelar en los próximos {timeLeft} segundos
              </ThemedText>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
          <Feather name="info" size={20} color="#FFD700" />
          <ThemedText type="small" style={styles.infoText}>
            Mostrá este QR al personal del bar para canjear tu promoción.
            Ganarás 10 puntos automáticamente.
          </ThemedText>
        </View>

        {/* Buttons */}
        <Button
          onPress={handleCancel}
          disabled={isCancelling || activeTransaction.status !== 'pending'}
          style={[styles.cancelButton, { backgroundColor: canCancel ? '#F44336' : '#666' }]}
        >
          {isCancelling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : canCancel ? (
            'CANCELAR PROMOCIÓN'
          ) : activeTransaction.status !== 'pending' ? (
            'YA CANJEADA'
          ) : (
            'CANCELAR (TIEMPO EXPIRADO)'
          )}
        </Button>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  qrCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  qrCode: {
    marginTop: Spacing.lg,
    color: '#000000',
    fontWeight: '800',
    letterSpacing: 2,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  cancelCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  cancelTimer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: '#FFD700',
  },
  cancelButton: {
    height: 56,
  },
});
