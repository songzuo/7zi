# 📡 7zi API Reference

Complete API documentation for the 7zi AI Team Management Platform.

---

## 🔐 Authentication APIs

### Login

**Endpoint:** `POST /api/auth/login`

Authenticate a user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "rememberMe": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-20T12:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (missing fields or invalid email)
- `401` - Authentication failed (wrong credentials)
- `500` - Internal server error

---

### Register

**Endpoint:** `POST /api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Get Current User

**Endpoint:** `GET /api/auth/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

---

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

Refresh an expired access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-20T12:00:00.000Z"
}
```

---

### Logout

**Endpoint:** `POST /api/auth/logout`

Logout the current user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🐙 GitHub Integration APIs

### Get Repository Commits

**Endpoint:** `GET /api/github/commits`

Proxy to GitHub API to fetch repository commits. Hides GITHUB_TOKEN from the client.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `owner` | string | Yes | - | Repository owner (e.g., "songzuo") |
| `repo` | string | Yes | - | Repository name (e.g., "7zi") |
| `per_page` | number | No | 30 | Commits per page (max 100) |
| `page` | number | No | 1 | Page number |
| `sha` | string | No | - | SHA or branch to start listing commits from |
| `path` | string | No | - | Only commits containing this file path |
| `since` | string | No | - | Only commits after this ISO 8601 timestamp |
| `until` | string | No | - | Only commits before this ISO 8601 timestamp |

**Example:**
```
GET /api/github/commits?owner=songzuo&repo=7zi&per_page=10&page=1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "sha": "abc123",
      "commit": {
        "author": {
          "name": "John Doe",
          "email": "john@example.com",
          "date": "2026-03-19T10:00:00.000Z"
        },
        "message": "feat: add new feature"
      },
      "html_url": "https://github.com/songzuo/7zi/commit/abc123"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 0
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid query parameters
- `401` - GitHub authentication token invalid or expired
- `403` - GitHub API rate limit exceeded
- `404` - Repository not found

---

### Get Repository Issues

**Endpoint:** `GET /api/github/issues`

Proxy to GitHub API to fetch repository issues. Hides `GITHUB_TOKEN` from the client. **Security purpose**: Avoid exposing GitHub token in client-side code.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `owner` | string | Yes | - | Repository owner (e.g., "songzuo") |
| `repo` | string | Yes | - | Repository name (e.g., "7zi") |
| `state` | string | No | open | Issue state: "open", "closed", or "all" |
| `labels` | string | No | - | Comma-separated label names |
| `sort` | string | No | created | Sort field: "created", "updated", or "comments" |
| `direction` | string | No | desc | Sort direction: "asc" or "desc" |
| `per_page` | number | No | 30 | Issues per page (max 100) |
| `page` | number | No | 1 | Page number |
| `since` | string | No | - | Only issues after this ISO 8601 timestamp |

**Example:**
```
GET /api/github/issues?owner=songzuo&repo=7zi&state=open&per_page=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123456789,
      "number": 42,
      "title": "Fix authentication bug",
      "state": "open",
      "user": {
        "login": "contributor",
        "avatar_url": "https://github.com/user.png"
      },
      "labels": [
        {
          "name": "bug",
          "color": "d73a4a"
        }
      ],
      "created_at": "2026-03-19T10:00:00.000Z",
      "updated_at": "2026-03-19T12:00:00.000Z",
      "html_url": "https://github.com/songzuo/7zi/issues/42"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 0
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid query parameters (validation error)
- `401` - GitHub authentication token is invalid or expired
- `403` - GitHub API rate limit exceeded (with reset time in message)
- `404` - Repository not found or does not exist
- `502` - Invalid response format from GitHub API
- `500` - Internal server error

**Important Notes:**
- Pull requests are automatically filtered out from the response (GitHub API returns both issues and PRs)
- If `GITHUB_TOKEN` is not configured, the endpoint still works but is subject to GitHub's unauthenticated rate limits (60 requests/hour)
- With authentication token: 5,000 requests/hour
- The `total` field in pagination returns 0 because GitHub doesn't provide total count in the API response

---

## 💚 Health Check APIs

### General Health Check

**Endpoint:** `GET /api/health`

Basic health check for Kubernetes/Docker and load balancer probes. Returns detailed system health status with memory and Node.js version checks.

**Cache:** Disabled (force-dynamic) to ensure fresh health status.

**Response (200 OK) - Healthy:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-19T12:00:00.000Z",
    "uptime": 3600.5,
    "version": "1.0.0",
    "checks": {
      "memory": {
        "status": "ok",
        "used": 128,
        "limit": 512
      },
      "node": {
        "status": "ok",
        "version": "v22.22.0"
      }
    }
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

**Response (503 Service Unavailable) - Unhealthy:**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "timestamp": "2026-03-19T12:00:00.000Z",
    "uptime": 3600.5,
    "version": "1.0.0",
    "checks": {
      "memory": {
        "status": "warning",
        "used": 486,
        "limit": 512
      },
      "node": {
        "status": "ok",
        "version": "v22.22.0"
      }
    }
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

**Health Checks:**
- **Memory**: Checks if heap usage is below 95% of the 512MB limit (486.4MB)
- **Node.js**: Always returns "ok" with current Node.js version

**Response Fields:**
- `status`: "healthy" or "unhealthy" based on memory usage
- `uptime`: Process uptime in seconds
- `version`: Application version from `npm_package_version` environment variable (defaults to "1.0.0")
- `checks.memory.used`: Memory used in MB
- `checks.memory.limit`: Memory limit in MB (fixed at 512MB)
- `checks.memory.status`: "ok" if below 95%, "warning" if above

---

### Live Probe (Kubernetes)

**Endpoint:** `GET /api/health/live`

Lightweight liveness probe. Returns 200 if the service is running.

**Response (200 OK):**
```json
{
  "status": "alive",
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

### Ready Probe (Kubernetes)

**Endpoint:** `GET /api/health/ready`

Readiness probe for Kubernetes. Returns 200 if the service is ready to accept traffic.

**Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2026-03-19T12:00:00.000Z",
  "checks": {
    "database": "connected",
    "cache": "connected"
  }
}
```

---

### Detailed Health Check

**Endpoint:** `GET /api/health/detailed`

Comprehensive health check with detailed system information.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-19T12:00:00.000Z",
  "system": {
    "uptime": 3600.5,
    "memory": {
      "used": 128,
      "limit": 512,
      "usagePercent": 25.0
    },
    "cpu": {
      "usagePercent": 15.2
    }
  },
  "services": {
    "database": {
      "status": "connected",
      "sizeMB": 25.4,
      "connections": 5
    },
    "cache": {
      "status": "connected",
      "hitRate": 0.85
    }
  }
}
```

---

## 🗄️ Database Management APIs

### Database Health Check

**Endpoint:** `GET /api/database/health`

Check database connection and health status.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "connected": true,
    "sizeMB": 25.4,
    "connectionCount": 5,
    "lastVacuum": "2026-03-18T00:00:00.000Z"
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

### Database Optimization Report

**Endpoint:** `GET /api/database/optimize`

Get database optimization report with recommendations.

**Response (200 OK):**
```json
{
  "success": true,
  "databaseSize": {
    "pageSize": 4096,
    "pageCount": 6400,
    "freePages": 320,
    "sizeInMB": 25.6,
    "fragmentationPercent": 5.0
  },
  "cache": {
    "hits": 5000,
    "misses": 750,
    "hitRate": 0.87,
    "hitRatePercent": 87.0,
    "totalSizeMB": 12.8
  },
  "tables": [
    {
      "name": "users",
      "rowCount": 1000,
      "indexCount": 3,
      "sizeMB": 5.2,
      "suggestions": []
    }
  ],
  "missingIndexes": [],
  "slowQueries": [],
  "recommendations": [],
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

### Execute Database Optimization

**Endpoint:** `POST /api/database/optimize`

Run database optimization actions.

**Request Body:**
```json
{
  "actions": ["vacuum", "analyze", "clear-cache"],
  "daysToKeep": 90
}
```

**Available Actions:**
- `migrate` - Run database migrations
- `add-indexes` - Add missing indexes
- `cleanup` - Clean up old data (with `daysToKeep` parameter)
- `vacuum` - Run VACUUM to reclaim space
- `analyze` - Run ANALYZE to update statistics
- `clear-cache` - Clear database cache
- `warmup-cache` - Warm up cache with common queries

**Response (200 OK):**
```json
{
  "success": true,
  "results": [
    {
      "action": "vacuum",
      "success": true,
      "message": "Database vacuumed successfully. Size reduced from 25.6MB to 24.8MB",
      "data": {
        "sizeBeforeMB": 25.6,
        "sizeAfterMB": 24.8,
        "savedMB": 0.8
      }
    },
    {
      "action": "analyze",
      "success": true,
      "message": "Database analyzed successfully"
    },
    {
      "action": "clear-cache",
      "success": true,
      "message": "Cache cleared successfully"
    }
  ],
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

## 📊 Performance Monitoring APIs

### Performance Report

**Endpoint:** `GET /api/performance/report`

Get comprehensive performance metrics including API, database, and system health.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `detailed` | boolean | No | false | Include detailed slow requests and queries |
| `minutes` | number | No | 5 | Time window in minutes for metrics |

**Example:**
```
GET /api/performance/report?detailed=true&minutes=10
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-03-19T12:00:00.000Z",
  "summary": {
    "status": "healthy",
    "overallScore": 95,
    "issues": 0,
    "recommendations": 2
  },
  "api": {
    "summary": {
      "total": 1250,
      "avgDuration": 85,
      "minDuration": 12,
      "maxDuration": 450,
      "successRate": 99.8
    },
    "slowRequests": [],
    "byPath": {
      "/api/auth/login": {
        "count": 45,
        "avgDuration": 120,
        "errorRate": 0.02
      }
    },
    "recent": []
  },
  "database": {
    "summary": {
      "total": 5800,
      "avgDuration": 15,
      "minDuration": 2,
      "maxDuration": 85,
      "successRate": 99.9
    },
    "slowQueries": [],
    "errorQueries": [],
    "byOperation": {
      "SELECT": {
        "count": 4500,
        "avgDuration": 12,
        "errorRate": 0.01
      }
    },
    "stats": {
      "connectionCount": 5,
      "isOpen": true,
      "sizeInMB": 25.4,
      "pageSize": 4096,
      "pageCount": 6400
    }
  },
  "system": {
    "uptime": 3600.5,
    "memory": {
      "used": 128,
      "limit": 512,
      "usagePercent": 25.0
    },
    "nodeVersion": "v22.22.0"
  },
  "insights": [
    "Database queries are performing well with <20ms average duration"
  ],
  "recommendations": [
    "Memory usage is at 25.0%. Monitor for memory leaks."
  ]
}
```

**Status Codes:**
- `200` - Report generated successfully (even if status is 'warning')
- `503` - Report generated but system is in 'critical' state

---

### Clear Performance Metrics

**Endpoint:** `DELETE /api/performance/clear`

Clear collected performance metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Performance metrics cleared",
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

## 📡 System Status APIs

### Public Status Page

**Endpoint:** `GET /api/status`

Returns public status information for status pages and monitoring.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | full | Response format: 'full' or 'compact' |
| `include_metrics` | boolean | No | false | Include detailed metrics |

**Example:**
```
GET /api/status?format=compact&include_metrics=true
```

**Response (200 OK) - Full Format:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "lastUpdated": "2026-03-19T12:00:00.000Z",
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
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

**Response (200 OK) - Compact Format:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "lastUpdated": "2026-03-19T12:00:00.000Z",
    "services": [
      {
        "name": "Website",
        "status": "operational"
      },
      {
        "name": "API",
        "status": "operational"
      },
      {
        "name": "CDN",
        "status": "operational"
      }
    ]
  },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

## 🔐 CSRF Protection

### Get CSRF Token

**Endpoint:** `GET /api/csrf-token`

Get a CSRF token for form submissions.

**Response (200 OK):**
```json
{
  "success": true,
  "token": "csrf_token_abc123",
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

---

## 🤖 A2A Integration

### JSON-RPC Endpoint

**Endpoint:** `POST /api/a2a/jsonrpc`

Agent-to-Agent communication via JSON-RPC 2.0 protocol. Supports both single requests and batch requests.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**CORS:** Supports cross-origin requests with strict origin validation based on `NEXT_PUBLIC_SITE_URL`.

#### Single Request

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.task.execute",
  "params": {
    "agentId": "agent_123",
    "task": {
      "type": "code_review",
      "payload": {
        "prNumber": 42
      }
    }
  },
  "id": 1
}
```

**Response (200 OK):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "data": {
      "agentId": "agent_123",
      "taskId": "task_456",
      "status": "completed",
      "result": {
        "issuesFound": 3,
        "issuesFixed": 0
      }
    }
  },
  "id": 1
}
```

#### Batch Request

Send multiple requests in a single HTTP call for better performance.

**Request Body:**
```json
[
  {
    "jsonrpc": "2.0",
    "method": "agent.task.execute",
    "params": {
      "agentId": "agent_123",
      "task": {
        "type": "code_review",
        "payload": {
          "prNumber": 42
        }
      }
    },
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "method": "agent.task.execute",
    "params": {
      "agentId": "agent_456",
      "task": {
        "type": "code_review",
        "payload": {
          "prNumber": 43
        }
      }
    },
    "id": 2
  }
]
```

**Response (200 OK):**
```json
[
  {
    "jsonrpc": "2.0",
    "result": {
      "success": true,
      "data": {
        "agentId": "agent_123",
        "taskId": "task_456",
        "status": "completed"
      }
    },
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "result": {
      "success": true,
      "data": {
        "agentId": "agent_456",
        "taskId": "task_789",
        "status": "completed"
      }
    },
    "id": 2
  }
]
```

#### Error Responses

**Invalid Request (400):**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "method": "Field is required"
    }
  },
  "id": null
}
```

**Method Not Found (404):**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found"
  },
  "id": 1
}
```

**Internal Error (500):**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "message": "Detailed error message (development only)"
    }
  },
  "id": null
}
```

#### JSON-RPC Error Codes

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| `-32700` | Parse error | 400 | Invalid JSON was received |
| `-32600` | Invalid Request | 400 | JSON-RPC request is invalid |
| `-32601` | Method not found | 404 | Method does not exist |
| `-32602` | Invalid params | 400 | Invalid method parameters |
| `-32603` | Internal error | 500 | Internal JSON-RPC error |

---

## 💾 Backup APIs

### List Backups

**Endpoint:** `GET /api/backup`

List all available database backups with metadata.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup-1711234567890-abc123",
        "filename": "backup-1711234567890-abc123.json",
        "createdAt": "2026-03-20T12:00:00.000Z",
        "sizeInBytes": 10485760,
        "sizeInMB": 10.0,
        "version": "1.0.0",
        "tables": ["users", "tasks", "projects"],
        "recordCounts": {
          "users": 100,
          "tasks": 500,
          "projects": 25
        },
        "checksum": "a1b2c3d4e5f6..."
      }
    ],
    "count": 1,
    "totalSizeMB": "10.00"
  }
}
```

---

### Create Backup

**Endpoint:** `POST /api/backup`

Create a new full database backup.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "backup": {
      "id": "backup-1711234567890-xyz789",
      "filename": "backup-1711234567890-xyz789.json",
      "createdAt": "2026-03-20T12:00:00.000Z",
      "sizeInBytes": 10485760,
      "sizeInMB": "10.00",
      "version": "1.0.0",
      "tables": ["users", "tasks", "projects"],
      "recordCounts": {
        "users": 100,
        "tasks": 500,
        "projects": 25
      },
      "checksum": "f6e5d4c3b2a1..."
    },
    "downloadUrl": "/api/backup/backup-1711234567890-xyz789"
  }
}
```

---

### Get Backup by ID

**Endpoint:** `GET /api/backup/[id]`

Download a specific backup file.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Backup ID (without .json extension) |

**Response (200 OK):**
Returns the backup JSON file directly.

**Errors:**
- `404` - Backup not found

---

### Delete Backup

**Endpoint:** `DELETE /api/backup/[id]`

Delete a specific backup file.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Backup ID (without .json extension) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup deleted successfully"
}
```

**Errors:**
- `404` - Backup not found

---

## 🖼️ Multimodal APIs

### Audio Transcription

**Endpoint:** `POST /api/multimodal/audio`

Upload and transcribe audio files with various options.

**Request Body:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | File | Yes | Audio file to transcribe |
| `provider` | string | No | Specific provider to use |
| `language` | string | No | Language code (default: zh-CN) |
| `model` | string | No | Model to use for transcription |
| `timestamps` | boolean | No | Include timestamps in result (default: false) |
| `speakerDiarization` | boolean | No | Identify different speakers (default: false) |

**Supported Audio Types:**
- audio/mpeg, audio/mp3
- audio/wav, audio/wave
- audio/webm, audio/ogg
- audio/flac, audio/aac, audio/m4a

**Max File Size:** 100MB

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "text": "Transcribed text content here...",
    "segments": [
      {
        "start": 0,
        "end": 2.5,
        "text": "First segment",
        "startFormatted": "00:00",
        "endFormatted": "00:02"
      }
    ],
    "language": "zh-CN",
    "duration": 10.5,
    "durationFormatted": "00:10",
    "confidence": 0.95,
    "speakerDiarization": false,
    "wordCount": 25
  },
  "metadata": {
    "provider": "default",
    "originalSize": 1048576,
    "detectedType": "mp3",
    "filename": "recording.mp3",
    "type": "audio/mpeg",
    "duration": 10.5,
    "language": "zh-CN",
    "model": "default",
    "processingTime": "2.345"
  }
}
```

**Supported Languages:**
`zh-CN`, `zh-TW`, `en-US`, `en-GB`, `ja-JP`, `ko-KR`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`, `pt-BR`

**Errors:**
- `400` - Invalid request or audio validation failed
- `413` - Audio file too large
- `415` - Unsupported audio format
- `503` - Transcription service unavailable
- `504` - Transcription timeout

---

### Get Audio Providers

**Endpoint:** `GET /api/multimodal/audio`

Get list of available audio transcription providers with health status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "default",
        "capabilities": ["audio", "transcription"],
        "healthy": true,
        "status": "operational"
      }
    ],
    "total": 1,
    "operational": 1,
    "supportedLanguages": ["zh-CN", "en-US", ...],
    "supportedTypes": ["audio/mpeg", "audio/wav", ...],
    "maxSizeBytes": 104857600,
    "maxSizeMB": "100"
  }
}
```

---

## 📊 Monitoring & Metrics APIs

### Performance Metrics

**Endpoint:** `GET /api/metrics/performance`

Get comprehensive performance metrics including API, rate limiting, and system health.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | all | Filter: "all", "api", "ratelimit", or "system" |
| `period` | string | No | 24h | Time period: "1h", "24h", "7d", "30d" |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "apiPerformance": {
      "summary": {
        "totalRequests": 1250,
        "avgDuration": 85,
        "successRate": 99.8
      },
      "topSlowRequests": [
        {
          "path": "/api/performance/report",
          "avgDuration": 250,
          "count": 10
        }
      ],
      "routeCount": 28
    },
    "rateLimiting": {
      "totalEntries": 150,
      "trackedPaths": ["/api/auth/login", "/api/github/commits"],
      "totalRequestsTracked": 5000,
      "pathsCount": 20
    },
    "system": {
      "uptime": {
        "seconds": 3600,
        "formatted": "1h 0m"
      },
      "memory": {
        "heapUsed": "128 MB",
        "heapTotal": "512 MB",
        "heapUsedPercent": "25.00"
      },
      "nodeVersion": "v22.22.0",
      "platform": "linux",
      "arch": "x64"
    }
  },
  "timestamp": "2026-03-20T12:00:00.000Z"
}
```

---

### Prometheus Metrics

**Endpoint:** `GET /api/metrics/prometheus`

Export metrics in Prometheus/OpenMetrics format for integration with Prometheus/Grafana.

**Headers:**
```
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

**Response (200 OK):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/health",status="200"} 1250

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
http_request_duration_seconds_bucket{le="1"} 900
http_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP system_memory_used_bytes System memory usage
# TYPE system_memory_used_bytes gauge
system_memory_used_bytes 134217728
```

---

## 📡 Stream APIs

### Health Stream (SSE)

**Endpoint:** `GET /api/stream/health`

Real-time health metrics using Server-Sent Events (SSE).

**Headers:**
```
Accept: text/event-stream
```

**Response (200 OK):**
SSE stream with events in the format:

```
id: client-uuid
event: connected
data: {"type":"metrics","timestamp":"2026-03-20T12:00:00.000Z","data":{}}

event: metrics
data: {"type":"metrics","timestamp":"2026-03-20T12:00:05.000Z","data":{"apiLatency":85,"memoryUsage":128}}

event: status
data: {"type":"status","timestamp":"2026-03-20T12:00:30.000Z","data":{"status":"ok","checks":{...},"uptime":3600}}

: keep-alive
```

**Event Types:**
- `connected` - Initial connection established
- `metrics` - API latency and memory usage (every 5 seconds)
- `status` - Detailed health status (every 30 seconds)
- `error` - Error occurred during data collection
- `keep-alive` - Keep-alive signal (every 15 seconds)

**Errors:**
- `400` - Invalid SSE connection request
- `503` - Streaming service unavailable

---

### Authentication
- All protected endpoints require a valid JWT token in the `Authorization` header
- Tokens expire after 1 hour (access token) or 7 days (refresh token with rememberMe)
- Use HTTPS in production to protect tokens in transit

### Rate Limiting
- GitHub API has rate limits (60/hour unauthenticated, 5000/hour authenticated)
- Configure `GITHUB_TOKEN` environment variable for higher limits

### CORS
- Configure CORS settings in production to allow only trusted origins

---

## 📝 Common Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "fields": {
        "email": "Invalid email format"
      }
    }
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Rate Limit Error (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 3600
  }
}
```

### Internal Error (500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 🧪 Testing APIs

You can test APIs using curl or any HTTP client:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# Get GitHub commits
curl "http://localhost:3000/api/github/commits?owner=songzuo&repo=7zi&per_page=10"

# Health check
curl http://localhost:3000/api/health

# Performance report
curl "http://localhost:3000/api/performance/report?detailed=true"
```

---

## 📚 Additional Documentation

- [Development Guide](./docs/DEVELOPMENT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Testing Guide](./docs/TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

_Last updated: 2026-03-21_
