import React from "react";
import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import AllPromotionsScreen from "@/screens/AllPromotionsScreen";
import MyQRsScreen from "@/screens/MyQRsScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import ReferralScreen from "@/screens/ReferralScreen";
import HeatmapScreen from "@/screens/HeatmapScreen";
import RankingScreen from "@/screens/RankingScreen";
import { useTheme } from "@/hooks/useTheme";
import { AstroBarColors, Spacing } from "@/constants/theme";

export type MainTabParamList = {
  HomeTab: undefined;
  PromotionsTab: undefined;
  MyQRsTab: undefined;
  HistoryTab: undefined;
  HeatmapTab: undefined;
  RankingTab: undefined;
  ReferralTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
        tabBarActiveTintColor: AstroBarColors.primary,
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
        name="PromotionsTab"
        component={AllPromotionsScreen}
        options={{
          title: "Promociones",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyQRsTab"
        component={MyQRsScreen}
        options={{
          title: "Mis QRs",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: "Historial",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HeatmapTab"
        component={HeatmapScreen}
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RankingTab"
        component={RankingScreen}
        options={{
          title: "Ranking",
          tabBarIcon: ({ color, size }) => (
            <Feather name="award" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReferralTab"
        component={ReferralScreen}
        options={{
          title: "Referidos",
          tabBarIcon: ({ color, size }) => (
            <Feather name="gift" size={size} color={color} />
          ),
        }}
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
    </Tab.Navigator>
  );
}
