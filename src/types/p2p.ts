// P2P Types for offline LAN communication

export interface Peer {
  id: string;
  deviceId?: string;      // Persistent device identifier (ANDROID_ID)
  deviceName?: string;    // "Samsung Galaxy S21" for display
  macAddress?: string;    // MAC address for unique identification
  username: string;
  ip: string;
  isOnline: boolean;
  lastSeen: Date;
  avatarUrl?: string;
}

export interface P2PMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  type: 'text' | 'image' | 'file';
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'message' | 'typing' | 'seen' | 'delivered' | 'call-offer' | 'call-answer' | 'call-end' | 'peer-list';
  from: string;
  to?: string;
  payload: any;
}

export interface LocalProfile {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface ConnectionState {
  isHost: boolean;
  isConnected: boolean;
  hostIp?: string;
  myIp?: string;
  peers: Peer[];
}
