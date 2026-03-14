import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

export default function LocationPickerScreen() {
  return (
    <View style={styles.container}>
      <ThemedText>Location Picker no disponible en web</ThemedText>
      <ThemedText type="small" style={{ marginTop: 16 }}>
        Esta función solo está disponible en la app móvil
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
