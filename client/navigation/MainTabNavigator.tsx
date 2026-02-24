import React from "react";
import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import OrdersStackNavigator from "@/navigation/OrdersStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import AdminScreenNew from "@/screens/AdminScreenNew";
import BusinessDashboardScreen from "@/screens/BusinessDashboardScreen";
import DeliveryDashboardScreen from "@/screens/DeliveryDashboardScreen";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { NemyColors, Spacing } from "@/constants/theme";

export type MainTabParamList = {
  HomeTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
  AdminTab: undefined;
  BusinessTab: undefined;
  DeliveryTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isBusiness = user?.role === "business_owner";
  const isDelivery = user?.role === "delivery_driver";

  const TabBarOrdersButton = ({ children, onPress, ...rest }: BottomTabBarButtonProps) => {
    // Strip ref to avoid Pressable ref type mismatch
    const { ref: _ref, ...pressableProps } = rest as BottomTabBarButtonProps & { ref?: unknown };
    return (
      <Pressable
        {...pressableProps}
        onPress={(event) => {
          onPress?.(event);
        }}
      >
        {children}
      </Pressable>
    );
  };

  const tabBarHeight = Platform.select({
    ios: 56 + insets.bottom,
    android: 64 + Math.max(insets.bottom, 8),
    default: 64,
  });

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: NemyColors.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: Spacing.xs,
        },
        tabBarBackground: undefined,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={({ navigation }) => ({
          title: "Pedidos",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-bag" size={size} color={color} />
          ),
          tabBarButton: ({ onPress, ...props }) => (
            <TabBarOrdersButton
              {...props}
              accessibilityRole="button"
              onPress={(event) => {
                onPress?.(event);
                // Siempre vuelve a la lista de pedidos para evitar estados atascados
                navigation.navigate("OrdersTab");
              }}
            />
          ),
        })}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      {isAdmin ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreenNew}
          options={{
            title: "Admin",
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
      ) : null}
      {isBusiness ? (
        <Tab.Screen
          name="BusinessTab"
          component={BusinessDashboardScreen}
          options={{
            title: "Mi Negocio",
            tabBarIcon: ({ color, size }) => (
              <Feather name="briefcase" size={size} color={color} />
            ),
          }}
        />
      ) : null}
      {isDelivery ? (
        <Tab.Screen
          name="DeliveryTab"
          component={DeliveryDashboardScreen}
          options={{
            title: "Entregas",
            tabBarIcon: ({ color, size }) => (
              <Feather name="truck" size={size} color={color} />
            ),
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}
