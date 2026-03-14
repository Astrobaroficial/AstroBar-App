import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type PromotionQRScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "PromotionQR">;
  route: RouteProp<RootStackParamList, "PromotionQR">;
};

export default function PromotionQRScreen({
  navigation,
  route,
}: PromotionQRScreenProps) {
  const { theme } = useTheme();
  const { transaction, promotion, business } = route.params;

  const [canCancel, setCanCancel] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const cancelDeadline = new Date(transaction.canCancelUntil);
    const now = new Date();
    const secondsLeft = Math.max(0, Math.floor((cancelDeadline.getTime() - now.getTime()) / 1000));
    
    setTimeLeft(secondsLeft);
    setCanCancel(secondsLeft > 0);

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
  }, [transaction.canCancelUntil]);

  const handleCancel = async () => {
    if (!canCancel) return;

    setIsCancelling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await apiRequest("POST", `/api/promotions/transactions/${transaction.id}/cancel`);
      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert("Promoción cancelada exitosamente");
        navigation.goBack();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert(data.error || "Error al cancelar");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert(error.message || "Error al cancelar");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || "#1A1A2E", theme.gradientEnd || "#16213E"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={48} color="#4CAF50" />
          </View>
          <ThemedText type="h2" style={styles.title}>
            ¡Promoción Aceptada!
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Mostrá este código QR en el bar para canjear
          </ThemedText>
        </View>

        {/* QR Code */}
        <View style={[styles.qrCard, { backgroundColor: "#FFFFFF" }]}>
          <QRCode
            value={transaction.qrCode}
            size={250}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
          <ThemedText type="h3" style={styles.qrCode}>
            {transaction.qrCode}
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
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {promotion.title}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={20} color={AstroBarColors.primary} />
            <View style={styles.detailContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Bar
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {business.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Feather name="dollar-sign" size={20} color="#4CAF50" />
            <View style={styles.detailContent}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Total pagado
              </ThemedText>
              <ThemedText type="h3" style={{ color: "#4CAF50" }}>
                ${(transaction.amountPaid / 100).toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Cancel Timer */}
        {canCancel && (
          <View style={[styles.cancelCard, { backgroundColor: "rgba(244, 67, 54, 0.1)" }]}>
            <View style={styles.cancelTimer}>
              <ThemedText type="h3" style={{ color: "#F44336" }}>
                {timeLeft}s
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: "#F44336" }}>
                Podés cancelar en los próximos {timeLeft} segundos
              </ThemedText>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}>
          <Feather name="info" size={20} color="#FFD700" />
          <ThemedText type="small" style={styles.infoText}>
            Mostrá este QR al personal del bar para canjear tu promoción.
            Ganarás 10 puntos automáticamente al canjear.
          </ThemedText>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {canCancel ? (
            <Button
              onPress={handleCancel}
              disabled={isCancelling}
              style={[styles.cancelButton, { backgroundColor: "#F44336" }]}
            >
              {isCancelling ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "CANCELAR PROMOCIÓN"
              )}
            </Button>
          ) : (
            <Button
              onPress={handleDone}
              style={[styles.doneButton, { backgroundColor: AstroBarColors.primary }]}
            >
              LISTO
            </Button>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  title: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  qrCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  qrCode: {
    marginTop: Spacing.lg,
    color: "#000000",
    fontWeight: "800",
    letterSpacing: 2,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  cancelCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  cancelTimer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: "#FFD700",
  },
  buttonsContainer: {
    gap: Spacing.md,
  },
  cancelButton: {
    height: 56,
  },
  doneButton: {
    height: 56,
  },
});
