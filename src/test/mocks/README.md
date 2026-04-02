# Test Mocks

Shared mock objects for testing in the `/root/.openclaw/workspace` project.

## Overview

This directory contains reusable, type-safe mock implementations for common testing scenarios:

- **Socket Mock** - Mock Socket.io for WebRTC testing
- **Auth Mock** - Mock authentication contexts and services
- **Fetch Mock** - Mock fetch API for HTTP testing

## Usage

### Import from Central Index

```typescript
import {
  // Socket mocks
  createMockSocket,
  triggerSocketEvent,
  createWebRTCTestSocket,

  // Auth mocks
  createMockUser,
  createMockAuthContextValue,
  createMockAuthService,

  // Fetch mocks
  createMockFetch,
  createMockResponse,
  setupGlobalFetch,
} from '@/test/mocks'
```

### Socket Mock

```typescript
import { createMockSocket, triggerSocketEvent } from '@/test/mocks'

// Create a mock socket
const socket = createMockSocket({ connected: false })

// Listen to events
socket.on('test-event', data => {
  console.log('Received:', data)
})

// Trigger events
triggerSocketEvent(socket, 'test-event', { message: 'Hello' })

// Verify emitted events
const emitted = getEmittedEvents(socket)
console.log(emitted) // [{ event: "test-event", args: [...] }]
```

#### WebRTC Meeting Testing

```typescript
import { createWebRTCTestSocket, triggerWebRTCEvent } from '@/test/mocks'

const socket = createWebRTCTestSocket()

// Trigger WebRTC-specific events
triggerWebRTCEvent(socket, 'join-room', {
  roomId: 'test-room',
  participants: [
    { id: 'user-1', name: 'User 1', audioEnabled: true, isSpeaking: false, joinedAt: new Date() },
  ],
})

triggerWebRTCEvent(socket, 'user-joined', {
  userId: 'user-2',
  userName: 'User 2',
})
```

### Auth Mock

```typescript
import { createMockUser, createMockAuthContextValue } from '@/test/mocks'

// Create a mock user
const user = createMockUser({
  id: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  roles: ['admin', 'manager'],
  permissions: ['read:all', 'write:all'],
})

// Create mock auth context
const authContext = createMockAuthContextValue({
  user,
  isAuthenticated: true,
  isLoading: false,
})

// Check permissions
expect(authContext.hasPermission('read:all')).toBe(true)
expect(authContext.hasRole(['admin', 'manager'])).toBe(true)
```

#### Predefined Users

```typescript
import { DEFAULT_MOCK_USER, MOCK_ADMIN_USER, MOCK_GUEST_USER } from '@/test/mocks'

// Default member user
const user = DEFAULT_MOCK_USER // role: "member"

// Admin user with all permissions
const admin = MOCK_ADMIN_USER // role: "admin"

// Guest with no permissions
const guest = MOCK_GUEST_USER // role: "guest"
```

### Fetch Mock

```typescript
import { createMockFetch, createMockResponse } from '@/test/mocks'

// Create a mock fetch function
const mockFetch = createMockFetch()

// Mock specific endpoints
mockFetch.__mockResponse('/api/user', {
  id: 'user-123',
  name: 'Test User',
})

mockFetch.__mockResponse('/api/data', {
  success: true,
  data: [1, 2, 3],
})

// Use mock fetch
const response = await mockFetch('http://localhost:3000/api/user')
const data = await response.json()

// Verify calls
const calls = mockFetch.__getMockedCalls()
expect(calls).toHaveLength(1)
expect(calls[0].url).toBe('http://localhost:3000/api/user')
```

#### Dynamic Responses

```typescript
mockFetch.__mockResponseCallback('/api/dynamic', req => {
  return {
    method: req.method,
    url: req.url,
    body: req.body ? JSON.parse(req.body) : null,
  }
})

const response = await mockFetch('/api/dynamic', {
  method: 'POST',
  body: JSON.stringify({ test: 'data' }),
})

const data = await response.json()
expect(data.method).toBe('POST')
```

#### Global Setup

```typescript
import { setupGlobalFetch, mockFetch } from '@/test/mocks'

// Setup in test setup file
beforeAll(() => {
  setupGlobalFetch()
})

// Mock common responses
mockFetch.__mockResponse('/api/health', { status: 'healthy' })

// Tests can use regular fetch
const response = await fetch('/api/health')
const data = await response.json()
```

## API Reference

### Socket Mock

| Function                                     | Description                            |
| -------------------------------------------- | -------------------------------------- |
| `createMockSocket(options)`                  | Create a mock Socket.io socket         |
| `triggerSocketEvent(socket, event, ...args)` | Simulate receiving an event            |
| `getEmittedEvents(socket)`                   | Get all emitted events                 |
| `clearEmittedEvents(socket)`                 | Clear emitted event log                |
| `createWebRTCTestSocket()`                   | Create socket preconfigured for WebRTC |
| `triggerWebRTCEvent(socket, event, data)`    | Trigger WebRTC-specific event          |
| `createMockParticipants(count)`              | Create mock participant data           |
| `verifyEventEmitted(socket, event, args?)`   | Check if event was emitted             |
| `countEventEmitted(socket, event)`           | Count event emissions                  |

### Auth Mock

| Function                                 | Description                      |
| ---------------------------------------- | -------------------------------- |
| `createMockUser(overrides?)`             | Create a mock user object        |
| `createMockToken(userId?, overrides?)`   | Create a mock user token         |
| `createMockAuthContextValue(overrides?)` | Create mock auth context         |
| `createMockAuthService(overrides?)`      | Create mock auth service         |
| `createMockSession(overrides?)`          | Create a mock session            |
| `createMockUsers(count)`                 | Create multiple mock users       |
| `createMockAuthState(user?)`             | Create mock auth state for hooks |
| `checkMockPermission(user, permission)`  | Check if user has permission     |
| `checkMockRole(user, role)`              | Check if user has role           |

### Fetch Mock

| Function                                          | Description                        |
| ------------------------------------------------- | ---------------------------------- |
| `createMockResponse(data, options?)`              | Create a mock Response object      |
| `createMockFetch()`                               | Create a mock fetch function       |
| `setupGlobalFetch(mockFn?)`                       | Setup fetch as global mock         |
| `restoreGlobalFetch()`                            | Restore original fetch             |
| `setupCommonApiMocks(mockFn?)`                    | Setup common API endpoints         |
| `verifyFetchRequest(mockFn, url, method?, body?)` | Verify fetch call                  |
| `getLastFetchRequest(mockFn)`                     | Get the last fetch request         |
| `createMockErrorResponse(error, message?)`        | Create error response              |
| `createJsonApiResponse(options)`                  | Create Next.js style JSON response |
| `setupDelayedFetch(delayMs)`                      | Create fetch with simulated delay  |
| `delay(ms)`                                       | Helper to delay execution          |

## Testing

Run mock verification tests:

```bash
npm test -- src/test/mocks/__tests__/index.test.ts
```

## Examples

See `src/test/mocks/__tests__/index.test.ts` for comprehensive examples.

## Type Safety

All mocks are fully typed with TypeScript:

```typescript
import type { MockSocket, MockUser, MockFetchImplementation } from '@/test/mocks'

const socket: MockSocket = createMockSocket()
const user: MockUser = createMockUser()
const fetch: MockFetchImplementation = createMockFetch()
```

## Best Practices

1. **Use predefined users** when possible (`DEFAULT_MOCK_USER`, `MOCK_ADMIN_USER`)
2. **Clear mocks between tests** to avoid state leakage
3. **Use dynamic responses** for request-dependent behavior
4. **Verify all emitted events** in socket tests
5. **Check fetch calls** to ensure correct API usage
6. **Group related mocks** in `beforeEach` hooks

## Integration with Existing Tests

The mocks are designed to work with existing test patterns in the project. They can be used alongside or replace inline mocks in test files.

For WebRTC testing, see `src/hooks/useWebRTCMeeting.test.ts` for examples of how socket mocks can be integrated.
