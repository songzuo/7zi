# v1.4.0 架构优化方案

**版本**: v1.4.0  
**架构师**: 🏗️ 架构师  
**日期**: 2026-04-07  
**状态**: 📋 设计完成

---

## 📋 执行摘要

本方案针对 **7zi-frontend v1.4.0** 进行架构优化，聚焦以下五大方向：

| 方向 | 优先级 | 目标 |
|------|--------|------|
| **性能优化** | 🔴 P0 | Bundle 体积↓30%，LCP↓40%，构建时间↓25% |
| **可扩展性增强** | 🔴 P0 | 统一 lib/ 模块结构，消除循环依赖 |
| **技术债务清理** | 🟠 P1 | 修复 571 个 TS 错误，消除 155 处 `any` |
| **状态管理优化** | 🟠 P1 | Zustand store 规范化，死代码清理 |
| **监控体系整合** | 🟡 P2 | 合并 performance/ 和 performance-monitoring/ |

**关键指标目标**:
- Bundle: 主包 <300KB (当前超 400KB)
- LCP: <1.5s (当前 ~2.5s)
- 构建时间: <90s (当前 ~106s)
- TypeScript 错误: 0 (当前 571)

---

## 1. 当前架构瓶颈与风险审查

### 1.1 性能瓶颈矩阵

| 瓶颈 | 位置 | 严重度 | 影响 |
|------|------|--------|------|
| **TypeScript 全量检查** | `tsconfig.json` | 🔴 严重 | 构建时间 91s |
| **N+1 查询问题** | `monitoring/monitor.ts` | 🔴 严重 | 运行时 O(4n) 遍历 |
| **桶分配 O(n²)** | `monitoring/aggregator.ts` | 🔴 严重 | 指标聚合性能差 |
| **大组件未懒加载** | `KnowledgeLattice3D`, `Dashboard` | 🟠 中 | 首屏加载慢 |
| **两套性能模块** | `performance/` vs `performance-monitoring/` | 🟠 中 | 维护成本高 |
| **`any` 类型滥用** | 155 处 | 🟠 中 | 类型安全缺失 |

### 1.2 依赖风险

| 依赖 | 风险等级 | 说明 |
|------|----------|------|
| `@types/node:25.5.0` | 🟡 中 | 应使用 LTS 22.x |
| `vitest:4.1.2` | 🟢 低 | 考虑升级到 v5 |
| `@react-three/*` | 🟠 中 | 3D 依赖体积大(68MB) |
| `socket.io` | 🔴 严重 | 已缺失，已在 `lib/socket.ts` 使用 |

### 1.3 循环依赖

已发现 **6 个循环依赖**，主要集中在：
- `db/` 模块内部
- `monitoring/` 模块内部

### 1.4 目录结构问题

```
lib/
├── performance/           (~1,500 行)  基础版
├── performance-monitoring/~3,000 行)  升级版 → 功能重叠
├── agents/                (分离良好)
├── agent-scheduler/      (分离良好)
└── 43 个顶级目录          (组织较混乱)
```

---

## 2. 性能优化方案

### 2.1 Bundle 优化

#### 目标
- 主包体积: <300KB
- 首屏 JS: <150KB
- 3D/Chart 组件: 100% 懒加载

#### 方案

**A. 大组件动态导入**

```typescript
// next.config.ts 增强
experimental: {
  optimizePackageImports: ['lucide-react', 'recharts', '@xyflow/react'],
}

// 需要懒加载的组件
const HeavyComponents = {
  KnowledgeLattice3D: () => import('@/features/knowledge-lattice/components/3d'),
  RichTextEditor: () => import('@/components/editor/RichTextEditor'),
  Dashboard3D: () => import('@/features/dashboard/components/Dashboard3D'),
}
```

**B. Route-based Bundle Splitting**

```
src/app/
├── (auth)/          → auth-bundle.js (~50KB)
├── (dashboard)/     → dashboard-bundle.js (~120KB)
├── (admin)/         → admin-bundle.js (~80KB)
└── (public)/        → public-bundle.js (~30KB)
```

**C. 第三方库优化**

| 库 | 优化方式 | 预期节省 |
|----|----------|----------|
| `three.js` (68MB) | `three/react` 仅 import 用到的 | -60MB |
| `recharts` | 按组件导入 | -40% bundle |
| `lodash` | 替换为 `lodash-es` + 按需导入 | -30KB |
| `@xyflow/react` | dynamic import | -50KB |

### 2.2 加载优化

**A. React Compiler 启用**

```typescript
// next.config.ts
reactCompiler: {
  compilationMode: 'annotation', // 已有，可扩展至 'whole-app'
}
```

**B. 图片与媒体优化**

```typescript
images: {
  formats: ['image/avif', 'image/webp'], // 已有
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30天
}
```

**C. 预加载关键资源**

```typescript
// app/layout.tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://api.7zi.com" />
```

### 2.3 运行时性能优化

**A. 修复 N+1 查询** (`monitoring/monitor.ts`)

```typescript
// ❌ 当前: O(4n)
const apiMetrics = allMetrics.filter(m => m.type === 'api')
const operationMetrics = allMetrics.filter(m => m.type === 'operation')
const errorMetrics = allMetrics.filter(m => m.type === 'error')
const customMetrics = allMetrics.filter(m => m.type === 'custom')

// ✅ 优化后: O(n)
const categorized = { api: [], operation: [], error: [], custom: [] }
for (const m of allMetrics) {
  categorized[m.type]?.push(m)
}
```

**B. 修复桶分配 O(n²)** (`monitoring/aggregator.ts`)

```typescript
// ❌ 当前: O(bucketCount * n)
for (let i = 0; i < bucketCount; i++) {
  const bucketMetrics = sorted.filter(m => ...) // 每个桶都遍历全部数据
}

// ✅ 优化后: O(n) 单次遍历 + 直接索引
const buckets = new Array(bucketCount).fill(null).map(() => [...])
for (const metric of sorted) {
  const bucketIndex = Math.floor((metric.timestamp - startTime) / windowMs)
  if (bucketIndex >= 0 && bucketIndex < bucketCount) {
    buckets[bucketIndex].push(metric)
  }
}
```

---

## 3. 可扩展性增强方案

### 3.1 lib/ 层重构

#### 目标结构

```
src/lib/
├── @core/                    # 核心抽象层
│   ├── db/                   # 数据库 (已有)
│   ├── cache/                # 缓存 (已有)
│   └── queue/                # 队列 (新增)
│
├── @services/               # 业务服务层
│   ├── auth/                 # 认证授权 (已有)
│   ├── agent/                # 智能体核心
│   │   ├── core/            # agent 核心
│   │   ├── scheduler/       # 调度器
│   │   └── a2a/              # A2A 协议
│   ├── websocket/            # WebSocket (已有)
│   └── notification/         # 通知 (已有)
│
├── @monitoring/              # 监控体系 (合并后)
│   ├── performance/          # 统一性能监控
│   ├── alerting/             # 告警系统
│   └── metrics/              # 指标收集
│
├── @shared/                  # 共享工具
│   ├── utils/                # 工具函数
│   ├── types/                # 类型定义
│   └── validation/           # 验证 schemas
│
└── @features/               # 功能模块
    ├── search/               # 搜索
    ├── export/               # 导出
    ├── collaboration/         # 协作
    └── workflow/             # 工作流
```

#### 合并计划

| 源 | 目标 | 合并策略 |
|----|------|----------|
| `performance/` | `@monitoring/performance` | 合并两个模块，保留最强功能 |
| `performance-monitoring/` | `@monitoring/performance` | 同上 |
| `agents/` | `@services/agent/core` | 移动文件 |
| `agent-scheduler/` | `@services/agent/scheduler` | 移动文件 |

### 3.2 循环依赖消除

**使用 `madge` 检测并消除 6 个循环依赖**:

```bash
madge --circular --extensions ts,tsx src/lib/
```

**消除策略**:
1. 提取公共接口到 `@shared/types`
2. 使用 `forwardRef` 打破 React 组件循环
3. 将共享工具移至独立模块
4. 使用依赖注入替代直接导入

### 3.3 模块导出规范化

```typescript
// ❌ 当前混乱导出
export { default } from './index'
export * from './types'
export { getCostStats } from './cost-tracker' // 已在 types 导出

// ✅ 统一 Barrel Pattern
// lib/ai/index.ts
export * from './types'           // 类型
export * from './ai-provider'      // 提供者
export * from './cost-tracker'     // 成本追踪
// 避免重复导出
```

---

## 4. 技术债务清理计划

### 4.1 TypeScript 错误修复 (571 → 0)

| 优先级 | 类型 | 数量 | 工作量 |
|--------|------|------|--------|
| 🔴 P0 | AI 模块导出冲突 | 16 | 2h |
| 🔴 P0 | AI Provider 类型缺失 | 3 | 1h |
| 🔴 P0 | dynamic-import.tsx JSX 错误 | 7 | 0.5h |
| 🟠 P1 | 通用 any 类型 (155处) | ~50类 | 10h |
| 🟡 P2 | 警告级别错误 | 剩余 | 4h |

**AI 模块导出冲突修复** (`src/lib/ai/index.ts`):

```typescript
// 修复前
export * from './types'           // 包含 MessageContext
export { getCostStats } from './cost-tracker' // 冲突

// 修复后
export type { MessageContext, ... } from './types'
export { getCostStats } from './cost-tracker'

// 或使用命名空间
export namespace AI {
  export type { MessageContext }
  export { getCostStats }
}
```

### 4.2 any 类型清理

**优先级排序**:

```typescript
// 🔴 P0: 生产环境核心模块
src/lib/performance/batch-request.ts   // 12处 any
src/lib/performance/performance-hooks.ts // 8处 any

// 🟠 P1: 工具和 hooks
src/lib/utils/                         // 通用工具
src/hooks/                             // React hooks

// 🟡 P2: 组件和页面
src/components/                        // UI 组件
src/app/                               // 页面
```

**替换方案**:

```typescript
// any → unknown
body?: any → body?: unknown

// any → 具体类型
resolve: (value: any) → resolve: <T>(value: T) => void

// navigator as any → 接口
navigator as any → navigator as NavigatorWithPerformance
```

### 4.3 死代码清理

| 文件/模块 | 状态 | 操作 |
|-----------|------|------|
| `dashboardStoreWithUndoRedo.ts` | 🔴 死代码 | 删除 |
| `walletStore.ts` | 🟡 未使用 | 标记 @deprecated |
| `dashboardStore` 未使用 selectors (8个) | 🟠 冗余导出 | 移除导出 |
| `filterStore` 未使用 selectors (4个) | 🟠 冗余导出 | 移除导出 |
| `lib/dynamic-import.tsx` JSX 错误 | 🔴 需修复 | 重命名 .tsx 或移除 JSX |

---

## 5. 状态管理优化

### 5.1 Zustand Store 规范化

**Store 分类**:

```
stores/
├── auth/           # 认证状态 (auth-store.ts)
├── notification/   # 通知状态 (notification-store.ts)
├── permission/     # 权限状态 (permission-store.ts)
├── room/           # 房间状态 (room-store.ts)
├── websocket/      # WebSocket 状态 (websocket-store.ts)
├── app/            # App 全局状态 (app-store.ts)
├── filter/         # 过滤器状态 (filterStore)
└── dashboard/      # Dashboard 状态 (dashboardStore)
```

**规范化原则**:
1. 每个 store 单一职责
2. Selector 按需导出，禁止无引用导出
3. 避免 store 间交叉依赖
4. 统一 `use` 前缀命名

### 5.2 中间件整合

```typescript
// 统一错误处理中间件
const storeWithMiddleware = (set, get, api) => ({
  ...api,
  _errorHandler: (error) => {
    console.error('Store error:', error)
    Sentry.captureException(error)
  },
})

// 统一持久化策略
const persistConfig = {
  name: '7zi-storage',
  partialize: (state) => ({ /* 只持久化需要的字段 */ }),
}
```

---

## 6. 监控体系整合

### 6.1 performance + performance-monitoring 合并

**合并后结构**:

```
src/lib/monitoring/
├── index.ts                 # 统一导出
├── types.ts                 # 统一类型定义
├── collector.ts             # 指标收集
├── aggregator.ts            # 指标聚合 (已优化 O(n))
├── budget.ts                # 预算控制
├── alerting/                # 告警系统
│   ├── rules.ts
│   ├── notifier.ts
│   └── threshold-detector.ts
└── anomaly/                 # 异常检测
    ├── detector.ts
    └── root-cause.ts
```

**合并时间线**:
- Week 1: 制定统一 API 接口
- Week 2: 迁移 performance-monitoring 功能
- Week 3: 删除 performance 旧代码
- Week 4: 全量测试验证

### 6.2 缺失依赖修复

```bash
# 🔴 严重 - WebSocket 功能失效
npm install socket.io

# 🟠 中等 - Redis 限流不可用
npm install ioredis

# 🟢 低 - Storybook 依赖
npm install @storybook/react @storybook/addon-themes
```

---

## 7. 实施计划

### Sprint 1: 性能优化 (Week 1-2)

| 任务 | 负责 | 优先级 |
|------|------|--------|
| 修复 N+1 查询 (monitoring) | Executor | 🔴 |
| 修复桶分配 O(n²) | Executor | 🔴 |
| 大组件懒加载 | Executor | 🟠 |
| Bundle 分析与优化 | Executor | 🟠 |
| 构建性能优化 (TS 配置) | Executor | 🟠 |

### Sprint 2: 可扩展性 (Week 3-4)

| 任务 | 负责 | 优先级 |
|------|------|--------|
| 消除循环依赖 | Executor | 🔴 |
| lib/ 层结构重构 | Executor | 🟠 |
| 监控模块合并规划 | 架构师 | 🟠 |
| 模块导出规范化 | Executor | 🟠 |

### Sprint 3: 技术债务 (Week 5-6)

| 任务 | 负责 | 优先级 |
|------|------|--------|
| AI 模块 TS 错误修复 | Executor | 🔴 |
| any 类型清理 | Executor | 🟠 |
| 死代码删除 | Executor | 🟠 |
| Zustand store 规范化 | Executor | 🟠 |

### Sprint 4: 收尾与测试 (Week 7-8)

| 任务 | 负责 | 优先级 |
|------|------|--------|
| 监控模块合并实施 | Executor | 🟡 |
| 依赖升级 | Executor | 🟡 |
| 集成测试验证 | Tester | 🟠 |
| 性能基准测试 | Executor | 🟠 |

---

## 8. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 监控模块合并破坏现有功能 | 高 | 中 | 分阶段合并，充分测试 |
| 循环依赖修复引入新问题 | 中 | 低 | 使用 madge 持续监控 |
| Bundle 重构影响首屏加载 | 高 | 中 | A/B 测试验证 |
| TypeScript 大规模重构耗时 | 中 | 高 | 分模块提交，Code Review |

---

## 9. 成功指标

| 指标 | 当前值 | 目标值 | 验收方式 |
|------|--------|--------|----------|
| 主 Bundle 体积 | >400KB | <300KB | `npm run build:analyze` |
| LCP | ~2.5s | <1.5s | Lighthouse CI |
| 构建时间 | ~106s | <90s | CI 日志 |
| TypeScript 错误 | 571 | 0 | `npm run type-check` |
| any 类型使用 | 155 | <20 | ESLint 规则 |
| 循环依赖 | 6 | 0 | `madge --circular` |
| 死代码文件 | >10 | 0 | 静态分析 |

---

## 附录

### A. 相关文档

- [v1.5.0 架构改进计划](./ARCHITECTURE_V150_IMPROVEMENT_PLAN.md)
- [P0 架构改进计划](./ARCHITECTURE_IMPROVEMENT_PLAN_P0.md)
- [Bundle 分析报告](./BUNDLE_ANALYSIS_20260326.md)
- [性能优化报告](./BUILD_PERFORMANCE_OPTIMIZATION_20260331.md)
- [Next.js 16 兼容性报告](./REPORT_NEXTJS16_COMPAT_20260407.md)

### B. 工具命令

```bash
# Bundle 分析
npm run build:analyze

# TypeScript 检查
npm run type-check

# 循环依赖检测
npm run dep:check

# 死代码检测
npm run check:unused

# 构建性能基准
npm run benchmark
```
