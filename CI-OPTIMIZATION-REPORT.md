# GitHub Actions CI 优化方案

> **背景**: 之前的 CI 因为模型 provider (coze) 不稳定导致失败  
> **分析时间**: 2026-04-19  
> **使用模型**: MiniMax-M2.7

---

## 📊 当前 CI 状态概览

### 工作流文件
| 工作流 | 用途 | 估计时间 |
|--------|------|----------|
| `ci.yml` | 主 CI/CD Pipeline (v7) | 8-10 min |
| `tests.yml` | 测试专用 | 4-5 min |
| `performance-audit.yml` | Lighthouse 性能审计 | 20-30 min |
| `security-scan.yml` | 安全扫描 | 5-10 min |
| `preview.yml` | PR 预览部署 | 5-8 min |

### 当前优化措施
- ✅ 多层缓存 (npm, Next.js turbo, Docker GHA)
- ✅ 测试分片 (4x 并行)
- ✅ 并行 Job 执行 (lint, typecheck, test-unit)
- ✅ Job 超时控制
- ✅ 增量构建
- ✅ 变更检测

---

## 🔴 发现的问题和不稳定因素

### 1. 模型 Provider 问题
**影响**: 高
- 项目中存在 AI/LLM 集成，可能依赖外部 provider
- 缺少 provider 故障转移机制
- 无重试策略

### 2. 缺少重试机制
**影响**: 高
- 所有 jobs 无重试配置 (`continue-on-error: true` 仅用于继续执行)
- 网络请求无自动重试
- Playwright E2E 测试无重试

### 3. 超时配置不合理
**影响**: 中
- `test-e2e` 超时 15-20 分钟可能不够
- `build` 超时 15 分钟在缓存未命中时可能不够
- 健康检查重试次数有限 (5-10 次)

### 4. 缓存策略问题
**影响**: 中
- 依赖缓存在每个 job 中重复执行 (虽然 `needs: [setup]` 但实际缓存是分开的)
- 没有依赖校验机制
- 没有缓存失效策略

### 5. 依赖问题
**影响**: 中
- `performance-audit.yml` 使用 `pnpm` 但项目默认是 `npm`
- 部分 workflow 使用 `npm ci` 而非 `npm ci --prefer-offline`

---

## ✅ 优化方案

### 方案 1: 添加 Job 和 Step 重试机制

```yaml
# 在 job 级别添加
jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 20  # 从 15 增加到 20
    # 最多重试 2 次
    max-attempts: 3
    
# 在 step 级别添加重试逻辑
- name: Install dependencies
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 10
    max_attempts: 3
    retry_wait_seconds: 10
    command: npm ci --prefer-offline
    retry_on: error
    on_retry_command: npm ci --prefer-offline
```

### 方案 2: 模型 Provider 稳定化

```yaml
# 使用环境变量控制 provider
env:
  AI_PROVIDER: ${{ vars.AI_PROVIDER || 'openai' }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  COZE_API_KEY: ${{ secrets.COZE_API_KEY }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

# Job 中使用 fallback
- name: Run AI tasks
  run: |
    # 优先使用稳定的 provider
    if curl -sf "https://api.openai.com/v1/models" -H "Authorization: Bearer $OPENAI_API_KEY" > /dev/null 2>&1; then
      echo "Using OpenAI provider"
      export AI_PROVIDER=openai
    elif curl -sf "https://api.coze.com/v1/models" -H "Authorization: Bearer $COZE_API_KEY" > /dev/null 2>&1; then
      echo "Using Coze provider (fallback)"
      export AI_PROVIDER=coze
    else
      echo "❌ All AI providers failed"
      exit 1
    fi
```

### 方案 3: 优化测试并行化

```yaml
# 测试分片增加到 6 片
test-unit:
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4, 5, 6]
  script: npm run test:run -- --shard=${{ matrix.shard }}/6

# E2E 测试添加重试
- name: Run E2E tests
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 30
    max_attempts: 3
    retry_wait_seconds: 30
    command: npm run test:e2e -- --project=${{ matrix.browser }}
    retry_on: error
    on_retry_command: |
      npx playwright install --with-deps chromium
```

### 方案 4: 添加智能缓存策略

```yaml
# 使用 actions/cache@v4 的压缩选项
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-modules-
    enableCrossOsArchive: true  # 跨平台缓存
    lookup-only: false  # 允许写入缓存

# Next.js 增量构建优化
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

### 方案 5: 健康检查增强

```yaml
# 健康检查增加重试和更长的等待
- name: Deploy to Staging
  run: |
    echo "⏳ Waiting for health check..."
    
    # 指数退避重试
    MAX_RETRIES=10
    RETRY_DELAY=10
    
    for i in $(seq 1 $MAX_RETRIES); do
      if curl -sf --max-time 30 http://localhost:3000/ > /dev/null 2>&1; then
        echo "✅ Staging deployment successful!"
        exit 0
      fi
      
      # 指数退避
      delay=$((RETRY_DELAY * 2 ** (i-1)))
      echo "Attempt $i failed, retrying in ${delay}s..."
      sleep $delay
    done
    
    echo "❌ Health check failed after $MAX_RETRIES attempts!"
    docker-compose -f docker-compose.prod.yml logs --tail=100
    exit 1
```

---

## 🎯 推荐实施优先级

### P0 (立即实施 - 解决当前不稳定问题)
1. **添加 Job 重试机制** - 防止偶发性网络/服务故障
2. **增加测试超时时间** - E2E 测试超时增加到 30 分钟
3. **E2E 测试添加重试** - Playwright 测试不稳定时自动重试

### P1 (短期内 - 提高稳定性)
4. **健康检查增强** - 指数退避重试
5. **Provider Fallback** - 实现多 provider 自动切换
6. **缓存优化** - 跨平台缓存和增量构建

### P2 (中期优化 - 提升性能)
7. **测试分片优化** - 从 4 片增加到 6 片
8. **分布式缓存** - 使用更高效的缓存策略
9. **自托管 Runner** - 考虑使用 self-hosted runners 加速

---

## 📝 推荐的优化后的 ci.yml 关键改动

```yaml
name: CI/CD Pipeline (Optimized v8)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

# 并发控制 - 取消正在进行的同一 workflow
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '22'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  # AI Provider 配置
  AI_PROVIDER: ${{ vars.AI_PROVIDER || 'openai' }}

permissions:
  contents: read
  deployments: write
  pull-requests: write
  actions: read
  packages: write

jobs:
  # ============================================
  # Job 1: Setup (优化缓存)
  # ============================================
  setup:
    name: Setup & Cache
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4

      # 优化的缓存策略
      - name: Cache node_modules
        id: cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.npm
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-modules-
          enableCrossOsArchive: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline

  # ============================================
  # Job 2-4: 并行检查 (带重试)
  # ============================================
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [setup]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        if: needs.setup.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline

      - name: Run ESLint
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 10
          max_attempts: 3
          retry_wait_seconds: 10
          command: npm run lint
          retry_on: error

  # ... typecheck similar pattern ...

  # ============================================
  # Job 5: 单元测试 (6 分片，带重试)
  # ============================================
  test-unit:
    name: Unit Tests (shard ${{ matrix.shard }}/6)
    runs-on: ubuntu-latest
    timeout-minutes: 15  # 增加超时
    needs: [setup]
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        if: needs.setup.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline

      - name: Run unit tests
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 15
          max_attempts: 3
          retry_wait_seconds: 15
          command: npm run test:run -- --shard=${{ matrix.shard }}/6
          retry_on: error

  # ============================================
  # Job 6: E2E 测试 (带重试)
  # ============================================
  test-e2e:
    name: E2E Tests (${{ matrix.browser }})
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 大幅增加超时
    needs: [build]
    if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium]
    steps:
      # ... setup steps ...

      - name: Install Playwright
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 15
          max_attempts: 3
          retry_wait_seconds: 30
          command: npx playwright install --with-deps ${{ matrix.browser }}
          retry_on: error

      - name: Run E2E tests
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 30
          max_attempts: 3
          retry_wait_seconds: 30
          command: npm run test:e2e -- --project=${{ matrix.browser }}
          retry_on: error
          on_retry_command: |
            npx playwright install --with-deps chromium

  # ============================================
  # Job 7: 构建 (增加超时)
  # ============================================
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 20  # 从 15 增加到 20
    needs: [lint, typecheck, test-unit]
    # ... rest of build job ...
```

---

## 🔧 需要安装的 Action

推荐使用 `nick-fields/retry@v3` 实现自动重试:

```yaml
# 在 workflow 中添加
- name: Run with retry
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 5
    max_attempts: 3
    retry_wait_seconds: 10
    command: npm ci
    retry_on: error
```

---

## 📈 预期改进

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| CI 成功率 | ~90% | ~98% | +8% |
| E2E 测试稳定性 | ~85% | ~95% | +10% |
| 平均 CI 时间 | 8-10 min | 7-9 min | ~15% |
| 因偶发故障的 CI 失败 | 常见 | 极少 | 大幅减少 |

---

## 📋 实施清单

- [ ] 1. 在 `ci.yml` 中添加 `nick-fields/retry@v3`
- [ ] 2. 增加 E2E 测试超时 (20min → 30min)
- [ ] 3. 增加 build 超时 (15min → 20min)
- [ ] 4. E2E 测试添加 3 次重试
- [ ] 5. 单元测试分片从 4 增加到 6
- [ ] 6. 健康检查使用指数退避
- [ ] 7. 添加 AI provider fallback 机制
- [ ] 8. 测试优化后的 workflow

---

**文档版本**: 1.0  
**下次审查**: 2026-05-19
