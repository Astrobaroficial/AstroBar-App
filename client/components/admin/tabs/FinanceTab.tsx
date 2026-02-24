import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  userId: string;
  userName: string;
}

interface Wallet {
  id: string;
  userId: string;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface FinanceTabProps {
  transactions: Transaction[];
  onTransactionPress: (transaction: Transaction) => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ transactions, onTransactionPress }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'wallets'>('transactions');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'wallets') {
      fetchWallets();
    }
  }, [activeTab]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/admin/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  const releaseBalance = async (walletId: string, userName: string) => {
    Alert.alert(
      "Liberar Saldo",
      `¿Liberar saldo pendiente para ${userName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar",
          onPress: async () => {
            try {
              await apiRequest("POST", `/api/admin/wallets/${walletId}/release`);
              fetchWallets(); // Refresh
            } catch (error) {
              console.error("Error releasing balance:", error);
            }
          }
        }
      ]
    );
  };
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payment': return '#10B981';
      case 'commission': return '#3B82F6';
      case 'withdrawal': return '#EF4444';
      case 'refund': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'payment': return 'Pago';
      case 'commission': return 'Comisión';
      case 'withdrawal': return 'Retiro';
      case 'refund': return 'Reembolso';
      default: return type;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transacciones
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallets' && styles.activeTab]}
          onPress={() => setActiveTab('wallets')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'wallets' && styles.activeTabText]}>
            Wallets
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {activeTab === 'transactions' ? (
          transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>No hay transacciones</ThemedText>
              <ThemedText style={styles.emptySubtitle}>Las transacciones aparecerán aquí cuando se realicen pagos</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.legendCard}>
                <ThemedText style={styles.legendTitle}>Cómo leer estas transacciones</ThemedText>
                <ThemedText style={styles.legendLine}>Pago: ingreso total del pedido (cliente → NEMY)</ThemedText>
                <ThemedText style={styles.legendLine}>Comisión: 15% NEMY; Retiros: saldo enviado al usuario</ThemedText>
                <ThemedText style={styles.legendLine}>Efectivo a liquidar: montos negativos pendientes por cobrar en cash</ThemedText>
              </View>
              {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.card}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onTransactionPress(transaction);
                }}
              >
                <View style={styles.transactionHeader}>
                  <ThemedText style={styles.transactionId}>#{transaction.id.slice(0, 8)}</ThemedText>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: getTransactionColor(transaction.type) }
                  ]}>
                    <ThemedText style={styles.typeText}>
                      {getTransactionLabel(transaction.type)}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.description}>{transaction.description}</ThemedText>
                <ThemedText style={styles.userName}>Usuario: {transaction.userName}</ThemedText>
                <View style={styles.transactionFooter}>
                  <ThemedText style={styles.amount}>${(transaction.amount / 100).toFixed(2)}</ThemedText>
                  <ThemedText style={styles.date}>{new Date(transaction.createdAt).toLocaleDateString('es-MX')}</ThemedText>
                </View>
              </TouchableOpacity>
              ))}
            </>
          )
        ) : (
          wallets.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>No hay wallets</ThemedText>
              <ThemedText style={styles.emptySubtitle}>Las wallets aparecerán cuando los usuarios ganen dinero</ThemedText>
            </View>
          ) : (
            wallets.map((wallet) => (
              <View key={wallet.id} style={styles.card}>
                <View style={styles.walletHeader}>
                  <ThemedText style={styles.walletUser}>
                    {wallet.user?.name || 'Usuario desconocido'}
                  </ThemedText>
                  <ThemedText style={styles.walletRole}>
                    {wallet.user?.role || 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.walletBalances}>
                  <View style={styles.balanceItem}>
                    <ThemedText style={styles.balanceLabel}>Disponible:</ThemedText>
                    <ThemedText style={styles.balanceAmount}>${(wallet.balance / 100).toFixed(2)}</ThemedText>
                  </View>
                  <View style={styles.balanceItem}>
                    <ThemedText style={styles.balanceLabel}>Pendiente:</ThemedText>
                    <ThemedText style={[styles.balanceAmount, { color: '#F59E0B' }]}>
                      ${(wallet.pendingBalance / 100).toFixed(2)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.walletStats}>
                  <ThemedText style={styles.statText}>Total ganado: ${(wallet.totalEarned / 100).toFixed(2)}</ThemedText>
                  <ThemedText style={styles.statText}>Total retirado: ${(wallet.totalWithdrawn / 100).toFixed(2)}</ThemedText>
                </View>
                {wallet.pendingBalance > 0 && (
                  <TouchableOpacity
                    style={styles.releaseButton}
                    onPress={() => releaseBalance(wallet.id, wallet.user?.name || 'Usuario')}
                  >
                    <ThemedText style={styles.releaseButtonText}>Liberar Saldo Pendiente</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 8,
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
  date: {
    fontSize: 12,
    color: "#666666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },
  legendCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  legendLine: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  walletUser: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  walletRole: {
    fontSize: 12,
    color: "#666666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  walletBalances: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
  walletStats: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  releaseButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  releaseButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
