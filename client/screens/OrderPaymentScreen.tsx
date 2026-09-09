import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useUnifiedCart } from "@/contexts/UnifiedCartContext";

export default function OrderPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { total, items, businessId } = route.params || {};
  const { clearCart } = useUnifiedCart();

  const [loading, setLoading] = useState(false);
  const [checkingMP, setCheckingMP] = useState(true);
  const [mpConnected, setMpConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkMercadoPagoStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkMercadoPagoStatus();
    }, [])
  );

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url && event.url.includes("mp-connected")) {
        checkMercadoPagoStatus();
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && url.includes("mp-connected")) {
        checkMercadoPagoStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkMercadoPagoStatus = async () => {
    setCheckingMP(true);
    try {
      const response = await apiRequest("GET", "/api/customer-mp/status");
      const data = await response.json();
      setMpConnected(Boolean(data.success && data.connected));
    } catch (error) {
      console.error("Error checking MP status:", error);
      setMpConnected(false);
    } finally {
      setCheckingMP(false);
    }
  };

  const handleConnectMercadoPago = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnecting(true);
    try {
      const response = await apiRequest("GET", "/api/customer-mp/connect");
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        await Linking.openURL(data.authUrl);
      } else {
        Alert.alert("Error", "No se pudo generar la URL de conexión con Mercado Pago");
      }
    } catch (error: any) {
      console.error("Error connecting MP:", error);
      Alert.alert("Error", error.message || "No se pudo conectar");
    } finally {
      setConnecting(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      let response = await apiRequest("POST", "/api/orders", { 
        items,
        total,
        businessId
      });

      if (response.status === 404) {
        response = await apiRequest("POST", "/api/orders/create", {
          items,
          total,
          businessId
        });
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Error al crear el pedido");
      }

      const checkoutUrl = data.initPoint;

      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
        
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearCart();
          Alert.alert("¡Pedido en proceso!", "Tu pago fue redirigido a Mercado Pago.", [
            { text: "Ver pedidos", onPress: () => navigation.navigate("Main") }
          ]);
        }, 1200);
      } else {
        throw new Error("No se pudo obtener la URL de pago de Mercado Pago");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Error", error.message || "No se pudo procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  const formattedTotal = typeof total === "number" 
    ? (total > 10000 ? total / 100 : total).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
    : "$0,00";

  if (checkingMP) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AstroBarColors.primary} />
          <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
            Verificando método de pago...
          </ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <ThemedText type="h2" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          {mpConnected ? "Confirmar Pedido" : "Vincula tu Cuenta"}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Resumen del pedido</ThemedText>
          <ThemedText type="body" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            {items?.length || 0} {items?.length === 1 ? 'producto' : 'productos'}
          </ThemedText>

          <View style={styles.divider} />

          <View style={styles.row}>
            <ThemedText type="body">Total a pagar</ThemedText>
            <ThemedText type="h2" style={{ color: "#FFD700" }}>
              {formattedTotal}
            </ThemedText>
          </View>
        </View>

        {!mpConnected ? (
          <>
            <View style={[styles.warningCard, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="alert-circle" size={24} color={AstroBarColors.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="body" style={{ color: AstroBarColors.warning, fontWeight: '600' }}>
                  Cuenta no vinculada
                </ThemedText>
                <ThemedText type="small" style={{ color: AstroBarColors.warning, marginTop: Spacing.xs }}>
                  Necesitas conectar tu cuenta de Mercado Pago para pagar
                </ThemedText>
              </View>
            </View>

            <View style={[styles.stepsCard, { backgroundColor: theme.card }, Shadows.sm]}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>¿Cómo funciona?</ThemedText>
              
              <View style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.primaryLight }]}>
                  <ThemedText type="small" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>1</ThemedText>
                </View>
                <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
                  Conecta tu cuenta de Mercado Pago
                </ThemedText>
              </View>

              <View style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.successLight }]}>
                  <ThemedText type="small" style={{ color: AstroBarColors.success, fontWeight: '600' }}>2</ThemedText>
                </View>
                <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
                  Autoriza el pago de forma segura
                </ThemedText>
              </View>

              <View style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: AstroBarColors.infoLight }]}>
                  <ThemedText type="small" style={{ color: AstroBarColors.info, fontWeight: '600' }}>3</ThemedText>
                </View>
                <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
                  Recibe confirmación de tu pedido
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={handleConnectMercadoPago}
              disabled={connecting}
              style={[styles.connectButton, { backgroundColor: AstroBarColors.primary, opacity: connecting ? 0.6 : 1 }]}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="link" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
                  <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                    Conectar Mercado Pago
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.successCard, { backgroundColor: AstroBarColors.successLight }]}>
              <Feather name="check-circle" size={24} color={AstroBarColors.success} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="body" style={{ color: AstroBarColors.success, fontWeight: '600' }}>
                  ✅ Cuenta Conectada
                </ThemedText>
                <ThemedText type="small" style={{ color: AstroBarColors.success, marginTop: Spacing.xs }}>
                  Listo para pagar con Mercado Pago
                </ThemedText>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.card + "80" }]}>
              <Feather name="info" size={20} color={AstroBarColors.info} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}>
                El bar preparará tu pedido una vez confirmado el pago
              </ThemedText>
            </View>

            <Pressable
              onPress={handlePayment}
              disabled={loading}
              style={[styles.payButton, { backgroundColor: AstroBarColors.primary, opacity: loading ? 0.6 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="credit-card" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
                  <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                    Pagar {formattedTotal}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: { paddingHorizontal: Spacing.lg },
  backButton: { marginBottom: Spacing.md },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    justify.content: "space-between",
    alignItems: "center",
  },
  warningCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  successCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  stepsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  connectButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  payButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});