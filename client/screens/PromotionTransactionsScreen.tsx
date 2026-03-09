import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../lib/query-client';
import { useBusiness } from '../contexts/BusinessContext';

interface Transaction {
  id: string;
  promotionTitle: string;
  userName: string;
  userPhone: string;
  status: 'pending' | 'redeemed' | 'cancelled';
  amountPaid: number;
  businessRevenue: number;
  createdAt: string;
  redeemedAt?: string;
}

export default function PromotionTransactionsScreen() {
  const navigation = useNavigation<any>();
  const { selectedBusiness, businesses, setSelectedBusiness } = useBusiness();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'redeemed' | 'cancelled'>('all');
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);

  const loadTransactions = async () => {
    try {
      const url = selectedBusiness?.id 
        ? `/api/promotions/business/transactions?businessId=${selectedBusiness.id}`
        : '/api/promotions/business/transactions';
      const response = await apiRequest('GET', url);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedBusiness]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFD700';
      case 'redeemed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'redeemed': return 'Canjeado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle}>{item.promotionTitle}</Text>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.userPhone}>{item.userPhone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.amountRow}>
          <Text style={styles.label}>Ganancia:</Text>
          <Text style={styles.amount}>${item.businessRevenue.toFixed(2)}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>

      {item.redeemedAt && (
        <Text style={styles.redeemedText}>
          Canjeado: {new Date(item.redeemedAt).toLocaleString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessPromotions')}
        >
          <Ionicons name="megaphone" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Promociones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessMenu')}
        >
          <Ionicons name="restaurant" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Menú</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}}
        >
          <Ionicons name="list" size={20} color="#FFD700" />
          <Text style={styles.navButtonText}>Historial</Text>
        </TouchableOpacity>
      </View>

      {businesses.length > 1 && (
        <View style={styles.businessSelector}>
          <TouchableOpacity
            style={styles.businessButton}
            onPress={() => setShowBusinessSelector(!showBusinessSelector)}
          >
            <Ionicons name="business" size={16} color="#FFD700" />
            <Text style={styles.businessButtonText}>{selectedBusiness?.name || 'Seleccionar bar'}</Text>
            <Ionicons name={showBusinessSelector ? "chevron-up" : "chevron-down"} size={16} color="#FFD700" />
          </TouchableOpacity>
          {showBusinessSelector && (
            <ScrollView style={styles.businessList} horizontal showsHorizontalScrollIndicator={false}>
              {businesses.map((business) => (
                <TouchableOpacity
                  key={business.id}
                  style={[
                    styles.businessItem,
                    selectedBusiness?.id === business.id && styles.businessItemActive
                  ]}
                  onPress={() => {
                    setSelectedBusiness(business);
                    setShowBusinessSelector(false);
                    setLoading(true);
                    loadTransactions();
                  }}
                >
                  <Text style={[
                    styles.businessItemText,
                    selectedBusiness?.id === business.id && styles.businessItemTextActive
                  ]}>{business.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.filterContainer}>
        {(['all', 'pending', 'redeemed', 'cancelled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : getStatusText(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{transactions.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{transactions.filter(t => t.status === 'pending').length}</Text>
          <Text style={styles.summaryLabel}>Pendientes</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{transactions.filter(t => t.status === 'redeemed').length}</Text>
          <Text style={styles.summaryLabel}>Canjeados</Text>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No hay transacciones</Text>
          </View>
        }
      />
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#1A1F3A',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#2A2F4A',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#FFD700',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  filterTextActive: {
    color: '#000',
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  promoTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  userName: { fontSize: 14, color: '#CCC' },
  userPhone: { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2F4A',
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: '#999' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  date: { fontSize: 12, color: '#999' },
  redeemedText: { fontSize: 11, color: '#4CAF50', marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
  businessSelector: {
    backgroundColor: '#1A1F3A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  businessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  businessList: {
    marginTop: 12,
    maxHeight: 120,
  },
  businessItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2F4A',
    marginRight: 8,
  },
  businessItemActive: {
    backgroundColor: '#FFD700',
  },
  businessItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  businessItemTextActive: {
    color: '#000',
  },
});
