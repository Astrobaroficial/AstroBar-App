import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './ThemedText';
import { AstroBarColors, Spacing, BorderRadius } from '@/constants/theme';

export type PinStatus = 'closed' | 'opening_soon' | 'open';

interface Props {
  status: PinStatus;
  businessName: string;
  onPress: () => void;
  timeUntilOpen?: string; // "Abre en 2h 30m"
  hasFlashPromo?: boolean; // Indica si tiene promoción FLASH activa
  flashPromoCount?: number; // Cantidad de promos FLASH
}

export function BarPinMarker({ status, businessName, onPress, timeUntilOpen, hasFlashPromo = false, flashPromoCount = 0 }: Props) {
  const getStatusConfig = () => {
    switch (status) {
      case 'closed':
        return {
          color: '#EF4444', // Rojo
          icon: 'moon' as const,
          label: 'Cerrado',
        };
      case 'opening_soon':
        return {
          color: '#F59E0B', // Amarillo/Naranja
          icon: 'clock' as const,
          label: timeUntilOpen || 'Próximo a abrir',
        };
      case 'open':
        return {
          color: '#10B981', // Verde
          icon: 'home' as const,
          label: hasFlashPromo ? `${flashPromoCount} FLASH` : 'Abierto',
        };
      default:
        return {
          color: '#999999',
          icon: 'home' as const,
          label: 'Bar',
        };
    }
  };

  const config = getStatusConfig();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      {/* Main Pin */}
      <View style={[
        styles.pin,
        { 
          backgroundColor: config.color,
          borderColor: hasFlashPromo ? '#FFD700' : config.color,
          borderWidth: hasFlashPromo ? 3 : 2
        }
      ]}>
        <Feather 
          name={config.icon} 
          size={hasFlashPromo ? 18 : 16} 
          color="#FFFFFF" 
        />
        
        {/* Fire indicator for flash promos - Only when open AND has flash promo */}
        {status === 'open' && hasFlashPromo && (
          <View style={styles.fireIndicator}>
            <Feather name="zap" size={12} color="#FFD700" />
          </View>
        )}
      </View>

      {/* Pin tail */}
      <View style={[styles.pinTail, { borderTopColor: config.color }]} />

      {/* Status label */}
      <View style={[
        styles.statusLabel,
        { 
          backgroundColor: config.color,
          borderColor: hasFlashPromo ? '#FFD700' : 'transparent',
          borderWidth: hasFlashPromo ? 1 : 0
        }
      ]}>
        <ThemedText type="caption" style={styles.statusText}>
          {config.label}
        </ThemedText>
      </View>

      {/* Business name tooltip */}
      <View style={[styles.nameTooltip, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <ThemedText type="small" style={styles.nameText}>
          {businessName}
        </ThemedText>
      </View>

      {/* Pulsing animation for flash promos - Only when open AND has flash promo */}
      {status === 'open' && hasFlashPromo && (
        <View style={[styles.pulseRing, { borderColor: config.color }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  fireIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  statusLabel: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
  },
  nameTooltip: {
    position: 'absolute',
    top: -35,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    maxWidth: 120,
    opacity: 0.9,
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.6,
    top: -10,
  },
});