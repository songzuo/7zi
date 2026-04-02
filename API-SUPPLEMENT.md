# API 文档补充 - 高优先级端点

**生成时间:** 2026-03-22
**用途:** 补充 API.md 中缺失的高优先级 API 端点文档

---

## 🔴 A2A Message Queue APIs

智能体到智能体(A2A)通信的消息队列管理系统。

### Get Queue Status

**Endpoint:** `GET /api/a2a/queue`

获取消息队列的当前状态和统计信息。

**Response (200 OK):**

```json
{
  "status": "ok",
  "stats": {
    "total": 10,
    "byPriority": {
      "high": 2,
      "normal": 5,
      "low": 3
    },
    "byAgent": {
      "agent_1": 3,
      "agent_2": 7
    }
  },
  "nextMessage": {
    "id": "msg_123",
    "taskId": "task_456",
    "agentId": "agent_789",
    "priority": "high",
    "payload": {},
    "createdAt": "2026-03-22T12:00:00.000Z"
  },
  "config": {
    "maxSize": 1000,
    "maxRetries": 3
  }
}
```

**Response Fields:**

- `status`: 队列状态 ("ok" 或 "error")
- `stats.total`: 队列中消息总数
- `stats.byPriority`: 按优先级分组的消息数量
- `stats.byAgent`: 按智能体分组的消息数量
- `nextMessage`: 下一条待处理的消息（队首消息）
- `config`: 队列配置信息

---

### Enqueue Message

**Endpoint:** `POST /api/a2a/queue`

将新消息加入队列。

**Request Body:**

```json
{
  "id": "msg_123",
  "taskId": "task_456",
  "agentId": "agent_789",
  "priority": "high",
  "payload": {
    "data": "value"
  },
  "createdAt": "2026-03-22T12:00:00.000Z",
  "attempts": 0,
  "maxAttempts": 3
}
```

| Field         | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| `taskId`      | string | Yes      | 任务ID                                           |
| `agentId`     | string | Yes      | 目标智能体ID                                     |
| `id`          | string | No       | 消息ID（自动生成如果未提供）                     |
| `priority`    | string | No       | 优先级: "high", "normal", "low" (默认: "normal") |
| `payload`     | object | No       | 消息负载数据                                     |
| `createdAt`   | string | No       | 创建时间 (默认: 当前时间)                        |
| `attempts`    | number | No       | 已尝试次数 (默认: 0)                             |
| `maxAttempts` | number | No       | 最大尝试次数 (默认: 3)                           |
| `nextRetryAt` | string | No       | 下次重试时间                                     |

**Response (201 Created):**

```json
{
  "message": "Message enqueued successfully",
  "queueSize": 11,
  "queuedMessage": {
    "id": "msg_123",
    "taskId": "task_456",
    "agentId": "agent_789",
    "priority": "high",
    "payload": {
      "data": "value"
    },
    "createdAt": "2026-03-22T12:00:00.000Z",
    "attempts": 0
  }
}
```

**Errors:**

- `400` - 验证错误（缺少必需字段）
- `500` - 内部服务器错误

---

### Clear Queue

**Endpoint:** `DELETE /api/a2a/queue`

清空队列中的消息。支持按智能体ID或优先级选择性删除。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | No | 只清除特定智能体的消息 |
| `priority` | string | No | 只清除特定优先级的消息 |

**注意:** 如果不提供查询参数，将清空整个队列。

**Response (200 OK) - Clear entire queue:**

```json
{
  "message": "Queue cleared successfully",
  "queueSize": 0
}
```

**Response (200 OK) - Clear by agent:**

```json
{
  "message": "Removed 3 messages for agent agent_1",
  "removed": 3,
  "queueSize": 7
}
```

**Response (200 OK) - Clear by priority:**

```json
{
  "message": "Removed 2 messages with priority high",
  "removed": 2,
  "queueSize": 8
}
```

**Errors:**

- `500` - 内部服务器错误

---

## 🔴 A2A Agent Registry APIs

智能体注册表管理，用于智能体发现和通信。

### List All Agents

**Endpoint:** `GET /api/a2a/registry`

列出所有已注册的智能体，支持多种过滤选项。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `capability` | string | No | 按能力过滤 (例如: "code_review") |
| `skill` | string | No | 按技能过滤 (例如: "javascript") |
| `status` | string | No | 按状态过滤 ("online", "offline", "busy") |
| `available` | boolean | No | 仅返回在线智能体 |

**Examples:**

```
GET /api/a2a/registry
GET /api/a2a/registry?capability=code_review
GET /api/a2a/registry?skill=python&status=online
GET /api/a2a/registry?available=true
```

**Response (200 OK):**

```json
{
  "agents": [
    {
      "id": "agent_123",
      "name": "Code Review Agent",
      "url": "https://agent.example.com",
      "capabilities": ["code_review", "testing"],
      "skills": ["javascript", "typescript", "python"],
      "status": "online",
      "lastHeartbeat": "2026-03-22T12:00:00.000Z",
      "load": 0.5,
      "metadata": {
        "version": "1.0.0",
        "author": "Team A"
      }
    },
    {
      "id": "agent_456",
      "name": "Data Analyst Agent",
      "url": "https://data-agent.example.com",
      "capabilities": ["data_analysis", "visualization"],
      "skills": ["python", "pandas", "matplotlib"],
      "status": "online",
      "lastHeartbeat": "2026-03-22T12:00:05.000Z",
      "load": 0.3,
      "metadata": {}
    }
  ],
  "count": 2
}
```

**Response Fields:**

- `agents`: 智能体数组
- `agents[].id`: 智能体唯一标识
- `agents[].name`: 智能体名称
- `agents[].url`: 智能体端点URL
- `agents[].capabilities`: 能力列表
- `agents[].skills`: 技能列表
- `agents[].status`: 当前状态 ("online", "offline", "busy")
- `agents[].lastHeartbeat`: 最后心跳时间
- `agents[].load`: 负载 (0.0-1.0)
- `agents[].metadata`: 附加元数据
- `count`: 返回的智能体数量

---

### Register Agent

**Endpoint:** `POST /api/a2a/registry`

注册新智能体到注册表。

**Request Body:**

```json
{
  "id": "agent_789",
  "name": "New Agent",
  "url": "https://new-agent.example.com",
  "capabilities": ["task_execution"],
  "skills": ["general"],
  "status": "online",
  "load": 0.0,
  "metadata": {
    "version": "1.0.0",
    "description": "A new agent"
  }
}
```

| Field          | Type     | Required | Description                    |
| -------------- | -------- | -------- | ------------------------------ |
| `name`         | string   | Yes      | 智能体名称                     |
| `url`          | string   | Yes      | 智能体端点URL                  |
| `id`           | string   | No       | 智能体ID（自动生成如果未提供） |
| `capabilities` | string[] | No       | 能力列表                       |
| `skills`       | string[] | No       | 技能列表                       |
| `status`       | string   | No       | 初始状态 (默认: "online")      |
| `load`         | number   | No       | 初始负载 (默认: 0.0)           |
| `metadata`     | object   | No       | 附加元数据                     |

**Response (201 Created):**

```json
{
  "message": "Agent registered successfully",
  "agent": {
    "id": "agent_789",
    "name": "New Agent",
    "url": "https://new-agent.example.com",
    "capabilities": ["task_execution"],
    "skills": ["general"],
    "status": "online",
    "lastHeartbeat": "2026-03-22T12:00:00.000Z",
    "load": 0.0,
    "metadata": {
      "version": "1.0.0",
      "description": "A new agent"
    }
  }
}
```

**Errors:**

- `400` - 验证错误（缺少必需字段）
- `409` - 智能体ID已存在
- `500` - 内部服务器错误

---

### Get Agent by ID

**Endpoint:** `GET /api/a2a/registry/[id]`

获取特定智能体的详细信息。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 智能体ID |

**Response (200 OK):**

```json
{
  "agent": {
    "id": "agent_123",
    "name": "Code Review Agent",
    "url": "https://agent.example.com",
    "capabilities": ["code_review", "testing"],
    "skills": ["javascript", "typescript", "python"],
    "status": "online",
    "lastHeartbeat": "2026-03-22T12:00:00.000Z",
    "load": 0.5,
    "metadata": {}
  }
}
```

**Errors:**

- `404` - 智能体未找到
- `500` - 内部服务器错误

---

### Update Agent

**Endpoint:** `PUT /api/a2a/registry/[id]`

更新已注册智能体的信息。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 智能体ID |

**Request Body:**

```json
{
  "name": "Updated Agent Name",
  "url": "https://updated-agent.example.com",
  "capabilities": ["code_review", "testing", "documentation"],
  "skills": ["javascript", "typescript", "python", "markdown"],
  "status": "busy",
  "load": 0.8,
  "metadata": {
    "version": "1.1.0",
    "updated": true
  }
}
```

| Field          | Type     | Required | Description      |
| -------------- | -------- | -------- | ---------------- |
| `name`         | string   | No       | 更新的智能体名称 |
| `url`          | string   | No       | 更新的端点URL    |
| `capabilities` | string[] | No       | 更新的能力列表   |
| `skills`       | string[] | No       | 更新的技能列表   |
| `status`       | string   | No       | 更新的状态       |
| `load`         | number   | No       | 更新的负载       |
| `metadata`     | object   | No       | 更新的元数据     |

**Response (200 OK):**

```json
{
  "message": "Agent updated successfully",
  "agent": {
    "id": "agent_123",
    "name": "Updated Agent Name",
    "url": "https://updated-agent.example.com",
    "capabilities": ["code_review", "testing", "documentation"],
    "skills": ["javascript", "typescript", "python", "markdown"],
    "status": "busy",
    "lastHeartbeat": "2026-03-22T12:00:00.000Z",
    "load": 0.8,
    "metadata": {
      "version": "1.1.0",
      "updated": true
    }
  }
}
```

**Errors:**

- `404` - 智能体未找到
- `500` - 内部服务器错误

---

### Unregister Agent

**Endpoint:** `DELETE /api/a2a/registry/[id]`

从注册表中注销智能体。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 智能体ID |

**Response (200 OK):**

```json
{
  "message": "Agent unregistered successfully",
  "agentId": "agent_123"
}
```

**Errors:**

- `404` - 智能体未找到
- `500` - 内部服务器错误

---

### Update Agent Heartbeat

**Endpoint:** `GET /api/a2a/registry/[id]/heartbeat`

更新智能体的心跳时间戳，表明智能体仍然在线。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 智能体ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Heartbeat updated",
  "agentId": "agent_123",
  "lastHeartbeat": "2026-03-22T12:00:00.000Z"
}
```

**Errors:**

- `404` - 智能体未找到
- `500` - 内部服务器错误

---

## 🔴 Data Import/Export APIs

数据导入导出功能，支持 CSV 和 JSON 格式。

### Get Export Information

**Endpoint:** `GET /api/data/export`

获取支持的表和导出选项信息。

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Data export API",
  "supportedTables": ["users", "tasks", "projects", "teams", "audit_logs", "roles", "permissions"],
  "usage": {
    "method": "POST",
    "body": {
      "format": "csv | json (default: json)",
      "tables": ["table1", "table2"],
      "filters": [
        {
          "table": "table1",
          "where": "status = ?",
          "params": ["active"],
          "limit": 100
        }
      ],
      "includeSchema": false
    }
  }
}
```

---

### Export Data

**Endpoint:** `POST /api/data/export`

从数据库表导出数据为 CSV 或 JSON 格式。

**Request Body:**

```json
{
  "format": "csv",
  "tables": ["users", "tasks"],
  "filters": [
    {
      "table": "users",
      "where": "status = ?",
      "params": ["active"],
      "limit": 100
    },
    {
      "table": "tasks",
      "where": "priority = ? AND status != ?",
      "params": ["high", "completed"],
      "limit": 50
    }
  ],
  "includeSchema": false
}
```

| Field              | Type     | Required | Description                              |
| ------------------ | -------- | -------- | ---------------------------------------- |
| `format`           | string   | No       | 导出格式: "csv" 或 "json" (默认: "json") |
| `tables`           | string[] | Yes      | 要导出的表名列表                         |
| `filters`          | object[] | No       | 表级别的过滤器                           |
| `filters[].table`  | string   | No       | 表名                                     |
| `filters[].where`  | string   | No       | WHERE 子句                               |
| `filters[].params` | any[]    | No       | WHERE 参数                               |
| `filters[].limit`  | number   | No       | 每表最大行数                             |
| `includeSchema`    | boolean  | No       | 是否包含表结构 (默认: false)             |

**Response (200 OK) - CSV Format:**

响应为文件下载，`Content-Type: text/csv; charset=utf-8`

**Response (200 OK) - JSON Format:**

响应为文件下载，`Content-Type: application/json; charset=utf-8`

**JSON 示例:**

```json
{
  "version": "1.0",
  "exportedAt": "2026-03-22T12:00:00.000Z",
  "format": "json",
  "tables": {
    "users": {
      "schema": {
        "columns": ["id", "email", "name", "status"]
      },
      "data": [
        { "id": 1, "email": "user1@example.com", "name": "User 1", "status": "active" },
        { "id": 2, "email": "user2@example.com", "name": "User 2", "status": "active" }
      ]
    },
    "tasks": {
      "schema": {
        "columns": ["id", "title", "status", "priority"]
      },
      "data": [{ "id": 1, "title": "Task 1", "status": "open", "priority": "high" }]
    }
  },
  "statistics": {
    "totalTables": 2,
    "totalRows": 3,
    "tables": {
      "users": 2,
      "tasks": 1
    }
  }
}
```

**CSV 示例:**

```csv
table,users
id,email,name,status
1,user1@example.com,User 1,active
2,user2@example.com,User 2,active

table,tasks
id,title,status,priority
1,Task 1,open,high
```

**Errors:**

- `400` - 验证错误
- `500` - 内部服务器错误

---

### Get Import Information

**Endpoint:** `GET /api/data/import`

获取导入选项和限制信息。

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Data import API",
  "supportedFormats": ["csv", "json"],
  "maxFileSize": "100MB",
  "supportedTables": ["users", "tasks", "projects", ...],
  "usage": {
    "method": "POST",
    "contentType": "multipart/form-data",
    "body": {
      "file": "<file>",
      "format": "csv | json (optional, auto-detected)",
      "onConflict": "error | skip | update (default: error)"
    }
  }
}
```

---

### Import Data

**Endpoint:** `POST /api/data/import`

从 CSV 或 JSON 文件导入数据到数据库。

**Request Body:** `multipart/form-data`

| Field        | Type   | Required | Description                                             |
| ------------ | ------ | -------- | ------------------------------------------------------- |
| `file`       | File   | Yes      | 要导入的文件 (CSV 或 JSON)                              |
| `format`     | string | No       | 文件格式 (可选，自动检测)                               |
| `onConflict` | string | No       | 冲突处理策略: "error", "skip", "update" (默认: "error") |

**冲突处理策略:**

- `error` - 如果记录已存在则报错
- `skip` - 跳过已存在的记录
- `update` - 更新已存在的记录

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Data imported successfully",
  "results": {
    "totalRows": 100,
    "inserted": 95,
    "updated": 3,
    "skipped": 2,
    "failed": 0,
    "tables": {
      "users": {
        "inserted": 50,
        "updated": 1,
        "skipped": 1,
        "failed": 0
      },
      "tasks": {
        "inserted": 45,
        "updated": 2,
        "skipped": 1,
        "failed": 0
      }
    }
  },
  "warnings": [
    {
      "table": "users",
      "row": 10,
      "message": "Email already exists, skipped due to onConflict=skip"
    }
  ],
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```

**Errors:**

- `400` - 验证错误或文件格式不正确
- `409` - 记录冲突 (当 onConflict=error 时)
- `413` - 文件过大
- `500` - 内部服务器错误

---

## 🟡 Advanced Search APIs

高级搜索功能，支持全局搜索、模糊匹配、过滤器和搜索历史。

### Global Search

**Endpoint:** `GET /api/search`

执行全局搜索，支持多实体搜索、模糊匹配和高级过滤。

**Query Parameters:**

#### Basic Parameters

| Parameter | Type    | Required | Description                                                   |
| --------- | ------- | -------- | ------------------------------------------------------------- |
| `q`       | string  | Yes      | 搜索查询字符串                                                |
| `target`  | string  | No       | 目标类型: "all", "tasks", "projects", "members" (默认: "all") |
| `limit`   | number  | No       | 返回数量 (默认: 50, 最大: 100)                                |
| `offset`  | number  | No       | 偏移量 (默认: 0)                                              |
| `history` | boolean | No       | 是否包含搜索历史 (默认: false)                                |

#### Filter Parameters

| Parameter       | Type   | Description                                 |
| --------------- | ------ | ------------------------------------------- |
| `status`        | string | 状态过滤 (逗号分隔，如: "active,completed") |
| `priority`      | string | 优先级过滤 (逗号分隔，如: "high,medium")    |
| `labels`        | string | 标签过滤 (逗号分隔)                         |
| `assignees`     | string | 分配人过滤 (逗号分隔)                       |
| `createdAfter`  | string | 创建时间起点 (ISO 8601)                     |
| `createdBefore` | string | 创建时间终点 (ISO 8601)                     |
| `updatedAfter`  | string | 更新时间起点 (ISO 8601)                     |
| `updatedBefore` | string | 更新时间终点 (ISO 8601)                     |

#### Search Configuration Parameters

| Parameter        | Type    | Default | Description            |
| ---------------- | ------- | ------- | ---------------------- |
| `fuzzy`          | boolean | true    | 启用模糊匹配           |
| `fuzzyThreshold` | number  | 0.3     | 模糊匹配阈值 (0.0-1.0) |
| `caseSensitive`  | boolean | false   | 区分大小写             |
| `highlights`     | boolean | true    | 包含高亮结果           |

**Examples:**

```
GET /api/search?q=hello&target=all
GET /api/search?q=bug&target=tasks&status=open,pending
GET /api/search?q=john&target=members&limit=10
GET /api/search?q=important&priority=high&labels=urgent
GET /api/search?q=test&fuzzy=true&fuzzyThreshold=0.5
GET /api/search?q=recent&createdAfter=2026-03-01&history=true
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "id": "task_123",
      "type": "task",
      "score": 0.95,
      "title": "Fix critical bug",
      "description": "Investigate and fix the bug...",
      "status": "open",
      "priority": "high",
      "labels": [
        {
          "name": "urgent",
          "color": "#d73a4a"
        }
      ],
      "assignee": "user_456",
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-21T15:30:00.000Z",
      "highlights": {
        "title": "Fix <mark>critical</mark> bug",
        "description": "Investigate and fix the <mark>bug</mark>..."
      }
    },
    {
      "id": "user_789",
      "type": "member",
      "score": 0.87,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "MEMBER",
      "status": "active",
      "highlights": {
        "name": "<mark>John</mark> Doe"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 50,
  "hasMore": true,
  "history": [
    {
      "query": "bug fix",
      "timestamp": "2026-03-21T10:00:00.000Z"
    },
    {
      "query": "john",
      "timestamp": "2026-03-21T09:30:00.000Z"
    }
  ]
}
```

**Response Fields:**

- `results`: 搜索结果数组
- `results[].id`: 实体ID
- `results[].type`: 实体类型 ("task", "project", "member")
- `results[].score`: 相关性得分 (0.0-1.0)
- `results[].*`: 实体特定字段
- `results[].highlights`: 高亮字段（如果启用）
- `total`: 总结果数
- `page`: 当前页码
- `pageSize`: 每页大小
- `hasMore`: 是否有更多结果
- `history`: 搜索历史（如果请求）

**Errors:**

- `400` - 无效查询参数
- `500` - 内部服务器错误

---

### Search Autocomplete

**Endpoint:** `GET /api/search/autocomplete`

获取搜索查询的自动完成建议。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | 部分查询字符串 |
| `limit` | number | No | 建议数量 (默认: 10) |
| `type` | string | No | 建议类型: "all", "query", "entity" (默认: "all") |

**Example:**

```
GET /api/search/autocomplete?q=bug&limit=5
```

**Response (200 OK):**

```json
{
  "suggestions": [
    {
      "type": "query",
      "text": "bug fix",
      "count": 25
    },
    {
      "type": "query",
      "text": "bug report",
      "count": 12
    },
    {
      "type": "entity",
      "id": "task_123",
      "type": "task",
      "title": "Fix critical bug",
      "text": "Fix critical bug - Task #123"
    },
    {
      "type": "entity",
      "id": "task_456",
      "type": "task",
      "title": "Bug in authentication",
      "text": "Bug in authentication - Task #456"
    }
  ],
  "count": 4
}
```

**Response Fields:**

- `suggestions`: 建议数组
- `suggestions[].type`: 建议类型 ("query" 或 "entity")
- `suggestions[].text`: 建议文本
- `suggestions[].count`: 使用计数 (查询建议)
- `suggestions[].id`: 实体ID (实体建议)
- `suggestions[].title`: 实体标题 (实体建议)
- `count`: 建议总数

---

### Search History

**Endpoint:** `GET /api/search/history`

获取用户的搜索历史。

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | 历史记录数量 (默认: 20) |
| `since` | string | No | 时间起点 (ISO 8601) |

**Example:**

```
GET /api/search/history?limit=10
```

**Response (200 OK):**

```json
{
  "history": [
    {
      "query": "bug fix",
      "resultCount": 25,
      "timestamp": "2026-03-21T10:00:00.000Z"
    },
    {
      "query": "john doe",
      "resultCount": 5,
      "timestamp": "2026-03-21T09:30:00.000Z"
    },
    {
      "query": "urgent tasks",
      "resultCount": 10,
      "timestamp": "2026-03-21T09:00:00.000Z"
    }
  ],
  "count": 3
}
```

**Response Fields:**

- `history`: 历史记录数组
- `history[].query`: 搜索查询
- `history[].resultCount`: 结果数量
- `history[].timestamp`: 搜索时间
- `count`: 历史记录总数

---

## 🟡 User Preferences API

用户偏好设置管理。

### Get User Preferences

**Endpoint:** `GET /api/user/preferences`

获取当前登录用户的偏好设置。

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "preferences": {
      "theme": "dark",
      "language": "zh-CN",
      "timezone": "Asia/Shanghai",
      "dateFormat": "YYYY-MM-DD",
      "timeFormat": "24h",
      "notifications": {
        "email": true,
        "push": false,
        "desktop": true,
        "digest": "daily"
      },
      "ui": {
        "sidebarCollapsed": false,
        "density": "comfortable",
        "fontSize": "medium"
      }
    },
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

---

### Update User Preferences

**Endpoint:** `POST /api/user/preferences`

更新当前登录用户的偏好设置。

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "theme": "dark",
  "language": "zh-CN",
  "timezone": "Asia/Shanghai",
  "dateFormat": "YYYY-MM-DD",
  "timeFormat": "24h",
  "notifications": {
    "email": true,
    "push": false,
    "desktop": true,
    "digest": "daily"
  },
  "ui": {
    "sidebarCollapsed": false,
    "density": "comfortable",
    "fontSize": "medium"
  }
}
```

| Field                   | Type    | Description                                |
| ----------------------- | ------- | ------------------------------------------ |
| `theme`                 | string  | 主题: "light", "dark", "auto"              |
| `language`              | string  | 语言代码 (如: "zh-CN", "en-US")            |
| `timezone`              | string  | 时区 (如: "Asia/Shanghai")                 |
| `dateFormat`            | string  | 日期格式                                   |
| `timeFormat`            | string  | 时间格式: "12h" 或 "24h"                   |
| `notifications`         | object  | 通知设置                                   |
| `notifications.email`   | boolean | 邮件通知                                   |
| `notifications.push`    | boolean | 推送通知                                   |
| `notifications.desktop` | boolean | 桌面通知                                   |
| `notifications.digest`  | string  | 摘要频率: "daily", "weekly", "never"       |
| `ui`                    | object  | UI 设置                                    |
| `ui.sidebarCollapsed`   | boolean | 侧边栏折叠                                 |
| `ui.density`            | string  | 密度: "compact", "comfortable", "spacious" |
| `ui.fontSize`           | string  | 字体大小: "small", "medium", "large"       |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "userId": "user_123",
    "preferences": {
      "theme": "dark",
      "language": "zh-CN",
      "timezone": "Asia/Shanghai",
      "dateFormat": "YYYY-MM-DD",
      "timeFormat": "24h",
      "notifications": {
        "email": true,
        "push": false,
        "desktop": true,
        "digest": "daily"
      },
      "ui": {
        "sidebarCollapsed": false,
        "density": "comfortable",
        "fontSize": "medium"
      }
    },
    "updatedAt": "2026-03-22T12:01:00.000Z"
  }
}
```

**Errors:**

- `400` - 验证错误
- `401` - 未授权
- `500` - 内部服务器错误

---

## 🟡 User Avatar API

用户头像管理。

### Get User Avatar

**Endpoint:** `GET /api/users/[userId]/avatar`

获取用户头像。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | 用户ID |

**Response (200 OK):**

返回头像图片文件。

**Content-Type:** 根据头像类型确定 (如: `image/jpeg`, `image/png`)

**Errors:**

- `404` - 用户或头像未找到

---

### Update User Avatar

**Endpoint:** `PUT /api/users/[userId]/avatar`

上传或更新用户头像。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | 用户ID |

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:** `multipart/form-data`

| Field    | Type   | Required | Description            |
| -------- | ------ | -------- | ---------------------- |
| `avatar` | File   | Yes      | 头像图片文件           |
| `crop`   | string | No       | 裁剪参数 (JSON 字符串) |

**Supported Image Types:**

- `image/jpeg`, `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

**Max File Size:** 5MB

**Crop Parameter Format:**

```json
{
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 200
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "userId": "user_123",
    "avatarUrl": "https://cdn.example.com/avatars/user_123.jpg",
    "size": 51200,
    "width": 200,
    "height": 200,
    "format": "jpeg",
    "updatedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

**Errors:**

- `400` - 验证错误或文件格式不支持
- `401` - 未授权
- `403` - 权限不足（只能更新自己的头像）
- `413` - 文件过大
- `500` - 内部服务器错误

---

### Delete User Avatar

**Endpoint:** `DELETE /api/users/[userId]/avatar`

删除用户头像，恢复为默认头像。

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | 用户ID |

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Avatar deleted successfully",
  "data": {
    "userId": "user_123",
    "defaultAvatarUrl": "https://cdn.example.com/avatars/default.jpg",
    "deletedAt": "2026-03-22T12:00:00.000Z"
  }
}
```

**Errors:**

- `401` - 未授权
- `403` - 权限不足（只能删除自己的头像）
- `500` - 内部服务器错误

---

## 🟡 Batch User Operations API
