# Bundle 分析报告 - 2026-10-20

## 概述

| 指标 | 值 |
|------|-----|
| `.next` 总大小 | **1.1 GB** (standalone 模式，包含了 server + client 构建产物) |
| 客户端 chunks 数量 | 76 个 JS 文件 |
| 客户端 chunks 总大小 | ~3.4 MB |
| 最大 chunk | 1020 KB (THREE.js) |
| 超过 100KB 的 chunks | **7 个** |

> 注：1.1GB 主要来自 standalone 输出目录中的 node_modules、server 文件和 .next 缓存。客户端实际需要加载的 JS 约 3-4MB (gzip 后约 1MB)。

---

## 超过 100KB 的模块 (按大小排序)

| 文件名 | 大小 | 内容 | 状态 |
|--------|------|------|------|
| `0kczzmm-a55_h.js` | **1020 KB** | THREE.js 3D 渲染引擎 | ✅ 已在 `KnowledgeLattice3D.tsx` 中使用 `dynamic()` 懒加载 |
| `3_iew6jpw4i_j.js` | **325 KB** | ECharts / zrender 图表库 | ⚠️ 需检查是否已懒加载 |
| `0wxc3x2towla9.js` | **229 KB** | Lucide React 图标库 | ✅ 已在 `next.config.ts` 中配置 `optimizePackageImports` |
| `090et2ffbfpew.js` | **161 KB** | Next.js 核心路由/RSC | ✅ 框架必需，无法优化 |
| `3n1-759krdiny.js` | **132 KB** | Tailwind CSS 类名处理/样式工具 | ⚠️ 需检查是否可进一步分割 |
| `3vejz3pthtp1d.js` | **116 KB** | vendor 公共依赖 | ⚠️ 可尝试进一步拆小 |
| `0cz1d0mv5g_q7.js` | **110 KB** | Polyfill (WebSocket, setImmediate 等) | ⚠️ 可考虑按需加载 |

---

## 代码分割分析

### ✅ 已有的优化

1. **THREE.js 懒加载** - `KnowledgeLatticeScene.tsx` 已通过 `dynamic(() => import(...))` 懒加载，3D 组件不会影响首屏
2. **Lucide 图标优化** - `next.config.ts` 中配置了 `optimizePackageImports: ['lucide-react']`，Tree-shaking 已启用
3. **Recharts 配置** - `optimizePackageImports: ['recharts']` 已配置
4. **Webpack splitChunks** - 已配置将 react-core、chart-libs、three-libs、utils-libs 分开打包

### ⚠️ 可优化的机会

#### 1. ECharts (325KB) - 关键优化点
**问题**: ECharts 完整包约 325KB，即使使用 dynamic import，如果多个页面都引用，会打包重复内容。

**优化方案**:
```tsx
// 推荐：按需引入 ECharts 组件
import type { EChartsOption } from 'echarts'
import('echarts/core').then(async (echarts) => {
  const [LineChart, BarChart, PieChart] = await Promise.all([
    import('echarts/charts'),
    import('echarts/charts'),
    import('echarts/charts'),
  ])
  echarts.use([LineChart, BarChart, PieChart])
  // 使用
})
```

**更好的方案**: 考虑用 `recharts` 替代 ECharts（已经在用），或确保 ECharts 只在 analytics 页面加载。

#### 2. Polyfill chunk (110KB) - 中等优化
**问题**: `0cz1d0mv5g_q7.js` 包含 WebSocket、setImmediate 等 polyfill，所有页面都加载。

**优化方案**: 检查 polyfill 配置，考虑只在需要 WebSocket 的页面动态引入。

#### 3. CSS 处理 chunk (132KB) - 低优先级
**问题**: Tailwind 类名处理逻辑较大。

**优化方案**: 确认是否可以通过 `tailwind.config.ts` 的 `content` 路径优化，减少扫描范围。

#### 4. vendor chunk (116KB) - 低优先级
**问题**: `3vejz3pthtp1d.js` 是 vendor 公共块，可能包含多个库的公共部分。

**优化方案**: 当前 `splitChunks.maxInitialRequests: 25` 已设置，可适当降低阈值强制更细粒度分割。

---

## 首屏加载分析

根据 `build-manifest.json`，首屏需要加载的 root chunks:

```
090et2ffbfpew.js (161KB) - React core
0vpv-zgcuhm6d.js  (33KB) - Next.js router
0wxc3x2towla9.js  (229KB) - Lucide icons (优化后)
3s20_dbo0e_22.js  (?)     - turbopack runtime
turbopack-3-ry682tkyiqk.js - turbopack
```

**首屏 JS 总计**: 约 500-600KB (未 gzip)，gzip 后约 150-200KB

---

## 优化建议 (优先级排序)

### P1 - 立即可做
1. **检查 ECharts 使用情况** - 确认哪些页面使用 ECharts，确保全部使用 `dynamic()` 懒加载
2. **验证 THREE.js 懒加载** - 确认 knowledge-lattice 页面外的页面不会直接引用 THREE.js

### P2 - 短期优化
3. **减少首屏 Lucide 图标** - 使用 `createLucideIcon` 按需创建图标，而不是全量导入
4. **拆分 polyfill** - 将 WebSocket polyfill 移到只在需要时加载

### P3 - 长期优化
5. **考虑 SWC 替代 Babel** - 如果使用 Babel 插件，确保配置正确
6. **分析并移除未使用的依赖** - 运行 `madge --warning --circular src/` 检查循环依赖和未用模块

---

## 当前配置评估

`next.config.ts` 中的优化配置已经相当完善：

```typescript
experimental: {
  optimizeCss: true,
  optimizePackageImports: ['lucide-react', 'recharts'],
}
```

```typescript
webpack: {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        react: { priority: 100 },
        charts: { priority: 80 },
        three: { priority: 80 },
        utils: { priority: 60 },
        vendor: { priority: 10 },
      }
    }
  }
}
```

**结论**: 项目 bundle 优化已经做得较好。主要剩余优化空间在 ECharts 懒加载和 Lucide 图标按需引入。

---

## 相关文件

- 构建配置: `next.config.ts`
- 3D 懒加载: `src/components/knowledge-lattice/KnowledgeLattice3D.tsx`
- 图标使用: 需搜索 `lucide-react` 使用位置
- 图表使用: `src/components/analytics/AnalyticsChart.tsx`, `src/app/[locale]/performance/PerformanceCharts.tsx`
