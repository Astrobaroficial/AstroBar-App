import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { WebView } from 'react-native-webview';

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userPromotionId, amount, promoName } = route.params;

  const [loading, setLoading] = useState(false);
  const [checkingMP, setCheckingMP] = useState(true);
  const [mpConnected, setMpConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');

  useEffect(() => {
    checkMercadoPagoStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkMercadoPagoStatus();
    }, [])
  );

  const checkMercadoPagoStatus = async () => {
    setCheckingMP(true);
    try {
      const response = await apiRequest("GET", "/api/customer-mp/status");
      const data = await response.json();
      setMpConnected(data.success && data.connected);
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
        setWebViewUrl(data.authUrl);
        setShowWebView(true);
      } else {
        Alert.alert("Error", "No se pudo conectar con Mercado Pago");
      }
    } catch (error: any) {
      console.error("Error connecting MP:", error);
      Alert.alert("Error", error.message || "No se pudo conectar");
    } finally {
      setConnecting(false);
    }
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    if (url.includes('/api/customer-mp/callback') || url.includes('success') || url.includes('code=')) {
      setShowWebView(false);
      setWebViewUrl('');
      
      setTimeout(() => {
        checkMercadoPagoStatus();
      }, 500);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/customer-payment/create-payment", { 
        transactionId: userPromotionId 
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Error al crear pago");
      }
      
      if (data.initPoint) {
        setWebViewUrl(data.initPoint);
        setShowWebView(true);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Error", error.message || "No se pudo procesar el pago");
      setLoading(false);
    }
  };

  const handlePaymentWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    if (url.includes('astrobar://payment-success')) {
      setShowWebView(false);
      setWebViewUrl('');
      setLoading(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Pago exitoso!", "Tu promoción está lista", [
        { text: "Ver QR", onPress: () => navigation.replace("PromotionQR", { transactionId: userPromotionId }) }
      ]);
    } else if (url.includes('astrobar://payment-failure')) {
      setShowWebView(false);
      setWebViewUrl('');
      setLoading(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Pago fallido", "No se pudo completar el pago. Intenta nuevamente.");
    } else if (url.includes('astrobar://payment-pending')) {
      setShowWebView(false);
      setWebViewUrl('');
      setLoading(false);
      
      Alert.alert("Pago pendiente", "Tu pago está siendo procesado. Te notificaremos cuando esté listo.");
    }
  };

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
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <ThemedText type="h2" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          {mpConnected ? "Confirmar Pago" : "Vincula tu Cuenta"}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Promoción</ThemedText>
          <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>{promoName}</ThemedText>

          <View style={styles.divider} />

          <View style={styles.row}>
            <ThemedText type="body">Total</ThemedText>
            <ThemedText type="h2" style={{ color: "#FFD700" }}>
              ${amount}
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
                  Recibe tu código QR al instante
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
                Tienes 60 segundos para cancelar después de confirmar
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
                    Pagar ${amount}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      {/* WebView Modal para Checkout Pro */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          setShowWebView(false);
          setWebViewUrl('');
          setLoading(false);
        }}
      >
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.backgroundRoot }}>
          <View style={[styles.webViewHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <ThemedText type="h4">Pagar con Mercado Pago</ThemedText>
            <Pressable
              style={[styles.closeWebViewButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => {
                setShowWebView(false);
                setWebViewUrl('');
                setLoading(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          {webViewUrl ? (
            <WebView
              source={{ uri: webViewUrl }}
              onNavigationStateChange={handlePaymentWebViewNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={AstroBarColors.primary} />
                  <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                    Cargando Mercado Pago...
                  </ThemedText>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
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
  content: { flex: 1, paddingHorizontal: Spacing.lg },
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
    justifyContent: "space-between",
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
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeWebViewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
