import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

interface Driver {
  id: string;
  name: string;
  location?: {
    latitude: string;
    longitude: string;
  };
  activeOrder?: boolean;
}

interface Order {
  id: string;
  status: string;
  customer: {
    name: string;
  };
  deliveryAddress: {
    latitude?: string;
    longitude?: string;
  };
}

interface MapProps {
  activeOrders: Order[];
  onlineDrivers: Driver[];
}

export function NativeMap({ activeOrders, onlineDrivers }: MapProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.placeholder, { backgroundColor: theme.card }]}>
      <Feather name="map" size={48} color={theme.textSecondary} />
      <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
        Mapa disponible en la app móvil
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
      >
        {onlineDrivers.length} repartidores | {activeOrders.length} pedidos
        activos
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 250,
    width: "100%",
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
