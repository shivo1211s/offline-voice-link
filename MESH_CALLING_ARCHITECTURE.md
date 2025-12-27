# Mesh Network Calling Architecture

## Overview

The Offline Voice Link calling system is designed to work seamlessly across peer-to-peer networks without relying on central servers. This document explains how the mesh-style calling works between devices.

## Core Architecture

### Network Topology: P2P Mesh

```
Device A (Phone)           Device B (Phone)           Device C (Phone)
    ┌────────┐                ┌────────┐                ┌────────┐
    │WebRTC  │                │WebRTC  │                │WebRTC  │
    │  PC    │◄──────────────►│  PC    │                │  PC    │
    │        │   Audio Stream │        │                │        │
    │        │                │        │◄──────────────►│        │
    │        │                │        │   Audio Stream │        │
    │        │◄──────────────────────────────────────────────────►│
    └────────┘                └────────┘                └────────┘
        ▲                           ▲                        ▲
        │                           │                        │
        │     WebSocket Signaling   │                        │
        └───────────┬───────────────┴────────────────────────┘
                    │
              ┌─────▼─────┐
              │WebSocket  │
              │Server     │
              │(Discovery)│
              └───────────┘
```

### Three Connection Types

#### 1. **mDNS Discovery** (LAN Discovery)
- **Purpose**: Find peers on local network
- **Protocol**: Multicast DNS
- **Range**: Local network segment
- **Latency**: Very low (< 50ms)
- **Data**: Just peer metadata (name, IP, ID)

```
Device A broadcasts: "I am [username] at [IP] with [deviceId]"
Device B hears broadcast: Stores peer info
Device B broadcasts: "I am [username] at [IP] with [deviceId]"
Device A hears broadcast: Stores peer info
```

#### 2. **WebSocket Signaling** (Peer Coordination)
- **Purpose**: Exchange WebRTC offer/answer, ICE candidates
- **Protocol**: WebSocket (TCP)
- **Connection**: Device-to-device via WebSocket server
- **Data**: SDP offers, SDP answers, ICE candidates
- **Size**: Small (1-5 KB per message)

```
Device A → WebSocket → Device B: "Here's my audio offer"
Device B → WebSocket ← Device A: "I accept, here's my answer"
Device A → WebSocket → Device B: "ICE candidate: 192.168.1.5:54321"
Device B → WebSocket ← Device A: "ICE candidate: 192.168.1.3:51234"
```

#### 3. **WebRTC Data Channel** (Voice Audio)
- **Purpose**: Direct audio stream transmission
- **Protocol**: UDP with RTP (Real-time Transport Protocol)
- **Connection**: Direct peer-to-peer (P2P)
- **Data**: Compressed audio frames
- **Size**: Continuous stream (16KB/sec at 128kbps)

```
Device A ◄════════════════► Device B
         Encrypted UDP Audio
         (Direct, no intermediate)
```

## Call Establishment Flow

### Step 1: Network Discovery (Setup Phase)

```
Device A                    Network               Device B
   │                          │                      │
   ├─ Start mDNS advertising ─┤                      │
   │  (broadcast my presence)  │                      │
   │                           │                      │
   │                           ├─ Start mDNS advertising
   │                           │  (broadcast my presence)
   │                           │
   ├─◄─ mDNS discovery event ─┤                      │
   │    (found Device B)       │                      │
   │                           │                      ├─◄─ mDNS discovery
   │                           │                     │    (found Device A)
   │
   └─ Add to peer list
      (Device B: online, ip: 192.168.1.10)
```

### Step 2: Initiate Call (Caller → Receiver)

```
User Action: Device A user clicks "Call Device B"

Device A                                          Device B
   │                                                  │
   │◄─────── initiateCall('deviceB-id') ──────────────┤
   │
   ├─ Request microphone permission
   │  (getUserMedia)
   │
   ├─ Get local audio stream
   │  (1 audio track, 48kHz stereo)
   │
   ├─ Create RTCPeerConnection
   │  ├─ Configure STUN servers (5 Google STUN)
   │  ├─ Set ice candidate pool size (10)
   │  └─ Setup event handlers
   │
   ├─ Add local audio tracks
   │  (addTrack(audioTrack, stream))
   │
   ├─ Create SDP Offer
   │  (createOffer with audio constraints)
   │
   ├─ Set local description
   │  (setLocalDescription(offer))
   │
   ├─ Send offer via WebSocket ───────────────────────► WebSocket Server
                                                          │
                                                          ├─ Route to Device B
                                                          │
                                                          ──────────────►│
                                                                          │
                                                                    onMessage:
                                                                    'call-offer'
```

### Step 3: Receiver Accepts Call

```
Device B receives: { type: 'call-offer', payload: { sdp: offer } }

Device B                                           Device A
   │                                                  │
   ├─ Show incoming call UI
   │  "Device A is calling..."
   │
   │ [User clicks "Accept Call"]
   │
   ├─ Call answerCall('deviceA-id')
   │
   ├─ Request microphone permission
   │  (getUserMedia)
   │
   ├─ Get local audio stream
   │  (1 audio track, 48kHz stereo)
   │
   ├─ Create RTCPeerConnection
   │  ├─ Configure STUN servers
   │  ├─ Set ice candidate pool size
   │  └─ Setup event handlers
   │
   ├─ Add local audio tracks
   │  (addTrack(audioTrack, stream))
   │
   ├─ Set remote description
   │  (setRemoteDescription with offer from Device A)
   │
   ├─ Create SDP Answer
   │  (createAnswer with audio constraints)
   │
   ├─ Set local description
   │  (setLocalDescription(answer))
   │
   └─ Send answer via WebSocket ─────────────────────► WebSocket Server
                                                          │
                                                          ├─ Route to Device A
                                                          │
                                                          ──────────────►│
                                                                          │
                                                                    onMessage:
                                                                    'call-answer'
```

### Step 4: Establish P2P Connection (ICE Negotiation)

```
Device A                                            Device B
   │                                                   │
   │ onicecandidate event fires                      │
   │ (found network path to Device B)                │
   │                                                   │
   │ Candidate: 192.168.1.5:54321                    │
   │ (My local IP:port)                              │
   │                                                   │
   ├─ Send ICE candidate via WebSocket ─────────────►│
   │                                                   │
   │ (Multiple candidates sent)                       │
   │                                                   │
   ├─◄─ Receive ICE candidate from Device B ────────┤
   │                                                   │
   │ onicecandidate event (from Device B)            │
   │                                                   │
   │ Candidate: 192.168.1.10:51234                   │
   │ (Device B local IP:port)                        │
   │                                                   │
   ├─ Add ICE candidate to connection                │
   │  (addIceCandidate)                              │
   │                                                   │
   ├─ oniceconnectionstatechange: connected         │
   │  (Found viable path!)                           │
   │                                                   │
   └─ ontrack event fires                           └─ ontrack event fires
     (Receiving Device B audio)                       (Receiving Device A audio)
```

### Step 5: Audio Flow (Connected Phase)

```
Device A                                           Device B
┌──────────────────┐                          ┌──────────────────┐
│ Local Microphone │──►audio track────────┐   │ Local Microphone │
│ (captures sound) │                      │   │ (captures sound) │
└──────────────────┘                      │   └──────────────────┘
                                          │
                                      RTCPeerConnection
                                          │
                                   [Codec: Opus]
                                   [Encrypt: DTLS]
                                   [Transport: RTP/UDP]
                                          │
                            P2P UDP Audio Stream
                    ◄────────────────────────────────►
             (192.168.1.5:54321 ◄─► 192.168.1.10:51234)
                                          │
                                          │
                              ┌──────────────────┐
                              │ Speaker/Earbuds  │
                              │ (plays remote    │
                              │  audio)          │
                              └──────────────────┘
                                   Device B

Real-time Metrics:
├─ Audio latency: 20-100ms (LAN), 100-300ms (WAN)
├─ Packet loss: < 1% (wired LAN), 2-5% (WiFi)
├─ Jitter buffer: 20-200ms
└─ Audio quality: HD (16-48 kHz, stereo)
```

## Message Exchange Sequence Diagram

```
Device A (Caller)              WebSocket             Device B (Receiver)
         │                          │                        │
         │─────────── join ────────►│                        │
         │  "I'm Device A at 192.1" │────────── join ───────►│
         │                          │                        │
         │◄─── discovery event ─────│◄─── discovery event ───│
         │                          │  "Device B online"     │
         │                          │                        │
[User clicks call button]            │                        │
         │                          │                        │
         ├─ getUserMedia()          │                        │
         │                          │                        │
         ├─ createOffer()           │                        │
         │                          │                        │
         └─────── call-offer ──────►│                        │
               (SDP offer)          ├───── onMessage ───────►│
                                    │                        │
                                    │        [Show incoming   │
                                    │         call alert]     │
                                    │                        │
                                    │    [User clicks accept]│
                                    │                        │
                                    │        ├─ getUserMedia()
                                    │        │               
                                    │        ├─ createAnswer()
                                    │                        │
                                    │◄─── call-answer ───────┤
                                    │     (SDP answer)       │
         ◄─────── call-answer ──────┤                        │
               (SDP answer)         │                        │
         │                          │                        │
         ├─ onicecandidate         │        ├─ onicecandidate
         │                          │        │
         └─ ice-candidate ─────────►│─── ice-candidate ────►│
            (my IP:port)            │                        │
                                    │                        │
         ◄─ ice-candidate ──────────┤◄── ice-candidate ──────┤
            (Device B IP:port)      │                        │
         │                          │                        │
         ├─ addIceCandidate()       │        ├─ addIceCandidate()
         │                          │        │
         ├─ oniceconnectionstate    │        ├─ oniceconnectionstate
         │  "connected"             │        │  "connected"
         │                          │        │
         ├─ ontrack event          │        ├─ ontrack event
         │  (receives audio)        │        │  (receives audio)
         │                          │        │
         ├════════════════ Direct UDP Audio Stream ═══════════►
                      192.168.1.5:54321 ◄─► 192.168.1.10:51234
                          │                        │
                          ├─ Remote audio playing ─┤
                          │                        │
         [Active Call - Audio flowing both ways]   │
                          │                        │
[User clicks end call]    │                        │
         │                          │              │
         └────── call-end ─────────►│──────────────┼──►
                (cleanup)           │              │
                                    │       [Call ends]
                                    │       [Streams closed]
                                    │       [Connection closed]
         │                          │              │
         ├─ Close RTCPeerConnection │              │
         ├─ Stop audio tracks       │              │
         └─ Clear UI                │              │
```

## Network Layers

### Layer 1: Peer Discovery (mDNS)
```
Device A broadcasts metadata every 5 seconds:
┌──────────────────────────────────┐
│ Service: _lanchat._tcp.          │
│ Name: Device A (user123)         │
│ IP: 192.168.1.5                  │
│ Port: 8765                       │
│ Properties:                      │
│ ├─ username: "User A"            │
│ ├─ deviceId: "abc123def456"      │
│ ├─ deviceName: "OnePlus 8"       │
│ └─ avatarUrl: "..."              │
└──────────────────────────────────┘

Device B receives broadcast, stores in memory:
Peer {
  id: "abc123def456",
  username: "User A",
  ip: "192.168.1.5",
  isOnline: true,
  deviceName: "OnePlus 8",
  lastSeen: Date.now()
}
```

### Layer 2: WebSocket Signaling (TCP/WebSocket)
```
Connection: Device A → Device B (over WebSocket)

Message Format:
{
  "type": "call-offer" | "call-answer" | "ice-candidate",
  "from": "deviceA-id",
  "to": "deviceB-id",
  "payload": {
    // For offer/answer:
    "sdp": RTCSessionDescription,
    
    // For ice-candidate:
    "candidate": ICECandidate,
    
    // For signaling:
    "username": "User A",
    "ip": "192.168.1.5"
  }
}

Reliability: Guaranteed (TCP)
Ordering: In-order delivery
Encryption: TLS/SSL (HTTPS)
Latency: 10-50ms (LAN)
```

### Layer 3: WebRTC Media (UDP/RTP)
```
Direct P2P Connection (bypasses WebSocket)

Audio Packet Format:
┌─────────────────────────────────────┐
│ RTP Header (12 bytes)               │
├─────────────────────────────────────┤
│ Opus Audio Codec (compressed)       │
│ ├─ Sample Rate: 48 kHz              │
│ ├─ Bit Rate: 24-128 kbps            │
│ └─ Latency: 20ms                    │
├─────────────────────────────────────┤
│ DTLS Encryption (AES-GCM)           │
└─────────────────────────────────────┘

Reliability: Unreliable (UDP)
- Some packet loss acceptable (< 5%)
- Latency critical (< 300ms)
- Encryption: DTLS-SRTP
- Compression: Opus codec
- Bandwidth: 20-128 kbps
```

## Connection Resilience

### Recovery Scenarios

#### Scenario 1: Temporary Network Glitch
```
[Call is active]
   │
   ├─ Network hiccup (packet loss)
   │
   ├─ ICE state: disconnected
   │
   ├─ Jitter buffer absorbs loss
   │
   ├─ Auto-reconnect triggered
   │
   ├─ ICE state: connected (restored)
   │
   └─ Call continues (no interruption)
```

#### Scenario 2: Peer Goes Offline
```
[Call is active]
   │
   ├─ Device B loses WiFi
   │
   ├─ ICE connection timeout (10-30s)
   │
   ├─ ICE state: failed
   │
   ├─ Trigger: onconnectionstatechange
   │
   ├─ Display error: "Connection lost"
   │
   ├─ Option 1: Wait for peer to come back online
   │            (ICE renegotiation)
   │
   └─ Option 2: End call manually
               (User clicks "End Call")
```

#### Scenario 3: Multiple Peers on Network
```
Device A (Caller)          Device B          Device C
    │                         │                 │
    ├─ Call Device B ────────►│                 │
    │                         │                 │
    │                     [Busy on call]        │
    │                         │                 │
    │                         │ Call Device C ──┐
    │                         │                 │
    │◄──── Call Device C ─────┴─────────────────┤
    │     (Can't call while busy)               │
    │     Error: "Device C is busy"             │
    │                                           │
    └─ End call with B ────────►                │
                    │                           │
                    ├─ Now available            │
                    │                           │
                    └─ Can call Device A ──────►│
```

## Bandwidth & Performance

### Typical Call Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Audio Bitrate | 24-128 kbps | Depends on Opus encoder settings |
| Upload Bandwidth | 30-150 kbps | Audio + signaling |
| Download Bandwidth | 30-150 kbps | Audio + signaling |
| Latency | 20-100ms | LAN: 20-50ms, WAN: 100-300ms |
| Jitter | < 50ms | Acceptable for real-time audio |
| Packet Loss Tolerance | < 5% | PLC (Packet Loss Concealment) |
| Optimal RTT | < 150ms | Voice quality diminishes above this |

### Network Requirements

```
Minimum (degraded quality):
├─ Upload: 20 kbps
├─ Download: 20 kbps
├─ Latency: 500ms
└─ Packet loss: 10%

Recommended (good quality):
├─ Upload: 64 kbps
├─ Download: 64 kbps
├─ Latency: 150ms
└─ Packet loss: < 1%

Optimal (HD quality):
├─ Upload: 128 kbps
├─ Download: 128 kbps
├─ Latency: 50ms
└─ Packet loss: < 0.5%
```

## Security

### Encryption in Transit

```
mDNS Discovery:
├─ Metadata broadcast: No encryption (local network)
└─ Trust: Local network assumed safe

WebSocket Signaling:
├─ Protocol: WSS (WebSocket Secure)
├─ Encryption: TLS 1.2+ (HTTPS)
└─ Trust: Certificate validation

WebRTC Media:
├─ Protocol: DTLS-SRTP (Datagram TLS over SRTP)
├─ Encryption: AES-GCM (256-bit)
├─ Authentication: HMAC-SHA1
└─ Trust: Peer authentication via certificate
```

### Authentication

```
Device Identification:
├─ Device ID: Generated on first run
├─ Public Key: Shared via mDNS (optional)
├─ Fingerprint: DTLS certificate fingerprint
└─ Trust: Verified via SDP offer/answer exchange

User Authentication (Future):
├─ PIN verification on call pickup
├─ Fingerprint verification
└─ Trust key exchange
```

## Limitations & Workarounds

### Current Limitations

| Limitation | Reason | Workaround |
|------------|--------|-----------|
| LAN only | No TURN servers | Use manual IP connect for remote |
| One device per user | Single device ID | Create new account on other device |
| No call recording | Privacy, storage | Record at OS level (if allowed) |
| No video | Bandwidth | Audio only for now |
| NAT traversal limited | No TURN/STUN relay | Same network required |

### Planned Enhancements

1. **TURN Server Support**: For restrictive NAT scenarios
2. **Multi-device Sync**: Same user on multiple devices
3. **Call History**: Store call logs
4. **Video Calling**: H.264/VP8 codec support
5. **Conference Calls**: Multiple simultaneous participants

## Debugging Tips

### Check Connection State

```javascript
// In browser console during call
const pc = peerConnections.get('device-id');
console.log('ICE state:', pc.iceConnectionState);
console.log('Connection state:', pc.connectionState);
console.log('Signaling state:', pc.signalingState);
console.log('Local streams:', pc.getLocalStreams().length);
console.log('Remote streams:', pc.getRemoteStreams().length);
```

### Monitor Bandwidth

```javascript
// Check RTC stats (Chrome only)
setInterval(async () => {
  const stats = await pc.getStats();
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      console.log('Audio received:', report.bytesReceived, 'bytes');
    }
  });
}, 1000);
```

### Test Network Path

```bash
# Check if peer is reachable
ping <peer-ip>

# Check if port is open
netstat -an | grep :8765

# Check WiFi signal
# (Device settings → WiFi → Signal strength)
```

## References

- [WebRTC Architecture](https://webrtc.org/getting-started/architecture)
- [ICE Protocol RFC 5245](https://tools.ietf.org/html/rfc5245)
- [RTP RFC 3550](https://tools.ietf.org/html/rfc3550)
- [Opus Codec](https://opus-codec.org/)
- [DTLS-SRTP RFC 5764](https://tools.ietf.org/html/rfc5764)

