import type { Conversation, Message } from "../types";

export const sortConversationsByLatest = (
  conversations: Conversation[]
): Conversation[] => {
  return [...conversations].sort((a, b) => {
    const timeA = a.lastMessage
      ? new Date(a.lastMessage.timestamp).getTime()
      : 0;
    const timeB = b.lastMessage
      ? new Date(b.lastMessage.timestamp).getTime()
      : 0;
    return timeB - timeA; // mới nhất lên đầu
  });
};

export const mergeMessages = (
  existing: Message[],
  incoming: Message[]
): Message[] => {
  const map = new Map<string, Message>();
  [...existing, ...incoming].forEach((msg) => map.set(msg.id, msg));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
