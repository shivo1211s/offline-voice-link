// LAN Discovery Plugin - TypeScript interface for native mDNS/NSD discovery
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { LanDiscoveryPlugin, DiscoveredPeer } from './LanDiscoveryTypes';
import { LanDiscoveryWeb } from './LanDiscoveryWeb';

// Re-export types for convenience
export type { DiscoveredPeer, LanDiscoveryPlugin } from './LanDiscoveryTypes';

// Use web fallback on web platform, native plugin on native
let LanDiscovery: LanDiscoveryPlugin;

if (Capacitor.isNativePlatform()) {
  LanDiscovery = registerPlugin<LanDiscoveryPlugin>('LanDiscovery');
} else {
  LanDiscovery = new LanDiscoveryWeb() as LanDiscoveryPlugin;
}

export default LanDiscovery;
