# 7zi-frontend 功能规划路线图

> 架构师：功能规划文档
> 日期：2026-03-07
> 版本：v1.0

---

## 一、当前架构分析

### 1.1 技术栈概览

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 16.2.1 |
| UI | React | 19.2.4 |
| 样式 | Tailwind CSS | 4.x |
| 状态管理 | Zustand | 5.0.11 |
| 国际化 | next-intl | 4.8.3 |
| 测试 | Vitest + Playwright | 最新 |
| 监控 | Sentry | 10.42.0 |

### 1.2 当前功能模块

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # 国际化路由
│   │   ├── about/         # 关于页面 ✅
│   │   ├── blog/          # 博客页面 🚧 (只有 error.tsx)
│   │   ├── contact/       # 联系页面 ✅
│   │   ├── dashboard/     # 仪表板 🚧 (只有 error.tsx)
│   │   ├── portfolio/     # 作品集 ✅
│   │   └── team/          # 团队页面 ✅
│   └── api/               # API 路由
│       ├── github/        # GitHub API 代理 ✅
│       ├── health/        # 健康检查 ✅
│       └── csrf-token/    # CSRF 保护 ✅
├── components/            # 组件库 (50+ 组件)
├── hooks/                 # 自定义 Hooks (10+)
├── stores/                # Zustand Stores
├── lib/                   # 工具库
│   ├── export/           # 数据导出 ✅
│   ├── monitoring/       # 性能监控 ✅
│   ├── validation/       # 表单验证 ✅
│   └── seo.ts            # SEO 优化 ✅
└── types/                 # TypeScript 类型定义
```

### 1.3 架构优势

1. **现代化技术栈** - Next.js 16 + React 19，支持最新特性
2. **完善的国际化** - next-intl 多语言支持
3. **性能监控完备** - Web Vitals + Sentry 集成
4. **测试覆盖良好** - 单元测试 + E2E 测试
5. **PWA 支持** - Service Worker 注册
6. **SEO 优化** - 结构化数据 + 元数据管理

### 1.4 架构改进点

| 问题 | 现状 | 影响 | 优先级 |
|------|------|------|--------|
| Dashboard 页面缺失 | 只有 error.tsx | 核心功能不完整 | 🔴 高 |
| 文件管理未实现 | 无具体组件 | 功能缺失 | 🟡 中 |
| 搜索功能缺失 | 无搜索组件 | 用户体验受限 | 🟡 中 |
| 实时协作弱 | 轮询 GitHub API | 实时性差 | 🟡 中 |
| 用户认证缺失 | 无认证系统 | 多用户场景受限 | 🟡 中 |
| 数据持久化不足 | GitHub + 硬编码 | 数据独立性差 | 🟡 中 |

---

## 二、新功能规划

### 2.1 功能一：实时协作看板 (Real-time Kanban)

**价值定位：** 从静态任务展示升级为实时协作工具

#### 功能描述

- WebSocket 实时同步任务状态
- 拖拽式任务管理
- 成员在线状态实时显示
- 任务评论和讨论
- 活动流实时更新

#### 技术方案

```typescript
// 技术栈
- Socket.io / WebSocket (实时通信)
- React DnD / dnd-kit (拖拽)
- SWR 或 React Query (数据同步)

// 架构设计
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   Client A      │◄──────────────────►│                 │
│   (浏览器)       │                    │   Socket        │
├─────────────────┤                    │   Server        │
│   Client B      │◄──────────────────►│   (Next.js API) │
│   (浏览器)       │                    │                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │   数据存储       │
                                       │   (Redis/DB)    │
                                       └─────────────────┘
```

#### 技术复杂度

| 维度 | 评分 | 说明 |
|------|------|------|
| 前端开发 | ⭐⭐⭐ (3/5) | 拖拽 + 实时状态管理 |
| 后端开发 | ⭐⭐⭐⭐ (4/5) | WebSocket 服务 + 数据同步 |
| 测试难度 | ⭐⭐⭐ (3/5) | 实时场景测试复杂 |
| 运维成本 | ⭐⭐⭐ (3/5) | 需要持久化连接管理 |

**预估工时：** 2-3 周

---

### 2.2 功能二：AI 智能助手集成 (AI Assistant Hub)

**价值定位：** 将 11 位 AI 成员从展示卡片升级为可交互助手

#### 功能描述

- AI 成员聊天界面
- 任务分配和进度追踪
- 代码审查建议
- 文档生成
- 智能搜索和问答

#### 技术方案

```typescript
// 技术栈
- AI SDK (Vercel AI SDK / LangChain)
- 流式响应 (Streaming)
- MCP 协议 (已有基础架构)

// 组件设计
<AIAssistantHub>
  ├── <MemberSelector />      // 选择 AI 成员
  ├── <ChatInterface />       // 聊天界面
  │     ├── <MessageList />
  │     └── <ChatInput />
  ├── <TaskPanel />           // 任务面板
  └── <ActivityFeed />        // 活动流
</AIAssistantHub>
```

#### API 设计

```typescript
// API 路由: /api/ai/chat
POST /api/ai/chat
{
  "memberId": "architect",
  "message": "帮我设计用户认证系统",
  "context": {
    "projectType": "web-app",
    "techStack": ["Next.js", "TypeScript"]
  }
}

// 流式响应
Response: ReadableStream<ChatCompletionChunk>
```

#### 技术复杂度

| 维度 | 评分 | 说明 |
|------|------|------|
| 前端开发 | ⭐⭐⭐ (3/5) | 聊天 UI + 流式渲染 |
| 后端开发 | ⭐⭐⭐⭐ (4/5) | AI 模型集成 + 上下文管理 |
| 测试难度 | ⭐⭐ (2/5) | Mock AI 响应即可 |
| 运维成本 | ⭐⭐⭐⭐ (4/5) | AI API 成本 + 限流 |

**预估工时：** 3-4 周

---

### 2.3 功能三：高级搜索系统 (Smart Search)

**价值定位：** 提供全站智能搜索能力

#### 功能描述

- 全局搜索（任务、文档、代码）
- 模糊搜索和联想
- 搜索历史
- 高级过滤
- 搜索结果高亮

#### 技术方案

```typescript
// 技术栈
- FlexSearch / Fuse.js (客户端搜索)
- 或 Meilisearch / Algolia (服务端搜索)

// 搜索索引设计
interface SearchIndex {
  id: string;
  type: 'task' | 'document' | 'code' | 'member';
  title: string;
  content: string;
  tags: string[];
  url: string;
  updatedAt: Date;
}

// 搜索组件
<GlobalSearch>
  ├── <SearchInput />         // 搜索输入
  ├── <SearchSuggestions />   // 联想建议
  ├── <SearchFilters />       // 过滤器
  └── <SearchResults />       // 结果列表
</GlobalSearch>
```

#### 技术复杂度

| 维度 | 评分 | 说明 |
|------|------|------|
| 前端开发 | ⭐⭐ (2/5) | 搜索 UI + 交互 |
| 后端开发 | ⭐⭐⭐ (3/5) | 索引构建 + 搜索 API |
| 测试难度 | ⭐⭐ (2/5) | 搜索结果验证 |
| 运维成本 | ⭐⭐ (2/5) | 索引存储 |

**预估工时：** 1-2 周

---

### 2.4 功能四：用户认证与权限系统 (Auth & Permissions)

**价值定位：** 支持多用户协作场景

#### 功能描述

- 用户注册/登录
- OAuth 集成（GitHub、Google）
- 角色权限管理
- 团队管理
- 操作审计日志

#### 技术方案

```typescript
// 技术栈
- NextAuth.js / Auth.js (认证)
- Prisma (ORM)
- PostgreSQL / MySQL (数据库)

// 权限模型
enum Role {
  OWNER = 'owner',       // 所有者
  ADMIN = 'admin',       // 管理员
  MEMBER = 'member',     // 成员
  VIEWER = 'viewer',     // 访客
}

// 权限配置
const PERMISSIONS = {
  owner: ['*'],
  admin: ['read', 'write', 'delete', 'invite'],
  member: ['read', 'write', 'comment'],
  viewer: ['read', 'comment'],
};
```

#### 技术复杂度

| 维度 | 评分 | 说明 |
|------|------|------|
| 前端开发 | ⭐⭐⭐ (3/5) | 登录 UI + 权限控制 |
| 后端开发 | ⭐⭐⭐⭐ (4/5) | 认证流程 + 权限验证 |
| 测试难度 | ⭐⭐⭐ (3/5) | 认证流程测试 |
| 运维成本 | ⭐⭐⭐ (3/5) | 数据库 + 安全维护 |

**预估工时：** 2-3 周

---

### 2.5 功能五：数据可视化仪表板 (Analytics Dashboard)

**价值定位：** 提供项目洞察和数据分析

#### 功能描述

- 任务完成趋势图
- 成员贡献统计
- 代码质量指标
- 自定义报表
- 数据导出增强

#### 技术方案

```typescript
// 技术栈
- Recharts / Chart.js (图表库)
- 或 Apache ECharts (高级可视化)

// 图表组件
<AnalyticsDashboard>
  ├── <TaskTrendChart />      // 任务趋势
  ├── <MemberStats />         // 成员统计
  ├── <CodeQualityMetrics />  // 代码质量
  ├── <ActivityHeatmap />     // 活动热力图
  └── <CustomReports />       // 自定义报表
</AnalyticsDashboard>
```

#### 技术复杂度

| 维度 | 评分 | 说明 |
|------|------|------|
| 前端开发 | ⭐⭐⭐ (3/5) | 图表组件 + 交互 |
| 后端开发 | ⭐⭐ (2/5) | 统计 API |
| 测试难度 | ⭐⭐ (2/5) | 图表渲染验证 |
| 运维成本 | ⭐ (1/5) | 无额外成本 |

**预估工时：** 1-2 周

---

## 三、优先级排序

### 3.1 综合评估矩阵

| 功能 | 业务价值 | 技术复杂度 | 工时 | ROI | 优先级 |
|------|----------|------------|------|-----|--------|
| AI 智能助手集成 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4周 | 高 | **P0** |
| 实时协作看板 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3周 | 高 | **P1** |
| 用户认证系统 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3周 | 中 | **P2** |
| 高级搜索系统 | ⭐⭐⭐ | ⭐⭐ | 1-2周 | 高 | **P1** |
| 数据可视化仪表板 | ⭐⭐⭐ | ⭐⭐⭐ | 1-2周 | 中 | **P2** |

### 3.2 推荐实施路线

```
Phase 1 (Q2 2026) - 核心能力
├── AI 智能助手集成 (P0)
│   └── 让 11 位 AI 成员真正"活"起来
└── 高级搜索系统 (P1)
    └── 提升全站可用性

Phase 2 (Q3 2026) - 协作增强
├── 实时协作看板 (P1)
│   └── WebSocket 实时同步
└── 用户认证系统 (P2)
    └── 支持多用户场景

Phase 3 (Q4 2026) - 数据洞察
└── 数据可视化仪表板 (P2)
    └── 项目分析与报表
```

---

## 四、技术方案概述

### 4.1 整体架构演进

```
当前架构 (v1.0)
┌─────────────────────────────────────┐
│           Next.js 应用               │
│  ┌─────────┐  ┌─────────┐          │
│  │ Pages   │  │ API     │          │
│  │ (SSG)   │  │ Routes  │          │
│  └─────────┘  └─────────┘          │
│       │            │                │
│       ▼            ▼                │
│  ┌─────────┐  ┌─────────┐          │
│  │ Zustand │  │ GitHub  │          │
│  │ Store   │  │ API     │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘

目标架构 (v2.0)
┌─────────────────────────────────────┐
│           Next.js 应用               │
│  ┌─────────┐  ┌─────────┐          │
│  │ Pages   │  │ API     │──┐       │
│  │ (SSR)   │  │ Routes  │  │       │
│  └─────────┘  └─────────┘  │       │
│       │            │       │       │
│       ▼            ▼       ▼       │
│  ┌─────────┐  ┌─────────┐  ┌────┐ │
│  │ Zustand │  │ Backend │  │ WS │ │
│  │ Store   │  │ Services│  │Server│ │
│  └─────────┘  └─────────┘  └────┘ │
│                    │                │
└────────────────────┼────────────────┘
                     ▼
       ┌─────────────────────────┐
       │     数据层               │
       │  ┌────────┐  ┌────────┐ │
       │  │ DB     │  │ Redis  │ │
       │  │(Prisma)│  │(Cache) │ │
       │  └────────┘  └────────┘ │
       └─────────────────────────┘
```

### 4.2 关键技术选型

| 领域 | 方案 A | 方案 B | 推荐 |
|------|--------|--------|------|
| 实时通信 | Socket.io | WebSocket API | Socket.io (更完善的生态) |
| AI 集成 | Vercel AI SDK | LangChain | Vercel AI SDK (与 Next.js 集成更好) |
| 搜索 | FlexSearch | Meilisearch | FlexSearch (初期) / Meilisearch (后期) |
| 认证 | NextAuth.js | Clerk | NextAuth.js (自托管) |
| 图表 | Recharts | ECharts | Recharts (React 友好) |
| 数据库 | PostgreSQL | MySQL | PostgreSQL (JSON 支持更好) |

### 4.3 代码结构规划

```
src/
├── app/
│   ├── [locale]/
│   │   ├── dashboard/         # 仪表板 (重点开发)
│   │   ├── workspace/         # 工作空间 (新增)
│   │   └── settings/          # 设置页面 (新增)
│   └── api/
│       ├── ai/                # AI API (新增)
│       ├── auth/              # 认证 API (新增)
│       ├── search/            # 搜索 API (新增)
│       └── analytics/         # 分析 API (新增)
├── components/
│   ├── ai/                    # AI 组件 (新增)
│   ├── search/                # 搜索组件 (新增)
│   ├── dashboard/             # 仪表板组件 (新增)
│   └── auth/                  # 认证组件 (新增)
├── hooks/
│   ├── useAI.ts              # AI Hook (新增)
│   ├── useSearch.ts          # 搜索 Hook (新增)
│   └── useAuth.ts            # 认证 Hook (新增)
├── lib/
│   ├── ai/                   # AI 服务 (新增)
│   ├── search/               # 搜索服务 (新增)
│   └── auth/                 # 认证服务 (新增)
└── types/
    ├── ai.ts                 # AI 类型 (新增)
    ├── search.ts             # 搜索类型 (新增)
    └── auth.ts               # 认证类型 (新增)
```

---

## 五、风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| AI API 成本超预期 | 中 | 高 | 实施请求限流 + 缓存策略 |
| WebSocket 连接不稳定 | 低 | 中 | 实现断线重连 + 离线队列 |
| 数据库性能瓶颈 | 低 | 高 | Redis 缓存 + 读写分离 |
| 认证安全漏洞 | 低 | 极高 | 安全审计 + 渗透测试 |

---

## 六、总结

### 核心建议

1. **优先实现 AI 智能助手集成** - 这是项目的核心差异化能力
2. **搜索系统快速落地** - 低成本高收益
3. **实时协作逐步演进** - 从轮询到 WebSocket 渐进式迁移
4. **认证系统按需实现** - 根据用户场景决定优先级

### 下一步行动

1. [ ] 确认 Phase 1 功能优先级
2. [ ] 创建 AI 智能助手的技术设计文档
3. [ ] 搭建搜索系统原型
4. [ ] 评估 AI API 成本预算

---

*文档维护：架构师*
*更新日期：2026-03-07*