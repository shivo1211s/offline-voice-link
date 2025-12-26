// WebSocket Server Plugin - TypeScript interface for native WebSocket server
import { Capacitor, registerPlugin } from '@capacitor/core';
import { WebSocketServerWeb } from './WebSocketServerWeb';

export interface WebSocketMessage {
  clientId: string;
  data: string;
}

export interface WebSocketServerPlugin {
  // Start WebSocket server on specified port
  start(options: { port: number }): Promise<{ port: number }>;
  
  // Stop the server
  stop(): Promise<void>;
  
  // Send message to a specific client
  send(options: { clientId: string; data: string }): Promise<void>;
  
  // Broadcast message to all clients
  broadcast(options: { data: string }): Promise<void>;
  
  // Connect to another peer's WebSocket server
  connectToPeer(options: { ip: string; port: number }): Promise<{ clientId: string }>;
  
  // Disconnect from a peer
  disconnectFromPeer(options: { clientId: string }): Promise<void>;
  
  // Get list of connected clients
  getConnectedClients(): Promise<{ clients: string[] }>;
  
  // Add listener for WebSocket events
  addListener(
    eventName: 'clientConnected' | 'clientDisconnected' | 'messageReceived',
    listenerFunc: (data: any) => void
  ): Promise<{ remove: () => void }>;
}

// Use web fallback on web platform, native plugin on native
let WebSocketServer: WebSocketServerPlugin;

if (Capacitor.isNativePlatform()) {
  WebSocketServer = registerPlugin<WebSocketServerPlugin>('WebSocketServer');
} else {
  WebSocketServer = new WebSocketServerWeb() as WebSocketServerPlugin;
}

export default WebSocketServer;
