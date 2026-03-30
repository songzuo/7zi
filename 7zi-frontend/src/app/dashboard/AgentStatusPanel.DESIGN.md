# AgentStatusPanel 组件设计文档

## 组件概述

**组件名称**: AgentStatusPanel
**版本**: 1.0.0
**创建日期**: 2026-03-30
**作者**: 🎨 设计师 (AI Agent)

### 功能描述

AgentStatusPanel 是 AI Agent 调度 Dashboard 的核心组件，用于实时显示所有 Agent 的状态、当前任务和资源使用情况。

### 设计目标

1. **实时监控**: 显示所有 Agent 的实时状态
2. **信息可视化**: 清晰展示 Agent 的关键信息
3. **交互友好**: 支持查看详细信息、筛选和排序
4. **响应式设计**: 适配不同屏幕尺寸
5. **性能优化**: 使用 React.memo 和 useCallback 优化渲染性能

---

## 数据结构

### Agent 接口定义

```typescript
export interface Agent {
  /** Agent 唯一标识符 */
  id: string;

  /** Agent 名称 */
  name: string;

  /** Agent 类型（如：设计师、开发者、测试员等） */
  type: 'designer' | 'developer' | 'tester' | 'manager' | 'custom';

  /** Agent 状态 */
  status: 'active' | 'idle' | 'offline' | 'error';

  /** Agent 描述 */
  description?: string;

  /** 当前正在执行的任务 */
  currentTask?: AgentTask;

  /** 资源使用情况 */
  resourceUsage?: ResourceUsage;

  /** 最后活动时间 */
  lastActiveAt: string;

  /** 是否启用 */
  enabled: boolean;
}

export interface AgentTask {
  /** 任务 ID */
  id: string;

  /** 任务名称 */
  title: string;

  /** 任务类型 */
  type: string;

  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /** 任务进度 (0-100) */
  progress: number;

  /** 开始时间 */
  startedAt: string;

  /** 预计完成时间 */
  estimatedCompletionAt?: string;
}

export interface ResourceUsage {
  /** CPU 使用率 (0-100) */
  cpu: number;

  /** 内存使用率 (0-100) */
  memory: number;

  /** 网络流量 (字节) */
  network?: {
    inbound: number;
    outbound: number;
  };

  /** 自定义指标 */
  custom?: {
    name: string;
    value: number;
    unit: string;
  }[];
}
```

---

## 组件 Props

### AgentStatusPanelProps

```typescript
export interface AgentStatusPanelProps {
  /** Agent 列表数据 */
  agents: Agent[];

  /** 是否加载中 */
  loading?: boolean;

  /** 刷新回调 */
  onRefresh?: () => void;

  /** Agent 详情查看回调 */
  onViewDetails?: (agent: Agent) => void;

  /** Agent 启用/禁用切换回调 */
  onToggleAgent?: (agentId: string, enabled: boolean) => void;

  /** 自定义类名 */
  className?: string;

  /** 每页显示数量 */
  pageSize?: number;

  /** 是否显示资源使用详情 */
  showResourceDetails?: boolean;

  /** 刷新间隔（毫秒） */
  refreshInterval?: number;

  /** 状态筛选 */
  statusFilter?: Agent['status'][];
}
```

---

## 组件状态

```typescript
interface AgentStatusPanelState {
  /** 当前选中的筛选状态 */
  selectedStatus: Agent['status'] | 'all';

  /** 排序方式 */
  sortBy: 'name' | 'status' | 'lastActive';

  /** 排序方向 */
  sortDirection: 'asc' | 'desc';

  /** 搜索关键词 */
  searchQuery: string;

  /** 当前页码 */
  currentPage: number;
}
```

---

## UI 设计规范

### 状态颜色映射

| 状态 | 颜色 | Badge 变体 | 说明 |
|------|------|-----------|------|
| active | green | soft | Agent 正在执行任务 |
| idle | blue | soft | Agent 空闲，等待任务 |
| offline | gray | soft | Agent 离线 |
| error | red | soft | Agent 发生错误 |

### 资源使用率颜色

| 使用率 | 颜色 | 警告级别 |
|--------|------|---------|
| 0-50% | green | 正常 |
| 50-80% | yellow | 需要关注 |
| 80-100% | red | 警告 |

### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ AgentStatusPanel                                     │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Header                                      │   │
│  │ - Title: "Agent Status Monitor"            │   │
│  │ - Actions: Filter, Sort, Search, Refresh   │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Stats Summary (Optional)                    │   │
│  │ - Total Agents: 10                          │   │
│  │ - Active: 3, Idle: 5, Offline: 2           │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Agent List                                   │   │
│  │ ┌──────────────────────────────────────┐    │   │
│  │ │ Agent Card 1                         │    │   │
│  │ │ - Status Badge                       │    │   │
│  │ │ - Name & Type                         │    │   │
│  │ │ - Current Task (if any)               │    │   │
│  │ │ - Resource Usage (CPU, Memory)       │    │   │
│  │ │ - Last Active Time                    │    │   │
│  │ └──────────────────────────────────────┘    │   │
│  │ ┌──────────────────────────────────────┐    │   │
│  │ │ Agent Card 2                         │    │   │
│  │ │ ...                                  │    │   │
│  │ └──────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Pagination (if needed)                      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 子组件设计

### AgentCard

单个 Agent 的展示卡片。

```typescript
export interface AgentCardProps {
  /** Agent 数据 */
  agent: Agent;

  /** 是否显示资源详情 */
  showResourceDetails?: boolean;

  /** 详情查看回调 */
  onViewDetails?: (agent: Agent) => void;

  /** 启用/禁用切换回调 */
  onToggle?: (agentId: string, enabled: boolean) => void;
}
```

**UI 元素**:
- 状态指示条（左侧彩色边框）
- 状态 Badge
- 名称和类型图标
- 当前任务信息（带进度条）
- 资源使用率（CPU/内存 进度条）
- 最后活动时间
- 操作按钮（查看详情、启用/禁用）

### StatsSummary

统计概览组件。

```typescript
export interface StatsSummaryProps {
  /** Agent 列表 */
  agents: Agent[];
}
```

**UI 元素**:
- 总 Agent 数量
- 各状态 Agent 数量（带颜色标识）
- 平均资源使用率

---

## 样式规范

### Tailwind CSS 类名

```typescript
// 基础布局
const layoutClasses = 'space-y-6';

// 卡片基础样式
const cardBaseClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700';

// 状态指示条
const statusIndicatorClasses = 'absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300';

// 资源进度条
const progressBaseClasses = 'h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700';
const progressFillClasses = 'h-full transition-all duration-500 ease-out';
```

### 响应式断点

- **移动端** (< 640px): 单列布局
- **平板** (640px - 1024px): 双列布局
- **桌面** (> 1024px): 三列布局或网格布局

---

## 交互设计

### 用户操作

1. **筛选 Agent**: 点击状态筛选按钮
2. **搜索 Agent**: 输入关键词实时过滤
3. **排序**: 点击排序按钮切换排序方式
4. **刷新**: 点击刷新按钮或自动刷新
5. **查看详情**: 点击 Agent 卡片查看详细信息
6. **启用/禁用**: 切换 Agent 的启用状态

### 反馈机制

- **加载状态**: 显示骨架屏
- **空状态**: 显示友好的空状态提示
- **错误状态**: 显示错误信息和重试按钮
- **悬停效果**: 卡片悬浮时显示阴影和上移效果
- **点击反馈**: 按钮按下时显示缩放效果

---

## 性能优化

1. **React.memo**: 防止不必要的重新渲染
2. **useCallback**: 缓存回调函数
3. **useMemo**: 缓存计算结果
4. **虚拟列表**: 如果 Agent 数量很多，考虑使用虚拟滚动
5. **防抖搜索**: 搜索输入使用防抖处理

---

## 可访问性

1. **语义化 HTML**: 使用正确的 HTML 元素
2. **ARIA 标签**: 为交互元素添加适当的 ARIA 属性
3. **键盘导航**: 支持键盘 Tab 键导航
4. **颜色对比**: 确保颜色对比度符合 WCAG 标准
5. **屏幕阅读器**: 为图表和进度条提供文本描述

---

## 未来扩展

1. **实时 WebSocket**: 支持 WebSocket 实时推送 Agent 状态
2. **拖拽排序**: 支持拖拽调整 Agent 顺序
3. **自定义列**: 允许用户自定义显示的列
4. **导出功能**: 导出 Agent 状态数据为 CSV/Excel
5. **告警配置**: 配置资源使用率告警阈值
6. **批量操作**: 支持批量启用/禁用 Agent

---

## 依赖项

```json
{
  "react": "^18.x",
  "clsx": "^2.1.0",
  "date-fns": "^3.6.0"
}
```

---

## 文件结构

```
src/app/dashboard/
├── AgentStatusPanel.tsx          # 主组件
├── AgentStatusPanel.DESIGN.md    # 设计文档（本文件）
├── components/
│   ├── AgentCard.tsx            # Agent 卡片组件
│   ├── StatsSummary.tsx         # 统计概览组件
│   └── AgentFilters.tsx         # 筛选组件
```

---

## 示例用法

```typescript
import { AgentStatusPanel } from './AgentStatusPanel';

const agents = [
  {
    id: '1',
    name: 'Designer',
    type: 'designer',
    status: 'active',
    description: 'UI/UX 设计专家',
    currentTask: {
      id: 'task-1',
      title: '设计 Dashboard 界面',
      type: 'design',
      status: 'running',
      progress: 65,
      startedAt: '2026-03-30T10:00:00Z'
    },
    resourceUsage: {
      cpu: 45,
      memory: 60
    },
    lastActiveAt: '2026-03-30T14:00:00Z',
    enabled: true
  },
  // ... more agents
];

function DashboardPage() {
  return (
    <div className="p-6">
      <AgentStatusPanel
        agents={agents}
        showResourceDetails={true}
        refreshInterval={30000}
        onRefresh={() => console.log('refreshing...')}
        onViewDetails={(agent) => console.log('view details:', agent)}
      />
    </div>
  );
}
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-30
**维护者**: 🎨 设计师
