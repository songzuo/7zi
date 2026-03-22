# 系统架构优化设计方案

**版本:** 1.0  
**日期:** 2026-03-06  
**架构师:** AI 架构师  
**状态:** 初稿

---

## 1. 当前架构分析

### 1.1 现有系统组成

```
┌─────────────────────────────────────────────────────────────┐
│                        7zi 系统架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│   │   前端      │     │   OpenClaw  │     │   Next.js   │  │
│   │  (Dashboard)│◄───►│  (AI 框架)  │◄───►│  (Web 服务) │  │
│   │             │     │             │     │             │  │
│   └─────────────┘     └─────────────┘     └─────────────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             │                               │
│                      ┌──────▼──────┐                        │
│                      │  11 位 AI   │                        │
│                      │  子代理团队  │                        │
│                      └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 现有组件

| 组件 | 技术 | 状态 |
|------|------|------|
| 前端框架 | Next.js 14 | ✅ 运行中 |
| AI 框架 | OpenClaw | ✅ 运行中 |
| 样式 | Tailwind CSS 3.0 | ✅ 使用中 |
| 状态管理 | React Hooks | ✅ 基础 |
| 部署 | Vercel + GitHub Actions | ✅ 运行中 |
| 服务器 | 7zi.com (SSH问题) | ⚠️ 待修复 |

### 1.3 识别的问题

1. **前端架构问题**
   - 状态管理依赖简单 React Hooks，无全局状态库
   - lib/ 和 store/ 目录为空，缺少数据层抽象
   - 组件复用性低

2. **AI 系统问题**
   - 子代理定义分散在 subagents/ 目录
   - 缺少统一的代理通信协议
   - 记忆系统不完善

3. **部署问题**
   - SSH 连接问题影响服务器部署
   - 缺少 Docker 化部署流程
   - 无监控和日志系统

4. **扩展性问题**
   - 当前仅单一服务器
   - 无负载均衡
   - 无缓存层

---

## 2. 优化方案

### 2.1 前端架构优化

#### 2.1.1 状态管理改进

**方案 A: 引入 Zustand (推荐)**
- 轻量级，仅 1KB
- 无 Provider 嵌套
- 支持 TypeScript

```typescript
// store/useTeamStore.ts
import { create } from 'zustand'

interface TeamState {
  members: Member[]
  tasks: Task[]
  addTask: (task: Task) => void
  updateMemberStatus: (id: string, status: Status) => void
}

export const useTeamStore = create<TeamState>((set) => ({
  members: [],
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateMemberStatus: (id, status) => set((state) => ({
    members: state.members.map(m => m.id === id ? { ...m, status } : m)
  })),
}))
```

**方案 B: 引入 TanStack Query**
- 服务端状态管理
- 自动缓存和同步
- 适合 API 数据

#### 2.1.2 组件架构优化

```
components/
├── ui/              # 基础 UI 组件 (Button, Input, Card)
├── layout/          # 布局组件 (Header, Sidebar, Footer)
├── team/            # 团队相关组件 (MemberCard, TaskBoard)
├── dashboard/       # Dashboard 组件 (ProgressChart, ActivityLog)
└── ai/              # AI 对话组件 (ChatWindow, MessageBubble)
```

**改进措施:**
1. 建立 Storybook 组件库文档
2. 统一组件 Props 接口
3. 实现组件懒加载

### 2.2 AI 系统架构优化

#### 2.2.1 子代理系统重构

**当前结构:**
```
subagents/
├── director.md      # 主管
├── architect.md     # 架构师
├── consultant.md    # 咨询师
└── ... (11个文件)
```

**优化后结构:**
```
agents/
├── base/            # 基础代理类
│   ├── Agent.ts     # 抽象基类
│   └── types.ts     # 类型定义
├── roles/           # 角色定义
│   ├── director/
│   ├── architect/
│   └── ...
├── protocols/       # 通信协议
│   ├── message.ts   # 消息格式
│   └── task.ts      # 任务协议
└── memory/          # 记忆系统
    ├── short-term.ts
    └── long-term.ts
```

#### 2.2.2 代理通信协议

```typescript
// types/AgentProtocol.ts

// 消息类型
enum MessageType {
  TASK = 'task',
  RESULT = 'result',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
}

// 任务协议
interface AgentTask {
  id: string
  type: TaskType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  payload: any
  deadline?: Date
  assignedTo: string[]
  context?: string
}

// 代理响应
interface AgentResponse {
  taskId: string
  agentId: string
  status: 'accepted' | 'completed' | 'failed'
  result?: any
  error?: string
  timestamp: Date
}
```

### 2.3 后端服务优化

#### 2.3.1 API 层架构

```
app/api/
├── agents/          # AI 代理 API
│   ├── task/        # 任务分发
│   ├── status/      # 状态查询
│   └── result/      # 结果获取
├── team/            # 团队管理 API
│   ├── members/     # 成员管理
│   ├── meetings/    # 会议管理
│   └── reports/     # 报告生成
└── system/          # 系统 API
    ├── health/      # 健康检查
    ├── config/      # 配置管理
    └── logs/        # 日志查询
```

#### 2.3.2 数据层抽象

```typescript
// lib/db/index.ts
import { createClient } from '@supabase/supabase-js'

// 使用 Supabase 作为数据后端
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 数据访问层
export const teamDb = {
  members: {
    list: () => supabase.from('members').select('*'),
    get: (id: string) => supabase.from('members').select('*').eq('id', id),
    update: (id: string, data: any) => supabase.from('members').update(data).eq('id', id),
  },
  tasks: {
    create: (task: any) => supabase.from('tasks').insert(task),
    list: () => supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    update: (id: string, data: any) => supabase.from('tasks').update(data).eq('id', id),
  },
}
```

### 2.4 部署架构优化

#### 2.4.1 多服务器部署

```
                    ┌─────────────┐
                    │   负载均衡  │
                    │  (Nginx)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Server 1│       │ Server 2│       │ Server 3│
   │ (Web)   │       │ (API)   │       │ (AI)    │
   └─────────┘       └─────────┘       └─────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  数据库集群  │
                    │ (PostgreSQL)│
                    └─────────────┘
```

#### 2.4.2 Docker 化部署

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OPENCLAW_API=${OPENCLAW_API}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### 2.5 监控与日志系统

#### 2.5.1 日志架构

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
})

// 结构化日志
export function logAgentAction(agent: string, action: string, data: any) {
  logger.info({ agent, action, ...data }, 'Agent Action')
}

export function logError(error: Error, context: any) {
  logger.error({ error: error.message, stack: error.stack, ...context }, 'Error')
}
```

#### 2.5.2 监控指标

| 指标 | 描述 | 阈值 |
|------|------|------|
| 响应时间 | API 平均响应时间 | < 500ms |
| 任务完成率 | 子代理任务完成率 | > 90% |
| 活跃代理数 | 当前活跃 AI 代理 | 11/11 |
| 错误率 | 系统错误率 | < 1% |

---

## 3. 实施计划

### 3.1 第一阶段: 基础优化 (Week 1-2)

| 任务 | 描述 | 优先级 | 负责人 |
|------|------|--------|--------|
| 状态管理 | 引入 Zustand | 高 | 设计师 |
| 组件重构 | 建立组件目录结构 | 高 | 设计师 |
| API 规范 | 制定 API 设计规范 | 中 | 架构师 |

### 3.2 第二阶段: AI 系统优化 (Week 3-4)

| 任务 | 描述 | 优先级 | 负责人 |
|------|------|--------|--------|
| 代理重构 | 重构子代理系统 | 高 | 架构师 |
| 通信协议 | 实现代理通信协议 | 高 | Executor |
| 记忆系统 | 完善记忆系统 | 中 | 智能体专家 |

### 3.3 第三阶段: 部署优化 (Week 5-6)

| 任务 | 描述 | 优先级 | 负责人 |
|------|------|--------|--------|
| Docker | Docker 化部署 | 高 | 系统管理员 |
| 监控 | 集成监控系统 | 中 | 系统管理员 |
| CI/CD | 优化部署流程 | 高 | Executor |

---

## 4. 技术选型总结

| 领域 | 当前 | 优化后 | 理由 |
|------|------|--------|------|
| 状态管理 | React Hooks | Zustand | 轻量、TypeScript 友好 |
| API 状态 | 无 | TanStack Query | 自动缓存、同步 |
| 数据存储 | 本地 | Supabase | 快速开发、实时订阅 |
| 日志 | console | Pino | 结构化、高性能 |
| 部署 | SSH | Docker | 可复现、可扩展 |

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SSH 连接问题 | 部署延迟 | 使用 Vercel 替代部署 |
| 子代理通信 | 系统不稳定 | 先本地测试 |
| 数据迁移 | 数据丢失 | 备份现有数据 |

---

## 6. 后续建议

1. **短期**: 修复 SSH 问题，完成基础优化
2. **中期**: 实现 Docker 部署，添加监控系统
3. **长期**: 实现多服务器集群，支持高并发

---

**文档状态**: 已完成初稿  
**下一步**: 提交评审会议讨论
