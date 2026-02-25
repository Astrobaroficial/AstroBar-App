import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

import HomeScreen from "@/screens/HomeScreen";
import BusinessListScreen from "@/screens/BusinessListScreen";
import MapScreen from "@/screens/MapScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Spacing, AstroBarColors } from "@/constants/theme";

export type HomeStackParamList = {
  Home: undefined;
  BusinessList: undefined;
  Map: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HeaderTitle() {
  return (
    <View style={styles.headerTitle}>
      <Image
        source={require("../../assets/astrobarlogo.jpg")}
        style={styles.headerIcon}
        contentFit="contain"
      />
      <ThemedText type="h3" style={{ color: AstroBarColors.primary }}>
        AstroBar
      </ThemedText>
    </View>
  );
}

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerRight: () => <ThemeToggleButton />,
        }}
      />
      <Stack.Screen
        name="BusinessList"
        component={BusinessListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 28,
    height: 28,
    marginRight: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
