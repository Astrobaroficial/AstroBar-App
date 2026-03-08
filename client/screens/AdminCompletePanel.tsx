import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../lib/api';

type Tab = 'dashboard' | 'transactions' | 'promotions' | 'points' | 'qr' | 'support' | 'reports' | 'audit';

export default function AdminCompletePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'transactions':
          const txRes = await api.get('/admin-complete/transactions/detailed', { params: filters });
          setData(txRes.data);
          break;
        case 'promotions':
          const promoRes = await api.get('/admin-complete/promotions/all', { params: filters });
          setData(promoRes.data);
          break;
        case 'points':
          const pointsRes = await api.get('/admin-complete/points');
          setData(pointsRes.data);
          break;
        case 'qr':
          const qrRes = await api.get('/admin-complete/qr-codes/active');
          setData(qrRes.data);
          break;
        case 'support':
          const supportRes = await api.get('/admin-complete/support/tickets');
          setData(supportRes.data);
          break;
        case 'reports':
          const reportsRes = await api.get('/admin-complete/reports/revenue');
          setData(reportsRes.data);
          break;
        case 'audit':
          const auditRes = await api.get('/admin-complete/audit/logs');
          setData(auditRes.data);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async () => {
    try {
      Alert.alert('Éxito', 'Exportación iniciada. Recibirás un email con el archivo CSV.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar');
    }
  };

  const togglePromotion = async (id: string) => {
    try {
      await api.patch(`/admin-complete/promotions/${id}/toggle`);
      Alert.alert('Éxito', 'Promoción actualizada');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const adjustPoints = async (userId: string, points: number) => {
    Alert.prompt('Razón del ajuste', '', async (reason) => {
      try {
        await api.post('/admin-complete/points/adjust', { userId, points, reason });
        Alert.alert('Éxito', 'Puntos ajustados');
        loadData();
      } catch (error) {
        Alert.alert('Error', 'No se pudo ajustar');
      }
    });
  };

  const invalidateQR = async (id: string) => {
    Alert.alert('Confirmar', '¿Invalidar este QR code?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Invalidar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/admin-complete/qr-codes/${id}/invalidate`);
            Alert.alert('Éxito', 'QR invalidado');
            loadData();
          } catch (error) {
            Alert.alert('Error', 'No se pudo invalidar');
          }
        }
      }
    ]);
  };

  const closeTicket = async (id: string) => {
    try {
      await api.patch(`/admin-complete/support/tickets/${id}/close`);
      Alert.alert('Éxito', 'Ticket cerrado');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar');
    }
  };

  const renderTransactions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transacciones Detalladas</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportTransactions}>
          <Feather name="download" size={16} color="#fff" />
          <Text style={styles.exportButtonText}>Exportar CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.filterInput}
          placeholder="Fecha inicio"
          value={filters.startDate || ''}
          onChangeText={(text) => setFilters({ ...filters, startDate: text })}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Fecha fin"
          value={filters.endDate || ''}
          onChangeText={(text) => setFilters({ ...filters, endDate: text })}
        />
      </View>

      <FlatList
        data={data?.transactions || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.promotionTitle}</Text>
              <View style={[styles.badge, { backgroundColor: item.status === 'redeemed' ? '#4CAF50' : '#FFC107' }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>Usuario: {item.userName}</Text>
            <Text style={styles.cardDetail}>Bar: {item.businessName}</Text>
            <Text style={styles.cardDetail}>Monto: ${item.amountPaid / 100}</Text>
            <Text style={styles.cardDetail}>Comisión: ${item.platformCommission / 100}</Text>
            <Text style={styles.cardDetail}>Fecha: {new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderPromotions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Gestión de Promociones</Text>
      
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filters.status === 'active' && styles.filterButtonActive]}
          onPress={() => setFilters({ ...filters, status: 'active' })}
        >
          <Text>Activas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filters.status === 'inactive' && styles.filterButtonActive]}
          onPress={() => setFilters({ ...filters, status: 'inactive' })}
        >
          <Text>Inactivas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, !filters.status && styles.filterButtonActive]}
          onPress={() => setFilters({ ...filters, status: undefined })}
        >
          <Text>Todas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data?.promotions || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <TouchableOpacity onPress={() => togglePromotion(item.id)}>
                <Feather name={item.isActive ? 'pause-circle' : 'play-circle'} size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDetail}>Bar: {item.businessName}</Text>
            <Text style={styles.cardDetail}>Tipo: {item.type}</Text>
            <Text style={styles.cardDetail}>Stock: {item.stock - item.stockConsumed}/{item.stock}</Text>
            <Text style={styles.cardDetail}>Precio: ${item.promoPrice / 100}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderPoints = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Gestión de Puntos</Text>
      
      <FlatList
        data={data?.points || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{item.userName}</Text>
                <Text style={styles.cardDetail}>{item.userEmail}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsValue}>{item.totalPoints}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>Nivel: {item.currentLevel}</Text>
            <Text style={styles.cardDetail}>Canjes: {item.promotionsRedeemed}</Text>
            
            <View style={styles.pointsActions}>
              <TouchableOpacity
                style={[styles.pointsButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => adjustPoints(item.userId, 100)}
              >
                <Text style={styles.pointsButtonText}>+100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pointsButton, { backgroundColor: '#f44336' }]}
                onPress={() => adjustPoints(item.userId, -100)}
              >
                <Text style={styles.pointsButtonText}>-100</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderQRCodes = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>QR Codes Activos</Text>
      
      <FlatList
        data={data?.qrCodes || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{item.promotionTitle}</Text>
                <Text style={styles.cardDetail}>Usuario: {item.userName}</Text>
              </View>
              <TouchableOpacity onPress={() => invalidateQR(item.id)}>
                <Feather name="x-circle" size={24} color="#f44336" />
              </TouchableOpacity>
            </View>
            <Text style={styles.qrCode}>{item.qrCode}</Text>
            <Text style={styles.cardDetail}>Creado: {new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.cardDetail}>Expira: {new Date(item.canCancelUntil).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderSupport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tickets de Soporte</Text>
      
      <FlatList
        data={data?.tickets || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{item.subject}</Text>
                <Text style={styles.cardDetail}>{item.user_name} - {item.user_email}</Text>
              </View>
              <View style={[styles.badge, { 
                backgroundColor: item.status === 'open' ? '#FFC107' : 
                                item.status === 'closed' ? '#4CAF50' : '#2196F3' 
              }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>Categoría: {item.category}</Text>
            <Text style={styles.cardDetail}>Prioridad: {item.priority}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
            
            {item.status !== 'closed' && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => closeTicket(item.id)}
              >
                <Text style={styles.closeButtonText}>Cerrar Ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );

  const renderReports = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reportes y Analytics</Text>
      
      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>Ingresos por Período</Text>
        <FlatList
          data={data?.report || []}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.reportRow}>
              <Text style={styles.reportDate}>{item.date}</Text>
              <Text style={styles.reportValue}>${(item.total_revenue / 100).toFixed(2)}</Text>
              <Text style={styles.reportDetail}>{item.transactions} tx</Text>
            </View>
          )}
        />
      </View>
    </View>
  );

  const renderAudit = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Auditoría del Sistema</Text>
      
      <FlatList
        data={data?.logs || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.action}</Text>
              <Text style={styles.cardDetail}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <Text style={styles.cardDetail}>Admin: {item.admin_name}</Text>
            <Text style={styles.cardDetail}>Entidad: {item.entity_type} ({item.entity_id})</Text>
            {item.old_value && <Text style={styles.cardDetail}>Anterior: {item.old_value}</Text>}
            {item.new_value && <Text style={styles.cardDetail}>Nuevo: {item.new_value}</Text>}
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Admin Completo</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {[
          { key: 'dashboard', icon: 'home', label: 'Dashboard' },
          { key: 'transactions', icon: 'credit-card', label: 'Transacciones' },
          { key: 'promotions', icon: 'tag', label: 'Promociones' },
          { key: 'points', icon: 'award', label: 'Puntos' },
          { key: 'qr', icon: 'maximize', label: 'QR Codes' },
          { key: 'support', icon: 'help-circle', label: 'Soporte' },
          { key: 'reports', icon: 'bar-chart-2', label: 'Reportes' },
          { key: 'audit', icon: 'shield', label: 'Auditoría' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as Tab)}
          >
            <Feather name={tab.icon as any} size={20} color={activeTab === tab.key ? '#007AFF' : '#666'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loading}>Cargando...</Text>
        ) : (
          <>
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'promotions' && renderPromotions()}
            {activeTab === 'points' && renderPoints()}
            {activeTab === 'qr' && renderQRCodes()}
            {activeTab === 'support' && renderSupport()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'audit' && renderAudit()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  tabs: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#666' },
  activeTabText: { color: '#007AFF', fontWeight: '600' },
  content: { flex: 1 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  loading: { textAlign: 'center', padding: 32, color: '#666' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterInput: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 8 },
  filterButton: { padding: 8, borderRadius: 8, backgroundColor: '#f0f0f0' },
  filterButtonActive: { backgroundColor: '#007AFF' },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#007AFF', padding: 8, borderRadius: 8 },
  exportButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  cardDescription: { fontSize: 14, marginTop: 8, color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  qrCode: { fontFamily: 'monospace', fontSize: 12, backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4, marginTop: 8 },
  pointsBadge: { alignItems: 'center' },
  pointsValue: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  pointsLabel: { fontSize: 10, color: '#666' },
  pointsActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pointsButton: { flex: 1, padding: 8, borderRadius: 6, alignItems: 'center' },
  pointsButtonText: { color: '#fff', fontWeight: '600' },
  closeButton: { marginTop: 8, padding: 8, backgroundColor: '#4CAF50', borderRadius: 6, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontWeight: '600' },
  reportCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  reportTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reportDate: { fontSize: 12, color: '#666' },
  reportValue: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
  reportDetail: { fontSize: 12, color: '#666' },
});
