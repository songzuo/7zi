### Batch Operations List

**Endpoint:** `GET /api/users/batch`

获取批量操作的选项和支持的操作类型。

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Batch user operations API",
  "supportedOperations": [
    "create",
    "update",
    "delete",
    "activate",
    "deactivate",
    "change_role",
    "bulk_import"
  ],
  "limits": {
    "maxBatchSize": 100,
    "maxFileSize": "10MB"
  },
  "usage": {
    "method": "POST",
    "body": {
      "operation": "create | update | delete | ...",
      "users": [...] | "file"
    }
  }
}
```

---

### Execute Batch Operation

**Endpoint:** `POST /api/users/batch`

执行批量用户操作。

**Request Body:**

```json
{
  "operation": "update",
  "users": [
    {
      "id": "user_123",
      "status": "active"
    },
    {
      "id": "user_456",
      "role": "MANAGER"
    }
  ],
  "dryRun": false
}
```

| Field       | Type    | Required | Description                                                                     |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------- |
| `operation` | string  | Yes      | 操作类型: "create", "update", "delete", "activate", "deactivate", "change_role" |
| `users`     | array   | Yes      | 用户对象数组或文件标识                                                          |
| `dryRun`    | boolean | No       | 试运行模式，不实际执行 (默认: false)                                            |

**Supported Operations:**

#### Create

```json
{
  "operation": "create",
  "users": [
    {
      "email": "user1@example.com",
      "password": "Password123",
      "name": "User 1",
      "role": "MEMBER"
    },
    {
      "email": "user2@example.com",
      "password": "Password123",
      "name": "User 2",
      "role": "MEMBER"
    }
  ]
}
```

#### Update

```json
{
  "operation": "update",
  "users": [
    {
      "id": "user_123",
      "name": "Updated Name",
      "status": "active"
    }
  ]
}
```

#### Delete

```json
{
  "operation": "delete",
  "users": [{ "id": "user_123" }, { "id": "user_456" }]
}
```

#### Activate/Deactivate

```json
{
  "operation": "activate",
  "users": [{ "id": "user_123" }, { "id": "user_456" }]
}
```

#### Change Role

```json
{
  "operation": "change_role",
  "users": [
    { "id": "user_123", "role": "MANAGER" },
    { "id": "user_456", "role": "ADMIN" }
  ]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Batch operation completed",
  "data": {
    "operation": "update",
    "total": 2,
    "succeeded": 2,
    "failed": 0,
    "results": [
      {
        "id": "user_123",
        "success": true,
        "message": "User updated successfully"
      },
      {
        "id": "user_456",
        "success": true,
        "message": "User updated successfully"
      }
    ],
    "dryRun": false
  }
}
```

**Response (200 OK) - Partial Failure:**

```json
{
  "success": true,
  "message": "Batch operation completed with errors",
  "data": {
    "operation": "update",
    "total": 3,
    "succeeded": 2,
    "failed": 1,
    "results": [
      {
        "id": "user_123",
        "success": true,
        "message": "User updated successfully"
      },
      {
        "id": "user_456",
        "success": false,
        "error": "User not found"
      },
      {
        "id": "user_789",
        "success": true,
        "message": "User updated successfully"
      }
    ],
    "dryRun": false
  }
}
```

**Errors:**

- `400` - 验证错误
- `401` - 未授权
- `403` - 权限不足（需要 ADMIN 或 MANAGER 角色）
- `500` - 内部服务器错误

---

### Bulk Import Users

**Endpoint:** `POST /api/users/batch/bulk`

从文件批量导入用户（支持 CSV 和 JSON）。

**Request Body:** `multipart/form-data`

| Field        | Type    | Required | Description                                         |
| ------------ | ------- | -------- | --------------------------------------------------- |
| `file`       | File    | Yes      | 用户数据文件 (CSV 或 JSON)                          |
| `format`     | string  | No       | 文件格式 (可选，自动检测)                           |
| `onConflict` | string  | No       | 冲突处理: "error", "skip", "update" (默认: "error") |
| `sendInvite` | boolean | No       | 是否发送邀请邮件 (默认: false)                      |

**CSV Format Example:**

```csv
email,password,name,role,department
user1@example.com,Password123,John Doe,MEMBER,Engineering
user2@example.com,Password123,Jane Smith,MANAGER,Marketing
```

**JSON Format Example:**

```json
[
  {
    "email": "user1@example.com",
    "password": "Password123",
    "name": "John Doe",
    "role": "MEMBER",
    "department": "Engineering"
  },
  {
    "email": "user2@example.com",
    "password": "Password123",
    "name": "Jane Smith",
    "role": "MANAGER",
    "department": "Marketing"
  }
]
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "total": 100,
    "imported": 95,
    "updated": 3,
    "skipped": 2,
    "failed": 0,
    "invitesSent": 95,
    "results": [
      {
        "row": 1,
        "email": "user1@example.com",
        "status": "imported",
        "userId": "user_123"
      },
      {
        "row": 2,
        "email": "user2@example.com",
        "status": "skipped",
        "reason": "Email already exists"
      }
    ],
    "onConflict": "skip"
  }
}
```

**Errors:**

- `400` - 文件格式错误或验证失败
- `401` - 未授权
- `403` - 权限不足
- `413` - 文件过大
- `500` - 内部服务器错误

---

## 🟡 Ratings API

评分系统，用于用户反馈和内容质量评估。

### List Ratings

**Endpoint:** `GET /api/ratings`

获取评分列表，支持过滤和排序。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | No | 实体类型: "task", "project", "user", "comment" |
| `entityId` | string | No | 实体ID |
| `userId` | string | No | 评分用户ID |
| `minScore` | number | No | 最低分数 |
| `maxScore` | number | No | 最高分数 |
| `sortBy` | string | No | 排序: "created", "score", "helpful" (默认: "created") |
| `sortOrder` | string | No | 排序顺序: "asc", "desc" (默认: "desc") |
| `limit` | number | No | 返回数量 (默认: 50, 最大: 100) |
| `offset` | number | No | 偏移量 (默认: 0) |

**Examples:**

```
GET /api/ratings?entityType=task&entityId=task_123
GET /api/ratings?userId=user_456&minScore=4
GET /api/ratings?sortBy=score&sortOrder=desc&limit=10
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": "rating_123",
        "entityType": "task",
        "entityId": "task_456",
        "userId": "user_789",
        "score": 5,
        "comment": "Great work!",
        "helpfulCount": 3,
        "userVotedHelpful": false,
        "createdAt": "2026-03-22T12:00:00.000Z",
        "updatedAt": "2026-03-22T12:00:00.000Z"
      },
      {
        "id": "rating_456",
        "entityType": "task",
        "entityId": "task_456",
        "userId": "user_123",
        "score": 4,
        "comment": "Good job, but could be faster",
        "helpfulCount": 1,
        "userVotedHelpful": true,
        "createdAt": "2026-03-21T10:00:00.000Z",
        "updatedAt": "2026-03-21T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    },
    "average": 4.5,
    "totalRatings": 25
  }
}
```

---

### Create Rating

**Endpoint:** `POST /api/ratings`

为实体创建评分。

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "entityType": "task",
  "entityId": "task_123",
  "score": 5,
  "comment": "Excellent work!"
}
```

| Field        | Type   | Required | Description                                    |
| ------------ | ------ | -------- | ---------------------------------------------- |
| `entityType` | string | Yes      | 实体类型: "task", "project", "user", "comment" |
| `entityId`   | string | Yes      | 实体ID                                         |
| `score`      | number | Yes      | 评分 (1-5)                                     |
| `comment`    | string | No       | 评论内容                                       |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Rating created successfully",
  "data": {
    "id": "rating_123",
    "entityType": "task",
    "entityId": "task_123",
    "userId": "user_456",
    "score": 5,
    "comment": "Excellent work!",
    "helpfulCount": 0,
    "userVotedHelpful": false,
    "createdAt": "2026-03-22T12:00:00.000Z",
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

**Errors:**

- `400` - 验证错误（评分必须在 1-5 之间）
- `401` - 未授权
- `409` - 用户已经为该实体评分过
- `500` - 内部服务器错误

---

### Get Rating

**Endpoint:** `GET /api/ratings/[id]`

获取特定评分的详细信息。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 评分ID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "rating_123",
    "entityType": "task",
    "entityId": "task_456",
    "userId": "user_789",
    "user": {
      "id": "user_789",
      "name": "John Doe",
      "avatar": "https://cdn.example.com/avatars/user_789.jpg"
    },
    "score": 5,
    "comment": "Great work!",
    "helpfulCount": 3,
    "userVotedHelpful": false,
    "createdAt": "2026-03-22T12:00:00.000Z",
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

---

### Update Rating

**Endpoint:** `PUT /api/ratings/[id]`

更新评分（仅限评分用户或管理员）。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 评分ID |

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "score": 4,
  "comment": "Updated comment"
}
```

| Field     | Type   | Required | Description  |
| --------- | ------ | -------- | ------------ |
| `score`   | number | No       | 新评分 (1-5) |
| `comment` | string | No       | 新评论       |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Rating updated successfully",
  "data": {
    "id": "rating_123",
    "entityType": "task",
    "entityId": "task_456",
    "userId": "user_789",
    "score": 4,
    "comment": "Updated comment",
    "helpfulCount": 3,
    "userVotedHelpful": false,
    "createdAt": "2026-03-22T12:00:00.000Z",
    "updatedAt": "2026-03-22T13:00:00.000Z"
  }
}
```

**Errors:**

- `400` - 验证错误
- `401` - 未授权
- `403` - 权限不足（只能更新自己的评分或管理员权限）
- `404` - 评分未找到
- `500` - 内部服务器错误

---

### Delete Rating

**Endpoint:** `DELETE /api/ratings/[id]`

删除评分（仅限评分用户或管理员）。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 评分ID |

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Rating deleted successfully"
}
```

**Errors:**

- `401` - 未授权
- `403` - 权限不足
- `404` - 评分未找到
- `500` - 内部服务器错误

---

### Mark Rating as Helpful

**Endpoint:** `POST /api/ratings/[id]/helpful`

将评分标记为有用（点赞）。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 评分ID |

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "helpful": true
}
```

| Field     | Type    | Required | Description                      |
| --------- | ------- | -------- | -------------------------------- |
| `helpful` | boolean | Yes      | 标记为有用 (true) 或取消 (false) |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Rating marked as helpful",
  "data": {
    "ratingId": "rating_123",
    "helpfulCount": 4,
    "userVotedHelpful": true
  }
}
```

**Response (200 OK) - Unmark:**

```json
{
  "success": true,
  "message": "Helpful mark removed",
  "data": {
    "ratingId": "rating_123",
    "helpfulCount": 3,
    "userVotedHelpful": false
  }
}
```

**Errors:**

- `400` - 验证错误
- `401` - 未授权
- `404` - 评分未找到
- `500` - 内部服务器错误

---

## 🟢 WebSocket APIs

实时通信功能，基于 WebSocket 协议。

### WebSocket Connection

**Endpoint:** `GET /api/ws`

建立 WebSocket 连接。

**Request Headers:**

```
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <key>
Sec-WebSocket-Version: 13
Authorization: Bearer <token> (可选)
```

**注意:** 此端点需要客户端发送 WebSocket 握手请求。不支持普通 HTTP GET 请求。

**WebSocket Events:**

#### Server → Client Events

```javascript
// 连接成功
{
  "type": "connected",
  "data": {
    "socketId": "socket_123",
    "timestamp": "2026-03-22T12:00:00.000Z"
  }
}

// 通知
{
  "type": "notification",
  "data": {
    "id": "notif_123",
    "title": "New task assigned",
    "message": "You have been assigned to task #456",
    "priority": "high"
  }
}

// 任务更新
{
  "type": "task_update",
  "data": {
    "id": "task_456",
    "status": "completed",
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}

// 消息
{
  "type": "message",
  "data": {
    "id": "msg_789",
    "roomId": "room_123",
    "userId": "user_456",
    "content": "Hello!",
    "timestamp": "2026-03-22T12:00:00.000Z"
  }
}
```

#### Client → Server Events

```javascript
// 订阅事件
{
  "type": "subscribe",
  "data": {
    "channels": ["notifications", "task_updates"]
  }
}

// 发送消息
{
  "type": "message",
  "data": {
    "roomId": "room_123",
    "content": "Hello!"
  }
}

// Ping (心跳)
{
  "type": "ping"
}
```

---

### Broadcast Message

**Endpoint:** `POST /api/ws/broadcast`

向所有连接的 WebSocket 客户端广播消息。

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "event": "notification",
  "data": {
    "title": "System Announcement",
    "message": "Scheduled maintenance at 3:00 AM"
  },
  "excludeSocketId": "socket_123",
  "room": "room_456"
}
```

| Field             | Type   | Required | Description              |
| ----------------- | ------ | -------- | ------------------------ |
| `event`           | string | Yes      | 事件类型                 |
| `data`            | object | Yes      | 事件数据                 |
| `excludeSocketId` | string | No       | 排除的连接ID             |
| `room`            | string | No       | 仅向特定房间的客户端广播 |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Message broadcasted successfully",
  "data": {
    "event": "notification",
    "deliveredTo": 10,
    "room": null
  }
}
```

**Errors:**

- `400` - 验证错误
- `401` - 未授权
- `403` - 权限不足
- `500` - 内部服务器错误

---

### Get Room Info

**Endpoint:** `GET /api/ws/rooms/[roomId]`

获取 WebSocket 房间信息。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string | Yes | 房间ID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "roomId": "room_123",
    "name": "General Discussion",
    "memberCount": 5,
    "members": [
      {
        "socketId": "socket_456",
        "userId": "user_789",
        "joinedAt": "2026-03-22T12:00:00.000Z"
      }
    ],
    "createdAt": "2026-03-22T10:00:00.000Z"
  }
}
```

**Errors:**

- `404` - 房间未找到
- `500` - 内部服务器错误

---

### Get WebSocket Stats

**Endpoint:** `GET /api/ws/stats`

获取 WebSocket 服务器统计信息。

**Headers:**

```
Authorization: Bearer <token> (可选，管理员可查看详细信息)
```

**Response (200 OK) - Anonymous:**

```json
{
  "success": true,
  "data": {
    "connectedClients": 10,
    "rooms": 3,
    "uptime": 3600
  }
}
```

**Response (200 OK) - Admin:**

```json
{
  "success": true,
  "data": {
    "connectedClients": 10,
    "rooms": 3,
    "uptime": 3600,
    "messagesSent": 1500,
    "messagesReceived": 1200,
    "connectionsTotal": 50,
    "disconnectionsTotal": 40,
    "rooms": [
      {
        "roomId": "room_123",
        "memberCount": 5,
        "messageCount": 500
      },
      {
        "roomId": "room_456",
        "memberCount": 3,
        "messageCount": 300
      },
      {
        "roomId": "room_789",
        "memberCount": 2,
        "messageCount": 200
      }
    ],
    "serverInfo": {
      "version": "1.0.0",
      "startedAt": "2026-03-22T11:00:00.000Z"
    }
  }
}
```

**Errors:**

- `500` - 内部服务器错误

---

## 🟢 Analytics APIs

分析和指标导出功能。

### Export Analytics

**Endpoint:** `GET /api/analytics/export`

导出分析数据为文件。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | 格式: "csv", "json" (默认: "csv") |
| `startDate` | string | Yes | 开始日期 (ISO 8601) |
| `endDate` | string | Yes | 结束日期 (ISO 8601) |
| `metrics` | string | No | 指标类型 (逗号分隔): "tasks", "users", "performance" (默认: all) |
| `groupBy` | string | No | 分组: "day", "week", "month" (默认: "day") |

**Example:**

```
GET /api/analytics/export?format=csv&startDate=2026-03-01&endDate=2026-03-22&groupBy=day
```

**Response (200 OK) - CSV:**

返回 CSV 文件下载。

**CSV Format:**

```csv
date,tasks_completed,tasks_created,active_users,avg_response_time
2026-03-01,25,30,15,120
2026-03-02,28,32,16,115
...
```

**Response (200 OK) - JSON:**

```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-03-22",
  "groupBy": "day",
  "data": [
    {
      "date": "2026-03-01",
      "tasks_completed": 25,
      "tasks_created": 30,
      "active_users": 15,
      "avg_response_time": 120
    }
  ],
  "summary": {
    "total_tasks_completed": 550,
    "total_tasks_created": 620,
    "total_active_users": 18,
    "avg_response_time": 118
  }
}
```

**Errors:**

- `400` - 验证错误
- `500` - 内部服务器错误

---

### Get Analytics Metrics

**Endpoint:** `GET /api/analytics/metrics`

获取实时分析指标。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | 时间段: "1h", "24h", "7d", "30d" (默认: "24h") |
| `categories` | string | No | 分类 (逗号分隔): "tasks", "users", "performance" (默认: all) |

**Example:**

```
GET /api/analytics/metrics?period=7d&categories=tasks,users
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "period": "24h",
    "timestamp": "2026-03-22T12:00:00.000Z",
    "tasks": {
      "total": 250,
      "completed": 200,
      "pending": 45,
      "overdue": 5,
      "completionRate": 0.8,
      "avgCompletionTime": 3600,
      "byPriority": {
        "high": 50,
        "medium": 100,
        "low": 100
      }
    },
    "users": {
      "total": 100,
      "active": 75,
      "new": 5,
      "avgTasksPerUser": 2.5,
      "topContributors": [
        {
          "userId": "user_123",
          "name": "John Doe",
          "tasksCompleted": 15
        }
      ]
    },
    "performance": {
      "avgResponseTime": 118,
      "p95ResponseTime": 200,
      "p99ResponseTime": 350,
      "errorRate": 0.01,
      "successRate": 0.99
    }
  }
}
```

**Errors:**

- `500` - 内部服务器错误

---

## 🟢 Performance Alerts API

性能告警功能。

### Get Performance Alerts

**Endpoint:** `GET /api/performance/alerts`

获取性能告警列表。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | 状态: "active", "resolved", "all" (默认: "active") |
| `severity` | string | No | 严重性: "critical", "warning", "info" (默认: all) |
| `limit` | number | No | 返回数量 (默认: 50) |

**Example:**

```
GET /api/performance/alerts?status=active&severity=critical
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_123",
        "type": "high_response_time",
        "severity": "critical",
        "status": "active",
        "message": "API response time exceeded threshold",
        "details": {
          "threshold": 500,
          "currentValue": 850,
          "endpoint": "/api/tasks"
        },
        "triggeredAt": "2026-03-22T12:00:00.000Z",
        "resolvedAt": null
      },
      {
        "id": "alert_456",
        "type": "high_error_rate",
        "severity": "warning",
        "status": "active",
        "message": "Error rate above normal",
        "details": {
          "threshold": 0.05,
          "currentValue": 0.08,
          "endpoint": "/api/auth/login"
        },
        "triggeredAt": "2026-03-22T11:30:00.000Z",
        "resolvedAt": null
      }
    ],
    "count": 2,
    "summary": {
      "critical": 1,
      "warning": 1,
      "info": 0
    }
  }
}
```

**Errors:**

- `500` - 内部服务器错误

---

## 🟢 Vitals APIs

系统健康指标和演示端点。

### Get System Vitals

**Endpoint:** `GET /api/vitals`

获取系统核心健康指标。

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-22T12:00:00.000Z",
    "uptime": 86400,
    "system": {
      "memory": {
        "used": 256,
        "total": 512,
        "usagePercent": 50.0,
        "heapUsed": 128,
        "heapTotal": 256
      },
      "cpu": {
        "usagePercent": 25.5,
        "loadAverage": [0.5, 0.7, 0.6]
      },
      "disk": {
        "used": 50,
        "total": 100,
        "usagePercent": 50.0
      }
    },
    "process": {
      "pid": 12345,
      "nodeVersion": "v22.22.0",
      "platform": "linux",
      "arch": "x64"
    }
  }
}
```

---

### Get Web Vitals

**Endpoint:** `GET /api/web-vitals`

获取 Web 性能指标（用于前端监控）。

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "metrics": {
      "LCP": {
        "value": 2500,
        "rating": "good",
        "threshold": { "good": 2500, "needsImprovement": 4000 }
      },
      "FID": {
        "value": 100,
        "rating": "good",
        "threshold": { "good": 100, "needsImprovement": 300 }
      },
      "CLS": {
        "value": 0.05,
        "rating": "needsImprovement",
        "threshold": { "good": 0.1, "needsImprovement": 0.25 }
      },
      "FCP": {
        "value": 1800,
        "rating": "good"
      },
      "TTFB": {
        "value": 600,
        "rating": "good"
      }
    },
    "overallScore": 85,
    "timestamp": "2026-03-22T12:00:00.000Z"
  }
}
```

---

### Demo Task Status

**Endpoint:** `GET /api/demo/task-status`

演示端点，用于测试任务状态功能。

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "taskId": "demo_task_123",
    "status": "in_progress",
    "progress": 65,
    "steps": [
      {
        "name": "Initialization",
        "status": "completed",
        "duration": 2.5
      },
      {
        "name": "Processing",
        "status": "in_progress",
        "progress": 65
      },
      {
        "name": "Completion",
        "status": "pending"
      }
    ],
    "estimatedCompletion": "2026-03-22T12:05:00.000Z"
  }
}
```

---

## 📚 使用示例

### A2A Queue Usage

```bash
# Get queue status
curl https://your-domain.com/api/a2a/queue

# Enqueue a message
curl -X POST https://your-domain.com/api/a2a/queue \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_123",
    "agentId": "agent_456",
    "priority": "high",
    "payload": {"data": "value"}
  }'

# Clear queue for a specific agent
curl -X DELETE "https://your-domain.com/api/a2a/queue?agentId=agent_456"
```

### Advanced Search Usage

```bash
# Search for tasks
curl "https://your-domain.com/api/search?q=bug&target=tasks&status=open&priority=high"

# Search with fuzzy matching
curl "https://your-domain.com/api/search?q=fix&fuzzy=true&fuzzyThreshold=0.4&highlights=true"

# Get search suggestions
curl "https://your-domain.com/api/search/autocomplete?q=bug&limit=5"
```

### Data Export Usage

```bash
# Export to CSV
curl -X POST https://your-domain.com/api/data/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "tables": ["users", "tasks"],
    "filters": [
      {
        "table": "users",
        "where": "status = ?",
        "params": ["active"]
      }
    ]
  }' \
  --output export.csv

# Export to JSON
curl -X POST https://your-domain.com/api/data/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "tables": ["tasks"],
    "includeSchema": true
  }' \
  --output export.json
```

### Batch User Operations

```bash
# Batch update users
curl -X POST https://your-domain.com/api/users/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "users": [
      {"id": "user_123", "status": "active"},
      {"id": "user_456", "role": "MANAGER"}
    ]
  }'

# Bulk import from CSV
curl -X POST https://your-domain.com/api/users/batch/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@users.csv" \
  -F "onConflict=skip"
```

---

**文档补充完成时间:** 2026-03-22
**下一步:** 将这些文档合并到主 API.md 文件中
