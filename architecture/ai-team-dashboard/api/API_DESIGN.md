# API 设计文档

## 1. RESTful API 端点

### 1.1 基础信息
- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **认证**: Bearer Token (可选，公开数据无需认证)

### 1.2 端点列表

#### 获取任务列表
```http
GET /issues
```

**查询参数:**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| state | string | open | open/closed/all |
| assignee | string | - | 按成员筛选 |
| labels | string | - | 按标签筛选 (逗号分隔) |
| milestone | number | - | 按里程碑筛选 |
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 (max: 100) |
| sort | string | updated | created/updated/comments |
| direction | string | desc | asc/desc |

**响应:**
```json
{
  "data": [
    {
      "id": 12345,
      "number": 42,
      "title": "实现用户登录功能",
      "state": "open",
      "labels": [
        {"id": 1, "name": "feature", "color": "0e8a16"}
      ],
      "assignee": {
        "id": "architect",
        "name": "架构师",
        "avatar": "/avatars/architect.png"
      },
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-06T01:30:00Z",
      "closed_at": null,
      "html_url": "https://github.com/owner/repo/issues/42",
      "milestone": {
        "id": 1,
        "title": "v1.0",
        "due_on": "2026-03-31T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "cached": true,
  "cacheAge": 120
}
```

**状态码:**
- `200`: 成功
- `400`: 参数错误
- `429`: 速率限制

---

#### 获取单个任务详情
```http
GET /issues/:number
```

**响应:**
```json
{
  "data": {
    "id": 12345,
    "number": 42,
    "title": "实现用户登录功能",
    "state": "open",
    "body": "## 需求描述\n\n需要实现 OAuth 登录...",
    "labels": [...],
    "assignee": {...},
    "comments": [
      {
        "id": 1,
        "user": {"name": "架构师"},
        "body": "开始实现",
        "created_at": "2026-03-06T01:00:00Z"
      }
    ],
    "timeline": [
      {
        "event": "assigned",
        "actor": "主管",
        "assignee": "架构师",
        "created_at": "2026-03-05T10:00:00Z"
      }
    ],
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-06T01:30:00Z"
  }
}
```

---

#### 获取 AI 成员列表
```http
GET /members
```

**响应:**
```json
{
  "data": [
    {
      "id": "architect",
      "name": "架构师",
      "role": "🏗️ 架构设计",
      "avatar": "/avatars/architect.png",
      "status": "working",
      "statusMessage": "正在设计 API 架构",
      "currentTask": {
        "number": 42,
        "title": "实现用户登录功能"
      },
      "skills": ["System Design", "API Design", "TypeScript"],
      "provider": "self-claude",
      "completedTasks": 23,
      "activeIssues": 2,
      "contributionHistory": [
        {
          "id": "c1",
          "issueId": 40,
          "action": "closed",
          "timestamp": "2026-03-05T18:00:00Z",
          "description": "关闭了 #40"
        }
      ]
    }
  ],
  "meta": {
    "total": 11,
    "working": 5,
    "idle": 4,
    "offline": 2
  }
}
```

---

#### 获取单个成员详情
```http
GET /members/:id
```

**响应:**
```json
{
  "data": {
    "id": "architect",
    "name": "架构师",
    "role": "🏗️ 架构设计",
    "avatar": "/avatars/architect.png",
    "status": "working",
    "statusMessage": "正在设计 API 架构",
    "updatedAt": "2026-03-06T01:35:00Z",
    "currentTask": {...},
    "skills": [...],
    "provider": "self-claude",
    "statistics": {
      "completedTasks": 23,
      "activeIssues": 2,
      "avgCompletionTime": "4.5h",
      "thisWeek": {
        "completed": 5,
        "comments": 12,
        "hoursWorked": 28
      }
    },
    "contributionHistory": [...],
    "recentActivity": [
      {
        "type": "issue_commented",
        "issue": 42,
        "timestamp": "2026-03-06T01:30:00Z"
      }
    ]
  }
}
```

---

#### 获取成员贡献统计
```http
GET /members/:id/contributions
```

**查询参数:**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| from | date | 30d ago | 开始日期 |
| to | date | now | 结束日期 |
| type | string | all | issue/comment/pr |

**响应:**
```json
{
  "data": {
    "memberId": "architect",
    "period": {
      "from": "2026-02-05T00:00:00Z",
      "to": "2026-03-06T01:35:00Z"
    },
    "summary": {
      "issuesCreated": 5,
      "issuesClosed": 8,
      "commentsPosted": 45,
      "prsOpened": 3,
      "prsMerged": 2
    },
    "timeline": [
      {
        "date": "2026-03-06",
        "issues": 2,
        "comments": 8,
        "prs": 1
      }
    ],
    "contributions": [...]
  }
}
```

---

#### 获取系统状态
```http
GET /health
```

**响应:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "github": {"status": "ok", "latency": 120},
    "redis": {"status": "ok", "latency": 5},
    "database": {"status": "ok", "latency": 15}
  },
  "stats": {
    "issues": 156,
    "members": 11,
    "websocketConnections": 23
  }
}
```

---

#### 刷新数据 (管理端点)
```http
POST /refresh
```

**请求体:**
```json
{
  "type": "issues" // issues | members | all
}
```

**响应:**
```json
{
  "status": "refreshing",
  "estimatedTime": 5000
}
```

---

## 2. WebSocket 实时事件

### 2.1 连接
```javascript
const socket = io('ws://localhost:4000', {
  transports: ['websocket'],
  auth: { token: 'Bearer xxx' } // 可选
});
```

### 2.2 客户端 → 服务器事件

#### 订阅频道
```javascript
// 订阅特定频道
socket.emit('subscribe', {
  channels: ['issues', 'members', 'system']
});

// 订阅特定成员的更新
socket.emit('subscribe', {
  channels: ['member:architect', 'member:executor']
});

// 订阅特定 Issue 的更新
socket.emit('subscribe', {
  channels: ['issue:42', 'issue:43']
});
```

#### 取消订阅
```javascript
socket.emit('unsubscribe', {
  channels: ['issues']
});
```

#### 心跳
```javascript
socket.emit('ping', { timestamp: Date.now() });
// 服务器响应: socket.emit('pong', { timestamp: Date.now() })
```

### 2.3 服务器 → 客户端事件

#### Issue 更新
```javascript
socket.on('issue:updated', (data) => {
  // data: Issue 对象
  console.log('Issue updated:', data);
});

socket.on('issue:created', (data) => {
  console.log('New issue:', data);
});

socket.on('issue:closed', (data) => {
  console.log('Issue closed:', data);
});

socket.on('issue:assigned', (data) => {
  // { issue: Issue, assignee: AIMember }
  console.log('Issue assigned:', data);
});
```

#### 成员状态更新
```javascript
socket.on('member:status', (data) => {
  // { memberId, status, statusMessage, currentTask }
  console.log('Member status changed:', data);
});

socket.on('member:activity', (data) => {
  // { memberId, action, issue, timestamp }
  console.log('Member activity:', data);
});
```

#### 系统事件
```javascript
socket.on('system:refresh', (data) => {
  // 数据刷新完成
  console.log('Data refreshed:', data);
});

socket.on('system:error', (data) => {
  // { code, message }
  console.error('System error:', data);
});

socket.on('system:rate-limit', (data) => {
  // { resetAt, remaining }
  console.warn('Rate limited:', data);
});
```

### 2.4 错误处理
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // 实现重连逻辑
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason: 'io server disconnect', 'io client disconnect', etc.
});
```

---

## 3. 数据缓存策略

### 3.1 Redis 键设计
```
# Issues
issues:owner:repo              # Issue 列表 (JSON)
issues:owner:repo:page:{page}  # 分页数据
issue:owner:repo:{number}      # 单个 Issue 详情

# Members
members                        # 成员列表 (JSON)
member:{id}                    # 成员详情
member:{id}:status             # 成员状态 (简化)
member:{id}:contributions      # 贡献记录

# System
system:stats                   # 系统统计
system:last-sync               # 最后同步时间
```

### 3.2 TTL 配置
```javascript
const CACHE_TTL = {
  ISSUES_LIST: 300,        // 5 分钟
  ISSUES_DETAIL: 600,      // 10 分钟
  MEMBERS_LIST: 180,       // 3 分钟
  MEMBERS_STATUS: 60,      // 1 分钟
  CONTRIBUTIONS: 900,      // 15 分钟
  SYSTEM_STATS: 30         // 30 秒
};
```

### 3.3 缓存失效策略
```javascript
// GitHub Webhook 触发
app.post('/webhook/github', (req, res) => {
  const { action, issue } = req.body;
  
  switch (action) {
    case 'opened':
    case 'closed':
    case 'edited':
      redis.del(`issue:${repo}:${issue.number}`);
      redis.del(`issues:${repo}`);
      io.emit('issue:updated', issue);
      break;
    case 'assigned':
      redis.del(`member:${issue.assignee.login}:status`);
      io.emit('issue:assigned', issue);
      break;
  }
  
  res.sendStatus(200);
});
```

### 3.4 缓存命中头
```javascript
// 所有 API 响应包含缓存信息
res.set({
  'X-Cache': cached ? 'HIT' : 'MISS',
  'X-Cache-Age': cacheAge.toString(),
  'X-Cache-TTL': ttl.toString()
});
```

---

## 4. 速率限制

### 4.1 限制配置
```javascript
const rateLimit = {
  windowMs: 60000,        // 1 分钟
  max: {
    issues: 30,           // 每分钟 30 次
    members: 60,          // 每分钟 60 次
    websocket: 100        // 每分钟 100 条消息
  }
};
```

### 4.2 响应头
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1709616000
Retry-After: 60
```

---

## 5. 错误码

| 代码 | 说明 |
|------|------|
| 4000 | 参数错误 |
| 4001 | 认证失败 |
| 4002 | 权限不足 |
| 4003 | 资源不存在 |
| 4290 | 速率限制 |
| 5000 | GitHub API 错误 |
| 5001 | Redis 连接错误 |
| 5002 | 数据库错误 |
