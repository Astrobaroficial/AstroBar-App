import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

export default function PromotionCartScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const { data } = await api.get("/cart");
      setItems(data.items);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await api.delete(`/cart/${id}`);
      setItems(items.filter(item => item.id !== id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo eliminar el item");
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const price = item.type === "flash" ? item.flash_price : item.discounted_price;
      return sum + (price / 100);
    }, 0);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert("Carrito vacío", "Agrega promociones para continuar");
      return;
    }

    setProcessing(true);
    try {
      // Accept all promotions
      const acceptPromises = items.map(item =>
        api.post("/promotions/accept", {
          promotionId: item.promotion_id,
          type: item.type,
        })
      );

      const results = await Promise.all(acceptPromises);
      const userPromotionIds = results.map(r => r.data.userPromotionId);

      // Clear cart
      await api.delete("/cart");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to payment with all IDs
      navigation.replace("Payment", {
        userPromotionIds,
        amount: calculateTotal().toFixed(2),
        promoName: `${items.length} promociones`,
      });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "No se pudo procesar el carrito");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
        style={styles.container}
      >
        <ThemedText>Cargando...</ThemedText>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Carrito</ThemedText>
        <Pressable onPress={() => api.delete("/cart").then(loadCart)}>
          <Feather name="trash-2" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 }
        ]}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              Carrito vacío
            </ThemedText>
            <ThemedText type="body" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
              Agrega promociones para comenzar
            </ThemedText>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    {item.type === "flash" && (
                      <View style={[styles.badge, { backgroundColor: "#8B5CF620" }]}>
                        <Feather name="zap" size={12} color="#8B5CF6" />
                        <ThemedText type="caption" style={{ color: "#8B5CF6", marginLeft: 4 }}>
                          FLASH
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
                    {item.type === "flash" ? item.flash_name : item.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    {item.bar_name}
                  </ThemedText>
                  <ThemedText type="h4" style={{ color: "#FFD700", marginTop: Spacing.sm }}>
                    ${((item.type === "flash" ? item.flash_price : item.discounted_price) / 100).toFixed(2)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => removeItem(item.id)}
                  style={styles.removeButton}
                >
                  <Feather name="x" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.totalRow}>
            <ThemedText type="body">Total</ThemedText>
            <ThemedText type="h2" style={{ color: "#FFD700" }}>
              ${calculateTotal().toFixed(2)}
            </ThemedText>
          </View>
          <Pressable
            onPress={handleCheckout}
            disabled={processing}
            style={[styles.checkoutButton, { backgroundColor: "#8B5CF6", opacity: processing ? 0.6 : 1 }]}
          >
            <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
              {processing ? "Procesando..." : "Confirmar Compra"}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  checkoutButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
});
