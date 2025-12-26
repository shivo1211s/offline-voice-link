import { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, P2PMessage, SignalingMessage, LocalProfile } from '@/types/p2p';
import { saveMessage, getMessages, updateMessageStatus, savePeer, getPeers } from '@/lib/storage';
import LanDiscovery, { DiscoveredPeer } from '@/plugins/LanDiscovery';
import WebSocketServer from '@/plugins/WebSocketServer';

interface UsePeerNetworkProps {
  profile: LocalProfile | null;
  onMessage?: (message: P2PMessage) => void;
  onTyping?: (peerId: string, isTyping: boolean) => void;
  onCallOffer?: (fromPeer: Peer) => void;
}

const WS_PORT = 8765;

export function usePeerNetwork({ profile, onMessage, onTyping, onCallOffer }: UsePeerNetworkProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myIp, setMyIp] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Initialize network discovery and WebSocket server
  useEffect(() => {
    if (!profile) return;

    let cleanup = false;

    const initialize = async () => {
      try {
        // Get local IP
        const { ip } = await LanDiscovery.getLocalIp();
        if (!cleanup) setMyIp(ip);
        
        // Load cached peers
        const cachedPeers = await getPeers();
        if (!cleanup && cachedPeers.length > 0) {
          setPeers(cachedPeers.map(p => ({ ...p, isOnline: false })));
        }
      } catch (error) {
        console.log('[usePeerNetwork] Initialization error (expected in web):', error);
      }
    };

    initialize();

    return () => {
      cleanup = true;
    };
  }, [profile]);

  // Store pending call offers to handle WebRTC signaling
  const pendingCallOffersRef = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());

  // Handle incoming WebSocket messages
  const handleIncomingData = useCallback((data: string) => {
    try {
      const message: SignalingMessage = JSON.parse(data);
      console.log('[usePeerNetwork] Received message:', message.type, 'from:', message.from);
      
      if (!profile) {
        console.log('[usePeerNetwork] No profile, ignoring message');
        return;
      }
      
      // Don't filter by message.from === profile.id here - we want to receive messages from others
      if (message.from === profile.id) {
        console.log('[usePeerNetwork] Ignoring own message');
        return;
      }
      
      // Only filter targeted messages (with 'to' field) that aren't for us
      if (message.to && message.to !== profile.id) {
        console.log('[usePeerNetwork] Message not for us, to:', message.to);
        return;
      }

      switch (message.type) {
        case 'message':
          console.log('[usePeerNetwork] Processing incoming chat message');
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
        case 'join':
          // Handle peer joining - add/update peer in list
          console.log('[usePeerNetwork] Peer joined:', message.payload);
          const joinedPeer: Peer = {
            id: message.from,
            username: message.payload.username,
            ip: message.payload.ip,
            isOnline: true,
            lastSeen: new Date(),
            avatarUrl: message.payload.avatarUrl,
          };
          setPeers(prev => {
            const exists = prev.find(p => p.id === message.from);
            if (exists) {
              return prev.map(p => p.id === message.from ? { ...p, ...joinedPeer } : p);
            }
            return [...prev, joinedPeer];
          });
          savePeer(joinedPeer);
          break;
        case 'leave':
          setPeers(prev => prev.map(p => 
            p.id === message.from ? { ...p, isOnline: false, lastSeen: new Date() } : p
          ));
          break;
        case 'call-offer':
          console.log('[usePeerNetwork] Received call offer from:', message.from);
          const callerPeer = peers.find(p => p.id === message.from);
          if (callerPeer && message.payload.sdp) {
            // Store the SDP for answering
            pendingCallOffersRef.current.set(message.from, message.payload.sdp);
            onCallOffer?.(callerPeer);
          }
          break;
        case 'call-answer':
          console.log('[usePeerNetwork] Received call answer from:', message.from);
          handleCallAnswer(message);
          break;
        case 'call-end':
          console.log('[usePeerNetwork] Call ended by:', message.from);
          handleCallEnd(message.from);
          break;
        case 'ice-candidate':
          handleWebRTCSignaling(message);
          break;
      }
    } catch (error) {
      console.error('[usePeerNetwork] Error parsing message:', error);
    }
  }, [profile, peers, onTyping, onCallOffer]);

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
    const peerId = message.from;
    let pc = peerConnectionsRef.current.get(peerId);

    if (!pc) {
      pc = createPeerConnection(peerId);
      peerConnectionsRef.current.set(peerId, pc);
    }

    try {
      if (message.type === 'ice-candidate' && message.payload) {
        console.log('[usePeerNetwork] Adding ICE candidate from:', peerId);
        await pc.addIceCandidate(new RTCIceCandidate(message.payload));
      }
    } catch (error) {
      console.error('[usePeerNetwork] WebRTC signaling error:', error);
    }
  }, [profile]);

  const handleCallAnswer = useCallback(async (message: SignalingMessage) => {
    const peerId = message.from;
    const pc = peerConnectionsRef.current.get(peerId);
    
    if (pc && message.payload.sdp) {
      try {
        console.log('[usePeerNetwork] Setting remote description from call answer');
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.sdp));
      } catch (error) {
        console.error('[usePeerNetwork] Error handling call answer:', error);
      }
    }
  }, []);

  const handleCallEnd = useCallback((peerId: string) => {
    // Stop local stream
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    
    // Close peer connection
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    
    pendingCallOffersRef.current.delete(peerId);
  }, []);

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

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
    };

    return pc;
  };

  const broadcast = useCallback(async (message: SignalingMessage) => {
    try {
      console.log('[usePeerNetwork] Broadcasting:', message.type, 'to:', message.to || 'all');
      await WebSocketServer.broadcast({ data: JSON.stringify(message) });
      console.log('[usePeerNetwork] Broadcast sent successfully');
    } catch (error) {
      console.log('[usePeerNetwork] Broadcast error:', error);
    }
  }, []);

  // Go online - start advertising and discovery
  const goOnline = useCallback(async () => {
    if (!profile) return;

    try {
      setIsScanning(true);

      // Start WebSocket server
      await WebSocketServer.start({ port: WS_PORT });

      // Setup message listener
      await WebSocketServer.addListener('messageReceived', (data) => {
        handleIncomingData(data.data);
      });

      // Setup peer connection listener
      await WebSocketServer.addListener('clientConnected', async (data) => {
        console.log('[usePeerNetwork] Client connected:', data.clientId);
      });

      // Start advertising our service
      await LanDiscovery.startAdvertising({
        serviceName: `${profile.username}-${profile.id.slice(0, 8)}`,
        port: WS_PORT
      });

      // Start discovering other devices
      await LanDiscovery.startDiscovery({ serviceType: '_lanchat._tcp.' });

      // Listen for discovered peers
      await LanDiscovery.addListener('peerFound', async (discoveredPeer: DiscoveredPeer) => {
        console.log('[usePeerNetwork] Peer found:', discoveredPeer);
        
        // Connect to the peer's WebSocket server
        try {
          await WebSocketServer.connectToPeer({
            ip: discoveredPeer.ip,
            port: discoveredPeer.port
          });

          // Add to peer list
          const newPeer: Peer = {
            id: discoveredPeer.id,
            username: discoveredPeer.name.split('-')[0],
            ip: discoveredPeer.ip,
            isOnline: true,
            lastSeen: new Date(),
          };

          setPeers(prev => {
            const exists = prev.find(p => p.id === discoveredPeer.id);
            if (exists) {
              return prev.map(p => p.id === discoveredPeer.id ? { ...p, isOnline: true, ip: discoveredPeer.ip } : p);
            }
            return [...prev, newPeer];
          });

          savePeer(newPeer);

          // Announce ourselves
          broadcast({
            type: 'join',
            from: profile.id,
            payload: {
              username: profile.username,
              ip: myIp,
              avatarUrl: profile.avatarUrl,
            },
          });
        } catch (error) {
          console.error('[usePeerNetwork] Failed to connect to peer:', error);
        }
      });

      await LanDiscovery.addListener('peerLost', (discoveredPeer: DiscoveredPeer) => {
        console.log('[usePeerNetwork] Peer lost:', discoveredPeer);
        setPeers(prev => prev.map(p => 
          p.id === discoveredPeer.id ? { ...p, isOnline: false, lastSeen: new Date() } : p
        ));
      });

      setIsConnected(true);
      setIsScanning(false);

      // Get local IP address
      const { ip } = await LanDiscovery.getLocalIp();
      setMyIp(ip);

    } catch (error) {
      console.error('[usePeerNetwork] Go online error:', error);
      setIsScanning(false);
      
      // Fallback for web testing - just set as connected
      setIsConnected(true);
    }
  }, [profile, myIp, broadcast, handleIncomingData]);

  // Go offline - stop everything
  const goOffline = useCallback(async () => {
    if (profile) {
      broadcast({
        type: 'leave',
        from: profile.id,
        payload: null,
      });
    }

    try {
      await LanDiscovery.stopAdvertising();
      await LanDiscovery.stopDiscovery();
      await WebSocketServer.stop();
    } catch (error) {
      console.log('[usePeerNetwork] Go offline error:', error);
    }

    setIsConnected(false);
    setPeers(prev => prev.map(p => ({ ...p, isOnline: false })));
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
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

    console.log('[usePeerNetwork] Sending message to:', receiverId, 'content:', content);
    await saveMessage(message);

    await broadcast({
      type: 'message',
      from: profile.id,
      to: receiverId,
      payload: message,
    });

    console.log('[usePeerNetwork] Message broadcast complete');
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
  const initiateCall = useCallback(async (peerId: string) => {
    if (!profile) return;

    try {
      // Get microphone access
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create peer connection for audio
      let pc = peerConnectionsRef.current.get(peerId);
      if (!pc) {
        pc = createPeerConnection(peerId);
        peerConnectionsRef.current.set(peerId, pc);
      }

      // Add audio tracks
      localStreamRef.current.getTracks().forEach(track => {
        pc!.addTrack(track, localStreamRef.current!);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      broadcast({
        type: 'call-offer',
        from: profile.id,
        to: peerId,
        payload: { 
          username: profile.username,
          sdp: offer 
        },
      });
    } catch (error) {
      console.error('[usePeerNetwork] Call initiation error:', error);
    }
  }, [profile, broadcast]);

  // Answer an incoming call
  const answerCall = useCallback(async (peerId: string) => {
    if (!profile) return;

    try {
      console.log('[usePeerNetwork] Answering call from:', peerId);
      
      // Get microphone access
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create peer connection if needed
      let pc = peerConnectionsRef.current.get(peerId);
      if (!pc) {
        pc = createPeerConnection(peerId);
        peerConnectionsRef.current.set(peerId, pc);
      }

      // Add audio tracks
      localStreamRef.current.getTracks().forEach(track => {
        pc!.addTrack(track, localStreamRef.current!);
      });

      // Get the pending offer
      const offer = pendingCallOffersRef.current.get(peerId);
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer
        await broadcast({
          type: 'call-answer',
          from: profile.id,
          to: peerId,
          payload: { sdp: answer },
        });
        
        pendingCallOffersRef.current.delete(peerId);
        console.log('[usePeerNetwork] Call answered successfully');
      }
    } catch (error) {
      console.error('[usePeerNetwork] Answer call error:', error);
    }
  }, [profile, broadcast]);

  // End call
  const endCall = useCallback((peerId: string) => {
    if (!profile) return;

    console.log('[usePeerNetwork] Ending call with:', peerId);
    
    // Stop local stream
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    // Close peer connection
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    
    pendingCallOffersRef.current.delete(peerId);

    broadcast({
      type: 'call-end',
      from: profile.id,
      to: peerId,
      payload: null,
    });
  }, [profile, broadcast]);

  // For backward compatibility - aliases
  const startHost = goOnline;
  const joinNetwork = goOnline;
  const disconnect = goOffline;

  return {
    peers,
    isHost: true, // In mesh, everyone is equal
    isConnected,
    hostAddress: myIp,
    myIp,
    isScanning,
    startHost,
    joinNetwork,
    goOnline,
    goOffline,
    disconnect,
    sendMessage,
    sendTyping,
    markAsSeen,
    initiateCall,
    answerCall,
    endCall,
    getMessages,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
  };
}
