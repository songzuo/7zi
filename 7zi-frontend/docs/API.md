# API 文档 / API Documentation

本文档描述 7zi-frontend 项目的所有 API 端点。

**版本**: v1.3.0  
**最后更新**: 2026-03-28

---

## 📋 目录

- [认证](#认证)
- [API 端点列表](#api-端点列表)
  - [认证 API](#认证-api)
  - [用户管理 API](#用户管理-api)
  - [项目管理 API](#项目管理-api)
  - [反馈系统 API](#反馈系统-api)
  - [通知系统 API](#通知系统-api)
  - [搜索 API](#搜索-api)
  - [数据导入 API](#数据导入-api)
  - [MCP 协议 API](#mcp-协议-api)
  - [Server Actions 缓存 API](#server-actions-缓存-api)
- [错误处理](#错误处理)
- [速率限制](#速率限制)

---

## 认证

### JWT 认证

大多数 API 端点需要 JWT 认证。认证方式：

1. **Cookie**: `Authorization: Bearer <token>` (推荐)
2. **Header**: `Authorization: Bearer <token>`

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key 认证

MCP API 使用 API Key 认证：

```http
X-API-Key: your-api-key-here
```

### 权限系统

系统使用 RBAC (基于角色的访问控制)：

| 角色等级 | 角色名      | 权限范围   |
| -------- | ----------- | ---------- |
| 100      | super_admin | 完全访问   |
| 80       | admin       | 管理员权限 |
| 60       | team_leader | 团队管理   |
| 40       | developer   | 开发权限   |
| 20       | user        | 普通用户   |

---

## API 端点列表

### 认证 API

#### `POST /api/auth`

用户认证端点。

**请求体**:

```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:

```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  }
}
```

---

### 用户管理 API

#### `GET /api/users`

列出所有用户（需要 `user:list` 权限）。

**Headers**:

- `x-user-id`: 用户 ID

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "roles": ["developer"]
    }
  ]
}
```

**权限要求**: `user:list`

---

#### `POST /api/users`

创建新用户（需要 `user:create` 权限）。

**请求体**:

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**权限要求**: `user:create`

---

### 项目管理 API

#### `GET /api/projects`

列出所有项目（需要 `project:read` 权限）。

**Headers**:

- `x-user-id`: 用户 ID

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "ownerId": "string",
      "isOwner": true
    }
  ]
}
```

**权限要求**: `project:read`

---

#### `POST /api/projects`

创建新项目（需要 `project:create` 权限）。

**请求体**:

```json
{
  "name": "string",
  "description": "string"
}
```

**权限要求**: `project:create`

---

### 反馈系统 API

#### `GET /api/feedback`

获取反馈列表。

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20，最大 100 |
| type | string | 否 | 类型: bug, feature, improvement, complaint, praise, other |
| priority | string | 否 | 优先级: low, medium, high, urgent |
| status | string | 否 | 状态: pending, in_progress, resolved, closed, rejected |
| rating | number | 否 | 评分: 1-5 |
| q | string | 否 | 搜索关键词 |
| dateFrom | number | 否 | 开始时间戳 |
| dateTo | number | 否 | 结束时间戳 |

**响应**:

```json
{
  "success": true,
  "data": {
    "feedbacks": [
      {
        "id": "string",
        "userId": "string",
        "userName": "string",
        "type": "bug",
        "priority": "medium",
        "status": "pending",
        "title": "string",
        "description": "string",
        "createdAt": 1711641600000
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

#### `POST /api/feedback`

提交新反馈（需要认证）。

**请求体**:

```json
{
  "type": "bug|feature|improvement|complaint|praise|other",
  "priority": "low|medium|high|urgent",
  "title": "string (1-100 字符)",
  "description": "string (10-1000 字符)",
  "url": "string (可选)",
  "email": "string (可选)",
  "attachments": ["string"],
  "tags": ["string"],
  "rating": 1-5
}
```

**响应**:

```json
{
  "success": true,
  "message": "感谢您的反馈！我们会尽快处理。",
  "data": {
    "id": "string",
    "type": "bug",
    "title": "string",
    "status": "pending",
    "createdAt": 1711641600000
  }
}
```

---

#### `PATCH /api/feedback`

更新反馈状态（需要管理员权限）。

**请求体**:

```json
{
  "feedbackId": "string",
  "status": "pending|in_progress|resolved|closed|rejected",
  "adminResponse": "string (可选)",
  "priority": "low|medium|high|urgent"
}
```

**权限要求**: `admin`

---

#### `DELETE /api/feedback`

删除反馈（需要管理员权限）。

**查询参数**:

- `id`: 反馈 ID

**权限要求**: `admin`

---

#### `GET /api/feedback/stats`

获取反馈统计信息（需要管理员权限）。

**响应**:

```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 100,
      "byType": { "bug": 30, "feature": 40 },
      "byStatus": { "pending": 20, "resolved": 50 },
      "avgRating": 4.2
    }
  }
}
```

**权限要求**: `admin`

---

#### `POST /api/feedback/response`

添加管理员回复（需要管理员权限）。

**请求体**:

```json
{
  "feedbackId": "string",
  "response": "string",
  "adminId": "string",
  "adminName": "string"
}
```

**权限要求**: `admin`

---

#### `GET /api/feedback/export`

导出反馈为 CSV（需要管理员权限）。

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| type | string | 按类型过滤 |
| priority | string | 按优先级过滤 |
| status | string | 按状态过滤 |

**权限要求**: `admin`

---

### 通知系统 API

#### `GET /api/notifications`

获取通知列表。

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| userId | string | 用户 ID |
| unreadOnly | boolean | 仅未读 |
| page | number | 页码 |
| limit | number | 每页数量 |

---

#### `GET /api/notifications/stats`

获取通知统计。

**响应**:

```json
{
  "success": true,
  "data": {
    "unread": 5,
    "total": 100
  }
}
```

---

#### `GET /api/notifications/enhanced`

获取增强通知（支持 WebSocket）。

---

#### `GET /api/notifications/socket`

WebSocket 连接状态。

---

#### `GET /api/notifications/[id]`

获取单个通知详情。

---

#### `GET /api/notifications/preferences/[userId]`

获取用户通知偏好设置。

---

### 搜索 API

#### `GET /api/search`

全局搜索（需要认证）。

**查询参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| q | string | 搜索关键词 |
| type | string | 搜索类型 |
| page | number | 页码 |
| limit | number | 每页数量 |

**权限要求**: 认证用户

---

### 数据导入 API

#### `POST /api/data/import`

导入数据（需要认证）。

**请求体**:

```json
{
  "type": "string",
  "data": "object",
  "options": {
    "overwrite": false,
    "validate": true
  }
}
```

**权限要求**: 认证用户

---

### MCP 协议 API

#### `GET /api/mcp/rpc`

获取 MCP Server 信息。

**响应**:

```json
{
  "name": "OpenClaw MCP Server",
  "version": "1.0.0",
  "protocol": "Model Context Protocol (MCP)",
  "specification": "https://modelcontextprotocol.io/specification",
  "endpoints": {
    "rpc": "/api/mcp/rpc"
  },
  "methods": {
    "tools/list": "List available tools",
    "tools/call": "Execute a tool"
  },
  "auth": {
    "method": "API Key",
    "header": "X-API-Key"
  }
}
```

---

#### `POST /api/mcp/rpc`

处理 MCP JSON-RPC 2.0 请求（需要 API Key 认证）。

**Headers**:

- `X-API-Key`: API 密钥

**请求体** (列出工具):

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/list"
}
```

**请求体** (调用工具):

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  }
}
```

**响应**:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read the contents of a file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": { "type": "string" }
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

**支持的方法**:
| 方法 | 描述 |
|------|------|
| `tools/list` | 列出可用工具 |
| `tools/call` | 执行工具调用 |

**错误码**:
| 代码 | 描述 |
|------|------|
| -32700 | JSON 解析错误 |
| -32600 | 无效请求 |
| -32601 | 方法不存在 |
| -32602 | 无效参数 |
| -32603 | 内部错误 |
| -32001 | 认证失败 |

---

## 错误处理

### 标准错误响应格式

```json
{
  "success": false,
  "error": "Error Type",
  "message": "详细错误信息",
  "errors": [
    {
      "field": "fieldName",
      "message": "具体错误"
    }
  ]
}
```

### HTTP 状态码

| 状态码 | 描述           |
| ------ | -------------- |
| 200    | 成功           |
| 201    | 创建成功       |
| 400    | 请求参数错误   |
| 401    | 未认证         |
| 403    | 权限不足       |
| 404    | 资源不存在     |
| 429    | 请求过于频繁   |
| 500    | 服务器内部错误 |

---

## 速率限制

### 限制策略

| 端点类型 | 限制         | 窗口期 |
| -------- | ------------ | ------ |
| 认证 API | 10 次/分钟   | 60 秒  |
| 普通用户 | 100 次/分钟  | 60 秒  |
| 认证用户 | 300 次/分钟  | 60 秒  |
| 管理员   | 1000 次/分钟 | 60 秒  |

### 响应头

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711641600
```

---

## API 端点完整列表

```
/api/auth                                    # 认证
├── POST                                     # 用户登录

/api/users                                   # 用户管理
├── GET                                      # 列出用户
└── POST                                     # 创建用户

/api/projects                                # 项目管理
├── GET                                      # 列出项目
└── POST                                     # 创建项目

/api/feedback                                # 反馈系统
├── GET                                      # 列出反馈
├── POST                                     # 提交反馈
├── PATCH                                    # 更新反馈
├── DELETE                                   # 删除反馈
├── /stats                                   # 统计
│   └── GET                                  # 获取统计
├── /response                                # 回复
│   └── POST                                 # 添加回复
└── /export                                  # 导出
    └── GET                                  # 导出 CSV

/api/notifications                           # 通知系统
├── GET                                      # 列出通知
├── /[id]                                    # 单个通知
│   └── GET                                  # 获取详情
├── /stats                                   # 统计
│   └── GET                                  # 获取统计
├── /socket                                  # WebSocket
│   └── GET                                  # 连接状态
├── /enhanced                                # 增强通知
│   └── GET                                  # 获取增强通知
└── /preferences/[userId]                    # 偏好设置
    └── GET                                  # 获取偏好

/api/search                                  # 搜索
└── GET                                      # 全局搜索

/api/data                                    # 数据操作
└── /import                                  # 导入
    └── POST                                 # 导入数据

/api/mcp                                     # MCP 协议
└── /rpc                                     # JSON-RPC 端点
    ├── GET                                  # 获取服务信息
    ├── POST                                 # 执行 RPC 请求
    └── OPTIONS                              # CORS 预检
```

**总计**: 16 个 API 端点

---

## Server Actions 缓存 API

### 概述

v1.3.0 引入了 Server Actions 缓存 API，提供精细的缓存控制机制，确保数据一致性和性能优化。

### 可用的缓存函数

#### `updateTag(tags: string | string[])`

更新缓存标签，确保用户立即看到自己的更新（Read-Your-Writes 语义）。

**参数**:

- `tags`: 单个标签或标签数组

**示例**:

```typescript
'use server'

import { updateTag } from '@/lib/cache/actions'

async function updateUserData(userId: string, data: any) {
  // 更新数据库
  await db.users.update(userId, data)

  // 立即刷新缓存
  updateTag(`user-${userId}`)
}
```

---

#### `refresh(tags: string | string[])`

仅刷新未缓存的数据，提高效率。

**参数**:

- `tags`: 单个标签或标签数组

**示例**:

```typescript
'use server'

import { refresh } from '@/lib/cache/actions'

async function refreshDashboardData(userId: string) {
  // 刷新仪表板相关缓存
  refresh(['dashboard', `user-${userId}`])
}
```

---

#### `revalidateTag(tag: string, cacheLife?: CacheLifeProfile)`

按标签重新验证缓存，支持细粒度缓存控制。

**参数**:

- `tag`: 要重新验证的标签
- `cacheLife`: 可选，缓存生命周期配置

**Cache Life Profiles**:

- `'max'` - 最大缓存时间
- `'hours'` - 按小时缓存
- `'minutes'` - 按分钟缓存
- `'min'` - 最小缓存时间

**示例**:

```typescript
'use server'

import { revalidateTag } from '@/lib/cache/actions'
import type { CacheLifeProfile } from '@/lib/cache/types'

async function invalidatePostCache(postId: string) {
  // 使用默认缓存配置
  revalidateTag(`post-${postId}`)

  // 使用自定义缓存配置
  revalidateTag(`post-${postId}`, 'minutes')
}
```

### 缓存最佳实践

1. **Read-Your-Writes 语义**: 用户更新数据后立即刷新相关缓存

   ```typescript
   await updateData(id, data)
   updateTag(`data-${id}`)
   ```

2. **批量刷新**: 使用标签数组批量刷新多个缓存

   ```typescript
   refresh(['dashboard', 'notifications', `user-${userId}`])
   ```

3. **细粒度控制**: 根据数据更新频率选择合适的 cacheLife profile

   ```typescript
   // 静态数据使用 'max'
   revalidateTag('static-config', 'max')

   // 频繁更新数据使用 'minutes'
   revalidateTag('real-time-stats', 'minutes')
   ```

4. **错误处理**: 缓存操作失败不应影响业务逻辑
   ```typescript
   try {
     await updateData(id, data)
     updateTag(`data-${id}`)
   } catch (error) {
     console.error('Update failed:', error)
     throw error // 重新抛出错误
   }
   ```

### 性能指标

| 指标         | 优化前     | 优化后    | 提升     |
| ------------ | ---------- | --------- | -------- |
| 缓存失效延迟 | ~200-500ms | ~20-100ms | 80-90% ↓ |

### 迁移指南

从 v1.2.0 迁移到 v1.3.0：

1. **导入缓存函数**:

   ```typescript
   import { updateTag, refresh, revalidateTag } from '@/lib/cache/actions'
   ```

2. **在 Server Action 中使用**:

   ```typescript
   'use server'

   async function updateUser(id: string, data: any) {
     // 数据库更新
     const result = await db.users.update(id, data)

     // 缓存更新（新增）
     updateTag(`user-${id}`)

     return result
   }
   ```

3. **配置 cacheLife profiles**（可选）:

   ```typescript
   import type { CacheLifeProfile } from '@/lib/cache/types'

   async function cacheConfigurableData(tag: string, profile: CacheLifeProfile) {
     revalidateTag(tag, profile)
   }
   ```

---

## 变更日志

### v1.3.0 (2026-03-28)

**新增功能**:

- Server Actions 缓存 API - `updateTag()`, `refresh()`, `revalidateTag()` 支持精细缓存控制
- cacheLife profiles - 提供 max, hours, minutes, min 四种预设配置

**中间件更新**:

- `middleware.ts` 重命名为 `proxy.ts`
- 导出函数从 `middleware` 改为 `proxy`

**文档更新**:

- 新增 Server Actions 缓存 API 完整文档
- 添加缓存最佳实践和迁移指南
- 更新性能指标：缓存失效延迟从 ~200-500ms 降至 ~20-100ms (80-90% 提升)

**新增端点** (v1.2.1):

- `GET /api/feedback/stats` - 反馈统计
- `POST /api/feedback/response` - 管理员回复
- `GET /api/feedback/export` - CSV 导出
- `GET /api/notifications/stats` - 通知统计
- `GET /api/notifications/enhanced` - 增强通知
- `GET /api/notifications/socket` - WebSocket 状态
- `GET /api/notifications/preferences/[userId]` - 通知偏好

**安全增强** (v1.2.1):

- 所有端点添加 JWT 认证支持
- 添加速率限制
- 添加输入验证 (Zod)
- 添加 XSS/SQL 注入防护

---

**文档版本**: 1.3.0  
**最后更新**: 2026-03-28  
**维护者**: 📚 咨询师
