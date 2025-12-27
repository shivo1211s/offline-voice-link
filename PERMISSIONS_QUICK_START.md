# Permissions Feature - Quick Start

## What's New?

The app now asks for permissions **before** trying to use your microphone or send notifications. This is the proper way to handle permissions in modern web applications.

## When You Open the App

1. **Permission Banner Appears** at the top
   ```
   ┌─────────────────────────────────────────┐
   │ Permissions Required                    │ ✕
   │ To use calling and messaging features,  │
   │ please grant the following permissions  │
   │                                         │
   │ 🎤 Microphone  [Request]               │
   │ 🔔 Notifications  [Request]            │
   └─────────────────────────────────────────┘
   ```

2. **Click "Request"** next to Microphone
   - Browser shows native permission dialog
   - Click **"Allow"** to grant access
   - Or **"Block"** to deny (you can change this later in browser settings)

3. **Click "Request"** next to Notifications (optional)
   - Same process as microphone
   - Allows the app to notify you of incoming calls

4. **Banner Dismisses**
   - Once all permissions are granted, banner closes
   - You can now use calling feature

## After Permissions Are Granted

- **Call Button Enabled**: You can now call other users
- **Incoming Calls Work**: You'll get notifications when someone calls
- **Audio Flows**: Microphone and speaker work properly

## If You Accidentally Blocked Permissions

1. **Change Browser Settings**:
   - **Chrome/Edge**: Address bar → Camera/Microphone icon → Allow
   - **Firefox**: Left side of address bar → Permissions icon → Allow
   - **Safari**: Settings → Websites → Microphone → Allow

2. **Or Clear Site Data**:
   - Reload the page
   - Permission dialog appears again
   - Click "Allow" this time

## For Android Devices

If using Offline Voice Link on Android via Capacitor:

1. **First Launch**:
   - App asks for permission automatically
   - Click **"Allow"** in system dialog
   - Permission is remembered

2. **Check Permissions**:
   - Settings → Apps → Offline Voice Link → Permissions
   - Ensure Microphone is **Allowed**

3. **Grant Later**:
   - If you blocked it, go back to app
   - Permission request appears again
   - Click "Request" in the app

## Troubleshooting Permissions

### Microphone Permission Not Working

**Symptom**: "Microphone access denied" error when trying to call

**Fix**:
1. Check if microphone is physically connected
2. Test microphone in another app (Teams, Discord, etc.)
3. In browser settings, allow microphone for localhost
4. Reload the page and click "Request" again

### Notification Permission Not Working

**Symptom**: Don't receive call notifications

**Fix**:
1. Open browser settings
2. Look for "Notifications" permission
3. Set to **Allow** for Offline Voice Link
4. Reload page and click "Request" in app

### Permission Banner Won't Go Away

**Symptom**: Banner keeps showing even after clicking "Request"

**Fix**:
1. Make sure you **click "Allow"** in the browser dialog that pops up
2. Don't just click "Request" and close the dialog
3. If still stuck, hard reload (Ctrl+Shift+R or Cmd+Shift+R)

### "Browser does not support audio calling"

**Symptom**: SecurityError when trying to call

**Fix**:
- Must use HTTPS (not HTTP)
- Or localhost for development
- Check that you're on correct protocol

## Permission Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| 🎤 Microphone [Request] | Not granted yet | Click Request button |
| 🎤 Microphone | Granted ✓ | Ready to make calls |
| 🎤 Microphone | Denied ✗ | Check browser settings |
| 🔔 Notifications [Request] | Not granted yet | Click Request button |
| 🔔 Notifications | Granted ✓ | Will get call alerts |
| 🔔 Notifications | Denied ✗ | Check browser settings |

## Technical Details

### What Each Permission Does

**Microphone Permission**:
- Allows the app to access your audio input device
- Required for:
  - Making calls
  - Voice messages
  - Audio recording

**Notification Permission**:
- Allows the app to show desktop notifications
- Used for:
  - Incoming call alerts
  - Message notifications
  - Call reminders

### How Permissions Are Managed

```typescript
// In src/hooks/usePermissions.ts

// Request microphone
const granted = await requestMicrophonePermission();

// Request notifications  
const granted = await requestNotificationPermission();

// Check current status
const status = permissions.microphone;  // 'granted' | 'denied' | 'prompt'
```

### Privacy

- Permissions are **local** - stored only on your device
- No permission data sent to servers
- Browser manages permission state
- You can revoke anytime in browser settings

## Browser-Specific Behavior

### Chrome / Edge
- Shows permission dialog in address bar area
- Default deny for privacy
- User must click Allow explicitly

### Firefox
- Shows permission dialog at top of page
- Remembers choice for future visits
- Can be changed in Preferences

### Safari
- Shows native system dialog
- Requires explicit user confirmation
- Can be changed in System Preferences

### Mobile Browsers (Android/iOS)
- Uses native device permission system
- Shows system-level permission dialog
- Stored in app permissions settings

## Best Practices

1. **Grant Permission on First Use**
   - Easier for user experience
   - Needed before any call works

2. **Handle Permission Denial Gracefully**
   - App explains why permission needed
   - Offers way to fix in settings

3. **Periodic Re-check**
   - App checks permissions when going online
   - Shows banner if status changes

4. **Clear Error Messages**
   - Specific error for each case
   - Instructions to fix issue

## Next Steps

Once permissions are granted:

1. **Go Online**: Click "Go Online" button
2. **Connect to Peer**: Click a peer in the list
3. **Make a Call**: Click call button
4. **Test Audio**: Speak and listen
5. **Try Calling**: Call another user on different device

## Getting Help

If something isn't working:

1. **Check Console** (F12 → Console)
   - Look for permission-related logs
   - Check for error messages

2. **Review Logs**:
   - `[usePermissions] Requesting microphone access...`
   - `[usePermissions] ✓ Microphone permission granted`
   - `[usePermissions] Microphone permission denied:`

3. **Common Errors**:
   - `NotAllowedError` = User clicked "Block"
   - `NotFoundError` = No microphone connected
   - `SecurityError` = Not using HTTPS
   - `TypeError` = Browser doesn't support feature

## See Also

- [Permissions & Calling Feature Guide](PERMISSIONS_AND_CALLING.md) - Full documentation
- [CALLING_QUICK_START.md](CALLING_QUICK_START.md) - How to make calls
- [CALLING_FEATURE_DEBUG.md](CALLING_FEATURE_DEBUG.md) - Debugging guide

