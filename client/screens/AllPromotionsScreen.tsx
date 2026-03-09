import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Badge } from "@/components/Badge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function AllPromotionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'flash' | 'common'>('all');

  useEffect(() => {
    loadPromotions();
  }, [filter]);

  const loadPromotions = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/promotions' 
        : `/api/promotions?type=${filter}`;
      
      const response = await apiRequest('GET', url);
      const data = await response.json();
      
      if (data.success && data.promotions) {
        setPromotions(data.promotions);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPromotions();
  };

  const renderPromotion = ({ item }: { item: any }) => {
    const discount = Math.round(((item.originalPrice - item.promoPrice) / item.originalPrice) * 100);
    const isFlash = item.type === 'flash';

    return (
      <Pressable
        style={[styles.card, { backgroundColor: theme.card }]}
        onPress={() => navigation.navigate('ConfirmPromotion' as any, {
          promotion: item,
          business: item.business,
        })}
      >
        {isFlash && (
          <View style={styles.flashBadge}>
            <Feather name="zap" size={12} color="#FFFFFF" />
            <ThemedText type="caption" style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 4 }}>
              FLASH
            </ThemedText>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: '600', marginBottom: 4 }}>
              {item.title}
            </ThemedText>
            <View style={styles.businessRow}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                {item.business?.name || 'Bar'}
              </ThemedText>
            </View>
            <View style={styles.stockRow}>
              <Feather name="package" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                {item.stockRemaining} disponibles
              </ThemedText>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <View style={styles.discountBadge}>
              <ThemedText type="caption" style={{ color: AstroBarColors.error, fontWeight: '700' }}>
                -{discount}%
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ textDecorationLine: 'line-through', color: theme.textSecondary }}>
              ${item.originalPrice.toFixed(2)}
            </ThemedText>
            <ThemedText type="h3" style={{ color: AstroBarColors.success }}>
              ${item.promoPrice.toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText type="h2">Promociones</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {promotions.length} {promotions.length === 1 ? 'promoción' : 'promociones'} disponible{promotions.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      <View style={styles.filters}>
        {[
          { key: 'all', label: 'Todas', icon: 'grid' },
          { key: 'flash', label: 'Flash', icon: 'zap' },
          { key: 'common', label: 'Comunes', icon: 'clock' },
        ].map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === f.key ? AstroBarColors.primary : theme.card,
              }
            ]}
            onPress={() => setFilter(f.key as any)}
          >
            <Feather
              name={f.icon as any}
              size={16}
              color={filter === f.key ? '#FFFFFF' : theme.text}
            />
            <ThemedText
              type="small"
              style={{
                color: filter === f.key ? '#FFFFFF' : theme.text,
                fontWeight: filter === f.key ? '600' : '400',
                marginLeft: 4,
              }}
            >
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={promotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AstroBarColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              No hay promociones disponibles
            </ThemedText>
            <ThemedText type="body" style={styles.emptyText}>
              Volvé más tarde para ver nuevas ofertas
            </ThemedText>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  list: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  flashBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AstroBarColors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  discountBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
  },
});
