import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ActivePromotionsScreen from "@/screens/ActivePromotionsScreen";
import HistoryScreen from "@/screens/HistoryScreen";

export type OrdersStackParamList = {
  ActivePromotions: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export default function OrdersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ActivePromotions" component={ActivePromotionsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
