import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ThemedText } from './ThemedText';
import { NemyColors, Spacing } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

interface OrderProgressBarProps {
  status: string;
}

const statusSteps = [
  { key: 'pending', label: 'Pendiente', icon: 'clock' },
  { key: 'accepted', label: 'Aceptado', icon: 'check-circle' },
  { key: 'preparing', label: 'Preparando', icon: 'package' },
  { key: 'ready', label: 'Listo', icon: 'check' },
  { key: 'picked_up', label: 'Recogido', icon: 'truck' },
  { key: 'arriving', label: 'Llegando', icon: 'navigation' },
  { key: 'delivered', label: 'Entregado', icon: 'check-circle' },
];

export function OrderProgressBar({ status }: OrderProgressBarProps) {
  const currentStepIndex = statusSteps.findIndex(s => s.key === status);
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / statusSteps.length) * 100 : 0;
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Animación de pulso para el paso actual
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [status]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Barra de progreso */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <View key={step.key} style={styles.step}>
              <Animated.View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Feather
                  name={step.icon as any}
                  size={16}
                  color={isCompleted ? '#FFF' : '#999'}
                />
              </Animated.View>
              <ThemedText
                type="caption"
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                ]}
              >
                {step.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: '100%',
    backgroundColor: NemyColors.primary,
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: NemyColors.primary,
  },
  stepLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: NemyColors.primary,
    fontWeight: '600',
  },
});
