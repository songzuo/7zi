# Notification Services

## Overview

The notification system in 7zi consists of three coordinated services that work together to provide real-time, email, and persistent storage for notifications:

1. **NotificationService** (`notification.ts`) - Base real-time notification service using Socket.IO
2. **EnhancedNotificationService** (`notification-enhanced.ts`) - Enhanced service adding email delivery and storage integration
3. **NotificationStorage** (`notification-storage.ts`) - SQLite-based persistent storage for notifications and user preferences

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   EnhancedNotificationService                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NotificationService (Socket.IO Real-time)          │   │
│  │  - WebSocket connections                            │   │
│  │  - Real-time push notifications                     │   │
│  │  - In-memory storage (temporary)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NotificationStorage (SQLite)                       │   │
│  │  - Persistent notification storage                  │   │
│  │  - User preferences                                 │   │
│  │  - Delivery logs                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EmailService Integration                           │   │
│  │  - Email delivery                                   │   │
│  │  - Priority-based filtering                         │   │
│  │  - Quiet hours                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility | Storage Type |
|---------|---------------|--------------|
| NotificationService | Real-time WebSocket delivery, temporary in-memory storage | In-memory (Map) |
| EnhancedNotificationService | Email delivery, user preferences, coordinates other services | Coordinates with NotificationStorage |
| NotificationStorage | Persistent storage, user preferences, delivery logs | SQLite |

## Singleton vs Instance Usage

### Singleton Pattern

All three services use the **singleton pattern** and export a single instance:

```typescript
// notification.ts
export const notificationService = new NotificationService();

// notification-enhanced.ts
export const enhancedNotificationService = new EnhancedNotificationService();

// notification-storage.ts
export const notificationStorage = new NotificationStorage();
```

**Why Singleton?**
- Socket.IO requires a single server instance
- Single database connection per process
- Shared state for WebSocket subscriptions
- Consistent user preferences across the application

**Usage Pattern:**
```typescript
// ✅ Correct: Use the exported singleton
import { notificationService } from '@/lib/services/notification';
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';
import { notificationStorage } from '@/lib/services/notification-storage';

// ❌ Incorrect: Don't create new instances
const service = new NotificationService(); // Multiple Socket.IO servers!
```

### Initialization

Services must be initialized before use:

```typescript
// NotificationService - call when HTTP server is available
notificationService.initialize(httpServer);

// EnhancedNotificationService - call at startup
await enhancedNotificationService.initialize();

// NotificationStorage - initialized by EnhancedNotificationService
// Or call manually: notificationStorage.initialize();
```

## Key Methods and Contracts

### NotificationService

#### `initialize(httpServer: Server): void`
- **Purpose:** Initialize Socket.IO server
- **Params:** `httpServer` - Node.js HTTP/HTTPS server instance
- **Throws:** None (warns if already initialized)
- **Thread Safety:** Not thread-safe (Node.js is single-threaded)

#### `notify(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<string>`
- **Purpose:** Create and broadcast a notification
- **Returns:** Notification ID
- **Async:** Yes (for future expansion)
- **Channels Broadcasted To:**
  - `user:{userId}` (if userId present)
  - `team:{teamId}` (if teamId present)
  - `all` (for system notifications)

#### `getNotifications(filter?: NotificationFilter): Notification[]`
- **Purpose:** Retrieve notifications with optional filtering
- **Returns:** Array of notifications (sorted by createdAt desc)
- **Filter Options:** type, priority, userId, teamId, taskId, read, since
- **Note:** Returns from in-memory storage only

#### `getUnreadCount(filter?: NotificationFilter): number`
- **Purpose:** Count unread notifications
- **Returns:** Number of unread notifications matching filter

#### `markAsRead(notificationId: string): void`
- **Purpose:** Mark a single notification as read
- **Broadcasts:** `notification_read` event to subscribed channels

#### `markAllAsRead(filter?: NotificationFilter): void`
- **Purpose:** Mark all matching notifications as read
- **Broadcasts:** `notifications_cleared` event

#### `deleteNotification(notificationId: string): void`
- **Purpose:** Delete a notification
- **Broadcasts:** `notification_deleted` event

#### `cleanupExpired(): number`
- **Purpose:** Remove expired notifications
- **Returns:** Number of notifications cleaned up

### EnhancedNotificationService

#### `initialize(dbPath?: string): Promise<void>`
- **Purpose:** Initialize storage and email service
- **Params:** `dbPath` - Optional custom database path
- **Env Vars:**
  - `RESEND_API_KEY` - Email service API key
  - `FROM_EMAIL` - Default sender email (defaults to `noreply@7zi.studio`)
  - `CONTACT_EMAIL` - Reply-to email
  - `NEXT_PUBLIC_APP_URL` - Base URL for action links

#### `notify(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>, options?: NotificationDeliveryOptions): Promise<{...}>`
- **Purpose:** Send notification via all channels
- **Returns:** `{ success, notificationId, emailSent, error? }`
- **Delivery Channels:**
  1. Storage (skip with `skipStorage: true`)
  2. WebSocket (skip with `skipPush: true`)
  3. Email (skip with `skipEmail: true`)
- **Options:**
  - `skipStorage`: Don't persist to database
  - `skipPush`: Don't send via WebSocket
  - `skipEmail`: Don't send email
  - `forceEmail`: Send email regardless of preferences
  - `emailRecipients`: Custom email recipients (bypasses user preferences)

#### `setUserPreferences(preferences: UserNotificationPreferences): void`
- **Purpose:** Set user notification preferences
- **Throws:** Error if storage not initialized
- **Preferences:**
  - `emailEnabled`: Enable email notifications
  - `emailThreshold`: Minimum priority for email
  - `pushEnabled`: Enable push notifications
  - `pushThreshold`: Minimum priority for push
  - `digestEnabled`: Enable digest emails
  - `digestFrequency`: `'hourly' | 'daily' | 'weekly'`
  - `quietHoursStart`: Start of quiet period (HH:mm)
  - `quietHoursEnd`: End of quiet period (HH:mm)
  - `timezone`: User's timezone (IANA format, e.g., `'Europe/Berlin'`)

#### `getUserPreferences(userId: string): UserNotificationPreferences | null`
- **Purpose:** Get user notification preferences
- **Returns:** Preferences object or null if not found

#### `getNotifications(filters?): Notification[]`
- **Purpose:** Get notifications from storage (not in-memory)
- **Returns:** Array of notifications
- **Filters:** userId, teamId, taskId, type, priority, read, since, limit, offset

### NotificationStorage

#### `initialize(): void`
- **Purpose:** Initialize SQLite database and create tables
- **Database Path:** `process.cwd()/data/notifications.db` (default)
- **Creates:** 3 tables (notifications, user_notification_preferences, notification_delivery_log)
- **Indexes:** Creates indexes on all frequently queried columns

#### `insertNotification(notification: {...}): void`
- **Purpose:** Store a notification in the database
- **Throws:** Error if database not initialized

#### `getNotifications(filters?): Array<{...}>`
- **Purpose:** Retrieve notifications from database
- **Returns:** Array of notification records
- **Filters:** Same as EnhancedNotificationService

#### `markAsRead(notificationId: string): boolean`
- **Purpose:** Mark notification as read in database
- **Returns:** True if notification was found and updated

#### `markAllAsRead(userId: string): number`
- **Purpose:** Mark all notifications for a user as read
- **Returns:** Number of notifications updated

#### `getUserPreferences(userId: string): {...} | null`
- **Purpose:** Get user preferences from database
- **Returns:** Preferences object or null

#### `setUserPreferences(userId: string, preferences: {...}): void`
- **Purpose:** Set user preferences (upserts)
- **Throws:** Error if database not initialized

#### `logDelivery(log: {...}): void`
- **Purpose:** Log notification delivery attempt
- **Logs:** channel, recipient, status, error (if any), timestamp, metadata

#### `cleanupExpired(): number`
- **Purpose:** Delete expired notifications from database
- **Returns:** Number of notifications deleted

#### `getStats(): {...}`
- **Purpose:** Get database statistics
- **Returns:** `{ totalNotifications, unreadNotifications, totalUsers, totalDeliveries }`

#### `close(): void`
- **Purpose:** Close database connection
- **Note:** Call on application shutdown

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

Priority is ordered from highest to lowest:

```typescript
enum NotificationPriority {
  URGENT = 'urgent',  // 0 - Immediate attention required
  HIGH = 'high',      // 1 - Important but not critical
  MEDIUM = 'medium',  // 2 - Standard priority
  LOW = 'low',        // 3 - Low priority
}
```

**Email Threshold Behavior:**
- Emails are sent for notifications at or above the threshold
- Example: If threshold is `HIGH`, only `URGENT` and `HIGH` notifications trigger emails
- Default threshold (without preferences): `HIGH`

## Quiet Hours

Quiet hours suppress email notifications during specified time periods.

### Configuration

```typescript
{
  quietHoursStart: '22:00',  // 10:00 PM
  quietHoursEnd: '08:00',    // 8:00 AM
  timezone: 'Europe/Berlin'  // User's timezone
}
```

### Behavior

- **Normal Case (22:00 - 08:00):** Emails suppressed between 10 PM and 8 AM next day
- **Overnight Case (22:00 - 06:00):** Emails suppressed from 10 PM to 6 AM next day
- **Timezone Aware:** Uses user's timezone for calculations
- **Error Handling:** If timezone is invalid, assumes quiet hours are not active

### Edge Cases

- **Midnight Crossing:** Properly handles periods that cross midnight (e.g., 22:00 - 08:00)
- **Equal Start/End:** Treated as no quiet hours
- **Invalid Format:** Falls back to no quiet hours

## Known Limitations

### NotificationService

1. **In-Memory Storage Only:** Notifications are stored in memory and lost on server restart
2. **No Persistence:** Use EnhancedNotificationService for persistent storage
3. **Maximum History Size:** Limited to 1000 notifications in history
4. **No Queue:** Notifications are sent immediately (could overwhelm slow clients)
5. **No Retry:** Failed WebSocket sends are not retried

### EnhancedNotificationService

1. **Email Recipients:** Currently requires manual email recipient passing or user email lookup integration
2. **No Batching:** Each email is sent individually (no digest implementation yet)
3. **No Rate Limiting:** Email service may be overwhelmed by high notification volume
4. **SQLite Limit:** Not suitable for high-concurrency multi-instance deployments
5. **No Web Push:** Browser push notifications not implemented

### NotificationStorage

1. **SQLite Limit:** Single-writer lock limits concurrency
2. **No Connection Pooling:** Uses a single database connection
3. **No Automatic Cleanup:** Requires manual `cleanupExpired()` calls
4. **No Migration System:** Schema changes require manual database updates
5. **No Backup:** No automatic backup mechanism

### General Limitations

1. **No Distributed Locking:** Multiple server instances will have inconsistent state
2. **No Scaling:** Not designed for horizontal scaling (use Redis + message queue instead)
3. **No Analytics:** Limited delivery analytics (only basic logs)
4. **No A/B Testing:** No support for notification experimentation
5. **No Template Engine:** Email templates are static

## Best Practices

### 1. Use Enhanced Service for Production

```typescript
// ✅ Correct: Use enhanced service for persistence
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';

await enhancedNotificationService.initialize();
await enhancedNotificationService.notify(notification);
```

### 2. Initialize Services at Startup

```typescript
// In your server startup code (e.g., app.ts or server.ts)
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';
import { notificationService } from '@/lib/services/notification';

// Initialize storage and email
await enhancedNotificationService.initialize();

// Initialize WebSocket with HTTP server
notificationService.initialize(httpServer);
```

### 3. Handle Initialization Errors

```typescript
try {
  await enhancedNotificationService.initialize();
} catch (error) {
  console.error('Failed to initialize notification service:', error);
  // Decide whether to continue without notifications or crash
}
```

### 4. Set User Preferences

```typescript
enhancedNotificationService.setUserPreferences({
  userId: 'user-123',
  emailEnabled: true,
  emailThreshold: NotificationPriority.HIGH,
  pushEnabled: true,
  pushThreshold: NotificationPriority.MEDIUM,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'Europe/Berlin',
  digestEnabled: false,
  digestFrequency: 'daily',
});
```

### 5. Use Options to Skip Unnecessary Channels

```typescript
// Don't send email for high-volume notifications
await enhancedNotificationService.notify(notification, {
  skipEmail: true,
});

// Force email for critical alerts
await enhancedNotificationService.notify(criticalAlert, {
  forceEmail: true,
});
```

### 6. Periodically Clean Up Expired Notifications

```typescript
// Run every hour
setInterval(() => {
  const count = enhancedNotificationService.cleanupExpired();
  if (count > 0) {
    console.log(`Cleaned up ${count} expired notifications`);
  }
}, 60 * 60 * 1000);
```

### 7. Close Database Connection on Shutdown

```typescript
process.on('SIGTERM', () => {
  notificationStorage.close();
  process.exit(0);
});
```

## Testing

Unit tests are available for both services:

```bash
# Run all notification service tests
npm test -- src/lib/services/__tests__

# Run specific test file
npm test -- src/lib/services/__tests__/notification-service.test.ts
npm test -- src/lib/services/__tests__/notification-enhanced.test.ts
```

## Migration Path

If you need to scale beyond SQLite or use multiple server instances:

1. **Replace NotificationStorage with Redis** for multi-instance support
2. **Use a Message Queue** (RabbitMQ, SQS) for reliable delivery
3. **Add a Job Worker** for email sending (prevent blocking)
4. **Implement Database Migrations** (Prisma, TypeORM, etc.)
5. **Add Distributed Locking** for concurrent updates

## Related Services

- **EmailService** (`src/lib/services/email.ts`) - Email delivery via Resend
- **Logger** (`src/lib/logger.ts`) - Logging for all services

## Support

For issues or questions about the notification system, please refer to the test files for usage examples or consult the main documentation.
