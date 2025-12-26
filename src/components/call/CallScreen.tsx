import { useState, useEffect } from 'react';
import { Profile } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface CallScreenProps {
  contact: Profile;
  isIncoming: boolean;
  onEnd: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export function CallScreen({ contact, isIncoming, onEnd, onAccept, onReject }: CallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'active'>(
    isIncoming ? 'ringing' : 'ringing'
  );

  // Simulate call connection after 2 seconds for outgoing calls
  useEffect(() => {
    if (!isIncoming) {
      const timer = setTimeout(() => {
        setCallStatus('active');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isIncoming]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== 'active') return;
    
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setCallStatus('active');
    onAccept?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center animate-scale-in">
        {/* Avatar with pulse effect */}
        <div className="relative mb-8">
          {callStatus === 'ringing' && (
            <div className="absolute inset-0 rounded-full animate-pulse-ring" />
          )}
          <Avatar className="w-32 h-32 border-4 border-primary/20">
            <AvatarImage src={contact.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">
              {contact.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Contact info */}
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          {contact.username}
        </h2>
        <p className="text-muted-foreground mb-8">
          {callStatus === 'ringing'
            ? isIncoming
              ? 'Incoming call...'
              : 'Calling...'
            : formatDuration(callDuration)}
        </p>

        {/* Controls */}
        {callStatus === 'active' ? (
          <div className="flex items-center gap-6">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-2xl ${isMuted ? 'bg-destructive text-destructive-foreground' : ''}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            
            <Button
              onClick={onEnd}
              className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-14 h-14 rounded-2xl ${isSpeakerOn ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>
          </div>
        ) : isIncoming ? (
          <div className="flex items-center gap-8">
            <Button
              onClick={onReject}
              className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            
            <Button
              onClick={handleAccept}
              className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
        )}
      </div>
    </div>
  );
}
