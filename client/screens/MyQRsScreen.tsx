import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function MyQRsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await apiRequest('GET', '/api/promotions/transactions/my');
      const data = await response.json();
      
      if (data.success && data.transactions) {
        const pending = data.transactions.filter((t: any) => t.status === 'pending');
        setTransactions(pending);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('PromotionQR' as any, {
        transaction: item,
        promotion: item.promotion,
        business: item.business,
      })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.qrIcon}>
          <Feather name="grid" size={24} color={AstroBarColors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>
            {item.promotion?.title || 'Promoción'}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {item.business?.name || 'Bar'}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.qrCodeBadge}>
          <ThemedText type="small" style={{ color: AstroBarColors.primary, fontWeight: '600' }}>
            {item.qrCode}
          </ThemedText>
        </View>
        <ThemedText type="h4" style={{ color: AstroBarColors.success }}>
          ${item.amountPaid.toLocaleString('es-AR')}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText type="h2">Mis QRs</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {transactions.length} {transactions.length === 1 ? 'promoción' : 'promociones'} pendiente{transactions.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
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
              No tenés QRs pendientes
            </ThemedText>
            <ThemedText type="body" style={styles.emptyText}>
              Aceptá una promoción para verla aquí
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
  list: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  qrIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrCodeBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
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
