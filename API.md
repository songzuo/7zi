# 7zi-frontend API 文档

> 最后更新: 2026-03-07

本文档描述了 7zi-frontend 项目的所有 API 端点。

---

## 目录

- [概览](#概览)
- [状态 API](#状态-api)
  - [GET /api/status](#get-apistatus)
- [健康检查 API](#健康检查-api)
  - [GET /api/health](#get-apihealth)
  - [GET /api/health/live](#get-apihealthlive)
  - [GET /api/health/ready](#get-apihealthready)
  - [GET /api/health/detailed](#get-apihealthdetailed)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

---

## 概览

| 端点 | 方法 | 用途 | 认证 |
|------|------|------|------|
| `/api/status` | GET | 公开状态页面信息 | 无需 |
| `/api/health` | GET | 基础健康检查 | 无需 |
| `/api/health/live` | GET | Kubernetes 存活探针 | 无需 |
| `/api/health/ready` | GET | Kubernetes 就绪探针 | 无需 |
| `/api/health/detailed` | GET | 详细健康检查（含依赖） | 无需 |

---

## 状态 API

### GET /api/status

返回公开的系统状态信息，用于状态页面展示。

#### 请求

```http
GET /api/status
```

**参数**: 无

#### 响应

**成功响应 (200 OK)**

```json
{
  "status": "operational",
  "lastUpdated": "2026-03-07T00:20:00.000Z",
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

#### 字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `status` | string | 整体状态: `operational` \| `degraded` \| `outage` |
| `lastUpdated` | string | ISO 8601 时间戳 |
| `services` | array | 服务列表 |
| `services[].name` | string | 服务名称 |
| `services[].status` | string | 服务状态 |
| `services[].uptime` | number | 30天正常运行率 (%) |
| `services[].responseTime` | number | 响应时间 (ms) |
| `metrics` | object | 过去24小时指标 |
| `metrics.requests` | number | 总请求数 |
| `metrics.errors` | number | 错误数 |
| `metrics.avgResponseTime` | number | 平均响应时间 (ms) |
| `metrics.p95ResponseTime` | number | P95 响应时间 (ms) |
| `incidents` | array | 近30天事件列表 |
| `maintenance` | array | 计划维护列表 |

---

## 健康检查 API

### GET /api/health

基础健康检查端点，用于 Kubernetes/Docker 健康检查和负载均衡器探测。

#### 请求

```http
GET /api/health
```

**参数**: 无

**注意**: 此端点禁用缓存 (`force-dynamic`)

#### 响应

**健康 (200 OK)**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "uptime": 86400,
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
}
```

**不健康 (503 Service Unavailable)**

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "error": "Health check failed"
}
```

#### 字段说明

| 字段 | 类型 | 描述 |
|------|------|------|
| `status` | string | `healthy` \| `unhealthy` |
| `timestamp` | string | ISO 8601 时间戳 |
| `uptime` | number | 进程运行时间 (秒) |
| `version` | string | 应用版本 |
| `checks.memory` | object | 内存检查结果 |
| `checks.memory.used` | number | 已用堆内存 (MB) |
| `checks.memory.limit` | number | 内存限制 (MB)，默认 512MB |
| `checks.node` | object | Node.js 检查结果 |
| `checks.node.version` | string | Node.js 版本 |

#### 健康判定逻辑

- **健康**: 堆内存使用 < 90% 限制 (默认 < 460.8MB)
- **不健康**: 堆内存使用 >= 90% 限制

---

### GET /api/health/live

Kubernetes **存活探针** (Liveness Probe)。

用于判断容器是否需要重启。如果进程正在运行，总是返回 200。

#### 请求

```http
GET /api/health/live
```

#### 响应

**成功 (200 OK)**

```json
{
  "status": "alive"
}
```

#### Kubernetes 配置示例

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

### GET /api/health/ready

Kubernetes **就绪探针** (Readiness Probe)。

用于判断容器是否准备好接收流量。只有当所有关键依赖可用时才返回 200。

#### 请求

```http
GET /api/health/ready
```

#### 响应

**就绪 (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "ok",
      "latency": 85
    }
  }
}
```

**降级 (200 OK)**

```json
{
  "status": "degraded",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "error",
      "message": "Resend API returned status 500"
    }
  }
}
```

**不可用 (503 Service Unavailable)**

```json
{
  "status": "error",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "error",
      "message": "Network timeout"
    },
    "emailService": {
      "status": "error",
      "message": "Connection refused"
    }
  }
}
```

#### 检查的依赖

| 依赖 | 检查方式 | 超时 |
|------|----------|------|
| GitHub API | GET https://api.github.com/zen | 5s |
| Resend API | GET https://api.resend.com/domains | 5s |

**注意**: 如果未配置 `RESEND_API_KEY` 环境变量，邮件服务检查将被跳过。

#### Kubernetes 配置示例

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 10
  failureThreshold: 3
```

---

### GET /api/health/detailed

详细健康检查，返回完整的服务状态和依赖检查结果。

#### 请求

```http
GET /api/health/detailed
```

#### 响应

与 `/api/health/ready` 响应格式相同，但包含更详细的检查信息。

**成功 (200 OK)**

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 120
    },
    "emailService": {
      "status": "ok",
      "message": "Resend API key not configured"
    }
  }
}
```

#### 状态判定

| 整体状态 | 条件 |
|----------|------|
| `ok` | 所有检查通过 |
| `degraded` | 部分检查失败 |
| `error` | 所有检查失败 |

---

## 实时通知 API

### WebSocket 连接

#### 连接端点

```http
WS /api/realtime/ws
```

**参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| `token` | string | JWT 认证令牌 (可选) |
| `channels` | string | 订阅频道列表 (逗号分隔) |

#### 消息类型

| 类型 | 描述 | 负载 |
|------|------|------|
| `task:status_changed` | 任务状态变更 | `{ taskId, oldStatus, newStatus, changedBy }` |
| `task:assigned` | 任务分配 | `{ taskId, taskTitle, assignedTo, assignedBy }` |
| `task:comment` | 任务评论 | `{ taskId, commentId, content, author, mentions }` |
| `member:online` | 成员上线 | `{ userId, userName, avatar }` |
| `member:offline` | 成员离线 | `{ userId, userName, avatar, lastOnline }` |
| `member:status_changed` | 成员状态变更 | `{ userId, userName, oldStatus, newStatus }` |
| `system:announcement` | 系统公告 | `{ title, content, level, sender }` |
| `project:updated` | 项目更新 | `{ projectId, projectName, changeType, changedBy }` |

#### 消息格式

```json
{
  "type": "task:assigned",
  "id": "msg-1234567890",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "payload": {
    "title": "新任务分配",
    "message": "管理员 将 \"完成首页设计\" 分配给了 成员A",
    "priority": "high",
    "data": {
      "taskId": "task-123",
      "taskTitle": "完成首页设计",
      "assignedTo": { "id": "user-4", "name": "成员A" },
      "assignedBy": { "id": "user-1", "name": "管理员" }
    },
    "actionUrl": "/tasks/task-123",
    "actionText": "查看任务",
    "icon": "📌"
  }
}
```

### 通知历史 API

#### GET /api/realtime/notifications

获取用户的通知历史。

**请求**:

```http
GET /api/realtime/notifications?limit=50
```

**参数**:

| 参数 | 类型 | 描述 | 必需 |
|------|------|------|------|
| `limit` | number | 返回数量限制 (默认: 50) | 否 |

**响应**:

```json
{
  "notifications": [
    {
      "id": "msg-1234567890",
      "type": "task_assigned",
      "title": "新任务分配",
      "message": "管理员 将 \"完成首页设计\" 分配给了 成员A",
      "timestamp": "2026-03-17T12:00:00.000Z",
      "priority": "high",
      "data": { ... },
      "read": false
    }
  ],
  "unreadCount": 5
}
```

#### POST /api/realtime/notifications/read

标记通知为已读。

**请求**:

```http
POST /api/realtime/notifications/read
```

**请求体**:

```json
{
  "notificationIds": ["msg-1234567890", "msg-1234567891"]
}
```

**响应**:

```json
{
  "success": true,
  "marked": 2
}
```

#### GET /api/realtime/notifications/unread-count

获取未读通知数量。

**请求**:

```http
GET /api/realtime/notifications/unread-count
```

**响应**:

```json
{
  "count": 5
}
```

---

## A2A 协议 API

### A2A Agent Card

#### GET /api/a2a/agent-card

获取 A2A Agent Card 信息。

**请求**:

```http
GET /api/a2a/agent-card
```

**响应**:

```json
{
  "name": "7zi AI Team",
  "description": "智能团队管理平台",
  "version": "1.0.0",
  "protocolVersion": "0.3.0",
  "url": "https://api.7zi.com",
  "skills": [
    {
      "id": "task-management",
      "name": "任务管理",
      "description": "创建、分配和跟踪任务",
      "tags": ["productivity", "management"]
    }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true,
    "extendedAgentCard": true
  },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "documentationUrl": "https://docs.7zi.com"
}
```

### 任务管理 API

#### POST /api/a2a/tasks

创建新任务。

**请求**:

```http
POST /api/a2a/tasks
```

**请求体**:

```json
{
  "message": {
    "kind": "message",
    "messageId": "msg-123",
    "role": "user",
    "parts": [
      {
        "kind": "text",
        "text": "创建一个新项目"
      }
    ]
  },
  "configuration": {
    "acceptedOutputModes": ["text"],
    "blocking": false,
    "historyLength": 10
  }
}
```

**响应**:

```json
{
  "task": {
    "kind": "task",
    "id": "task-456",
    "contextId": "ctx-789",
    "status": {
      "state": "submitted",
      "timestamp": "2026-03-17T12:00:00.000Z"
    },
    "history": [
      {
        "kind": "message",
        "messageId": "msg-123",
        "role": "user",
        "parts": [...]
      }
    ]
  }
}
```

#### GET /api/a2a/tasks/:id

获取任务详情。

**请求**:

```http
GET /api/a2a/tasks/task-456?historyLength=10
```

**参数**:

| 参数 | 类型 | 描述 | 必需 |
|------|------|------|------|
| `historyLength` | number | 返回的历史消息数量 | 否 |

**响应**:

```json
{
  "task": {
    "kind": "task",
    "id": "task-456",
    "contextId": "ctx-789",
    "status": {
      "state": "completed",
      "timestamp": "2026-03-17T12:05:00.000Z",
      "message": "任务已完成"
    },
    "history": [...],
    "artifacts": [...]
  }
}
```

#### GET /api/a2a/tasks

列出任务。

**请求**:

```http
GET /api/a2a/tasks?contextId=ctx-789&status=completed&pageSize=20&pageToken=abc123
```

**参数**:

| 参数 | 类型 | 描述 | 必需 |
|------|------|------|------|
| `contextId` | string | 上下文 ID 筛选 | 否 |
| `status` | string | 状态筛选 | 否 |
| `pageSize` | number | 每页数量 (默认: 20) | 否 |
| `pageToken` | string | 分页令牌 | 否 |
| `historyLength` | number | 返回的历史消息数量 | 否 |
| `includeArtifacts` | boolean | 是否包含制品 | 否 |

**响应**:

```json
{
  "tasks": [...],
  "nextPageToken": "def456",
  "pageSize": 20,
  "totalSize": 42
}
```

#### DELETE /api/a2a/tasks/:id

取消任务。

**请求**:

```http
DELETE /api/a2a/tasks/task-456
```

**请求体**:

```json
{
  "metadata": {
    "reason": "用户取消"
  }
}
```

**响应**:

```json
{
  "task": {
    "kind": "task",
    "id": "task-456",
    "status": {
      "state": "canceled",
      "timestamp": "2026-03-17T12:10:00.000Z",
      "message": "任务已取消"
    }
  }
}
```

---

## 审批系统 API

### 审批请求 API

#### POST /api/approval/requests

创建审批请求。

**请求**:

```http
POST /api/approval/requests
```

**请求体**:

```json
{
  "type": "permission_request",
  "priority": "high",
  "title": "申请数据导出权限",
  "description": "需要导出项目报表数据进行分析",
  "data": {
    "exportType": "xlsx",
    "exportScope": "all"
  },
  "requestedPermission": "reports:export",
  "expiresAt": "2026-03-20T12:00:00.000Z"
}
```

**响应**:

```json
{
  "approval": {
    "id": "approval-123",
    "type": "permission_request",
    "status": "pending",
    "priority": "high",
    "requesterId": "user-4",
    "requesterName": "成员A",
    "title": "申请数据导出权限",
    "description": "需要导出项目报表数据进行分析",
    "data": { ... },
    "approvers": [
      {
        "userId": "user-2",
        "userName": "经理A",
        "status": "pending",
        "order": 1
      }
    ],
    "currentStep": 0,
    "totalSteps": 1,
    "createdAt": "2026-03-17T12:00:00.000Z",
    "updatedAt": "2026-03-17T12:00:00.000Z"
  }
}
```

#### GET /api/approval/requests

获取审批请求列表。

**请求**:

```http
GET /api/approval/requests?status=pending&type=permission_request&page=1&pageSize=20
```

**参数**:

| 参数 | 类型 | 描述 | 必需 |
|------|------|------|------|
| `status` | string | 审批状态筛选 | 否 |
| `type` | string | 审批类型筛选 | 否 |
| `requesterId` | string | 申请人 ID 筛选 | 否 |
| `approverId` | string | 审批人 ID 筛选 | 否 |
| `priority` | string | 优先级筛选 | 否 |
| `page` | number | 页码 (默认: 1) | 否 |
| `pageSize` | number | 每页数量 (默认: 20) | 否 |
| `sortBy` | string | 排序字段 (默认: createdAt) | 否 |
| `sortOrder` | string | 排序方向 (默认: desc) | 否 |

**响应**:

```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

#### GET /api/approval/requests/:id

获取审批请求详情。

**请求**:

```http
GET /api/approval/requests/approval-123
```

**响应**:

```json
{
  "approval": {
    "id": "approval-123",
    "type": "permission_request",
    "status": "pending",
    ...
  }
}
```

#### POST /api/approval/requests/:id/action

执行审批操作（批准/拒绝/取消）。

**请求**:

```http
POST /api/approval/requests/approval-123/action
```

**请求体**:

```json
{
  "action": "approve",
  "comment": "同意申请"
}
```

**响应**:

```json
{
  "approval": {
    "id": "approval-123",
    "status": "approved",
    "approvedAt": "2026-03-17T12:30:00.000Z",
    "approvedBy": "user-2",
    ...
  }
}
```

### 审批统计 API

#### GET /api/approval/stats

获取审批统计数据。

**请求**:

```http
GET /api/approval/stats
```

**响应**:

```json
{
  "total": 100,
  "pending": 15,
  "approved": 70,
  "rejected": 10,
  "cancelled": 3,
  "expired": 2,
  "avgProcessingTime": 4.5,
  "byType": {
    "permission_request": 30,
    "role_change": 20,
    "delete_user": 5
  },
  "byPriority": {
    "low": 20,
    "medium": 50,
    "high": 25,
    "urgent": 5
  }
}
```

---

## 数据导出 API

### POST /api/export/data

导出数据（支持 CSV、JSON、Excel）。

**请求**:

```http
POST /api/export/data
```

**请求体**:

```json
{
  "filename": "tasks-report",
  "format": "xlsx",
  "fields": [
    {
      "key": "id",
      "label": "任务 ID"
    },
    {
      "key": "title",
      "label": "任务标题"
    },
    {
      "key": "status",
      "label": "状态",
      "formatter": "enumFormatter"
    }
  ],
  "selectedFields": ["id", "title", "status"],
  "sheetName": "任务列表"
}
```

**响应** (Excel):

```
Binary data (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
```

**响应** (CSV):

```
任务 ID,任务标题,状态
task-001,完成首页设计,in_progress
task-002,编写API文档,completed
```

**响应** (JSON):

```json
[
  {
    "任务 ID": "task-001",
    "任务标题": "完成首页设计",
    "状态": "in_progress"
  }
]
```

### 预定义格式化器

| 格式化器 | 描述 |
|----------|------|
| `dateFormatter` | 日期格式化 |
| `booleanFormatter` | 布尔值格式化 |
| `arrayFormatter` | 数组格式化 |
| `truncateFormatter` | 文本截断 |
| `numberFormatter` | 数字格式化 |
| `currencyFormatter` | 货币格式化 |
| `percentFormatter` | 百分比格式化 |
| `enumFormatter` | 枚举值格式化 |

---

## 智能体 API

### POST /api/agents/register

注册智能体。

**请求**:

```http
POST /api/agents/register
```

**请求体**:

```json
{
  "name": "Assistant",
  "type": "assistant",
  "provider": "minimax",
  "model": "gpt-4",
  "description": "通用助手",
  "role": "executor"
}
```

**响应**:

```json
{
  "agent": {
    "id": "agent-123",
    "name": "Assistant",
    "type": "assistant",
    "provider": "minimax",
    "model": "gpt-4",
    "status": "active",
    "permissions": [],
    "metadata": {},
    "createdAt": "2026-03-17T12:00:00.000Z",
    "updatedAt": "2026-03-17T12:00:00.000Z"
  },
  "token": {
    "id": "token-456",
    "agentId": "agent-123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token",
    "expiresAt": "2026-03-17T13:00:00.000Z",
    "refreshExpiresAt": "2026-03-24T12:00:00.000Z",
    "scopes": ["*"]
  }
}
```

### POST /api/agents/auth

智能体认证。

**请求**:

```http
POST /api/agents/auth
```

**请求体**:

```json
{
  "agentId": "agent-123",
  "apiKey": "sk-xxxxx",
  "scopes": ["tasks:read", "tasks:write"]
}
```

**响应**:

```json
{
  "token": {
    "id": "token-456",
    "agentId": "agent-123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token",
    "expiresAt": "2026-03-17T13:00:00.000Z",
    "refreshExpiresAt": "2026-03-24T12:00:00.000Z",
    "scopes": ["tasks:read", "tasks:write"]
  }
}
```

### GET /api/agents/:id

获取智能体详情。

**请求**:

```http
GET /api/agents/agent-123
```

**响应**:

```json
{
  "agent": {
    "id": "agent-123",
    "name": "Assistant",
    "type": "assistant",
    "provider": "minimax",
    "model": "gpt-4",
    "status": "active",
    "permissions": ["tasks:read", "tasks:write"],
    "metadata": {},
    "createdAt": "2026-03-17T12:00:00.000Z",
    "updatedAt": "2026-03-17T12:00:00.000Z",
    "lastActiveAt": "2026-03-17T12:30:00.000Z"
  }
}
```

### PUT /api/agents/:id

更新智能体信息。

**请求**:

```http
PUT /api/agents/agent-123
```

**请求体**:

```json
{
  "name": "Assistant Pro",
  "description": "增强版助手",
  "status": "inactive"
}
```

**响应**:

```json
{
  "agent": {
    "id": "agent-123",
    "name": "Assistant Pro",
    "status": "inactive",
    ...
  }
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功，服务健康 |
| 503 | Service Unavailable | 服务不健康或不可用 |

### 错误响应格式

```json
{
  "status": "unhealthy",
  "timestamp": "2026-03-07T00:20:00.000Z",
  "error": "Health check failed"
}
```

---

## 使用示例

### cURL

```bash
# 获取系统状态
curl https://your-domain.com/api/status

# 基础健康检查
curl https://your-domain.com/api/health

# Kubernetes 存活探针
curl https://your-domain.com/api/health/live

# Kubernetes 就绪探针
curl https://your-domain.com/api/health/ready

# 详细健康检查
curl https://your-domain.com/api/health/detailed
```

### JavaScript (fetch)

```javascript
// 获取系统状态
async function getStatus() {
  const response = await fetch('/api/status');
  const data = await response.json();
  console.log('System status:', data.status);
  console.log('Services:', data.services);
  return data;
}

// 健康检查
async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('Health:', data.status);
      console.log('Memory:', data.checks.memory);
    } else {
      console.error('Service unhealthy');
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}
```

### 负载均衡器配置 (Nginx)

```nginx
upstream backend {
  server 127.0.0.1:3000;
}

server {
  location /health {
    proxy_pass http://backend/api/health;
    access_log off;  # 不记录健康检查日志
  }
}
```

### Docker Compose 健康检查

```yaml
services:
  web:
    image: 7zi-frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 监控脚本

```bash
#!/bin/bash
# health-monitor.sh - 定期检查健康状态

URL="https://your-domain.com/api/health/detailed"
ALERT_WEBHOOK="https://hooks.slack.com/services/xxx"

response=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$response" != "200" ]; then
  curl -X POST "$ALERT_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"⚠️ Health check failed: HTTP $response\"}"
  exit 1
fi

echo "Health check passed"
```

---

## 环境变量

健康检查 API 依赖以下环境变量：

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `NEXT_PUBLIC_SENTRY_RELEASE` | 应用版本号 | 否 |
| `NODE_ENV` | 运行环境 | 否 (默认: development) |
| `RESEND_API_KEY` | Resend API 密钥 | 否 |
| `npm_package_version` | NPM 包版本 | 否 |

---

## 相关文档

- [Kubernetes 探针配置](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker 健康检查](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
