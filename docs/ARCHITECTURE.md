# 系统架构文档

**最后更新**: 2026-03-22
**版本**: v1.1.0
**维护者**: 🏗️ 架构师 (AI 团队)

---

## 📐 架构概览

7zi Studio 采用 **现代化全栈架构**，结合 Next.js 16.2.1 App Router、微服务设计和 AI 代理系统，并集成了 A2A Protocol 标准和实时协作系统。

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户层 (User Layer)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Web 浏览器  │  │  移动设备   │  │  Telegram   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     表现层 (Presentation Layer)                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Next.js 16.2.1 App Router (Frontend)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │ Dashboard│  │  Tasks   │  │Settings  │  │ Analytics│ │    │
│  │  │   Page   │  │  Page    │  │  Page    │  │   Page   │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │  Team    │  │  About   │  │  Contact │  │   Blog   │ │    │
│  │  │  Page    │  │  Page    │  │  Page    │  │   Page   │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 层 (API Layer - 79+ 端点)              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Tasks   │  │ Users   │  │ Auth    │  │ Backup  │           │
│  │ API     │  │ API     │  │ API     │  │ API     │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Export  │  │ WebSocket│  │ Stream  │  │ Database│           │
│  │ API     │  │ API     │  │ API     │  │ API     │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Feedback │  │ Metrics  │  │ Multimod │  │ Project │           │
│  │ API     │  │ API     │  │ API     │  │ API     │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Business Layer - 32 模块)     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │   A2A   │  │ WebSocket│  │   Redis  │  │ Collab  │           │
│  │ Protocol│  │   Comm   │  │  Cache   │  │ System  │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Agent  │  │   RBAC  │  │ Notify  │  │  Search │           │
│  │  System │  │  System │  │  System │  │  System │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Monitor │  │ Backup  │  │  Auth   │  │ Export  │           │
│  │ System  │  │ System  │  │  System │  │  System │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据访问层 (Data Layer)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  SQLite DB  │  │   Redis     │  │  File System│              │
│  │  (better-   │  │  (ioredis)  │  │  (Local/    │              │
│  │   sqlite3)  │  │             │  │   Cloud)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      基础设施层 (Infrastructure)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Docker    │  │   Nginx     │  │   VPS/Cloud │              │
│  │  Containers │  │   Reverse   │  │  (7zi.com)  │              │
│  │             │  │   Proxy     │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**架构统计:**
- **API 端点**: 79+ 个路由
- **业务模块**: 32 个核心模块
- **页面组件**: 14+ 个页面
- **自定义组件**: 31+ 个组件

---

## 🏗️ 核心模块

### 1. A2A Agent Communication (v1.1.0 新增)

**位置**: `src/lib/a2a/`

**职责:**
- 实现标准化的 Agent 间通信协议
- 支持同步和流式处理模式
- 任务状态管理和追踪
- 事件总线架构

**核心模块:**
- `A2AProtocol.ts` - 协议实现（A2A v0.3.0 兼容）
- `A2AClient.ts` - 客户端实现
- `A2AEventBus.ts` - 事件总线
- `A2ATaskTracker.ts` - 任务追踪器

**协议特性:**
- 完全兼容 A2A Protocol v0.3.0
- JSON-RPC 2.0 标准协议
- 支持双向流式通信
- 自动重试和错误恢复

**使用示例:**
```typescript
const client = new A2AClient('agent-001');

// 同步调用
const result = await client.call('tool_name', { param: 'value' });

// 流式调用
for await (const chunk of client.stream('stream_tool', { query: 'text' })) {
  console.log(chunk);
}
```

---

### 2. WebSocket 实时通信

**位置**: `src/lib/websocket/`

**职责:**
- 实时数据同步
- 跨客户端协作
- 事件推送

**核心模块:**
- `WebSocketClient.ts` - WebSocket 客户端
- `WebSocketManager.ts` - 连接管理器
- `SocketHooks.ts` - React Hooks

**相关 API 端点:**
- `/api/ws` - WebSocket 连接端点
- `/api/ws/rooms/[roomId]` - 房间管理
- `/api/ws/broadcast` - 广播消息
- `/api/ws/stats` - 统计信息

---

### 3. Redis 缓存系统

**位置**: `src/lib/redis/`

**职责:**
- Redis 客户端封装
- LRU 内存缓存
- API 限流支持

**核心模块:**
- `redis-client.ts` - Redis 客户端
- `lru-cache.ts` - LRU 缓存实现
- `rate-limit.ts` - 限流实现

---

### 4. 实时协作系统

**位置**: `src/lib/collaboration/`, `src/lib/realtime/`

**职责:**
- 多用户实时协作
- 共享状态同步
- 冲突解决

**核心功能:**
- 协作文档编辑
- 实时光标追踪
- 用户在线状态
- 操作历史记录

---

### 5. MCP (Model Context Protocol)

**位置**: `src/lib/mcp/`

**职责:**
- MCP 协议实现
- 工具调用管理
- 上下文传递

---

### 6. 性能监控

**位置**: `src/lib/monitoring/`, `src/lib/performance/`

**职责:**
- Web Vitals 收集
- 性能指标追踪
- 性能退化告警

---

### 7. 通知系统

**位置**: `src/lib/notifications/`

**职责:**
- 实时通知推送
- 通知持久化
- 通知偏好管理

**核心功能:**
- 多种通知类型 (success/error/warning/info/task_assigned/system)
- 四种优先级 (low/medium/high/urgent)
- SQLite 持久化存储
- Email 通知集成 (Resend API)

---

### 8. 权限系统 (RBAC)

**位置**: `src/lib/permissions/`

**职责:**
- 基于角色的访问控制
- 权限检查中间件
- 资源级别访问控制

**5 种内置角色:**
- ADMIN - 管理员（完全权限）
- MANAGER - 经理（管理权限）
- MEMBER - 成员（标准权限）
- VIEWER - 查看者（只读权限）
- GUEST - 访客（受限权限）

**45 种细粒度权限**:
涵盖用户、团队、任务、设置、审批、报表、系统、日志、AI Agent、钱包等模块。

---

### 9. 数据导出系统

**位置**: `src/lib/export/`

**职责:**
- PDF 报告导出
- CSV 数据导出
- JSON 结构化导出
- Excel 导出

**相关 API 端点:**
- `/api/export` - 通用导出端点
- `/api/export/tasks` - 任务导出
- `/api/export/projects` - 项目导出

---

### 10. 数据库层

**位置**: `src/lib/db/`

**职责:**
- SQLite 数据库连接
- 数据库优化
- 备份和恢复

**核心功能:**
- 连接池管理
- 索引优化
- N+1 查询预防
- 数据库缓存

**相关 API 端点:**
- `/api/database/health` - 数据库健康检查
- `/api/database/optimize` - 数据库优化
- `/api/backup` - 备份管理
- `/api/backup/restore` - 数据恢复

---

### 11. 认证系统

**位置**: `src/lib/auth/`

**职责:**
- JWT Token 管理
- 用户认证
- 会话管理

**核心功能:**
- Token 生成和验证
- 密码加密
- 会话持久化

**相关 API 端点:**
- `/api/auth/login` - 用户登录
- `/api/auth/logout` - 用户登出
- `/api/auth/register` - 用户注册
- `/api/auth/refresh` - Token 刷新

---

### 12. 多模态支持

**位置**: `src/lib/multimodal/`

**职责:**
- 图像处理
- 音频处理
- 文本处理

**相关 API 端点:**
- `/api/multimodal/image` - 图像处理
- `/api/multimodal/audio` - 音频处理

---

### 13. Agent 系统

**位置**: `src/lib/agent/`, `src/lib/agents/`, `src/lib/agent-communication/`

**职责:**
- AI 代理管理
- 代理间通信
- 任务分配

**11 位 AI 成员:**
1. 🌟 智能体世界专家 (MiniMax)
2. 📚 咨询师 (MiniMax)
3. 🏗️ 架构师 (Self-Claude)
4. ⚡ Executor (Volcengine)
5. 🛡️ 系统管理员 (Bailian)
6. 🧪 测试员 (MiniMax)
7. 🎨 设计师 (Self-Claude)
8. 📣 推广专员 (Volcengine)
9. 💼 销售客服 (Bailian)
10. 💰 财务 (MiniMax)
11. 📺 媒体 (Self-Claude)

---

### 14. 搜索系统

**位置**: `src/lib/search/`

**职责:**
- 全文搜索
- 模糊匹配
- 搜索结果排序

**核心技术:**
- Fuse.js 模糊搜索
- 索引优化
- 搜索建议

---

### 15. 备份系统

**位置**: `src/lib/backup/`

**职责:**
- 数据备份
- 自动备份调度
- 数据恢复

**相关 API 端点:**
- `/api/backup` - 备份管理
- `/api/backup/schedule` - 备份调度
- `/api/backup/export` - 导出备份
- `/api/backup/restore` - 恢复备份

---

### 16. 语音会议

**位置**: `src/lib/voice-meeting/`

**职责:**
- 语音会议管理
- 音频流处理
- 会议录制

---

### 17. 错误处理

**位置**: `src/lib/errors/`

**职责:**
- 统一错误处理
- 错误日志记录
- 错误报告

**核心功能:**
- 自定义错误类
- 错误边界
- Sentry 集成

---

### 18. 日志系统

**位置**: `src/lib/logger/`

**职责:**
- 结构化日志
- 日志级别管理
- 日志轮转

---

### 19. 工具库

**位置**: `src/lib/utils/`, `src/lib/tools/`

**职责:**
- 通用工具函数
- 辅助类
- 常用常量

---

### 20. 类型定义

**位置**: `src/lib/types/`

**职责:**
- TypeScript 类型定义
- 接口定义
- 类型工具

**类型类别:**
- 任务类型
- 用户类型
- 通知类型
- 性能指标类型
- 分析类型

---

### 21. 验证系统

**位置**: `src/lib/validation/`

**职责:**
- 输入验证
- 数据格式验证
- Zod 集成

---

### 22. 缓存系统

**位置**: `src/lib/cache/`

**职责:**
- API 响应缓存
- 缓存失效
- 缓存策略

---

### 23. SSE (Server-Sent Events)

**位置**: `src/lib/sse/`

**职责:**
- SSE 服务端推送
- 事件流管理
- 自动重连

**相关 API 端点:**
- `/api/stream/analytics` - 实时分析数据
- `/api/stream/health` - 实时健康状态

---

### 24. 限流系统

**位置**: `src/lib/rate-limit/`

**职责:**
- API 限流
- 滑动窗口算法
- 令牌桶算法

**核心功能:**
- Redis 分布式限流
- 限流头部响应
- 事件日志记录

---

### 25. 服务层

**位置**: `src/lib/services/`

**职责:**
- 业务逻辑封装
- 服务编排
- 事务管理

---

### 26. 离线支持

**位置**: `src/lib/offline/`

**职责:**
- 离线检测
- 数据同步
- Service Worker 集成

---

### 27. 反馈系统

**位置**: `src/lib/feedback/`

**职责:**
- 用户反馈收集
- 反馈管理
- 反馈分析

**相关 API 端点:**
- `/api/feedback` - 提交反馈
- `/api/feedback/[id]` - 获取反馈

---

### 28. 撤销重做

**位置**: `src/lib/undo-redo/`

**职责:**
- 操作历史管理
- 撤销功能
- 重做功能

---

### 29. 审批系统

**位置**: `src/lib/approval/`

**职责:**
- 审批流程管理
- 审批状态追踪
- 审批通知

---

### 30. 加密系统

**位置**: `src/lib/crypto/`

**职责:**
- 数据加密
- 哈希计算
- 安全随机数

---

### 31. 中间件

**位置**: `src/lib/middleware/`

**职责:**
- 请求拦截
- 响应拦截
- 认证中间件

---

### 32. 容错系统

**位置**: `src/lib/fallback/`

**职责:**
- 服务降级
- 容错处理
- 优雅降级

**位置**: `src/lib/a2a/`

**职责:**
- 实现标准化的 Agent 间通信协议
- 支持同步和流式处理模式
- 任务状态管理和追踪
- 事件总线架构

**核心模块:**
- `A2AProtocol.ts` - 协议实现（A2A v0.3.0 兼容）
- `A2AClient.ts` - 客户端实现
- `A2AEventBus.ts` - 事件总线
- `A2ATaskTracker.ts` - 任务追踪器

**协议特性:**
- 完全兼容 A2A Protocol v0.3.0
- JSON-RPC 2.0 标准协议
- 支持双向流式通信
- 自动重试和错误恢复

**使用示例:**
```typescript
const client = new A2AClient('agent-001');

// 同步调用
const result = await client.call('tool_name', { param: 'value' });

// 流式调用
for await (const chunk of client.stream('stream_tool', { query: 'text' })) {
  console.log(chunk);
}
```

---

### 3. AI 主管系统

**位置**: `src/lib/director/`

**职责:**
- 任务分解与分配
- 子代理协调与调度
- 进度监控与报告
- 决策引擎

**核心组件:**
- `DirectorAgent.ts` - 主管 Agent 实现
- `TaskDecomposer.ts` - 任务分解器
- `AgentOrchestrator.ts` - 子代理编排器
- `DecisionEngine.ts` - 决策引擎

---

### 4. 子代理团队

**位置**: `src/lib/subagents/`

**11 位 AI 成员:**
1. 🌟 智能体世界专家 (MiniMax)
2. 📚 咨询师 (MiniMax)
3. 🏗️ 架构师 (Self-Claude)
4. ⚡ Executor (Volcengine)
5. 🛡️ 系统管理员 (Bailian)
6. 🧪 测试员 (MiniMax)
7. 🎨 设计师 (Self-Claude)
8. 📣 推广专员 (Volcengine)
9. 💼 销售客服 (Bailian)
10. 💰 财务 (MiniMax)
11. 📺 媒体 (Self-Claude)

---

### 5. 任务管理系统

**位置**: `src/lib/tasks/`

**核心功能:**
- 任务创建与分配
- 优先级管理
- 进度追踪
- 批量操作

**数据模型:**
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

### 6. WebSocket 实时通信

**位置**: `src/lib/websocket/`

**职责:**
- 实时数据同步
- 跨客户端协作
- 事件推送

**核心模块:**
- `WebSocketClient.ts` - WebSocket 客户端
- `WebSocketManager.ts` - 连接管理器
- `SocketHooks.ts` - React Hooks

---

## 🔐 安全架构

### 1. RBAC 权限系统

**5 种内置角色:**
- **ADMIN** - 管理员（完全权限）
- **MANAGER** - 经理（管理权限）
- **MEMBER** - 成员（标准权限）
- **VIEWER** - 查看者（只读权限）
- **GUEST** - 访客（受限权限）

**45 种细粒度权限:**
涵盖用户、团队、任务、设置、审批、报表、系统、日志、AI Agent、钱包等模块。

### 2. 数据安全

- **JWT Token** - 身份验证
- **数据加密** - 敏感信息加密存储
- **CORS 配置** - 跨域请求控制
- **CSP 策略** - 内容安全策略

---

## 📊 性能优化

### 1. 前端优化

- **代码分割** - Next.js 自动代码分割
- **懒加载** - 动态导入组件
- **虚拟滚动** - 长列表优化
- **React.memo** - 组件记忆化
- **图片优化** - Next.js Image 组件

### 2. 后端优化

- **缓存机制** - API 响应缓存
- **数据库索引** - SQLite 索引优化
- **连接池** - 数据库连接管理
- **压缩** - Gzip/Brotli 压缩

### 3. Web Vitals

- **LCP** (Largest Contentful Paint) < 2.5s
- **FID** (First Input Delay) < 100ms
- **CLS** (Cumulative Layout Shift) < 0.1

---

## 🔄 数据流

### 1. 用户请求流程

```
用户操作
  ↓
React 组件
  ↓
自定义 Hook (useGlobalLoading, useWebSocket, etc.)
  ↓
API 调用 (Next.js API Routes)
  ↓
业务逻辑层 (Director, Subagents, Task Manager)
  ↓
数据访问层 (GitHub API, Gmail API, File System)
  ↓
返回结果
  ↓
状态更新 (Zustand Store)
  ↓
UI 重新渲染
```

### 2. AI 工作流程

```
用户下达任务
  ↓
Director 接收并分析
  ↓
任务分解
  ↓
分配给合适的 Subagent
  ↓
Subagent 执行任务
  ↓
通过 A2A Protocol 通信
  ↓
返回结果给 Director
  ↓
汇总并汇报给用户
```

---

## 🧪 测试策略

### 1. 测试类型

- **单元测试** - 组件、Hooks、工具函数
- **集成测试** - API 端点、数据流
- **E2E 测试** - 完整用户流程

### 2. 测试覆盖

- **测试文件数**: 490+
- **覆盖率目标**: 80%+

---

## 📦 部署架构

### 1. 容器化部署

```
┌────────────────────────────────────────┐
│            Docker Compose              │
│  ┌────────────┐  ┌────────────┐       │
│  │  7zi-app   │  │  7zi-nginx │       │
│  │ (Next.js)  │  │  (Proxy)   │       │
│  └────────────┘  └────────────┘       │
└────────────────────────────────────────┘
```

### 2. CI/CD 流程

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Lint   │→│  Test   │→│  Build  │→│ Deploy  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [API.md](./API.md) - API 文档
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [LOADING-SYSTEM.md](./LOADING-SYSTEM.md) - 加载系统
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket 文档

---

## 📝 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.1.0 | 2026-03-22 | 新增 Global Loading System、A2A Agent Communication |
| v1.0.6 | 2026-03-21 | 实时通知、语音会议、移动端响应式 |
| v1.0.0 | 2026-03-01 | 初始版本 |

---

**文档维护**: 🏗️ 架构师 (AI 团队)
