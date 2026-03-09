import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Image as RNImage } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type CommonPromotionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CommonPromotionsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<CommonPromotionsScreenNavigationProp>();
  
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const response = await apiRequest('GET', '/api/promotions?type=common');
      const data = await response.json();
      setPromotions(data.promotions || []);
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

  const renderPromotion = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('PromotionDetail', { promotionId: item.id });
      }}
      style={[styles.card, { backgroundColor: theme.card }]}
    >
      {item.image && (
        <RNImage 
          source={{ uri: item.image }} 
          style={styles.image}
          defaultSource={require('../../assets/astrobarbanner.jpg')}
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="h4" numberOfLines={2}>{item.title}</ThemedText>
        </View>

        <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={2}>
          {item.description}
        </ThemedText>

        <View style={styles.businessInfo}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            {item.businessName || item.business?.name || 'Bar'}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <View style={styles.prices}>
            <ThemedText type="small" style={styles.originalPrice}>
              ${item.originalPrice}
            </ThemedText>
            <ThemedText type="h3" style={{ color: '#4CAF50' }}>
              ${item.promoPrice}
            </ThemedText>
            <View style={styles.discountBadge}>
              <ThemedText type="caption" style={{ color: '#FFFFFF' }}>
                -{item.discountPercentage}%
              </ThemedText>
            </View>
          </View>

          <View style={styles.stock}>
            <Feather name="package" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {item.stock - item.stockConsumed} disponibles
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Promociones Comunes</ThemedText>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={24} color={theme.text} />
        </Pressable>
      </View>

      <FlatList
        data={promotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={AstroBarColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              No hay promociones comunes disponibles
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  list: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  footer: {
    gap: Spacing.sm,
  },
  prices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  stock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
});
