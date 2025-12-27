# Device-to-Device Calling Test Guide

## Complete Testing Procedure

### Prerequisites Checklist

Before starting, ensure:
- [ ] Two Android phones or devices
- [ ] Both on the **same WiFi network**
- [ ] Both have microphones working
- [ ] Both can run the Offline Voice Link app
- [ ] WiFi signal strength is good (> -70 dBm)
- [ ] No VPN active on either device
- [ ] Network allows mDNS (port 5353)
- [ ] Network allows WebSocket (port 8765)

### Environment Setup

**Device A (Caller)**
- Device name: "Phone A" 
- User: "Alice"
- IP: Will be assigned by WiFi

**Device B (Receiver)**  
- Device name: "Phone B"
- User: "Bob"
- IP: Will be assigned by WiFi

---

## Step-by-Step Test Procedure

### Phase 1: App Startup & Permissions (5-10 minutes)

#### Device A - Startup
```
1. Open Offline Voice Link app
   Expected: App loads, permission banner appears
   
2. See banner: "Permissions Required"
   - Shows: Microphone [Request]
   - Shows: Notifications [Request]
   Expected: Banner visible at top of screen

3. Click [Request] for Microphone
   Expected: Browser/system permission dialog appears
   
4. Click [Allow] in permission dialog
   Expected: Banner updates, shows microphone granted
   
5. Click [Request] for Notifications
   Expected: Browser/system permission dialog appears
   
6. Click [Allow] in permission dialog
   Expected: Banner disappears (all permissions granted)

7. Check console (F12 → Console)
   Look for: ✓ Microphone permission granted!
   Look for: ✓ Notification permission granted!
```

#### Device B - Startup
Repeat same process as Device A

#### Verification
- [ ] Both devices show "Go Online" button available
- [ ] Both devices show permission banner dismissed
- [ ] Console shows permission success messages
- [ ] No permission errors in console

---

### Phase 2: Network Discovery (5-10 minutes)

#### Device A - Go Online
```
1. Click "Go Online" button
   Expected: Button changes state
   Status: "Going online..."
   
2. Wait 3-5 seconds
   Expected: Discovery starts
   Look for console log: "Starting discovery..."
   
3. Check console logs
   Look for: [usePeerNetwork] Advertising service
   Look for: [usePeerNetwork] Starting discovery
   
4. Check Peer List
   Expected: Device B appears in list
   Status: "Online"
   IP: Shows IP address (192.168.x.x)
```

#### Device B - Go Online  
Repeat same process as Device A

#### Verification
- [ ] Both devices show "Online" button pressed/active
- [ ] Device A sees Device B in peer list (online)
- [ ] Device B sees Device A in peer list (online)
- [ ] Both IPs are on same subnet (192.168.x.x)
- [ ] Console shows successful discovery logs
- [ ] No network errors in console

**Troubleshooting if devices don't appear**:
```
If Device B doesn't appear on Device A:

1. Check same WiFi:
   Device A Settings → WiFi → Connected to: [WiFi Name]
   Device B Settings → WiFi → Connected to: [WiFi Name]
   Should be the same SSID

2. Check IP addresses:
   Device A: [usePeerNetwork] My IP: 192.168.1.x
   Device B: [usePeerNetwork] My IP: 192.168.1.x
   Should have same first 3 octets

3. Refresh peer list:
   Click "Refresh" button on Device A
   Wait 5 seconds
   Should see Device B appear

4. Check network:
   Try pinging from Device A to Device B
   adb shell ping 192.168.1.x
   Should get responses (0% loss)

5. Check mDNS:
   Some networks block mDNS (port 5353)
   Try manual IP connect instead
   Enter Device B IP address
   Click "Connect"
```

---

### Phase 3: Initiate Call (10-15 minutes)

#### Device A - Make Call

```
1. See Device B in peer list
   Status: Online
   
2. Click [Call] button next to Device B
   Expected: Call initiating screen appears
   Status: "Calling Device B..."
   
3. Check console immediately
   Look for: [usePeerNetwork] 📞 Initiating call with peer
   Look for: [usePeerNetwork] 🎤 Requesting microphone access
   Look for: [usePeerNetwork] ✓ Microphone permission granted
   
4. Wait for connection
   Expected: Screen shows "Connecting..."
   Console shows ICE logs:
   - [WebRTC] 🔄 ICE gathering state: gathering
   - [WebRTC] 📤 ICE candidate: candidate:...
   - [WebRTC] ✓ ICE gathering complete
   - [WebRTC] 🔌 ICE connection state: connected
   
5. Wait for answer
   Expected: Console shows:
   [usePeerNetwork] 📨 Sending call offer to peer
   
6. Remote connection establishes
   Expected: Console shows:
   [WebRTC] 📡 Connection state: connected
   [WebRTC] ✓ Peer connection established! Ready for audio.
```

#### Device B - Receive & Answer

```
1. See incoming call notification
   Expected: Alert or banner appears
   Message: "Device A is calling..."
   
2. See call screen
   Expected: "Incoming call from Alice" with:
   [Accept] [Decline] buttons
   
3. Click [Accept] button
   Expected: Answering screen appears
   Status: "Answering call..."
   
4. Check console immediately
   Look for: [usePeerNetwork] 📞 Answering incoming call from
   Look for: [usePeerNetwork] 🎤 Requesting microphone access
   Look for: [usePeerNetwork] ✓ Microphone permission granted
   
5. Wait for connection
   Expected: Console shows ICE logs:
   - [WebRTC] 🔄 ICE gathering state: gathering
   - [WebRTC] 📤 ICE candidate: candidate:...
   - [WebRTC] ✓ ICE gathering complete
   - [WebRTC] 🔌 ICE connection state: connected
   
6. Answer sent back
   Expected: Console shows:
   [usePeerNetwork] 📨 Sending call answer to peer
   
7. Remote connection establishes
   Expected: Console shows:
   [WebRTC] 📡 Connection state: connected
   [WebRTC] ✓ Peer connection established! Ready for audio.
```

#### Verification
- [ ] Device A shows "Calling..." or "Connected" status
- [ ] Device B shows "Incoming call" notification
- [ ] Device B can click [Accept] or [Decline]
- [ ] Both devices reach "Connected" state within 10 seconds
- [ ] Console on both shows connection established messages
- [ ] Both show active call screen
- [ ] No connection errors in console

---

### Phase 4: Audio Quality Test (5-10 minutes)

#### Device A → Device B Test

```
1. Verify both devices show active call
   Expected: Call screen visible on both
   
2. Speak into Device A microphone
   Example: "Hello Bob, can you hear me?"
   
3. Check Device B speaker
   Expected: Clear audio heard on Device B
   Quality: Should be clear, not distorted
   
4. Device B confirms
   Verbal: "Yes, I can hear you clearly"
   
5. Check console audio logs
   Look for: [WebRTC] 🎧 Remote track received: audio
   Look for: [WebRTC] ✓ Remote stream ready with 1 tracks
   
6. Test different volumes
   Soft speech: Can it be heard?
   Loud speech: Does it distort?
   Normal speech: Best quality?
```

#### Device B → Device A Test

```
1. Device B speaks into microphone
   Example: "Hi Alice, I can hear you too"
   
2. Check Device A speaker
   Expected: Clear audio heard on Device A
   Quality: Should match Device B → A quality
   
3. Device A confirms
   Verbal: "Great, I can hear you"
   
4. Verify both directions working
   A speaks, B hears ✓
   B speaks, A hears ✓
   Conversation should be natural
```

#### Audio Quality Metrics

```
Document findings:

Device A Microphone:
├─ Clarity: [Excellent / Good / Fair / Poor]
├─ Volume: [Too soft / Just right / Too loud]
├─ Background noise: [None / Minimal / Moderate / High]
└─ Echo: [None / Slight / Noticeable / Severe]

Device A Speaker:
├─ Clarity: [Excellent / Good / Fair / Poor]
├─ Volume: [Too soft / Just right / Too loud]
└─ Distortion: [None / Slight / Noticeable / Severe]

Device B Microphone:
├─ Clarity: [Excellent / Good / Fair / Poor]
├─ Volume: [Too soft / Just right / Too loud]
├─ Background noise: [None / Minimal / Moderate / High]
└─ Echo: [None / Slight / Noticeable / Severe]

Device B Speaker:
├─ Clarity: [Excellent / Good / Fair / Poor]
├─ Volume: [Too soft / Just right / Too loud]
└─ Distortion: [None / Slight / Noticeable / Severe]

Network Latency:
└─ Estimated: [< 50ms (Excellent) / 50-100ms (Good) / 100-200ms (Fair) / > 200ms (Poor)]
```

#### Troubleshooting Audio Issues

```
If no audio is heard:

1. Check microphone enabled:
   Device A: Check microphone icon, should show as enabled
   Device B: Check microphone icon, should show as enabled

2. Check speaker volume:
   Device A: Volume should not be at minimum
   Device B: Volume should not be at minimum

3. Check audio tracks in console:
   Look for: [usePeerNetwork] Local audio tracks: 1
   Look for: [WebRTC] 🎧 Remote track received: audio
   
   If "Local audio tracks: 0":
   └─ Microphone not being captured
   └─ Try: End call, reload, try again

4. Check remote stream:
   Look for: [WebRTC] ✓ Remote stream ready with 1 tracks
   
   If not present:
   └─ Remote audio not being received
   └─ Check network (ping should work)
   └─ Try: End call, wait 5s, call again

5. Test with headphones:
   If no speaker audio:
   └─ Use headphones instead of speaker
   └─ Check if audio is there with headphones
   └─ Indicates speaker issue, not audio issue

6. Check browser console:
   F12 → Console tab
   Look for any "[WebRTC] ❌" errors
   Take note of error message
   Try: End call, reload page, test again
```

---

### Phase 5: Call Termination (5 minutes)

#### Device A - End Call

```
1. Click [End Call] button
   Expected: Call screen disappears
   Status: Returns to peer list screen
   
2. Check console
   Look for: Peer connection close
   Look for: [usePeerNetwork] Call ended
   
3. Device B should also see call end
   Expected: Device B call screen changes
   Status: Returns to peer list or shows "Call ended"
```

#### Device B - Confirm End

```
1. Device B should automatically end call
   Expected: Call screen closes
   Status: Back to peer list
   
2. Or Device B can click [End Call] independently
   Expected: Same cleanup happens
   
3. Check console on both
   Logs should show:
   ├─ Connection state: closed
   ├─ Signaling state: closed
   └─ Streams stopped
```

#### Verification
- [ ] Call screen closes on both devices
- [ ] Peer list reappears
- [ ] Device B still shows as "Online"
- [ ] No errors in console after call end
- [ ] Can immediately make another call
- [ ] Streams are properly cleaned up

---

## Test Results Summary

### Test Date: _______________
### Tester: _______________

#### Session 1: Permissions
- [ ] **Permission banner appears**: PASS / FAIL
- [ ] **Microphone request works**: PASS / FAIL
- [ ] **Notification request works**: PASS / FAIL
- [ ] **Permissions persist**: PASS / FAIL
- **Notes**: _________________________________

#### Session 2: Discovery
- [ ] **Device A sees Device B**: PASS / FAIL
- [ ] **Device B sees Device A**: PASS / FAIL
- [ ] **Peer list updates correctly**: PASS / FAIL
- [ ] **Discovery is reliable**: PASS / FAIL
- **Notes**: _________________________________

#### Session 3: Calling
- [ ] **Device A can initiate call**: PASS / FAIL
- [ ] **Device B receives call**: PASS / FAIL
- [ ] **Device B can answer**: PASS / FAIL
- [ ] **Connection established**: PASS / FAIL
- [ ] **Connection time < 10 seconds**: PASS / FAIL
- **Notes**: _________________________________

#### Session 4: Audio
- [ ] **A→B audio heard clearly**: PASS / FAIL
- [ ] **B→A audio heard clearly**: PASS / FAIL
- [ ] **No echo/distortion**: PASS / FAIL
- [ ] **Volume levels appropriate**: PASS / FAIL
- [ ] **Audio latency acceptable**: PASS / FAIL
- **Notes**: _________________________________

#### Session 5: Termination
- [ ] **Call ends cleanly**: PASS / FAIL
- [ ] **No errors on disconnect**: PASS / FAIL
- [ ] **Can make another call**: PASS / FAIL
- [ ] **Streams properly cleanup**: PASS / FAIL
- **Notes**: _________________________________

---

## Console Log Checklist

### Critical Success Indicators

Look for these specific log messages during test:

**Startup Phase**:
```
✓ [usePermissions] ✓ Microphone permission granted
✓ [usePermissions] ✓ Notification permission granted  
```

**Discovery Phase**:
```
✓ [usePeerNetwork] Advertising service
✓ [usePeerNetwork] Starting discovery
✓ [usePeerNetwork] Found peer: Device B
✓ [usePeerNetwork] Peer online: Device B
```

**Call Initiation Phase**:
```
✓ [usePeerNetwork] 📞 Initiating call with peer
✓ [usePeerNetwork] ✓ Microphone permission granted
✓ [usePeerNetwork] 📤 Creating SDP offer
✓ [usePeerNetwork] 📨 Sending call offer to peer
```

**Connection Phase**:
```
✓ [WebRTC] 🔌 ICE connection state: connected
✓ [WebRTC] 📡 Connection state: connected
✓ [WebRTC] ✓ Peer connection established!
✓ [WebRTC] 🎧 Remote track received: audio
```

**Active Call Phase**:
```
✓ [WebRTC] ✓ Remote stream ready with 1 tracks
✓ Local audio playing
✓ Remote audio playing
```

---

## Failure Scenarios & Recovery

### Scenario 1: Permission Denied

**Symptom**: "Microphone access denied" error on call attempt

**Recovery**:
1. Settings → Apps → Offline Voice Link → Permissions
2. Enable Microphone permission
3. Return to app
4. Click "Request" again in permission banner
5. Allow permission
6. Try calling again

### Scenario 2: Peers Don't Appear

**Symptom**: Device B doesn't appear in Device A peer list

**Recovery**:
1. Verify both on same WiFi (check SSID)
2. Verify both have internet connectivity (ping 8.8.8.8)
3. Click "Refresh" button
4. Wait 5 seconds
5. If still not appearing, try manual IP connect:
   - Get Device B IP: Settings → WiFi → IP Address
   - On Device A, enter Device B IP in "Connect to IP" field
   - Click "Connect"

### Scenario 3: Call Doesn't Connect

**Symptom**: Call stuck on "Connecting..." state

**Recovery**:
1. Check console for "[WebRTC] ICE connection failed"
2. If ICE failed:
   - Check Network: Both devices ping each other
   - Check Ports: 8765 (WebSocket) should be open
   - Check mDNS: May need manual IP connect
3. End call on both devices
4. Wait 5 seconds
5. Try calling again
6. If still failing, restart both apps

### Scenario 4: No Audio Heard

**Symptom**: Call connected but no audio

**Recovery**:
1. Check console for "Remote track received: audio"
2. If track not received:
   - Check microphone is working (test in other app)
   - Check microphone enabled in call screen
   - Check volume is not muted
3. Check speaker volume on receiving device
4. Try headphones to verify audio is being sent
5. End call and try again
6. If persistent, check:
   - Microphone permission granted
   - Audio constraints supported
   - Browser audio context not blocked

### Scenario 5: Echo During Call

**Symptom**: Hearing own voice echoed

**Recovery**:
1. Check echo cancellation enabled:
   - Should be on in audio constraints
   - If not working, speaker might be too loud
2. Lower speaker volume on both devices
3. Move further from microphone
4. Check for open speakers (use headphones)
5. If echo persists:
   - Try headphones instead of speaker
   - Check device audio routing
   - End call and restart

---

## Performance Metrics to Monitor

```
During successful call, monitor:

Connection Speed:
└─ Time to "Connected" state: _________ seconds
   Expected: 5-15 seconds

Audio Quality:
├─ Clarity (1-10): _________
├─ Latency perceived (low/med/high): _________
├─ Echo (none/slight/bad): _________
└─ Background noise (none/some/lots): _________

Network Usage:
├─ Upload bandwidth: _________ kbps
├─ Download bandwidth: _________ kbps
└─ Packet loss: _________ %

Device Performance:
├─ CPU usage: _________ %
├─ Memory usage: _________ MB
├─ Battery drain: _________ %/min
└─ Temperature: _________ °C
```

---

## Regression Testing (After Updates)

Run this checklist after any code changes:

- [ ] Permissions still request properly
- [ ] Peer discovery still works
- [ ] Calls still connect
- [ ] Audio still flows both directions
- [ ] No new console errors
- [ ] Call termination still clean
- [ ] Can make multiple calls sequentially
- [ ] No memory leaks (check after 10 calls)
- [ ] Performance unchanged

---

## Sign-Off

**All Tests Passed**: YES / NO

**Date Tested**: _______________

**Tester Name**: _______________

**Issues Found**: _______________________________________________

**Recommendations**: _________________________________________

**Ready for Release**: YES / NO

