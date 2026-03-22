# 📡 7zi API 实际参考

**基于实际代码库生成的准确 API 文档**

---

**Last Updated:** 2026-03-22
**Version:** v1.0.8
**Total Endpoints:** ~21

---

## ⚠️ 重要说明

本文档基于实际代码库扫描生成，包含所有实际存在的 API 端点。

如果本文档与 [API.md](../API.md) 不一致，请以本文档为准。

---

## 📋 API 端点总览

| 模块 | 端点数 | 路径前缀 |
|------|-------|---------|
| Authentication | 3 | `/api/auth` |
| MCP RPC | 1 | `/api/mcp/rpc` |
| Notifications | 7 | `/api/notifications` |
| Projects | 2 | `/api/projects` |
| Users | 4 | `/api/users` |
| **总计** | **~17** | - |

---

## 🔐 Authentication APIs

### POST /api/auth/login

用户登录。

**请求体:**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": "user-123",
    "username": "string",
    "email": "string"
  }
}
```

**响应 (401 Unauthorized):**
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

**状态码:**
- `200` - 登录成功
- `400` - 验证错误
- `401` - 认证失败
- `500` - 服务器错误

---

### PUT /api/auth/register

用户注册。

**请求体:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**响应 (201 Created):**
```json
{
  "success": true,
  "message": "注册成功"
}
```

**状态码:**
- `201` - 注册成功
- `400` - 验证错误
- `500` - 服务器错误

---

### PATCH /api/auth/reset-password

重置密码。

**请求体:**
```json
{
  "token": "string",
  "password": "string"
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

**状态码:**
- `200` - 重置成功
- `400` - 验证错误
- `500` - 服务器错误

---

## 🤖 MCP RPC API

### POST /api/mcp/rpc

MCP (Model Context Protocol) JSON-RPC 2.0 接口。

**请求体:**
```json
{
  "jsonrpc": "2.0",
  "method": "string",
  "params": {},
  "id": "string|number"
}
```

**响应 (200 OK):**
```json
{
  "jsonrpc": "2.0",
  "result": {},
  "id": "string|number"
}
```

**响应 (Error):**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  },
  "id": null
}
```

**状态码:**
- `200` - 请求成功
- `400` - 无效的 JSON-RPC 请求
- `500` - 服务器错误

---

## 🔔 Notifications APIs

### GET /api/notifications

获取通知列表（支持过滤）。

**查询参数:**
| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `type` | string | 否 | - | 通知类型 (info/success/warning/error/task_assigned/task_completed/system) |
| `priority` | string | 否 | - | 优先级 (low/medium/high/urgent) |
| `userId` | string | 否 | - | 用户 ID 过滤 |
| `teamId` | string | 否 | - | 团队 ID 过滤 |
| `taskId` | string | 否 | - | 任务 ID 过滤 |
| `read` | boolean | 否 | - | 已读/未读过滤 |
| `since` | number | 否 | - | 时间戳（毫秒） |
| `limit` | number | 否 | 50 | 返回数量限制 |

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "info",
        "priority": "medium",
        "title": "Notification Title",
        "message": "Notification message",
        "read": false,
        "createdAt": 1711200000000
      }
    ],
    "meta": {
      "count": 1,
      "unreadCount": 10
    }
  }
}
```

**状态码:**
- `200` - 成功
- `500` - 服务器错误

---

### POST /api/notifications

创建新通知。

**请求体:**
```json
{
  "type": "info",
  "priority": "medium",
  "title": "string",
  "message": "string",
  "data": {},
  "userId": "string",
  "teamId": "string",
  "taskId": "string",
  "expiresAt": 1711200000000
}
```

**响应 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "message": "Notification created"
  }
}
```

**状态码:**
- `201` - 创建成功
- `400` - 验证错误
- `500` - 服务器错误

---

### GET /api/notifications/enhanced

获取增强通知（包含更多元数据）。

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [],
    "meta": {
      "count": 0
    }
  }
}
```

---

### POST /api/notifications/enhanced

创建增强通知。

**请求体:**
```json
{
  "type": "string",
  "priority": "string",
  "title": "string",
  "message": "string",
  "data": {}
}
```

**响应 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "notif_123"
  }
}
```

---

### GET /api/notifications/stats

获取通知统计信息。

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "unread": 10,
    "byType": {
      "info": 40,
      "success": 20,
      "warning": 20,
      "error": 20
    },
    "byPriority": {
      "low": 30,
      "medium": 50,
      "high": 15,
      "urgent": 5
    }
  }
}
```

---

### GET /api/notifications/[id]

获取特定通知详情。

**URL 参数:**
- `id` - 通知 ID

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "type": "info",
    "priority": "medium",
    "title": "Title",
    "message": "Message",
    "read": false,
    "createdAt": 1711200000000
  }
}
```

---

### DELETE /api/notifications/[id]

删除特定通知。

**URL 参数:**
- `id` - 通知 ID

**响应 (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### WebSocket /api/notifications/socket

WebSocket 端点用于实时通知推送。

**客户端连接:**
```javascript
const socket = new WebSocket('wss://your-domain.com/api/notifications/socket');

socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // 处理通知
};
```

---

### GET /api/notifications/preferences/[userId]

获取用户通知偏好设置。

**URL 参数:**
- `userId` - 用户 ID

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "emailEnabled": true,
    "pushEnabled": true,
    "quietHours": {
      "start": "22:00",
      "end": "08:00"
    },
    "thresholds": {
      "minPriority": "low"
    }
  }
}
```

---

### PUT /api/notifications/preferences/[userId]

更新用户通知偏好设置。

**URL 参数:**
- `userId` - 用户 ID

**请求体:**
```json
{
  "emailEnabled": true,
  "pushEnabled": true,
  "quietHours": {
    "start": "22:00",
    "end": "08:00"
  },
  "thresholds": {
    "minPriority": "low"
  }
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "emailEnabled": true,
    "pushEnabled": true
  }
}
```

---

## 📁 Projects APIs

### GET /api/projects

获取项目列表。

**响应 (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "Project Name",
      "description": "Project description",
      "status": "active",
      "createdAt": 1711200000000
    }
  ]
}
```

---

### POST /api/projects

创建新项目。

**请求体:**
```json
{
  "name": "string",
  "description": "string",
  "status": "active"
}
```

**响应 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "string",
    "description": "string",
    "status": "active",
    "createdAt": 1711200000000
  }
}
```

---

## 👥 Users APIs

### GET /api/users

获取用户列表。

**查询参数:**
| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量 |
| `role` | string | 否 | - | 角色过滤 |

**响应 (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "username": "string",
      "email": "string",
      "role": "MEMBER",
      "status": "active",
      "createdAt": 1711200000000
    }
  ],
  "meta": {
    "count": 1,
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

### POST /api/users

创建新用户。

**请求体:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "MEMBER"
}
```

**响应 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "username": "string",
    "email": "string",
    "role": "MEMBER",
    "status": "active",
    "createdAt": 1711200000000
  }
}
```

---

### PATCH /api/users

更新用户信息。

**查询参数:**
- `id` - 用户 ID

**请求体:**
```json
{
  "username": "string",
  "email": "string",
  "role": "MANAGER",
  "status": "active"
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "string",
    "email": "string",
    "role": "MANAGER",
    "status": "active",
    "updatedAt": 1711200000000
  }
}
```

---

### DELETE /api/users

删除用户。

**查询参数:**
- `id` - 用户 ID

**响应 (200 OK):**
```json
{
  "success": true,
  "message": "User deleted"
}
```

---

## 📊 通知类型和优先级

### 通知类型 (NotificationType)

| 类型 | 值 | 描述 |
|------|-----|------|
| INFO | `info` | 一般信息 |
| SUCCESS | `success` | 成功消息 |
| WARNING | `warning` | 警告消息 |
| ERROR | `error` | 错误消息 |
| TASK_ASSIGNED | `task_assigned` | 任务分配 |
| TASK_COMPLETED | `task_completed` | 任务完成 |
| SYSTEM | `system` | 系统消息 |

### 通知优先级 (NotificationPriority)

| 优先级 | 值 | 描述 |
|--------|-----|------|
| 低 | `low` | 低优先级 |
| 中 | `medium` | 中等优先级（默认） |
| 高 | `high` | 高优先级 |
| 紧急 | `urgent` | 紧急通知 |

---

## 🔐 认证

目前所有端点都**不需要认证**（开发模式）。

生产环境需要在所有受保护的端点中添加 JWT 认证中间件。

**建议的认证流程:**
1. 用户调用 `POST /api/auth/login` 获取 token
2. 客户端在后续请求的 `Authorization` header 中携带 token
3. 服务端验证 token 并提取用户信息

---

## 📝 常用错误响应

### 验证错误 (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": [
      {
        "field": "username",
        "message": "Username is required"
      }
    ]
  }
}
```

### 未授权 (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing credentials"
  }
}
```

### 未找到 (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 服务器错误 (500)
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

## 🧪 测试 API

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# 获取通知
curl http://localhost:3000/api/notifications?limit=10

# 创建通知
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Test message","type":"info"}'

# 获取项目列表
curl http://localhost:3000/api/projects

# 创建项目
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","description":"A test project"}'

# 获取用户列表
curl http://localhost:3000/api/users

# 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"pass123"}'
```

---

## 📚 相关文档

- [主 API 文档](../API.md) - （部分过时）
- [架构文档](./ARCHITECTURE.md)
- [开发指南](./DEVELOPMENT.md)
- [API 参考文档](./API-REFERENCE.md)

---

**生成时间**: 2026-03-22
**基于代码**: 7zi-frontend/src/app/api/
**下次更新**: v1.0.9 发布后
