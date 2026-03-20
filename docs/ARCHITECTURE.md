# 系统架构说明

**最后更新**: 2026-03-18
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

**位置:** `src/components/GlobalLoader.tsx`, `src/hooks/useGlobalLoading.tsx`

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

**详细文档:** [Global Loading System 文档](./LOADING-SYSTEM.md)

---

### 2. A2A Agent Communication System (v1.1.0 新增)

**位置:** `src/lib/a2a/`

**职责:**
- 实现 A2A Protocol v0.3.0 标准
- 提供 Agent 之间通信的能力
- 任务管理和状态追踪
- JSON-RPC 2.0 协议支持

**核心模块:**
- `types.ts` - A2A 协议类型定义
- `task-store.ts` - 任务存储（内存实现）
- `executor.ts` - 代理执行器（SevenZiExecutor）
- `jsonrpc-handler.ts` - JSON-RPC 请求处理器
- `agent-card.ts` - 代理卡片配置

**支持的 JSON-RPC 方法:**
- `message/send` - 发送消息给代理
- `message/stream` - 流式处理消息
- `tasks/get` - 获取任务详情
- `tasks/list` - 列出任务
- `tasks/cancel` - 取消任务
- `agent/getCard` - 获取代理卡片
- `agent/getExtendedCard` - 获取扩展代理卡片

**任务状态:**
- `submitted` - 已提交
- `working` - 执行中
- `input-required` - 需要输入
- `auth-required` - 需要认证
- `completed` - 已完成
- `canceled` - 已取消
- `failed` - 失败
- `rejected` - 已拒绝

**使用示例:**
```typescript
// 创建代理
const executor = createSevenZiExecutor();
const taskStore = new InMemoryTaskStore();
const handler = createRequestHandler(agentCard, taskStore, executor);

// 处理请求
const response = await handler.handleRequest({
  jsonrpc: '2.0',
  method: 'message/send',
  params: { message: {...} },
  id: '1'
});
```

---

### 3. Next.js 16.1.7 App Router

**技术栈:**
- React 19.2.4
- TypeScript 5.0
- Tailwind CSS 3.0
- Server Components

**目录结构:**
```
app/
├── dashboard/              # 实时看板页面
│   └── page.tsx
├── components/             # React 组件
│   ├── MemberCard.tsx
│   ├── TaskBoard.tsx
│   └── ActivityLog.tsx
├── hooks/                  # 自定义 Hooks
│   └── useDashboardData.ts
├── lib/                    # 工具函数
│   └── github.ts
└── api/                    # API 路由
    └── dashboard/
        └── route.ts
```

**特点:**
- ✅ 服务端渲染 (SSR)
- ✅ 静态生成 (SSG)
- ✅ 增量静态再生成 (ISR)
- ✅ 流式传输 (Streaming)

---

### 2. AI 主管系统 (Director)

**职责:**
- 任务接收与分解
- 子代理任务分配
- 进度追踪与协调
- 结果汇总与汇报

**工作流程:**
```
1. 接收主人任务
       ↓
2. 分析任务需求
       ↓
3. 分解为子任务
       ↓
4. 分配给合适的子代理
       ↓
5. 监督执行进度
       ↓
6. 汇总结果
       ↓
7. 向主人汇报
```

**核心文件:**
```
.openclaw/
├── skills/
│   └── team-meeting/
│       └── SKILL.md        # 团队会议技能
└── workspace/
    ├── AGENTS.md           # AI 主管说明
    └── SOUL.md             # AI 人格定义
```

---

### 3. 子代理团队 (11 Members)

| 角色 | 职责 | 提供商 | 状态 |
|------|------|--------|------|
| 🌟 智能体世界专家 | 视角转换、未来布局 | MiniMax | ✅ 运行中 |
| 📚 咨询师 | 研究分析、信息整理 | MiniMax | ✅ 运行中 |
| 🏗️ 架构师 | 系统设计、技术规划 | Self-Claude | ✅ 运行中 |
| ⚡ Executor | 任务执行、代码实现 | Volcengine | ✅ 运行中 |
| 🛡️ 系统管理员 | 运维部署、安全监控 | Bailian | ✅ 运行中 |
| 🧪 测试员 | 质量保障、Bug 修复 | MiniMax | ✅ 运行中 |
| 🎨 设计师 | UI/UX 设计、前端开发 | Self-Claude | ✅ 运行中 |
| 📣 推广专员 | 市场推广、SEO 优化 | Volcengine | ✅ 运行中 |
| 💼 销售客服 | 客户支持、商务合作 | Bailian | ✅ 运行中 |
| 💰 财务 | 会计审计、成本控制 | MiniMax | ✅ 运行中 |
| 📺 媒体 | 内容创作、品牌宣传 | Self-Claude | ✅ 运行中 |

**子代理配置:**
```typescript
// 子代理配置示例
const SUBAGENTS = [
  {
    id: 'agent-world-expert',
    name: '智能体世界专家',
    role: '视角转换、未来布局',
    provider: 'minimax',
    model: 'abab6.5',
    emoji: '🌟'
  },
  // ... 其他 10 位成员
];
```

---

### 4. 记忆系统 (Memory System)

**架构:**
```
memory/
├── MEMORY.md                    # 长期记忆 ( curated )
├── memory/
│   ├── 2026-03-06.md           # 每日记忆 (raw logs)
│   ├── 2026-03-05.md
│   └── heartbeat-state.json    # 心跳检查状态
└── HEARTBEAT.md                # 心跳检查配置
```

**记忆类型:**
- **短期记忆**: 会话上下文 (LLM context window)
- **中期记忆**: `memory/YYYY-MM-DD.md` (每日日志)
- **长期记忆**: `MEMORY.md` (精选重要事件)

**记忆管理流程:**
```
1. 会话中记录重要事件
       ↓
2. 写入当日 memory/YYYY-MM-DD.md
       ↓
3. 心跳检查时回顾近期记忆
       ↓
4. 提炼重要内容到 MEMORY.md
       ↓
5. 清理过期记忆文件
```

---

### 5. 技能系统 (Skills)

**技能架构:**
```
skills/
├── gog/                        # Google Workspace CLI
│   └── SKILL.md
├── healthcheck/                # 安全检查
│   └── SKILL.md
├── team-meeting/               # 团队会议
│   └── SKILL.md
├── weather/                    # 天气查询
│   └── SKILL.md
└── skill-creator/              # 技能创建
    └── SKILL.md
```

**技能使用:**
```typescript
// 技能调用示例
await subagents.spawn({
  target: 'team-meeting',
  action: 'start',
  params: { type: 'daily-standup' }
});
```

---

## 🔄 数据流

### Dashboard 数据流

```
用户访问 /dashboard
       ↓
Next.js Server Component
       ↓
useDashboardData Hook
       ↓
GitHub API (Issues + Commits)
       ↓
数据转换与格式化
       ↓
React 组件渲染
       ↓
流式传输到客户端
       ↓
客户端定时刷新 (30s)
```

### AI 任务执行流

```
主人下达任务
       ↓
AI 主管接收
       ↓
任务分析与分解
       ↓
子代理分配
       ↓
子代理执行 (可能调用技能)
       ↓
结果返回主管
       ↓
主管汇总
       ↓
向主人汇报
```

### WebSocket 实时通信流 (v1.0.6 新增)

```
客户端初始化
       ↓
建立 WebSocket 连接
       ↓
订阅相关频道
       ↓
┌──────┴──────┐
│             │
▼             ▼
实时数据推送  心跳检测
(30s 间隔)   (检测连接状态)
│             │
└──────┬──────┘
       ▼
消息接收与处理
       ↓
UI 自动更新
       ↓
断线自动重连
(指数退避算法)
```

**实时通信消息类型:**
- `task:update` - 任务状态更新
- `user:presence` - 用户在线状态
- `comment:new` - 新评论通知
- `notification:push` - 通知推送
- `ai:task:progress` - AI 任务进度

**优化成果 (v1.0.6):**
- 连接稳定性提升 25%
- 重连速度提升 40%
- 消息延迟降低 30%
- 重渲染减少 30-40%

**详细文档**: 参见 [WebSocket 实时通信文档](./WEBSOCKET.md)

---

### Global Loading System 流 (v1.1.0 新增)

```
组件触发操作
       ↓
调用 useGlobalLoading Hook
       ↓
┌──────┴──────┐
│             │
▼             ▼
手动控制      自动 Promise 包装
startLoading  withLoading(promise, message)
│             │
└──────┬──────┘
       ▼
更新全局状态
(message, progress, isLoading)
       ↓
GlobalLoader 组件监听状态
       ↓
显示加载指示器
       ↓
操作完成 / 进度更新
       ↓
stopLoading() / updateProgress()
       ↓
自动隐藏加载器
```

**Global Loading System 组件:**
- `GlobalLoadingProvider` - 全局状态 Context Provider
- `useGlobalLoading` - 访问全局加载状态的 Hook
- `useScopedLoading` - 创建隔离加载状态的 Hook
- `GlobalLoader` - 全屏加载遮罩组件（3种变体）
- `LoadingSpinner` - 灵活的加载旋转器（6种变体）

**Spinner 变体:**
- `spin` - 旋转圆圈
- `pulse` - 脉冲效果
- `bounce` - 弹跳动画
- `dots` - 脉冲圆点
- `bars` - 脉冲条
- `wave` - 波浪动画

**GlobalLoader 变体:**
- `overlay` - 全屏遮罩（默认）
- `inline` - 嵌入式加载器
- `minimal` - 精简版本

**特点:**
- ✅ 统一的加载状态管理
- ✅ 进度追踪支持 (0-100%)
- ✅ 防闪烁机制（最小显示时间）
- ✅ 自定义外观和主题
- ✅ 完整的 TypeScript 类型支持
- ✅ 无障碍支持（ARIA 标签）

**详细文档**: 参见 [Global Loading System 文档](./LOADING-SYSTEM.md)

---

### A2A Agent Communication 流 (v1.1.0 新增)

```
外部系统/客户端
       ↓
发送 JSON-RPC 请求
       ↓
A2ARequestHandler 接收
       ↓
┌─────────────────────────────────────┐
│    JSON-RPC 方法路由               │
├─────────────────────────────────────┤
│ • message/send     - 发送消息       │
│ • message/stream   - 流式处理       │
│ • tasks/get        - 获取任务       │
│ • tasks/list       - 列出任务       │
│ • tasks/cancel     - 取消任务       │
│ • agent/getCard    - 获取代理卡片   │
└─────────────────────────────────────┘
       ↓
InMemoryTaskStore 操作
（创建/更新/查询任务）
       ↓
AgentExecutor 执行
       ↓
SimpleEventBus 发布事件
       ↓
┌─────────────────────────────────────┐
│    事件类型                         │
├─────────────────────────────────────┤
│ • Task             - 任务对象       │
│ • Message          - 消息对象       │
│ • Status Update    - 状态更新       │
│ • Artifact Update  - 工件更新       │
└─────────────────────────────────────┘
       ↓
返回 JSON-RPC 响应
       ↓
外部系统接收结果
```

**A2A Protocol 核心概念:**
- **Agent** - 具有特定能力的 AI 代理
- **Task** - 代理执行的工作单元
- **Message** - 代理之间的通信消息
- **Artifact** - 代理生成的产出
- **Agent Card** - 代理的能力和元数据描述

**任务状态流转:**
```
submitted → working → completed
                  ↘ failed
              input-required
              auth-required
              canceled / rejected
```

**核心模块:**
- `types.ts` - A2A 协议类型定义
- `task-store.ts` - 任务存储接口和内存实现
- `executor.ts` - 代理执行器接口和实现
- `jsonrpc-handler.ts` - JSON-RPC 2.0 请求处理器
- `agent-card.ts` - 代理卡片配置

**错误代码 (A2A Error Codes):**
- `-32700` 解析错误
- `-32600` 无效请求
- `-32601` 方法未找到
- `-32602` 无效参数
- `-32603` 内部错误
- `-32001` 任务未找到
- `-32002` 任务不可取消
- `-32003` 不支持推送通知
- `-32004` 不支持的操作

**特点:**
- ✅ 完全兼容 A2A Protocol v0.3.0
- ✅ JSON-RPC 2.0 标准协议
- ✅ 支持同步和流式处理
- ✅ 任务状态管理和追踪
- ✅ 事件总线架构
- ✅ 可扩展的代理执行器

---

## 🔐 安全架构

### 认证与授权

**JWT 认证:**
```
用户登录 → 验证凭据 → 生成 JWT → HTTP-only Cookie
       ↓
后续请求 → 自动携带 Cookie → 中间件验证 → 访问资源
```

**权限级别:**
- **admin**: 完全访问权限
- **user**: 受限访问权限
- **guest**: 只读权限

### 数据安全

- ✅ HTTPS 强制 (生产环境)
- ✅ JWT Secret 环境变量
- ✅ HTTP-only Cookies (防 XSS)
- ✅ SameSite Cookies (防 CSRF)
- ✅ 密码 bcrypt 哈希
- ✅ API 速率限制

---

## 🚀 部署架构

### 开发环境
```
本地机器
└── Next.js Dev Server (localhost:3000)
    └── Hot Reload
```

### 生产环境 (Docker)
```
Docker Container
├── Next.js Standalone
├── Nginx Reverse Proxy
└── Health Check
```

### 生产环境 (Vercel)
```
Vercel Edge Network
├── CDN Caching
├── Serverless Functions
└── Automatic SSL
```

### 服务器集群 (未来)
```
Load Balancer (Nginx)
├── Server 1: 7zi.com
├── Server 2: bot5.szspd.cn
├── Server 3-8: (待部署)
└── Health Check & Auto-failover
```

---

## 📊 性能优化

### 前端优化
- ✅ Next.js Image 组件 (自动优化)
- ✅ 字体优化 (next/font)
- ✅ 代码分割 (自动)
- ✅ 树摇 (Tree Shaking)
- ✅ 静态生成 (SSG)

### 后端优化
- ✅ API 路由缓存
- ✅ GitHub API 速率限制管理
- ✅ 数据库连接池 (如使用)
- ✅ 响应压缩 (Gzip/Brotli)

### 网络优化
- ✅ CDN (Vercel Edge Network)
- ✅ HTTP/2 支持
- ✅ 资源预加载
- ✅ Service Worker (PWA)

---

## 🧪 测试策略

### 测试金字塔
```
         /\
        /  \
       / E2E \      (Playwright)
      /______\
     /        \
    / Integration\   (API Tests)
   /______________\
  /                \
 /    Unit Tests    \  (Vitest)
/____________________\
```

### 测试文件结构
```
app/
├── __tests__/
│   ├── components/
│   │   ├── MemberCard.test.tsx
│   │   └── TaskBoard.test.tsx
│   ├── hooks/
│   │   └── useDashboardData.test.ts
│   └── api/
│       └── dashboard.test.ts
```

---

## 📈 监控与日志

### 监控指标
- 页面加载时间
- API 响应时间
- 错误率
- 用户活跃度
- AI 任务完成率

### 日志系统
```
logs/
├── access.log          # 访问日志
├── error.log           # 错误日志
└── ai-tasks/
    └── 2026-03-06.log  # AI 任务日志
```

---

## 🔮 未来架构演进

### Q2 2026
- [ ] 多模态 AI 支持 (图像/音频)
- [ ] WebSocket 实时通信
- [ ] Redis 缓存层

### Q3 2026
- [ ] 微服务拆分
- [ ] 消息队列 (RabbitMQ/Kafka)
- [ ] 分布式任务调度

### Q4 2026
- [ ] Kubernetes 编排
- [ ] 服务网格 (Istio)
- [ ] 全球 CDN 部署

---

## 📚 相关文档

- [快速开始](./QUICKSTART.md) - 5 分钟部署
- [开发指南](./DEVELOPMENT.md) (待创建)
- [部署文档](../DEPLOYMENT.md)
- [API 参考](./API-REFERENCE.md)

---

**架构版本**: v1.0.0  
**最后审查**: 2026-03-06  
**下次审查**: 2026-04-06
