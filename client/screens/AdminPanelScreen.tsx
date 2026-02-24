import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { api } from '../lib/api';

export default function AdminPanelScreen() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const { data } = await api.get('/admin/stats/dashboard');
        setStats(data);
        const alertsRes = await api.get('/admin/alerts');
        setAlerts(alertsRes.data);
      } else if (activeTab === 'users') {
        const { data } = await api.get('/admin/users');
        setUsers(data);
      } else if (activeTab === 'businesses') {
        const { data } = await api.get('/admin/businesses');
        setBusinesses(data);
      } else if (activeTab === 'settings') {
        const { data } = await api.get('/admin/settings');
        setSettings(data);
      } else if (activeTab === 'commissions') {
        const { data } = await api.get('/admin/commissions');
        setCommissions(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      Alert.alert('Éxito', 'Estado del usuario actualizado');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el usuario');
    }
  };

  const toggleBusinessStatus = async (businessId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/businesses/${businessId}/status`, { isActive: !currentStatus });
      Alert.alert('Éxito', 'Estado del bar actualizado');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el bar');
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await api.put(`/admin/settings/${key}`, { value });
      Alert.alert('Éxito', 'Configuración actualizada');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    }
  };

  const sendNotification = async () => {
    Alert.prompt(
      'Enviar Notificación',
      'Ingresa el mensaje',
      async (message) => {
        if (message) {
          try {
            await api.post('/admin/notifications/push', {
              title: 'Notificación de AstroBar',
              message,
              targetType: 'all_users'
            });
            Alert.alert('Éxito', 'Notificación enviada');
          } catch (error) {
            Alert.alert('Error', 'No se pudo enviar la notificación');
          }
        }
      }
    );
  };

  const renderDashboard = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Dashboard</Text>
      
      {alerts.length > 0 && (
        <View style={styles.alertBox}>
          {alerts.map((alert, i) => (
            <Text key={i} style={styles.alertText}>⚠️ {alert.message}</Text>
          ))}
        </View>
      )}

      {stats && (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Usuarios Totales</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeUsers}</Text>
              <Text style={styles.statLabel}>Usuarios Activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalBars}</Text>
              <Text style={styles.statLabel}>Bares Totales</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeBars}</Text>
              <Text style={styles.statLabel}>Bares Activos</Text>
            </View>
          </View>

          <View style={styles.limitCard}>
            <Text style={styles.limitTitle}>Límite de Bares</Text>
            <Text style={styles.limitText}>
              {stats.limits.currentBars} / {stats.limits.maxBars} ({stats.limits.percentageUsed.toFixed(1)}%)
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.limits.percentageUsed}%` }]} />
            </View>
          </View>

          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Ingresos Totales</Text>
            <Text style={styles.revenueValue}>${(stats.totalRevenue / 100).toFixed(2)}</Text>
          </View>
        </>
      )}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Gestión de Usuarios ({users.length})</Text>
      <ScrollView>
        {users.map((user) => (
          <View key={user.id} style={styles.listItem}>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName}>{user.name}</Text>
              <Text style={styles.listItemDetail}>{user.email || user.phone}</Text>
              <Text style={styles.listItemDetail}>Rol: {user.role}</Text>
            </View>
            <TouchableOpacity
              style={[styles.statusButton, user.isActive ? styles.activeButton : styles.inactiveButton]}
              onPress={() => toggleUserStatus(user.id, user.isActive)}
            >
              <Text style={styles.statusButtonText}>
                {user.isActive ? 'Activo' : 'Inactivo'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderBusinesses = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Gestión de Bares ({businesses.length})</Text>
      <ScrollView>
        {businesses.map((business) => (
          <View key={business.id} style={styles.listItem}>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName}>{business.name}</Text>
              <Text style={styles.listItemDetail}>{business.address}</Text>
              <Text style={styles.listItemDetail}>Estado: {business.verificationStatus}</Text>
            </View>
            <TouchableOpacity
              style={[styles.statusButton, business.isActive ? styles.activeButton : styles.inactiveButton]}
              onPress={() => toggleBusinessStatus(business.id, business.isActive)}
            >
              <Text style={styles.statusButtonText}>
                {business.isActive ? 'Activo' : 'Inactivo'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Configuración del Sistema</Text>
      <ScrollView>
        {settings.map((setting) => (
          <View key={setting.id} style={styles.settingItem}>
            <Text style={styles.settingKey}>{setting.key}</Text>
            <Text style={styles.settingDescription}>{setting.description}</Text>
            <TextInput
              style={styles.settingInput}
              value={setting.value}
              onChangeText={(value) => {
                const updated = settings.map(s => s.id === setting.id ? { ...s, value } : s);
                setSettings(updated);
              }}
              onBlur={() => updateSetting(setting.key, setting.value)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderCommissions = () => (
    <View style={styles.section}>
      <Text style={styles.title}>Comisiones por Bar</Text>
      <ScrollView>
        {commissions.map((commission) => (
          <View key={commission.id} style={styles.commissionItem}>
            <Text style={styles.commissionBusiness}>Bar ID: {commission.businessId}</Text>
            <Text style={styles.commissionValue}>
              Comisión: {(parseFloat(commission.platformCommission) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.commissionNotes}>{commission.notes}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Administración</Text>
        <TouchableOpacity style={styles.notifyButton} onPress={sendNotification}>
          <Text style={styles.notifyButtonText}>📢 Notificar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['dashboard', 'users', 'businesses', 'settings', 'commissions'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'dashboard' && '📊'}
              {tab === 'users' && '👥'}
              {tab === 'businesses' && '🏢'}
              {tab === 'settings' && '⚙️'}
              {tab === 'commissions' && '💰'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'businesses' && renderBusinesses()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'commissions' && renderCommissions()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  notifyButton: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8 },
  notifyButtonText: { color: '#fff', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 24 },
  activeTabText: { opacity: 1 },
  content: { flex: 1 },
  section: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  alertBox: { backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 16 },
  alertText: { color: '#856404', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  limitCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 },
  limitTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  limitText: { fontSize: 14, color: '#666', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF' },
  revenueCard: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  revenueLabel: { fontSize: 14, color: '#fff', marginBottom: 4 },
  revenueValue: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 16, fontWeight: '600' },
  listItemDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  statusButton: { padding: 8, borderRadius: 6, minWidth: 80, alignItems: 'center' },
  activeButton: { backgroundColor: '#4CAF50' },
  inactiveButton: { backgroundColor: '#f44336' },
  statusButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  settingItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  settingKey: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  settingDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  settingInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, padding: 8, fontSize: 14 },
  commissionItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  commissionBusiness: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  commissionValue: { fontSize: 16, color: '#007AFF', fontWeight: 'bold', marginBottom: 4 },
  commissionNotes: { fontSize: 12, color: '#666' },
});
