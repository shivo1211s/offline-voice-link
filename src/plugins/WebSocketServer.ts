// WebSocket Server Plugin - TypeScript interface for native WebSocket server
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { WebSocketServerPlugin, WebSocketMessage } from './WebSocketServerTypes';
import { WebSocketServerWeb } from './WebSocketServerWeb';

// Re-export types for convenience
export type { WebSocketServerPlugin, WebSocketMessage } from './WebSocketServerTypes';

// Use web fallback on web platform, native plugin on native
let WebSocketServer: WebSocketServerPlugin;

if (Capacitor.isNativePlatform()) {
  WebSocketServer = registerPlugin<WebSocketServerPlugin>('WebSocketServer');
} else {
  WebSocketServer = new WebSocketServerWeb() as WebSocketServerPlugin;
}

export default WebSocketServer;
