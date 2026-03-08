import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HeatmapScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Mapa de Demanda</Text>
        <Text style={styles.subtitle}>Disponible solo en la app móvil</Text>
      </View>

      <View style={styles.content}>
        <Ionicons name="map" size={64} color="#666" />
        <Text style={styles.message}>
          El mapa de calor con zonas de demanda está disponible en la aplicación móvil
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  message: {
    color: '#AAA',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
