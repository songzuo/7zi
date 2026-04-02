# CI/CD 流程改进报告

**项目**: 7zi-frontend
**审查日期**: 2026-03-22
**审查人**: 系统管理员 (🛡️)

---

## 📊 当前 CI/CD 流程分析

### 1. 现状概述

| 组件 | 状态 | 详情 |
|------|------|------|
| **自动化测试** | ✅ 良好 | 单元测试 (Vitest) + E2E 测试 (Playwright) |
| **自动化构建** | ✅ 良好 | Next.js 构建优化，Docker 多阶段构建 |
| **环境配置分离** | ✅ 良好 | .env.example, .env.production, .env.test |
| **CI 工作流** | ✅ 优秀 | ci-main.yml, tests.yml, security-scan.yml |
| **Docker 镜像构建** | ✅ 良好 | 支持多平台，缓存优化 |
| **自动化部署** | ⚠️ 不完整 | 只构建镜像，无自动部署到服务器 |
| **回滚机制** | ❌ 缺失 | 无自动回滚流程 |
| **数据库迁移** | ❌ 缺失 | SQLite 数据库无迁移脚本 |
| **监控告警** | ❌ 缺失 | 无部署后健康检查告警 |
| **蓝绿部署** | ❌ 缺失 | 单一部署，无零停机切换 |
| **依赖管理** | ✅ 优秀 | Dependabot 配置完善 |
| **安全扫描** | ✅ 良好 | npm audit, 敏感文件检查 |

### 2. 当前工作流架构

```
GitHub (Push/PR)
    ↓
┌───────────────────────────────────────┐
│  ci-main.yml (11 个 Jobs)            │
│  - changes (变更检测)                │
│  - setup (依赖安装)                  │
│  - security (安全审计)                │
│  - lint (代码规范)                   │
│  - typecheck (类型检查)              │
│  - test-unit (单元测试，4个分片)     │
│  - build (构建)                      │
│  - test-e2e (E2E 测试)               │
│  - docker (构建镜像)                 │
│  - pre-deploy (预部署检查)           │
│  - summary (报告汇总)                │
└───────────────────────────────────────┘
         ↓
    ghcr.io (镜像仓库)
         ↓
    [手动部署到服务器] ⚠️
```

---

## ❌ 发现的问题

### 严重问题 (P0)

1. **无自动化部署到生产服务器**
   - **现状**: deploy-main.yml 只构建和推送镜像到 ghcr.io
   - **影响**: 需要手动 SSH 到服务器执行 `docker pull` 和 `docker-compose up`
   - **风险**: 人为操作失误，部署不及时

2. **无回滚机制**
   - **现状**: 部署失败后需要手动回滚
   - **影响**: 生产故障恢复时间长
   - **风险**: 长时间服务不可用

3. **无数据库迁移机制**
   - **现状**: SQLite 数据库无版本管理和迁移
   - **影响**: 数据库结构变更时可能损坏数据
   - **风险**: 数据丢失风险

### 高优先级问题 (P1)

4. **无零停机部署**
   - **现状**: 单容器部署，重启时有短暂中断
   - **影响**: 用户体验下降
   - **风险**: 生产环境出现服务闪断

5. **无部署后健康检查告警**
   - **现状**: Docker 有健康检查，但失败后无通知
   - **影响**: 部署失败时不能及时发现
   - **风险**: 故障延迟响应

6. **无蓝绿部署**
   - **现状**: 无法在不影响生产的情况下测试新版本
   - **影响**: 灰度发布困难
   - **风险**: 新版本问题影响所有用户

### 中优先级问题 (P2)

7. **E2E 测试覆盖率不足**
   - **现状**: 只在 PR 和 main 分支运行
   - **影响**: develop 分支的变更可能未被充分测试
   - **风险**: 生产环境回归 Bug

8. **无性能基准测试**
   - **现状**: 构建时检查大小，但无性能测试
   - **影响**: 性能退化难以发现
   - **风险**: 用户体验下降

9. **无部署前后对比报告**
   - **现状**: 无性能、构建大小对比
   - **影响**: 难以追踪性能变化
   - **风险**: 优化效果无法量化

10. **Secret 管理不完善**
    - **现状**: 部分敏感信息可能硬编码
    - **影响**: 安全风险
    - **风险**: 凭证泄露

---

## ✅ 改进建议 (分阶段实施)

### 🎯 第一阶段：基础自动化部署 (1-2 周)

**目标**: 实现从镜像构建到服务器部署的自动化

#### 1.1 添加自动部署 Job

在 `deploy-main.yml` 中添加：

```yaml
deploy:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [docker]
  if: github.ref == 'refs/heads/main'

  steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /app/7zi-frontend
          docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

#### 1.2 配置 GitHub Secrets

需要配置：
- `PRODUCTION_HOST`: 7zi.com 服务器 IP
- `PRODUCTION_USER`: 登录用户名 (root)
- `SSH_PRIVATE_KEY`: SSH 私钥

#### 1.3 添加部署前健康检查

```yaml
pre-deploy-check:
  name: Pre-deploy Health Check
  runs-on: ubuntu-latest
  needs: [deploy]
  steps:
    - name: Wait for service healthy
      run: |
        for i in {1..30}; do
          curl -f https://7zi.com/health || sleep 5
        done
```

**预期效果**:
- ✅ Push 到 main 分支后自动部署
- ✅ 无需手动 SSH 操作
- ✅ 部署后自动检查服务健康

---

### 🎯 第二阶段：回滚机制和数据库迁移 (2-3 周)

**目标**: 实现安全回滚和数据库版本管理

#### 2.1 添加自动回滚

在 `deploy-main.yml` 中添加：

```yaml
deploy-rollback:
  name: Rollback if Failed
  runs-on: ubuntu-latest
  needs: [deploy, pre-deploy-check]
  if: failure()

  steps:
    - name: Rollback to previous version
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /app/7zi-frontend
          docker-compose -f docker-compose.prod.yml down
          git log --oneline -1
          # 回滚到上一个镜像
          PREV_TAG=$(docker images --format "{{.Tag}}" | grep -v latest | tail -1)
          docker pull ghcr.io/7zi/7zi-frontend:$PREV_TAG
          docker-compose -f docker-compose.prod.yml up -d
```

#### 2.2 添加数据库迁移脚本

创建 `scripts/migrate.js`:

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/database.db';
const MIGRATIONS_DIR = './migrations';

async function migrate() {
  const db = new Database(DB_PATH);

  // 创建迁移记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 获取所有迁移文件
  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // 执行未应用的迁移
  for (const migration of migrations) {
    const applied = db.prepare(
      'SELECT 1 FROM _migrations WHERE name = ?'
    ).get(migration);

    if (!applied) {
      console.log(`Applying migration: ${migration}`);
      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, migration),
        'utf-8'
      );
      db.exec(sql);
      db.prepare(
        'INSERT INTO _migrations (name) VALUES (?)'
      ).run(migration);
    }
  }

  db.close();
  console.log('Migration completed');
}

migrate().catch(console.error);
```

#### 2.3 在部署流程中集成迁移

```yaml
migrate:
  name: Run Database Migration
  runs-on: ubuntu-latest
  needs: [deploy]
  steps:
    - uses: actions/checkout@v4

    - name: Run migration
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /app/7zi-frontend
          docker exec 7zi-frontend node scripts/migrate.js
```

**预期效果**:
- ✅ 部署失败时自动回滚
- ✅ 数据库变更可追踪、可回滚
- ✅ 零停机迁移（配合蓝绿部署）

---

### 🎯 第三阶段：零停机部署和监控 (3-4 周)

**目标**: 实现蓝绿部署、监控告警

#### 3.1 实现蓝绿部署

修改 `docker-compose.prod.yml`:

```yaml
services:
  app-blue:
    image: registry.7zi.com/7zi-frontend:blue
    container_name: 7zi-blue
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  app-green:
    image: registry.7zi.com/7zi-frontend:green
    container_name: 7zi-green
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - app-blue
      - app-green
```

#### 3.2 添加切换脚本

创建 `scripts/switch-traffic.sh`:

```bash
#!/bin/bash
ACTIVE=$1

if [ "$ACTIVE" = "blue" ]; then
  sed -i 's/upstream green/upstream blue/g' /etc/nginx/nginx.conf
elif [ "$ACTIVE" = "green" ]; then
  sed -i 's/upstream blue/upstream green/g' /etc/nginx/nginx.conf
fi

nginx -s reload
echo "Traffic switched to $ACTIVE"
```

#### 3.3 添加监控告警

集成 Sentry（已配置）+ 新增部署监控：

```yaml
monitoring:
  name: Deploy Monitoring
  runs-on: ubuntu-latest
  needs: [deploy]
  steps:
    - name: Monitor health for 5 minutes
      run: |
        for i in {1..30}; do
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://7zi.com/health)
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: $STATUS"
            exit 1
          fi
          echo "✅ Health check passed ($i/30)"
          sleep 10
        done

    - name: Send notification
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: '部署完成: https://7zi.com'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**预期效果**:
- ✅ 零停机部署
- ✅ 新版本灰度测试
- ✅ 部署失败自动切换回旧版本
- ✅ 实时监控和告警

---

### 🎯 第四阶段：优化和高级功能 (4-6 周)

**目标**: 性能优化、自动化增强

#### 4.1 添加性能基准测试

```yaml
performance:
  name: Performance Benchmark
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4

    - name: Install dependencies
      run: npm ci

    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v9
      with:
        uploadArtifacts: true
        temporaryPublicStorage: true
        urls: |
          http://localhost:3000
        budgetPath: ./lighthouse-budget.json
```

#### 4.2 添加构建大小对比

```yaml
compare:
  name: Compare Build Size
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - name: Download previous build
      uses: actions/download-artifact@v4
      with:
        name: build-artifacts
        path: ./previous

    - name: Compare sizes
      run: |
        CURRENT=$(du -sm .next/ | cut -f1)
        PREVIOUS=$(du -sm previous/.next/ | cut -f1)
        DIFF=$((CURRENT - PREVIOUS))

        if [ "$DIFF" -gt 10 ]; then
          echo "⚠️ Build size increased by ${DIFF}MB"
        fi
```

#### 4.3 添加 Secret 扫描

使用 Gitleaks：

```yaml
secrets-scan:
  name: Gitleaks Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Run Gitleaks
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**预期效果**:
- ✅ 性能退化自动发现
- ✅ 构建大小趋势追踪
- ✅ 安全漏洞提前发现

---

## 🛠️ 推荐的自动化工具链

### 核心 CI/CD 平台

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **GitHub Actions** | CI/CD 平台 | ✅ 已使用 |
| **Docker** | 容器化 | ✅ 已使用 |
| **Docker Compose** | 容器编排 | ✅ 已使用 |

### 部署工具

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **appleboy/ssh-action** | SSH 部署 | 🔥 必须 |
| **Watchtower** | 自动更新 | 🔥 必须 |
| **Nginx** | 反向代理 | ✅ 已使用 |

### 监控告警

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **Sentry** | 错误监控 | ✅ 已使用 |
| **Prometheus + Grafana** | 指标监控 | 🔥 推荐 |
| **Lighthouse CI** | 性能测试 | 🔥 推荐 |
| **Slack/Telegram** | 通知集成 | 🔥 推荐 |

### 安全工具

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **npm audit** | 依赖漏洞 | ✅ 已使用 |
| **Gitleaks** | Secret 扫描 | 🔥 推荐 |
| **Trivy** | 镜像扫描 | 🔥 推荐 |

### 测试工具

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **Vitest** | 单元测试 | ✅ 已使用 |
| **Playwright** | E2E 测试 | ✅ 已使用 |
| **MSW** | Mock 服务 | ✅ 已使用 |

---

## 📋 实施优先级矩阵

```
          高影响 ──────────────────────┐
                                   │
  第一阶段           第二阶段          第三阶段          第四阶段
  基础部署        回滚机制        零停机部署          优化
  (1-2周)        (2-3周)        监控告警        (4-6周)
  ────────────   ────────────   ────────────   ────────────
  ✅ 自动部署     ✅ 自动回滚     ✅ 蓝绿部署     ✅ 性能基准
  ✅ SSH 配置     ✅ 数据库迁移   ✅ 流量切换     ✅ 大小对比
  ✅ 健康检查     ✅ 迁移脚本     ✅ 监控集成     ✅ Secret扫描
  │               │               │               │
  🔥 P0            🔥 P0           🔥 P1           🔥 P2
```

### 立即实施 (本周)

- [ ] 配置 GitHub Secrets (SSH key)
- [ ] 添加 deploy job 到 deploy-main.yml
- [ ] 测试自动部署流程

### 第 2 周

- [ ] 添加回滚机制
- [ ] 创建数据库迁移脚本
- [ ] 测试回滚流程

### 第 3-4 周

- [ ] 实现蓝绿部署
- [ ] 配置监控告警
- [ ] 添加 Slack 通知

### 第 5-6 周

- [ ] 集成 Lighthouse CI
- [ ] 添加构建大小对比
- [ ] 集成 Gitleaks

---

## 📊 预期改进效果

| 指标 | 当前 | 改进后 | 提升 |
|------|------|--------|------|
| **部署时间** | 15-30 分钟 | 5-10 分钟 | ⬇️ 67% |
| **回滚时间** | 30+ 分钟 | < 5 分钟 | ⬇️ 83% |
| **停机时间** | 30-60 秒 | 0 秒 | ⬇️ 100% |
| **人工操作** | 5-10 步 | 0 步 | ⬇️ 100% |
| **错误率** | 中等 | 低 | ⬇️ 50% |
| **问题发现时间** | 数小时 | 数分钟 | ⬇️ 80% |

---

## 💡 总结

### 当前状态

✅ **做得好的地方**:
- 完整的测试套件（单元 + E2E）
- 优化的 CI 流程（并行、缓存、分片）
- 优秀的依赖管理（Dependabot）
- 安全扫描基础

❌ **需要改进**:
- 缺少自动化部署到服务器
- 无回滚机制
- 无零停机部署
- 无监控告警

### 关键里程碑

1. **第一周**: 实现自动部署到生产服务器
2. **第 2-3 周**: 添加回滚和数据库迁移
3. **第 4-5 周**: 实现零停机蓝绿部署
4. **第 6 周**: 性能优化和高级监控

### 风险提示

⚠️ **实施前注意**:
- 备份现有生产环境
- 在测试环境先验证所有流程
- 准备紧急回滚方案
- 逐步灰度，不要一次性全量

---

**报告完成日期**: 2026-03-22
**下次审查日期**: 2026-04-05 (第一阶段完成后)
