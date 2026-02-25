import React, { useState } from 'react';
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

export default function BankAccountSetupScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    accountType: 'savings', // savings, checking
    accountNumber: '',
    cbu: '', // Clave Bancaria Uniforme (Argentina)
    cvu: '', // Clave Virtual Uniforme (billeteras digitales)
    alias: '', // Alias bancario
    holderName: '',
    holderDni: '',
    accountMethod: 'bank' // bank, digital_wallet
  });

  const bankOptions = [
    'Banco Nación', 'Banco Provincia', 'Banco Ciudad', 'BBVA', 'Santander',
    'Macro', 'Galicia', 'ICBC', 'Supervielle', 'Patagonia', 'Otro'
  ];

  const digitalWallets = [
    'Mercado Pago', 'Ualá', 'Brubank', 'Naranja X', 'Personal Pay', 'Otro'
  ];

  const handleSave = async () => {
    if (!formData.holderName || !formData.holderDni) {
      showToast('Completa los datos del titular', 'error');
      return;
    }

    if (formData.accountMethod === 'bank') {
      if (!formData.bankName || (!formData.cbu && !formData.alias)) {
        showToast('Completa CBU/Alias y banco', 'error');
        return;
      }
    } else {
      if (!formData.cvu && !formData.alias) {
        showToast('Completa CVU/Alias', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      // First save bank account locally
      const bankResponse = await apiRequest('POST', '/api/business/bank-account', formData);
      const bankData = await bankResponse.json();
      
      if (!bankData.success) {
        throw new Error(bankData.error);
      }

      // Then create/update Stripe Connect account
      const stripeResponse = await apiRequest('POST', '/api/business/stripe-connect', {
        holderName: formData.holderName,
        holderDni: formData.holderDni,
        bankName: formData.bankName,
        accountMethod: formData.accountMethod
      });
      
      const stripeData = await stripeResponse.json();
      
      if (stripeData.success) {
        if (stripeData.onboardingUrl) {
          // Redirect to Stripe onboarding
          showToast('Redirigiendo a configuración de Stripe...', 'info');
          // In a real app, you'd open this URL in a WebView or browser
          console.log('Stripe onboarding URL:', stripeData.onboardingUrl);
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Cuenta configurada correctamente', 'success');
        navigation.goBack();
      } else {
        throw new Error(stripeData.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Error al configurar cuenta', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Method Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Método de Pago</ThemedText>
          
          <View style={styles.methodOptions}>
            <Pressable
              style={[
                styles.methodOption,
                {
                  backgroundColor: formData.accountMethod === 'bank' ? AstroBarColors.primaryLight : theme.backgroundSecondary,
                  borderColor: formData.accountMethod === 'bank' ? AstroBarColors.primary : 'transparent'
                }
              ]}
              onPress={() => setFormData({...formData, accountMethod: 'bank'})}
            >
              <Feather name="home" size={20} color={formData.accountMethod === 'bank' ? AstroBarColors.primary : theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>Cuenta Bancaria</ThemedText>
            </Pressable>
            
            <Pressable
              style={[
                styles.methodOption,
                {
                  backgroundColor: formData.accountMethod === 'digital_wallet' ? AstroBarColors.primaryLight : theme.backgroundSecondary,
                  borderColor: formData.accountMethod === 'digital_wallet' ? AstroBarColors.primary : 'transparent'
                }
              ]}
              onPress={() => setFormData({...formData, accountMethod: 'digital_wallet'})}
            >
              <Feather name="smartphone" size={20} color={formData.accountMethod === 'digital_wallet' ? AstroBarColors.primary : theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>Billetera Digital</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Bank/Wallet Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {formData.accountMethod === 'bank' ? 'Banco' : 'Billetera Digital'}
          </ThemedText>
          
          <View style={styles.bankGrid}>
            {(formData.accountMethod === 'bank' ? bankOptions : digitalWallets).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.bankOption,
                  {
                    backgroundColor: formData.bankName === option ? AstroBarColors.primaryLight : theme.backgroundSecondary,
                    borderColor: formData.bankName === option ? AstroBarColors.primary : 'transparent'
                  }
                ]}
                onPress={() => setFormData({...formData, bankName: option})}
              >
                <ThemedText type="small" style={{
                  color: formData.bankName === option ? AstroBarColors.primary : theme.text,
                  textAlign: 'center'
                }}>
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Account Details */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          <ThemedText type="h4" style={styles.sectionTitle}>Datos de la Cuenta</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              Titular de la Cuenta *
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={formData.holderName}
              onChangeText={(text) => setFormData({...formData, holderName: text})}
              placeholder="Nombre completo del titular"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              DNI/CUIT del Titular *
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={formData.holderDni}
              onChangeText={(text) => setFormData({...formData, holderDni: text})}
              placeholder="12345678 o 20-12345678-9"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {formData.accountMethod === 'bank' ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                  CBU (22 dígitos)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={formData.cbu}
                  onChangeText={(text) => setFormData({...formData, cbu: text})}
                  placeholder="1234567890123456789012"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  maxLength={22}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                  Alias Bancario
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={formData.alias}
                  onChangeText={(text) => setFormData({...formData, alias: text.toLowerCase()})}
                  placeholder="mi.negocio.astrobar"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                  CVU (22 dígitos)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={formData.cvu}
                  onChangeText={(text) => setFormData({...formData, cvu: text})}
                  placeholder="0000003100012345678901"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  maxLength={22}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                  Alias
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={formData.alias}
                  onChangeText={(text) => setFormData({...formData, alias: text.toLowerCase()})}
                  placeholder="mi.negocio.mp"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={16} color={AstroBarColors.info} />
          <ThemedText type="small" style={{ color: AstroBarColors.info, marginLeft: Spacing.sm, flex: 1 }}>
            {formData.accountMethod === 'bank' 
              ? 'Necesitas CBU o Alias para recibir transferencias bancarias inmediatas'
              : 'Las billeteras digitales permiten transferencias instantáneas 24/7'
            }
          </ThemedText>
        </View>

        {/* Save Button */}
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: AstroBarColors.primary, opacity: loading ? 0.7 : 1 }
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            {loading ? 'Guardando...' : 'Configurar Cuenta'}
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
  section: { borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionTitle: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  methodOptions: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  methodOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  bankOption: { padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, minWidth: '30%' },
  inputGroup: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 16 },
  infoCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'flex-start', marginBottom: Spacing.lg },
  saveButton: { padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginBottom: Spacing.lg }
});