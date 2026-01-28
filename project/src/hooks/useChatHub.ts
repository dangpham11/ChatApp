import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';

interface SignalRMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  messageType?: 'text' | 'voice' | 'image' | 'file' | 'location';
  voiceDuration?: number;
  voiceUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface UseChatHubReturn {
  messages: Message[];
  isConnected: boolean;
  sendTextMessage: (content: string, receiverId: string) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob, receiverId: string) => Promise<void>;
  addMessage: (message: Message) => void;
}

export const useChatHub = (apiBaseUrl: string): UseChatHubReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connectToHub = useCallback(async () => {
    try {
      const HubConnectionBuilder = (window as any).signalR?.HubConnectionBuilder;

      if (!HubConnectionBuilder) {
        console.warn('SignalR library not loaded, using mock connection');
        setIsConnected(true);
        return;
      }

      const connection = new HubConnectionBuilder()
        .withUrl(`${apiBaseUrl}/chathub`)
        .withAutomaticReconnect()
        .build();

      connection.on('ReceivePrivateMessage', (message: SignalRMessage) => {
        (async () => {
          const newMessage: Message = {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            timestamp: new Date(message.timestamp),
            isRead: false,
            type: message.messageType || 'text',
            voiceDuration: message.voiceDuration,
          };

          if (message.messageType === 'voice' && message.voiceUrl) {
            newMessage.content = message.voiceUrl;
          }

          if (message.messageType === 'location' && message.location) {
            newMessage.location = message.location;
          }

          setMessages((prev) => [...prev, newMessage]);
        })();
      });

      connection.on('LocationExpired', (messageId: string) => {
        (async () => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        })();
      });

      await connection.start();
      connectionRef.current = connection;
      setIsConnected(true);
      console.log('Connected to SignalR Hub');
    } catch (error) {
      console.error('Error connecting to SignalR Hub:', error);
      setIsConnected(false);

      reconnectTimeoutRef.current = setTimeout(() => {
        connectToHub();
      }, 5000);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    connectToHub();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [connectToHub]);

  const sendTextMessage = async (content: string, receiverId: string): Promise<void> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/Messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          receiverId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();

      const newMessage: Message = {
        id: result.id || Date.now().toString(),
        senderId: 'current-user',
        content,
        timestamp: new Date(),
        isRead: false,
        type: 'text',
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, receiverId: string): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('AudioFile', audioBlob, 'voice-message.webm');
      formData.append('ReceiverId', receiverId);

      const response = await fetch(`${apiBaseUrl}/api/Messages/send-voice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send voice message');
      }

      const result = await response.json();

      const audioUrl = URL.createObjectURL(audioBlob);

      const newMessage: Message = {
        id: result.id || Date.now().toString(),
        senderId: 'current-user',
        content: audioUrl,
        timestamp: new Date(),
        isRead: false,
        type: 'voice',
        voiceDuration: result.duration || 0,
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  return {
    messages,
    isConnected,
    sendTextMessage,
    sendVoiceMessage,
    addMessage,
  };
};
