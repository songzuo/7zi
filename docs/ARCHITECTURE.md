# 系统架构文档

**最后更新**: 2026-03-22
**版本**: v1.1.0
**维护者**: 🏗️ 架构师 (AI 团队)

---

## 📐 架构概览

7zi Studio 采用 **现代化全栈架构**，结合 Next.js 16.1.7 App Router、微服务设计和 AI 代理系统，并集成了 A2A Protocol 标准和全局加载状态管理。

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
│  │              Next.js 16.1.7 App Router (Frontend)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │ Dashboard│  │  AI Chat │  │  Settings│  │   API    │ │    │
│  │  │  Page    │  │   Page   │  │   Page   │  │  Routes  │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Business Layer)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  AI 主管系统    │  │  子代理团队     │  │  会议系统       │  │
│  │  (Director)     │  │  (11 Members)   │  │  (Meeting)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  任务管理       │  │  记忆系统       │  │  技能系统       │  │
│  │  (Task Mgr)     │  │  (Memory)       │  │  (Skills)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据访问层 (Data Layer)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  GitHub API │  │  Gmail API  │  │  文件系统   │              │
│  │  (Issues/   │  │  (Emails/   │  │  (Memory/   │              │
│  │   Commits)  │  │   Calendar) │  │   Config)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      基础设施层 (Infrastructure)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Docker    │  │   Nginx     │  │   GCP/AWS   │              │
│  │  Containers │  │   Reverse   │  │   Cloud     │              │
│  │             │  │   Proxy     │  │   Services  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 核心组件

### 1. Global Loading System (v1.1.0 新增)

**位置**: `src/components/GlobalLoader.tsx`, `src/hooks/useGlobalLoading.tsx`

**职责:**
- 提供统一的全局加载状态管理
- 支持多种加载指示器变体
- 进度追踪和自动 Promise 包装
- 防闪烁机制和自定义外观

**核心组件:**
- `GlobalLoadingProvider` - Context Provider 组件
- `useGlobalLoading` - 全局加载状态 Hook
- `useScopedLoading` - 隔离加载状态 Hook
- `GlobalLoader` - 全屏加载遮罩组件
- `LoadingSpinner` - 灵活的加载旋转器组件

**使用示例:**
```typescript
// 在应用根部包裹 Provider
<GlobalLoadingProvider>
  {children}
  <GlobalLoader />
</GlobalLoadingProvider>

// 在组件中使用
const { withLoading } = useGlobalLoading();
const result = await withLoading(fetchData(), '获取数据...');
```

---

### 2. A2A Agent Communication (v1.1.0 新增)

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
