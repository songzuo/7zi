# TODO.md - 代码质量与性能改进清单

## 概述

本文档记录了 `/root/.openclaw/workspace` 项目中发现的代码质量和性能问题。

---

## 问题 1: API 路由使用内存存储 (数据持久化问题)

**严重程度**: 🔴 高  
**文件**: `src/app/api/tasks/route.ts`

**问题描述**:
任务 API 使用内存数组存储数据 (`const tasks: Task[] = [...]`)，服务器重启后所有数据会丢失。

```typescript
// 第 58-118 行
const tasks: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    // ...
  },
  // ...
];
```

**影响**:
- 生产环境中任务数据无法持久化
- 无法支持多实例部署
- 服务器重启导致用户数据丢失

**建议**:
- 集成数据库 (如 PostgreSQL、MongoDB)
- 或使用文件系统存储作为临时方案
- 考虑使用 Redis 作为缓存层

---

## 问题 2: CSRF 中间件重复创建 (性能问题)

**严重程度**: 🟡 中  
**文件**: 
- `src/app/api/tasks/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/route.ts`

**问题描述**:
每个 API 请求都会创建新的 CSRF 中间件实例，应该在模块级别复用。

```typescript
// 每次请求都创建新实例
export async function POST(request: NextRequest) {
  const csrfMiddleware = createCsrfMiddleware(); // ❌ 重复创建
  const csrfResult = await csrfMiddleware(request);
  // ...
}
```

**建议**:
```typescript
// 模块级别创建一次
const csrfMiddleware = createCsrfMiddleware();

export async function POST(request: NextRequest) {
  const csrfResult = await csrfMiddleware(request);
  // ...
}
```

---

## 问题 3: 未使用的 loading 状态 (代码质量)

**严重程度**: 🟢 低  
**文件**: `src/app/[locale]/tasks/page.tsx`

**问题描述**:
定义了 `loading` 状态但从未使用 `setLoading` 函数。

```typescript
// 第 21 行
const [loading] = useState(false); // ❌ setLoading 从未使用
```

**建议**:
- 如果需要异步加载功能，使用 `useEffect` 调用 `setLoading`
- 或者删除未使用的状态

---

## 问题 4: 直接使用 console.error (日志规范)

**严重程度**: 🟡 中  
**文件**: 
- `src/app/[locale]/notifications/page.tsx` (多处)
- `src/components/ui/ErrorBoundary.tsx`

**问题描述**:
在生产代码中直接使用 `console.error` 而非结构化日志系统。

```typescript
// notifications/page.tsx 第 508 行
console.error('Failed to mark as read:', err);
```

**建议**:
使用项目已有的日志系统:
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('Notifications');
logger.error('Failed to mark as read', { error: err });
```

---

## 问题 5: EventEmitter 未设置监听器限制 (内存泄漏风险)

**严重程度**: 🟡 中  
**文件**: `src/lib/agents/knowledge-lattice.ts`

**问题描述**:
`KnowledgeLattice` 类继承 `EventEmitter` 但未设置 `maxListeners`，可能导致内存泄漏。

```typescript
export class KnowledgeLattice extends EventEmitter {
  constructor() {
    super();
    // 未设置 maxListeners 限制
  }
}
```

**建议**:
```typescript
constructor() {
  super();
  this.setMaxListeners(100); // 设置合理限制
}
```

---

## 问题 6: 缓存管理器单例不处理配置变化

**严重程度**: 🟡 中  
**文件**: `src/lib/cache/cache-manager.ts`

**问题描述**:
`getCacheManager()` 函数在首次创建后，忽略后续调用时的配置参数变化。

```typescript
let defaultManager: CacheManager | null = null;

export function getCacheManager(options?: CacheManagerOptions): CacheManager {
  if (!defaultManager) {
    defaultManager = new CacheManager(options); // 首次创建
  }
  return defaultManager; // 后续调用忽略 options
}
```

**建议**:
- 如果配置可能变化，提供重新初始化方法
- 或在配置变化时销毁并重建实例

---

## 问题 7: getFilteredTasks 函数效率低下

**严重程度**: 🟢 低  
**文件**: `src/app/[locale]/tasks/page.tsx`

**问题描述**:
每次渲染都创建新数组，应该使用 `useMemo` 优化。

```typescript
const getFilteredTasks = () => {
  return tasks.filter(task => !selectedTask || task.id === selectedTask.id);
};
```

**建议**:
```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter(task => !selectedTask || task.id === selectedTask.id);
}, [tasks, selectedTask]);
```

---

## 优先级排序

| # | 问题 | 严重程度 | 优先级 |
|---|------|---------|--------|
| 1 | API 内存存储 | 🔴 高 | P0 |
| 2 | CSRF 中间件重复创建 | 🟡 中 | P1 |
| 3 | console.error 使用 | 🟡 中 | P2 |
| 4 | EventEmitter 监听器限制 | 🟡 中 | P2 |
| 5 | 缓存管理器单例 | 🟡 中 | P2 |
| 6 | 未使用 loading 状态 | 🟢 低 | P3 |
| 7 | getFilteredTasks 效率 | 🟢 低 | P3 |

---

*创建日期: 2026-03-14*
