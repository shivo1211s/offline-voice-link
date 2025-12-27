// LAN Discovery Plugin Types - shared between native and web implementations

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
  
  // Get persistent device identifier (ANDROID_ID) and device name
  getDeviceId(): Promise<{ deviceId: string; deviceName: string }>;
  
  // Add listener for peer discovery events
  addListener(
    eventName: 'peerFound' | 'peerLost',
    listenerFunc: (peer: DiscoveredPeer) => void
  ): Promise<{ remove: () => void }>;
}
