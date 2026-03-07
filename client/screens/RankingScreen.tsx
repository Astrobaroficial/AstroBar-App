import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../lib/api';

export default function RankingScreen() {
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const response = await api.get('/phase2/bar-rankings');
      if (response.data.success) {
        setRankings(response.data.rankings || []);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: any = {
      bronze: ['#CD7F32', '#8B4513'],
      silver: ['#C0C0C0', '#808080'],
      gold: ['#FFD700', '#FFA500'],
      platinum: ['#E5E4E2', '#B0B0B0'],
      diamond: ['#B9F2FF', '#4FC3F7'],
    };
    return colors[level?.toLowerCase()] || ['#666', '#333'];
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}°`;
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
        <Text style={styles.title}>🏆 Ranking de Bares</Text>
        <Text style={styles.subtitle}>Los mejores bares del mes</Text>
      </View>

      {rankings.length === 0 ? (
        <Text style={styles.emptyText}>No hay rankings disponibles</Text>
      ) : (
        <View style={styles.rankingList}>
          {rankings.map((bar: any, index: number) => (
            <LinearGradient
              key={bar.business_id}
              colors={getLevelColor(bar.current_level)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.rankingCard,
                index < 3 && styles.topThree,
              ]}
            >
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{getMedalEmoji(bar.rank_position)}</Text>
              </View>

              <View style={styles.barInfo}>
                <Text style={styles.barName}>{bar.business_name}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{bar.current_level?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>{Math.round(bar.score)}</Text>
              </View>
            </LinearGradient>
          ))}
        </View>
      )}

      <View style={styles.levelsInfo}>
        <Text style={styles.levelsTitle}>Niveles Disponibles</Text>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#CD7F32' }]} />
          <Text style={styles.levelName}>Bronze</Text>
          <Text style={styles.levelDesc}>Nivel inicial</Text>
        </View>

        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#C0C0C0' }]} />
          <Text style={styles.levelName}>Silver</Text>
          <Text style={styles.levelDesc}>$500k+ mensuales</Text>
        </View>

        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFD700' }]} />
          <Text style={styles.levelName}>Gold</Text>
          <Text style={styles.levelDesc}>$1M+ mensuales</Text>
        </View>

        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#E5E4E2' }]} />
          <Text style={styles.levelName}>Platinum</Text>
          <Text style={styles.levelDesc}>$2M+ mensuales</Text>
        </View>

        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#B9F2FF' }]} />
          <Text style={styles.levelName}>Diamond</Text>
          <Text style={styles.levelDesc}>$5M+ mensuales</Text>
        </View>
      </View>
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
  },
  emptyText: {
    color: '#AAA',
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
  },
  rankingList: {
    padding: 20,
    gap: 12,
  },
  rankingCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topThree: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  positionBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  barInfo: {
    flex: 1,
  },
  barName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  levelsInfo: {
    margin: 20,
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
  },
  levelsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  levelDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  levelName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    width: 80,
  },
  levelDesc: {
    color: '#AAA',
    fontSize: 14,
    flex: 1,
  },
});
