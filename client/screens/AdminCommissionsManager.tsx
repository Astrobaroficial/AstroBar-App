import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../lib/query-client';
import { useCustomAlert } from '../components/CustomAlert';

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
  
  const { showAlert, AlertComponent } = useCustomAlert();

  const loadBusinesses = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/commissions');
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error: any) {
      showAlert('Error', 'Error al cargar comisiones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const renderBusiness = ({ item }: { item: BusinessCommission }) => {
    const commissionPercent = item.commission > 1 ? item.commission : Math.round(item.commission * 100);
    const isDefault = commissionPercent === 30 || commissionPercent === 15 || commissionPercent === 0;

    return (
      // Cambiamos TouchableOpacity por View: Ya no hace nada al tocarlo
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.businessInfo}>
            <Ionicons name="business" size={20} color="#FFD700" />
            <Text style={styles.businessName}>{item.businessName}</Text>
          </View>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Por escala</Text>
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
            Actualizado: {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
          </Text>
        )}
      </View>
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
      {AlertComponent}
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Comisiones</Text>
        <Text style={styles.subtitle}>Vista de comisiones actuales (Solo lectura)</Text>
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
  card: { backgroundColor: '#1A1F3A', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2F4A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  businessInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  businessName: { fontSize: 16, fontWeight: 'bold', color: '#FFF', flex: 1 },
  defaultBadge: { backgroundColor: '#2A2F4A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultText: { fontSize: 10, color: '#999' },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commissionLabel: { fontSize: 14, color: '#999' },
  commissionValue: { fontSize: 24, fontWeight: 'bold' },
  lastUpdated: { fontSize: 11, color: '#666', marginBottom: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16 },
});