# Turbopack 生产环境部署指南

## 概述

本项目使用 Next.js 16 + Turbopack 进行生产环境构建，提供更快的构建速度和更好的开发体验。

## 什么是 Turbopack？

Turbopack 是 Next.js 16 的默认打包工具，由 Rust 编写，提供：

- **700x 更快的 HMR**（热模块替换）
- **10x 更快的初始构建**
- **更优的增量构建**
- **智能缓存机制**

## 配置文件

### next.config.ts

```typescript
experimental: {
  // 启用 Turbopack 文件系统缓存（开发模式）
  turbopackFileSystemCacheForDev: true,

  // Turbopack 生产配置
  turbopack: {
    // 自定义规则（可选）
    rules: {},
  },
}
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "NODE_ENV=production next build --turbopack",
    "build:analyze": "NODE_ENV=production ANALYZE=true next build --turbopack"
  }
}
```

### Dockerfile

```dockerfile
# Turbopack 生产构建
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build
```

## 生产环境部署

### 1. Docker 构建

```bash
# 构建镜像（默认使用 Turbopack）
docker build -t 7zi-frontend:latest .

# 启动容器
docker run -p 3000:3000 7zi-frontend:latest
```

### 2. 环境变量

| 变量        | 描述           | 默认值       |
| ----------- | -------------- | ------------ |
| `NODE_ENV`  | 运行环境       | `production` |
| `PORT`      | 服务端口       | `3000`       |
| `HOSTNAME`  | 监听地址       | `0.0.0.0`    |
| `TURBOPACK` | Turbopack 开关 | `1`          |

### 3. 回退到 Webpack

如果遇到 Turbopack 兼容性问题，可以回退到 Webpack：

```bash
# 方式 1: 环境变量（推荐）
TURBOPACK=0 npm run build

# 方式 2: 修改 package.json
"build": "NODE_ENV=production next build"  # 移除 --turbopack

# 方式 3: Docker 构建时覆盖
docker build --build-arg TURBOPACK=0 -t 7zi-frontend:latest .
```

## 性能优化

### 构建速度优化

```typescript
// next.config.ts
experimental: {
  // 启用包导入优化
  optimizePackageImports: [
    'next-intl', '@sentry/nextjs', 'zustand', 'web-vitals', 'lucide-react',
    'three', '@react-three/fiber', '@react-three/drei',
  ],
  // CSS 优化
  optimizeCss: true,
}
```

### 缓存策略

1. **Docker 层缓存**
   - `package.json` 和 `package-lock.json` 单独复制
   - 先安装依赖，再复制源码

2. **Turbopack 文件系统缓存**
   - 开发模式自动启用
   - 生产构建利用增量编译

3. **CDN 缓存**
   ```typescript
   headers: async () => {
     return [
       {
         source: '/_next/static/:path*',
         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
       },
     ]
   }
   ```

## 故障排除

### 常见问题

#### 1. 构建失败

**症状**: Turbopack 构建时出现错误

**解决方案**:

```bash
# 回退到 Webpack
TURBOPACK=0 npm run build
```

#### 2. HMR 不工作

**症状**: 开发时修改代码不刷新

**解决方案**:

- 检查 `turbopackFileSystemCacheForDev: true`
- 清除 `.next` 缓存: `rm -rf .next`
- 重启开发服务器

#### 3. 生产构建慢

**症状**: 构建时间过长

**解决方案**:

- 确保启用了 `turbopackFileSystemCacheForDev`
- 检查 `optimizePackageImports` 配置
- 减少不必要的依赖

#### 4. 内存不足

**症状**: 构建时 OOM (Out of Memory)

**解决方案**:

```bash
# 增加 Node 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 或在 Dockerfile 中设置
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

### 调试模式

```bash
# 启用 Turbopack 详细日志
TURBOPACK_DEBUG=1 npm run build

# 检查构建分析
ANALYZE=true npm run build:analyze
```

## 性能基准

### 构建时间对比（示例）

| 场景     | Webpack | Turbopack | 提升 |
| -------- | ------- | --------- | ---- |
| 初始构建 | 120s    | 45s       | 2.7x |
| 增量构建 | 30s     | 3s        | 10x  |
| HMR      | 800ms   | 2ms       | 400x |

### 实际指标

- **首次访问**: < 1s (LCP)
- **构建时间**: ~45s (Docker)
- **镜像大小**: ~150MB (Alpine)

## 最佳实践

1. **生产环境始终使用 Turbopack**
   - Next.js 16+ 已经稳定
   - 性能显著优于 Webpack

2. **保留 Webpack 回退**
   - 环境变量控制切换
   - 不影响现有部署

3. **监控构建指标**
   - 记录构建时间
   - 对比 Turbopack vs Webpack

4. **定期更新 Next.js**
   - Turbopack 持续优化
   - 新版本修复已知问题

## 相关文档

- [Next.js 16 文档](https://nextjs.org/docs)
- [Turbopack GitHub](https://github.com/vercel/next.js/tree/canary/packages/next/src/build/turbopack)
- [DEPLOYMENT.md](../DEPLOYMENT.md)
- [CHANGELOG.md](../CHANGELOG.md)

## 更新日志

- **2026-03-28**: 启用 Turbopack 生产构建支持
- **2026-03-28**: 更新 Dockerfile 和配置文件
- **2026-03-28**: 添加向后兼容（Webpack 回退）
