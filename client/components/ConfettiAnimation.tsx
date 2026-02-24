import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3",
  "#A8D8EA",
  "#FF8C00",
  "#E040FB",
  "#00BCD4",
  "#FFEB3B",
];

interface ConfettiPieceProps {
  index: number;
  onComplete?: () => void;
  isLast?: boolean;
}

function ConfettiPiece({ index, onComplete, isLast }: ConfettiPieceProps) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const startX = Math.random() * SCREEN_WIDTH;
  const size = 8 + Math.random() * 8;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = Math.random() * 800;
  const duration = 2500 + Math.random() * 1500;
  const horizontalDrift = (Math.random() - 0.5) * 150;
  const rotations = 2 + Math.random() * 4;
  const isCircle = Math.random() > 0.5;

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(
        SCREEN_HEIGHT + 100,
        {
          duration,
          easing: Easing.out(Easing.quad),
        },
        (finished) => {
          if (finished && isLast && onComplete) {
            runOnJS(onComplete)();
          }
        },
      ),
    );

    translateX.value = withDelay(
      delay,
      withSequence(
        withTiming(horizontalDrift, { duration: duration / 3 }),
        withTiming(-horizontalDrift / 2, { duration: duration / 3 }),
        withTiming(horizontalDrift / 3, { duration: duration / 3 }),
      ),
    );

    rotate.value = withDelay(
      delay,
      withTiming(rotations * 360, {
        duration,
        easing: Easing.linear,
      }),
    );

    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 }),
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        animatedStyle,
        {
          left: startX,
          width: size,
          height: isCircle ? size : size * 1.5,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
      ]}
    />
  );
}

interface ConfettiAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
  particleCount?: number;
}

export function ConfettiAnimation({
  isActive,
  onComplete,
  particleCount = 60,
}: ConfettiAnimationProps) {
  if (!isActive) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: particleCount }).map((_, index) => (
        <ConfettiPiece
          key={index}
          index={index}
          isLast={index === particleCount - 1}
          onComplete={onComplete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 1000,
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
  },
});
