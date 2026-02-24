import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import { AstroBarColors } from '@/constants/theme';

export default function MapScreen() {
  const { theme } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.webMessage}>
          <Feather name="map" size={48} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: 16, textAlign: 'center' }}>
            Mapa no disponible en web
          </ThemedText>
          <ThemedText type="body" style={{ marginTop: 8, textAlign: 'center', color: theme.textSecondary }}>
            Por favor usa la aplicación móvil para ver el mapa de bares
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.webMessage}>
        <Feather name="map" size={48} color={AstroBarColors.primary} />
        <ThemedText type="h3" style={{ marginTop: 16, textAlign: 'center' }}>
          Mapa de Bares
        </ThemedText>
        <ThemedText type="body" style={{ marginTop: 8, textAlign: 'center', color: theme.textSecondary }}>
          Funcionalidad de mapa próximamente
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
