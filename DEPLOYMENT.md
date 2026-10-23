# 部署指南 - Deployment Guide

> 📅 最后更新：2026-10-23
> 📦 当前版本：根级 `package.json` v1.14.2 / `7zi-frontend/package.json` v1.14.1（Next.js 16.4.2）
> 🎯 目标：实现 <10 分钟的零停机部署

## 目录

- [概述](#概述)
- [蓝绿部署架构](#蓝绿部署架构)
- [CI/CD 流水线](#cicd-流水线)
- [部署流程](#部署流程)
- [回滚操作](#回滚操作)
- [故障排查](#故障排查)
- [性能优化](#性能优化)

---

## 概述

### 部署目标

- ⚡ **部署时间**：20-30 分钟 → **<10 分钟**
- 🎯 **零停机**：蓝绿部署策略
- 🔄 **自动回滚**：健康检查失败自动回滚
- 📊 **监控验证**：部署后自动验证

### 技术栈

- **CI/CD**: GitHub Actions
- **容器化**: Docker
- **反向代理**: Nginx
- **部署策略**: Blue-Green Deployment

---

## 蓝绿部署架构

### 架构图

```
                    ┌─────────────────┐
                    │   Nginx (LB)    │
                    │  Port 80/443    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
     ┌─────────────────┐     │     ┌─────────────────┐
     │  Blue (Active)  │     │     │ Green (Standby) │
     │  Port 3000      │◄────┼────►│ Port 3001       │
     │  Current Ver    │     │     │ New Version     │
     └─────────────────┘     │     └─────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Health Check   │
                    │  Verification   │
                    └─────────────────┘
```

### 环境配置

| 环境  | 容器名               | 端口 | 状态          |
| ----- | -------------------- | ---- | ------------- |
| Blue  | `7zi-frontend-blue`  | 3000 | 当前活跃/待机 |
| Green | `7zi-frontend-green` | 3001 | 当前待机/活跃 |

### 工作原理

1. **初始状态**: Blue 活跃，Green 待机
2. **部署新版本**: 部署到 Green 环境
3. **健康检查**: 验证 Green 环境
4. **流量切换**: Nginx 切换到 Green
5. **清理**: Blue 变为备份

---

## CI/CD 流水线

### 流水线概览

```mermaid
graph LR
    A[代码推送] --> B[CI 检查]
    B --> C[构建镜像]
    C --> D[推送镜像]
    D --> E[蓝绿部署]
    E --> F[健康检查]
    F --> G[冒烟测试]
    G --> H[性能检查]
    H --> I[部署完成]
```

### CI 流程 (ci.yml)

**触发条件**:

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 手动 `workflow_dispatch`（可选择跳过测试 / 环境 / 部署策略）

**执行步骤**:

| 步骤              | 描述                | 超时  | 缓存                          |
| ----------------- | ------------------- | ----- | ----------------------------- |
| Lint & Type Check | ESLint + TypeScript | 5min  | ✅ node_modules               |
| Unit Tests        | Vitest + Coverage   | 5min  | ✅ node_modules（4 分片）     |
| Build             | Turbopack 构建      | 10min | ✅ node_modules + .next/cache |
| E2E Tests         | Playwright          | 10min | ✅ node_modules               |
| Security Scan     | npm audit           | 5min  | ✅ node_modules               |

> 实际 job 名为 `changes` / `setup` / `security` / `lint` / `typecheck` / `test-unit`（4 分片）/
> `build` / `test-e2e` / `docker` / `pre-deploy` / `deploy-staging` / `deploy-production` / `summary`。
> 注意 `security` job 的 `npm audit --audit-level=moderate || true` **不会阻断构建**（`|| true`），
> 真正的硬门禁在后端专用的 `backend-ci.yml`（见下）。

### 后端 CI 门禁 (backend-ci.yml)

后端服务 `7zi-backend/` + `workflow-engine/backend/` 有**独立的硬门禁** workflow
`.github/workflows/backend-ci.yml`（workflow 名 `Backend CI`），前端 `ci.yml` 不覆盖后端。

| Job | 门禁内容 | 是否阻断 |
|-----|---------|---------|
| `setup-7zi-backend` | `npm ci` + node_modules 缓存 | — |
| `setup-workflow-engine` | `npm ci` + node_modules 缓存 | — |
| `security-audit` | 4 个子目录 `npm audit --omit=dev --audit-level=moderate` + uuid 版本断言（≥ 11.1.1） | ✅ 阻断 |
| `test-7zi-backend` | `npm run lint` + `npx jest --coverage`（lines ≥ 60%） | ✅ 阻断 |
| `test-workflow-engine` | `npm run lint` + `npx jest --coverage`（lines ≥ 60%） | ✅ 阻断 |

- 触发：`push` / `pull_request` 到 `main` / `develop`（path 过滤 `7zi-backend/**`、
  `workflow-engine/backend/**`）+ `workflow_dispatch`
- Node `'22'`，`permissions: contents: read`，`concurrency` 取消同 ref 过期运行
- 本地等价验证：`npm ci` → `npm run lint` → `npx jest --coverage` → `npm audit --omit=dev`
- ⚠️ 尚未在真实 GitHub Actions 上跑过首次运行，首次推送后建议观察一次

### CD 流程（集成在 `ci.yml` 的 deploy jobs）

> ⚠️ 历史上此处描述的是独立 workflow `cd-blue-green.yml`，**该文件在仓库中已不存在**。
> 现在的部署步骤直接内嵌在 `ci.yml`（workflow 名 `CI/CD Pipeline`）的 `deploy-staging` /
> `deploy-production` 两个 job 中。

**触发条件**:

| Job | 触发条件 |
|-----|---------|
| `deploy-staging` | `push` 到 `main`（`github.event_name == 'push'`） |
| `deploy-production` | `workflow_dispatch` + `inputs.environment == 'production'` + `github.ref == 'refs/heads/main'` |

**执行步骤**:

| 步骤         | 描述                   | 超时  | 关键操作   |
| ------------ | ---------------------- | ----- | ---------- |
| Build & Push | 构建并推送 Docker 镜像 | 15min | 多层缓存   |
| Deploy       | 蓝绿部署               | 10min | 自动切换   |
| Health Check | 健康检查               | 2min  | 30次重试   |
| Smoke Tests  | 冒烟测试               | 5min  | Playwright |
| Performance  | 性能检查               | 5min  | Lighthouse |

> 镜像部署阶段使用 SSH 密钥认证（`secrets.SSH_PRIVATE_KEY`），不再使用密码认证。

---

## 部署流程

### 自动部署

**通过 Git Push 触发**:

```bash
# 1. 推送代码到 main 分支
git push origin main

# 2. GitHub Actions 自动执行
# - CI 检查通过
# - 构建 Docker 镜像
# - 推送到 GHCR
# - 执行蓝绿部署
# - 健康检查和验证

# 3. 查看部署状态
# https://github.com/[owner]/7zi-frontend/actions
```

### 手动部署

**方法 1: GitHub Actions 手动触发**

1. 访问 Actions 页面
2. 选择 **"CI/CD Pipeline"** workflow（当前仓库**没有**独立的 "CD (Blue-Green)" workflow）
3. 点击 "Run workflow"
4. `environment` 选 `staging` 或 `production`，`deploy-strategy` 选 `blue-green` / `rolling`
5. 点击 "Run workflow"

**方法 2: SSH 到服务器执行**

```bash
# SSH 到生产服务器
ssh root@7zi.com

# 进入项目目录
cd /opt/7zi-frontend

# 执行蓝绿部署（deploy.sh 用子命令而非位置参数）
./deploy.sh deploy
```

> 仓库根目录的 `deploy.sh`（v3.0）是当前的主部署脚本，用法为
> `ENVIRONMENT=<dev|staging|production> ./deploy.sh <命令>`，
> 命令包括 `deploy` / `rollback [version]` / `rollback-quick` / `status` / `logs` /
> `health` / `backups` / `history` / `cleanup` / `check`。

### 快速部署

```bash
# 跳过部分验证的快速部署
ENVIRONMENT=production ./deploy.sh deploy
```

### 部署脚本列表

| 脚本                                | 用途                     | 示例                                     |
| ----------------------------------- | ------------------------ | ---------------------------------------- |
| `deploy.sh`（仓库根目录）           | 统一部署 / 回滚 / 状态   | `ENVIRONMENT=production ./deploy.sh deploy` |
| `docker-deploy.sh`（仓库根目录）   | Docker 容器部署         | `./docker-deploy.sh`                     |
| `deploy-scripts/deploy-docker.sh`   | 自建 Docker 部署方案    | `./deploy-scripts/deploy-docker.sh`      |
| `deploy-scripts/deploy-nginx.sh`    | Nginx 配置部署          | `./deploy-scripts/deploy-nginx.sh`       |
| `deploy-scripts/deploy-rsync.sh`    | rsync 同步部署          | `./deploy-scripts/deploy-rsync.sh`       |
| `deploy-scripts/setup-git-hook-server.sh` | Git Hook 自动部署 | `./deploy-scripts/setup-git-hook-server.sh` |

> ⚠️ 旧版本文档提到的 `scripts/deploy/blue-green-deploy.sh`、`verify-deploy.sh`、
> `rollback.sh`、`quick-deploy.sh` **均已不存在**（`scripts/deploy/` 目录不存在），
> 请改用上表中的实际脚本。

---

## 回滚操作

### 自动回滚

当以下情况发生时，系统自动回滚:

- 健康检查失败（30 次重试后）
- 容器启动失败
- Nginx 配置验证失败

### 手动回滚

**方法 1: 使用 `deploy.sh`**

```bash
# SSH 到服务器
ssh root@7zi.com

# 回滚（快速回滚 = 蓝绿槽位切换）
cd /opt/7zi-frontend
./deploy.sh rollback-quick

# 回滚到指定版本
./deploy.sh rollback v20250122-143022
```

**方法 2: 手动操作**

```bash
# 1. 停止当前容器
docker stop 7zi-frontend-blue

# 2. 启动备份容器
docker start 7zi-frontend-green-backup
# 或
docker rename 7zi-frontend-green-backup 7zi-frontend-green
docker start 7zi-frontend-green

# 3. 更新 Nginx 配置
# 修改 /etc/nginx/sites-available/7zi.com
# 将 proxy_pass 改为 http://127.0.0.1:3001 (Green)
# 或 http://127.0.0.1:3000 (Blue)

# 4. 重载 Nginx
nginx -t && systemctl reload nginx
```

---

## 故障排查

### 常见问题

#### 1. 部署失败 - 镜像拉取失败

```bash
# 检查镜像是否存在
docker images | grep 7zi-frontend

# 手动拉取镜像
docker pull ghcr.io/[owner]/7zi-frontend:latest

# 检查 Docker 登录状态
docker login ghcr.io -u [username] -p [token]
```

#### 2. 健康检查失败

```bash
# 检查容器日志
docker logs 7zi-frontend-blue

# 检查容器状态
docker ps -a | grep 7zi-frontend

# 手动健康检查
curl -f http://localhost:3000/api/health

# 检查端口占用
netstat -tlnp | grep 3000
```

#### 3. Nginx 切换失败

```bash
# 检查 Nginx 配置
nginx -t

# 检查 Nginx 状态
systemctl status nginx

# 查看 Nginx 日志
tail -f /var/log/nginx/error.log

# 手动重载
systemctl reload nginx
```

#### 4. 容器无法启动

```bash
# 查看容器日志
docker logs 7zi-frontend-blue

# 检查环境变量
docker exec 7zi-frontend-blue env

# 检查磁盘空间
df -h

# 检查内存
free -m
```

### 日志查看

```bash
# 应用日志
docker logs -f 7zi-frontend-blue

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u nginx -f

# Docker 日志
journalctl -u docker -f
```

---

## 性能优化

### 缓存策略

#### 1. Node Modules 缓存

```yaml
# GitHub Actions
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}
```

**效果**: 安装时间从 2-3 分钟降至 <10 秒

#### 2. Next.js 构建缓存

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json', '**/*.ts', '**/*.tsx') }}
```

**效果**: 构建时间从 5-8 分钟降至 1-3 分钟

#### 3. Docker 层缓存

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    cache-from: |
      type=gha,scope=${{ github.ref_name }}
      type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache
    cache-to: type=gha,mode=max
```

**效果**: Docker 构建时间从 5-10 分钟降至 1-2 分钟

### 构建优化

#### 1. Turbopack

```bash
# 使用 Turbopack 构建
npm run build:turbo

# package.json
{
  "scripts": {
    "build": "NODE_ENV=production next build",
    "build:turbo": "NODE_ENV=production TURBOPACK=1 next build --turbopack"
  }
}
```

> 注意：`npm run build` 本身**不是** Turbopack（Next 16 下 Turbopack 已是默认，但脚本仍显式区分）。
> CI（`ci.yml` 的 `build` job）执行的是 `npm run build`。

**效果**: 构建速度提升 3-5x

#### 2. 并行构建

```yaml
# CI 流水线并行执行
jobs:
  lint: ...
  test-unit: ...
  build: ...
  # lint 和 test-unit 并行执行
```

**效果**: CI 总时间减少 30-40%

#### 3. 浅克隆

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 1 # 只克隆最新提交
```

**效果**: 克隆时间从 30-60 秒降至 5-10 秒

### 部署优化

#### 1. 预拉取镜像

```bash
# 在部署前预拉取镜像
docker pull ghcr.io/[owner]/7zi-frontend:latest
```

#### 2. 健康检查优化

```bash
# 减少健康检查等待时间
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=3
```

#### 3. 并行验证

```yaml
# 部署后并行运行测试
jobs:
  smoke-tests: ...
  performance-check: ...
```

### 性能基准

| 指标        | 优化前     | 优化后    | 改进 |
| ----------- | ---------- | --------- | ---- |
| CI 总时间   | 20-30 分钟 | 8-12 分钟 | -60% |
| 构建时间    | 5-8 分钟   | 1-3 分钟  | -70% |
| Docker 构建 | 5-10 分钟  | 1-2 分钟  | -80% |
| 部署时间    | 5-10 分钟  | 2-4 分钟  | -60% |
| 回滚时间    | 10-15 分钟 | 1-2 分钟  | -85% |

---

## 监控和告警

### 健康检查端点

```bash
# 应用健康检查
curl https://7zi.com/api/health

# 预期响应（src/app/api/health/route.ts）
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.6",
  "checks": {
    "memory": { "status": "ok", "used": 0, "limit": 0 },
    "node": { "status": "ok", "version": "v22.x.x" }
  }
}
```

> `status` 取值为 `healthy` / `unhealthy`（内存使用超阈值时为 `unhealthy`）；
> `version` 来自 `process.env.npm_package_version` / `APP_VERSION`，缺省回落 `1.0.6`。
> 另有 `/api/health/ready`、`/api/health/live`、`/api/health/detailed` 三个子端点。

### 监控指标

| 指标       | 阈值  | 告警        |
| ---------- | ----- | ----------- |
| 响应时间   | > 5s  | ⚠️ Warning  |
| 错误率     | > 1%  | 🔴 Critical |
| CPU 使用率 | > 80% | ⚠️ Warning  |
| 内存使用率 | > 90% | 🔴 Critical |
| 磁盘使用率 | > 90% | 🔴 Critical |

### 日志聚合

```bash
# 集中查看所有日志
docker logs -f 7zi-frontend-blue 2>&1 | grep -E "ERROR|WARN"
```

---

## 安全最佳实践

### 1. 镜像安全

```bash
# 扫描镜像漏洞
docker scout cves ghcr.io/[owner]/7zi-frontend:latest

# 使用最小化基础镜像
FROM node:20-alpine
```

### 2. 密钥管理

- ✅ 使用 GitHub Secrets 存储敏感信息
- ✅ 不在代码中硬编码密钥
- ✅ 使用环境变量注入

### 3. 网络安全

- ✅ HTTPS Only
- ✅ Nginx 作为反向代理
- ✅ 定期更新 SSL 证书

---

## 附录

### A. 环境变量清单

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.7zi.com
DATABASE_URL=postgresql://...
```

### B. Docker 命令速查

```bash
# 查看所有容器
docker ps -a

# 查看镜像
docker images

# 查看日志
docker logs [container]

# 进入容器
docker exec -it [container] sh

# 清理资源
docker system prune -af
```

### C. Nginx 配置

```nginx
# /etc/nginx/sites-available/7zi.com
server {
    listen 443 ssl http2;
    server_name 7zi.com www.7zi.com;

    ssl_certificate /etc/letsencrypt/live/7zi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/7zi.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;  # Blue 环境
        # proxy_pass http://127.0.0.1:3001;  # Green 环境

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### D. 参考链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker 官方文档](https://docs.docker.com/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)

---

**维护者**: 系统管理员
**最后审核**: 2024-03-29
