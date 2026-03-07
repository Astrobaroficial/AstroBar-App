import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

export default function ScheduledPromotionsScreen() {
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'common',
    originalPrice: '',
    promoPrice: '',
    stock: '',
    scheduleType: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '20:00',
    endTime: '23:00',
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const response = await api.get('/phase2/scheduled-promotions/my');
      if (response.data.success) {
        setPromotions(response.data.promotions || []);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPromotion = async () => {
    try {
      setLoading(true);
      await api.post('/phase2/scheduled-promotions', {
        ...formData,
        originalPrice: parseInt(formData.originalPrice) * 100,
        promoPrice: parseInt(formData.promoPrice) * 100,
        stock: parseInt(formData.stock),
      });
      setShowModal(false);
      loadPromotions();
    } catch (error) {
      console.error('Error creating promotion:', error);
      alert('Error al crear promoción');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      scheduled: '#FFA726',
      active: '#4CAF50',
      completed: '#9E9E9E',
      cancelled: '#F44336',
    };
    return colors[status] || '#666';
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      scheduled: 'Programada',
      active: 'Activa',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return texts[status] || status;
  };

  if (loading && promotions.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⏰ Promociones Programadas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {promotions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No tenés promociones programadas</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowModal(true)}>
              <Text style={styles.createButtonText}>Crear Primera Promoción</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((promo: any) => (
            <View key={promo.id} style={styles.promoCard}>
              <View style={styles.promoHeader}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(promo.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(promo.status)}</Text>
                </View>
              </View>

              <Text style={styles.promoDesc}>{promo.description}</Text>

              <View style={styles.promoDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag" size={16} color="#FF6B35" />
                  <Text style={styles.detailText}>
                    ${(promo.promo_price / 100).toFixed(0)} (antes ${(promo.original_price / 100).toFixed(0)})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="cube" size={16} color="#FF6B35" />
                  <Text style={styles.detailText}>Stock: {promo.stock}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#FF6B35" />
                  <Text style={styles.detailText}>
                    {promo.start_time} - {promo.end_time}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="repeat" size={16} color="#FF6B35" />
                  <Text style={styles.detailText}>
                    {promo.schedule_type === 'daily' ? 'Diaria' : 
                     promo.schedule_type === 'weekly' ? 'Semanal' : 'Una vez'}
                  </Text>
                </View>

                {promo.next_activation && (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>
                      Próxima: {new Date(promo.next_activation).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.promoStats}>
                <Text style={styles.statText}>Activaciones: {promo.activation_count || 0}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Promoción Programada</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Título"
                placeholderTextColor="#666"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Descripción"
                placeholderTextColor="#666"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Precio Original"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={formData.originalPrice}
                  onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
                />

                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Precio Promo"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={formData.promoPrice}
                  onChangeText={(text) => setFormData({ ...formData, promoPrice: text })}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Stock"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={formData.stock}
                onChangeText={(text) => setFormData({ ...formData, stock: text })}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Hora Inicio (HH:MM)"
                  placeholderTextColor="#666"
                  value={formData.startTime}
                  onChangeText={(text) => setFormData({ ...formData, startTime: text })}
                />

                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Hora Fin (HH:MM)"
                  placeholderTextColor="#666"
                  value={formData.endTime}
                  onChangeText={(text) => setFormData({ ...formData, endTime: text })}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={createPromotion}>
                <Text style={styles.submitButtonText}>Crear Promoción</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  promoCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  promoDesc: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 12,
  },
  promoDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#CCC',
    fontSize: 14,
  },
  promoStats: {
    borderTopWidth: 1,
    borderTopColor: '#2A2F4A',
    paddingTop: 12,
  },
  statText: {
    color: '#AAA',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1F3A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  input: {
    backgroundColor: '#0A0E27',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
