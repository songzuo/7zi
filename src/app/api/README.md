# 7zi API 文档

> **版本**: 1.0.0  
> **基础 URL**: `/api`  
> **认证方式**: JWT Bearer Token / Cookie  
> **内容类型**: `application/json`

---

## 目录

- [认证 API](#认证-api)
- [任务管理 API](#任务管理-api)
- [项目管理 API](#项目管理-api)
- [日志管理 API](#日志管理-api)
- [健康检查 API](#健康检查-api)
- [系统状态 API](#系统状态-api)
- [知识图谱 API](#知识图谱-api)
- [通知管理 API](#通知管理-api)
- [博客评论 API](#博客评论-api)
- [错误上报 API](#错误上报-api)
- [示例 API](#示例-api)

---

## 通用说明

### 认证

大多数 API 支持可选或必需的认证。认证方式：

1. **Bearer Token**: `Authorization: Bearer <access_token>`
2. **Cookie**: `Cookie: access_token=<token>`

### CSRF 保护

所有修改操作 (POST, PUT, DELETE) 需要 CSRF Token：

```http
X-CSRF-Token: <csrf_token>
```

获取 CSRF Token: `GET /api/auth?action=csrf`

### 错误响应格式

```json
{
  "error": "ERROR_CODE",
  "code": "ERROR_CODE",
  "message": "用户友好的错误消息",
  "timestamp": "2026-03-15T10:00:00Z",
  "path": "/api/endpoint",
  "requestId": "req-xxx"
}
```

---

## 认证 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/auth` | GET | API 信息 / CSRF / 当前用户 | 可选 |
| `/api/auth/login` | POST | 用户登录 | 无 |
| `/api/auth/logout` | POST, DELETE | 用户登出 | 无 |
| `/api/auth/refresh` | POST | 刷新访问令牌 | 无 |
| `/api/auth/me` | GET | 获取当前用户信息 | 必需 |

### POST /api/auth/login

用户登录，获取访问令牌。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| email | string | ✓ | 用户邮箱 |
| password | string | ✓ | 用户密码 |

**请求示例**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**成功响应** `200`

```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "email": "admin@example.com",
    "name": "Administrator",
    "role": "admin"
  },
  "csrfToken": "xxx"
}
```

**错误响应** `401`

```json
{
  "error": "AUTH_ERROR",
  "message": "Invalid email or password"
}
```

**Cookie 设置**

- `access_token`: HTTP-Only, Secure
- `refresh_token`: HTTP-Only, Secure
- `csrf_token`: Secure

---

### POST /api/auth/refresh

刷新访问令牌。

**请求示例**

```bash
POST /api/auth/refresh
Cookie: refresh_token=<token>
```

**成功响应** `200`

```json
{
  "success": true,
  "accessToken": "eyJ..."
}
```

---

### GET /api/auth/me

获取当前登录用户信息。

**请求示例**

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**成功响应** `200`

```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "email": "admin@example.com",
    "name": "Administrator",
    "role": "admin",
    "permissions": ["read", "write", "delete", "admin"]
  }
}
```

---

## 任务管理 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/tasks` | GET | 获取任务列表（支持分页和过滤） | 可选 |
| `/api/tasks` | POST | 创建新任务 | 可选 |
| `/api/tasks` | PUT | 更新任务 | 可选 |
| `/api/tasks` | DELETE | 删除任务（需管理员） | 必需（管理员） |
| `/api/tasks/:id/assign` | POST | AI 智能分配任务 | 必需 |
| `/api/tasks/import` | POST | 批量导入任务 | 可选 |

### GET /api/tasks

获取任务列表，支持分页和多种过滤条件。

**请求参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | string | - | 按状态过滤: `pending`, `in_progress`, `completed`, `blocked` |
| type | string | - | 按类型过滤: `feature`, `bug`, `refactor`, `test`, `other` |
| assignee | string | - | 按分配人 ID 过滤 |
| projectId | string | - | 按项目 ID 过滤 |
| priority | string | - | 按优先级过滤: `low`, `medium`, `high` |
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 (最大 100) |
| sortBy | string | createdAt | 排序字段: `createdAt`, `updatedAt`, `priority` |
| sortOrder | string | desc | 排序方向: `asc`, `desc` |

**请求示例**

```bash
GET /api/tasks?status=pending&type=development&priority=high&page=1&limit=20
```

**成功响应** `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "task-001",
      "title": "系统架构评审",
      "description": "评审当前系统架构设计",
      "type": "development",
      "priority": "high",
      "status": "pending",
      "assignee": "architect",
      "projectId": "proj-001",
      "createdBy": "user",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "history": [],
      "comments": []
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### POST /api/tasks

创建新任务。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | ✓ | 任务标题 |
| description | string | - | 任务描述 |
| type | string | - | 任务类型 (默认: `other`) |
| priority | string | - | 优先级 (默认: `medium`) |
| assignee | string | - | 分配给的成员 ID |
| projectId | string | - | 所属项目 ID |

**请求示例**

```bash
POST /api/tasks
Content-Type: application/json
X-CSRF-Token: <token>

{
  "title": "新任务标题",
  "description": "任务描述",
  "type": "development",
  "priority": "high",
  "projectId": "proj-001"
}
```

**成功响应** `201`

```json
{
  "id": "task-xxx",
  "title": "新任务标题",
  "description": "任务描述",
  "type": "development",
  "priority": "high",
  "status": "pending",
  "createdAt": "2026-03-15T10:00:00Z"
}
```

---

### PUT /api/tasks

更新现有任务。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | string | ✓ | 任务 ID |
| status | string | - | 新状态 |
| assignee | string | - | 新分配人 |
| comment | string | - | 添加评论 |

**请求示例**

```bash
PUT /api/tasks
Content-Type: application/json
X-CSRF-Token: <token>

{
  "id": "task-001",
  "status": "in_progress",
  "assignee": "developer"
}
```

---

### DELETE /api/tasks

删除任务（需要管理员权限）。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | string | ✓ | 任务 ID (查询参数) |

**请求示例**

```bash
DELETE /api/tasks?id=task-001
Authorization: Bearer <token>
X-CSRF-Token: <token>
```

---

### POST /api/tasks/:id/assign

AI 智能分配任务。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| autoAssign | boolean | - | 是否自动分配 (默认只返回建议) |

**请求示例 - 获取建议**

```bash
POST /api/tasks/task-001/assign
Authorization: Bearer <token>
X-CSRF-Token: <token>

{}
```

**响应 - 建议列表**

```json
{
  "success": false,
  "message": "AI assignment suggestions generated",
  "suggestions": [
    {
      "memberId": "architect",
      "memberName": "架构师",
      "confidence": 85,
      "reason": "匹配专业领域 (development), 当前可用"
    }
  ],
  "task": { ... }
}
```

**请求示例 - 自动分配**

```bash
POST /api/tasks/task-001/assign
Authorization: Bearer <token>
X-CSRF-Token: <token>

{ "autoAssign": true }
```

**响应 - 已分配**

```json
{
  "success": true,
  "message": "Task automatically assigned to 架构师",
  "assignedTo": {
    "id": "architect",
    "name": "架构师",
    "confidence": 85
  },
  "task": { ... }
}
```

---

## 项目管理 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/projects` | GET | 获取项目列表 | 可选 |
| `/api/projects` | POST | 创建新项目 | 必需 |
| `/api/projects/:id` | GET | 获取项目详情 | 可选 |
| `/api/projects/:id` | PUT | 更新项目 | 必需 |
| `/api/projects/:id` | DELETE | 删除项目 | 必需 |
| `/api/projects/:id/tasks` | GET | 获取项目任务 | 可选 |

### GET /api/projects

获取项目列表。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态过滤: `planning`, `active`, `completed`, `on_hold` |
| priority | string | 按优先级过滤: `low`, `medium`, `high`, `critical` |
| assignee | string | 按成员过滤 |

**请求示例**

```bash
GET /api/projects?status=active&priority=high
```

**成功响应** `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "proj-001",
      "name": "7zi Platform",
      "description": "AI 团队管理平台",
      "status": "active",
      "priority": "high",
      "members": ["architect", "developer"],
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/projects

创建新项目。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | ✓ | 项目名称 |
| description | string | - | 项目描述 |
| status | string | - | 项目状态 (默认: `planning`) |
| priority | string | - | 优先级 (默认: `medium`) |
| members | string[] | - | 成员 ID 列表 |

**请求示例**

```bash
POST /api/projects
Authorization: Bearer <token>
X-CSRF-Token: <token>
Content-Type: application/json

{
  "name": "新项目名称",
  "description": "项目描述",
  "status": "planning",
  "priority": "medium"
}
```

---

## 日志管理 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/logs` | GET | 查询日志 | 可选 |
| `/api/logs` | DELETE | 清理旧日志（管理员） | 必需（管理员） |
| `/api/logs/export` | GET | 导出日志 | 可选 |

### GET /api/logs

查询系统日志，支持分页和多种过滤条件。

**请求参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| levels | string | - | 日志级别，逗号分隔: `error,warn,info,debug` |
| categories | string | - | 日志类别，逗号分隔: `api,auth,system` |
| search | string | - | 搜索关键词 |
| userId | string | - | 用户 ID 过滤 |
| requestId | string | - | 请求 ID 过滤 |
| route | string | - | 路由过滤 |
| startTime | string | - | 开始时间 (ISO 8601) |
| endTime | string | - | 结束时间 (ISO 8601) |
| page | number | 1 | 页码 |
| limit | number | 100 | 每页数量 (最大 1000) |
| orderBy | string | timestamp | 排序字段: `timestamp`, `level` |
| order | string | desc | 排序方向: `asc`, `desc` |

**请求示例**

```bash
GET /api/logs?levels=error,warn&categories=api&limit=100&page=1&order=desc
```

**成功响应** `200`

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-001",
        "level": "error",
        "category": "api",
        "message": "Database connection failed",
        "timestamp": "2026-03-15T10:00:00Z",
        "userId": "user-001",
        "requestId": "req-xxx"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 100
  }
}
```

---

### DELETE /api/logs

清理旧日志（需要管理员权限）。

**请求参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| days | number | 30 | 删除多少天前的日志 (1-365) |

**请求示例**

```bash
DELETE /api/logs?days=30
Authorization: Bearer <token>
X-CSRF-Token: <token>
```

**成功响应** `200`

```json
{
  "success": true,
  "deleted": 1500,
  "message": "Deleted 1500 log entries older than 30 days",
  "deletedBy": "admin@example.com",
  "deletedAt": "2026-03-15T10:00:00Z"
}
```

---

### GET /api/logs/export

导出日志为 JSON 或 CSV 格式。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| format | string | 导出格式: `json` 或 `csv` |
| startDate | string | 开始日期 (YYYY-MM-DD) |
| endDate | string | 结束日期 (YYYY-MM-DD) |
| levels | string | 日志级别过滤 |
| categories | string | 日志类别过滤 |
| limit | number | 最大记录数 |

**请求示例**

```bash
GET /api/logs/export?format=csv&levels=error&categories=api&limit=1000
```

---

## 健康检查 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/health` | GET | 基础健康检查 | 无 |
| `/api/health` | HEAD | 轻量检查（负载均衡） | 无 |
| `/api/health/ready` | GET | Kubernetes 就绪探针 | 无 |
| `/api/health/live` | GET | Kubernetes 存活探针 | 无 |
| `/api/health/detailed` | GET | 详细健康报告 | 无 |

### GET /api/health

基础健康检查，返回服务状态和组件状态。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| history | boolean | 是否包含历史记录 |

**请求示例**

```bash
GET /api/health?history=true
```

**成功响应** `200`

```json
{
  "status": "ok",
  "timestamp": "2026-03-15T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "responseTime": 5,
  "components": {
    "cache": "ok",
    "auth": "ok",
    "logger": "ok"
  }
}
```

**降级响应** `200`

```json
{
  "status": "degraded",
  "timestamp": "2026-03-15T10:00:00Z",
  "components": {
    "cache": "degraded",
    "auth": "ok",
    "logger": "ok"
  }
}
```

---

### GET /api/health/detailed

详细健康报告，包含系统和服务状态。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| include | string | 包含的内容: `system`, `services`, `configuration` |
| history | boolean | 是否包含历史记录 |

**请求示例**

```bash
GET /api/health/detailed?include=system,services&history=true
```

**成功响应** `200`

```json
{
  "status": "ok",
  "timestamp": "2026-03-15T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "system": {
    "memory": {
      "used": 256,
      "total": 1024,
      "percentage": 25
    },
    "cpu": {
      "usage": 25,
      "cores": 4
    }
  },
  "services": {
    "database": {
      "status": "ok",
      "latency": 5
    },
    "redis": {
      "status": "ok",
      "latency": 2
    }
  }
}
```

---

## 系统状态 API

### GET /api/status

公开的系统状态页面 API，用于展示服务运行状态。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| performance | boolean | 包含性能详情 |
| endpoints | boolean | 包含端点指标 |

**请求示例**

```bash
GET /api/status?performance=true
```

**成功响应** `200`

```json
{
  "status": "operational",
  "lastUpdated": "2026-03-15T10:00:00Z",
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
  "maintenance": [],
  "performance": {
    "totalRequests": 10000,
    "totalErrors": 50,
    "errorRate": 0.5,
    "avgResponseTime": 142,
    "uptime": 99.98,
    "endpointsCount": 25
  }
}
```

---

## 知识图谱 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/knowledge/nodes` | GET | 获取知识节点列表 | 无 |
| `/api/knowledge/nodes` | POST | 创建知识节点 | 无 |
| `/api/knowledge/nodes/:id` | GET | 获取节点详情（含邻居） | 无 |
| `/api/knowledge/nodes/:id` | PUT | 更新节点 | 无 |
| `/api/knowledge/nodes/:id` | DELETE | 删除节点 | 无 |
| `/api/knowledge/edges` | GET | 获取边关系列表 | 无 |
| `/api/knowledge/edges` | POST | 创建边关系 | 无 |
| `/api/knowledge/query` | POST | 知识查询 | 无 |
| `/api/knowledge/inference` | POST | 知识推理 | 无 |
| `/api/knowledge/lattice` | GET | 获取完整晶格结构 | 无 |

### GET /api/knowledge/nodes

获取知识节点列表，支持过滤和分页。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 节点类型: `concept`, `fact`, `rule`, `procedure` |
| source | string | 来源: `user`, `ai`, `document` |
| tags | string | 标签过滤（逗号分隔） |
| minWeight | number | 最小权重 (0-1) |
| minConfidence | number | 最小置信度 (0-1) |
| limit | number | 结果数量限制 |
| offset | number | 偏移量 |

**请求示例**

```bash
GET /api/knowledge/nodes?type=concept&minConfidence=0.7&limit=50
```

**成功响应** `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "node-001",
      "content": "React 组件设计模式",
      "type": "concept",
      "weight": 0.8,
      "confidence": 0.9,
      "tags": ["react", "frontend"],
      "source": "user",
      "timestamp": 1709500800000
    }
  ],
  "pagination": {
    "total": 100,
    "offset": 0,
    "limit": 50
  }
}
```

---

### POST /api/knowledge/nodes

创建新的知识节点。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| content | string | ✓ | 知识内容 |
| type | string | ✓ | 节点类型 |
| weight | number | - | 权重 (0-1, 默认 0.5) |
| confidence | number | - | 置信度 (0-1, 默认 0.5) |
| source | string | - | 来源 (默认 `user`) |
| tags | string[] | - | 标签列表 |
| metadata | object | - | 元数据 |

**请求示例**

```bash
POST /api/knowledge/nodes
Content-Type: application/json

{
  "content": "知识内容",
  "type": "concept",
  "weight": 0.8,
  "confidence": 0.9,
  "tags": ["tag1", "tag2"]
}
```

---

### POST /api/knowledge/query

知识查询，支持文本搜索和条件过滤。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| searchText | string | 搜索文本 |
| type | string | 节点类型过滤 |
| tags | string[] | 标签过滤 |
| minWeight | number | 最小权重 |
| minConfidence | number | 最小置信度 |
| limit | number | 结果数量限制 (默认 50) |

**请求示例**

```bash
POST /api/knowledge/query
Content-Type: application/json

{
  "searchText": "组件",
  "type": "concept",
  "tags": ["react"],
  "minConfidence": 0.5,
  "limit": 20
}
```

**成功响应** `200`

```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "relevanceScores": [0.95, 0.85, ...],
    "edges": [...],
    "total": 50
  }
}
```

---

### POST /api/knowledge/inference

知识推理，基于节点关系进行推断。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| startNodeId | string | 起始节点 ID |
| maxDepth | number | 推理深度 (默认 3) |

**请求示例**

```bash
POST /api/knowledge/inference
Content-Type: application/json

{
  "startNodeId": "node-001",
  "maxDepth": 3
}
```

**成功响应** `200`

```json
{
  "success": true,
  "data": {
    "relatedNodes": [...],
    "inferredRelations": [...],
    "confidence": 0.85
  }
}
```

---

## 通知管理 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/notifications` | GET | 获取通知列表 | 可选 |
| `/api/notifications` | POST | 创建通知 | 可选 |
| `/api/notifications` | PUT | 标记已读/全部已读 | 可选 |
| `/api/notifications` | DELETE | 删除通知/清空全部 | 可选 |

### GET /api/notifications

获取通知列表。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |
| type | string | 通知类型: `task_assigned`, `project_update`, `mention`, `system_alert` |
| read | string | 已读状态: `true` 或 `false` |
| limit | number | 结果数量限制 |
| offset | number | 偏移量 |

**请求示例**

```bash
GET /api/notifications?userId=user-001&read=false&limit=20
```

**成功响应** `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "type": "task_assigned",
      "title": "新任务分配",
      "message": "您被分配了新任务",
      "read": false,
      "priority": "high",
      "userId": "user-001",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### POST /api/notifications

创建新通知。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| type | string | ✓ | 通知类型 |
| title | string | ✓ | 通知标题 |
| message | string | ✓ | 通知内容 |
| userId | string | ✓ | 接收用户 ID |
| priority | string | - | 优先级: `low`, `medium`, `high` |
| link | string | - | 关联链接 |
| metadata | object | - | 元数据 |

**请求示例**

```bash
POST /api/notifications
Content-Type: application/json
X-CSRF-Token: <token>

{
  "type": "task_assigned",
  "title": "新任务分配",
  "message": "您被分配了新任务",
  "userId": "user-001",
  "priority": "high",
  "link": "/tasks/task-001"
}
```

---

### PUT /api/notifications

标记通知为已读。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 通知 ID（单个操作时必需） |
| read | boolean | 已读状态 |
| markAllRead | boolean | 标记全部已读 |

**请求示例 - 单个标记**

```bash
PUT /api/notifications
Content-Type: application/json
X-CSRF-Token: <token>

{ "id": "notif-001", "read": true }
```

**请求示例 - 全部标记**

```bash
PUT /api/notifications
Content-Type: application/json
X-CSRF-Token: <token>

{ "markAllRead": true }
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "5 notifications marked as read",
  "count": 5
}
```

---

### DELETE /api/notifications

删除通知。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 通知 ID（单个删除时必需） |
| deleteAll | boolean | 删除全部（查询参数） |

**请求示例 - 删除单个**

```bash
DELETE /api/notifications?id=notif-001
X-CSRF-Token: <token>
```

**请求示例 - 删除全部**

```bash
DELETE /api/notifications?deleteAll=true
X-CSRF-Token: <token>
```

---

## 博客评论 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/comments` | GET | 获取评论列表 | 无 |
| `/api/comments` | POST | 创建评论 | 无 |
| `/api/comments/:id` | GET | 获取单个评论 | 无 |
| `/api/comments/:id` | PUT | 更新评论 | 无 |
| `/api/comments/:id` | DELETE | 删除评论 | 无 |

### GET /api/comments

获取评论列表，可按文章过滤。

**请求参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| postId | string | 文章 ID 过滤 |

**请求示例**

```bash
GET /api/comments?postId=post-001
```

**成功响应** `200`

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-001",
        "postId": "post-001",
        "author": "用户名",
        "content": "评论内容",
        "tags": [],
        "createdAt": "2026-03-15T10:00:00Z",
        "updatedAt": "2026-03-15T10:00:00Z"
      }
    ],
    "total": 10
  }
}
```

---

### POST /api/comments

创建新评论。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| postId | string | ✓ | 文章 ID |
| author | string | ✓ | 作者名称 |
| content | string | ✓ | 评论内容（最多 5000 字） |
| tags | string[] | - | 标签列表 |

**请求示例**

```bash
POST /api/comments
Content-Type: application/json

{
  "postId": "post-001",
  "author": "用户名",
  "content": "评论内容"
}
```

---

## 错误上报 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/log-error` | POST | 上报前端错误 | 无 |
| `/api/log-error` | GET | 获取错误统计 | 必需（管理员） |

### POST /api/log-error

上报客户端错误日志。

**请求参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| message | string | ✓ | 错误消息 |
| stack | string | - | 错误堆栈 |
| componentStack | string | - | React 组件堆栈 |
| digest | string | - | Next.js 错误摘要 |
| url | string | - | 发生错误的 URL |
| userAgent | string | - | 用户代理 |
| timestamp | string | - | 时间戳 |
| additionalInfo | object | - | 附加信息 |

**请求示例**

```bash
POST /api/log-error
Content-Type: application/json

{
  "message": "Uncaught TypeError: ...",
  "stack": "at App.tsx:25...",
  "componentStack": "at Component...",
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-03-15T10:00:00Z"
}
```

**成功响应** `200`

```json
{
  "success": true,
  "requestId": "req-xxx",
  "message": "错误已记录"
}
```

---

## 示例 API

### 端点列表

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/examples/protected` | GET | 受保护路由示例 | 必需 |
| `/api/examples/protected` | DELETE | 管理员路由示例 | 必需（管理员） |
| `/api/examples/protected` | POST | 自定义认证示例 | 必需 |
| `/api/examples/protected` | PUT | 可选认证示例 | 可选 |

---

## 性能优化特性

### 缓存策略

- **任务列表**: 2 分钟 TTL，缓存标签 `tasks`
- **知识节点**: 30 秒 TTL，查询缓存
- **系统状态**: 60 秒 TTL

### 索引优化

- 任务存储使用 `IndexedStore`，支持 O(1) 索引查询
- 知识图谱查询优化，避免全量数据加载

### 分页

所有列表 API 支持分页，默认 `limit=20`，最大 `limit=100`

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-15 | 初始 API 文档 |

---

*此文档由技术文档工程师自动生成，与 API 实现代码保持同步。*