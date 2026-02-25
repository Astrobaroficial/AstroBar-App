import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import {
  DashboardTab,
  FinanceTab,
  BusinessesTab,
  UsersTab,
  SettingsTab,
} from "@/components/admin/tabs";
import type {
  DashboardMetrics,
  ActiveOrder,
  OnlineDriver,
  AdminUser,
  Business,
} from "@/components/admin/types/admin.types";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  tab: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    subtitle: "Métricas del sistema",
    icon: "bar-chart-2",
    tab: "dashboard",
    color: AstroBarColors.primary,
  },
  {
    title: "Usuarios",
    subtitle: "Administrar cuentas",
    icon: "users",
    tab: "users",
    color: "#FF9800",
  },
  {
    title: "Bares",
    subtitle: "Gestión de bares",
    icon: "briefcase",
    tab: "businesses",
    color: "#4CAF50",
  },
  {
    title: "Finanzas",
    subtitle: "Ingresos y comisiones",
    icon: "trending-up",
    tab: "finance",
    color: "#00BCD4",
  },
  {
    title: "Configuración",
    subtitle: "Ajustes del sistema",
    icon: "sliders",
    tab: "settings",
    color: "#607D8B",
  },
];

export default function AdminMenuScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userRoleEdit, setUserRoleEdit] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const metricsRes = await apiRequest("GET", "/api/admin/dashboard/metrics");
      const metricsData = await metricsRes.json();
      setDashboardMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [usersRes, businessesRes] = await Promise.all([
        apiRequest("GET", "/api/admin/users"),
        apiRequest("GET", "/api/admin/businesses"),
      ]);

      const usersData = await usersRes.json();
      const businessesData = await businessesRes.json();

      console.log('📊 Businesses data:', businessesData);
      console.log('📊 Businesses array:', businessesData.businesses);

      setUsers(usersData.users || []);
      setBusinesses(businessesData.businesses || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      showToast("Error al cargar datos del panel", "error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    } else if (["users", "businesses"].includes(activeTab || "")) {
      fetchData();
    }
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "dashboard") {
      fetchDashboardData();
    } else {
      fetchData();
    }
  };

  const handleMenuPress = (tab: string) => {
    Haptics.selectionAsync();
    setUserModalVisible(false);
    setSelectedUser(null);
    setActiveTab(tab);
  };

  const handleBack = () => {
    setUserModalVisible(false);
    setSelectedUser(null);
    setActiveTab(null);
  };

  const openUserModal = (user: AdminUser) => {
    setSelectedUser(user);
    setUserRoleEdit(user.role);
    setUserModalVisible(true);
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;
    try {
      const response = await apiRequest("PUT", `/api/admin/users/${selectedUser.id}`, {
        role: userRoleEdit,
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone
      });
      
      if (response.ok) {
        showToast("Usuario actualizado correctamente", "success");
        setUserModalVisible(false);
        fetchData();
      } else {
        showToast("Error al actualizar usuario", "error");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast("Error de conexión", "error");
    }
  };

  const handleBusinessPress = (business: Business) => {
    setSelectedBusiness(business);
    setBusinessModalVisible(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            metrics={dashboardMetrics}
            activeOrders={activeOrders}
            onlineDrivers={onlineDrivers}
            stats={null}
            onOrderPress={() => {}}
            onDriverPress={() => {}}
          />
        );
      case "finance":
        return <FinanceTab transactions={[]} onTransactionPress={() => {}} />;
      case "businesses":
        return (
          <View style={{ flex: 1 }}>
            <BusinessesTab businesses={businesses} onBusinessPress={handleBusinessPress} />
            {businessModalVisible && selectedBusiness && (
              <Pressable style={styles.modalOverlay} onPress={() => setBusinessModalVisible(false)}>
                <Pressable
                  style={[styles.modalCard, { backgroundColor: theme.card }]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <ThemedText type="h3" style={{ color: theme.text }}>Detalles del Bar</ThemedText>
                    <Pressable onPress={() => setBusinessModalVisible(false)} hitSlop={12}>
                      <Feather name="x" size={24} color={theme.text} />
                    </Pressable>
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        <ThemedText style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
                          {selectedBusiness.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Nombre:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedBusiness.name}
                          onChangeText={(text) => setSelectedBusiness({...selectedBusiness, name: text})}
                          placeholder="Nombre del bar"
                        />
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Dirección:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedBusiness.address || ''}
                          onChangeText={(text) => setSelectedBusiness({...selectedBusiness, address: text})}
                          placeholder="Dirección"
                        />
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Teléfono:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedBusiness.phone || ''}
                          onChangeText={(text) => setSelectedBusiness({...selectedBusiness, phone: text})}
                          placeholder="Teléfono"
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                    
                    <View style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                      <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Estado:</ThemedText>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={() => setSelectedBusiness({...selectedBusiness, isActive: true})}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            backgroundColor: selectedBusiness.isActive ? '#10B981' : '#f0f0f0',
                            flex: 1,
                            alignItems: 'center'
                          }}
                        >
                          <ThemedText style={{ color: selectedBusiness.isActive ? 'white' : '#333' }}>Activo</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => setSelectedBusiness({...selectedBusiness, isActive: false})}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            backgroundColor: !selectedBusiness.isActive ? '#EF4444' : '#f0f0f0',
                            flex: 1,
                            alignItems: 'center'
                          }}
                        >
                          <ThemedText style={{ color: !selectedBusiness.isActive ? 'white' : '#333' }}>Inactivo</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <Pressable 
                    style={{ 
                      padding: 16, 
                      backgroundColor: AstroBarColors.primary, 
                      borderRadius: 10, 
                      alignItems: 'center',
                      marginTop: 10
                    }}
                    onPress={() => {
                      showToast('Bar actualizado', 'success');
                      setBusinessModalVisible(false);
                    }}
                  >
                    <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Guardar Cambios</ThemedText>
                  </Pressable>
                </Pressable>
              </Pressable>
            )}
          </View>
        );
      case "users":
        return (
          <View style={{ flex: 1 }}>
            <UsersTab users={users} onUserPress={openUserModal} />
            {userModalVisible && selectedUser && (
              <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999999
              }}>
                <View style={{
                  backgroundColor: theme.card,
                  borderRadius: 15,
                  padding: 25,
                  width: '90%',
                  maxWidth: 450,
                  maxHeight: '80%'
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <ThemedText type="h3">Editar Usuario</ThemedText>
                    <Pressable onPress={() => setUserModalVisible(false)}>
                      <ThemedText style={{ fontSize: 24, color: '#666' }}>✕</ThemedText>
                    </Pressable>
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: AstroBarColors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        <ThemedText style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Nombre:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedUser.name}
                          onChangeText={(text) => setSelectedUser({...selectedUser, name: text})}
                          placeholder="Nombre del usuario"
                        />
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Email:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedUser.email || ''}
                          onChangeText={(text) => setSelectedUser({...selectedUser, email: text})}
                          placeholder="Email"
                          keyboardType="email-address"
                        />
                      </View>
                      
                      <View style={{ width: '100%', marginBottom: 15 }}>
                        <ThemedText style={{ marginBottom: 5, fontWeight: '600' }}>Teléfono:</ThemedText>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16 }}
                          value={selectedUser.phone || ''}
                          onChangeText={(text) => setSelectedUser({...selectedUser, phone: text})}
                          placeholder="Teléfono"
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                    
                    <ThemedText style={{ fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>Cambiar Rol:</ThemedText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 }}>
                      {[
                        { key: 'customer', label: 'Cliente', color: '#6B7280' },
                        { key: 'business_owner', label: 'Bar', color: '#3B82F6' },
                        { key: 'admin', label: 'Admin', color: '#9333EA' }
                      ].map((role) => (
                        <Pressable
                          key={role.key}
                          onPress={() => setUserRoleEdit(role.key)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 18,
                            borderRadius: 25,
                            backgroundColor: userRoleEdit === role.key ? role.color : '#f5f5f5',
                            borderWidth: 1,
                            borderColor: userRoleEdit === role.key ? role.color : '#ddd',
                            minWidth: 85,
                            alignItems: 'center'
                          }}
                        >
                          <ThemedText style={{ 
                            color: userRoleEdit === role.key ? 'white' : '#333',
                            fontWeight: userRoleEdit === role.key ? 'bold' : 'normal',
                            fontSize: 14
                          }}>
                            {role.label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                    
                    <View style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                      <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Información actual:</ThemedText>
                      <ThemedText style={{ marginBottom: 5 }}>Rol actual: <ThemedText style={{ fontWeight: 'bold' }}>{selectedUser.role}</ThemedText></ThemedText>
                      <ThemedText>Registrado: <ThemedText style={{ fontWeight: 'bold' }}>{new Date(selectedUser.createdAt).toLocaleDateString('es-MX')}</ThemedText></ThemedText>
                    </View>
                  </ScrollView>
                  
                  <Pressable 
                    style={{ 
                      padding: 16, 
                      backgroundColor: AstroBarColors.primary, 
                      borderRadius: 10, 
                      alignItems: 'center',
                      marginTop: 10
                    }}
                    onPress={handleUpdateUserRole}
                  >
                    <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Guardar Cambios</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      case "settings":
        return <SettingsTab theme={theme} showToast={showToast} />;
      default:
        return null;
    }
  };

  if (activeTab) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <View style={styles.headerContent}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h2">
              {menuItems.find(item => item.tab === activeTab)?.title}
            </ThemedText>
          </View>
        </View>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AstroBarColors.primary}
            />
          }
        >
          {renderTabContent()}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText type="h1">Panel Admin</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Bienvenido, {user?.name}
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.tab}
              onPress={() => handleMenuPress(item.tab)}
              style={[
                styles.card,
                { backgroundColor: theme.card },
                Shadows.sm,
              ]}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Feather name={item.icon as any} size={28} color={item.color} />
              </View>
              <ThemedText type="body" style={styles.cardTitle}>
                {item.title}
              </ThemedText>
              <ThemedText
                type="caption"
                style={[styles.cardSubtitle, { color: theme.textSecondary }]}
              >
                {item.subtitle}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: Spacing["4xl"],
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  card: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    minHeight: 120,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    textAlign: "center",
    lineHeight: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "85%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
});
