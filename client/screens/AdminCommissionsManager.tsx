import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface BusinessCommission {
  businessId: string;
  businessName: string;
  commission: number;
  lastUpdated?: string;
}

export default function AdminCommissionsManager() {
  const [businesses, setBusinesses] = useState<BusinessCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessCommission | null>(null);
  const [newCommission, setNewCommission] = useState('');

  const loadBusinesses = async () => {
    try {
      const response = await api.get('/admin/commissions');
      setBusinesses(response.data.businesses || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al cargar comisiones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const openEditModal = (business: BusinessCommission) => {
    setSelectedBusiness(business);
    setNewCommission((business.commission * 100).toString());
    setModalVisible(true);
  };

  const saveCommission = async () => {
    if (!selectedBusiness) return;

    const commissionValue = parseFloat(newCommission);
    if (isNaN(commissionValue) || commissionValue < 5 || commissionValue > 30) {
      Alert.alert('Error', 'La comisión debe estar entre 5% y 30%');
      return;
    }

    try {
      await api.post('/admin/commissions', {
        businessId: selectedBusiness.businessId,
        commission: commissionValue / 100,
        notes: `Actualizado a ${commissionValue}%`,
      });
      
      Alert.alert('Éxito', 'Comisión actualizada correctamente');
      setModalVisible(false);
      loadBusinesses();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al actualizar comisión');
    }
  };

  const renderBusiness = ({ item }: { item: BusinessCommission }) => {
    const commissionPercent = Math.round(item.commission * 100);
    const isDefault = commissionPercent === 30;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.businessInfo}>
            <Ionicons name="business" size={20} color="#FFD700" />
            <Text style={styles.businessName}>{item.businessName}</Text>
          </View>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Por defecto</Text>
            </View>
          )}
        </View>

        <View style={styles.commissionRow}>
          <Text style={styles.commissionLabel}>Comisión actual:</Text>
          <Text style={[styles.commissionValue, { color: isDefault ? '#999' : '#4CAF50' }]}>
            {commissionPercent}%
          </Text>
        </View>

        {item.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Actualizado: {new Date(item.lastUpdated).toLocaleDateString()}
          </Text>
        )}

        <View style={styles.editButton}>
          <Ionicons name="create" size={16} color="#FFD700" />
          <Text style={styles.editText}>Editar</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando comisiones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Comisiones</Text>
        <Text style={styles.subtitle}>Rango: 5% - 30% (Por defecto: 30%)</Text>
      </View>

      <FlatList
        data={businesses}
        renderItem={renderBusiness}
        keyExtractor={(item) => item.businessId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadBusinesses();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No hay bares registrados</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Comisión</Text>
            <Text style={styles.modalSubtitle}>{selectedBusiness?.businessName}</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nueva comisión (%)</Text>
              <TextInput
                style={styles.input}
                value={newCommission}
                onChangeText={setNewCommission}
                keyboardType="numeric"
                placeholder="5 - 30"
                placeholderTextColor="#666"
              />
              <Text style={styles.inputHint}>Rango permitido: 5% - 30%</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveCommission}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  loadingText: { color: '#FFF', fontSize: 16 },
  header: { padding: 20, backgroundColor: '#1A1F3A', borderBottomWidth: 1, borderBottomColor: '#2A2F4A' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 12, color: '#999', marginTop: 4 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  businessInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  businessName: { fontSize: 16, fontWeight: 'bold', color: '#FFF', flex: 1 },
  defaultBadge: { backgroundColor: '#2A2F4A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultText: { fontSize: 10, color: '#999' },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commissionLabel: { fontSize: 14, color: '#999' },
  commissionValue: { fontSize: 24, fontWeight: 'bold' },
  lastUpdated: { fontSize: 11, color: '#666', marginBottom: 8 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  editText: { fontSize: 12, color: '#FFD700', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#999', marginBottom: 20 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#FFF', marginBottom: 8 },
  input: {
    backgroundColor: '#2A2F4A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#3A3F5A',
  },
  inputHint: { fontSize: 11, color: '#666', marginTop: 4 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#2A2F4A' },
  saveButton: { backgroundColor: '#4CAF50' },
  cancelButtonText: { color: '#FFF', fontWeight: '600' },
  saveButtonText: { color: '#FFF', fontWeight: '600' },
});
