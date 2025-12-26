import { MessageSquare, Wifi } from 'lucide-react';

export function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-center p-8">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center animate-float">
          <MessageSquare className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-soft">
          <Wifi className="w-5 h-5 text-secondary-foreground" />
        </div>
      </div>
      
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">
        Start a Conversation
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Select a contact from the list to start chatting. All messages work over your local WiFi network.
      </p>
    </div>
  );
}
