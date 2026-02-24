// Notification Service - Sends push notifications for order updates
import * as Notifications from "expo-notifications";

interface OrderNotification {
  orderId: string;
  status: string;
  title: string;
  body: string;
}

const STATUS_MESSAGES = {
  preparing: {
    title: "¡Pedido confirmado! 👨🍳",
    body: "Tu pedido está siendo preparado",
  },
  ready: {
    title: "¡Pedido listo! 📦",
    body: "Tu pedido está listo para recoger",
  },
  picked_up: {
    title: "¡En camino! 🚗",
    body: "Tu repartidor va hacia tu ubicación",
  },
  delivered: {
    title: "¡Entregado! ✅",
    body: "Tu pedido ha sido entregado",
  },
};

export async function sendOrderStatusNotification(
  orderId: string,
  status: string,
) {
  try {
    const message = STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES];
    if (!message) return;

    const notification: OrderNotification = {
      orderId,
      status,
      title: message.title,
      body: message.body,
    };

    // For web/development, we'll use browser notifications
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.body,
          icon: "/icon.png",
          badge: "/icon.png",
          tag: `order-${orderId}`,
        });
      }
    }

    // For mobile, use Expo notifications
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: { orderId, status },
        sound: true,
      },
      trigger: null, // Send immediately
    });

    console.log(
      `🔔 Notification sent: ${notification.title} - ${notification.body}`,
    );
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}

export async function requestNotificationPermission() {
  try {
    // For web
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }

    // For mobile
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}
