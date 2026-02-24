import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import WithdrawalScreen from '../screens/WithdrawalScreen';
import AddBankAccountScreen from '../screens/AddBankAccountScreen';

const Stack = createStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF6B35',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Perfil' }}
      />
      <Stack.Screen 
        name="PaymentMethods" 
        component={PaymentMethodsScreen} 
        options={{ title: 'Métodos de Pago' }}
      />
      <Stack.Screen 
        name="Withdrawals" 
        component={WithdrawalScreen} 
        options={{ title: 'Retiros' }}
      />
      <Stack.Screen 
        name="AddBankAccount" 
        component={AddBankAccountScreen} 
        options={{ title: 'Agregar Cuenta Bancaria' }}
      />
    </Stack.Navigator>
  );
}