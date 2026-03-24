# API 完整文档

**最后更新**: 2026-03-24
**版本**: v1.1.0
**API 端点总数**: 79+

---

## 📋 目录

1. [API 概览](#api-概览)
2. [认证与授权 API](#认证与授权-api)
3. [用户管理 API](#用户管理-api)
4. [任务管理 API](#任务管理-api)
5. [项目管理 API](#项目管理-api)
6. [备份与恢复 API](#备份与恢复-api)
7. [WebSocket 实时通信 API](#websocket-实时通信-api)
8. [性能监控 API](#性能监控-api)
9. [分析 API](#分析-api)
10. [搜索 API](#搜索-api)
11. [RBAC 权限 API](#rbac-权限-api)
12. [多模态 API](#多模态-api)
13. [A2A 通信 API](#a2a-通信-api)
14. [反馈 API](#反馈-api)
15. [GitHub 集成 API](#github-集成-api)
16. [健康检查 API](#健康检查-api)
17. [数据模型](#数据模型)
18. [错误处理](#错误处理)

---

## API 概览

### API 分类统计

| 分类 | 端点数量 | 说明 |
|------|---------|------|
| **认证与授权** | 5 | 登录、注册、刷新 Token |
| **用户管理** | 7 | 用户 CRUD、头像、偏好设置 |
| **任务管理** | 1 | 任务增删改查、批量操作 |
| **项目管理** | 1 | 项目管理 |
| **备份与恢复** | 9 | 备份、恢复、调度 |
| **WebSocket** | 4 | 实时通信 |
| **性能监控** | 4 | 性能指标、告警 |
| **分析** | 2 | 数据分析、导出 |
| **搜索** | 3 | 搜索、自动完成、历史 |
| **RBAC** | 8 | 角色、权限管理 |
| **多模态** | 2 | 图像、音频处理 |
| **A2A** | 5 | Agent 间通信 |
| **反馈** | 2 | 用户反馈 |
| **GitHub** | 2 | Issues、Commits |
| **健康检查** | 4 | 系统、数据库健康 |
| **其他** | 20 | 跨域、状态、导出等 |

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

## 用户管理 API

### 获取用户列表

```
GET /api/users
```

**Query 参数:**
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）
- `role`: 过滤角色

---

### 获取用户详情

```
GET /api/users/[userId]
```

---

### 创建用户

```
POST /api/users
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe",
  "role": "member"
}
```

---

### 更新用户

```
PUT /api/users/[userId]
```

---

### 批量操作

```
POST /api/users/batch
```

```
POST /api/users/batch/bulk
```

---

### 用户活动

```
GET /api/users/[userId]/activity
```

---

### 上传头像

```
POST /api/users/[userId]/avatar
```

---

### 用户偏好设置

```
GET /api/user/preferences
```

```
PUT /api/user/preferences
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

## 备份与恢复 API

### 备份管理

```
GET /api/backup
```

```
POST /api/backup
```

```
GET /api/backup/[id]
```

---

### 导出备份

```
POST /api/backup/export
```

```
GET /api/backup/export/download/[filename]
```

---

### 导入备份

```
POST /api/backup/import
```

---

### 恢复备份

```
POST /api/backup/restore
```

---

### 备份调度

```
GET /api/backup/schedule
```

```
POST /api/backup/schedule
```

```
GET /api/backup/schedule/[id]
```

```
PUT /api/backup/schedule/[id]
```

```
DELETE /api/backup/schedule/[id]
```

```
POST /api/backup/schedule/[id]/trigger
```

---

### 备份统计

```
GET /api/backup/statistics
```

---

### 备份任务

```
GET /api/backup/jobs
```

---

## WebSocket 实时通信 API

### WebSocket 连接

```
GET /api/ws
```

### 广播消息

```
POST /api/ws/broadcast
```

---

### 房间管理

```
GET /api/ws/rooms/[roomId]
```

```
POST /api/ws/rooms/[roomId]
```

```
DELETE /api/ws/rooms/[roomId]
```

---

### 统计信息

```
GET /api/ws/stats
```

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

### 用户角色

```
GET /api/rbac/users/[userId]/roles
```

```
PUT /api/rbac/users/[userId]/roles
```

---

### 用户权限

```
GET /api/rbac/users/[userId]/permissions
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
  "severity": "high"
}
```

---

### 获取反馈

```
GET /api/feedback
```

```
GET /api/feedback/[id]
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

---

### 详细健康

```
GET /api/health/detailed
```

---

### 存活检查

```
GET /api/health/live
```

---

### 就绪检查

```
GET /api/health/ready
```

---

### 数据库健康

```
GET /api/database/health
```

---

### 数据库优化

```
POST /api/database/optimize
```

---

### 实时健康流

```
GET /api/stream/health
```

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

### 评分

```
GET /api/ratings
```

```
POST /api/ratings
```

```
GET /api/ratings/[id]`
```

```
POST /api/ratings/[id]/helpful
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

### 任务状态演示

```
GET /api/demo/task-status
```

---

### 示例端点

```
GET /api/example
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

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

**文档维护**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-03-24
