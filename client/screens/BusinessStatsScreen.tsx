import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

export default function BusinessStatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get("/stats");
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
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
        <ThemedText type="h3">Estadísticas</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {loading ? (
          <ThemedText>Cargando...</ThemedText>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Feather name="dollar-sign" size={32} color="#FFD700" />
              <ThemedText type="h1" style={{ color: "#FFD700", marginTop: Spacing.sm }}>
                ${((stats?.todaySales || 0) / 100).toFixed(2)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Ventas de hoy
              </ThemedText>
            </View>

            <View style={styles.row}>
              <View style={[styles.smallCard, { backgroundColor: theme.card }]}>
                <Feather name="check-circle" size={24} color="#4CAF50" />
                <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                  {stats?.todayRedemptions || 0}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Canjes hoy
                </ThemedText>
              </View>

              <View style={[styles.smallCard, { backgroundColor: theme.card }]}>
                <Feather name="trending-up" size={24} color="#8B5CF6" />
                <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                  {stats?.totalRedemptions || 0}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Total canjes
                </ThemedText>
              </View>
            </View>

            {stats?.topPromotion && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Feather name="award" size={32} color="#FFD700" />
                <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>
                  {stats.topPromotion.name}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Promoción más popular ({stats.topPromotion.redemptions} canjes)
                </ThemedText>
              </View>
            )}
          </>
        )}
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
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  smallCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
});
