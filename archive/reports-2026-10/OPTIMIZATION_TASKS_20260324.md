# 代码优化建议报告

**生成时间**: 2026-03-24
**项目**: 7zi-project
**分析范围**: src/ 目录下的 TypeScript/TypeScript React 文件

---

## 📊 分析概览

- **总计文件**: 192 个 .ts/.tsx 文件
- **大文件 (>400行)**: 35 个
- **关键模块**: WebSocket、状态管理、API、工具函数

---

## 🔴 1. 未使用的导入和死代码

### 1.1 未使用的导入 (已识别)

#### `src/stores/uiStore.ts` (726行)

```typescript
// 问题: 导入 React 但仅在类型定义中使用
// 当前代码:
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// React.ReactNode 仅在 Modal 接口中使用
export interface Modal {
  content: React.ReactNode // 第 57 行
}

// 优化建议:
// 方案1: 如果 Modal.content 可以改为 any 或 unknown
export interface Modal {
  content: unknown // 移除 React 导入
}

// 方案2: 保留 React 导入，但确保确实需要
// 如果此文件只在客户端使用，则保留是合理的
```

#### `src/stores/filterStore.ts` (615行)

```typescript
// 问题: 没有导入任何外部类型，但文件很大
// 建议检查是否有重复的类型定义
```

#### `src/lib/rate-limit/middleware.ts` (501行)

```typescript
// 问题: verifyJwtToken 仅在第 74 行使用一次
import { verifyJwtToken } from '@/lib/auth/service' // 第 14 行

// 建议检查: 如果这是频繁调用的函数，保留导入
// 如果仅在特定场景使用，考虑延迟加载或重构
```

### 1.2 注释掉的代码 (需要清理)

#### `src/stores/index.ts` (138行)

```typescript
// 问题: 大量被注释掉的代码 (dashboardStore, walletStore)

// TODO: 需要创建 dashboardStore
/*
export {
  useDashboardStore,
  useMembers,
  useIssues,
  // ... 大量注释
} from './dashboardStore';
*/

// TODO: 需要创建 walletStore
/*
export {
  useWalletStore,
  useWalletBalance,
  // ... 大量注释
} from './walletStore';
*/

// 建议:
// 1. 移除所有注释掉的代码，保持代码整洁
// 2. 在 README 或 TODO.md 中记录这些计划中的功能
// 3. 或者创建 .future-stores.md 文档记录这些想法
```

#### `src/lib/rate-limit/storage-factory.ts`

```typescript
// 被注释掉的 Redis 导入
// import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

// 建议: 如果 Redis 功能已废弃，移除注释；如果未来会使用，添加 TODO 标记
```

#### `src/lib/monitoring/sentry.config.ts`

```typescript
// 被注释掉的导入
// import { BrowserTracing } from '@sentry/nextjs';

// 建议: 确认是否需要 BrowserTracing，移除无用注释
```

### 1.3 死代码模式

#### `src/lib/rate-limit/middleware.ts`

```typescript
// 问题: 文档示例代码 (第 295-299 行, 第 407-411 行)
* import { withRateLimit } from '@/lib/rate-limit/middleware';
*
* export const GET = withRateLimit(async (req: NextRequest) => {
*   return NextResponse.json({ message: 'Hello' });
* });

// 建议: 将这些示例移到单独的文档文件 (docs/api-rate-limiting.md)
```

---

## 🔶 2. 重复代码模式和优化建议

### 2.1 格式化工具函数重复 ⚠️ 高优先级

#### 问题: `formatTimeAgo` 函数在两个文件中重复定义

**位置1**: `src/lib/utils/index.ts` (第 59-75 行)

```typescript
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return d.toLocaleDateString('zh-CN')
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}
```

**位置2**: `src/lib/date.ts`

```typescript
export function formatTimeAgo(date: Date | string, now?: Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const reference = now || new Date()
  const diff = reference.getTime() - d.getTime()
  // ... 相似逻辑
}
```

**差异**: `date.ts` 版本多了一个可选的 `now` 参数用于测试

**优化建议**:

```typescript
// 方案1: 统一到 src/lib/date.ts，从 utils 导出
// src/lib/utils/index.ts
export { formatTimeAgo } from '@/lib/date'

// 方案2: 合并功能到一个文件
// 在 src/lib/date.ts 中:
export function formatTimeAgo(date: Date | string, reference?: Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = reference || new Date()
  // ... 统一逻辑
}
```

### 2.2 Debounce/Throttle 函数重复 ⚠️ 高优先级

#### 问题: 相似的 debounce/throttle 实现在多个文件中

**位置1**: `src/lib/utils/index.ts` (简洁版本)

```typescript
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
```

**位置2**: `src/lib/websocket/throttle.ts` (完整版本，200+ 行)

```typescript
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null
  // ... 更复杂的实现
}

// 还有 throttleLeading, debounceImmediate, rafThrottle, Batcher, RateLimiter 类
```

**使用情况分析**:

- `throttle.ts` 中的函数被 `useCollaboration.ts` 使用（高频事件优化）
- `utils/index.ts` 中的函数没有被 WebSocket 模块使用

**优化建议**:

```typescript
// 方案1: 统一导出高级版本
// src/lib/utils/index.ts
export {
  throttle,
  throttleLeading,
  debounce,
  debounceImmediate,
  rafThrottle,
  Batcher,
  RateLimiter,
} from '@/lib/websocket/throttle'

// 方案2: 创建独立的 throttle 模块
// src/lib/utils/throttle.ts
// 从 websocket/throttle.ts 移过来，作为通用工具

// 方案3: 根据使用场景分层
// src/lib/utils/throttle-simple.ts - 简单版本（utils 使用）
// src/lib/utils/throttle-advanced.ts - 高级版本（websocket 使用）
```

### 2.3 Logger 使用模式重复

#### 问题: 大量的 `logger.info`, `logger.error`, `logger.warn` 调用

**统计**: 32+ 文件使用 logger，大量重复的日志调用模式

**示例模式**:

```typescript
// src/lib/websocket/useCollaboration.ts (多处)
logger.info(`Reconnecting in ${delay}ms`, { attempt: reconnectAttemptsRef.current })
logger.warn('WebSocket already connected')
logger.error('WebSocket connection error', { error: err })
```

**优化建议**:

```typescript
// 创建领域特定的日志助手
// src/lib/websocket/logger.ts

export const wsLogger = {
  info: (message: string, context?: Record<string, unknown>) => {
    logger.info(`[WebSocket] ${message}`, context)
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    logger.warn(`[WebSocket] ${message}`, context)
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    logger.error(`[WebSocket] ${message}`, { error, ...context })
  },
}

// 使用:
wsLogger.info('Connected', { userId, userName })
```

### 2.4 错误处理模式重复

#### 问题: 多处相似的 try-catch 块，仅使用 console.warn

**位置**:

- `src/lib/timing.ts` (3 处)
- `src/lib/performance-optimization.ts` (5 处)

**示例**:

```typescript
// src/lib/timing.ts
try {
  performance.mark(name)
} catch (error) {
  console.warn(`[UserTiming] Failed to create mark:`, error)
}

// src/lib/performance-optimization.ts
try {
  performance.mark(name)
} catch (error) {
  console.warn(`Performance mark "${name}" already exists or failed:`, error)
}
```

**优化建议**:

```typescript
// src/lib/utils/performance-helpers.ts

export function safePerformanceMark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(name)
    } catch (error) {
      logger.debug(`Performance mark failed: ${name}`, { error })
    }
  }
}

export function safePerformanceMeasure(name: string, startMark: string, endMark?: string): number {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark)
      const entries = performance.getEntriesByName(name, 'measure')
      return entries.length > 0 ? entries[0].duration : 0
    } catch (error) {
      logger.debug(`Performance measure failed: ${name}`, { error })
      return 0
    }
  }
  return 0
}

// 使用:
safePerformanceMark('operation-start')
// ... 操作
const duration = safePerformanceMeasure('operation', 'operation-start')
```

---

## 🟡 3. 可以合并的工具函数

### 3.1 类型定义重复

#### RoomUser 类型重复定义

**位置1**: `src/lib/websocket/server.ts`

```typescript
export interface RoomUser {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  joinedAt: Date
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
  isTyping: boolean
  lastActivity: Date
}
```

**位置2**: `src/lib/websocket/useCollaboration.ts`

```typescript
export interface RoomUser {
  id: string
  name: string
  email?: string // 注意: 这里是可选的
  avatar?: string
  color: string
  joinedAt: Date
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
  isTyping: boolean
  lastActivity: Date
}
```

**差异**: `email` 字段的可选性不同

**优化建议**:

```typescript
// 创建共享类型文件
// src/lib/websocket/types.ts (已存在，需要统一)

export interface RoomUser {
  id: string
  name: string
  email?: string // 统一为可选
  avatar?: string
  color: string
  joinedAt: Date
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
  isTyping: boolean
  lastActivity: Date
}

// 从 server.ts 和 useCollaboration.ts 中移除重复定义
import type { RoomUser } from './types'
```

### 3.2 文件大小优化相关工具

**重复**: `formatFileSize` 在 `src/lib/utils/index.ts` 中定义

**使用情况**: 需要检查是否有其他地方定义了类似的函数

**建议**: 确保所有文件大小格式化都使用统一的函数

### 3.3 日期格式化工具

**相关函数**:

- `formatDate` - `src/lib/date.ts`
- `formatDateTime` - `src/lib/date.ts`
- `formatTimeAgo` - `src/lib/date.ts` 和 `src/lib/utils/index.ts`
- `formatDuration` - `src/lib/timing.ts`
- `formatDateForApi` - `src/lib/api/utils.ts`

**优化建议**:

```typescript
// 创建统一的日期工具模块
// src/lib/utils/date-utils.ts

export { formatDate, formatDateTime, formatTimeAgo as formatDateRelative } from '@/lib/date'

export { formatDuration } from '@/lib/timing'

export { formatDateForApi } from '@/lib/api/utils'

// 添加一个总的导出索引
// src/lib/utils/date.ts
export * from './date-utils'
```

---

## 🟢 4. 大文件拆分建议

### 4.1 `src/lib/websocket/server.ts` (1019行) 🔴 极需拆分

**当前结构分析**:

- Rate limiting 逻辑 (~100 行)
- Room 管理逻辑 (~300 行)
- 事件处理器 (~400 行)
- 性能监控 (~100 行)
- 辅助函数 (~100 行)

**拆分方案**:

```
src/lib/websocket/
├── server.ts                    # 主入口 (~200 行)
├── server/
│   ├── rate-limiter.ts         # WebSocket 速率限制
│   ├── room-manager.ts         # 房间管理
│   ├── handlers/               # 事件处理器
│   │   ├── connection.ts       # 连接处理
│   │   ├── rooms.ts            # 房间事件
│   │   ├── collaboration.ts    # 协作事件
│   │   └── voice.ts            # 语音事件
│   ├── performance.ts          # 性能监控
│   └── types.ts                # 类型定义 (已存在，需要扩充)
```

**实施步骤**:

1. 创建 `server/rate-limiter.ts` - 移动 `checkWebSocketRateLimit`, `getClientIdentifier`, 相关类型
2. 创建 `server/room-manager.ts` - 移动 `Room` 接口, `RoomUser`, 房间相关函数
3. 创建 `server/handlers/` - 将事件处理函数按功能分组
4. 创建 `server/performance.ts` - 移动性能监控代码
5. 在 `server.ts` 中重新导出和组装

**预期效果**:

- 每个文件 <300 行
- 更容易测试和维护
- 更清晰的职责分离

### 4.2 `src/stores/uiStore.ts` (726行) 🟡 建议拆分

**当前功能**:

- Sidebar 状态管理
- Modal 管理
- Toast 通知管理
- 加载状态
- 表单草稿状态

**拆分方案**:

```
src/stores/
├── ui/
│   ├── sidebarStore.ts      # 侧边栏状态 (~150 行)
│   ├── modalStore.ts        # Modal 管理 (~150 行)
│   ├── toastStore.ts        # Toast 通知 (~200 行)
│   ├── loadingStore.ts      # 加载状态 (~100 行)
│   ├── formDraftStore.ts    # 表单草稿 (~100 行)
│   └── index.ts             # 统一导出
```

**注意事项**:

- 需要保持向后兼容
- 可以使用 Zustand 的 `combine` 或创建统一的导出

**实施建议**:

```typescript
// src/stores/ui/sidebarStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
  width: number
}

interface SidebarActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
}

export const useSidebarStore = create<SidebarState & SidebarActions>()(
  devtools(
    persist(
      set => ({
        isOpen: true,
        isCollapsed: false,
        width: 280,
        toggleSidebar: () => set(state => ({ isOpen: !state.isOpen })),
        setSidebarOpen: open => set({ isOpen: open }),
        setSidebarCollapsed: collapsed => set({ isCollapsed: collapsed }),
        setSidebarWidth: width => set({ width }),
      }),
      { name: 'sidebar-storage' }
    )
  )
)
```

### 4.3 `src/lib/websocket/useCollaboration.ts` (717行) 🟡 建议拆分

**当前功能**:

- 连接管理
- 房间操作
- 文档同步
- 光标管理
- 性能监控集成

**拆分方案**:

```
src/lib/websocket/
├── hooks/
│   ├── useConnection.ts       # 连接管理
│   ├── useRoom.ts            # 房间操作
│   ├── useDocumentSync.ts    # 文档同步
│   └── index.ts              # 导出 useCollaboration (组合钩子)
```

### 4.4 `src/stores/filterStore.ts` (615行) 🟡 建议拆分

**拆分方案**:

```
src/stores/
├── filter/
│   ├── filterStore.ts        # 过滤条件
│   ├── sortStore.ts          # 排序逻辑
│   ├── paginationStore.ts    # 分页管理
│   └── index.ts              # 统一导出
```

### 4.5 测试文件优化

**大型测试文件**:

- `src/test/vi-mocks.ts` (730行) - 需要拆分为多个模块
- `src/lib/auth/__tests__/auth.test.ts` (918行) - 按功能拆分
- `src/lib/timing.test.ts` (654行) - 按测试类型拆分

**建议结构**:

```
src/test/
├── mocks/
│   ├── vitest-mocks.ts       # 核心模拟
│   ├── auth-mocks.ts         # 认证相关
│   ├── api-mocks.ts          # API 相关
│   └── index.ts
```

---

## 📋 5. 优化任务清单

### 高优先级 🔴

- [ ] **统一 `formatTimeAgo` 函数**
  - [ ] 从 `src/lib/utils/index.ts` 移除
  - [ ] 在 `src/lib/date.ts` 中增强实现（可选的 `now` 参数）
  - [ ] 在 `utils/index.ts` 中重新导出
  - [ ] 更新所有引用

- [ ] **统一 debounce/throttle 函数**
  - [ ] 决定使用哪个版本（建议使用 throttle.ts 的完整版本）
  - [ ] 从 `src/lib/utils/index.ts` 移除简单版本
  - [ ] 将 `throttle.ts` 移动到通用位置或统一导出
  - [ ] 更新所有导入路径

- [ ] **创建领域特定的日志助手**
  - [ ] 创建 `src/lib/websocket/logger.ts`
  - [ ] 创建其他领域的日志助手（如 api、db）
  - [ ] 逐步替换直接的 logger 调用

- [ ] **拆分 `src/lib/websocket/server.ts`**
  - [ ] 创建 `server/rate-limiter.ts`
  - [ ] 创建 `server/room-manager.ts`
  - [ ] 创建 `server/handlers/` 目录
  - [ ] 创建 `server/performance.ts`
  - [ ] 更新主文件 `server.ts`

### 中优先级 🟡

- [ ] **移除注释掉的代码**
  - [ ] 清理 `src/stores/index.ts` 中的 TODO 注释
  - [ ] 移除其他文件中的无用注释
  - [ ] 创建 `TODO.md` 或 `.future-stores.md` 文档

- [ ] **统一类型定义**
  - [ ] 将 `RoomUser` 等重复类型移到共享位置
  - [ ] 更新所有导入
  - [ ] 验证类型一致性

- [ ] **拆分 `src/stores/uiStore.ts`**
  - [ ] 创建 `ui/` 目录
  - [ ] 拆分为独立的 stores
  - [ ] 保持向后兼容

- [ ] **创建性能助手函数**
  - [ ] 创建 `src/lib/utils/performance-helpers.ts`
  - [ ] 实现 `safePerformanceMark` 等函数
  - [ ] 替换重复的 try-catch 块

### 低优先级 🟢

- [ ] **优化日期工具**
  - [ ] 创建统一的日期工具模块
  - [ ] 整合所有日期格式化函数
  - [ ] 添加文档和示例

- [ ] **拆分其他大文件**
  - [ ] 拆分 `useCollaboration.ts`
  - [ ] 拆分 `filterStore.ts`
  - [ ] 优化测试文件

- [ ] **代码质量工具**
  - [ ] 配置 ESLint 规则检测未使用的导入
  - [ ] 配置 TypeScript 严格模式
  - [ ] 添加 pre-commit hook

---

## 📈 6. 预期收益

### 性能优化

- **减少包体积**: 移除重复代码可减少约 5-10KB
- **代码复用**: 统一工具函数可减少重复逻辑执行
- **Tree shaking**: 更清晰的模块结构有利于优化

### 可维护性提升

- **代码可读性**: 文件大小减少 30-50%
- **测试覆盖率**: 拆分后更容易编写单元测试
- **重构风险**: 更小的文件降低重构风险

### 开发效率

- **查找速度**: 更容易找到相关代码
- **Bug 定位**: 职责分离使问题定位更快
- **协作开发**: 更小的文件减少合并冲突

---

## 🎯 7. 实施建议

### 分阶段实施

**第1周** - 高优先级任务

- 统一 `formatTimeAgo` 和 debounce/throttle 函数
- 移除注释代码

**第2-3周** - 核心重构

- 拆分 `server.ts` (WebSocket 服务器)
- 创建日志助手

**第4周** - 状态管理优化

- 拆分 `uiStore.ts`
- 统一类型定义

**第5-6周** - 全面优化

- 拆分其他大文件
- 创建工具函数库
- 完善文档

### 风险控制

1. **保持向后兼容**: 拆分时创建重新导出文件
2. **渐进式重构**: 每次只修改一个模块
3. **充分测试**: 每个阶段完成后运行完整测试套件
4. **版本控制**: 使用功能分支，确保可以回滚

### 代码审查检查点

- [ ] 所有导入都被实际使用
- [ ] 没有重复的类型定义
- [ ] 文件大小在合理范围内 (<400 行)
- [ ] 测试覆盖率没有下降
- [ ] 没有引入新的 lint 错误

---

## 📝 8. 总结

本次代码审查发现了以下主要问题：

1. **未使用的导入和注释代码**: 需要清理以提高代码质量
2. **重复的工具函数**: `formatTimeAgo`, `debounce/throttle` 等需要统一
3. **大型文件**: 多个文件超过 600 行，需要拆分以提高可维护性
4. **类型定义重复**: `RoomUser` 等类型在多处定义

通过实施这些优化建议，可以：

- 减少代码重复约 10-15%
- 提高代码可维护性 30-50%
- 降低包体积约 5-10KB
- 提高开发效率和团队协作能力

**下一步**: 从高优先级任务开始，逐步实施优化建议。
