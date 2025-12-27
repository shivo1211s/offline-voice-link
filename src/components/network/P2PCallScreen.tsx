import { useState, useEffect, useCallback, useRef } from 'react';
import { Peer } from '@/types/p2p';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface P2PCallScreenProps {
  peer: Peer;
  isIncoming: boolean;
  onEnd: () => void;
  onAccept: () => void;
  onReject: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  error?: string | null;
}

export function P2PCallScreen({
  peer,
  isIncoming,
  onEnd,
  onAccept,
  onReject,
  localStream,
  remoteStream,
  error,
}: P2PCallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(!isIncoming);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach streams to audio elements with proper logging
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      console.log('[P2PCallScreen] Attaching local stream:', localStream.getTracks().length, 'tracks');
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      console.log('[P2PCallScreen] Attaching remote stream:', remoteStream.getTracks().length, 'tracks');
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !isSpeakerOn;
      // Force play to ensure audio starts
      remoteAudioRef.current.play().catch(err => {
        console.warn('[P2PCallScreen] Failed to auto-play remote audio:', err);
      });
    }
  }, [remoteStream, isSpeakerOn]);

  // Auto-connect when both streams are available
  useEffect(() => {
    if (isIncoming && localStream && remoteStream && !isConnected) {
      console.log('[P2PCallScreen] Both streams ready - auto-connecting');
      setIsConnected(true);
    }
  }, [localStream, remoteStream, isConnected, isIncoming]);

  // Call timer
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setIsConnected(true);
    onAccept();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
    }
    setIsSpeakerOn(!isSpeakerOn);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      {/* Hidden audio elements - playsInline is required for iOS, but autoPlay may be blocked by browser policy */}
      <audio 
        ref={localAudioRef} 
        autoPlay 
        playsInline
        muted
        controls={false}
      />
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline
        controls={false}
      />

      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 animate-pulse [animation-delay:500ms]" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="absolute top-8 left-8 right-8 max-w-md bg-destructive/10 border-destructive text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Call info */}
      <div className="relative z-10 flex flex-col items-center">
        <Avatar className="w-32 h-32 border-4 border-primary/20 mb-6">
          <AvatarFallback className="text-4xl bg-secondary text-secondary-foreground">
            {peer.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {peer.username}
        </h2>
        
        <p className="text-muted-foreground mb-2 font-mono text-sm">
          {peer.ip}
        </p>

        <p className="text-lg text-muted-foreground">
          {isIncoming && !isConnected
            ? 'Incoming call...'
            : isConnected
            ? formatDuration(callDuration)
            : 'Calling...'}
        </p>

        {/* Audio status indicators */}
        {isConnected && (
          <div className="flex gap-2 mt-4">
            {localStream && (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                🎤 {localStream.getAudioTracks().length} Audio Track
              </span>
            )}
            {remoteStream ? (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                🔊 Remote Connected
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium">
                ⏳ Waiting for remote...
              </span>
            )}
            {isMuted && (
              <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                Muted
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-6 mt-16">
        {isIncoming && !isConnected ? (
          <>
            {/* Reject */}
            <Button
              onClick={onReject}
              size="lg"
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            {/* Accept */}
            <Button
              onClick={handleAccept}
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
            >
              <Phone className="w-7 h-7" />
            </Button>
          </>
        ) : (
          <>
            {/* Mute */}
            <Button
              onClick={toggleMute}
              variant="secondary"
              size="lg"
              className={`w-14 h-14 rounded-full ${isMuted ? 'bg-destructive/20 text-destructive' : ''}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {/* End Call */}
            <Button
              onClick={onEnd}
              size="lg"
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            {/* Speaker */}
            <Button
              onClick={toggleSpeaker}
              variant="secondary"
              size="lg"
              className={`w-14 h-14 rounded-full ${!isSpeakerOn ? 'bg-muted text-muted-foreground' : ''}`}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>
          </>
        )}
      </div>

      {/* Status hint */}
      {isConnected && (
        <p className="absolute bottom-8 text-sm text-muted-foreground">
          Full duplex audio • LAN P2P connection
        </p>
      )}
    </div>
  );
}
