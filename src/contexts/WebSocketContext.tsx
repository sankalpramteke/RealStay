import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
};

type WebSocketContextType = {
  messages: Message[];
  sendMessage: (receiverId: string, content: string) => void;
  markAsRead: (messageId: string) => void;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // In development, use a local WebSocket server
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `wss://api.realstay.com/ws?token=${user.id}`
      : 'ws://localhost:3001';

    // Get the Supabase session token
    const getSessionToken = async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    };

    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate with the WebSocket server
      if (ws.readyState === WebSocket.OPEN) {
        const token = await getSessionToken();
        ws.send(JSON.stringify({
          type: 'AUTH',
          userId: user.id,
          token: token
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'MESSAGE') {
          setMessages(prev => [
            ...prev,
            {
              id: data.id,
              senderId: data.senderId,
              receiverId: data.receiverId,
              content: data.content,
              timestamp: new Date(data.timestamp),
              read: false
            }
          ]);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        setSocket(new WebSocket(wsUrl));
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    // Clean up on unmount
    return () => {
      ws.close();
    };
  }, [user]);

  const sendMessage = (receiverId: string, content: string) => {
    if (!socket || !user) return;

    const message = {
      type: 'MESSAGE',
      senderId: user.id,
      receiverId,
      content,
      timestamp: new Date().toISOString()
    };

    socket.send(JSON.stringify(message));

    // Optimistically add the message to the local state
    setMessages(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        receiverId,
        content,
        timestamp: new Date(),
        read: false
      }
    ]);
  };

  const markAsRead = (messageId: string) => {
    if (!socket) return;

    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );

    // Notify the server that the message was read
    socket.send(JSON.stringify({
      type: 'MESSAGE_READ',
      messageId
    }));
  };

  return (
    <WebSocketContext.Provider value={{ messages, sendMessage, markAsRead, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
