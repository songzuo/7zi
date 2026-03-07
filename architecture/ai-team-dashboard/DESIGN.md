# AI 团队实时展示系统 - 技术方案文档

## 1. 系统概述

### 1.1 项目目标
构建一个实时展示 AI 团队成员工作状态、任务进度和贡献记录的系统，通过 GitHub Issues API 集成实现任务自动同步。

### 1.2 核心功能
- **任务看板**: 实时显示 GitHub Issues 中的团队任务
- **成员状态**: 展示每个 AI 成员的工作状态和历史贡献
- **实时更新**: WebSocket 推送状态变化
- **数据缓存**: Redis 缓存优化性能

### 1.3 技术栈
```
前端: React 18 + TypeScript + Vite
状态管理: Zustand
UI 组件: Tailwind CSS + shadcn/ui
后端: Node.js + Express
实时通信: Socket.IO
缓存: Redis
数据库: PostgreSQL (可选，用于历史记录)
```

## 2. 系统架构

### 2.1 架构图
```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ 任务看板    │  │ 成员状态    │  │ 贡献图表    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                  ┌───────▼───────┐                           │
│                  │  Zustand Store │                           │
│                  └───────┬───────┘                           │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │ REST Client │  │ WebSocket   │  │  React Query │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────│────────────────│────────────────│─────────────────┘
          │                │                │
          │ HTTP           │ WebSocket      │
          │                │                │
┌─────────▼────────────────▼────────────────▼─────────────────┐
│                    API Gateway (Express)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Socket.IO Server                        │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │ 任务服务    │  │ 成员服务    │  │ GitHub 服务  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  ┌──────▼────────────────▼────────────────▼──────┐          │
│  │                  Redis Cache                   │          │
│  └────────────────────────────────────────────────┘          │
│                          │                                   │
│                  ┌───────▼───────┐                           │
│                  │ GitHub API    │                           │
│                  └───────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流
1. 前端通过 REST API 获取初始数据
2. WebSocket 建立长连接，订阅实时更新
3. GitHub Issues 变化通过 Webhook 触发后端更新
4. 后端推送更新到前端
5. Redis 缓存热点数据，TTL 5 分钟

## 3. 数据模型

### 3.1 Issue (任务)
```typescript
interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Label[];
  assignee: User | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body: string;
  html_url: string;
  milestone: Milestone | null;
}
```

### 3.2 AIMember (AI 成员)
```typescript
interface AIMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  currentTask: Issue | null;
  skills: string[];
  completedTasks: number;
  contributionHistory: Contribution[];
}
```

### 3.3 Contribution (贡献记录)
```typescript
interface Contribution {
  id: string;
  memberId: string;
  issueId: number;
  action: 'created' | 'commented' | 'closed' | 'reviewed';
  timestamp: string;
  description: string;
}
```

## 4. 性能优化策略

### 4.1 缓存策略
- **Redis 缓存**: Issues 列表、成员状态
- **TTL**: 5 分钟 (可配置)
- **缓存键**: `issues:{repo}`, `member:{id}:status`
- **失效策略**: GitHub Webhook 触发时主动失效

### 4.2 前端优化
- **虚拟列表**: 大量任务时使用 react-window
- **懒加载**: 路由级别代码分割
- **图片优化**: WebP 格式 + CDN
- **SWR**: React Query 管理服务器状态

### 4.3 实时更新优化
- **增量更新**: 只推送变化的数据
- **防抖**: 高频更新合并推送 (100ms)
- **连接管理**: 断线自动重连 (指数退避)

## 5. 安全考虑

### 5.1 认证授权
- JWT Token 认证
- GitHub OAuth 登录 (可选)
- API 速率限制

### 5.2 数据安全
- GitHub Token 加密存储
- HTTPS 强制
- CORS 配置

## 6. 部署方案

### 6.1 Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - REDIS_URL=redis://redis:6379
      - GITHUB_TOKEN=${GITHUB_TOKEN}
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 6.2 环境变量
```bash
# .env.example
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=owner/repo
REDIS_URL=redis://localhost:6379
PORT=4000
FRONTEND_URL=http://localhost:3000
```

## 7. 监控与日志

### 7.1 监控指标
- API 响应时间 (P95 < 200ms)
- WebSocket 连接数
- 缓存命中率 (>80%)
- GitHub API 调用次数

### 7.2 日志
- Winston 结构化日志
- 错误追踪 (Sentry)
- 性能分析 ( clinic.js)
