# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## 项目: 7zi - AI 驱动团队管理平台

### 开发环境

- **工作目录**: `/root/.openclaw/workspace`
- **Node.js**: v22.22.0
- **包管理器**: npm / pnpm
- **主要分支**: main

### 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (localhost:3000)
npm run build            # 生产构建
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # ESLint 检查
npm run lint:fix         # 自动修复 lint 问题
npm run type-check       # TypeScript 类型检查
npm run format           # Prettier 格式化

# 测试
npm run test             # Vitest 单元测试 (watch)
npm run test:run         # 单元测试 (单次)
npm run test:coverage    # 测试覆盖率报告
npm run test:e2e         # Playwright E2E 测试
npm run test:all         # 运行所有测试

# 其他
npm run build:analyze    # 构建分析
```

---

## API 配置

### 内部 API 端点

---

#### 任务管理 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/tasks` | GET | 获取任务列表（支持分页、过滤） | 可选 |
| `/api/tasks` | POST | 创建新任务 | 可选（CSRF 必需） |
| `/api/tasks` | PUT | 更新任务（需传 id） | 可选（CSRF 必需） |
| `/api/tasks` | DELETE | 删除任务（需管理员） | 必需（CSRF 必需） |
| `/api/tasks/:id/assign` | POST | AI 智能分配任务 | 必需 |
| `/api/tasks/import` | GET | 获取导入模板和帮助 | 无 |
| `/api/tasks/import` | POST | 批量导入任务（CSV） | 可选（CSRF 必需） |

**GET /api/tasks - 获取任务列表（支持分页）**
```bash
# 基础请求
GET /api/tasks?status=pending&type=development&assignee=architect

# 分页请求
GET /api/tasks?page=1&limit=20&sortBy=priority&sortOrder=desc

# 响应（分页模式）
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

# 响应（简单模式）
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
      "createdAt": "2026-03-06T11:00:00Z"
    }
  ]
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码（默认 1） |
| `limit` | number | 每页数量（默认 20，最大 100） |
| `status` | string | 按状态过滤: pending, assigned, in_progress, completed |
| `type` | string | 按类型过滤: development, design, research, marketing, other |
| `assignee` | string | 按分配人 ID 过滤 |
| `projectId` | string | 按项目 ID 过滤 |
| `priority` | string | 按优先级过滤: low, medium, high, urgent |
| `sortBy` | string | 排序字段: createdAt, updatedAt, priority（默认 createdAt） |
| `sortOrder` | string | 排序方向: asc, desc（默认 desc） |
| `cache` | boolean | 是否使用缓存（默认 true） |

**POST /api/tasks - 创建任务**
```bash
# 请求
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

# 响应
{
  "id": "task-xxx",
  "title": "新任务标题",
  "status": "pending",
  "createdAt": "2026-03-14T10:00:00Z"
}
```

**POST /api/tasks/:id/assign - AI 智能分配**
```bash
# 请求 - 获取分配建议
POST /api/tasks/task-001/assign
Authorization: Bearer <token>
{}

# 响应 - 建议列表
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

# 请求 - 自动分配
POST /api/tasks/task-001/assign
Authorization: Bearer <token>
{ "autoAssign": true }

# 响应 - 已分配
{
  "success": true,
  "message": "Task automatically assigned to 架构师",
  "assignedTo": { "id": "architect", "name": "架构师", "confidence": 85 },
  "task": { ... }
}

# 请求 - 指定成员分配
POST /api/tasks/task-001/assign
Authorization: Bearer <token>
{ "preferredMemberId": "developer" }
```

**POST /api/tasks/import - 批量导入任务**
```bash
# 获取导入模板
GET /api/tasks/import

# 响应
{
  "success": true,
  "message": "任务导入 API",
  "format": {
    "type": "CSV",
    "requiredFields": ["title"],
    "optionalFields": ["description", "type", "priority", "status", "assignee"],
    "fieldTypes": {
      "type": ["feature", "bug", "refactor", "test", "docs", "development", "design", "research", "marketing", "other"],
      "priority": ["low", "medium", "high", "urgent"],
      "status": ["pending", "assigned", "in_progress", "completed"]
    }
  },
  "template": "title,description,type,priority,status,assignee\n..."
}

# 导入 CSV 文件
POST /api/tasks/import
Content-Type: text/csv

title,description,type,priority,status,assignee
"任务1","描述1","feature","high","pending","architect"
"任务2","描述2","bug","medium","pending",""

# 响应
{
  "success": true,
  "total": 2,
  "imported": 2,
  "failed": 0,
  "errors": [],
  "tasks": [...]
}
```

---

#### 项目管理 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/projects` | GET | 获取项目列表 | 可选 |
| `/api/projects` | POST | 创建新项目 | 必需 |
| `/api/projects/:id` | GET | 获取项目详情 | 可选 |
| `/api/projects/:id` | PUT | 更新项目 | 必需 |
| `/api/projects/:id` | DELETE | 删除项目 | 必需 |
| `/api/projects/:id/tasks` | GET | 获取项目任务 | 可选 |

**GET /api/projects - 获取项目列表**
```bash
# 请求
GET /api/projects?status=active&priority=high

# 响应
{
  "success": true,
  "data": [
    {
      "id": "proj-001",
      "name": "7zi Platform",
      "description": "AI 团队管理平台",
      "status": "active",
      "priority": "high",
      "members": ["architect", "developer"]
    }
  ]
}
```

**POST /api/projects - 创建项目**
```bash
# 请求
POST /api/projects
Authorization: Bearer <token>
X-CSRF-Token: <token>

{
  "name": "新项目名称",
  "description": "项目描述",
  "status": "planning",
  "priority": "medium"
}

# 响应
{
  "success": true,
  "data": { "id": "proj-xxx", "name": "新项目名称", ... }
}
```

---

#### 日志系统 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/logs` | GET | 查询日志（支持分页、过滤） | 可选 |
| `/api/logs` | DELETE | 清理旧日志（需管理员） | 必需 |
| `/api/logs/export` | GET | 导出日志 (JSON/CSV) | 可选 |

**GET /api/logs - 查询日志**
```bash
# 请求
GET /api/logs?levels=error,warn&categories=api&limit=100&page=1&orderBy=timestamp&order=desc

# 响应
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-001",
        "level": "error",
        "category": "api",
        "message": "Database connection failed",
        "timestamp": "2026-03-14T10:00:00Z",
        "userId": "user-001",
        "requestId": "req-xxx",
        "route": "/api/tasks"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 100
  }
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `levels` | string | 日志级别（逗号分隔）: debug, info, warn, error |
| `categories` | string | 分类（逗号分隔）: api, auth, database, system, client_error |
| `search` | string | 搜索文本（匹配消息内容） |
| `userId` | string | 用户 ID 过滤 |
| `requestId` | string | 请求 ID 过滤 |
| `route` | string | 路由过滤 |
| `startTime` | string | 开始时间（ISO 8601） |
| `endTime` | string | 结束时间（ISO 8601） |
| `page` | number | 页码（默认 1） |
| `limit` | number | 每页数量（默认 100，最大 1000） |
| `orderBy` | string | 排序字段: timestamp, level（默认 timestamp） |
| `order` | string | 排序方向: asc, desc（默认 desc） |

**GET /api/logs/export - 导出日志**
```bash
# 请求 - JSON 格式
GET /api/logs/export?format=json&startDate=2026-03-01&limit=1000

# 请求 - CSV 格式
GET /api/logs/export?format=csv&levels=error&categories=api

# 响应 - 文件下载
Content-Type: application/json
Content-Disposition: attachment; filename="logs-export-2026-03-14.json"

{
  "exportedAt": "2026-03-14T10:00:00Z",
  "totalRecords": 100,
  "logs": [...]
}
```

**DELETE /api/logs - 清理日志（管理员）**
```bash
# 请求
DELETE /api/logs?days=30
Authorization: Bearer <token>
X-CSRF-Token: <token>

# 响应
{
  "success": true,
  "deleted": 1500,
  "message": "Deleted 1500 log entries older than 30 days"
}
```

---

#### 健康检查 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/health` | GET | 基础健康检查 | 无 |
| `/api/health` | HEAD | 轻量检查（负载均衡） | 无 |
| `/api/health/ready` | GET | Kubernetes 就绪探针 | 无 |
| `/api/health/live` | GET | Kubernetes 存活探针 | 无 |
| `/api/health/detailed` | GET | 详细健康报告（含系统/服务） | 无 |
| `/api/health/detailed` | HEAD | 轻量详细检查 | 无 |

**GET /api/health - 基础健康检查**
```bash
# 请求
GET /api/health?history=true

# 响应
{
  "status": "ok",
  "timestamp": "2026-03-14T10:00:00Z",
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

**GET /api/health/detailed - 详细报告**
```bash
# 请求 - 完整报告
GET /api/health/detailed?include=system,services,configuration,components,history,performance&history=true

# 响应
{
  "status": "ok",
  "timestamp": "2026-03-14T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "environment": "production",
  "responseTime": 5,
  "system": {
    "memory": { "used": 256, "total": 1024, "usagePercent": 25 },
    "cpu": { "usage": 25 }
  },
  "services": {
    "database": { "status": "ok", "latency": 5 },
    "redis": { "status": "ok", "latency": 2 }
  },
  "configuration": {
    "envVars": "configured",
    "security": "enabled"
  },
  "components": {
    "cache": { "status": "ok" },
    "auth": { "status": "ok" },
    "logger": { "status": "ok" }
  },
  "apiPerformance": {
    "totalRequests": 10000,
    "totalErrors": 50,
    "errorRate": 0.5,
    "avgResponseTime": 142,
    "uptime": 99.98
  }
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `include` | string | 包含的模块（逗号分隔）: system, services, configuration, components, history, performance |
| `history` | boolean | 是否包含历史记录 |

---

#### 知识图谱 API

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

**GET /api/knowledge/nodes - 获取节点**
```bash
# 请求
GET /api/knowledge/nodes?type=concept&source=ai&minConfidence=0.7&minWeight=0.5&limit=50&offset=0

# 响应
{
  "success": true,
  "data": [
    {
      "id": "node-001",
      "content": "React 组件设计模式",
      "type": "concept",
      "weight": 0.8,
      "confidence": 0.9,
      "source": "ai",
      "tags": ["react", "frontend"],
      "timestamp": 1709500800000
    }
  ],
  "pagination": { "total": 100, "offset": 0, "limit": 50 },
  "cached": false
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 节点类型: concept, fact, rule, procedure |
| `source` | string | 来源: user, ai, document |
| `tags` | string | 标签过滤（逗号分隔） |
| `minWeight` | number | 最小权重（0-1） |
| `minConfidence` | number | 最小置信度（0-1） |
| `limit` | number | 结果数量限制 |
| `offset` | number | 偏移量（分页） |

**POST /api/knowledge/nodes - 创建节点**
```bash
# 请求
POST /api/knowledge/nodes
{
  "content": "知识内容",
  "type": "concept",
  "weight": 0.8,
  "confidence": 0.9,
  "source": "user",
  "tags": ["tag1", "tag2"],
  "metadata": { "customField": "value" }
}

# 响应
{
  "success": true,
  "data": { "id": "node-xxx", "timestamp": 1709500800000, ... }
}
```

**GET /api/knowledge/nodes/:id - 获取节点详情**
```bash
# 请求
GET /api/knowledge/nodes/node-001

# 响应
{
  "success": true,
  "data": { "id": "node-001", ... },
  "edges": [...],
  "neighbors": [...]
}
```

**GET /api/knowledge/edges - 获取边关系**
```bash
# 请求
GET /api/knowledge/edges?type=relates_to&from=node-001&minWeight=0.7&limit=50

# 响应
{
  "success": true,
  "data": [
    {
      "id": "edge-001",
      "from": "node-001",
      "to": "node-002",
      "type": "relates_to",
      "weight": 0.85,
      "timestamp": 1709500800000
    }
  ],
  "pagination": { "total": 50, "offset": 0, "limit": 50 }
}
```

**POST /api/knowledge/edges - 创建边**
```bash
# 请求
POST /api/knowledge/edges
{
  "from": "node-001",
  "to": "node-002",
  "type": "relates_to",
  "weight": 0.85,
  "metadata": {}
}

# 响应
{
  "success": true,
  "data": { "id": "edge-xxx", ... }
}
```

**边关系类型:**
| 类型 | 说明 |
|------|------|
| `relates_to` | 相关关系 |
| `depends_on` | 依赖关系 |
| `extends` | 扩展关系 |
| `contradicts` | 矛盾关系 |

**POST /api/knowledge/query - 知识查询**
```bash
# 请求
POST /api/knowledge/query
{
  "searchText": "组件",
  "type": "concept",
  "source": "ai",
  "tags": ["react"],
  "minConfidence": 0.5,
  "minWeight": 0.3,
  "limit": 20
}

# 响应
{
  "success": true,
  "data": {
    "nodes": [...],
    "relevanceScores": [0.95, 0.85, 0.75],
    "edges": [...],
    "total": 50
  }
}
```

**POST /api/knowledge/inference - 知识推理**
```bash
# 请求
POST /api/knowledge/inference
{
  "startNodeId": "node-001",
  "maxDepth": 3
}

# 响应
{
  "success": true,
  "data": {
    "conclusion": "Based on 5 related knowledge items",
    "confidence": 0.85,
    "path": ["node-001", "node-002", "node-003"],
    "relatedNodes": [...]
  }
}
```

**GET /api/knowledge/lattice - 获取完整晶格**
```bash
# 请求
GET /api/knowledge/lattice?includeStats=true

# 响应
{
  "success": true,
  "data": {
    "nodes": [...],
    "edges": [...],
    "stats": {
      "totalNodes": 100,
      "totalEdges": 250,
      "avgConnectivity": 2.5
    }
  }
}
```

---

#### 认证 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/auth` | GET | API 信息 / CSRF / 当前用户 | 可选 |
| `/api/auth` | POST | 登录（action=login 或无） | 无 |
| `/api/auth` | POST | 刷新令牌（action=refresh） | 无 |
| `/api/auth` | POST | 登出（action=logout） | 无 |
| `/api/auth` | DELETE | 登出 | 无 |
| `/api/auth/login` | POST | 登录（速率限制 5次/分钟） | 无 |
| `/api/auth/logout` | POST, DELETE | 登出 | 无 |
| `/api/auth/refresh` | POST | 刷新访问令牌 | 无 |
| `/api/auth/me` | GET | 获取当前用户信息 | 必需 |

**POST /api/auth/login - 登录**
```bash
# 请求
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "your-password"
}

# 响应
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
# Set-Cookie: access_token=...; refresh_token=...
```

**GET /api/auth/me - 获取当前用户**
```bash
# 请求
GET /api/auth/me
Authorization: Bearer <token>
# 或 Cookie: access_token=...

# 响应
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

**POST /api/auth/refresh - 刷新令牌**
```bash
# 请求
POST /api/auth/refresh
Cookie: refresh_token=...

# 响应
{
  "success": true,
  "accessToken": "eyJ..."
}
```

**GET /api/auth?action=csrf - 获取 CSRF Token**
```bash
# 请求
GET /api/auth?action=csrf

# 响应
{
  "success": true,
  "csrfToken": "xxx"
}
# Set-Cookie: csrf_token=...
```

---

#### 通知系统 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/notifications` | GET | 获取通知列表 | 可选 |
| `/api/notifications` | POST | 创建通知 | 可选 |
| `/api/notifications` | PUT | 标记已读/全部已读 | 可选 |
| `/api/notifications` | DELETE | 删除通知/清空全部 | 可选 |

**GET /api/notifications - 获取通知**
```bash
# 请求
GET /api/notifications?userId=user-001&read=false&limit=20

# 响应
{
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "type": "task_assigned",
      "title": "新任务分配",
      "message": "您被分配了新任务",
      "read": false,
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ],
  "total": 5
}
```

**POST /api/notifications - 创建通知**
```bash
# 请求
POST /api/notifications
X-CSRF-Token: <token>

{
  "type": "task_assigned",
  "title": "新任务分配",
  "message": "您被分配了新任务",
  "userId": "user-001",
  "priority": "high",
  "link": "/tasks/task-001"
}

# 响应
{
  "id": "notif-xxx",
  "type": "task_assigned",
  "title": "新任务分配",
  ...
}
```

**PUT /api/notifications - 标记已读**
```bash
# 请求 - 单个标记
PUT /api/notifications
X-CSRF-Token: <token>

{ "id": "notif-001", "read": true }

# 请求 - 全部标记
PUT /api/notifications
X-CSRF-Token: <token>

{ "markAllRead": true }

# 响应
{
  "success": true,
  "message": "5 notifications marked as read",
  "count": 5
}
```

**DELETE /api/notifications - 删除通知**
```bash
# 请求 - 删除单个
DELETE /api/notifications?id=notif-001
X-CSRF-Token: <token>

# 请求 - 删除全部
DELETE /api/notifications?deleteAll=true
X-CSRF-Token: <token>

# 响应
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

#### 博客评论 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/comments` | GET | 获取评论列表（可按文章过滤） | 无 |
| `/api/comments` | POST | 创建评论 | 无 |
| `/api/comments/:id` | GET | 获取单个评论 | 无 |
| `/api/comments/:id` | PUT | 更新评论 | 无 |
| `/api/comments/:id` | DELETE | 删除评论 | 无 |

**GET /api/comments - 获取评论**
```bash
# 请求
GET /api/comments?postId=post-001

# 响应
{
  "success": true,
  "data": [
    {
      "id": "comment-001",
      "postId": "post-001",
      "author": "用户名",
      "content": "评论内容",
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ],
  "total": 10
}
```

**POST /api/comments - 创建评论**
```bash
# 请求
POST /api/comments
{
  "postId": "post-001",
  "author": "用户名",
  "content": "评论内容（最多5000字）"
}

# 响应
{
  "success": true,
  "data": { "id": "comment-xxx", ... }
}
```

---

#### 性能监控 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/performance` | GET | 获取性能指标 | 无 |

**GET /api/performance - 性能指标**
```bash
# 基础摘要
GET /api/performance

# 完整详情
GET /api/performance?detail=full

# 仅端点统计
GET /api/performance?detail=endpoints&limit=20

# 系统快照历史
GET /api/performance?detail=system&limit=50

# 每小时统计
GET /api/performance?detail=hourly&limit=168

# 响应（summary 模式）
{
  "timestamp": "2026-03-14T10:00:00Z",
  "summary": {
    "totalRequests": 10000,
    "totalErrors": 50,
    "errorRate": 0.5,
    "avgResponseTime": 142,
    "uptime": 99.98,
    "endpointsCount": 25
  },
  "latestSnapshot": {
    "memory": { "used": 256, "total": 1024 },
    "cpu": { "usage": 25 }
  },
  "slowestEndpoints": [...],
  "mostAccessedEndpoints": [...]
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `detail` | string | 详情级别: summary（默认）, full, endpoints, system, hourly |
| `limit` | number | 列表项数量（默认 10） |

---

#### 通知偏好 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/notifications/preferences` | GET | 获取用户通知偏好 | 可选 |
| `/api/notifications/preferences` | PUT | 更新用户通知偏好 | 可选（CSRF 必需） |
| `/api/notifications/preferences` | POST | 重置为默认偏好 | 可选（CSRF 必需） |

**GET /api/notifications/preferences - 获取偏好**
```bash
# 请求
GET /api/notifications/preferences?userId=user-001

# 响应
{
  "success": true,
  "data": {
    "preferences": {
      "userId": "user-001",
      "email": true,
      "push": true,
      "slack": false,
      "digest": "daily",
      "taskAssigned": true,
      "taskCompleted": true,
      "mentions": true,
      "updatedAt": "2026-03-15T10:00:00Z"
    }
  }
}
```

**偏好设置字段说明:**
| 字段 | 类型 | 说明 |
|------|------|------|
| `email` | boolean | 邮件通知开关 |
| `push` | boolean | 推送通知开关 |
| `slack` | boolean | Slack 通知开关 |
| `digest` | string | 摘要频率: 'none', 'daily', 'weekly' |
| `taskAssigned` | boolean | 任务分配通知开关 |
| `taskCompleted` | boolean | 任务完成通知开关 |
| `mentions` | boolean | 提及通知开关 |

**PUT /api/notifications/preferences - 更新偏好**
```bash
# 请求
PUT /api/notifications/preferences
X-CSRF-Token: <token>

{
  "email": true,
  "push": false,
  "slack": true,
  "digest": "weekly",
  "taskAssigned": true,
  "taskCompleted": true,
  "mentions": true
}

# 响应
{
  "success": true,
  "data": {
    "preferences": { ... },
    "message": "Notification preferences updated successfully"
  }
}
```

**POST /api/notifications/preferences - 重置为默认**
```bash
# 请求
POST /api/notifications/preferences
X-CSRF-Token: <token>

# 响应
{
  "success": true,
  "data": {
    "preferences": {
      "userId": "user-001",
      "email": true,
      "push": true,
      "slack": false,
      "digest": "daily",
      "taskAssigned": true,
      "taskCompleted": true,
      "mentions": true,
      "updatedAt": "2026-03-15T10:00:00Z"
    },
    "message": "Notification preferences reset to defaults"
  }
}
```

---

#### 测试 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/test` | GET | 简单测试端点 | 无 |

**GET /api/test - 测试端点**
```bash
# 请求
GET /api/test

# 响应
{
  "success": true,
  "data": "Hello from /api/test",
  "timestamp": "2026-03-14T10:00:00Z"
}
```

---

#### 系统状态 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/status` | GET | 公开系统状态（状态页面） | 无 |

**GET /api/status - 系统状态**
```bash
# 基础请求
GET /api/status

# 包含性能详情
GET /api/status?performance=true

# 包含端点详情
GET /api/status?endpoints=true

# 响应
{
  "status": "operational",
  "lastUpdated": "2026-03-14T10:00:00Z",
  "services": [
    { "name": "Website", "status": "operational", "uptime": 99.98, "responseTime": 120 },
    { "name": "API", "status": "operational", "uptime": 99.99, "responseTime": 85 },
    { "name": "CDN", "status": "operational", "uptime": 99.99, "responseTime": 45 }
  ],
  "metrics": {
    "requests": 125000,
    "errors": 23,
    "avgResponseTime": 142,
    "p95ResponseTime": 380
  },
  "incidents": [],
  "maintenance": [],
  "performance": {  // 可选（?performance=true）
    "totalRequests": 10000,
    "totalErrors": 50,
    "errorRate": 0.5,
    "avgResponseTime": 142,
    "uptime": 99.98,
    "hourlyStats": [...]
  },
  "endpoints": {  // 可选（?endpoints=true）
    "slowest": [...],
    "mostAccessed": [...],
    "all": [...]
  }
}
```

**Query 参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `performance` | boolean | 是否包含性能详情 |
| `endpoints` | boolean | 是否包含端点详情 |

---

#### 客户端错误日志 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/log-error` | POST | 上报前端错误 | 无 |
| `/api/log-error` | GET | 获取错误统计（管理员） | 必需（管理员） |

**POST /api/log-error - 上报错误**
```bash
# 请求
POST /api/log-error
{
  "message": "Uncaught TypeError: ...",
  "stack": "at App.tsx:25...",
  "componentStack": "at Component...",
  "digest": "NEXT_ERROR_DIGEST_xxx",
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-03-14T10:00:00Z",
  "additionalInfo": { "customField": "value" }
}

# 响应
{
  "success": true,
  "requestId": "req-xxx",
  "message": "错误已记录"
}
```

**GET /api/log-error - 获取错误统计（管理员）**
```bash
# 请求
GET /api/log-error?limit=50&offset=0
Authorization: Bearer <token>

# 响应
{
  "success": true,
  "data": [
    {
      "id": "log-001",
      "level": "error",
      "category": "client_error",
      "message": "Uncaught TypeError...",
      "timestamp": "2026-03-14T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "totalPages": 3
  }
}
```

---

#### 示例 API（开发参考）

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/examples/protected` | GET | 受保护路由示例 | 必需 |
| `/api/examples/protected` | DELETE | 管理员路由示例 | 必需（管理员） |
| `/api/examples/protected` | POST | 自定义认证示例 | 必需 |
| `/api/examples/protected` | PUT | 可选认证示例 | 可选 |

### 外部服务配置

#### EmailJS (联系表单)
```env
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
```

#### Resend (邮件通知)
```env
RESEND_API_KEY=re_xxx
```

#### 告警通知
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_EMAIL_RECIPIENTS=admin@example.com
```

---

## 子代理配置

### 并行任务限制
- **最大并行数**: 5
- **推荐范围**: 3-5
- **任务超时**: 30分钟

### AI 模型分配

| 角色 | 模型 | 用途 |
|------|------|------|
| 智能体世界专家 | MiniMax-M2.5 | 战略规划 |
| 咨询师 | MiniMax-M2.5 | 研究分析 |
| 架构师 | Self-Claude | 系统设计 |
| Executor | Volcengine | 代码执行 |
| 系统管理员 | Bailian | 运维部署 |
| 测试员 | MiniMax-M2.5 | 测试编写 |
| 设计师 | Self-Claude | UI/UX |
| 推广专员 | Volcengine | SEO/营销 |
| 销售客服 | Bailian | 客户支持 |
| 财务 | MiniMax-M2.5 | 财务管理 |
| 媒体 | Self-Claude | 内容创作 |

---

## 项目模块

### 已完成模块

| 模块 | 路径 | 状态 |
|------|------|------|
| Portfolio | `/portfolio` | ✅ 完成 |
| Tasks | `/tasks` | ✅ 完成 |
| Dashboard | `/dashboard` | ✅ 完成 |
| Blog | `/blog` | ✅ 完成 |
| About | `/about` | ✅ 完成 |
| Contact | `/contact` | ✅ 完成 |
| Settings | `/settings` | ✅ 完成 |
| Knowledge Lattice | `/knowledge-lattice` | ✅ 完成 |

### API 端点实现状态

| API 模块 | 实现状态 | 端点数 | 备注 |
|----------|----------|--------|------|
| Tasks API | ✅ 完整 | 7 | `/api/tasks` (CRUD), `/api/tasks/:id/assign`, `/api/tasks/import` |
| Projects API | ✅ 完整 | 6 | `/api/projects` (CRUD), `/api/projects/:id/tasks` |
| Health API | ✅ 完整 | 6 | `/api/health`, `/api/health/ready`, `/api/health/live`, `/api/health/detailed` |
| Knowledge API | ✅ 完整 | 10 | `/api/knowledge/nodes`, `/api/knowledge/edges`, `/api/knowledge/query`, `/api/knowledge/inference`, `/api/knowledge/lattice` |
| Auth API | ✅ 完整 | 10 | `/api/auth`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/me` |
| Status API | ✅ 完整 | 1 | `/api/status` (公开状态页面，含性能指标) |
| Performance API | ✅ 完整 | 1 | `/api/performance` (性能监控) |
| Logs API | ✅ 完整 | 3 | `/api/logs` (查询/删除), `/api/logs/export` (JSON/CSV) |
| Notifications API | ✅ 完整 | 7 | `/api/notifications` (CRUD, 标记已读), `/api/notifications/preferences` (GET/PUT/POST) |
| Comments API | ✅ 完整 | 5 | `/api/comments` (CRUD, 按文章过滤) |
| Log Error API | ✅ 完整 | 2 | `/api/log-error` (上报/查询) |
| Examples API | ✅ 完整 | 4 | `/api/examples/protected` (认证示例) |
| Test API | ✅ 完整 | 1 | `/api/test` (简单测试) |

### 重构状态

| 组件 | 原行数 | 新行数 | 状态 |
|------|--------|--------|------|
| UserSettingsPage | 713 | 160 | ✅ 完成 |
| Dashboard | 466 | - | ✅ 完成 |
| AboutContent | 584 | - | ✅ 完成 |

---

## 测试配置

### Vitest (单元测试)
- **配置文件**: `vitest.config.ts`
- **测试目录**: `src/test/`
- **覆盖率工具**: v8

### Playwright (E2E 测试)
- **配置文件**: `playwright.config.ts`
- **测试目录**: `e2e/`
- **浏览器**: Chromium, Firefox, WebKit

---

## 部署配置

### Docker
```bash
# 构建镜像
docker build -t 7zi-team .

# 运行容器
docker run -p 3000:3000 --env-file .env 7zi-team
```

### PM2
```bash
# 启动
pm2 start ecosystem.config.js

# 重启
pm2 restart 7zi

# 日志
pm2 logs 7zi
```

---

## 文档资源

| 文档 | 说明 |
|------|------|
| `MEMORY.md` | 长期记忆与项目概览 |
| `TECH_DEBT.md` | 技术债务清单 |
| `README.md` | 项目说明文档 |
| `ARCHITECTURE.md` | 技术架构说明 |
| `DOCS_INDEX.md` | 完整文档索引 |
| `memory/` | 每日工作日志 |

---

## 常见问题

### Q: 如何添加新的 AI 任务？
```bash
POST /api/tasks
{
  "title": "任务标题",
  "description": "任务描述",
  "priority": "high|medium|low",
  "type": "feature|bug|refactor|test"
}
```

### Q: 如何运行单个测试文件？
```bash
npm run test -- path/to/test.test.ts
```

### Q: 如何查看构建分析？
```bash
npm run build:analyze
# 打开 .next/analyze/ 目录查看报告
```

---

*此文件记录开发环境的具体配置，保持更新。*
