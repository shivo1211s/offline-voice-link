# Quick Start: Testing the Calling Feature

## What Was Fixed

| Issue | Status |
|-------|--------|
| getUserMedia() errors silently failing | ✅ Now shows user-friendly error messages |
| No debug information for WebRTC | ✅ Added comprehensive console logging |
| Audio playback not working | ✅ Improved audio element configuration and logging |
| Unclear connection status | ✅ Added real-time indicators showing connection state |

## Test Right Now (5 minutes)

### Step 1: Allow Microphone Permission
1. Open http://localhost:8080
2. Browser will ask "Allow microphone access?"
3. **CLICK "Allow"**
4. Go online and wait for peer list

### Step 2: Test Text First
1. Send a message to a peer
2. Verify message appears on both sides
3. ✅ If this works, signaling is good

### Step 3: Try a Call
1. Click call button next to peer name
2. **Check browser console (F12)**
3. Look for this success sequence:
```
[usePeerNetwork] Initiating call with peer: ...
[usePeerNetwork] Requesting microphone access...
[usePeerNetwork] ✓ Microphone access granted!
[usePeerNetwork] Creating SDP offer...
[usePeerNetwork] ✓ Local description set
[usePeerNetwork] ✓ Call offer sent to peer
```

### Step 4: Peer Accepts Call
1. On receiving device, accept the call
2. Should see:
```
[usePeerNetwork] Answering call from peer: ...
[usePeerNetwork] ✓ Microphone access granted!
[usePeerNetwork] ✓ Remote description set, creating answer...
[usePeerNetwork] ✓ Local description set
[usePeerNetwork] ✓ Call answer sent to peer
```

### Step 5: Check Connection
1. After ~2-3 seconds, look for:
```
[WebRTC] ✓ Peer connection established!
[WebRTC] Remote track received: audio
[P2PCallScreen] Attaching remote stream with 1 tracks
```

2. Call screen should show:
   - 🎤 1 Audio Track
   - 🔊 Remote Connected

## If It Doesn't Work

### Error: "Microphone access denied"
**Fix**:
1. Chrome: Settings → Privacy → Site Settings → Microphone → Allow
2. Firefox: Click 🔒 in address bar → Permissions → Microphone
3. Or use incognito mode to test permission flow

### Error: "No microphone found"
**Fix**:
1. Make sure microphone is connected
2. Test microphone works in Settings
3. Close other apps using microphone (Zoom, Teams, etc.)

### No error but no audio
**Debug**:
1. Console should show all ✓ logs
2. Call screen should show 🎤 and 🔊
3. Check: Is speaker on? (not muted on device?)
4. Try pressing Unmute button on call screen

### Call never connects
**Debug**:
1. Check both devices on same WiFi
2. Verify text messages work first
3. Look in console for "Connection failed" error
4. Check firewall isn't blocking port 8765

## Console Cheat Sheet

Open DevTools: `F12`  
Go to: Console tab  
Search for: `[WebRTC] ✓ Peer connection established!`

**Good signs** (copy these from console):
```
✓ Microphone access granted
✓ Local description set
✓ Call offer sent
✓ Remote description set
✓ Peer connection established
✓ Remote track received
✓ Attaching remote stream
```

**Bad signs** (indicates problems):
```
✗ Call initiation failed
✗ NotAllowedError (permission denied)
✗ NotFoundError (no microphone)
✗ ICE connection failed
✗ Peer connection failed
✗ No remote track received
```

## What Each Log Means

| Log | Meaning |
|-----|---------|
| `[usePeerNetwork] Initiating call` | User clicked call button |
| `✓ Microphone access granted` | Browser let us use mic |
| `✓ Call offer sent to peer` | Signaling message delivered |
| `[WebRTC] ICE candidate found` | Found a route to connect (happens ~10 times) |
| `✓ Peer connection established` | Both devices can talk! |
| `Remote track received: audio` | Hearing the other person's mic |
| `Attaching remote stream` | Sending to speaker |

## Multi-Device Test

### Setup
- Device A: Computer with browser
- Device B: Phone/tablet with browser
- Both on same WiFi network

### Test
1. Device A goes online → Device B appears in list
2. Device A sends message → Device B receives
3. Device A calls Device B
4. Device B accepts
5. Should hear each other after ~3 seconds

## Files to Check

- **Debug guide**: `CALLING_FEATURE_DEBUG.md` - Detailed troubleshooting
- **Fix summary**: `CALLING_FEATURE_FIXES.md` - What was changed and why
- **Main hook**: `src/hooks/usePeerNetwork.ts` - Core calling logic
- **UI component**: `src/components/network/P2PCallScreen.tsx` - Call screen

## Known Limitations

⚠️ **Microphone permission** - Browser requires explicit user permission  
⚠️ **Same network only** - P2P calls only work on local LAN  
⚠️ **No video** - Audio calls only  
⚠️ **No TURN** - May fail in corporate networks with symmetric NAT  

## Success Checklist

- [ ] Browser asks for microphone permission
- [ ] Message sending works between devices
- [ ] Calling shows permission error if denied
- [ ] Calling shows success logs if allowed
- [ ] Remote audio plays after connection
- [ ] Call duration timer runs
- [ ] Mute/speaker buttons work

Good luck! 🎧

---

**Need help?** Check browser console for error messages with prefixes:
- `[usePeerNetwork]` - Calling logic
- `[WebRTC]` - Connection details
- `[P2PCallScreen]` - Audio playback

