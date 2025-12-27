# Calling Feature Debugging Guide

## Status
🔴 **CRITICAL**: `getUserMedia()` permission errors preventing audio access

## Fixed Issues ✅

1. **getUserMedia() error handling** - Now catches `NotAllowedError` and `NotFoundError`
2. **WebRTC debug logging** - Comprehensive logs throughout the calling flow
3. **Audio constraints** - Added echoCancellation, noiseSuppression, autoGainControl
4. **Call state management** - Auto-connect when streams are ready
5. **Error display** - User-facing error messages in call screen
6. **Stream attachment** - Proper logging and forcing audio playback

## Remaining Issues ⚠️

### 1. Browser Microphone Permission (CURRENT BLOCKER)
**Problem**: `getUserMedia()` throws `NotAllowedError`

**Solutions to try**:
- Check browser permissions:
  - Chrome: Settings → Privacy & Security → Site Settings → Microphone
  - Firefox: address bar → 🔒 icon → Permissions → Microphone
  - Safari: System Preferences → Security & Privacy → Microphone
- Make sure site is served over HTTPS or localhost
- Test in a fresh incognito/private window
- Check if microphone is used by another app (close Zoom, Teams, etc.)

### 2. Remote Stream Not Arriving (Can't verify until #1 is fixed)
**Signs**:
- `[WebRTC] Remote track received` log appears but audio silent
- `[P2PCallScreen] Remote stream with 0 tracks` log

**Debug checklist**:
```
Browser Console → Look for:
✓ "[usePeerNetwork] ✓ Microphone access granted"
✓ "[usePeerNetwork] Creating SDP offer"
✓ "[usePeerNetwork] ✓ Call offer sent to peer"
✓ "[usePeerNetwork] Received call-answer" (on caller side)
✓ "[WebRTC] ✓ Peer connection established!"
✓ "[WebRTC] Remote track received"
✓ "[P2PCallScreen] Attaching remote stream: 1 tracks"
```

## Testing Steps

### Step 1: Verify Microphone Access
1. Open Developer Tools (F12)
2. Go to Console tab
3. Initiate a call
4. Check the first log message:
   - ✅ `[usePeerNetwork] ✓ Microphone access granted!`
   - ❌ `[usePeerNetwork] Call initiation failed: Microphone access denied...`

### Step 2: Check WebRTC Connection
Look for these sequential logs:
```
[usePeerNetwork] Creating SDP offer...
[usePeerNetwork] Offer created, setting local description...
[usePeerNetwork] ✓ Local description set
[usePeerNetwork] ✓ Call offer sent to peer
[WebRTC] ICE candidate found: ...
[WebRTC] ✓ Peer connection established!
[WebRTC] Remote track received: audio
[P2PCallScreen] Attaching remote stream with 1 tracks
```

### Step 3: Verify Audio Playback
- Check call screen status: Should show "🎤 1 Audio Track" + "🔊 Remote Connected"
- Check if audio element has `srcObject`:
  ```javascript
  // In console while call is active:
  document.querySelector('audio:nth-of-type(2)').srcObject
  // Should output: MediaStream {...}
  ```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Microphone access denied" | User rejected permission | Check browser settings, try incognito mode |
| "No microphone found" | No audio device | Connect microphone, check hardware |
| "Connection failed: Unable to reach peer" | ICE connection failed | Check both devices on same network, check firewall |
| "Call connection failed" | RTCPeerConnection failed | Check NAT type, may need TURN server |

## Network Diagnostics

### Check if both devices can see each other:
1. Go to peer list
2. Make sure other device appears in peer list
3. If visible, try sending a text message first
4. Only attempt call if text messages work

### Check WebSocket signaling:
1. Open Developer Tools → Network tab
2. Filter for WS (WebSocket)
3. You should see:
   - One WS connection per peer
   - Messages flowing when you type
4. Initiate call and look for messages with type `call-offer`, `ice-candidate`, `call-answer`

## Key Log Prefixes

- `[usePeerNetwork]` - Main calling logic
- `[WebRTC]` - RTCPeerConnection events
- `[P2PCallScreen]` - UI-level audio handling
- `[PeerMapping]` - Peer discovery and mapping

## Next Steps If Still Failing

1. ✅ Check browser console for error messages (search for `Error`, `fail`, `denied`)
2. ✅ Verify both devices on same WiFi network
3. ✅ Try calling from Browser A → Browser B (test both directions)
4. ✅ Check if firewall blocking WebSocket port 8765
5. ⚠️ If still failing, may need TURN server for NAT traversal

## Code Locations

- **Main hook**: `src/hooks/usePeerNetwork.ts`
- **Call UI**: `src/components/network/P2PCallScreen.tsx`
- **WebSocket server**: `src/plugins/WebSocketServer.ts`
- **LAN discovery**: `src/plugins/LanDiscovery.ts`

## Browser DevTools Tips

### View all WebRTC info:
```javascript
// Get peer connection statistics
(async () => {
  const stats = await window.RTCPeerConnection?._connections?.[0]?.getStats?.();
  if (stats) stats.forEach(report => console.log(report));
})();
```

### Force reload without cache:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Clear storage (if peer list corrupted):
```javascript
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```
