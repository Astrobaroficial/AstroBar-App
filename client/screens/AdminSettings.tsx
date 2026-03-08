import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../lib/api';
import { AstroBarColors } from '@/constants/theme';

type Tab = 'system' | 'notifications';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('system');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');

  useEffect(() => {
    if (activeTab === 'system') {
      loadSettings();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings');
      const settingsArray = res.data.settings || [];
      const settingsObj: any = {
        max_active_bars: 100,
        max_products_per_bar: 80,
        max_common_promotions: 10,
        max_flash_promotions: 3,
        default_platform_commission: 30,
        cancellation_window_seconds: 60
      };
      settingsArray.forEach((s: any) => {
        if (s.setting_key === 'default_platform_commission') {
          settingsObj[s.setting_key] = parseFloat(s.value) * 100;
        } else {
          settingsObj[s.setting_key] = parseInt(s.value);
        }
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      let finalValue = value;
      if (key === 'default_platform_commission') {
        finalValue = (parseFloat(value) / 100).toString();
      }
      await api.post('/admin/settings/update', { key, value: finalValue });
      Alert.alert('Éxito', 'Configuración guardada');
      loadSettings();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'max_active_bars', value: settings.max_active_bars?.toString() },
        { key: 'max_products_per_bar', value: settings.max_products_per_bar?.toString() },
        { key: 'max_common_promotions', value: settings.max_common_promotions?.toString() },
        { key: 'max_flash_promotions', value: settings.max_flash_promotions?.toString() },
        { key: 'default_platform_commission', value: (settings.default_platform_commission / 100).toString() },
        { key: 'cancellation_window_seconds', value: settings.cancellation_window_seconds?.toString() },
      ];
      
      for (const update of updates) {
        await api.post('/admin/settings/update', update);
      }
      
      Alert.alert('Éxito', 'Todas las configuraciones guardadas');
      loadSettings();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const sendNotification = async (target: string) => {
    if (!notificationTitle || !notificationBody) {
      Alert.alert('Error', 'Completa título y mensaje');
      return;
    }

    try {
      await api.post('/admin/notifications/push', {
        title: notificationTitle,
        body: notificationBody,
        target
      });
      Alert.alert('Éxito', 'Notificación enviada');
      setNotificationTitle('');
      setNotificationBody('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'system' && styles.activeTab]}
          onPress={() => setActiveTab('system')}
        >
          <Feather name="settings" size={20} color={activeTab === 'system' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'system' && styles.activeTabText]}>Sistema</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Feather name="bell" size={20} color={activeTab === 'notifications' ? AstroBarColors.primary : '#666'} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notificaciones</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'system' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración del Sistema</Text>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Máximo de bares activos</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.max_active_bars?.toString()}
                onChangeText={(v) => setSettings({...settings, max_active_bars: parseInt(v) || 100})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Máximo productos por bar</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.max_products_per_bar?.toString()}
                onChangeText={(v) => setSettings({...settings, max_products_per_bar: parseInt(v) || 80})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Máximo promociones comunes</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.max_common_promotions?.toString()}
                onChangeText={(v) => setSettings({...settings, max_common_promotions: parseInt(v) || 10})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Máximo promociones flash</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.max_flash_promotions?.toString()}
                onChangeText={(v) => setSettings({...settings, max_flash_promotions: parseInt(v) || 3})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Comisión plataforma por defecto (%)</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.default_platform_commission?.toString()}
                onChangeText={(v) => setSettings({...settings, default_platform_commission: parseFloat(v) || 30})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.settingCard}>
              <Text style={styles.settingKey}>Tiempo de cancelación (segundos)</Text>
              <TextInput
                style={styles.settingInput}
                defaultValue={settings.cancellation_window_seconds?.toString()}
                onChangeText={(v) => setSettings({...settings, cancellation_window_seconds: parseInt(v) || 60})}
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: AstroBarColors.primary }]}
              onPress={saveAllSettings}
              disabled={saving}
            >
              <Feather name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enviar Notificación Push</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder="Título de la notificación"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mensaje</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder="Mensaje de la notificación"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#4CAF50' }]}
                onPress={() => sendNotification('customers')}
              >
                <Feather name="users" size={20} color="#fff" />
                <Text style={styles.buttonText}>Enviar a Clientes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#2196F3' }]}
                onPress={() => sendNotification('businesses')}
              >
                <Feather name="briefcase" size={20} color="#fff" />
                <Text style={styles.buttonText}>Enviar a Bares</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#FF9800' }]}
                onPress={() => sendNotification('all')}
              >
                <Feather name="globe" size={20} color="#fff" />
                <Text style={styles.buttonText}>Enviar a Todos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  settingCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  settingKey: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  settingDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  settingInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff' },
  settingValue: { fontSize: 16, fontWeight: 'bold', color: AstroBarColors.primary, marginTop: 4 },
  infoText: { fontSize: 14, color: '#666', marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  buttonGroup: { gap: 12, marginTop: 8 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 8, marginTop: 16 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
