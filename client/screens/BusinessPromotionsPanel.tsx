import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../lib/query-client';
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
  image?: string;
}

export default function BusinessPromotionsPanel() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPromotions = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/promotions');
      const data = await response.json();
      if (data.success) {
        setPromotions(data.promotions || []);
      }
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      Alert.alert('Error', 'Error al cargar promociones');
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
    console.log('Button pressed! ID:', id, 'Status:', currentStatus);
    try {
      console.log('Toggling promotion:', id, 'to:', !currentStatus);
      const response = await apiRequest('PATCH', `/api/promotions/${id}`, { isActive: !currentStatus });
      const result = await response.json();
      console.log('Toggle result:', result);
      if (result.success) {
        loadPromotions();
        Alert.alert('Éxito', `Promoción ${!currentStatus ? 'activada' : 'pausada'}`);
      } else {
        Alert.alert('Error', result.error || 'Error al actualizar');
      }
    } catch (error: any) {
      console.log('Toggle error:', error);
      Alert.alert('Error', 'Error al actualizar promoción');
    }
  };

  const renderPromotion = ({ item }: { item: Promotion }) => {
    const stockPercentage = (item.stockRemaining / item.stock) * 100;
    const isLowStock = stockPercentage < 20;
    const timeRemaining = getTimeRemaining(item.endTime);
    const isExpired = timeRemaining === 'Expirada';

    return (
      <View style={[styles.card, item.type === 'flash' && styles.flashCard, !item.isActive && styles.inactiveCard]}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.promoImage}
            contentFit="cover"
          />
        )}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.type === 'flash' && (
              <View style={styles.flashBadge}>
                <Ionicons name="flash" size={12} color="#FFF" />
                <Text style={styles.flashText}>FLASH</Text>
              </View>
            )}
            {!item.isActive && (
              <View style={[styles.flashBadge, { backgroundColor: '#666' }]}>
                <Text style={styles.flashText}>PAUSADA</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => togglePromotion(item.id, item.isActive)}
            style={[styles.statusBtn, !item.isActive && styles.inactiveBtn]}
            disabled={isExpired}
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
            {isLowStock && item.stockRemaining > 0 && (
              <Text style={styles.alertText}>¡Bajo!</Text>
            )}
            {item.stockRemaining === 0 && (
              <Text style={styles.alertText}>Agotado</Text>
            )}
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tiempo</Text>
            <Text style={[styles.statValue, isExpired && styles.lowStock]}>{timeRemaining}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Precio</Text>
            <Text style={styles.statValue}>${(item.promoPrice / 100).toFixed(2)}</Text>
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

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vendidos: {item.stockConsumed}</Text>
          <Text style={styles.footerText}>Inicio: {new Date(item.startTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
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
      {/* Header con navegación */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}}
        >
          <Ionicons name="megaphone" size={20} color="#FFD700" />
          <Text style={styles.navButtonText}>Promociones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessMenu')}
        >
          <Ionicons name="restaurant" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Menú</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessSettings')}
        >
          <Ionicons name="settings" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{promotions.filter(p => p.isActive).length || 0}</Text>
          <Text style={styles.summaryLabel}>Activas</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {promotions.filter(p => p.type === 'flash' && p.isActive).length || 0}
          </Text>
          <Text style={styles.summaryLabel}>Flash</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {promotions.reduce((sum, p) => sum + (p.stockRemaining || p.stock || 0), 0)}
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
            <Text style={styles.emptySubtext}>Crea tu primera promoción usando los botones de abajo</Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.flashFab]}
          onPress={() => navigation.navigate('CreateFlashPromotion')}
        >
          <Ionicons name="flash" size={24} color="#000" />
          <Text style={styles.fabText}>Flash</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, styles.commonFab]}
          onPress={() => navigation.navigate('CreateCommonPromotion')}
        >
          <Ionicons name="calendar" size={24} color="#000" />
          <Text style={styles.fabText}>Común</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    paddingTop: 40,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  navButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
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
  promoImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
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
  alertText: { fontSize: 10, color: '#FF5252', fontWeight: 'bold', marginTop: 2 },
  inactiveCard: { opacity: 0.6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2F4A' },
  footerText: { fontSize: 11, color: '#999' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
  emptySubtext: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  flashFab: {
    backgroundColor: '#8B5CF6',
  },
  commonFab: {
    backgroundColor: '#FFD700',
  },
  fabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
});
