import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
}

export default function CreateCommonPromotionScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();
  const editPromotion = route?.params?.editPromotion;
  const isEditing = !!editPromotion;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [stock, setStock] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [customImage, setCustomImage] = useState("");

  useEffect(() => {
    loadProducts();
    if (isEditing && editPromotion) {
      setDiscountedPrice((editPromotion.promoPrice / 100).toString());
      setStock(editPromotion.stock.toString());
      setStartDate(new Date(editPromotion.startTime).toISOString().slice(0, 16));
      setEndDate(new Date(editPromotion.endTime).toISOString().slice(0, 16));
      setCustomImage(editPromotion.image || "");
    } else {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setStartDate(formatDateTime(now));
      setEndDate(formatDateTime(tomorrow));
    }
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  };

  const loadProducts = async () => {
    try {
      const response = await apiRequest("GET", "/api/business/products");
      const data = await response.json();
      if (data.success) {
        setProducts(data.products.filter((p: Product) => p.isAvailable));
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedProduct || !discountedPrice || !stock || !startDate || !endDate) {
      Alert.alert("Error", "Selecciona un producto y completa todos los campos");
      return;
    }

    const discountPrice = Math.round(parseFloat(discountedPrice));
    if (discountPrice >= selectedProduct.price) {
      Alert.alert("Error", "El precio promocional debe ser menor al precio original");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      Alert.alert("Error", "La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    setLoading(true);
    try {
      const promotionData = {
        businessId: "",
        title: `${selectedProduct.name} - Promoción`,
        description: selectedProduct.description || `Promoción de ${selectedProduct.name}`,
        type: "common",
        originalPrice: Math.round(selectedProduct.price),
        promoPrice: Math.round(discountPrice),
        stock: parseInt(stock),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        image: customImage || selectedProduct.image
      };
      
      const url = isEditing ? `/api/promotions/${editPromotion.id}` : "/api/promotions";
      const method = isEditing ? "PUT" : "POST";
      const response = await apiRequest(method, url, promotionData);
      const data = await response.json();
      
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(isEditing ? "Promoción actualizada" : "Promoción creada", "success");
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert("Error", "No se pudo guardar la promoción");
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.productCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        setSelectedProduct(item);
        setShowProductSelector(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Image
        source={{ uri: item.image || "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop" }}
        style={styles.productImage}
        contentFit="cover"
      />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <ThemedText type="small" style={{ fontWeight: "600" }}>{item.name}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>{item.category}</ThemedText>
        <ThemedText type="small" style={{ color: "#FFD700", fontWeight: "700" }}>${(item.price / 100).toFixed(0)}</ThemedText>
      </View>
    </Pressable>
  );

  if (loadingProducts) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>Cargando productos...</ThemedText>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#000000', theme.gradientEnd || '#1A1A1A']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 }
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>
          {isEditing ? "Editar Promoción" : "Crear Promoción Programada"}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
          Configura fechas y horarios
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemedText type="small" style={{ marginBottom: Spacing.xs }}>Producto *</ThemedText>
          <Pressable
            style={[styles.productSelector, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => setShowProductSelector(true)}
          >
            {selectedProduct ? (
              <View style={styles.selectedProduct}>
                <Image
                  source={{ uri: selectedProduct.image || "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop" }}
                  style={styles.selectedProductImage}
                  contentFit="cover"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>{selectedProduct.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>{selectedProduct.category}</ThemedText>
                  <ThemedText type="small" style={{ color: "#FFD700", fontWeight: "700" }}>
                    Precio original: ${(selectedProduct.price / 100).toFixed(0)}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <ThemedText style={{ color: theme.textSecondary }}>Seleccionar producto del menú</ThemedText>
            )}
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Pressable>

          <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            Precio Promocional *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={discountedPrice}
            onChangeText={setDiscountedPrice}
            placeholder={selectedProduct ? `Menor a ${(selectedProduct.price / 100).toFixed(0)}` : "0"}
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
          />

          <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            Stock Disponible *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={stock}
            onChangeText={setStock}
            placeholder="Ej: 50"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
                Fecha Inicio *
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="small" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
                Fecha Fin *
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleCreate}
          disabled={loading || !selectedProduct}
          style={[styles.createButton, { backgroundColor: "#FFD700", opacity: (loading || !selectedProduct) ? 0.6 : 1 }]}
        >
          <Feather name="calendar" size={20} color="#000" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: "#000", fontWeight: "600" }}>
            {loading ? "Guardando..." : isEditing ? "Actualizar Promoción" : "Crear Promoción"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Seleccionar Producto</ThemedText>
              <Pressable onPress={() => setShowProductSelector(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              ListEmptyComponent={
                <View style={styles.emptyProducts}>
                  <Feather name="package" size={48} color={theme.textSecondary} />
                  <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    No hay productos disponibles
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                    Ve a la pestaña Menú para agregar productos
                  </ThemedText>
                </View>
              }
            />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  backButton: { marginBottom: Spacing.lg },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  productSelector: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedProduct: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
  },
  createButton: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  emptyProducts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});
