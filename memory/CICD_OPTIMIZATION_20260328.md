# 7zi-frontend CI/CD 优化方案

**日期**: 2026-03-28  
**分析师**: 📚 咨询师  
**项目**: 7zi-frontend (Next.js 16)

---

## 📊 当前状态分析

### 项目规模

- **代码量**: ~47,000 行 TypeScript/TSX
- **依赖**: ~85个生产依赖 + ~30个开发依赖
- **Node.js**: v22
- **框架**: Next.js 16.2.1 (支持 Turbopack)

### 当前 CI/CD 结构 (v7)

```
┌─────────────────────────────────────────────────────────────────┐
│                    当前工作流架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐   ┌──────────┐                                     │
│  │ changes  │──▶│  setup   │ (安装依赖)                          │
│  └──────────┘   └────┬─────┘                                     │
│                      │                                            │
│        ┌─────────────┼─────────────┐                             │
│        ▼             ▼             ▼                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ security │  │   lint   │  │typecheck │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                      │                                            │
│                      ▼                                            │
│               ┌──────────────┐                                   │
│               │ test-unit x4 │ (分片并行)                        │
│               └──────┬───────┘                                   │
│                      │                                            │
│                      ▼                                            │
│                ┌──────────┐                                      │
│                │  build   │                                      │
│                └────┬─────┘                                      │
│                     │                                             │
│         ┌───────────┼───────────┐                                │
│         ▼           ▼           ▼                                │
│    ┌─────────┐ ┌─────────┐ ┌──────────┐                         │
│    │ test-e2e│ │ docker  │ │ pre-deploy│                        │
│    └─────────┘ └────┬────┘ └──────────┘                         │
│                     │                                             │
│         ┌───────────┴───────────┐                                │
│         ▼                       ▼                                │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │deploy-staging│     │deploy-production │                      │
│  └──────────────┘     └──────────────────┘                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 当前配置优点 ✅

1. **统一工作流** - PR/main/develop 共用,减少维护成本
2. **测试分片** - 4x 并行单元测试,加速测试阶段
3. **多层缓存**:
   - `node_modules` 缓存
   - Next.js turbo 缓存
   - Docker GHA cache
4. **变更检测** - 跳过不必要的测试
5. **超时控制** - 防止无限运行
6. **安全审计** - npm audit + 敏感文件检查

---

## 🚨 发现的问题

### 1. 依赖安装重复 (关键问题)

**问题**: 每个 job 都独立安装依赖,即使有缓存也需要执行 `npm ci`

```yaml
# 当前: 每个 job 都这样
- name: 设置 Node.js
  uses: actions/setup-node@v4
- name: 缓存 node_modules
  uses: actions/cache@v4
- name: 安装依赖
  if: steps.node-modules-cache.outputs.cache-hit != 'true'
  run: npm ci --prefer-offline
```

**影响**:

- 7个 jobs 重复执行依赖检查
- 即使缓存命中,仍需 10-30秒 恢复缓存
- **总浪费时间**: ~3-5分钟

### 2. 缓存策略不完善

**问题**: `node_modules` 缓存 key 过于简单

```yaml
# 当前
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
```

**缺陷**:

- 未考虑 Node.js 版本变化
- 未区分生产/开发依赖
- 缓存粒度太粗,任何依赖变化都失效

### 3. Docker 构建优化不足

**当前 Dockerfile**:

```dockerfile
# Stage 1: deps
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Stage 2: builder
COPY --from=deps /app/node_modules ./node_modules
```

**问题**:

- 使用 `--legacy-peer-deps` 可能隐藏依赖冲突
- 未利用 BuildKit 内联缓存
- 多阶段构建未最大化层缓存

### 4. E2E 测试串行执行

```yaml
strategy:
  matrix:
    browser: [chromium] # 仅一个浏览器
```

**问题**: 未充分利用矩阵并行,可同时测试多个浏览器

### 5. 缺少构建缓存共享

**问题**: `build` job 的产物未缓存,每次完整构建

```yaml
# 当前: 无构建产物缓存
- name: 构建应用
  run: npm run build
```

---

## 🎯 优化方案

### 方案 1: 依赖安装优化 (预计节省 3-5 分钟)

#### 1.1 使用 `actions/setup-node` 内置缓存

```yaml
# ✅ 推荐: 使用 setup-node 内置 npm 缓存
- name: 设置 Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'npm' # 自动缓存 ~/.npm
```

**优势**:

- 官方维护,更稳定
- 自动处理缓存失效
- 减少配置复杂度

#### 1.2 使用 workspace 缓存共享依赖

```yaml
# ✅ 推荐: 在 setup job 安装一次,其他 job 共享
jobs:
  setup:
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 缓存 node_modules
        id: cache
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node${{ env.NODE_VERSION }}-modules-${{ hashFiles('package-lock.json') }}

      - name: 安装依赖
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline --no-audit

      # ✅ 保存到 artifact,供其他 job 使用
      - name: 保存依赖快照
        uses: actions/upload-artifact@v4
        with:
          name: node-modules
          path: node_modules
          retention-days: 1

  lint:
    needs: setup
    steps:
      - uses: actions/checkout@v4

      # ✅ 从 artifact 恢复,无需重新安装
      - name: 恢复依赖
        uses: actions/download-artifact@v4
        with:
          name: node-modules
          path: node_modules

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: 运行 ESLint
        run: npm run lint
```

**效果**:

- 依赖只安装一次
- 其他 job 直接使用,节省 30-60 秒/job
- **总节省**: ~3-4 分钟

### 方案 2: 增强缓存策略

#### 2.1 多层缓存 key

```yaml
- name: 缓存 node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node${{ env.NODE_VERSION }}-modules-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node${{ env.NODE_VERSION }}-modules-
      ${{ runner.os }}-node-modules-
```

**优势**: 依赖更新时,部分缓存仍可复用

#### 2.2 Turborepo 远程缓存 (高级)

```yaml
# 如果使用 Turborepo
- name: Turbo 缓存
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      turbo-${{ runner.os }}-
```

### 方案 3: Docker 构建优化

#### 3.1 使用 BuildKit 内联缓存

```yaml
- name: 构建并推送 Docker 镜像
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.optimized
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    cache-from: |
      type=gha
      type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache
    cache-to: type=gha,mode=max
    build-args: |
      NEXT_TELEMETRY_DISABLED=1
      BUILDKIT_INLINE_CACHE=1
```

#### 3.2 优化 Dockerfile 层缓存

```dockerfile
# ✅ 改进的 Dockerfile
FROM node:22-alpine AS deps

WORKDIR /app

# 1. 先复制 package 文件 (层缓存)
COPY package.json package-lock.json ./

# 2. 安装依赖 (独立层,可缓存)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

FROM node:22-alpine AS builder

WORKDIR /app

# 3. 复制 node_modules (独立层)
COPY --from=deps /app/node_modules ./node_modules

# 4. 复制源码 (最后复制,频繁变化)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 5. 构建 (利用 BuildKit 缓存)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 6. 最小化最终镜像
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
```

**优化点**:

- `RUN --mount=type=cache` - 持久化构建缓存
- 分离依赖安装和源码复制
- 最小化最终镜像层

### 方案 4: E2E 测试并行化

```yaml
test-e2e:
  strategy:
    fail-fast: false
    matrix:
      browser: [chromium, firefox, webkit]
      shard: [1/2, 2/2] # 分片 + 多浏览器
```

**效果**: 3 浏览器 × 2 分片 = 6 并行任务

### 方案 5: 构建缓存共享

```yaml
build:
  steps:
    - name: 缓存构建产物
      uses: actions/cache@v4
      with:
        path: |
          .next/cache
          .next/standalone
        key: build-${{ runner.os }}-${{ hashFiles('src/**/*.{ts,tsx}') }}-${{ github.sha }}
        restore-keys: |
          build-${{ runner.os }}-${{ hashFiles('src/**/*.{ts,tsx}') }}-
          build-${{ runner.os }}-
```

---

## 📈 优化效果预估

### 时间节省对比

| 阶段                 | 当前耗时        | 优化后             | 节省        |
| -------------------- | --------------- | ------------------ | ----------- |
| 依赖安装 (setup)     | 2-3 min         | 2-3 min (仅一次)   | -           |
| 依赖安装 (其他 jobs) | 30s × 6 = 3 min | 10s × 6 = 1 min    | **2 min**   |
| 单元测试             | 4-6 min         | 3-5 min (分片优化) | **1 min**   |
| 构建                 | 3-5 min         | 2-4 min (缓存优化) | **1 min**   |
| Docker 构建          | 5-8 min         | 3-5 min (层缓存)   | **2-3 min** |
| **总计**             | **17-25 min**   | **11-18 min**      | **6-7 min** |

### 缓存命中率预估

| 缓存类型      | 当前命中率 | 优化后命中率 |
| ------------- | ---------- | ------------ |
| node_modules  | 60%        | 85%          |
| Next.js turbo | 70%        | 90%          |
| Docker 层缓存 | 50%        | 80%          |

---

## 🛠️ 实施计划

### 阶段 1: 立即实施 (低风险)

1. **优化 setup-node 缓存配置** (5分钟)
   - 使用内置 `cache: 'npm'`
   - 添加多层 restore-keys

2. **添加构建产物缓存** (10分钟)
   - 缓存 `.next/cache` 和 `.next/standalone`

### 阶段 2: 短期优化 (1-2 天)

1. **依赖安装优化** (需要测试)
   - 实现 artifact 共享方案
   - 验证缓存命中率

2. **Dockerfile 优化**
   - 实现 BuildKit 缓存
   - 更新 Dockerfile.optimized

### 阶段 3: 长期优化 (1 周)

1. **E2E 测试并行化**
   - 配置多浏览器矩阵
   - 实现测试分片

2. **监控和调优**
   - 添加缓存命中率监控
   - 优化缓存 key 策略

---

## 📋 具体实施代码

### 优化后的完整 ci.yml

```yaml
# ============================================
# 7zi-frontend 优化版 CI/CD Pipeline (v8)
# ============================================
name: CI/CD Pipeline (Optimized)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  NODE_VERSION: '22'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  contents: read
  deployments: write
  pull-requests: write
  actions: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ============================================
  # Job 1: 依赖安装 (仅一次)
  # ============================================
  setup:
    name: 安装依赖
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 缓存 node_modules
        id: cache
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node${{ env.NODE_VERSION }}-modules-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node${{ env.NODE_VERSION }}-modules-
            ${{ runner.os }}-node-modules-

      - name: 安装依赖
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline --no-audit

      - name: 保存依赖快照
        uses: actions/upload-artifact@v4
        with:
          name: dependencies
          path: |
            node_modules
            package-lock.json
          retention-days: 1

  # ============================================
  # Job 2-4: 并行检查 (共享依赖)
  # ============================================
  lint:
    name: 代码检查
    runs-on: ubuntu-latest
    timeout-minutes: 5
    needs: setup
    steps:
      - uses: actions/checkout@v4

      - name: 恢复依赖
        uses: actions/download-artifact@v4
        with:
          name: dependencies

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: 运行 ESLint
        run: npm run lint

  typecheck:
    name: 类型检查
    runs-on: ubuntu-latest
    timeout-minutes: 5
    needs: setup
    steps:
      - uses: actions/checkout@v4

      - name: 恢复依赖
        uses: actions/download-artifact@v4
        with:
          name: dependencies

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: TypeScript 检查
        run: npm run type-check

  test-unit:
    name: 单元测试 (分片 ${{ matrix.shard }}/4)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: setup
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - name: 恢复依赖
        uses: actions/download-artifact@v4
        with:
          name: dependencies

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: 运行单元测试
        run: npm run test:run -- --shard=${{ matrix.shard }}/4

  # ============================================
  # Job 5: 构建 (优化缓存)
  # ============================================
  build:
    name: 构建
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [lint, typecheck, test-unit]
    steps:
      - uses: actions/checkout@v4

      - name: 恢复依赖
        uses: actions/download-artifact@v4
        with:
          name: dependencies

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      # ✅ 构建缓存
      - name: 缓存构建产物
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
            .next/standalone
          key: build-${{ runner.os }}-${{ hashFiles('src/**/*.{ts,tsx}') }}-${{ github.sha }}
          restore-keys: |
            build-${{ runner.os }}-${{ hashFiles('src/**/*.{ts,tsx}') }}-
            build-${{ runner.os }}-

      - name: 构建应用
        run: npm run build
        env:
          NEXT_TELEMETRY_DISABLED: 1
          NODE_ENV: production

      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            .next/standalone
            .next/static
            public
          retention-days: 1

  # ... 其他 jobs 保持不变 ...
```

---

## 🔍 监控指标

建议添加以下监控:

```yaml
- name: 缓存统计
  run: |
    echo "📊 缓存统计" >> $GITHUB_STEP_SUMMARY
    echo "- node_modules 缓存: ${{ needs.setup.outputs.cache-hit }}" >> $GITHUB_STEP_SUMMARY
    echo "- 构建大小: $(du -sh .next/ | cut -f1)" >> $GITHUB_STEP_SUMMARY
    echo "- 依赖数量: $(npm ls --depth=0 2>/dev/null | wc -l)" >> $GITHUB_STEP_SUMMARY
```

---

## 📚 参考资料

### 官方文档

- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [npm ci 最佳实践](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [Docker BuildKit 缓存](https://docs.docker.com/build/building/cache/)

### 最佳实践

- 依赖缓存 key 应包含: OS + Node 版本 + package-lock hash
- 使用 `--prefer-offline` 加速 npm install
- 使用 artifact 共享大型依赖 (node_modules)
- Docker 构建使用多阶段 + BuildKit 缓存

---

## ✅ 总结

### 关键优化点

1. **依赖安装优化** - 使用 artifact 共享,节省 2-3 分钟
2. **缓存策略增强** - 多层 key + 更高命中率
3. **Docker 层缓存** - BuildKit 内联缓存,节省 2-3 分钟
4. **E2E 测试并行化** - 多浏览器 + 分片

### 预期效果

- **总构建时间**: 从 17-25 分钟降至 11-18 分钟
- **节省时间**: 6-7 分钟 (约 30-40%)
- **缓存命中率**: 从 60% 提升至 85%

### 风险评估

| 优化项          | 风险等级 | 说明                             |
| --------------- | -------- | -------------------------------- |
| setup-node 缓存 | 🟢 低    | 官方支持,成熟稳定                |
| artifact 共享   | 🟡 中    | 需要测试 artifact 大小和恢复时间 |
| Docker BuildKit | 🟢 低    | 已广泛使用                       |
| E2E 并行化      | 🟡 中    | 需确保测试隔离性                 |

---

**报告完成时间**: 2026-03-28 17:15 CET  
**下一步**: 向主管提交报告,等待审批实施
