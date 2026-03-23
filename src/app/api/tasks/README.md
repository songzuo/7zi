# Tasks API

任务管理 API - 提供完整的 CRUD 功能、分页、筛选和排序支持。

## 目录结构

```
src/app/api/tasks/
├── route.ts                    # 任务列表和创建
├── [id]/route.ts              # 单个任务详情、更新和删除
└── __tests__/
    └── route.test.ts          # 单元测试
```

## API 端点

### 1. 获取任务列表

**端点:** `GET /api/tasks`

**认证:** 需要 JWT Token

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码（从 1 开始） |
| limit | number | 20 | 每页数量（最大 100） |
| status | string | - | 筛选状态：`pending`, `in_progress`, `completed`, `cancelled` |
| priority | string | - | 筛选优先级：`low`, `medium`, `high`, `urgent` |
| createdBy | string | - | 筛选创建者用户 ID |
| assignedTo | string | - | 筛选分配给的用户 ID |
| search | string | - | 搜索关键词（匹配标题和描述） |
| sortBy | string | createdAt | 排序字段：`createdAt`, `updatedAt`, `dueDate`, `priority`, `title` |
| sortOrder | string | desc | 排序方向：`asc`, `desc` |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "完成项目文档",
        "description": "编写 API 文档和用户指南",
        "priority": "high",
        "status": "in_progress",
        "dueDate": "2024-03-31T23:59:59Z",
        "createdBy": "user-123",
        "assignedTo": "user-456",
        "createdAt": "2024-03-23T10:00:00Z",
        "updatedAt": "2024-03-23T11:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### 2. 创建任务

**端点:** `POST /api/tasks`

**认证:** 需要 JWT Token

**请求体:**

```json
{
  "title": "新任务",
  "description": "任务描述",
  "priority": "medium",
  "status": "pending",
  "dueDate": "2024-03-31T23:59:59Z",
  "assignedTo": "user-456"
}
```

**验证规则:**

- `title`: 必需，1-200 字符
- `description`: 可选，最多 5000 字符
- `priority`: 可选，`low`, `medium`, `high`, `urgent` 之一，默认 `medium`
- `status`: 可选，`pending`, `in_progress`, `completed`, `cancelled` 之一，默认 `pending`
- `dueDate`: 可选，ISO 8601 格式日期
- `assignedTo`: 可选，目标用户 ID

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "新任务",
    "description": "任务描述",
    "priority": "medium",
    "status": "pending",
    "dueDate": "2024-03-31T23:59:59Z",
    "createdBy": "user-123",
    "assignedTo": "user-456",
    "createdAt": "2024-03-23T12:00:00Z",
    "updatedAt": "2024-03-23T12:00:00Z"
  }
}
```

### 3. 获取任务详情

**端点:** `GET /api/tasks/[id]`

**认证:** 需要 JWT Token

**路径参数:**

- `id`: 任务 ID

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "任务标题",
    "description": "任务描述",
    "priority": "high",
    "status": "in_progress",
    "dueDate": "2024-03-31T23:59:59Z",
    "createdBy": "user-123",
    "assignedTo": "user-456",
    "createdAt": "2024-03-23T10:00:00Z",
    "updatedAt": "2024-03-23T11:30:00Z"
  }
}
```

### 4. 更新任务

**端点:** `PUT /api/tasks/[id]`

**认证:** 需要 JWT Token

**路径参数:**

- `id`: 任务 ID

**请求体:** （所有字段都是可选的）

```json
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "priority": "urgent",
  "status": "completed",
  "dueDate": "2024-04-15T23:59:59Z",
  "assignedTo": "user-789"
}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "更新后的标题",
    "description": "更新后的描述",
    "priority": "urgent",
    "status": "completed",
    "dueDate": "2024-04-15T23:59:59Z",
    "createdBy": "user-123",
    "assignedTo": "user-789",
    "createdAt": "2024-03-23T10:00:00Z",
    "updatedAt": "2024-03-23T12:30:00Z"
  }
}
```

### 5. 删除任务

**端点:** `DELETE /api/tasks/[id]`

**认证:** 需要 JWT Token

**路径参数:**

- `id`: 任务 ID

**响应示例:**

```json
{
  "success": true,
  "data": {
    "message": "Task deleted successfully",
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## 错误响应

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "错误消息",
  "code": "ERROR_CODE",
  "errors": ["详细错误信息"]
}
```

### 常见错误代码

| 代码 | HTTP 状态 | 说明 |
|------|-----------|------|
| UNAUTHORIZED | 401 | 未认证或 Token 无效 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION | 400 | 输入验证失败 |
| SERVER_ERROR | 500 | 服务器内部错误 |

## 认证方式

使用 JWT Bearer Token：

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.example.com/api/tasks
```

## 数据库表结构

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TEXT,
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

## 使用示例

### JavaScript / Fetch API

```javascript
// 获取任务列表
const response = await fetch('/api/tasks?page=1&limit=20&status=pending', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const data = await response.json();

// 创建任务
const newTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: '完成项目文档',
    description: '编写 API 文档和用户指南',
    priority: 'high',
    dueDate: '2024-03-31T23:59:59Z',
  }),
});

// 更新任务
const updatedTask = await fetch('/api/tasks/task-id', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    status: 'completed',
  }),
});

// 删除任务
await fetch('/api/tasks/task-id', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### cURL

```bash
# 获取任务列表
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.example.com/api/tasks?page=1&limit=20"

# 创建任务
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"新任务","priority":"high"}' \
  https://api.example.com/api/tasks

# 更新任务
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' \
  https://api.example.com/api/tasks/task-id

# 删除任务
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.example.com/api/tasks/task-id
```

## 测试

运行单元测试：

```bash
npm test -- src/app/api/tasks/__tests__/route.test.ts
```

## 注意事项

1. **认证**: 所有端点都需要 JWT 认证
2. **分页**: 使用 page 和 limit 参数进行分页
3. **排序**: 优先级排序使用自定义顺序（low < medium < high < urgent）
4. **搜索**: search 参数会匹配标题和描述中的关键词
5. **验证**: 所有输入都会经过严格验证
6. **错误处理**: 统一的错误响应格式
7. **性能**: 使用索引优化查询性能

## 版本历史

- **v1.0.0** (2024-03-23)
  - 初始版本
  - 实现完整的 CRUD 功能
  - 支持分页、筛选、排序
  - 添加输入验证和错误处理
  - 编写单元测试
