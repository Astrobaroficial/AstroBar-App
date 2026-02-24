import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  ownerName: string;
}

export default function AdminBusinessApproval() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBusinesses = async () => {
    try {
      const response = await api.get('/admin/businesses');
      setBusinesses(response.data.businesses || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al cargar bares');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const handleApprove = async (businessId: string) => {
    Alert.alert(
      'Aprobar Bar',
      '¿Confirmas que quieres aprobar este bar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            try {
              await api.patch(`/admin/businesses/${businessId}/verification`, { isActive: true });
              Alert.alert('Éxito', 'Bar aprobado correctamente');
              loadBusinesses();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Error al aprobar');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (businessId: string) => {
    Alert.alert(
      'Rechazar Bar',
      '¿Confirmas que quieres rechazar este bar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/admin/businesses/${businessId}/verification`, { isActive: false });
              Alert.alert('Éxito', 'Bar rechazado');
              loadBusinesses();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Error al rechazar');
            }
          },
        },
      ]
    );
  };

  const getFilteredBusinesses = () => {
    switch (filter) {
      case 'pending':
        return businesses.filter(b => !b.isActive);
      case 'approved':
        return businesses.filter(b => b.isActive);
      default:
        return businesses;
    }
  };

  const renderBusiness = ({ item }: { item: Business }) => {
    const isPending = !item.isActive;

    return (
      <View style={[styles.card, isPending && styles.pendingCard]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="business" size={20} color="#FFD700" />
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? '#FFA726' : '#4CAF50' }]}>
            <Text style={styles.statusText}>{isPending ? 'Pendiente' : 'Aprobado'}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#999" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={14} color="#999" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={14} color="#999" />
            <Text style={styles.infoText}>{item.ownerName}</Text>
          </View>
        </View>

        <Text style={styles.date}>
          Registrado: {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item.id)}
            >
              <Ionicons name="close" size={16} color="#FFF" />
              <Text style={styles.actionText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(item.id)}
            >
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.actionText}>Aprobar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const stats = {
    total: businesses.length,
    pending: businesses.filter(b => !b.isActive).length,
    approved: businesses.filter(b => b.isActive).length,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando bares...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#FFA726' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Aprobados</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredBusinesses()}
        renderItem={renderBusiness}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.emptyText}>No hay bares</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  loadingText: { color: '#FFF', fontSize: 16 },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1A1F3A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#FFD700' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  filters: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#1A1F3A' },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2A2F4A',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#FFD700' },
  filterText: { fontSize: 12, color: '#999', fontWeight: '600' },
  filterTextActive: { color: '#000' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  pendingCard: { borderColor: '#FFA726', borderWidth: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#FFF', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  info: { marginBottom: 12, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#CCC' },
  date: { fontSize: 11, color: '#666', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtn: { backgroundColor: '#EF5350' },
  approveBtn: { backgroundColor: '#4CAF50' },
  actionText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
});
