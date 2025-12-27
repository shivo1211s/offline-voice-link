# Unread Messages Feature

## Overview

The Offline Voice Link now displays unread message indicators on the home screen device list. Users can see at a glance which contacts have unread messages and how many.

## Features Added

### 1. Unread Message Badges
- **Red badge with count**: Shows the exact number of unread messages
- **Position**: Located on the device avatar in the peer list
- **Animation**: Subtle pulse effect to draw attention
- **Max display**: Shows "99+" for counts over 99

### 2. Visual Indicators
- **Badge on avatar**: Red circular badge in top-right of avatar
- **Right-side indicator**: "X new" text with red dot indicator
- **Font weight**: Device name becomes bold when unread messages exist
- **Color coding**: Red theme indicates unread messages (stands out from normal UI)

### 3. Automatic Mark as Seen
- Messages are automatically marked as seen when you open a conversation
- Unread count resets to 0 when viewing a peer
- No manual action needed from user

## How It Works

### Display Logic
1. App tracks unread message count for each peer
2. When rendering peer list, shows red badge if count > 0
3. Badge displays:
   - Animated red circle on avatar
   - Count inside badge (1-99+ format)
   - "X new" label on the right side

### Unread Tracking
- **Storage**: Uses IndexedDB to persist messages
- **Detection**: Message status field (sent, delivered, seen)
- **Counting**: Only counts messages from peer that are not "seen"
- **Reset**: Resets to 0 when peer is selected/viewed

### Real-time Updates
- Updates instantly when new message arrives
- Tracks from `onMessage` callback in usePeerNetwork
- Works seamlessly with chat functionality

## Code Structure

### New Hook: `useUnreadMessages`
Location: `src/hooks/useUnreadMessages.ts`

**Functions**:
```typescript
- calculateUnreadCount(peerId): Promise<number>
  └─ Counts unread messages for a specific peer

- loadUnreadCounts(): void
  └─ Load unread counts for all peers

- markPeerAsSeen(peerId): void
  └─ Mark peer messages as seen (reset count to 0)

- addUnreadMessage(peerId): void
  └─ Increment unread count for a peer

- getTotalUnread(): number
  └─ Get total unread messages across all peers

Returns:
{
  unreadCounts: { [peerId]: number },
  loadUnreadCounts: () => void,
  markPeerAsSeen: (peerId) => void,
  addUnreadMessage: (peerId) => void,
  getTotalUnread: () => number
}
```

### Updated Component: `PeerList`
Location: `src/components/network/PeerList.tsx`

**Changes**:
- Added `unreadCounts` prop to receive unread message counts
- Updated `PeerItem` to display unread badge
- Shows count inside red badge on avatar
- Shows "X new" indicator on the right

**Badge Styling**:
```
- Background: Red (#EF4444)
- Text: White, bold, size 12px
- Animation: Subtle pulse effect
- Size: 24px diameter
- Position: Top-right of avatar
- Border: 2px white border for contrast
```

### Updated Page: `Index.tsx`
Location: `src/pages/Index.tsx`

**Changes**:
- Imported `useUnreadMessages` hook
- Initialize hook with profile ID and peers
- Listen to new messages and update unread count
- Mark messages as seen when peer is selected
- Pass unread counts to PeerList component

## Usage Example

```typescript
// In your component
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

function MyComponent() {
  const { unreadCounts, markPeerAsSeen, addUnreadMessage } = useUnreadMessages(
    profile?.id,
    peers
  );

  // When a message arrives
  useEffect(() => {
    if (newMessage) {
      addUnreadMessage(newMessage.senderId);
    }
  }, [newMessage]);

  // When viewing a peer
  const handleSelectPeer = (peer) => {
    markPeerAsSeen(peer.id);
  };

  // Display in UI
  return (
    <div>
      Unread from {peer.username}: {unreadCounts[peer.id] || 0}
    </div>
  );
}
```

## Visual Design

### Unread Badge
```
                       [Red Badge]
                          99+
                        /      \
                      |  User   |
                      | Avatar  |
                        \      /
                    [Online Indicator]
```

### List Item with Unread
```
┌─────────────────────────────────────────────┐
│  [Avatar]    Alice            [X new] [99+] │
│  [Online]    iPhone • 192.168.1.100         │
│              Online                         │
└─────────────────────────────────────────────┘
```

### Without Unread
```
┌─────────────────────────────────────────────┐
│  [Avatar]    Alice                           │
│  [Online]    iPhone • 192.168.1.100         │
│              Online                         │
└─────────────────────────────────────────────┘
```

## Message Status Tracking

Messages have status field that tracks:
- `sent`: Message sent but not delivered
- `delivered`: Message reached peer device
- `seen`: Peer has opened and viewed message

**Unread Count Logic**:
```
unreadCount = messages where:
  - receiverId === currentUserId
  - senderId === peerId
  - status !== 'seen'
```

## Browser Compatibility

✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge
✅ Mobile browsers (iOS, Android)
✅ PWA support

## Performance

- **Lazy Loading**: Unread counts loaded on demand
- **Efficient Storage**: Uses IndexedDB indexes for fast queries
- **Minimal Rendering**: Only updates affected peer items
- **No Network Impact**: All calculations are local

## Future Enhancements

Potential improvements:
- [ ] Total unread count in header/tab title
- [ ] Sound notification for new messages
- [ ] Badge color customization
- [ ] Unread badge on app icon (Android)
- [ ] Desktop notification badges
- [ ] Unread by conversation type (chat, call, etc.)

## Testing

To test the unread messages feature:

1. **Open app on two devices**:
   - Device A (Alice): Alice's app
   - Device B (Bob): Bob's app

2. **Send message from Bob to Alice**:
   - Bob opens app
   - Bob selects Alice in peer list
   - Bob sends message to Alice
   - Alice should see "1 new" badge on Bob's contact

3. **Mark as seen**:
   - Alice clicks on Bob's contact
   - Badge disappears
   - Count resets to 0

4. **Multiple messages**:
   - Bob sends 5 messages to Alice
   - Alice should see "5 new" badge
   - Open conversation to mark all as seen

5. **Badge limit**:
   - Bob sends 150 messages to Alice
   - Alice should see "99+" badge
   - Open to see full count in UI

## Troubleshooting

### Unread count not showing
- **Solution**: Ensure `useUnreadMessages` hook is initialized with profile ID
- **Check**: Verify messages are being saved to storage
- **Log**: Check browser console for any errors

### Count not updating on new message
- **Solution**: Verify `onMessage` callback is being triggered
- **Check**: Ensure `addUnreadMessage` is called in message handler
- **Log**: Add console logs to verify message arrival

### Count not resetting
- **Solution**: Verify `markPeerAsSeen` is called when peer selected
- **Check**: Check that selected peer effect is working
- **Log**: Add console logs to verify selection

## Code Statistics

- **New files**: 1 (useUnreadMessages.ts - 60 lines)
- **Modified files**: 2 (PeerList.tsx, Index.tsx)
- **Build impact**: +1 module (2044 total)
- **Bundle size impact**: +0.5 KB
- **Gzip impact**: Negligible

## Related Files

- `src/hooks/useUnreadMessages.ts` - Unread tracking hook
- `src/components/network/PeerList.tsx` - Peer list with unread display
- `src/pages/Index.tsx` - Main page with unread integration
- `src/lib/storage.ts` - Message storage backend

