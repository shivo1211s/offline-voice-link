// LAN Discovery Plugin - TypeScript interface for native mDNS/NSD discovery
import { registerPlugin } from '@capacitor/core';

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

// Register the plugin - will be implemented in native Android code
const LanDiscovery = registerPlugin<LanDiscoveryPlugin>('LanDiscovery', {
  web: () => import('./LanDiscoveryWeb').then(m => new m.LanDiscoveryWeb()),
});

export default LanDiscovery;
