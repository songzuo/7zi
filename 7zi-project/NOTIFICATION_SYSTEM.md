# Real-time Notification System

Complete real-time notification system for 7zi-project using WebSocket (Socket.IO).

## Features

- **Real-time delivery**: Instant notifications via WebSocket
- **Multiple notification types**: Info, success, warning, error, task events, messages, system
- **Priority levels**: Low, medium, high, urgent
- **User & team targeting**: Send notifications to specific users or teams
- **Read status tracking**: Mark notifications as read/unread
- **History & filtering**: Query notifications with filters
- **Browser notifications**: Native desktop notifications support
- **Auto-cleanup**: Automatic cleanup of expired notifications

## Architecture

```
┌─────────────────┐
│   Frontend      │
│                 │
│  ┌───────────┐  │
│  │  Hooks    │  │
│  │  useNotifications │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │Components │  │
│  │ - Toast   │  │
│  │ - Center  │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
    WebSocket
         │
┌────────▼────────┐
│  Socket.IO      │
│   Server        │
└────────┬────────┘
         │
┌────────▼────────┐
│ Notification    │
│   Service       │
└─────────────────┘
```

## Files

### Backend Services

- `src/lib/services/notification.ts` - Core notification service
- `src/lib/socket.ts` - Socket.IO initialization
- `src/app/api/notifications/route.ts` - Notifications CRUD API
- `src/app/api/notifications/[id]/route.ts` - Individual notification operations
- `src/app/api/notifications/socket/route.ts` - Socket.IO setup

### Frontend Hooks

- `src/hooks/useNotifications.ts` - React hook for notification management

### Frontend Components

- `src/components/notifications/NotificationToast.tsx` - Individual toast notification
- `src/components/notifications/NotificationToaster.tsx` - Toast container
- `src/components/notifications/NotificationCenter.tsx` - Full notification panel
- `src/components/notifications/NotificationProvider.tsx` - Context provider
- `src/components/notifications/index.ts` - Component exports

## Environment Variables

Add to your `.env.local`:

```env
# Socket.IO server URL (frontend)
NEXT_PUBLIC_NOTIFICATION_SOCKET_URL=http://localhost:3001

# Socket.IO server port (backend)
NOTIFICATION_SOCKET_PORT=3001
```

## Usage

### 1. Initialize Socket.IO Server

**Option A: Using API route (simplest)**

```bash
# POST to initialize
curl -X POST http://localhost:3000/api/notifications/socket
```

**Option B: Custom Next.js server**

```typescript
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketIO } from '@/lib/socket';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  initializeSocketIO(server);

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
```

### 2. Wrap App with Provider

```typescript
// app/layout.tsx
import { NotificationProvider } from '@/components/notifications';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <NotificationProvider
          userId="user-123"
          teamId="team-456"
          autoConnect
        >
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

### 3. Use Notification Components

```typescript
'use client';

import { useNotificationContext } from '@/components/notifications';
import { NotificationToaster, NotificationCenter } from '@/components/notifications';
import { useState } from 'react';

export default function Dashboard() {
  const { notifications, unreadCount, markAsRead } = useNotificationContext();
  const [showCenter, setShowCenter] = useState(false);

  return (
    <>
      <NotificationToaster
        notifications={notifications}
        onMarkRead={markAsRead}
        onDelete={(id) => console.log('Delete', id)}
      />

      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadCount}
        isOpen={showCenter}
        onClose={() => setShowCenter(false)}
        onMarkRead={markAsRead}
        onMarkAllRead={() => {/* logic */}}
        onDelete={(id) => console.log('Delete', id)}
      />

      <button onClick={() => setShowCenter(true)}>
        Notifications ({unreadCount})
      </button>
    </>
  );
}
```

### 4. Send Notifications

**Via API:**

```typescript
// POST /api/notifications
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'task_assigned',
    priority: 'high',
    title: 'New Task Assigned',
    message: 'You have been assigned to task #123',
    userId: 'user-123',
    teamId: 'team-456',
    taskId: 'task-123',
    data: { taskId: 'task-123', taskName: 'Review PR' },
  }),
});
```

**Via server-side service:**

```typescript
import { notificationService, NotificationType, NotificationPriority } from '@/lib/services/notification';

await notificationService.notify({
  type: NotificationType.TASK_ASSIGNED,
  priority: NotificationPriority.HIGH,
  title: 'New Task Assigned',
  message: 'You have been assigned to task #123',
  userId: 'user-123',
  teamId: 'team-456',
  taskId: 'task-123',
});
```

## Notification Types

```typescript
enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_UPDATED = 'task_updated',
  MESSAGE = 'message',
  SYSTEM = 'system',
}
```

## Priority Levels

```typescript
enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

## API Endpoints

### `GET /api/notifications`
Get notifications with optional filters.

Query parameters:
- `type` - Filter by notification type
- `priority` - Filter by priority
- `userId` - Filter by user ID
- `teamId` - Filter by team ID
- `taskId` - Filter by task ID
- `read` - Filter by read status (true/false)
- `since` - Filter by timestamp (milliseconds)
- `limit` - Maximum number of results (default: 50)

### `POST /api/notifications`
Create a new notification.

Body:
```json
{
  "type": "info",
  "priority": "medium",
  "title": "Notification Title",
  "message": "Notification message",
  "userId": "user-123",
  "teamId": "team-456",
  "taskId": "task-123",
  "data": { "key": "value" },
  "expiresAt": 1640995200000
}
```

### `GET /api/notifications/[id]`
Get a specific notification.

### `PATCH /api/notifications/[id]`
Update a notification (mark as read).

Body:
```json
{
  "read": true
}
```

### `DELETE /api/notifications/[id]`
Delete a notification.

### `GET /api/notifications/socket`
Get Socket.IO server status.

### `POST /api/notifications/socket`
Initialize Socket.IO server.

## Socket.IO Events

### Client → Server

- `subscribe` - Subscribe to notification channels
- `unsubscribe` - Unsubscribe from channels
- `mark_read` - Mark notification as read
- `mark_all_read` - Mark all notifications as read
- `unread_count` - Request unread count

### Server → Client

- `initial_notifications` - Send initial notifications on connection
- `notification` - New notification received
- `notification_read` - Notification marked as read
- `notifications_cleared` - All notifications cleared
- `notification_deleted` - Notification deleted
- `unread_count` - Unread count update
- `subscribed` - Subscription confirmation

## TypeScript Support

Full TypeScript support with comprehensive types:

```typescript
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
  NotificationSubscription,
} from '@/lib/services/notification';
```

## Testing

```bash
# Type checking
npm run type-check

# Build
npm run build
```

## Performance Considerations

1. **History limit**: Maximum 1000 notifications stored in memory
2. **Auto-cleanup**: Expired notifications removed every 5 minutes
3. **Optimistic updates**: Frontend updates immediately, syncs with server
4. **Batch operations**: Mark all as read in single operation

## Browser Notification Support

The system supports native browser notifications:

1. Requests permission on first interaction
2. Shows desktop notifications for new messages
3. Requires HTTPS (except on localhost)

## Future Enhancements

- [ ] Persistent storage (database)
- [ ] Notification templates
- [ ] Email/SMS fallback
- [ ] Scheduled/delayed notifications
- [ ] Notification grouping
- [ ] Do Not Disturb mode
- [ ] Per-user preferences
