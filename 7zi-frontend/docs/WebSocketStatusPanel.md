# WebSocket Status Panel Component

Real-time WebSocket connection monitoring component for React 18 applications.

## Features

- ✅ **Real-time connection status** - Connected, connecting, reconnecting, disconnected, error
- ✅ **Heartbeat latency monitoring** - Current and average ping-pong latency
- ✅ **Message statistics** - Sent/received message counts
- ✅ **Reconnection tracking** - Total reconnection attempts
- ✅ **Queue monitoring** - Pending message queue size
- ✅ **Responsive design** - Mobile-friendly with Tailwind CSS
- ✅ **Performance optimized** - Memoization and efficient state management
- ✅ **Multiple display modes** - Full panel, compact view, badge-only

## Components

### 1. `WebSocketStatusPanel`

Full-featured status panel with detailed information.

```tsx
import { WebSocketStatusPanel } from '@/components/websocket'
import { WebSocketManager } from '@/lib/websocket-manager'

const wsManager = new WebSocketManager({ url: 'ws://...' })

;<WebSocketStatusPanel wsManager={wsManager} showDetails={true} />
```

**Props:**

- `wsManager: WebSocketManager` - WebSocket manager instance
- `showDetails?: boolean` - Show/hide detailed stats (default: true)
- `className?: string` - Additional CSS classes

### 2. `WebSocketStatusBadge`

Minimal status indicator for header/toolbar.

```tsx
import { WebSocketStatusBadge } from '@/components/websocket'
;<WebSocketStatusBadge wsManager={wsManager} />
```

**Props:**

- `wsManager: WebSocketManager` - WebSocket manager instance
- `className?: string` - Additional CSS classes

### 3. `useWebSocketStatus` Hook

React hook for programmatic access to WebSocket status.

```tsx
import { useWebSocketStatus } from '@/hooks'

function MyComponent() {
  const { state, isConnected, isReconnecting, stats, queueSize, connect, disconnect, resetStats } =
    useWebSocketStatus(wsManager)

  return (
    <div>
      <p>Status: {state}</p>
      <p>Connected: {isConnected}</p>
      <p>Messages Sent: {stats.messagesSent}</p>
      <p>Latency: {stats.currentPingLatency}ms</p>
    </div>
  )
}
```

**Return Values:**

- `state: ConnectionState` - Current connection state
- `isConnected: boolean` - Whether connected
- `isConnecting: boolean` - Whether connecting
- `isReconnecting: boolean` - Whether reconnecting
- `isError: boolean` - Whether in error state
- `stats: ConnectionStats` - Connection statistics
- `queueSize: number` - Message queue size
- `getManager: () => WebSocketManager` - Get manager instance
- `connect: () => void` - Connect to server
- `disconnect: () => void` - Disconnect from server
- `resetStats: () => void` - Reset statistics

### 4. `useWebSocketStatusAuto` Hook

Automatically creates and manages WebSocketManager.

```tsx
import { useWebSocketStatusAuto } from '@/hooks'

function MyComponent() {
  const { isConnected, stats } = useWebSocketStatusAuto('ws://...', {
    updateInterval: 1000,
    enabled: true,
    managerOptions: {
      autoConnect: true,
      heartbeatInterval: 25000,
    },
  })

  // Component automatically connects on mount
  // and disconnects on unmount
}
```

**Parameters:**

- `socketUrl: string` - WebSocket server URL
- `options: UseWebSocketStatusOptions & { managerOptions?: any }` - Configuration

## Connection States

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected', // Not connected
  CONNECTING = 'connecting', // Attempting to connect
  CONNECTED = 'connected', // Successfully connected
  RECONNECTING = 'reconnecting', // Attempting to reconnect
  ERROR = 'error', // Connection error
}
```

## Connection Statistics

```typescript
interface ConnectionStats {
  messagesSent: number // Total messages sent
  messagesReceived: number // Total messages received
  totalReconnections: number // Total reconnection attempts
  lastActiveTime: number // Timestamp of last activity
  lastPingTime: number // Timestamp of last ping
  currentPingLatency: number // Current round-trip time (ms)
  averagePingLatency: number // Average round-trip time (ms)
}
```

## Usage Examples

### Dashboard Integration

```tsx
import { WebSocketStatusPanel } from '@/components/websocket'

function Dashboard() {
  return (
    <div className="p-4">
      <WebSocketStatusPanel wsManager={wsManager} />
      {/* Other dashboard content */}
    </div>
  )
}
```

### Header Integration (Badge)

```tsx
import { WebSocketStatusBadge } from '@/components/websocket'

function Header() {
  return (
    <header className="flex items-center gap-4 bg-white p-4 shadow">
      <h1>My App</h1>
      <div className="ml-auto">
        <WebSocketStatusBadge wsManager={wsManager} />
      </div>
    </header>
  )
}
```

### Custom Status Display

```tsx
import { useWebSocketStatus } from '@/hooks'

function CustomStatus() {
  const { state, isConnected, stats } = useWebSocketStatus(wsManager)

  return (
    <div className={`rounded p-4 ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-medium">{state}</span>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        <div>Sent: {stats.messagesSent}</div>
        <div>Received: {stats.messagesReceived}</div>
        <div>Latency: {stats.currentPingLatency}ms</div>
      </div>
    </div>
  )
}
```

### Multiple WebSocket Connections

```tsx
import { WebSocketStatusBadge } from '@/components/websocket'

function MultiConnectionMonitor() {
  const primaryWs = useMemo(() => new WebSocketManager({ url: 'ws://primary...' }), [])
  const secondaryWs = useMemo(() => new WebSocketManager({ url: 'ws://secondary...' }), [])

  return (
    <div className="flex gap-4">
      <div>
        <h3>Primary</h3>
        <WebSocketStatusBadge wsManager={primaryWs} />
      </div>
      <div>
        <h3>Secondary</h3>
        <WebSocketStatusBadge wsManager={secondaryWs} />
      </div>
    </div>
  )
}
```

## Performance Considerations

1. **Memoization**: Components use `useMemo` and `useCallback` to avoid unnecessary re-renders
2. **Efficient Updates**: Stats update every 1 second (configurable)
3. **Lazy Loading**: Optional stats display to reduce initial render time
4. **Cleanup**: Automatic cleanup of listeners and intervals on unmount

## Styling

The component uses Tailwind CSS classes. You can customize appearance by:

1. Extending the `className` prop
2. Modifying the component's internal Tailwind classes
3. Creating your own wrapper component

Example:

```tsx
<WebSocketStatusPanel wsManager={wsManager} className="w-full max-w-2xl shadow-lg" />
```

## Demo Page

A comprehensive demo page is available at `/websocket-status-demo` with:

- Interactive controls
- Multiple display modes
- Real-time statistics
- Usage examples
- Feature documentation

## Browser Support

- Modern browsers with WebSocket support
- React 18+
- Socket.io client 4.x

## License

Part of the 7zi-frontend project.
