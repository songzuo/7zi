# 7zi-Frontend API 文档

> API 参考文档 - Version 1.0.8

---

## 📋 目录

- [概述](#概述)
- [认证说明](#认证说明)
- [基础端点](#基础端点)
- [认证 API](#认证-api)
- [任务 API](#任务-api)
- [权限控制 API (RBAC)](#权限控制-api-rbac-v108)
- [性能报告 API](#性能报告-api-v108)
- [备份 API](#备份-api-v108)
- [导出 API](#导出-api-v108)
- [健康检查 API](#健康检查-api)
- [状态 API](#状态-api)
- [GitHub API](#github-api)
- [WebSocket API](#websocket-api)
- [错误处理](#错误处理)
- [版本历史](#版本历史)

---

## 概述

本 API 文档描述了 7zi-Frontend 的所有可用的 RESTful 端点。

### Base URL

```
开发环境: http://localhost:3000/api
生产环境: https://7zi.com/api
```

### 版本

- **当前版本**: v1.0.8
- **发布日期**: 2026-03-22

---

## 认证说明

大多数 API 端点需要身份验证。使用 Bearer Token 进行认证：

```http
Authorization: Bearer <your-token>
```

### 获取 Token

通过登录 API 获取 Token：

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "rememberMe": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

## 基础端点

### 系统信息

| 端点 | 方法 | 认证 | 描述 |
|------|------|------|------|
| `/api/health` | GET | 否 | 基础健康检查 |
| `/api/health/detailed` | GET | 否 | 详细健康检查 |
| `/api/health/live` | GET | 否 | 存活探针 (Kubernetes) |
| `/api/health/ready` | GET | 否 | 就绪探针 (Kubernetes) |
| `/api/status` | GET | 是 | 系统状态 |

---

## 认证 API

### 注册用户

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword",
  "rememberMe": true
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

### 登出

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 任务 API

### 获取任务列表

```http
GET /api/tasks?page=1&limit=20&status=active&priority=high
Authorization: Bearer <token>
```

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `page` | number | 否 | 页码 (默认: 1) |
| `limit` | number | 否 | 每页数量 (默认: 20) |
| `status` | string | 否 | 状态筛选: `active`, `completed`, `all` |
| `priority` | string | 否 | 优先级: `low`, `medium`, `high` |
| `search` | string | 否 | 搜索关键词 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "123",
        "title": "Task Title",
        "description": "Task Description",
        "status": "active",
        "priority": "high",
        "dueDate": "2024-12-31",
        "tags": ["urgent", "frontend"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-02T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 获取单个任务

```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Task Title",
    "description": "Task Description",
    "status": "active",
    "priority": "high",
    "dueDate": "2024-12-31",
    "tags": ["urgent", "frontend"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### 创建任务

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task Description",
  "priority": "high",
  "dueDate": "2024-12-31",
  "tags": ["urgent", "frontend"]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Task Title",
    "description": "Task Description",
    "status": "active",
    "priority": "high",
    "dueDate": "2024-12-31",
    "tags": ["urgent", "frontend"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 更新任务

```http
PUT /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "completed"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Updated Title",
    "description": "Task Description",
    "status": "completed",
    "priority": "high",
    "dueDate": "2024-12-31",
    "tags": ["urgent", "frontend"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-03T00:00:00Z"
  }
}
```

### 删除任务

```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## 权限控制 API (RBAC) v1.0.8

> **新增功能**: RBAC (Role-Based Access Control) 权限控制系统

### 概述

RBAC 系统提供基于角色的细粒度访问控制，支持角色和权限管理。

### 角色 (Roles)

| 角色 | 描述 | 权限范围 |
|------|------|----------|
| `admin` | 管理员 | 所有权限 |
| `moderator` | 版主 | 读取、写入、审核、导出、导入 |
| `user` | 普通用户 | 读取、写入 |
| `guest` | 访客 | 仅读取 |

### 权限 (Permissions)

| 权限 | 描述 |
|------|------|
| `read` | 读取数据 |
| `write` | 写入数据 |
| `delete` | 删除数据 |
| `admin` | 管理操作 |
| `moderate` | 内容审核 |
| `export` | 数据导出 |
| `import` | 数据导入 |
| `backup` | 备份操作 |
| `restore` | 恢复操作 |

### 检查用户权限

```http
GET /api/permissions/check
Authorization: Bearer <token>

{
  "permission": "write"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "user": {
      "id": "123",
      "roles": ["user"],
      "permissions": ["read", "write"]
    }
  }
}
```

### 获取用户角色

```http
GET /api/permissions/roles
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userId": "123",
    "roles": ["user"],
    "permissions": ["read", "write"]
  }
}
```

### 分配角色

```http
POST /api/permissions/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "456",
  "roles": ["moderator"]
}
```

**所需权限**: `admin`

**响应示例**:

```json
{
  "success": true,
  "message": "Roles assigned successfully"
}
```

### 移除角色

```http
DELETE /api/permissions/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "456",
  "roles": ["moderator"]
}
```

**所需权限**: `admin`

**响应示例**:

```json
{
  "success": true,
  "message": "Roles removed successfully"
}
```

---

## 性能报告 API v1.0.8

> **新增功能**: 性能指标监控和报告接口

### 获取性能指标

```http
GET /api/performance/metrics
Authorization: Bearer <token>

{
  "timeRange": "24h",
  "metrics": ["responseTime", "errorRate", "throughput"]
}
```

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `timeRange` | string | 否 | 时间范围: `1h`, `24h`, `7d`, `30d` (默认: `24h`) |
| `metrics` | array | 否 | 指标列表 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "timeRange": "24h",
    "metrics": {
      "responseTime": {
        "avg": 125.5,
        "p50": 110,
        "p95": 180,
        "p99": 250
      },
      "errorRate": {
        "value": 0.02,
        "count": 24
      },
      "throughput": {
        "requestsPerSecond": 156.3,
        "totalRequests": 13500000
      }
    },
    "webVitals": {
      "fcp": 1000,
      "lcp": 1500,
      "tti": 2000,
      "cls": 0.03,
      "inp": 80
    }
  }
}
```

### 获取性能报告

```http
GET /api/performance/report
Authorization: Bearer <token>

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "json"
}
```

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `startDate` | string | 否 | 开始日期 (YYYY-MM-DD) |
| `endDate` | string | 否 | 结束日期 (YYYY-MM-DD) |
| `format` | string | 否 | 输出格式: `json`, `xlsx` (默认: `json`) |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "summary": {
      "totalRequests": 15000000,
      "avgResponseTime": 125.5,
      "errorRate": 0.02,
      "uptime": 99.95
    },
    "endpoints": [
      {
        "path": "/api/tasks",
        "requests": 5000000,
        "avgResponseTime": 110,
        "errorRate": 0.01
      }
    ]
  }
}
```

---

## 备份 API v1.0.8

> **新增功能**: 数据库备份端点（受保护）

### 列出可用备份

```http
GET /api/backup
Authorization: Bearer <token>
```

**所需权限**: `backup`

**响应示例**:

```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup_20240101_000000",
        "name": "backup_20240101_000000.sql",
        "size": 1024000,
        "createdAt": "2024-01-01T00:00:00Z",
        "status": "completed"
      }
    ],
    "count": 1
  }
}
```

### 创建备份

```http
POST /api/backup
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Pre-deployment backup",
  "compression": true
}
```

**所需权限**: `backup`

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "backup_20240122_143000",
    "name": "backup_20240122_143000.sql.gz",
    "description": "Pre-deployment backup",
    "status": "in_progress",
    "createdAt": "2024-01-22T14:30:00Z"
  }
}
```

### 下载备份

```http
GET /api/backup/:id/download
Authorization: Bearer <token>
```

**所需权限**: `backup`

**响应**: SQL 或压缩的 SQL 文件

### 删除备份

```http
DELETE /api/backup/:id
Authorization: Bearer <token>
```

**所需权限**: `backup` 或 `admin`

**响应示例**:

```json
{
  "success": true,
  "message": "Backup deleted successfully"
}
```

---

## 导出 API v1.0.8

> **更新功能**: 数据导出端点（受保护）

### 获取导出选项

```http
GET /api/export
Authorization: Bearer <token>
```

**所需权限**: `export`

**响应示例**:

```json
{
  "success": true,
  "data": {
    "formats": ["json", "csv", "xlsx"],
    "default": "json",
    "maxRecords": 10000,
    "fields": [
      "id",
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "tags",
      "createdAt",
      "updatedAt"
    ]
  },
  "timestamp": "2024-01-22T14:30:00Z"
}
```

### 导出任务数据为 Excel

```http
GET /api/export/xlsx?format=excel&dateRange=last30days
Authorization: Bearer <token>
```

**所需权限**: `export`

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `dateRange` | string | 否 | 日期范围: `last7days`, `last30days`, `all` |
| `status` | string | 否 | 状态筛选 |
| `priority` | string | 否 | 优先级筛选 |
| `includeCompleted` | boolean | 否 | 是否包含已完成任务 |

**响应**: Excel (.xlsx) 文件

### 导出任务数据为 JSON

```http
GET /api/export/json?includeCompleted=true
Authorization: Bearer <token>
```

**所需权限**: `export`

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `dateRange` | string | 否 | 日期范围 |
| `status` | string | 否 | 状态筛选 |
| `priority` | string | 否 | 优先级筛选 |
| `includeCompleted` | boolean | 否 | 是否包含已完成任务 |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Task Title",
      "description": "Task Description",
      "status": "active",
      "priority": "high",
      "dueDate": "2024-12-31",
      "tags": ["urgent", "frontend"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    }
  ],
  "meta": {
    "exportDate": "2024-01-22T14:30:00Z",
    "count": 1,
    "format": "json"
  }
}
```

### 导出为 CSV

```http
GET /api/export/csv
Authorization: Bearer <token>
```

**所需权限**: `export`

**响应**: CSV 文件

---

## 健康检查 API

### 基础健康检查

```http
GET /api/health
```

**响应示例**:

```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": "ok",
    "timestamp": "2024-01-22T14:30:00Z"
  }
}
```

### 详细健康检查

```http
GET /api/health/detailed
```

**响应示例**:

```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": {
      "status": "connected",
      "size": 102400000
    },
    "memory": {
      "heapUsed": 52428800,
      "heapTotal": 104857600,
      "rss": 157286400
    },
    "uptime": 3600,
    "timestamp": "2024-01-22T14:30:00Z"
  }
}
```

### 存活探针 (Liveness)

```http
GET /api/health/live
```

**响应示例**:

```json
{
  "status": "alive",
  "timestamp": "2024-01-22T14:30:00Z"
}
```

**用途**: Kubernetes liveness probe - 检查服务是否存活

### 就绪探针 (Readiness)

```http
GET /api/health/ready
```

**响应示例**:

```json
{
  "status": "ready",
  "timestamp": "2024-01-22T14:30:00Z"
}
```

**用途**: Kubernetes readiness probe - 检查服务是否准备好接收流量

---

## 状态 API

### 获取系统状态

```http
GET /api/status
Authorization: Bearer <token>
```

**响应示例**:

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-22T14:30:00Z",
  "uptime": 3600
}
```

**注意**: 此端点返回最小化信息以防止信息泄露

---

## GitHub API

### 获取提交记录

```http
GET /api/github/commits?owner=owner&repo=repo&branch=main
Authorization: Bearer <token>
```

**查询参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `owner` | string | 否 | 仓库所有者 (默认: owner) |
| `repo` | string | 否 | 仓库名 (默认: repo) |
| `branch` | string | 否 | 分支名 (默认: main) |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "sha": "abc123",
      "message": "Initial commit",
      "author": "John Doe",
      "date": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "owner": "owner",
    "repo": "repo",
    "branch": "main",
    "count": 1
  }
}
```

---

## WebSocket API

### 连接

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  auth: { token: 'your-token' }
});
```

### 事件

| 事件 | 方向 | 描述 |
|------|------|------|
| `task:created` | Server → Client | 任务创建通知 |
| `task:updated` | Server → Client | 任务更新通知 |
| `task:deleted` | Server → Client | 任务删除通知 |
| `user:joined` | Server → Client | 用户加入 |
| `user:left` | Server → Client | 用户离开 |

### 示例

```javascript
// 监听任务创建事件
socket.on('task:created', (task) => {
  console.log('New task created:', task);
});

// 监听任务更新事件
socket.on('task:updated', (task) => {
  console.log('Task updated:', task);
});

// 发送事件到服务器
socket.emit('task:create', {
  title: 'New Task',
  description: 'Task description'
});
```

---

## 错误处理

### 错误响应格式

所有 API 错误都遵循统一的格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|----------|------|
| `UNAUTHORIZED` | 401 | 未授权或 Token 无效 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

### 示例

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action",
    "details": {
      "requiredPermission": "delete",
      "userPermissions": ["read", "write"]
    }
  }
}
```

---

## 版本历史

### v1.0.8 (2026-03-22)

**新增**:
- ✅ RBAC 权限控制 API (`/api/permissions/*`)
- ✅ 性能报告 API (`/api/performance/*`)
- ✅ 备份 API (`/api/backup/*`)
- ✅ 导出 API (`/api/export/*`)

**更新**:
- 🔄 健康检查 API 增强 (`/api/health/detailed`)
- 🔄 状态 API 安全加固（移除版本和环境信息）
- 🔄 XLSX 导出改为 ExcelJS 以提高安全性

**安全**:
- 🛡️ 实施细粒度访问控制
- 🛡️ 错误响应不暴露敏感信息
- 🛡️ 状态端点最小化信息泄露

**性能**:
- ⚡ React.memo 优化组件渲染
- ⚡ XLSX 库改为动态导入（减少 30% 初始包体积）
- ⚡ Web Vitals 集成

---

## 附录

### 数据类型

#### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}
```

#### Role

```typescript
type Role = 'admin' | 'moderator' | 'user' | 'guest';
```

#### Permission

```typescript
type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'moderate'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore';
```

### 速率限制

某些 API 端点有速率限制：

| 端点 | 限制 | 窗口 |
|------|------|------|
| `/api/auth/login` | 10 请求 | 15 分钟 |
| `/api/auth/register` | 5 请求 | 1 小时 |
| `/api/export/*` | 20 请求 | 1 小时 |
| `/api/backup` | 5 请求 | 1 小时 |

超过限制将返回 `429 Too Many Requests`：

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 3600
    }
  }
}
```

---

**最后更新**: 2026-03-22
**文档版本**: 1.0.8
