import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import UserProfileStats from "@/screens/UserProfileStats";
import PaymentMethodsScreen from "@/screens/PaymentMethodsScreen";
import WalletScreen from "@/screens/WalletScreen";
import CustomerWalletScreen from "@/screens/CustomerWalletScreen";
import BusinessMercadoPagoScreen from "@/screens/BusinessMercadoPagoScreen";
import MyBusinessesScreen from "@/screens/MyBusinessesScreen";
import SupportScreen from "@/screens/SupportScreen";
import TermsScreen from "@/screens/TermsScreen";
import PrivacyScreen from "@/screens/PrivacyScreen";
import AddBankAccountScreen from "@/screens/AddBankAccountScreen";
import PaymentHistoryScreen from "@/screens/PaymentHistoryScreen";
import WithdrawalRequestScreen from "@/screens/WithdrawalRequestScreen";
import MercadoPagoConnectScreen from "@/screens/MercadoPagoConnectScreen";
import CustomerPaymentMethodsScreen from "@/screens/CustomerPaymentMethodsScreen";
import AddPaymentCardScreen from "@/screens/AddPaymentCardScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  UserStats: undefined;
  PaymentMethods: undefined;
  CustomerPaymentMethods: undefined;
  AddPaymentCard: undefined;
  Wallet: undefined;
  CustomerWallet: undefined;
  BusinessMercadoPago: undefined;
  MyBusinesses: undefined;
  Support: undefined;
  Terms: undefined;
  Privacy: undefined;
  BankAccountSetup: undefined;
  PaymentHistory: undefined;
  WithdrawalRequest: undefined;
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
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ headerTitle: "Métodos de Pago", headerShown: false }}
      />
      <Stack.Screen
        name="CustomerPaymentMethods"
        component={CustomerPaymentMethodsScreen}
        options={{ headerTitle: "Métodos de Pago", headerShown: false }}
      />
      <Stack.Screen
        name="AddPaymentCard"
        component={AddPaymentCardScreen}
        options={{ headerTitle: "Agregar Tarjeta", headerShown: false }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerTitle: "Mi Billetera" }}
      />
      <Stack.Screen
        name="CustomerWallet"
        component={CustomerWalletScreen}
        options={{ headerTitle: "Mi Billetera" }}
      />
      <Stack.Screen
        name="BusinessMercadoPago"
        component={BusinessMercadoPagoScreen}
        options={{ headerTitle: "Mercado Pago" }}
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
        component={AddBankAccountScreen}
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
        name="MercadoPagoConnect"
        component={MercadoPagoConnectScreen}
        options={{ headerTitle: "Mercado Pago" }}
      />
    </Stack.Navigator>
  );
}

