import { useState, useRef, useEffect } from 'react';
import { Profile, Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Phone, Send, ArrowLeft, MoreVertical } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';
import { formatDistanceToNow } from 'date-fns';

interface ChatWindowProps {
  currentProfile: Profile;
  chatPartner: Profile;
  onBack: () => void;
  onCall: () => void;
}

export function ChatWindow({ currentProfile, chatPartner, onBack, onCall }: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading, sendMessage, markAsSeen } = useMessages(
    currentProfile.id,
    chatPartner.id
  );
  
  const { isPartnerTyping, setTyping } = useTyping(
    currentProfile.id,
    chatPartner.id
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPartnerTyping]);

  // Mark messages as seen when viewing
  useEffect(() => {
    const unreadMessages = messages
      .filter((m) => m.receiver_id === currentProfile.id && m.status !== 'seen')
      .map((m) => m.id);

    if (unreadMessages.length > 0) {
      markAsSeen(unreadMessages);
    }
  }, [messages, currentProfile.id, markAsSeen]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    
    const content = messageInput.trim();
    setMessageInput('');
    setTyping(false);
    
    await sendMessage(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    setTyping(true);
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
            <AvatarImage src={chatPartner.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {chatPartner.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {chatPartner.is_online && (
            <span className="absolute bottom-0 right-0 online-indicator w-2.5 h-2.5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {chatPartner.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPartnerTyping
              ? 'typing...'
              : chatPartner.is_online
              ? 'Online'
              : `Last seen ${formatDistanceToNow(new Date(chatPartner.last_seen), { addSuffix: true })}`}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="rounded-xl hover:bg-primary/10 hover:text-primary"
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
              <p className="text-xs mt-1">Say hello to {chatPartner.username}!</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSent={message.sender_id === currentProfile.id}
              />
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
