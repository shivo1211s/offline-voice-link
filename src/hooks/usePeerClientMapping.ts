import { useRef, useCallback } from 'react';

/**
 * Hook to manage bidirectional mapping between peer profile IDs and WebSocket client IDs.
 * 
 * The problem: mDNS discovers peers with `id = "username-abc123"` (profile-based)
 * but WebSocket uses `clientId = "192.168.1.5:8765"` (socket address-based)
 * 
 * This hook maintains both directions:
 * - peerIdToClientId: Map profile ID → WebSocket clientId for sending messages
 * - clientIdToPeerId: Map WebSocket clientId → profile ID for receiving messages
 */
export function usePeerClientMapping() {
  // Profile ID → WebSocket Client ID (for sending)
  const peerIdToClientIdRef = useRef<Map<string, string>>(new Map());
  
  // WebSocket Client ID → Profile ID (for receiving)
  const clientIdToPeerIdRef = useRef<Map<string, string>>(new Map());
  
  // Also track IP → Profile ID for initial discovery mapping
  const ipToPeerIdRef = useRef<Map<string, string>>(new Map());

  /**
   * Register a mapping when we discover a peer and connect to their WebSocket
   */
  const registerPeerConnection = useCallback((peerId: string, clientId: string, ip?: string) => {
    console.log('[PeerMapping] Registering:', peerId, '↔', clientId, 'ip:', ip);
    
    peerIdToClientIdRef.current.set(peerId, clientId);
    clientIdToPeerIdRef.current.set(clientId, peerId);
    
    if (ip) {
      ipToPeerIdRef.current.set(ip, peerId);
    }
  }, []);

  /**
   * Update mapping when we receive a 'join' message with profile info
   * This is crucial: when someone connects to our server, we only know their socket address
   * The 'join' message tells us their actual profile ID
   */
  const updateFromJoinMessage = useCallback((profileId: string, ip: string, clientId?: string) => {
    console.log('[PeerMapping] Updating from join:', profileId, 'ip:', ip, 'clientId:', clientId);
    
    // If we have a clientId, use it directly
    if (clientId) {
      peerIdToClientIdRef.current.set(profileId, clientId);
      clientIdToPeerIdRef.current.set(clientId, profileId);
    }
    
    // Also try to find existing connection by IP
    ipToPeerIdRef.current.set(ip, profileId);
    
    // Update any existing clientId that matches this IP
    for (const [existingClientId, existingPeerId] of clientIdToPeerIdRef.current.entries()) {
      if (existingClientId.includes(ip) && existingPeerId !== profileId) {
        // Update the mapping to use the correct profile ID
        clientIdToPeerIdRef.current.set(existingClientId, profileId);
        peerIdToClientIdRef.current.set(profileId, existingClientId);
        console.log('[PeerMapping] Updated existing mapping:', existingClientId, '→', profileId);
      }
    }
  }, []);

  /**
   * Get the WebSocket clientId for a peer (for sending messages)
   */
  const getClientIdForPeer = useCallback((peerId: string): string | undefined => {
    return peerIdToClientIdRef.current.get(peerId);
  }, []);

  /**
   * Get the profile ID for a WebSocket clientId (for receiving messages)
   */
  const getPeerIdForClient = useCallback((clientId: string): string | undefined => {
    return clientIdToPeerIdRef.current.get(clientId);
  }, []);

  /**
   * Get profile ID by IP address
   */
  const getPeerIdByIp = useCallback((ip: string): string | undefined => {
    return ipToPeerIdRef.current.get(ip);
  }, []);

  /**
   * Check if we have a mapping for a peer
   */
  const hasPeerMapping = useCallback((peerId: string): boolean => {
    return peerIdToClientIdRef.current.has(peerId);
  }, []);

  /**
   * Remove mapping when peer disconnects
   */
  const removePeerMapping = useCallback((peerId: string) => {
    const clientId = peerIdToClientIdRef.current.get(peerId);
    
    if (clientId) {
      clientIdToPeerIdRef.current.delete(clientId);
    }
    
    peerIdToClientIdRef.current.delete(peerId);
    
    // Clean up IP mapping
    for (const [ip, id] of ipToPeerIdRef.current.entries()) {
      if (id === peerId) {
        ipToPeerIdRef.current.delete(ip);
        break;
      }
    }
    
    console.log('[PeerMapping] Removed mapping for:', peerId);
  }, []);

  /**
   * Clear all mappings
   */
  const clearAllMappings = useCallback(() => {
    peerIdToClientIdRef.current.clear();
    clientIdToPeerIdRef.current.clear();
    ipToPeerIdRef.current.clear();
    console.log('[PeerMapping] Cleared all mappings');
  }, []);

  /**
   * Get all current mappings for debugging
   */
  const debugGetAllMappings = useCallback(() => {
    return {
      peerToClient: Object.fromEntries(peerIdToClientIdRef.current),
      clientToPeer: Object.fromEntries(clientIdToPeerIdRef.current),
      ipToPeer: Object.fromEntries(ipToPeerIdRef.current),
    };
  }, []);

  return {
    registerPeerConnection,
    updateFromJoinMessage,
    getClientIdForPeer,
    getPeerIdForClient,
    getPeerIdByIp,
    hasPeerMapping,
    removePeerMapping,
    clearAllMappings,
    debugGetAllMappings,
  };
}
