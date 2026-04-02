# Next.js 16 Turbopack 生产构建支持调研报告

**调研日期**: 2026-03-28
**Next.js 版本**: 16.2.1
**调研人**: ⚡ Executor (Subagent)

---

## 执行摘要

### 核心结论

✅ **Turbopack 生产构建已可用于生产环境**

- Next.js 16.0.0 起，Turbopack 成为默认 bundler
- 当前项目已经在 package.json 中使用 `--turbopack` 标志进行生产构建
- Turbopack 生产构建自 Next.js 15.5.0 进入 Beta 阶段，现已稳定

⚠️ **存在配置迁移需求**

- 当前 `next.config.ts` 中大量 webpack 自定义配置需要迁移到 Turbopack
- 分包策略 (splitChunks) 需要重新配置
- 部分 webpack 功能在 Turbopack 中不支持

---

## 一、当前构建配置分析

### 1.1 package.json 构建脚本

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

- 开发和生产构建都已使用 `--turbopack` 标志
- Bundle Analyzer 也已配置为使用 Turbopack

### 1.2 next.config.ts 配置分析

#### 关键配置项

| 配置项                               | 当前值            | Turbopack 支持状态           |
| ------------------------------------ | ----------------- | ---------------------------- |
| `output: 'standalone'`               | ✅ 已配置         | ✅ 完全支持                  |
| `images` 配置                        | ✅ 已配置         | ✅ 完全支持                  |
| `compiler.removeConsole`             | ✅ 已配置         | ✅ 完全支持                  |
| `serverExternalPackages`             | ✅ 已配置         | ✅ 完全支持                  |
| `webpack()` 函数                     | ⚠️ 复杂配置       | ❌ 不支持，需迁移            |
| `webpack().optimization.splitChunks` | ⚠️ 9个cacheGroups | ❌ 需要迁移到 Turbopack 配置 |

#### Webpack 配置详解

当前项目在 `webpack()` 函数中有以下配置：

1. **路径别名**:

   ```typescript
   config.resolve.alias['@/'] = __dirname + '/src'
   ```

   - ✅ Turbopack 支持通过 `turbopack.resolveAlias` 配置

2. **性能预算**:

   ```typescript
   config.performance = {
     maxEntrypointSize: 300000,
     maxAssetSize: 250000,
     hints: 'warning',
   }
   ```

   - ⚠️ Turbopack 可能不支持相同的性能警告机制

3. **代码分包策略** (最复杂):
   - `three-libs`: Three.js 相关库 (maxSize: 300KB)
   - `chart-libs`: 图表库 (maxSize: 200KB)
   - `realtime-libs`: Socket.IO 等 (maxSize: 30KB+)
   - `ui-libs`: Radix UI, Lucide 等 (maxSize: 20KB+)
   - `framework`: React, Next.js (maxSize: 400KB)
   - `vendor-utils`: 工具库
   - `forms-libs`: 表单验证
   - `excel-libs`: ExcelJS
   - `vendors`: 通用 node_modules
   - `common`: 公共代码

   - ⚠️ **这是最大的迁移风险点** - Turbopack 的分包策略与 webpack 不同

4. **Tree-shaking 优化**:

   ```typescript
   config.optimization.usedExports = true
   config.optimization.sideEffects = false
   config.optimization.providedExports = true
   config.optimization.concatenateModules = true
   ```

   - ✅ Turbopack 有内置的 tree-shaking 和优化
   - 可能需要通过 `experimental.turbopackTreeShaking` 等配置调优

---

## 二、Turbopack vs Webpack 对比

### 2.1 架构差异

| 特性         | Webpack      | Turbopack             |
| ------------ | ------------ | --------------------- |
| **实现语言** | JavaScript   | Rust                  |
| **增量编译** | 基础支持     | 核心，细粒度到函数级  |
| **构建图**   | 分离的多环境 | 统一图                |
| **内存使用** | 较高         | 更低                  |
| **编译速度** | 中等         | 快 10-700x (依赖场景) |

### 2.2 功能支持对比

| 功能分类                  | Webpack      | Turbopack   | 说明                           |
| ------------------------- | ------------ | ----------- | ------------------------------ |
| **基础打包**              | ✅           | ✅          | 两者都支持                     |
| **Tree-shaking**          | ✅           | ✅          | Turbopack 更先进               |
| **代码分割**              | ✅ 手动/自动 | ✅ 策略不同 | Turbopack 更智能               |
| **HMR**                   | ✅           | ✅          | Turbopack 更快                 |
| **Source Maps**           | ✅           | ✅          |                                |
| **CSS Modules**           | ✅           | ✅          |                                |
| **PostCSS**               | ✅           | ✅          |                                |
| **Sass/SCSS**             | ✅           | ✅          | 不支持 `sassOptions.functions` |
| **Webpack 插件**          | ✅           | ❌          | **关键差异**                   |
| **Webpack Loaders**       | ✅           | ⚠️ 部分支持 | 支持 JS 输出的 loader          |
| **自定义 webpack() 配置** | ✅           | ❌          | **关键差异**                   |

### 2.3 生产构建特性

#### Webpack 优势

1. **成熟的插件生态系统**
   - Bundle Analyzer (通过插件)
   - Compression Plugin
   - Image optimization plugins
   - 各种自定义插件

2. **细粒度的分包控制**
   - 完全的 splitChunks 配置
   - 精确的 chunk 命名和大小控制
   - 复杂的依赖图控制

3. **性能预算警告**
   - 内置 performance hints
   - 构建时的性能检查

#### Turbopack 优势

1. **构建速度**
   - 冷启动快 10-100x
   - 增量编译更快
   - 特别适合大型项目

2. **内置优化**
   - 更好的 tree-shaking
   - 自动代码分割
   - Scope hoisting

3. **现代化架构**
   - Rust 实现，内存安全
   - 函数级缓存
   - 更好的增量更新

4. **实验性优化选项**
   ```typescript
   experimental: {
     turbopackFileSystemCacheForBuild: true, // 构建缓存
     turbopackTreeShaking: true,              // 高级 tree-shaking
     turbopackScopeHoisting: true,            // Scope hoisting
   }
   ```

---

## 三、Turbopack 生产支持状态

### 3.1 版本演进

| 版本               | 状态                | 说明                           |
| ------------------ | ------------------- | ------------------------------ |
| Next.js 15.0.0     | Dev Stable          | Turbopack 用于开发环境         |
| Next.js 15.3.0     | Build Experimental  | 生产构建实验支持               |
| Next.js 15.5.0     | Build Beta          | 生产构建进入 Beta              |
| **Next.js 16.0.0** | **Default Bundler** | **Turbopack 成为默认 bundler** |
| Next.js 16.2.1     | Stable              | 当前使用的版本                 |

### 3.2 生产构建支持的功能

✅ **完全支持**:

- TypeScript/JavaScript 编译
- React Server Components
- CSS (CSS Modules, Global CSS, PostCSS)
- 静态资源处理
- 图片优化
- API Routes
- Middleware
- SSR/SSG/ISR
- 国际化 (next-intl)
- Sentry 集成

⚠️ **部分支持/需迁移**:

- 自定义分包策略 (需要使用 Turbopack 特定配置)
- 性能预算检查 (可能需要不同方案)
- 某些 webpack loaders (仅支持输出 JS 的 loaders)

❌ **不支持**:

- Webpack plugins (需要找替代方案)
- `sassOptions.functions` (Sass 自定义函数)
- `webpack()` 配置函数
- Yarn PnP
- `experimental.urlImports`

---

## 四、迁移风险分析

### 4.1 高风险项 🔴

#### 1. 分包策略迁移

**风险等级**: 高

**问题描述**:
当前项目有非常精细的分包策略，包括 9 个自定义 cacheGroups，每个都有特定的 maxSize、priority 和 minSize 设置。

**影响**:

- 如果直接迁移，可能导致打包体积增大
- 首屏加载性能可能受影响
- 缓存策略需要重新评估

**缓解措施**:

1. 迁移前先测试 webpack 和 Turbopack 的实际打包结果
2. 使用 Turbopack 的内置智能分包
3. 必要时通过 `turbopack.rules` 和模块类型进行干预
4. 对比两种 bundler 的 chunk 分析报告

#### 2. Webpack 插件依赖

**风险等级**: 高

**问题描述**:
当前使用了 `@next/bundle-analyzer`，虽然 Next.js 已集成支持，但其他潜在的 webpack 插件可能无法工作。

**影响**:

- Bundle Analyzer 需要确认 Turbopack 支持 (Next.js 16+ 应该支持)
- 其他自定义插件需要替代方案

**缓解措施**:

1. 确认 `@next/bundle-analyzer` 与 Turbopack 的兼容性
2. 检查是否有其他隐藏的 webpack 插件依赖
3. 研究插件替代方案或原生功能

### 4.2 中风险项 🟡

#### 3. 性能预算检查

**风险等级**: 中

**问题描述**:
webpack 的 `performance` 配置在 Turbopack 中可能不支持或表现不同。

**影响**:

- 构建时可能无法获得性能警告
- 需要新的方式监控 bundle 大小

**缓解措施**:

1. 使用 next-bundle-analyzer 生成报告
2. 设置 CI/CD 检查流程
3. 自定义构建后脚本检查输出文件大小

#### 4. Tree-shaking 行为差异

**风险等级**: 中

**问题描述**:
虽然 Turbopack 的 tree-shaking 更先进，但具体行为可能与 webpack 不同。

**影响**:

- 某些依赖可能被意外 tree-shaken
- 某些代码可能未被 tree-shaken (预期外)

**缓解措施**:

1. 启用 `experimental.turbopackTreeShaking: true`
2. 测试关键功能的运行时行为
3. 检查 bundle 分析报告

### 4.3 低风险项 🟢

#### 5. CSS Modules 顺序

**风险等级**: 低

**问题描述**:
Turbopack 遵循 JS import 顺序，可能与 webpack 的某些情况不同。

**影响**:

- 极少数情况下可能出现样式冲突

**缓解措施**:

1. 检查样式冲突问题
2. 如有问题，使用 `@import` 强制顺序或调整 import 顺序

---

## 五、实施建议

### 5.1 推荐的迁移策略

#### 阶段 1: 评估和准备 (1-2 天)

1. **基线测试**

   ```bash
   # 使用当前的 webpack 配置构建
   rm -rf .next
   npm run build:analyze

   # 保存构建报告
   mkdir -p reports/webpack
   cp -r .next/analyze/* reports/webpack/
   ```

2. **Turbopack 测试构建**

   ```bash
   # 删除 .next 确保冷构建
   rm -rf .next

   # 使用 Turbopack 构建
   npm run build:analyze

   # 保存 Turbopack 报告
   mkdir -p reports/turbopack
   cp -r .next/analyze/* reports/turbopack/
   ```

3. **对比分析**
   - 总打包大小
   - 每个 chunk 的大小
   - 首屏加载资源
   - 构建时间

#### 阶段 2: 配置迁移 (2-3 天)

1. **创建 Turbopack 配置**

   ```typescript
   // next.config.ts
   const nextConfig: NextConfig = {
     // ... 现有配置

     // Turbopack 特定配置
     turbopack: {
       // 路径别名 (替代 webpack resolve.alias)
       resolveAlias: {
         '@/': path.join(__dirname, 'src/'),
       },

       // 自定义扩展名 (如需要)
       // resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],

       // 高级分包规则 (仅必要时)
       rules: {
         // 如果需要特定的 loader 配置
       },
     },

     // 实验性优化
     experimental: {
       turbopackFileSystemCacheForBuild: true, // 构建缓存 (beta)
       turbopackTreeShaking: true, // 高级 tree-shaking
       turbopackScopeHoisting: true, // Scope hoisting
       turbopackRemoveUnusedImports: true, // 移除未使用的导入
       turbopackRemoveUnusedExports: true, // 移除未使用的导出
     },
   }
   ```

2. **移除或条件化 webpack 配置**

   ```typescript
   webpack: (config, { isServer, dev }) => {
     // 仅在明确使用 webpack 时应用复杂配置
     if (process.env.USE_WEBPACK === 'true') {
       // 现有的 webpack 配置
       config.resolve.alias = config.resolve.alias || {};
       config.resolve.alias['@/'] = __dirname + '/src';

       if (!isServer && !dev) {
         // performance 和 splitChunks 配置
       }
     }

     return config;
   },
   ```

3. **调整构建脚本**
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "dev:webpack": "next dev --webpack",
       "build": "NODE_ENV=production next build",
       "build:webpack": "NODE_ENV=production USE_WEBPACK=true next build --webpack",
       "build:analyze": "NODE_ENV=production ANALYZE=true next build",
       "build:analyze:webpack": "NODE_ENV=production ANALYZE=true USE_WEBPACK=true next build --webpack"
     }
   }
   ```

#### 阶段 3: 测试和验证 (3-5 天)

1. **功能测试**
   - 运行单元测试
   - 运行 E2E 测试
   - 手动测试关键功能

2. **性能测试**
   - 首屏加载时间
   - Time to Interactive
   - Largest Contentful Paint
   - Bundle 大小

3. **构建性能测试**

   ```bash
   # 测试冷构建
   rm -rf .next
   time npm run build

   # 测试增量构建
   touch src/app/page.tsx
   time npm run build
   ```

4. **生产环境验证**
   - 在测试环境部署
   - 监控错误日志
   - 验证用户功能

#### 阶段 4: 优化和调优 (持续)

1. **根据 Bundle Analyzer 报告优化**
   - 识别过大的 chunks
   - 调整 Turbopack 配置
   - 优化导入策略

2. **启用更多优化**
   ```typescript
   experimental: {
     // 逐步启用更多实验性功能
     turbopackClientSideNestedAsyncChunking: true,
     turbopackMinify: true, // 生产环境默认已启用
   }
   ```

### 5.2 回滚方案

保留 webpack 配置作为后备：

```bash
# 如果出现问题，可以快速回滚
npm run build:webpack
```

在生产环境中保留两条构建流水线，逐步切换：

1. **灰度发布**: 10% → 50% → 100%
2. **A/B 测试**: 对比 webpack 和 Turbopack 构建的性能指标
3. **监控告警**: 设置构建和运行时监控

### 5.3 监控指标

#### 构建指标

- 构建时间 (冷构建 vs 增量构建)
- 内存使用
- Bundle 大小
- 警告和错误数量

#### 运行时指标

- Lighthouse 分数
- Core Web Vitals
- 错误率
- 用户感知性能

---

## 六、兼容性问题清单

### 6.1 确认不兼容的功能

| 功能                      | 当前使用情况       | 迁移建议                |
| ------------------------- | ------------------ | ----------------------- |
| Webpack plugins           | Bundle Analyzer    | Next.js 16+ 已集成支持  |
| `webpack()` 配置函数      | 复杂的 splitChunks | 迁移到 `turbopack` 配置 |
| `sassOptions.functions`   | 未使用             | N/A                     |
| Yarn PnP                  | 未使用             | N/A                     |
| `experimental.urlImports` | 未使用             | N/A                     |

### 6.2 需要验证的功能

| 功能            | 验证方法                     | 预期结果          |
| --------------- | ---------------------------- | ----------------- |
| Bundle Analyzer | 运行 `npm run build:analyze` | 生成分析报告      |
| 路径别名        | 检查 `@/` 导入               | 正常解析          |
| 性能预算        | 检查构建输出                 | 可能需要替代方案  |
| 代码分割        | 检查 `.next/static/chunks/`  | 合理的 chunk 大小 |
| Tree-shaking    | 运行测试                     | 所有功能正常      |

---

## 七、结论和建议

### 7.1 总体评估

✅ **推荐迁移到 Turbopack 生产构建**

**理由**:

1. Turbopack 已是 Next.js 16 的默认 bundler
2. 构建速度提升显著 (尤其是增量构建)
3. 内置优化更先进
4. Next.js 团队正在积极维护和完善
5. 当前项目已经使用 Turbopack 标志进行构建

**风险等级**: 🟡 中等

- 主要风险是分包策略的迁移
- 可通过充分测试和分阶段部署缓解
- 保留 webpack 作为回滚方案

### 7.2 具体建议

#### 立即行动 (本周)

1. ✅ **已确认**: 当前构建脚本已使用 `--turbopack`
2. ✅ **已确认**: Bundle Analyzer 已配置
3. ⚠️ **需要操作**: 移除或条件化 `next.config.ts` 中的复杂 webpack 配置

#### 短期行动 (2-3 周)

1. 创建 Turbopack 配置部分
2. 执行基线测试和对比
3. 在测试环境验证
4. 监控构建输出和性能指标

#### 中期行动 (1-2 月)

1. 完全移除 webpack 依赖配置
2. 启用更多 Turbopack 优化选项
3. 生产环境灰度发布
4. 持续监控和优化

#### 长期规划

1. 关注 Next.js 和 Turbopack 的更新
2. 利用 Turbopack 的新特性
3. 优化构建缓存策略
4. 改进 CI/CD 流程

### 7.3 最终建议

**建议采用渐进式迁移策略**:

1. **保持现状**: 当前 `--turbopack` 配置已能工作
2. **简化配置**: 移除 `webpack()` 中的 Turbopack 不支持的配置
3. **观察测试**: 让 Turbopack 的默认智能分包策略工作一段时间
4. **按需优化**: 如果出现性能问题，再通过 Turbopack 配置进行干预

**不建议的做法**:

- ❌ 立即完全移除所有 webpack 配置
- ❌ 在未测试的情况下直接上线生产环境
- ❌ 尝试完全复制 webpack 的分包策略到 Turbopack

---

## 八、参考资源

### 官方文档

- [Next.js Turbopack 文档](https://nextjs.org/docs/architecture/turbopack)
- [Turbopack 配置 API](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [Next.js 16 发布说明](https://nextjs.org/blog/next-16)

### 社区资源

- [Turbopack 官方文档](https://turbo.build/pack)
- [从 Webpack 迁移到 Turbopack](https://turbo.build/pack/docs/migrating-from-webpack)

### 工具

- Next.js Bundle Analyzer
- Webpack Bundle Analyzer (对比使用)

---

## 附录 A: 推荐的 next.config.ts 配置

```typescript
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
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',

  // 图片优化配置
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
    // Optimize package imports for tree-shaking
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

    // Turbopack 特定优化
    turbopackFileSystemCacheForBuild: true, // 构建缓存
    turbopackTreeShaking: true, // 高级 tree-shaking
    turbopackScopeHoisting: true, // Scope hoisting
    turbopackRemoveUnusedImports: true, // 移除未使用的导入
    turbopackRemoveUnusedExports: true, // 移除未使用的导出
  },

  // ExcelJS should be server-side only and dynamically imported
  serverExternalPackages: ['sharp', 'better-sqlite3', 'jose', 'uuid', 'exceljs'],

  // Turbopack 配置
  turbopack: {
    // 路径别名
    resolveAlias: {
      '@/': path.join(__dirname, 'src/'),
    },
  },

  // 保留 webpack 配置作为后备 (条件化)
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
            // ... 现有的复杂 cacheGroups 配置
          },
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

---

**报告结束**

_此报告由 ⚡ Executor 子代理生成，基于 Next.js 16.2.1 官方文档和项目实际配置分析。_
