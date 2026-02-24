import { db } from "./db";
import { users } from "@shared/schema-mysql";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const pushTokens = new Map<string, string>();

export async function registerPushToken(
  userId: string,
  token: string,
): Promise<void> {
  pushTokens.set(userId, token);
  logger.info("Push token registered", { userId });
}

export async function sendPushNotification(
  notification: PushNotification,
): Promise<void> {
  const token = pushTokens.get(notification.userId);

  if (!token) {
    logger.debug("No push token for user", { userId: notification.userId });
    return;
  }

  try {
    logger.info("Push notification sent", {
      userId: notification.userId,
      title: notification.title,
    });
  } catch (error) {
    logger.error("Failed to send push notification", error, {
      userId: notification.userId,
    });
  }
}

export async function notifyOrderStatusChange(
  orderId: string,
  userId: string,
  status: string,
): Promise<void> {
  const statusMessages: Record<string, { title: string; body: string }> = {
    accepted: {
      title: "Pedido aceptado",
      body: "Tu pedido ha sido aceptado y está siendo preparado",
    },
    preparing: {
      title: "Preparando tu pedido",
      body: "El negocio está preparando tu pedido",
    },
    ready: {
      title: "Pedido listo",
      body: "Tu pedido está listo y será recogido pronto",
    },
    picked_up: {
      title: "En camino",
      body: "Tu pedido está en camino",
    },
    delivered: {
      title: "Pedido entregado",
      body: "Tu pedido ha sido entregado. ¡Buen provecho!",
    },
  };

  const message = statusMessages[status];
  if (!message) return;

  await sendPushNotification({
    userId,
    title: message.title,
    body: message.body,
    data: { orderId, status, type: "order_update" },
  });
}

export async function notifyDriverAssignment(
  driverId: string,
  orderId: string,
  businessName: string,
): Promise<void> {
  await sendPushNotification({
    userId: driverId,
    title: "Nuevo pedido asignado",
    body: `Tienes un nuevo pedido de ${businessName}`,
    data: { orderId, type: "driver_assignment" },
  });
}

export async function notifyBusinessNewOrder(
  businessId: string,
  orderId: string,
): Promise<void> {
  await sendPushNotification({
    userId: businessId,
    title: "Nuevo pedido",
    body: "Tienes un nuevo pedido. Revisa los detalles.",
    data: { orderId, type: "new_order" },
  });
}
