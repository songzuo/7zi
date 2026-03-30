# API 完整文档

**最后更新**: 2026-03-29
**版本**: v1.4.0
**API 端点总数**: 57+

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
17. [数据模型](#数据模型)
18. [错误处理](#错误处理)

### 📚 专项 API 文档

- **[WebSocket API](./api/websocket.md)** - 房间系统、权限控制、消息持久化
- **[Agent Scheduler API](./api/agent-scheduler.md)** - AI Agent 调度系统、任务队列
- **[Dashboard 组件](./lib/agent-scheduler/dashboard/README.md)** - 可视化 Dashboard 组件文档

---

## API 概览

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

**调度算法**
- 能力匹配 - 基于 Agent 技能和任务需求
- 负载均衡 - 避免单 Agent 过载
- 决策透明 - confidence、reasoning、alternativeAgents

**Dashboard 组件**: 详见 [Dashboard 组件文档](./lib/agent-scheduler/dashboard/README.md)

**详见**: [Agent 调度 API 文档](./api/agent-scheduler.md)

#### 📊 性能监控升级 (95% 完成)

**异常检测** (`src/lib/performance-monitoring/anomaly-detection/`)
- Z-score 检测算法 - 基于历史数据的基准线自动学习
- 百分比偏差检测 - 多指标独立跟踪
- 高性能处理 - 1000 数据点 < 100ms

**根因分析自动化**
- 瓶颈检测 - 98.23% 语句覆盖
- 瀑布图分析 - 98.21% 覆盖
- 慢请求追踪 - 81.74% 覆盖

**性能预算控制**
- 关键指标阈值 - LCP、FCP、TTFB、CLS
- 构建时检查 - 构建产物大小监控

**实时告警系统**
- 多级别告警 - critical/warning/info
- 多渠道通知 - 邮件、Dashboard、Slack/Webhook

#### ⚡ React Compiler 可选功能 (100% 完成)

**配置文件**
- 环境变量控制系统
  - `ENABLE_REACT_COMPILER` - 启用/禁用
  - `NEXT_PUBLIC_REACT_COMPILER_ENABLED` - 客户端标识
  - `REACT_COMPILER_MODE` - opt-in/opt-out/all
  - `REACT_COMPILER_EXCLUDE_PATTERNS` - 排除模式

**兼容性检测**
- 自动扫描不兼容组件
- 生成 TXT/MD/JSON 报告

**回滚机制**
- 一键禁用/恢复
- 零停机切换

**详见**: [React Compiler 实施报告](../../REACT_COMPILER_OPTIONAL_IMPLEMENTATION.md)

### API 分类统计

| 分类 | 端点数量 | 说明 | 文档 |
|------|---------|------|------|
| **认证与授权** | 5 | 登录、注册、刷新 Token | 见本文档 |
| **任务管理** | 1 | 任务增删改查、批量操作 | 见本文档 |
| **项目管理** | 1 | 项目管理 | 见本文档 |
| **性能监控** | 6 | 性能指标、告警、Web Vitals | 见本文档 |
| **分析** | 2 | 数据分析、导出 | 见本文档 |
| **搜索** | 3 | 搜索、自动完成、历史 | 见本文档 |
| **RBAC** | 8 | 角色、权限、用户权限管理 | 见本文档 |
| **多模态** | 2 | 图像、音频处理 | 见本文档 |
| **A2A 通信** | 5 | Agent 间通信、任务队列 | [agent-scheduler.md](./api/agent-scheduler.md) |
| **评分** | 4 | 评分 CRUD、投票 | [ratings.md](./api/ratings.md) |
| **反馈** | 4 | 反馈管理 | 见本文档 |
| **用户偏好** | 3 | 用户设置管理 | 见本文档 |
| **GitHub** | 2 | Issues、Commits | 见本文档 |
| **健康检查** | 6 | 系统、数据库健康 | 见本文档 |
| **WebSocket** | - | 房间系统、权限控制、消息持久化 | [websocket.md](./api/websocket.md) |
| **其他** | 5 | 跨域、状态、导出等 | 见本文档 |

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
    "permissions": [
      "users:read",
      "users:write",
      "tasks:read",
      "tasks:write",
      "projects:read"
    ],
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
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  tags: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Notification

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'task_assigned' | 'system';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}
```

---

### Backup

```typescript
interface Backup {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  expiresAt?: Date;
}
```

---

### PerformanceMetric

```typescript
interface PerformanceMetric {
  id: string;
  metricType: 'lcp' | 'fid' | 'cls' | 'fcp' | 'ttfb';
  value: number;
  url: string;
  timestamp: Date;
}
```

---

### Rating

```typescript
interface Rating {
  id: string;
  user_id: string;
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall';
  target_id: string;
  rating: number; // 1-5
  title?: string;
  description?: string;
  verified: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: Date;
  updated_at: Date;
  metadata?: object;
}
```

---

### UserPreferences

```typescript
interface UserPreferences {
  user_id: string;
  locale: string; // 'zh', 'en', etc.
  theme: 'light' | 'dark' | 'system';
  timezone?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  sound_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

### WebVitalMetric

```typescript
interface WebVitalMetric {
  id: string;
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  route: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  timestamp: number;
  sessionId?: string;
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

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求超过限制 |
| `DATABASE_ERROR` | 500 | 数据库错误 |

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
import { updateTag } from 'next/cache';

// 用户提交更新后立即失效缓存
await updateUser(userId, data);
updateTag('user-data'); // 立即生效，用户看到最新数据
```

**适用场景**:
- 用户创建/更新内容后需要立即看到变化
- 关键业务操作需要强一致性

#### refresh() - 仅刷新未缓存数据
选择性刷新，仅对未缓存的数据发起请求，提高效率。

```typescript
import { refresh } from 'next/cache';

// 仅刷新未缓存的数据
await refresh('user-posts'); // 跳过已缓存的数据
```

**适用场景**:
- 定期同步数据
- 低优先级数据更新
- 减少 API 调用压力

#### revalidateTag() - 新 cacheLife profile 参数
使用 `cacheLife` profile 进行细粒度的缓存控制。

```typescript
import { unstable_cacheLife as cacheLife } from 'next/cache';
import { revalidateTag } from 'next/cache';

// 定义缓存生命周期配置
const getUserData = unstable_cache(
  async (userId: string) => {
    return await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  },
  ['user-data'],
  {
    tags: ['user-data'],
    revalidate: cacheLife({
      stale: 3600,      // 1 小时后数据过期
      revalidate: 1800, // 30 分钟后后台重新验证
    })
  }
);

// 手动触发重新验证
revalidateTag('user-data');
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
**最后更新**: 2026-03-29
**版本**: v1.2.0
