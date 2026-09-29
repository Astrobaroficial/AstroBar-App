import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../lib/api';
import { AstroBarColors } from '@/constants/theme';

type Tab = 'users' | 'businesses' | 'commissions';

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      let res;
      if (activeTab === 'users') {
        res = await api.get('/admin/users');
        const rawUsers = res.data.users || res.data || [];
        setData(rawUsers.filter((u: any) => u && (u.id || u.email || u.phone)));
      } else if (activeTab === 'businesses') {
        res = await api.get('/admin/businesses');
        const rawBusinesses = res.data.businesses || res.data || [];
        setData(rawBusinesses.filter((b: any) => b && (b.id || b.businessId)));
      } else {
        res = await api.get('/admin/commissions');
        const rawCommissions = res.data.businesses || res.data || res.data.commissions || [];
        setData(rawCommissions.filter((c: any) => c && (c.businessId || c.id)));
      }
    } catch (error) {
      console.error('Error loading management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    setEditForm(item);
    setEditModal(true);
  };

  const saveEdit = async () => {
    try {
      if (activeTab === 'users') {
        await api.put(`/admin/users/${selectedItem.id}`, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role
        });
      } else if (activeTab === 'businesses') {
        await api.put(`/admin/businesses/${selectedItem.id}`, {
          name: editForm.name,
          address: editForm.address,
          phone: editForm.phone,
          email: editForm.email
        });
      } else {
        const commissionValue = parseFloat(editForm.commission);
        const commissionDecimal = commissionValue > 1 ? commissionValue / 100 : commissionValue;
        await api.post('/admin/commissions', {
          businessId: selectedItem.businessId || selectedItem.id,
          commission: commissionDecimal,
          notes: editForm.notes || ''
        });
      }
      Alert.alert('Éxito', 'Datos actualizados');
      setEditModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean, type: 'user' | 'business') => {
    try {
      if (type === 'user') {
        await api.patch(`/admin/users/${id}/status`, { isActive: !currentStatus });
      } else {
        await api.patch(`/admin/businesses/${id}/verification`, { isActive: !currentStatus });
      }
      Alert.alert('Éxito', 'Estado actualizado');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const deleteUser = async (id: string) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar este usuario permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${id}`);
              Alert.alert('Éxito', 'Usuario eliminado');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  };

  const renderBusiness = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name || 'Sin nombre'}</Text>
          <Text style={styles.cardSubtitle}>{item.address || 'Sin dirección'}</Text>
          <Text style={styles.cardDetail}>Propietario: {item.ownerName || 'N/A'}</Text>
          <Text style={styles.cardDetail}>Teléfono: {item.phone || 'N/A'}</Text>
          <Text style={styles.cardDetail}>Email: {item.email || 'N/A'}</Text>
          <Text style={styles.cardDetail}>Mercado Pago: {item.mercadoPagoAccountId ? 'Conectado' : 'No conectado'}</Text>
          <Text style={styles.cardDetail}>Verificación: {item.verificationStatus || 'Pendiente'}</Text>
          <Text style={styles.cardDetail}>Registro: {formatDate(item.createdAt)}</Text>
        </View>
        <View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#f44336' }]}
            onPress={(e) => { e.stopPropagation(); toggleStatus(item.id, item.isActive, 'business'); }}
          >
            <Text style={styles.statusText}>{item.isActive ? 'Activo' : 'Inactivo'}</Text>
          </TouchableOpacity>
          <Feather name="edit-2" size={20} color={AstroBarColors.primary} style={{ marginTop: 8, alignSelf: 'center' }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCommission = ({ item }: any) => {
    const rawCommission = item?.commission ?? item?.rate ?? 0;
    const numericCommission = parseFloat(rawCommission);
    const formattedCommission = !isNaN(numericCommission) 
      ? (numericCommission > 1 ? numericCommission : numericCommission * 100).toFixed(1) 
      : '0.0';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item?.businessName || item?.name || `Bar #${item?.businessId || item?.id || 'N/A'}`}</Text>
            <Text style={styles.commissionValue}>
              {formattedCommission}% de comisión
            </Text>
            <Text style={styles.cardDetail}>
              Última actualización: {formatDate(item?.lastUpdatedAt || item?.lastUpdated || item?.updatedAt)}
            </Text>
          </View>
          <Feather name="edit-2" size={20} color={AstroBarColors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name || 'Usuario sin nombre'}</Text>
          <Text style={styles.cardSubtitle}>{item.email || item.phone || 'Sin contacto'}</Text>
          <Text style={styles.cardDetail}>Rol: {item.role || 'customer'}</Text>
          <Text style={styles.cardDetail}>Email verificado: {item.emailVerified ? 'Sí' : 'No'}</Text>
          <Text style={styles.cardDetail}>Teléfono verificado: {item.phoneVerified ? 'Sí' : 'No'}</Text>
          <Text style={styles.cardDetail}>Registro: {formatDate(item.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#f44336' }]}
            onPress={(e) => { e.stopPropagation(); toggleStatus(item.id, item.isActive, 'user'); }}
          >
            <Text style={styles.statusText}>{item.isActive ? 'Activo' : 'Inactivo'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <Feather name="edit-2" size={20} color={AstroBarColors.primary} />
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteUser(item.id); }}>
              <Feather name="trash-2" size={20} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Feather name="users" size={20} color={activeTab === 'users' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Usuarios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'businesses' && styles.activeTab]}
          onPress={() => setActiveTab('businesses')}
        >
          <Feather name="briefcase" size={20} color={activeTab === 'businesses' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'businesses' && styles.activeTabText]}>Bares</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'commissions' && styles.activeTab]}
          onPress={() => setActiveTab('commissions')}
        >
          <Feather name="dollar-sign" size={20} color={activeTab === 'commissions' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'commissions' && styles.activeTabText]}>Comisiones</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item?.id || item?.businessId || `item-${index}`)}
        renderItem={activeTab === 'users' ? renderUser : activeTab === 'businesses' ? renderBusiness : renderCommission}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadData}
      />

      {/* Modal de Edición */}
      {editModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar {activeTab === 'users' ? 'Usuario' : activeTab === 'businesses' ? 'Bar' : 'Comisión'}</Text>
            
            {activeTab === 'users' && (
              <>
                <TextInput style={styles.input} placeholder="Nombre" value={editForm.name || ''} onChangeText={(text) => setEditForm({...editForm, name: text})} />
                <TextInput style={styles.input} placeholder="Email" value={editForm.email || ''} onChangeText={(text) => setEditForm({...editForm, email: text})} />
                <TextInput style={styles.input} placeholder="Teléfono" value={editForm.phone || ''} onChangeText={(text) => setEditForm({...editForm, phone: text})} />
                <View style={styles.input}>
                  <Text style={{ color: '#666', marginBottom: 4 }}>Rol:</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['customer', 'business_owner', 'admin'].map(role => (
                      <TouchableOpacity
                        key={role}
                        style={[styles.roleButton, editForm.role === role && styles.roleButtonActive]}
                        onPress={() => setEditForm({...editForm, role})}
                      >
                        <Text style={[styles.roleButtonText, editForm.role === role && styles.roleButtonTextActive]}>
                          {role === 'customer' ? 'Cliente' : role === 'business_owner' ? 'Bar' : 'Admin'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
            
            {activeTab === 'businesses' && (
              <>
                <TextInput style={styles.input} placeholder="Nombre" value={editForm.name || ''} onChangeText={(text) => setEditForm({...editForm, name: text})} />
                <TextInput style={styles.input} placeholder="Dirección" value={editForm.address || ''} onChangeText={(text) => setEditForm({...editForm, address: text})} />
                <TextInput style={styles.input} placeholder="Teléfono" value={editForm.phone || ''} onChangeText={(text) => setEditForm({...editForm, phone: text})} />
                <TextInput style={styles.input} placeholder="Email" value={editForm.email || ''} onChangeText={(text) => setEditForm({...editForm, email: text})} />
              </>
            )}
            
            {activeTab === 'commissions' && (
              <>
                <TextInput 
                  style={styles.input} 
                  placeholder="Comisión % (5-30)" 
                  keyboardType="numeric" 
                  value={editForm.commission ? String((parseFloat(editForm.commission) * 100).toFixed(0)) : ''} 
                  onChangeText={(text) => setEditForm({...editForm, commission: text})} 
                />
                <TextInput 
                  style={styles.input} 
                  placeholder="Notas" 
                  value={editForm.notes || ''} 
                  onChangeText={(text) => setEditForm({...editForm, notes: text})} 
                  multiline 
                />
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setEditModal(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: AstroBarColors.primary }]} onPress={saveEdit}>
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  cardDetail: { fontSize: 12, color: '#999', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  commissionValue: { fontSize: 20, fontWeight: 'bold', color: AstroBarColors.primary, marginTop: 8 },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  roleButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f5f5f5' },
  roleButtonActive: { backgroundColor: AstroBarColors.primary, borderColor: AstroBarColors.primary },
  roleButtonText: { fontSize: 12, color: '#666' },
  roleButtonTextActive: { color: '#fff', fontWeight: '600' },
});