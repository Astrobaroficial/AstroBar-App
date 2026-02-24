import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import DriverAvailableOrdersScreen from "@/screens/DriverAvailableOrdersScreen";
import DriverMyDeliveriesScreen from "@/screens/DriverMyDeliveriesScreen";
import WithdrawalScreen from "@/screens/WithdrawalScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useTheme } from "@/hooks/useTheme";
import { NemyColors } from "@/constants/theme";

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        tabBarActiveTintColor: NemyColors.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="DriverAvailable"
        component={DriverAvailableOrdersScreen}
        options={{
          title: "Disponibles",
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DriverDeliveries"
        component={DriverMyDeliveriesScreen}
        options={{
          title: "Entregas",
          tabBarIcon: ({ color, size }) => (
            <Feather name="truck" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DriverWithdrawal"
        component={WithdrawalScreen}
        options={{
          title: "Retiros",
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DriverProfile"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size}) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
