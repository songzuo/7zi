# ScheduleHistory 组件

## 概述

ScheduleHistory 是一个用于展示 Agent 调度执行历史的 React 组件。它显示已完成任务的历史记录，支持时间范围筛选、状态筛选、搜索和分页功能。

## 功能特性

- ✅ 展示 Agent 调度计划执行的历史记录列表
- ✅ 显示字段：执行时间戳、Agent ID、任务类型、执行状态、耗时、错误信息
- ✅ 支持时间范围筛选（今天、最近7天、最近30天）
- ✅ 支持状态筛选（成功、失败、跳过）
- ✅ 支持搜索功能（任务标题、描述、Agent ID、任务类型）
- ✅ 支持分页加载（默认每页 20 条）
- ✅ 使用 Zustand store (`useSchedulerStore`) 获取数据
- ✅ 响应式设计，支持移动端
- ✅ 深色模式支持

## 使用示例

### 基础使用

```tsx
import { ScheduleHistory } from '@/components/dashboard';

export default function MyPage() {
  return (
    <div className="p-6">
      <ScheduleHistory />
    </div>
  );
}
```

### 带配置的使用

```tsx
import { ScheduleHistory } from '@/components/dashboard';
import type { HistoryEntry } from '@/components/dashboard';

export default function MyPage() {
  const handleEntryClick = (entry: HistoryEntry) => {
    console.log('Clicked entry:', entry);
  };

  return (
    <div className="p-6">
      <ScheduleHistory
        showFilters={true}
        autoRefresh={true}
        refreshInterval={30000}
        pageSize={20}
        onEntryClick={handleEntryClick}
        maxDisplay={100}
      />
    </div>
  );
}
```

### 自定义时间范围

```tsx
import { useState } from 'react';
import { ScheduleHistory } from '@/components/dashboard';

export default function MyPage() {
  const [customStartTime, setCustomStartTime] = useState<number | undefined>();
  const [customEndTime, setCustomEndTime] = useState<number | undefined>();

  return (
    <div className="p-6">
      {/* 可以添加自定义时间选择器 */}
      <ScheduleHistory
        showFilters={true}
        // 注意：当前版本需要通过修改组件内部状态来使用自定义时间范围
        // 未来版本可能需要添加更多 props 来支持
      />
    </div>
  );
}
```

## Props

| Prop | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `showFilters` | `boolean` | `true` | 是否显示筛选器 |
| `autoRefresh` | `boolean` | `true` | 是否自动刷新 |
| `refreshInterval` | `number` | `30000` | 自动刷新间隔（毫秒） |
| `className` | `string` | `''` | 自定义类名 |
| `pageSize` | `number` | `20` | 每页显示数量 |
| `onEntryClick` | `(entry: HistoryEntry) => void` | - | 点击历史条目的回调 |
| `maxDisplay` | `number` | - | 最大显示数量 |

## 类型定义

### HistoryEntry

```typescript
export interface HistoryEntry {
  taskId: string;                    // 任务 ID
  timestamp: number;                 // 执行时间戳
  agentId?: string;                 // Agent ID
  taskType: string;                  // 任务类型
  status: 'success' | 'failed' | 'skipped';  // 执行状态
  duration?: number;                 // 耗时（毫秒）
  error?: string;                   // 错误信息
  title: string;                    // 任务标题
  description?: string;              // 任务描述
  manualOverride?: boolean;          // 是否为手动分配
}
```

### TimeRange

```typescript
export type TimeRange = 'today' | 'last7days' | 'last30days' | 'custom';
```

### StatusFilter

```typescript
export type StatusFilter = 'all' | 'success' | 'failed' | 'skipped';
```

## UI 特性

### 状态徽章

- **成功** (success)：绿色徽章 + CheckCircle2 图标
- **失败** (failed)：红色徽章 + XCircle 图标
- **跳过** (skipped)：黄色徽章 + AlertCircle 图标

### 时间显示

- 今天：显示"今天 HH:MM"
- 昨天：显示"昨天 HH:MM"
- 本周：显示"星期X HH:MM"
- 更早：显示"MM/DD HH:MM"

### 耗时显示

- < 1 秒：显示毫秒数
- < 1 分钟：显示秒数
- < 1 小时：显示"X分Y秒"
- ≥ 1 小时：显示"X小时Y分钟"

### 分页控件

- 显示当前页码范围和总记录数
- 页码按钮（最多显示 5 个）
- 上一页/下一页按钮
- 禁用状态（第一页/最后一页）

## 样式

### 深色模式

组件完全支持深色模式，使用以下 Tailwind 类：

- 背景颜色：`dark:bg-zinc-800/50`
- 文字颜色：`dark:text-zinc-100` / `dark:text-zinc-400`
- 边框颜色：`dark:border-zinc-700/50`
- 悬停效果：`dark:hover:bg-zinc-600/50`

### 响应式

- 移动端：搜索框宽度 `w-40`，筛选按钮堆叠
- 桌面端：搜索框宽度 `sm:w-56`，筛选按钮横向排列

## 数据源

组件从 Zustand store 获取数据：

```typescript
const tasks = useSchedulerStore(selectTasks);
```

只显示状态为 `completed` 或 `failed` 的任务。

## 注意事项

1. **性能优化**：使用 `useMemo` 缓存过滤和分页结果
2. **无 console.error**：所有错误都通过 UI 显示，不使用 console.error
3. **ESLint 通过**：代码已通过 ESLint 检查，无警告和错误
4. **TypeScript**：完整的类型定义和类型检查

## 相关组件

- `TaskQueueView`：任务队列视图组件
- `AgentStatusPanel`：Agent 状态面板

## 文件位置

```
src/components/dashboard/ScheduleHistory.tsx
```
