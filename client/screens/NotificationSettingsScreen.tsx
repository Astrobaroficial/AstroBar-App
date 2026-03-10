import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface NotificationPreferences {
  flashPromosEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    flashPromosEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await apiRequest('GET', '/api/user/notification-preferences');
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Save to server
    try {
      setIsSaving(true);
      await apiRequest('PUT', '/api/user/notification-preferences', newPreferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Revert on error
      setPreferences(preferences);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    } finally {
      setIsSaving(false);
    }
  };

  const SettingRow = ({ 
    title, 
    description, 
    icon, 
    value, 
    onToggle, 
    disabled = false 
  }: {
    title: string;
    description: string;
    icon: keyof typeof Feather.glyphMap;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, { backgroundColor: theme.card }, Shadows.sm]}>
      <View style={styles.settingIcon}>
        <Feather name={icon} size={20} color={disabled ? theme.textSecondary : AstroBarColors.primary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="body" style={[styles.settingTitle, disabled && { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
        <ThemedText type="caption" style={[styles.settingDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || isSaving}
        trackColor={{ false: '#E0E0E0', true: AstroBarColors.primary + '40' }}
        thumbColor={value ? AstroBarColors.primary : '#F4F3F4'}
      />
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2">Notificaciones</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText>Cargando configuración...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2">Notificaciones</ThemedText>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Información principal */}
        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.primary + '10' }]}>
          <Feather name="bell" size={20} color={AstroBarColors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText type="small" style={{ fontWeight: '600', color: AstroBarColors.primary }}>
              Promociones Flash Cercanas
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Recibe alertas cuando haya promociones flash en bares dentro de 500 metros de tu ubicación.
            </ThemedText>
          </View>
        </View>

        {/* Configuraciones */}
        <View style={styles.settingsContainer}>
          <SettingRow
            title="Promociones Flash"
            description="Recibir notificaciones de promociones flash cercanas"
            icon="zap"
            value={preferences.flashPromosEnabled}
            onToggle={(value) => updatePreference('flashPromosEnabled', value)}
          />

          <SettingRow
            title="Sonido"
            description="Reproducir sonido con las notificaciones"
            icon="volume-2"
            value={preferences.soundEnabled}
            onToggle={(value) => updatePreference('soundEnabled', value)}
            disabled={!preferences.flashPromosEnabled}
          />

          <SettingRow
            title="Vibración"
            description="Vibrar el dispositivo con las notificaciones"
            icon="smartphone"
            value={preferences.vibrationEnabled}
            onToggle={(value) => updatePreference('vibrationEnabled', value)}
            disabled={!preferences.flashPromosEnabled}
          />
        </View>

        {/* Información adicional */}
        <View style={[styles.helpCard, { backgroundColor: theme.card }, Shadows.sm]}>
          <View style={styles.helpHeader}>
            <Feather name="info" size={18} color={theme.textSecondary} />
            <ThemedText type="small" style={{ fontWeight: '600', marginLeft: 8 }}>
              ¿Cómo funciona?
            </ThemedText>
          </View>
          
          <View style={styles.helpItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              • Las notificaciones se envían solo cuando estás cerca de un bar (500m)
            </ThemedText>
          </View>
          
          <View style={styles.helpItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              • Solo recibirás una notificación por promoción flash
            </ThemedText>
          </View>
          
          <View style={styles.helpItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              • Puedes desactivar las notificaciones en cualquier momento
            </ThemedText>
          </View>
          
          <View style={styles.helpItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              • La ubicación se usa solo para determinar proximidad a bares
            </ThemedText>
          </View>
        </View>

        {isSaving && (
          <View style={styles.savingIndicator}>
            <ThemedText type="caption" style={{ color: AstroBarColors.primary }}>
              Guardando configuración...
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  settingsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AstroBarColors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    lineHeight: 18,
  },
  helpCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  helpItem: {
    marginBottom: Spacing.sm,
  },
  savingIndicator: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});