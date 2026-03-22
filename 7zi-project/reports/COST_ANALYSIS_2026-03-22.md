# 7zi-frontend 成本分析报告
**生成日期**: 2026-03-22
**分析人员**: 💰 财务子代理
**项目路径**: `/root/.openclaw/workspace/7zi-project`

---

## 📊 执行摘要

本报告分析了 7zi-frontend 项目的依赖成本、资源使用情况和潜在优化机会。发现的主要问题包括：

- **node_modules 体积过大**: 1.6GB，包含大量未使用依赖
- **重复依赖**: 870 个总依赖，其中标记为 "extraneous" 的包数量异常
- **未使用的 3D 渲染库**: Three.js 及相关库占用约 76MB，但仅在测试文件中使用
- **大型测试框架**: Playwright (10MB+ hls.js) 和相关工具占用大量空间
- **构建产物**: .next 目录 59MB，standalone 模式已启用

---

## 📦 1. 依赖成本概览

### 1.1 依赖统计

| 指标 | 数值 | 说明 |
|------|------|------|
| **生产依赖** | 28 | package.json dependencies |
| **开发依赖** | 18 | package.json devDependencies |
| **总包数量** | 870 | 包含所有子依赖 |
| **node_modules 大小** | 1.6GB | 磁盘占用 |
| **package-lock.json** | 622KB | 锁文件大小 |

### 1.2 依赖分类

#### 生产依赖 (28 个)
```json
{
  "@jest/globals": "^30.3.0",
  "@modelcontextprotocol/sdk": "^1.27.1",
  "@react-three/drei": "^10.7.7",
  "@react-three/fiber": "^9.5.0",
  "@sentry/nextjs": "^10.44.0",
  "@testing-library/jest-dom": "^6.9.1",
  "better-sqlite3": "^12.8.0",
  "exceljs": "^4.4.0",
  "fuse.js": "^7.1.0",
  "glob": "^13.0.6",
  "ioredis": "^5.10.1",
  "isomorphic-dompurify": "^3.6.0",
  "jose": "^6.2.1",
  "lucide-react": "^0.577.0",
  "next": "^16.2.1",
  "next-intl": "^4.8.3",
  "react": "^19.2.4",
  "react-dom": "^19.2.4",
  "recharts": "^3.8.0",
  "sharp": "^0.34.5",
  "socket.io-client": "^4.8.3",
  "three": "^0.183.2",
  "undici": "^7.24.5",
  "uuid": "^13.0.0",
  "web-vitals": "^5.1.0",
  "zod": "^4.3.6",
  "zustand": "^5.0.12"
}
```

#### 开发依赖 (18 个)
```json
{
  "@next/bundle-analyzer": "^16.2.1",
  "@playwright/test": "^1.58.2",
  "@tailwindcss/postcss": "^4",
  "@testing-library/react": "^16.3.2",
  "@testing-library/user-event": "^14.6.1",
  "@types/better-sqlite3": "^7.6.12",
  "@types/node": "^25.5.0",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@types/socket.io": "^3.0.1",
  "@types/supertest": "^7.2.0",
  "@vitejs/plugin-react": "^6.0.1",
  "eslint": "^9",
  "eslint-config-next": "^16.2.1",
  "msw": "^2.12.14",
  "socket.io": "^4.8.3",
  "supertest": "^7.2.2",
  "typescript": "^5",
  "vitest": "^4.1.0"
}
```

---

## 💾 2. 资源使用统计

### 2.1 node_modules 大小分析 (Top 30)

| 包名 | 大小 | 类型 | 状态 |
|------|------|------|------|
| @next | 249MB | 生产 | ✅ 必需 |
| next | 172MB | 生产 | ✅ 必需 |
| @swc | 62MB | 传递依赖 | ⚠️ 可优化 |
| @sentry | 51MB | 生产 | ✅ 必需 (监控) |
| lucide-react | 46MB | 生产 | ✅ 必需 (图标) |
| @rolldown | 44MB | 传递依赖 | ⚠️ 可优化 |
| **three** | 38MB | **生产** | ❌ **未使用** |
| @img | 33MB | 传递依赖 | ✅ 必需 (sharp) |
| **three-stdlib** | 30MB | **传递依赖** | ❌ **未使用** |
| **stats-gl** | 30MB | **传递依赖** | ❌ **未使用** |
| **hls.js** | 25MB | **传递依赖** | ❌ **未使用** |
| @opentelemetry | 25MB | 传递依赖 | ⚠️ 可选 |
| typescript | 23MB | 开发依赖 | ✅ 必需 (TS) |
| **@mediapipe** | 20MB | **传递依赖** | ❌ **未使用** |
| es-toolkit | 12MB | 传递依赖 | ⚠️ 可优化 |
| better-sqlite3 | 12MB | 生产 | ✅ 必需 |
| @babel | 12MB | 传递依赖 | ⚠️ 可优化 |
| @types | 9.9MB | 开发依赖 | ✅ 必需 |
| playwright-core | 9.8MB | 开发依赖 | ⚠️ 生产环境不需要 |
| lightningcss-* | 19.4MB | 传递依赖 | ⚠️ 可优化 |
| jsdom | 9.3MB | 传递依赖 | ⚠️ 可优化 |
| recharts | 8.7MB | 生产 | ✅ 必需 |
| @reduxjs | 8.4MB | 传递依赖 | ❌ 未使用 (项目用 Zustand) |
| webpack | 7.8MB | 传递依赖 | ⚠️ Next.js 已内置 |
| msw | 7.8MB | 开发依赖 | ⚠️ 生产环境不需要 |
| @typescript-eslint | 7.6MB | 开发依赖 | ✅ 必需 |
| @napi-rs | 7.6MB | 传递依赖 | ⚠️ 可优化 |
| @dimforge | 7.4MB | 传递依赖 | ❌ 未使用 (Three.js 物理) |

**总计未使用/可疑依赖**: ~250MB

### 2.2 构建产物分析

| 目录/文件 | 大小 | 说明 |
|-----------|------|------|
| **.next/standalone** | 55MB | 独立部署包 ✅ |
| **.next/server** | 6.2MB | 服务端代码 ✅ |
| **.next/static** | 708KB | 静态资源 ✅ |
| **.next/cache** | 260KB | 构建缓存 ✅ |
| **总计** | **59MB** | 合理范围 |

### 2.3 云服务成本分析

#### 当前配置

**Docker 容器资源限制**:
- 7zi-frontend: CPU 1核, 内存 512MB (上限) / 128MB (预留)
- Nginx: CPU 0.5核, 内存 128MB (上限) / 32MB (预留)

**分析服务**:
- ✅ Plausible Analytics: 已启用 (`NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com`)
- ❌ Google Analytics 4: 未启用
- ❌ Umami Analytics: 未启用
- ❌ Sentry 错误监控: 已安装 (`@sentry/nextjs@^10.44.0`) 但未配置 DSN

#### 成本估算 (年化)

| 服务 | 状态 | 成本估算 |
|------|------|----------|
| **Plausible Analytics** | ✅ 已启用 | ~$50-100/年 (自托管) |
| **Sentry** | ❌ 未配置 | $0 (不使用) / $26/月起 (若使用) |
| **Vercel 部署** | ❌ 未使用 (Docker) | $0 (自托管服务器) |
| **服务器 (7zi.com)** | ✅ 使用中 | $5-10/月 (VPS 估算) |
| **带宽** | 估算 | ~$1-5/月 (中小流量) |

---

## 🚨 3. 主要成本问题

### 3.1 未使用的 3D 渲染依赖 (~76MB)

**问题**:
- `three` (38MB) - Three.js 核心库
- `@react-three/fiber` (部分计入) - React Three Fiber
- `@react-three/drei` (部分计入) - Three.js 辅助工具
- `three-stdlib` (30MB) - Three.js 标准库
- `stats-gl` (30MB) - 性能监控
- `@mediapipe/tasks-vision` (20MB) - MediaPipe (视频处理)
- `hls.js` (25MB) - HLS 视频流
- `@dimforge/rapier3d-compat` (7.4MB) - 3D 物理引擎

**证据**:
- `src/components/knowledge-lattice/KnowledgeLattice3D.tsx` 仅返回占位符文本
- 仅在测试文件中 mock 了 `@react-three/fiber` 和 `@react-three/drei`
- 源代码中未发现实际 3D 渲染实现

**影响**:
- 增加 node_modules 体积: ~150MB
- 增加构建时间
- 可能影响生产环境性能

### 3.2 重复和传递依赖 (~100MB)

**问题**:
- `@reduxjs` (8.4MB) - 项目使用 Zustand，不需要 Redux
- `@babel` (12MB) - Next.js 16 已迁移到 SWC，Babel 可能冗余
- `webpack` (7.8MB) - Next.js 内置，重复安装
- `lightningcss` (19.4MB) - Tailwind v4 可能不需要

### 3.3 生产环境不需要的开发依赖

**问题**:
- `@playwright/test` 及相关包 (10MB+) - 仅开发/测试需要
- `@vitejs/plugin-react` - 项目使用 Next.js，不需要 Vite
- `msw` (7.8MB) - Mock Service Worker，仅测试需要

### 3.4 异常的依赖标记

**问题**:
- `npm ls` 显示 870 个依赖均标记为 "extraneous"
- 这表明 package-lock.json 可能损坏或依赖关系混乱

---

## 💡 4. 优化建议 (按优先级排序)

### 🔴 高优先级 (立即执行)

#### 4.1 移除未使用的 3D 渲染依赖

**节省估算**: ~150MB node_modules

**执行步骤**:
```bash
cd /root/.openclaw/workspace/7zi-project

# 移除生产依赖
npm uninstall three @react-three/drei @react-three/fiber

# 移除测试文件中的相关导入
# 编辑 src/components/knowledge-lattice/KnowledgeLattice3D.test.tsx
```

**风险**: 低 - 这些依赖未被实际使用

#### 4.2 清理 package-lock.json 依赖混乱

**执行步骤**:
```bash
# 备份当前锁文件
cp package-lock.json package-lock.json.backup

# 重新生成锁文件
rm -rf node_modules package-lock.json
npm install

# 验证依赖完整性
npm ls --depth=0
```

**收益**:
- 修复 870 个 "extraneous" 标记问题
- 清理孤儿依赖

### 🟡 中优先级 (近期执行)

#### 4.3 使用 `npm ci` 或 `.npmrc` 优化生产构建

**创建 `.npmrc`**:
```ini
# 仅安装生产依赖
# npm ci --production

# 使用更快的镜像 (可选)
# registry=https://registry.npmmirror.com

# 缓存优化
prefer-offline=true
cache-min=86400
```

**执行步骤**:
```bash
# 生产环境安装
npm ci --production

# 或仅安装生产依赖
npm prune --production
```

**节省估算**: ~200MB (移除所有开发依赖)

#### 4.4 配置 Sentry 减少日志成本

**当前状态**:
- `@sentry/nextjs@^10.44.0` 已安装
- 但未配置 DSN，不产生实际成本

**建议**:
- 如果不需要错误监控: `npm uninstall @sentry/nextjs` (节省 51MB)
- 如果需要: 配置采样率减少事件量

```typescript
// sentry.config.ts
export default {
  tracesSampleRate: 0.1, // 仅采样 10% 的事务
  replaysSessionSampleRate: 0.1, // 仅采样 10% 的会话回放
}
```

### 🟢 低优先级 (长期优化)

#### 4.5 优化 Next.js 构建配置

**在 `next.config.ts` 中添加**:
```typescript
const nextConfig: NextConfig = {
  // 现有配置...

  // 实验性功能
  experimental: {
    // 减少内存占用
    workerThreads: false,
    cpus: 1,
  },

  // 优化 CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 压缩优化
  swcMinify: true,
}
```

**收益**:
- 减少构建内存占用
- 加快构建速度

#### 4.6 使用 `.dockerignore` 减少镜像体积

**创建/更新 `.dockerignore`**:
```dockerignore
# 依赖
node_modules
npm-debug.log
yarn-error.log

# 测试
tests/
*.test.ts
*.test.tsx
e2e/
test-results/

# 文档
docs/
*.md
!README.md

# 开发工具
.vscode/
.idea/

# 构建产物 (在镜像内重新构建)
.next/
out/
dist/

# Git
.git/
.github/

# 其他
.env.local
.env.*.local
*.log
```

**执行步骤**:
```bash
# 重建 Docker 镜像
docker build --no-cache -t 7zi-frontend:optimized .
```

**节省估算**: ~300MB 镜像体积

#### 4.7 考虑使用 Yarn Workspaces 或 pnpm

**优势**:
- 硬链接去重 (pnpm)
- 更快的安装速度
- 更小的磁盘占用

**迁移示例**:
```bash
# 安装 pnpm
npm install -g pnpm

# 迁移依赖
pnpm import

# 安装依赖
pnpm install
```

**预期节省**: 20-30% node_modules 体积

---

## 💰 5. 潜在节省估算

### 5.1 磁盘空间节省

| 优化项 | 当前大小 | 优化后大小 | 节省 |
|--------|----------|-----------|------|
| **移除未使用 3D 库** | 150MB | 0MB | **150MB** |
| **生产环境使用 --production** | 1.6GB | 1.1GB | **500MB** |
| **Docker 镜像优化** | ~800MB | ~500MB | **300MB** |
| **清理重复依赖** | ~100MB | 0MB | **100MB** |
| **使用 pnpm** | 1.6GB | 1.1GB | **500MB** |
| **总计 (叠加)** | - | - | **~1GB** |

### 5.2 构建时间节省

| 优化项 | 预期节省 |
|--------|----------|
| 移除未使用依赖 | ~10-15% |
| 使用 Next.js 16 Turbopack | ~20-30% |
| Docker 层缓存优化 | ~50% (重复构建) |
| pnpm 安装速度 | ~40% |

### 5.3 云服务成本节省

| 项目 | 当前成本 | 优化后成本 | 节省/年 |
|------|----------|-----------|---------|
| **Sentry (不使用)** | $0 | $0 | $0 |
| **Vercel (不使用)** | $0 | $0 | $0 |
| **带宽 (优化构建产物)** | ~$50/年 | ~$30/年 | **$20** |
| **总计** | - | - | **$20/年** |

**注**: 主要节省在磁盘空间和构建时间，而非直接云服务成本。

---

## 📋 6. 执行计划

### 阶段 1: 快速清理 (1 小时)

- [ ] 移除未使用的 3D 渲染依赖
- [ ] 重新生成 package-lock.json
- [ ] 验证依赖完整性
- [ ] 运行测试确保功能正常

### 阶段 2: 生产优化 (2 小时)

- [ ] 创建 `.npmrc` 配置
- [ ] 配置生产环境构建脚本
- [ ] 更新 Docker 镜像构建配置
- [ ] 测试 Docker 镜像体积

### 阶段 3: 长期优化 (1 天)

- [ ] 评估迁移到 pnpm
- [ ] 优化 Next.js 配置
- [ ] 实施构建缓存策略
- [ ] 文档更新和团队培训

---

## ✅ 7. 验证清单

执行优化后，请验证以下指标:

- [ ] `du -sh node_modules` - 确认大小减少
- [ ] `npm ls --depth=0` - 确认无 "extraneous" 标记
- [ ] `npm run build` - 构建成功
- [ ] `npm run test` - 所有测试通过
- [ ] `docker images` - 镜像体积减少
- [ ] 生产环境部署验证 - 功能正常

---

## 📝 8. 附录

### 8.1 完整依赖列表 (未使用)

以下依赖在 `node_modules` 中存在，但在源代码中未找到使用:

```bash
# 3D 渲染
three
@react-three/fiber
@react-three/drei
three-stdlib
stats-gl
@mediapipe/tasks-vision
hls.js
@dimforge/rapier3d-compat

# 状态管理 (项目使用 Zustand)
@reduxjs/redux
@reduxjs/toolkit

# 构建工具 (Next.js 内置)
webpack
@babel/*

# 视频处理 (未发现使用)
hls.js
```

### 8.2 参考命令

```bash
# 查看依赖树
npm ls --all

# 查找未使用的依赖
npx depcheck

# 分析包大小
npx next-bundle-analyzer

# 查看 Docker 镜像层
docker history 7zi-frontend:latest

# 查看构建时间
time npm run build
```

---

**报告结束**

*本报告由 💰 财务子代理生成*
*如有疑问，请联系主管*
