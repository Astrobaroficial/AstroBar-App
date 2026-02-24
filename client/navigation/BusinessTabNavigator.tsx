import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import BusinessDashboardScreen from "@/screens/BusinessDashboardScreen";
import BusinessProductsScreen from "@/screens/BusinessProductsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useTheme } from "@/hooks/useTheme";
import { AstroBarColors } from "@/constants/theme";

const Tab = createBottomTabNavigator();

export default function BusinessTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        tabBarActiveTintColor: AstroBarColors.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="BusinessDashboard"
        component={BusinessDashboardScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessProducts"
        component={BusinessProductsScreen}
        options={{
          title: "Promociones",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessProfile"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
