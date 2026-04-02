# 7zi API Documentation

**Generated**: 2026-03-30
**Version**: v1.4.0
**Protocol**: Next.js App Router API Routes
**Total Endpoints**: 57 REST endpoints + 30+ WebSocket message types

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [GitHub Integration APIs](#github-integration-apis)
3. [Health Check APIs](#health-check-apis)
4. [Database Management APIs](#database-management-apis)
5. [Performance Monitoring APIs](#performance-monitoring-apis)
6. [System Status APIs](#system-status-apis)
7. [CSRF Protection](#csrf-protection)
8. [A2A Integration](#a2a-integration)
9. [Multimodal APIs](#multimodal-apis)
10. [Stream APIs](#stream-apis)
11. [RBAC APIs](#rbac-apis)
12. [User Preferences APIs](#user-preferences-apis)
13. [Monitoring & Metrics APIs](#monitoring--metrics-apis)
14. [Feedback APIs](#feedback-apis)
15. [Projects APIs](#projects-apis)
16. [Tasks APIs](#tasks-apis)
17. [Ratings APIs](#ratings-apis)
18. [Search APIs](#search-apis)
19. [Demo APIs](#demo-apis)
20. [Data Import/Export APIs](#data-importexport-apis)
21. [WebSocket APIs](#websocket-apis)
22. [A2A Registry APIs](#a2a-registry-apis)
23. [User Profile APIs](#user-profile-apis)
24. [Web Vitals APIs](#web-vitals-apis)
25. [Security APIs](#security-apis)
26. [Cache Revalidation APIs](#cache-revalidation-apis)
27. [Server Actions APIs](#server-actions-apis)
28. [Error Handling](#error-handling)

---

## Authentication APIs

### Login

**Endpoint:** `POST /api/auth/login`

**Response (200 OK):**

```json
{
  "success": true,
  "user": { "id": "user_123", "email": "user@example.com", "name": "John Doe" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-20T12:00:00.000Z"
}
```

**Errors:** 400, 401, 500

---

### Register

**Endpoint:** `POST /api/auth/register`

**Response (200 OK):**

```json
{
  "success": true,
  "user": { "id": "user_123", "email": "user@example.com", "name": "John Doe" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:** `Authorization: Bearer <token>`

---

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

---

### Logout

**Endpoint:** `POST /api/auth/logout`

---

## GitHub Integration APIs

### Get Repository Commits

**Endpoint:** `GET /api/github/commits`

**Query Parameters:** owner, repo, per_page, page, sha, path, since, until

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "sha": "abc123",
      "commit": { "author": { "name": "John Doe" }, "message": "feat: add new feature" },
      "html_url": "https://github.com/.../commit/abc123"
    }
  ],
  "pagination": { "page": 1, "per_page": 10, "total": 0 }
}
```

**Errors:** 400, 401, 403, 404

---

### Get Repository Issues

**Endpoint:** `GET /api/github/issues`

**Query Parameters:** owner, repo, state, labels, sort, direction, per_page, page, since

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
      "html_url": "https://github.com/.../issues/42"
    }
  ],
  "pagination": { "page": 1, "per_page": 10, "total": 0 }
}
```

**Errors:** 400, 401, 403, 404, 502, 500

---

## Health Check APIs

### General Health Check

**Endpoint:** `GET /api/health`

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-19T12:00:00.000Z",
    "uptime": 3600.5,
    "version": "1.0.0",
    "checks": {
      "memory": { "status": "ok", "used": 128, "limit": 512 },
      "node": { "status": "ok", "version": "v22.22.0" }
    }
  }
}
```

---

### Live Probe (Kubernetes)

**Endpoint:** `GET /api/health/live`

---

### Ready Probe (Kubernetes)

**Endpoint:** `GET /api/health/ready`

---

### Detailed Health Check

**Endpoint:** `GET /api/health/detailed`

---

## Database Management APIs

### Database Health Check

**Endpoint:** `GET /api/database/health`

---

### Database Optimization Report

**Endpoint:** `GET /api/database/optimize`

---

### Execute Database Optimization

**Endpoint:** `POST /api/database/optimize`

**Actions:** migrate, add-indexes, cleanup, vacuum, analyze, clear-cache, warmup-cache

---

## Performance Monitoring APIs

### Performance Report

**Endpoint:** `GET /api/performance/report`

**Query Parameters:** detailed, minutes

---

### Clear Performance Metrics

**Endpoint:** `DELETE /api/performance/clear`

---

## System Status APIs

### Public Status Page

**Endpoint:** `GET /api/status`

**Query Parameters:** format, include_metrics

---

## CSRF Protection

### Get CSRF Token

**Endpoint:** `GET /api/csrf-token`

---

## A2A Integration

### JSON-RPC Endpoint

**Endpoint:** `POST /api/a2a/jsonrpc`

**Methods:** agent.task.execute, message/send, tasks/get, tasks/list, agent/getCard, agent/getExtendedCard

**JSON-RPC Error Codes:**

- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

---

## Multimodal APIs

### Audio Transcription

**Endpoint:** `POST /api/multimodal/audio`

**Request Body:** multipart/form-data - audio, provider, language, model, timestamps, speakerDiarization

**Max File Size:** 100MB

**Errors:** 400, 413, 415, 503, 504

---

### Image Processing

**Endpoint:** `POST /api/multimodal/image`

**Request Body:** multipart/form-data - image, provider, maxSize, compress, quality

**Max File Size:** 10MB

---

### Get Image Providers

**Endpoint:** `GET /api/multimodal/image`

---

### Get Audio Providers

**Endpoint:** `GET /api/multimodal/audio`

---

## Stream APIs

### Analytics Stream (SSE)

**Endpoint:** `GET /api/stream/analytics`

**Authentication Required:** Yes

**Metrics:** CPU 使用率, 内存使用, 响应时间, 任务完成率

**Errors:** 400, 401, 403

---

### Health Stream (SSE)

**Endpoint:** `GET /api/stream/health`

---

## RBAC APIs

### System Roles

| Role    | Level | Description                             |
| ------- | ----- | --------------------------------------- |
| ADMIN   | 100   | Full system access with all permissions |
| MANAGER | 80    | Manage teams, tasks, and approvals      |
| MEMBER  | 60    | Standard team member with task access   |
| VIEWER  | 40    | Read-only access to all resources       |
| GUEST   | 20    | Limited guest access                    |

### System Status & Initialization

#### Get RBAC System Status

**Endpoint:** `GET /api/rbac/system`

**Required Permission:** system:read or ADMIN

---

#### Initialize RBAC System

**Endpoint:** `POST /api/rbac/system/initialize`

**Required Permission:** ADMIN role

---

#### Reset RBAC System

**Endpoint:** `DELETE /api/rbac/system/reset`

**Required Permission:** ADMIN role

---

### Permissions Management

#### Get All Permissions

**Endpoint:** `GET /api/rbac/permissions`

**Query Parameters:** groupBy (resource, action)

---

### Roles Management

#### Get All Roles

**Endpoint:** `GET /api/rbac/roles`

**Query Parameters:** includeCount

---

#### Create Custom Role

**Endpoint:** `POST /api/rbac/roles`

**Required Permission:** ADMIN role

---

#### Get Role Details

**Endpoint:** `GET /api/rbac/roles/[roleId]`

---

#### Update Role

**Endpoint:** `PUT /api/rbac/roles/[roleId]`

---

#### Delete Role

**Endpoint:** `DELETE /api/rbac/roles/[roleId]`

---

### Role Permissions Management

#### Get Role Permissions

**Endpoint:** `GET /api/rbac/roles/[roleId]/permissions`

---

#### Add Permissions to Role

**Endpoint:** `POST /api/rbac/roles/[roleId]/permissions`

---

#### Remove Permissions from Role

**Endpoint:** `DELETE /api/rbac/roles/[roleId]/permissions`

---

### User Roles Management

#### Get User Roles

**Endpoint:** `GET /api/rbac/users/[userId]/roles`

---

#### Add Roles to User

**Endpoint:** `POST /api/rbac/users/[userId]/roles`

---

#### Remove Roles from User

**Endpoint:** `DELETE /api/rbac/users/[userId]/roles`

---

### User Permissions Management

#### Get User Permissions

**Endpoint:** `GET /api/rbac/users/[userId]/permissions`

---

#### Check User Permissions

**Endpoint:** `POST /api/rbac/users/[userId]/permissions/check`

---

## User Preferences APIs

### Get User Preferences

**Endpoint:** `GET /api/user/preferences`

---

### Create User Preferences

**Endpoint:** `POST /api/user/preferences`

---

### Update User Preferences

**Endpoint:** `PUT /api/user/preferences`

---

## Monitoring & Metrics APIs

### Performance Metrics

**Endpoint:** `GET /api/metrics/performance`

**Query Parameters:** category, period

---

### Prometheus Metrics

**Endpoint:** `GET /api/metrics/prometheus`

---

## Feedback APIs

### Get Feedback List

**Endpoint:** `GET /api/feedback`

**Query Parameters:** page, per_page, type, status, priority, user_id, rating_min, rating_max, start_date, end_date, search, sort_by, sort_order

---

### Create Feedback

**Endpoint:** `POST /api/feedback`

---

### Get Single Feedback

**Endpoint:** `GET /api/feedback/[id]`

---

### Update Feedback

**Endpoint:** `PATCH /api/feedback/[id]`

---

### Delete Feedback

**Endpoint:** `DELETE /api/feedback/[id]`

---

## Projects APIs

### List Projects

**Endpoint:** `GET /api/projects`

---

### Create Project

**Endpoint:** `POST /api/projects`

---

## Tasks APIs

### List Tasks

**Endpoint:** `GET /api/tasks`

**Query Parameters:** status, agent_id, priority, limit

---

### Create Task

**Endpoint:** `POST /api/tasks`

---

## Ratings APIs

### List Ratings

**Endpoint:** `GET /api/ratings`

**Query Parameters:** user_id, target_type, target_id, min_score, max_score

---

### Create Rating

**Endpoint:** `POST /api/ratings`

---

### Get Rating

**Endpoint:** `GET /api/ratings/[id]`

---

### Update Rating

**Endpoint:** `PATCH /api/ratings/[id]`

---

### Delete Rating

**Endpoint:** `DELETE /api/ratings/[id]`

---

### Mark Helpful

**Endpoint:** `POST /api/ratings/[id]/helpful`

---

## Search APIs

### Search

**Endpoint:** `GET /api/search`

**Query Parameters:** q, type, limit, offset

---

### Autocomplete

**Endpoint:** `GET /api/search/autocomplete`

---

### Search History

**Endpoint:** `GET /api/search/history`

---

## Demo APIs

### Demo Task Status

**Endpoint:** `GET /api/demo/task-status`

---

## Data Import/Export APIs

### Export Data

**Endpoint:** `POST /api/data/export`

**Request Body:**

```json
{
  "format": "json",
  "types": ["tasks", "projects", "users"],
  "filters": { "dateRange": { "start": "2026-03-01", "end": "2026-03-31" } }
}
```

---

### Import Data

**Endpoint:** `POST /api/data/import`

**Request Body:** multipart/form-data - file, format, dryRun

---

## WebSocket APIs (v1.4.0)

WebSocket 通过 Socket.IO 库实现，不提供独立的 REST API 端点。连接通过 Socket.IO 客户端建立。

### 房间管理 API (WebSocket 消息)

| 消息类型       | 描述         | 权限要求    |
| -------------- | ------------ | ----------- |
| createRoom     | 创建新房间   | 无          |
| joinRoom       | 加入房间     | room:join   |
| leaveRoom      | 离开房间     | 无          |
| kickUser       | 踢出用户     | room:kick   |
| banUser        | 封禁用户     | room:ban    |
| unbanUser      | 解除封禁     | room:ban    |
| changeUserRole | 更改用户角色 | room:manage |
| inviteUser     | 邀请用户     | room:invite |
| updateCursor   | 更新光标位置 | 无          |
| updateTyping   | 更新输入状态 | 无          |

**房间类型:** task | project | chat | document | voice | video
**房间可见性:** public | private | invite-only

---

### 权限控制 API

| 消息类型           | 描述         | 权限要求                 |
| ------------------ | ------------ | ------------------------ |
| grantPermission    | 授予权限     | admin:manage_permissions |
| revokePermission   | 撤销权限     | admin:manage_permissions |
| checkPermission    | 检查权限     | 无                       |
| getUserPermissions | 获取用户权限 | 无                       |

**用户角色:** owner | admin | moderator | member | guest

**权限类型:**

- 房间权限: room:join, room:leave, room:manage, room:view, room:invite, room:kick, room:ban
- 消息权限: message:send, message:edit, message:delete, message:react, message:pin, message:view_history
- 管理权限: admin:manage_users, admin:manage_rooms, admin:manage_permissions, admin:ban_users, admin:view_logs, admin:system_announce

---

### 消息持久化 API

| 消息类型          | 描述         | 权限要求             |
| ----------------- | ------------ | -------------------- |
| storeMessage      | 存储消息     | message:send         |
| editMessage       | 编辑消息     | message:edit         |
| deleteMessage     | 删除消息     | message:delete       |
| addReaction       | 添加反应     | message:react        |
| removeReaction    | 移除反应     | message:react        |
| pinMessage        | 置顶消息     | message:pin          |
| unpinMessage      | 取消置顶     | message:pin          |
| getHistory        | 获取历史     | message:view_history |
| getPinnedMessages | 获取置顶消息 | message:view_history |

---

## A2A Registry APIs

### List Agents

**Endpoint:** `GET /api/a2a/registry`

---

### Register Agent

**Endpoint:** `POST /api/a2a/registry`

---

### Get Agent

**Endpoint:** `GET /api/a2a/registry/[id]`

---

### Update Agent

**Endpoint:** `PUT /api/a2a/registry/[id]`

---

### Agent Heartbeat

**Endpoint:** `POST /api/a2a/registry/[id]/heartbeat`

---

### A2A Queue

**Endpoint:** `POST /api/a2a/queue`

---

## User Profile APIs

### Get User Preferences

**Endpoint:** `GET /api/user/preferences`

---

### Update User Preferences

**Endpoint:** `PUT /api/user/preferences`

---

### Get User Activity

**Endpoint:** `GET /api/users/[userId]/activity`

---

### Update User Avatar

**Endpoint:** `PUT /api/users/[userId]/avatar`

---

### Batch Operations

**Endpoint:** `POST /api/users/batch`
**Endpoint:** `POST /api/users/batch/bulk`

---

## Web Vitals APIs

### Report Web Vitals

**Endpoint:** `POST /api/web-vitals`

---

### Report Vitals

**Endpoint:** `POST /api/vitals`

---

## Security APIs

### CSP Violation Report

**Endpoint:** `POST /api/csp-violation`

---

## Cache Revalidation APIs

### Revalidate Path

**Endpoint:** `POST /api/revalidate`

---

### Revalidate Tag (Legacy)

**Endpoint:** `POST /api/revalidate/tag`

---

## Server Actions APIs

### cacheLife Profiles (Next.js 16)

| Profile | Revalidate | Expire  | Use Case         |
| ------- | ---------- | ------- | ---------------- |
| max     | 365 days   | Never   | Static resources |
| hours   | 1-23h      | 1 day   | Daily updates    |
| minutes | 1-59m      | 1 hour  | Frequent updates |
| min     | Short      | Short   | Real-time data   |
| days    | 1-6d       | 1 week  | Weekly reports   |
| weeks   | 1-3w       | 1 month | Monthly reports  |
| months  | 1-11m      | 1 year  | Yearly data      |
| default | Page route | -       | Default config   |

---

### updateTag()

Incremental cache tag updates for "read-your-writes" semantics.

```typescript
import { unstable_updateTag as updateTag } from 'next/cache'

await updateTag('posts')
```

---

### refresh()

Intelligent data refresh without touching existing cache.

```typescript
import { unstable_refresh as refresh } from 'next/cache'

const data = await refresh(async () => await fetchData(), { tags: ['dashboard'], dedupe: 5000 })
```

---

## Error Handling

All API endpoints return errors in a consistent JSON format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

### Common Error Codes

| Status | Code                | Description                     |
| ------ | ------------------- | ------------------------------- |
| 400    | VALIDATION_ERROR    | Invalid parameters              |
| 401    | UNAUTHORIZED        | Missing or invalid token        |
| 403    | FORBIDDEN           | Insufficient permissions        |
| 404    | NOT_FOUND           | Resource not found              |
| 429    | RATE_LIMIT_EXCEEDED | Too many requests               |
| 500    | INTERNAL_ERROR      | Server error                    |
| 503    | SERVICE_UNAVAILABLE | Service temporarily unavailable |

---

## Rate Limiting

- GitHub API: 60/hour (unauthenticated), 5000/hour (authenticated)
- Configure `GITHUB_TOKEN` environment variable for higher limits

---

**Generated from API.md (v1.4.0) - 2026-03-30**
