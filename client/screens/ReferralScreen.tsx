import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../lib/query-client';
import { useTheme } from '@/hooks/useTheme';

export default function ReferralScreen() {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({ total_referrals: 0, successful_referrals: 0, total_earned: 0 });
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const response = await apiRequest('GET', '/api/phase2/referrals/my');
      const data = await response.json();
      if (data.success) {
        setReferrals(data.referrals || []);
        setStats(data.stats || {});
        
        if (data.stats?.code) {
          setReferralCode(data.stats.code);
          setReferralLink(data.stats.link);
        }
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/phase2/referrals/generate');
      const data = await response.json();
      if (data.success) {
        setReferralCode(data.code);
        setReferralLink(data.link);
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareReferral = async () => {
    try {
      const shareMessage = `🌙 ¡Únete a AstroBar!

🍻 Descubre promociones exclusivas en bares de Buenos Aires
⚡ Promociones flash de 5-15 minutos
🏆 Sistema de puntos y niveles

Usa mi código: ${referralCode}

📱 Descarga AstroBar:
${referralLink}`;

      await Share.share({
        message: shareMessage,
        title: 'AstroBar - Promociones Nocturnas',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>🎁 Referí Amigos</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Ganá recompensas por cada amigo que se registre</Text>
      </View>

      {!referralCode ? (
        <TouchableOpacity style={[styles.generateButton, { backgroundColor: theme.colors.primary }]} onPress={generateCode}>
          <Text style={styles.generateButtonText}>Generar Mi Código</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={[styles.codeCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.codeLabel, { color: theme.colors.text.secondary }]}>Tu Código de Referido</Text>
            <Text style={[styles.code, { color: theme.colors.primary }]}>{referralCode}</Text>
            <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.colors.primary }]} onPress={shareReferral}>
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.total_referrals || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Referidos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.successful_referrals || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Exitosos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>${((stats.total_earned || 0) / 100).toFixed(0)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Ganado</Text>
            </View>
          </View>

          <View style={styles.referralsList}>
            <Text style={[styles.listTitle, { color: theme.colors.text.primary }]}>Mis Referidos</Text>
            {referrals.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Aún no tenés referidos</Text>
            ) : (
              referrals.map((ref: any) => (
                <View key={ref.id} style={[styles.referralItem, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.referralInfo}>
                    <Text style={[styles.referralName, { color: theme.colors.text.primary }]}>{ref.referred_name || 'Usuario'}</Text>
                    <Text style={[styles.referralDate, { color: theme.colors.text.secondary }]}>
                      {new Date(ref.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: ref.status === 'completed' ? '#4CAF50' : '#FFA726' }]}>
                    <Text style={styles.statusText}>
                      {ref.status === 'completed' ? '✓ Completado' : '⏳ Pendiente'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  generateButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  referralsList: {
    margin: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
  referralItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
