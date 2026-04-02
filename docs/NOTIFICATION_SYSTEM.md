# Real-time Notification System

## Overview

The 7zi-project now includes a comprehensive real-time notification system supporting multiple delivery channels:

- **WebSocket Push Notifications** - Real-time browser notifications using Socket.IO
- **In-App Messages** - Persistent notification storage with read/unread tracking
- **Email Notifications** - Optional email delivery using Resend API
- **User Preferences** - Customizable notification settings per user

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Notification Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────────────────────┐       │
│  │  Trigger    │     │  EnhancedNotificationService │       │
│  │  (Task API, │────▶│                              │       │
│  │   Events)   │     │  ┌────────────────────────┐   │       │
│  └─────────────┘     │  │  1. Store to DB       │   │       │
│                      │  └────────────────────────┘   │       │
│                      │                                │       │
│                      │  ┌────────────────────────┐   │       │
│                      │  │  2. WebSocket Push    │   │       │
│                      │  │     (Real-time)        │   │       │
│                      │  └────────────────────────┘   │       │
│                      │                                │       │
│                      │  ┌────────────────────────┐   │       │
│                      │  │  3. Check Preferences │   │       │
│                      │  └────────────────────────┘   │       │
│                      │                                │       │
│                      │  ┌────────────────────────┐   │       │
│                      │  │  4. Email Delivery    │   │       │
│                      │  │     (Optional)        │   │       │
│                      │  └────────────────────────┘   │       │
│                      │                                │       │
│                      └────────────────────────────────┘       │
│                              │                                │
│              ┌───────────────┼───────────────┐                │
│              │               │               │                │
│              ▼               ▼               ▼                │
│     ┌─────────────┐  ┌──────────┐  ┌──────────────┐        │
│     │   SQLite    │  │ Socket.IO│  │   Resend     │        │
│     │  Storage    │  │  Server  │  │    API       │        │
│     └─────────────┘  └──────────┘  └──────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── lib/
│   └── services/
│       ├── notification.ts              # Base WebSocket notification service
│       ├── notification-enhanced.ts      # Enhanced service with email & storage
│       ├── notification-storage.ts      # SQLite persistence layer
│       └── email.ts                      # Email service (Resend API)
├── app/
│   └── api/
│       └── notifications/
│           ├── route.ts                  # Basic CRUD operations
│           ├── [id]/route.ts             # Individual notification operations
│           ├── enhanced/route.ts         # Enhanced notification API
│           ├── preferences/[userId]/route.ts  # User preferences API
│           ├── stats/route.ts            # Statistics API
│           └── socket/route.ts           # WebSocket server setup
├── components/
│   └── notifications/
│       ├── NotificationProvider.tsx      # React context provider
│       ├── NotificationCenter.tsx        # UI component for notifications
│       ├── NotificationToaster.tsx      # Toast notifications
│       └── NotificationToast.tsx         # Individual toast component
└── hooks/
    └── useNotifications.ts               # React hook for notifications
```

## Features

### 1. WebSocket Real-time Notifications

**Technology**: Socket.IO

**Events**:

- `subscribe` - Subscribe to notification channels
- `unsubscribe` - Unsubscribe from channels
- `notification` - New notification received
- `notification_read` - Notification marked as read
- `notifications_cleared` - All notifications cleared
- `notification_deleted` - Notification deleted
- `unread_count` - Unread count update

**Channels**:

- `user:{userId}` - User-specific notifications
- `team:{teamId}` - Team-wide notifications
- `all` - System-wide notifications

### 2. In-App Messages

**Storage**: SQLite database with WAL mode for performance

**Tables**:

- `notifications` - Notification records
- `user_notification_preferences` - User notification settings
- `notification_delivery_log` - Delivery tracking

**Features**:

- Persistent storage
- Read/unread tracking
- Filtering by type, priority, user, team, task
- Expiration support
- Delivery logging

### 3. Email Notifications

**Technology**: Resend API

**Features**:

- HTML email templates with responsive design
- Priority-based delivery (only send emails above threshold)
- Quiet hours support
- User opt-out capability
- Delivery tracking

**Configuration**:

```bash
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@7zi.studio
CONTACT_EMAIL=business@7zi.studio
```

### 4. User Preferences

**Settings**:

- `emailEnabled` - Enable/disable email notifications
- `emailThreshold` - Minimum priority for emails (low/medium/high/urgent)
- `pushEnabled` - Enable/disable push notifications
- `pushThreshold` - Minimum priority for push
- `digestEnabled` - Enable digest emails (future feature)
- `digestFrequency` - Digest frequency (hourly/daily/weekly)
- `quietHoursStart` - Start time for quiet hours (HH:mm)
- `quietHoursEnd` - End time for quiet hours (HH:mm)
- `timezone` - User timezone

## API Reference

### Create Notification

**POST** `/api/notifications/enhanced`

```json
{
  "title": "Task Assigned",
  "message": "You have been assigned to task #1234",
  "type": "task_assigned",
  "priority": "high",
  "userId": "user123",
  "taskId": "task1234",
  "forceEmail": true,
  "emailRecipients": [
    {
      "email": "user@example.com",
      "name": "User Name"
    }
  ]
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "notif_1711000000000_abc123",
    "emailSent": true,
    "message": "Notification sent"
  }
}
```

### Get Notifications

**GET** `/api/notifications/enhanced?userId=user123&limit=20`

**Response**:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "count": 20,
    "unreadCount": 5
  }
}
```

### Get User Preferences

**GET** `/api/notifications/preferences/{userId}`

**Response**:

```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "emailEnabled": true,
    "emailThreshold": "high",
    "pushEnabled": true,
    "pushThreshold": "medium",
    "digestEnabled": false,
    "digestFrequency": "daily",
    "timezone": "UTC"
  }
}
```

### Update User Preferences

**PUT** `/api/notifications/preferences/{userId}`

```json
{
  "emailEnabled": true,
  "emailThreshold": "high",
  "pushEnabled": true,
  "pushThreshold": "medium",
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "timezone": "Europe/Berlin"
}
```

### Get Statistics

**GET** `/api/notifications/stats`

**Response**:

```json
{
  "success": true,
  "data": {
    "totalNotifications": 1523,
    "unreadNotifications": 45,
    "totalUsers": 23,
    "totalDeliveries": 3200,
    "emailEnabled": true
  }
}
```

## Usage Examples

### Server-Side: Send Notification

```typescript
import {
  enhancedNotificationService,
  NotificationType,
  NotificationPriority,
} from '@/lib/services/notification-enhanced'

await enhancedNotificationService.notify(
  {
    type: NotificationType.TASK_ASSIGNED,
    priority: NotificationPriority.HIGH,
    title: 'New Task Assigned',
    message: 'You have been assigned to review PR #456',
    userId: 'user123',
    taskId: 'task456',
    data: {
      taskUrl: 'https://7zi.com/tasks/task456',
    },
  },
  {
    forceEmail: true,
  }
)
```

### Client-Side: Use Notifications Hook

```typescript
'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationProvider } from '@/components/notifications';

function App() {
  return (
    <NotificationProvider userId="user123">
      <Dashboard />
    </NotificationProvider>
  );
}

function Dashboard() {
  const { notifications, unreadCount, markAsRead } = useNotifications({
    userId: 'user123',
  });

  return (
    <div>
      <BellIcon />
      <span>{unreadCount}</span>
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

### Client-Side: Set User Preferences

```typescript
const updatePreferences = async () => {
  const response = await fetch('/api/notifications/preferences/user123', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailEnabled: true,
      emailThreshold: 'high',
      pushEnabled: true,
      pushThreshold: 'medium',
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'Europe/Berlin',
    }),
  })

  const result = await response.json()
}
```

## Notification Types

| Type             | Description          | Use Case                               |
| ---------------- | -------------------- | -------------------------------------- |
| `info`           | General information  | System announcements, updates          |
| `success`        | Success messages     | Task completed, operation successful   |
| `warning`        | Warning messages     | Deadlines approaching, resource limits |
| `error`          | Error messages       | Failed operations, critical errors     |
| `task_assigned`  | Task assignment      | New task assigned to user              |
| `task_completed` | Task completion      | Task marked as complete                |
| `task_updated`   | Task update          | Task details changed                   |
| `message`        | Direct message       | User mentions, comments                |
| `system`         | System notifications | Platform-wide announcements            |

## Priority Levels

| Priority | Description       | Default Behavior              |
| -------- | ----------------- | ----------------------------- |
| `low`    | Non-critical      | Push only, no email           |
| `medium` | Normal importance | Push + email if user opted in |
| `high`   | Important         | Push + email (default)        |
| `urgent` | Critical          | Push + email + force send     |

## Environment Variables

```bash
# Notification Service
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@7zi.studio
CONTACT_EMAIL=business@7zi.studio

# Socket.IO Server (if running separately)
NEXT_PUBLIC_NOTIFICATION_SOCKET_URL=http://localhost:3001
NOTIFICATION_SOCKET_PORT=3001

# Database
DATABASE_PATH=/data/7zi.db
```

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed in `package.json`:

- `socket.io` - WebSocket server
- `socket.io-client` - WebSocket client
- `better-sqlite3` - SQLite database

### 2. Configure Environment

Add to `.env.local` or `.env.production`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@7zi.studio
CONTACT_EMAIL=business@7zi.studio
```

### 3. Initialize Notification Service

Create or update your startup script (e.g., in `app/layout.tsx`):

```typescript
import { enhancedNotificationService } from '@/lib/services/notification-enhanced'

// Initialize on server startup
if (typeof window === 'undefined') {
  enhancedNotificationService.initialize().catch(console.error)
}
```

### 4. Wrap Your App with NotificationProvider

```typescript
// In app/layout.tsx
import { NotificationProvider } from '@/components/notifications';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

## Best Practices

### 1. Notification Design

- **Be concise**: Keep titles under 50 characters
- **Be specific**: Clear, actionable messages
- **Set appropriate priority**: Don't overuse "urgent"
- **Include context**: Link to relevant resources

### 2. Email Configuration

- **Set thresholds carefully**: High priority emails by default
- **Use quiet hours**: Respect user's sleep time
- **Provide opt-out**: Always allow users to unsubscribe

### 3. Performance

- **Batch operations**: Use `markAllAsRead` instead of individual calls
- **Limit history**: Keep only recent notifications (default 1000)
- **Clean up expired**: Regular cleanup removes old notifications

### 4. Security

- **Never expose API keys**: Keep `RESEND_API_KEY` server-side only
- **Validate inputs**: Always validate notification data
- **Rate limiting**: Consider rate limits for notification creation

## Troubleshooting

### WebSocket Not Connecting

1. Check Socket.IO server status: `GET /api/notifications/socket`
2. Verify `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL` in `.env.local`
3. Check browser console for connection errors
4. Ensure CORS is configured correctly

### Emails Not Sending

1. Verify `RESEND_API_KEY` is set correctly
2. Check Resend API quota: https://resend.com/dashboard
3. Review delivery logs in database
4. Check user email preferences

### Notifications Not Persisting

1. Ensure database directory exists: `/data/`
2. Check write permissions on database file
3. Verify `DATABASE_PATH` environment variable

## Future Enhancements

- [ ] Digest emails (hourly/daily/weekly)
- [ ] Push notifications (mobile app)
- [ ] SMS notifications
- [ ] Notification templates
- [ ] A/B testing for notification content
- [ ] Analytics dashboard
- [ ] Notification grouping
- [ ] Action buttons in notifications

## License

Part of 7zi-project. See project license for details.
