# Turbopack 优化建议报告

**报告日期**: 2026-03-28
**角色**: 📚 咨询师
**项目**: 7zi-frontend (Next.js 16.2.1)

---

## 执行摘要

当前项目已启用 Turbopack，但配置中存在 **过时选项**、**未验证的实验性选项** 和 **潜在的稳定性和兼容性问题**。本报告提供具体的修复和优化建议。

| 问题类型 | 严重程度 | 影响 |
|----------|----------|------|
| 使用废弃的 `swcMinify` 选项 | ⚠️ 高 | 构建设置可能被忽略 |
| 使用未公开的 `experimental.turbopack*` 选项 | ⚠️ 高 | 选项可能无效 |
| 多个 next.config 文件内容混杂 | 🔴 严重 | 配置冲突 |
| Lockfile 检测警告 | ⚠️ 中 | 根目录解析问题 |

---

## 一、当前配置问题分析

### 1.1 废弃选项 (`compiler.swcMinify`)

```typescript
// ❌ 错误 - Next.js 16 已废弃
compiler: {
  swcMinify: true,  // 已被移除
}
```

**Next.js 16+ 行为**:
- SWC minification 已默认启用，无法禁用
- `swcMinify` 选项已被完全移除
- 设置此选项会导致配置警告：`Unrecognized key(s) in object: 'swcMinify' at "compiler"`

**修复方案**:
```typescript
// ✅ 正确 - 移除 swcMinify
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
},
```

### 1.2 未公开的实验性选项

以下选项**不在 Next.js 官方文档中**，可能无效或行为不符预期：

| 选项 | 状态 | 建议 |
|------|------|------|
| `turbopackFileSystemCacheForDev` | ❌ 未公开 | 移除 |
| `turbopackFileSystemCacheForBuild` | ❌ 未公开 | 移除 |
| `turbopackTreeShaking` | ❌ 未公开 | 移除 |
| `turbopackScopeHoisting` | ❌ 未公开 | 移除 |
| `turbopackRemoveUnusedImports` | ❌ 未公开 | 移除 |
| `turbopackRemoveUnusedExports` | ❌ 未公开 | 移除 |

**官方 `turbopack` 配置选项** (截至 Next.js 16.2.1):

| 选项 | 说明 |
|------|------|
| `root` | 应用根目录（绝对路径） |
| `rules` | webpack loader 规则 |
| `resolveAlias` | 导入别名映射 |
| `resolveExtensions` | 解析的文件扩展名 |
| `debugIds` | 启用 debug IDs |

### 1.3 路径别名配置重复

当前配置同时在多处设置路径别名：

```typescript
// 位置 1: turbopack.resolveAlias
turbopack: {
  resolveAlias: {
    '@/': path.join(__dirname, 'src/'),
  },
},

// 位置 2: webpack.resolve.alias
webpack: (config) => {
  config.resolve.alias['@/'] = __dirname + '/src';
  // 或
  config.resolve.alias['@'] = __dirname + '/src';
}
```

**问题**: 别名定义不一致（`@/` vs `@`），可能导致模块解析问题。

**修复方案**: 统一使用 TypeScript/Jest 标准的 `@/` 别名：

```typescript
turbopack: {
  resolveAlias: {
    '@/': path.join(__dirname, 'src/'),
  },
},
```

### 1.4 Lockfile 检测警告

```
⚠ Warning: Next.js inferred your workspace root
Detected additional lockfiles: pnpm-lock.yaml
```

**原因**: 项目目录或父目录存在 `pnpm-lock.yaml`，但可能不是主要包管理器。

**修复方案**:
```typescript
turbopack: {
  root: __dirname,  // 显式设置根目录
},
```

---

## 二、推荐的 Turbopack 配置

### 2.1 清洁的 next.config.ts

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
});

const nextConfig: NextConfig = {
  // ============================================
  // 基础配置
  // ============================================
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',  // Docker 部署

  // ============================================
  // 图片优化
  // ============================================
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

  // ============================================
  // 生产优化
  // ============================================
  compress: true,

  // ============================================
  // 编译器选项 (已移除废弃的 swcMinify)
  // ============================================
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ============================================
  // 实验性选项 (仅使用文档中的)
  // ============================================
  experimental: {
    // 包导入优化 - 改善 tree-shaking
    optimizePackageImports: [
      'next-intl',
      '@sentry/nextjs',
      'zustand',
      'web-vitals',
      'lucide-react',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'xlsx',
    ],
    // CSS 优化
    optimizeCss: true,
  },

  // ============================================
  // Turbopack 配置 (Next.js 16+)
  // ============================================
  turbopack: {
    // 路径别名
    resolveAlias: {
      '@/': path.join(__dirname, 'src/'),
    },
    // 文件系统根目录（解决 lockfile 警告）
    root: __dirname,
  },

  // ============================================
  // 服务端外部包
  // ============================================
  serverExternalPackages: [
    'sharp',
    'better-sqlite3',
    'jose',
    'uuid',
    'exceljs',
  ],

  // ============================================
  // Webpack 后备配置 (仅当 USE_WEBPACK=true 时)
  // ============================================
  webpack: (config, { isServer, dev }) => {
    if (process.env.USE_WEBPACK === 'true') {
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@/'] = __dirname + '/src';

      if (!isServer && !dev) {
        config.optimization = config.optimization || {};
        config.performance = {
          maxEntrypointSize: 300000,
          maxAssetSize: 250000,
          hints: 'warning',
        };

        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            'three-libs': {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three-libs',
              priority: 60,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 300000,
            },
            'chart-libs': {
              test: /[\\/]node_modules[\\/](recharts|d3|@visx)[\\/]/,
              name: 'chart-libs',
              priority: 50,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 200000,
            },
            'realtime-libs': {
              test: /[\\/]node_modules[\\/](socket\.io|engine\.io)[\\/]/,
              name: 'realtime-libs',
              priority: 45,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
            },
            'ui-libs': {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
              name: 'ui-libs',
              priority: 40,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 20000,
            },
            'framework': {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'framework',
              priority: 35,
              reuseExistingChunk: true,
              minSize: 100000,
              maxSize: 400000,
            },
            'vendor-utils': {
              test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash)[\\/]/,
              name: 'vendor-utils',
              priority: 30,
              reuseExistingChunk: true,
              minSize: 20000,
            },
            'forms-libs': {
              test: /[\\/]node_modules[\\/](zod|react-hook-form)[\\/]/,
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
        };

        config.optimization.usedExports = true;
        config.optimization.sideEffects = false;
        config.optimization.providedExports = true;
        config.optimization.concatenateModules = true;
      }
    }

    return config;
  },

  // ============================================
  // 安全头部
  // ============================================
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
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
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
```

---

## 三、Turbopack 生产环境最佳实践

### 3.1 构建命令

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "NODE_ENV=production next build --turbopack",
    "build:turbo": "NODE_ENV=production next build --turbopack",
    "build:webpack": "NODE_ENV=production USE_WEBPACK=true next build --webpack",
    "build:analyze": "NODE_ENV=production ANALYZE=true next build --turbopack"
  }
}
```

### 3.2 环境变量控制

```bash
# 使用 Turbopack（默认）
TURBOPACK=1 npm run build

# 回退到 Webpack
TURBOPACK=0 npm run build
# 或
USE_WEBPACK=true npm run build
```

### 3.3 Docker 构建优化

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/static

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

### 3.4 内存限制

```bash
# 构建时增加内存（防止 OOM）
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### 3.5 增量构建缓存

Turbopack 自带增量构建优化，无需额外配置文件系统缓存。确保：
- `.next` 目录在部署时被保留在构建服务器上
- CI/CD 流水线利用层缓存

---

## 四、问题修复优先级

### P0 - 立即修复

1. **移除废弃的 `swcMinify` 选项**
   - 状态：导致构建设置警告
   - 操作：删除 `compiler.swcMinify`

2. **清理未公开的 `experimental.turbopack*` 选项**
   - 状态：可能无效或产生未知行为
   - 操作：删除所有 `experimental.turbopack*` 选项

3. **统一路径别名**
   - 状态：当前配置中存在 `@/` 和 `@` 两种别名
   - 操作：统一使用 `@/`

### P1 - 近期修复

4. **添加 `turbopack.root` 配置**
   - 状态：解决 lockfile 警告
   - 操作：设置 `turbopack.root: __dirname`

5. **修复预渲染错误**
   - 状态：构建在 `/_not-found` 页面失败
   - 操作：检查 `not-found.tsx` 的 SSR 兼容性

### P2 - 后续优化

6. **简化 webpack 配置**
   - 状态：复杂但仅作为后备
   - 操作：保持简洁，减少维护负担

7. **添加构建监控**
   - 状态：当前无构建指标追踪
   - 操作：记录每次构建时间和 bundle 大小

---

## 五、预期收益

| 优化项 | 收益 |
|--------|------|
| 移除废弃选项 | 消除构建设置警告 |
| 清理无效选项 | 配置更清晰，行为可预测 |
| 统一路径别名 | 减少模块解析问题 |
| Turbopack 构建 | 构建速度提升约 2x |
| 内存优化 | 构建过程更稳定 |

---

## 六、验证清单

修复后请验证：

- [ ] `npm run build:turbo` 无 `swcMinify` 警告
- [ ] 无 `Unrecognized key(s)` 警告
- [ ] 无 `Detected additional lockfiles` 警告
- [ ] 构建时间 < 60 秒
- [ ] Bundle 大小 < 2MB
- [ ] 所有测试通过

---

**报告结束**

*由 📚 咨询师子代理生成 - 2026-03-28*
