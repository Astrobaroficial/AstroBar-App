import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../lib/api';
import { AstroBarColors } from '@/constants/theme';

type Tab = 'transactions' | 'promotions';

export default function AdminOperations() {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [data, filterStatus, filterType]);

  const applyFilters = () => {
    let filtered = [...data];
    
    if (activeTab === 'transactions' && filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    if (activeTab === 'promotions' && filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    setFilteredData(filtered);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'transactions') {
        const res = await api.get('/admin/transactions');
        setData(res.data.transactions || []);
      } else {
        const res = await api.get('/promotions?includeInactive=true');
        setData(res.data.promotions || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePromotion = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/promotions/${id}`, { isActive: !currentStatus });
      Alert.alert('Éxito', currentStatus ? 'Promoción pausada' : 'Promoción activada');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la promoción');
    }
  };

  const deletePromotion = async (id: string) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar esta promoción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/promotions/${id}`);
              Alert.alert('Éxito', 'Promoción eliminada');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  const renderPromotion = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.badge, { 
            backgroundColor: item.isActive ? '#4CAF50' : '#f44336'
          }]}>
            <Text style={styles.badgeText}>{item.isActive ? 'Activa' : 'Inactiva'}</Text>
          </View>
          <TouchableOpacity onPress={() => togglePromotion(item.id, item.isActive)}>
            <Feather name={item.isActive ? 'pause-circle' : 'play-circle'} size={24} color={AstroBarColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deletePromotion(item.id)}>
            <Feather name="trash-2" size={22} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardDetail}>Bar: {item.businessName}</Text>
      <Text style={styles.cardDetail}>Tipo: {item.type === 'flash' ? 'Flash' : 'Común'}</Text>
      <Text style={styles.cardDetail}>Precio: ${(item.promoPrice / 100).toFixed(2)}</Text>
      <Text style={styles.cardDetail}>Stock: {item.stock - item.stockConsumed}/{item.stock}</Text>
      <Text style={styles.cardDetail}>Inicio: {new Date(item.startTime).toLocaleString()}</Text>
      <Text style={styles.cardDetail}>Fin: {new Date(item.endTime).toLocaleString()}</Text>
    </View>
  );

  const renderTransaction = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.promotion?.title || 'Promoción'}</Text>
        <View style={[styles.badge, { 
          backgroundColor: item.status === 'redeemed' ? '#4CAF50' : 
                          item.status === 'cancelled' ? '#f44336' : '#FFC107' 
        }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>Usuario: {item.user?.name}</Text>
      <Text style={styles.cardDetail}>Bar: {item.business?.name}</Text>
      <Text style={styles.cardDetail}>Monto: ${(item.amountPaid / 100).toFixed(2)}</Text>
      <Text style={styles.cardDetail}>Comisión: ${(item.platformCommission / 100).toFixed(2)}</Text>
      <Text style={styles.cardDetail}>
        Fecha: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Feather name="activity" size={20} color={activeTab === 'transactions' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>Transacciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'promotions' && styles.activeTab]}
          onPress={() => setActiveTab('promotions')}
        >
          <Feather name="zap" size={20} color={activeTab === 'promotions' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'promotions' && styles.activeTabText]}>Promociones</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {activeTab === 'transactions' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['all', 'pending', 'redeemed', 'cancelled'].map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                  {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'redeemed' ? 'Canjeadas' : 'Canceladas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['all', 'flash', 'common'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.filterButton, filterType === type && styles.filterButtonActive]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                  {type === 'all' ? 'Todas' : type === 'flash' ? 'Flash' : 'Comunes'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={activeTab === 'transactions' ? renderTransaction : renderPromotion}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay datos disponibles</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: AstroBarColors.primary },
  tabText: { fontSize: 14, color: '#666' },
  activeTabText: { color: AstroBarColors.primary, fontWeight: '600' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  cardDetail: { fontSize: 12, color: '#666', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
  filters: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5' },
  filterButtonActive: { backgroundColor: AstroBarColors.primary },
  filterText: { fontSize: 12, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
});
