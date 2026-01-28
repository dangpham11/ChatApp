import { useState, useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { authService, UserResponse } from "../services/authService";
import { conversationService } from "../services/conversationService";
import type { Conversation, Message } from "../types";
import { parseTimestamp } from "../utils/helper";
import { messageService } from "../services/messageService";
import { messageReadService } from "../services/messageReadService";

interface SignalRMessage {
  id: string;
  conversationId: string | number;
  senderId: string;
  content: string;
  timestamp: Date;
  messageType?: "text" | "voice" | "image" | "file" | "location" | "video";
  voiceDuration?: number;
  voiceUrl?: string;
  location?: { latitude: number; longitude: number; address: string };
  forwardedFromUserId?: string;
  forwardedFromTimestamp?: string;
}

export const useChat = (apiBaseUrl: string) => {
  // ====== Auth ======
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading] = useState(true);

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authService.register({ name, email, password });
    setToken(res.token);
    setUser(res.user);
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      await messageReadService.markConversationAsRead(Number(conversationId));
    } catch (err) {
      console.error("❌ markConversationAsRead failed", err);
    }
  };

  // ====== Chat ======
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connectToHub = useCallback(async () => {
    if (!token) return;

    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiBaseUrl}/chathub`, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connection.on("UserConnected", (userId: string) => {
        if (userId === String(user?.id)) return; // ❗ bỏ qua chính mình

        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            participants: conv.participants.map((p) =>
              p.id === userId ? { ...p, isOnline: true } : p,
            ),
          })),
        );
      });

      connection.on("OnlineUsers", (onlineUserIds: string[]) => {
        console.log("🟢 Online users sync:", onlineUserIds);

        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            participants: conv.participants.map((p) => ({
              ...p,
              isOnline: onlineUserIds.includes(p.id),
            })),
          })),
        );
      });

      connection.on("UserDisconnected", (userId: string) => {
        if (userId === String(user?.id)) return;

        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            participants: conv.participants.map((p) =>
              p.id === userId ? { ...p, isOnline: false } : p,
            ),
          })),
        );
      });

      connection.on("NewMessage", (msg: SignalRMessage) => {
        console.log("🔥 NewMessage", msg);
        console.log("NewMessage received", msg, "currentUser", user?.id);
        const newMsg: Message = {
          id: msg.id.toString(),
          conversationId: msg.conversationId.toString(),
          senderId: msg.senderId.toString(),
          content:
            msg.messageType === "voice" && msg.voiceUrl
              ? msg.voiceUrl
              : msg.content,
          timestamp: parseTimestamp(
            // BE thường gửi createdAt khi forward
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (msg as any).createdAt ??
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (msg as any).timestamp ??
              new Date(),
          ),
          type: msg.messageType ?? "text",
          isRead: msg.senderId.toString() === user?.id.toString(), // ✅ chính mình gửi thì coi là đã đọc
          voiceDuration: msg.voiceDuration,
          location: msg.location,
          forwardedFromUserId: msg.forwardedFromUserId,
          forwardedFromTimestamp: msg.forwardedFromTimestamp,
        };

        /* =========================
     1️⃣ UPDATE messages (flat)
     ========================= */
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === newMsg.id);

          if (exists) {
            // ✅ update lại nếu là sender
            return prev.map((m) =>
              m.id === newMsg.id ? { ...m, ...newMsg } : m,
            );
          }

          return [...prev, newMsg];
        });

        /* =========================
     2️⃣ UPDATE conversations
     ========================= */
        setConversations((prev) => {
          const convIndex = prev.findIndex(
            (c) => c.id.toString() === newMsg.conversationId,
          );

          // ❗ nếu chưa có conversation → tạo mới
          if (convIndex === -1) {
            return [
              {
                id: newMsg.conversationId,
                participants: [],
                messages: [newMsg],
                lastMessage: newMsg,
                unreadCount: newMsg.senderId === user?.id.toString() ? 0 : 1,
              },
              ...prev,
            ];
          }

          const conv = { ...prev[convIndex] };

          // ❗ tránh duplicate trong conversation.messages
          if (conv.messages?.some((m) => m.id === newMsg.id)) {
            return prev;
          }

          conv.messages = [...(conv.messages || []), newMsg];
          conv.lastMessage = newMsg;

          // ❗ tăng unreadCount nếu là tin người khác gửi
          if (newMsg.senderId !== user?.id.toString()) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }

          const newConvs = [...prev];
          newConvs[convIndex] = conv;

          // ❗ sort lại theo lastMessage
          newConvs.sort(
            (a, b) =>
              new Date(b.lastMessage?.timestamp ?? 0).getTime() -
              new Date(a.lastMessage?.timestamp ?? 0).getTime(),
          );

          return newConvs;
        });
      });

      // Server sends: { messageId, newContent, editedAt }
      connection.on(
        "MessageEdited",
        (data: {
          messageId: number | string;
          newContent: string;
          editedAt?: string;
        }) => {
          try {
            const msgId = data.messageId.toString();
            const newContent = data.newContent;

            // Update flat messages state
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, content: newContent, isEdited: true }
                  : m,
              ),
            );

            // Update conversations (messages arrays and lastMessage if applicable)
            setConversations((prev) =>
              prev.map((conv) => {
                const updatedMessages = (conv.messages || []).map((m) =>
                  m.id === msgId
                    ? { ...m, content: newContent, isEdited: true }
                    : m,
                );

                const updatedLastMessage =
                  conv.lastMessage && conv.lastMessage.id === msgId
                    ? {
                        ...conv.lastMessage,
                        content: newContent,
                        isEdited: true,
                      }
                    : conv.lastMessage;

                return {
                  ...conv,
                  messages: updatedMessages,
                  lastMessage: updatedLastMessage,
                };
              }),
            );
          } catch (err) {
            console.error("Error handling MessageEdited payload:", err, data);
          }
        },
      );

      connection.on(
        "MessagesRead",
        (data: {
          conversationId: number;
          userId: number;
          messageIds: number[];
        }) => {
          console.log("👁️ MessagesRead:", data);

          // update messages
          setMessages((prev) =>
            prev.map((m) =>
              data.messageIds.includes(Number(m.id))
                ? { ...m, isRead: true }
                : m,
            ),
          );

          // reset unread count
          setConversations((prev) =>
            prev.map((c) =>
              c.id === data.conversationId.toString()
                ? { ...c, unreadCount: 0 }
                : c,
            ),
          );
        },
      );
      connection.on("FileUploading", (fileInfo) => {
        console.log("📂 File đang được tải lên:", fileInfo);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on("FileUploaded", (fileInfo: any) => {
        console.log("🚀 [SignalR] FileUploaded event received:", fileInfo);

        if (!fileInfo) {
          console.error("❌ [FileUploaded] fileInfo is null or undefined!");
          return;
        }

        const conversationId = fileInfo.conversationId?.toString();
        const uploaderId = fileInfo.senderId?.toString() ?? "unknown";
        const fileUrl = fileInfo.url ?? "";
        const fileName = fileInfo.fileName ?? "";
        const fileSize = fileInfo.bytes ?? 0;
        const messageId =
          fileInfo.publicId ?? `${conversationId}-${Date.now()}`;
        const timestamp = parseTimestamp(fileInfo.timestamp ?? new Date());

        console.log("📦 [FileUploaded] Parsed data:", {
          conversationId,
          uploaderId,
          fileUrl,
          fileName,
          fileSize,
          messageId,
          timestamp,
        });

        const newMsg: Message = {
          id: messageId,
          conversationId,
          senderId: uploaderId,
          content: fileUrl,
          timestamp,
          type: fileInfo.resourceType === "image" ? "image" : "file",
          fileName,
          fileSize,
          fileUrl,
          isRead: false,
        };

        console.log("🧱 [FileUploaded] Constructed new message:", newMsg);

        // ✅ Thêm log trước khi cập nhật state
        console.log("🧩 [FileUploaded] Updating messages state...");
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMsg.id);
          if (exists) {
            console.warn(
              "⚠️ [FileUploaded] Duplicate message detected, skipping.",
            );
            return prev;
          }
          const updated = [...prev, newMsg];
          console.log(
            "✅ [FileUploaded] Message added successfully. Total messages:",
            updated.length,
          );
          return updated;
        });

        // ✅ Log conversation update
        console.log("🔄 [FileUploaded] Updating conversations list...");
        setConversations((prev) => {
          if (!Array.isArray(prev)) {
            console.error(
              "❌ [FileUploaded] Conversations state is not an array:",
              prev,
            );
            return prev;
          }

          const convIndex = prev.findIndex(
            (c) => c.id?.toString() === conversationId,
          );
          console.log("🔍 [FileUploaded] Found conversation index:", convIndex);

          if (convIndex === -1) {
            console.warn(
              "⚠️ [FileUploaded] Conversation not found, creating new.",
            );
            const newConv = {
              id: conversationId,
              participants: [],
              messages: [newMsg],
              lastMessage: newMsg,
              unreadCount: 1,
            };
            console.log("🆕 [FileUploaded] New conversation added:", newConv);
            return [newConv, ...prev];
          }

          const updatedConv = { ...prev[convIndex] };
          updatedConv.messages = [...(updatedConv.messages || []), newMsg];
          updatedConv.lastMessage = newMsg;

          const newConvs = [...prev];
          newConvs[convIndex] = updatedConv;

          console.log("✅ [FileUploaded] Updated conversation:", updatedConv);

          newConvs.sort((a, b) =>
            b.lastMessage && a.lastMessage
              ? new Date(b.lastMessage.timestamp).getTime() -
                new Date(a.lastMessage.timestamp).getTime()
              : 0,
          );

          console.log(
            "📚 [FileUploaded] Conversations sorted. Total:",
            newConvs.length,
          );
          return [...newConvs];
        });

        console.log("🎉 [FileUploaded] Update completed successfully!");
      });

      connection.on("FileUploadFailed", (error) => {
        console.error("❌ Tải file thất bại:", error);
      });

      connection.on("FileDeleted", (data) => {
        console.log("🗑️ File đã bị xóa:", data);
      });

      connection.on("FileDeleteFailed", (error) => {
        console.error("⚠️ Xóa file thất bại:", error);
      });
      // Handle message recalled
      connection.on(
        "MessageRecalled",
        (data: { messageId: number | string }) => {
          try {
            const msgId = data.messageId.toString();

            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, isRecalled: true, content: "Message was recalled" }
                  : m,
              ),
            );

            setConversations((prev) =>
              prev.map((conv) => {
                const updatedMessages = (conv.messages || []).map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        isRecalled: true,
                        content: "Message was recalled",
                      }
                    : m,
                );

                const lastNonRecalled =
                  [...updatedMessages].reverse().find((m) => !m.isRecalled) ||
                  null;

                return {
                  ...conv,
                  messages: updatedMessages,
                  lastMessage: lastNonRecalled || undefined,
                };
              }),
            );
          } catch (err) {
            console.error("Error handling MessageRecalled:", err, data);
          }
        },
      );
      // Some servers might send lowercase method names
      connection.on(
        "messagerecalled",
        (data: { messageId: number | string }) => {
          try {
            const msgId = data.messageId.toString();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, isRecalled: true, content: "Message was recalled" }
                  : m,
              ),
            );
            setConversations((prev) =>
              prev.map((conv) => {
                const updatedMessages = (conv.messages || []).map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        isRecalled: true,
                        content: "Message was recalled",
                      }
                    : m,
                );
                const lastNonRecalled =
                  [...updatedMessages].reverse().find((m) => !m.isRecalled) ||
                  null;
                return {
                  ...conv,
                  messages: updatedMessages,
                  lastMessage: lastNonRecalled || undefined,
                };
              }),
            );
          } catch (err) {
            console.error("Error handling messagerecalled:", err, data);
          }
        },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlePinned = (data: any) => {
        console.log("📌 [SignalR] MessagePinned received:", data);

        const msgId = data?.messageId?.toString();
        const convId = data?.conversationId?.toString();

        if (!msgId || !convId) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id.toString() === msgId ? { ...m, isPinned: true } : m,
          ),
        );

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id.toString() === convId
              ? {
                  ...conv,
                  pinnedMessages: Array.from(
                    new Set([...(conv.pinnedMessages || []), msgId]),
                  ),
                }
              : conv,
          ),
        );
      };

      connection.on("MessagePinned", handlePinned);
      connection.on("messagepinned", handlePinned);

      // ✅ Khi tin nhắn được bỏ ghim
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleUnpinned = (data: any) => {
        console.log("📌 [SignalR] MessageUnpinned received:", data);

        const msgId = data?.messageId?.toString();
        const convId = data?.conversationId?.toString();
        if (!msgId || !convId) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id.toString() === msgId ? { ...m, isPinned: false } : m,
          ),
        );

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id.toString() === convId
              ? {
                  ...conv,
                  pinnedMessages: (conv.pinnedMessages || []).filter(
                    (id) => id !== msgId,
                  ),
                }
              : conv,
          ),
        );
      };

      connection.on("MessageUnpinned", handleUnpinned);

      connection.on("MessageReactionUpdated", ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions } : msg,
          ),
        );
      });

      connection.on("messageunpinned", handleUnpinned);

      connection.on("ConversationUpdated", (data) => {
        console.log("🔄 ConversationUpdated", data);

        const convId = data.conversationId.toString();

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  lastMessage: c.lastMessage
                    ? {
                        ...c.lastMessage,
                        content: data.lastMessage,
                        timestamp: parseTimestamp(data.lastMessageTime),
                      }
                    : c.lastMessage,
                }
              : c,
          ),
        );
      });

      connection.on(
        "nicknameupdated",
        (data: {
          conversationId: number | string;
          userId: number | string;
          nickname: string | null;
        }) => {
          console.log("✏️ [SignalR] NicknameUpdated:", data);

          const convId = data.conversationId.toString();
          const userId = data.userId.toString();

          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === convId
                ? {
                    ...conv,
                    participants: conv.participants.map((p) =>
                      p.id === userId
                        ? {
                            ...p,
                            name: data.nickname || p.name, // fallback nếu null
                            nickname: data.nickname, // nếu bạn có field riêng
                          }
                        : p,
                    ),
                  }
                : conv,
            ),
          );
        },
      );

      // When another user blocks the current user for a conversation
      connection.on(
        "UserBlocked",
        (data: {
          conversationId: number | string;
          blockedBy?: number | string;
        }) => {
          try {
            const convId = data?.conversationId?.toString();
            if (!convId) return;
            console.log(
              "🔒 [SignalR] UserBlocked for conversation:",
              convId,
              data,
            );
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId ? { ...c, isBlockedByOther: true } : c,
              ),
            );
          } catch (err) {
            console.error("Error handling UserBlocked event:", err);
          }
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on("NewTempMessage", (msg: any) => {
        console.log("🫥 NewTempMessage", msg);

        const tempMsg: Message = {
          id: msg.id.toString(),
          tempId: msg.tempId,
          conversationId: msg.conversationId.toString(),
          senderId: msg.senderId.toString(),
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          type: msg.messageType ?? "text",

          isTemp: true,
          isRead: true,
          isForwardClone: true,

          forwardedFromUserId: msg.forwardedFromUserId,
          forwardedFromTimestamp: msg.forwardedFromTimestamp,
        };

        // ✅ CHỈ add vào messages (flat)
        setMessages((prev) => [...prev, tempMsg]);
      });
      connection.on(
        "UserUnblocked",
        (data: {
          conversationId: number | string;
          unblockedBy?: number | string;
        }) => {
          try {
            const convId = data?.conversationId?.toString();
            if (!convId) return;
            console.log(
              "🔓 [SignalR] UserUnblocked for conversation:",
              convId,
              data,
            );
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId ? { ...c, isBlockedByOther: false } : c,
              ),
            );
          } catch (err) {
            console.error("Error handling UserUnblocked event:", err);
          }
        },
      );
      await connection.start();
      connectionRef.current = connection;
      setIsConnected(true);
      console.log("✅ SignalR connected");
    } catch (err) {
      console.error("❌ SignalR error", err);
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectToHub, 5000);
    }
  }, [apiBaseUrl, token, user?.id]);

  // Lấy dữ liệu ban đầu + kết nối hub
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        const convs = await conversationService.getMyConversations();
        const mappedConvs: Conversation[] = convs.map((conv) => ({
          id: conv.id.toString(),
          name: conv.name,
          isGroup: conv.isGroup,
          avatarUrl: conv.avatarUrl,
          createdAt: new Date(conv.createdAt),
          participants: conv.participants.map((p) => ({
            id: p.userId.toString(),
            name: p.displayName || p.username || "", // 👈 thêm fallback để luôn là string
            avatar: p.avatarUrl,
            isOnline: p.isOnline,
            email: p.email,
            location: p.location,
            phoneNumber: p.phoneNumber,
            bio: p.bio,
            dateBirth: p.dateBirth,
            lastSeen: new Date(p.lastSeen),
          })),
          messages: conv.lastMessage
            ? [
                {
                  id: conv.lastMessage.id.toString(),
                  conversationId: conv.id.toString(),
                  senderId: conv.lastMessage.senderId.toString(),
                  content: conv.lastMessage.content,
                  timestamp: new Date(conv.lastMessage.createdAt),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  type: (conv.lastMessage.messageType as any) || "text",
                  fileName:
                    conv.lastMessage.messageType === "file"
                      ? conv.lastMessage.content
                      : undefined,
                  fileSize:
                    conv.lastMessage.messageType === "file"
                      ? conv.lastMessage.content.length
                      : undefined,
                  fileUrl:
                    conv.lastMessage.messageType === "file"
                      ? conv.lastMessage.content
                      : undefined,
                  isRead: false,
                  voiceDuration: conv.lastMessage.duration,
                },
              ]
            : [],
          unreadCount: conv.unreadCount,
        }));

        setConversations(mappedConvs);
        setMessages(mappedConvs.flatMap((conv) => conv.messages));
      } catch (err) {
        console.error("❌ Fetch conversations failed", err);
      }
    };

    fetchData();
    connectToHub();

    return () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      connectionRef.current?.stop();
    };
  }, [token, connectToHub]);

  const sendTextMessage = async (content: string, conversationId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${apiBaseUrl}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, conversationId, messageType: "text" }),
      });
      const result = await res.json();
      const newMsg: Message = {
        id: result.id,
        conversationId,
        senderId: result.senderId,
        content: result.content,
        timestamp: new Date(result.timestamp),
        type: result.messageType || "text",
        isRead: true,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, lastMessage: newMsg } : conv,
        ),
      );
    } catch (err) {
      console.error("❌ sendTextMessage", err);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, conversationId: string) => {
    if (!token) return;

    try {
      const formData = new FormData();
      formData.append("AudioFile", audioBlob, "voice-message.webm");
      formData.append("ConversationId", conversationId);

      const res = await fetch(`${apiBaseUrl}/messages/send-voice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      const newMsg: Message = {
        id: result.id,
        conversationId,
        senderId: result.senderId,
        content: result.fileUrl,
        timestamp: new Date(result.timestamp),
        type: "voice",
        isRead: true,
        voiceDuration: result.duration,
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, lastMessage: newMsg } : conv,
        ),
      );
    } catch (err) {
      console.error("❌ sendVoiceMessage", err);
    }
  };
  const pinMessage = async (messageId: number, isPinned: boolean) => {
    try {
      await messageService.pinMessage(messageId, { isPinned });
      console.log(isPinned ? "✅ Pinned message" : "✅ Unpinned message");
    } catch (error) {
      console.error("❌ pinMessage failed:", error);
    }
  };

  const hubPinMessage = async (messageId: number, isPinned: boolean) => {
    try {
      if (
        connectionRef.current &&
        connectionRef.current.state === signalR.HubConnectionState.Connected
      ) {
        await connectionRef.current.invoke("PinMessage", messageId, isPinned);
        return;
      }
    } catch (err) {
      console.warn("hubPinMessage invoke failed, falling back to REST:", err);
    }

    // fallback to REST
    return pinMessage(messageId, isPinned);
  };

  const editMessage = async (
    messageId: string | number,
    newContent: string,
  ) => {
    console.log("✏️ editMessage called", { messageId, newContent });

    // Prefer REST API first (reliable). Server will broadcast MessageEdited to participants.
    try {
      await messageService.editMessage(Number(messageId), { newContent });
      console.log("✏️ editMessage: REST edit succeeded", messageId);
      return;
    } catch (restErr) {
      console.warn(
        "✏️ editMessage: REST edit failed, attempting hub invoke",
        restErr,
      );
      // If REST failed, try hub invoke as a last resort (server may expose EditMessage on hub)
      try {
        if (
          connectionRef.current &&
          connectionRef.current.state === signalR.HubConnectionState.Connected
        ) {
          await connectionRef.current.invoke(
            "EditMessage",
            Number(messageId),
            newContent,
          );
          console.log("✏️ editMessage: hub invoke succeeded", messageId);
          return;
        } else {
          throw new Error("SignalR not connected");
        }
      } catch (hubErr) {
        console.error("✏️ editMessage: hub invoke failed as well", hubErr);
        throw hubErr || restErr;
      }
    }
  };

  const hubRecallMessage = async (messageId: number) => {
    try {
      if (
        connectionRef.current &&
        connectionRef.current.state === signalR.HubConnectionState.Connected
      ) {
        await connectionRef.current.invoke("RecallMessage", messageId);
        return;
      }
    } catch (err) {
      console.warn(
        "hubRecallMessage invoke failed, falling back to REST:",
        err,
      );
    }

    try {
      await messageService.recallMessage(messageId);
    } catch (err) {
      console.error("Failed to recall message via REST fallback:", err);
      throw err;
    }
  };

  const hubReactToMessage = async (messageId: number, emoji: string) => {
    try {
      if (
        connectionRef.current &&
        connectionRef.current.state === signalR.HubConnectionState.Connected
      ) {
        await connectionRef.current.invoke("ReactToMessage", messageId, emoji);
        return;
      }
    } catch (err) {
      console.warn(
        "hubReactToMessage invoke failed, falling back to REST:",
        err,
      );
    }

    try {
      await messageService.reactToMessage(messageId, { emoji });
    } catch (err) {
      console.error("Failed to react to message via REST fallback:", err);
      throw err;
    }
  };

  const getPinnedMessages = async (conversationId: number) => {
    try {
      const res = await messageService.getPinnedMessages(conversationId);
      console.log("📍 Pinned messages:", res);
      return res;
    } catch (error) {
      console.error("❌ getPinnedMessages failed:", error);
      return [];
    }
  };

  const addMessage = (message: Message) =>
    setMessages((prev) => [...prev, message]);

  return {
    user,
    token,
    loading,
    login,
    logout,
    register,
    messages,
    conversations,
    isConnected,
    sendTextMessage,
    sendVoiceMessage,
    addMessage,
    pinMessage,
    getPinnedMessages,
    markConversationAsRead,
    editMessage,
    hubPinMessage,
    hubRecallMessage,
    hubReactToMessage,
  };
};
