import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';
import { useOrderCart } from '@/contexts/OrderCartContext';

let CardField: any = null;
let useStripe: any = null;

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  CardField = stripe.CardField;
  useStripe = stripe.useStripe;
}

export default function OrderPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { total, items } = route.params as { total: number; items: any[] };
  const stripe = useStripe ? useStripe() : null;
  const { clearCart } = useOrderCart();

  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert('Error', 'Por favor completa los datos de la tarjeta');
      return;
    }

    setLoading(true);

    try {
      // Create order and get payment intent
      const response = await apiRequest('POST', '/api/orders', {
        items,
        businessId: items[0].businessId,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al crear el pedido');
      }

      // Confirm payment with Stripe
      const { error } = await stripe.confirmPayment(data.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      // Confirm payment on backend and award points
      const confirmResponse = await apiRequest('POST', '/api/orders/confirm', {
        orderId: data.orderId,
      });

      const confirmData = await confirmResponse.json();

      if (!confirmData.success) {
        throw new Error(confirmData.error);
      }

      clearCart();

      navigation.reset({
        index: 0,
        routes: [
          { name: 'Main' as never },
          {
            name: 'OrderQR' as never,
            params: { 
              order: {
                id: data.orderId,
                qrCode: confirmData.qrCode,
                totalAmount: total,
                pointsAwarded: confirmData.pointsAwarded,
              }
            } as never,
          },
        ],
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} disabled={loading}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2" style={{ marginLeft: Spacing.md }}>
          Pagar Pedido
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.card, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Resumen del Pedido
          </ThemedText>
          
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <ThemedText type="body">
                {item.quantity}x {item.productName}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                ${((item.productPrice * item.quantity) / 100).toFixed(2)}
              </ThemedText>
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.itemRow}>
            <ThemedText type="h3">Total a pagar</ThemedText>
            <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
              ${(total / 100).toFixed(2)}
            </ThemedText>
          </View>

          <View style={[styles.pointsBox, { backgroundColor: AstroBarColors.primary + '20' }]}>
            <Feather name="award" size={20} color={AstroBarColors.primary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: AstroBarColors.primary }}>
              Ganarás {Math.floor(total / 100)} puntos con este pedido
            </ThemedText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Método de Pago
          </ThemedText>

          {Platform.OS !== 'web' && CardField ? (
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{
                backgroundColor: theme.background,
                textColor: theme.text,
                placeholderColor: theme.textSecondary,
              }}
              style={styles.cardField}
              onCardChange={(cardDetails: any) => {
                setCardComplete(cardDetails.complete);
              }}
            />
          ) : (
            <View style={[styles.webPaymentBox, { backgroundColor: theme.background }]}>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                Pago con tarjeta solo disponible en la app móvil
              </ThemedText>
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary, flex: 1 }}>
              Pago seguro procesado por Stripe. Tus datos están protegidos.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, paddingBottom: insets.bottom + Spacing.md }, Shadows.lg]}>
        <Pressable
          onPress={handlePayment}
          disabled={loading || !cardComplete}
          style={[
            styles.payButton,
            {
              backgroundColor: loading || !cardComplete ? theme.border : AstroBarColors.primary,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
              Pagar ${(total / 100).toFixed(2)}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: Spacing.md,
  },
  webPaymentBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  payButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
});
