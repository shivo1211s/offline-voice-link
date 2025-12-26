// LAN Discovery Plugin - TypeScript interface for native mDNS/NSD discovery
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LanDiscoveryWeb } from './LanDiscoveryWeb';

export interface DiscoveredPeer {
  id: string;
  name: string;
  ip: string;
  port: number;
}

export interface LanDiscoveryPlugin {
  // Start advertising this device on the LAN
  startAdvertising(options: { serviceName: string; port: number }): Promise<void>;
  
  // Stop advertising
  stopAdvertising(): Promise<void>;
  
  // Start discovering other devices on LAN
  startDiscovery(options: { serviceType: string }): Promise<void>;
  
  // Stop discovery
  stopDiscovery(): Promise<void>;
  
  // Get list of discovered peers
  getDiscoveredPeers(): Promise<{ peers: DiscoveredPeer[] }>;
  
  // Get this device's local IP address
  getLocalIp(): Promise<{ ip: string }>;
  
  // Add listener for peer discovery events
  addListener(
    eventName: 'peerFound' | 'peerLost',
    listenerFunc: (peer: DiscoveredPeer) => void
  ): Promise<{ remove: () => void }>;
}

// Use web fallback on web platform, native plugin on native
let LanDiscovery: LanDiscoveryPlugin;

if (Capacitor.isNativePlatform()) {
  LanDiscovery = registerPlugin<LanDiscoveryPlugin>('LanDiscovery');
} else {
  LanDiscovery = new LanDiscoveryWeb() as LanDiscoveryPlugin;
}

export default LanDiscovery;
