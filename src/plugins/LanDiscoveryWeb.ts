// Web fallback for LAN Discovery - uses BroadcastChannel for same-device testing
import { WebPlugin } from '@capacitor/core';
import type { LanDiscoveryPlugin, DiscoveredPeer } from './LanDiscovery';

export class LanDiscoveryWeb extends WebPlugin implements LanDiscoveryPlugin {
  private broadcastChannel: BroadcastChannel | null = null;
  private discoveredPeers: Map<string, DiscoveredPeer> = new Map();
  private serviceName: string = '';
  private port: number = 0;
  private isAdvertising: boolean = false;
  private discoveryInterval: number | null = null;

  async startAdvertising(options: { serviceName: string; port: number }): Promise<void> {
    this.serviceName = options.serviceName;
    this.port = options.port;
    this.isAdvertising = true;
    
    if (!this.broadcastChannel) {
      this.broadcastChannel = new BroadcastChannel('lan-chat-discovery');
      this.setupBroadcastListener();
    }
    
    // Announce ourselves
    this.broadcastChannel.postMessage({
      type: 'announce',
      peer: {
        id: this.serviceName,
        name: this.serviceName,
        ip: '127.0.0.1',
        port: this.port
      }
    });
    
    console.log('[LanDiscoveryWeb] Started advertising:', options.serviceName);
  }

  async stopAdvertising(): Promise<void> {
    if (this.isAdvertising && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'leave',
        peerId: this.serviceName
      });
    }
    this.isAdvertising = false;
    console.log('[LanDiscoveryWeb] Stopped advertising');
  }

  async startDiscovery(options: { serviceType: string }): Promise<void> {
    if (!this.broadcastChannel) {
      this.broadcastChannel = new BroadcastChannel('lan-chat-discovery');
      this.setupBroadcastListener();
    }
    
    // Request announcements from others
    this.broadcastChannel.postMessage({ type: 'discovery-request' });
    
    // Periodically request updates
    this.discoveryInterval = window.setInterval(() => {
      this.broadcastChannel?.postMessage({ type: 'discovery-request' });
    }, 5000);
    
    console.log('[LanDiscoveryWeb] Started discovery for:', options.serviceType);
  }

  async stopDiscovery(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    console.log('[LanDiscoveryWeb] Stopped discovery');
  }

  async getDiscoveredPeers(): Promise<{ peers: DiscoveredPeer[] }> {
    return { peers: Array.from(this.discoveredPeers.values()) };
  }

  async getLocalIp(): Promise<{ ip: string }> {
    // In browser, we can't get real IP - return localhost
    return { ip: '127.0.0.1' };
  }

  private setupBroadcastListener() {
    if (!this.broadcastChannel) return;
    
    this.broadcastChannel.onmessage = (event) => {
      const data = event.data;
      
      switch (data.type) {
        case 'announce':
          if (data.peer.id !== this.serviceName) {
            this.discoveredPeers.set(data.peer.id, data.peer);
            this.notifyListeners('peerFound', data.peer);
          }
          break;
          
        case 'leave':
          const peer = this.discoveredPeers.get(data.peerId);
          if (peer) {
            this.discoveredPeers.delete(data.peerId);
            this.notifyListeners('peerLost', peer);
          }
          break;
          
        case 'discovery-request':
          // Re-announce ourselves if advertising
          if (this.isAdvertising) {
            this.broadcastChannel?.postMessage({
              type: 'announce',
              peer: {
                id: this.serviceName,
                name: this.serviceName,
                ip: '127.0.0.1',
                port: this.port
              }
            });
          }
          break;
      }
    };
  }
}
