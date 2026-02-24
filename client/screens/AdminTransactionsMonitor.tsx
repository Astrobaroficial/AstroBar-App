import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface Transaction {
  id: string;
  qrCode: string;
  status: 'pending' | 'redeemed' | 'cancelled' | 'expired';
  amountPaid: number;
  platformCommission: number;
  businessRevenue: number;
  createdAt: string;
  redeemedAt?: string;
  canCancelUntil?: string;
  user: { name: string; email: string };
  business: { name: string };
  promotion: { title: string; type: string };
}

export default function AdminTransactionsMonitor() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'redeemed' | 'suspicious'>('all');

  const loadTransactions = async () => {
    try {
      const response = await api.get('/admin/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al cargar transacciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const detectSuspicious = (transaction: Transaction) => {
    // Detect potential fraud patterns
    const timeSinceCreation = Date.now() - new Date(transaction.createdAt).getTime();
    const isPending = transaction.status === 'pending';
    const isOld = timeSinceCreation > 10 * 60 * 1000; // >10 minutes pending
    
    return isPending && isOld;
  };

  const getFilteredTransactions = () => {
    switch (filter) {
      case 'pending':
        return transactions.filter(t => t.status === 'pending');
      case 'redeemed':
        return transactions.filter(t => t.status === 'redeemed');
      case 'suspicious':
        return transactions.filter(detectSuspicious);
      default:
        return transactions;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'redeemed': return '#4CAF50';
      case 'pending': return '#FFA726';
      case 'cancelled': return '#EF5350';
      case 'expired': return '#666';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'redeemed': return 'Canjeado';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isSuspicious = detectSuspicious(item);
    const timeSinceCreation = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);

    return (
      <TouchableOpacity
        style={[styles.card, isSuspicious && styles.suspiciousCard]}
        onPress={() => {
          Alert.alert(
            'Detalles de Transacción',
            `QR: ${item.qrCode}\nUsuario: ${item.user.name}\nBar: ${item.business.name}\nPromoción: ${item.promotion.title}\nMonto: $${item.amountPaid}\nComisión: $${item.platformCommission}\nBar recibe: $${item.businessRevenue}`,
            [{ text: 'OK' }]
          );
        }}
      >
        {isSuspicious && (
          <View style={styles.suspiciousBadge}>
            <Ionicons name="warning" size={16} color="#FFF" />
            <Text style={styles.suspiciousText}>SOSPECHOSO</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.qrRow}>
            <Ionicons name="qr-code" size={20} color="#FFD700" />
            <Text style={styles.qrCode}>{item.qrCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={14} color="#999" />
            <Text style={styles.infoText}>{item.user.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={14} color="#999" />
            <Text style={styles.infoText}>{item.business.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="pricetag" size={14} color="#999" />
            <Text style={styles.infoText}>{item.promotion.title}</Text>
          </View>
        </View>

        <View style={styles.amounts}>
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>${item.amountPaid}</Text>
          </View>
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Comisión</Text>
            <Text style={[styles.amountValue, { color: '#4CAF50' }]}>
              ${item.platformCommission}
            </Text>
          </View>
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Bar</Text>
            <Text style={styles.amountValue}>${item.businessRevenue}</Text>
          </View>
        </View>

        <Text style={styles.time}>Hace {timeSinceCreation}m</Text>
      </TouchableOpacity>
    );
  };

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    redeemed: transactions.filter(t => t.status === 'redeemed').length,
    suspicious: transactions.filter(detectSuspicious).length,
    revenue: transactions
      .filter(t => t.status === 'redeemed')
      .reduce((sum, t) => sum + t.platformCommission, 0),
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Cargando transacciones...</Text>
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
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.redeemed}</Text>
          <Text style={styles.statLabel}>Canjeados</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#EF5350' }]}>{stats.suspicious}</Text>
          <Text style={styles.statLabel}>Sospechosos</Text>
        </View>
      </View>

      <View style={styles.revenue}>
        <Text style={styles.revenueLabel}>Ingresos Totales</Text>
        <Text style={styles.revenueValue}>${stats.revenue.toFixed(2)}</Text>
      </View>

      <View style={styles.filters}>
        {(['all', 'pending', 'redeemed', 'suspicious'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'redeemed' ? 'Canjeados' : 'Sospechosos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredTransactions()}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadTransactions();
          }} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 16 },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1A1F3A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#FFD700' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  revenue: {
    padding: 16,
    backgroundColor: '#1A1F3A',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  revenueLabel: { fontSize: 12, color: '#999' },
  revenueValue: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginTop: 4 },
  filters: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#1A1F3A',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  suspiciousCard: { borderColor: '#EF5350', borderWidth: 2 },
  suspiciousBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF5350',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  suspiciousText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrCode: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  info: { marginBottom: 12, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#CCC' },
  amounts: { flexDirection: 'row', marginBottom: 8 },
  amount: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  amountValue: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  time: { fontSize: 11, color: '#666', textAlign: 'right' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
});
