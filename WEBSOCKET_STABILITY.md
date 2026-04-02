# WebSocket Stability Implementation

## Overview

This document describes the WebSocket stability improvements implemented for the 7zi-project.

## Features

### 1. Heartbeat Monitoring

- **Purpose**: Detect dead connections proactively
- **Implementation**:
  - Client sends `ping` every 25 seconds
  - Server responds with `pong`
  - Client expects `pong` within 10 seconds
  - If 3 consecutive pings are missed, connection is considered dead and reconnect is triggered

### 2. Exponential Backoff Reconnection

- **Purpose**: Handle temporary network issues gracefully
- **Implementation**:
  - Start with 1 second delay
  - Double the delay after each failed attempt
  - Maximum delay: 30 seconds
  - Unlimited retry attempts by default
  - Automatically resets when connection succeeds

### 3. Connection State Management

- **States**:
  - `DISCONNECTED`: Not connected
  - `CONNECTING`: Attempting to connect
  - `CONNECTED`: Successfully connected
  - `RECONNECTING`: Attempting to reconnect after disconnect
  - `ERROR`: Connection error (e.g., max attempts reached)

- **Features**:
  - State change listeners can be attached
  - Previous state is provided for tracking transitions
  - Real-time state updates to UI

### 4. Message Queuing

- **Purpose**: Preserve messages during disconnection
- **Implementation**:
  - Messages are queued when disconnected
  - Queue limit: 100 messages
  - Queue expiry: 5 minutes
  - Oldest messages removed when queue is full
  - All queued messages sent on reconnection
  - Expired messages automatically removed

## Components

### WebSocketManager Class

Location: `src/lib/websocket-manager.ts`

Core class that manages WebSocket connections with stability features.

**Key Methods**:

- `connect()`: Connect to server
- `disconnect()`: Disconnect from server
- `emit(event, data, queueIfOffline)`: Send message
- `on(event, listener)`: Add message listener
- `off(event, listener)`: Remove message listener
- `onStateChange(listener)`: Add state change listener
- `getState()`: Get current connection state
- `isConnected()`: Check if connected
- `getQueueSize()`: Get queue size
- `clearQueue()`: Clear message queue

### useNotificationsStable Hook

Location: `src/hooks/useNotificationsStable.ts`

React hook that wraps WebSocketManager for notification functionality.

**Return Values**:

```typescript
{
  notifications: Notification[],
  unreadCount: number,
  connectionState: ConnectionState,
  isConnected: boolean,
  isReconnecting: boolean,
  queueSize: number,
  connect: () => void,
  disconnect: () => void,
  markAsRead: (id: string) => void,
  markAllAsRead: () => void,
  deleteNotification: (id: string) => void,
  refreshNotifications: (filter?: NotificationFilter) => Promise<void>
}
```

## Usage

### Basic Usage

```typescript
'use client';

import { useNotificationsStable } from '@/hooks/useNotificationsStable';

export default function NotificationComponent() {
  const {
    notifications,
    unreadCount,
    connectionState,
    isConnected,
    isReconnecting,
    queueSize,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStable({
    userId: 'user123',
    teamId: 'team456',
    channels: ['general'],
  });

  return (
    <div>
      <div>
        Status: {connectionState} {isReconnecting && '(Reconnecting...)'}
        {isConnected ? '✅' : '❌'}
      </div>
      <div>Unread: {unreadCount}</div>
      {queueSize > 0 && <div>Queued messages: {queueSize}</div>}

      <ul>
        {notifications.map(notif => (
          <li key={notif.id}>
            {notif.title}: {notif.message}
            {!notif.read && (
              <button onClick={() => markAsRead(notif.id)}>
                Mark as read
              </button>
            )}
          </li>
        ))}
      </ul>

      <button onClick={markAllAsRead}>
        Mark all as read
      </button>
    </div>
  );
}
```

### Advanced Usage with Custom Options

```typescript
const notifications = useNotificationsStable({
  userId: 'user123',
  teamId: 'team456',
  channels: ['general', 'alerts'],
  socketUrl: 'https://api.example.com',
  auth: {
    token: 'your-auth-token',
  },
})
```

### Manual Connection Control

```typescript
const { connect, disconnect, isConnected } = useNotificationsStable({
  autoConnect: false, // Don't connect automatically
})

// Connect manually
connect()

// Disconnect manually
disconnect()
```

### Monitoring Connection State

```typescript
const { connectionState, onStateChange } = useNotificationsStable()

useEffect(() => {
  const unsubscribe = onStateChange((newState, previousState) => {
    console.log(`Connection changed: ${previousState} -> ${newState}`)

    // Show notification to user
    if (newState === 'reconnecting') {
      toast.info('Connection lost. Reconnecting...')
    } else if (newState === 'connected') {
      toast.success('Reconnected!')
    }
  })

  return unsubscribe
}, [onStateChange])
```

### Using WebSocketManager Directly

```typescript
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'

// Create manager
const wsManager = new WebSocketManager({
  url: 'http://localhost:3001',
  heartbeatInterval: 25000,
  heartbeatTimeout: 10000,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
})

// Listen to state changes
wsManager.onStateChange(state => {
  console.log('State:', state)
})

// Listen to messages
wsManager.on('notification', (event, data) => {
  console.log('Received:', data)
})

// Send message
wsManager.emit('subscribe', { userId: 'user123' })

// Disconnect when done
wsManager.disconnect()
```

## Server-Side Changes

### Heartbeat Support

The server has been updated to respond to ping requests:

```typescript
// In notification.ts
socket.on('ping', () => {
  socket.emit('pong')
})
```

### Socket.IO Configuration

Updated Socket.IO configuration for better connection stability:

```typescript
this.io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
})
```

## Testing

Run tests with:

```bash
npm test -- websocket-manager.test.ts
```

Tests cover:

- Connection management
- Heartbeat monitoring
- Exponential backoff reconnection
- Message queuing
- Connection state tracking
- Message handling

## Migration Guide

### From useNotifications to useNotificationsStable

**Old code:**

```typescript
import { useNotifications } from '@/hooks/useNotifications'

const { notifications, isConnected } = useNotifications({
  userId: 'user123',
})
```

**New code:**

```typescript
import { useNotificationsStable } from '@/hooks/useNotificationsStable'

const { notifications, isConnected, connectionState, isReconnecting, queueSize } =
  useNotificationsStable({
    userId: 'user123',
  })
```

**Key differences:**

1. Hook name changed from `useNotifications` to `useNotificationsStable`
2. Additional state information: `connectionState`, `isReconnecting`, `queueSize`
3. Same API for notifications: `markAsRead`, `markAllAsRead`, `deleteNotification`
4. Automatic reconnection with exponential backoff
5. Messages queued during disconnection

## Configuration Options

### WebSocketManager Options

| Option                 | Type    | Default                    | Description                     |
| ---------------------- | ------- | -------------------------- | ------------------------------- |
| `url`                  | string  | required                   | WebSocket server URL            |
| `autoConnect`          | boolean | true                       | Auto-connect on initialization  |
| `transports`           | array   | `['websocket', 'polling']` | Transport methods               |
| `heartbeatInterval`    | number  | 25000                      | Ping interval (ms)              |
| `heartbeatTimeout`     | number  | 10000                      | Pong timeout (ms)               |
| `reconnectionDelay`    | number  | 1000                       | Initial reconnection delay (ms) |
| `reconnectionDelayMax` | number  | 30000                      | Maximum reconnection delay (ms) |
| `reconnectionAttempts` | number  | Infinity                   | Max reconnection attempts       |
| `maxQueueSize`         | number  | 100                        | Maximum queued messages         |
| `queueExpiry`          | number  | 300000                     | Queue expiry time (ms)          |
| `auth`                 | object  | {}                         | Authentication data             |

## Troubleshooting

### Connection keeps disconnecting

1. Check network stability
2. Verify server is running
3. Check firewall settings
4. Review browser console for errors

### Messages not being queued

1. Check if `queueIfOffline` is `true` when calling `emit`
2. Verify queue size limit (default: 100)
3. Check queue expiry (default: 5 minutes)

### Reconnection not working

1. Verify `reconnectionAttempts` is not too low
2. Check maximum delay setting
3. Review server logs for connection issues

## Performance Considerations

### Memory Usage

- Message queue stores up to 100 messages
- Each message has a timestamp and retry counter
- Expired messages are automatically removed

### Network Usage

- Heartbeat: ~100 bytes every 25 seconds
- Minimal overhead for connection monitoring
- Queued messages sent in batch on reconnection

### CPU Usage

- Minimal: timers for heartbeat and reconnection
- Message listeners are event-driven
- State updates are reactive

## Best Practices

1. **Always handle state changes**: Show appropriate UI feedback
2. **Display queue size**: Inform users about pending messages
3. **Don't block UI**: Connection issues should not freeze the interface
4. **Test offline scenarios**: Verify queuing works correctly
5. **Monitor performance**: Check queue sizes and reconnection patterns
6. **Handle errors gracefully**: Provide user-friendly error messages
7. **Use appropriate intervals**: Balance between responsiveness and resource usage

## Future Enhancements

Potential improvements for future versions:

1. **Offline Detection**: Use navigator.onLine API for better offline handling
2. **Network Quality Monitoring**: Detect poor network conditions
3. **Priority Queues**: Prioritize important messages
4. **Compression**: Compress queued messages
5. **Persistence**: Save queued messages to localStorage
6. **Analytics**: Track connection metrics for monitoring

## Support

For issues or questions:

- Check test files for examples
- Review TypeScript types for API documentation
- Monitor browser console for debugging information
