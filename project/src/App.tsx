import { useState, useEffect } from 'react';
import type { Conversation, Message, User } from './types';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { UserProfileModal } from './components/UserProfileModal';
import { ConversationList } from './components/ConversationList';
import { ChatWindow } from './components/ChatWindow';
import { ConversationInfoSidebar } from './components/ConversationInfoSidebar';
import { AddFriendModal } from './components/AddFriendModal';
import { CallScreen } from './components/CallScreen';
import { SearchBar } from './components/SearchBar';
import { UserAvatar } from './components/UserAvatar';
import { MessageSquare, Settings, UserPlus, LogOut } from 'lucide-react';
import { conversationService } from './services/conversationService';
import { messageService } from './services/messageService';
import { authService } from './services/authService';
import { mapConversationResponseToConversation, mapMessageResponseToMessage } from './utils/mappers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'inCall' | 'missed' | 'ended'>('idle');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callCaller, setCallCaller] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = conversation.participants.find(p => p.id !== currentUser?.id);
    return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendMessage = async (content: string, replyTo?: Message, type?: 'text' | 'voice', voiceDuration?: number) => {
    if (!activeConversationId) return;

    try {
      const messageDto = {
        conversationId: parseInt(activeConversationId),
        content,
        messageType: type || 'text',
        duration: voiceDuration,
        replyToMessageId: replyTo ? parseInt(replyTo.id) : undefined,
      };

      const sentMessage = await messageService.sendMessage(messageDto);
      const mappedMessage = mapMessageResponseToMessage(sentMessage);

      setConversations(prevConversations =>
        prevConversations.map(conversation =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, mappedMessage],
                lastMessage: mappedMessage,
              }
            : conversation
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setConversations(prevConversations =>
      prevConversations.map(conversation =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === messageId
                  ? {
                      ...message,
                      reactions: message.reactions
                        ? message.reactions.some(r => r.emoji === emoji)
                          ? message.reactions.map(r =>
                              r.emoji === emoji
                                ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] }
                                : r
                            )
                          : [...message.reactions, { emoji, count: 1, users: [currentUser.id] }]
                        : [{ emoji, count: 1, users: [currentUser.id] }]
                    }
                  : message
              )
            }
          : conversation
      )
    );
  };

  const handlePinMessage = (messageId: string) => {
    if (!activeConversationId) return;

    setConversations(prevConversations =>
      prevConversations.map(conversation =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              pinnedMessages: conversation.pinnedMessages?.includes(messageId)
                ? conversation.pinnedMessages.filter(id => id !== messageId)
                : [...(conversation.pinnedMessages || []), messageId]
            }
          : conversation
      )
    );
  };

  const handleRecallMessage = (messageId: string) => {
    if (!activeConversationId) return;

    setConversations(prevConversations =>
      prevConversations.map(conversation =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: conversation.messages.filter(message => message.id !== messageId)
            }
          : conversation
      )
    );
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversationId) return;

    setConversations(prevConversations =>
      prevConversations.map(conversation =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === messageId
                  ? {
                      ...message,
                      content: newContent,
                      isEdited: true,
                      editHistory: [
                        ...(message.editHistory || []),
                        { content: message.content, timestamp: message.timestamp }
                      ]
                    }
                  : message
              )
            }
          : conversation
      )
    );
  };

  const handleSendFriendRequest = (userId: string) => {
    // In a real app, this would send a friend request to the server
    console.log('Sending friend request to user:', userId);
    // Show success message or notification
  };

  const handleUpdateNickname = (userId: string, nickname: string) => {
    if (!activeConversationId) return;

    setConversations(prevConversations =>
      prevConversations.map(conversation =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              nicknames: {
                ...conversation.nicknames,
                [userId]: nickname
              }
            }
          : conversation
      )
    );
  };

  const handleAddFriend = (friend: User) => {
    // Create a new conversation with the friend
    const newConversation: Conversation = {
      id: `conv-${friend.id}`,
      participants: [currentUser, friend],
      messages: [],
      unreadCount: 0,
    };

    setConversations(prev => [newConversation, ...prev]);
    setShowAddFriend(false);
  };


  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        setCurrentUser({
          id: user.id.toString(),
          name: user.displayName,
          email: user.email,
          avatar: user.avatarUrl,
          isOnline: user.isOnline,
          lastSeen: new Date(user.lastSeenAt),
          status: user.bio || ''
        });
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to get current user:', error);
        localStorage.removeItem('token');
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
        const conversationsData = await conversationService.getMyConversations();
        const mappedConversations = conversationsData.map(mapConversationResponseToConversation);
        setConversations(mappedConversations);

        if (mappedConversations.length > 0 && !activeConversationId) {
          setActiveConversationId(mappedConversations[0].id);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) return;

      try {
        const messages = await messageService.getMessages(parseInt(activeConversationId));
        const mappedMessages = messages.map(mapMessageResponseToMessage);

        setConversations(prev =>
          prev.map(conv =>
            conv.id === activeConversationId
              ? { ...conv, messages: mappedMessages }
              : conv
          )
        );
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [activeConversationId]);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleRegister = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setConversations([]);
      setActiveConversationId('');
    }
  };

  const handleUpdateProfile = async (updatedUser: Partial<typeof currentUser>) => {
    setCurrentUser(prev => ({ ...prev, ...updatedUser }));
  };


  const handleBlockUser = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, isBlocked: true }
          : conv
      )
    );
  };

  const handleUnblockUser = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, isBlocked: false }
          : conv
      )
    );
  };

  const handleAnswerCall = () => {
    setCallStatus('inCall');
  };

  const handleRejectCall = () => {
    setCallStatus('missed');
    setTimeout(() => {
      setCallStatus('idle');
      setCallCaller(null);
    }, 3000);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      setCallCaller(null);
    }, 3000);
  };

  const handleSendMissedCallMessage = () => {
    if (!callCaller) return;

    const missedCallMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'system',
      content: `Bạn có cuộc gọi nhỡ từ ${callCaller.name}`,
      timestamp: new Date(),
      isRead: false,
      type: 'text',
    };

    const targetConversation = conversations.find(c =>
      c.participants.some(p => p.id === callCaller.id)
    );

    if (targetConversation) {
      setConversations(prevConversations =>
        prevConversations.map(conversation =>
          conversation.id === targetConversation.id
            ? {
                ...conversation,
                messages: [...conversation.messages, missedCallMessage],
                lastMessage: missedCallMessage,
              }
            : conversation
        )
      );
    }

    setCallStatus('idle');
    setCallCaller(null);
  };

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
    if (authMode === 'login') {
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={() => setAuthMode('register')}
        />
      );
    } else {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthMode('login')}
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
              onSelectConversation={setActiveConversationId}
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
            onUnblockUser={() => handleUnblockUser(activeConversation.id)}
            onStartCall={(type) => {
              const otherUser = activeConversation.participants.find(p => p.id !== currentUser?.id);
              if (otherUser) {
                setCallCaller(otherUser);
                setCallType(type === 'audio' ? 'voice' : 'video');
                setCallStatus('incoming');
              }
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">Welcome to Messenger</h2>
              <p className="text-gray-500">Select a conversation to start chatting</p>
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
          onBlockUser={() => handleBlockUser(activeConversation.id)}
          onUnblockUser={() => handleUnblockUser(activeConversation.id)}
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