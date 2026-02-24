import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmerPosition.value, [0, 1], [-200, 200]),
      },
    ],
  }));

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.skeleton,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={["transparent", theme.skeletonHighlight, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function BusinessCardSkeleton() {
  return (
    <View style={styles.businessCard}>
      <Skeleton height={140} borderRadius={BorderRadius.lg} />
      <View style={styles.businessCardContent}>
        <Skeleton
          width="70%"
          height={20}
          style={{ marginBottom: Spacing.xs }}
        />
        <Skeleton
          width="50%"
          height={14}
          style={{ marginBottom: Spacing.sm }}
        />
        <View style={styles.row}>
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} />
        </View>
      </View>
    </View>
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard}>
      <Skeleton height={120} borderRadius={BorderRadius.md} />
      <View style={styles.productCardContent}>
        <Skeleton
          width="80%"
          height={16}
          style={{ marginBottom: Spacing.xs }}
        />
        <Skeleton
          width="100%"
          height={12}
          style={{ marginBottom: Spacing.xs }}
        />
        <Skeleton width="40%" height={20} style={{ marginTop: Spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 200,
  },
  businessCard: {
    marginBottom: Spacing.lg,
  },
  businessCardContent: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productCard: {
    marginBottom: Spacing.md,
  },
  productCardContent: {
    padding: Spacing.md,
  },
});
