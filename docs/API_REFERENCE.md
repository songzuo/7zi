# 7zi API 参考文档

> 完整的 REST API 文档

**版本**: 1.0.0  
**基础URL**: `http://localhost:3000/api`  
**更新日期**: 2026-03-08  
**维护者**: 架构师子代理

---

## 🔔 更新日志

### v1.0.2 (2026-03-13)
- 添加项目管理 API 完整文档 (`/api/projects`, `/api/projects/:id`, `/api/projects/:id/tasks`)
- 添加 Auth API 完整文档 (login, logout, refresh, me, csrf, check-secret)

### v1.0.1 (2026-03-08)
- 添加任务 ID 参数支持 (`/api/tasks/:id`)
- 添加任务分配端点 (`/api/tasks/:id/assign`)
- 完善错误响应格式说明
- 添加更多 SDK 示例

### v1.0.0 (2026-03-08)
- 初始 API 发布
- 任务管理 API (GET, POST, PUT)
- 日志系统 API (GET, DELETE)
- 健康检查 API
- 知识图谱 API

---

## 📋 目录

- [概述](#概述)
- [认证](#认证)
- [通用响应格式](#通用响应格式)
- [错误处理](#错误处理)
- [API 端点](#api-端点)
  - [任务管理](#任务管理-api)
  - [日志系统](#日志系统-api)
  - [系统状态](#系统状态-api)
  - [健康检查](#健康检查-api)
  - [知识图谱](#知识图谱-api)
- [数据类型](#数据类型)
- [SDK 使用示例](#sdk-使用示例)

---

## 概述

7zi API 提供了一组 RESTful 端点，用于管理任务、日志和系统状态。所有端点返回 JSON 格式的数据。

### 支持的操作

| 模块 | GET | POST | PUT | DELETE |
|------|-----|------|-----|--------|
| 任务 | ✅ | ✅ | ✅ | ❌ |
| 日志 | ✅ | ❌ | ❌ | ✅ |
| 状态 | ✅ | ❌ | ❌ | ❌ |
| 健康检查 | ✅ | ❌ | ❌ | ❌ |
| 知识图谱 | ✅ | ✅ | ✅ | ✅ |

---

## 认证

> ⚠️ 当前版本 API 为内部使用，无需认证。生产环境将添加 JWT 认证。

### 未来的认证方式

```http
Authorization: Bearer <your_jwt_token>
```

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-08T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5
  }
}
```

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "详细错误信息",
  "details": { ... }
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## API 端点

---

## 任务管理 API

### 获取任务列表

```http
GET /api/tasks
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | 否 | 按状态过滤: `pending`, `assigned`, `in_progress`, `completed`, `blocked` |
| `type` | string | 否 | 按类型过滤: `development`, `design`, `research`, `marketing`, `other` |
| `assignee` | string | 否 | 按分配者过滤 (AI 成员 ID) |
| `priority` | string | 否 | 按优先级过滤: `high`, `medium`, `low` |

**响应示例**

```json
[
  {
    "id": "task-001",
    "title": "分析市场趋势",
    "description": "研究当前AI代理市场的趋势和竞争对手",
    "type": "research",
    "priority": "high",
    "status": "completed",
    "assignee": "agent-world-expert",
    "createdBy": "user",
    "createdAt": "2026-03-05T10:00:00Z",
    "updatedAt": "2026-03-06T15:30:00Z",
    "comments": [],
    "history": [
      {
        "timestamp": "2026-03-05T10:00:00Z",
        "status": "pending",
        "changedBy": "user"
      }
    ]
  }
]
```

**cURL 示例**

```bash
# 获取所有任务
curl http://localhost:3000/api/tasks

# 获取进行中的任务
curl "http://localhost:3000/api/tasks?status=in_progress"

# 获取开发类型任务
curl "http://localhost:3000/api/tasks?type=development"

# 组合过滤
curl "http://localhost:3000/api/tasks?status=pending&priority=high&type=development"
```

---

### 创建任务

```http
POST /api/tasks
```

**请求体**

```json
{
  "title": "string (必填)",
  "description": "string (可选)",
  "type": "development | design | research | marketing | other",
  "priority": "high | medium | low",
  "assignee": "string (可选, AI成员ID)"
}
```

**字段说明**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | ✅ | - | 任务标题 |
| `description` | string | ❌ | `""` | 任务描述 |
| `type` | string | ❌ | `"other"` | 任务类型 |
| `priority` | string | ❌ | `"medium"` | 优先级 |
| `assignee` | string | ❌ | `undefined` | 分配的 AI 成员 |

**响应示例**

```json
{
  "id": "task-abc123",
  "title": "新功能开发",
  "description": "实现用户认证功能",
  "type": "development",
  "priority": "high",
  "status": "pending",
  "assignee": "executor",
  "createdBy": "user",
  "createdAt": "2026-03-08T12:00:00Z",
  "updatedAt": "2026-03-08T12:00:00Z",
  "comments": [],
  "history": [
    {
      "timestamp": "2026-03-08T12:00:00Z",
      "status": "pending",
      "changedBy": "user"
    }
  ]
}
```

**cURL 示例**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "实现用户认证",
    "description": "添加 JWT 认证功能",
    "type": "development",
    "priority": "high"
  }'
```

---

### 更新任务

```http
PUT /api/tasks
```

**请求体**

```json
{
  "id": "string (必填)",
  "status": "pending | assigned | in_progress | completed | blocked",
  "assignee": "string (可选)",
  "comment": "string (可选)"
}
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 任务 ID |
| `status` | string | ❌ | 新状态 |
| `assignee` | string | ❌ | 分配的 AI 成员 |
| `comment` | string | ❌ | 添加评论 |

**响应示例**

```json
{
  "id": "task-001",
  "title": "分析市场趋势",
  "status": "completed",
  "updatedAt": "2026-03-08T13:00:00Z",
  "history": [
    {
      "timestamp": "2026-03-08T13:00:00Z",
      "status": "completed",
      "changedBy": "user"
    }
  ]
}
```

**cURL 示例**

```bash
# 更新状态
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task-001", "status": "completed"}'

# 分配任务并添加评论
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "assignee": "architect",
    "comment": "请优先处理这个任务"
  }'
```

---

### 获取单个任务

```http
GET /api/tasks/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 任务 ID |

**响应示例**

```json
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
  "comments": [
    {
      "id": "comment-001",
      "content": "已完成市场调研",
      "author": "agent-world-expert",
      "timestamp": "2026-03-06T15:00:00Z"
    }
  ],
  "history": [
    {
      "timestamp": "2026-03-05T10:00:00Z",
      "status": "pending",
      "changedBy": "user"
    },
    {
      "timestamp": "2026-03-06T15:30:00Z",
      "status": "completed",
      "changedBy": "agent-world-expert"
    }
  ]
}
```

**cURL 示例**

```bash
curl http://localhost:3000/api/tasks/task-001
```

---

### 分配任务

```http
POST /api/tasks/:id/assign
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 任务 ID |

**请求体**

```json
{
  "assignee": "string (AI 成员 ID)",
  "comment": "string (可选，分配说明)"
}
```

**AI 成员 ID 列表**

| ID | 角色 |
|------|------|
| `agent-world-expert` | 智能体世界专家 |
| `consultant` | 咨询师 |
| `architect` | 架构师 |
| `executor` | Executor |
| `sysadmin` | 系统管理员 |
| `tester` | 测试员 |
| `designer` | 设计师 |
| `promoter` | 推广专员 |
| `support` | 销售客服 |
| `finance` | 财务 |
| `media` | 媒体 |

**响应示例**

```json
{
  "id": "task-001",
  "assignee": "architect",
  "status": "assigned",
  "updatedAt": "2026-03-08T14:00:00Z",
  "message": "Task assigned to architect successfully"
}
```

**cURL 示例**

```bash
curl -X POST http://localhost:3000/api/tasks/task-001/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "architect",
    "comment": "请优先处理这个架构设计任务"
  }'
```

---

## 项目管理 API

> ⚠️ 需要认证: POST 请求需要有效的 JWT Token 和 CSRF Token

### 获取项目列表

```http
GET /api/projects
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | 否 | 按状态过滤: `active`, `completed`, `archived`, `on_hold` |
| `priority` | string | 否 | 按优先级过滤: `high`, `medium`, `low` |
| `assignee` | string | 否 | 按成员过滤 |

**响应示例**

```json
{
  "success": true,
  "data": [
    {
      "id": "proj-001",
      "name": "7zi Platform",
      "description": "AI驱动的团队管理平台",
      "status": "active",
      "priority": "high",
      "tags": ["AI", "Team Management", "Next.js"],
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2026-06-30T00:00:00Z",
      "members": ["architect", "executor", "designer"],
      "createdAt": "2026-03-01T00:00:00Z",
      "updatedAt": "2026-03-13T00:00:00Z"
    }
  ]
}
```

**cURL 示例**

```bash
# 获取所有项目
curl http://localhost:3000/api/projects

# 获取进行中的高优先级项目
curl "http://localhost:3000/api/projects?status=active&priority=high"
```

---

### 创建项目

```http
POST /api/projects
```

> ⚠️ 需要认证: JWT Token + CSRF Token

**请求头**

```http
Authorization: Bearer <jwt_token>
X-CSRF-Token: <csrf_token>
```

**请求体**

```json
{
  "name": "string (必填)",
  "description": "string (可选)",
  "status": "active | completed | archived | on_hold",
  "priority": "high | medium | low",
  "tags": ["string"],
  "startDate": "ISO 8601 日期",
  "endDate": "ISO 8601 日期",
  "members": ["member-id"]
}
```

**字段说明**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | ✅ | - | 项目名称 |
| `description` | string | ❌ | `""` | 项目描述 |
| `status` | string | ❌ | `"active"` | 项目状态 |
| `priority` | string | ❌ | `"medium"` | 优先级 |
| `tags` | string[] | ❌ | `[]` | 标签数组 |
| `startDate` | string | ❌ | - | 开始日期 |
| `endDate` | string | ❌ | - | 结束日期 |
| `members` | string[] | ❌ | `[]` | 成员 ID 数组 |

**响应示例**

```json
{
  "success": true,
  "data": {
    "id": "proj-abc123",
    "name": "新项目",
    "description": "项目描述",
    "status": "active",
    "priority": "medium",
    "tags": ["AI"],
    "members": [],
    "createdAt": "2026-03-13T12:00:00Z",
    "updatedAt": "2026-03-13T12:00:00Z"
  }
}
```

**cURL 示例**

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -d '{
    "name": "新项目开发",
    "description": "AI 驱动的项目管理系统",
    "priority": "high",
    "tags": ["AI", "Management"]
  }'
```

---

### 获取单个项目

```http
GET /api/projects/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 项目 ID |

**响应示例**

```json
{
  "success": true,
  "data": {
    "id": "proj-001",
    "name": "7zi Platform",
    "description": "AI驱动的团队管理平台",
    "status": "active",
    "priority": "high",
    "tags": ["AI", "Team Management"],
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-06-30T00:00:00Z",
    "members": ["architect", "executor"],
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-13T00:00:00Z"
  }
}
```

**cURL 示例**

```bash
curl http://localhost:3000/api/projects/proj-001
```

---

### 更新项目

```http
PUT /api/projects/:id
```

> ⚠️ 需要认证

**请求体**

```json
{
  "name": "string (可选)",
  "description": "string (可选)",
  "status": "active | completed | archived | on_hold",
  "priority": "high | medium | low",
  "tags": ["string"],
  "endDate": "ISO 8601 日期"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "id": "proj-001",
    "name": "7zi Platform (更新版)",
    "status": "completed",
    "updatedAt": "2026-03-13T14:00:00Z"
  }
}
```

**cURL 示例**

```bash
curl -X PUT http://localhost:3000/api/projects/proj-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -d '{"status": "completed"}'
```

---

### 删除项目

```http
DELETE /api/projects/:id
```

> ⚠️ 需要认证: 仅管理员可删除

**响应示例**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**cURL 示例**

```bash
curl -X DELETE http://localhost:3000/api/projects/proj-001 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-CSRF-Token: <csrf_token>"
```

---

### 获取项目相关任务

```http
GET /api/projects/:id/tasks
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 项目 ID |

**响应示例**

```json
{
  "success": true,
  "data": [
    {
      "id": "task-001",
      "title": "项目任务",
      "status": "in_progress",
      "assignee": "executor"
    }
  ]
}
```

---

## 日志系统 API

### 查询日志

```http
GET /api/logs
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `startTime` | string | ❌ | - | 开始时间 (ISO 8601) |
| `endTime` | string | ❌ | - | 结束时间 (ISO 8601) |
| `levels` | string | ❌ | - | 日志级别，逗号分隔: `error,warn,info,debug` |
| `categories` | string | ❌ | - | 日志分类，逗号分隔 |
| `search` | string | ❌ | - | 搜索关键词 |
| `userId` | string | ❌ | - | 用户 ID 过滤 |
| `requestId` | string | ❌ | - | 请求 ID 过滤 |
| `route` | string | ❌ | - | 路由过滤 |
| `page` | number | ❌ | `1` | 页码 |
| `limit` | number | ❌ | `100` | 每页数量 (最大 1000) |
| `orderBy` | string | ❌ | `timestamp` | 排序字段: `timestamp`, `level` |
| `order` | string | ❌ | `desc` | 排序方向: `asc`, `desc` |

**响应示例**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-001",
        "level": "info",
        "category": "task",
        "message": "Task created successfully",
        "timestamp": "2026-03-08T12:00:00Z",
        "metadata": {
          "taskId": "task-001"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 150
    }
  }
}
```

**cURL 示例**

```bash
# 获取最近 100 条日志
curl http://localhost:3000/api/logs

# 获取错误级别日志
curl "http://localhost:3000/api/logs?levels=error"

# 时间范围查询
curl "http://localhost:3000/api/logs?startTime=2026-03-01T00:00:00Z&endTime=2026-03-08T23:59:59Z"

# 搜索日志
curl "http://localhost:3000/api/logs?search=error&levels=error,warn"
```

---

### 清理旧日志

```http
DELETE /api/logs
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `days` | number | ❌ | `30` | 删除多少天前的日志 |

**响应示例**

```json
{
  "success": true,
  "data": {
    "deleted": 150,
    "message": "Deleted 150 log entries older than 30 days"
  }
}
```

**cURL 示例**

```bash
# 删除 30 天前的日志
curl -X DELETE http://localhost:3000/api/logs

# 删除 7 天前的日志
curl -X DELETE "http://localhost:3000/api/logs?days=7"
```

---

## 系统状态 API

### 获取系统状态

```http
GET /api/status
```

**响应示例**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 86400,
  "timestamp": "2026-03-08T12:00:00Z",
  "services": {
    "database": "connected",
    "cache": "active",
    "ai": "operational"
  },
  "metrics": {
    "tasksCompleted": 28,
    "tasksInProgress": 5,
    "activeAgents": 11
  }
}
```

**cURL 示例**

```bash
curl http://localhost:3000/api/status
```

---

## 健康检查 API

### 基础健康检查

```http
GET /api/health
```

**响应示例**

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T12:00:00Z"
}
```

---

### 就绪检查

```http
GET /api/health/ready
```

**响应示例**

```json
{
  "ready": true,
  "checks": {
    "database": true,
    "cache": true,
    "external": true
  }
}
```

---

### 存活检查

```http
GET /api/health/live
```

**响应示例**

```json
{
  "alive": true
}
```

---

### 详细健康检查

```http
GET /api/health/detailed
```

**响应示例**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 5
    },
    "memory": {
      "status": "healthy",
      "used": 512,
      "total": 2048
    },
    "cpu": {
      "status": "healthy",
      "usage": 25
    }
  }
}
```

---

## 认证 API

> 用户身份验证与授权系统

### 用户登录

```http
POST /api/auth/login
```

**请求体**

```json
{
  "username": "string (必填)",
  "password": "string (必填)"
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-001",
      "username": "admin",
      "role": "admin"
    },
    "csrfToken": "abc123..."
  }
}
```

**cURL 示例**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

---

### 用户登出

```http
POST /api/auth/logout
```

> ⚠️ 需要认证

**响应示例**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 刷新令牌

```http
POST /api/auth/refresh
```

> ⚠️ 需要认证

**响应示例**

```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token...",
    "csrfToken": "new_csrf_token..."
  }
}
```

---

### 获取当前用户

```http
GET /api/auth/me
```

> ⚠️ 需要认证

**响应示例**

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "username": "admin",
    "role": "admin",
    "email": "admin@7zi.com"
  }
}
```

---

### 获取 CSRF Token

```http
GET /api/auth?action=csrf
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "csrfToken": "abc123..."
  }
}
```

---

### 检查 JWT Secret 强度

```http
GET /api/auth?action=check-secret
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "strong": true,
    "length": 32,
    "hasEntropy": true
  }
}
```

---

## 知识图谱 API

### 获取节点列表

```http
GET /api/knowledge/nodes
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 节点类型过滤 |
| `limit` | number | 否 | 返回数量限制 |

---

### 创建节点

```http
POST /api/knowledge/nodes
```

**请求体**

```json
{
  "type": "concept | task | agent | resource",
  "name": "string",
  "content": "string",
  "metadata": {}
}
```

---

### 获取边列表

```http
GET /api/knowledge/edges
```

---

### 查询知识图谱

```http
POST /api/knowledge/query
```

**请求体**

```json
{
  "query": "string",
  "context": {}
}
```

---

### 推理接口

```http
POST /api/knowledge/inference
```

---

### 获取知识晶格

```http
GET /api/knowledge/lattice
```

---

## 数据类型

### Task (任务)

```typescript
interface Task {
  id: string;                    // 唯一标识
  title: string;                 // 任务标题
  description: string;           // 任务描述
  type: TaskType;                // 任务类型
  priority: TaskPriority;        // 优先级
  status: TaskStatus;            // 当前状态
  assignee?: string;             // AI 成员 ID
  createdBy: 'user' | 'ai';      // 创建者
  createdAt: string;             // 创建时间 (ISO 8601)
  updatedAt: string;             // 更新时间 (ISO 8601)
  comments: TaskComment[];       // 评论列表
  history: StatusChange[];       // 状态历史
}
```

### TaskType (任务类型)

```typescript
type TaskType = 
  | 'development'   // 开发任务
  | 'design'        // 设计任务
  | 'research'      // 研究任务
  | 'marketing'     // 营销任务
  | 'other';        // 其他任务
```

### TaskPriority (优先级)

```typescript
type TaskPriority = 
  | 'high'    // 高优先级
  | 'medium'  // 中优先级
  | 'low';    // 低优先级
```

### TaskStatus (状态)

```typescript
type TaskStatus = 
  | 'pending'      // 待处理
  | 'assigned'     // 已分配
  | 'in_progress'  // 进行中
  | 'completed'    // 已完成
  | 'blocked';     // 已阻塞
```

### TaskComment (评论)

```typescript
interface TaskComment {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}
```

### StatusChange (状态变更)

```typescript
interface StatusChange {
  timestamp: string;
  status: TaskStatus;
  changedBy: string;
  assignee?: string;
}
```

### LogLevel (日志级别)

```typescript
type LogLevel = 
  | 'error'   // 错误
  | 'warn'    // 警告
  | 'info'    // 信息
  | 'debug';  // 调试
```

### LogCategory (日志分类)

```typescript
type LogCategory = 
  | 'task'    // 任务日志
  | 'system'  // 系统日志
  | 'api'     // API 日志
  | 'ai'      // AI 日志
  | 'auth';   // 认证日志
```

---

## SDK 使用示例

### JavaScript/TypeScript

```typescript
// 任务 API
const tasksApi = {
  // 获取任务列表
  async list(filters?: { status?: string; type?: string }) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/tasks?${params}`);
    return res.json();
  },

  // 创建任务
  async create(task: {
    title: string;
    description?: string;
    type?: string;
    priority?: string;
  }) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.json();
  },

  // 更新任务
  async update(id: string, data: {
    status?: string;
    assignee?: string;
    comment?: string;
  }) {
    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    return res.json();
  },
};

// 使用示例
async function main() {
  // 创建任务
  const task = await tasksApi.create({
    title: '新功能开发',
    type: 'development',
    priority: 'high',
  });

  // 获取进行中的任务
  const inProgress = await tasksApi.list({ status: 'in_progress' });

  // 完成任务
  await tasksApi.update(task.id, { status: 'completed' });
}
```

### React Hook 示例

```typescript
import { useState, useEffect } from 'react';

function useTasks(filters?: { status?: string }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      const params = new URLSearchParams(filters as any);
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data);
      setLoading(false);
    }
    fetchTasks();
  }, [filters?.status]);

  const createTask = async (task: any) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    const newTask = await res.json();
    setTasks([...tasks, newTask]);
    return newTask;
  };

  return { tasks, loading, createTask };
}
```

---

## 速率限制

> ⚠️ 当前版本无速率限制。生产环境将添加以下限制：

| 端点 | 限制 |
|------|------|
| `/api/tasks` | 100 req/min |
| `/api/logs` | 50 req/min |
| `/api/health/*` | 无限制 |

---

## 版本控制

API 使用 URL 版本控制。当前版本为 v1 (隐式)。

未来版本将使用:
- `/api/v1/tasks`
- `/api/v2/tasks`

---

## 更新日志

### v1.0.0 (2026-03-08)
- 初始 API 发布
- 任务管理 API (GET, POST, PUT)
- 日志系统 API (GET, DELETE)
- 健康检查 API
- 知识图谱 API

---

*API 文档由架构师子代理维护*
