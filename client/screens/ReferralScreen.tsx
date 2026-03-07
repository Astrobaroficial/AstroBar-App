import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

export default function ReferralScreen() {
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
      const response = await api.get('/phase2/referrals/my');
      if (response.data.success) {
        setReferrals(response.data.referrals || []);
        setStats(response.data.stats || {});
        
        if (response.data.stats?.code) {
          setReferralCode(response.data.stats.code);
          setReferralLink(response.data.stats.link);
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
      const response = await api.post('/phase2/referrals/generate');
      if (response.data.success) {
        setReferralCode(response.data.code);
        setReferralLink(response.data.link);
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareReferral = async () => {
    try {
      await Share.share({
        message: `¡Unite a AstroDrinks con mi código ${referralCode}! Descargá la app y usá mi link: ${referralLink}`,
        url: referralLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎁 Referí Amigos</Text>
        <Text style={styles.subtitle}>Ganá recompensas por cada amigo que se registre</Text>
      </View>

      {!referralCode ? (
        <TouchableOpacity style={styles.generateButton} onPress={generateCode}>
          <Text style={styles.generateButtonText}>Generar Mi Código</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Tu Código de Referido</Text>
            <Text style={styles.code}>{referralCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={shareReferral}>
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_referrals || 0}</Text>
              <Text style={styles.statLabel}>Referidos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.successful_referrals || 0}</Text>
              <Text style={styles.statLabel}>Exitosos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${((stats.total_earned || 0) / 100).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ganado</Text>
            </View>
          </View>

          <View style={styles.referralsList}>
            <Text style={styles.listTitle}>Mis Referidos</Text>
            {referrals.length === 0 ? (
              <Text style={styles.emptyText}>Aún no tenés referidos</Text>
            ) : (
              referrals.map((ref: any) => (
                <View key={ref.id} style={styles.referralItem}>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{ref.referred_name || 'Usuario'}</Text>
                    <Text style={styles.referralDate}>
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
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#1A1F3A',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  codeLabel: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
  },
  code: {
    color: '#FF6B35',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#1A1F3A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#AAA',
    fontSize: 12,
  },
  referralsList: {
    margin: 20,
  },
  listTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    color: '#AAA',
    textAlign: 'center',
    padding: 20,
  },
  referralItem: {
    backgroundColor: '#1A1F3A',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  referralDate: {
    color: '#AAA',
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
