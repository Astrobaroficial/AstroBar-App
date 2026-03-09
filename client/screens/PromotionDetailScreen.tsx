import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image as RNImage, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function PromotionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const promotionId = route.params?.promotionId;
  
  const [promotion, setPromotion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadPromotion();
  }, []);

  const loadPromotion = async () => {
    try {
      const response = await apiRequest('GET', `/api/promotions/${promotionId}`);
      const data = await response.json();
      if (data.success) {
        setPromotion(data.promotion);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la promoción');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await apiRequest('POST', `/api/promotions/${promotionId}/accept`);
      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'ActivePromotions' }],
          })
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', data.error || 'No se pudo aceptar la promoción');
        setAccepting(false);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'No se pudo aceptar la promoción');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  if (!promotion) {
    return null;
  }

  const stockRemaining = promotion.stock - promotion.stockConsumed;

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Detalle</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {promotion.image && (
          <RNImage 
            source={{ uri: promotion.image }} 
            style={styles.image}
            defaultSource={require('../../assets/astrobarbanner.jpg')}
          />
        )}

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.titleRow}>
            <ThemedText type="h2" style={{ flex: 1 }}>{promotion.title}</ThemedText>
            {promotion.type === 'flash' && (
              <View style={styles.flashBadge}>
                <Feather name="zap" size={16} color="#FFD700" />
                <ThemedText type="small" style={{ color: '#FFD700', marginLeft: 4 }}>
                  FLASH
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.businessRow}>
            <Feather name="map-pin" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: 8 }}>
              {promotion.businessName || promotion.business?.name || 'Bar'}
            </ThemedText>
          </View>

          {promotion.description && (
            <ThemedText type="body" style={{ marginTop: Spacing.md }}>
              {promotion.description}
            </ThemedText>
          )}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Precio original</ThemedText>
              <ThemedText type="h3" style={styles.originalPrice}>${promotion.originalPrice}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Precio promocional</ThemedText>
              <ThemedText type="h1" style={{ color: '#4CAF50' }}>${promotion.promoPrice}</ThemedText>
            </View>
          </View>

          <View style={styles.discountBadge}>
            <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
              Ahorrás ${promotion.originalPrice - promotion.promoPrice} (-{promotion.discountPercentage}%)
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Feather name="package" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={{ marginLeft: 8 }}>
              {stockRemaining} disponibles
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Feather name="clock" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={{ marginLeft: 8 }}>
              Válido hasta {new Date(promotion.endTime).toLocaleString('es-AR')}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.warningCard, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
          <Feather name="info" size={20} color="#FFD700" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText type="small" style={{ color: '#FFD700' }}>
              Al aceptar, se procesará el pago y recibirás un código QR para canjear en el bar.
              Tenés 60 segundos para cancelar.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button
          onPress={handleAccept}
          disabled={accepting || stockRemaining <= 0}
          style={[
            styles.acceptButton,
            { backgroundColor: stockRemaining > 0 ? AstroBarColors.primary : '#666' }
          ]}
        >
          {accepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : stockRemaining > 0 ? (
            `ACEPTAR Y PAGAR $${promotion.promoPrice}`
          ) : (
            'AGOTADO'
          )}
        </Button>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  acceptButton: {
    height: 56,
  },
});
