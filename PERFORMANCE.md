# 7zi 性能监控体系

**文档版本:** 1.0  
**最后更新:** 2026-03-15  
**负责人:** 性能工程师

---

## 📊 执行摘要

本文档定义了 7zi 项目的性能监控体系，包括：
- 现有监控方案分析
- API 响应时间优化建议
- 前端渲染性能优化
- 性能预算和监控策略

---

## 1. 现有性能监控方案

### 1.1 监控架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    性能监控架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Web Vitals  │    │  API 性能   │    │  系统指标   │     │
│  │  (前端)     │    │  (后端)     │    │  (运行时)   │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │            │
│         └─────────────┬────┴──────────────────┘            │
│                       ▼                                     │
│              ┌─────────────────┐                           │
│              │  性能指标存储    │                           │
│              │  (内存存储)      │                           │
│              └────────┬────────┘                           │
│                       │                                     │
│         ┌─────────────┼─────────────┐                      │
│         ▼             ▼             ▼                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│  │/api/health│ │/api/perf  │ │  告警系统  │                │
│  │ /detailed │ │  ormance  │ │  (Slack)  │                │
│  └───────────┘ └───────────┘ └───────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

#### 1.2.1 性能指标系统 (`src/lib/monitoring/performance-metrics.ts`)

**功能：**
- API 端点响应时间追踪
- 百分位计算 (P50, P95, P99)
- 系统资源快照 (内存, CPU)
- 每小时统计数据

**数据结构：**
```typescript
interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  errors: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
}

interface SystemSnapshot {
  timestamp: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    usagePercent: number;
  };
  cpu: {
    user: number;
    system: number;
    loadAverage: number[];
  };
  uptime: number;
}
```

**存储限制：**
- 响应时间记录：每端点最近 100 条
- 系统快照：最近 60 个 (1小时)
- 小时统计：按需清理

#### 1.2.2 Web Vitals 监控 (`src/lib/monitoring/web-vitals.ts`)

**监控指标：**
| 指标 | 说明 | 良好阈值 | 需改进阈值 |
|------|------|----------|------------|
| LCP | 最大内容绘制 | ≤ 2.5s | ≤ 4.0s |
| CLS | 累积布局偏移 | ≤ 0.1 | ≤ 0.25 |
| TTFB | 首字节时间 | ≤ 800ms | ≤ 1.8s |
| FCP | 首次内容绘制 | ≤ 1.8s | ≤ 3.0s |
| INP | 交互响应时间 | ≤ 200ms | ≤ 500ms |

#### 1.2.3 性能 API (`src/app/api/performance/route.ts`)

**查询模式：**

| 参数 | 说明 |
|------|------|
| `detail=summary` | 概要统计（默认） |
| `detail=full` | 完整指标 |
| `detail=endpoints` | 端点详情 |
| `detail=system` | 系统资源 |
| `detail=hourly` | 按小时统计 |
| `limit=N` | 限制返回数量 |

**示例请求：**
```bash
# 获取慢端点
curl /api/performance?detail=endpoints&limit=5

# 获取系统资源历史
curl /api/performance?detail=system&limit=10

# 获取完整报告
curl /api/performance?detail=full
```

#### 1.2.4 性能中间件 (`src/lib/middleware/performance-middleware.ts`)

**使用方式：**
```typescript
// 方式 1: 包装器（推荐）
import { withPerformanceTracking } from '@/lib/middleware/performance-middleware';

export const GET = withPerformanceTracking(async (request) => {
  return NextResponse.json({ data: 'ok' });
});

// 方式 2: 手动追踪
import { trackPerformance } from '@/lib/middleware/performance-middleware';

export async function GET(request: NextRequest) {
  const tracker = trackPerformance('/api/custom', 'GET');
  
  try {
    const result = await doWork();
    tracker.end(false);
    return NextResponse.json(result);
  } catch (error) {
    tracker.end(true);
    throw error;
  }
}
```

### 1.3 现有测试工具

#### 性能测试脚本 (`scripts/performance-test.ts`)

**功能：**
- 多端点并发测试
- 多次迭代统计
- 压力测试模式
- 详细报告输出

**使用方法：**
```bash
# 运行默认测试 (3次迭代)
npx tsx scripts/performance-test.ts

# 自定义迭代次数
npx tsx scripts/performance-test.ts --iterations=5

# 压力测试特定端点
npx tsx scripts/performance-test.ts --stress=/api/tasks --count=100
```

#### 性能报告 (`performance/` 目录)

| 文件 | 说明 |
|------|------|
| `PERFORMANCE_BASELINE_REPORT.md` | 基准测试结果 |
| `OPTIMIZATION_GUIDE.md` | 优化建议 |
| `measure-performance.js` | 性能测量脚本 |
| `monitor.js` | 持续监控脚本 |

---

## 2. API 响应时间分析

### 2.1 端点清单与性能状态

| 端点 | 方法 | 当前状态 | 响应时间目标 | 优先级 |
|------|------|----------|--------------|--------|
| `/api/tasks` | GET | ⚠️ 346ms | < 100ms | 高 |
| `/api/tasks` | POST | 未测量 | < 150ms | 中 |
| `/api/tasks` | PUT | 未测量 | < 100ms | 中 |
| `/api/tasks/:id/assign` | POST | 未测量 | < 200ms | 中 |
| `/api/projects` | GET | ✅ 16ms | < 100ms | 低 |
| `/api/logs` | GET | ✅ 21ms | < 100ms | 低 |
| `/api/health` | GET | ✅ < 10ms | < 50ms | 低 |
| `/api/health/detailed` | GET | 未测量 | < 200ms | 中 |
| `/api/knowledge/nodes` | GET | 未测量 | < 150ms | 中 |
| `/api/knowledge/lattice` | GET | 未测量 | < 200ms | 中 |
| `/api/notifications` | GET | 未测量 | < 100ms | 中 |

### 2.2 性能跟踪集成状态

**当前问题：**
- ❌ 大多数 API 路由未集成性能跟踪中间件
- ❌ `tasks/route.ts` 导入了中间件但未实际使用
- ❌ 缺少自动化的性能回归检测

**需要集成的文件：**
```
src/app/api/
├── auth/route.ts              ❌ 未集成
├── comments/route.ts          ❌ 未集成
├── knowledge/nodes/route.ts   ❌ 未集成
├── knowledge/edges/route.ts   ❌ 未集成
├── logs/route.ts              ❌ 未集成
├── notifications/route.ts     ❌ 未集成
├── projects/route.ts          ❌ 未集成
└── tasks/route.ts             ⚠️ 已导入未使用
```

### 2.3 API 优化建议

#### 高优先级

**1. `/api/tasks` 优化 (目标: 346ms → < 100ms)**

```typescript
// 当前问题：可能缺少索引优化

// 建议 1: 确保使用索引查询
import { queryTasks, paginateTasks } from '@/lib/data/tasks-indexed';

// 建议 2: 添加缓存层
const TASKS_CACHE_TTL = '2m';
const result = await cachedQuery(
  generateCacheKey('tasks', filters),
  () => paginateTasks(filters),
  { ttl: TASKS_CACHE_TTL, tags: ['tasks'] }
);

// 建议 3: 添加性能跟踪
export const GET = withPerformanceTracking(async (request: NextRequest) => {
  // ... 现有逻辑
});
```

**2. 统一集成性能中间件**

创建自动化脚本批量更新：
```bash
# 为所有 API 路由添加性能跟踪
for file in src/app/api/*/route.ts src/app/api/*/*/route.ts; do
  # 添加导入和包装器
done
```

#### 中优先级

**3. 知识图谱 API 优化**

```typescript
// knowledge/nodes/route.ts
export const GET = withPerformanceTracking(async (request) => {
  // 添加分页限制
  const limit = Math.min(searchParams.get('limit') || 50, 100);
  
  // 考虑添加缓存
  const cacheKey = `knowledge:nodes:${type}:${limit}`;
  // ...
});
```

---

## 3. 前端渲染性能

### 3.1 组件性能分析

#### Knowledge Lattice 3D 组件 (829 行)

**当前优化：**
- ✅ 使用 `useMemo` 缓存布局计算
- ✅ 使用 React Three Fiber 优化渲染

**潜在问题：**
- ⚠️ 3D 渲染可能影响低端设备
- ⚠️ 大量节点/边可能影响性能

**优化建议：**
```typescript
// 添加 LOD (Level of Detail)
<LOD>
  <mesh detailedGeometry />
  <mesh simpleGeometry />
</LOD>

// 添加实例化渲染
<InstancedMesh args={[geometry, material, nodeCount]}>
  {nodes.map((node, i) => (
    <Instance key={node.id} position={positions[i]} />
  ))}
</InstancedMesh>

// 添加性能监控
import { useFrame } from '@react-three/fiber';

useFrame(({ gl }) => {
  const info = gl.info;
  console.log('Triangles:', info.render.triangles);
});
```

#### Tasks 页面组件

**当前优化：**
- ✅ 使用 `useMemo` 过滤任务

**优化建议：**
```typescript
// 1. 虚拟列表（大量任务时）
import { VirtualList } from '@tanstack/react-virtual';

// 2. 懒加载组件
const TaskForm = lazy(() => import('./components/TaskForm'));
const AssignmentSuggester = lazy(() => import('./components/AssignmentSuggester'));

// 3. 防抖搜索
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

### 3.2 包体积优化

**当前配置 (`next.config.js`)：**
```javascript
experimental: {
  optimizePackageImports: [
    '@react-three/fiber',
    '@react-three/drei',
    'three',
    'chart.js',
    'react-chartjs-2',
    'fuse.js',
    'zustand',
    'next-intl',
    'next-themes',
  ],
}
```

**进一步优化建议：**
```javascript
// 添加 bundle 分析
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// 添加 Tree Shaking 配置
webpack: (config) => {
  config.optimization.usedExports = true;
  config.optimization.sideEffects = true;
  return config;
}
```

### 3.3 前端性能预算

| 指标 | 预算 | 当前 | 状态 |
|------|------|------|------|
| 首次加载 JS | < 150KB | 待测量 | ⚠️ |
| 首次加载 CSS | < 50KB | 待测量 | ⚠️ |
| 总资源数 | < 30 | 21 | ✅ |
| FCP | < 1.5s | 804ms | ✅ |
| LCP | < 2.5s | 待测量 | ⚠️ |
| TTI | < 3s | 890ms | ✅ |
| CLS | < 0.1 | 待测量 | ⚠️ |

---

## 4. 性能监控策略

### 4.1 监控层级

```
┌────────────────────────────────────────────────────┐
│                  监控金字塔                         │
├────────────────────────────────────────────────────┤
│                                                    │
│                    ┌───────┐                       │
│                    │ 告警  │ ← 性能预算超限告警    │
│                    └───┬───┘                       │
│                ┌───────┴───────┐                   │
│                │   仪表板      │ ← 可视化趋势      │
│                └───────┬───────┘                   │
│            ┌───────────┴───────────┐               │
│            │      日志聚合         │ ← 结构化日志  │
│            └───────────┬───────────┘               │
│        ┌───────────────┴───────────────┐           │
│        │         指标收集              │           │
│        │  ┌─────────┐ ┌─────────┐     │           │
│        │  │WebVitals│ │API Perf │     │           │
│        │  └─────────┘ └─────────┘     │           │
│        └───────────────────────────────┘           │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 4.2 监控指标清单

#### 实时监控（每分钟）

| 指标 | 来源 | 告警阈值 |
|------|------|----------|
| API P95 响应时间 | `/api/performance` | > 500ms |
| 错误率 | `/api/performance` | > 5% |
| 内存使用 | SystemSnapshot | > 80% |
| CPU 负载 | SystemSnapshot | > 80% |

#### 定期监控（每小时）

| 指标 | 来源 | 告警阈值 |
|------|------|----------|
| Web Vitals (LCP) | 浏览器上报 | > 2.5s |
| Web Vitals (CLS) | 浏览器上报 | > 0.1 |
| 请求数趋势 | HourlyStats | 异常波动 |
| 慢端点排名 | `/api/performance` | 新增慢端点 |

#### 每日报告

- 性能趋势分析
- Top 5 慢端点
- 错误率统计
- 资源使用峰值

### 4.3 告警配置

**Slack 告警 (已有基础设施)：**
```typescript
// 使用现有告警系统
import { sendSlackAlert } from '@/lib/monitoring/alerts';

// 性能告警规则
const PERFORMANCE_ALERTS = {
  apiSlowResponse: {
    condition: (metrics) => metrics.p95 > 500,
    severity: 'warning',
    message: 'API P95 响应时间超过 500ms',
  },
  highErrorRate: {
    condition: (metrics) => metrics.errorRate > 5,
    severity: 'critical',
    message: 'API 错误率超过 5%',
  },
  memoryHigh: {
    condition: (snapshot) => snapshot.memory.usagePercent > 80,
    severity: 'warning',
    message: '内存使用超过 80%',
  },
};
```

### 4.4 性能预算执行

```yaml
# performance-budget.yaml
budgets:
  - resourceType: script
    budget: 150KB
  - resourceType: stylesheet
    budget: 50KB
  - resourceType: image
    budget: 500KB
  - resourceType: total
    budget: 1MB
  - metric: first-contentful-paint
    budget: 1500ms
  - metric: largest-contentful-paint
    budget: 2500ms
  - metric: cumulative-layout-shift
    budget: 0.1
  - metric: total-blocking-time
    budget: 300ms
```

---

## 5. 优化路线图

### Phase 1: 基础完善（第 1-2 周）

**目标：** 完善性能监控基础设施

- [ ] 为所有 API 路由集成性能中间件
- [ ] 配置自动化性能测试 CI 流程
- [ ] 建立性能基线数据
- [ ] 配置 Slack 告警规则

**命令：**
```bash
# 运行基线测试
npm run perf:baseline

# 检查当前性能
npx tsx scripts/performance-test.ts --iterations=5
```

### Phase 2: API 优化（第 3-4 周）

**目标：** 所有 API 响应时间 < 200ms

- [ ] 优化 `/api/tasks` 端点
- [ ] 添加 Redis 缓存层
- [ ] 优化数据库查询索引
- [ ] 实现请求去重

### Phase 3: 前端优化（第 5-6 周）

**目标：** Core Web Vitals 全绿

- [ ] 实施组件懒加载
- [ ] 添加虚拟列表
- [ ] 优化 3D 渲染性能
- [ ] 图片优化和懒加载

### Phase 4: 持续监控（持续）

**目标：** 建立性能文化和自动化

- [ ] 每周性能报告
- [ ] 性能预算 CI 检查
- [ ] 性能回归自动告警
- [ ] 季度性能审计

---

## 6. 快速参考

### 常用命令

```bash
# 开发环境
npm run dev                    # 启动开发服务器

# 性能测试
npx tsx scripts/performance-test.ts           # API 性能测试
npm run perf:baseline                         # 基准测试
npm run perf:monitor                          # 持续监控

# 构建分析
npm run build:analyze          # 分析 bundle 大小

# 查看性能 API
curl http://localhost:3000/api/performance?detail=full
curl http://localhost:3000/api/health/detailed?include=performance
```

### 性能 API 端点

| 端点 | 说明 |
|------|------|
| `/api/performance` | 性能指标汇总 |
| `/api/performance?detail=endpoints` | 端点详情 |
| `/api/performance?detail=system` | 系统资源 |
| `/api/health/detailed` | 包含性能的健康检查 |

### 关键文件

| 文件 | 说明 |
|------|------|
| `src/lib/monitoring/performance-metrics.ts` | 性能指标收集 |
| `src/lib/monitoring/web-vitals.ts` | Web Vitals 监控 |
| `src/lib/middleware/performance-middleware.ts` | 性能中间件 |
| `src/app/api/performance/route.ts` | 性能 API |
| `scripts/performance-test.ts` | 性能测试脚本 |
| `performance/` | 性能报告目录 |

---

## 7. 附录

### A. 性能测试检查清单

**每次发布前：**
- [ ] 运行 `npm run build` 无错误
- [ ] 运行性能测试脚本
- [ ] 检查 `/api/performance` 指标
- [ ] 验证 Web Vitals 在阈值内

**每周审查：**
- [ ] 分析性能趋势
- [ ] 识别新的慢端点
- [ ] 检查告警记录
- [ ] 更新性能预算

### B. 故障排查指南

**问题：API 响应慢**
```bash
# 1. 检查当前指标
curl /api/performance?detail=endpoints

# 2. 检查系统资源
curl /api/performance?detail=system

# 3. 运行压力测试
npx tsx scripts/performance-test.ts --stress=/api/slow-endpoint --count=50
```

**问题：内存使用高**
```bash
# 1. 检查内存快照
curl /api/performance?detail=system&limit=60

# 2. 检查是否有内存泄漏
# 查看内存趋势，正常应该稳定在一定范围
```

**问题：Web Vitals 差**
```bash
# 1. 检查 bundle 大小
npm run build:analyze

# 2. 检查资源加载
# 使用 Chrome DevTools Performance 面板

# 3. 检查布局偏移
# 查看控制台 CLS 警告
```

---

**文档维护：**
- 每两周更新一次性能数据
- 每月审查优化进度
- 重大变更时更新架构图

**联系方式：**
- 性能问题：创建 Issue 并标记 `performance` 标签
- 紧急问题：Slack #performance 频道
