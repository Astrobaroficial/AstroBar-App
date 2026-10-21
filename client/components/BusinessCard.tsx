import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Badge } from "@/components/Badge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { Business } from "@/types";

interface BusinessCardProps {
  business: Business;
  onPress: () => void;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BusinessCard({
  business,
  onPress,
  compact = false,
}: BusinessCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  if (compact) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactCard,
          { backgroundColor: theme.card },
          Shadows.md,
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: business.profileImage }}
          style={styles.compactImage}
          contentFit="cover"
        />
        <View style={styles.compactContent}>
          <ThemedText type="small" numberOfLines={1} style={styles.compactName}>
            {business.name}
          </ThemedText>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color={AstroBarColors.warning} />
            <ThemedText type="caption" style={styles.ratingText}>
              {business.rating}
            </ThemedText>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.card },
        Shadows.md,
        animatedStyle,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: business.bannerImage }}
          style={styles.image}
          contentFit="cover"
        />
        {!business.isOpen ? (
          <View style={styles.closedOverlay}>
            <ThemedText type="small" style={styles.closedText}>
              Cerrado
            </ThemedText>
          </View>
        ) : null}
        {business.type === "market" ? (
          <Badge text="Mercado" variant="primary" style={styles.typeBadge} />
        ) : null}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="h4" numberOfLines={1} style={styles.name}>
            {business.name}
          </ThemedText>
          <View style={styles.ratingContainer}>
            <Feather name="star" size={14} color={AstroBarColors.warning} />
            <ThemedText type="small" style={styles.rating}>
              {business.rating}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              ({business.reviewCount})
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: theme.textSecondary }}
        >
          {business.categories.join(" · ")}
        </ThemedText>
        <View style={styles.footer}>
          <View style={styles.pickupInfo}>
            <Feather name="shopping-bag" size={14} color="#00f2fe" />
            <ThemedText
              type="caption"
              style={[styles.pickupText, { color: theme.text }]}
            >
              Retiro en local
            </ThemedText>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 140,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  closedText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  typeBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  name: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  pickupInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 242, 254, 0.1)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  pickupText: {
    fontWeight: "600",
  },
  compactCard: {
    width: 140,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginRight: Spacing.md,
  },
  compactImage: {
    width: "100%",
    height: 100,
  },
  compactContent: {
    padding: Spacing.sm,
  },
  compactName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontWeight: "500",
  },
});