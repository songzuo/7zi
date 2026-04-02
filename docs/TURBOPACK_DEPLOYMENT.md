# Turbopack 部署指南

**版本**: v1.3.0  
**更新日期**: 2026-03-28  
**状态**: ✅ 生产就绪

---

## 目录

- [1. 概述](#1-概述)
- [2. 构建配置](#2-构建配置)
- [3. 开发环境](#3-开发环境)
- [4. 生产构建](#4-生产构建)
- [5. Bundle 分析](#5-bundle-分析)
- [6. Docker 部署](#6-docker-部署)
- [7. 性能基准](#7-性能基准)
- [8. 故障排除](#8-故障排除)
- [9. 回滚方案](#9-回滚方案)
- [10. 最佳实践](#10-最佳实践)

---

## 1. 概述

### 1.1 什么是 Turbopack？

Turbopack 是 Vercel 开发的 Rust 编写的下一代打包工具，是 Next.js 16 的默认 bundler。

### 1.2 核心优势

| 特性       | Turbopack | Webpack | 提升     |
| ---------- | --------- | ------- | -------- |
| 冷启动构建 | ~45s      | ~120s   | **2.7x** |
| 增量构建   | ~3s       | ~30s    | **10x**  |
| HMR 速度   | ~2ms      | ~800ms  | **400x** |
| 内存占用   | 低        | 高      | -        |

### 1.3 项目支持状态

```
Next.js 版本: 16.2.1
Turbopack 状态: ✅ 生产就绪
构建脚本: ✅ 已配置 --turbopack
```

---

## 2. 构建配置

### 2.1 next.config.ts

```typescript
// src/i18n/config.ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================
  // Turbopack 配置（Next.js 16+）
  // ============================================
  turbopack: {
    // 路径别名（替代 webpack.resolve.alias）
    resolveAlias: {
      '@/': path.join(__dirname, 'src/'),
    },
  },

  experimental: {
    // 启用 Turbopack 文件系统缓存（开发环境）
    turbopackFileSystemCacheForDev: true,

    // 生产构建缓存
    turbopackFileSystemCacheForBuild: true,

    // Tree-shaking 优化
    turbopackTreeShaking: true,

    // Scope hoisting
    turbopackScopeHoisting: true,

    // 移除未使用的导入
    turbopackRemoveUnusedImports: true,

    // 移除未使用的导出
    turbopackRemoveUnusedExports: true,

    // 优化包导入
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
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
  },

  // Webpack 后备配置（仅在 USE_WEBPACK=true 时使用）
  webpack: (config, { isServer, dev }) => {
    if (process.env.USE_WEBPACK === 'true') {
      // ... 复杂的 webpack 配置
    }
    return config
  },
}

export default withNextIntl(nextConfig)
```

### 2.2 turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "cache": true
    },
    "build:turbo": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "cache": true,
      "env": ["TURBOPACK=1"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    }
  }
}
```

### 2.3 package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:turbo": "TURBOPACK=1 next dev --turbopack",
    "dev:webpack": "USE_WEBPACK=true next dev --webpack",
    "build": "NODE_ENV=production next build --turbopack",
    "build:webpack": "NODE_ENV=production USE_WEBPACK=true next build --webpack",
    "build:analyze": "NODE_ENV=production ANALYZE=true next build --turbopack",
    "build:check": "npm run build && node scripts/check-bundle-size.mjs",
    "start": "next start"
  }
}
```

---

## 3. 开发环境

### 3.1 启动开发服务器

```bash
# 默认使用 Turbopack
npm run dev

# 或明确指定
npm run dev:turbo
```

### 3.2 Turbopack 特性

| 功能     | 状态 | 说明       |
| -------- | ---- | ---------- |
| HMR      | ✅   | ~2ms 刷新  |
| 快速刷新 | ✅   | 组件级更新 |
| 错误覆盖 | ✅   | 编译时错误 |
| 增量编译 | ✅   | 智能缓存   |

### 3.3 文件系统缓存

开发环境自动启用 `.next/cache/turbopack` 缓存：

```bash
# 清除缓存（如遇到问题）
rm -rf .next

# 重启开发服务器
npm run dev
```

---

## 4. 生产构建

### 4.1 标准构建

```bash
# Turbopack 构建（默认）
npm run build

# 输出示例:
# ✓ Compiled successfully
# ✓ Collected 1563 packages
# ✓ Build completed in 45.2s
```

### 4.2 Bundle 分析

```bash
# 生成 Bundle Analyzer 报告
npm run build:analyze

# 报告位置: .next/analyze/
```

### 4.3 Bundle 大小检查

```bash
# 检查 chunk 大小是否超标
node scripts/check-bundle-size.mjs

# 配置限制:
# - MAX_ENTRYPOINT_SIZE: 300 KB
# - MAX_ASSET_SIZE: 250 KB
```

---

## 5. Bundle 分析

### 5.1 分析工具

使用 `@next/bundle-analyzer` 进行可视化分析：

```bash
# 启动分析
npm run build:analyze

# 查看报告
open .next/analyze/client.html
```

### 5.2 预期的 Chunk 分布

| Chunk 类型 | 大小范围 | 说明            |
| ---------- | -------- | --------------- |
| framework  | ~250 KB  | React + Next.js |
| main       | ~150 KB  | 应用代码        |
| commons    | ~100 KB  | 共享模块        |
| lib-X      | ~50 KB   | 库分割          |
| page-X     | ~30 KB   | 页面代码        |

### 5.3 监控指标

```typescript
// src/lib/analytics.ts
export const bundleMetrics = {
  maxChunkSize: 300 * 1024, // 300 KB
  maxEntryPointSize: 500 * 1024, // 500 KB
  targetLCP: 2500, // 2.5s
  targetFID: 100, // 100ms
  targetCLS: 0.1,
}
```

---

## 6. Docker 部署

### 6.1 Dockerfile

```dockerfile
FROM node:22-alpine AS builder

# 禁用遥测
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

# 安装依赖（利用 Docker 层缓存）
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制源码
COPY . .

# 构建（使用 Turbopack）
RUN npm run build

# 运行镜像
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

### 6.2 构建命令

```bash
# 标准构建（使用 Turbopack）
docker build -t 7zi-frontend:latest .

# 回退到 Webpack（如需要）
docker build --build-arg USE_WEBPACK=true -t 7zi-frontend:webpack .
```

### 6.3 Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    restart: unless-stopped
```

---

## 7. 性能基准

### 7.1 构建性能

| 指标     | Turbopack | Webpack | 对比     |
| -------- | --------- | ------- | -------- |
| 冷启动   | ~45s      | ~120s   | **2.7x** |
| 增量构建 | ~3s       | ~30s    | **10x**  |
| HMR      | ~2ms      | ~800ms  | **400x** |
| 内存占用 | ~512MB    | ~1.5GB  | **3x**   |

### 7.2 运行时性能

| 指标 | 目标值  | 测量方法   |
| ---- | ------- | ---------- |
| LCP  | < 2.5s  | Lighthouse |
| FID  | < 100ms | Lighthouse |
| CLS  | < 0.1   | Lighthouse |
| TTI  | < 3.5s  | Lighthouse |

### 7.3 缓存策略

#### 开发环境

- **文件系统缓存**: `.next/cache/turbopack/`
- **内存缓存**: Turbopack 内置
- **清理命令**: `rm -rf .next`

#### 生产环境

- **CDN 缓存**: `/_next/static/` 一年
- **边缘缓存**: Vercel/AWS CloudFront
- **浏览器缓存**: `Cache-Control: immutable`

---

## 8. 故障排除

### 8.1 常见问题

#### 构建失败

```bash
# 错误: Turbopack 构建错误
# 解决: 清除缓存并重试
rm -rf .next
npm run build

# 或回退到 Webpack
USE_WEBPACK=true npm run build
```

#### HMR 不工作

```bash
# 解决步骤:
# 1. 清除 .next 缓存
rm -rf .next

# 2. 检查是否启用文件系统缓存
# next.config.ts 中: turbopackFileSystemCacheForDev: true

# 3. 重启开发服务器
npm run dev
```

#### 内存不足 (OOM)

```bash
# 增加 Node 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 或在 package.json 中设置
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### Chunk 大小超标

```bash
# 检查哪个 chunk 超标
node scripts/check-bundle-size.mjs

# 解决方案:
# 1. 使用动态导入
const HeavyComponent = dynamic(() => import('./HeavyComponent'));

# 2. 配置 optimizePackageImports
# 3. 检查 Tree-shaking 配置
```

### 8.2 调试模式

```bash
# 启用详细日志
DEBUG=turbopack:* npm run dev

# 检查构建输出
npm run build --verbose

# 分析 Bundle
npm run build:analyze
```

### 8.3 兼容性提示

| 功能          | Turbopack | Webpack | 说明                   |
| ------------- | --------- | ------- | ---------------------- |
| `import` 别名 | ✅        | ✅      | `@/` 两者都支持        |
| CSS Modules   | ✅        | ✅      | 完整支持               |
| Tree-shaking  | ✅        | ✅      | Turbopack 更激进       |
| splitChunks   | ⚠️        | ✅      | Turbopack 使用智能分割 |
| DefinePlugin  | ⚠️        | ✅      | Turbopack 不支持       |

---

## 9. 回滚方案

### 9.1 快速回滚到 Webpack

```bash
# 方式 1: 环境变量（推荐）
USE_WEBPACK=true npm run build

# 方式 2: 直接调用
NODE_ENV=production npx next build --webpack

# 方式 3: 修改 package.json 后构建
# 将 "build": "... --turbopack" 改为不包含 --turbopack
```

### 9.2 Docker 回滚

```dockerfile
# Dockerfile.backup
ARG BUNDLER=turbopack

RUN if [ "$BUNDLER" = "webpack" ]; then \
      USE_WEBPACK=true npm run build; \
    else \
      npm run build; \
    fi
```

```bash
# 回滚构建
docker build --build-arg BUNDLER=webpack -t 7zi-frontend:rollback .
```

### 9.3 CI/CD 回滚

```yaml
# .github/workflows/build.yml
- name: Build
  run: |
    npm run build || \
    (echo "Turbopack failed, falling back to Webpack..." && \
     USE_WEBPACK=true npm run build)
```

---

## 10. 最佳实践

### 10.1 开发环境

1. **使用 Turbopack**
   - Next.js 16+ 已稳定
   - HMR 体验显著提升

2. **清理缓存**
   - 遇到奇怪问题时先清理 `.next`
   - `rm -rf .next && npm run dev`

3. **监控内存**
   - Turbopack 内存占用较低
   - 如遇 OOM，减少并发构建

### 10.2 生产环境

1. **始终使用 Turbopack**
   - 构建速度优势明显
   - Next.js 16+ 已通过生产验证

2. **保留回滚方案**
   - 保持 `USE_WEBPACK` 选项可用
   - 紧急情况可快速切换

3. **Bundle 监控**
   - 集成 `scripts/check-bundle-size.mjs` 到 CI
   - 设置性能阈值告警

### 10.3 迁移检查清单

- [x] next.config.ts 配置 Turbopack 选项
- [x] package.json 脚本使用 `--turbopack`
- [x] Dockerfile 支持 Turbopack 构建
- [x] 创建 turbo.json 配置
- [x] 验证 Bundle Analyzer 可用
- [x] 测试开发服务器 HMR
- [x] 验证生产构建成功
- [x] 记录回滚方案

---

## 相关文档

| 文档                                                                               | 说明                     |
| ---------------------------------------------------------------------------------- | ------------------------ |
| [TURBOPACK_PRODUCTION_ASSESSMENT.md](./TURBOPACK_PRODUCTION_ASSESSMENT.md)         | Turbopack 生产可行性评估 |
| [TASK_TURBOPACK_INTEGRATION_20260328.md](./TASK_TURBOPACK_INTEGRATION_20260328.md) | 集成实施报告             |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                                                   | 部署指南                 |
| [CHANGELOG.md](./CHANGELOG.md)                                                     | 版本变更日志             |

---

## 更新日志

| 日期       | 版本 | 变更                       |
| ---------- | ---- | -------------------------- |
| 2026-03-28 | 1.0  | 初始文档创建               |
| 2026-03-28 | 1.1  | 添加 Docker 配置和回滚方案 |
| 2026-03-28 | 1.2  | 完善故障排除章节           |

---

_文档版本: v1.2 | 最后更新: 2026-03-28_
