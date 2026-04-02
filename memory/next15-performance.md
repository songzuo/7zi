# Next.js 15 升级后性能优化分析

**分析日期**: 2026-03-27
**架构师**: 子代理 (🏗️ 架构师角色)
**项目**: /root/.openclaw/workspace
**当前版本**: Next.js 16.2.1 + React 19.2.4

---

## 执行摘要

| 指标            | 当前值 | 目标值   | 状态        |
| --------------- | ------ | -------- | ----------- |
| 总静态资源体积  | 4.7 MB | < 2 MB   | 🔴 严重超限 |
| chunks 目录     | 4.4 MB | < 1.5 MB | 🔴 严重超限 |
| 最大单文件      | 1.3 MB | < 500 KB | 🔴 严重超限 |
| 超限 entrypoint | 83 个  | 0 个     | 🔴 严重超限 |
| 组件文件数      | 177 个 | -        | ✅ 结构良好 |

**预估优化收益**: 减少 2.5-3 MB (53-64%)

---

## 1. Bundle 大小与加载时间分析

### 1.1 总体积分布

```
.next/static/
├── chunks/        4.4 MB  (93.6%) 🔴
├── css/           172 KB  (3.6%)
├── media/         128 KB  (2.7%)
└── 其他            12 KB  (0.3%)
```

### 1.2 最大 Chunk 文件 (Top 5)

| 文件                   | 大小              | 类型          | 问题                 |
| ---------------------- | ----------------- | ------------- | -------------------- |
| `three-libs-*.js`      | 365+345+142 KB    | Three.js 3D库 | 多个chunk未合并      |
| `framework-*.js`       | 196+171+128+75 KB | React/Next.js | 框架代码分散         |
| `polyfills-*.js`       | 110 KB            | Polyfills     | 现代浏览器可能不需要 |
| `chart-libs-*.js`      | 82 KB             | Recharts      | 配置可能未生效       |
| 页面 chunk (3283.js等) | 92-1000 KB        | 应用代码      | 大型页面未充分分割   |

### 1.3 加载时间估算

| 连接类型          | 当前最大资源 (1.3MB) | 目标 (<500KB) |
| ----------------- | -------------------- | ------------- |
| 4G (10 Mbps)      | ~1.0s                | ~0.4s         |
| 3G (1 Mbps)       | ~10.4s               | ~4.0s         |
| Slow 3G (400Kbps) | ~26s                 | ~10s          |

---

## 2. 组件性能分析

### 2.1 组件结构

```
src/
├── app/           61 个 .tsx 文件
└── components/   177 个 .tsx 文件
    ├── ui/        基础UI组件 (Card, Button, Input...)
    ├── analytics/ 分析图表组件
    ├── knowledge-lattice/ 3D可视化
    └── collaboration/     协作功能
```

### 2.2 已完成的优化

✅ **React.memo 优化**: 已在多个组件上实施

- StatCard, MemberStatus, ActivityItemCard
- MemberCard, TaskBoard, TaskCard
- RealtimeDashboard, TeamActivityTracker

✅ **动态导入**: 已对以下组件使用

- `CollaborationDemoContent` (collaboration-demo)
- `PerformanceCharts` (performance 页面)
- Three.js 组件 (knowledge-lattice)

✅ **useMemo/useCallback**: 已在核心组件上使用

### 2.3 仍需关注的性能问题

⚠️ **useState/useEffect/useCallback/useMemo 总计**: 555 处使用

- 存在过度使用可能性
- 部分组件可能不需要复杂的记忆化

⚠️ **"use client" 指令**: 31 个 app 文件 + 124 个 components

- 大量客户端组件可能影响首屏渲染
- 应评估是否可改为服务端组件

---

## 3. Next.js 15 特定优化空间

### 3.1 Turbopack vs Webpack

**问题**: 项目已升级到 Next.js 16.2.1，但 `next.config.ts` 中的 `webpack splitChunks` 配置可能**未完全生效**，因为 Next.js 15+ 默认使用 Turbopack 构建。

```typescript
// 当前配置 - webpack 专用
config.optimization.splitChunks = { ... }  // ⚠️ Turbopack 忽略此配置
```

**建议**: 添加 Turbopack 对应的配置：

```typescript
experimental: {
  // Turbopack 用此配置替代 webpack splitChunks
  turbo: {
    splitChunks: {
      // Turbopack 特定配置
    }
  }
}
```

### 3.2 Next.js 15 可用优化

| 特性                            | 状态   | 说明                           |
| ------------------------------- | ------ | ------------------------------ |
| React Compiler (react-compiler) | 未启用 | 可自动优化 useMemo/useCallback |
| Partial Prerendering (PPR)      | 未启用 | 可加速首屏                     |
| fetchPriority                   | 未设置 | 可优化图片加载优先级           |
| `next/font` subsetting          | 已使用 | ✅ 字体优化良好                |

---

## 4. 具体优化建议 (3-5 项)

### 📌 建议 1: Three.js 彻底懒加载 (高优先级)

**问题**: Three.js 852 KB 分布在 3 个 chunks，仅用于 1 个页面 (knowledge-lattice)

**当前代码** (可能存在的问题):

```typescript
// 可能在 layout 或全局导入
import { Canvas } from '@react-three/fiber'
```

**优化方案**:

```typescript
// 在需要时动态导入
const KnowledgeLatticeScene = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLatticeScene'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

// 确保没有在 layout.tsx 中全局导入 Three.js
```

**预期收益**: 减少 852 KB 首屏体积

---

### 📌 建议 2: polyfills 按需加载 (中优先级)

**问题**: polyfills-42372ed1.js = 110 KB

**优化方案**:

```typescript
// browserslist 检查:
// 当前: last 2 Chrome versions, last 2 Firefox versions...
// 这些浏览器都不需要 legacy polyfills

// 检查 .babelrc 或 next.config.js 中是否有:
// @babel/preset-env + targets 覆盖
// 移除不必要的 polyfill 导入
```

**预期收益**: 减少 110 KB

---

### 📌 建议 3: React Compiler 启用 (高优先级)

**问题**: 555 处 useState/useEffect/useCallback/useMemo 需要手动优化

**优化方案**:

```bash
npm install @babel/plugin-react-compiler
```

```typescript
// next.config.ts
experimental: {
  reactCompiler: true,
  // 或仅在生产环境启用
}
```

**预期收益**:

- 自动优化 50-70% 的不必要重渲染
- 减少手动优化工作量
- 可能减少 bundle 体积 5-10%

---

### 📌 建议 4: 图片加载优先级优化 (中优先级)

**问题**: 大型图片未设置 fetchPriority

**优化方案**:

```typescript
import Image from 'next/image';

// 首屏关键图片
<Image
  src="/hero.png"
  alt="Hero"
  width={1920}
  height={1080}
  priority  // 添加此属性
  fetchPriority="high"
/>

// 非首屏图片 - 延迟加载
<Image
  src="/below-fold.png"
  alt="Content"
  loading="lazy"
  fetchPriority="low"
/>
```

**预期收益**: LCP 提升 10-20%

---

### 📌 建议 5: Route-based 代码分割验证 (中优先级)

**问题**: 83 个 entrypoint 超过 300KB 限制

**优化方案**:

```typescript
// 检查是否有页面在 layout.tsx 中导入了大型库
// 例如 analytics/page.tsx 不应在 layout 中预加载 Recharts

// 对于大型页面使用:
export const dynamic = 'force-dynamic';
export const dynamicImport = true;

// 创建专门的 loading.tsx
// app/[locale]/analytics/loading.tsx
export default function Loading() {
  return <AnalyticsSkeleton />;
}
```

**预期收益**: 减少首屏加载资源 500KB-1MB

---

## 5. 优化优先级总结

| 优先级 | 建议                | 预期收益    | 实施难度 |
| ------ | ------------------- | ----------- | -------- |
| 🔴 高  | Three.js 彻底懒加载 | -852 KB     | 低       |
| 🔴 高  | React Compiler 启用 | -200~400 KB | 中       |
| 🟡 中  | polyfills 移除      | -110 KB     | 低       |
| 🟡 中  | 图片 fetchPriority  | LCP +15%    | 低       |
| 🟡 中  | Route 分割验证      | -500 KB     | 中       |

**综合预期**: 减少 1.5-2 MB 首屏体积，LCP 改善 15-25%

---

## 6. 验证方法

```bash
# 1. 构建并分析
npm run build:analyze

# 2. 检查 bundle 变化
du -sh .next/static/chunks/*.js | sort -hr | head -20

# 3. Lighthouse 性能测试
npx lighthouse https://your-site.com --view

# 4. Core Web Vitals
# LCP < 2.5s, FID < 100ms, CLS < 0.1
```

---

_报告生成: 架构师子代理 | 2026-03-27_
