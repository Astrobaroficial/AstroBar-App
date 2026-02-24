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

export default function ActivePromotionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [flashPromos, setFlashPromos] = useState<any[]>([]);
  const [commonPromos, setCommonPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const [flash, common] = await Promise.all([
        api.get("/promotions/flash"),
        api.get("/promotions"),
      ]);
      setFlashPromos(flash.data.flashPromotions || []);
      setCommonPromos(common.data.promotions || []);
    } catch (error) {
      console.error("Error loading promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePromo = async (id: string, type: "flash" | "common") => {
    Alert.alert("Eliminar", "¿Seguro que quieres eliminar esta promoción?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/promotions/${type === "flash" ? "flash/" : ""}${id}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadPromotions();
          } catch (error: any) {
            Alert.alert("Error", "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Promociones Activas</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="zap" size={20} color="#8B5CF6" />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              Flash ({flashPromos.length}/3)
            </ThemedText>
          </View>
          {flashPromos.length === 0 ? (
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              No hay promociones flash activas
            </ThemedText>
          ) : (
            flashPromos.map((promo) => (
              <View key={promo.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4">{promo.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    Stock: {promo.stock} | ${(promo.discounted_price / 100).toFixed(2)}
                  </ThemedText>
                </View>
                <Pressable onPress={() => deletePromo(promo.id, "flash")} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={18} color="#FF4444" />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={20} color="#FFD700" />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              Comunes ({commonPromos.length}/10)
            </ThemedText>
          </View>
          {commonPromos.length === 0 ? (
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              No hay promociones comunes activas
            </ThemedText>
          ) : (
            commonPromos.map((promo) => (
              <View key={promo.id} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4">{promo.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    Stock: {promo.stock} | ${(promo.discounted_price / 100).toFixed(2)}
                  </ThemedText>
                </View>
                <Pressable onPress={() => deletePromo(promo.id, "common")} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={18} color="#FF4444" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  content: { paddingHorizontal: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  deleteBtn: {
    padding: Spacing.sm,
  },
});
