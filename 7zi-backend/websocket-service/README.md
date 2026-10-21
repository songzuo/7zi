# WebSocket Service

Standalone WebSocket service for 7zi real-time collaboration features.

## Features

- Room management (create, join, leave rooms)
- Document collaboration with OT (Operational Transformation)
- Cursor tracking
- Typing indicators
- User presence
- Heartbeat-based connection monitoring

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3002 | Server port |
| ALLOWED_ORIGIN | http://localhost:3000 | CORS origin |
| LOG_LEVEL | info | Logging level (info, debug) |
| JWT_SECRET | demo-secret-key | JWT authentication secret |

## API Endpoints

### HTTP

- `GET /health` - Health check
- `GET /stats` - Connection statistics
- `GET /api/v1/ws/rooms/:id` - Room information

### WebSocket Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `room:join` | `{roomId, type, documentId, name}` | Join a room |
| `room:leave` | `{roomId}` | Leave a room |
| `doc:open` | `{roomId, documentId}` | Open document |
| `doc:operation` | `{roomId, operation}` | Apply OT operation |
| `cursor:move` | `{roomId, position, selection}` | Update cursor |
| `presence:typing` | `{roomId, isTyping}` | Typing indicator |
| `heartbeat` | - | Keep connection alive |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `auth:authenticated` | `{userId, name, avatar}` | Auth success |
| `room:joined` | `{roomId, users, document}` | Room joined |
| `room:user_joined` | `{user, userCount}` | User joined room |
| `room:user_left` | `{userId, userCount}` | User left room |
| `doc:operation_applied` | `{id, timestamp, userId, operation, revision}` | OT applied |
| `cursor:update` | `{userId, userName, color, position, selection}` | Cursor moved |
| `presence:typing` | `{userId, userName, isTyping}` | Typing status |

## Docker

```bash
# Build image
docker build -t 7zi/websocket-service .

# Run container
docker run -d -p 3002:3002 \
  --name websocket-service \
  -e JWT_SECRET=your-secret \
  -e ALLOWED_ORIGIN=https://your-frontend.com \
  7zi/websocket-service
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WebSocket Service                     │
├─────────────────────────────────────────────────────────┤
│  Socket.IO Server (port 3002)                           │
│  ├── Authentication Middleware                          │
│  ├── Room Manager                                       │
│  └── Event Handlers                                     │
├─────────────────────────────────────────────────────────┤
│  HTTP Server (same port)                                │
│  ├── /health - Health check                             │
│  ├── /stats - Statistics                                │
│  └── /api/v1/ws/* - REST endpoints                     │
└─────────────────────────────────────────────────────────┘
```

## Compatibility Notes

- Maintains backward compatibility with existing frontend Socket.IO client
- JWT authentication supports both token-based and demo (token-less) modes
- All event names and data structures unchanged from original implementation
