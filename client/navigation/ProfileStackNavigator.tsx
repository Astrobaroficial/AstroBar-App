import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import UserProfileStats from "@/screens/UserProfileStats";
import SavedAddressesScreen from "@/screens/SavedAddressesScreen";
import AddAddressScreen from "@/screens/AddAddressScreen";
import LocationPickerScreen from "@/screens/LocationPickerScreen";
import PaymentMethodsScreen from "@/screens/PaymentMethodsScreen";
import WalletScreen from "@/screens/WalletScreen";
import MyBusinessesScreen from "@/screens/MyBusinessesScreen";
import SupportScreen from "@/screens/SupportScreen";
import TermsScreen from "@/screens/TermsScreen";
import PrivacyScreen from "@/screens/PrivacyScreen";
import BankAccountSetupScreen from "@/screens/BankAccountSetupScreen";
import PaymentHistoryScreen from "@/screens/PaymentHistoryScreen";
import WithdrawalRequestScreen from "@/screens/WithdrawalRequestScreen";
import StripeConnectStatusScreen from "@/screens/StripeConnectStatusScreen";
import MercadoPagoConnectScreen from "@/screens/MercadoPagoConnectScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  UserStats: undefined;
  SavedAddresses: undefined;
  AddAddress: { address?: any; fromCheckout?: boolean } | undefined;
  LocationPicker: {
    onLocationSelected: (coords: { latitude: number; longitude: number }, address: string) => void;
  };
  PaymentMethods: undefined;
  Wallet: undefined;
  MyBusinesses: undefined;
  Support: undefined;
  Terms: undefined;
  Privacy: undefined;
  BankAccountSetup: undefined;
  PaymentHistory: undefined;
  WithdrawalRequest: undefined;
  StripeConnectStatus: undefined;
  MercadoPagoConnect: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Mi Perfil",
        }}
      />
      <Stack.Screen
        name="UserStats"
        component={UserProfileStats}
        options={{
          headerTitle: "Mis Estadísticas",
        }}
      />
      <Stack.Screen
        name="SavedAddresses"
        component={SavedAddressesScreen}
        options={{ headerTitle: "Direcciones Guardadas" }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={{ headerTitle: "Agregar Dirección" }}
      />
      <Stack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{ headerTitle: "Seleccionar Ubicación" }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ headerTitle: "Métodos de Pago", headerShown: false }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerTitle: "Mi Billetera" }}
      />
      <Stack.Screen
        name="MyBusinesses"
        component={MyBusinessesScreen}
        options={{ headerTitle: "Mis Negocios" }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerTitle: "Ayuda y Soporte" }}
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
        name="BankAccountSetup"
        component={BankAccountSetupScreen}
        options={{ headerTitle: "Configurar Cuenta" }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ headerTitle: "Historial de Pagos" }}
      />
      <Stack.Screen
        name="WithdrawalRequest"
        component={WithdrawalRequestScreen}
        options={{ headerTitle: "Solicitar Retiro" }}
      />
      <Stack.Screen
        name="StripeConnectStatus"
        component={StripeConnectStatusScreen}
        options={{ headerTitle: "Estado Stripe Connect" }}
      />
      <Stack.Screen
        name="MercadoPagoConnect"
        component={MercadoPagoConnectScreen}
        options={{ headerTitle: "Mercado Pago" }}
      />
    </Stack.Navigator>
  );
}
