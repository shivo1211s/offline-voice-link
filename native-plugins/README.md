# Native Plugins for LAN Chat

This directory contains backup copies of the native Android plugins for the LAN Chat application. These plugins enable peer-to-peer communication over local networks.

## Why This Exists

When you run `npx cap add android` (e.g., after deleting the android folder or on a fresh clone), Capacitor creates a fresh Android project without our custom native plugins. This directory stores the plugin source files so they can be easily restored.

## Plugins Included

### 1. LanDiscoveryPlugin
- **Purpose**: Network Service Discovery (NSD) for finding peers on the local network
- **Features**:
  - Advertise presence on the network (mDNS)
  - Discover other devices running the app
  - Get local IP address

### 2. WebSocketServerPlugin
- **Purpose**: WebSocket server/client for peer-to-peer messaging
- **Features**:
  - Run a WebSocket server to accept connections
  - Connect to other peers' WebSocket servers
  - Send/receive messages
  - Broadcast to all connected peers

## How to Restore Plugins

### Option 1: Run the Setup Script

```bash
npm run setup:android
```

This will:
1. Copy plugin files to the correct locations
2. Update MainActivity.java to register the plugins
3. Ensure build.gradle has the required dependencies

### Option 2: Manual Restoration

1. **Copy plugin files:**
   ```
   native-plugins/android/LanDiscoveryPlugin.java
   → android/app/src/main/java/app/lovable/lanchat/plugins/LanDiscoveryPlugin.java
   
   native-plugins/android/WebSocketServerPlugin.java
   → android/app/src/main/java/app/lovable/lanchat/plugins/WebSocketServerPlugin.java
   ```

2. **Update MainActivity.java:**
   Replace `android/app/src/main/java/app/lovable/lanchat/MainActivity.java` with the contents of `native-plugins/android/MainActivity.java`

3. **Add dependencies to `android/app/build.gradle`:**
   ```groovy
   dependencies {
       // ... existing dependencies ...
       
       // WebSocket library for server functionality
       implementation 'org.java-websocket:Java-WebSocket:1.5.4'
       
       // WebRTC for audio/video calls
       implementation 'io.github.webrtc-sdk:android:125.6422.06.1'
   }
   ```

4. **Sync and build:**
   ```bash
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

## File Structure

```
native-plugins/
├── README.md                           # This file
└── android/
    ├── LanDiscoveryPlugin.java         # NSD plugin source
    ├── WebSocketServerPlugin.java      # WebSocket plugin source
    ├── MainActivity.java               # MainActivity with plugin registration
    └── build.gradle.patch              # Required Gradle dependencies
```

## Required Android Permissions

The AndroidManifest.xml should include these permissions (usually already present):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Troubleshooting

### "Plugin not found" error
Make sure MainActivity.java registers the plugins before calling `super.onCreate()`:
```java
registerPlugin(LanDiscoveryPlugin.class);
registerPlugin(WebSocketServerPlugin.class);
super.onCreate(savedInstanceState);
```

### Build errors about missing classes
Run `npx cap sync android` to ensure Capacitor dependencies are properly linked.

### WebSocket connection issues
Check that both devices are on the same network and that firewall/router settings allow local network discovery.
