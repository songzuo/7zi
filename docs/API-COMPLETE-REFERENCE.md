# 📚 7zi Platform API 文档

> 完整的 API 接口文档和使用指南

最后更新：2026-03-21

---

## 📋 目录

- [概述](#概述)
- [认证](#认证)
- [Dashboard API](#dashboard-api)
- [任务管理 API](#任务管理-api)
- [用户管理 API](#用户管理-api)
- [通知 API](#通知-api)
- [报告 API](#报告-api)
- [导出 API](#导出-api)
- [WebSocket API](#websocket-api)
- [错误处理](#错误处理)
- [SDK 和客户端](#sdk-和客户端)

---

## 📖 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| **Base URL** | `https://api.7zi.com` (生产环境)<br>`http://localhost:3000` (开发环境) |
| **API 版本** | v1 |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |
| **认证方式** | JWT Bearer Token |

### 通用响应格式

**成功响应**：

```json
{
  "success": true,
  "data": {
    // 返回数据
  },
  "message": "操作成功"
}
```

**错误响应**：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 🔐 认证

### JWT 认证

#### 请求头格式

```http
Authorization: Bearer <token>
```

#### 获取 Token

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "用户名"
    }
  }
}
```

#### 刷新 Token

**POST** `/api/auth/refresh`

```json
{
  "refreshToken": "refresh_token_here"
}
```

---

## 📊 Dashboard API

### 获取 Dashboard 数据

**GET** `/api/dashboard`

**认证**：需要

**响应**：

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "member_1",
        "name": "智能体专家",
        "role": "专家",
        "status": "working",
        "tasksCompleted": 45,
        "tasksInProgress": 3
      }
    ],
    "tasks": {
      "total": 128,
      "completed": 95,
      "inProgress": 28,
      "pending": 5
    },
    "activities": [
      {
        "id": "activity_1",
        "type": "task_completed",
        "message": "完成了任务: 实现新功能",
        "timestamp": "2026-03-18T10:30:00Z",
        "member": "member_1"
      }
    ],
    "stats": {
      "efficiency": 0.92,
      "tasksToday": 12,
      "activeMembers": 11
    }
  }
}
```

### 获取成员列表

**GET** `/api/dashboard/members`

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 过滤状态：`working` \| `idle` \| `offline` |
| `role` | string | 过滤角色 |

**响应**：

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "member_1",
        "name": "智能体专家",
        "role": "专家",
        "avatar": "https://...",
        "status": "working",
        "lastActive": "2026-03-18T10:30:00Z"
      }
    ]
  }
}
```

### 获取活动日志

**GET** `/api/dashboard/activities`

**查询参数**：

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `limit` | number | 返回数量 | 20 |
| `offset` | number | 偏移量 | 0 |
| `type` | string | 活动类型 | - |

**响应**：

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity_1",
        "type": "task_created",
        "message": "创建了新任务",
        "timestamp": "2026-03-18T10:30:00Z",
        "member": {
          "id": "member_1",
          "name": "智能体专家"
        }
      }
    ],
    "total": 156,
    "hasMore": true
  }
}
```

---

## ✅ 任务管理 API

### 获取任务列表

**GET** `/api/tasks`

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 任务状态 |
| `priority` | string | 优先级 |
| `assignee` | string | 负责人 ID |
| `search` | string | 搜索关键词 |
| `page` | number | 页码 |
| `limit` | number | 每页数量 |

**响应**：

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "title": "实现用户认证功能",
        "description": "实现 JWT 认证...",
        "status": "in_progress",
        "priority": "high",
        "assignee": "member_1",
        "createdAt": "2026-03-18T08:00:00Z",
        "updatedAt": "2026-03-18T10:30:00Z",
        "dueDate": "2026-03-20T18:00:00Z",
        "tags": ["backend", "auth"],
        "progress": 0.65
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 128,
      "totalPages": 7
    }
  }
}
```

### 获取单个任务

**GET** `/api/tasks/:id`

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |

**响应**：

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task_123",
      "title": "实现用户认证功能",
      "description": "详细的任务描述...",
      "status": "in_progress",
      "priority": "high",
      "assignee": "member_1",
      "createdAt": "2026-03-18T08:00:00Z",
      "updatedAt": "2026-03-18T10:30:00Z",
      "dueDate": "2026-03-20T18:00:00Z",
      "tags": ["backend", "auth"],
      "progress": 0.65,
      "subtasks": [
        {
          "id": "subtask_1",
          "title": "设计数据库模型",
          "completed": true
        }
      ]
    }
  }
}
```

### 创建任务

**POST** `/api/tasks`

**请求体**：

```json
{
  "title": "新任务标题",
  "description": "任务描述",
  "priority": "high",
  "assignee": "member_1",
  "dueDate": "2026-03-20T18:00:00Z",
  "tags": ["frontend", "feature"]
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task_456",
      "title": "新任务标题",
      "status": "pending",
      "createdAt": "2026-03-18T10:45:00Z"
    }
  }
}
```

### 更新任务

**PUT** `/api/tasks/:id`

**请求体**（部分更新）：

```json
{
  "status": "completed",
  "progress": 1.0
}
```

### 删除任务

**DELETE** `/api/tasks/:id`

**响应**：

```json
{
  "success": true,
  "message": "任务已删除"
}
```

### 批量操作

**POST** `/api/tasks/batch`

**请求体**：

```json
{
  "action": "update_status",
  "taskIds": ["task_1", "task_2", "task_3"],
  "data": {
    "status": "in_progress"
  }
}
```

**支持的操作**：

- `update_status` - 更新状态
- `update_priority` - 更新优先级
- `assign` - 分配负责人
- `delete` - 批量删除
- `add_tags` - 添加标签
- `remove_tags` - 删除标签

---

## 👤 用户管理 API

### 获取用户信息

**GET** `/api/users/me`

**认证**：需要

**响应**：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "用户名",
      "avatar": "https://...",
      "role": "admin",
      "preferences": {
        "theme": "dark",
        "language": "zh",
        "notifications": true
      },
      "createdAt": "2026-01-01T00:00:00Z"
    }
  }
}
```

### 更新用户信息

**PUT** `/api/users/me`

**请求体**：

```json
{
  "name": "新用户名",
  "avatar": "https://...",
  "preferences": {
    "theme": "light"
  }
}
```

### 更新用户偏好

**PATCH** `/api/users/me/preferences`

**请求体**：

```json
{
  "theme": "dark",
  "language": "en",
  "notifications": {
    "email": true,
    "desktop": false
  }
}
```

---

## 🔔 通知 API

### 获取通知列表

**GET** `/api/notifications`

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `unread` | boolean | 只显示未读 |
| `type` | string | 通知类型 |
| `limit` | number | 返回数量 |

**响应**：

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_1",
        "type": "success",
        "title": "任务完成",
        "message": "任务「实现用户认证」已完成",
        "read": false,
        "createdAt": "2026-03-18T10:30:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

### 标记为已读

**POST** `/api/notifications/:id/read`

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 通知 ID |

**响应**：

```json
{
  "success": true,
  "message": "已标记为已读"
}
```

### 全部标记为已读

**POST** `/api/notifications/read-all`

---

## 📈 报告 API

### 生成报告

**POST** `/api/reports/generate`

**请求体**：

```json
{
  "type": "weekly",
  "startDate": "2026-03-11",
  "endDate": "2026-03-18",
  "format": "pdf"
}
```

**支持的报告类型**：

- `daily` - 每日报告
- `weekly` - 每周报告
- `monthly` - 每月报告
- `custom` - 自定义范围

**支持的格式**：

- `pdf` - PDF 文档
- `html` - HTML 文档

**响应**：

```json
{
  "success": true,
  "data": {
    "reportId": "report_123",
    "downloadUrl": "https://api.7zi.com/reports/report_123.pdf",
    "expiresAt": "2026-03-19T10:30:00Z"
  }
}
```

### 获取报告历史

**GET** `/api/reports`

**响应**：

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "report_123",
        "type": "weekly",
        "format": "pdf",
        "generatedAt": "2026-03-18T10:00:00Z",
        "downloadUrl": "https://...",
        "size": 102400
      }
    ]
  }
}
```

---

## 📤 导出 API

### 导出数据

**POST** `/api/export`

**请求体**：

```json
{
  "type": "tasks",
  "format": "csv",
  "filters": {
    "status": "completed",
    "startDate": "2026-03-01"
  }
}
```

**支持的导出类型**：

- `tasks` - 任务数据
- `members` - 成员数据
- `activities` - 活动日志
- `dashboard` - Dashboard 数据

**支持的格式**：

- `csv` - CSV 文件
- `json` - JSON 文件
- `xlsx` - Excel 文件

**响应**：

```json
{
  "success": true,
  "data": {
    "exportId": "export_123",
    "downloadUrl": "https://api.7zi.com/exports/export_123.csv",
    "expiresAt": "2026-03-19T10:30:00Z",
    "recordCount": 156
  }
}
```

---

## 🔌 WebSocket API

### 连接

```javascript
const socket = io('wss://api.7zi.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 事件

#### 服务端推送事件

**任务更新**

```javascript
socket.on('task:updated', (data) => {
  console.log('任务更新:', data);
  // { taskId, changes, timestamp }
});
```

**新活动**

```javascript
socket.on('activity:new', (activity) => {
  console.log('新活动:', activity);
  // { id, type, message, member, timestamp }
});
```

**通知**

```javascript
socket.on('notification', (notification) => {
  console.log('收到通知:', notification);
  // { id, type, title, message }
});
```

**成员状态变化**

```javascript
socket.on('member:status:changed', (data) => {
  console.log('成员状态变化:', data);
  // { memberId, status, previousStatus }
});
```

#### 客户端发送事件

**加入房间**

```javascript
socket.emit('room:join', { room: 'dashboard' });
```

**发送消息**

```javascript
socket.emit('message', {
  type: 'task_update',
  data: { taskId, status: 'completed' }
});
```

---

## ❌ 错误处理

### 错误码参考

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| `UNAUTHORIZED` | 未授权 | 401 |
| `FORBIDDEN` | 禁止访问 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 | 429 |
| `INTERNAL_ERROR` | 服务器错误 | 500 |
| `TASK_NOT_FOUND` | 任务不存在 | 404 |
| `USER_NOT_FOUND` | 用户不存在 | 404 |
| `INVALID_TOKEN` | 无效的 Token | 401 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {
      "fields": {
        "email": ["邮箱格式不正确"],
        "password": ["密码长度至少为 8 个字符"]
      }
    }
  }
}
```

---

## 🛠️ SDK 和客户端

### JavaScript/TypeScript SDK

```typescript
import { SevenZiClient } from '@7zi/sdk';

const client = new SevenZiClient({
  baseUrl: 'https://api.7zi.com',
  token: 'your-jwt-token'
});

// 获取任务
const tasks = await client.tasks.list({ status: 'in_progress' });

// 创建任务
const task = await client.tasks.create({
  title: '新任务',
  priority: 'high'
});

// WebSocket 连接
const ws = client.connectWebSocket();
ws.on('task:updated', (data) => {
  console.log('任务更新:', data);
});
```

### Python SDK

```python
from sevenzi import SevenZiClient

client = SevenZiClient(
    base_url='https://api.7zi.com',
    token='your-jwt-token'
)

# 获取任务
tasks = client.tasks.list(status='in_progress')

# 创建任务
task = client.tasks.create(
    title='新任务',
    priority='high'
)
```

---

## 📝 示例代码

### 获取 Dashboard 数据

```typescript
// 使用 fetch
const response = await fetch('/api/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// 使用 SDK
const dashboard = await client.dashboard.get();
```

### 创建任务

```typescript
const newTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: '实现新功能',
    priority: 'high',
    assignee: 'member_1'
  })
});
```

### 批量更新任务状态

```typescript
await fetch('/api/tasks/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'update_status',
    taskIds: ['task_1', 'task_2', 'task_3'],
    data: { status: 'in_progress' }
  })
});
```

---

## 📚 相关文档

- [组件使用指南](./COMPONENTS-USAGE-GUIDE.md)
- [部署指南](./DEPLOYMENT-GUIDE.md)
- [环境变量配置](./ENVIRONMENT-VARIABLES.md)
- [开发指南](./DEVELOPMENT.md)

---

## 🔄 API 更新日志

### v1.2.0 (2026-03-18)
- ✨ 新增批量操作 API
- ✨ 新增 WebSocket 事件
- 🐛 修复分页问题
- 📝 更新错误码

### v1.1.0 (2026-03-10)
- ✨ 新增通知 API
- ✨ 新增报告生成 API
- 🐛 性能优化

### v1.0.0 (2026-03-01)
- 🎉 首个稳定版本
- ✨ 核心 API 上线

---

**Made with ❤️ by 7zi AI Team**
