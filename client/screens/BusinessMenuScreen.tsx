import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { AstroBarColors, Spacing } from "@/constants/theme";
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
}

export default function BusinessMenuScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Bebidas",
    price: "",
    description: "",
    image: ""
  });
  const [limits, setLimits] = useState<any>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo seleccionar imagen');
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const apiResponse = await apiRequest('POST', '/api/upload/product-image', {
          image: base64data,
        });

        const data = await apiResponse.json();
        if (data.success) {
          setNewProduct({...newProduct, image: data.imageUrl});
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo subir imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const categories = ["all", "Bebidas", "Comidas", "Postres", "Cafetería", "Combos", "Otros"];

  const getDefaultImage = (category: string) => {
    const images = {
      "Bebidas": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop",
      "Comidas": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=400&fit=crop", 
      "Postres": "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop",
      "Cafetería": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop",
      "Combos": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop",
      "Otros": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop"
    };
    return images[category as keyof typeof images] || images["Otros"];
  };

  const loadProducts = async () => {
    try {
      const response = await apiRequest("GET", "/api/business/products");
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
      
      // Cargar límites
      const limitsResponse = await apiRequest("GET", "/api/business/limits");
      const limitsData = await limitsResponse.json();
      if (limitsData.success) {
        setLimits(limitsData.limits);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleDelete = (productId: string) => {
    Alert.alert(
      "Eliminar Producto",
      "¿Estás seguro de eliminar este producto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiRequest("DELETE", `/api/business/products/${productId}`);
              loadProducts();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await apiRequest("PUT", `/api/business/products/${productId}`, { isAvailable: !currentStatus });
      loadProducts();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const filteredProducts = filter === "all" 
    ? products 
    : products.filter(p => p.category === filter);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        setEditingProduct(item);
        setNewProduct({
          name: item.name,
          category: item.category,
          price: (item.price / 100).toString(),
          description: item.description || ""
        });
        setShowEditModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: item.image || getDefaultImage(item.category) }}
            style={styles.productImage}
            contentFit="cover"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.category, { color: theme.textSecondary }]}>{item.category}</Text>
        </View>
        <Text style={[styles.price, { color: AstroBarColors.primary }]}>${item.price}</Text>
      </View>

      {item.description && (
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: item.isAvailable ? "#4CAF50" : "#F44336" }]}
          onPress={() => toggleAvailability(item.id, item.isAvailable)}
        >
          <Feather name={item.isAvailable ? "check-circle" : "x-circle"} size={16} color="#fff" />
          <Text style={styles.actionText}>{item.isAvailable ? "Disponible" : "No disponible"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.border }]}
          onPress={() => handleDelete(item.id)}
        >
          <Feather name="trash-2" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={AstroBarColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header con navegación */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessPromotions')}
        >
          <Feather name="megaphone" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Promociones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}}
        >
          <Feather name="restaurant" size={20} color="#FFD700" />
          <Text style={styles.navButtonText}>Menú</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('BusinessSettings')}
        >
          <Feather name="settings" size={20} color="#999" />
          <Text style={[styles.navButtonText, { color: '#999' }]}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      {/* Limits Header */}
      {limits && (
        <View style={[styles.limitsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.limitItem}>
            <Text style={[styles.limitLabel, { color: theme.textSecondary }]}>Productos</Text>
            <Text style={[styles.limitValue, { color: limits.products.percentage >= 90 ? "#F44336" : theme.text }]}>
              {limits.products.current}/{limits.products.max}
            </Text>
            <View style={[styles.limitBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.limitProgress, 
                  { 
                    width: `${Math.min(limits.products.percentage, 100)}%`,
                    backgroundColor: limits.products.percentage >= 90 ? "#F44336" : AstroBarColors.primary
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterBtn,
                { backgroundColor: filter === item ? AstroBarColors.primary : theme.card },
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === item ? "#fff" : theme.text },
                ]}
              >
                {item === "all" ? "Todos" : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AstroBarColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No hay productos en esta categoría
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab, 
          { 
            backgroundColor: limits?.products.canAdd ? AstroBarColors.primary : "#666",
            opacity: limits?.products.canAdd ? 1 : 0.6
          }
        ]}
        onPress={() => {
          if (limits?.products.canAdd) {
            setShowCreateModal(true);
          } else {
            Alert.alert(
              "Límite alcanzado", 
              "Has alcanzado el límite de 80 productos. Elimina algunos productos para agregar nuevos."
            );
          }
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nuevo Producto</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Nombre del producto"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({...newProduct, name: text})}
            />
            
            <View style={[styles.input, { backgroundColor: theme.background }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Categoría:</Text>
              <View style={styles.categoryButtons}>
                {categories.filter(c => c !== "all").map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: newProduct.category === category ? AstroBarColors.primary : theme.border,
                        borderColor: newProduct.category === category ? AstroBarColors.primary : theme.border
                      }
                    ]}
                    onPress={() => setNewProduct({...newProduct, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: newProduct.category === category ? "#fff" : theme.text }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Precio (ej: 1500)"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.price}
              onChangeText={(text) => setNewProduct({...newProduct, price: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.inputMultiline, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Descripción (ingredientes, detalles...)"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.description}
              onChangeText={(text) => setNewProduct({...newProduct, description: text})}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewProduct({ name: "", category: "Bebidas", price: "", description: "" });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={async () => {
                  if (!newProduct.name || !newProduct.price) {
                    Alert.alert("Error", "Nombre y precio son obligatorios");
                    return;
                  }
                  
                  try {
                    const productData = {
                      name: newProduct.name,
                      category: newProduct.category,
                      price: parseInt(newProduct.price) * 100, // Convertir a centavos
                      description: newProduct.description,
                      image: getDefaultImage(newProduct.category), // Imagen por defecto
                      isAvailable: true
                    };
                    
                    const response = await apiRequest("POST", "/api/business/products", productData);
                    const data = await response.json();
                    
                    if (data.success) {
                      setShowCreateModal(false);
                      setNewProduct({ name: "", category: "Bebidas", price: "", description: "" });
                      loadProducts();
                      Alert.alert("Éxito", "Producto creado correctamente");
                    }
                  } catch (error: any) {
                    Alert.alert("Error", "No se pudo crear el producto");
                  }
                }}
              >
                <Text style={styles.createButtonText}>Crear Producto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Producto</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Nombre del producto"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({...newProduct, name: text})}
            />
            
            <View style={[styles.input, { backgroundColor: theme.background }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Categoría:</Text>
              <View style={styles.categoryButtons}>
                {categories.filter(c => c !== "all").map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: newProduct.category === category ? AstroBarColors.primary : theme.border,
                        borderColor: newProduct.category === category ? AstroBarColors.primary : theme.border
                      }
                    ]}
                    onPress={() => setNewProduct({...newProduct, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: newProduct.category === category ? "#fff" : theme.text }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Precio (ej: 1500)"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.price}
              onChangeText={(text) => setNewProduct({...newProduct, price: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.inputMultiline, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Descripción (ingredientes, detalles...)"
              placeholderTextColor={theme.textSecondary}
              value={newProduct.description}
              onChangeText={(text) => setNewProduct({...newProduct, description: text})}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                  setNewProduct({ name: "", category: "Bebidas", price: "", description: "" });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={async () => {
                  if (!newProduct.name || !newProduct.price || !editingProduct) {
                    Alert.alert("Error", "Nombre y precio son obligatorios");
                    return;
                  }
                  
                  try {
                    const productData = {
                      name: newProduct.name,
                      category: newProduct.category,
                      price: parseInt(newProduct.price) * 100,
                      description: newProduct.description,
                      image: getDefaultImage(newProduct.category),
                      isAvailable: true
                    };
                    
                    const response = await apiRequest("PUT", `/api/business/products/${editingProduct.id}`, productData);
                    const data = await response.json();
                    
                    if (data.success) {
                      setShowEditModal(false);
                      setEditingProduct(null);
                      setNewProduct({ name: "", category: "Bebidas", price: "", description: "" });
                      loadProducts();
                      Alert.alert("Éxito", "Producto actualizado correctamente");
                    }
                  } catch (error: any) {
                    Alert.alert("Error", "No se pudo actualizar el producto");
                  }
                }}
              >
                <Text style={styles.createButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    paddingTop: 40,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2F4A',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  navButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  filterContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    padding: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  category: {
    fontSize: 12,
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputMultiline: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  createButton: {
    backgroundColor: AstroBarColors.primary,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  productImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  limitsContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  limitItem: {
    alignItems: "center",
  },
  limitLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  limitBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  limitProgress: {
    height: "100%",
    borderRadius: 3,
  },
  imagePickerButton: {
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
});
