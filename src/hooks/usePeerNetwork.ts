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
const SERVICE_PREFIX = 'LC_';

export function usePeerNetwork({ profile, onMessage, onTyping, onCallOffer }: UsePeerNetworkProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myIp, setMyIp] = useState<string>('');
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const [myDeviceName, setMyDeviceName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCallOffersRef = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());
  // Peer-client mapping refs (inline instead of separate hook to avoid hook count issues)
  const peerIdToClientIdRef = useRef<Map<string, string>>(new Map());
  const clientIdToPeerIdRef = useRef<Map<string, string>>(new Map());
  const ipToPeerIdRef = useRef<Map<string, string>>(new Map());

  // Initialize network discovery and WebSocket server
  useEffect(() => {
    if (!profile) return;

    let cleanup = false;

    const initialize = async () => {
      try {
        const [{ ip }, device] = await Promise.all([
          LanDiscovery.getLocalIp(),
          LanDiscovery.getDeviceId().catch(() => ({ deviceId: '', deviceName: '' })),
        ]);
        if (!cleanup) {
          setMyIp(ip);
          setMyDeviceId(device.deviceId || '');
          setMyDeviceName(device.deviceName || '');
        }
        
        const cachedPeers = await getPeers();
        if (!cleanup && cachedPeers.length > 0) {
          setPeers(cachedPeers.map(p => ({ ...p, isOnline: false })));
        }
      } catch (error) {
        console.log('[usePeerNetwork] Initialization error (expected in web):', error);
      }
    };

    initialize();
    return () => { cleanup = true; };
  }, [profile]);

  // Mapping helper functions (not hooks, just regular functions using refs)
  const registerPeerConnection = useCallback((peerId: string, clientId: string, ip?: string) => {
    console.log('[PeerMapping] Registering:', peerId, '↔', clientId, 'ip:', ip);
    peerIdToClientIdRef.current.set(peerId, clientId);
    clientIdToPeerIdRef.current.set(clientId, peerId);
    if (ip) {
      ipToPeerIdRef.current.set(ip, peerId);
    }
  }, []);

  const updateFromJoinMessage = useCallback((profileId: string, ip: string, clientId?: string) => {
    console.log('[PeerMapping] Updating from join:', profileId, 'ip:', ip, 'clientId:', clientId);
    if (clientId) {
      peerIdToClientIdRef.current.set(profileId, clientId);
      clientIdToPeerIdRef.current.set(clientId, profileId);
    }
    ipToPeerIdRef.current.set(ip, profileId);
    
    for (const [existingClientId] of clientIdToPeerIdRef.current.entries()) {
      if (existingClientId.includes(ip)) {
        clientIdToPeerIdRef.current.set(existingClientId, profileId);
        peerIdToClientIdRef.current.set(profileId, existingClientId);
      }
    }
  }, []);

  const getClientIdForPeer = useCallback((peerId: string): string | undefined => {
    return peerIdToClientIdRef.current.get(peerId);
  }, []);

  const getPeerIdForClient = useCallback((clientId: string): string | undefined => {
    return clientIdToPeerIdRef.current.get(clientId);
  }, []);

  const removePeerMapping = useCallback((peerId: string) => {
    const clientId = peerIdToClientIdRef.current.get(peerId);
    if (clientId) {
      clientIdToPeerIdRef.current.delete(clientId);
    }
    peerIdToClientIdRef.current.delete(peerId);
    for (const [ip, id] of ipToPeerIdRef.current.entries()) {
      if (id === peerId) {
        ipToPeerIdRef.current.delete(ip);
        break;
      }
    }
  }, []);

  const clearAllMappings = useCallback(() => {
    peerIdToClientIdRef.current.clear();
    clientIdToPeerIdRef.current.clear();
    ipToPeerIdRef.current.clear();
  }, []);

  // Broadcast to all connected peers
  const broadcast = useCallback(async (message: SignalingMessage) => {
    try {
      console.log('[usePeerNetwork] Broadcasting:', message.type);
      await WebSocketServer.broadcast({ data: JSON.stringify(message) });
    } catch (error) {
      console.log('[usePeerNetwork] Broadcast error:', error);
    }
  }, []);

  // Send message to a specific peer using their profile ID
  const sendToPeer = useCallback(async (peerId: string, message: SignalingMessage) => {
    try {
      const clientId = getClientIdForPeer(peerId);
      
      if (clientId) {
        console.log('[usePeerNetwork] Sending to peer:', peerId, 'via clientId:', clientId);
        await WebSocketServer.send({ clientId, data: JSON.stringify(message) });
        return true;
      } else {
        console.log('[usePeerNetwork] No clientId for peer:', peerId, 'falling back to broadcast');
        await WebSocketServer.broadcast({ data: JSON.stringify(message) });
        return true;
      }
    } catch (error) {
      console.error('[usePeerNetwork] sendToPeer error:', error);
      return false;
    }
  }, [getClientIdForPeer]);

  // Create WebRTC peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Fallback STUN for NAT traversal
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && profile) {
        console.log('[WebRTC] ICE candidate:', event.candidate.candidate);
        sendToPeer(peerId, {
          type: 'ice-candidate',
          from: profile.id,
          to: peerId,
          payload: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  }, [profile, sendToPeer]);

  const handleCallEnd = useCallback((peerId: string) => {
    setLocalStream(prev => {
      prev?.getTracks().forEach(track => track.stop());
      return null;
    });
    setRemoteStream(null);
    
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    pendingCallOffersRef.current.delete(peerId);
  }, []);

  const handleCallAnswer = useCallback(async (message: SignalingMessage) => {
    const peerId = message.from;
    const pc = peerConnectionsRef.current.get(peerId);
    
    if (pc && message.payload.sdp) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.sdp));
      } catch (error) {
        console.error('[usePeerNetwork] Error handling call answer:', error);
      }
    }
  }, []);

  const handleWebRTCSignaling = useCallback(async (message: SignalingMessage) => {
    const peerId = message.from;
    let pc = peerConnectionsRef.current.get(peerId);

    if (!pc) {
      pc = createPeerConnection(peerId);
      peerConnectionsRef.current.set(peerId, pc);
    }

    try {
      if (message.type === 'ice-candidate' && message.payload) {
        await pc.addIceCandidate(new RTCIceCandidate(message.payload));
      }
    } catch (error) {
      console.error('[usePeerNetwork] WebRTC signaling error:', error);
    }
  }, [createPeerConnection]);

  const handleIncomingMessage = useCallback((messageData: any, senderId: string) => {
    const message: P2PMessage = {
      ...messageData,
      timestamp: new Date(messageData.timestamp),
      status: 'delivered',
    };

    saveMessage(message);
    onMessage?.(message);

    if (profile) {
      sendToPeer(senderId, {
        type: 'delivered',
        from: profile.id,
        to: senderId,
        payload: { messageId: message.id },
      });
    }
  }, [profile, onMessage, sendToPeer]);

  // Handle incoming WebSocket messages
  const handleIncomingData = useCallback((data: string, clientId?: string) => {
    try {
      const message: SignalingMessage = JSON.parse(data);
      console.log('[usePeerNetwork] Received:', message.type, 'from:', message.from);
      
      if (!profile || message.from === profile.id) return;
      if (message.to && message.to !== profile.id) return;

      if (clientId && message.from) {
        const ip = clientId.split(':')[0].replace(/^\//, '');
        updateFromJoinMessage(message.from, ip, clientId);
      }

      switch (message.type) {
        case 'message':
          handleIncomingMessage(message.payload, message.from);
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
        case 'join': {
          // PRIORITY 1: Extract IP from clientId (WebSocket connection) - this is the real IP
          let peerIp: string | null = null;
          if (clientId) {
            const cleanedClientId = clientId.replace(/^\//, '');
            const extractedIp = cleanedClientId.split(':')[0];
            if (extractedIp && extractedIp !== '0.0.0.0' && extractedIp !== '127.0.0.1') {
              peerIp = extractedIp;
              console.log('[usePeerNetwork] Using IP from clientId:', peerIp);
            }
          }

          // PRIORITY 2: Check existing mDNS discovered peer
          if (!peerIp) {
            const existingPeer = peers.find(p => p.id === message.from && p.ip && p.ip !== '0.0.0.0');
            if (existingPeer) {
              peerIp = existingPeer.ip;
              console.log('[usePeerNetwork] Using existing peer IP:', peerIp);
            }
          }

          // PRIORITY 3: Use payload IP if valid
          if (!peerIp && message.payload.ip && message.payload.ip !== '0.0.0.0' && message.payload.ip !== '127.0.0.1') {
            peerIp = message.payload.ip;
            console.log('[usePeerNetwork] Using payload IP:', peerIp);
          }

          // Skip if still no valid IP
          if (!peerIp) {
            console.log('[usePeerNetwork] Skipping join - no valid IP found');
            break;
          }

          const payloadDeviceId = (message.payload?.deviceId as string | undefined) || undefined;
          const payloadDeviceName = (message.payload?.deviceName as string | undefined) || undefined;

          const joinedPeer: Peer = {
            id: message.from,
            username: message.payload.username,
            ip: peerIp,
            isOnline: true,
            lastSeen: new Date(),
            avatarUrl: message.payload.avatarUrl,
            deviceId: payloadDeviceId,
            deviceName: payloadDeviceName,
          };

          if (clientId) {
            updateFromJoinMessage(message.from, peerIp, clientId);
          }

          // Deduplicate by stable deviceId (Android ID) when available, then by IP
          setPeers(prev => {
            const filtered = prev.filter(p =>
              p.id !== message.from &&
              (!payloadDeviceId || p.deviceId !== payloadDeviceId)
            );

            if (payloadDeviceId) {
              const existingByDeviceId = filtered.find(p => p.deviceId === payloadDeviceId);
              if (existingByDeviceId) {
                return filtered.map(p => p.deviceId === payloadDeviceId
                  ? { ...p, ...joinedPeer, id: message.from }
                  : p
                );
              }
            }

            const existingByIp = filtered.find(p => p.ip === peerIp);
            if (existingByIp) {
              return filtered.map(p => p.ip === peerIp
                ? { ...p, ...joinedPeer, username: message.payload.username || p.username }
                : p
              );
            }

            return [...filtered, joinedPeer];
          });

          savePeer(joinedPeer);

          if (profile && myIp && myIp !== '0.0.0.0') {
            sendToPeer(message.from, {
              type: 'join',
              from: profile.id,
              to: message.from,
              payload: {
                username: profile.username,
                ip: myIp,
                avatarUrl: profile.avatarUrl,
                deviceId: myDeviceId,
                deviceName: myDeviceName,
              },
            });
          }
          break;
        }
        case 'leave':
          setPeers(prev => prev.map(p => 
            p.id === message.from ? { ...p, isOnline: false, lastSeen: new Date() } : p
          ));
          removePeerMapping(message.from);
          break;
        case 'call-offer':
          const callerPeer = peers.find(p => p.id === message.from);
          if (callerPeer && message.payload.sdp) {
            pendingCallOffersRef.current.set(message.from, message.payload.sdp);
            onCallOffer?.(callerPeer);
          }
          break;
        case 'call-answer':
          handleCallAnswer(message);
          break;
        case 'call-end':
          handleCallEnd(message.from);
          break;
        case 'ice-candidate':
          handleWebRTCSignaling(message);
          break;
      }
    } catch (error) {
      console.error('[usePeerNetwork] Error parsing message:', error);
    }
  }, [profile, peers, myIp, myDeviceId, myDeviceName, onTyping, onCallOffer, updateFromJoinMessage, removePeerMapping, sendToPeer, handleIncomingMessage, handleCallAnswer, handleCallEnd, handleWebRTCSignaling]);

  // Go online
  const goOnline = useCallback(async () => {
    if (!profile) return;

    try {
      setIsScanning(true);
      await WebSocketServer.start({ port: WS_PORT });

      await WebSocketServer.addListener('messageReceived', (data) => {
        handleIncomingData(data.data, data.clientId);
      });

      await WebSocketServer.addListener('clientConnected', async (data) => {
        console.log('[usePeerNetwork] Client connected:', data.clientId);
      });

      await WebSocketServer.addListener('clientDisconnected', async (data) => {
        console.log('[usePeerNetwork] Client disconnected:', data.clientId);
        const peerId = getPeerIdForClient(data.clientId);
        if (peerId) {
          setPeers(prev => prev.map(p => 
            p.id === peerId ? { ...p, isOnline: false, lastSeen: new Date() } : p
          ));
          removePeerMapping(peerId);
        }
      });

      await LanDiscovery.startAdvertising({
        serviceName: `${SERVICE_PREFIX}${profile.id}`,
        port: WS_PORT
      });

      await LanDiscovery.startDiscovery({ serviceType: '_lanchat._tcp.' });

      await LanDiscovery.addListener('peerFound', async (discoveredPeer: DiscoveredPeer) => {
        console.log('[usePeerNetwork] Peer found:', discoveredPeer);
        
        // FILTER: Skip invalid IPs
        if (!discoveredPeer.ip || discoveredPeer.ip === '0.0.0.0' || discoveredPeer.ip === '127.0.0.1') {
          console.log('[usePeerNetwork] Skipping invalid IP:', discoveredPeer.ip);
          return;
        }
        
        // FILTER: Skip if this is our own IP (self-discovery protection)
        const currentIp = myIp || (await LanDiscovery.getLocalIp()).ip;
        if (discoveredPeer.ip === currentIp) {
          console.log('[usePeerNetwork] Skipping self-discovery:', discoveredPeer.ip);
          return;
        }
        
        try {
          const result = await WebSocketServer.connectToPeer({
            ip: discoveredPeer.ip,
            port: discoveredPeer.port
          });

          const clientId = result.clientId || `${discoveredPeer.ip}:${discoveredPeer.port}`;

          const advertisedId = discoveredPeer.id || discoveredPeer.name;
          const peerId = advertisedId?.startsWith(SERVICE_PREFIX)
            ? advertisedId.slice(SERVICE_PREFIX.length)
            : advertisedId;

          const inferredUsername = advertisedId?.startsWith(SERVICE_PREFIX)
            ? 'Device'
            : (discoveredPeer.name?.split('-')[0] || 'Device');

          registerPeerConnection(peerId, clientId, discoveredPeer.ip);

          const newPeer: Peer = {
            id: peerId,
            username: inferredUsername,
            ip: discoveredPeer.ip,
            isOnline: true,
            lastSeen: new Date(),
          };

          // DEDUPE: Use IP as unique key - one entry per IP address
          setPeers(prev => {
            const existingByIp = prev.find(p => p.ip === discoveredPeer.ip);
            if (existingByIp) {
              return prev.map(p => p.ip === discoveredPeer.ip
                ? { ...p, ...newPeer, id: peerId }
                : p
              );
            }

            const existsById = prev.find(p => p.id === peerId);
            if (existsById) {
              return prev.map(p => p.id === peerId ? { ...p, ...newPeer } : p);
            }

            return [...prev, newPeer];
          });

          savePeer(newPeer);

          setTimeout(async () => {
            if (profile) {
              const latestIp = myIp || (await LanDiscovery.getLocalIp()).ip;
              sendToPeer(peerId, {
                type: 'join',
                from: profile.id,
                payload: {
                  username: profile.username,
                  ip: latestIp,
                  avatarUrl: profile.avatarUrl,
                  deviceId: myDeviceId,
                  deviceName: myDeviceName,
                },
              });
            }
          }, 200);
        } catch (error) {
          console.error('[usePeerNetwork] Failed to connect to peer:', error);
        }
      });

      await LanDiscovery.addListener('peerLost', (discoveredPeer: DiscoveredPeer) => {
        console.log('[usePeerNetwork] Peer lost:', discoveredPeer);

        const advertisedId = discoveredPeer.id || discoveredPeer.name;
        const peerId = advertisedId?.startsWith(SERVICE_PREFIX)
          ? advertisedId.slice(SERVICE_PREFIX.length)
          : advertisedId;

        setPeers(prev => prev.map(p =>
          p.id === peerId ? { ...p, isOnline: false, lastSeen: new Date() } : p
        ));
        removePeerMapping(peerId);
      });

      setIsConnected(true);
      setIsScanning(false);

      const { ip } = await LanDiscovery.getLocalIp();
      setMyIp(ip);

    } catch (error) {
      console.error('[usePeerNetwork] Go online error:', error);
      setIsScanning(false);
      setIsConnected(true);
    }
  }, [profile, myIp, myDeviceId, myDeviceName, handleIncomingData, registerPeerConnection, removePeerMapping, getPeerIdForClient, sendToPeer]);

  // Go offline
  const goOffline = useCallback(async () => {
    if (profile) {
      broadcast({ type: 'leave', from: profile.id, payload: null });
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
    clearAllMappings();
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
  }, [profile, broadcast, clearAllMappings]);

  // Refresh peer list - manually re-scan the network
  const refreshPeers = useCallback(async () => {
    if (!profile || !isConnected) return;
    
    setIsScanning(true);
    console.log('[usePeerNetwork] Refreshing peer list...');
    
    try {
      // Get current IP first
      const { ip } = await LanDiscovery.getLocalIp();
      setMyIp(ip);
      
      // Stop current discovery
      await LanDiscovery.stopDiscovery();
      
      // Small delay before restarting
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Restart discovery to find new peers
      await LanDiscovery.startDiscovery({ serviceType: '_lanchat._tcp.' });
      
      console.log('[usePeerNetwork] Refresh complete, discovery restarted');
    } catch (error) {
      console.error('[usePeerNetwork] Refresh error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [profile, isConnected]);
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
    await sendToPeer(receiverId, {
      type: 'message',
      from: profile.id,
      to: receiverId,
      payload: message,
    });
    await updateMessageStatus(message.id, 'sent');
    
    return { ...message, status: 'sent' };
  }, [profile, sendToPeer]);

  const sendTyping = useCallback((receiverId: string, isTyping: boolean) => {
    if (!profile) return;
    sendToPeer(receiverId, {
      type: 'typing',
      from: profile.id,
      to: receiverId,
      payload: { isTyping },
    });
  }, [profile, sendToPeer]);

  const markAsSeen = useCallback((messageIds: string[], senderId: string) => {
    if (!profile) return;
    messageIds.forEach(messageId => {
      updateMessageStatus(messageId, 'seen');
      sendToPeer(senderId, {
        type: 'seen',
        from: profile.id,
        to: senderId,
        payload: { messageId },
      });
    });
  }, [profile, sendToPeer]);

  const initiateCall = useCallback(async (peerId: string) => {
    if (!profile) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      let pc = peerConnectionsRef.current.get(peerId);
      if (!pc) {
        pc = createPeerConnection(peerId);
        peerConnectionsRef.current.set(peerId, pc);
      }

      stream.getTracks().forEach(track => {
        pc!.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendToPeer(peerId, {
        type: 'call-offer',
        from: profile.id,
        to: peerId,
        payload: { username: profile.username, sdp: offer },
      });
    } catch (error) {
      console.error('[usePeerNetwork] Call initiation error:', error);
    }
  }, [profile, sendToPeer, createPeerConnection]);

  const answerCall = useCallback(async (peerId: string) => {
    if (!profile) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      let pc = peerConnectionsRef.current.get(peerId);
      if (!pc) {
        pc = createPeerConnection(peerId);
        peerConnectionsRef.current.set(peerId, pc);
      }

      stream.getTracks().forEach(track => {
        pc!.addTrack(track, stream);
      });

      const offer = pendingCallOffersRef.current.get(peerId);
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await sendToPeer(peerId, {
          type: 'call-answer',
          from: profile.id,
          to: peerId,
          payload: { sdp: answer },
        });
        
        pendingCallOffersRef.current.delete(peerId);
      }
    } catch (error) {
      console.error('[usePeerNetwork] Answer call error:', error);
    }
  }, [profile, sendToPeer, createPeerConnection]);

  const endCall = useCallback((peerId: string) => {
    if (!profile) return;

    setLocalStream(prev => {
      prev?.getTracks().forEach(track => track.stop());
      return null;
    });
    setRemoteStream(null);

    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    pendingCallOffersRef.current.delete(peerId);

    sendToPeer(peerId, {
      type: 'call-end',
      from: profile.id,
      to: peerId,
      payload: null,
    });
  }, [profile, sendToPeer]);

  return {
    peers,
    isHost: true,
    isConnected,
    hostAddress: myIp,
    myIp,
    isScanning,
    refreshPeers,
    startHost: goOnline,
    joinNetwork: goOnline,
    goOnline,
    goOffline,
    disconnect: goOffline,
    sendMessage,
    sendTyping,
    markAsSeen,
    initiateCall,
    answerCall,
    endCall,
    getMessages,
    localStream,
    remoteStream,
  };
}
