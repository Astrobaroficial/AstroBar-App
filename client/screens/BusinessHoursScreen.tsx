import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const TIME_SLOTS = [
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30',
  '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00'
];

export default function BusinessHoursScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await apiRequest('GET', '/api/business/hours');
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules || getDefaultSchedules());
      }
    } catch (error) {
      setSchedules(getDefaultSchedules());
    }
  };

  const getDefaultSchedules = (): DaySchedule[] => {
    return DAYS.map(day => ({
      day: day.key,
      isOpen: day.key !== 'monday', // Cerrado los lunes por defecto
      openTime: '20:00',
      closeTime: '03:00'
    }));
  };

  const updateSchedule = (dayKey: string, field: keyof DaySchedule, value: any) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.day === dayKey 
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const copyToAllDays = (sourceDay: string) => {
    const source = schedules.find(s => s.day === sourceDay);
    if (!source) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSchedules(prev => prev.map(schedule => ({
      ...schedule,
      isOpen: source.isOpen,
      openTime: source.openTime,
      closeTime: source.closeTime
    })));
    showToast('Horarios copiados a todos los días', 'success');
  };

  const saveSchedules = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('PUT', '/api/business/hours', { schedules });
      const data = await response.json();
      
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Horarios guardados correctamente', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showToast(error.message || 'Error al guardar horarios', 'error');
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
        {schedules.map((schedule, index) => {
          const dayInfo = DAYS.find(d => d.key === schedule.day);
          if (!dayInfo) return null;

          return (
            <View key={schedule.day} style={[styles.dayCard, { backgroundColor: theme.card }, Shadows.sm]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    {dayInfo.label}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {schedule.isOpen 
                      ? `${schedule.openTime} - ${schedule.closeTime}`
                      : 'Cerrado'
                    }
                  </ThemedText>
                </View>
                
                <View style={styles.dayActions}>
                  <Pressable
                    style={[styles.copyButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => copyToAllDays(schedule.day)}
                  >
                    <Feather name="copy" size={16} color={theme.text} />
                  </Pressable>
                  
                  <Switch
                    value={schedule.isOpen}
                    onValueChange={(value) => {
                      Haptics.selectionAsync();
                      updateSchedule(schedule.day, 'isOpen', value);
                    }}
                    trackColor={{
                      false: theme.border,
                      true: AstroBarColors.primaryLight,
                    }}
                    thumbColor={schedule.isOpen ? AstroBarColors.primary : '#f4f3f4'}
                  />
                </View>
              </View>

              {schedule.isOpen && (
                <View style={styles.timeSelectors}>
                  <View style={styles.timeSelector}>
                    <ThemedText type="small" style={[styles.timeLabel, { color: theme.textSecondary }]}>
                      Apertura
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                      {TIME_SLOTS.map(time => (
                        <Pressable
                          key={`open-${time}`}
                          style={[
                            styles.timeChip,
                            {
                              backgroundColor: schedule.openTime === time 
                                ? AstroBarColors.primary 
                                : theme.backgroundSecondary
                            }
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            updateSchedule(schedule.day, 'openTime', time);
                          }}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color: schedule.openTime === time ? '#FFFFFF' : theme.text,
                              fontWeight: schedule.openTime === time ? '600' : '400'
                            }}
                          >
                            {time}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timeSelector}>
                    <ThemedText type="small" style={[styles.timeLabel, { color: theme.textSecondary }]}>
                      Cierre
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                      {TIME_SLOTS.map(time => (
                        <Pressable
                          key={`close-${time}`}
                          style={[
                            styles.timeChip,
                            {
                              backgroundColor: schedule.closeTime === time 
                                ? AstroBarColors.error 
                                : theme.backgroundSecondary
                            }
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            updateSchedule(schedule.day, 'closeTime', time);
                          }}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color: schedule.closeTime === time ? '#FFFFFF' : theme.text,
                              fontWeight: schedule.closeTime === time ? '600' : '400'
                            }}
                          >
                            {time}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.infoCard, { backgroundColor: AstroBarColors.infoLight }]}>
          <Feather name="info" size={16} color={AstroBarColors.info} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: AstroBarColors.info }}>
              • Los horarios se actualizan automáticamente en el mapa{'\n'}
              • Los usuarios verán el estado en tiempo real{'\n'}
              • Usa el botón copiar para aplicar el mismo horario a todos los días
            </ThemedText>
          </View>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            { 
              backgroundColor: AstroBarColors.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={saveSchedules}
          disabled={loading}
        >
          <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            {loading ? 'Guardando...' : 'Guardar Horarios'}
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
  dayCard: { borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  dayInfo: { flex: 1 },
  dayActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  copyButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timeSelectors: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.md },
  timeSelector: {},
  timeLabel: { marginBottom: Spacing.xs },
  timeScroll: { flexDirection: 'row' },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginRight: Spacing.xs },
  infoCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'flex-start', marginBottom: Spacing.lg },
  saveButton: { padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' }
});