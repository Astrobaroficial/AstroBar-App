import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors } from '@/constants/theme';
import { useOrderCart } from '@/contexts/OrderCartContext';
import { apiRequest } from '@/lib/query-client';

export default function OrderCartScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useOrderCart();
  const [loading, setLoading] = useState(false);

  const subtotal = getTotal();
  const commissionAmount = Math.round(subtotal * 0.15);
  const total = subtotal + commissionAmount;

  const handlePayment = async () => {
    if (Platform.OS === 'web') {
      // Web: crear pedido sin Stripe
      setLoading(true);
      try {
        const response = await apiRequest('POST', '/api/orders', { items, businessId: items[0].businessId });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        clearCart();
        alert(`¡Pedido creado! Código: ${data.qrCode}\nGanaste ${Math.floor(total / 100)} puntos`);
        navigation.goBack();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Móvil: navegar a pantalla de pago con Stripe
      navigation.navigate('OrderPayment' as never, { total, items } as never);
    }
  };

  if (items.length === 0) {
    return (
      <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2" style={{ marginLeft: Spacing.md }}>Carrito</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
          <ThemedText style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            Tu carrito está vacío
          </ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2" style={{ flex: 1, marginLeft: Spacing.md }}>
          Carrito ({items.length})
        </ThemedText>
        <Pressable onPress={clearCart}>
          <Feather name="trash-2" size={20} color={AstroBarColors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.productId} style={[styles.itemCard, { backgroundColor: theme.card }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{item.productName}</ThemedText>
              <ThemedText type="small" style={{ color: AstroBarColors.primary, marginTop: 4 }}>
                ${(item.productPrice / 100).toFixed(2)} c/u
              </ThemedText>
              <View style={styles.quantityContainer}>
                <Pressable 
                  onPress={() => updateQuantity(item.productId, item.quantity - 1)} 
                  style={[styles.quantityButton, { backgroundColor: theme.border }]}
                >
                  <Feather name="minus" size={16} color={theme.text} />
                </Pressable>
                <ThemedText type="body" style={{ marginHorizontal: Spacing.md, minWidth: 30, textAlign: 'center' }}>
                  {item.quantity}
                </ThemedText>
                <Pressable 
                  onPress={() => updateQuantity(item.productId, item.quantity + 1)} 
                  style={[styles.quantityButton, { backgroundColor: AstroBarColors.primary }]}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
                ${((item.productPrice * item.quantity) / 100).toFixed(2)}
              </ThemedText>
              <Pressable onPress={() => removeItem(item.productId)} style={{ marginTop: Spacing.sm }}>
                <Feather name="x" size={20} color={AstroBarColors.error} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <View style={styles.summaryRow}>
            <ThemedText type="body">Subtotal</ThemedText>
            <ThemedText type="body">${(subtotal / 100).toFixed(2)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Comisión (15%)</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              ${(commissionAmount / 100).toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
              ${(total / 100).toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handlePayment}
          disabled={loading}
          style={[styles.payButton, { backgroundColor: loading ? theme.border : AstroBarColors.primary }]}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 150,
  },
  itemCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AstroBarColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  payButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
});
