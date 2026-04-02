# Notification Persistence Implementation

## Overview

The 7zi notification system now includes robust localStorage-based persistence using Zustand state management. This ensures notifications survive page refreshes, maintains read/unread status, and provides a seamless user experience.

## Architecture

### State Management

**Technology Stack:**

- **Zustand** - Lightweight state management with middleware support
- **Zustand Persist Middleware** - Automatic localStorage synchronization
- **TypeScript** - Full type safety

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Persistence                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────────────────────┐       │
│  │  Socket.IO  │────▶│  useNotificationStore        │       │
│  │  WebSocket  │     │  (Zustand Store)            │       │
│  └─────────────┘     │                              │       │
│                      │  ┌────────────────────────┐   │       │
│                      │  │  addNotification()      │   │       │
│                      │  │  markAsRead()          │   │       │
│  ┌─────────────┐     │  │  markAllAsRead()       │   │       │
│  │    API      │────▶│  └────────────────────────┘   │       │
│  │   Routes    │     │                              │       │
│  └─────────────┘     │  ┌────────────────────────┐   │       │
│                      │  │  Persist Middleware     │   │       │
│                      │  │  (Auto-sync to          │   │       │
│                      │  │   localStorage)         │   │       │
│                      │  └────────────────────────┘   │       │
│                      │                              │       │
│                      └──────────────┬───────────────┘       │
│                                     │                       │
│                                     ▼                       │
│                          ┌──────────────────┐               │
│                          │   localStorage    │               │
│                          │   (notification-  │               │
│                          │    store)         │               │
│                          └──────────────────┘               │
│                                     │                       │
│                                     ▼                       │
│                     ┌───────────────────────────────┐       │
│                     │  Page Refresh Survives Here   │       │
│                     └───────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Automatic Persistence

- **Automatic Sync**: All state changes automatically saved to localStorage
- **Load on Mount**: Notifications loaded from localStorage on app startup
- **No Manual Calls**: No need for explicit save/load operations

### 2. Notification Limit

- **Maximum 100 Notifications**: Keeps only the 100 most recent notifications
- **Automatic Cleanup**: Oldest notifications removed when limit exceeded
- **Performance Optimized**: Prevents localStorage quota issues

### 3. Read/Unread Tracking

- **Persistent Status**: Read/unread status persists across sessions
- **Timestamp Tracking**: `read_at` timestamp saved when marked as read
- **Batch Operations**: `markAllAsRead()` for clearing all at once

### 4. Type Safety

- **Full TypeScript Support**: All types defined in `/src/types/notifications.ts`
- **Compile-time Safety**: Catch errors before runtime

### 5. Selective Persistence

- **Preferences Persisted**: User notification settings saved
- **Recent Notifications**: Only most recent 100 notifications stored
- **Excluded from Persistence**: Loading states and errors not persisted

## Implementation Details

### Store Location

**File**: `/src/lib/notifications/store.ts`

### Persistence Configuration

```typescript
persist(
  (set, get) => ({
    // State and actions...
  }),
  {
    name: 'notification-store',
    partialize: state => ({
      preferences: state.preferences,
      // Only persist notifications up to 100 to avoid quota issues
      notifications: state.notifications.slice(0, 100),
    }),
  }
)
```

### Notification Limit Enforcement

```typescript
addNotification: (notification) => {
  const notifications = [notification, ...get().notifications];
  // Limit total notifications to 100
  const limited = notifications.slice(0, 100);
  const unreadCount = limited.filter(
    (n) => n.status === NotificationStatus.UNREAD
  ).length;

  set({ notifications: limited, unreadCount });
},
```

## Usage Examples

### Basic Usage

```typescript
import { useNotificationStore } from '@/lib/notifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  return (
    <div>
      <div>Unread: {unreadCount}</div>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={() => markAsRead(notification.id)}
        />
      ))}
    </div>
  );
}
```

### Add a Notification

```typescript
const { addNotification } = useNotificationStore()

addNotification({
  id: 'notif-123',
  user_id: 'user1',
  type: NotificationType.TASK_ASSIGNED,
  title: 'New Task Assigned',
  content: 'You have been assigned to task #456',
  priority: NotificationPriority.HIGH,
  status: NotificationStatus.UNREAD,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

### Mark as Read

```typescript
const { markAsRead } = useNotificationStore()

markAsRead('notif-123')
```

### Mark All as Read

```typescript
const { markAllAsRead } = useNotificationStore()

markAllAsRead()
```

### Clear All Notifications

```typescript
const { clearAll } = useNotificationStore()

clearAll()
```

### Filter Notifications

```typescript
const { filterByType, filterByPriority, getUnreadNotifications } = useNotificationStore()

// Get all task assigned notifications
const taskNotifications = filterByType(NotificationType.TASK_ASSIGNED)

// Get all high priority notifications
const urgentNotifications = filterByPriority(NotificationPriority.URGENT)

// Get only unread notifications
const unread = getUnreadNotifications()
```

## API Reference

### State

| Property        | Type                      | Description                        |
| --------------- | ------------------------- | ---------------------------------- |
| `notifications` | `Notification[]`          | Array of notifications (max 100)   |
| `unreadCount`   | `number`                  | Count of unread notifications      |
| `preferences`   | `NotificationPreferences` | User notification settings         |
| `isLoading`     | `boolean`                 | Loading state for async operations |
| `error`         | `string \| null`          | Error message if any               |

### Actions

| Method               | Parameters                                      | Description                                 |
| -------------------- | ----------------------------------------------- | ------------------------------------------- |
| `setNotifications`   | `notifications: Notification[]`                 | Replace all notifications                   |
| `addNotification`    | `notification: Notification`                    | Add a new notification (enforces 100 limit) |
| `updateNotification` | `id: string, updates: Partial<Notification>`    | Update specific notification                |
| `removeNotification` | `id: string`                                    | Remove a specific notification              |
| `markAsRead`         | `id: string`                                    | Mark notification as read                   |
| `markAllAsRead`      | `()`                                            | Mark all notifications as read              |
| `clearAll`           | `()`                                            | Remove all notifications                    |
| `updatePreferences`  | `preferences: Partial<NotificationPreferences>` | Update user preferences                     |
| `resetPreferences`   | `()`                                            | Reset preferences to defaults               |
| `setLoading`         | `loading: boolean`                              | Set loading state                           |
| `setError`           | `error: string \| null`                         | Set error state                             |

### Selectors

| Selector              | Returns                   | Description           |
| --------------------- | ------------------------- | --------------------- |
| `selectUnreadCount`   | `number`                  | Get unread count      |
| `selectNotifications` | `Notification[]`          | Get all notifications |
| `selectPreferences`   | `NotificationPreferences` | Get user preferences  |
| `selectIsLoading`     | `boolean`                 | Get loading state     |

## Testing

### Test Location

**File**: `/src/lib/notifications/__tests__/store.test.ts`

### Run Tests

```bash
npm test -- src/lib/notifications/__tests__/store.test.ts
```

### Test Coverage

- ✅ Basic state management
- ✅ Add/Update/Remove notifications
- ✅ Mark as read/Mark all as read
- ✅ Clear all notifications
- ✅ Preferences management
- ✅ Filtering (by type, priority, status)
- ✅ Loading and error states
- ✅ Notification limit (100 items)
- ✅ Persistence across store resets

### Test Results

```
Test Files  1 passed (1)
     Tests  17 passed (17)
  Duration  ~5.75s
```

## localStorage Structure

### Storage Key

```typescript
'notification-store'
```

### Stored Data Format

```json
{
  "state": {
    "notifications": [
      {
        "id": "notif-123",
        "user_id": "user1",
        "type": "task_assigned",
        "title": "New Task Assigned",
        "content": "You have been assigned to task #456",
        "priority": "high",
        "status": "unread",
        "group_id": "team1",
        "related_id": "task456",
        "related_type": "task",
        "metadata": {},
        "created_at": "2026-03-24T07:00:00.000Z",
        "updated_at": "2026-03-24T07:00:00.000Z",
        "read_at": null
      }
    ],
    "preferences": {
      "user_id": "user1",
      "enabled_types": ["task_assigned", "task_overdue", "meeting_reminder", "user_mention"],
      "enabled": true,
      "email_enabled": true,
      "sound_enabled": true
    }
  },
  "version": 0
}
```

## Performance Considerations

### localStorage Quota

- **Typical Quota**: 5-10 MB per origin
- **Notification Size**: ~500 bytes per notification
- **100 Notifications**: ~50 KB total
- **Safe Limit**: 100 notifications leaves plenty of room for other data

### Optimization Strategies

1. **Selective Persistence**: Only persist necessary data
2. **Size Limit**: Enforce 100 notification limit
3. **Automatic Cleanup**: Remove oldest when limit exceeded
4. **Efficient Updates**: Zustand's middleware prevents unnecessary writes

## Migration Guide

### From Old Hook to Zustand Store

**Old Approach** (deprecated):

```typescript
import { useNotifications } from '@/hooks/useNotifications'

const { notifications, addNotification } = useNotifications()
```

**New Approach** (recommended):

```typescript
import { useNotificationStore } from '@/lib/notifications'

const { notifications, addNotification } = useNotificationStore()
```

### Key Differences

| Feature            | Old Hook                  | Zustand Store              |
| ------------------ | ------------------------- | -------------------------- |
| State Management   | React hooks               | Zustand store              |
| Persistence        | Custom localStorage logic | Zustand persist middleware |
| Global Access      | Provider required         | Import anywhere            |
| TypeScript Support | Basic                     | Full type safety           |
| Testability        | Requires React wrapper    | Direct function calls      |
| Performance        | Re-renders on change      | Selective subscriptions    |

## Troubleshooting

### Notifications Not Persisting

**Symptoms**: Notifications disappear after page refresh

**Solutions**:

1. Check browser localStorage support
2. Verify no browser extensions blocking localStorage
3. Check browser console for quota errors
4. Clear localStorage and reload

### Stale Data

**Symptoms**: Old notifications shown after updates

**Solutions**:

1. Clear localStorage: `localStorage.removeItem('notification-store')`
2. Reload page to reinitialize store
3. Check if multiple tabs are open (sync may lag)

### Exceeding Quota

**Symptoms**: Console warnings about localStorage quota

**Solutions**:

1. Check if other features are using localStorage heavily
2. Consider reducing notification limit
3. Clear old data from localStorage

## Browser Compatibility

### localStorage Support

| Browser | Version      | Status             |
| ------- | ------------ | ------------------ |
| Chrome  | 4+           | ✅ Full support    |
| Firefox | 3.5+         | ✅ Full support    |
| Safari  | 4+           | ✅ Full support    |
| Edge    | All versions | ✅ Full support    |
| IE      | 8+           | ⚠️ Partial support |

### Private/Incognito Mode

- **Chrome/Firefox**: localStorage available but cleared on close
- **Safari**: localStorage not available in private mode
- **Impact**: Notifications won't persist in private mode (expected behavior)

## Security Considerations

### Data Exposure

- **No Sensitive Data**: Notifications don't contain passwords or tokens
- **XSS Protection**: Validate all notification data before storing
- **Same-Origin**: localStorage only accessible from same origin

### Sanitization

Always sanitize notification content before storing:

```typescript
import DOMPurify from 'dompurify'

const sanitizedContent = DOMPurify.sanitize(rawContent)
```

## Future Enhancements

- [ ] IndexedDB for larger storage capacity
- [ ] Multi-tab synchronization with BroadcastChannel
- [ ] Compression for large metadata
- [ ] Configurable notification limit per user
- [ ] Archive old notifications to server
- [ ] Import/export notification history
- [ ] Notification backup and restore

## Related Documentation

- [Notification System Overview](./NOTIFICATION_SYSTEM.md)
- [WebSocket Integration](./WEBSOCKET.md)
- [State Management Guide](./STATE_MANAGEMENT_MIGRATION.md)
- [Testing Documentation](./TESTING.md)

## License

Part of 7zi-project. See project license for details.
