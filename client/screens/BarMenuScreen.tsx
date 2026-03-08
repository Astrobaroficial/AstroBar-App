import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useOrderCart } from "@/contexts/OrderCartContext";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
}

interface MenuData {
  business: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  menu: Record<string, Product[]>;
  totalProducts: number;
}

export default function BarMenuScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { businessId } = route.params as { businessId: string };

  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { addItem, getItemCount, currentBusinessId } = useOrderCart();

  useEffect(() => {
    loadMenu();
  }, [businessId]);

  const loadMenu = async () => {
    try {
      const response = await apiRequest("GET", `/api/business/${businessId}/menu`);
      const data = await response.json();
      
      if (data.success) {
        setMenuData(data);
      }
    } catch (error) {
      console.error("Error loading menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = menuData ? ["all", ...Object.keys(menuData.menu)] : [];

  const filteredProducts = () => {
    if (!menuData) return [];
    if (selectedCategory === "all") {
      return Object.values(menuData.menu).flat();
    }
    return menuData.menu[selectedCategory] || [];
  };

  const handleAddToCart = (product: Product) => {
    if (!product.isAvailable) {
      Alert.alert("No disponible", "Este producto no está disponible en este momento");
      return;
    }

    // Verificar si hay productos de otro bar
    if (currentBusinessId && currentBusinessId !== businessId) {
      Alert.alert(
        "Carrito de otro bar",
        "Ya tienes productos de otro bar. ¿Deseas vaciar el carrito y agregar este producto?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Vaciar y agregar",
            style: "destructive",
            onPress: () => {
              // TODO: clearCart() y luego addItem
              addItemToCart(product);
            },
          },
        ]
      );
      return;
    }

    addItemToCart(product);
  };

  const addItemToCart = (product: Product) => {
    try {
      addItem({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        businessId: businessId,
        businessName: menuData?.business.name || '',
        image: product.image,
      });
      Alert.alert("✓ Agregado", `${product.name} agregado al carrito`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={AstroBarColors.primary} />
          <ThemedText style={{ marginTop: Spacing.md }}>Cargando menú...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  if (!menuData) {
    return (
      <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ThemedText>No se pudo cargar el menú</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText type="h2">{menuData.business.name}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {menuData.totalProducts} productos
          </ThemedText>
        </View>
        {getItemCount() > 0 && (
          <Pressable
            onPress={() => navigation.navigate('OrderCart' as never)}
            style={[styles.cartButton, { backgroundColor: AstroBarColors.primary }]}
          >
            <Feather name="shopping-cart" size={20} color="#FFFFFF" />
            <View style={styles.cartBadge}>
              <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                {getItemCount()}
              </ThemedText>
            </View>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category ? AstroBarColors.primary : theme.card,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: selectedCategory === category ? "#FFFFFF" : theme.text,
                fontWeight: selectedCategory === category ? "600" : "400",
              }}
            >
              {category === "all" ? "Todos" : category}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredProducts().map((product) => (
          <View key={product.id} style={[styles.productCard, { backgroundColor: theme.card }, Shadows.sm]}>
            {product.image && (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            )}
            <View style={styles.productInfo}>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {product.name}
                </ThemedText>
                {product.description && (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }} numberOfLines={2}>
                    {product.description}
                  </ThemedText>
                )}
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  {product.category}
                </ThemedText>
              </View>
              <View style={styles.priceContainer}>
                <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
                  ${(product.price / 100).toFixed(2)}
                </ThemedText>
                {!product.isAvailable && (
                  <ThemedText type="small" style={{ color: AstroBarColors.error, marginTop: 4 }}>
                    No disponible
                  </ThemedText>
                )}
                <Pressable
                  onPress={() => handleAddToCart(product)}
                  disabled={!product.isAvailable}
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: product.isAvailable ? AstroBarColors.primary : theme.border,
                    },
                  ]}
                >
                  <Feather name="plus" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {filteredProducts().length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="coffee" size={48} color={theme.textSecondary} />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
              No hay productos en esta categoría
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: AstroBarColors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  categoriesScroll: {
    maxHeight: 50,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  productCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  productInfo: {
    flexDirection: "row",
    padding: Spacing.md,
  },
  priceContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: Spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
});
