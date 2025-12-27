import { useState, useEffect, useCallback } from 'react';
import { useLocalProfile } from '@/hooks/useLocalProfile';
import { usePeerNetwork } from '@/hooks/usePeerNetwork';
import { ConnectionSetup } from '@/components/network/ConnectionSetup';
import { P2PHeader } from '@/components/network/P2PHeader';
import { PeerList } from '@/components/network/PeerList';
import { P2PChatWindow } from '@/components/network/P2PChatWindow';
import { P2PCallScreen } from '@/components/network/P2PCallScreen';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Peer, P2PMessage } from '@/types/p2p';
import { Loader2 } from 'lucide-react';
import { clearAllData } from '@/lib/storage';
import { toast } from 'sonner';

const Index = () => {
  const { profile, loading: profileLoading, createProfile, logout } = useLocalProfile();
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [activeCall, setActiveCall] = useState<{ peer: Peer; isIncoming: boolean } | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [typingPeers, setTypingPeers] = useState<Set<string>>(new Set());
  const [latestMessage, setLatestMessage] = useState<P2PMessage | undefined>();

  const handleMessage = useCallback((message: P2PMessage) => {
    setLatestMessage(message);
  }, []);

  const handleTyping = useCallback((peerId: string, isTyping: boolean) => {
    setTypingPeers(prev => {
      const next = new Set(prev);
      if (isTyping) {
        next.add(peerId);
      } else {
        next.delete(peerId);
      }
      return next;
    });
  }, []);

  const handleCallOffer = useCallback((fromPeer: Peer) => {
    setActiveCall({ peer: fromPeer, isIncoming: true });
  }, []);

  const {
    peers,
    isConnected,
    myIp,
    isScanning,
    refreshPeers,
    goOnline,
    goOffline,
    sendMessage,
    sendTyping,
    markAsSeen,
    initiateCall,
    answerCall,
    endCall,
    localStream,
    remoteStream,
  } = usePeerNetwork({
    profile,
    onMessage: handleMessage,
    onTyping: handleTyping,
    onCallOffer: handleCallOffer,
  });

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not connected - show setup
  if (!profile || !isConnected) {
    return (
      <ConnectionSetup
        onCreateProfile={createProfile}
        onGoOnline={goOnline}
        hasProfile={!!profile}
        username={profile?.username}
        myIp={myIp}
        isScanning={isScanning}
      />
    );
  }

  // Handle call
  const handleCall = (peer: Peer) => {
    setActiveCall({ peer, isIncoming: false });
    initiateCall(peer.id);
  };

  const handleEndCall = () => {
    if (activeCall) {
      endCall(activeCall.peer.id);
    }
    setActiveCall(null);
  };

  const handleAcceptCall = () => {
    if (activeCall) {
      answerCall(activeCall.peer.id);
    }
  };

  const handleDisconnect = () => {
    goOffline();
    setSelectedPeer(null);
  };

  const handleResetCache = async () => {
    try {
      await clearAllData();
      toast.success('Network cache cleared');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to clear cache');
      console.error('[Index] Reset cache error:', error);
    }
  };

  // Call screen overlay
  if (activeCall) {
    return (
      <P2PCallScreen
        peer={activeCall.peer}
        isIncoming={activeCall.isIncoming}
        onEnd={handleEndCall}
        onAccept={handleAcceptCall}
        onReject={handleEndCall}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <P2PHeader
        profile={profile}
        isHost={true}
        hostAddress={myIp}
        onDisconnect={handleDisconnect}
        onLogout={logout}
        onResetCache={handleResetCache}
      />
      
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Peer List - hidden on mobile when chat is open */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
            isMobileView && selectedPeer ? 'hidden' : 'block'
          }`}
        >
          <PeerList
            peers={peers}
            selectedPeer={selectedPeer}
            onSelectPeer={setSelectedPeer}
            isHost={true}
            hostAddress={myIp}
            onRefresh={refreshPeers}
            isRefreshing={isScanning}
          />
        </div>

        {/* Chat Window */}
        <div
          className={`flex-1 ${
            isMobileView && !selectedPeer ? 'hidden' : 'block'
          }`}
        >
          {selectedPeer ? (
            <P2PChatWindow
              currentProfile={profile}
              peer={selectedPeer}
              onBack={() => setSelectedPeer(null)}
              onCall={() => handleCall(selectedPeer)}
              sendMessage={sendMessage}
              sendTyping={sendTyping}
              markAsSeen={markAsSeen}
              isPartnerTyping={typingPeers.has(selectedPeer.id)}
              newMessage={latestMessage}
            />
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>

      <InstallPrompt />
    </div>
  );
};

export default Index;
