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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/user-promotions/history");
      setHistory(data.history || []);
    } catch (error) {
      console.error("Error loading history:", error);
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
        <ThemedText type="h3">Historial</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {loading ? (
          <ThemedText>Cargando...</ThemedText>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              Sin historial
            </ThemedText>
            <ThemedText type="body" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
              Tus promociones canjeadas aparecerán aquí
            </ThemedText>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4">{item.promotion_name}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    {item.bar_name}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { backgroundColor: "#4CAF5020" }]}>
                  <Feather name="check-circle" size={16} color="#4CAF50" />
                  <ThemedText type="caption" style={{ color: "#4CAF50", marginLeft: 4 }}>
                    Canjeado
                  </ThemedText>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                  <Feather name="dollar-sign" size={16} color="#FFD700" />
                  <ThemedText type="body" style={{ marginLeft: 4 }}>
                    ${(item.price / 100).toFixed(2)}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="award" size={16} color="#8B5CF6" />
                  <ThemedText type="body" style={{ marginLeft: 4 }}>
                    +10 puntos
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {new Date(item.redeemed_at).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
          ))
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
