# 代码库分析报告 - 2026-04-17

## 项目概览

| 字段 | 值 |
|------|-----|
| 项目名称 | 7zi-frontend |
| 当前版本 | v1.14.0 |
| 运行时 | Node.js v22.22.1 |
| 包管理器 | pnpm |

---

## 1. 技术栈与框架

### 核心框架
- **Next.js 16.2.1** — App Router, 支持 Turbopack 和 Webpack 两种构建
- **React 19.2.4** (含 React DOM)
- **TypeScript 5** (严格模式)

### 状态管理
- **Zustand 5.0.12** — 全局状态管理（dashboardStore, filterStore, permissionStore, preferencesStore, uiStore, walletStore）
- **@xyflow/react 12.10.2** — 工作流编辑器节点图

### UI/样式
- **Tailwind CSS 4.2.2** (via @tailwindcss/postcss)
- **Lucide React 1.7.0** — 图标库
- **Recharts 3.8.0** — 数据可视化图表
- **Three.js 0.183.2 + @react-three/drei/fiber** — 3D 渲染

### 实时协作
- **Socket.IO 4.8.3** (client)
- **Yjs 13.6.30** — 协作引擎 (CRDT)
- **WebSocket** 相关模块 (websocket-manager 等)

### 基础设施
- **Sentry 10.44.0** — 错误监控
- **ioredis 5.10.1** — Redis 客户端
- **better-sqlite3 12.8.0** — 嵌入式数据库
- **Bull 4.16.5** — 任务队列
- **jose 6.2.1** — JWT 处理

### AI / Agent
- **@modelcontextprotocol/sdk 1.27.1** — MCP 协议
- **src/lib/ai/** — AI 相关模块（多智能体系统）
- **src/lib/multi-agent/** — 多智能体编排

### 国际化
- **next-intl 4.8.3** — i18n 支持

### 其他关键依赖
- **Zod 4.3.6** — 数据验证
- **Fuse.js 7.1.0** — 模糊搜索
- **xlsx 0.18.5** / **jszip 3.10.1** — Excel/压缩处理
- **jspdf 4.2.1** — PDF 生成
- **sharp 0.34.5** — 图片处理
- **uuid 13.0.0**
- **web-vitals 5.1.0** — 性能指标

### 开发工具
- **Vitest 4.1.2** + **@vitest/coverage-v8** — 单元/集成测试
- **Playwright 1.58.2** — E2E 测试
- **ESLint 9** + **eslint-config-next 16.2.1**
- **Prettier** + **prettier-plugin-tailwindcss**
- **Madge 8.0.0** — 循环依赖检测
- **MSW 2.12.14** — API Mock

---

## 2. src 目录结构

```
src/
├── app/                    # Next.js App Router 根目录
│   ├── [locale]/           # 国际化路由
│   ├── api/                # API 路由 (40个子目录)
│   │   ├── a2a/            # Agent-to-Agent 协议
│   │   ├── admin/          # 管理接口
│   │   ├── analytics/       # 分析数据接口
│   │   ├── audit/          # 审计日志
│   │   ├── auth/           # 认证
│   │   ├── export/         # 数据导出
│   │   ├── feedback/       # 反馈
│   │   ├── health/         # 健康检查
│   │   ├── monitoring/     # 监控
│   │   ├── rbac/           # 权限控制
│   │   ├── reports/        # 报表
│   │   ├── search/         # 搜索
│   │   ├── websocket/      # WebSocket
│   │   └── ...             # 还有很多其他模块
│   ├── actions/           # Server Actions
│   ├── layout.tsx          # 根布局
│   └── (其他页面文件)
├── lib/                    # 核心业务逻辑库 (73个子目录)
│   ├── agents/             # AI Agent 定义
│   ├── ai/                 # AI 核心能力
│   ├── a2a/                # A2A 协议实现
│   ├── auth/               # 认证模块
│   ├── db/                 # 数据库层 (缓存、连接池、查询优化)
│   ├── websocket/          # WebSocket 管理
│   ├── collab/             # 实时协作
│   ├── workflow/           # 工作流引擎
│   ├── agents/             # Agent 定义
│   ├── permissions/       # 权限系统
│   ├── rate-limit/        # 限流
│   ├── monitoring/        # 监控
│   ├── observability/     # 可观测性
│   ├── alerting/         # 告警
│   ├── plugins/          # 插件系统
│   ├── search/           # 搜索
│   ├── export/           # 导出
│   ├── import/            # 导入
│   ├── learning/         # AI 学习系统
│   ├── multi-agent/       # 多智能体编排
│   ├── multimodal/        # 多模态服务
│   ├── cache/             # 缓存
│   ├── security/          # 安全
│   └── (其他工具库)
├── components/            # UI 组件 (40+子目录)
│   ├── admin/             # 管理后台组件
│   ├── agent-dashboard/   # Agent 仪表盘
│   ├── analytics/         # 分析组件
│   ├── chat/              # 聊天组件
│   ├── collaboration/     # 协作组件
│   ├── dashboard/         # 仪表盘
│   ├── knowledge-lattice/ # 知识网格
│   ├── meeting/           # 会议
│   ├── mobile/            # 移动端
│   ├── monitoring/        # 监控
│   ├── permissions/       # 权限组件
│   ├── room/              # 会议室
│   ├── workflow/          # 工作流 UI
│   └── ui/                # 基础 UI 组件
├── stores/                # Zustand 状态库
│   ├── dashboardStore.ts
│   ├── filterStore.ts
│   ├── permissionStore.ts
│   ├── preferencesStore.ts
│   ├── uiStore.ts
│   └── walletStore.ts
├── features/              # 功能模块
│   └── notifications/     # 通知功能
├── hooks/                 # 自定义 React Hooks
│   ├── useWebSocket.ts
│   ├── useWebRTCMeeting.ts
│   ├── useWorkflowDraft.ts
│   ├── useFetch.ts
│   └── (其他 hooks)
├── workflows/             # 工作流 DSL 解析
│   ├── DSLParser.ts
│   └── nodes/
├── types/                 # TypeScript 类型定义
├── i18n/                  # 国际化
├── middleware/            # Next.js 中间件
├── contexts/             # React Context
├── styles/                # 样式
├── tools/                 # 工具函数
├── data/                  # 静态数据
└── test/                  # 测试配置
```

---

## 3. 主要模块说明

### 3.1 API 层 (`src/app/api/`)
40+ 个 API 模块，包含：
- **a2a/** — Agent-to-Agent 通信协议
- **auth/** — JWT/权限认证
- **websocket/** — WS 连接管理
- **admin/** — 后台管理
- **rbac/** — 基于角色的访问控制
- **export/import/** — 数据导入导出
- **reports/** — 报表生成
- **search/** — 搜索 API

### 3.2 数据库层 (`src/lib/db/`)
- **connection.ts / connection-pool.ts** — 连接池
- **cache.ts / query-cache-layer.ts** — 查询缓存
- **pagination.ts** — 分页
- **migrations.ts** — 迁移
- **performance-logger.ts / slow-query-logger.ts** — 性能日志
- **query-builder.ts** — 查询构建器
- **enhanced-db.ts** — 增强数据库封装

### 3.3 协作系统 (`src/lib/collab/`, `src/components/collaboration/`)
- **Yjs** — CRDT 实时协作
- **Socket.IO** — 信令和状态同步
- Cursor 同步、编辑冲突处理

### 3.4 AI Agent 系统 (`src/lib/agents/`, `src/lib/ai/`, `src/lib/multi-agent/`)
- 多模型支持（MiniMax, Volcanic Engine, Bailian）
- MCP (Model Context Protocol) 集成
- A2A 协议实现（Agent to Agent）
- 多智能体编排和工作流

### 3.5 工作流引擎 (`src/lib/workflow/`, `src/workflows/`)
- DSLParser — 工作流 DSL 解析
- 节点定义 (nodes/)
- 执行器
- 版本历史

### 3.6 通知系统 (`src/features/notifications/`, `src/lib/notifications/`)
- WebSocket 实时推送
- 多渠道通知

### 3.7 安全模块 (`src/lib/security/`, `src/lib/middleware/`)
- RBAC 权限系统
- CSRF 保护
- Rate limiting
- API 安全

---

## 4. 依赖版本亮点

| 依赖 | 版本 | 备注 |
|------|------|------|
| next | 16.2.1 | Next.js 16 (最新) |
| react | 19.2.4 | React 19 |
| zustand | 5.0.12 | 状态管理 |
| @xyflow/react | 12.10.2 | 工作流编辑器 |
| socket.io-client | 4.8.3 | WebSocket |
| yjs | 13.6.30 | CRDT |
| zod | 4.3.6 | 验证 |
| satori | - | 已移除 (PDF方案改用 jspdf) |

---

## 5. 构建配置

- **Turbopack** 支持 (开发/生产)
- **Webpack** 备选
- **Bundle Analyzer** 集成
- 多套 Vitest 配置 (normal/fast/slow/integration)
- Playwright E2E 测试 (多配置)
- pnpm overrides 安全补丁

---

## 6. 项目特征总结

1. **大型全栈 Next.js 应用** — 前后端一体化，40+ API 模块
2. **AI 驱动** — 多智能体系统、MCP 协议、AI 对话、工具调用
3. **实时协作** — Yjs + Socket.IO + WebRTC 会议
4. **工作流引擎** — DSL 可视化编辑 + 节点执行
5. **企业级功能** — RBAC、审计日志、多租户、监控告警
6. **国际化** — next-intl 多语言支持
7. **性能优化** — 数据库缓存、查询优化、CDN 优化、React Compiler
8. **测试覆盖** — Vitest + Playwright + MSW

---

*报告生成时间: 2026-04-17 03:35 GMT+2*
