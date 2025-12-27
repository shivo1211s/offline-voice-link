import { useState, useCallback, useEffect } from 'react';
import { getMessages } from '@/lib/storage';

interface UnreadCount {
  [peerId: string]: number;
}

export function useUnreadMessages(myProfileId: string | undefined, peers: any[] = []) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});

  // Calculate unread messages for a peer
  const calculateUnreadCount = useCallback(async (peerId: string) => {
    if (!myProfileId) return 0;
    
    try {
      const messages = await getMessages(myProfileId, peerId);
      // Count messages from peer that haven't been seen by us
      const unread = messages.filter(
        m => m.receiverId === myProfileId && m.senderId === peerId && m.status !== 'seen'
      ).length;
      return unread;
    } catch (error) {
      console.error('[useUnreadMessages] Error calculating unread count:', error);
      return 0;
    }
  }, [myProfileId]);

  // Load unread counts for all peers
  const loadUnreadCounts = useCallback(async () => {
    if (!myProfileId || peers.length === 0) return;

    const counts: UnreadCount = {};
    for (const peer of peers) {
      counts[peer.id] = await calculateUnreadCount(peer.id);
    }
    setUnreadCounts(counts);
  }, [myProfileId, peers, calculateUnreadCount]);

  // Load on mount and when peers change
  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // Mark peer messages as seen
  const markPeerAsSeen = useCallback(async (peerId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [peerId]: 0
    }));
  }, []);

  // Add unread count when new message arrives
  const addUnreadMessage = useCallback((fromPeerId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [fromPeerId]: (prev[fromPeerId] || 0) + 1
    }));
  }, []);

  return {
    unreadCounts,
    loadUnreadCounts,
    markPeerAsSeen,
    addUnreadMessage,
    getTotalUnread: () => Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  };
}
