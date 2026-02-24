import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import BusinessTabNavigator from "@/navigation/BusinessTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import VerifyPhoneScreen from "@/screens/VerifyPhoneScreen";
import BusinessDetailScreen from "@/screens/BusinessDetailScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import CheckoutScreen from "@/screens/CheckoutScreen";
import BusinessManageScreen from "@/screens/BusinessManageScreen";
import BusinessStatsScreen from "@/screens/BusinessStatsScreen";
import BusinessHoursScreen from "@/screens/BusinessHoursScreen";
import BusinessCategoriesScreen from "@/screens/BusinessCategoriesScreen";
import MyBusinessesScreen from "@/screens/MyBusinessesScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import ConfirmPromotionScreen from "@/screens/ConfirmPromotionScreen";
import PromotionQRScreen from "@/screens/PromotionQRScreen";
import ScanQRScreen from "@/screens/ScanQRScreen";

import TermsScreen from "@/screens/TermsScreen";
import PrivacyScreen from "@/screens/PrivacyScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";

// Conditional import for LocationPickerScreen
let LocationPickerScreen: any = null;
if (Platform.OS !== 'web') {
  LocationPickerScreen = require("@/screens/LocationPickerScreen").default;
}

export type RootStackParamList = {
  Main: undefined;
  MainTabs: undefined;
  Login: undefined;
  Signup: { phone?: string } | undefined;
  VerifyPhone: { phone: string };
  BusinessDetail: { businessId: string };
  ProductDetail: {
    productId: string;
    businessId: string;
    businessName: string;
  };
  Cart: undefined;
  Checkout: undefined;
  BusinessManage: undefined;
  BusinessStats: undefined;
  EditProfile: undefined;
  LocationPicker: { onLocationSelected?: (coords: any, address: string) => void };
  BusinessHours: undefined;
  BusinessCategories: undefined;
  MyBusinesses: { openAddModal?: boolean; draft?: { name?: string; type?: string; address?: string; phone?: string } } | undefined;
  Terms: undefined;
  Privacy: undefined;
  ConfirmPromotion: {
    promotion: any;
    business: any;
  };
  PromotionQR: {
    transaction: any;
    promotion: any;
    business: any;
  };
  ScanQR: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading, pendingVerificationPhone, user } = useAuth();

  if (isLoading) {
    return null;
  }

  const isBusinessOwner = user?.role === "business_owner";

  const getMainNavigator = () => {
    if (isBusinessOwner) return BusinessTabNavigator;
    return MainTabNavigator;
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={getMainNavigator()}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessDetail"
            component={BusinessDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessCategories"
            component={BusinessCategoriesScreen}
            options={{ headerTitle: "Categorías" }}
          />
          <Stack.Screen
            name="MyBusinesses"
            component={MyBusinessesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ConfirmPromotion"
            component={ConfirmPromotionScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
          <Stack.Screen
            name="PromotionQR"
            component={PromotionQRScreen}
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            name="ScanQR"
            component={ScanQRScreen}
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VerifyPhone"
            component={VerifyPhoneScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
