import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useBottomTabBarHeight,
  BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Location from "expo-location";
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { BusinessCard } from "@/components/BusinessCard";
import { CartButton } from "@/components/CartButton";
import { BusinessCardSkeleton } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Spacing, BorderRadius, AstroBarColors, Shadows } from "@/constants/theme";
import { Business } from "@/types";
import { apiRequest } from "@/lib/query-client";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { MainTabParamList } from "@/navigation/MainTabNavigator";

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "HomeTab">,
  NativeStackNavigationProp<RootStackParamList>
>;

const filters = [
  { id: "cercano", name: "Cercano", icon: "map-pin" },
  { id: "flash", name: "Flash", icon: "zap" },
  { id: "popular", name: "Popular", icon: "star" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { settings } = useApp();
  const showCarnivalBanner = false; // Carnaval terminado - mantener oculto

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Obtener ubicaciï¿½n del usuario
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (locError) {
        
      }

      const response = await apiRequest('GET', '/api/public/businesses');
      const data = await response.json();
      const rawBusinesses = data.businesses || [];
      
      
      
      // Adaptar datos del backend al formato del frontend
      const businessList: Business[] = rawBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description || '',
        type: b.type || 'restaurant',
        profileImage: b.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        bannerImage: b.cover_image || b.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        rating: (b.rating || 0) / 100, // Convertir de centavos a decimal
        reviewCount: b.total_ratings || 0,
        deliveryTime: b.delivery_time || '30-45 min',
        deliveryFee: (b.delivery_fee || 2500) / 100, // Convertir de centavos a pesos
        minimumOrder: (b.min_order || 5000) / 100, // Convertir de centavos a pesos
        isOpen: b.isOpen ?? b.is_open ?? false,
        openingHours: [],
        address: b.address || 'Autlï¿½n, Argentina',
        phone: b.phone || '',
        categories: b.categories ? b.categories.split(',') : [],
        acceptsCash: true,
        featured: b.is_featured || false,
      }));
      
      
      
      
      setBusinesses(businessList);
      setFeaturedBusinesses(businessList.filter((b) => b.featured));
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const filterBusinesses = useCallback(
    (businessList: Business[]) => {
      let filtered = [...businessList];

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.description.toLowerCase().includes(query) ||
            b.categories.some((cat) => cat.toLowerCase().includes(query)),
        );
      }

      if (activeCategory) {
        const categoryMap: Record<string, string[]> = {
          flash: ["flash", "promocion"],
          bar: ["bar"],
          nightclub: ["discoteca", "nightclub"],
          pub: ["pub"],
          lounge: ["lounge"],
          promo: ["promocion", "oferta"],
        };
        const matchCategories = categoryMap[activeCategory] || [activeCategory];
        filtered = filtered.filter((b) =>
          b.categories.some((cat) =>
            matchCategories.some((match) => cat.toLowerCase().includes(match)),
          ),
        );
      }

      if (activeFilter) {
        switch (activeFilter) {
          case "cercano":
            // Filtrar por distancia (implementar con geolocalizaciï¿½n)
            break;
          case "flash":
            // Filtrar bares con promociones flash activas
            filtered = filtered.filter((b) => b.featured);
            break;
          case "popular":
            filtered = filtered.filter((b) => b.rating >= 4.5);
            break;
        }
      }

      return filtered;
    },
    [searchQuery, activeCategory, activeFilter],
  );

  const filteredBusinesses = filterBusinesses(businesses);
  const bars = filteredBusinesses; // Todos son bares
  const firstName = user?.name.split(" ")[0] || "Usuario";

  const hasActiveFilters = searchQuery.trim() || activeCategory || activeFilter;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceText = (business: Business) => {
    if (!userLocation || !business.latitude || !business.longitude) return null;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      business.latitude,
      business.longitude
    );
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart || '#FFFFFF', theme.gradientEnd || '#F5F5F5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: tabBarHeight + Spacing["4xl"] + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={AstroBarColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Header */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={styles.bannerContainer}
        >
          <Image
            source={require("../../assets/astrobarbanner.jpg")}
            style={styles.bannerImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bannerOverlay}
          >
            <ThemedText type="h1" style={styles.bannerTitle}>
              AstroBar
            </ThemedText>
            <ThemedText type="body" style={styles.bannerSubtitle}>
              Promociones Nocturnas ï¿½ Buenos Aires
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {/* Question Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.questionContainer}
        >
          <ThemedText type="h1" style={styles.questionText}>
            ¿Qué bar visitarás esta noche?
          </ThemedText>
        </Animated.View>

        {/* Quick Access Icons */}
        <Animated.View
          entering={FadeInRight.delay(150).springify()}
          style={styles.quickAccessContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessScroll}
          >
            {[
              { id: "flash", icon: "zap", label: "Flash", color: "#FFD700" },
              { id: "bar", icon: "coffee", label: "Bares", color: "#E91E63" },
              { id: "nightclub", icon: "music", label: "Discotecas", color: "#9C27B0" },
              { id: "pub", icon: "coffee", label: "Pubs", color: "#FF5722" },
              { id: "lounge", icon: "moon", label: "Lounges", color: "#3F51B5" },
              { id: "promo", icon: "gift", label: "Promos", color: "#00BCD4" },
            ].map((item) => {
              const isActive = activeCategory === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveCategory(isActive ? null : item.id);
                  }}
                  style={({ pressed }) => [
                    styles.quickAccessItem,
                    {
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.quickAccessIcon,
                      {
                        backgroundColor: isActive
                          ? item.color
                          : item.color + "15",
                        borderWidth: isActive ? 2 : 0,
                        borderColor: item.color,
                      },
                    ]}
                  >
                    <Feather
                      name={item.icon as any}
                      size={22}
                      color={isActive ? "#FFFFFF" : item.color}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.quickAccessLabel,
                      isActive && { color: item.color, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar bar o promociï¿½n..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {hasActiveFilters ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSearchQuery("");
                setActiveCategory(null);
                setActiveFilter(null);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: "#F44336",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="x" size={14} color="#F44336" />
              <ThemedText
                type="small"
                style={[styles.filterText, { color: "#F44336" }]}
              >
                Limpiar
              </ThemedText>
            </Pressable>
          ) : null}
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveFilter(activeFilter === filter.id ? null : filter.id);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                activeFilter === filter.id
                  ? { backgroundColor: AstroBarColors.primary }
                  : { backgroundColor: theme.backgroundSecondary },
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Feather
                name={filter.icon as any}
                size={14}
                color={
                  activeFilter === filter.id ? "#FFFFFF" : AstroBarColors.primary
                }
              />
              <ThemedText
                type="small"
                style={[
                  styles.filterText,
                  activeFilter === filter.id && { color: "#FFFFFF" },
                ]}
              >
                {filter.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Carnival Banner (disabled) */}
        {showCarnivalBanner && settings.carnivalEnabled ? (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("Carnival");
              }}
              style={({ pressed }) => [
                styles.carnivalBanner,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[AstroBarColors.carnival.pink, "#7B1FA2", "#6A1B9A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.carnivalGradient}
              >
                <View style={styles.carnivalSparkles}>
                  <View style={[styles.sparkle, { top: 10, left: 20 }]} />
                  <View style={[styles.sparkle, { top: 30, right: 40 }]} />
                  <View style={[styles.sparkle, { bottom: 15, left: 60 }]} />
                  <View style={[styles.sparkle, { bottom: 25, right: 20 }]} />
                </View>
                <View style={styles.carnivalContent}>
                  <View style={styles.carnivalTextContainer}>
                    <View style={styles.carnivalBadge}>
                      <Feather
                        name="star"
                        size={10}
                        color="#FFD700"
                      />
                      <ThemedText
                        type="caption"
                        style={styles.carnivalBadgeText}
                      >
                        EVENTO ESPECIAL
                      </ThemedText>
                    </View>
                    <ThemedText type="h3" style={styles.carnivalTitle}>
                      Carnaval Buenos Aires 2026
                    </ThemedText>
                    <View style={styles.carnivalCTA}>
                      <ThemedText type="small" style={styles.carnivalSubtitle}>
                        Ver programa de eventos
                      </ThemedText>
                      <Feather name="chevron-right" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.carnivalIconContainer}>
                    <LinearGradient
                      colors={[
                        "rgba(255,255,255,0.3)",
                        "rgba(255,255,255,0.1)",
                      ]}
                      style={styles.carnivalIconBg}
                    >
                      <Feather name="calendar" size={28} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : null}

        {isLoading ? (
          <>
            <View style={styles.section}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Bares populares
              </ThemedText>
              {[1, 2].map((i) => (
                <BusinessCardSkeleton key={i} />
              ))}
            </View>
          </>
        ) : hasActiveFilters && filteredBusinesses.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View
              style={[
                styles.emptyStateIcon,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="search" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText type="h3" style={styles.emptyStateTitle}>
              Sin resultados
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.emptyStateText, { color: theme.textSecondary }]}
            >
              No encontramos negocios con esos filtros.
              {"\n"}Intenta con otra busqueda o categoria.
            </ThemedText>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSearchQuery("");
                setActiveCategory(null);
                setActiveFilter(null);
              }}
              style={[
                styles.emptyStateClearButton,
                { backgroundColor: AstroBarColors.primary },
              ]}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
              <ThemedText
                type="body"
                style={{
                  color: "#FFFFFF",
                  fontWeight: "600",
                  marginLeft: Spacing.xs,
                }}
              >
                Limpiar filtros
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Popular Restaurants Section */}
            {!hasActiveFilters ? (
              <View style={styles.section}>
                <ThemedText type="h3" style={styles.sectionTitle}>
                  AstroBares populares
                </ThemedText>
                {featuredBusinesses.length > 0 ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("BusinessDetail", {
                        businessId: featuredBusinesses[0].id,
                      })
                    }
                    style={({ pressed }) => [
                      styles.featuredCard,
                      {
                        backgroundColor: theme.card,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: featuredBusinesses[0].bannerImage }}
                      style={styles.featuredImage}
                      contentFit="cover"
                    />
                    <View style={styles.popularBadge}>
                      <ThemedText
                        type="caption"
                        style={styles.popularBadgeText}
                      >
                        POPULAR
                      </ThemedText>
                    </View>
                    <View style={styles.featuredInfo}>
                      <ThemedText type="h4">
                        {featuredBusinesses[0].name}
                      </ThemedText>
                      <View style={styles.featuredMeta}>
                        <View style={styles.metaItem}>
                          <Feather
                            name="map-pin"
                            size={12}
                            color={theme.textSecondary}
                          />
                          <ThemedText
                            type="small"
                            style={{
                              color: theme.textSecondary,
                              marginLeft: 4,
                            }}
                          >
                            {featuredBusinesses[0].address || 'Buenos Aires'}
                          </ThemedText>
                        </View>
                        <View style={styles.metaItem}>
                          <Feather name="star" size={12} color="#FFB800" />
                          <ThemedText type="small" style={{ marginLeft: 4 }}>
                            {featuredBusinesses[0].rating}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Bar Grid */}
            <View style={styles.gridSection}>
              {bars.slice(0, 4).map((business, index) => (
                <Pressable
                  key={business.id}
                  onPress={() =>
                    navigation.navigate("BusinessDetail", {
                      businessId: business.id,
                    })
                  }
                  style={({ pressed }) => [
                    styles.gridCard,
                    {
                      backgroundColor: theme.card,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: business.bannerImage }}
                    style={styles.gridImage}
                    contentFit="cover"
                  />
                  <View style={styles.gridInfo}>
                    <ThemedText
                      type="small"
                      style={styles.gridName}
                      numberOfLines={1}
                    >
                      {business.name}
                    </ThemedText>
                    <View style={styles.gridMeta}>
                      <View style={styles.ratingSmall}>
                        <ThemedText type="caption">
                          {business.rating}
                        </ThemedText>
                        <Feather
                          name="star"
                          size={10}
                          color="#FFB800"
                          style={{ marginLeft: 2 }}
                        />
                      </View>
                    </View>
                    {getDistanceText(business) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Feather name="map-pin" size={10} color={theme.textSecondary} />
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 2 }}>
                          {getDistanceText(business)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Mapa de Bares - Botï¿½n Principal */}
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={styles.section}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate("Map");
                }}
                style={({ pressed }) => [
                  styles.mapBanner,
                  {
                    backgroundColor: AstroBarColors.primary,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                  Shadows.md,
                ]}
              >
                <LinearGradient
                  colors={["#6A1B9A", "#8E24AA", "#9C27B0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.marketsGradient}
                >
                  <View style={styles.marketsContent}>
                    <View style={styles.marketsIconContainer}>
                      <Feather name="map" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.marketsTextContainer}>
                      <ThemedText type="h3" style={styles.marketsTitle}>
                        Ver Mapa de Bares
                      </ThemedText>
                      <View style={styles.marketsCTA}>
                        <ThemedText type="small" style={styles.marketsSubtitle}>
                          Encuentra bares cercanos con promociones
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.marketsArrow}>
                      <Feather name="chevron-right" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Promociones Flash - Botï¿½n Secundario */}
            <Animated.View
              entering={FadeInDown.delay(350).springify()}
              style={styles.section}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate("PromotionsList");
                }}
                style={({ pressed }) => [
                  styles.marketsBanner,
                  {
                    backgroundColor: "#FFD700",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                  Shadows.md,
                ]}
              >
                <LinearGradient
                  colors={["#FFD700", "#FFA000", "#FF6F00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.marketsGradient}
                >
                  <View style={styles.marketsContent}>
                    <View style={styles.marketsIconContainer}>
                      <Feather name="zap" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.marketsTextContainer}>
                      <ThemedText type="h3" style={styles.marketsTitle}>
                        Promociones Flash
                      </ThemedText>
                      <View style={styles.marketsCTA}>
                        <ThemedText type="small" style={styles.marketsSubtitle}>
                          Ofertas por tiempo limitado
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.marketsArrow}>
                      <Feather name="chevron-right" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Promociones Comunes - BotÃ³n Terciario */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              style={styles.section}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate("CommonPromotions");
                }}
                style={({ pressed }) => [
                  styles.marketsBanner,
                  {
                    backgroundColor: "#4CAF50",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                  Shadows.md,
                ]}
              >
                <LinearGradient
                  colors={["#4CAF50", "#388E3C", "#2E7D32"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.marketsGradient}
                >
                  <View style={styles.marketsContent}>
                    <View style={styles.marketsIconContainer}>
                      <Feather name="gift" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.marketsTextContainer}>
                      <ThemedText type="h3" style={styles.marketsTitle}>
                        Promociones Comunes ðŸŽ
                      </ThemedText>
                      <View style={styles.marketsCTA}>
                        <ThemedText type="small" style={styles.marketsSubtitle}>
                          Ofertas programadas y especiales
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.marketsArrow}>
                      <Feather name="chevron-right" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>



            {/* Filtered Results Section */}
            {hasActiveFilters && filteredBusinesses.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="h3" style={styles.sectionTitle}>
                    Resultados ({filteredBusinesses.length})
                  </ThemedText>
                  <Feather name="filter" size={20} color={AstroBarColors.primary} />
                </View>
                {filteredBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    onPress={() =>
                      navigation.navigate("BusinessDetail", {
                        businessId: business.id,
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <CartButton
        onPress={() => navigation.navigate("Cart")}
        bottomOffset={tabBarHeight}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  bannerContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    height: 200,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  questionContainer: {
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: 26,
  },
  quickAccessContainer: {
    marginBottom: Spacing.md,
  },
  quickAccessScroll: {
    paddingHorizontal: Spacing.xs,
    gap: Spacing.md,
  },
  quickAccessItem: {
    alignItems: "center",
    width: 70,
  },
  quickAccessIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  quickAccessLabel: {
    textAlign: "center",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  filtersContainer: {
    marginBottom: Spacing.lg,
  },
  filtersContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterText: {
    fontWeight: "600",
  },
  carnivalBanner: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  carnivalGradient: {
    padding: Spacing.lg,
  },
  carnivalContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carnivalTextContainer: {
    flex: 1,
  },
  carnivalTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  carnivalSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  carnivalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  carnivalIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  carnivalSparkles: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  sparkle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  carnivalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  carnivalBadgeText: {
    color: "#FFD700",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 10,
  },
  carnivalCTA: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  featuredCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: 180,
  },
  popularBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: AstroBarColors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
  },
  featuredInfo: {
    padding: Spacing.md,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  gridCard: {
    width: "48%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: 100,
  },
  gridInfo: {
    padding: Spacing.sm,
  },
  gridName: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  gridMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flashBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapBanner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  popularSmallBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingSmall: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketsBanner: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  marketsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketsIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  marketsTextContainer: {
    flex: 1,
  },
  marketsTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  marketsSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  marketsGradient: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  marketsCTA: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketsArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyStateClearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});





