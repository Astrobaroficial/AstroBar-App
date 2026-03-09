import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ActivePromotionsScreen from "@/screens/ActivePromotionsScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import PromotionQRScreen from "@/screens/PromotionQRScreen";

export type OrdersStackParamList = {
  ActivePromotions: undefined;
  History: undefined;
  PromotionQR: { transactionId: string };
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
      <Stack.Screen name="PromotionQR" component={PromotionQRScreen} />
    </Stack.Navigator>
  );
}
