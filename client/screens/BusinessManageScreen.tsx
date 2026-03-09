import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
}

interface Business {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  isOpen: boolean;
  products: Product[];
}

function ProductRow({
  product,
  onToggle,
}: {
  product: Product;
  onToggle: (productId: string, isAvailable: boolean) => void;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <View
        style={[styles.productRow, { backgroundColor: theme.card }, Shadows.sm]}
      >
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          contentFit="cover"
        />
        <View style={styles.productInfo}>
          <ThemedText
            type="body"
            style={{ fontWeight: "600" }}
            numberOfLines={1}
          >
            {product.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            ${(product.price / 100).toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.availabilityToggle}>
          <ThemedText
            type="caption"
            style={{
              color: product.isAvailable ? "#4CAF50" : "#F44336",
              marginRight: Spacing.sm,
            }}
          >
            {product.isAvailable ? "Disponible" : "Agotado"}
          </ThemedText>
          <Switch
            value={product.isAvailable}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(product.id, value);
            }}
            trackColor={{ false: "#F44336", true: "#4CAF50" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </Animated.View>
  );
}

export default function BusinessManageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "settings">("products");
  const [editMode, setEditMode] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessImage, setBusinessImage] = useState("");
  const [businessLat, setBusinessLat] = useState<number | null>(null);
  const [businessLng, setBusinessLng] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    data: business,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Business>({
    queryKey: ["/api/business", user?.id, "details"],
    enabled: !!user?.id,
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({
      productId,
      isAvailable,
    }: {
      productId: string;
      isAvailable: boolean;
    }) => {
      await apiRequest("PUT", `/api/admin/products/${productId}`, {
        isAvailable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const toggleBusinessMutation = useMutation({
    mutationFn: async ({
      businessId,
      isOpen,
    }: {
      businessId: string;
      isOpen: boolean;
    }) => {
      await apiRequest("PUT", `/api/admin/businesses/${businessId}`, {
        isOpen,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleToggleProduct = (productId: string, isAvailable: boolean) => {
    updateProductMutation.mutate({ productId, isAvailable });
  };

  const handleToggleBusiness = (isOpen: boolean) => {
    if (business) {
      toggleBusinessMutation.mutate({ businessId: business.id, isOpen });
    }
  };

  React.useEffect(() => {
    if (business) {
      setBusinessName(business.name || "");
      setBusinessDescription(business.description || "");
      setBusinessAddress(business.address || "");
      setBusinessPhone(business.phone || "");
      setBusinessImage(business.image || "");
      setBusinessLat(business.latitude || null);
      setBusinessLng(business.longitude || null);
    }
  }, [business]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a tus fotos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setBusinessImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handlePickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a tu ubicación");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = geocode[0]
        ? `${geocode[0].street || ""} ${geocode[0].streetNumber || ""}, ${geocode[0].city || ""}, ${geocode[0].region || ""}`.trim()
        : "Buenos Aires, Argentina";

      setBusinessAddress(fullAddress);
      setBusinessLat(location.coords.latitude);
      setBusinessLng(location.coords.longitude);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Éxito", "Ubicación obtenida");
    } catch (error) {
      Alert.alert("Error", "No se pudo obtener la ubicación");
    }
  };

  const handleSaveSettings = async () => {
    if (!businessName.trim()) {
      Alert.alert("Error", "El nombre del bar es obligatorio");
      return;
    }

    if (!businessLat || !businessLng) {
      Alert.alert("Error", "Debes configurar la ubicación del bar para que aparezca en el mapa");
      return;
    }

    try {
      await apiRequest("PUT", `/api/business/${business?.id}`, {
        name: businessName.trim(),
        description: businessDescription.trim(),
        address: businessAddress.trim(),
        phone: businessPhone.trim(),
        image: businessImage,
        latitude: businessLat,
        longitude: businessLng,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Éxito", "Información actualizada");
      setEditMode(false);
      refetch();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar los cambios");
    }
  };

  const products = business?.products || [];
  const availableProducts = products.filter((p) => p.isAvailable);
  const unavailableProducts = products.filter((p) => !p.isAvailable);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h2">Gestionar Negocio</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View
        style={[
          styles.businessCard,
          { backgroundColor: theme.card },
          Shadows.md,
        ]}
      >
        <View style={styles.businessRow}>
          <View>
            <ThemedText type="h3">{business?.name || "Mi Negocio"}</ThemedText>
            <ThemedText
              type="caption"
              style={{
                color: business?.isOpen ? "#4CAF50" : "#F44336",
                marginTop: 4,
              }}
            >
              {business?.isOpen ? "Abierto" : "Cerrado"}
            </ThemedText>
          </View>
          <Switch
            value={business?.isOpen ?? true}
            onValueChange={handleToggleBusiness}
            trackColor={{ false: "#F44336", true: "#4CAF50" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab("products")}
          style={[
            styles.tab,
            activeTab === "products" && { backgroundColor: AstroBarColors.primary },
          ]}
        >
          <Feather
            name="package"
            size={16}
            color={activeTab === "products" ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            type="body"
            style={{
              color: activeTab === "products" ? "#FFFFFF" : theme.text,
              marginLeft: Spacing.xs,
            }}
          >
            Productos ({products.length})
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("settings")}
          style={[
            styles.tab,
            activeTab === "settings" && { backgroundColor: AstroBarColors.primary },
          ]}
        >
          <Feather
            name="settings"
            size={16}
            color={activeTab === "settings" ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            type="body"
            style={{
              color: activeTab === "settings" ? "#FFFFFF" : theme.text,
              marginLeft: Spacing.xs,
            }}
          >
            Ajustes
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={AstroBarColors.primary}
          />
        }
      >
        {activeTab === "products" ? (
          <>
            {unavailableProducts.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Feather name="x-circle" size={16} color="#F44336" />
                  <ThemedText
                    type="h4"
                    style={{ marginLeft: Spacing.sm, color: "#F44336" }}
                  >
                    Agotados ({unavailableProducts.length})
                  </ThemedText>
                </View>
                {unavailableProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onToggle={handleToggleProduct}
                  />
                ))}
              </>
            ) : null}

            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={16} color="#4CAF50" />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                Disponibles ({availableProducts.length})
              </ThemedText>
            </View>
            {availableProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onToggle={handleToggleProduct}
              />
            ))}
          </>
        ) : (
          <View>
            {/* Foto del Bar */}
            <View style={[styles.settingsSection, { backgroundColor: theme.card }, Shadows.sm]}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="h4">Foto del Bar</ThemedText>
                {!editMode && (
                  <Pressable onPress={() => setEditMode(true)}>
                    <Feather name="edit-2" size={20} color={AstroBarColors.primary} />
                  </Pressable>
                )}
              </View>
              
              <Pressable onPress={editMode ? handlePickImage : undefined} style={styles.imageContainer}>
                {businessImage ? (
                  <Image source={{ uri: businessImage }} style={styles.businessImage} contentFit="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="camera" size={32} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8 }}>
                      {editMode ? "Toca para subir foto" : "Sin foto"}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Información Básica */}
            <View style={[styles.settingsSection, { backgroundColor: theme.card }, Shadows.sm]}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Información Básica</ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>Nombre del Bar *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={businessName}
                  onChangeText={setBusinessName}
                  editable={editMode}
                  placeholder="Nombre del bar"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>Descripción</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={businessDescription}
                  onChangeText={setBusinessDescription}
                  editable={editMode}
                  placeholder="Describe tu bar..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>Teléfono</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  editable={editMode}
                  placeholder="+54 11 1234-5678"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Ubicación */}
            <View style={[styles.settingsSection, { backgroundColor: theme.card }, Shadows.sm]}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Ubicación *</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>Dirección</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  editable={editMode}
                  placeholder="Dirección del bar"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {editMode && (
                <Pressable onPress={handlePickLocation} style={[styles.locationButton, { backgroundColor: AstroBarColors.primary }]}>
                  <Feather name="map-pin" size={20} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: 8 }}>Usar mi ubicación actual</ThemedText>
                </Pressable>
              )}

              {businessLat && businessLng ? (
                <View style={styles.coordsInfo}>
                  <Feather name="check-circle" size={16} color="#4CAF50" />
                  <ThemedText type="caption" style={{ color: "#4CAF50", marginLeft: 6 }}>
                    Ubicación configurada ({businessLat.toFixed(4)}, {businessLng.toFixed(4)})
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.coordsInfo}>
                  <Feather name="alert-circle" size={16} color="#FF9800" />
                  <ThemedText type="caption" style={{ color: "#FF9800", marginLeft: 6 }}>
                    Configura la ubicación para aparecer en el mapa
                  </ThemedText>
                </View>
              )}
            </View>

            {editMode && (
              <View style={styles.actionButtons}>
                <Pressable
                  onPress={() => {
                    setEditMode(false);
                    setBusinessName(business?.name || "");
                    setBusinessDescription(business?.description || "");
                    setBusinessAddress(business?.address || "");
                    setBusinessPhone(business?.phone || "");
                    setBusinessImage(business?.image || "");
                    setBusinessLat(business?.latitude || null);
                    setBusinessLng(business?.longitude || null);
                  }}
                  style={[styles.button, { backgroundColor: theme.card }]}
                >
                  <ThemedText type="body">Cancelar</ThemedText>
                </Pressable>
                <Pressable onPress={handleSaveSettings} style={[styles.button, { backgroundColor: AstroBarColors.primary }]}>
                  <ThemedText type="body" style={{ color: "#FFFFFF" }}>Guardar Cambios</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  businessCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  businessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  availabilityToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  divider: {
    height: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  businessImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  coordsInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    ...Shadows.sm,
  },
});
