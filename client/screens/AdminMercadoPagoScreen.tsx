import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, AstroBarColors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

interface MPAccount {
  id: string;
  businessId: string;
  businessName: string;
  mpUserId: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

export default function AdminMercadoPagoScreen() {
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<MPAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/mp-accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading MP accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const renderAccount = ({ item }: { item: MPAccount }) => (
    <View style={[styles.card, { backgroundColor: theme.card }, Shadows.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.icon, { backgroundColor: '#009EE320' }]}>
          <Feather name="credit-card" size={20} color="#009EE3" />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>{item.businessName}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            MP User: {item.mpUserId}
          </ThemedText>
        </View>
        <Badge
          text={item.isActive ? 'Activa' : 'Inactiva'}
          variant={item.isActive ? 'success' : 'error'}
        />
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.infoItem}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            Conectada: {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
        {item.expiresAt && (
          <View style={styles.infoItem}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              Expira: {new Date(item.expiresAt).toLocaleDateString()}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }, Shadows.sm]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: AstroBarColors.primary }}>{accounts.length}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Total</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: AstroBarColors.success }}>
              {accounts.filter(a => a.isActive).length}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Activas</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: AstroBarColors.error }}>
              {accounts.filter(a => !a.isActive).length}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Inactivas</ThemedText>
          </View>
        </View>
      </View>

      <FlatList
        data={accounts}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AstroBarColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="credit-card" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No hay cuentas conectadas
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  list: {
    padding: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});
