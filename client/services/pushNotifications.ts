// Expo Push Notifications Service para AstroBar
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('📱 Expo Push Token:', token);

    // Guardar token en backend
    await api.post('/users/push-token', { pushToken: token });

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

export const sendFlashPromoNotification = async (
  userId: string,
  barName: string,
  promoTitle: string,
  distance: number
) => {
  try {
    await api.post('/notifications/flash-promo', {
      userId,
      title: `⚡ ${barName}`,
      body: `${promoTitle} - A ${distance.toFixed(1)}km de ti`,
      data: { type: 'flash_promo', barName, promoTitle },
    });
  } catch (error) {
    console.error('Error sending flash promo notification:', error);
  }
};

export const setupNotificationListeners = (
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
) => {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
