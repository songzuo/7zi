# JavaScript Bundle 分析报告

**生成时间**: 2026-03-26
**项目**: 7zi-frontend (Next.js 14 App Router + Turborepo)
**分析工具**: Next.js Bundle Analyzer (Webpack mode)

---

## 执行摘要

### 关键发现

| 指标                 | 当前值 | 目标值   | 状态        |
| -------------------- | ------ | -------- | ----------- |
| 总体静态资源体积     | 4.7 MB | < 2 MB   | 🔴 需要优化 |
| chunks 目录体积      | 4.4 MB | < 1.5 MB | 🔴 需要优化 |
| 最大单文件           | 1.3 MB | < 500 KB | 🔴 严重超限 |
| 超限 entrypoint 数量 | 83 个  | 0 个     | 🔴 严重超限 |

### 潜在优化收益

**预计可减少**: 约 2.5 - 3 MB (53% - 64% 减少)

---

## 1. 总体 Bundle 体积

### 1.1 静态资源分布

```
.next/static/
├── chunks/          4.4 MB  (93.6%) ⚠️
├── css/             172 KB  (3.6%)
├── media/           128 KB  (2.7%)
└── 其他             12 KB   (0.3%)
```

### 1.2 构建告警摘要

**超大资源警告 (>500 KB)**:

- `../app/api/analytics/export/route.js` - 822 KB
- `../app/collaboration-demo/page.js` - 1.3 MB
- `../app/[locale]/analytics/test/page.js` - 505 KB
- `3283.js` - 936 KB
- `4761.js` - 1000 KB

**超限 Entrypoint 警告**: 83 个 route entrypoint 超过 500 KB 限制

---

## 2. 大型 Chunk 文件分析

### 2.1 Top 10 最大 Chunks (>100 KB)

| 文件名                   | 大小   | 类型      | 优先级 |
| ------------------------ | ------ | --------- | ------ |
| `three-libs-628d97d9.js` | 365 KB | 3D 库     | 60     |
| `three-libs-06afcb45.js` | 345 KB | 3D 库     | 60     |
| `framework-1c490867.js`  | 196 KB | 框架      | 35     |
| `framework-f7f7243c.js`  | 171 KB | 框架      | 35     |
| `three-libs-8743d79b.js` | 142 KB | 3D 库     | 60     |
| `framework-d41eb72e.js`  | 128 KB | 框架      | 35     |
| `polyfills-42372ed1.js`  | 110 KB | Polyfills | N/A    |
| `8187.js`                | 92 KB  | 应用代码  | N/A    |
| `chart-libs-664d7b50.js` | 82 KB  | 图表库    | 50     |
| `framework-bdf5bfda.js`  | 75 KB  | 框架      | 35     |

### 2.2 Three.js 相关包分析

**Three.js 总体积**: 852 KB (3 个 chunks)

```
three-libs-628d97d9.js      365 KB
three-libs-06afcb45.js      345 KB
three-libs-8743d79b.js      142 KB
─────────────────────────────────
总计:                        852 KB
```

**使用情况**:

- 实际使用页面: 仅 `KnowledgeLatticeScene.tsx` (1 个页面)
- 潜在使用: 可能有其他动态导入场景

**结论**: 🟡 Three.js 已配置为动态导入，但仍有 3 个独立 chunk，可能存在重复代码或未完全优化

### 2.3 Framework Chunks 分析

**React/Next.js 相关**: 8 个 framework chunks，总计约 750 KB

**问题**:

- 多个 framework chunks (196KB, 171KB, 128KB, 75KB, 70KB, 68KB, 45KB, 38KB)
- 可能存在框架代码重复加载
- 未充分利用浏览器缓存

---

## 3. 大型依赖包 (>100 KB)

### 3.1 已识别的大型依赖

| 包名               | 体积估算            | 使用情况       | 优化潜力      |
| ------------------ | ------------------- | -------------- | ------------- |
| three              | 852 KB              | 仅 1 个页面    | ⭐⭐⭐⭐⭐ 高 |
| @react-three/fiber | (包含在 three-libs) | 动态导入       | ⭐⭐⭐⭐ 高   |
| @react-three/drei  | (包含在 three-libs) | 动态导入       | ⭐⭐⭐⭐ 高   |
| recharts           | ~82 KB              | Analytics 页面 | ⭐⭐⭐ 中     |
| next/react         | ~750 KB             | 全局必需       | ⭐⭐ 低       |
| polyfills          | 110 KB              | 全局加载       | ⭐⭐⭐⭐ 高   |

### 3.2 Tree-shaking 效果评估

**已配置的 Tree-shaking**:

```javascript
// next.config.ts
optimization.usedExports = true
optimization.sideEffects = true
optimization.providedExports = true
```

**已配置的 optimizePackageImports**:

```javascript
experimental.optimizePackageImports: [
  'next-intl', '@sentry/nextjs', 'zustand', 'web-vitals', 'lucide-react',
  'three', '@react-three/fiber', '@react-three/drei', 'xlsx',
]
```

**评估结果**: ✅ Tree-shaking 配置良好，但 Three.js 可能仍有未使用的部分被包含

---

## 4. 动态导入使用情况

### 4.1 已实现的动态导入

**Three.js 优化代码**:

```typescript
// src/lib/code-splitting.tsx
const ThreeFiber = React.lazy(() => import('@react-three/fiber').then(mod => mod.default))
const ThreeDrei = React.lazy(() => import('@react-three/drei').then(mod => mod))

// Preloading logic
preloadChunk(() => import('@react-three/fiber'))
preloadChunk(() => import('@react-three/drei'))
```

**使用页面**:

- `/[locale]/knowledge-lattice` - KnowledgeLatticeScene (使用 Canvas)

### 4.2 未使用动态导入的页面

| 路由                       | 体积   | 大型依赖         | 建议                  |
| -------------------------- | ------ | ---------------- | --------------------- |
| `/[locale]/analytics/test` | 505 KB | 可能包含图表库   | ⚠️ 需要检查           |
| `/collaboration-demo`      | 1.3 MB | WebSocket + 依赖 | ✅ 已分离，但仍有依赖 |
| `/api/analytics/export`    | 822 KB | 可能包含 xlsx    | ⚠️ 需要动态导入       |

---

## 5. 第三方库体积占比

### 5.1 按类别划分

```
three-libs (3D)        852 KB  19.3%  ⚠️
framework (React/Next) 750 KB  17.0%  ✅ 必需
chart-libs             82 KB   1.9%   ✅ 已分离
realtime-libs          35 KB   0.8%   ✅ 已分离
ui-libs                (估计)  150 KB  3.4%   ✅ 已分离
vendor-utils           23 KB   0.5%   ✅ 已分离
polyfills              110 KB  2.5%   ⚠️
应用代码                2400 KB 54.6%  需要分析
────────────────────────────────────
总计                   4402 KB 100%
```

### 5.2 关键发现

1. ✅ **已优化部分**: ui-libs, chart-libs, realtime-libs, vendor-utils 都已正确分离
2. ⚠️ **three-libs 占比过高**: 虽然只有 1 个页面使用，但占总体积的 19.3%
3. ⚠️ **polyfills 占比**: 110 KB 占比 2.5%，可能包含不需要的 polyfills
4. 🔴 **应用代码占比高**: 54.6% 可能包含重复代码或未优化的组件

---

## 6. 体积优化机会

### 6.1 未使用的 Polyfill

**当前配置**: 全局加载 110 KB polyfills

**建议**:

```javascript
// next.config.ts
const polyfills = ['fetch', 'Promise', 'Object.assign', 'Array.from', 'String.prototype.startsWith']

const nextConfig = {
  // 使用 @next/bundle-analyzer 检测实际需要的 polyfills
  // 考虑使用 core-js 按需加载
}
```

**潜在收益**: 减少 80-100 KB

### 6.2 重复的依赖

**发现**:

- Three.js 有 3 个独立 chunks，可能包含重复代码
- Framework 有 8 个 chunks，部分代码可能重复

**建议**:

```javascript
// next.config.ts - 优化 splitChunks 配置
cacheGroups: {
  'three-libs': {
    test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei)[\\/]/,
    name: 'three-libs',
    maxSize: 300000, // 更严格的大小限制
    enforce: true,
  },
  framework: {
    test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
    name: 'framework',
    maxSize: 400000, // 减少到 1-2 个 chunks
    enforce: true,
  },
}
```

**潜在收益**: 减少 200-300 KB

### 6.3 过大的图标库

**当前配置**:

```javascript
experimental.optimizePackageImports: ['lucide-react']
```

**检查**: 需要验证 lucide-react 是否按需导入

**建议**:

```typescript
// ✅ 正确 - 按需导入
import { Home, Settings, User } from 'lucide-react'

// ❌ 错误 - 导入整个库
import * as Icons from 'lucide-react'
```

**潜在收益**: 如果误用，可减少 50-100 KB

### 6.4 动态导入建议

#### 高优先级 (>500 KB 页面)

1. **`/collaboration-demo` (1.3 MB)**

   ```typescript
   const CollaborationDemo = dynamic(() => import('./collaboration-demo/page'), {
     loading: () => <div>Loading...</div>,
   });
   ```

2. **`/api/analytics/export` (822 KB)**

   ```typescript
   // 在 API route 内部动态导入
   const xlsx = await import('xlsx')
   const workbook = xlsx.utils.book_new()
   ```

3. **`/[locale]/analytics/test` (505 KB)**
   ```typescript
   // 动态导入测试组件
   const AnalyticsTest = dynamic(() => import('@/components/analytics/test'), {
     ssr: false, // 客户端组件，不需要 SSR
   })
   ```

#### 中优先级 (>300 KB 页面)

- `/[locale]/dashboard` - 考虑懒加载图表组件
- `/[locale]/portfolio` - 考虑懒加载可视化组件

**潜在收益**: 减少 500-800 KB (首次加载)

### 6.5 其他优化机会

#### Webpack 配置优化

```javascript
// next.config.ts
webpack: (config, { dev, isServer }) => {
  // 启用更激进的 tree-shaking
  config.optimization = {
    ...config.optimization,
    usedExports: true,
    sideEffects: false, // 更严格的副作用检查
    providedExports: true,
  }

  // 启用模块压缩
  if (!dev) {
    config.optimization.minimize = true
  }

  return config
}
```

#### 代码分割策略

```typescript
// 创建细粒度的动态导入组件
export const KnowledgeLattice3D = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLatticeScene'),
  {
    ssr: false,
    loading: () => <ThreeJSLoadingSkeleton />,
  }
);

// 路由级别的懒加载
const AnalyticsPage = dynamic(() => import('./analytics/page'));
const DashboardPage = dynamic(() => import('./dashboard/page'));
```

---

## 7. 优化行动计划

### 阶段 1: 快速优化 (1-2 天)

| 优先级 | 任务                                   | 预计收益       | 工作量 |
| ------ | -------------------------------------- | -------------- | ------ |
| 🔴 高  | 动态导入 collaboration-demo            | 减少 1.3 MB    | 2h     |
| 🔴 高  | 动态导入 /api/analytics/export 的 xlsx | 减少 500 KB    | 2h     |
| 🟡 中  | 优化 polyfills 配置                    | 减少 80-100 KB | 4h     |
| 🟡 中  | 验证 lucide-react 按需导入             | 减少 0-100 KB  | 2h     |

**阶段 1 预计收益**: 减少 1.9 - 2.0 MB

### 阶段 2: 深度优化 (3-5 天)

| 优先级 | 任务                                | 预计收益        | 工作量 |
| ------ | ----------------------------------- | --------------- | ------ |
| 🔴 高  | 优化 splitChunks 配置               | 减少 200-300 KB | 4h     |
| 🔴 高  | 动态导入 analytics/test 页面        | 减少 300 KB     | 2h     |
| 🟡 中  | 路由级懒加载 (dashboard, portfolio) | 减少 200-300 KB | 6h     |
| 🟡 中  | 审查并移除未使用的依赖              | 减少 100-200 KB | 8h     |
| 🟢 低  | 启用更激进的 tree-shaking           | 减少 50-100 KB  | 4h     |

**阶段 2 预计收益**: 减少 0.8 - 1.2 MB

### 阶段 3: 长期优化 (持续)

- 定期审查 Bundle 大小 (每月)
- 使用 @next/bundle-analyzer 监控变化
- 考虑将 3D 功能迁移到子应用 (micro-frontend)
- 评估替代库 (如 lighter 3D 库)

---

## 8. 优化后预期效果

### 8.1 目标指标

| 指标           | 当前值 | 目标值   | 预期值      |
| -------------- | ------ | -------- | ----------- |
| 总体静态资源   | 4.7 MB | < 2 MB   | 2.2 MB      |
| chunks 目录    | 4.4 MB | < 1.5 MB | 2.0 MB      |
| 最大单文件     | 1.3 MB | < 500 KB | 350 KB      |
| 首次加载 (LCP) | 未知   | < 2.5s   | 改善 30-40% |
| FID            | 未知   | < 100ms  | 改善 40-50% |

### 8.2 收益计算

```
当前总体积:          4.7 MB
阶段 1 收益:        -2.0 MB
阶段 2 收益:        -1.0 MB
─────────────────────────────────────
优化后总体积:        1.7 MB

总体减少:           3.0 MB (64%)
```

---

## 9. 监控建议

### 9.1 持续监控工具

1. **Bundle Analyzer**

   ```bash
   # 每次构建后自动生成报告
   npm run build:analyze
   ```

2. **Lighthouse CI**
   - 集成到 CI/CD 流程
   - 设置性能基线
   - 阻止性能回退的 PR

3. **Real User Monitoring (RUM)**
   - 使用 web-vitals 收集真实用户数据
   - 监控 Core Web Vitals
   - 设置性能告警

### 9.2 性能预算

```javascript
// next.config.ts - 设置性能预算
const nextConfig = {
  experimental: {
    optimizePackageImports: [...],
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.performance = {
        maxEntrypointSize: 300000, // 300 KB
        maxAssetSize: 200000,       // 200 KB
        hints: 'warning',
      };
    }
    return config;
  },
};
```

---

## 10. 附录

### 10.1 Webpack SplitChunks 配置 (当前)

```javascript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    'three-libs': {
      test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei|@react-three\/postprocessing)[\\/]/,
      name: 'three-libs',
      priority: 60,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 50000,
      maxSize: 500000,
    },
    'chart-libs': {
      test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
      name: 'chart-libs',
      priority: 50,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 50000,
      maxSize: 300000,
    },
    // ... 其他配置
  },
  maxInitialRequests: 25,
  maxAsyncRequests: 30,
  minSize: 20000,
  maxSize: 244000,
  minChunks: 1,
  enforceSizeThreshold: 50000,
}
```

### 10.2 推荐的优化配置

```javascript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    'three-libs': {
      test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei|@react-three\/postprocessing)[\\/]/,
      name: 'three-libs',
      priority: 60,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 30000,
      maxSize: 300000, // 减少到 300 KB
    },
    'chart-libs': {
      test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
      name: 'chart-libs',
      priority: 50,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 30000,
      maxSize: 200000, // 减少到 200 KB
    },
    'realtime-libs': {
      test: /[\\/]node_modules[\\/](socket\.io-client|@socket\.io|engine\.io-client|eventemitter3)[\\/]/,
      name: 'realtime-libs',
      priority: 45,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 30000,
    },
    'ui-libs': {
      test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|class-variance-authority|clsx|tailwind-merge)[\\/]/,
      name: 'ui-libs',
      priority: 40,
      reuseExistingChunk: true,
      enforce: true,
      minSize: 20000,
    },
    framework: {
      test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
      name: 'framework',
      priority: 35,
      reuseExistingChunk: true,
      minSize: 100000,
      maxSize: 400000, // 减少到 400 KB，合并 chunks
    },
    'vendor-utils': {
      test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash|lodash-es)[\\/]/,
      name: 'vendor-utils',
      priority: 30,
      reuseExistingChunk: true,
      minSize: 20000,
    },
    'forms-libs': {
      test: /[\\/]node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/,
      name: 'forms-libs',
      priority: 25,
      reuseExistingChunk: true,
      minSize: 20000,
    },
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: 10,
      minChunks: 2,
      reuseExistingChunk: true,
      minSize: 30000,
    },
    common: {
      minChunks: 3,
      priority: 5,
      reuseExistingChunk: true,
      minSize: 20000,
    },
  },
  maxInitialRequests: 25,
  maxAsyncRequests: 30,
  minSize: 15000, // 降低最小尺寸，允许更细粒度分割
  maxSize: 200000, // 降低最大尺寸
  minChunks: 1,
  enforceSizeThreshold: 30000, // 降低阈值
}
```

### 10.3 实用命令

```bash
# 分析 bundle
ANALYZE=true npm run build -- --webpack

# 查看最大的 chunks
du -sh .next/static/chunks/*.js | sort -hr | head -20

# 查看模块依赖
npx next-bundle-analyzer --analyze

# 查找未使用的导出
npx ts-unused-exports tsconfig.json
```

---

## 总结

本项目存在显著的 Bundle 体积优化空间，主要集中在：

1. **Three.js 虽然已配置动态导入，但仍有 852 KB** - 需要进一步优化 splitChunks 配置
2. **polyfills 110 KB 可能包含不必要的代码** - 需要按需加载
3. **多个大型页面未使用动态导入** - collaboration-demo (1.3 MB), /api/analytics/export (822 KB)
4. **framework chunks 过多且部分重复** - 需要合并和优化

通过实施建议的优化措施，预计可以减少 **3.0 MB (64%)** 的总体积，显著改善首次加载性能。

---

**报告生成**: 自动化分析工具
**建议执行**: 按阶段逐步实施，优先处理高优先级项目
**后续跟进**: 定期使用 Bundle Analyzer 监控，避免性能回退
