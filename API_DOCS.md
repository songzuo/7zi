# API Documentation

> Generated: 2026-03-13  
> Base URL: `http://localhost:3001/api`

## Table of Contents

- [Authentication](#authentication)
- [Tasks](#tasks)
- [Projects](#projects)
- [Logs](#logs)
- [Health](#health)
- [Knowledge](#knowledge)
- [Notifications](#notifications)
- [Status](#status)
- [Errors](#errors)

---

## Authentication

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth?action=me` | Get current user |
| GET | `/api/auth?action=csrf` | Get CSRF token |
| GET | `/api/auth?action=check-secret` | Check JWT secret strength |

### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "admin@7zi.studio",
  "password": "admin123"
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "email": "admin@7zi.studio",
    "name": "Administrator",
    "role": "admin"
  },
  "csrfToken": "csrf-token-value"
}
```

**Response (401):**

```json
{
  "error": "Invalid email or password"
}
```

### POST /api/auth/logout

Logout current user.

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh

Refresh access token using refresh cookie.

**Headers:**

- `Cookie`: `refresh_token=<token>`

**Response (200):**

```json
{
  "success": true,
  "accessToken": "new-access-token"
}
```

### GET /api/auth?action=csrf

Get CSRF token for form submissions.

**Response (200):**

```json
{
  "success": true,
  "csrfToken": "csrf-token-value"
}
```

### GET /api/auth?action=me

Get current authenticated user.

**Headers:**

- `Cookie`: `access_token=<token>`

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "email": "admin@7zi.studio",
    "name": "Administrator",
    "role": "admin",
    "permissions": ["read", "write", "delete", "admin"]
  }
}
```

---

## Tasks

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get task list |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks` | Update task |
| DELETE | `/api/tasks?id=<id>` | Delete task (admin only) |
| POST | `/api/tasks/[id]/assign` | AI assign task |

### GET /api/tasks

Get filtered task list.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (pending, assigned, in_progress, completed) |
| type | string | Filter by type (research, development, other) |
| assignee | string | Filter by assignee ID |

**Example:**

```bash
GET /api/tasks?status=pending&type=research
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "task-001",
      "title": "分析市场趋势",
      "description": "研究当前 AI 代理市场的趋势和竞争对手",
      "type": "research",
      "priority": "high",
      "status": "completed",
      "assignee": "agent-world-expert",
      "createdBy": "user",
      "createdAt": "2026-03-05T10:00:00Z",
      "updatedAt": "2026-03-06T15:30:00Z",
      "comments": [],
      "history": [...]
    }
  ],
  "timestamp": "2026-03-13T17:41:47.084Z"
}
```

### POST /api/tasks

Create a new task.

**Request Body:**

```json
{
  "title": "新任务标题",
  "description": "任务描述（可选）",
  "type": "development",
  "priority": "high",
  "assignee": "architect"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Task title |
| description | string | No | Task description |
| type | string | No | Task type (research, development, other) |
| priority | string | No | Priority (low, medium, high) |
| assignee | string | No | AI team member ID |

**Response (201):**

```json
{
  "id": "task-xxx",
  "title": "新任务标题",
  "description": "任务描述",
  "type": "development",
  "priority": "high",
  "status": "pending",
  "assignee": "architect",
  "createdBy": "user",
  "createdAt": "2026-03-13T17:50:00Z",
  "updatedAt": "2026-03-13T17:50:00Z",
  "comments": [],
  "history": [...]
}
```

### PUT /api/tasks

Update an existing task.

**Request Body:**

```json
{
  "id": "task-001",
  "status": "in_progress",
  "assignee": "architect",
  "comment": "开始处理"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Task ID |
| status | string | No | New status |
| assignee | string | No | New assignee |
| comment | string | No | Add a comment |

**Response (200):**

```json
{
  "id": "task-001",
  "title": "分析市场趋势",
  "status": "in_progress",
  "assignee": "architect",
  ...
}
```

### DELETE /api/tasks

Delete a task (requires admin).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Task ID to delete |

**Headers:**

- `Cookie`: `access_token=<admin_token>`
- `X-CSRF-Token`: `<csrf_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Task deleted successfully",
  "task": { ... }
}
```

### POST /api/tasks/[id]/assign

AI-powered task assignment.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Task ID |

**Request Body:**

```json
{
  "autoAssign": true,
  "preferredMemberId": "architect"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| autoAssign | boolean | Automatically assign to best candidate |
| preferredMemberId | string | Specific team member to assign |

**Response - Auto Assign (200):**

```json
{
  "success": true,
  "message": "Task automatically assigned to Architect",
  "assignedTo": {
    "id": "architect",
    "name": "Architect",
    "confidence": 95
  },
  "task": { ... }
}
```

**Response - Suggestions Only (200):**

```json
{
  "success": false,
  "message": "AI assignment suggestions generated",
  "suggestions": [
    {
      "memberId": "architect",
      "memberName": "Architect",
      "confidence": 95,
      "reason": "匹配专业领域 (development), 当前可用"
    }
  ],
  "task": { ... }
}
```

---

## Projects

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get project list |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/[id]` | Get project details |
| PUT | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/projects/[id]/tasks` | Get project tasks |

### GET /api/projects

Get filtered project list.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (active, paused, completed) |
| priority | string | Filter by priority (low, medium, high) |
| assignee | string | Filter by team member |

**Example:**

```bash
GET /api/projects?status=active&priority=high
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "proj-001",
      "title": "AI-Powered Analytics Dashboard",
      "description": "A comprehensive analytics platform...",
      "status": "active",
      "priority": "high",
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2026-09-01T00:00:00Z",
      "members": ["agent-world-expert", "architect", "executor"],
      "metadata": {
        "category": "website",
        "client": "TechCorp Solutions",
        "budget": 50000
      },
      "createdAt": "2026-03-01T10:00:00Z",
      "updatedAt": "2026-03-01T10:00:00Z"
    }
  ]
}
```

### POST /api/projects

Create a new project.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Request Body:**

```json
{
  "title": "New Project",
  "description": "Project description",
  "status": "active",
  "priority": "high",
  "startDate": "2026-03-15T00:00:00Z",
  "endDate": "2026-06-15T00:00:00Z",
  "members": ["architect", "executor"],
  "metadata": {
    "category": "website",
    "budget": 25000
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "proj-xxx",
    "title": "New Project",
    ...
  }
}
```

### GET /api/projects/[id]

Get project details.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Project ID |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "proj-001",
    "title": "AI-Powered Analytics Dashboard",
    ...
  }
}
```

### PUT /api/projects/[id]

Update project.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Request Body:**

```json
{
  "status": "completed",
  "priority": "medium"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { ... }
}
```

### DELETE /api/projects/[id]

Delete project.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Project deleted"
}
```

---

## Logs

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Query logs |
| DELETE | `/api/logs?days=<n>` | Delete old logs (admin) |
| GET | `/api/logs/export` | Export logs (JSON/CSV) |

### GET /api/logs

Query application logs.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startTime | string | Start time (ISO 8601) |
| endTime | string | End time (ISO 8601) |
| levels | string | Comma-separated levels (info,warn,error) |
| categories | string | Comma-separated categories |
| search | string | Search text |
| userId | string | Filter by user ID |
| route | string | Filter by route |
| page | number | Page number (default: 1) |
| limit | number | Items per page (max: 1000) |
| orderBy | string | Order by (timestamp, level) |
| order | string | Order direction (asc, desc) |

**Example:**

```bash
GET /api/logs?levels=error&startTime=2026-03-01T00:00:00Z&limit=50
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 150,
    "page": 1,
    "limit": 100
  }
}
```

### DELETE /api/logs

Delete logs older than specified days (admin only).

**Headers:**

- `Cookie`: `access_token=<admin_token>`
- `X-CSRF-Token`: `<csrf_token>`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Delete logs older than N days (1-365) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "deleted": 500,
    "message": "Deleted 500 log entries older than 30 days",
    "deletedBy": "admin@7zi.studio",
    "deletedAt": "2026-03-13T17:00:00Z"
  }
}
```

### GET /api/logs/export

Export logs in JSON or CSV format.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (ISO 8601) |
| endDate | string | End date (ISO 8601) |
| level | string | Log level |
| levels | string | Comma-separated levels |
| category | string | Log category |
| categories | string | Comma-separated categories |
| search | string | Search text |
| limit | number | Max records (max: 10000) |
| format | string | Export format (json, csv) |

**Example:**

```bash
GET /api/logs/export?startDate=2026-03-01&format=csv
```

**Response:** Downloads file with headers:
- `Content-Type`: `text/csv` or `application/json`
- `Content-Disposition`: `attachment; filename="logs-export-2026-03-13.csv"`

---

## Health

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| HEAD | `/api/health` | Lightweight health check |
| GET | `/api/health/ready` | Kubernetes readiness probe |
| GET | `/api/health/live` | Kubernetes liveness probe |
| GET | `/api/health/detailed` | Detailed health report |

### GET /api/health

Basic health check with component status.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| history | boolean | Include health check history |

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-13T17:41:40.792Z",
  "version": "main",
  "uptime": 29,
  "environment": "development",
  "responseTime": 611,
  "components": {
    "cache": "ok",
    "auth": "ok",
    "logger": "ok"
  }
}
```

### GET /api/health/ready

Kubernetes readiness probe - checks if service is ready to accept traffic.

**Response:** 200 OK when ready, 503 when not ready.

### GET /api/health/live

Kubernetes liveness probe - checks if container should be restarted.

**Response:** 200 OK when alive.

### GET /api/health/detailed

Comprehensive health report with system metrics.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| include | string | Sections to include (system,services,configuration,components,history) |
| history | boolean | Include health check history |

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-13T17:41:40.792Z",
  "version": "main",
  "uptime": 29,
  "environment": "development",
  "responseTime": 611,
  "components": {
    "cache": "ok",
    "auth": "ok",
    "logger": "ok"
  },
  "system": {
    "memory": { "used": 51200000, "total": 1024000000 },
    "cpu": { "usage": 0.15 },
    "process": { "pid": 1234, "uptime": 29 }
  },
  "services": {
    "database": { "status": "ok", "latency": 5 },
    "redis": { "status": "ok", "latency": 2 }
  }
}
```

---

## Knowledge

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge/nodes` | Get knowledge nodes |
| POST | `/api/knowledge/nodes` | Create knowledge node |
| GET | `/api/knowledge/nodes/[id]` | Get node details |
| PUT | `/api/knowledge/nodes/[id]` | Update node |
| DELETE | `/api/knowledge/nodes/[id]` | Delete node |
| GET | `/api/knowledge/edges` | Get knowledge edges |
| POST | `/api/knowledge/edges` | Create knowledge edge |
| POST | `/api/knowledge/query` | Query knowledge lattice |
| POST | `/api/knowledge/inference` | Knowledge inference |
| GET | `/api/knowledge/lattice` | Get full lattice |

### GET /api/knowledge/nodes

Get knowledge nodes with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by knowledge type |
| source | string | Filter by source |
| tags | string | Comma-separated tags |
| minWeight | number | Minimum weight filter |
| minConfidence | number | Minimum confidence filter |
| limit | number | Max results |
| offset | number | Results offset |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "node-xxx",
      "content": "Knowledge content",
      "type": "concept",
      "weight": 0.8,
      "confidence": 0.9,
      "source": "user",
      "tags": ["ai", "ml"],
      "metadata": {},
      "timestamp": 1700000000000
    }
  ],
  "pagination": {
    "total": 100,
    "offset": 0,
    "limit": 50
  }
}
```

### POST /api/knowledge/nodes

Create a new knowledge node.

**Request Body:**

```json
{
  "content": "Knowledge content here",
  "type": "concept",
  "weight": 0.8,
  "confidence": 0.9,
  "source": "user",
  "tags": ["ai", "ml"],
  "metadata": {
    "key": "value"
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Knowledge content |
| type | string | Yes | Knowledge type (concept, fact, task, question) |
| weight | number | No | Weight (0-1) |
| confidence | number | No | Confidence (0-1) |
| source | string | No | Source (user, ai, system) |
| tags | array | No | Tags |
| metadata | object | No | Additional metadata |

**Response (201):**

```json
{
  "success": true,
  "data": { ... }
}
```

### GET /api/knowledge/edges

Get knowledge edges (relationships between nodes).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by relation type |
| from | string | Filter by source node ID |
| to | string | Filter by target node ID |
| minWeight | number | Minimum weight |
| limit | number | Max results |
| offset | number | Results offset |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "edge-xxx",
      "from": "node-1",
      "to": "node-2",
      "type": "relates_to",
      "weight": 0.7,
      "timestamp": 1700000000000,
      "metadata": {}
    }
  ],
  "pagination": { ... }
}
```

### POST /api/knowledge/edges

Create a knowledge edge.

**Request Body:**

```json
{
  "from": "node-1-id",
  "to": "node-2-id",
  "type": "relates_to",
  "weight": 0.7,
  "metadata": {}
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { ... }
}
```

### POST /api/knowledge/query

Query the knowledge lattice.

**Request Body:**

```json
{
  "type": "concept",
  "source": "user",
  "tags": ["ai"],
  "minWeight": 0.5,
  "minConfidence": 0.5,
  "searchText": "artificial intelligence",
  "limit": 20
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "relevanceScores": [0.95, 0.87, ...],
    "edges": [...],
    "total": 15
  }
}
```

### POST /api/knowledge/inference

Perform knowledge inference.

**Request Body:**

```json
{
  "query": "What relates to X?",
  "depth": 2,
  "maxNodes": 50
}
```

### GET /api/knowledge/lattice

Get the full knowledge lattice structure.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "edges": [...]
  }
}
```

---

## Notifications

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notification list |
| POST | `/api/notifications` | Create new notification |
| PUT | `/api/notifications` | Mark as read / Mark all read |
| DELETE | `/api/notifications` | Delete notification / Clear all |

### GET /api/notifications

Get filtered notification list.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | Filter by user ID |
| type | string | Filter by type (task_assigned, project_update, mention, system_alert) |
| read | boolean | Filter by read status |
| limit | number | Max results (default: 50) |
| offset | number | Results offset |

**Example:**

```bash
GET /api/notifications?userId=user-001&read=false&limit=10
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "type": "task_assigned",
      "title": "新任务分配",
      "message": "您被分配了新任务：市场分析",
      "userId": "user-001",
      "read": false,
      "priority": "high",
      "link": "/tasks/task-123",
      "metadata": {},
      "createdAt": "2026-03-13T18:00:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

### POST /api/notifications

Create a new notification.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Request Body:**

```json
{
  "type": "task_assigned",
  "title": "新任务分配",
  "message": "您被分配了新任务",
  "userId": "user-001",
  "priority": "high",
  "link": "/tasks/task-123",
  "metadata": {}
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Notification type (task_assigned, project_update, mention, system_alert) |
| title | string | Yes | Notification title |
| message | string | Yes | Notification message |
| userId | string | Yes | Target user ID |
| priority | string | No | Priority (low, medium, high) |
| link | string | No | Link to related content |
| metadata | object | No | Additional metadata |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "notif-xxx",
    "type": "task_assigned",
    "title": "新任务分配",
    "message": "您被分配了新任务",
    "userId": "user-001",
    "read": false,
    "priority": "high",
    "link": "/tasks/task-123",
    "metadata": {},
    "createdAt": "2026-03-13T18:00:00Z",
    "readAt": null
  }
}
```

### PUT /api/notifications

Mark notifications as read.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Request Body:**

```json
{
  "id": "notif-001",
  "read": true
}
```

Or mark all as read:

```json
{
  "markAllRead": true
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Notification ID to mark as read |
| read | boolean | Set read status |
| markAllRead | boolean | Mark all user notifications as read |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "notif-001",
    "read": true,
    "readAt": "2026-03-13T18:30:00Z"
  }
}
```

**Mark All Response:**

```json
{
  "success": true,
  "message": "10 notifications marked as read",
  "count": 10
}
```

### DELETE /api/notifications

Delete a notification or clear all notifications.

**Headers:**

- `Cookie`: `access_token=<token>`
- `X-CSRF-Token`: `<csrf_token>`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Notification ID to delete |
| deleteAll | boolean | Delete all user notifications |

**Example - Delete single:**

```bash
DELETE /api/notifications?id=notif-001
```

**Example - Clear all:**

```bash
DELETE /api/notifications?deleteAll=true
```

**Response (200):**

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

**Clear All Response:**

```json
{
  "success": true,
  "message": "15 notifications deleted",
  "count": 15
}
```

---

## Status

### GET /api/status

Get public system status for status page.

**Response (200):**

```json
{
  "status": "operational",
  "lastUpdated": "2026-03-13T17:41:41.690Z",
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

**Service Status Values:**
- `operational` - Service is running normally
- `degraded` - Service is experiencing issues
- `outage` - Service is down

---

## Errors

### Error Response Format

All API errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human readable message",
  "code": "ERROR_CODE" // optional
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Error Types

| Error | Common Causes |
|-------|---------------|
| AUTH_REQUIRED | Missing authentication token |
| AUTH_INVALID | Invalid or expired token |
| ADMIN_REQUIRED | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Invalid request body |

---

## Authentication Notes

- Most endpoints require authentication via `access_token` cookie
- Admin-only endpoints require `role: admin` in JWT payload
- CSRF protection is enforced via `X-CSRF-Token` header for state-changing operations
- Development credentials: `admin@7zi.studio` / `admin123`

---

*Generated by 7zi API Documentation Generator*

---

## 客户端错误日志 API (2026-03-14 新增)

### 概述
用于收集前端应用的客户端错误，支持错误追踪和调试。

### 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/log-error | 上报前端错误 | 可选 |
| GET | /api/log-error | 获取错误统计 | 必需（管理员） |

### POST /api/log-error

上报前端错误。

**请求体:**
```json
{
  "message": "Uncaught TypeError: Cannot read property 'foo' of undefined",
  "stack": "at App.tsx:25:30",
  "componentStack": "at Component\nat Page",
  "url": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "timestamp": "2026-03-14T21:00:00Z"
}
```

**响应:**
```json
{
  "success": true,
  "requestId": "err-1234567890-abc123",
  "message": "错误已记录"
}
```

### GET /api/log-error

获取错误统计（需要管理员权限）。

**响应:**
```json
{
  "success": true,
  "data": [...],
  "total": 150
}
```

---

## 更新日志 (2026-03-14)

- ✅ 新增客户端错误日志 API (`/api/log-error`)
- ✅ Projects API 已实现文件持久化
- ✅ Tasks API 已实现文件持久化
- ✅ CSRF 中间件已优化为模块级单例
- ✅ KnowledgeLattice EventEmitter 监听器限制已设置

---

## 通知偏好设置 API (2026-03-15 新增)

### 概述
用于管理用户通知偏好设置，包括不同通知渠道和类型的开关配置。

### 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/notifications/preferences | 获取用户偏好设置 | 可选 |
| PUT | /api/notifications/preferences | 更新用户偏好设置 | 可选 |
| POST | /api/notifications/preferences/reset | 重置为默认设置 | 可选 |

### GET /api/notifications/preferences

获取用户通知偏好设置。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID（默认: default-user） |

**响应 (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "channels": {
      "inApp": true,
      "email": true,
      "slack": false
    },
    "types": {
      "taskAssigned": { "enabled": true, "channel": ["inApp", "email"] },
      "taskCompleted": { "enabled": true, "channel": ["inApp"] },
      "projectUpdate": { "enabled": true, "channel": ["inApp"] },
      "mention": { "enabled": true, "channel": ["inApp", "email", "slack"] },
      "system": { "enabled": true, "channel": ["inApp"] }
    },
    "updatedAt": "2026-03-15T01:30:00Z"
  }
}
```

### PUT /api/notifications/preferences

更新用户通知偏好设置。

**请求体:**
```json
{
  "userId": "user-001",
  "channels": {
    "inApp": true,
    "email": false,
    "slack": true
  },
  "types": {
    "taskAssigned": { "enabled": true, "channel": ["inApp"] },
    "taskCompleted": { "enabled": false, "channel": [] },
    "projectUpdate": { "enabled": true, "channel": ["inApp", "slack"] },
    "mention": { "enabled": true, "channel": ["inApp", "email", "slack"] },
    "system": { "enabled": true, "channel": ["inApp"] }
  }
}
```

**响应 (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Notification preferences updated"
}
```

### POST /api/notifications/preferences/reset

重置用户偏好设置为默认值。

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID（默认: default-user） |

**响应 (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Preferences reset to defaults"
}
```
