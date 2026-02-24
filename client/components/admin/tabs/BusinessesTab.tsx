import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { NemyColors } from "../../../constants/theme";
import { Business } from "../types/admin.types";

interface BusinessesTabProps {
  businesses: Business[];
  onBusinessPress: (business: Business) => void;
}

export const BusinessesTab: React.FC<BusinessesTabProps> = ({
  businesses,
  onBusinessPress,
}) => {
  return (
    <ScrollView style={styles.container}>
      {businesses.map((business) => (
        <TouchableOpacity
          key={business.id}
          style={styles.card}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBusinessPress(business);
          }}
        >
          <View style={styles.businessHeader}>
            <Text style={styles.businessName}>{business.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: business.isActive ? '#10B981' : '#EF4444' }
            ]}>
              <Text style={styles.statusText}>
                {business.isActive ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          <Text style={styles.businessType}>{business.type === 'restaurant' ? 'Restaurante' : 'Mercado'}</Text>
          <Text style={styles.businessAddress}>{business.address || 'Sin dirección'}</Text>
          <Text style={styles.businessPhone}>{business.phone || 'Sin teléfono'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  businessType: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  businessPhone: {
    fontSize: 12,
    color: "#666666",
  },
});
