import { useState, useEffect } from "react";
import type { Conversation, Message, User } from "./types";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { UserProfileModal } from "./components/UserProfileModal";
import { ConversationList } from "./components/ConversationList";
import { ChatWindow } from "./components/ChatWindow";
import { ConversationInfoSidebar } from "./components/ConversationInfoSidebar";
import { AddFriendModal } from "./components/AddFriendModal";
import { CallScreen } from "./components/CallScreen";
import { SearchBar } from "./components/SearchBar";
import { UserAvatar } from "./components/UserAvatar";
import { PinnedMessagesPage } from "./components/PinnedMessagesPage";
import { MessageSquare, Settings, UserPlus, LogOut } from "lucide-react";
import { conversationService } from "./services/conversationService";
import { messageService } from "./services/messageService";
import { authService } from "./services/authService";
import { VerifyEmailPage } from "./components/VerifyEmailPage";
import { messageReadService } from "./services/messageReadService";
import {
  mapConversationResponseToConversation,
  mapMessageResponseToMessage,
} from "./utils/mappers";
import { useChat } from "./hooks/useChatHub";
import { API_BASE_URL } from "./config/api";
import { mergeMessages, sortConversationsByLatest } from "./utils/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { parseTimestamp } from "./utils/helper";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<User>();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "incoming" | "inCall" | "missed" | "ended"
  >("idle");
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [callCaller, setCallCaller] = useState<User | null>(null);
  const [activeTab] = useState<"all" | "unread">("all");
  const [, setIsLoadingConversations] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const isVerifyEmailPage = window.location.pathname === "/verify-email";

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  // Helpers to persist cleared timestamp per conversation (per user) in localStorage
  const getClearedAt = (conversationId: string): Date | null => {
    try {
      const v = localStorage.getItem(`conv_cleared_${conversationId}`);
      return v ? new Date(v) : null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return null;
    }
  };

  const setClearedAt = (conversationId: string, date: Date) => {
    try {
      localStorage.setItem(
        `conv_cleared_${conversationId}`,
        date.toISOString(),
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* ignore */
    }
  };
  // --- Nickname persistence helpers (client-side fallback) ---
  const NICKNAMES_KEY = "app.nicknames";

  const loadSavedNicknames = (): Record<string, Record<string, string>> => {
    try {
      const raw = localStorage.getItem(NICKNAMES_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return {};
    }
  };

  const saveNicknameLocally = (
    conversationId: string,
    userId: string,
    nickname: string | null,
  ) => {
    try {
      const all = loadSavedNicknames();
      if (!all[conversationId]) all[conversationId] = {};
      if (nickname === null || nickname === undefined || nickname === "") {
        delete all[conversationId][userId];
      } else {
        all[conversationId][userId] = nickname;
      }
      localStorage.setItem(NICKNAMES_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("Failed to save nickname locally", e);
    }
  };
  const markConversationAsRead = async (conversationId: string) => {
    try {
      await messageReadService.markConversationAsRead(Number(conversationId));

      // Optimistic UI: reset unread
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    } catch (err) {
      console.error("❌ markConversationAsRead failed", err);
    }
  };
  useEffect(() => {
    if (!activeConversationId) return;

    // Tìm conversation mới nhất trong danh sách
    const updatedConv = conversations.find(
      (c) => c.id === activeConversationId,
    );
    if (updatedConv && updatedConv !== activeConversation) {
      // Buộc cập nhật lại conversation đang mở
      setActiveConversationId(updatedConv.id);
    }
  }, [activeConversation, activeConversationId, conversations]);
  const {
    messages: hubMessages,
    isConnected,
    sendTextMessage,
    editMessage: hubEditMessage,
    hubPinMessage,
    hubRecallMessage,
    hubReactToMessage,
  } = useChat(API_BASE_URL);

  const filteredConversations = sortConversationsByLatest(
    conversations.filter((conversation) => {
      // ☁️ Cloud chat (self conversation)
      if (conversation.participants.length === 1) {
        return "cloud".includes(searchQuery.toLowerCase());
      }

      // Normal conversation
      const otherParticipant = conversation.participants.find(
        (p) => p.id !== currentUser?.id,
      );
      if (!otherParticipant || !otherParticipant.name) return false;

      return otherParticipant.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    }),
  );

  const handleSendMessage = async (
    content: string,
    replyTo?: Message | null,
    type?: "text" | "voice" | "location" | "video" | "image" | "file",
    voiceDuration?: number,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
  ) => {
    if (!activeConversationId) return;

    try {
      // Nếu có kết nối SignalR và type=text
      if (isConnected && type === "text") {
        await sendTextMessage(content, activeConversationId);
        return;
      }

      // Gửi voice hoặc fallback API
      const messageDto = {
        conversationId: parseInt(activeConversationId),
        content,
        messageType: type || "text",
        fileUrl,
        fileName,
        fileSize,
        duration: voiceDuration,

        replyToMessageId: replyTo ? parseInt(replyTo.id) : undefined,
      };

      const sentMessage = await messageService.sendMessage(messageDto);
      const mappedMessage = {
        ...mapMessageResponseToMessage(sentMessage),
        timestamp: sentMessage.createdAt
          ? parseTimestamp(sentMessage.createdAt)
          : new Date(),
      };

      setConversations((prev) =>
        sortConversationsByLatest(
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: mergeMessages(conv.messages, [mappedMessage]),
                  lastMessage: mappedMessage,
                }
              : conv,
          ),
        ),
      );
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    const prev = JSON.parse(JSON.stringify(conversations)) as Conversation[];

    setConversations((prevConvs) =>
      prevConvs.map(
        (conv): Conversation =>
          conv.id !== activeConversationId
            ? conv
            : {
                ...conv,
                messages: conv.messages.map(
                  (msg): Message =>
                    msg.id !== messageId
                      ? msg
                      : {
                          ...msg,
                          reactions: [
                            ...(msg.reactions || []),
                            {
                              id: crypto.randomUUID(), // ✅ string
                              emoji,
                              userId: currentUser.id,
                              username: currentUser.name,
                              createdAt: new Date().toISOString(), // ✅ string
                            },
                          ],
                        },
                ),
              },
      ),
    );

    try {
      if (isConnected && hubReactToMessage) {
        await hubReactToMessage(Number(messageId), emoji);
      } else {
        await messageService.reactToMessage(Number(messageId), { emoji });
      }
    } catch (err) {
      console.error(err);
      setConversations(prev); // rollback
    }
  };

  const handlePinMessage = async (
    messageId: string,
    isCurrentlyPinned: boolean,
  ) => {
    if (!activeConversationId) return;
    try {
      if (isConnected && hubPinMessage) {
        await hubPinMessage(Number(messageId), !isCurrentlyPinned);
      } else {
        await messageService.pinMessage(Number(messageId), {
          isPinned: !isCurrentlyPinned,
        });
      }

      // Update local state: add/remove from pinnedMessages array
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;

          const currentPinned = conv.pinnedMessages || [];
          const exists = currentPinned.includes(messageId);
          const newPinned = exists
            ? currentPinned.filter((id) => id !== messageId)
            : [...currentPinned, messageId];

          return {
            ...conv,
            pinnedMessages: newPinned,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to pin/unpin message:", error);
    }
  };
  const handleRecallMessage = async (messageId: string) => {
    if (!activeConversationId) return;

    try {
      // Prefer SignalR invoke when connected
      if (isConnected && hubRecallMessage) {
        await hubRecallMessage(Number(messageId));
      } else {
        // Gọi API để thu hồi
        await messageService.recallMessage(Number(messageId));
      }

      // Cập nhật state: đánh dấu message là đã thu hồi và cập nhật lastMessage nếu cần
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => {
          if (conversation.id !== activeConversationId) return conversation;

          const updatedMessages = conversation.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  isRecalled: true,
                  content: "Tin nhắn đã bị thu hồi",
                }
              : message,
          );

          // Tìm lastMessage hợp lệ (không phải bị thu hồi)
          const lastNonRecalled =
            [...updatedMessages].reverse().find((m) => !m.isRecalled) || null;

          return {
            ...conversation,
            messages: updatedMessages,
            lastMessage: lastNonRecalled || undefined,
          };
        }),
      );
    } catch (error) {
      console.error("Failed to recall message:", error);
      alert("Không thể thu hồi tin nhắn. Vui lòng thử lại.");
    }
  };
  const handleUnpinMessages = async (messageIds: string[]) => {
    if (!activeConversationId) return;

    // Snapshot để rollback nếu API fail
    const prevConversations = JSON.parse(
      JSON.stringify(conversations),
    ) as Conversation[];

    // Optimistic update: loại bỏ id khỏi pinnedMessages cục bộ
    setConversations((prevConversationsLocal) =>
      prevConversationsLocal.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              pinnedMessages: (conversation.pinnedMessages || []).filter(
                (id) => !messageIds.includes(id),
              ),
            }
          : conversation,
      ),
    );

    try {
      // Gọi API để bỏ ghim từng message
      await Promise.all(
        messageIds.map((id) =>
          messageService.pinMessage(Number(id), { isPinned: false }),
        ),
      );
      // Nếu backend broadcast qua SignalR thì client sẽ nhận event và đồng bộ nếu cần
    } catch (err) {
      console.error("Failed to unpin messages:", err);
      // Rollback UI
      setConversations(prevConversations);
      alert("Không thể bỏ ghim tin nhắn. Vui lòng thử lại.");
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    // Snapshot để rollback nếu API fail
    const prevConversations = JSON.parse(
      JSON.stringify(conversations),
    ) as Conversation[];

    // Optimistic update: cập nhật nội dung cục bộ và đánh dấu là đã edit
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversationId) return conv;

        const updatedMessages = conv.messages.map((message) => {
          if (message.id !== messageId) return message;
          return {
            ...message,
            editHistory: [
              ...(message.editHistory || []),
              { content: message.content, timestamp: message.timestamp },
            ],
            content: newContent,
            isEdited: true,
          };
        });

        const updatedLastMessage =
          conv.lastMessage?.id === messageId
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

    try {
      // Prefer hub invoke when available for faster realtime update
      if (isConnected && hubEditMessage) {
        await hubEditMessage(messageId, newContent);
      } else {
        await messageService.editMessage(Number(messageId), {
          newContent,
        });
      }
      // Nếu backend broadcast qua SignalR, server sẽ gửi event để đồng bộ thêm nếu cần
    } catch (err) {
      console.error("Failed to edit message:", err);
      // Rollback UI
      setConversations(prevConversations);
      alert("Không thể sửa tin nhắn. Vui lòng thử lại.");
    }
  };

  const handleSendFriendRequest = (userId: string) => {
    // In a real app, this would send a friend request to the server
    console.log("Sending friend request to user:", userId);
    // Show success message or notification
  };

  const handleUpdateNickname = async (
    userId: string,
    nickname: string | null,
  ) => {
    if (!activeConversationId) return;

    const prevConversations = [...conversations];

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== activeConversationId) return conversation;

        const updatedNicknames = { ...conversation.nicknames };
        if (nickname) {
          updatedNicknames[userId] = nickname;
        } else {
          delete updatedNicknames[userId];
        }

        return {
          ...conversation,
          nicknames: updatedNicknames,
        };
      }),
    );

    try {
      await conversationService.updateNickname(Number(activeConversationId), {
        nickname: nickname || null,
      });
      // Persist locally as a fallback so nickname remains after reload
      saveNicknameLocally(activeConversationId, userId, nickname || null);
    } catch (err) {
      console.error("Failed to update nickname:", err);
      // rollback
      setConversations(prevConversations);
      alert("Không thể cập nhật biệt danh. Vui lòng thử lại.");
    }
  };

  const handleAddFriend = (friend: User) => {
    if (!currentUser) return; // đảm bảo currentUser tồn tại
    // Create a new conversation with the friend
    const newConversation: Conversation = {
      id: `conv-${friend.id}`,
      participants: [currentUser, friend],
      messages: [],
      unreadCount: 0,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setShowAddFriend(false);
  };

  dayjs.extend(utc);
  dayjs.extend(timezone);

  useEffect(() => {
    if (!isConnected || !hubMessages.length || !currentUser) return;

    setConversations((prev) =>
      prev.map((conv) => {
        // All incoming hub items for this conversation
        const incoming = hubMessages
          .filter((m) => m.conversationId.toString() === conv.id)
          .map((m) => ({ ...m, timestamp: parseTimestamp(m.timestamp) }));

        if (!incoming.length) return conv;

        // New messages (not present locally) from other users
        const newMessages = incoming.filter(
          (m) =>
            !conv.messages.some((em) => em.id === m.id) &&
            m.senderId?.toString() !== currentUser.id?.toString(),
        );

        // Edited messages: incoming msg id exists locally but content differs
        const editedMessages = incoming.filter((m) =>
          conv.messages.some(
            (em) => em.id === m.id && em.content !== m.content,
          ),
        );

        let updatedMessages = conv.messages;

        if (newMessages.length) {
          updatedMessages = mergeMessages(updatedMessages, newMessages);
        }

        if (editedMessages.length) {
          const editedMap = new Map(editedMessages.map((m) => [m.id, m]));
          updatedMessages = updatedMessages.map((m) =>
            editedMap.has(m.id)
              ? { ...m, content: editedMap.get(m.id)!.content, isEdited: true }
              : m,
          );
        }

        const isActive = conv.id === activeConversationId;

        // Update lastMessage if it was edited or new messages arrived
        const lastMessage =
          updatedMessages.length > 0
            ? updatedMessages[updatedMessages.length - 1]
            : conv.lastMessage;

        return {
          ...conv,
          messages: updatedMessages,
          lastMessage,
          unreadCount: isActive
            ? 0
            : (conv.unreadCount || 0) + newMessages.length,
        };
      }),
    );
  }, [hubMessages, isConnected, activeConversationId, currentUser]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        setCurrentUser({
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatarUrl,
          isOnline: user.isOnline,
        });
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to get current user:", error);
        localStorage.removeItem("token");
      } finally {
        setIsLoadingUser(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      if (!isAuthenticated) return;

      setIsLoadingConversations(true);
      try {
        const conversationsData =
          await conversationService.getMyConversations();
        const mappedConversations = conversationsData.map(
          mapConversationResponseToConversation,
        );
        // Merge locally saved nicknames (fallback if server doesn't return them)
        const savedNicknames = loadSavedNicknames();
        const withNicknames = mappedConversations.map((conv) => ({
          ...conv,
          nicknames: {
            ...(conv.nicknames || {}),
            ...(savedNicknames[conv.id] || {}),
          },
        }));
        // Remove lastMessage if it is before the user's cleared timestamp
        const adjusted = mappedConversations.map((conv) => {
          const cleared = getClearedAt(conv.id);
          if (!cleared) return conv;
          if (!conv.lastMessage) return conv;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lastTs = new Date((conv.lastMessage as any).timestamp);
          if (lastTs <= cleared) {
            return { ...conv, lastMessage: undefined, unreadCount: 0 };
          }
          return conv;
        });

        setConversations(
          adjusted.map((conv) => {
            const mergedNicknames =
              withNicknames.find((c) => c.id === conv.id)?.nicknames ||
              conv.nicknames ||
              {};

            const participants = (conv.participants || []).map((p) => ({
              ...p,
              name: mergedNicknames[p.id] || p.name,
            }));

            return {
              ...conv,
              nicknames: mergedNicknames,
              participants,
            };
          }),
        );

        if (mappedConversations.length > 0 && !activeConversationId) {
          setActiveConversationId(mappedConversations[0].id);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [activeConversationId, isAuthenticated]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) return;

      try {
        const messages = await messageService.getMessages(
          parseInt(activeConversationId),
        );
        const mappedMessages = messages.map(mapMessageResponseToMessage);

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== activeConversationId) return conv;

            const cleared = getClearedAt(activeConversationId);

            const filteredMapped = cleared
              ? mappedMessages.filter((m) => new Date(m.timestamp) > cleared)
              : mappedMessages;

            const existingFiltered = conv.messages.filter(
              (m) =>
                !mappedMessages.some((msg) => msg.id === m.id) &&
                (!cleared || new Date(m.timestamp) > cleared),
            );

            const allMessages = [...filteredMapped, ...existingFiltered];

            // Sắp xếp theo timestamp nếu cần
            allMessages.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            );

            return {
              ...conv,
              messages: allMessages,
              lastMessage: allMessages[allMessages.length - 1],
            };
          }),
        );
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();
  }, [activeConversationId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRegister = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(currentUser);
      setConversations([]);
      setActiveConversationId("");
    }
  };

  const handleUpdateProfile = (updatedUser: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev!, ...updatedUser }));
  };

  const handleBlockUser = async (
    conversationId: string,
    targetUserId: string,
  ) => {
    const prev = JSON.parse(JSON.stringify(conversations)) as Conversation[];

    setConversations((prevConvs) =>
      prevConvs.map((conv) =>
        conv.id === conversationId ? { ...conv, isBlocked: true } : conv,
      ),
    );

    try {
      await conversationService.blockUser(Number(targetUserId));
    } catch (err) {
      console.error("Failed to block user:", err);
      setConversations(prev);
      alert("Không thể chặn người dùng. Vui lòng thử lại.");
    }
  };

  const handleUnblockUser = async (
    conversationId: string,
    targetUserId: string,
  ) => {
    const prev = JSON.parse(JSON.stringify(conversations)) as Conversation[];

    setConversations((prevConvs) =>
      prevConvs.map((conv) =>
        conv.id === conversationId ? { ...conv, isBlocked: false } : conv,
      ),
    );

    try {
      await conversationService.unblockUser(Number(targetUserId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
      setConversations(prev);
      alert("Không thể bỏ chặn. Vui lòng thử lại.");
    }
  };

  const handleClearConversation = async (conversationId: string) => {
    const prev = JSON.parse(JSON.stringify(conversations)) as Conversation[];

    setConversations((prevConvs) =>
      prevConvs.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [], lastMessage: undefined, unreadCount: 0 }
          : conv,
      ),
    );

    try {
      await conversationService.clearConversation(Number(conversationId));
      // Persist cleared timestamp so reload respects the clear
      setClearedAt(conversationId, new Date());
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      setConversations(prev);
      alert("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const handleAnswerCall = () => {
    setCallStatus("inCall");
  };

  const handleRejectCall = () => {
    setCallStatus("missed");
    setTimeout(() => {
      setCallStatus("idle");
      setCallCaller(null);
    }, 3000);
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    setTimeout(() => {
      setCallStatus("idle");
      setCallCaller(null);
    }, 3000);
  };

  const handleSendMissedCallMessage = () => {
    if (!callCaller) return;

    const missedCallMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: "system",
      conversationId: "",
      content: `Bạn có cuộc gọi nhỡ từ ${callCaller.name}`,
      timestamp: new Date(),
      isRead: false,
      type: "text",
    };

    const targetConversation = conversations.find((c) =>
      c.participants.some((p) => p.id === callCaller.id),
    );

    if (targetConversation) {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) =>
          conversation.id === targetConversation.id
            ? {
                ...conversation,
                messages: [...conversation.messages, missedCallMessage],
                lastMessage: missedCallMessage,
              }
            : conversation,
        ),
      );
    }

    setCallStatus("idle");
    setCallCaller(null);
  };

  // Fetch pinned messages for a conversation and populate conversation state
  const handleViewPinnedMessages = async (conversationId: string) => {
    try {
      const pinned = await messageService.getPinnedMessages(
        parseInt(conversationId),
      );

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== conversationId) return conv;

          const pinnedIds = pinned.map((p) => p.messageId.toString());

          // Map pinned responses to Message objects (avoid duplicates)
          const pinnedMessagesMapped = pinned.map((p) => {
            const sender =
              conv.participants.find((pt) => pt.name === p.senderName) || null;
            return {
              id: p.messageId.toString(),
              senderId: sender ? sender.id : "unknown",
              conversationId: conv.id,
              content: p.content,
              timestamp: parseTimestamp(p.pinnedAt),
              isRead: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: (p.messageType as any) || "text",
              // keep other optional fields empty (fileUrl, etc.)
            } as Message;
          });

          // Merge into messages (avoid duplicates by id)
          const existingIds = new Set(conv.messages.map((m) => m.id));
          const mergedMessages = [
            ...conv.messages,
            ...pinnedMessagesMapped.filter((m) => !existingIds.has(m.id)),
          ].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

          return {
            ...conv,
            pinnedMessages: pinnedIds,
            messages: mergedMessages,
          };
        }),
      );

      setShowPinnedMessages(true);
    } catch (err) {
      console.error("Failed to load pinned messages:", err);
      alert("Không thể tải danh sách tin nhắn đã ghim.");
    }
  };

  if (isVerifyEmailPage) {
    return <VerifyEmailPage />;
  }
  if (isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authMode === "login") {
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={() => setAuthMode("register")}
        />
      );
    } else {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      );
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 max-w-sm bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowUserProfile(true)}>
                {currentUser && <UserAvatar user={currentUser} size="md" />}
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Messages</h1>
                <p className="text-sm text-gray-500">Stay connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddFriend(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
                title="Add Friend"
              >
                <UserPlus className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-white bg-gray-600 rounded-full p-1" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-48 z-50">
                    <button
                      onClick={() => {
                        setShowUserProfile(true);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <Settings className="w-4 h-4 text-gray-600 mr-3" />
                      <span className="text-gray-700">Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <LogOut className="w-4 h-4 text-red-600 mr-3" />
                      <span className="text-red-600">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search conversations..."
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {currentUser && (
            <ConversationList
              conversations={filteredConversations}
              currentUser={currentUser}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                markConversationAsRead(id); // 👈 QUAN TRỌNG
              }}
              activeTab={activeTab}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation && currentUser ? (
          <ChatWindow
            conversation={activeConversation}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onToggleInfo={() => setShowConversationInfo(!showConversationInfo)}
            onAddReaction={handleAddReaction}
            onPinMessage={handlePinMessage}
            onRecallMessage={handleRecallMessage}
            onEditMessage={handleEditMessage}
            onUnblockUser={() => {
              const otherUser = activeConversation.participants.find(
                (p) => p.id !== currentUser?.id,
              );
              if (otherUser)
                handleUnblockUser(activeConversation.id, otherUser.id);
            }}
            onStartCall={(type) => {
              const otherUser = activeConversation.participants.find(
                (p) => p.id !== currentUser?.id,
              );
              if (otherUser) {
                setCallCaller(otherUser);
                setCallType(type === "audio" ? "voice" : "video");
                setCallStatus("incoming");
              }
            }}
            jumpToMessageId={jumpToMessageId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">
                Welcome to Messenger
              </h2>
              <p className="text-gray-500">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Info Sidebar */}
      {activeConversation && currentUser && (
        <ConversationInfoSidebar
          conversation={activeConversation}
          currentUser={currentUser}
          isOpen={showConversationInfo}
          onClose={() => setShowConversationInfo(false)}
          onSendFriendRequest={handleSendFriendRequest}
          onUpdateNickname={handleUpdateNickname}
          onBlockUser={(targetUserId) =>
            handleBlockUser(activeConversation.id, targetUserId)
          }
          onUnblockUser={(targetUserId) =>
            handleUnblockUser(activeConversation.id, targetUserId)
          }
          onClearConversation={(conversationId) =>
            handleClearConversation(conversationId)
          }
          onViewPinnedMessages={() =>
            handleViewPinnedMessages(activeConversation.id)
          }
          onSelectMessage={(messageId) => {
            setJumpToMessageId(messageId);
            setTimeout(() => setJumpToMessageId(null), 4000);
          }}
        />
      )}

      {/* Pinned Messages Page */}
      {activeConversation && currentUser && (
        <PinnedMessagesPage
          isOpen={showPinnedMessages}
          onClose={() => setShowPinnedMessages(false)}
          conversation={activeConversation}
          currentUser={currentUser}
          onUnpinMessages={handleUnpinMessages}
          onAddReaction={handleAddReaction}
          onRecallMessage={handleRecallMessage}
          onEditMessage={handleEditMessage}
        />
      )}

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onAddFriend={handleAddFriend}
      />

      {/* User Profile Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          user={currentUser}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Call Screen */}
      {callCaller && (
        <CallScreen
          status={callStatus}
          callType={callType}
          caller={callCaller}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
          onEndCall={handleEndCall}
          onSendMissedCallMessage={handleSendMissedCallMessage}
        />
      )}
    </div>
  );
}

export default App;
