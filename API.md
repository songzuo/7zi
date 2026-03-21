# 📡 7zi API Reference

Complete API documentation for the 7zi AI Team Management Platform.

---

**Last Updated:** 2026-03-21
**Version:** v1.0.6
**Reviewer:** AI Documentation Agent
**Total Endpoints:** 50+ (including 15+ RBAC endpoints)

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

### Image Processing

**Endpoint:** `POST /api/multimodal/image`

Upload and process images with optional compression and provider selection.

**Request Body:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Image file to process |
| `provider` | string | No | Specific provider to use |
| `maxSize` | number | No | Maximum file size in bytes (default: 10MB) |
| `compress` | boolean | No | Whether to compress the image (default: false) |
| `quality` | number | No | Compression quality 0.0-1.0 (default: 0.8) |

**Supported Image Types:**
- image/jpeg, image/jpg
- image/png
- image/webp
- image/gif
- image/svg+xml

**Max File Size:** 10MB (configurable)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "size": 524288,
    "analyzed": true
  },
  "metadata": {
    "originalSize": 1048576,
    "processedSize": 524288,
    "compressionRatio": 0.5,
    "filename": "image.jpg",
    "type": "image/jpeg",
    "provider": "default",
    "processingTime": "1.234"
  },
  "timestamp": "2026-03-21T12:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid request or image validation failed
- `413` - Image file too large
- `415` - Unsupported image format
- `503` - Image processing service unavailable

---

### Get Image Providers

**Endpoint:** `GET /api/multimodal/image`

Get list of available image processing providers with health status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "default",
        "capabilities": ["image", "processing"],
        "healthy": true,
        "status": "operational"
      }
    ],
    "total": 1,
    "operational": 1
  },
  "timestamp": "2026-03-21T12:00:00.000Z"
}
```

**Errors:**
- `500` - Failed to list image processing providers

---

## 📊 Stream APIs

### Analytics Stream (SSE) - Authenticated

**Endpoint:** `GET /api/stream/analytics`

Real-time analytics metrics using Server-Sent Events (SSE). **Requires authentication.**

**Headers:**
```
Accept: text/event-stream
Authorization: Bearer <token>
```

**Response (200 OK):**
SSE stream with real-time performance metrics:

```
id: client-uuid
event: connected
data: {"type":"metrics","timestamp":"2026-03-21T12:00:00.000Z","data":[...]}

event: metrics
data: {"type":"metrics","timestamp":"2026-03-21T12:00:05.000Z","data":[
  {"name":"CPU 使用率","value":55,"unit":"%","trend":"up","change":3.2},
  {"name":"内存使用","value":72,"unit":"%","trend":"stable","change":0},
  {"name":"响应时间","value":125,"unit":"ms","trend":"down","change":-5}
]}

: keep-alive
```

**Metrics Provided:**
- CPU 使用率 (CPU Usage %)
- 内存使用 (Memory Usage %)
- 响应时间 (Response Time ms)
- 任务完成率 (Task Completion Rate %)

**Update Frequency:**
- Metrics data: Every 5 seconds
- Keep-alive: Every 15 seconds

**Errors:**
- `400` - Invalid SSE connection request
- `401` - Authentication required
- `403` - Insufficient permissions

---

## 🔐 RBAC (Role-Based Access Control) APIs

Complete RBAC system for fine-grained permission control. Manages roles, permissions, and user access.

### System Roles

The system includes 5 built-in roles:

| Role | Level | Description |
|------|-------|-------------|
| **ADMIN** | 100 | Full system access with all permissions |
| **MANAGER** | 80 | Manage teams, tasks, and approvals |
| **MEMBER** | 60 | Standard team member with task access |
| **VIEWER** | 40 | Read-only access to all resources |
| **GUEST** | 20 | Limited guest access |

### System Status & Initialization

#### Get RBAC System Status

**Endpoint:** `GET /api/rbac/system`

Get current RBAC system status and initialization state.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** `system:read` or ADMIN role

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "systemInitialized": true,
    "rolesInDb": 5,
    "permissionsInDb": 45,
    "defaultRolesCount": 5,
    "needsSeeding": false
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

---

#### Initialize RBAC System

**Endpoint:** `POST /api/rbac/system/initialize`

Initialize the RBAC system with default roles and permissions.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** ADMIN role

**Request Body:**
```json
{
  "force": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `force` | boolean | No | Force re-initialization even if already seeded (default: false) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Roles and permissions seeded successfully",
    "rolesSeeded": ["ADMIN", "MANAGER", "MEMBER", "VIEWER", "GUEST"],
    "permissionsSeeded": 45
  },
  "message": "RBAC system initialized successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response (200 OK) - Already initialized:**
```json
{
  "success": true,
  "data": {
    "message": "RBAC system already initialized",
    "initialized": false
  }
}
```

---

#### Reset RBAC System

**Endpoint:** `DELETE /api/rbac/system/reset`

Reset RBAC system to default state (deletes all custom roles and permissions).

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Roles and permissions reset successfully"
  },
  "message": "RBAC system reset to defaults successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

---

### Permissions Management

#### Get All Permissions

**Endpoint:** `GET /api/rbac/permissions`

List all system permissions with optional grouping.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `groupBy` | string | No | null | Group by: 'resource' or 'action' |

**Response (200 OK) - Default (no grouping):**
```json
{
  "success": true,
  "data": [
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "user:manage_role",
    "team:read",
    "team:create",
    "team:update",
    "team:delete",
    "team:add_member",
    "team:remove_member",
    "team:manage",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "task:batch",
    "task:assign",
    "settings:read",
    "settings:update",
    "settings:manage",
    "approval:read",
    "approval:create",
    "approval:update",
    "approval:delete",
    "approval:approve",
    "approval:reject",
    "approval:manage",
    "reports:export",
    "reports:view",
    "reports:manage",
    "system:read",
    "system:manage",
    "system:config",
    "logs:read",
    "logs:export",
    "agent:read",
    "agent:create",
    "agent:update",
    "agent:delete",
    "agent:manage",
    "agent:execute",
    "wallet:read",
    "wallet:manage",
    "wallet:transfer"
  ],
  "count": 45,
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response (200 OK) - Grouped by resource:**
```
GET /api/rbac/permissions?groupBy=resource
```
```json
{
  "success": true,
  "data": {
    "user": ["user:read", "user:create", "user:update", "user:delete", "user:manage_role"],
    "team": ["team:read", "team:create", "team:update", "team:delete", "team:add_member", "team:remove_member", "team:manage"],
    "task": ["task:read", "task:create", "task:update", "task:delete", "task:batch", "task:assign"],
    "settings": ["settings:read", "settings:update", "settings:manage"],
    "approval": ["approval:read", "approval:create", "approval:update", "approval:delete", "approval:approve", "approval:reject", "approval:manage"],
    "reports": ["reports:export", "reports:view", "reports:manage"],
    "system": ["system:read", "system:manage", "system:config"],
    "logs": ["logs:read", "logs:export"],
    "agent": ["agent:read", "agent:create", "agent:update", "agent:delete", "agent:manage", "agent:execute"],
    "wallet": ["wallet:read", "wallet:manage", "wallet:transfer"]
  },
  "count": 45,
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response (200 OK) - Grouped by action:**
```
GET /api/rbac/permissions?groupBy=action
```
```json
{
  "success": true,
  "data": {
    "read": ["user:read", "team:read", "task:read", "settings:read", "approval:read", "reports:view", "system:read", "logs:read", "agent:read", "wallet:read"],
    "create": ["user:create", "team:create", "task:create", "approval:create", "agent:create"],
    "update": ["user:update", "team:update", "task:update", "settings:update", "approval:update", "agent:update"],
    "delete": ["user:delete", "team:delete", "task:delete", "approval:delete", "agent:delete"],
    "export": ["reports:export", "logs:export"]
  },
  "count": 45,
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

---

### Roles Management

#### Get All Roles

**Endpoint:** `GET /api/rbac/roles`

List all roles with optional user counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includeCount` | boolean | No | false | Include user count for each role |

**Response (200 OK) - Without counts:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ADMIN",
      "name": "Administrator",
      "description": "Full system access with all permissions",
      "permissions": ["user:read", "user:create", "user:update", "user:delete", "user:manage_role", "team:read", "team:create", "team:update", "team:delete", "team:add_member", "team:remove_member", "team:manage", "task:read", "task:create", "task:update", "task:delete", "task:batch", "task:assign", "settings:read", "settings:update", "settings:manage", "approval:read", "approval:create", "approval:update", "approval:delete", "approval:approve", "approval:reject", "approval:manage", "reports:export", "reports:view", "reports:manage", "system:read", "system:manage", "system:config", "logs:read", "logs:export", "agent:read", "agent:create", "agent:update", "agent:delete", "agent:manage", "agent:execute", "wallet:read", "wallet:manage", "wallet:transfer"],
      "isSystem": true
    },
    {
      "id": "MANAGER",
      "name": "Manager",
      "description": "Manage teams, tasks, and approvals",
      "permissions": ["user:read", "team:read", "team:create", "team:update", "team:add_member", "team:remove_member", "task:read", "task:create", "task:update", "task:assign", "settings:read", "approval:read", "approval:approve", "approval:reject", "reports:export", "reports:view"],
      "isSystem": true
    },
    {
      "id": "MEMBER",
      "name": "Member",
      "description": "Standard team member with task access",
      "permissions": ["user:read", "team:read", "task:read", "task:create", "task:update", "settings:read"],
      "isSystem": true
    },
    {
      "id": "VIEWER",
      "name": "Viewer",
      "description": "Read-only access to all resources",
      "permissions": ["user:read", "team:read", "task:read", "settings:read", "approval:read", "reports:view", "system:read"],
      "isSystem": true
    },
    {
      "id": "GUEST",
      "name": "Guest",
      "description": "Limited guest access",
      "permissions": [],
      "isSystem": true
    }
  ],
  "count": 5,
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response (200 OK) - With user counts:**
```
GET /api/rbac/roles?includeCount=true
```
```json
{
  "success": true,
  "data": [
    {
      "id": "ADMIN",
      "name": "Administrator",
      "description": "Full system access with all permissions",
      "isSystem": true,
      "userCount": 2
    },
    {
      "id": "MANAGER",
      "name": "Manager",
      "description": "Manage teams, tasks, and approvals",
      "isSystem": true,
      "userCount": 5
    },
    {
      "id": "MEMBER",
      "name": "Member",
      "description": "Standard team member with task access",
      "isSystem": true,
      "userCount": 42
    },
    {
      "id": "VIEWER",
      "name": "Viewer",
      "description": "Read-only access to all resources",
      "isSystem": true,
      "userCount": 10
    },
    {
      "id": "GUEST",
      "name": "Guest",
      "description": "Limited guest access",
      "isSystem": true,
      "userCount": 3
    }
  ],
  "count": 5,
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

---

#### Create Custom Role

**Endpoint:** `POST /api/rbac/roles`

Create a new custom role with specific permissions.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** ADMIN role

**Request Body:**
```json
{
  "id": "content_editor",
  "name": "Content Editor",
  "description": "Can edit content but not delete",
  "permissions": ["user:read", "team:read", "task:read", "task:create", "task:update"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique role ID (cannot match system roles) |
| `name` | string | Yes | Display name for the role |
| `description` | string | No | Role description |
| `permissions` | string[] | No | Array of permission strings |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "content_editor",
    "name": "Content Editor",
    "description": "Can edit content but not delete",
    "permissions": ["user:read", "team:read", "task:read", "task:create", "task:update"],
    "isSystem": false
  },
  "message": "Role created successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (ID or name missing)
- `409` - Role with this ID already exists
- `500` - Internal server error

---

#### Get Role Details

**Endpoint:** `GET /api/rbac/roles/[roleId]`

Get detailed information about a specific role.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includePermissions` | boolean | No | false | Include full permissions list |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "MANAGER",
    "name": "Manager",
    "description": "Manage teams, tasks, and approvals",
    "permissions": ["user:read", "team:read", "team:create", "team:update", "team:add_member", "team:remove_member", "task:read", "task:create", "task:update", "task:assign", "settings:read", "approval:read", "approval:approve", "approval:reject", "reports:export", "reports:view"],
    "isSystem": true
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `404` - Role not found

---

#### Update Role

**Endpoint:** `PUT /api/rbac/roles/[roleId]`

Update role information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Request Body:**
```json
{
  "name": "Updated Role Name",
  "description": "Updated role description",
  "permissions": ["user:read", "team:read", "task:read"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated role name |
| `description` | string | No | Updated role description |
| `permissions` | string[] | No | Updated permissions array (custom roles only) |

**System Roles:** System roles (`ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`, `GUEST`) cannot have their permissions modified. Only `name` and `description` can be changed.

**Custom Roles:** All fields can be modified including permissions.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "content_editor",
    "name": "Updated Role Name",
    "description": "Updated role description",
    "permissions": ["user:read", "team:read", "task:read"],
    "isSystem": false
  },
  "message": "Role updated successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `403` - Cannot modify system role permissions
- `404` - Role not found
- `500` - Internal server error

---

#### Delete Role

**Endpoint:** `DELETE /api/rbac/roles/[roleId]`

Delete a custom role.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Note:** System roles cannot be deleted.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role deleted successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `403` - Cannot delete system role
- `404` - Role not found
- `500` - Internal server error

---

### Role Permissions Management

#### Get Role Permissions

**Endpoint:** `GET /api/rbac/roles/[roleId]/permissions`

Get all permissions assigned to a role.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roleId": "MANAGER",
    "permissions": ["user:read", "team:read", "team:create", "team:update", "team:add_member", "team:remove_member", "task:read", "task:create", "task:update", "task:assign", "settings:read", "approval:read", "approval:approve", "approval:reject", "reports:export", "reports:view"],
    "count": 15
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `404` - Role not found
- `500` - Internal server error

---

#### Add Permissions to Role

**Endpoint:** `POST /api/rbac/roles/[roleId]/permissions`

Add permissions to a custom role.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Request Body:**
```json
{
  "permissions": ["user:read", "user:create", "user:update"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `permissions` | string[] | Yes | Array of permission strings to add |

**Note:** System roles cannot have their permissions modified.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roleId": "content_editor",
    "addedPermissions": ["user:read", "user:create", "user:update"],
    "count": 3
  },
  "message": "Permissions assigned successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (permissions array required)
- `403` - Cannot modify system role permissions
- `404` - Role not found
- `500` - Internal server error

---

#### Remove Permissions from Role

**Endpoint:** `DELETE /api/rbac/roles/[roleId]/permissions`

Remove permissions from a custom role.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID |

**Request Body:**
```json
{
  "permissions": ["user:delete", "user:manage_role"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `permissions` | string[] | Yes | Array of permission strings to remove |

**Note:** System roles cannot have their permissions modified.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roleId": "content_editor",
    "removedPermissions": ["user:delete", "user:manage_role"],
    "count": 2
  },
  "message": "Permissions removed successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (permissions array required)
- `403` - Cannot modify system role permissions
- `404` - Role not found
- `500` - Internal server error

---

### User Roles Management

#### Get User Roles

**Endpoint:** `GET /api/rbac/users/[userId]/roles`

Get all roles assigned to a user.

**Headers:**
```
Authorization: Bearer <token>
```

**Required Permission:** MANAGER or ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includePermissions` | boolean | No | false | Include user's permissions |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "roles": ["MEMBER", "content_editor"],
    "count": 2
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response (200 OK) - With permissions:**
```
GET /api/rbac/users/user_123/roles?includePermissions=true
```
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "roles": ["MEMBER", "content_editor"],
    "permissions": ["user:read", "team:read", "task:read", "task:create", "task:update", "settings:read"],
    "count": 2
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `403` - Insufficient permissions
- `500` - Internal server error

---

#### Add Roles to User

**Endpoint:** `POST /api/rbac/users/[userId]/roles`

Assign roles to a user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** MANAGER or ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Request Body:**
```json
{
  "roles": ["MEMBER", "content_editor"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roles` | string[] | Yes | Array of role IDs to assign |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "addedRoles": ["MEMBER", "content_editor"],
    "count": 2
  },
  "message": "Roles added successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (roles array required)
- `500` - Internal server error

---

#### Remove Roles from User

**Endpoint:** `DELETE /api/rbac/users/[userId]/roles`

Remove roles from a user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Permission:** MANAGER or ADMIN role

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Request Body:**
```json
{
  "roles": ["content_editor"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roles` | string[] | Yes | Array of role IDs to remove |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "removedRoles": ["content_editor"],
    "count": 1
  },
  "message": "Roles removed successfully",
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (roles array required)
- `500` - Internal server error

---

### User Permissions Management

#### Get User Permissions

**Endpoint:** `GET /api/rbac/users/[userId]/permissions`

Get all permissions for a user based on their assigned roles.

**Headers:**
```
Authorization: Bearer <token>
```

**Access Control:**
- Users can view their own permissions
- ADMIN role can view any user's permissions

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "roles": ["MEMBER", "content_editor"],
    "permissions": ["user:read", "team:read", "task:read", "task:create", "task:update", "settings:read"],
    "roleCount": 2,
    "permissionCount": 6
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Errors:**
- `403` - You can only view your own permissions
- `500` - Internal server error

---

#### Check User Permissions

**Endpoint:** `POST /api/rbac/users/[userId]/permissions/check`

Check if a user has specific permissions or roles.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Access Control:**
- Users can check their own permissions
- ADMIN role can check any user's permissions

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Request Body:**
```json
{
  "permissions": ["user:read", "user:create"],
  "checkType": "all",
  "roles": ["ADMIN", "MANAGER"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `permissions` | string[] | No | Array of permissions to check |
| `checkType` | string | No | "all" or "any" (default: "all") |
| `roles` | string[] | No | Array of roles to check |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "roles": ["MEMBER"],
    "hasAllPermissions": false,
    "hasAnyPermission": true,
    "permissions": ["user:read", "user:create"],
    "hasAnyRole": false,
    "hasAllRoles": false,
    "roleChecks": ["ADMIN", "MANAGER"]
  },
  "timestamp": "2026-03-21T19:00:00.000Z"
}
```

**Response Fields:**
- `hasAllPermissions`: True if user has ALL specified permissions
- `hasAnyPermission`: True if user has ANY of the specified permissions
- `hasAnyRole`: True if user has ANY of the specified roles
- `hasAllRoles`: True if user has ALL of the specified roles

**Errors:**
- `403` - You can only check your own permissions
- `500` - Internal server error

---

### RBAC Error Responses

All RBAC endpoints may return the following error responses:

#### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters"
  }
}
```

#### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

#### Role Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "ROLE_NOT_FOUND",
    "message": "Role not found"
  }
}
```

#### System Role Protected (403)
```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_ROLE_PROTECTED",
    "message": "Cannot modify system role"
  }
}
```

#### Conflict (409)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Resource already exists"
  }
}
```

#### Internal Error (500)
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

### RBAC Usage Examples

#### Initialize the RBAC System
```bash
curl -X POST https://your-domain.com/api/rbac/system/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

#### Create a Custom Role
```bash
curl -X POST https://your-domain.com/api/rbac/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "content_editor",
    "name": "Content Editor",
    "description": "Can edit content but not delete",
    "permissions": ["user:read", "task:read", "task:create", "task:update"]
  }'
```

#### Assign Roles to a User
```bash
curl -X POST https://your-domain.com/api/rbac/users/user_123/roles \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["MEMBER", "content_editor"]
  }'
```

#### Check User Permissions
```bash
curl -X POST https://your-domain.com/api/rbac/users/user_123/permissions/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["task:create", "task:delete"],
    "checkType": "any"
  }'
```

#### Get Permissions Grouped by Resource
```bash
curl https://your-domain.com/api/rbac/permissions?groupBy=resource \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### RBAC Best Practices

1. **Use Custom Roles for Specific Needs**: Create custom roles for specific job functions rather than assigning multiple system roles to users.

2. **Follow Principle of Least Privilege**: Only grant the minimum permissions needed for a user to perform their job.

3. **Protect System Roles**: System roles (ADMIN, MANAGER, MEMBER, VIEWER, GUEST) cannot be modified or deleted to maintain system integrity.

4. **Audit Role Changes**: All role and permission changes are logged for security auditing.

5. **Test Permissions**: Always test permission changes in a development environment before applying to production.

6. **Use Role Groups**: When multiple users need the same permissions, create a custom role and assign it to all users.

7. **Regular Review**: Periodically review user roles and permissions to ensure they remain appropriate.

---

## 👥 User Management APIs (RBAC)

### List Users

**Endpoint:** `GET /api/users`

List all users. Requires `user:read` permission.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "MEMBER",
      "status": "active",
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "count": 1,
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Unauthorized
- `403` - Insufficient permissions
- `500` - Internal server error

---

### Create User

**Endpoint:** `POST /api/users`

Create a new user. Requires `user:create` permission.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "MEMBER",
    "createdAt": "2026-03-21T12:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error (missing required fields)
- `401` - Unauthorized
- `403` - Insufficient permissions
- `500` - Internal server error

---

### Update User

**Endpoint:** `PATCH /api/users?id={userId}`

Update user information. Requires `user:update` permission.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User ID to update |

**Request Body:**
```json
{
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.jpg",
  "roles": ["MEMBER", "MODERATOR"],
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar": "https://example.com/avatar.jpg",
    "role": "MEMBER",
    "status": "active",
    "roles": ["MEMBER", "MODERATOR"]
  },
  "meta": {
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error (user ID required)
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - User not found
- `500` - Internal server error

---

### Delete User

**Endpoint:** `DELETE /api/users?id={userId}`

Delete a user. Requires **ADMIN role** (not just permission).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User ID to delete |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123"
  },
  "meta": {
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error (user ID required)
- `401` - Unauthorized
- `403` - Insufficient permissions (requires ADMIN role)
- `404` - User not found
- `500` - Internal server error

---

### Get All Roles

**Endpoint:** `GET /api/users/roles`

List all roles with user counts. Requires `user:manage_role` permission OR MANAGER/ADMIN role.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "role": "ADMIN",
      "count": 2
    },
    {
      "role": "MANAGER",
      "count": 5
    },
    {
      "role": "MEMBER",
      "count": 42
    }
  ],
  "meta": {
    "count": 3,
    "timestamp": "2026-03-21T12:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Unauthorized
- `403` - Insufficient permissions
- `500` - Internal server error

---

## 🔧 Example API Route

### Example with Monitoring

**Endpoint:** `GET /api/example`

Demonstrates the recommended pattern for API routes with monitoring and error handling.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Engineering"
    },
    {
      "id": "2",
      "name": "Design"
    },
    {
      "id": "3",
      "name": "Product"
    }
  ]
}
```

**Endpoint:** `POST /api/example`

Create a new resource with monitoring.

**Request Body:**
```json
{
  "name": "Marketing"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "name": "Marketing",
    "createdAt": "2026-03-21T12:00:00.000Z"
  }
}
```

**Note:** This is a demonstration endpoint showing proper API patterns with monitoring, logging, and error handling.

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
