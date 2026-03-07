# API 响应缓存策略

## 概述

本项目使用 **TanStack Query (React Query)** 实现 API 响应缓存，提供智能的数据获取、缓存和更新机制。

## 架构

```
lib/query/
├── provider.tsx       # QueryClientProvider 配置
├── keys.ts           # 查询键定义
├── useTaskQueries.ts # 任务相关 Query Hooks
├── useDashboardQuery.ts # 仪表盘 Query Hooks
└── index.ts          # 统一导出
```

## 缓存策略配置

### 全局默认配置 (`provider.tsx`)

```typescript
{
  staleTime: 5 * 60 * 1000,  // 5 分钟内数据被认为是新鲜的
  gcTime: 30 * 60 * 1000,    // 缓存数据保留 30 分钟
  retry: 1,                   // 失败后重试 1 次
  refetchOnWindowFocus: false // 窗口聚焦时不自动刷新
}
```

### 各端点缓存策略

| 端点 | staleTime | gcTime | 说明 |
|------|-----------|-------|------|
| `/api/tasks` | 2 分钟 | 30 分钟 | 任务列表经常变化 |
| `/api/tasks/[id]` | 2 分钟 | 30 分钟 | 单个任务详情 |
| `/api/tasks/stats` | 5 分钟 | 30 分钟 | 统计数据变化较慢 |
| `/api/tags` | 10 分钟 | 30 分钟 | 标签很少变化 |
| `/api/dashboard` | 1 分钟 | 10 分钟 | 仪表盘数据 |

### 仪表盘自动刷新

- 默认每 60 秒自动刷新
- 可选择：30 秒 / 60 秒 / 120 秒 / 5 分钟 / 关闭
- 刷新时显示蓝色指示点

## Query Keys 结构

### 任务查询键

```typescript
taskKeys.all              // ['tasks']
taskKeys.lists()          // ['tasks', 'list']
taskKeys.list(filter)     // ['tasks', 'list', filter]
taskKeys.details()        // ['tasks', 'detail']
taskKeys.detail(id)       // ['tasks', 'detail', id]
taskKeys.stats()          // ['tasks', 'stats']
```

### 标签查询键

```typescript
tagKeys.all               // ['tags']
tagKeys.lists()           // ['tags', 'list']
tagKeys.list(customOnly)  // ['tags', 'list', { customOnly }]
```

### 仪表盘查询键

```typescript
dashboardKeys.all         // ['dashboard']
dashboardKeys.data()      // ['dashboard', 'data']
```

## 使用指南

### 1. 基础查询

```typescript
import { useTasksQuery } from '@/lib/query';

function MyComponent() {
  const { data, isLoading, error } = useTasksQuery();

  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return <div>{data.map(task => <TaskCard key={task.id} task={task} />)}</div>;
}
```

### 2. 带过滤器的查询

```typescript
const { data } = useTasksQuery({ status: 'done', priority: 'high' });
```

### 3. Mutations (变更操作)

```typescript
import { useCreateTaskMutation } from '@/lib/query';

function CreateTaskForm() {
  const createTask = useCreateTaskMutation();

  const handleSubmit = async (taskData) => {
    try {
      await createTask.mutateAsync(taskData);
      // 成功后自动失效相关缓存
    } catch (error) {
      // 处理错误
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 4. 手动刷新

```typescript
import { useQueryClient } from '@tanstack/react-query';

function RefreshButton() {
  const queryClient = useQueryClient();

  const handleClick = () => {
    // 失效并重新获取
    queryClient.invalidateQueries({ queryKey: ['tasks'] });

    // 或者使用 refetch
    queryClient.refetchQueries({ queryKey: ['tasks'] });
  };

  return <button onClick={handleClick}>刷新</button>;
}
```

### 5. 乐观更新

React Query 的 mutations 自动处理乐观更新。你也可以自定义：

```typescript
const updateTask = useUpdateTaskMutation();

// 更新时，React Query 会：
// 1. 更新缓存中的数据
// 2. 发送 API 请求
// 3. 如果成功，保持更新
// 4. 如果失败，回滚更改
```

## Hooks 列表

### 查询 Hooks

| Hook | 用途 | 参数 |
|------|------|------|
| `useTasksQuery` | 获取任务列表 | `filter?: TaskFilter` |
| `useTaskQuery` | 获取单个任务 | `id: string` |
| `useTaskStatsQuery` | 获取任务统计 | 无 |
| `useTagsQuery` | 获取标签列表 | `customOnly?: boolean` |
| `useDashboardQuery` | 获取仪表盘数据 | `options?: { refetchInterval, enabled }` |

### Mutation Hooks

| Hook | 用途 | 参数 |
|------|------|------|
| `useCreateTaskMutation` | 创建任务 | `taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>` |
| `useUpdateTaskMutation` | 更新任务 | `{ id, updates }` |
| `useDeleteTaskMutation` | 删除任务 | `id: string` |
| `useBatchUpdateStatusMutation` | 批量更新状态 | `{ ids, status }` |
| `useCreateTagMutation` | 创建标签 | `tagData: Omit<TaskTag, 'id'>` |
| `useDeleteTagMutation` | 删除标签 | `id: string` |

## 缓存失效策略

### 自动失效

当执行 mutation 时，React Query 会自动失效相关查询：

- **创建任务**: 失效 `taskKeys.lists()` 和 `taskKeys.stats()`
- **更新任务**: 失效 `taskKeys.lists()` 和 `taskKeys.stats()`
- **删除任务**: 失效 `taskKeys.lists()` 和 `taskKeys.stats()`
- **创建/删除标签**: 失效 `tagKeys.lists()` 和 `taskKeys.lists()`

### 手动失效

```typescript
// 失效所有任务相关查询
queryClient.invalidateQueries({ queryKey: taskKeys.all });

// 失效特定查询
queryClient.invalidateQueries({ queryKey: taskKeys.detail('task-123') });
```

## 性能优化

### 1. 请求去重

React Query 自动去重相同查询。即使多个组件同时调用 `useTasksQuery()`，也只会发送一个请求。

### 2. 背景刷新

当数据过期后，React Query 会在后台自动刷新，用户看到的是缓存的旧数据，新的数据加载后自动替换。

### 3. 预取数据

```typescript
import { usePrefetchDashboard } from '@/lib/query';

function LinkToDashboard() {
  const prefetchDashboard = usePrefetchDashboard();

  return (
    <a
      href="/dashboard"
      onMouseEnter={prefetchDashboard}
    >
      仪表盘
    </a>
  );
}
```

## 调试工具

项目已集成 `@tanstack/react-query-devtools`，开发环境会显示：

- 查询状态
- 缓存数据
- 失效时间
- 请求时间线

访问方式：点击左下角的 React Query 图标。

## 迁移指南

### 从旧的 useTasks 迁移

**旧代码：**
```typescript
import { useTasks } from '@/lib/tasks/useTasks';

const { tasks, isLoading, addTask } = useTasks();
```

**新代码：**
```typescript
import { useTasks } from '@/lib/tasks/useTasksQuery';

const { tasks, isLoading, addTask } = useTasks();
```

接口保持一致，无需修改组件代码！

## 最佳实践

1. **使用 Query Keys**: 始终使用预定义的 query keys（如 `taskKeys.list()`）
2. **合理设置 staleTime**: 根据数据变化频率调整
3. **利用缓存失效**: 不要手动管理状态，让 React Query 自动处理
4. **错误处理**: 使用 mutation 的 `onError` 处理错误
5. **乐观更新**: React Query 默认支持，确保 UI 响应快速

## 常见问题

### Q: 为什么数据没有刷新？

A: 检查：
1. `staleTime` 是否过长
2. mutation 是否正确设置了 `invalidateQueries`
3. 查询的 `enabled` 是否为 `true`

### Q: 如何清除所有缓存？

A:
```typescript
const queryClient = useQueryClient();
queryClient.clear();
```

### Q: 如何禁用某个查询的自动刷新？

A:
```typescript
const { data } = useTasksQuery(undefined, {
  refetchOnWindowFocus: false,
  refetchInterval: false,
});
```

## 相关资源

- [TanStack Query 文档](https://tanstack.com/query/latest)
- [React Query 指南](https://tanstack.com/query/latest/docs/react/guides)
