# AI Agent 调度 Dashboard UI 设计文档

> **7zi 项目 - 前端设计规范**
> 版本: 1.0.0 | 日期: 2026-04-10
> 设计目标: 为 AI Agent 调度系统提供清晰、高效的监控与管理界面

---

## 目录

1. [设计理念](#设计理念)
2. [整体布局](#整体布局)
3. [核心组件](#核心组件)
4. [页面结构](#页面结构)
5. [交互规范](#交互规范)
6. [数据模型](#数据模型)
7. [实现示例](#实现示例)

---

## 设计理念

### 核心目标

- **一目了然**: 3 秒内了解系统整体状态
- **高效调度**: 快速查看、分配、监控任务
- **实时响应**: WebSocket 驱动的 live 数据更新
- **清晰分层**: 活跃任务 → 队列 → 统计数据

### 设计风格

- **风格**: 现代控制台 (Modern Dashboard)
- **配色**: 深色模式优先，蓝色主调，状态色语义化
- **字体**: Inter + 中文思源黑体
- **圆角**: 8px / 12px / 16px 三级圆角系统
- **阴影**: 微妙的层叠阴影，强调层次感

---

## 整体布局

```
┌─────────────────────────────────────────────────────────────────┐
│  顶部导航栏 (64px)                                               │
│  [Logo] [导航标签] [搜索] [通知 🔔] [用户头像 ▼]                    │
├───────────┬─────────────────────────────────────────────────────┤
│  侧边栏    │  主内容区                                           │
│  (240px)  │                                                     │
│           │  ┌─────────────────────────────────────────────┐    │
│  📊 Dashboard│  │  统计卡片区 (4 列)                          │    │
│  🤖 任务    │  │  [总任务] [运行中] [队列] [成功率]            │    │
│  📋 队列    │  └─────────────────────────────────────────────┘    │
│  📈 统计    │                                                     │
│  ⚙️ 设置    │  ┌───────────────────┐ ┌───────────────────────┐  │
│           │  │  活跃任务列表       │ │  任务队列 (滚动)        │  │
│           │  │  (最近 5 个)        │ │  (等待调度的任务)        │  │
│           │  │                     │ │                        │  │
│           │  │                     │ │                        │  │
│           │  └───────────────────┘ └───────────────────────┘  │
│           │                                                     │
│           │  ┌─────────────────────────────────────────────┐  │
│           │  │  Agent 网格视图 (3-4 列)                      │  │
│           │  │  每个 Agent 显示: 状态/任务/CPU/内存          │  │
│           │  └─────────────────────────────────────────────┘  │
└───────────┴─────────────────────────────────────────────────────┘
```

### 响应式断点

| 断点 | 布局 |
|------|------|
| < 640px (手机) | 单列堆叠，侧边栏折叠为汉堡菜单 |
| 640-1024px (平板) | 侧边栏收起，2 列网格 |
| > 1024px (桌面) | 完整布局，3-4 列网格 |

---

## 核心组件

### 1. StatCard (统计卡片)

```tsx
// 位置: src/components/dashboard/StatCard.tsx
interface StatCardProps {
  title: string;          // "总任务数"
  value: number | string; // 1,234
  change?: number;        // +12.5% 变化率
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;   // <ActivityIcon />
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}
```

**视觉规范**:
- 尺寸: 满宽自适应，高度 120px
- 圆角: 12px
- 背景: `bg-gray-900` (深色模式) / `bg-white` (浅色模式)
- 左侧色条: 4px 状态色
- 数值: 36px 加粗
- 变化率: 绿色 ↑ 红色 ↓

---

### 2. ActiveTaskPanel (活跃任务面板)

```tsx
// 位置: src/components/dashboard/ActiveTaskPanel.tsx
interface ActiveTaskPanelProps {
  tasks: ActiveTask[];
  onTaskClick?: (task: ActiveTask) => void;
  onCancelTask?: (taskId: string) => void;
  maxDisplay?: number;  // 默认 5
}
```

**任务卡片字段**:
- 任务名称 (高亮)
- 所属 Agent (头像 + 名称)
- 执行时长 (计时器)
- 进度条 (实时更新)
- 操作按钮 (查看 / 取消)

**状态语义色**:
| 状态 | 颜色 | 图标 |
|------|------|------|
| `pending` | 灰 `#9CA3AF` | ⏳ |
| `running` | 蓝 `#3B82F6` | ⚡ (动画) |
| `completed` | 绿 `#10B981` | ✅ |
| `failed` | 红 `#EF4444` | ❌ |
| `cancelled` | 橙 `#F59E0B` | 🚫 |

---

### 3. TaskQueueList (任务队列)

```tsx
// 位置: src/components/dashboard/TaskQueueList.tsx
interface TaskQueueListProps {
  queue: QueuedTask[];
  onPriorityChange?: (taskId: string, newPriority: number) => void;
  onCancelQueued?: (taskId: string) => void;
  onDispatchNow?: (taskId: string) => void;
}
```

**队列卡片字段**:
- 任务名称
- 入队时间 + 等待时长
- 优先级 (P0-P3，色标)
- 预估执行时间
- 操作: 立即调度 / 上移 / 下移 / 取消

**优先级色标**:
| 优先级 | 标签色 | 含义 |
|--------|--------|------|
| P0 | 红 | 紧急 / 阻断 |
| P1 | 橙 | 高优 |
| P2 | 蓝 | 普通 |
| P3 | 灰 | 低优 |

---

### 4. AgentGrid (Agent 网格) — 扩展现有 AgentStatusPanel

```tsx
// 复用: src/components/dashboard/AgentStatusPanel.tsx
// 扩展以下功能:
interface AgentGridExtension {
  // 新增: 任务分配弹窗
  onAssignTask?: (agentId: string) => void;
  
  // 新增: 批量操作
  onBatchEnable?: (agentIds: string[]) => void;
  onBatchDisable?: (agentIds: string[]) => void;
  
  // 新增: 性能告警阈值
  alertThreshold?: {
    cpu?: number;    // 默认 80
    memory?: number; // 默认 85
  };
}
```

---

### 5. RealtimeChart (实时图表) — 可选集成

```tsx
// 位置: src/components/dashboard/RealtimeChart.tsx
interface RealtimeChartProps {
  metric: 'cpu' | 'memory' | 'throughput' | 'latency';
  timeRange?: '1m' | '5m' | '15m' | '1h';
  height?: number;  // 默认 200
}
```

**图表类型**:
- CPU/内存: 面积图 (实时流)
- 吞吐量: 柱状图
- 延迟: 折线图

---

### 6. QuickActions (快捷操作栏)

```tsx
// 位置: src/components/dashboard/QuickActions.tsx
interface QuickAction {
  id: string;
  label: string;       // "创建任务"
  icon: ReactNode;      // <PlusIcon />
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick: () => void;
  badge?: string;       // "3" 新任务数量
}
```

**默认快捷操作**:
1. ➕ 创建新任务 (primary)
2. 🔄 刷新全部 (ghost)
3. ⏸️ 暂停调度 (ghost, 切换为 ▶️ 恢复)
4. 📊 查看报告 (ghost)

---

## 页面结构

### Dashboard 主页面

```tsx
// 位置: src/app/dashboard/page.tsx
// 路由: /dashboard

'use client'

import { Dashboard } from '@/components/dashboard/Dashboard'

export default function DashboardPage() {
  return <Dashboard />
}
```

### Dashboard 组件

```tsx
// 位置: src/components/dashboard/Dashboard.tsx
export function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* 顶部导航 */}
      <TopNav />
      
      <div className="flex">
        {/* 侧边栏 */}
        <Sidebar />
        
        {/* 主内容 */}
        <main className="flex-1 p-6">
          {/* 页面标题 */}
          <PageHeader 
            title="AI Agent 调度中心" 
            subtitle="实时监控系统状态与任务执行"
          />
          
          {/* 统计卡片 */}
          <StatsRow />
          
          {/* 活跃任务 + 队列 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ActiveTaskPanel />
            <TaskQueueList />
          </div>
          
          {/* Agent 网格 */}
          <section className="mt-6">
            <SectionHeader 
              title="Agent 状态" 
              action={<Button variant="ghost" size="sm">查看全部 →</Button>}
            />
            <AgentStatusPanel />
          </section>
          
          {/* 实时图表 (可选) */}
          <section className="mt-6">
            <RealtimeChart metric="throughput" />
          </section>
        </main>
      </div>
    </div>
  )
}
```

---

## 交互规范

### 实时更新

- **技术**: WebSocket + SWR/React Query
- **刷新策略**: 
  - 活跃数据 (任务状态、Agent 心跳): 实时推送
  - 统计数据: 每 30 秒轮询
  - 用户操作后: 立即刷新

### 任务分配流程

```
1. 点击 "分配任务" 按钮
   ↓
2. 弹出 TaskAssignModal
   - 选择任务类型
   - 选择目标 Agent (显示负载/状态)
   - 设置优先级
   - 确认
   ↓
3. 任务进入队列
   ↓
4. 调度器自动分配 / 手动立即调度
   ↓
5. 任务状态实时更新
```

### 告警规则

| 条件 | 动作 | 视觉反馈 |
|------|------|---------|
| CPU > 80% | 警告 | 卡片边框变黄 |
| CPU > 95% | 严重 | 卡片边框变红 + 抖动 |
| Agent offline | 严重 | 卡片灰化 + 状态图标 |
| 队列积压 > 20 | 警告 | 队列标题显示 🔴 |
| 任务失败 | 通知 | Toast 弹窗 |

---

## 数据模型

### ActiveTask

```typescript
// 位置: src/types/agent-task.ts
export interface ActiveTask {
  id: string;
  name: string;
  type: 'design' | 'develop' | 'test' | 'deploy' | 'research' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;         // 0-100
  priority: 0 | 1 | 2 | 3; // P0-P3
  createdAt: string;        // ISO 8601
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number; // 秒
  agentId?: string;         // 分配给的 Agent
  agentName?: string;
  error?: string;           // 失败原因
}
```

### QueuedTask

```typescript
// 位置: src/types/agent-task.ts
export interface QueuedTask extends ActiveTask {
  queuePosition: number;
  waitingTime: number;      // 等待秒数
  estimatedExecutionTime?: number;
}
```

### AgentStats

```typescript
// 位置: src/types/agent-stats.ts
export interface AgentStats {
  totalTasks: number;
  completedToday: number;
  failedToday: number;
  avgExecutionTime: number; // 秒
  successRate: number;      // 0-100
  uptime: number;           // 百分比
}
```

### DashboardSummary

```typescript
// 位置: src/types/agent-task.ts
export interface DashboardSummary {
  totalTasks: number;
  runningTasks: number;
  queuedTasks: number;
  successRate: number;      // 今日
  activeAgents: number;
  totalAgents: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
}
```

---

## 实现示例

### Dashboard.tsx 主组件

```tsx
// src/components/dashboard/Dashboard.tsx
'use client'

import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { StatCard } from './StatCard'
import { ActiveTaskPanel } from './ActiveTaskPanel'
import { TaskQueueList } from './TaskQueueList'
import { AgentStatusPanel } from './AgentStatusPanel'
import { QuickActions } from './QuickActions'
import { DashboardSummary, ActiveTask, QueuedTask, Agent } from '@/types/agent-task'

interface DashboardProps {
  summary?: DashboardSummary
  activeTasks?: ActiveTask[]
  queuedTasks?: QueuedTask[]
  agents?: Agent[]
  loading?: boolean
  onRefresh?: () => void
  onCreateTask?: () => void
  onToggleScheduler?: (paused: boolean) => void
}

export function Dashboard({
  summary,
  activeTasks = [],
  queuedTasks = [],
  agents = [],
  loading = false,
  onRefresh,
  onCreateTask,
  onToggleScheduler,
}: DashboardProps) {
  const { t } = useTranslation()
  const [schedulerPaused, setSchedulerPaused] = React.useState(false)

  const handleToggleScheduler = useCallback(() => {
    setSchedulerPaused(p => !p)
    onToggleScheduler?.(!schedulerPaused)
  }, [schedulerPaused, onToggleScheduler])

  const quickActions = [
    {
      id: 'create',
      label: '创建任务',
      icon: <PlusIcon />,
      variant: 'primary' as const,
      onClick: onCreateTask ?? (() => {}),
    },
    {
      id: 'refresh',
      label: '刷新',
      icon: <RefreshIcon />,
      variant: 'ghost' as const,
      onClick: onRefresh ?? (() => {}),
    },
    {
      id: 'toggle',
      label: schedulerPaused ? '恢复调度' : '暂停调度',
      icon: schedulerPaused ? <PlayIcon /> : <PauseIcon />,
      variant: 'ghost' as const,
      onClick: handleToggleScheduler,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* 统计卡片行 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="总任务数"
          value={summary?.totalTasks ?? 0}
          icon={<ClipboardListIcon />}
          color="blue"
        />
        <StatCard
          title="运行中"
          value={summary?.runningTasks ?? 0}
          icon={<ZapIcon className="animate-pulse" />}
          color="blue"
        />
        <StatCard
          title="队列中"
          value={summary?.queuedTasks ?? 0}
          icon={<QueueListIcon />}
          color={summary?.queuedTasks && summary.queuedTasks > 10 ? 'yellow' : 'gray'}
        />
        <StatCard
          title="成功率"
          value={`${summary?.successRate?.toFixed(1) ?? 0}%`}
          icon={<CheckCircleIcon />}
          color="green"
        />
      </div>

      {/* 快捷操作 */}
      <div className="mt-6">
        <QuickActions actions={quickActions} />
      </div>

      {/* 活跃任务 + 队列 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ActiveTaskPanel tasks={activeTasks} />
        <TaskQueueList queue={queuedTasks} />
      </div>

      {/* Agent 网格 */}
      <section className="mt-8">
        <AgentStatusPanel agents={agents} showResourceDetails />
      </section>
    </div>
  )
}
```

### StatCard.tsx

```tsx
// src/components/dashboard/StatCard.tsx
'use client'

import React, { memo } from 'react'
import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  changeType?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
}

const COLOR_MAP = {
  blue: { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  green: { bar: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' },
  yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  red: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
  purple: { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  gray: { bar: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10' },
}

export const StatCard = memo(function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
}: StatCardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-5">
      {/* 左侧色条 */}
      <div className={clsx('absolute left-0 top-0 bottom-0 w-1', colors.bar)} />
      
      {/* 内容 */}
      <div className="flex items-start justify-between pl-3">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          
          {change !== undefined && (
            <p className={clsx(
              'mt-1 flex items-center gap-1 text-xs font-medium',
              changeType === 'up' && 'text-green-400',
              changeType === 'down' && 'text-red-400',
              changeType === 'neutral' && 'text-gray-400',
            )}>
              {changeType === 'up' && '↑'}
              {changeType === 'down' && '↓'}
              {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
        
        <div className={clsx('rounded-lg p-3', colors.bg)}>
          {icon}
        </div>
      </div>
    </div>
  )
})
```

### 样式变量 (Tailwind 扩展)

```javascript
// tailwind.config.js 扩展
module.exports = {
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a1a2e',
          950: '#0f0f1a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
}
```

---

## 下一步行动

1. ✅ 设计文档完成
2. ⬜ 创建 `StatCard` 组件
3. ⬜ 创建 `ActiveTaskPanel` 组件
4. ⬜ 创建 `TaskQueueList` 组件
5. ⬜ 创建 `QuickActions` 组件
6. ⬜ 创建 `Dashboard` 主组件
7. ⬜ 集成 WebSocket 实时数据
8. ⬜ 添加单元测试

---

## 参考文件

- 现有组件: `src/components/dashboard/AgentStatusPanel.tsx`
- 类型定义: `src/types/agent-task.ts` (待创建)
- 样式系统: `src/styles/tokens.css`
- UI 组件库: `src/components/ui/`
