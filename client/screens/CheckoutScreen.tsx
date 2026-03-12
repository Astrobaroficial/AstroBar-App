import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCart } from '@/contexts/CartContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { cart, subtotal, clearCart } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedText>Carrito vacío</ThemedText>
      </View>
    );
  }

  const productosBase = subtotal;
  const commission = productosBase * 0.15;
  const total = productosBase + commission;

  const handlePayment = () => {
    Alert.alert(
      'Funcionalidad en desarrollo',
      'El pago con Mercado Pago estará disponible próximamente',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2">Confirmar Pedido</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.card }, Shadows.md]}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            {cart.businessName}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {cart.items.length} {cart.items.length === 1 ? 'producto' : 'productos'}
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }, Shadows.md]}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Resumen
          </ThemedText>
          
          <View style={styles.row}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Productos
            </ThemedText>
            <ThemedText type="body">${productosBase.toFixed(2)}</ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Comisión AstroBar (15%)
            </ThemedText>
            <ThemedText type="body">${commission.toFixed(2)}</ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText type="h2" style={{ color: AstroBarColors.primary }}>
              ${total.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={20} color={AstroBarColors.info} />
          <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1, color: AstroBarColors.info }}>
            Canjea tu pedido en el bar después de confirmar el pago
          </ThemedText>
        </View>

        <Pressable
          onPress={handlePayment}
          style={[styles.payButton, { backgroundColor: AstroBarColors.primary }]}
        >
          <Feather name="credit-card" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>
            Pagar ${total.toFixed(2)}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  payButton: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
