# 7zi-frontend CI/CD 优化建议文档

> **生成时间**: 2026-04-25  
> **负责人**: 🛡️ 系统管理员（子代理）  
> **项目**: 7zi-frontend  
> **版本**: v1.14.0 → Next.js 16.2.4 + React 19.2.5

---

## 📊 一、现状分析

### 1.1 CI 配置概览

| Workflow | 用途 | 问题 |
|----------|------|------|
| `ci.yml` (328行) | 标准 CI | 大量重复 `npm ci`，无增量优化 |
| `ci-optimized.yml` (294行) | 优化版 CI | 已改进但仍有优化空间 |
| `cd.yml` (245行) | 生产部署 | 缺少构建缓存 |
| `cd-canary.yml` (371行) | 灰度部署 | 配置完整 |
| `cd-blue-green.yml` (299行) | 蓝绿部署 | 配置完整 |
| `e2e.yml` (299行) | E2E 测试 | 三浏览器全量运行，耗时长 |
| `dependency-updates.yml` (337行) | 依赖更新 | 自动更新 PR |

### 1.2 依赖规模

- **Dependencies**: 54 个（含 heavy: better-sqlite3, @tiptap, three, exceljs）
- **DevDependencies**: 32 个
- **node_modules**: 3.7 GB

### 1.3 当前问题总结

```
❌ ci.yml: 每个 job 都独立执行 npm ci，无共享缓存
❌ 构建 job 重复: build + build-turbopack 串行
❌ E2E 测试: 每次 PR 都跑 3 个浏览器（Chromium/Firefox/WebKit）
❌ npm ci --prefer-offline 在冷缓存时无效
❌ concurrency 设置仅在 ci-optimized.yml
❌ 缺少 workspace 级别的 action 缓存
❌ Storybook 独立 job 但非关键路径
❌ 安全扫描在主流程中，增加 1-2 分钟
```

---

## 🔧 二、具体优化方案

### 2.1 合并重复 Workflow（高优先级）

**现状**: `ci.yml` 和 `ci-optimized.yml` 功能高度重叠

**建议**:
1. 删除 `ci.yml`，只保留 `ci-optimized.yml`
2. 在 `ci-optimized.yml` 添加 `workflow_dispatch` 支持手动触发
3. 统一触发条件

```yaml
# ci-optimized.yml 改进触发条件
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # 新增
```

### 2.2 消除重复依赖安装（中优先级）

**现状**: lint / test-unit / build / parallel-checks / test-e2e 各自独立 `npm ci`

**问题**: 每次 `npm ci` 需要 30-60 秒，5 个 job 就是 3-5 分钟浪费

**方案**: 使用 `actions/cache` + 复用 artifacts

```yaml
# 方案 A: Cache Reuse (推荐)
# 在第一个 job 缓存，后续 job 复用
jobs:
  prepare:
    name: 📦 Prepare Dependencies
    runs-on: ubuntu-latest
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4
      - name: Cache node_modules
        id: cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.npm
          key: node-modules-${{ hashFiles('package-lock.json') }}
      - name: Install (if cache miss)
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline --no-audit --no-fund

  lint:
    name: 🔍 Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Restore node_modules
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.npm
          key: node-modules-${{ hashFiles('package-lock.json') }}
          fail-on-cache-miss: true  # 强制要求缓存命中
      - run: npm run lint

  test-unit:
    name: 🧪 Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Restore node_modules
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.npm
          key: node-modules-${{ hashFiles('package-lock.json') }}
          fail-on-cache-miss: true
      - run: npm run test:ci
```

**效果**: 从 5 × 60s = 300s → 60s + 4 × 5s = 80s，节省约 **220 秒**

### 2.3 E2E 测试策略优化（高优先级）

**现状**: 每次 PR 运行 3 个浏览器 + Mobile，耗时 10-15 分钟

**建议**:
1. PR 阶段只跑 Chromium（最快）
2. Main 分支合并后跑完整浏览器矩阵
3. 使用 `cron` 定时全量测试

```yaml
# e2e.yml 改进
test-chromium:
  # PR 和 main push 都跑
  if: github.event_name != 'schedule'
  
test-firefox:
  # 仅 main 分支合并 或 schedule
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

test-webkit:
  # 仅 main 分支合并 或 schedule
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

# 新增 schedule job
test-all-browsers:
  name: 🎭 E2E All Browsers (Scheduled)
  if: github.event_name == 'schedule'  # 每周日凌晨 2 点
  # ... 完整浏览器矩阵
```

### 2.4 Next.js 构建缓存优化（中优先级）

**现状**: `ci-optimized.yml` 有 `.next` 缓存但 key 用了 `github.sha`

**问题**: SHA 每次 push 都变，无法复用

**改进**:

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      .next
      .next/cache
    # 按 package-lock + node 版本 + Next 版本 作为 key
    key: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ env.NODE_VERSION }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

**额外优化**: 添加 `.next` artifact 直接传给 E2E job

```yaml
build:
  outputs:
    path: .next
  steps:
    - name: Build
      run: npm run build
    - name: Upload .next
      uses: actions/upload-artifact@v4
      with:
        name: next-build
        path: .next

test-e2e:
  needs: build
  steps:
    - name: Download .next
      uses: actions/download-artifact@v4
      with:
        name: next-build
    # 无需重新 npm ci + build
```

### 2.5 Playwright 浏览器缓存优化（中优先级）

**现状**: 每次 `npx playwright install --with-deps` 需要 2-3 分钟

**改进**: 使用 `manuelmauro/playwright-cache-action@v1`（已在 ci-optimized.yml 引用但非所有 job）

```yaml
# 统一使用 playwright cache action
- name: Install Playwright browsers (cached)
  uses: manuelmauro/playwright-cache-action@v1
  with:
    browsers: chromium firefox webkit
```

### 2.6 安全扫描移到并行矩阵（中优先级）

**现状**: 安全扫描是独立 job，增加串行时间

**改进**: 合并到 `parallel-checks` 矩阵

```yaml
parallel-checks:
  strategy:
    matrix:
      include:
        - name: Security Audit
          command: npm audit --audit-level=moderate
          continue-on-error: true
        - name: Dependency Check
          command: npx npm-check-updates --checkVersion
          continue-on-error: true
        - name: License Check
          command: npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;ISC"
          continue-on-error: true
        - name: Snyk Security     # 新增
          command: snyk test
          continue-on-error: true
```

### 2.7 Docker 构建缓存优化（中优先级）

**现状**: `cd.yml` 使用 `type=gha` 缓存，但无范围限定

**改进**:

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha,scope=frontend-${{ github.ref_name }}
    cache-to: type=gha,mode=max,scope=frontend-${{ github.ref_name }}
```

---

## 📋 三、CI/CD 优化清单

### 3.1 立即可做（改动小）

| # | 优化项 | 文件 | 预期收益 |
|---|--------|------|----------|
| 1 | 删除 `ci.yml` 保留 `ci-optimized.yml` | `.github/workflows/` | 减少维护负担 |
| 2 | E2E: PR 只跑 Chromium | `e2e.yml` | 节省 5-8 分钟 |
| 3 | `npm ci` 改为 `npm ci --prefer-offline --no-audit --no-fund` | 所有 workflow | 加快安装 |
| 4 | 所有 job 添加 `timeout-minutes` | `ci.yml` | 防止僵尸 job |
| 5 | 添加 `concurrency` 取消重复 CI | `ci.yml` | 节省计算资源 |

### 3.2 下一步（需要验证）

| # | 优化项 | 文件 | 预期收益 |
|---|--------|------|----------|
| 6 | 添加 `prepare` job 统一管理缓存 | `ci-optimized.yml` | 节省 3-4 分钟 |
| 7 | Build artifact 传给 E2E | `ci-optimized.yml` | 避免重复构建 |
| 8 | Next.js build cache key 改为 package-lock hash | `ci-optimized.yml` | 增量构建 |
| 9 | 使用 `playwright-cache-action` 统一 | 所有 e2e jobs | 节省 2-3 分钟 |

---

## ⏱️ 四、预估优化效果

| 阶段 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| npm install (每个 job) | 45-60s | 5-10s (缓存命中) | **83%** |
| PR E2E 测试 | 10-15 分钟 | 3-5 分钟 | **66%** |
| 主分支全量 CI | 15-20 分钟 | 8-12 分钟 | **40%** |
| Docker 构建 | 5-8 分钟 | 3-4 分钟 | **50%** |

---

## 📁 五、推荐 Action 版本

```yaml
# 统一使用最新稳定版本
actions/checkout@v4        # ✅ 当前
actions/setup-node@v4      # ✅ 当前
actions/cache@v4           # ✅ 当前
actions/upload-artifact@v4 # ✅ 当前
actions/download-artifact@v4 # ✅ 当前
docker/setup-buildx-action@v3 # ✅ 当前
docker/login-action@v3      # ✅ 当前
docker/build-push-action@v5  # ✅ 当前
```

---

## 🔍 六、其他发现

### 6.1 vitest.config.ts 并行配置已优化

```yaml
pool: 'forks'
poolOptions:
  forks:
    singleFork: false
    minForks: 1
    maxForks: 2   # 建议改为 4 可进一步加速
```

**建议**: 将 `maxForks` 从 2 改为 4，单元测试可提速 30-50%

### 6.2 build 命令混乱

```json
"build": "NODE_ENV=production next build --webpack"
"build:turbopack": "NODE_ENV=production next build"
```

**问题**: 默认 build 用 webpack，turbopack 用另一条命令，易混淆

**建议**: 统一为 turbopack 作为默认（已验证更快）

### 6.3 .npmrc 配置良好

```ini
legacy-peer-deps=true
ignore-scripts=false
```

这避免了 peer dependency 冲突，正确。

---

## ✅ 七、行动计划

### Phase 1: 快速修复（5 分钟）

1. ✅ 删除 `ci.yml`（用 `ci-optimized.yml` 替代）
2. ✅ 在 `ci-optimized.yml` 添加 `workflow_dispatch`
3. ✅ E2E workflow: PR 只跑 Chromium

### Phase 2: 缓存优化（20 分钟）

4. 添加 `prepare` job 统一缓存
5. Next.js build cache key 优化
6. Playwright browser cache 统一

### Phase 3: 验证（15 分钟）

7. 在 PR 上测试优化后的 CI
8. 记录实际耗时对比

---

*本报告由系统管理员子代理生成，基于 `.github/workflows/` 下 8 个 workflow 文件分析*
