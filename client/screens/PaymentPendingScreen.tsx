import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type PaymentPendingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "PaymentPending">;
  route: RouteProp<RootStackParamList, "PaymentPending">;
};

export default function PaymentPendingScreen({
  navigation,
  route,
}: PaymentPendingScreenProps) {
  const { theme } = useTheme();
  const { transaction, promotion, business } = route.params;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar estado del pago cada 3 segundos
    const interval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/promotions/transactions/${transaction.id}`);
        const data = await response.json();

        if (data.success && data.transaction) {
          if (data.transaction.status === "confirmed" || data.transaction.status === "pending") {
            // Pago confirmado, mostrar QR
            clearInterval(interval);
            navigation.replace("PromotionQR", {
              transaction: data.transaction,
              promotion,
              business,
            });
          } else if (data.transaction.status === "cancelled") {
            // Pago cancelado
            clearInterval(interval);
            navigation.replace("Home");
          }
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      }
    }, 3000);

    // Timeout después de 5 minutos
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setChecking(false);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [transaction.id]);

  return (
    <LinearGradient
      colors={[theme.gradientStart || "#1A1A2E", theme.gradientEnd || "#16213E"]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ActivityIndicator size="large" color={AstroBarColors.primary} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          Procesando pago...
        </ThemedText>

        <ThemedText type="body" style={styles.message}>
          Completa el pago en Mercado Pago para recibir tu código QR
        </ThemedText>

        <View style={[styles.infoCard, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}>
          <Feather name="info" size={20} color="#FFD700" />
          <ThemedText type="small" style={styles.infoText}>
            Una vez confirmado el pago, recibirás automáticamente tu código QR para canjear en el bar
          </ThemedText>
        </View>

        {!checking && (
          <ThemedText type="small" style={styles.timeoutText}>
            ¿El pago no se procesó? Verifica tu historial de transacciones
          </ThemedText>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.xl,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    color: "#FFD700",
  },
  timeoutText: {
    marginTop: Spacing.xl,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
});
