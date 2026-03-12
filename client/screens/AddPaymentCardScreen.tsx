import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { api } from '@/lib/api';

export default function AddPaymentCardScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted.slice(0, 19));
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      setExpiryDate(cleaned);
    } else {
      const formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
      setExpiryDate(formatted);
    }
  };

  const validateExpiryDate = (month: number, year: number): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const fullYear = year < 100 ? 2000 + year : year;

    if (fullYear < currentYear) {
      showToast('La tarjeta está vencida (año pasado)', 'error');
      return false;
    }

    if (fullYear === currentYear && month < currentMonth) {
      showToast('La tarjeta está vencida (mes pasado)', 'error');
      return false;
    }

    if (month < 1 || month > 12) {
      showToast('Mes de vencimiento inválido (01-12)', 'error');
      return false;
    }

    if (fullYear > currentYear + 20) {
      showToast('Fecha de vencimiento muy lejana', 'error');
      return false;
    }

    return true;
  };

  const validateCard = () => {
    if (!cardNumber.replace(/\s/g, '')) {
      showToast('Ingresa el número de tarjeta', 'error');
      return false;
    }
    if (!cardholderName.trim()) {
      showToast('Ingresa el nombre del titular', 'error');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      showToast('Ingresa la fecha de vencimiento (MM/YY)', 'error');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      showToast('Ingresa el CVV', 'error');
      return false;
    }

    const [month, year] = expiryDate.split('/');
    if (!validateExpiryDate(parseInt(month), parseInt(year))) {
      return false;
    }

    return true;
  };

  const handleAddCard = async () => {
    if (!validateCard()) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const [month, year] = expiryDate.split('/');
      
      console.log('🔐 Tokenizando tarjeta con Mercado Pago...');
      
      // Enviar datos al backend para tokenizar con Mercado Pago
      const response = await api.post('/user/payment-methods', {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName,
        expiryMonth: parseInt(month),
        expiryYear: parseInt('20' + year),
        cvv,
        isDefault,
      });

      console.log('✅ Respuesta del servidor:', response.data);

      if (response.data.success) {
        showToast('Tarjeta agregada exitosamente', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        showToast(response.data.error || 'Error al agregar tarjeta', 'error');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      showToast(error.response?.data?.error || error.message || 'Error al agregar tarjeta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.card }, Shadows.md]}>
          <View style={[styles.iconContainer, { backgroundColor: AstroBarColors.primary }]}>
            <Feather name="credit-card" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.md }}>
            Agregar Tarjeta
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
            Tus datos están protegidos con encriptación
          </ThemedText>
        </View>

        {/* Form */}
        <View style={[styles.section, { backgroundColor: theme.card }, Shadows.sm]}>
          {/* Card Number */}
          <View style={styles.formGroup}>
            <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
              Número de Tarjeta
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={theme.textSecondary}
              value={cardNumber}
              onChangeText={formatCardNumber}
              keyboardType="numeric"
              maxLength={19}
              editable={!loading}
            />
          </View>

          {/* Cardholder Name */}
          <View style={styles.formGroup}>
            <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
              Nombre del Titular
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Juan Pérez"
              placeholderTextColor={theme.textSecondary}
              value={cardholderName}
              onChangeText={setCardholderName}
              editable={!loading}
            />
          </View>

          {/* Expiry and CVV */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.md }]}>
              <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
                Vencimiento
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="MM/YY"
                placeholderTextColor={theme.textSecondary}
                value={expiryDate}
                onChangeText={formatExpiry}
                keyboardType="numeric"
                maxLength={5}
                editable={!loading}
              />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Ej: 12/25 (Diciembre 2025)
              </ThemedText>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
                CVV
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="123"
                placeholderTextColor={theme.textSecondary}
                value={cvv}
                onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                editable={!loading}
              />
            </View>
          </View>

          {/* Default Card */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setIsDefault(!isDefault)}
          >
            <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: isDefault ? AstroBarColors.primary : 'transparent' }]}>
              {isDefault && <Feather name="check" size={16} color="#FFFFFF" />}
            </View>
            <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
              Usar como tarjeta predeterminada
            </ThemedText>
          </Pressable>
        </View>

        {/* Security Info */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="shield" size={20} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info, fontWeight: '600' }}>
              Seguridad
            </ThemedText>
            <ThemedText type="small" style={{ color: AstroBarColors.info, marginTop: Spacing.xs }}>
              • Encriptación de nivel bancario{'\n'}
              • Tokenizado con Mercado Pago{'\n'}
              • Nunca guardamos tu CVV
            </ThemedText>
          </View>
        </View>

        {/* Add Button */}
        <Pressable
          style={[
            styles.button,
            { backgroundColor: AstroBarColors.primary, opacity: loading ? 0.6 : 1 }
          ]}
          onPress={handleAddCard}
          disabled={loading}
        >
          {loading ? (
            <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
              Agregando...
            </ThemedText>
          ) : (
            <>
              <Feather name="plus" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: Spacing.sm }}>
                Agregar Tarjeta
              </ThemedText>
            </>
          )}
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  headerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  button: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
});
