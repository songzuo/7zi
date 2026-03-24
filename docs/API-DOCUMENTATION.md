# 7zi Project API Documentation

**Generated**: 2026-03-23
**Version**: 1.0.9
**Protocol**: Next.js 15 App Router API Routes

---

## Table of Contents

1. [Overview](#overview)
2. [Health & Status APIs](#health--status-apis)
3. [Security APIs](#security-apis)
4. [Database APIs](#database-apis)
5. [GitHub Integration APIs](#github-integration-apis)
6. [A2A Protocol APIs](#a2a-protocol-apis)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Overview

The 7zi Project exposes RESTful API endpoints through Next.js App Router. All endpoints return JSON responses and follow HTTP status codes.

**Base URL**: `http://localhost:3000/api` (development)
**Base URL**: `https://your-domain.com/api` (production)

---

## Health & Status APIs

### 1. Get Public Status

**Endpoint**: `GET /api/status`

**Description**: Returns public status information for the status page, including service health, uptime metrics, and incident history.

**Response**:
```json
{
  "status": "operational",
  "lastUpdated": "2026-03-18T20:14:00.000Z",
  "services": [
    {
      "name": "Website",
      "status": "operational",
      "uptime": 99.98,
      "responseTime": 120
    },
    {
      "name": "API",
      "status": "operational",
      "uptime": 99.99,
      "responseTime": 85
    },
    {
      "name": "CDN",
      "status": "operational",
      "uptime": 99.99,
      "responseTime": 45
    }
  ],
  "metrics": {
    "requests": 125000,
    "errors": 23,
    "avgResponseTime": 142,
    "p95ResponseTime": 380
  },
  "incidents": [],
  "maintenance": []
}
```

**Status Codes**: `200 OK`

---

### 2. Basic Health Check

**Endpoint**: `GET /api/health`

**Description**: Basic health check for Kubernetes/Docker health probes. Checks memory usage and Node.js runtime health.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-18T20:14:00.000Z",
  "uptime": 3600.5,
  "version": "0.1.0",
  "checks": {
    "memory": {
      "status": "ok",
      "used": 45,
      "limit": 512
    },
    "node": {
      "status": "ok",
      "version": "v22.22.0"
    }
  }
}
```

**Status Codes**: `200 OK` (healthy), `503 Service Unavailable` (unhealthy)

**Special Headers**: `Cache-Control: no-cache`

---

### 3. Liveness Probe (Kubernetes)

**Endpoint**: `GET /api/health/live`

**Description**: Kubernetes liveness probe endpoint. Always returns 200 if the process is running.

**Response**: Simple JSON response with liveness status.

**Status Codes**: `200 OK` (alive)

---

### 4. Readiness Probe (Kubernetes)

**Endpoint**: `GET /api/health/ready`

**Description**: Kubernetes readiness probe endpoint. Returns 200 only when all critical dependencies are available (database, external services).

**Response**: JSON with readiness status and dependency checks.

**Status Codes**: `200 OK` (ready), `503 Service Unavailable` (not ready)

---

### 5. Detailed Health Check

**Endpoint**: `GET /api/health/detailed`

**Description**: Detailed health check with dependency status, including database connectivity, external service health, and system metrics.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-18T20:14:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "externalServices": {
      "github": "healthy",
      "email": "healthy"
    }
  }
}
```

**Status Codes**: `200 OK` (healthy), `503 Service Unavailable` (unhealthy)

---

## Security APIs

### 6. Generate CSRF Token

**Endpoint**: `GET /api/csrf-token`

**Description**: Generates a CSRF protection token for form submissions. The token is stored in an httpOnly cookie for security.

**Request Headers**: None

**Response**:
```json
{
  "csrfToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

**Cookies Set**:
- `csrf_token`: The generated token (httpOnly, secure in production, strict sameSite)

**Status Codes**: `200 OK`, `500 Internal Server Error`

---

## Database APIs

### 7. Database Health Check

**Endpoint**: `GET /api/database/health`

**Description**: Returns database health report, statistics, and size information.

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalRecords": 1234,
      "activeConnections": 5
    },
    "size": {
      "totalSize": 10485760,
      "formatted": "10 MB"
    },
    "health": {
      "status": "healthy",
      "lastCheck": "2026-03-18T20:14:00.000Z"
    }
  }
}
```

**Status Codes**: `200 OK`, `500 Internal Server Error`

---

### 8. Optimize Database

**Endpoint**: `POST /api/database/optimize`

**Description**: Triggers database optimization operations (VACUUM, ANALYZE, index rebuild).

**Response**:
```json
{
  "success": true,
  "data": {
    "vacuumTime": 1234,
    "indexesRebuilt": 5,
    "spaceSaved": 1024
  },
  "message": "Database optimization completed successfully"
}
```

**Status Codes**: `200 OK`, `500 Internal Server Error`

---

## GitHub Integration APIs

### 9. Get Repository Commits

**Endpoint**: `GET /api/github/commits`

**Description**: Proxy endpoint for GitHub API to fetch repository commits. Hides GitHub token from client-side.

**Query Parameters**:
- `owner` (string): Repository owner (default: from env or `songzhuo`)
- `repo` (string): Repository name (default: from env or `openclaw-workspace`)
- `per_page` (number): Number of commits to return (default: 30, max: 100)

**Response**:
```json
[
  {
    "sha": "abc123...",
    "commit": {
      "author": {
        "name": "John Doe",
        "email": "john@example.com",
        "date": "2026-03-18T20:00:00Z"
      },
      "message": "Commit message",
      "url": "https://github.com/owner/repo/commit/abc123"
    },
    "html_url": "https://github.com/owner/repo/commit/abc123",
    "author": {
      "login": "johndoe",
      "avatar_url": "https://..."
    }
  }
]
```

**Status Codes**: `200 OK`, `404 Not Found`, `401 Unauthorized`, `403 Forbidden (rate limit)`, `500 Internal Server Error`

---

### 10. Get Repository Issues

**Endpoint**: `GET /api/github/issues`

**Description**: Proxy endpoint for GitHub API to fetch repository issues (excluding pull requests).

**Query Parameters**:
- `owner` (string): Repository owner (default: from env or `songzhuo`)
- `repo` (string): Repository name (default: from env or `openclaw-workspace`)
- `state` (string): Issue state - `open`, `closed`, or `all` (default: `all`)
- `per_page` (number): Number of issues to return (default: 50, max: 100)

**Response**:
```json
[
  {
    "id": 12345,
    "number": 42,
    "state": "open",
    "title": "Issue title",
    "body": "Issue description",
    "user": {
      "login": "johndoe",
      "avatar_url": "https://..."
    },
    "labels": [],
    "created_at": "2026-03-18T20:00:00Z",
    "updated_at": "2026-03-18T20:00:00Z",
    "html_url": "https://github.com/owner/repo/issues/42"
  }
]
```

**Status Codes**: `200 OK`, `404 Not Found`, `401 Unauthorized`, `403 Forbidden (rate limit)`, `500 Internal Server Error`

---

## A2A Protocol APIs

### 11. A2A JSON-RPC Endpoint

**Endpoint**: `POST /api/a2a/jsonrpc`

**Description**: Main A2A protocol endpoint implementing JSON-RPC 2.0 for agent-to-agent communication. Supports task management, message sending, and streaming.

**Protocol Version**: A2A Protocol v0.3.0
**Content-Type**: `application/json`

#### Supported JSON-RPC Methods

##### `message/send`

Send a message to the agent and create a task.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "kind": "message",
      "messageId": "msg-uuid",
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "Hello, agent!"
        }
      ],
      "contextId": "ctx-uuid"
    },
    "configuration": {
      "blocking": true,
      "historyLength": 10
    },
    "metadata": {}
  },
  "id": "req-1"
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "kind": "task",
    "id": "task-uuid",
    "contextId": "ctx-uuid",
    "status": {
      "state": "completed",
      "timestamp": "2026-03-18T20:14:00.000Z"
    },
    "history": [],
    "artifacts": []
  },
  "id": "req-1"
}
```

##### `message/stream`

Stream events for a message (server-sent events). Returns task and streams updates.

**Request**: Same as `message/send`

**Response**: Returns task object with streaming support.

##### `tasks/get`

Retrieve a task by ID.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/get",
  "params": {
    "id": "task-uuid",
    "historyLength": 10
  },
  "id": "req-2"
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "kind": "task",
    "id": "task-uuid",
    "contextId": "ctx-uuid",
    "status": {
      "state": "completed",
      "timestamp": "2026-03-18T20:14:00.000Z"
    },
    "history": [],
    "artifacts": []
  },
  "id": "req-2"
}
```

##### `tasks/list`

List tasks with filtering and pagination.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/list",
  "params": {
    "contextId": "ctx-uuid",
    "status": "completed",
    "pageSize": 20,
    "pageToken": "token",
    "includeArtifacts": true
  },
  "id": "req-3"
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tasks": [],
    "nextPageToken": "next-token",
    "pageSize": 20,
    "totalSize": 100
  },
  "id": "req-3"
}
```

##### `tasks/cancel`

Cancel a running task.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tasks/cancel",
  "params": {
    "id": "task-uuid"
  },
  "id": "req-4"
}
```

**Response**: Returns updated task with status `canceled`.

##### `agent/getCard`

Get the agent's metadata card.

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "agent/getCard",
  "params": {},
  "id": "req-5"
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "name": "7zi Agent",
    "description": "AI Team Management Platform",
    "version": "0.1.0",
    "protocolVersion": "0.3.0",
    "url": "https://your-domain.com",
    "skills": [
      {
        "id": "task-management",
        "name": "Task Management",
        "description": "Manage and organize tasks"
      }
    ],
    "capabilities": {
      "streaming": true,
      "pushNotifications": false,
      "stateTransitionHistory": true
    }
  },
  "id": "req-5"
}
```

##### `agent/getExtendedCard`

Get extended agent card with additional metadata.

**Request**: No params required.

**Response**: Extended agent card with additional fields.

#### Batch Requests

The endpoint supports batch JSON-RPC requests by sending an array of request objects.

**Request**:
```json
[
  { "jsonrpc": "2.0", "method": "tasks/get", "params": {"id": "task-1"}, "id": "req-1" },
  { "jsonrpc": "2.0", "method": "tasks/get", "params": {"id": "task-2"}, "id": "req-2" }
]
```

**Response**:
```json
[
  { "jsonrpc": "2.0", "result": {...}, "id": "req-1" },
  { "jsonrpc": "2.0", "result": {...}, "id": "req-2" }
]
```

#### CORS Support

**OPTIONS** method is supported for preflight requests:

**Response Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Status Codes**: `200 OK`, `400 Bad Request`, `500 Internal Server Error`

#### Error Codes

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32001`: Task not found
- `-32002`: Task not cancelable
- `-32003`: Push notification not supported
- `-32004`: Unsupported operation
- `-32005`: Content type not supported
- `-32006`: Invalid agent response
- `-32007`: Extended agent card not configured
- `-32008`: Extension support required
- `-32009`: Version not supported

---

## Error Handling

All API endpoints return errors in a consistent JSON format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error types:
- `400 Bad Request`: Invalid parameters or malformed request
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production use:

- **GitHub API**: Limited by GitHub's rate limits (60/hour unauthenticated, 5000/hour authenticated)
- **A2A JSON-RPC**: No rate limit (consider implementing for production)
- **Health/Status endpoints**: No rate limit (public access)

Recommended rate limits for production:
- GitHub endpoints: 60 requests/minute/IP
- A2A JSON-RPC: 100 requests/minute/user
- Other endpoints: 1000 requests/minute/IP

---

## Authentication

Most endpoints do not require authentication by default:

- **Public endpoints**: `/api/status`, `/api/health/*`, `/api/csrf-token`
- **Proxy endpoints**: `/api/github/*` (uses server-side GITHUB_TOKEN)
- **Database endpoints**: `/api/database/*` (consider adding authentication)
- **A2A endpoints**: `/api/a2a/*` (consider adding authentication for production)

For production, consider implementing:
- API key authentication
- JWT token authentication
- OAuth 2.0 (for user-facing APIs)

---

## Additional Notes

### Caching

- Most health endpoints disable caching with `dynamic = 'force-dynamic'`
- Consider adding CDN caching for public status page
- Use appropriate `Cache-Control` headers for data endpoints

### Monitoring

- All endpoints are instrumented with performance monitoring
- Sentry integration for error tracking
- Health checks exposed for external monitoring services

### Testing

Each API endpoint has corresponding test files in `src/app/api/__tests__/`:

- `/api/status` → `status.route.test.ts`
- `/api/csrf-token` → `route.test.ts`
- `/api/health/live` → `route.test.ts`

Run tests with:
```bash
npm test
```

---

## Future Enhancements

Potential API additions:
1. WebSocket support for real-time updates
2. GraphQL endpoint for flexible queries
3. OpenAPI/Swagger documentation generation
4. API versioning (e.g., `/api/v2/...`)
5. Webhook support for event notifications
6. File upload/download endpoints
7. User authentication and authorization APIs
8. Team management APIs
9. Analytics and reporting APIs

---

**End of API Documentation**
