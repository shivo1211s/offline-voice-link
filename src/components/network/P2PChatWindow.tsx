import { useState, useRef, useEffect, useCallback } from 'react';
import { Peer, P2PMessage } from '@/types/p2p';
import { LocalProfile } from '@/types/p2p';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Phone, Send, ArrowLeft, MoreVertical, Check, CheckCheck, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getMessages } from '@/lib/storage';

interface P2PChatWindowProps {
  currentProfile: LocalProfile;
  peer: Peer;
  onBack: () => void;
  onCall: () => void;
  sendMessage: (receiverId: string, content: string) => Promise<P2PMessage>;
  sendTyping: (receiverId: string, isTyping: boolean) => void;
  markAsSeen: (messageIds: string[], senderId: string) => void;
  isPartnerTyping: boolean;
  newMessage?: P2PMessage;
}

export function P2PChatWindow({
  currentProfile,
  peer,
  onBack,
  onCall,
  sendMessage,
  sendTyping,
  markAsSeen,
  isPartnerTyping,
  newMessage,
}: P2PChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages from IndexedDB
  useEffect(() => {
    loadMessages();
  }, [currentProfile.id, peer.id]);

  // Handle new incoming messages
  useEffect(() => {
    if (newMessage && 
        ((newMessage.senderId === peer.id && newMessage.receiverId === currentProfile.id) ||
         (newMessage.senderId === currentProfile.id && newMessage.receiverId === peer.id))) {
      setMessages(prev => {
        const exists = prev.find(m => m.id === newMessage.id);
        if (exists) {
          return prev.map(m => m.id === newMessage.id ? newMessage : m);
        }
        return [...prev, newMessage];
      });
    }
  }, [newMessage, peer.id, currentProfile.id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await getMessages(currentProfile.id, peer.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPartnerTyping]);

  // Mark messages as seen
  useEffect(() => {
    const unreadMessages = messages
      .filter((m) => m.receiverId === currentProfile.id && m.status !== 'seen')
      .map((m) => m.id);

    if (unreadMessages.length > 0) {
      markAsSeen(unreadMessages, peer.id);
    }
  }, [messages, currentProfile.id, peer.id, markAsSeen]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    
    const content = messageInput.trim();
    setMessageInput('');
    sendTyping(peer.id, false);
    
    try {
      const sentMessage = await sendMessage(peer.id, content);
      setMessages(prev => [...prev, sentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    sendTyping(peer.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(peer.id, false);
    }, 3000);
  };

  const getStatusIcon = (status: P2PMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'seen':
        return <CheckCheck className="w-3 h-3 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border glass-panel">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="relative">
          <Avatar className="w-10 h-10 border-2 border-background">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {peer.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {peer.isOnline && (
            <span className="absolute bottom-0 right-0 online-indicator w-2.5 h-2.5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {peer.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPartnerTyping
              ? 'typing...'
              : peer.isOnline
              ? `Online • ${peer.ip}`
              : `Last seen ${formatDistanceToNow(peer.lastSeen, { addSuffix: true })}`}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            disabled={!peer.isOnline}
            className="rounded-xl hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Say hello to {peer.username}!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentProfile.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    message.senderId === currentProfile.id
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      message.senderId === currentProfile.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className={`text-[10px] ${
                      message.senderId === currentProfile.id 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {format(message.timestamp, 'HH:mm')}
                    </span>
                    {message.senderId === currentProfile.id && getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isPartnerTyping && <TypingIndicator />}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border glass-panel">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 h-12 rounded-xl bg-secondary/50 border-border focus:border-primary"
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:shadow-glow"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
