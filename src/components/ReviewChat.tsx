import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sender: 'user' | 'guest';
  content: string;
  timestamp: Date;
}

interface ReviewChatProps {
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewChat({ 
  reviewerId, 
  reviewerName, 
  reviewerAvatar, 
  isOpen, 
  onClose 
}: ReviewChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages: allMessages, sendMessage: sendWebSocketMessage } = useWebSocket();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  // Filter messages for this conversation
  useEffect(() => {
    if (!isOpen) return;
    
    // Filter messages between current user and the reviewer
    const filtered = allMessages.filter(
      msg => 
        (msg.senderId === user?.id && msg.receiverId === reviewerId) ||
        (msg.senderId === reviewerId && msg.receiverId === user?.id)
    );
    
    // Add sample messages if no messages exist yet
    if (filtered.length === 0 && isOpen) {
      setConversationMessages([
        {
          id: 'welcome-1',
          sender: 'guest',
          content: `Hi there! I stayed at this hotel last month. How can I help you?`,
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: 'welcome-2',
          sender: 'guest',
          content: `Feel free to ask me anything about my stay!`,
          timestamp: new Date(Date.now() - 3500000)
        }
      ]);
    } else {
      // Map WebSocket messages to our local message format
      const mappedMessages: Message[] = filtered.map(msg => ({
        id: msg.id,
        sender: msg.senderId === user?.id ? 'user' : 'guest',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
      
      setConversationMessages(mappedMessages);
    }
  }, [allMessages, isOpen, reviewerId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    
    try {
      setIsSending(true);
      
      // Send the message via WebSocket
      await sendWebSocketMessage(reviewerId, message);
      
      // Clear the input field
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="h-[500px] flex flex-col">
        <CardHeader className="bg-primary/10 p-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={reviewerAvatar} />
              <AvatarFallback>{reviewerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">Chat with {reviewerName}</CardTitle>
              <p className="text-xs text-muted-foreground">Verified Guest</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversationMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 border-t">
          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              size="icon"
            >
              {isSending ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function AskGuestButton({ reviewerId, reviewerName, reviewerAvatar }: { 
  reviewerId: string; 
  reviewerName: string; 
  reviewerAvatar?: string; 
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  return (
    <>
      <div className="mt-3">
        <Button 
          variant="default" 
          size="sm" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 px-3 rounded-md shadow-sm flex items-center justify-center"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          <span>Ask {reviewerName.split(' ')[0]} about their stay</span>
        </Button>
      </div>
      
      <ReviewChat
        reviewerId={reviewerId}
        reviewerName={reviewerName}
        reviewerAvatar={reviewerAvatar}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
}
