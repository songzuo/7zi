# WebSocket Connection Manager

A robust WebSocket connection manager for Node.js applications with automatic reconnection, heartbeat monitoring, message queuing, and comprehensive metrics tracking.

## Features

✅ **Heartbeat Detection** - Automatic ping/pong mechanism to detect connection health  
✅ **Exponential Backoff Reconnection** - Smart reconnection with jitter to avoid thundering herd  
✅ **Connection State Management** - Track and respond to connection state changes  
✅ **Message Queue** - Buffer messages during offline periods  
✅ **Connection Metrics** - Comprehensive monitoring of connection performance  
✅ **TypeScript Support** - Fully typed for better developer experience  
✅ **Event-Driven** - Rich event system for integration  
✅ **Production Ready** - Battle-tested configuration options

## Installation

```bash
npm install ws
```

Or copy the `WebSocketConnectionManager.ts` file to your project.

## Quick Start

```typescript
import { WebSocketConnectionManager } from './WebSocketConnectionManager'

const manager = new WebSocketConnectionManager({
  url: 'ws://localhost:8080',
  autoConnect: true,
  debug: true
})

// Listen for events
manager.on('connected', () => {
  console.log('Connected!')
  manager.send(JSON.stringify({ type: 'greeting', message: 'Hello!' }))
})

manager.on('message', (data) => {
  console.log('Received:', data.toString())
})

manager.on('disconnected', () => {
  console.log('Disconnected')
})

manager.on('error', (error) => {
  console.error('Error:', error.message)
})
```

## Configuration Options

```typescript
interface WebSocketManagerConfig {
  url: string                              // WebSocket server URL (required)
  autoConnect?: boolean                    // Auto-connect on instantiation (default: true)
  heartbeatInterval?: number               // Heartbeat interval in ms (default: 30000)
  heartbeatTimeout?: number                // Heartbeat timeout in ms (default: 10000)
  reconnectionDelay?: number               // Initial reconnection delay in ms (default: 1000)
  reconnectionDelayMax?: number            // Max reconnection delay in ms (default: 30000)
  maxReconnectionAttempts?: number         // Max reconnection attempts (default: Infinity)
  maxQueueSize?: number                    // Max messages in queue (default: 100)
  messageExpiry?: number                   // Message expiry time in ms (default: 300000)
  debug?: boolean                          // Enable debug logging (default: false)
  protocols?: string | string[]            // WebSocket protocols
  headers?: Record<string, string>         // Custom headers
  connectionTimeout?: number               // Connection timeout in ms (default: 10000)
}
```

## Connection States

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}
```

## Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `connected` | - | Connection established |
| `disconnected` | `code: number, reason: string` | Connection closed |
| `reconnecting` | `attempt: number, delay: number` | Reconnection scheduled |
| `reconnected` | - | Successfully reconnected |
| `message` | `data: WebSocket.Data` | Message received |
| `message-sent` | `data: string \| Buffer` | Message sent |
| `message-queued` | `message: QueuedMessage` | Message queued |
| `latency` | `latency: number` | Ping latency in ms |
| `heartbeat-missed` | `count: number` | Heartbeat missed |
| `state-change` | `newState: ConnectionState, previousState: ConnectionState` | State changed |
| `error` | `error: Error` | Error occurred |

## API Reference

### Constructor

```typescript
new WebSocketConnectionManager(config: WebSocketManagerConfig)
```

### Methods

#### `connect()`
Connect to WebSocket server.

```typescript
manager.connect()
```

#### `disconnect()`
Disconnect from WebSocket server.

```typescript
manager.disconnect()
```

#### `send(data, queueIfOffline?)`
Send message to server. If disconnected, queues the message.

```typescript
manager.send('Hello World!')
manager.send(JSON.stringify({ type: 'data', value: 123 }))
```

#### `getState()`
Get current connection state.

```typescript
const state = manager.getState()
console.log(state) // ConnectionState.CONNECTED
```

#### `isConnected()`
Check if connected.

```typescript
if (manager.isConnected()) {
  manager.send('message')
}
```

#### `getMetrics()`
Get connection metrics.

```typescript
const metrics = manager.getMetrics()
console.log(metrics)
// {
//   messagesSent: 10,
//   messagesReceived: 5,
//   totalReconnections: 2,
//   failedReconnections: 0,
//   currentLatency: 45,
//   averageLatency: 42.5,
//   lastConnectedTime: 1712123456789,
//   lastDisconnectedTime: null,
//   totalConnectionTime: 120000,
//   missedHeartbeats: 0,
//   queueSize: 0,
//   state: 'connected'
// }
```

#### `getQueueSize()`
Get message queue size.

```typescript
const size = manager.getQueueSize()
```

#### `clearQueue()`
Clear message queue.

```typescript
manager.clearQueue()
```

#### `reconnect()`
Force reconnection.

```typescript
manager.reconnect()
```

#### `updateConfig(config)`
Update configuration.

```typescript
manager.updateConfig({
  heartbeatInterval: 15000,
  maxQueueSize: 200
})
```

## Usage Examples

### Example 1: Basic Usage

```typescript
const manager = new WebSocketConnectionManager({
  url: 'ws://localhost:8080',
  autoConnect: true
})

manager.on('connected', () => {
  manager.send('Hello Server!')
})

manager.on('message', (data) => {
  console.log('Received:', data.toString())
})
```

### Example 2: Heartbeat Monitoring

```typescript
const manager = new WebSocketConnectionManager({
  url: 'ws://localhost:8080',
  heartbeatInterval: 15000,
  heartbeatTimeout: 5000
})

manager.on('latency', (latency) => {
  console.log(`Current latency: ${latency}ms`)
})

manager.on('heartbeat-missed', (count) => {
  console.warn(`Missed heartbeat ${count}/3`)
})
```

### Example 3: Exponential Backoff Reconnection

```typescript
const manager = new WebSocketConnectionManager({
  url: 'ws://localhost:8080',
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  maxReconnectionAttempts: 10
})

manager.on('reconnecting', (attempt, delay) => {
  console.log(`Reconnecting: attempt ${attempt}, delay ${Math.round(delay)}ms`)
})
```

### Example 4: Message Queue

```typescript
const manager = new WebSocketConnectionManager({
  url: 'ws://localhost:8080',
  autoConnect: false,
  maxQueueSize: 50,
  messageExpiry: 60000
})

// Send messages while disconnected
manager.send('message 1')
manager.send('message 2')

console.log(`Queue size: ${manager.getQueueSize()}`) // 2

// Connect later - queued messages will be sent
manager.connect()
```

### Example 5: Production Setup

```typescript
const manager = new WebSocketConnectionManager({
  url: process.env.WS_URL || 'wss://api.example.com/ws',
  autoConnect: true,
  
  // Conservative heartbeat
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  
  // Aggressive reconnection
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  maxReconnectionAttempts: Infinity,
  
  // Large queue
  maxQueueSize: 500,
  messageExpiry: 600000,
  
  // Authentication
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-Client-Version': '1.0.0'
  },
  
  debug: process.env.NODE_ENV === 'development'
})

// Production monitoring
manager.on('error', (error) => {
  // Send to error tracking service
  trackError(error)
})

setInterval(() => {
  const metrics = manager.getMetrics()
  // Send metrics to monitoring service
  reportMetrics(metrics)
}, 60000)
```

## Metrics

The manager tracks comprehensive connection metrics:

- **messagesSent**: Total messages sent
- **messagesReceived**: Total messages received
- **totalReconnections**: Total successful reconnections
- **failedReconnections**: Total failed reconnection attempts
- **currentLatency**: Current ping latency in ms
- **averageLatency**: Average ping latency in ms (last 100 pings)
- **lastConnectedTime**: Timestamp of last successful connection
- **lastDisconnectedTime**: Timestamp of last disconnection
- **totalConnectionTime**: Total time connected in ms
- **missedHeartbeats**: Number of missed heartbeats
- **queueSize**: Current message queue size
- **state**: Current connection state

## Reconnection Strategy

The manager uses exponential backoff with jitter for reconnection:

1. **Base Delay**: `reconnectionDelay * 2^attempt`
2. **Jitter**: Add 0-50% random jitter to avoid thundering herd
3. **Cap**: Maximum delay limited by `reconnectionDelayMax`
4. **Smart Disconnect**: Won't reconnect for normal closure (code 1000)

Example delays with default config:
- Attempt 1: ~1000ms (base: 1000ms, jitter: 0-500ms)
- Attempt 2: ~2000ms (base: 2000ms, jitter: 0-1000ms)
- Attempt 3: ~4000ms (base: 4000ms, jitter: 0-2000ms)
- Attempt 4: ~8000ms (base: 8000ms, jitter: 0-4000ms)
- Attempt 5: ~16000ms (base: 16000ms, jitter: 0-8000ms)
- Attempt 6+: ~30000ms (capped at max)

## Heartbeat Mechanism

The heartbeat mechanism works as follows:

1. Every `heartbeatInterval` ms, send a ping
2. Wait for pong response within `heartbeatTimeout` ms
3. If pong received, calculate latency
4. If pong not received, increment missed heartbeat counter
5. After 3 missed heartbeats, force reconnection

## Message Queue

Messages are queued when:

- Connection is not established
- Send operation fails

Queue behavior:

- Messages expire after `messageExpiry` ms
- Oldest messages removed when queue exceeds `maxQueueSize`
- Queued messages sent automatically on connection
- Failed messages retried up to 3 times

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

## Requirements

- Node.js >= 16.0.0
- TypeScript >= 5.0.0 (for development)
- ws >= 8.18.0

## License

MIT

## Author

Executor Subagent

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.