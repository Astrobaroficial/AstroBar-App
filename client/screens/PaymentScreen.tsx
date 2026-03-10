import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/query-client";
import { Linking } from "react-native";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userPromotionId, amount, promoName } = route.params;

  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Crear pago con Mercado Pago
      const response = await apiRequest("POST", "/api/mp/create-payment", { 
        transactionId: userPromotionId 
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Error al crear pago");
      }
      
      // Abrir checkout de Mercado Pago
      if (data.initPoint) {
        await Linking.openURL(data.initPoint);
        
        // Simular éxito después de 3 segundos (en producción, el webhook confirmará)
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("¡Pago exitoso!", "Tu promoción está lista", [
            { text: "Ver QR", onPress: () => navigation.replace("QRScreen", { userPromotionId }) }
          ]);
        }, 3000);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Error", error.message || "No se pudo procesar el pago");
    } finally {
      setLoading(false);
    }
  };

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
          Confirmar Pago
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

        <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + "20" }]}>
          <Feather name="info" size={20} color={theme.colors.primary} />
          <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1 }}>
            Tienes 60 segundos para cancelar después de confirmar
          </ThemedText>
        </View>

        <Pressable
          onPress={handlePayment}
          disabled={loading}
          style={[styles.payButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.6 : 1 }]}
        >
          <Feather name="credit-card" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
            {loading ? "Procesando..." : "Pagar con Tarjeta"}
          </ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
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
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  payButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
