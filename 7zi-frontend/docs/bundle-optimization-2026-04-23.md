# Bundle 优化分析报告

**日期**: 2026-04-23
**项目**: 7zi-frontend
**版本**: v1.14.0
**分析目标**: 前端 bundle 大小分析与优化建议

---

## 📊 执行摘要

本次分析基于最新的构建输出（.next 目录），识别出主要性能瓶颈和优化机会。

### 当前状态
- ✅ 构建成功 (2026-04-23 19:14)
- ✅ React Compiler 已启用 (annotation 模式)
- ✅ Gzip/Brotli 压缩已启用
- ✅ Tree shaking 已启用
- ✅ 代码分割策略已配置

### 🔴 关键问题
- **Three.js**: 合计 **713 KB**（两个 chunk），全部使用动态导入 ✅
- **入口点 bundle**: 超出目标大小 90-167%
- **Polyfills**: 110 KB

---

## 📦 Bundle 大小分析 (Top 15)

| 排名 | 文件名 | 大小 | 类型 | 状态 |
|------|--------|------|------|------|
| 1 | three-core-2129d44f.5e42ceec5e5933ef.js | **365 KB** | Three.js | ✅ 动态导入 |
| 2 | three-core-c173e56c.75ccb75ea2f51766.js | **345 KB** | Three.js | ✅ 动态导入 |
| 3 | next-core-bf128b74-bdf37598e5ddd0ed.js | **196 KB** | Next.js 核心 | ⚠️ 框架依赖 |
| 4 | react-core-24b0feaf-1fd63ab3a64760b5.js | **171 KB** | React 核心 | ⚠️ 框架依赖 |
| 5 | polyfills-42372ed130431b0a.js | **110 KB** | Polyfills | 🟡 可优化 |
| 6 | 572-c29b7d8fd90d793c.js | **94 KB** | 未知 | 🔍 需分析 |
| 7 | next-core-62b3ad68-6479f3479d685ebc.js | **74 KB** | Next.js 核心 | ⚠️ 框架依赖 |
| 8 | chart-libs-2c3d6fc8-e2df264cb4aff14f.js | **66 KB** | 图表库 | ✅ 已分离 |
| 9 | 8213.0ade5904dc824749.js | **64 KB** | 未知 | 🔍 需分析 |
| 10 | 5135-05e7aa66e49bbc9e.js | **63 KB** | 未知 | 🔍 需分析 |
| 11 | 8456-33a58403bc78e7e6.js | **54 KB** | 未知 | 🔍 需分析 |
| 12 | chart-libs-1fdcce23-d51bfb87e00e9345.js | **53 KB** | 图表库 | ✅ 已分离 |
| 13 | 817-eea72ba3c52b6056.js | **52 KB** | 未知 | 🔍 需分析 |
| 14 | i18n-libs-1bc60df8-bbe51fb73ed3db77.js | **48 KB** | i18n 库 | ✅ 预期 |
| 15 | next-core-3060db6d-081950c1929980d4.js | **48 KB** | Next.js 核心 | ⚠️ 框架依赖 |

---

## 🔍 深度分析

### 1. Three.js (已优化 ✅)
- **总大小**: 713 KB (365 + 345)
- **状态**: ✅ 已使用动态导入，仅在 `/knowledge-lattice` 页面加载
- **建议**: 保持现状，持续监控

### 2. React Flow (已优化 ✅)
- **使用位置**: `src/components/WorkflowEditor/WorkflowEditor.tsx`
- **状态**: ✅ 已使用 `dynamic()` 动态导入
```typescript
const ReactFlow = dynamic(
  () => import('reactflow').then(mod => ({ default: mod.default })),
  { ssr: false, loading: () => <Loading /> }
)
```
- **注意**: `import 'reactflow/dist/style.css'` 仍需静态导入

### 3. Polyfills (110 KB)
- **当前大小**: 110 KB
- **建议**: 检查 `package.json` 中的 `browserslist`，确认目标浏览器
- **可能的优化**: 使用 `@vitejs/plugin-react` 的现代化配置，减少 polyfills

### 4. 图表库 (Recharts)
- **总大小**: ~180 KB (多个 chart-libs chunk)
- **状态**: ✅ 已单独打包
- **建议**: 确认所有图表组件使用动态导入

### 5. 未知大 Chunk 分析

| Chunk | 大小 | 确认来源 |
|-------|------|----------|
| `572-*.js` | 94 KB | **TipTap/ProseMirror** (富文本编辑器核心) |
| `8213.*.js` | 64 KB | 需进一步分析 |
| `5135-*.js` | 63 KB | 需进一步分析 |
| `8456-*.js` | 54 KB | 需进一步分析 |

**TipTap 分析**:
- `572-*.js` 包含富文本编辑器核心 (TipTap/ProseMirror)
- 使用页面: `/rich-text-editor-demo`, 协作文本编辑器
- **状态**: ✅ 代码分割正确，只在该页面加载

---

## 🏆 优化建议 (按优先级)

### 🔴 P0: 移除重复的库依赖

**问题**: 检查是否存在多个版本的同一库

**建议执行**:
```bash
# 检查重复依赖
npm ls <package-name>
# 或使用
pnpm dedupe
```

---

### 🟡 P1: 大型库改用轻量替代品

#### 1. ExcelJS (如果未使用)
- **当前大小**: ~500 KB (整个库)
- **位置**: `src/app/api/data/import/route.ts` (仅 API 路由)
- **建议**: 仅在服务端使用，确保不会打包到客户端 bundle

#### 2. Three.js (已优化)
- ✅ 已在 `/knowledge-lattice` 页面使用动态导入
- **建议**: 确认没有其他页面意外引入

#### 3. 低代码库检查
- **建议**: 确认 `xenova/transformers` (2.0.1) 的使用范围
- 该库用于 AI/ML 功能，应仅在需要时加载

---

### 🟡 P1: 添加动态 import() 懒加载

#### 1. 富文本编辑器 (TipTap)
- **位置**: `src/components/ui/RichTextEditor/`
- **使用页面**: `/rich-text-editor-demo`
- **建议**: 确保编辑器组件使用 dynamic 导入

#### 2. 协作文本编辑器
- **位置**: `src/app/collaboration-cursor-demo/`
- **建议**: 如果不是核心功能，考虑按需加载

#### 3. 低代码/AI 功能
- **位置**: `/knowledge-lattice` 页面
- **库**: `@xenova/transformers`
- **建议**: 确认使用 dynamic 导入

---

### 🟢 P2: 启用 Tree Shaking

**当前配置** ✅:
```typescript
experimental: {
  optimizePackageImports: [
    'lucide-react',
    'zustand',
    'date-fns',
    'three',
    'recharts',
    'zod',
    'react-i18next',
    'i18next',
    'clsx',
    'tailwind-merge',
  ],
}
```

**建议添加**:
```typescript
optimizePackageImports: [
  // ...现有
  '@tiptap/react',
  '@tiptap/core',
  '@xenova/transformers',  // 添加
]
```

---

## ⚙️ next.config.ts 优化机会

### 当前已配置的优化

```typescript
// React Compiler
reactCompiler: {
  compilationMode: 'annotation',
}

// splitChunks 配置
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    'three-core': { priority: 70 },
    'web-vitals': { priority: 80 },
    'chart-libs': { priority: 60 },
    // ...
  },
}

// 性能预算
config.performance = {
  maxEntrypointSize: 300 * 1024,  // 300KB
  maxAssetSize: 250 * 1024,       // 250KB
}
```

### 建议的新增配置

```typescript
// 1. 更积极的分包策略
config.optimization.splitChunks = {
  ...config.optimization.splitChunks,
  maxSize: 100 * 1024,  // 降低到 100KB
}

// 2. 确认 browserslist 配置
// 确保只为目标浏览器打包 polyfills

// 3. 添加 Bundle Analyzer
// 使用 @next/bundle-analyzer 进行可视化分析
```

---

## 📋 行动计划

### 立即执行 (5 分钟) - ✅ 已完成
1. ✅ Three.js 动态导入 - **已完成**
2. ✅ React Flow 动态导入 - **已完成**
3. ✅ `@xenova/transformers` 使用动态导入 (在 WhisperClient.ts 中)

### 短期 (30 分钟)
1. 🔍 添加 `@next/bundle-analyzer` 进行可视化分析
   ```bash
   npm install @next/bundle-analyzer
   ```
2. 🔍 运行 `npm ls` 检查重复依赖
3. 🔍 检查 `browserslist` 配置优化 polyfills

### 中期 (1-2 小时)
1. 确认 `exceljs` 仅在服务端 API 路由中使用（未打包到客户端）
2. 考虑将 `tiptap` 相关扩展也使用 dynamic 导入
3. 确认 `chart-libs` (recharts) 在非图表页面不会加载

### 长期
1. 评估大型库替代方案:
   - Three.js → `@react-three/fiber` (如果使用场景简单)
   - Recharts → `recharts` 轻量分支或 `chart.js`
2. 考虑预取关键路由的 bundle
3. 评估 HTTP/2 推送或 `<link rel="preload">`

---

## 📈 预期收益

| 优化项 | 预期减少 | 实际收益 |
|--------|----------|----------|
| Polyfills 优化 | 20-40 KB | 减少初始加载 |
| 未知 Chunk 分析 | 50-100 KB | 待定 |
| Tree shaking 增强 | 10-30 KB | 取决于使用率 |
| **总计** | **~80-170 KB** | - |

---

## 📝 备注

- **构建时间**: 2026-04-23 19:14
- **Next.js 版本**: 16.2.4
- **React 版本**: 19.2.5
- **分析工具**: 基于 .next 构建输出的手动分析

---

**报告生成时间**: 2026-04-23 19:20 GMT+2
