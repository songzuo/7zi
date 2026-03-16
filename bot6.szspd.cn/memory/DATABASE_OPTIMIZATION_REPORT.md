# 7zi 数据层优化报告

## 执行摘要

**项目状态**: 无传统数据库，使用文件持久化 + 内存索引存储
**优化级别**: 中等 - 已有良好的基础架构，存在可优化空间
**关键发现**: 3 个 N+1 查询风险，5 个性能优化建议

---

## 1. 数据层架构分析

### 当前架构

```
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│   /api/tasks, /api/projects, /api/knowledge, etc.          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cached API Layer                          │
│   cached-api.ts - 响应缓存、标签失效                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Indexed Data Store                         │
│   IndexedStore<T> - O(1) 索引查询、分页、多条件过滤         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Persistent Store (File)                      │
│   PersistentStore - JSON 文件、原子写入、自动备份           │
│   Storage: /data/*.json                                      │
└─────────────────────────────────────────────────────────────┘
```

### 存储模块

| 模块 | 文件 | 存储类型 | 索引支持 |
|------|------|----------|----------|
| 任务存储 | `tasks-indexed.ts` | IndexedStore | ✅ status, type, assignee, projectId, priority |
| 项目存储 | `projects-indexed.ts` | IndexedStore | ✅ status, priority, members (多值), category |
| 知识存储 | `knowledge-store.ts` | Custom | ✅ 出边/入边索引 |
| 缓存层 | `memory-cache.ts` | MemoryCache | ✅ 标签索引 |

---

## 2. 查询性能分析

### 2.1 已优化的查询 (O(1))

**IndexedStore 索引查询:**
```typescript
// ✅ 优秀: 使用索引，O(1) 复杂度
store.findByIndex('status', 'pending')
store.findByIndex('status_assignee', 'pending_user1')

// ✅ 优秀: 多条件索引交集查询
store.findByIndexes([
  { index: 'status', value: 'pending' },
  { index: 'assignee', value: 'architect' }
])

// ✅ 优秀: ID 直接查找
store.findById('task-001')
```

**KnowledgeStore 边索引:**
```typescript
// ✅ 优秀: 使用边索引，避免全表扫描
getOutgoingEdges(nodeId)  // O(边数)
getIncomingEdges(nodeId)  // O(边数)
// 而非 O(总边数)
```

### 2.2 潜在性能问题

#### 问题 1: 项目统计 N+1 查询

**位置:** `projects-indexed.ts` - `getProjectStats()`

```typescript
// ⚠️ 当前实现 - 对每个项目单独查询任务
export function getProjectStats(projectId: string) {
  const tasks = getTasksByProjectId(projectId);  // 每次都查询
  
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
  };
}

// 当调用 getProjectsWithStats() 时，N 个项目 = N 次任务查询
```

**影响:** 
- 10 个项目 = 10 次任务查询
- 100 个项目 = 100 次任务查询

#### 问题 2: 项目成员过滤

**位置:** `projects-indexed.ts` - GET 路由

```typescript
// ⚠️ 非索引过滤
if (assignee) {
  filteredProjects = filteredProjects.filter(project => 
    project.members?.includes(assignee)  // O(n) 遍历
  );
}
// 应使用: getProjectsByMember(assignee)  // O(1) 索引
```

#### 问题 3: 任务历史记录增长

**位置:** `tasks-indexed.ts` - 任务更新

```typescript
// ⚠️ 无限增长的历史记录
history: [...task.history, newHistory]
```

每个任务更新都会追加历史记录，长期运行后会导致:
- 单个任务对象过大
- 查询性能下降
- 内存占用增加

---

## 3. N+1 查询识别

### 已发现的 N+1 模式

| 位置 | 问题 | 严重程度 |
|------|------|----------|
| `getProjectsWithStats()` | 每个项目单独查询任务统计 | 🔴 高 |
| 任务评论查询 | 每个任务单独获取评论（如果有外部评论 API） | 🟡 中 |
| 知识图谱邻居查询 | 深度遍历时逐层查询 | 🟡 中 |

### N+1 问题示例

```typescript
// ❌ N+1 模式
const projects = getProjects();
for (const project of projects) {
  const stats = getProjectStats(project.id);  // N 次查询
  // ...
}

// ✅ 优化后 - 批量预加载
const projects = getProjects();
const allTasks = getTasks();  // 1 次查询
const tasksByProject = groupBy(allTasks, 'projectId');  // 内存分组
for (const project of projects) {
  const projectTasks = tasksByProject[project.id] || [];
  // 计算统计...
}
```

---

## 4. 索引策略建议

### 4.1 当前索引覆盖

**任务索引 (良好):**
- `status` - 任务状态
- `type` - 任务类型
- `assignee` - 分配人
- `projectId` - 所属项目
- `priority` - 优先级
- `status_assignee` - 复合索引
- `project_status` - 复合索引

**项目索引 (良好):**
- `status` - 项目状态
- `priority` - 优先级
- `category` - 分类
- `members` - 成员（多值索引）
- `status_priority` - 复合索引

### 4.2 建议新增索引

```typescript
// 任务索引补充
const additionalTaskIndexes: IndexConfig<Task>[] = [
  // 时间范围查询优化
  {
    name: 'created_month',
    extractor: (task) => task.createdAt?.substring(0, 7), // '2026-03'
  },
  // 过期任务查询
  {
    name: 'overdue',
    extractor: (task) => {
      if (!task.dueDate) return undefined;
      return new Date(task.dueDate) < new Date() ? 'yes' : 'no';
    },
  },
  // 创建人索引
  {
    name: 'createdBy',
    extractor: (task) => task.createdBy,
  },
];

// 项目索引补充
const additionalProjectIndexes: IndexConfig<ProjectData>[] = [
  // 时间范围查询
  {
    name: 'start_month',
    extractor: (project) => project.startDate?.substring(0, 7),
  },
  // 客户索引
  {
    name: 'client',
    extractor: (project) => project.metadata?.client,
  },
];
```

---

## 5. 缓存策略优化

### 5.1 当前缓存配置

```typescript
// 当前 TTL 设置
const TASKS_CACHE_TTL = '2m';   // 2 分钟
const TASKS_CACHE_TAGS = ['tasks'];
```

### 5.2 建议的缓存分层

```typescript
// 推荐的缓存配置
const CACHE_CONFIG = {
  // 热数据 - 短 TTL
  tasks: {
    ttl: '1m',
    tags: ['tasks'],
    maxSize: 500,
  },
  
  // 相对稳定 - 中等 TTL
  projects: {
    ttl: '5m',
    tags: ['projects'],
    maxSize: 200,
  },
  
  // 稳定数据 - 长 TTL
  knowledge: {
    ttl: '15m',
    tags: ['knowledge'],
    maxSize: 1000,
  },
  
  // 静态数据 - 很长 TTL
  stats: {
    ttl: '1h',
    tags: ['stats'],
    maxSize: 50,
  },
};
```

### 5.3 缓存预热建议

```typescript
// 启动时预热常用数据
export async function warmupCache(): Promise<void> {
  await Promise.all([
    // 预热任务列表
    cachedQuery('tasks:all', () => getTasks(), { ttl: '1m', tags: ['tasks'] }),
    
    // 预热项目列表
    cachedQuery('projects:all', () => getProjects(), { ttl: '5m', tags: ['projects'] }),
    
    // 预热统计信息
    cachedQuery('stats:dashboard', () => getDashboardStats(), { ttl: '1h', tags: ['stats'] }),
  ]);
}
```

---

## 6. 具体优化建议

### 6.1 高优先级

#### A. 修复项目统计 N+1 查询

```typescript
// 新增: 批量统计计算
export function getProjectStatsBatch(projectIds?: string[]): Map<string, ProjectStats> {
  const stats = new Map<string, ProjectStats>();
  
  // 预初始化所有项目
  const projects = projectIds 
    ? projectIds.map(id => projectStore.findById(id)).filter(Boolean)
    : projectStore.getAll();
  
  projects.forEach(p => {
    stats.set(p.id, { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 });
  });
  
  // 单次遍历所有任务，累加统计
  const allTasks = taskStore.getAll();
  for (const task of allTasks) {
    const projectStat = stats.get(task.projectId);
    if (!projectStat) continue;
    
    projectStat.totalTasks++;
    if (task.status === 'completed') projectStat.completedTasks++;
    else if (task.status === 'in_progress') projectStat.inProgressTasks++;
    else if (task.status === 'pending') projectStat.pendingTasks++;
  }
  
  return stats;
}

// 优化后的 getProjectsWithStats
export function getProjectsWithStats(projectIds?: string[]): Array<ProjectData & { stats: ProjectStats }> {
  const projects = projectIds 
    ? projectIds.map(id => projectStore.findById(id)).filter(Boolean) as ProjectData[]
    : projectStore.getAll();
  
  // 批量获取统计，避免 N+1
  const statsMap = getProjectStatsBatch(projects.map(p => p.id));
  
  return projects.map(project => ({
    ...project,
    stats: statsMap.get(project.id)!,
  }));
}
```

**预期效果:** N 次查询 → 1 次查询

#### B. 使用索引替代过滤

```typescript
// 优化 projects API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assignee = searchParams.get('assignee');
  
  // ✅ 使用索引
  if (assignee) {
    return successResponse(getProjectsByMember(assignee));
  }
  
  // ... 其他逻辑
}
```

### 6.2 中优先级

#### C. 任务历史记录限制

```typescript
// 添加历史记录限制
const MAX_HISTORY_ENTRIES = 100;

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  // ... 更新逻辑
  
  // 限制历史记录长度
  if (updatedTask.history.length > MAX_HISTORY_ENTRIES) {
    updatedTask.history = updatedTask.history.slice(-MAX_HISTORY_ENTRIES);
  }
  
  return updatedTask;
}
```

#### D. 添加查询结果缓存

```typescript
// 为高频查询添加缓存
export const getTaskByIdCached = memoizeWithTTL(
  (id: string) => taskStore.findById(id),
  { ttl: 30000, maxSize: 1000 } // 30 秒，最多 1000 个
);

function memoizeWithTTL<T, R>(
  fn: (arg: T) => R,
  options: { ttl: number; maxSize: number }
): (arg: T) => R {
  const cache = new Map<T, { value: R; expires: number }>();
  
  return (arg: T): R => {
    const cached = cache.get(arg);
    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }
    
    // LRU 驱逐
    if (cache.size >= options.maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    const value = fn(arg);
    cache.set(arg, { value, expires: Date.now() + options.ttl });
    return value;
  };
}
```

### 6.3 低优先级

#### E. 添加性能监控

```typescript
// 添加查询性能追踪
export class PerformanceTrackedStore<T extends { id: string }> extends IndexedStore<T> {
  constructor(
    name: string,
    initialItems: T[] = [],
    config?: { indexes?: IndexConfig<T>[] }
  ) {
    super(name, initialItems, config);
  }
  
  override findByIndex(indexName: string, value: IndexValue): T[] {
    const start = performance.now();
    const result = super.findByIndex(indexName, value);
    const duration = performance.now() - start;
    
    if (duration > 10) { // 超过 10ms 记录
      logger.warn('Slow query detected', {
        store: this.name,
        index: indexName,
        duration: `${duration.toFixed(2)}ms`,
        resultCount: result.length,
      });
    }
    
    return result;
  }
}
```

---

## 7. 迁移到真实数据库的建议

如果未来需要迁移到真实数据库（如 PostgreSQL + Prisma），建议：

### 7.1 Schema 设计

```prisma
model Task {
  id          String        @id
  title       String
  description String?
  type        TaskType
  priority    TaskPriority
  status      TaskStatus
  assignee    String?
  projectId   String?
  createdBy   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  comments    Comment[]
  history     TaskHistory[]
  project     Project?      @relation(fields: [projectId], references: [id])
  
  @@index([status])
  @@index([type])
  @@index([assignee])
  @@index([projectId])
  @@index([status, assignee])
  @@index([projectId, status])
}

model Project {
  id          String        @id
  title       String
  description String?
  status      ProjectStatus
  priority    ProjectPriority
  members     String[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  tasks       Task[]
  
  @@index([status])
  @@index([priority])
}
```

### 7.2 迁移步骤

1. **保持接口不变**: 数据访问函数签名保持一致
2. **逐步迁移**: 先迁移读操作，再迁移写操作
3. **并行运行**: 新旧系统并行运行，验证数据一致性
4. **性能对比**: 监控迁移前后的性能指标

---

## 8. 总结

### 优势 ✅

1. **已实现内存索引**: IndexedStore 提供 O(1) 查询
2. **边索引优化**: KnowledgeStore 的出边/入边索引
3. **缓存层完善**: LRU 驱逐、标签失效
4. **持久化可靠**: 原子写入、自动备份

### 待改进 ⚠️

1. **N+1 查询**: `getProjectsWithStats` 需要优化
2. **缓存利用率**: 部分 API 未使用缓存
3. **索引覆盖**: 缺少时间范围查询索引
4. **历史记录**: 无限增长问题

### 优先级建议

| 优先级 | 任务 | 预期收益 |
|--------|------|----------|
| P0 | 修复项目统计 N+1 | 查询时间 -90% |
| P1 | 使用成员索引替代过滤 | 查询时间 -80% |
| P2 | 添加查询缓存 | 响应时间 -50% |
| P3 | 限制历史记录长度 | 内存占用 -30% |

---

*报告生成时间: 2026-03-15*
*分析范围: src/lib/data, src/lib/store, src/lib/cache, src/app/api*
