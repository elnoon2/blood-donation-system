import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../../lib/api';
import { toast } from 'sonner';

interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId: number;
  content: string;
  senderName?: string;
  timestamp?: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (receiverId: number, content: string) => void;
  activeChatUser: { id: number; name: string } | null;
  openChat: (user: { id: number; name: string }) => void;
  closeChat: () => void;
  isConnected: boolean;
  subscribe: (topic: string, callback: (message: any) => void) => () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<{ id: number; name: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef<Client | null>(null);

  const activeChatUserRef = useRef<{ id: number; name: string } | null>(null);

  useEffect(() => {
    activeChatUserRef.current = activeChatUser;
  }, [activeChatUser]);

  const connect = useCallback(() => {
    if (!user || !token || stompClientRef.current?.connected) return;

    // Use dynamic API_BASE_URL for WebSocket as well
    const socketUrl = `${API_BASE_URL.replace('/api', '')}/ws-chat`;
    const socket = new SockJS(socketUrl);
    
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('STOMP: ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    client.onConnect = (frame) => {
      console.log('Connected to WebSocket:', frame);
      setIsConnected(true);
      
      // Subscribe to private queue - Spring handles the /user prefix resolution
      client.subscribe('/user/queue/messages', (message: IMessage) => {
        try {
          const newMessage = JSON.parse(message.body);
          console.log('STOMP DEBUG: Received incoming message:', newMessage);
          
          setMessages((prev) => {
            // Check if message already exists (to avoid duplicate from mirror if we updated optimistically)
            const exists = prev.some(m => 
              (m.id && m.id === newMessage.id) || 
              (m.content === newMessage.content && m.senderId === newMessage.senderId && Math.abs(new Date(m.timestamp || 0).getTime() - new Date(newMessage.timestamp || 0).getTime()) < 5000)
            );
            if (exists) return prev;
            return [...prev, newMessage];
          });

          // Show notification if it's an incoming message and not the currently active chat
          const isMe = newMessage.senderId === user.id;
          const isActive = activeChatUserRef.current?.id === newMessage.senderId;

          if (!isMe && !isActive) {
            toast.message(`New from ${newMessage.senderName || 'Donor'}`, {
              description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
              action: {
                label: 'Open',
                onClick: () => openChat({ id: newMessage.senderId, name: newMessage.senderName || 'Donor' }),
              },
            });
          }
        } catch (e) {
          console.error('Failed to parse incoming message', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
      setIsConnected(false);
    };

    client.onWebSocketClose = (event) => {
      console.warn('WebSocket connection closed', event);
      setIsConnected(false);
    };

    client.onWebSocketError = (event) => {
      console.error('WebSocket error occurred', event);
      setIsConnected(false);
    };

    client.activate();
    stompClientRef.current = client;
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      stompClientRef.current?.deactivate();
      setIsConnected(false);
    }

    return () => {
      stompClientRef.current?.deactivate();
    };
  }, [user, token, connect]);

  const sendMessage = (receiverId: number, content: string) => {
    if (stompClientRef.current?.connected && user) {
      const chatMessage: ChatMessage = {
        senderId: user.id,
        receiverId,
        content,
        timestamp: new Date().toISOString()
      };
      
      // Optimistic update
      setMessages((prev) => [...prev, chatMessage]);

      stompClientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(chatMessage),
      });
    }
  };

  const openChat = (targetUser: { id: number; name: string }) => {
    setActiveChatUser(targetUser);
  };

  const closeChat = () => {
    setActiveChatUser(null);
  };

  const subscribe = useCallback((topic: string, callback: (message: any) => void) => {
    if (stompClientRef.current?.connected) {
      const subscription = stompClientRef.current.subscribe(topic, (msg) => {
        try {
            callback(JSON.parse(msg.body));
        } catch (e) {
            callback(msg.body);
        }
      });
      return () => subscription.unsubscribe();
    }
    return () => {};
  }, []);

  return (
    <ChatContext.Provider value={{ messages, sendMessage, activeChatUser, openChat, closeChat, isConnected, subscribe }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
