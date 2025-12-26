import { Message } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const StatusIcon = () => {
    if (!isSent) return null;
    
    switch (message.status) {
      case 'seen':
        return <CheckCheck className="w-4 h-4 text-primary" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Check className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-slide-up`}
    >
      <div
        className={`max-w-[75%] ${
          isSent ? 'message-bubble-sent' : 'message-bubble-received'
        }`}
      >
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
        
        <div
          className={`flex items-center gap-1 mt-1 ${
            isSent ? 'justify-end' : 'justify-start'
          }`}
        >
          <span
            className={`text-xs ${
              isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          <StatusIcon />
        </div>
      </div>
    </div>
  );
}
