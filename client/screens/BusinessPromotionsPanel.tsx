import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Promotion {
  id: string;
  title: string;
  type: 'flash' | 'common';
  promoPrice: number;
  stock: number;
  stockConsumed: number;
  stockRemaining: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function BusinessPromotionsPanel() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPromotions = async () => {
    try {
      const response = await api.get(`/promotions?businessId=${user?.businessId}`);
      setPromotions(response.data.promotions || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al cargar promociones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPromotions();
    const interval = setInterval(loadPromotions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return 'Expirada';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const togglePromotion = async (id: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Pausar Promoción' : 'Activar Promoción',
      `¿Estás seguro de ${currentStatus ? 'pausar' : 'activar'} esta promoción?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.patch(`/promotions/${id}`, { isActive: !currentStatus });
              loadPromotions();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Error al actualizar');
            }
          },
        },
      ]
    );
  };

  const renderPromotion = ({ item }: { item: Promotion }) => {
    const stockPercentage = (item.stockRemaining / item.stock) * 100;
    const isLowStock = stockPercentage < 20;
    const timeRemaining = getTimeRemaining(item.endTime);

    return (
      <View style={[styles.card, item.type === 'flash' && styles.flashCard]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.type === 'flash' && (
              <View style={styles.flashBadge}>
                <Ionicons name="flash" size={12} color="#FFF" />
                <Text style={styles.flashText}>FLASH</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => togglePromotion(item.id, item.isActive)}
            style={[styles.statusBtn, !item.isActive && styles.inactiveBtn]}
          >
            <Ionicons
              name={item.isActive ? 'pause' : 'play'}
              size={16}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stock</Text>
            <Text style={[styles.statValue, isLowStock && styles.lowStock]}>
              {item.stockRemaining}/{item.stock}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tiempo</Text>
            <Text style={styles.statValue}>{timeRemaining}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Precio</Text>
            <Text style={styles.statValue}>${item.promoPrice}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${stockPercentage}%` },
              isLowStock && styles.lowStockBar,
            ]}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando promociones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{promotions.length}</Text>
          <Text style={styles.summaryLabel}>Activas</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {promotions.filter(p => p.type === 'flash').length}
          </Text>
          <Text style={styles.summaryLabel}>Flash</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {promotions.reduce((sum, p) => sum + p.stockRemaining, 0)}
          </Text>
          <Text style={styles.summaryLabel}>Stock Total</Text>
        </View>
      </View>

      <FlatList
        data={promotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadPromotions();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No hay promociones activas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 16 },
  summary: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1A1F3A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#FFD700' },
  summaryLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2F4A',
  },
  flashCard: { borderColor: '#FFD700', borderWidth: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  flashText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  statusBtn: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBtn: { backgroundColor: '#666' },
  stats: { flexDirection: 'row', marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  lowStock: { color: '#FF5252' },
  progressBar: {
    height: 6,
    backgroundColor: '#2A2F4A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
  lowStockBar: { backgroundColor: '#FF5252' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
});
