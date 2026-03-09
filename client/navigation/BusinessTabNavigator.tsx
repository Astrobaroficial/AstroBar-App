import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import BusinessDashboardScreen from "@/screens/BusinessDashboardScreen";
import BusinessMenuScreen from "@/screens/BusinessMenuScreen";
import BusinessManageScreen from "@/screens/BusinessManageScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import BusinessPromotionsPanel from "@/screens/BusinessPromotionsPanel";
import ScheduledPromotionsScreen from "@/screens/ScheduledPromotionsScreen";

import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { AstroBarColors } from "@/constants/theme";
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();

const Tab = createBottomTabNavigator();

function ManagementStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BusinessPromotions" component={BusinessPromotionsPanel} />
      <Stack.Screen name="BusinessMenu" component={BusinessMenuScreen} />
      <Stack.Screen name="BusinessSettings" component={BusinessManageScreen} />
    </Stack.Navigator>
  );
}

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
        name="BusinessManagement"
        component={ManagementStack}
        options={{
          title: "Gestión",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather name="briefcase" size={size} color={color} />
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
