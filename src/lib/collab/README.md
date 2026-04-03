# Real-time Collaborative Document Editing System

Enterprise-grade collaborative editing with CRDTs, WebSocket sync, and real-time presence.

## Features

- **CRDT-based Synchronization**: Conflict-free replicated data types for guaranteed consistency
- **Real-time WebSocket Communication**: Low-latency bidirectional sync
- **User Presence**: Cursor tracking, online status, and user colors
- **Automatic Reconnection**: Handles network interruptions gracefully
- **TypeScript**: Full type safety and IntelliSense support
- **Vector Clocks**: Causal ordering and conflict detection

## Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client    │ ◄───────────────────────► │   Server    │
│             │                            │             │
│  - CRDT     │  Operations, Cursors,     │  - CRDT     │
│  - Buffer   │  Presence, Sync           │  - Sessions │
│  - Reconnect│                            │  - Broadcast│
└─────────────┘                            └─────────────┘
```

## Installation

```bash
npm install ws
```

## Quick Start

### Server Setup

```typescript
import { CollabServer } from '@/lib/collab';

// Start server on port 8080
const server = new CollabServer(8080);

// Listen for events
server.on('client-joined', ({ session, client }) => {
  console.log(`${client.name} joined session ${session.id}`);
});

server.on('operation', ({ session, clientId, operation }) => {
  console.log(`Operation from ${clientId}:`, operation);
});
```

### Client Connection

```typescript
import { joinSession } from '@/lib/collab';

// Connect to session
const connection = await joinSession('session-123', {
  url: 'ws://localhost:8080',
  userId: 'user-123',
  userName: 'Alice',
});

// Subscribe to content changes
const unsubscribe = connection.onContentChange((content) => {
  console.log('Content updated:', content);
});

// Insert text
connection.insert(0, 'Hello, world!');

// Delete text
connection.delete(0, 5);

// Update cursor
connection.setCursor({ line: 0, column: 10 });

// Get connected users
const users = connection.getUsers();
console.log('Online users:', users);

// Disconnect
connection.leave();
```

## API Reference

### Server API

#### `CollabServer`

```typescript
class CollabServer extends EventEmitter {
  constructor(port?: number)

  // Events
  on(event: 'client-joined', handler: (data: { session, client }) => void): this
  on(event: 'client-left', handler: (data: { session, client }) => void): this
  on(event: 'operation', handler: (data: { session, clientId, operation }) => void): this

  // Methods
  getSession(sessionId: string): CollabSession | undefined
  getAllSessions(): CollabSession[]
  close(): void
}
```

#### `createSession`

```typescript
function createSession(documentId: string): CollabSession
```

#### `getDocumentState`

```typescript
function getDocumentState(sessionId: string, sessions: Map<string, CollabSession>): DocumentState
```

### Client API

#### `joinSession`

```typescript
async function joinSession(
  sessionId: string,
  options: ConnectionOptions
): Promise<CollabConnection>
```

#### `CollabConnection`

```typescript
class CollabConnection {
  // Content operations
  getContent(): string
  insert(position: number, text: string): void
  delete(position: number, length: number): void

  // Cursor operations
  setCursor(cursor: CursorPosition): void

  // User operations
  getUsers(): User[]

  // Subscriptions
  onContentChange(callback: (content: string) => void): () => void
  onCursorChange(callback: (userId: string, cursor: CursorPosition) => void): () => void
  onPresenceChange(callback: (users: User[]) => void): () => void

  // Disconnect
  leave(): void
}
```

## CRDT Implementation

The system uses a Yjs-style RGA (Replicated Growable Array) for text synchronization:

- **Insert Operations**: Each character gets a unique ID with origin/right pointers
- **Delete Operations**: Mark nodes as deleted without removing them
- **Vector Clocks**: Track causality and detect conflicts
- **Idempotent Operations**: Safe to apply multiple times

### Operation Types

```typescript
enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain',
}

interface InsertOperation {
  type: OperationType.INSERT;
  id: string;
  origin: string | null;
  right: string | null;
  value: string;
  position: number;
}

interface DeleteOperation {
  type: OperationType.DELETE;
  id: string;
  position: number;
  length: number;
}
```

## WebSocket Protocol

### Client → Server Messages

```typescript
// Join session
{
  type: 'join',
  sessionId: string,
  data: { userId: string, name?: string }
}

// Submit operation
{
  type: 'operation',
  sessionId: string,
  data: Operation
}

// Update cursor
{
  type: 'cursor',
  sessionId: string,
  data: CursorPosition
}

// Request sync
{
  type: 'sync',
  sessionId: string,
  data: {}
}

// Leave session
{
  type: 'leave',
  sessionId: string,
  data: {}
}
```

### Server → Client Messages

```typescript
// Document sync
{
  type: 'sync',
  sessionId: string,
  data: {
    documentId: string,
    content: string,
    crdtState: any,
    clients: ClientInfo[],
    vectorClock: Map<string, number>
  }
}

// Remote operation
{
  type: 'operation',
  sessionId: string,
  data: CRDTUpdate
}

// Cursor update
{
  type: 'cursor',
  sessionId: string,
  data: { clientId: string, cursor: CursorPosition }
}

// Presence update
{
  type: 'presence',
  sessionId: string,
  data: { clients: ClientInfo[] }
}

// Error
{
  type: 'error',
  sessionId: string,
  data: { error: string }
}
```

## Usage Examples

### Basic Text Editor

```typescript
import { joinSession } from '@/lib/collab';

const connection = await joinSession('doc-123', {
  url: 'ws://localhost:8080',
  userId: 'user-123',
  userName: 'Alice',
});

// Update editor on remote changes
connection.onContentChange((content) => {
  editor.setValue(content);
});

// Send local edits
editor.on('change', (delta) => {
  if (delta.insert) {
    connection.insert(delta.position, delta.insert);
  } else if (delta.delete) {
    connection.delete(delta.position, delta.delete);
  }
});
```

### Multi-user Cursor Tracking

```typescript
// Subscribe to cursor updates
connection.onCursorChange((userId, cursor) => {
  const user = connection.getUsers().find(u => u.userId === userId);
  if (user) {
    renderRemoteCursor(user.color, cursor);
  }
});

// Send local cursor position
editor.on('cursor', (position) => {
  connection.setCursor(position);
});
```

### Presence Indicators

```typescript
// Subscribe to presence changes
connection.onPresenceChange((users) => {
  updatePresenceList(users);
});

// Get current users
const users = connection.getUsers();
users.forEach(user => {
  console.log(`${user.name} is online (${user.color})`);
});
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Performance Considerations

- **Batch Operations**: Group multiple edits before sending
- **Debounce Cursor Updates**: Throttle cursor position updates
- **Compression**: Enable WebSocket compression for large documents
- **Persistence**: Save CRDT state periodically to storage

## Security

- **Authentication**: Add JWT verification to join requests
- **Authorization**: Check document access permissions
- **Rate Limiting**: Limit operation frequency per client
- **Validation**: Sanitize all incoming operations

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.