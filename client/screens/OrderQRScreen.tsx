import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

export default function OrderQRScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params as { order: any };

  const [canCancel, setCanCancel] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const cancelDeadline = new Date(order.canCancelUntil).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((cancelDeadline - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        setCanCancel(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.canCancelUntil]);

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Pedido',
      '¿Estás seguro? Se te reembolsará el dinero.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiRequest('POST', `/api/orders/${order.id}/cancel`);
              const data = await response.json();

              if (data.success) {
                Alert.alert('Cancelado', 'Tu pedido ha sido cancelado');
                navigation.navigate('Main' as never);
              } else {
                Alert.alert('Error', data.error);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.navigate('Main' as never)} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.qrContainer, { backgroundColor: theme.card }, Shadows.lg]}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.lg, textAlign: 'center' }}>
            Tu Pedido
          </ThemedText>

          <View style={styles.qrWrapper}>
            <QRCode value={order.qrCode} size={220} backgroundColor="white" />
          </View>

          <ThemedText type="body" style={{ marginTop: Spacing.lg, textAlign: 'center', color: theme.textSecondary }}>
            Muestra este código al bar para recibir tu pedido
          </ThemedText>

          <View style={[styles.infoBox, { backgroundColor: AstroBarColors.primary + '20', marginTop: Spacing.lg }]}>
            <Feather name="award" size={20} color={AstroBarColors.primary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: AstroBarColors.primary }}>
              ¡Ganaste {Math.floor(order.totalAmount / 100)} puntos!
            </ThemedText>
          </View>

          {canCancel && (
            <View style={[styles.cancelBox, { backgroundColor: theme.background, marginTop: Spacing.md }]}>
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                Puedes cancelar en {timeLeft}s
              </ThemedText>
            </View>
          )}
        </View>

        {canCancel && (
          <Pressable
            onPress={handleCancel}
            style={[styles.cancelButton, { backgroundColor: theme.card }, Shadows.sm]}
          >
            <Feather name="x-circle" size={20} color={AstroBarColors.error} />
            <ThemedText style={{ marginLeft: Spacing.sm, color: AstroBarColors.error, fontWeight: '600' }}>
              Cancelar Pedido
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          onPress={() => navigation.navigate('Main' as never)}
          style={[styles.doneButton, { backgroundColor: AstroBarColors.primary }]}
        >
          <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Volver al Inicio
          </ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  qrContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  qrWrapper: {
    padding: Spacing.lg,
    backgroundColor: 'white',
    borderRadius: BorderRadius.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  doneButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});
