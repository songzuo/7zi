# WebSocket Real-time Collaboration Implementation

## Overview

This document describes the WebSocket implementation for multi-user real-time collaboration in the 7zi-project.

## Architecture

### Why WebSocket (vs SSE)?

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Use Case | Notifications, one-way updates | Interactive collaboration, chat |
| Reconnection | Native support | Custom implementation |
| Rooms/Channels | Manual | Built-in support |
| Binary Data | Limited | Full support |

### Components

1. **WebSocket Server** (`src/app/api/ws/route.ts`)
   - Socket.IO server implementation
   - Authentication middleware
   - Room management
   - Message broadcasting

2. **Collaboration Manager** (`src/lib/collaboration/manager.ts`)
   - Document state management
   - Operational transformation (OT) for conflict resolution
   - User presence tracking
   - Cursor position synchronization

3. **WebSocket Client Hook** (`src/lib/websocket/useCollaboration.ts`)
   - React hook for collaboration features
   - Automatic reconnection
   - Offline support
   - Conflict handling

4. **Room Management** (`src/lib/collaboration/rooms.ts`)
   - Room creation and joining
   - User tracking per room
   - Room-specific broadcasts

## Message Protocol

### Message Types

```typescript
// Connection Messages
'auth:authenticate'          // Client → Server: Authenticate user
'auth:authenticated'        // Server → Client: Auth success
'auth:unauthorized'         // Server → Client: Auth failed

// Room Messages
'room:join'                 // Client → Server: Join a room
'room:leave'                // Client → Server: Leave a room
'room:joined'               // Server → Client: Successfully joined
'room:left'                 // Server → Client: Successfully left
'room:user_joined'          // Server → Room: User joined
'room:user_left'            // Server → Room: User left
'room:user_list'            // Server → Client: Current room users

// Document Messages
'doc:open'                  // Client → Server: Open document
'doc:opened'                // Server → Client: Document opened
'doc:close'                 // Client → Server: Close document
'doc:closed'                // Server → Client: Document closed
'doc:sync'                  // Server → Client: Full document sync
'doc:operation'             // Bidirectional: Document edit operation
'doc:operation_applied'     // Server → Client: Operation applied
'doc:operation_conflict'    // Server → Client: Operation conflict

// Cursor Messages
'cursor:move'               // Client → Server: Cursor position
'cursor:update'             // Server → Room: Other user's cursor

// Presence Messages
'presence:online'           // Server → Room: User came online
'presence:offline'          // Server → Room: User went offline
'presence:typing'           // Bidirectional: User typing status

// System Messages
'system:announcement'       // Server → All: System announcement
'system:error'              // Server → Client: Error message
```

### Message Format

```typescript
interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  roomId?: string;
  userId?: string;
  payload?: unknown;
}

interface OperationMessage {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

interface CursorMessage {
  userId: string;
  userName: string;
  position: number;
  selection?: { start: number; end: number };
  color: string;
}
```

## Room/Channel Concept

### Room Structure

```typescript
interface Room {
  id: string;
  name: string;
  type: 'task' | 'project' | 'chat' | 'document';
  documentId: string;
  users: Map<string, RoomUser>;
  document: DocumentState;
  createdAt: Date;
  lastActivity: Date;
}

interface RoomUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  joinedAt: Date;
  cursor?: CursorMessage;
  isTyping: boolean;
}
```

### Room Types

1. **Task Room** - For editing task details
   - One room per task
   - Auto-created when task is opened
   - Auto-destroyed when idle for 30 minutes

2. **Project Room** - For project-wide collaboration
   - One room per project
   - Persistent
   - Announcements and discussions

3. **Chat Room** - For real-time messaging
   - Created on demand
   - Persistent
   - Message history

4. **Document Room** - For rich text editing
   - One room per document
   - Auto-created
   - Full OT support

## Authentication

### Token-based Auth

```typescript
// Client sends
socket.emit('auth:authenticate', {
  token: 'jwt-token',
  userId: 'user-id'
});

// Server validates
if (verifyToken(token)) {
  socket.join(`user:${userId}`);
  socket.emit('auth:authenticated', { userId });
} else {
  socket.emit('auth:unauthorized', { reason: 'Invalid token' });
  socket.disconnect();
}
```

### JWT Verification

```typescript
import { verifyToken } from '@/lib/auth/jwt';

function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const decoded = verifyToken(token);
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}
```

## Operational Transformation (OT)

### Operation Structure

```typescript
interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

interface DocumentState {
  content: string;
  revision: number;
  operations: Operation[];
}
```

### Transform Function

```typescript
function transform(op1: Operation, op2: Operation): Operation {
  // Apply OT algorithm to transform operations
  // Ensures concurrent edits don't conflict
}
```

### Conflict Resolution

1. **Optimistic Locking**: Client applies locally, sends to server
2. **Server Validation**: Server transforms and validates
3. **Conflict Detection**: If operations conflict, return error
4. **Conflict Resolution**: Ask user to resolve or auto-merge

## Heartbeat & Reconnection

### Heartbeat

```typescript
// Client sends every 30s
setInterval(() => {
  socket.emit('heartbeat', { timestamp: Date.now() });
}, 30000);

// Server expects heartbeat every 45s
socket.on('heartbeat', () => {
  socket.data.lastHeartbeat = Date.now();
});

// Server disconnects if no heartbeat for 60s
setInterval(() => {
  if (Date.now() - socket.data.lastHeartbeat > 60000) {
    socket.disconnect();
  }
}, 10000);
```

### Reconnection Strategy

```typescript
// Exponential backoff
const baseDelay = 1000;
const maxDelay = 30000;
const attempts = 0;

function getReconnectDelay(attempts: number): number {
  return Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
}

// Client reconnects
socket.on('disconnect', (reason) => {
  if (reason !== 'io client disconnect') {
    setTimeout(() => {
      socket.connect();
    }, getReconnectDelay(attempts++));
  }
});
```

## Usage Examples

### Server-Side: Create WebSocket Route

```typescript
import { createServer } from '@/lib/websocket/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return createServer(req);
}
```

### Client-Side: Use Collaboration Hook

```typescript
import { useCollaboration } from '@/lib/websocket/useCollaboration';

function TaskEditor({ taskId }: { taskId: string }) {
  const {
    users,
    isConnected,
    cursors,
    sendOperation,
    moveCursor,
  } = useCollaboration({
    roomId: `task:${taskId}`,
    userId: currentUserId,
    documentId: taskId,
  });

  const handleTextChange = (newText: string) => {
    sendOperation({
      type: 'insert',
      position: cursorPosition,
      content: newText,
    });
  };

  return (
    <div>
      <ConnectionStatus connected={isConnected} />
      <UserList users={users} />
      <Editor
        cursors={cursors}
        onChange={handleTextChange}
        onCursorMove={moveCursor}
      />
    </div>
  );
}
```

## Performance Considerations

### 1. Connection Limits

- Max connections per user: 5
- Max users per room: 50
- Max rooms total: 1000

### 2. Message Throttling

- Cursor updates: max 30/second
- Typing indicators: max 10/second
- Document operations: as fast as possible

### 3. Cleanup

- Destroy idle rooms after 30 minutes
- Disconnect inactive users after 5 minutes
- Clear message history after 24 hours

### 4. Memory Management

```typescript
// Limit document size
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Limit operation history
const MAX_OPERATION_HISTORY = 1000;

// Limit cursor data per user
const MAX_CURSOR_DATA = 1024; // 1KB
```

## Security

### 1. Authentication

- All connections require JWT token
- Token validation on every message
- Token refresh on expiry

### 2. Authorization

- Room access control
- Document ownership verification
- Permission checks per operation

### 3. Rate Limiting

- Max messages per second per user
- Max operations per minute per room
- Connection rate limiting

### 4. Input Validation

- Validate all message payloads
- Sanitize document content
- Prevent XSS attacks

## Testing

### Unit Tests

```typescript
describe('WebSocket Server', () => {
  it('should authenticate valid tokens', async () => {
    const socket = createSocket({ token: 'valid-token' });
    await socket.connect();
    expect(socket.connected).toBe(true);
  });

  it('should reject invalid tokens', async () => {
    const socket = createSocket({ token: 'invalid-token' });
    await socket.connect();
    expect(socket.connected).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Multi-user Collaboration', () => {
  it('should sync operations between users', async () => {
    const user1 = createSocket({ userId: 'user1' });
    const user2 = createSocket({ userId: 'user2' });

    await user1.connect();
    await user2.connect();

    user1.emit('doc:operation', { type: 'insert', content: 'Hello' });

    await waitFor(() => {
      expect(lastMessage(user2, 'doc:operation')).toBeDefined();
    });
  });
});
```

## Monitoring & Metrics

### Key Metrics

- Active connections
- Messages per second
- Room count
- User count per room
- Operation latency
- Reconnection rate
- Error rate

### Logging

```typescript
// Log important events
logger.info('User joined room', {
  userId,
  roomId,
  timestamp: new Date(),
});

// Log errors
logger.error('Operation conflict', {
  userId,
  roomId,
  operation,
  error,
});
```

## Future Enhancements

1. **CRDT Implementation** - For better conflict resolution
2. **File Collaboration** - Real-time file editing
3. **Video/Audio** - Integrated WebRTC
4. **Mobile Push** - Offline notification
5. **Encryption** - End-to-end encryption
6. **Analytics** - Collaboration insights

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Operational Transformation](https://en.wikipedia.org/wiki/Operational_transformation)
- [CRDTs](https://crdt.tech/)
- [Real-time Architecture](https://www.realtimeapi.io/blog/)
