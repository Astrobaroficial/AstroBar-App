import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
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
      const { data } = await api.get("/business/stats");
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
        <ThemedText type="h3">Estadísticas Completas</ThemedText>
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
                ${((stats?.revenue?.today || 0) / 100).toFixed(2)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Ventas de hoy
              </ThemedText>
            </View>

            <View style={styles.row}>
              <View style={[styles.smallCard, { backgroundColor: theme.card }]}>
                <Feather name="check-circle" size={24} color="#4CAF50" />
                <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                  {stats?.orders?.completed || 0}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Canjes totales
                </ThemedText>
              </View>

              <View style={[styles.smallCard, { backgroundColor: theme.card }]}>
                <Feather name="x-circle" size={24} color="#F44336" />
                <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                  {stats?.cancellationRate || 0}%
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Tasa cancelación
                </ThemedText>
              </View>
            </View>

            {stats?.topProducts && stats.topProducts.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>Top Productos</ThemedText>
                {stats.topProducts.map((product: any, index: number) => (
                  <View key={index} style={styles.productRow}>
                    <ThemedText type="body" style={{ flex: 1 }}>{product.name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>{product.quantity} vendidos</ThemedText>
                    <ThemedText type="body" style={{ color: "#4CAF50", marginLeft: 8 }}>${product.revenue.toFixed(2)}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {stats?.peakHours && stats.peakHours.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Feather name="clock" size={24} color="#8B5CF6" />
                <ThemedText type="h3" style={{ marginTop: Spacing.sm, marginBottom: Spacing.sm }}>Horarios Pico</ThemedText>
                {stats.peakHours.map((hour: any, index: number) => (
                  <View key={index} style={styles.hourRow}>
                    <ThemedText type="body">{hour.hour}:00 - {hour.hour + 1}:00</ThemedText>
                    <ThemedText type="body" style={{ color: AstroBarColors.primary }}>{hour.count} canjes</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {stats?.topUsers && stats.topUsers.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Feather name="users" size={24} color="#FFD700" />
                <ThemedText type="h3" style={{ marginTop: Spacing.sm, marginBottom: Spacing.sm }}>Top Clientes</ThemedText>
                {stats.topUsers.map((user: any, index: number) => (
                  <View key={index} style={styles.userRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body">{user.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{user.phone}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText type="body" style={{ color: AstroBarColors.primary }}>{user.redemptions} canjes</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>${user.totalSpent.toFixed(2)}</ThemedText>
                    </View>
                  </View>
                ))}
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
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
});
