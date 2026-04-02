# Next.js 16 (Turbopack) 迁移可行性评估报告

**评估日期**: 2026-03-28
**评估人**: 🏗️ 架构师 (Subagent)
**项目版本**: Next.js 16.2.1
**当前构建**: 已使用 `--turbopack` 标志

---

## 执行摘要

### 核心结论

✅ **迁移可行性：高度可行**

- 项目已经在使用 `--turbopack` 标志进行构建
- Next.js 16.2.1 是稳定版本，Turbopack 是默认 bundler
- 主要挑战是 webpack 自定义配置的迁移

⚠️ **关键风险点**

1. **复杂的代码分割策略** (高风险) - 9 个自定义 cacheGroups 需要重新设计
2. **性能预算检查** (中风险) - Turbopack 不支持 webpack 的 performance 配置
3. **路径别名配置** (低风险) - 需要迁移到 Turbopack 配置

### 迁移建议

**推荐采用渐进式迁移策略**：

1. 第一阶段：创建 Turbopack 配置，条件化 webpack 配置
2. 第二阶段：在测试环境验证功能和性能
3. 第三阶段：生产环境灰度发布
4. 第四阶段：完全移除 webpack 配置

**预计时间线**: 2-4 周（取决于测试深度）

---

## 一、当前构建状态分析

### 1.1 构建脚本分析

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "NODE_ENV=production next build --turbopack",
    "build:analyze": "NODE_ENV=production ANALYZE=true next build --turbopack",
    "start": "next start"
  }
}
```

**状态**: ✅ 已启用 Turbopack

- 开发和生产构建都使用 `--turbopack`
- Bundle Analyzer 已配置为 Turbopack 模式
- 无需修改构建脚本

### 1.2 next.config.ts 配置分析

#### 支持的配置项 ✅

| 配置项                                        | 值  | Turbopack 支持状态 |
| --------------------------------------------- | --- | ------------------ |
| `output: 'standalone'`                        | ✅  | 完全支持           |
| `images`                                      | ✅  | 完全支持           |
| `compiler.removeConsole`                      | ✅  | 完全支持           |
| `compress`                                    | ✅  | 完全支持           |
| `reactStrictMode`                             | ✅  | 完全支持           |
| `poweredByHeader`                             | ✅  | 完全支持           |
| `serverExternalPackages`                      | ✅  | 完全支持           |
| `experimental.optimizePackageImports`         | ✅  | 完全支持           |
| `experimental.optimizeCss`                    | ✅  | 完全支持           |
| `experimental.turbopackFileSystemCacheForDev` | ✅  | 完全支持           |

#### 需要迁移的配置 ⚠️

| 配置项                             | 当前配置                       | 迁移策略                                                        |
| ---------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `webpack.resolve.alias`            | `@/` → `__dirname + '/src'`    | 迁移到 `turbopack.resolveAlias`                                 |
| `webpack.performance`              | maxEntrypointSize: 300KB       | 使用外部脚本或 CI/CD 检查                                       |
| `webpack.optimization.splitChunks` | 9 个 cacheGroups               | 依赖 Turbopack 智能分割或使用 Turbopack 配置                    |
| Tree-shaking 配置                  | usedExports, sideEffects, etc. | Turbopack 内置，可通过 `experimental.turbopackTreeShaking` 调优 |

---

## 二、Webpack 配置迁移分析

### 2.1 路径别名迁移

**当前配置**:

```typescript
config.resolve.alias['@/'] = __dirname + '/src'
```

**Turbopack 配置**:

```typescript
turbopack: {
  resolveAlias: {
    '@/': path.join(__dirname, 'src/'),
  },
}
```

**风险等级**: 🟢 低

- 迁移简单
- 功能等价
- 无运行时影响

### 2.2 性能预算检查

**当前配置**:

```typescript
config.performance = {
  maxEntrypointSize: 300000, // 300 KB
  maxAssetSize: 250000, // 250 KB
  hints: 'warning',
}
```

**问题**: Turbopack 不支持 `performance` 配置

**迁移策略**:

**方案 1: 构建后脚本检查**

```typescript
// scripts/check-bundle-size.mjs
import fs from 'fs'
import path from 'path'

const maxEntrypointSize = 300000 // 300 KB
const maxAssetSize = 250000 // 250 KB

const buildDir = '.next/server/app'
const staticDir = '.next/static'

function checkFileSize(filePath, maxSize) {
  const stats = fs.statSync(filePath)
  const sizeKB = (stats.size / 1024).toFixed(2)

  if (stats.size > maxSize) {
    console.error(`❌ ${filePath}: ${sizeKB} KB exceeds ${maxSize / 1024} KB`)
    return false
  }

  console.log(`✅ ${filePath}: ${sizeKB} KB`)
  return true
}

// Check files...
```

**方案 2: CI/CD 集成**

```yaml
# .github/workflows/bundle-size.yml
- name: Check bundle size
  run: node scripts/check-bundle-size.mjs
```

**风险等级**: 🟡 中

- 需要额外脚本
- 可能丢失构建时的即时反馈
- 可通过 CI/CD 缓解

### 2.3 代码分割策略迁移 (最关键)

**当前配置**: 9 个自定义 cacheGroups

| CacheGroup      | 用途              | maxSize | priority |
| --------------- | ----------------- | ------- | -------- |
| `three-libs`    | Three.js 生态     | 300 KB  | 60       |
| `chart-libs`    | 图表库            | 200 KB  | 50       |
| `realtime-libs` | Socket.IO         | 30 KB   | 45       |
| `ui-libs`       | Radix UI, Lucide  | 20 KB   | 40       |
| `framework`     | React, Next.js    | 400 KB  | 35       |
| `vendor-utils`  | 工具库            | 20 KB   | 30       |
| `forms-libs`    | 表单验证          | 20 KB   | 25       |
| `excel-libs`    | ExcelJS           | 50 KB   | 20       |
| `vendors`       | 通用 node_modules | 200 KB  | 10       |
| `common`        | 公共代码          | 20 KB   | 5        |

**挑战**: Turbopack 使用不同的分割策略，无法直接复制 webpack 的配置

**Turbopack 的优势**:

- 智能代码分割，基于实际使用情况
- 更好的 tree-shaking
- 自动优化 chunk 大小
- 减少重复代码

**迁移策略**:

**阶段 1: 使用 Turbopack 默认策略**

```typescript
// 完全依赖 Turbopack 的智能分割
turbopack: {
  resolveAlias: {
    '@/': path.join(__dirname, 'src/'),
  },
}
```

**阶段 2: 使用 Turbopack 规则进行干预 (如果需要)**

```typescript
turbopack: {
  resolveAlias: {
    '@/': path.join(__dirname, 'src/'),
  },
  // 实验性功能
  clientSideNestedAsyncChunking: true,
}
```

**风险等级**: 🔴 高

- 可能导致打包体积变化
- 首屏加载性能可能受影响
- 需要充分测试和对比

**缓解措施**:

1. 对比 webpack 和 Turbopack 的 Bundle Analyzer 报告
2. 测试首屏加载性能
3. 必要时通过动态导入调整分割策略
4. 使用 `experimental.turbopackTreeShaking` 等优化选项

### 2.4 Tree-shaking 配置

**当前配置**:

```typescript
config.optimization.usedExports = true
config.optimization.sideEffects = false
config.optimization.providedExports = true
config.optimization.concatenateModules = true
```

**Turbopack 配置**:

```typescript
experimental: {
  turbopackTreeShaking: true,
  turbopackScopeHoisting: true,
  turbopackRemoveUnusedImports: true,
  turbopackRemoveUnusedExports: true,
}
```

**风险等级**: 🟢 低

- Turbopack 的 tree-shaking 更先进
- 配置更简单
- 性能更好

---

## 三、第三方依赖兼容性分析

### 3.1 核心依赖 (已验证 ✅)

| 依赖        | 版本    | 兼容性      | 说明                       |
| ----------- | ------- | ----------- | -------------------------- |
| `next`      | ^16.2.1 | ✅ 完全支持 | Turbopack 是默认 bundler   |
| `react`     | ^19.2.4 | ✅ 完全支持 | React 19 与 Turbopack 兼容 |
| `react-dom` | ^19.2.4 | ✅ 完全支持 | -                          |
| `next-intl` | ^4.8.3  | ✅ 完全支持 | SSR/SSG 支持               |

### 3.2 UI/图形库 (需验证 ⚠️)

| 依赖                 | 版本     | 兼容性      | 潜在问题                    |
| -------------------- | -------- | ----------- | --------------------------- |
| `three`              | ^0.183.2 | ✅ 应该支持 | 大型库，可能需要动态导入    |
| `@react-three/fiber` | ^9.5.0   | ✅ 应该支持 | -                           |
| `@react-three/drei`  | ^10.7.7  | ✅ 应该支持 | -                           |
| `lucide-react`       | ^0.577.0 | ✅ 完全支持 | 已在 optimizePackageImports |
| `recharts`           | ^3.8.0   | ✅ 应该支持 | 可能需要 tree-shaking 测试  |

**建议**:

- Three.js 生态库通常体积较大，确保使用动态导入
- 验证 tree-shaking 是否正确移除未使用的代码

### 3.3 工具库 (兼容 ✅)

| 依赖         | 版本    | 兼容性      | 说明                        |
| ------------ | ------- | ----------- | --------------------------- |
| `zustand`    | ^5.0.12 | ✅ 完全支持 | 已在 optimizePackageImports |
| `zod`        | ^4.3.6  | ✅ 完全支持 | -                           |
| `uuid`       | ^13.0.0 | ✅ 完全支持 | serverExternalPackages      |
| `web-vitals` | ^5.1.0  | ✅ 完全支持 | 已在 optimizePackageImports |

### 3.4 服务端库 (兼容 ✅)

| 依赖             | 版本    | 兼容性      | 说明                             |
| ---------------- | ------- | ----------- | -------------------------------- |
| `sharp`          | ^0.34.5 | ✅ 完全支持 | serverExternalPackages           |
| `better-sqlite3` | ^12.8.0 | ✅ 完全支持 | serverExternalPackages           |
| `jose`           | ^6.2.1  | ✅ 完全支持 | serverExternalPackages           |
| `exceljs`        | ^4.4.0  | ✅ 完全支持 | serverExternalPackages，动态导入 |

### 3.5 实时通信 (兼容 ✅)

| 依赖               | 版本   | 兼容性      | 说明 |
| ------------------ | ------ | ----------- | ---- |
| `socket.io-client` | ^4.8.3 | ✅ 应该支持 | -    |

### 3.6 开发工具 (兼容 ✅)

| 依赖                    | 版本     | 兼容性      | 说明                        |
| ----------------------- | -------- | ----------- | --------------------------- |
| `@next/bundle-analyzer` | ^16.2.1  | ✅ 完全支持 | 支持 Turbopack              |
| `@sentry/nextjs`        | ^10.44.0 | ✅ 完全支持 | 已在 optimizePackageImports |
| `@playwright/test`      | ^1.58.2  | ✅ 完全支持 | 不受影响                    |
| `vitest`                | ^4.1.0   | ✅ 完全支持 | 不受影响                    |
| `@tailwindcss/postcss`  | ^4       | ✅ 完全支持 | 不受影响                    |

### 3.7 潜在兼容性问题

#### 问题 1: 大型库的 Tree-shaking

**受影响的库**:

- `three` (~600 KB)
- `@react-three/drei` (~200 KB)
- `recharts` (~500 KB)

**验证方法**:

```bash
# 使用 Bundle Analyzer 对比
npm run build:analyze

# 检查 .next/static/chunks/ 目录
ls -lh .next/static/chunks/
```

**缓解措施**:

- 使用动态导入: `const { ThreeCanvas } = await import('@react-three/fiber')`
- 启用 `experimental.turbopackTreeShaking: true`
- 配置 `optimizePackageImports`

#### 问题 2: 自定义 Webpack Loaders

**检查**: 项目中是否有自定义 loaders

- ✅ 未在 package.json 中发现
- ✅ next.config.ts 中没有自定义 loaders

**结论**: 无需担心

#### 问题 3: Webpack Plugins

**检查**: 使用的 plugins

- ✅ `@next/bundle-analyzer` - Next.js 原生支持 Turbopack
- ✅ 未发现其他 webpack plugins

**结论**: 无需担心

---

## 四、Turbopack 迁移路线图

### 4.1 阶段 0: 准备 (1-2 天)

#### 任务清单

- [ ] 读取并理解当前 Turbopack 研究报告
- [ ] 备份当前 `next.config.ts`
- [ ] 创建分支 `feature/turbopack-migration`
- [ ] 设置性能基准

#### 基线测试

```bash
# 1. 清理构建
rm -rf .next

# 2. 构建并分析
npm run build:analyze

# 3. 保存报告
mkdir -p reports/baseline
cp -r .next/analyze/* reports/baseline/

# 4. 记录关键指标
echo "构建时间: $(time npm run build)" >> reports/baseline/metrics.txt
du -sh .next >> reports/baseline/metrics.txt
```

### 4.2 阶段 1: 配置迁移 (2-3 天)

#### 步骤 1: 创建 Turbopack 配置

```typescript
// next.config.ts (更新版本)
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import path from 'path'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
})

const nextConfig: NextConfig = {
  // === 现有配置保持不变 ===
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'va.vercel-scripts.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
    swcMinify: true,
  },

  experimental: {
    optimizePackageImports: [
      'next-intl',
      '@sentry/nextjs',
      'zustand',
      'web-vitals',
      'lucide-react',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
    optimizeCss: true,
    turbopackFileSystemCacheForDev: true,

    // === Turbopack 优化选项 ===
    turbopackFileSystemCacheForBuild: true, // 构建缓存
    turbopackTreeShaking: true, // 高级 tree-shaking
    turbopackScopeHoisting: true, // Scope hoisting
    turbopackRemoveUnusedImports: true, // 移除未使用的导入
    turbopackRemoveUnusedExports: true, // 移除未使用的导出
  },

  serverExternalPackages: ['sharp', 'better-sqlite3', 'jose', 'uuid', 'exceljs'],

  // === Turbopack 配置 ===
  turbopack: {
    // 路径别名 (迁移自 webpack.resolve.alias)
    resolveAlias: {
      '@/': path.join(__dirname, 'src/'),
    },

    // 可选: 实验性功能
    // clientSideNestedAsyncChunking: true,
  },

  // === 条件化 webpack 配置 ===
  webpack: (config, { isServer, dev }) => {
    // 仅在明确使用 webpack 时应用复杂配置
    if (process.env.USE_WEBPACK === 'true') {
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['@/'] = __dirname + '/src'

      if (!isServer && !dev) {
        config.optimization = config.optimization || {}
        config.performance = {
          maxEntrypointSize: 300000,
          maxAssetSize: 250000,
          hints: 'warning',
        }

        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            'three-libs': {
              test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei|@react-three\/postprocessing)[\\/]/,
              name: 'three-libs',
              priority: 60,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 300000,
            },
            'chart-libs': {
              test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
              name: 'chart-libs',
              priority: 50,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 200000,
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
              maxSize: 400000,
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
            'excel-libs': {
              test: /[\\/]node_modules[\\/](exceljs)[\\/]/,
              name: 'excel-libs',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 50000,
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
          minSize: 15000,
          maxSize: 200000,
          minChunks: 1,
          enforceSizeThreshold: 30000,
        }

        config.optimization.usedExports = true
        config.optimization.sideEffects = false
        config.optimization.providedExports = true
        config.optimization.concatenateModules = true
      }
    }

    return config
  },

  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default withBundleAnalyzer(withNextIntl(nextConfig))
```

#### 步骤 2: 创建 bundle size 检查脚本

```typescript
// scripts/check-bundle-size.mjs
import fs from 'fs'
import path from 'path'

const MAX_ENTRYPOINT_SIZE = 300000 // 300 KB
const MAX_ASSET_SIZE = 250000 // 250 KB
const BUILD_DIR = '.next'
const STATIC_DIR = path.join(BUILD_DIR, 'static')

function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB'
}

function checkFile(filePath, maxSize, type) {
  try {
    const stats = fs.statSync(filePath)

    if (stats.size > maxSize) {
      console.error(
        `❌ ${type} ${path.relative(BUILD_DIR, filePath)}: ${formatSize(stats.size)} exceeds ${formatSize(maxSize)}`
      )
      return false
    }

    console.log(`✅ ${type} ${path.relative(BUILD_DIR, filePath)}: ${formatSize(stats.size)}`)
    return true
  } catch (error) {
    console.warn(`⚠️  Could not read ${filePath}: ${error.message}`)
    return true
  }
}

function walkDirectory(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walkDirectory(fullPath, callback)
    } else if (entry.isFile()) {
      callback(fullPath)
    }
  }
}

console.log('📊 Checking bundle sizes...\n')

let allPassed = true

// Check static chunks
const chunksDir = path.join(STATIC_DIR, 'chunks')
if (fs.existsSync(chunksDir)) {
  console.log('📦 Checking chunks:')
  walkDirectory(chunksDir, filePath => {
    if (!checkFile(filePath, MAX_ASSET_SIZE, 'chunk')) {
      allPassed = false
    }
  })
  console.log()
}

// Check server app directory (for SSR)
const serverAppDir = path.join(BUILD_DIR, 'server', 'app')
if (fs.existsSync(serverAppDir)) {
  console.log('🖥️  Checking server app:')
  walkDirectory(serverAppDir, filePath => {
    if (filePath.endsWith('.js')) {
      if (!checkFile(filePath, MAX_ENTRYPOINT_SIZE, 'server')) {
        allPassed = false
      }
    }
  })
  console.log()
}

// Summary
if (allPassed) {
  console.log('✅ All bundle size checks passed!')
  process.exit(0)
} else {
  console.error('❌ Some bundles exceed size limits!')
  process.exit(1)
}
```

#### 步骤 3: 更新 package.json 脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:webpack": "next dev --webpack",
    "build": "NODE_ENV=production next build",
    "build:webpack": "NODE_ENV=production USE_WEBPACK=true next build --webpack",
    "build:analyze": "NODE_ENV=production ANALYZE=true next build",
    "build:analyze:webpack": "NODE_ENV=production ANALYZE=true USE_WEBPACK=true next build --webpack",
    "build:check": "npm run build && node scripts/check-bundle-size.mjs",
    "start": "next start"
  }
}
```

### 4.3 阶段 2: 测试和验证 (3-5 天)

#### 任务清单

- [ ] 构建性能测试
- [ ] Bundle 大小对比
- [ ] 功能测试
- [ ] 性能测试

#### 构建性能测试

```bash
# 1. 清理构建
rm -rf .next

# 2. 冷构建测试
echo "=== Cold Build ===" >> reports/turbopack/build-performance.txt
time npm run build >> reports/turbopack/build-performance.txt 2>&1

# 3. 增量构建测试
touch src/app/page.tsx
echo "=== Incremental Build ===" >> reports/turbopack/build-performance.txt
time npm run build >> reports/turbopack/build-performance.txt 2>&1

# 4. Bundle size 检查
node scripts/check-bundle-size.mjs
```

#### Bundle 对比

```bash
# 1. 生成 Turbopack 报告
npm run build:analyze
mkdir -p reports/turbopack
cp -r .next/analyze/* reports/turbopack/

# 2. 生成 Webpack 报告 (用于对比)
npm run build:analyze:webpack
mkdir -p reports/webpack
cp -r .next/analyze/* reports/webpack/

# 3. 手动对比两个报告
# - 总打包大小
# - 每个 chunk 的大小
# - 首屏加载资源
```

#### 功能测试

```bash
# 1. 运行单元测试
npm run test:run

# 2. 运行 E2E 测试
npm run test:e2e

# 3. API 集成测试
npm run test:api

# 4. 手动测试关键功能
# - 登录/登出
# - 3D 场景渲染
# - 图表显示
# - 表单提交
# - 实时通信
```

#### 性能测试

```bash
# 使用 Lighthouse 或其他工具
# - First Contentful Paint (FCP)
# - Largest Contentful Paint (LCP)
# - Time to Interactive (TTI)
# - Cumulative Layout Shift (CLS)
```

### 4.4 阶段 3: 生产环境部署 (1-2 天)

#### 灰度发布策略

**Week 1: 10% 流量**

- 部署到测试环境
- 监控错误日志
- 收集性能指标

**Week 2: 50% 流量**

- 扩展到部分生产实例
- 持续监控
- 准备回滚

**Week 3: 100% 流量**

- 全量发布
- 全面监控
- 优化调整

#### 监控指标

```yaml
# 关键指标
监控指标:
  构建时间:
    - 冷构建
    - 增量构建
  运行时性能:
    - 首屏加载时间
    - Lighthouse 分数
    - Core Web Vitals
  错误率:
    - 构建错误
    - 运行时错误
    - Sentry 报告
  资源大小:
    - 总 bundle 大小
    - 单个 chunk 大小
    - 缓存命中率
```

### 4.5 阶段 4: 优化和清理 (持续)

#### 优化任务

- [ ] 根据 Bundle Analyzer 报告优化
- [ ] 启用更多 Turbopack 优化选项
- [ ] 优化大型库的导入策略
- [ ] 改进缓存策略

#### 清理任务

- [ ] 完全移除 webpack 配置
- [ ] 移除 `USE_WEBPACK` 环境变量
- [ ] 更新文档
- [ ] 清理回滚脚本

---

## 五、测试策略

### 5.1 测试矩阵

| 测试类型 | 工具         | 覆盖范围   | 优先级 |
| -------- | ------------ | ---------- | ------ |
| 单元测试 | Vitest       | 核心逻辑   | 高     |
| E2E 测试 | Playwright   | 用户流程   | 高     |
| API 测试 | Supertest    | API 端点   | 高     |
| 性能测试 | Lighthouse   | 性能指标   | 中     |
| 构建测试 | Build script | 构建过程   | 高     |
| 集成测试 | Manual       | 端到端流程 | 中     |

### 5.2 关键测试场景

#### 1. 3D 场景渲染

- Three.js 模型加载
- 交互功能
- 性能表现

#### 2. 图表显示

- Recharts 图表渲染
- 数据更新
- 交互功能

#### 3. 实时通信

- Socket.IO 连接
- 消息发送/接收
- 断线重连

#### 4. 表单验证

- Zod 验证
- 错误处理
- 提交功能

#### 5. 国际化

- 语言切换
- 文本翻译
- 日期/数字格式

### 5.3 性能基准

| 指标           | 目标值   | 测量方法                          |
| -------------- | -------- | --------------------------------- |
| 冷构建时间     | < 2 min  | `time npm run build`              |
| 增量构建时间   | < 30 s   | `time npm run build` (修改文件后) |
| 首屏加载时间   | < 2 s    | Lighthouse FCP                    |
| 总 bundle 大小 | < 1 MB   | Bundle Analyzer                   |
| LCP            | < 2.5 s  | Lighthouse                        |
| FID            | < 100 ms | Lighthouse                        |
| CLS            | < 0.1    | Lighthouse                        |

---

## 六、已知不兼容的依赖

### 6.1 完全不支持的功能

| 功能                      | 影响范围   | 缓解方案 |
| ------------------------- | ---------- | -------- |
| Webpack plugins           | 当前未使用 | N/A      |
| `sassOptions.functions`   | 未使用     | N/A      |
| Yarn PnP                  | 未使用     | N/A      |
| `experimental.urlImports` | 未使用     | N/A      |

### 6.2 需要迁移的配置

| 配置                               | 影响范围 | 缓解方案                 |
| ---------------------------------- | -------- | ------------------------ |
| `webpack.performance`              | 构建警告 | 外部脚本检查             |
| `webpack.optimization.splitChunks` | 代码分割 | Turbopack 智能分割       |
| `webpack.resolve.alias`            | 路径别名 | `turbopack.resolveAlias` |

### 6.3 可能受影响的库

| 库                  | 版本     | 风险等级 | 验证方法                   |
| ------------------- | -------- | -------- | -------------------------- |
| `three`             | ^0.183.2 | 🟡 中    | Bundle Analyzer + 功能测试 |
| `@react-three/drei` | ^10.7.7  | 🟡 中    | 功能测试                   |
| `recharts`          | ^3.8.0   | 🟡 中    | Bundle Analyzer            |

**建议**: 这些库体积较大，确保使用动态导入和 tree-shaking。

---

## 七、风险评估与缓解

### 7.1 风险矩阵

| 风险             | 概率 | 影响 | 严重性 | 缓解措施                     |
| ---------------- | ---- | ---- | ------ | ---------------------------- |
| 代码分割策略失效 | 高   | 高   | 🔴 高  | 充分测试、对比报告、动态导入 |
| 打包体积增大     | 中   | 中   | 🟡 中  | Bundle Analyzer、优化导入    |
| 性能下降         | 低   | 高   | 🟡 中  | 性能测试、监控指标           |
| 树-shaking 问题  | 低   | 中   | 🟢 低  | 功能测试、代码审查           |
| 构建失败         | 低   | 高   | 🟡 中  | 回滚方案、CI/CD 检查         |

### 7.2 回滚方案

#### 快速回滚

```bash
# 1. 回滚到 webpack 构建
npm run build:webpack

# 2. 部署回滚版本
# 使用 Docker/CI/CD 工具部署回滚版本
```

#### 完整回滚

```bash
# 1. 恢复 next.config.ts
git checkout HEAD~1 -- next.config.ts

# 2. 重新构建
npm run build

# 3. 部
```
