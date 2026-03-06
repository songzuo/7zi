# 7zi-frontend 功能规划文档

> 创建时间: 2026-03-06  
> 规划者: 架构师  
> 项目: 7zi-frontend (Next.js 16 + React 19)

---

## 📊 现有功能分析

### 已实现模块

| 模块 | 路由 | 功能描述 |
|------|------|----------|
| 首页 | `/` | 多语言首页，Hero3D 动画 |
| 关于我们 | `/about` | 公司介绍 |
| 团队成员 | `/team` | 11 位 AI 成员展示 |
| 联系我们 | `/contact` | 联系表单 (EmailJS/Resend) |
| 博客 | `/blog` | 文章列表和详情 |
| Dashboard | `/dashboard` | AI 团队实时看板 |
| AI 聊天 | 全局组件 | 浮动聊天窗口 |

### 技术栈

```
前端框架: Next.js 16.1.6 (App Router)
UI 库: React 19.2.3
样式: Tailwind CSS 4
国际化: next-intl
监控: Sentry
邮件: Resend + EmailJS
测试: Vitest + Playwright
```

---

## 🚀 新功能规划

### 功能一：项目案例展示模块 (Portfolio)

#### 功能描述

展示团队已完成的项目案例，支持：
- 项目卡片网格展示
- 项目详情页（技术栈、截图、客户评价）
- 按类别筛选（网站、App、AI 项目等）
- 案例搜索功能

#### 技术实现方案

```
目录结构:
src/app/portfolio/
├── page.tsx          # 项目列表页
├── [slug]/page.tsx   # 项目详情页
└── PortfolioGrid.tsx # 项目网格组件

数据结构:
interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'website' | 'app' | 'ai' | 'design';
  thumbnail: string;
  images: string[];
  techStack: string[];
  client?: string;
  duration: string;
  highlights: string[];
  testimonial?: {
    author: string;
    content: string;
    avatar?: string;
  };
  links: {
    live?: string;
    github?: string;
  };
}

实现要点:
1. 静态数据 + JSON 文件管理项目信息
2. 使用 Next.js Image 组件优化图片
3. 客户端筛选和搜索（无需后端）
4. 响应式网格布局（1/2/3 列）
5. 项目详情页支持 OG 图片分享
```

#### 预估工作量

| 任务 | 工时 |
|------|------|
| 数据结构设计 + 示例数据 | 2h |
| 项目列表页 + 筛选组件 | 4h |
| 项目详情页 | 3h |
| 响应式适配 + 动画 | 2h |
| SEO 优化 + 测试 | 2h |
| **总计** | **13h (约 2 天)** |

---

### 功能二：AI 任务分配系统

#### 功能描述

让用户可以创建任务并自动/手动分配给 AI 团队成员：
- 任务创建表单（标题、描述、优先级、类型）
- 智能推荐分配（根据成员专长）
- 任务状态流转（待分配 → 进行中 → 已完成）
- 任务评论和更新记录
- 与现有 Dashboard 集成

#### 技术实现方案

```
目录结构:
src/app/tasks/
├── page.tsx           # 任务列表
├── new/page.tsx       # 创建任务
├── [id]/page.tsx      # 任务详情
└── components/
    ├── TaskForm.tsx
    ├── TaskCard.tsx
    └── AssignmentSuggester.tsx

数据结构:
interface Task {
  id: string;
  title: string;
  description: string;
  type: 'development' | 'design' | 'research' | 'marketing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  assignee?: string; // AI member id
  createdBy: 'user' | 'ai';
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
  history: StatusChange[];
}

智能分配算法:
1. 根据任务类型匹配成员角色
   - development → Executor, 架构师
   - design → 设计师
   - research → 咨询师, 智能体世界专家
   - marketing → 推广专员, 媒体
2. 考虑成员当前状态（优先分配空闲成员）
3. 考虑成员历史完成数量（负载均衡）

状态管理:
- 使用 React Context 或 Zustand
- 本地存储持久化（localStorage）
- 可选：接入 GitHub Issues API 同步
```

#### 预估工作量

| 任务 | 工时 |
|------|------|
| 数据结构 + 状态管理 | 3h |
| 任务创建表单 + 验证 | 4h |
| 智能分配算法 | 3h |
| 任务列表 + 详情页 | 4h |
| Dashboard 集成 | 2h |
| 测试 + 优化 | 2h |
| **总计** | **18h (约 3 天)** |

---

### 功能三：实时协作工作区

#### 功能描述

为用户提供与 AI 团队实时协作的空间：
- 实时文档编辑（Markdown）
- 实时聊天（WebSocket）
- 协作白板（简单绘图）
- 文件共享
- 活动状态显示（谁在线、谁在编辑）

#### 技术实现方案

```
目录结构:
src/app/workspace/
├── page.tsx              # 工作区入口
├── [id]/page.tsx         # 具体工作区
└── components/
    ├── CollaborativeEditor.tsx
    ├── RealtimeChat.tsx
    ├── Whiteboard.tsx
    ├── FileDropzone.tsx
    └── PresenceIndicator.tsx

技术选型:
1. 实时通信: Socket.io 或 Pusher
2. 文档编辑: TipTap 或 Slate.js
3. 白板: Excalidraw 或 Fabric.js
4. 文件存储: 本地 + 云存储 (可选)

简化版实现（MVP）:
- 第一阶段：本地协作（无后端）
  - 本地 Markdown 编辑器
  - 本地聊天记录
  - 本地白板（Canvas）
  - 导出/导入功能

- 第二阶段：接入后端
  - WebSocket 实时同步
  - 多用户协作
  - 云端存储

数据结构:
interface Workspace {
  id: string;
  name: string;
  documents: Document[];
  chatMessages: ChatMessage[];
  whiteboardData: WhiteboardState;
  files: SharedFile[];
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}
```

#### 预估工作量

**MVP 版本（本地协作）：**

| 任务 | 工时 |
|------|------|
| 工作区布局 + 路由 | 2h |
| Markdown 编辑器集成 | 4h |
| 本地聊天组件 | 3h |
| 简易白板（Canvas） | 4h |
| 文件拖拽上传 | 2h |
| 数据持久化 | 2h |
| 测试 + 优化 | 2h |
| **MVP 总计** | **19h (约 3 天)** |

**完整版（实时协作）：**

| 任务 | 工时 |
|------|------|
| WebSocket 服务端 | 4h |
| 实时同步逻辑 | 6h |
| 多用户状态管理 | 4h |
| 冲突解决 | 3h |
| **完整版增量** | **17h (约 2-3 天)** |

---

## 📈 优先级建议

| 功能 | 价值 | 复杂度 | 建议优先级 |
|------|------|--------|------------|
| 项目案例展示 | ⭐⭐⭐⭐⭐ | ⭐⭐ | **P0 - 立即开始** |
| AI 任务分配 | ⭐⭐⭐⭐ | ⭐⭐⭐ | **P1 - 第二优先** |
| 实时协作工作区 | ⭐⭐⭐ | ⭐⭐⭐⭐ | **P2 - MVP 先行** |

### 推荐实施顺序

```
Week 1: 项目案例展示模块 (13h)
  → 快速上线，展示团队实力

Week 2: AI 任务分配系统 (18h)
  → 核心功能，提升用户参与度

Week 3-4: 实时协作工作区 MVP (19h)
  → 差异化功能，增强竞争力

后续: 实时协作完整版 (17h)
  → 根据用户反馈迭代
```

---

## 🔧 技术债务提醒

在开发新功能前，建议先处理：

1. **添加状态管理** - 考虑引入 Zustand（轻量级）
2. **API 层抽象** - 创建统一的 API 服务层
3. **组件库整理** - 抽取通用组件到 `components/shared/`
4. **测试覆盖** - 新功能需同步编写测试

---

## 📝 备注

- 所有工时估算基于单人开发
- 实际时间可能因需求变更调整
- 建议每个功能完成后进行代码评审
- 新功能需更新相关文档

---

*文档由架构师生成，如有疑问请联系团队讨论。*