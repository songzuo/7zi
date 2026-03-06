# 7zi-frontend 部署文档

> 最后更新: 2026-03-07
> 维护者: 系统管理员

## 📋 目录

- [概述](#概述)
- [架构](#架构)
- [CI/CD 流程](#cicd-流程)
- [部署方式](#部署方式)
- [环境配置](#环境配置)
- [缓存策略](#缓存策略)
- [常用命令](#常用命令)
- [故障排查](#故障排查)
- [回滚操作](#回滚操作)

## 概述

7zi-frontend 项目使用 GitHub Actions 实现自动化 CI/CD 流程，支持：

- ✅ 自动化代码检查（Lint + TypeScript）
- ✅ 单元测试（Vitest，4 并行分片）
- ✅ E2E 测试（Playwright）
- ✅ 依赖安全审计
- ✅ 增量构建缓存
- ✅ Docker 镜像构建与缓存
- ✅ 零停机部署
- ✅ 自动回滚机制

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │  Setup   │ │   Lint   │ │TypeCheck │ │   Unit Tests     │    │
│  │  + Audit │ │  ~30s    │ │  ~20s    │ │  (4 shards) ~60s │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘    │
│       │            │            │                 │              │
│       └────────────┴────────────┴─────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                          │
│                    │   E2E Tests      │  (PR + main)             │
│                    │   Playwright     │                          │
│                    └────────┬─────────┘                          │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                             │
│                      │   Build     │ ← Next.js Cache             │
│                      │   ~90s      │                             │
│                      └──────┬──────┘                             │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                             │
│                      │ Pre-deploy  │                             │
│                      │   Checks    │                             │
│                      └──────┬──────┘                             │
│                             │                                    │
│              ┌──────────────┴──────────────┐                     │
│              ▼                             ▼                     │
│       ┌─────────────┐               ┌─────────────┐              │
│       │   Docker    │               │   Deploy    │              │
│       │   Build     │               │   Staging   │ (自动)       │
│       │   ~120s     │               └─────────────┘              │
│       └─────────────┘                      │                     │
│                                            ▼                     │
│                                     ┌─────────────┐              │
│                                     │ Production  │ (手动)       │
│                                     │   Deploy    │              │
│                                     └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘

服务器架构:

┌─────────────────────────────────────────────────────────────────┐
│                    7zi.com 服务器 (165.99.43.61)                 │
│                                                                 │
│  ┌─────────────┐     ┌─────────────────────────────────────┐   │
│  │   Nginx     │────▶│   7zi-frontend (Next.js)            │   │
│  │   :80/443   │     │   Docker Container :3000            │   │
│  └─────────────┘     └─────────────────────────────────────┘   │
│        │                                                        │
│        ├── SSL 证书 (Let's Encrypt)                             │
│        ├── 静态资源缓存                                         │
│        └── Gzip/Brotli 压缩                                     │
│                                                                 │
│  备份目录: /opt/backups/7zi-frontend-*                          │
└─────────────────────────────────────────────────────────────────┘
```

## CI/CD 流程

### 触发条件

| 事件 | 触发条件 | 运行内容 |
|------|----------|----------|
| Push | `main`, `develop` | 完整 CI + 自动 Staging 部署 |
| PR | `main`, `develop` | CI 检查 + E2E 测试（不部署） |
| Manual | workflow_dispatch | 可选择 Staging 或 Production |

### 流水线阶段

```
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 1: 并行检查 (约 1 分钟)                                      │
├─────────────────────────────────────────────────────────────────┤
│ • Setup & Security Audit - 依赖安装 + 安全审计                   │
│ • Lint & Format - ESLint + Prettier                             │
│ • Type Check - TypeScript 类型检查                               │
│ • Unit Tests - Vitest (4 分片并行)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 2: E2E 测试 (约 2-3 分钟)                                    │
├─────────────────────────────────────────────────────────────────┤
│ • Playwright E2E - Chromium 浏览器测试                           │
│ • 生成 HTML 报告 + 截图                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 3: 构建 (约 1-2 分钟)                                        │
├─────────────────────────────────────────────────────────────────┤
│ • Next.js Build (使用缓存)                                       │
│ • 生成 Standalone 输出                                           │
│ • 上传构建产物                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 4: 预部署检查 (约 30 秒)                                     │
├─────────────────────────────────────────────────────────────────┤
│ • 验证构建完整性                                                  │
│ • 安全扫描                                                       │
│ • 生成部署清单                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 5: 部署                                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Staging: 自动部署（main 分支 push）                            │
│ • Production: 手动触发，蓝绿部署                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 时间估算

| 场景 | 无缓存 | 有缓存 |
|------|--------|--------|
| PR 检查 | ~5 分钟 | ~3 分钟 |
| Staging 部署 | ~8 分钟 | ~5 分钟 |
| Production 部署 | ~10 分钟 | ~6 分钟 |

## 部署方式

### 方式一：自动部署（推荐）

```bash
# 推送到 main 分支自动触发
git push origin main

# 自动执行:
# 1. CI 检查
# 2. E2E 测试
# 3. 构建
# 4. 部署到 Staging
```

### 方式二：手动触发 Production 部署

1. 进入 GitHub Actions 页面
2. 选择 "CI/CD Pipeline" workflow
3. 点击 "Run workflow"
4. 选择:
   - Environment: `production`
   - Strategy: `blue-green` 或 `rolling`
5. 点击 "Run workflow"

### 方式三：远程部署脚本

```bash
# 完整部署（首次）
./deploy-remote.sh deploy

# 快速部署（仅同步代码）
./deploy-remote.sh quick

# 查看日志
./deploy-remote.sh logs

# 查看状态
./deploy-remote.sh status

# 重启服务
./deploy-remote.sh restart

# 回滚
./deploy-remote.sh rollback
```

### 方式四：服务器本地部署

```bash
# SSH 登录服务器
ssh root@7zi.com

# 进入项目目录
cd /opt/7zi-frontend

# 执行部署
./deploy.sh deploy
```

## 环境配置

### GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 描述 | 示例值 |
|--------|------|--------|
| `STAGING_HOST` | Staging 服务器地址 | `staging.7zi.com` |
| `PRODUCTION_HOST` | Production 服务器地址 | `165.99.43.61` |
| `DEPLOY_USER` | SSH 用户名 | `root` |
| `DEPLOY_PASS` | SSH 密码 | `********` |
| `DEPLOY_KEY` | SSH 私钥（可选） | `-----BEGIN RSA...` |

### 服务器环境变量

在服务器 `/opt/7zi-frontend/.env.production`：

```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计（可选）
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-umami-id
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# 邮件服务（可选）
RESEND_API_KEY=re_xxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio

# Sentry（可选）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxxxxxxx
```

## 缓存策略

### 1. npm 依赖缓存

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'  # 自动缓存 node_modules
```

### 2. Next.js 构建缓存

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

**缓存命中率**: 约 80%（仅源码变更时重建）

### 3. Docker 层缓存

```yaml
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: docker-${{ runner.os }}-${{ hashFiles('Dockerfile.optimized', '**/package-lock.json') }}-${{ github.sha }}
```

### 缓存效果

| 场景 | 无缓存 | 有缓存 | 提升 |
|------|--------|--------|------|
| npm install | ~60s | ~15s | 75% |
| Next.js build | ~120s | ~40s | 67% |
| Docker build | ~180s | ~60s | 67% |

## 常用命令

### 本地开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查
npm run type-check   # TypeScript 类型检查
npm run test         # 单元测试
npm run test:e2e     # E2E 测试
```

### Docker 操作

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看状态
docker-compose -f docker-compose.prod.yml ps

# 进入容器
docker exec -it 7zi-frontend sh
```

### 远程部署

```bash
./deploy-remote.sh deploy    # 完整部署
./deploy-remote.sh quick     # 快速部署
./deploy-remote.sh logs      # 查看日志
./deploy-remote.sh status    # 查看状态
./deploy-remote.sh restart   # 重启服务
./deploy-remote.sh rollback  # 回滚
```

## 故障排查

### CI/CD 失败

```bash
# 查看具体 job 日志
# GitHub Actions → 点击失败的 workflow → 展开失败的 job

# 常见问题:
# 1. Lint 失败 - 运行 npm run lint:fix 修复
# 2. 类型错误 - 运行 npm run type-check 检查
# 3. 测试失败 - 查看 test-results/ 目录
# 4. 构建失败 - 检查环境变量配置
```

### 服务无法启动

```bash
# SSH 登录服务器
ssh root@7zi.com

# 查看容器状态
docker-compose -f /opt/7zi-frontend/docker-compose.prod.yml ps

# 查看日志
docker-compose -f /opt/7zi-frontend/docker-compose.prod.yml logs --tail=100

# 检查端口
netstat -tlnp | grep 3000

# 重启服务
docker-compose -f /opt/7zi-frontend/docker-compose.prod.yml restart
```

### 健康检查失败

```bash
# 手动测试
curl http://localhost:3000/

# 检查容器内部
docker exec -it 7zi-frontend sh
cat /app/.next/standalone/server.js

# 检查环境变量
docker exec -it 7zi-frontend env | grep NODE
```

### E2E 测试失败

```bash
# 本地运行
npm run test:e2e

# 调试模式
npm run test:e2e:debug

# 查看报告
npm run test:e2e:report

# 更新视觉回归基线
npx playwright test --update-snapshots
```

## 回滚操作

### 自动回滚

Production 部署失败时自动触发回滚：

```
❌ Health check failed! Rolling back...
📦 Restoring from backup: /opt/backups/7zi-frontend-YYYYMMDD-HHMMSS
```

### 手动回滚

```bash
# 方式一：使用部署脚本
./deploy-remote.sh rollback

# 方式二：手动恢复
ssh root@7zi.com

# 查看可用备份
ls -la /opt/backups/

# 恢复备份
BACKUP_DIR="/opt/backups/7zi-frontend-20260307-000000"
cd /opt/7zi-frontend
docker-compose -f docker-compose.prod.yml down
cp -r "$BACKUP_DIR/.next" ./
docker-compose -f docker-compose.prod.yml up -d

# 验证
curl http://localhost:3000/
```

### 回滚到特定版本

```bash
# 使用 Git 回滚
ssh root@7zi.com
cd /opt/7zi-frontend

# 查看历史版本
git log --oneline -10

# 回滚到特定 commit
git checkout <commit-hash>
./deploy.sh deploy
```

## 文件清单

```
.github/
└── workflows/
    ├── ci.yml              # 主 CI/CD 流水线 ⭐
    └── deploy.yml          # 快速部署 workflow

deploy.sh                   # 本地部署脚本
deploy-remote.sh            # 远程部署脚本 ⭐
deploy-zero-downtime.sh     # 零停机部署脚本
deploy-production.sh        # 生产环境部署脚本

docker-compose.yml          # 开发环境
docker-compose.prod.yml     # 生产环境 ⭐

Dockerfile                  # 标准 Dockerfile
Dockerfile.optimized        # 优化版 Dockerfile ⭐
Dockerfile.production       # 生产环境 Dockerfile

check-env.sh                # 环境检查脚本
ecosystem.config.production.js  # PM2 配置

docs/
└── deployment.md           # 本文档 ⭐
```

## 监控和告警

### 健康检查端点

- 应用: `http://localhost:3000/`
- Nginx: `http://localhost/health`

### 日志位置

- 应用日志: `docker logs 7zi-frontend`
- Nginx 日志: `/opt/7zi-frontend/nginx/logs/`
- 备份目录: `/opt/backups/`

### 告警配置

在 GitHub Actions 中配置失败通知：

```yaml
notify-failure:
  name: Notify Failure
  runs-on: ubuntu-latest
  needs: [build, deploy-staging, deploy-production]
  if: failure()
  steps:
    - name: Send notification
      # 可添加 Slack/Telegram/Email 通知
```

## 安全建议

1. **定期更新 Secrets** - 每季度更换部署密码/密钥
2. **配置 SSL** - 使用 Let's Encrypt 自动续期
3. **防火墙** - 只开放 80, 443, 22 端口
4. **日志审计** - 定期检查访问日志
5. **依赖更新** - 定期运行 `npm audit fix`
6. **备份策略** - 自动保留最近 5 个版本

## 更新日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-07 | v3.0 | 统一 CI/CD 配置，添加 E2E 测试，优化缓存策略 |
| 2024-03-06 | v2.0 | 添加零停机部署，Docker 层缓存 |
| 2024-03-01 | v1.0 | 初始 CI/CD 配置 |

---

**需要帮助？** 联系系统管理员或查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
