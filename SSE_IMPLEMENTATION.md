# SSE Implementation Guide

## Overview

This implementation provides Server-Sent Events (SSE) for real-time data updates in the 7zi-project, replacing the previous polling mechanism.

## Architecture

### Components

1. **SSE Utilities** (`src/lib/sse/utils.ts`)
   - `getSSEHeaders()` - Standard SSE response headers
   - `formatSSEEvent()` - Format SSE event messages
   - `parseSSEMessage()` - Parse incoming SSE messages
   - `isValidSSEConnection()` - Validate SSE requests
   - `getClientIP()` - Extract client IP from request

2. **SSE Stream Manager** (`src/lib/sse/stream.ts`)
   - `SSEStreamManager` - Manages active SSE connections
   - Client registration and cleanup
   - Event broadcasting to all clients
   - Event history tracking
   - Automatic keep-alive messages
   - Connection timeout cleanup

3. **SSE React Hook** (`src/lib/sse/useSSE.ts`)
   - `useSSE()` - Generic SSE hook for consuming events
   - `useHealthSSE()` - Specialized hook for health metrics
   - Automatic reconnection with configurable delay
   - Connection state tracking
   - Event ID tracking for resumption

4. **API Endpoints**
   - `/api/stream/health` - Real-time health metrics
   - `/api/stream/analytics` - Real-time analytics data

5. **Updated Components**
   - `HealthDashboard` - Now uses SSE for health metrics
   - `RealtimeDashboard` - Supports both SSE and polling modes

## Usage

### Server-Side: Creating SSE Endpoints

```typescript
import { NextRequest } from 'next/server';
import { getGlobalStreamManager } from '@/lib/sse/stream';
import { getSSEHeaders } from '@/lib/sse/utils';

export async function GET(request: NextRequest) {
  const streamManager = getGlobalStreamManager();
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const client = streamManager.addClient(clientId, controller);

      // Send periodic updates
      const intervalId = setInterval(() => {
        const data = { /* your data */ };
        streamManager.sendToClient(clientId, data);
      }, 5000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        streamManager.removeClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: getSSEHeaders(),
  });
}
```

### Client-Side: Consuming SSE Events

```typescript
import { useSSE } from '@/lib/sse';

function MyComponent() {
  const { data, state, error, reconnect, disconnect } = useSSE<DataType>(
    '/api/stream/endpoint',
    {
      enabled: true,
      reconnect: true,
      reconnectInterval: 3000,
      onMessage: (data) => console.log('Received:', data),
    }
  );

  return (
    <div>
      <p>State: {state}</p>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  );
}
```

### Specialized Hook for Health Metrics

```typescript
import { useHealthSSE } from '@/lib/sse';

function HealthDashboard() {
  const { data, state } = useHealthSSE(true);

  const apiLatency = data?.data?.apiLatency || 0;
  const memoryUsage = data?.data?.memoryUsage || 0;

  return (
    <div>
      <p>API Latency: {apiLatency}ms</p>
      <p>Memory: {memoryUsage}MB</p>
      <p>Connection: {state}</p>
    </div>
  );
}
```

## Features

### Automatic Reconnection

- Configurable reconnection interval (default: 3 seconds)
- Exponential backoff support (can be added)
- Connection state tracking: `connecting`, `connected`, `disconnected`, `error`

### Event History

- Tracks last 100 events per client
- Supports resuming from last event ID
- Clients can specify `lastEventId` query parameter to resume

### Keep-Alive Messages

- Automatic keep-alive comments every 15 seconds
- Prevents connection timeouts
- Can be configured per stream

### Connection Management

- Automatic cleanup of stale connections (5-minute timeout)
- Graceful connection close on client disconnect
- Client count tracking for monitoring

## Configuration

### Environment Variables

No additional environment variables required. SSE works out of the box with Next.js 13+ App Router.

### Reconnection Options

```typescript
useSSE(url, {
  reconnect: true,           // Enable auto-reconnect
  reconnectInterval: 3000,  // Reconnect delay in ms
});
```

### Keep-Alive Interval

Configure in the stream endpoint:

```typescript
const keepAliveId = setInterval(() => {
  controller.enqueue(encoder.encode(': keep-alive\n\n'));
}, 15000); // Every 15 seconds
```

## Performance Benefits

### Before (Polling)

- **Requests per client**: 12 requests/minute (5-second interval)
- **Bandwidth**: Each request includes full HTTP headers
- **Latency**: Up to 5 seconds between updates
- **Server load**: High due to frequent request/response cycles

### After (SSE)

- **Connections per client**: 1 persistent connection
- **Bandwidth**: Minimal overhead (only data + SSE framing)
- **Latency**: Near-instant (push-based)
- **Server load**: Significantly reduced (no request/response overhead)

### Estimated Improvements

- **Bandwidth reduction**: ~70-80% (no HTTP headers on each update)
- **Server load reduction**: ~60-70% (fewer TCP handshakes, less parsing)
- **Update latency**: Reduced from 0-5s to <100ms (push-based)
- **Battery/Mobile**: Better performance on mobile devices

## Migration Guide

### Step 1: Create SSE Endpoint

Create a new SSE endpoint in `src/app/api/stream/[your-endpoint]/route.ts`

### Step 2: Update Component

Replace `useEffect` with `setInterval` to `useSSE` hook:

**Before:**
```typescript
useEffect(() => {
  const fetchData = () => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => setData(data));
  };

  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
```

**After:**
```typescript
const { data } = useSSE<DataType>('/api/stream/data');
```

### Step 3: Test and Verify

- Test connection establishment
- Verify real-time updates
- Test reconnection on network failure
- Monitor server resources

## Troubleshooting

### SSE Not Working

1. **Check browser support**: SSE is supported in all modern browsers
2. **Verify headers**: Ensure `Content-Type: text/event-stream`
3. **Check proxy config**: Some proxies may buffer SSE responses (use `X-Accel-Buffering: no` for Nginx)

### Connection Drops Frequently

1. **Increase keep-alive interval**: Send keep-alive messages more frequently
2. **Check server timeout**: Ensure server doesn't close idle connections
3. **Verify reconnection logic**: Ensure `reconnect: true` is set

### High Memory Usage

1. **Reduce event history**: Lower `maxQueueSize` in `SSEStreamManager`
2. **Increase cleanup frequency**: Reduce cleanup interval
3. **Limit client connections**: Add connection limits

## Testing

### Manual Testing

1. Open browser DevTools Network tab
2. Navigate to a page with SSE
3. Look for `text/event-stream` connection
4. Monitor messages in EventStream tab

### Automated Testing

```typescript
// Test SSE endpoint
import { GET } from '@/app/api/stream/health/route';

describe('SSE Health Stream', () => {
  it('should establish SSE connection', async () => {
    const request = new Request('http://localhost:3000/api/stream/health', {
      headers: { 'Accept': 'text/event-stream' },
    });

    const response = await GET(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.body).toBeInstanceOf(ReadableStream);
  });
});
```

## Future Enhancements

1. **Authentication**: Add JWT or session-based auth
2. **Room/Channel support**: Broadcast to specific groups
3. **Compression**: Enable gzip compression for large payloads
4. **Metrics**: Add connection count and bandwidth monitoring
5. **Rate limiting**: Prevent connection abuse
6. **Backpressure**: Handle slow clients gracefully

## References

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js: Streaming](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)
- [WHATWG SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
