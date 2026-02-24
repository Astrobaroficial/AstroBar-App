import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { apiRequest } from '@/lib/query-client';

export default function DeliveryConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    baseFee: '15',
    perKm: '8',
    minFee: '15',
    maxFee: '40',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await apiRequest('GET', '/api/delivery/config');
      const data = await response.json();
      if (data.success) {
        setConfig({
          baseFee: data.config.baseFee.toString(),
          perKm: data.config.perKm.toString(),
          minFee: data.config.minFee.toString(),
          maxFee: data.config.maxFee.toString(),
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiRequest('PUT', '/api/delivery/config', {
        baseFee: parseFloat(config.baseFee),
        perKm: parseFloat(config.perKm),
        minFee: parseFloat(config.minFee),
        maxFee: parseFloat(config.maxFee),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Éxito', 'Configuración actualizada correctamente');
      } else {
        Alert.alert('Error', 'No se pudo actualizar la configuración');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración de Tarifas de Delivery</Text>
        <Text style={styles.subtitle}>Autlán, Jalisco</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Tarifa Base (MXN)</Text>
          <TextInput
            style={styles.input}
            value={config.baseFee}
            onChangeText={(text) => setConfig({ ...config, baseFee: text })}
            keyboardType="numeric"
            placeholder="15"
          />
          <Text style={styles.help}>Costo mínimo por cualquier entrega</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Costo por Kilómetro (MXN)</Text>
          <TextInput
            style={styles.input}
            value={config.perKm}
            onChangeText={(text) => setConfig({ ...config, perKm: text })}
            keyboardType="numeric"
            placeholder="8"
          />
          <Text style={styles.help}>Se suma por cada km de distancia</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tarifa Mínima (MXN)</Text>
          <TextInput
            style={styles.input}
            value={config.minFee}
            onChangeText={(text) => setConfig({ ...config, minFee: text })}
            keyboardType="numeric"
            placeholder="15"
          />
          <Text style={styles.help}>Mínimo a cobrar</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tarifa Máxima (MXN)</Text>
          <TextInput
            style={styles.input}
            value={config.maxFee}
            onChangeText={(text) => setConfig({ ...config, maxFee: text })}
            keyboardType="numeric"
            placeholder="40"
          />
          <Text style={styles.help}>Tope máximo (Autlán es pequeño)</Text>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Vista Previa de Tarifas:</Text>
          <Text style={styles.previewItem}>• 1 km = ${(parseFloat(config.baseFee) + parseFloat(config.perKm) * 1).toFixed(2)} MXN</Text>
          <Text style={styles.previewItem}>• 2 km = ${(parseFloat(config.baseFee) + parseFloat(config.perKm) * 2).toFixed(2)} MXN</Text>
          <Text style={styles.previewItem}>• 3 km = ${Math.min(parseFloat(config.baseFee) + parseFloat(config.perKm) * 3, parseFloat(config.maxFee)).toFixed(2)} MXN</Text>
          <Text style={styles.previewItem}>• 5+ km = ${config.maxFee} MXN (máximo)</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  help: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  preview: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  previewItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
