import React, { useEffect, useState } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications, setupNotificationListeners } from "@/services/pushNotifications";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderCartProvider } from "@/contexts/OrderCartContext";
import { AppProvider } from "@/contexts/AppContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { StripeProvider } from "@/providers/StripeProvider";
import {
  OnboardingOverlay,
  checkOnboardingCompleted,
} from "@/components/OnboardingOverlay";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";
import { ThemedScreenWrapper } from "@/components/ThemedScreenWrapper";
import { useTheme } from "@/constants/theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Registrar push notifications
  useEffect(() => {
    const initPushNotifications = async () => {
      if (Platform.OS !== "web") {
        await registerForPushNotifications();
        
        const cleanup = setupNotificationListeners(
          (notification) => {
            console.log('📱 Notification received:', notification);
          },
          (response) => {
            console.log('📱 Notification tapped:', response);
          }
        );
        
        return cleanup;
      }
    };
    
    initPushNotifications();
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await checkOnboardingCompleted();
      setShowOnboarding(!completed);
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (Platform.OS === "web") {
        // Skip notification setup on web platform
        return;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      if (existingStatus !== "granted") {
        setShowNotificationModal(true);
      }
    };

    if (!showOnboarding && onboardingChecked) {
      const timer = setTimeout(checkNotificationPermission, 1000);
      return () => clearTimeout(timer);
    }
  }, [showOnboarding, onboardingChecked]);

  const handleAcceptNotifications = async () => {
    setShowNotificationModal(false);
    await Notifications.requestPermissionsAsync();
  };

  const handleDeclineNotifications = () => {
    setShowNotificationModal(false);
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!onboardingChecked) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <StripeProvider>
                <AppProvider>
                  <AuthProvider>
                    <BusinessProvider>
                      <CartProvider>
                        <OrderCartProvider>
                          <ToastProvider>
                            <ThemedScreenWrapper>
                              <AppThemedShell>
                                <RootStackNavigator />
                              </AppThemedShell>
                            </ThemedScreenWrapper>
                            {showOnboarding && (
                              <OnboardingOverlay
                                onComplete={() => setShowOnboarding(false)}
                              />
                            )}
                            <NotificationPermissionModal
                              visible={showNotificationModal}
                              onAccept={handleAcceptNotifications}
                              onDecline={handleDeclineNotifications}
                            />
                          </ToastProvider>
                        </OrderCartProvider>
                      </CartProvider>
                    </BusinessProvider>
                  </AuthProvider>
                </AppProvider>
              </StripeProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppThemedShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer theme={theme.isDark ? DarkTheme : DefaultTheme}>
        {children}
      </NavigationContainer>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
