import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AstroBarColors, Spacing } from '@/constants/theme';

export default function BusinessWalletScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleConnectStripe = () => {
    Alert.alert('Conectar Stripe', 'Redirigiendo a Stripe Connect...');
  };

  const handleRequestPayout = () => {
    Alert.alert('Solicitar Retiro', '¿Confirmas el retiro de fondos disponibles?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => Alert.alert('Éxito', 'Retiro solicitado') },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Cargando billetera...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Feather name="credit-card" size={32} color={AstroBarColors.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Mi Billetera</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gestión de pagos</Text>
      </View>

      {/* Stripe Connection */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="link" size={20} color={AstroBarColors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Conexión Stripe</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: theme.text }]}>Cuenta conectada ✅</Text>
          <Feather name="check-circle" size={24} color="#4CAF50" />
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleConnectStripe}>
          <Text style={styles.actionButtonText}>Ver cuenta Stripe</Text>
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="dollar-sign" size={20} color={AstroBarColors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Transferencias y Retiros</Text>
        </View>

        <View style={styles.balanceRow}>
          <View>
            <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo disponible</Text>
            <Text style={[styles.balanceAmount, { color: AstroBarColors.primary }]}>$1,250.75</Text>
          </View>
          <TouchableOpacity 
            style={[styles.withdrawButton, { backgroundColor: AstroBarColors.primary }]}
            onPress={handleRequestPayout}
          >
            <Text style={styles.withdrawButtonText}>Solicitar retiro</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.payoutInfo}>
          <View style={styles.payoutRow}>
            <Text style={[styles.payoutLabel, { color: theme.textSecondary }]}>Próxima transferencia:</Text>
            <Text style={[styles.payoutValue, { color: theme.text }]}>Mañana a las 9:00 AM</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={[styles.payoutLabel, { color: theme.textSecondary }]}>Configuración:</Text>
            <Text style={[styles.payoutValue, { color: theme.text }]}>Semanal</Text>
          </View>
        </View>
      </View>

      {/* Payment History */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="list" size={20} color={AstroBarColors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Historial de Pagos</Text>
        </View>

        <View style={[styles.paymentRow, { borderBottomColor: theme.border }]}>
          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentDate, { color: theme.text }]}>15 Feb - $450.00</Text>
            <Text style={[styles.paymentStatus, { color: '#4CAF50' }]}>Completado</Text>
          </View>
          <Feather name="check-circle" size={16} color="#4CAF50" />
        </View>

        <View style={[styles.paymentRow, { borderBottomColor: theme.border }]}>
          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentDate, { color: theme.text }]}>8 Feb - $320.50</Text>
            <Text style={[styles.paymentStatus, { color: '#4CAF50' }]}>Completado</Text>
          </View>
          <Feather name="check-circle" size={16} color="#4CAF50" />
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="settings" size={20} color={AstroBarColors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Configuración de Pagos</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Cuenta bancaria:</Text>
          <Text style={[styles.settingValue, { color: theme.text }]}>**** 1234 (Banco Santander)</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Frecuencia:</Text>
          <Text style={[styles.settingValue, { color: theme.text }]}>Transferencias semanales</Text>
        </View>
      </View>

      {/* Documents */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Feather name="file-text" size={20} color={AstroBarColors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Documentos Fiscales</Text>
        </View>

        <TouchableOpacity style={styles.documentRow}>
          <Text style={[styles.documentText, { color: theme.text }]}>Descargar resumen mensual</Text>
          <Feather name="download" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.documentRow}>
          <Text style={[styles.documentText, { color: theme.text }]}>Certificados de ingresos</Text>
          <Feather name="download" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: { padding: Spacing.lg, alignItems: 'center', borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700', marginTop: Spacing.sm },
  subtitle: { fontSize: 14, marginTop: Spacing.xs },
  card: { margin: Spacing.md, padding: Spacing.md, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: Spacing.sm },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  statusText: { fontSize: 16, fontWeight: '600' },
  actionButton: { backgroundColor: AstroBarColors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  balanceLabel: { fontSize: 14 },
  balanceAmount: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  withdrawButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 8 },
  withdrawButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  payoutInfo: { gap: Spacing.sm },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payoutLabel: { fontSize: 14 },
  payoutValue: { fontSize: 14, fontWeight: '500' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  paymentInfo: { flex: 1 },
  paymentDate: { fontSize: 14, fontWeight: '500' },
  paymentStatus: { fontSize: 12, marginTop: 2 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  settingLabel: { fontSize: 14 },
  settingValue: { fontSize: 14, fontWeight: '500' },
  documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  documentText: { fontSize: 14 },
});