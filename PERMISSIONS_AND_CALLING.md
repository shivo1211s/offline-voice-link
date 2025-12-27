# Permissions & Calling Feature Guide

## Overview
This document explains the permissions system and improved calling features added to Offline Voice Link.

## Features Added

### 1. Permission Request System
A comprehensive permission request system that asks users for required permissions before attempting to use them.

#### Permissions Requested
- **Microphone**: Required for audio calling and voice chat
- **Notifications**: Required for incoming call alerts (optional)
- **Camera** & **Storage**: Available for future features

#### How It Works
1. **On App Load**: The `PermissionRequest` component checks device permissions
2. **Alert Display**: Shows a banner asking for missing permissions
3. **User Action**: User clicks "Request" buttons to grant permissions
4. **Browser Dialog**: Browser shows native permission dialog
5. **Status Update**: Component updates to reflect granted/denied status

#### File Location
- Hook: `src/hooks/usePermissions.ts`
- Component: `src/components/permissions/PermissionRequest.tsx`
- Integrated in: `src/App.tsx`

### 2. Enhanced Calling System

#### Call Flow
```
User A                          WebSocket                      User B
  |                              |                              |
  +------ initiateCall() -------->|                              |
  |       Send 'call-offer'       |                              |
  |                               +---> onMessage handler ------>|
  |                               |     Store offer, notify      |
  |                               |     User sees incoming call   |
  |                               |                              |
  |                               |<----- answerCall() ---------+
  |                               |       Send 'call-answer'     |
  |<----- Receive answer ---------+                              |
  |       Set remote description   |                              |
  |                               |                              |
  +------ ICE Candidates -------->|---> ICE Candidates --------->+
  |       Establish connection     |                              |
  |<----- ICE Candidates ---------+<----- ICE Candidates --------+
  |                               |                              |
  |<----------- Audio Stream Connected --------->               |
  |                                                              |
  |<============= CALL ACTIVE ============>                     |
  |                                                              |
  +------ endCall() (call-end) --->|---> Cleanup & Close ------>+
```

#### Key Functions

##### `initiateCall(peerId: string)`
**Initiates an outgoing call**

```typescript
await initiateCall(peerId)
```

**Process**:
1. Request microphone permission (with proper error handling)
2. Get audio stream with constraints (echo cancellation, noise suppression)
3. Create RTCPeerConnection with STUN servers
4. Add local audio tracks to connection
5. Create SDP offer
6. Send offer to peer via WebSocket signaling
7. Wait for answer from peer

**Error Handling**:
- `NotAllowedError`: Microphone permission denied
- `NotFoundError`: No microphone device found
- `SecurityError`: HTTPS/localhost requirement
- `TypeError`: Browser doesn't support audio

##### `answerCall(peerId: string)`
**Answers an incoming call**

```typescript
await answerCall(peerId)
```

**Process**:
1. Request microphone permission
2. Get audio stream with constraints
3. Create RTCPeerConnection
4. Add local audio tracks
5. Retrieve pending offer from peer
6. Set remote description (peer's offer)
7. Create SDP answer
8. Send answer back to peer
9. Wait for ICE candidates and connection

##### `endCall(peerId: string)`
**Ends an active call**

```typescript
endCall(peerId)
```

**Process**:
1. Stop local audio stream (stop all tracks)
2. Clear remote stream
3. Close peer connection
4. Clean up internal state
5. Send 'call-end' signal to peer

### 3. WebRTC Configuration

#### STUN Servers
Used for NAT traversal to find public IP addresses:
```javascript
{
  urls: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
  ]
}
```

#### Audio Constraints
Enables professional audio quality:
```javascript
{
  echoCancellation: true,    // Remove echo
  noiseSuppression: true,    // Remove background noise
  autoGainControl: true,     // Normalize volume
}
```

#### ICE Candidate Pool
- Pool size: 10 candidates
- Faster connection establishment
- Better coverage for different network types

### 4. Connection States & Monitoring

#### ICE Connection States
- `new`: Initial state
- `checking`: Checking connectivity
- `connected`: Connection successful
- `completed`: All candidates checked
- `disconnected`: Connection lost temporarily
- `failed`: Unable to establish connection
- `closed`: Connection closed

#### Signaling States
- `stable`: Ready for offer/answer
- `have-local-offer`: Offer sent, waiting for answer
- `have-remote-offer`: Offer received, ready to answer
- `have-local-pranswer`: Provisional answer sent
- `have-remote-pranswer`: Provisional answer received

#### Detailed Logging
All connection states logged with emojis for easy debugging:
```
📞 Initiating call with peer
🎤 Requesting microphone access
✓ Microphone permission granted
📤 Creating SDP offer
🔗 Setting local description
📨 Sending call offer to peer
🔄 ICE gathering state: gathering
📤 ICE candidate: candidate:...
✓ ICE gathering complete
🔌 ICE connection state: connected
📡 Connection state: connected
✓ Peer connection established!
🎧 Remote track received: audio
✓ Remote stream ready
```

## Usage Examples

### Basic Calling

**Initiate a call**:
```typescript
import { usePeerNetwork } from '@/hooks/usePeerNetwork';

function MyComponent() {
  const { initiateCall } = usePeerNetwork({...});
  
  return (
    <button onClick={() => initiateCall('peer-id')}>
      Call User
    </button>
  );
}
```

**Handle incoming call**:
```typescript
function MyComponent() {
  const { onCallOffer } = usePeerNetwork({
    onCallOffer: (fromPeer) => {
      console.log(`Incoming call from ${fromPeer.username}`);
      // Show incoming call UI
    },
  });
}
```

**Answer a call**:
```typescript
function MyComponent() {
  const { answerCall } = usePeerNetwork({...});
  
  return (
    <button onClick={() => answerCall('peer-id')}>
      Accept Call
    </button>
  );
}
```

**End a call**:
```typescript
function MyComponent() {
  const { endCall } = usePeerNetwork({...});
  
  return (
    <button onClick={() => endCall('peer-id')}>
      End Call
    </button>
  );
}
```

### Permission Handling

**Check permissions**:
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { permissions, checkAllPermissions } = usePermissions();
  
  useEffect(() => {
    checkAllPermissions();
  }, []);
  
  return (
    <div>
      Microphone: {permissions.microphone}
      Notifications: {permissions.notification}
    </div>
  );
}
```

**Request specific permission**:
```typescript
const { requestMicrophonePermission } = usePermissions();

await requestMicrophonePermission();
```

## Testing the Calling Feature

### Prerequisites
1. Two devices on the same network (LAN)
2. Both running the Offline Voice Link application
3. Microphones connected and working

### Steps to Test

1. **Grant Permissions**:
   - Open app on both devices
   - Click "Request" for Microphone permission
   - Browser shows native permission dialog
   - Click "Allow" to grant permission

2. **Check Device Discovery**:
   - Both devices should appear in the peer list
   - Device shows as "Online"
   - Check console: look for mDNS discovery logs

3. **Initiate Call**:
   - On Device A: Click the call button for Device B
   - Device A logs: `📞 Initiating call with peer...`
   - Console shows `✓ Microphone permission granted!`

4. **Receive Call**:
   - Device B receives incoming call notification
   - Shows "Incoming call from [Device A username]"
   - User can Accept or Decline

5. **Answer Call**:
   - Device B: Click "Accept Call"
   - Device B requests microphone permission
   - Device B logs: `✓ Microphone permission granted!`

6. **Connected**:
   - Both devices show active call screen
   - Console shows: `✓ Peer connection established!`
   - `🎧 Remote track received: audio`
   - Audio is now flowing between devices

7. **Test Audio**:
   - Speak into microphone on Device A
   - Listen for audio on Device B speakers
   - Speak on Device B
   - Listen on Device A

8. **End Call**:
   - Device A or B: Click "End Call" button
   - Call closes properly
   - Streams stop, connection closes

### Debugging Checklist

If calling doesn't work, check these in order:

1. **Microphone Permission**:
   ```
   ✓ Look for: "Microphone permission granted!" in console
   ✗ If missing: Click "Request" in the permission banner
   ```

2. **Device Discovery**:
   ```
   ✓ Look for: "mDNS discovery found peer"
   ✗ If missing: Both devices must be on same network
   ```

3. **WebRTC Connection**:
   ```
   ✓ Look for: "Peer connection established!"
   ✗ If missing: Check "ICE connection failed" error
   ```

4. **Audio Tracks**:
   ```
   ✓ Look for: "Local audio tracks: 1"
   ✓ Look for: "Remote track received: audio"
   ✗ If missing: Microphone permission issue
   ```

5. **Signaling Messages**:
   ```
   ✓ Look for: "call-offer sent to peer"
   ✓ Look for: "call-answer received from peer"
   ✗ If missing: WebSocket connection issue
   ```

6. **Network Connectivity**:
   - Both devices must be on same LAN
   - Test with: `ping [other-device-ip]`
   - Check WiFi connection status
   - Disable VPN if using one

### Console Inspection

Open browser DevTools (F12) and go to Console tab. Look for:

**Successful call sequence**:
```
[usePeerNetwork] 📞 Initiating call with peer: peer-123
[usePeerNetwork] 🎤 Requesting microphone access...
[usePeerNetwork] ✓ Microphone permission granted!
[usePeerNetwork] Local audio tracks: 1
[WebRTC] Creating peer connection with STUN servers...
[usePeerNetwork] Adding track to peer connection: audio
[usePeerNetwork] 📤 Creating SDP offer...
[usePeerNetwork] ✓ Offer created
[usePeerNetwork] 📨 Sending call offer to peer
[WebRTC] 🔌 ICE connection state: connected
[WebRTC] 📡 Connection state: connected
[WebRTC] ✓ Peer connection established! Ready for audio.
[WebRTC] 🎧 Remote track received: audio state: live
[WebRTC] ✓ Remote stream ready with 1 tracks
```

**Error cases**:
```
❌ NotAllowedError: Permission denied by browser
❌ NotFoundError: No microphone device connected
❌ ICE connection failed: Network connectivity issue
❌ Call connection failed: Peer unreachable
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ App.tsx                                                     │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ PermissionRequest Component                           │   │
│ │ - Checks permissions on load                          │   │
│ │ - Shows permission banner                             │   │
│ │ │ ┌────────────────────────────────────────────────┐  │   │
│ │ │ │ usePermissions Hook                            │  │   │
│ │ │ │ - requestMicrophonePermission()                │  │   │
│ │ │ │ - requestNotificationPermission()              │  │   │
│ │ │ │ - checkAllPermissions()                        │  │   │
│ │ │ └────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Index.tsx (Main Page)                                 │   │
│ │ - Shows peer list                                     │   │
│ │ - Shows call screen                                   │   │
│ │ │ ┌────────────────────────────────────────────────┐  │   │
│ │ │ │ usePeerNetwork Hook                            │  │   │
│ │ │ │ ├─ goOnline()                                  │  │   │
│ │ │ │ ├─ initiateCall(peerId)                        │  │   │
│ │ │ │ ├─ answerCall(peerId)                          │  │   │
│ │ │ │ ├─ endCall(peerId)                             │  │   │
│ │ │ │ ├─ broadcast(message)                          │  │   │
│ │ │ │ └─ sendToPeer(peerId, message)                 │  │   │
│ │ │ │    ┌────────────────────────────────────────┐  │  │   │
│ │ │ │    │ RTCPeerConnection Management           │  │  │   │
│ │ │ │    │ ├─ createPeerConnection(peerId)       │  │  │   │
│ │ │ │    │ ├─ handleCallAnswer(message)          │  │  │   │
│ │ │ │    │ ├─ handleIceCandidate(message)        │  │  │   │
│ │ │ │    │ └─ handleCallEnd(peerId)              │  │  │   │
│ │ │ │    │    ┌──────────────────────────────┐   │  │  │   │
│ │ │ │    │    │ WebRTC Events                 │   │  │  │   │
│ │ │ │    │    │ ├─ onicecandidate            │   │  │  │   │
│ │ │ │    │    │ ├─ onconnectionstatechange  │   │  │  │   │
│ │ │ │    │    │ ├─ oniceconnectionstatechange│  │  │  │   │
│ │ │ │    │    │ ├─ onsignalingstatechange   │   │  │  │   │
│ │ │ │    │    │ └─ ontrack (remote audio)   │   │  │  │   │
│ │ │ │    │    └──────────────────────────────┘   │  │  │   │
│ │ │ │    └────────────────────────────────────────┘  │  │   │
│ │ │ │    ┌────────────────────────────────────────┐  │  │   │
│ │ │ │    │ WebSocket Signaling                    │  │  │   │
│ │ │ │    │ ├─ sendToPeer()                       │  │  │   │
│ │ │ │    │ ├─ broadcast()                        │  │  │   │
│ │ │ │    │ └─ handleIncomingData()               │  │  │   │
│ │ │ │    └────────────────────────────────────────┘  │  │   │
│ │ │ │    ┌────────────────────────────────────────┐  │  │   │
│ │ │ │    │ mDNS Discovery                         │  │  │   │
│ │ │ │    │ ├─ startAdvertising()                 │  │  │   │
│ │ │ │    │ ├─ startDiscovery()                   │  │  │   │
│ │ │ │    │ └─ LanDiscovery plugin               │  │  │   │
│ │ │ │    └────────────────────────────────────────┘  │  │   │
│ │ │ └────────────────────────────────────────────────┘  │   │
│ │ ├─ ContactList Component                            │   │
│ │ │  - Shows online peers                            │   │
│ │ │  - Call button                                   │   │
│ │ └─ P2PCallScreen Component                         │   │
│ │    - Active call UI                                │   │
│ │    - Audio elements                                │   │
│ │    - End call button                               │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Known Limitations & Future Improvements

### Current Limitations
1. **No TURN servers**: Won't work through restrictive NATs
2. **Audio only**: No video calling support
3. **One call at a time**: Can't make multiple simultaneous calls
4. **No call recording**: No ability to record calls
5. **No call history**: Calls not stored or logged

### Planned Improvements
1. Add TURN server support for better NAT traversal
2. Call timeout (auto-reject after 30 seconds)
3. Reconnection logic for dropped connections
4. Call history and logging
5. Do-Not-Disturb mode
6. Missed call notifications
7. Call transfer between devices
8. Conference calling support

## Troubleshooting

### Common Issues

**Issue**: Microphone permission not showing up
- **Solution**: Reload page and click "Request" button again

**Issue**: Peer list is empty
- **Solution**: 
  1. Make sure both devices are on same WiFi
  2. Click "Go Online" button
  3. Wait 3-5 seconds for discovery

**Issue**: Call connects but no audio
- **Solution**:
  1. Check microphone is working (test on another app)
  2. Check speaker/headphone volume
  3. Verify microphone permission granted
  4. Check browser console for audio track errors

**Issue**: "Connection failed: Unable to reach peer"
- **Solution**:
  1. Both devices must be on same network
  2. No NAT/firewall between devices
  3. Try manual IP connect as alternative

**Issue**: Call stuck in "connecting" state
- **Solution**:
  1. Check network connectivity (ping other device)
  2. Reload both apps
  3. Check console for ICE candidate errors

## References

- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RTCPeerConnection Documentation](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [WebRTC Signaling](https://webrtc.org/getting-started/peer-connections)

## Support

For issues or questions about the calling feature:
1. Check the console logs (F12 > Console)
2. Review the [CALLING_FEATURE_DEBUG.md](CALLING_FEATURE_DEBUG.md)
3. Check [CALLING_QUICK_START.md](CALLING_QUICK_START.md) for quick start guide

