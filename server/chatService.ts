// Real-time Chat Service - Simple in-memory chat for orders
interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  senderName: string;
}

const orderChats = new Map<string, ChatMessage[]>();

export function addChatMessage(
  orderId: string,
  senderId: string,
  receiverId: string,
  message: string,
  senderName: string,
): ChatMessage {
  const chatMessage: ChatMessage = {
    id: Date.now().toString(),
    orderId,
    senderId,
    receiverId,
    message,
    timestamp: new Date().toISOString(),
    senderName,
  };

  if (!orderChats.has(orderId)) {
    orderChats.set(orderId, []);
  }

  orderChats.get(orderId)!.push(chatMessage);
  console.log(`💬 New message in order ${orderId}: ${senderName}: ${message}`);

  return chatMessage;
}

export function getChatMessages(orderId: string): ChatMessage[] {
  return orderChats.get(orderId) || [];
}

export function clearOrderChat(orderId: string): void {
  orderChats.delete(orderId);
}
