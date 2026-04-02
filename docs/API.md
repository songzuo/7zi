# API 完整文档

**最后更新**: 2026-04-02
**版本**: v1.8.0
**API 端点总数**: 60+

---

## 📋 目录

1. [API 概览](#api-概览)
2. [认证与授权 API](#认证与授权-api)
3. [任务管理 API](#任务管理-api)
4. [项目管理 API](#项目管理-api)
5. [性能监控 API](#性能监控-api)
6. [分析 API](#分析-api)
7. [搜索 API](#搜索-api)
8. [RBAC 权限 API](#rbac-权限-api)
9. [多模态 API](#多模态-api)
10. [A2A 通信 API](#a2a-通信-api)
11. [评分 API](#评分-api)
12. [反馈 API](#反馈-api)
13. [用户偏好设置 API](#用户偏好设置-api)
14. [Web Vitals API](#web-vitals-api)
15. [GitHub 集成 API](#github-集成-api)
16. [健康检查 API](#健康检查-api)
17. [工作流编排 API](#工作流编排-api)
18. [告警系统 API](#告警系统-api)
19. [数据模型](#数据模型)
20. [错误处理](#错误处理)

### 📚 专项 API 文档

- **[WebSocket API](./api/websocket.md)** - 房间系统、权限控制、消息持久化
- **[Agent Scheduler API](./api/agent-scheduler.md)** - AI Agent 调度系统、任务队列
- **[Dashboard 组件](./lib/agent-scheduler/dashboard/README.md)** - 可视化 Dashboard 组件文档

---

## API 概览

### v1.8.0 新增功能 (2026-04-02)

v1.8.0 版本引入了可视化工作流编排和 Email 告警系统：

#### 🎨 Visual Workflow Orchestrator (100% 完成)

**核心功能** (`src/lib/workflow/VisualWorkflowOrchestrator.ts`)

- 工作流执行引擎 - async/await 支持，事件驱动架构
- 6 种节点类型 - start, end, task (agent), condition, parallel, wait
- 状态管理 - pending, running, completed, failed, skipped
- 自定义执行器 API - 可注册自定义节点执行逻辑
- 工作流定义验证 - 自动验证工作流结构
- 实例生命周期管理 - create, execute, cancel, pause, resume

**Workflow Canvas 组件** (`src/components/workflow/WorkflowCanvas.tsx`)

- 节点拖拽放置
- 边/连接线绘制 (Bezier 曲线)
- 缩放控制 (放大、缩小、适应内容、重置)
- 网格对齐 (可切换)
- 键盘快捷键 (Delete/Backspace 删除节点)
- 状态指示器 (pending, running, completed, failed)
- 只读模式支持

| 节点类型         | 颜色    | 用途         |
| ---------------- | ------- | ------------ |
| `start`          | 🟢 绿色 | 工作流入口   |
| `end`            | 🔴 红色 | 工作流终止   |
| `task` / `agent` | 🔵 蓝色 | 任务执行节点 |
| `condition`      | 🟡 黄色 | 条件分支     |
| `parallel`       | 🟣 紫色 | 并行执行     |
| `wait`           | ⚪ 灰色 | 等待/延迟    |

#### 📧 Email Alerting 基础设施 (100% 完成)

**Email 配置** (`src/config/email.ts`)

- SMTP 配置接口 - host, port, auth
- TLS/SSL 支持
- 环境变量解析和验证

**Email 服务** (`src/lib/alerting/EmailAlertService.ts`)

- 使用 nodemailer 发送邮件
- 连接池管理
- 错误处理和重试机制

**告警模板** (`src/lib/alerting/templates/alert-template.ts`)

- HTML 邮件模板
- 告警级别颜色和图标
- 指标数据展示

**环境变量配置**:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_SECURE=false
EMAIL_SENDER_NAME=7zi System
EMAIL_SENDER_EMAIL=noreply@example.com
EMAIL_RECIPIENTS=admin@example.com
EMAIL_ALERTING_ENABLED=true
```

---

### v1.7.0 新增功能 (2026-04-02)

v1.7.0 专注于类型安全强化和可观测性增强：

#### 🌟 TypeScript 严格模式 P0-P2 (100% 完成)

- 编译 **0 错误**
- 持续提升类型覆盖率

#### 📊 UI 一致性 (100% 完成)

- 发布完整的 UI 一致性设计规范 (`UI_CONSISTENCY_GUIDE.md`)
- 建立 23 项 UI 检查规则
- 修复暗色模式颜色问题

#### 📈 Performance Monitoring 增强 (80% 完成)

- MonitoringProvider - 全局监控初始化
- Web Vitals 监控 - LCP, FID, CLS, TTFB 自动追踪
- Sentry API 现代化 - 迁移到 Sentry v10+ API

---

### v1.6.0 新增功能 (2026-04-01)

v1.6.0 专注于 **Agent Registry 核心功能**、**A2A Protocol v2.1** 和 **API 性能优化**：

#### 🤖 Agent Registry 核心功能 (100% 完成)

**HeartbeatMonitor** (`src/lib/agents/registry/heartbeat-monitor.ts`)

- 心跳监控 - 30 秒超时检测机制
- 自动下线处理 - 超时 Agent 自动标记为离线
- 统计信息追踪 - 实时统计在线/离线 Agent 数量

**核心特性**:
| 功能 | 说明 |
|------|------|
| 超时检测 | 30 秒无心跳自动标记离线 |
| 自动恢复 | Agent 重连后自动恢复在线状态 |
| 统计追踪 | 在线/离线/总数实时统计 |

**API 端点**:

```
POST   /api/agents/register   - 注册智能体
GET    /api/agents/:id        - 获取智能体信息
DELETE /api/agents/:id        - 注销智能体
GET    /api/agents/discover   - 发现智能体
POST   /api/agents/heartbeat  - 发送心跳
```

#### 🔗 A2A Protocol v2.1 (100% 完成)

**协作消息格式** (`src/lib/agents/a2a/protocol-v2.1.ts`)

- 标准化消息格式 - JSON-RPC 2.0 兼容
- 消息验证 - Zod schema 运行时验证

**任务委派机制** (`src/lib/agents/a2a/delegation.ts`)

- 任务委派 - 跨 Agent 任务分配
- 依赖管理 - 任务依赖关系处理
- 优先级队列 - 基于优先级的任务调度

**结果聚合** (`src/lib/agents/a2a/aggregation.ts`)

- 8 种聚合策略: first, last, all, majority, best, average, merge, custom
- 错误处理 - 部分失败容错机制

#### 🚀 API 性能优化 (100% 完成)

**MultiLevelCacheManager** (`src/lib/cache/MultiLevelCacheManager.ts`)

- 三层缓存架构 - L1(内存) + L2(Redis) + L3(数据库)
- 自动降级机制 - Redis 不可用时降级到内存缓存
- 请求去重 - 100ms 去重窗口

**性能提升**:
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| L2 Cache Hit | ~200ms | <15ms | 92% ↓ |
| P95 响应时间 | ~200ms | <100ms | 50% ↓ |

---

### v1.5.0 新增功能 (2026-03-30)

v1.5.0 专注于 **认证中间件模块化** 和 **架构优化**：

#### 🔐 auth.middleware 模块 (100% 完成)

- 路径保护 - 自动保护敏感 API 端点
- 用户信息提取 - 从请求头提取用户 ID、邮箱、角色
- 权限检查 - 基于角色的访问控制 (RBAC)

---

### v1.4.0 新增功能 (2026-03-29)

v1.4.0 版本引入了三大核心功能：

#### 🔄 WebSocket 高级功能 (100% 完成)

**房间系统** (`src/lib/websocket/rooms.ts`)

- 多房间支持 - 动态房间创建和管理，支持 task/project/chat/document/voice/video 类型
- 房间可见性 - 公开(public)、私有(private)、仅邀请(invite-only) 三种模式
- 参与者管理 - 加入/离开、踢出/封禁、角色变更
- 状态追踪 - 光标位置、输入状态、在线/离线、最后活动时间

**权限控制系统** (`src/lib/websocket/permissions.ts`)

- 5 种角色 - owner/admin/moderator/member/guest
- 16 种权限 - 房间权限 7 种 + 消息权限 6 种 + 管理权限 3 种
- RBAC 集成 - 角色层级强制、权限授予/撤销/过期

**消息持久化** (`src/lib/websocket/message-store.ts`)

- 内存存储 - 每房间最多 10,000 条消息
- 离线消息队列 - TTL 7 天、每用户 100 条
- 消息操作 - 存储、编辑、软删除、永久删除

**详见**: [WebSocket API 文档](./api/websocket.md)

#### 🤖 AI Agent 智能调度系统 (100% 完成)

**核心组件** (`src/lib/agent-scheduler/`)

- 调度器核心 - 多维度评分算法 (能力 40% + 负载 30% + 性能 20% + 响应 10%)
- 负载均衡 - 保留 10% 缓冲，避免单 Agent 过载
- Dashboard UI - AgentStatusPanel、TaskQueueView、ScheduleHistory、ManualOverride

**详见**: [Agent 调度 API 文档](./api/agent-scheduler.md)

#### ⚡ React Compiler 可选功能 (100% 完成)

**配置文件**

- 环境变量控制系统
- 兼容性检测工具
- 回滚机制

**详见**: [React Compiler 实施报告](../../REACT_COMPILER_OPTIONAL_IMPLEMENTATION.md)

### API 分类统计

| 分类           | 端点数量 | 说明                           | 文档                                           |
| -------------- | -------- | ------------------------------ | ---------------------------------------------- |
| **认证与授权** | 5        | 登录、注册、刷新 Token         | 见本文档                                       |
| **任务管理**   | 1        | 任务增删改查、批量操作         | 见本文档                                       |
| **项目管理**   | 1        | 项目管理                       | 见本文档                                       |
| **性能监控**   | 6        | 性能指标、告警、Web Vitals     | 见本文档                                       |
| **分析**       | 2        | 数据分析、导出                 | 见本文档                                       |
| **搜索**       | 3        | 搜索、自动完成、历史           | 见本文档                                       |
| **RBAC**       | 8        | 角色、权限、用户权限管理       | 见本文档                                       |
| **多模态**     | 2        | 图像、音频处理                 | 见本文档                                       |
| **A2A 通信**   | 5        | Agent 间通信、任务队列         | [agent-scheduler.md](./api/agent-scheduler.md) |
| **评分**       | 4        | 评分 CRUD、投票                | [ratings.md](./api/ratings.md)                 |
| **反馈**       | 4        | 反馈管理                       | 见本文档                                       |
| **用户偏好**   | 3        | 用户设置管理                   | 见本文档                                       |
| **GitHub**     | 2        | Issues、Commits                | 见本文档                                       |
| **健康检查**   | 6        | 系统、数据库健康               | 见本文档                                       |
| **WebSocket**  | -        | 房间系统、权限控制、消息持久化 | [websocket.md](./api/websocket.md)             |
| **其他**       | 5        | 跨域、状态、导出等             | 见本文档                                       |

### 基础信息

- **基础 URL**: `https://7zi.com/api` 或 `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON
- **请求格式**: JSON / Form Data

### 认证方式

```bash
# 在请求头中添加 Authorization
Authorization: Bearer <your-jwt-token>
```

---

## 认证与授权 API

### 登录

```
POST /api/auth/login
```

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-001",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

### 注册

```
POST /api/auth/register
```

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### 获取当前用户

```
GET /api/auth/me
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  }
}
```

---

### 刷新 Token

```
POST /api/auth/refresh
```

**请求体:**

```json
{
  "refreshToken": "your-refresh-token"
}
```

---

### 登出

```
POST /api/auth/logout
```

---

## 任务管理 API

### 获取任务列表

```
GET /api/tasks
```

**Query 参数:**

- `status`: 过滤状态 (pending, in_progress, completed, failed)
- `priority`: 过滤优先级 (low, medium, high, urgent)
- `assignee`: 过滤负责人
- `tags`: 过滤标签（逗号分隔）
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

**响应:**

```json
{
  "tasks": [
    {
      "id": "123",
      "title": "Task title",
      "description": "Task description",
      "status": "in_progress",
      "priority": "high",
      "assignee": "agent-001",
      "tags": ["urgent", "review"],
      "dueDate": "2026-03-30T00:00:00Z",
      "createdAt": "2026-03-22T10:00:00Z",
      "updatedAt": "2026-03-22T11:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 创建任务

```
POST /api/tasks
```

**请求体:**

```json
{
  "title": "Task title",
  "description": "Task description",
  "priority": "high",
  "assignee": "agent-001",
  "tags": ["urgent", "review"],
  "dueDate": "2026-03-30T00:00:00Z"
}
```

---

### 更新任务

```
PUT /api/tasks/:id
```

---

### 删除任务

```
DELETE /api/tasks/:id
```

---

## 项目管理 API

### 获取项目列表

```
GET /api/projects
```

---

### 创建项目

```
POST /api/projects
```

---

---

## 性能监控 API

### 性能指标

```
GET /api/performance/metrics
```

---

### 性能报告

```
GET /api/performance/report
```

---

### 性能告警

```
GET /api/performance/alerts
```

---

### 清除性能数据

```
POST /api/performance/clear
```

---

### Web Vitals

```
POST /api/vitals
```

```
GET /api/vitals
```

---

### 性能指标（Prometheus 格式）

```
GET /api/metrics/performance
```

```
GET /api/metrics/prometheus
```

---

## 分析 API

### 分析指标

```
GET /api/analytics/metrics
```

---

### 导出分析

```
POST /api/analytics/export
```

---

### 实时分析流

```
GET /api/stream/analytics
```

---

## 搜索 API

### 搜索

```
GET /api/search
```

**Query 参数:**

- `q`: 搜索查询
- `type`: 搜索类型（tasks, users, projects）
- `page`: 页码
- `limit`: 每页数量

---

### 自动完成

```
GET /api/search/autocomplete
```

---

### 搜索历史

```
GET /api/search/history
```

---

## RBAC 权限 API

### 系统状态

```
GET /api/rbac/system
```

---

### 角色管理

```
GET /api/rbac/roles
```

```
POST /api/rbac/roles
```

```
GET /api/rbac/roles/[roleId]
```

```
PUT /api/rbac/roles/[roleId]
```

```
DELETE /api/rbac/roles/[roleId]
```

```
GET /api/rbac/roles/[roleId]/permissions
```

```
PUT /api/rbac/roles/[roleId]/permissions
```

---

### 权限管理

```
GET /api/rbac/permissions
```

---

### 用户角色管理

#### 获取用户角色

```
GET /api/rbac/users/[userId]/roles
```

**Query 参数:**

- `includePermissions`: 是否包含权限列表 (`true` | `false`)

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "roles": ["admin", "manager"],
    "permissions": ["users:read", "users:write", "tasks:read"],
    "count": 2
  }
}
```

---

#### 添加用户角色

```
POST /api/rbac/users/[userId]/roles
```

**权限**: 需要 manager 或 admin 权限

**请求体:**

```json
{
  "roles": ["admin", "viewer"]
}
```

**可用角色**: `admin` | `manager` | `member` | `viewer` | `guest`

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "addedRoles": ["admin", "viewer"],
    "count": 2
  },
  "message": "Roles added successfully"
}
```

---

#### 移除用户角色

```
DELETE /api/rbac/users/[userId]/roles
```

**权限**: 需要 manager 或 admin 权限

**请求体:**

```json
{
  "roles": ["viewer"]
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "removedRoles": ["viewer"],
    "count": 1
  },
  "message": "Roles removed successfully"
}
```

---

### 用户权限查询

```
GET /api/rbac/users/[userId]/permissions
```

获取用户通过角色继承的所有权限。

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "permissions": ["users:read", "users:write", "tasks:read", "tasks:write", "projects:read"],
    "count": 5
  }
}
```

---

## 多模态 API

### 图像处理

```
POST /api/multimodal/image
```

**请求体:**

```json
{
  "operation": "resize",
  "width": 800,
  "height": 600,
  "format": "webp"
}
```

---

### 音频处理

```
POST /api/multimodal/audio
```

---

## A2A 通信 API

### JSON-RPC 调用

```
POST /api/a2a/jsonrpc
```

**请求体:**

```json
{
  "jsonrpc": "2.0",
  "method": "tool_name",
  "params": { "param": "value" },
  "id": 1
}
```

---

### Agent 注册表

```
GET /api/a2a/registry
```

```
POST /api/a2a/registry
```

```
GET /api/a2a/registry/[id]
```

```
PUT /api/a2a/registry/[id]
```

```
DELETE /api/a2a/registry/[id]
```

---

### 心跳检测

```
POST /api/a2a/registry/[id]/heartbeat
```

---

### 任务队列

```
GET /api/a2a/queue
```

获取队列状态和统计信息。

**响应:**

```json
{
  "status": "ok",
  "stats": {
    "total": 42,
    "byPriority": {
      "urgent": 5,
      "high": 10,
      "normal": 20,
      "low": 7
    },
    "byAgent": {
      "agent-001": 15,
      "agent-002": 12,
      "agent-003": 15
    }
  },
  "nextMessage": {
    "id": "msg-001",
    "taskId": "task-001",
    "agentId": "agent-001",
    "priority": "urgent"
  },
  "config": {
    "maxSize": 1000,
    "maxAttempts": 3
  }
}
```

---

### 入队消息

```
POST /api/a2a/queue
```

将消息加入队列。

**请求体:**

```json
{
  "id": "msg-001",
  "taskId": "task-001",
  "agentId": "agent-001",
  "priority": "high",
  "payload": {
    "data": "example"
  },
  "maxAttempts": 3
}
```

**参数说明**:

- `taskId`: 任务 ID (必需)
- `agentId`: Agent ID (必需)
- `priority`: 优先级 (`urgent` | `high` | `normal` | `low`)
- `payload`: 消息载荷
- `maxAttempts`: 最大重试次数 (默认 3)

---

### 清空队列

```
DELETE /api/a2a/queue
```

清空队列或特定条件下的消息。

**Query 参数**:

- `agentId`: 仅清空特定 Agent 的消息 (可选)
- `priority`: 仅清空特定优先级的消息 (可选)

**示例**:

- `DELETE /api/a2a/queue` - 清空全部队列
- `DELETE /api/a2a/queue?agentId=agent-001` - 清空 agent-001 的消息
- `DELETE /api/a2a/queue?priority=high` - 清空高优先级消息

---

## 反馈 API

### 提交反馈

```
POST /api/feedback
```

**请求体:**

```json
{
  "type": "bug",
  "title": "反馈标题",
  "description": "反馈描述",
  "rating": 5,
  "email": "user@example.com",
  "images": [
    {
      "name": "screenshot.jpg",
      "size": 12345,
      "type": "image/jpeg"
    }
  ],
  "metadata": {}
}
```

**参数说明**:

- `type`: 反馈类型 (`bug` | `feature` | `improvement` | `other`)
- `title`: 反馈标题 (最多 100 字符)
- `description`: 反馈描述 (最多 1000 字符)
- `rating`: 评分 (1-5，必需)
- `email`: 邮箱地址 (可选)
- `images`: 图片附件数组 (可选)
- `metadata`: 额外元数据 (可选)

**反垃圾检测**:

- 标题和描述会经过反垃圾检测
- 如果被判定为垃圾，返回 401 Unauthorized

---

### 获取反馈列表

```
GET /api/feedback
```

**Query 参数:**

- `user_id`: 用户 ID
- `type`: 反馈类型过滤
- `status`: 状态过滤 (`pending` | `reviewed` | `resolved`)
- `priority`: 优先级过滤 (`low` | `medium` | `high` | `urgent`)
- `rating_min`: 最小评分
- `rating_max`: 最大评分
- `start_date`: 开始日期 (ISO 格式)
- `end_date`: 结束日期 (ISO 格式)
- `search`: 搜索关键词 (搜索标题和描述)
- `sort_by`: 排序字段 (`created_at` | `rating`)
- `sort_order`: 排序方向 (`asc` | `desc`)
- `page`: 页码 (默认 1)
- `per_page`: 每页数量 (默认 20, 最大 100)

**响应:**

```json
{
  "feedbacks": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  },
  "stats": {
    "total": 100,
    "average": 4.2,
    "byType": { "bug": 30, "feature": 40, "improvement": 20, "other": 10 },
    "byStatus": { "pending": 50, "reviewed": 30, "resolved": 20 },
    "byPriority": { "high": 20, "medium": 50, "low": 30 }
  }
}
```

---

### 获取单个反馈

```
GET /api/feedback/[id]
```

---

### 更新反馈 (管理员)

```
PATCH /api/feedback/[id]
```

**权限**: 需要管理员权限

**请求体:**

```json
{
  "status": "reviewed",
  "priority": "high",
  "admin_notes": "已处理，计划在下个版本修复",
  "metadata": {}
}
```

**参数说明**:

- `status`: 反馈状态 (可选)
- `priority`: 优先级 (可选)
- `admin_notes`: 管理员备注 (可选)
- `metadata`: 额外元数据 (可选)

**自动时间戳**:

- 设置 `status` 为 `reviewed` 时，自动更新 `reviewed_at`
- 设置 `status` 为 `resolved` 时，自动更新 `resolved_at`

---

### 删除反馈 (管理员)

```
DELETE /api/feedback/[id]
```

**权限**: 需要管理员权限

---

## 评分 API

### 获取评分列表

```
GET /api/ratings
```

**Query 参数:**

- `user_id`: 用户 ID
- `target_type`: 目标类型 (`agent` | `task` | `feature` | `project` | `overall`)
- `target_id`: 目标 ID
- `rating_min`: 最小评分
- `rating_max`: 最大评分
- `status`: 状态过滤
- `start_date`: 开始日期
- `end_date`: 结束日期
- `sort_by`: 排序字段
- `sort_order`: 排序方向
- `page`: 页码
- `per_page`: 每页数量

**响应:**

```json
{
  "ratings": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  },
  "stats": {
    "average": 4.2,
    "total": 100,
    "byRating": { "1": 5, "2": 8, "3": 12, "4": 30, "5": 45 }
  }
}
```

---

### 创建评分

```
POST /api/ratings
```

**请求体:**

```json
{
  "user_id": "user-001",
  "target_type": "agent",
  "target_id": "agent-001",
  "rating": 5,
  "title": "非常高效！",
  "description": "这个助手很好地完成了任务",
  "verified": false,
  "metadata": {}
}
```

**参数说明**:

- `target_type`: 目标类型 (必需)
  - `agent`: 评分 AI 助手
  - `task`: 评分任务
  - `feature`: 评分功能特性
  - `project`: 评分项目
  - `overall`: 整体评分
- `target_id`: 目标 ID (必需)
- `rating`: 评分 1-5 (必需)
- `title`: 标题 (可选，最多 100 字符)
- `description`: 描述 (可选，最多 1000 字符)
- `verified`: 是否已验证 (可选)
- `metadata`: 额外元数据 (可选)

**反垃圾检测**:

- 标题和描述会经过反垃圾检测
- 如果被判定为垃圾，返回 401 Unauthorized

**重复提交**:

- 同一用户对同一目标只能有一个评分
- 重复提交会更新现有评分

---

### 获取单个评分

```
GET /api/ratings/[id]
```

---

### 删除评分

```
DELETE /api/ratings/[id]
```

**权限**: 只能删除自己的评分，或管理员可删除所有

---

### 标记评分是否有帮助

```
POST /api/ratings/[id]/helpful
```

**请求体:**

```json
{
  "is_helpful": true
}
```

**说明**:

- 每个用户对每个评分只能投票一次
- 重复提交会更新投票
- 更新评分的 `helpful_count` 和 `not_helpful_count`

**响应:**

```json
{
  "id": "rating-001",
  "rating": 5,
  "helpful_count": 42,
  "not_helpful_count": 3,
  "user_vote": true
}
```

---

## 用户偏好设置 API

### 获取用户偏好

```
GET /api/user/preferences?user_id=xxx
```

**Query 参数:**

- `user_id`: 用户 ID (必需)

**响应:**

```json
{
  "success": true,
  "data": {
    "user_id": "user-001",
    "locale": "zh",
    "theme": "dark",
    "timezone": "Asia/Shanghai",
    "notifications_enabled": true,
    "email_notifications": true,
    "sound_enabled": true,
    "created_at": "2026-03-01T00:00:00Z",
    "updated_at": "2026-03-29T00:00:00Z"
  }
}
```

---

### 创建用户偏好

```
POST /api/user/preferences
```

**请求体:**

```json
{
  "user_id": "user-001",
  "locale": "zh",
  "theme": "dark",
  "timezone": "Asia/Shanghai",
  "notifications_enabled": true,
  "email_notifications": true,
  "sound_enabled": true
}
```

**参数说明**:

- `user_id`: 用户 ID (必需)
- `locale`: 语言代码 (如 `zh`, `en`)
- `theme`: 主题 (`light` | `dark` | `system`)
- `timezone`: 时区 (如 `Asia/Shanghai`)
- `notifications_enabled`: 启用通知 (布尔值)
- `email_notifications`: 启用邮件通知 (布尔值)
- `sound_enabled`: 启用声音 (布尔值)

**注意**: 如果偏好已存在，返回 409 Conflict，需要使用 PUT 更新。

---

### 更新用户偏好

```
PUT /api/user/preferences
```

**请求体:** 所有字段可选

```json
{
  "user_id": "user-001",
  "theme": "light",
  "notifications_enabled": false
}
```

**说明**: 只更新提供的字段。如果偏好不存在，会自动创建。

---

## Web Vitals API

### 上报 Web Vitals

```
POST /api/web-vitals
```

**请求体:**

```json
{
  "metrics": [
    {
      "id": "v1",
      "name": "LCP",
      "value": 2500,
      "rating": "good",
      "delta": 100,
      "navigationType": "navigate",
      "timestamp": 1647984000000,
      "route": "/dashboard",
      "sessionId": "session-001"
    }
  ],
  "metadata": {
    "url": "https://7zi.com/dashboard",
    "referrer": "https://7zi.com",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "deviceType": "desktop"
  }
}
```

**支持的指标**:

- `LCP`: Largest Contentful Paint (最大内容绘制)
- `FID`: First Input Delay (首次输入延迟)
- `CLS`: Cumulative Layout Shift (累积布局偏移)
- `TTFB`: Time to First Byte (首字节时间)
- `FCP`: First Contentful Paint (首次内容绘制)
- `INP`: Interaction to Next Paint (交互到下次绘制)

**参数说明**:

- `id`: 指标唯一标识
- `name`: 指标名称
- `value`: 指标值 (毫秒或分数)
- `rating`: 评级 (`good` | `needs-improvement` | `poor`)
- `delta`: 变化值
- `route`: 页面路由
- `sessionId`: 会话 ID (可选)

**功能**:

- 验证数据格式
- 发送到 Sentry 用于监控
- 计算性能评分 (0-100)
- 存储到数据库

**响应:**

```json
{
  "success": true,
  "data": {
    "received": 5,
    "score": 85,
    "timestamp": 1647984000000
  }
}
```

---

### 获取 Web Vitals 统计

```
GET /api/web-vitals
```

**Query 参数:**

- `route`: 路由过滤 (可选)
- `hours`: 时间范围 (小时，默认 24)

**响应:**

```json
{
  "success": true,
  "data": {
    "route": "/dashboard",
    "hours": 24,
    "metrics": {
      "LCP": { "avg": 2500, "count": 100 },
      "CLS": { "avg": 0.1, "count": 100 },
      "INP": { "avg": 150, "count": 100 }
    },
    "score": 85,
    "total": 300
  }
}
```

---

## GitHub 集成 API

### 获取 Issues

```
GET /api/github/issues
```

---

### 获取 Commits

```
GET /api/github/commits
```

---

## 健康检查 API

### 系统健康

```
GET /api/health
```

基础健康检查，用于 Kubernetes/Docker 探针。检查内存使用和 Node.js 运行时状态。

**响应**:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.4.0",
  "checks": {
    "memory": {
      "status": "ok",
      "used": 128,
      "limit": 512
    },
    "node": {
      "status": "ok",
      "version": "v22.22.1"
    }
  }
}
```

**状态码**:

- `200 OK` - 健康状态为 `"healthy"`（内存使用 < 90%）
- `503 Service Unavailable` - 健康状态为 `"unhealthy"`（内存使用 >= 90%）

**状态值**:

- `status`: `"healthy"` | `"unhealthy"`
- `checks.memory.status`: `"ok"` | `"warning"`（> 90% 使用时为 warning）
- `checks.node.status`: 始终为 `"ok"`

---

### 详细健康

```
GET /api/health/detailed
```

详细健康检查，包含外部服务状态。**需要 JWT 认证**。

**认证**: 需要 Bearer token

```
Authorization: Bearer <your-jwt-token>
```

**响应**:

```json
{
  "status": "ok",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.4.0",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 150
    },
    "emailService": {
      "status": "ok",
      "latency": 80
    }
  }
}
```

**状态码**:

- `200 OK` - 已认证且健康状态为 `"ok"` 或 `"degraded"`
- `401 Unauthorized` - 缺少或无效的认证令牌
- `503 Service Unavailable` - 健康状态为 `"error"`

---

### 存活检查

```
GET /api/health/live
```

Kubernetes 存活探针。如果进程运行则始终返回 200。

**响应**:

```json
{
  "success": true,
  "status": "alive"
}
```

**状态码**: `200 OK`（始终返回，如果进程运行）

---

### 就绪检查

```
GET /api/health/ready
```

Kubernetes 就绪探针。仅当所有关键依赖可用时返回 200。

**响应**:

```json
{
  "ready": true,
  "status": "ok",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.4.0",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 150
    },
    "emailService": {
      "status": "ok",
      "latency": 80
    }
  }
}
```

**状态码**:

- `200 OK` - 状态为 `"ok"` 或 `"degraded"`
- `503 Service Unavailable` - 状态为 `"error"`

**外部服务检查**:

- `githubApi`: 检查 GitHub API 可达性（5秒超时）
- `emailService`: 检查 Resend API（如已配置）

---

## 其他 API

### 系统状态

```
GET /api/status
```

---

### 数据导出

```
POST /api/data/export
```

---

### 数据导入

```
POST /api/data/import
```

---

### 跨域 Token

```
GET /api/csrf-token
```

---

### CSP 违规报告

```
POST /api/csp-violation
```

---

### ISR 重新验证

```
POST /api/revalidate
```

---

## 数据模型

### Task

```typescript
interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string
  tags: string[]
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

### User

```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'member' | 'viewer' | 'guest'
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}
```

---

### Notification

```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'task_assigned' | 'system'
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  createdAt: Date
  expiresAt?: Date
}
```

---

### Backup

```typescript
interface Backup {
  id: string
  name: string
  size: number
  status: 'pending' | 'completed' | 'failed'
  createdAt: Date
  expiresAt?: Date
}
```

---

### PerformanceMetric

```typescript
interface PerformanceMetric {
  id: string
  metricType: 'lcp' | 'fid' | 'cls' | 'fcp' | 'ttfb'
  value: number
  url: string
  timestamp: Date
}
```

---

### Rating

```typescript
interface Rating {
  id: string
  user_id: string
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number // 1-5
  title?: string
  description?: string
  verified: boolean
  helpful_count: number
  not_helpful_count: number
  created_at: Date
  updated_at: Date
  metadata?: object
}
```

---

### UserPreferences

```typescript
interface UserPreferences {
  user_id: string
  locale: string // 'zh', 'en', etc.
  theme: 'light' | 'dark' | 'system'
  timezone?: string
  notifications_enabled: boolean
  email_notifications: boolean
  sound_enabled: boolean
  created_at: Date
  updated_at: Date
}
```

---

### WebVitalMetric

```typescript
interface WebVitalMetric {
  id: string
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  route: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  timestamp: number
  sessionId?: string
}
```

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

### 常见错误码

| 错误码                | HTTP 状态 | 说明           |
| --------------------- | --------- | -------------- |
| `UNAUTHORIZED`        | 401       | 未授权         |
| `FORBIDDEN`           | 403       | 无权限         |
| `NOT_FOUND`           | 404       | 资源不存在     |
| `VALIDATION_ERROR`    | 400       | 参数验证失败   |
| `INTERNAL_ERROR`      | 500       | 服务器内部错误 |
| `RATE_LIMIT_EXCEEDED` | 429       | 请求超过限制   |
| `DATABASE_ERROR`      | 500       | 数据库错误     |

---

## 限流策略

API 实现了多级限流策略，基于 Redis 的分布式限流和内存限流：

- **默认限制**: 100 请求/分钟/IP
- **认证用户**: 200 请求/分钟/用户
- **API 路由**: 根据端点类型有不同限制

限流响应头：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647984000
```

---

## 缓存策略

- **API 响应缓存**: 默认 5 分钟
- **静态资源**: 1 年（带版本控制）
- **ISR 缓存**: 根据页面类型（1 小时 - 30 天）

### Server Actions 缓存 API (v1.3.0 新增)

#### updateTag() - Read-Your-Writes 语义

确保用户立即看到自己的更新，提供强一致性保证。

```typescript
import { updateTag } from 'next/cache'

// 用户提交更新后立即失效缓存
await updateUser(userId, data)
updateTag('user-data') // 立即生效，用户看到最新数据
```

**适用场景**:

- 用户创建/更新内容后需要立即看到变化
- 关键业务操作需要强一致性

#### refresh() - 仅刷新未缓存数据

选择性刷新，仅对未缓存的数据发起请求，提高效率。

```typescript
import { refresh } from 'next/cache'

// 仅刷新未缓存的数据
await refresh('user-posts') // 跳过已缓存的数据
```

**适用场景**:

- 定期同步数据
- 低优先级数据更新
- 减少 API 调用压力

#### revalidateTag() - 新 cacheLife profile 参数

使用 `cacheLife` profile 进行细粒度的缓存控制。

```typescript
import { unstable_cacheLife as cacheLife } from 'next/cache'
import { revalidateTag } from 'next/cache'

// 定义缓存生命周期配置
const getUserData = unstable_cache(
  async (userId: string) => {
    return await db.query('SELECT * FROM users WHERE id = ?', [userId])
  },
  ['user-data'],
  {
    tags: ['user-data'],
    revalidate: cacheLife({
      stale: 3600, // 1 小时后数据过期
      revalidate: 1800, // 30 分钟后后台重新验证
    }),
  }
)

// 手动触发重新验证
revalidateTag('user-data')
```

**cacheLife 参数说明**:

- `stale` (秒): 数据被视为过期的时长
- `revalidate` (秒): 后台重新验证的间隔

### middleware.ts → proxy.ts 迁移 (v1.3.0)

**变更说明**:

- `src/middleware.ts` 重命名为 `src/proxy.ts`
- 导出函数从 `middleware` 改为 `proxy`
- 功能保持不变，仅名称变更以更好地反映实际用途

```typescript
// 新的 proxy.ts
export function proxy(request: NextRequest) {
  // 请求拦截和代理逻辑
  // ...
}
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

**文档维护**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-04-02
**版本**: v1.8.0

---

## 📊 v1.8.0 API 更新 (2026-04-02)

### 🎨 Visual Workflow Orchestrator API

v1.8.0 引入了完整的可视化工作流编排 API，支持多 Agent 协作、条件分支、并行执行等功能。

#### 工作流管理 API

##### 创建工作流

```
POST /api/workflow
```

创建一个新的工作流定义。

**请求体**:

```json
{
  "name": "My Workflow",
  "description": "工作流描述",
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "name": "开始",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node_2",
      "type": "agent",
      "name": "执行任务",
      "position": { "x": 300, "y": 100 },
      "agentConfig": {
        "agentId": "agent_1",
        "agentType": "assistant",
        "prompt": "执行任务描述"
      }
    },
    {
      "id": "node_3",
      "type": "end",
      "name": "结束",
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2", "type": "sequence" },
    { "id": "edge_2", "source": "node_2", "target": "node_3", "type": "sequence" }
  ],
  "config": {
    "timeout": 3600,
    "retryPolicy": {
      "maxRetries": 3,
      "backoff": "exponential",
      "interval": 5
    }
  },
  "userId": "user_1"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 工作流名称 |
| `description` | string | ❌ | 工作流描述 |
| `nodes` | WorkflowNode[] | ❌ | 节点列表 |
| `edges` | WorkflowEdge[] | ❌ | 边/连接列表 |
| `config.timeout` | number | ❌ | 超时时间（秒），默认 3600 |
| `config.retryPolicy` | object | ❌ | 重试策略 |
| `userId` | string | ❌ | 创建者 ID |

**节点类型**:
| 类型 | 说明 | 颜色 |
|------|------|------|
| `start` | 工作流入口 | 🟢 绿色 |
| `end` | 工作流终止 | 🔴 红色 |
| `agent` | Agent 任务执行 | 🔵 蓝色 |
| `condition` | 条件分支 | 🟡 黄色 |
| `parallel` | 并行执行 | 🟣 紫色 |
| `wait` | 等待/延迟 | ⚪ 灰色 |

**响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "workflow_1712345678901_abc123",
    "name": "My Workflow",
    "version": 1,
    "status": "draft",
    "nodes": [...],
    "edges": [...],
    "config": {...},
    "metadata": {
      "createdAt": "2026-04-02T12:00:00.000Z",
      "updatedAt": "2026-04-02T12:00:00.000Z",
      "createdBy": "user_1"
    }
  }
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 工作流验证失败 |
| 400 | `VALIDATION_ERROR` | 工作流名称不能为空 |

---

##### 获取工作流列表

```
GET /api/workflow
```

获取所有工作流列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | string | - | 过滤状态 (draft, active, paused, archived) |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**响应**:

```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_1",
        "name": "示例工作流",
        "version": 1,
        "status": "active",
        "nodes": [...],
        "edges": [...],
        "metadata": {...}
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

##### 获取工作流详情

```
GET /api/workflow/:id
```

获取指定工作流的详细信息。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 工作流 ID |

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "name": "示例工作流",
    "description": "工作流描述",
    "version": 1,
    "status": "active",
    "nodes": [
      {
        "id": "node_1",
        "type": "start",
        "name": "开始",
        "position": { "x": 100, "y": 100 }
      },
      {
        "id": "node_2",
        "type": "agent",
        "name": "执行 Agent",
        "position": { "x": 350, "y": 100 },
        "agentConfig": {
          "agentId": "agent_1",
          "agentType": "assistant",
          "prompt": "执行任务"
        }
      },
      {
        "id": "node_3",
        "type": "condition",
        "name": "判断结果",
        "position": { "x": 600, "y": 100 },
        "conditionConfig": {
          "expression": "{{result.success}} === true"
        }
      },
      {
        "id": "node_4",
        "type": "end",
        "name": "结束",
        "position": { "x": 1100, "y": 100 }
      }
    ],
    "edges": [...],
    "config": {
      "timeout": 3600,
      "retryPolicy": {
        "maxRetries": 3,
        "backoff": "exponential",
        "interval": 5
      }
    },
    "metadata": {
      "createdAt": "2026-04-02T10:00:00Z",
      "updatedAt": "2026-04-02T11:00:00Z",
      "createdBy": "user_1",
      "updatedBy": "user_1"
    }
  }
}
```

---

##### 更新工作流

```
PUT /api/workflow/:id
```

更新指定工作流的配置。

**请求体**: 所有字段可选

```json
{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "nodes": [...],
  "edges": [...],
  "config": {...}
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "name": "更新后的名称",
    "updatedAt": "2026-04-02T12:00:00Z",
    ...
  }
}
```

---

##### 删除工作流

```
DELETE /api/workflow/:id
```

删除指定工作流及其所有运行实例。

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "message": "工作流已删除"
  }
}
```

---

#### 工作流执行 API

##### 运行工作流

```
POST /api/workflow/:id/run
```

启动工作流执行，创建新的运行实例。

**请求体**:

```json
{
  "inputs": {
    "query": "Hello World",
    "param1": "value1"
  },
  "userId": "user_1",
  "triggerType": "manual"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `inputs` | object | ❌ | 工作流输入参数 |
| `userId` | string | ❌ | 触发者 ID |
| `triggerType` | string | ❌ | 触发类型 (manual, api, schedule, webhook) |

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "instanceId": "instance_1712345678901_xyz789",
    "workflowId": "workflow_1",
    "status": "running",
    "message": "工作流已开始运行",
    "metadata": {
      "startedAt": "2026-04-02T12:00:00.000Z",
      "triggeredBy": "user_1",
      "triggerType": "manual"
    }
  }
}
```

---

##### 获取运行历史

```
GET /api/workflow/:id/run
```

获取工作流的运行实例列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | string | - | 过滤状态 (pending, running, completed, failed, cancelled) |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**响应**:

```json
{
  "success": true,
  "data": {
    "instances": [
      {
        "id": "instance_1",
        "workflowId": "workflow_1",
        "workflowVersion": 1,
        "status": "completed",
        "progress": {
          "total": 3,
          "completed": 3,
          "failed": 0,
          "percentage": 100
        },
        "nodeResults": {
          "node_1": {
            "nodeId": "node_1",
            "status": "success",
            "startTime": "2026-04-02T11:59:55Z",
            "endTime": "2026-04-02T11:59:55.010Z",
            "duration": 10
          },
          "node_2": {
            "nodeId": "node_2",
            "status": "success",
            "startTime": "2026-04-02T11:59:55.010Z",
            "endTime": "2026-04-02T11:59:58Z",
            "duration": 2990,
            "output": {
              "agentId": "agent_1",
              "result": "任务执行成功"
            }
          }
        },
        "data": {
          "inputs": { "query": "Hello World" },
          "outputs": { "result": "任务执行成功" }
        },
        "metadata": {
          "startedAt": "2026-04-02T11:59:55Z",
          "endedAt": "2026-04-02T11:59:58Z",
          "duration": 3010,
          "triggeredBy": "user_1",
          "triggerType": "manual"
        }
      }
    ],
    "stats": {
      "total": 10,
      "success": 8,
      "failed": 1,
      "running": 1
    },
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 📧 Email Alerting API

v1.8.0 新增 Email 告警系统，支持通过 SMTP 发送性能告警邮件。

#### 告警规则管理 API

##### 获取告警规则和活动告警

```
GET /api/performance/alerts
```

获取所有告警规则和活动告警列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showAcknowledged` | boolean | false | 是否显示已确认的告警 |
| `severity` | string | - | 过滤严重级别 (low, medium, high, critical) |
| `metric` | string | - | 过滤指标类型 (LCP, FID, CLS, INP, TTFB) |
| `limit` | number | 50 | 返回数量限制 |

**响应**:

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-1712345678901-abc123",
        "ruleId": "lcp-poor",
        "metric": "LCP",
        "severity": "critical",
        "message": "LCP exceeded threshold: 4500ms > 4000ms",
        "value": 4500,
        "threshold": 4000,
        "timestamp": 1712345678901,
        "acknowledged": false,
        "route": "/dashboard",
        "metadata": {
          "url": "https://7zi.com/dashboard",
          "deviceType": "desktop"
        }
      }
    ],
    "rules": [
      {
        "id": "lcp-poor",
        "name": "LCP > 4000ms (Poor)",
        "metric": "LCP",
        "condition": "gt",
        "threshold": 4000,
        "enabled": true,
        "severity": "critical",
        "notificationChannels": ["console", "email"]
      },
      {
        "id": "lcp-needs-improvement",
        "name": "LCP > 2500ms (Needs Improvement)",
        "metric": "LCP",
        "condition": "gt",
        "threshold": 2500,
        "enabled": true,
        "severity": "medium",
        "notificationChannels": ["console"]
      }
    ],
    "summary": {
      "total": 5,
      "unacknowledged": 3,
      "bySeverity": {
        "low": 0,
        "medium": 1,
        "high": 1,
        "critical": 1
      },
      "byMetric": {
        "LCP": 1,
        "FID": 0,
        "CLS": 1,
        "INP": 0,
        "TTFB": 0
      }
    }
  }
}
```

---

##### 创建告警规则

```
POST /api/performance/alerts
```

创建新的告警规则或确认告警。

**创建规则请求体**:

```json
{
  "action": "create-rule",
  "rule": {
    "name": "自定义 LCP 告警",
    "metric": "LCP",
    "condition": "gt",
    "threshold": 3000,
    "severity": "high",
    "enabled": true,
    "notificationChannels": ["console", "email"]
  }
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | 操作类型: `create-rule` 或 `acknowledge` |
| `rule.name` | string | ✅ | 规则名称 |
| `rule.metric` | string | ✅ | 指标类型 (LCP, FID, CLS, INP, TTFB) |
| `rule.condition` | string | ✅ | 条件 (gt, lt, gte, lte, eq) |
| `rule.threshold` | number | ✅ | 阈值 |
| `rule.severity` | string | ❌ | 严重级别 (low, medium, high, critical)，默认 medium |
| `rule.enabled` | boolean | ❌ | 是否启用，默认 true |
| `rule.notificationChannels` | string[] | ❌ | 通知渠道，默认 ["console"] |

**确认告警请求体**:

```json
{
  "action": "acknowledge",
  "alertId": "alert-1712345678901-abc123"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "rule": {
      "id": "rule-1712345678901-xyz789",
      "name": "自定义 LCP 告警",
      "metric": "LCP",
      "condition": "gt",
      "threshold": 3000,
      "severity": "high",
      "enabled": true,
      "notificationChannels": ["console", "email"]
    }
  }
}
```

---

##### 更新告警规则

```
PUT /api/performance/alerts
```

更新现有告警规则。

**请求体**:

```json
{
  "ruleId": "lcp-poor",
  "updates": {
    "threshold": 5000,
    "severity": "medium",
    "enabled": true,
    "notificationChannels": ["console", "email"]
  }
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "rule": {
      "id": "lcp-poor",
      "name": "LCP > 4000ms (Poor)",
      "threshold": 5000,
      "severity": "medium",
      ...
    }
  }
}
```

---

##### 删除告警规则

```
DELETE /api/performance/alerts?ruleId=lcp-poor
```

删除指定的告警规则。

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `ruleId` | string | 要删除的规则 ID |
| `clearAcknowledged` | boolean | 清除已确认的告警 |

**响应**:

```json
{
  "success": true,
  "data": {
    "deleted": {
      "id": "lcp-poor",
      "name": "LCP > 4000ms (Poor)"
    }
  }
}
```

---

#### Email 告警配置

##### 环境变量配置

Email 告警服务通过环境变量进行配置：

```bash
# SMTP 配置
SMTP_HOST=smtp.example.com      # SMTP 服务器地址
SMTP_PORT=587                   # SMTP 端口 (587 for TLS, 465 for SSL)
SMTP_USER=your-username         # SMTP 用户名
SMTP_PASS=your-password         # SMTP 密码或 API Key
SMTP_SECURE=false               # 是否使用 SSL (port 465 时为 true)

# TLS 配置
SMTP_REJECT_UNAUTHORIZED=true   # 是否验证证书

# 发送者配置
EMAIL_SENDER_NAME=7zi System    # 发送者名称
EMAIL_SENDER_EMAIL=noreply@example.com  # 发送者邮箱

# 接收者配置 (逗号分隔)
EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# 邮件配置
EMAIL_SUBJECT_PREFIX=[7zi Alert]  # 邮件主题前缀
EMAIL_ALERTING_ENABLED=true       # 是否启用邮件告警

# 重试配置
EMAIL_RETRY_MAX_ATTEMPTS=3        # 最大重试次数
EMAIL_RETRY_DELAY_MS=1000         # 重试延迟（毫秒）
EMAIL_RETRY_BACKOFF_MULTIPLIER=2  # 退避乘数
```

##### EmailAlertService API

Email 告警服务提供了以下方法：

```typescript
import { EmailAlertService, createEmailAlertService } from '@/lib/alerting/EmailAlertService'

// 从环境变量创建服务
const emailService = createEmailAlertService()

// 连接 SMTP 服务器
await emailService.connect()

// 发送告警邮件
const result = await emailService.sendAlertEmail(alert, {
  recipients: [{ email: 'admin@example.com', name: 'Admin' }],
  subject: 'Custom Subject',
  priority: 'high',
})

// 检查结果
if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Failed:', result.error)
}

// 获取服务状态
const status = emailService.getStatus()
console.log(status.connected, status.totalSent, status.totalFailed)

// 测试连接
const isConnected = await emailService.test()
```

##### 告警邮件模板

告警邮件支持以下特性：

- **HTML 邮件**: 响应式设计，支持移动端
- **纯文本备选**: 兼容不支持 HTML 的邮件客户端
- **告警级别颜色**: info(蓝), warning(橙), error(红), critical(深红)
- **指标数据展示**: 显示当前值和阈值
- **元数据显示**: 自定义附加信息
- **标签系统**: 告警分类标签

**邮件预览**:

```
┌─────────────────────────────────────┐
│  🚨 Alert Notification              │
│           CRITICAL                  │
├─────────────────────────────────────┤
│  LCP exceeded threshold             │
│                                     │
│  Current: 4500ms / Threshold: 4000ms│
│                                     │
│  Category: Performance              │
│  Source: Web Vitals                 │
│  Time: Apr 2, 2026 12:00:00 PM CET  │
└─────────────────────────────────────┘
```

---

### 📊 预置告警规则

v1.8.0 预置了以下 Web Vitals 告警规则：

| 规则 ID                  | 名称                 | 指标 | 条件 | 阈值 | 严重级别 |
| ------------------------ | -------------------- | ---- | ---- | ---- | -------- |
| `lcp-poor`               | LCP > 4000ms (Poor)  | LCP  | gt   | 4000 | critical |
| `lcp-needs-improvement`  | LCP > 2500ms         | LCP  | gt   | 2500 | medium   |
| `fid-poor`               | FID > 300ms (Poor)   | FID  | gt   | 300  | critical |
| `fid-needs-improvement`  | FID > 100ms          | FID  | gt   | 100  | medium   |
| `cls-poor`               | CLS > 0.25 (Poor)    | CLS  | gt   | 0.25 | high     |
| `cls-needs-improvement`  | CLS > 0.1            | CLS  | gt   | 0.1  | medium   |
| `inp-poor`               | INP > 500ms (Poor)   | INP  | gt   | 500  | critical |
| `inp-needs-improvement`  | INP > 200ms          | INP  | gt   | 200  | medium   |
| `ttfb-poor`              | TTFB > 1800ms (Poor) | TTFB | gt   | 1800 | high     |
| `ttfb-needs-improvement` | TTFB > 800ms         | TTFB | gt   | 800  | medium   |

---

### 🔗 相关类型定义

#### WorkflowDefinition

```typescript
interface WorkflowDefinition {
  id: string // 工作流 ID
  name: string // 工作流名称
  description?: string // 描述
  version: number // 版本号
  status: WorkflowStatus // 状态
  nodes: WorkflowNode[] // 节点列表
  edges: WorkflowEdge[] // 边列表
  config: {
    timeout?: number // 超时时间（秒）
    retryPolicy?: {
      maxRetries: number
      backoff: 'fixed' | 'exponential'
      interval: number
    }
    variables?: Record<string, unknown>
  }
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }
}
```

#### WorkflowNode

```typescript
interface WorkflowNode {
  id: string // 节点 ID
  type: NodeType // 节点类型
  name: string // 节点名称
  description?: string // 描述
  position: { x: number; y: number } // 可视化位置
  agentConfig?: {
    // Agent 节点配置
    agentId: string
    agentType: string
    prompt?: string
    model?: string
    timeout?: number
    retryCount?: number
  }
  conditionConfig?: {
    // 条件节点配置
    expression: string
    trueLabel?: string
    falseLabel?: string
  }
  waitConfig?: {
    // 等待节点配置
    duration?: number
    waitForEvent?: string
  }
}
```

#### AlertRule

```typescript
interface AlertRule {
  id: string // 规则 ID
  name: string // 规则名称
  metric: 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB' // 指标类型
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' // 条件
  threshold: number // 阈值
  enabled: boolean // 是否启用
  severity: 'low' | 'medium' | 'high' | 'critical' // 严重级别
  notificationChannels: string[] // 通知渠道
}
```

#### PerformanceAlert

```typescript
interface PerformanceAlert {
  id: string // 告警 ID
  ruleId: string // 规则 ID
  metric: string // 指标类型
  severity: string // 严重级别
  message: string // 告警消息
  value: number // 当前值
  threshold: number // 阈值
  timestamp: number // 时间戳
  acknowledged: boolean // 是否已确认
  route?: string // 页面路由
  metadata?: Record<string, unknown> // 附加元数据
}
```

---

### ℹ️ 注意

v1.8.0 主要新增功能为可视化工作流编排和 Email 告警系统。完整实现细节请参考：

- `src/lib/workflow/VisualWorkflowOrchestrator.ts` - 工作流引擎
- `src/lib/alerting/EmailAlertService.ts` - Email 告警服务
- `src/config/email.ts` - Email 配置
- `src/lib/alerting/templates/alert-template.ts` - 邮件模板

**版本**: v1.8.0
**更新日期**: 2026-04-02
