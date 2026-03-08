# 构建优化指南

本文档说明如何优化 Next.js 项目的构建性能和减少构建大小。

## 📊 当前优化状态

### 已实施的优化

- ✅ Turbopack 构建引擎
- ✅ 构建缓存配置
- ✅ 代码分割优化
- ✅ 图片优化
- ✅ 第三方库优化导入
- ✅ 构建统计工具

## 🚀 快速开始

### 开发模式（启用 Turbopack）

```bash
npm run dev:turbopack
# 或
npm run dev
```

### 生产构建

```bash
# 标准构建
npm run build

# 清理缓存后构建
npm run build:clean

# 构建并生成统计报告
npm run build:stats
```

## 📈 优化策略

### 1. 构建性能优化

#### Turbopack 配置
- 启用持久缓存 (`.turbo-cache/`)
- 并行构建
- 内存限制：4GB

#### Webpack 优化
- 代码分割（按库类型）
- 移除生产环境 console.log
- 禁用 source map（生产环境）
- 文件系统缓存

#### TypeScript 优化
- 构建时跳过类型检查
- 排除测试文件
- 跳过默认库检查

### 2. 减少构建大小

#### 代码分割策略

```javascript
// 按库类型分割
- vendors: 所有 node_modules
- react: React 相关库
- three: Three.js 相关库
- common: 共享代码
```

#### 优化导入

```typescript
// ❌ 避免
import _ from 'lodash';
import * as THREE from 'three';

// ✅ 推荐
import { debounce } from 'lodash';
import { WebGLRenderer } from 'three';
```

#### 排除不必要的文件

- 测试文件（`**/*.test.ts`）
- E2E 测试（`e2e/`）
- 文档（`**/*.md`）
- 本地环境文件

### 3. 构建缓存

#### 缓存位置

```
.next/cache/        # Next.js 构建缓存
.turbo-cache/       # Turbopack 缓存
node_modules/.cache # npm 缓存
```

#### CI/CD 缓存

GitHub Actions 自动缓存：
- `node_modules`（基于 package-lock.json）
- `.next/cache`
- `.turbo-cache`

### 4. 图片优化

- 格式：AVIF > WebP > 原始格式
- 懒加载：启用
- 缓存：1 年（31536000 秒）
- 设备尺寸：8 个断点

## 📋 构建统计

运行 `npm run build:stats` 生成报告：

```json
{
  "timestamp": "2026-03-08T17:00:00.000Z",
  "buildSize": {
    "static/chunks": "2.5 MB",
    "static/css": "150 KB",
    "server": "5.2 MB",
    "standalone": "120 MB",
    "total": "128 MB"
  },
  "metrics": {
    "totalChunks": 45,
    "largeChunks": 3,
    "avgChunkSize": "56 KB",
    "avgCompressionRatio": "28.5%"
  }
}
```

## 🎯 优化目标

| 指标 | 当前 | 目标 | 状态 |
|------|------|------|------|
| 构建时间 | - | < 60s | 🔄 |
| 构建大小 | - | < 100MB | 🔄 |
| 首屏加载 | - | < 2s | 🔄 |
| Lighthouse | - | > 90 | 🔄 |

## 🔧 故障排除

### 构建速度慢

1. 检查缓存是否生效
```bash
ls -la .turbo-cache/
ls -la .next/cache/
```

2. 清理缓存后重新构建
```bash
npm run build:clean
```

3. 检查大型依赖
```bash
npm run build:analyze
```

### 构建大小过大

1. 分析 bundle 大小
```bash
npm run build:analyze
```

2. 检查重复依赖
```bash
npm ls <package-name>
```

3. 使用 webpack-bundle-analyzer
```bash
npm install --save-dev webpack-bundle-analyzer
```

### 内存不足

1. 增加 Node.js 内存限制
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

2. 减少 Turbopack 内存限制
```typescript
// next.config.ts
experimental: {
  turbo: {
    memoryLimit: 2048, // 降低到 2GB
  }
}
```

## 📚 相关资源

- [Next.js 构建优化](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Turbopack 文档](https://nextjs.org/docs/architecture/turbopack)
- [Webpack 优化](https://webpack.js.org/guides/build-performance/)
- [BundlePhobia](https://bundlephobia.com/) - 检查包大小

## 📝 更新日志

### 2026-03-08
- ✅ 添加 Turbopack 支持
- ✅ 配置构建缓存
- ✅ 优化代码分割
- ✅ 添加构建统计工具
- ✅ 创建 CI/CD 缓存工作流

---

*最后更新：2026-03-08*
