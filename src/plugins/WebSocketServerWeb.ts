// Web fallback for WebSocket Server - uses BroadcastChannel for same-device messaging
import { WebPlugin } from '@capacitor/core';
import type { WebSocketServerPlugin } from './WebSocketServer';

export class WebSocketServerWeb extends WebPlugin implements WebSocketServerPlugin {
  private broadcastChannel: BroadcastChannel | null = null;
  private myId: string = '';
  private connectedPeers: Set<string> = new Set();
  private peerSockets: Map<string, WebSocket> = new Map();

  async start(options: { port: number }): Promise<{ port: number }> {
    this.myId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.broadcastChannel) {
      this.broadcastChannel = new BroadcastChannel('lan-chat-signaling');
      this.setupBroadcastListener();
    }
    
    console.log('[WebSocketServerWeb] Started server simulation on port:', options.port);
    return { port: options.port };
  }

  async stop(): Promise<void> {
    // Close all peer connections
    this.peerSockets.forEach(ws => ws.close());
    this.peerSockets.clear();
    this.connectedPeers.clear();
    
    console.log('[WebSocketServerWeb] Stopped server');
  }

  async send(options: { clientId: string; data: string }): Promise<void> {
    // Try direct WebSocket first
    const ws = this.peerSockets.get(options.clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(options.data);
      return;
    }
    
    // Fallback to broadcast channel
    this.broadcastChannel?.postMessage({
      type: 'direct-message',
      from: this.myId,
      to: options.clientId,
      data: options.data
    });
  }

  async broadcast(options: { data: string }): Promise<void> {
    // Send via all WebSocket connections
    this.peerSockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(options.data);
      }
    });
    
    // Also broadcast via channel
    this.broadcastChannel?.postMessage({
      type: 'broadcast-message',
      from: this.myId,
      data: options.data
    });
  }

  async connectToPeer(options: { ip: string; port: number }): Promise<{ clientId: string }> {
    const clientId = `${options.ip}:${options.port}`;
    
    // In web context, try to connect via WebSocket if the address is valid
    if (options.ip !== '127.0.0.1' && options.ip !== 'localhost') {
      try {
        const ws = new WebSocket(`ws://${options.ip}:${options.port}`);
        
        ws.onopen = () => {
          this.peerSockets.set(clientId, ws);
          this.connectedPeers.add(clientId);
          this.notifyListeners('clientConnected', { clientId });
          console.log('[WebSocketServerWeb] Connected to peer:', clientId);
        };
        
        ws.onmessage = (event) => {
          this.notifyListeners('messageReceived', {
            clientId,
            data: event.data
          });
        };
        
        ws.onclose = () => {
          this.peerSockets.delete(clientId);
          this.connectedPeers.delete(clientId);
          this.notifyListeners('clientDisconnected', { clientId });
        };
        
        ws.onerror = (error) => {
          console.error('[WebSocketServerWeb] Connection error:', error);
        };
      } catch (error) {
        console.error('[WebSocketServerWeb] Failed to connect:', error);
      }
    }
    
    // For same-device testing, just track the ID
    this.connectedPeers.add(clientId);
    
    return { clientId };
  }

  async disconnectFromPeer(options: { clientId: string }): Promise<void> {
    const ws = this.peerSockets.get(options.clientId);
    if (ws) {
      ws.close();
      this.peerSockets.delete(options.clientId);
    }
    this.connectedPeers.delete(options.clientId);
  }

  async getConnectedClients(): Promise<{ clients: string[] }> {
    return { clients: Array.from(this.connectedPeers) };
  }

  private setupBroadcastListener() {
    if (!this.broadcastChannel) return;
    
    this.broadcastChannel.onmessage = (event) => {
      const data = event.data;
      
      if (data.from === this.myId) return; // Ignore own messages
      
      switch (data.type) {
        case 'direct-message':
          if (data.to === this.myId) {
            this.notifyListeners('messageReceived', {
              clientId: data.from,
              data: data.data
            });
          }
          break;
          
        case 'broadcast-message':
          this.notifyListeners('messageReceived', {
            clientId: data.from,
            data: data.data
          });
          break;
      }
    };
  }
}
