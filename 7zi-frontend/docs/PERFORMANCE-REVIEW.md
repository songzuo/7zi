# 7zi 前端性能优化建议报告

**项目**: 7zi-frontend
**版本**: v1.14.x
**分析日期**: 2026-05-08
**分析者**: 咨询师 (子代理)

---

## 📋 目录

1. [Next.js 图片优化配置](#1-nextjs-图片优化配置)
2. [不必要的重渲染检查](#2-不必要的重渲染检查)
3. [Bundle 大小分析](#3-bundle-大小分析)
4. [API 请求缓存策略](#4-api-请求缓存策略)
5. [优化建议汇总](#5-优化建议汇总)

---

## 1. Next.js 图片优化配置

### ✅ 做得好的地方

| 配置项 | 当前值 | 评价 |
|--------|--------|------|
| 图片格式 | `['image/avif', 'image/webp']` | ✅ 优秀，AVIF 是最新最高效格式 |
| 设备尺寸 | `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]` | ✅ 覆盖主流设备 |
| 缓存 TTL | `60 * 60 * 24 * 30` (30天) | ✅ 非常合理 |
| 远程图片 | `hostname: '**'` | ⚠️ 安全风险，建议限制具体域名 |
| SVG 支持 | `dangerouslyAllowSVG: false` | ✅ 安全 |

### 📝 OptimizedImage 组件分析

`src/components/OptimizedImage.tsx` 实现了完整的优化方案：

- **预设系统** (`avatar`, `thumbnail`, `card`, `hero`, `content`, `logo`, `banner`)
- **LCP 优化** - hero/logo 设置 `priority: true`
- **懒加载** - 非 priority 图片默认 `loading="lazy"`
- **占位符** - 支持 blur 和空占位符
- **错误处理** - 显示回退 UI

### ⚠️ 需要改进

1. **Remote patterns 太宽**: `hostname: '**'` 可能导致安全风险，建议限制具体域名
2. **缺少图片预加载提示**: LCP 图片虽然设置了 priority，但可以在 `<head>` 中添加 `<link rel="preload">` 进一步优化

---

## 2. 不必要的重渲染检查

### ⚠️ 发现的问题

#### 2.1 Dashboard 组件缺少 useCallback

**文件**: `src/features/dashboard/components/Dashboard.tsx`

```tsx
// ❌ 当前：loadData 没有 useCallback，每次渲染创建新函数
useEffect(() => {
  loadData();
}, [timeRange]);

useEffect(() => {
  if (config.refreshInterval > 0) {
    const interval = setInterval(() => {
      loadData();  // 每次都创建新的 setInterval
    }, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }
}, [config.refreshInterval, timeRange]);
```

**影响**:
- `loadData` 函数每次渲染都会重新创建，导致 useEffect 依赖变化时重新执行
- `setInterval` 每 `refreshInterval` 秒会重新创建，浪费资源

#### 2.2 子组件没有 React.memo

**文件**: `src/features/dashboard/components/StatCard.tsx`, `MetricChart.tsx`, `TimeRangeSelector.tsx`

这些组件没有被 `React.memo` 包裹，父组件状态变化会导致不必要的重渲染。

```tsx
// ❌ StatCard.tsx 当前
export function StatCard({ ... }) { ... }

// ✅ 建议
export const StatCard = React.memo(function StatCard({ ... }) { ... });
```

#### 2.3 Dashboard useEffect 依赖问题

**文件**: `src/features/dashboard/components/Dashboard.tsx`

```tsx
// ❌ 问题：getStatCardData 在每次渲染都重新创建
const getStatCardData = (metricName: string, aggregation?: string): StatCardData | null => {
  // ... 大量逻辑
};

// ✅ 建议：使用 useMemo 缓存
const getStatCardData = useCallback((metricName: string, aggregation?: string): StatCardData | null => {
  // ... 逻辑
}, [stats, chartData]);
```

### ✅ 做得好的地方

- `MetricChart.tsx` 第 3 行: `import { useMemo } from 'react';` - 图表数据有 memoize
- 状态管理使用 Zustand，有细粒度 selector 优化 (见 `auth-store.ts` 注释 "添加细粒度选择器优化")

---

## 3. Bundle 大小分析

### ✅ 优秀的 webpack 分包策略

`next.config.ts` 配置了 20+ 个缓存组，策略合理：

| 库 | Chunk 名 | 最大限制 | 优先级 |
|----|----------|----------|--------|
| React/ReactDOM | `react-core` | 250KB | 36 |
| Next.js | `next-core` | 300KB | 35 |
| Three.js | `three-core` | 250KB | 70 |
| Zustand | `zustand` | 50KB | 32 |
| Lucide Icons | `lucide-icons` | 80KB | 41 |
| recharts | `chart-libs` | 200KB | 50 |

### ⚠️ 需要关注的问题

#### 3.1 库体积过大

| 库 | 版本 | 预估大小 | 风险 |
|----|------|----------|------|
| `three` | ^0.183.2 | ~600KB (完整库) | 🔴 高 |
| `@tiptap/*` | ^2.27.2 | ~300KB (多个扩展) | 🟡 中 |
| `exceljs` | ^4.4.0 | ~500KB | 🔴 高 (仅服务端需要) |
| `better-sqlite3` | ^12.8.0 | ~2MB | ✅ 已标记为 serverExternalPackages |
| `nodemailer` | ^8.0.5 | ~100KB | ✅ 已标记为 serverExternalPackages |
| `web-push` | ^3.6.7 | ~50KB | ✅ 已标记为 serverExternalPackages |

#### 3.2 重复打包风险

```js
// next.config.ts 存在重复配置
'three': { test: /three|@react-three/, ... }  // 第 295 行
'three-core': { test: /three/, ... }           // 第 140 行
'react-three': { test: /@react-three/, ... }   // 第 145 行
```

**问题**: Three.js 同时被 `three-core` 和 `three` 两个规则匹配，可能导致重复打包。

#### 3.3 建议的优化

```js
// 合并 three-core 和 three 规则，避免重复
'three-vendor': {
  test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
  name: 'three-vendor',
  priority: 70,
  reuseExistingChunk: true,
  enforce: true,
  maxSize: 400 * 1024,
},
```

---

## 4. API 请求缓存策略

### 🟡 部分 API 有缓存，部分没有

#### ✅ 有服务端缓存的 API

| API 路由 | 缓存实现 | TTL |
|----------|----------|-----|
| `GET /api/rooms/[id]` | `HotDataCache` (SHORT) | 5 分钟 |
| `GET /api/rooms` | `HotDataCache` | 可配置 |
| `GET /api/performance/*` | `HotDataCache` | 可配置 |

#### ⚠️ 缺少缓存的 API

| API 路由 | 问题 | 建议 |
|----------|------|------|
| `GET /api/analytics/*` | 无服务端缓存 | 添加 HotDataCache |
| `GET /api/feedback` | 无缓存 | 添加短期缓存 |
| Dashboard 前端 | 使用原生 fetch，无 SWR/React Query | 引入 SWR |

#### 🔴 客户端完全没有缓存

**文件**: `src/features/dashboard/services/dashboard-api.ts`

```ts
// 当前：每次调用都发起新请求
async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${MONITORING_API_URL}${endpoint}`, {
    // 没有 cache, revalidate 等选项
  });
  return response.json();
}
```

**影响**:
- 切换 time range 时重复请求相同数据
- 页面刷新后数据丢失
- 没有 stale-while-revalidate 体验

### PWA 缓存策略

`next.config.ts` 配置了 Workbox 缓存：

| 资源类型 | 策略 | TTL |
|----------|------|-----|
| 图片 | CacheFirst | 30 天 |
| JS/CSS | StaleWhileRevalidate | 7 天 |
| API | NetworkFirst | 5 分钟 |
| Fonts | CacheFirst | 1 年 |

✅ 策略合理。

---

## 5. 优化建议汇总

### 🔴 高优先级 (立即修复)

| # | 问题 | 修复方案 | 文件 |
|---|------|----------|------|
| 1 | Dashboard loadData 缺少 useCallback | 包装 loadData 为 useCallback | `Dashboard.tsx` |
| 2 | Dashboard auto-refresh setInterval 重复创建 | 合并为一个 useEffect | `Dashboard.tsx` |
| 3 | Three.js 重复打包 | 合并 webpack chunk 规则 | `next.config.ts` |
| 4 | 远程图片域名过于宽松 | 限制具体 hostname | `next.config.ts` |

### 🟡 中优先级 (建议改进)

| # | 问题 | 修复方案 | 文件 |
|---|------|----------|------|
| 5 | StatCard/MetricChart 缺少 React.memo | 添加 React.memo 包装 | `StatCard.tsx` 等 |
| 6 | Dashboard getStatCardData 缺少缓存 | 使用 useCallback | `Dashboard.tsx` |
| 7 | Analytics API 缺少服务端缓存 | 添加 HotDataCache | `analytics/*/route.ts` |
| 8 | Dashboard 客户端没有缓存 | 引入 SWR 或添加内存缓存 | `dashboard-api.ts` |

### 🟢 低优先级 (可选优化)

| # | 问题 | 修复方案 | 文件 |
|---|------|----------|------|
| 9 | LCP 图片可加 preload | 添加 `<link rel="preload">` | `layout.tsx` |
| 10 | `better-sqlite3` 体积 | 考虑替代方案 (如 sql.js) | `package.json` |
| 11 | `exceljs` 客户端打包 | 确认无客户端引用或移除 | `package.json` |

---

## 📊 总体评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 图片优化 | ⭐⭐⭐⭐ | Next.js 图片配置完善，OptimizedImage 组件设计良好 |
| 重渲染控制 | ⭐⭐⭐ | 有基础优化但 Dashboard 缺少关键 useCallback |
| Bundle 优化 | ⭐⭐⭐⭐ | webpack 分包策略优秀，但存在重复打包 |
| API 缓存 | ⭐⭐⭐ | 服务端有缓存但 Dashboard 客户端无缓存策略 |

**综合评分**: ⭐⭐⭐⭐ (4/5)

项目整体性能优化做得较好，主要短板在于 Dashboard 的 React 渲染优化和客户端 API 缓存缺失。

---

*报告生成时间: 2026-05-08 04:13 GMT+2*