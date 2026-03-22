# WebSocket Real-Time Enhancement

## Overview

Enhanced WebSocket functionality for the 7zi-project with real-time task status updates, heartbeat monitoring, and automatic reconnection.

## Features

### 1. **Enhanced Server-Side WebSocket** (`src/lib/websocket/server.ts`)

- ✅ Real-time task status broadcasting
- ✅ Room-based message routing
- ✅ Connection heartbeat monitoring (60s timeout)
- ✅ Automatic room cleanup for idle rooms
- ✅ Document collaboration support
- ✅ Presence detection (typing indicators, cursors)
- ✅ Voice meeting signaling integration

#### New API Functions

```typescript
// Broadcast task status to all clients
await broadcastTaskStatusUpdate({
  taskId: 'task-123',
  status: 'Processing',
  state: 'running',
  timestamp: new Date().toISOString(),
  projectId: 'project-456',
  metadata: { progress: 50 }
});

// Send task status to specific user
await broadcastTaskStatusToUser('user-789', {
  taskId: 'task-123',
  status: 'Completed',
  state: 'completed',
  timestamp: new Date().toISOString()
});
```

### 2. **Client-Side WebSocket Hook** (`src/hooks/useWebSocket.ts`)

#### `useWebSocket` Hook

Full-featured WebSocket connection hook with automatic reconnection and heartbeat.

```typescript
const ws = useWebSocket({
  url: '/api/ws',
  token: 'your-jwt-token',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  heartbeatInterval: 25000,
});

// Connection state
console.log(ws.state.connected); // boolean
console.log(ws.state.authenticated); // boolean
console.log(ws.state.roomId); // string | undefined
console.log(ws.state.userId); // string | undefined

// Connection control
ws.connect();
ws.disconnect();
ws.reconnect();

// Room management
ws.joinRoom('room-123', 'task', 'doc-456', 'Task Room');
ws.leaveRoom('room-123');

// Send messages
ws.send('event:name', { data: 'value' });

// Event listeners
ws.on('task:status_update', (data) => {
  console.log('Task updated:', data);
});

ws.off('task:status_update', handler);
```

#### `useTaskStatusUpdates` Hook

Specialized hook for task status monitoring.

```typescript
const taskWs = useTaskStatusUpdates({
  autoConnect: true,
});

// Get all received task updates
console.log(taskWs.taskUpdates); // Map<taskId, TaskStatusUpdate>

// Get specific task status
const status = taskWs.getTaskStatus('task-123');

// Clear update from cache
taskWs.clearTaskUpdate('task-123');
```

### 3. **WebSocket Status Components**

#### `WebSocketStatusIndicator`

Full status display with reconnect button.

```typescript
<WebSocketStatusIndicator
  detailed={true}
  showReconnect={true}
  size="default"
  className="my-custom-class"
/>
```

#### `WebSocketStatusDot`

Compact status dot for headers and toolbars.

```typescript
<WebSocketStatusDot
  size="small"
  className="ml-4"
/>
```

### 4. **Demo Page**

Access the WebSocket demo at `/demo/websocket` to test all features:

- Connection management
- Room join/leave
- Test message sending
- Task status simulation
- Real-time message log

## Usage Examples

### Broadcasting Task Status Updates

In your task processing code:

```typescript
import { broadcastTaskStatusUpdate } from '@/lib/websocket';

async function processTask(taskId: string) {
  // Update to running
  await broadcastTaskStatusUpdate({
    taskId,
    status: 'Starting processing',
    state: 'running',
    timestamp: new Date().toISOString(),
    projectId: task.projectId,
  });

  try {
    // Process task...
    await doWork();

    // Update to completed
    await broadcastTaskStatusUpdate({
      taskId,
      status: 'Task completed successfully',
      state: 'completed',
      timestamp: new Date().toISOString(),
      projectId: task.projectId,
    });
  } catch (error) {
    // Update to failed
    await broadcastTaskStatusUpdate({
      taskId,
      status: 'Task failed: ' + error.message,
      state: 'failed',
      timestamp: new Date().toISOString(),
      projectId: task.projectId,
    });
  }
}
```

### React Component with Real-Time Updates

```typescript
'use client';

import { useTaskStatusUpdates } from '@/hooks/useWebSocket';

export function TaskMonitor({ taskId }: { taskId: string }) {
  const { state, taskUpdates, getTaskStatus } = useTaskStatusUpdates();

  const status = getTaskStatus(taskId);

  return (
    <div className="task-monitor">
      <WebSocketStatusIndicator detailed={true} />

      {status ? (
        <div className="task-status">
          <h3>Task: {taskId}</h3>
          <p>Status: {status.status}</p>
          <p>State: {status.state}</p>
          <p>Last Update: {new Date(status.timestamp).toLocaleString()}</p>
        </div>
      ) : (
        <p>No status updates yet</p>
      )}
    </div>
  );
}
```

### Room-Based Collaboration

```typescript
'use client';

import { useWebSocket } from '@/hooks/useWebSocket';

export function DocumentCollab({ roomId, documentId }) {
  const ws = useWebSocket({ autoConnect: true });

  useEffect(() => {
    // Join the document room
    ws.joinRoom(roomId, 'document', documentId, 'My Document');

    // Listen for document updates
    ws.on('doc:operation_applied', (update) => {
      console.log('Document updated:', update);
      // Update local document state
    });

    // Listen for cursor updates
    ws.on('cursor:update', (cursor) => {
      console.log('User cursor:', cursor);
      // Show other users' cursors
    });

    return () => {
      ws.leaveRoom(roomId);
    };
  }, [roomId, documentId]);

  return <DocumentEditor />;
}
```

## API Endpoints

### Demo Task Status API

`POST /api/demo/task-status`

Simulates a task status update broadcast.

**Request Body:**
```json
{
  "taskId": "task-123",
  "status": "Processing",
  "state": "running",
  "userId": "user-456",
  "projectId": "project-789",
  "metadata": {
    "progress": 50,
    "eta": "5 minutes"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task status update broadcasted",
  "update": {
    "id": "uuid-123",
    "timestamp": "2026-03-21T19:00:00.000Z",
    "taskId": "task-123",
    "status": "Processing",
    "state": "running",
    "userId": "user-456",
    "projectId": "project-789"
  }
}
```

## WebSocket Events

### Server → Client

- `auth:authenticated` - Authentication successful
- `auth:error` - Authentication failed
- `room:joined` - Successfully joined a room
- `room:user_joined` - Another user joined the room
- `room:user_left` - User left the room
- `room:user_list` - List of users in room
- `doc:operation_applied` - Document operation applied
- `cursor:update` - User cursor position updated
- `presence:typing` - User typing status changed
- `task:status_update` - **NEW** Task status updated
- `system:announcement` - System announcement
- `system:error` - Error message

### Client → Server

- `room:join` - Join a room
- `room:leave` - Leave a room
- `room:get_users` - Get users in room
- `doc:open` - Open document
- `doc:operation` - Send document operation
- `doc:sync` - Request document sync
- `cursor:move` - Update cursor position
- `presence:typing` - Update typing status
- `heartbeat` - Heartbeat ping

## Configuration

### Server Configuration (`src/lib/websocket/server.ts`)

```typescript
{
  path: '/api/ws',
  cors: {
    origin: process.env.NEXT_PUBLIC_SITE_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 45000,      // 45s
  pingInterval: 25000,     // 25s
  maxHttpBufferSize: 1e8,  // 100MB
}
```

### Client Configuration

```typescript
{
  url: process.env.NEXT_PUBLIC_WS_URL || '/api/ws',
  token: 'your-jwt-token',  // From auth context
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  heartbeatInterval: 25000,
  heartbeatTimeout: 60000,
}
```

## Heartbeat & Reconnection

### Heartbeat Mechanism

- Client sends heartbeat every 25 seconds
- Server tracks last heartbeat timestamp
- Server disconnects clients after 60 seconds of no heartbeat
- Client automatically reconnects on disconnection

### Reconnection Logic

- Auto-reconnect enabled by default
- 5 reconnection attempts with exponential backoff
- Start at 1s delay, max at 10s
- Manual reconnect via `ws.reconnect()`

## Error Handling

### Connection Errors

```typescript
ws.state.error // Contains error message

// Listen for errors
ws.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

### Authentication Errors

```typescript
socket.on('auth:error', (error) => {
  console.error('Auth failed:', error.message);
});
```

## Testing

1. **Visit demo page**: `/demo/websocket`
2. **Click "Connect"** to establish connection
3. **Join a room** to test room functionality
4. **Send test messages** to verify communication
5. **Simulate task updates** to see real-time broadcasting
6. **Disconnect and reconnect** to test reconnection logic

## Best Practices

1. **Always handle connection state** - Check `ws.state.connected` before sending
2. **Clean up event listeners** - Use `ws.off()` in useEffect cleanup
3. **Join rooms on mount, leave on unmount** - Prevent resource leaks
4. **Use task status hook for monitoring** - Leverage `useTaskStatusUpdates`
5. **Display status indicators** - Show connection status to users
6. **Handle errors gracefully** - Provide feedback when connection fails
7. **Debounce rapid updates** - Don't spam the server with updates

## Migration Guide

### From Basic Socket.IO

**Before:**
```typescript
const socket = io('/api/ws');
socket.on('message', handler);
```

**After:**
```typescript
const ws = useWebSocket({ autoConnect: true });
ws.on('message', handler);
// Automatic reconnection and heartbeat handled
```

### Adding Task Status Broadcasting

**Before:**
```typescript
// No task status updates
```

**After:**
```typescript
import { broadcastTaskStatusUpdate } from '@/lib/websocket';

await broadcastTaskStatusUpdate({
  taskId: task.id,
  status: task.status,
  state: 'running',
  timestamp: new Date().toISOString(),
});
```

## Troubleshooting

### Connection Issues

- Check firewall allows WebSocket connections
- Verify CORS settings match your origin
- Check authentication token is valid
- Review browser console for errors

### Performance Issues

- Reduce heartbeat interval if needed
- Use room-based broadcasting instead of global
- Implement client-side message debouncing
- Monitor connection count with `/api/ws/stats`

### Stale Updates

- Use `clearTaskUpdate()` to remove old updates
- Implement client-side TTL for cached updates
- Request fresh data on reconnection

## Future Enhancements

- [ ] Message queue for offline support
- [ ] Binary data support (file uploads)
- [ ] Rate limiting per user
- [ ] Message persistence for replay
- [ ] End-to-end encryption support
- [ ] Analytics dashboard
- [ ] Load testing with multiple connections

## Support

For issues or questions, refer to:
- Demo page: `/demo/websocket`
- API endpoint: `GET /api/demo/task-status`
- Source code: `src/lib/websocket/` and `src/hooks/useWebSocket.ts`
