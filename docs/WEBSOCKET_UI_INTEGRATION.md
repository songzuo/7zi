# WebSocket Collaboration - UI Integration Guide

## Overview

This guide explains how to integrate the WebSocket real-time collaboration features into the 7zi-project task management interface.

---

## Components Available

### 1. Core Collaboration Components

Located in `src/components/collaboration/`:

- **ConnectionStatus** - Displays WebSocket connection state with visual indicators
- **UserList** - Shows avatars/circles for online users in the room
- **RemoteCursor** - Renders remote user cursors with name labels
- **TaskEditorCollaboration** - Full-featured task editor with collaboration support

### 2. Remote Selection Components

Located in `src/components/collaboration/RemoteSelection.tsx`:

- **RemoteSelectionHighlight** - Highlights text selected by remote users
- **SelectionHighlighter** - Renders multiple remote selections
- **CursorWithSelection** - Combines cursor and selection display
- **SelectionManager** - Manages all remote cursors/selections
- **TypingIndicator** - Shows typing status for remote users

### 3. React Hooks

Located in `src/lib/websocket/useCollaboration.ts`:

```typescript
const {
  connectionState,
  isConnected,
  isInRoom,
  users,
  cursors,
  document,
  typingUsers,
  connect,
  disconnect,
  joinRoom,
  leaveRoom,
  sendOperation,
  moveCursor,
  setTyping,
} = useCollaboration({
  url: process.env.NEXT_PUBLIC_WS_URL,
  token: userToken,
  userId: currentUserId,
  userName: currentUserName,
  roomType: 'task',
  documentId: taskId,
  autoConnect: true,
});
```

---

## Integration Options

### Option 1: Quick Integration (Demo Page)

Use the existing demo page to test collaboration features immediately.

**URL**: `/collaboration-demo`

**Features**:
- Full collaboration UI
- Connection controls
- Room management
- Document editor with real-time sync
- Activity logs
- User presence indicators

**Usage**:
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/collaboration-demo`
3. Open in multiple browser tabs
4. Use different user IDs/names per tab
5. Join the same room to collaborate

---

### Option 2: Task Editor Integration

Add collaboration to task editing interface using `TaskEditorCollaboration` component.

**Example**:

```typescript
import { TaskEditorCollaboration } from '@/components/collaboration/TaskEditorCollaboration';

function TaskEditPage({ task, user }) {
  return (
    <div className="task-editor-container">
      <TaskEditorCollaboration
        task={task}
        token={user.token}
        userId={user.id}
        userName={user.name}
        userAvatar={user.avatar}
        onTaskUpdate={(taskId, updates) => {
          // Handle task updates
          console.log('Task updated:', taskId, updates);
        }}
        showCollaboration={true}
      />
    </div>
  );
}
```

**Props**:
- `task: Task` - Task object with id, number, title, body
- `token?: string` - JWT token for WebSocket authentication
- `userId?: string` - Current user's ID
- `userName?: string` - Current user's display name
- `userAvatar?: string` - URL to user's avatar
- `onTaskUpdate?: (taskId, updates) => void` - Callback for task updates
- `showCollaboration?: boolean` - Enable/disable collaboration features

---

### Option 3: Custom Integration

Build a custom collaboration UI using the individual components.

**Example**:

```typescript
import { useCollaboration } from '@/lib/websocket';
import { ConnectionStatus, UserList } from '@/components/collaboration/ConnectionStatus';
import { SelectionManager, TypingIndicator } from '@/components/collaboration/RemoteSelection';

function CustomTaskEditor({ taskId, user }) {
  const collaboration = useCollaboration({
    url: process.env.NEXT_PUBLIC_WS_URL,
    token: user.token,
    userId: user.id,
    userName: user.name,
    roomType: 'task',
    documentId: taskId,
  });

  return (
    <div className="editor-wrapper">
      {/* Header with collaboration status */}
      <div className="editor-header">
        <h2>Task Editor</h2>

        <div className="collaboration-controls">
          <UserList users={collaboration.users} currentUserId={user.id} />
          <ConnectionStatus
            connectionState={collaboration.connectionState}
            isInRoom={collaboration.isInRoom}
            users={collaboration.users}
            typingUsers={collaboration.typingUsers}
            onReconnect={collaboration.reconnect}
          />
        </div>
      </div>

      {/* Editor area */}
      <div className="editor-area">
        <textarea
          value={content}
          onChange={handleChange}
          onSelect={handleSelectionChange}
        />

        {/* Remote cursors overlay */}
        <div className="cursors-overlay">
          <SelectionManager
            cursors={collaboration.cursors}
            currentUserId={user.id}
          />
        </div>
      </div>

      {/* Footer with typing indicator */}
      <div className="editor-footer">
        <TypingIndicator
          typingUsers={collaboration.users.filter(u =>
            collaboration.typingUsers.includes(u.id)
          )}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
```

---

## Adding Collaboration to Existing Task Pages

### Step 1: Create a Task Detail Route

Add a dynamic route for task editing:

```bash
src/app/[locale]/tasks/[number]/page.tsx
```

```typescript
'use client';

import { TaskEditorCollaboration } from '@/components/collaboration/TaskEditorCollaboration';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';

export default function TaskDetailPage({ params }: { params: { number: string } }) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [showCollaboration, setShowCollaboration] = useState(false);

  useEffect(() => {
    // Fetch task data
    fetch(`/api/issues/${params.number}`)
      .then(res => res.json())
      .then(setTask);
  }, [params.number]);

  if (!task) return <LoadingSpinner />;

  return (
    <div className="task-detail-page">
      <div className="task-header">
        <h1>#{task.number} {task.title}</h1>

        {/* Collaboration toggle */}
        <CollaborationToggle
          isCollaborating={showCollaboration}
          onToggle={() => setShowCollaboration(!showCollaboration)}
          userCount={collaborationUserCount}
        />
      </div>

      {/* Task editor with collaboration */}
      <TaskEditorCollaboration
        task={task}
        token={user?.token}
        userId={user?.id}
        userName={user?.name}
        userAvatar={user?.avatar}
        onTaskUpdate={handleTaskUpdate}
        showCollaboration={showCollaboration}
      />
    </div>
  );
}
```

### Step 2: Update Task List Page

Add collaboration indicators to task cards:

```typescript
import { CollaborationStatus } from '@/components/collaboration/TaskEditorCollaboration';

function TaskCard({ task }) {
  return (
    <div className="task-card">
      <div className="task-title">{task.title}</div>

      {/* Show collaboration status if users are editing */}
      {task.activeEditors > 0 && (
        <CollaborationStatus
          isConnected={true}
          isInRoom={true}
          userCount={task.activeEditors}
        />
      )}
    </div>
  );
}
```

---

## Environment Configuration

### Required Environment Variables

Add to `.env.local` or `.env.production`:

```bash
# WebSocket Server URL (client-side)
NEXT_PUBLIC_WS_URL=http://localhost:3000

# For production:
NEXT_PUBLIC_WS_URL=https://your-domain.com

# Authentication token (from your auth system)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### WebSocket Server Setup

The WebSocket server is implemented in:
- `src/lib/websocket/server.ts`
- `src/app/api/ws/route.ts`

The server automatically starts when the Next.js app runs.

---

## Testing Collaboration Features

### 1. Single User Testing

```bash
# Start dev server
npm run dev

# Navigate to demo page
open http://localhost:3000/collaboration-demo

# Test:
- Connection/disconnection
- Room join/leave
- Document editing
- Cursor movement
```

### 2. Multi-User Testing

```bash
# Step 1: Open demo page in multiple tabs/windows

# Step 2: Configure different user for each tab
Tab 1: user-id: user-1, user-name: Alice
Tab 2: user-id: user-2, user-name: Bob
Tab 3: user-id: user-3, user-name: Charlie

# Step 3: Connect and join the same room
Room ID: demo-task-1

# Step 4: Test collaboration features
- Type in document editor
- See real-time updates across tabs
- Observe remote cursors
- Check typing indicators
- Verify user list updates
```

### 3. Integration Testing

```bash
# Test with actual task data
1. Navigate to a task detail page
2. Enable collaboration
3. Open same task in different browsers
4. Verify real-time sync
5. Test conflict resolution
```

---

## UI/UX Considerations

### 1. Connection State

Always show connection status to users:

```typescript
<ConnectionStatus
  connectionState={connectionState}
  isInRoom={isInRoom}
  users={users}
  typingUsers={typingUsers}
  onReconnect={reconnect}
/>
```

**States**:
- ✅ **Connected** - Green indicator
- 🔄 **Connecting/Reconnecting** - Yellow indicator
- ❌ **Disconnected/Error** - Red indicator with reconnect button

### 2. User Presence

Show who's currently editing:

```typescript
<UserList users={users} currentUserId={userId} />
```

- Displays avatars or colored circles
- Shows tooltips with user names
- Indicates "you" for current user

### 3. Remote Cursors

Render cursors from other users:

```typescript
<RemoteCursor
  cursor={cursor}
  currentUserId={userId}
/>
```

- Shows colored cursor with user name label
- Follows remote user's actual cursor position
- Updates in real-time

### 4. Typing Indicators

Show when users are typing:

```typescript
<TypingIndicator
  typingUsers={typingUsers}
  currentUserId={userId}
/>
```

- Animated dots
- Shows "X users are typing..."
- Auto-clears after 3 seconds of inactivity

### 5. Document Sync

Always display revision info:

```typescript
{document && (
  <div>
    <span>Revision: {document.revision}</span>
    <span>Characters: {content.length}</span>
  </div>
)}
```

---

## Performance Optimizations

### 1. Cursor Throttling

Cursor updates are automatically throttled to 100ms to reduce network traffic.

### 2. Selection Debouncing

Selection updates are debounced to 250ms.

### 3. Operation Batching

Document operations are sent individually but applied optimistically.

### 4. Room Cleanup

Empty rooms are automatically cleaned up after 30 minutes.

---

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to WebSocket server

**Solutions**:
1. Check WebSocket URL: `process.env.NEXT_PUBLIC_WS_URL`
2. Verify authentication token is valid
3. Check server logs for errors
4. Ensure firewall allows WebSocket connections

### Cursor Not Showing

**Problem**: Remote cursors don't appear

**Solutions**:
1. Verify users are in the same room
2. Check cursor position is being sent
3. Ensure overlay has correct z-index
4. Check console for JavaScript errors

### Document Not Syncing

**Problem**: Changes don't appear for other users

**Solutions**:
1. Verify room ID matches
2. Check document ID is consistent
3. Ensure operations are being sent
4. Check server logs for operation processing

### TypeScript Errors

**Problem**: Type errors in collaboration components

**Solutions**:
1. Ensure `src/lib/websocket/types.ts` is imported
2. Check type definitions in `useCollaboration.ts`
3. Verify prop types match interface
4. Run `npm run type-check`

---

## Next Steps

### 1. Production Deployment

- Configure production WebSocket URL
- Set up authentication properly
- Enable SSL/TLS for secure connections
- Configure CORS for your domain

### 2. Advanced Features

- Rich text support
- File attachments collaboration
- Voice/video integration
- Version history
- Offline support with CRDTs

### 3. Monitoring

- Track connection metrics
- Monitor room usage
- Log collaboration events
- Set up alerts for errors

---

## Component Reference

### ConnectionStatus

Displays WebSocket connection status.

```typescript
<ConnectionStatus
  connectionState={'connected' | 'connecting' | 'disconnected' | 'error'}
  isInRoom={boolean}
  users={RoomUser[]}
  typingUsers={string[]}
  onReconnect={() => void}
/>
```

### UserList

Shows online users in the room.

```typescript
<UserList
  users={RoomUser[]}
  currentUserId={string}
/>
```

### RemoteCursor

Renders a single remote user's cursor.

```typescript
<RemoteCursor
  cursor={{
    userId: string
    userName: string
    color: string
    position: number
    selection?: { start: number, end: number }
  }}
  currentUserId={string}
/>
```

### SelectionManager

Manages all remote cursors and selections.

```typescript
<SelectionManager
  cursors={Map<string, Cursor>}
  currentUserId={string}
/>
```

### TypingIndicator

Shows typing status for multiple users.

```typescript
<TypingIndicator
  typingUsers={Array<{ userId, userName, color }>}
  currentUserId={string}
/>
```

### TaskEditorCollaboration

Full-featured task editor with collaboration.

```typescript
<TaskEditorCollaboration
  task={Task}
  token?: string
  userId?: string
  userName?: string
  userAvatar?: string
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  showCollaboration?: boolean
/>
```

---

## API Reference

### useCollaboration Hook

Returns collaboration state and actions:

**State**:
- `connectionState: ConnectionState`
- `isConnected: boolean`
- `isInRoom: boolean`
- `users: RoomUser[]`
- `cursors: Map<string, Cursor>`
- `document: { content, revision } | null`
- `typingUsers: string[]`

**Actions**:
- `connect(): void`
- `disconnect(): void`
- `reconnect(): void`
- `joinRoom(roomId, type, documentId, name?): void`
- `leaveRoom(): void`
- `sendOperation(operation): void`
- `moveCursor(position, selection?): void`
- `setTyping(isTyping): void`

**Event Listeners**:
- `onDocumentUpdate(callback): () => void`
- `onUserJoined(callback): () => void`
- `onUserLeft(callback): () => void`
- `onCursorUpdate(callback): () => void`
- `onTypingUpdate(callback): () => void`
- `onError(callback): () => void`

---

**Last Updated**: 2026-03-21
**Version**: 1.0.0
