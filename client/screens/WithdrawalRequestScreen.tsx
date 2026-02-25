import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface BankAccount {
  id: string;
  bankName: string;
  accountMethod: string;
  cbu?: string;
  cvu?: string;
  alias?: string;
  holderName: string;
}

export default function WithdrawalRequestScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadBankAccount();
    loadAvailableBalance();
  }, []);

  const loadBankAccount = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/bank-account');
      const data = await response.json();
      if (data.success && data.account) {
        setBankAccount(data.account);
      }
    } catch (error) {
      console.error('Error loading bank account:', error);
    }
  };

  const loadAvailableBalance = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/wallet-stats');
      const data = await response.json();
      if (data.success) {
        setAvailableBalance(data.stats.totalEarnings - data.stats.pendingPayouts);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    
    if (!amount || amount <= 0) {
      showToast('Ingresa un monto válido', 'error');
      return;
    }

    if (amount > availableBalance) {
      showToast('Monto mayor al disponible', 'error');
      return;
    }

    if (amount < 1000) {
      showToast('Monto mínimo: $1,000', 'error');
      return;
    }

    if (!bankAccount) {
      showToast('Configura tu cuenta bancaria primero', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/business/withdrawal-request', {
        amount,
        note: note.trim(),
        bankAccountId: bankAccount.id
      });
      
      const data = await response.json();
      
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Solicitud de retiro enviada', 'success');
        navigation.goBack();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Error al solicitar retiro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const amount = Math.floor(availableBalance * percentage);
    setWithdrawalAmount(amount.toString());
  };

  if (!bankAccount) {
    return (
      <LinearGradient
        colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
        style={styles.container}
      >
        <View style={styles.noBankAccount}>
          <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.warningLight }]}>
            <Feather name="alert-circle" size={48} color={AstroBarColors.warning} />
          </View>
          <ThemedText type="h3" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
            Configura tu cuenta
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.xl }}>
            Necesitas configurar una cuenta bancaria o billetera digital para recibir transferencias
          </ThemedText>
          <Pressable
            style={[styles.setupButton, { backgroundColor: AstroBarColors.primary }]}
            onPress={() => navigation.navigate('BankAccountSetup' as any)}
          >
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
              Configurar Cuenta
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
      >
        {/* Available Balance */}
        <View style={[styles.balanceCard, { backgroundColor: AstroBarColors.success }, Shadows.md]}>
          <View style={styles.balanceHeader}>
            <Feather name="dollar-sign" size={24} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', opacity: 0.9 }}>
              Disponible para Retiro
            </ThemedText>
          </View>
          <ThemedText type="h1" style={{ color: '#FFFFFF', marginVertical: Spacing.sm }}>
            {formatCurrency(availableBalance)}
          </ThemedText>
        </View>

        {/* Bank Account Info */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Cuenta de Destino</ThemedText>
          <View style={styles.bankInfo}>
            <View style={[styles.bankIcon, { backgroundColor: AstroBarColors.primaryLight }]}>
              <Feather name={bankAccount.accountMethod === 'bank' ? 'home' : 'smartphone'} size={20} color={AstroBarColors.primary} />
            </View>
            <View style={styles.bankDetails}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{bankAccount.bankName}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {bankAccount.holderName}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {bankAccount.alias || (bankAccount.cbu || bankAccount.cvu)?.slice(-4)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Withdrawal Amount */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Monto a Retirar</ThemedText>
          
          <View style={styles.amountInput}>
            <ThemedText type="h2" style={{ color: theme.textSecondary }}>$</ThemedText>
            <TextInput
              style={[styles.amountField, { color: theme.text }]}
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.quickAmounts}>
            {[0.25, 0.5, 0.75, 1].map((percentage) => (
              <Pressable
                key={percentage}
                style={[styles.quickAmount, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setQuickAmount(percentage)}
              >
                <ThemedText type="small" style={{ color: theme.text }}>
                  {percentage === 1 ? 'Todo' : `${percentage * 100}%`}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              Nota (opcional)
            </ThemedText>
            <TextInput
              style={[styles.noteInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={note}
              onChangeText={setNote}
              placeholder="Motivo del retiro..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={16} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Monto mínimo: $1,000{'\n'}
              • Procesamiento: 1-3 días hábiles{'\n'}
              • Sin comisiones adicionales{'\n'}
              • Transferencias inmediatas con CBU/CVU
            </ThemedText>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            { 
              backgroundColor: AstroBarColors.primary,
              opacity: loading || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0 ? 0.5 : 1
            }
          ]}
          onPress={handleWithdrawal}
          disabled={loading || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
        >
          <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            {loading ? 'Procesando...' : 'Solicitar Retiro'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  noBankAccount: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  iconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  setupButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md },
  balanceCard: { padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  section: { borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionTitle: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  bankInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  bankIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  bankDetails: { flex: 1 },
  amountInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  amountField: { flex: 1, fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
  quickAmount: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
  inputGroup: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.xs },
  noteInput: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 16, textAlignVertical: 'top' },
  infoCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'flex-start', marginBottom: Spacing.lg },
  submitButton: { padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' }
});