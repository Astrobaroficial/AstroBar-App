import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await apiRequest('GET', '/api/promotions/transactions/my');
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'redeemed': return '#4CAF50';
      case 'pending': return '#FFD700';
      case 'cancelled': return '#F44336';
      case 'expired': return '#999999';
      default: return theme.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'redeemed': return 'Canjeado';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'redeemed': return 'check-circle';
      case 'pending': return 'clock';
      case 'cancelled': return 'x-circle';
      case 'expired': return 'alert-circle';
      default: return 'circle';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#1A1A2E', theme.gradientEnd || '#16213E']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText type="h3" style={{ color: '#FFFFFF' }}>
          Historial
        </ThemedText>
        <Pressable onPress={handleRefresh}>
          <Feather name="refresh-cw" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.emptyTitle}>
            Sin historial
          </ThemedText>
          <ThemedText type="body" style={styles.emptyText}>
            Aún no has canjeado ninguna promoción
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
          }
        >
          {transactions.map((transaction) => {
            const promotion = transaction.promotion;
            const business = transaction.business;
            const statusColor = getStatusColor(transaction.status);
            const statusText = getStatusText(transaction.status);
            const statusIcon = getStatusIcon(transaction.status);
            const date = new Date(transaction.createdAt);

            return (
              <Pressable
                key={transaction.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (transaction.status === 'pending') {
                    navigation.navigate('PromotionQR', { transactionId: transaction.id });
                  }
                }}
                style={[styles.card, { backgroundColor: theme.card }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Feather name={statusIcon as any} size={14} color={statusColor} />
                    <ThemedText type="caption" style={[styles.statusText, { color: statusColor }]}>
                      {statusText}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </ThemedText>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <Feather name="zap" size={24} color="#FFD700" />
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText type="body" style={styles.promoTitle}>
                      {promotion?.title || 'Promoción'}
                    </ThemedText>
                    <View style={styles.businessRow}>
                      <Feather name="map-pin" size={12} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                        {business?.name || 'Bar'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.qrCodeBadge}>
                    <Feather name="hash" size={12} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                      {transaction.qrCode}
                    </ThemedText>
                  </View>
                  <View style={styles.amountBadge}>
                    <ThemedText type="body" style={{ fontWeight: '700', color: '#4CAF50' }}>
                      ${(transaction.amountPaid / 100).toFixed(2)}
                    </ThemedText>
                  </View>
                </View>

                {transaction.status === 'redeemed' && (
                  <View style={styles.pointsBadge}>
                    <Feather name="award" size={14} color="#FFD700" />
                    <ThemedText type="caption" style={{ color: '#FFD700', marginLeft: 4, fontWeight: '700' }}>
                      +10 puntos
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  promoTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
});
