# 7zi React 前端性能优化方案

**🏗️ 架构师报告**
**日期**: 2026-10-21
**模型**: MiniMax-M2.7
**项目**: 7zi Frontend (v1.14.1)

---

## 一、性能现状总览

### 1.1 Bundle 分析摘要

| 指标 | 数值 | 评估 |
|------|------|------|
| 客户端 JS 总大小 | ~3.4 MB | ⚠️ 可优化 |
| 最大 Chunk (THREE.js) | 1020 KB | ✅ 已懒加载 |
| ECharts Chunk | 325 KB | ⚠️ 需检查 |
| Lucide Icons Chunk | 229 KB | ✅ 已优化 |
| 首屏 JS (gzip) | ~150-200 KB | ✅ 良好 |
| React 版本 | 19.2.5 | ✅ 最新 |

### 1.2 已有优化措施

- ✅ THREE.js 动态导入（交互触发加载）
- ✅ Lucide/Recharts `optimizePackageImports` 配置
- ✅ Webpack splitChunks 精细化分包
- ✅ React Compiler `annotation` 模式启用
- ✅ 图片 AVIF/WebP 双格式支持
- ✅ `LazyImage` / `LazyChart` 懒加载组件封装
- ✅ Zustand 状态管理 + 细粒度选择器
- ✅ PWA Service Worker 缓存策略

---

## 二、关键性能瓶颈分析

### 2.1 代码分割 / 懒加载

**问题 1: ECharts 直接引用（非 Tree-shaking）**

```tsx
// 当前问题：完整导入 echarts 约 325KB
import * as echarts from 'echarts'  // ❌ 错误方式
```

**现状**:
- `ExecutionTrendChart.tsx` 使用 Recharts（已配置 `optimizePackageImports`）
- 但 `MetricChart.tsx` / `ResourceUsageChart.tsx` / `NodePerformanceChart.tsx` 可能直接引用 ECharts
- 需要确认 ECharts 是否已懒加载

**问题 2: 页面级代码分割不完整**

当前 `next.config.ts` 只做了库级别分割，缺少页面级动态导入：
- `/dashboard` 页面可能打包了所有 dashboard 组件
- `/analytics` 页面可能打包了所有图表组件
- 应使用 `next/dynamic` 进一步分割页面子模块

**问题 3: React Compiler 仅有 annotation 模式**

`reactCompiler.compilationMode: 'annotation'` 只优化标注了 `'use memo'` 的组件，建议升级为 `'infer'` 模式。

---

### 2.2 组件缓存 (Memoization)

**现状**:
- ✅ `Button.tsx` 使用 `React.memo`（第 241、276、323 行）
- ✅ `app-store.ts` 提供了细粒度选择器（`selectDarkMode`, `selectSidebarOpen` 等）
- ⚠️ 大量 UI 组件（`Input.tsx`, `Select.tsx`, `Navigation.tsx`）未使用 `React.memo`

**未优化组件示例**:

```tsx
// components/ui/Navigation.tsx - 无 memo 包装
// components/ui/TaskCard.tsx - 无 memo 包装
// components/rooms/RoomCard.tsx - 无 memo 包装
```

**Zustand 选择器优化空间**:

```tsx
// 当前：整个 settings 对象订阅
const { darkMode, sidebarOpen } = useAppStore()

// 优化后：细粒度订阅
const darkMode = useAppStore(s => s.settings.darkMode)  // ✅
const sidebarOpen = useAppStore(s => s.settings.sidebarOpen)  // ✅
```

---

### 2.3 图片优化策略

**现状** ✅:
- Next.js Image 组件 + AVIF/WebP 双格式
- `LazyImage.tsx` 封装了 Intersection Observer
- 图片尺寸分级配置完善

**可优化点**:

1. **Blur Placeholder 生成时机** — 当前 `blurDataURL` 需手动传入，应在构建时自动生成
2. **`srcSet` 响应式策略** — `LazyImage` 的 `srcSet` 参数需手动配置，建议自动生成
3. **图片预加载** — `useImagePreload.ts` hook 存在但可能未充分利用
4. **CLS (Cumulative Layout Shift)** — 需确保所有图片有明确的 `width/height` 或 `fill`

---

### 2.4 状态管理优化

**Zustand Store 分析**:

| Store | 大小 | 持久化 | 优化空间 |
|-------|------|--------|----------|
| `app-store.ts` | 中 | ✅ | 细粒度选择器已提供 |
| `auth-store.ts` | 大 | ✅ | 需检查 selector |
| `room-store.ts` | 中 | ✅ | 需检查 selector |
| `websocket-store.ts` | 小 | ❌ | ✅ 良好 |
| `notification-store.ts` | 小 | ✅ | 需检查 selector |

**问题**: `auth-store.ts` 和 `room-store.ts` 未提供导出选择器，可能导致过度渲染。

---

### 2.5 构建优化

**当前配置优势**:
- Webpack splitChunks 已经很完善
- `optimizePackageImports` 配置丰富
- PWA 配置完整

**可优化点**:

1. **CSS 优化** — `experimental.optimizeCss: true` 已开启，但 Tailwind chunk 仍达 132KB
2. **Babel vs SWC** — `babel-plugin-react-compiler` 已配置，但与 Turbopack 混用可能有问题
3. **Bundle Analyzer** — `build:analyze` 脚本存在但未集成到 CI
4. **Tree-shaking** — 部分库（如 `exceljs`, `qrcode`）未加入 `optimizePackageImports`

---

## 三、优化方案设计

### P0 - 紧急优化（立即执行）

#### 3.1 ECharts 懒加载修复

**问题**: ECharts 完整包 325KB 可能在首屏加载

**方案**: 检查所有 ECharts 引用，确保使用动态导入

```tsx
// components/analytics/charts/EChartsWrapper.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface EChartsWrapperProps {
  option: EChartsOption
  loading?: boolean
}

export function EChartsWrapper({ option, loading }: EChartsWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [echarts, setEcharts] = useState<typeof import('echarts') | null>(null)

  useEffect(() => {
    // 懒加载 echarts 核心
    import('echarts').then(mod => {
      setEcharts(mod)
    })
  }, [])

  useEffect(() => {
    if (!echarts || !containerRef.current) return
    const chart = echarts.init(containerRef.current)
    chart.setOption(option)
    return () => chart.dispose()
  }, [echarts, option])

  if (loading) return <ChartSkeleton />
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

**执行步骤**:
1. `grep -r "from 'echarts'" src/` 检查所有引用
2. 将直接引用替换为动态导入
3. 验证 bundle 大小变化

---

#### 3.2 Zustand Store 选择器优化

**问题**: 不使用细粒度选择器会导致任何 state 变化都触发重渲染

**方案**: 为所有 store 添加导出选择器，并推广使用

```tsx
// stores/auth-store.ts 新增
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => !!state.user
export const selectAuthLoading = (state: AuthState) => state.loading

// stores/room-store.ts 新增
export const selectRooms = (state: RoomState) => state.rooms
export const selectActiveRoom = (state: RoomState) => state.activeRoom
```

**执行步骤**:
1. 为 `auth-store.ts` 添加 3-5 个选择器
2. 为 `room-store.ts` 添加 3-5 个选择器
3. 在组件中替换 `useStore(state => state.xxx)` 为 `useStore(selectXxx)`

---

### P1 - 短期优化（1-2 周）

#### 3.3 React Compiler 升级为 'infer' 模式

**收益**: 自动优化所有组件的 memo/useMemo，无需逐个添加 `'use memo'`

```tsx
// next.config.ts
reactCompiler: {
  compilationMode: 'infer',  // 改为 infer
},
```

**风险**: 需全面测试，防止编译错误

**执行步骤**:
1. 在开发环境测试 `infer` 模式
2. 运行 `npm run build` 验证
3. 执行 Vitest 测试套件
4. 如有问题，降级回 `annotation` 模式

---

#### 3.4 页面级代码分割

**方案**: 为重页面添加 `next/dynamic`

```tsx
// app/[locale]/dashboard/page.tsx
import dynamic from 'next/dynamic'

const DashboardStats = dynamic(
  () => import('@/features/dashboard/components/DashboardStats'),
  { ssr: false, loading: () => <DashboardStatsSkeleton /> }
)

const MetricChart = dynamic(
  () => import('@/features/dashboard/components/MetricChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
```

**执行步骤**:
1. 识别 dashboard 页面中的重组件（MetricChart、StatCard）
2. 应用 `next/dynamic` 包装
3. 验证 Lighthouse Performance Score 提升

---

#### 3.5 UI 组件 React.memo 补充

**方案**: 为高频渲染组件添加 memo

```tsx
// components/ui/Input.tsx
import React, { memo } from 'react'

export const Input = memo(function Input({ ... }) { ... })

// components/ui/Select.tsx
export const Select = memo(function Select({ ... }) { ... })

// components/ui/Navigation.tsx
export const Navigation = memo(function Navigation({ ... }) { ... })
```

**优先组件**:
1. `Input.tsx`, `Select.tsx`, `Button.tsx` (已有)
2. `Card.tsx`, `Badge.tsx`, `Skeleton.tsx`
3. `Navigation.tsx`, `Tabs.tsx`, `Modal.tsx`
4. `TaskCard.tsx`, `RoomCard.tsx`

---

#### 3.6 图片优化增强

**方案 1: blur placeholder 自动生成**

```tsx
// next.config.ts
images: {
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60 * 60 * 24 * 30,
  // 新增：远程图片 blur placeholder
  remotePatterns: [...],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  sizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**方案 2: 统一使用 Next.js Image**

审计所有 `<img>` 标签，替换为 `<Image>` 组件

```bash
grep -rn "<img " src/ --include="*.tsx" | grep -v "next/image"
```

---

### P2 - 中期优化（1 个月）

#### 3.7 optimizePackageImports 补充

**当前配置**:
```tsx
optimizePackageImports: [
  'lucide-react', 'zustand', 'web-vitals', 'date-fns',
  'three', '@react-three/fiber', '@react-three/drei',
  'recharts', 'zod', 'react-i18next', 'i18next',
  'clsx', 'tailwind-merge'
]
```

**建议新增**:
```tsx
optimizePackageImports: [
  // 现有
  'lucide-react', 'zustand', 'web-vitals', 'date-fns',
  'three', '@react-three/fiber', '@react-three/drei',
  'recharts', 'zod', 'react-i18next', 'i18next',
  'clsx', 'tailwind-merge',
  // 新增
  'exceljs',      // 大型库，仅在工作流导出时使用
  'qrcode',       // 仅在房间/注册页面使用
  'socket.io-client', // 仅在实时页面使用
  'lowlight',     // 代码高亮，仅在编辑器使用
]
```

---

#### 3.8 Bundle Analyzer 集成 CI

**方案**: 在 CI 中运行 `build:analyze`，上传报告到 Artifacts

```yaml
# .github/workflows/bundle-size.yml
- name: Build and Analyze
  run: npm run build:analyze
- name: Upload Bundle Report
  uses: actions/upload-artifact@v4
  with:
    name: bundle-report
    path: .next/analyze/
```

---

#### 3.9 Webpack SplitChunks 调优

**当前问题**: `maxAsyncChunkSize: 200KB` 可能导致过多小请求

**建议调整**:
```tsx
config.optimization.splitChunks = {
  // ... 现有配置
  maxInitialRequests: 40,   // 增加并行请求上限
  maxAsyncChunkSize: 300 * 1024,  // 放宽异步 chunk 大小
  maxSize: 200 * 1024,      // 降低默认大小以强制分割
}
```

---

### P3 - 长期优化（季度）

#### 3.10 运行时性能监控

**方案**: 集成 Web Vitals 持续监控

```tsx
// hooks/usePerformanceMonitoring.ts
import { onLCP, onFID, onCLS, onINP } from 'web-vitals'

export function usePerformanceMonitoring() {
  useEffect(() => {
    onLCP(console.log)
    onFID(console.log)
    onCLS(console.log)
    onINP(console.log)
  }, [])
}
```

---

#### 3.11 服务端组件 (RSC) 迁移

**方案**: 将更多组件迁移为 Server Components，减少客户端 JS

```tsx
// app/[locale]/dashboard/page.tsx
// 不添加 'use client'，自动成为 Server Component
export default async function DashboardPage() {
  const data = await fetchDashboardData()
  return <Dashboard data={data} />
}
```

---

## 四、实施计划

### 4.1 优先级矩阵

| 优化项 | 工作量 | 收益 | 优先级 |
|--------|--------|------|--------|
| ECharts 懒加载 | 中 | 高 | P0 |
| Zustand 选择器优化 | 低 | 高 | P0 |
| React Compiler infer 模式 | 低 | 高 | P1 |
| 页面级代码分割 | 中 | 高 | P1 |
| UI 组件 memo 补充 | 中 | 中 | P1 |
| 图片优化增强 | 低 | 中 | P1 |
| optimizePackageImports 补充 | 低 | 中 | P2 |
| Bundle Analyzer CI | 低 | 中 | P2 |
| SplitChunks 调优 | 低 | 低 | P2 |
| Web Vitals 监控 | 低 | 中 | P3 |
| RSC 迁移 | 高 | 高 | P3 |

### 4.2 执行时间线

```
Week 1: P0 优化（ECharts + Zustand 选择器）
Week 2-3: P1 优化（Compiler 模式 + 页面分割 + memo）
Week 4: P1 收尾 + P2 部分
Month 2: P2 完成 + P3 规划
Month 3+: P3 实施
```

---

## 五、预期收益

### 5.1 性能指标目标

| 指标 | 当前 | 目标 | 优化手段 |
|------|------|------|----------|
| LCP | ~2.5s | < 2.0s | 减少首屏 JS |
| FID/INP | ~100ms | < 50ms | memo + 选择器 |
| CLS | ~0.1 | < 0.05 | 图片尺寸固定 |
| 首屏 JS (gzip) | ~200KB | < 150KB | 代码分割 |
| 最大 Chunk | 1020KB | < 500KB | 懒加载 |

### 5.2 Lighthouse 预估

| 页面 | 当前 Score | 目标 Score |
|------|-----------|-----------|
| 首页 | ~85 | ~95 |
| Dashboard | ~75 | ~90 |
| Analytics | ~70 | ~88 |

---

## 六、相关文件索引

- Bundle 配置: `7zi-frontend/next.config.ts`
- 动态导入工具: `7zi-frontend/src/lib/dynamic-import.tsx`
- 懒加载图表: `7zi-frontend/src/components/analytics/charts/LazyChart.tsx`
- 懒加载图片: `7zi-frontend/src/components/ui/LazyImage.tsx`
- 状态管理: `7zi-frontend/src/stores/app-store.ts`
- Bundle 分析报告: `BUNDLE_ANALYSIS_20261020.md`

---

*🏗️ 架构师 - 报告完毕*
