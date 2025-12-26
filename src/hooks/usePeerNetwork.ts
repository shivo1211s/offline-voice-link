import { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, P2PMessage, SignalingMessage, LocalProfile } from '@/types/p2p';
import { saveMessage, getMessages, updateMessageStatus, savePeer } from '@/lib/storage';

interface UsePeerNetworkProps {
  profile: LocalProfile | null;
  onMessage?: (message: P2PMessage) => void;
  onTyping?: (peerId: string, isTyping: boolean) => void;
  onCallOffer?: (fromPeer: Peer) => void;
}

// Simple WebSocket-like signaling using BroadcastChannel for same-device testing
// and a simple signaling approach for real LAN use
export function usePeerNetwork({ profile, onMessage, onTyping, onCallOffer }: UsePeerNetworkProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hostAddress, setHostAddress] = useState<string>('');
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize broadcast channel for local testing/signaling
  useEffect(() => {
    if (!profile) return;

    broadcastChannelRef.current = new BroadcastChannel('lan-chat-signaling');
    
    broadcastChannelRef.current.onmessage = (event) => {
      handleSignalingMessage(event.data);
    };

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [profile]);

  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    if (!profile || message.from === profile.id) return;
    if (message.to && message.to !== profile.id) return;

    switch (message.type) {
      case 'join':
        handlePeerJoin(message.from, message.payload);
        break;
      case 'leave':
        handlePeerLeave(message.from);
        break;
      case 'peer-list':
        handlePeerList(message.payload);
        break;
      case 'message':
        handleIncomingMessage(message.payload);
        break;
      case 'typing':
        onTyping?.(message.from, message.payload.isTyping);
        break;
      case 'delivered':
        updateMessageStatus(message.payload.messageId, 'delivered');
        break;
      case 'seen':
        updateMessageStatus(message.payload.messageId, 'seen');
        break;
      case 'call-offer':
        const callerPeer = peers.find(p => p.id === message.from);
        if (callerPeer) {
          onCallOffer?.(callerPeer);
        }
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        handleWebRTCSignaling(message);
        break;
    }
  }, [profile, peers, onTyping, onCallOffer]);

  const handlePeerJoin = useCallback((peerId: string, peerInfo: any) => {
    const newPeer: Peer = {
      id: peerId,
      username: peerInfo.username,
      ip: peerInfo.ip || 'Local',
      isOnline: true,
      lastSeen: new Date(),
      avatarUrl: peerInfo.avatarUrl,
    };

    setPeers(prev => {
      const exists = prev.find(p => p.id === peerId);
      if (exists) {
        return prev.map(p => p.id === peerId ? newPeer : p);
      }
      return [...prev, newPeer];
    });

    savePeer(newPeer);

    // If we're host, broadcast updated peer list
    if (isHost && profile) {
      const allPeers = [...peers.filter(p => p.id !== peerId), newPeer, {
        id: profile.id,
        username: profile.username,
        ip: 'Host',
        isOnline: true,
        lastSeen: new Date(),
      }];
      
      broadcast({
        type: 'peer-list',
        from: profile.id,
        payload: allPeers,
      });
    }
  }, [isHost, profile, peers]);

  const handlePeerLeave = useCallback((peerId: string) => {
    setPeers(prev => prev.map(p => 
      p.id === peerId ? { ...p, isOnline: false, lastSeen: new Date() } : p
    ));
  }, []);

  const handlePeerList = useCallback((peerList: Peer[]) => {
    if (!profile) return;
    
    const filteredPeers = peerList
      .filter(p => p.id !== profile.id)
      .map(p => ({
        ...p,
        lastSeen: new Date(p.lastSeen),
      }));
    
    setPeers(filteredPeers);
    filteredPeers.forEach(peer => savePeer(peer));
  }, [profile]);

  const handleIncomingMessage = useCallback((messageData: any) => {
    const message: P2PMessage = {
      ...messageData,
      timestamp: new Date(messageData.timestamp),
      status: 'delivered',
    };

    saveMessage(message);
    onMessage?.(message);

    // Send delivered confirmation
    if (profile) {
      broadcast({
        type: 'delivered',
        from: profile.id,
        to: message.senderId,
        payload: { messageId: message.id },
      });
    }
  }, [profile, onMessage]);

  const handleWebRTCSignaling = useCallback(async (message: SignalingMessage) => {
    // WebRTC signaling for direct P2P audio/video
    const peerId = message.from;
    let pc = peerConnectionsRef.current.get(peerId);

    if (!pc) {
      pc = createPeerConnection(peerId);
      peerConnectionsRef.current.set(peerId, pc);
    }

    if (message.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (profile) {
        broadcast({
          type: 'answer',
          from: profile.id,
          to: peerId,
          payload: answer,
        });
      }
    } else if (message.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    } else if (message.type === 'ice-candidate') {
      await pc.addIceCandidate(new RTCIceCandidate(message.payload));
    }
  }, [profile]);

  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [] // No STUN/TURN needed for LAN
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && profile) {
        broadcast({
          type: 'ice-candidate',
          from: profile.id,
          to: peerId,
          payload: event.candidate,
        });
      }
    };

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dataChannelsRef.current.set(peerId, dc);
      setupDataChannel(dc, peerId);
    };

    return pc;
  };

  const setupDataChannel = (dc: RTCDataChannel, peerId: string) => {
    dc.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSignalingMessage(data);
    };
  };

  const broadcast = useCallback((message: SignalingMessage) => {
    broadcastChannelRef.current?.postMessage(message);
    
    // Also send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Host a network
  const startHost = useCallback(async () => {
    if (!profile) return;

    setIsHost(true);
    setIsConnected(true);
    setHostAddress('This Device (Host)');

    // Announce presence
    broadcast({
      type: 'join',
      from: profile.id,
      payload: {
        username: profile.username,
        ip: 'Host',
        avatarUrl: profile.avatarUrl,
      },
    });
  }, [profile, broadcast]);

  // Join a network
  const joinNetwork = useCallback(async (hostIp?: string) => {
    if (!profile) return;

    setIsHost(false);
    setIsConnected(true);
    setHostAddress(hostIp || 'Local Network');

    // Announce presence
    broadcast({
      type: 'join',
      from: profile.id,
      payload: {
        username: profile.username,
        ip: 'Client',
        avatarUrl: profile.avatarUrl,
      },
    });
  }, [profile, broadcast]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (profile) {
      broadcast({
        type: 'leave',
        from: profile.id,
        payload: null,
      });
    }

    setIsConnected(false);
    setIsHost(false);
    setPeers(prev => prev.map(p => ({ ...p, isOnline: false })));
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    dataChannelsRef.current.clear();
  }, [profile, broadcast]);

  // Send a message
  const sendMessage = useCallback(async (receiverId: string, content: string): Promise<P2PMessage> => {
    if (!profile) throw new Error('No profile');

    const message: P2PMessage = {
      id: crypto.randomUUID(),
      senderId: profile.id,
      receiverId,
      content,
      timestamp: new Date(),
      status: 'sending',
      type: 'text',
    };

    await saveMessage(message);

    broadcast({
      type: 'message',
      from: profile.id,
      to: receiverId,
      payload: message,
    });

    // Update to sent
    await updateMessageStatus(message.id, 'sent');
    
    return { ...message, status: 'sent' };
  }, [profile, broadcast]);

  // Send typing indicator
  const sendTyping = useCallback((receiverId: string, isTyping: boolean) => {
    if (!profile) return;

    broadcast({
      type: 'typing',
      from: profile.id,
      to: receiverId,
      payload: { isTyping },
    });
  }, [profile, broadcast]);

  // Mark messages as seen
  const markAsSeen = useCallback((messageIds: string[], senderId: string) => {
    if (!profile) return;

    messageIds.forEach(messageId => {
      updateMessageStatus(messageId, 'seen');
      
      broadcast({
        type: 'seen',
        from: profile.id,
        to: senderId,
        payload: { messageId },
      });
    });
  }, [profile, broadcast]);

  // Initiate a call
  const initiateCall = useCallback((peerId: string) => {
    if (!profile) return;

    broadcast({
      type: 'call-offer',
      from: profile.id,
      to: peerId,
      payload: { username: profile.username },
    });
  }, [profile, broadcast]);

  return {
    peers,
    isHost,
    isConnected,
    hostAddress,
    startHost,
    joinNetwork,
    disconnect,
    sendMessage,
    sendTyping,
    markAsSeen,
    initiateCall,
    getMessages,
  };
}
