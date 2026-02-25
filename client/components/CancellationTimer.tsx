import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './ThemedText';
import { AstroBarColors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onComplete: () => void;
  transactionId: string;
  promotionTitle: string;
  amount: number;
  duration?: number; // seconds, default 60
}

export function CancellationTimer({ 
  visible, 
  onCancel, 
  onComplete, 
  transactionId,
  promotionTitle,
  amount,
  duration = 60 
}: Props) {
  const { theme } = useTheme();
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTimeLeft(duration);
      setIsExpired(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((duration - timeLeft) / duration) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }, Shadows.lg]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.warningLight }]}>
              <Feather name="clock" size={32} color={AstroBarColors.warning} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              Promoción Aceptada
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Tienes tiempo limitado para cancelar
            </ThemedText>
          </View>

          {/* Promotion Info */}
          <View style={[styles.promoInfo, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              {promotionTitle}
            </ThemedText>
            <ThemedText type="h4" style={{ color: AstroBarColors.success }}>
              {formatCurrency(amount)}
            </ThemedText>
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <View style={styles.timerContainer}>
              <View style={[
                styles.progressRing,
                { borderColor: timeLeft <= 10 ? AstroBarColors.error : AstroBarColors.warning }
              ]}>
                <ThemedText type="h1" style={{
                  color: timeLeft <= 10 ? AstroBarColors.error : AstroBarColors.warning,
                  fontWeight: '700'
                }}>
                  {timeLeft}
                </ThemedText>
              </View>
              <ThemedText type="small" style={[styles.timerLabel, { color: theme.textSecondary }]}>
                segundos para cancelar
              </ThemedText>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View style={[
                styles.progressFill,
                { 
                  width: `${getProgressPercentage()}%`,
                  backgroundColor: timeLeft <= 10 ? AstroBarColors.error : AstroBarColors.warning
                }
              ]} />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.cancelButton,
                { 
                  backgroundColor: AstroBarColors.error,
                  opacity: isExpired ? 0.5 : 1
                }
              ]}
              onPress={handleCancel}
              disabled={isExpired}
            >
              <Feather name="x" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.cancelButtonText}>
                Cancelar Promoción
              </ThemedText>
            </Pressable>

            <ThemedText type="small" style={[styles.keepNote, { color: theme.textSecondary }]}>
              Si no cancelas, se generará tu código QR automáticamente
            </ThemedText>
          </View>

          {/* Warning */}
          <View style={[styles.warningCard, { backgroundColor: AstroBarColors.errorLight }]}>
            <Feather name="alert-triangle" size={16} color={AstroBarColors.error} />
            <ThemedText type="small" style={{ color: AstroBarColors.error, flex: 1, marginLeft: Spacing.sm }}>
              Después de este tiempo no podrás cancelar la promoción
            </ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 350,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  promoInfo: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timerLabel: {
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minWidth: 200,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  keepNote: {
    textAlign: 'center',
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});