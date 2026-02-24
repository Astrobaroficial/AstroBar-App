import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '@/lib/query-client';
import { isInCoverageArea, AUTLAN_CENTER } from '@/utils/coverage';
import { checkDuplicateAddress, suggestSimilarAddresses, Address } from '@/utils/addressValidation';
import { useDebounce, usePerformanceMonitor } from '@/hooks/usePerformance';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Spacing } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddAddress'>;

type RouteParams = {
  address?: Partial<Address>;
  fromCheckout?: boolean;
};

export default function AddAddressScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const topPadding = Spacing.md;
  const existingAddress = (route.params as any)?.address as Partial<Address> | undefined;
  const fromCheckout = Boolean((route.params as Partial<RouteParams> | undefined)?.fromCheckout);
  const { user } = useAuth();
  usePerformanceMonitor('AddAddressScreen');
  
  // Fetch existing addresses
  const { data: addressesData } = useQuery<{ addresses: Address[] }>({
    queryKey: ["/api/users", user?.id, "addresses"],
    enabled: !!user?.id,
  });
  const existingAddresses = addressesData?.addresses || [];
  
  const [label, setLabel] = useState(existingAddress?.label || '');
  const [street, setStreet] = useState(existingAddress?.street || '');
  const [city, setCity] = useState(existingAddress?.city || 'Autlán');
  const [state, setState] = useState(existingAddress?.state || 'Jalisco');
  const [zipCode, setZipCode] = useState(existingAddress?.zipCode || '');
  const [loading, setLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    existingAddress?.latitude && existingAddress?.longitude
      ? { latitude: existingAddress.latitude, longitude: existingAddress.longitude }
      : null,
  );
  const [duplicateWarning, setDuplicateWarning] = useState<Address | null>(null);
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  
  // Debounce street input for suggestions
  const debouncedStreet = useDebounce(street, 300);

  // Check for duplicates when coordinates or street change
  useEffect(() => {
    if (coordinates && street && existingAddresses.length > 0) {
      const duplicate = checkDuplicateAddress(
        { latitude: coordinates.latitude, longitude: coordinates.longitude, street },
        existingAddresses
      );
      setDuplicateWarning(duplicate);
    } else {
      setDuplicateWarning(null);
    }
  }, [coordinates, street, existingAddresses]);

  // Show suggestions when typing street (debounced)
  useEffect(() => {
    if (debouncedStreet.length >= 3 && existingAddresses.length > 0) {
      const addressSuggestions = suggestSimilarAddresses(debouncedStreet, existingAddresses);
      setSuggestions(addressSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [debouncedStreet, existingAddresses]);

  const handleSuggestionSelect = useCallback((addr: Address) => {
    setStreet(addr.street);
    setLabel(addr.label);
    setCoordinates({ latitude: addr.latitude, longitude: addr.longitude });
    setSuggestions([]);
  }, []);

  const handleSave = async () => {
    setTouched(true);
    setError(null);
    setSuccess(null);
    
    if (!label.trim() || !street.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    // On web, use default coordinates for Autlán center if no coordinates selected
    const finalCoordinates = coordinates || (Platform.OS === 'web' ? AUTLAN_CENTER : null);
    
    if (!finalCoordinates) {
      setError('Por favor selecciona la ubicación en el mapa');
      return;
    }

    if (!isInCoverageArea(finalCoordinates.latitude, finalCoordinates.longitude)) {
      setError('La ubicación está fuera de nuestra zona de cobertura');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        label: label.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        latitude: finalCoordinates.latitude,
        longitude: finalCoordinates.longitude,
      };

      const response = existingAddress?.id
        ? await apiRequest('PUT', `/api/users/${user?.id}/addresses/${existingAddress.id}`, payload)
        : await apiRequest('POST', `/api/users/${user?.id}/addresses`, payload);

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        const savedAddress = (responseData as any)?.address || {
          ...(existingAddress || {}),
          ...payload,
          id: (responseData as any)?.id || existingAddress?.id,
        };
        const savedId = (savedAddress as any)?.id;

        setSuccess(existingAddress?.id ? '✅ Dirección actualizada' : '✅ Dirección guardada correctamente');
        setTimeout(() => {
          if (fromCheckout && savedId) {
            navigation.navigate('Checkout' as never, {
              addressRefreshToken: Date.now(),
              selectedAddressId: savedId,
            } as never);
          } else {
            navigation.goBack();
          }
        }, 500);
      } else {
        setError('❌ No se pudo guardar la dirección. Intenta de nuevo.');
      }
    } catch (error) {
      setError('🌐 Error de conexión. Verifica tu internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: insets.bottom + 120 }}
    >
      <View style={styles.form}>
        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={16} color="#28a745" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}
        
        <Text style={styles.label}>Calle y número *</Text>
        <TextInput
          style={styles.input}
          value={street}
          onChangeText={(text) => {
            setStreet(text);
            setError(null);
          }}
          placeholder="Ej: Calle Allende #123"
          accessibilityLabel="Calle y número"
          accessibilityHint="Ingresa la calle y número de tu dirección"
          onBlur={() => setTouched(true)}
        />
        
        {/* Address suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            <Text style={styles.suggestionsTitle}>📍 Direcciones similares:</Text>
            {suggestions.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(addr)}
              >
                <Text style={styles.suggestionLabel}>{addr.label}</Text>
                <Text style={styles.suggestionStreet}>{addr.street}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Duplicate warning */}
        {duplicateWarning && (
          <View style={styles.warningBox}>
            <Feather name="alert-triangle" size={16} color="#856404" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.warningText}>
                ⚠️ Esta dirección es muy similar a "{duplicateWarning.label}"
              </Text>
              <Text style={styles.warningSubtext}>
                {duplicateWarning.street}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>Etiqueta *</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="Casa, Trabajo, etc."
          onBlur={() => setTouched(true)}
        />
        {touched && !label.trim() && (
          <Text style={styles.fieldHint}>Necesitamos una etiqueta para identificar la dirección</Text>
        )}

        {Platform.OS !== 'web' ? (
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => navigation.navigate('LocationPicker', {
              onLocationSelected: (coords, addr) => {
                setCoordinates(coords);
                if (!street && addr) {
                  setStreet(addr);
                }
              },
            })}
          >
            <Text style={styles.mapButtonText}>
              {coordinates ? '✓ Ubicación seleccionada' : '📍 Seleccionar en mapa *'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>
              🌍 En la versión web, se usará la ubicación del centro de Autlán por defecto.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Ciudad</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>Estado</Text>
        <TextInput
          style={styles.input}
          value={state}
          onChangeText={setState}
        />

        <Text style={styles.label}>Código Postal</Text>
        <TextInput
          style={styles.input}
          value={zipCode}
          onChangeText={setZipCode}
          placeholder="48900"
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, (loading || success) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || !!success}
          accessibilityLabel="Guardar dirección"
          accessibilityHint="Guarda la dirección con la información proporcionada"
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.buttonText, { marginLeft: 8 }]}>Guardando...</Text>
            </View>
          ) : success ? (
            <View style={styles.buttonContent}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={[styles.buttonText, { marginLeft: 8 }]}>Guardado</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Guardar Dirección</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  webNotice: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  webNoticeText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  suggestionStreet: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  fieldHint: {
    fontSize: 12,
    color: '#d9534f',
    marginTop: 4,
    marginBottom: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
  warningSubtext: {
    color: '#856404',
    fontSize: 12,
    marginTop: 2,
  },
});
