import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import BusinessDashboardScreen from "@/screens/BusinessDashboardScreen";
import BusinessMenuScreen from "@/screens/BusinessMenuScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import BusinessPromotionsPanel from "@/screens/BusinessPromotionsPanel";
import ScheduledPromotionsScreen from "@/screens/ScheduledPromotionsScreen";
import HeatmapScreen from "@/screens/HeatmapScreen";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
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
        name="BusinessMenu"
        component={BusinessMenuScreen}
        options={{
          title: "Menú",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: "Escanear",
          tabBarIcon: ({ color, size }) => (
            <Feather name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessPromotions"
        component={BusinessPromotionsPanel}
        options={{
          title: "Promos",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduledPromotions"
        component={ScheduledPromotionsScreen}
        options={{
          title: "Programadas",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessHeatmap"
        component={HeatmapScreen}
        options={{
          title: "Demanda",
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessProfile"
        component={ProfileStackNavigator}
        options={{
          title: "Perfil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
