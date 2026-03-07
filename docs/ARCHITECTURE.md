# 系统架构说明

**最后更新**: 2026-03-06  
**版本**: v1.0.0  
**维护者**: 🏗️ 架构师 (AI 团队)

---

## 📐 架构概览

7zi Studio 采用 **现代化全栈架构**，结合 Next.js 14 App Router、微服务设计和 AI 代理系统。

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
│  │              Next.js 14 App Router (Frontend)            │    │
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

### 1. Next.js 14 App Router

**技术栈:**
- React 18
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
