import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function BusinessHoursScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [hours, setHours] = useState<any>({
    Lunes: { open: "18:00", close: "02:00", closed: false },
    Martes: { open: "18:00", close: "02:00", closed: false },
    Miércoles: { open: "18:00", close: "02:00", closed: false },
    Jueves: { open: "18:00", close: "02:00", closed: false },
    Viernes: { open: "18:00", close: "04:00", closed: false },
    Sábado: { open: "18:00", close: "04:00", closed: false },
    Domingo: { open: "18:00", close: "02:00", closed: true },
  });
  const [saving, setSaving] = useState(false);

  const saveHours = async () => {
    setSaving(true);
    try {
      await api.post("/businesses/hours", { hours });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("¡Guardado!", "Horarios actualizados");
    } catch (error: any) {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
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
        <ThemedText type="h3">Horarios</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {DAYS.map((day) => (
          <View key={day} style={[styles.dayCard, { backgroundColor: theme.card }]}>
            <View style={styles.dayHeader}>
              <ThemedText type="h4">{day}</ThemedText>
              <View style={styles.closedToggle}>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
                  Cerrado
                </ThemedText>
                <Switch
                  value={hours[day].closed}
                  onValueChange={(val) => {
                    setHours({ ...hours, [day]: { ...hours[day], closed: val } });
                    Haptics.selectionAsync();
                  }}
                  trackColor={{ false: "#767577", true: "#FF4444" }}
                  thumbColor="#fff"
                />
              </View>
            </View>
            {!hours[day].closed && (
              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                    Apertura
                  </ThemedText>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.background, color: theme.text }]}
                    value={hours[day].open}
                    onChangeText={(text) => setHours({ ...hours, [day]: { ...hours[day], open: text } })}
                    placeholder="18:00"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                    Cierre
                  </ThemedText>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.background, color: theme.text }]}
                    value={hours[day].close}
                    onChangeText={(text) => setHours({ ...hours, [day]: { ...hours[day], close: text } })}
                    placeholder="02:00"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            )}
          </View>
        ))}

        <Pressable
          onPress={saveHours}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: "#8B5CF6", opacity: saving ? 0.6 : 1 }]}
        >
          <Feather name="save" size={20} color="#FFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
            {saving ? "Guardando..." : "Guardar Horarios"}
          </ThemedText>
        </Pressable>
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
  dayCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  closedToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
  },
  timeInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
    textAlign: "center",
  },
  saveButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
});
