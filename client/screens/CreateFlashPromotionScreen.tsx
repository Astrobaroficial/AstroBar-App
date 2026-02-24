import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { api } from "@/lib/api";

export default function CreateFlashPromotionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [stock, setStock] = useState("");
  const [duration, setDuration] = useState<5 | 10 | 15>(5);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !discountedPrice || !stock) {
      Alert.alert("Error", "Completa todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      await api.post("/promotions/flash", {
        name,
        description,
        original_price: parseFloat(originalPrice) || 0,
        discounted_price: parseFloat(discountedPrice),
        stock: parseInt(stock),
        duration_minutes: duration,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Éxito!", "Promoción flash creada", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "No se pudo crear la promoción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 }
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>
          Crear Promoción Flash
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
          Duración: 5, 10 o 15 minutos
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="small" style={{ marginBottom: Spacing.xs }}>Nombre *</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Ej: 2x1 en Cervezas"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            Descripción
          </ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalles de la promoción"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
                Precio Original
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={originalPrice}
                onChangeText={setOriginalPrice}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
                Precio Promo *
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={discountedPrice}
                onChangeText={setDiscountedPrice}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            Stock Disponible *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={stock}
            onChangeText={setStock}
            placeholder="Ej: 20"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
          />

          <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            Duración *
          </ThemedText>
          <View style={styles.durationRow}>
            {[5, 10, 15].map((min) => (
              <Pressable
                key={min}
                onPress={() => {
                  setDuration(min as 5 | 10 | 15);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.durationButton,
                  { backgroundColor: duration === min ? "#8B5CF6" : theme.background }
                ]}
              >
                <ThemedText style={{ color: duration === min ? "#FFF" : theme.text }}>
                  {min} min
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleCreate}
          disabled={loading}
          style={[styles.createButton, { backgroundColor: "#8B5CF6", opacity: loading ? 0.6 : 1 }]}
        >
          <Feather name="zap" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
            {loading ? "Creando..." : "Crear Promoción Flash"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  backButton: { marginBottom: Spacing.lg },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  durationRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  durationButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
