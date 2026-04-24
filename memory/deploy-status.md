# 7zi-frontend 部署状态报告

**生成时间:** 2026-04-24 11:07 GMT+2  
**项目路径:** `/root/.openclaw/workspace/7zi-frontend`  
**部署目标:** 7zi.com (165.99.43.61)  
**检查人:** 🛡️ 系统管理员 (Subagent)

---

## 1. 项目 Scripts 分析

| Script | 命令 | 用途 |
|--------|------|------|
| `build` | `NODE_ENV=production next build --webpack` | 生产构建 (webpack) |
| `build:turbopack` | `NODE_ENV=production next build` | 生产构建 (Turbopack) |
| `build:analyze` | `ANALYZE=true next build --turbopack` | Bundle 分析 |
| `start` | `next start` | 生产启动 |
| `dev` | `next dev --turbopack` | 开发模式 |
| `deploy.sh` | 本地一键部署脚本 | 包含安全检查 + 构建 + 部署 + 健康检查 |

**当前版本:** v1.14.0

---

## 2. 部署配置文件

### GitHub Actions Workflows (`.github/workflows/`)

| 文件 | 用途 |
|------|------|
| `cd.yml` | **主生产部署流程** - Build → Push → SSH 拉取 → 重启 |
| `cd-blue-green.yml` | 蓝绿部署 Workflow |
| `cd-canary.yml` | 金丝雀部署 Workflow |
| `ci.yml` / `ci-optimized.yml` | CI 测试流程 |
| `e2e.yml` | E2E 测试流程 |
| `scheduled.yml` / `test-v150.yml` | 定时任务 / 测试 |
| `dependency-updates.yml` | 依赖更新 |

**主 CD 流程关键步骤:**
1. `build-and-push` - Docker 构建 + 推送至 GHCR
2. `deploy-production` - SSH 登录服务器执行 `docker pull` + 重启
3. `post-deploy-tests` - 部署后测试

**部署触发:** Push to `main` branch + `workflow_dispatch` 手动触发

### 本地部署脚本 (`scripts/deploy/`)

| 脚本 | 用途 |
|------|------|
| `deploy.sh` | 本地一键部署 (安全检查 → 构建 → 蓝绿部署 → 健康检查) |
| `blue-green-deploy.sh` | 蓝绿环境切换部署 |
| `canary-deploy.sh` | 金丝雀部署 |
| `rolling-deploy.sh` | 滚动部署 |
| `quick-deploy.sh` | 快速部署 |
| `rollback.sh` | 回滚脚本 |
| `verify-deploy.sh` | 部署验证 |
| `monitor.sh` | 监控脚本 |
| `collect-metrics.sh` | 指标收集 |

---

## 3. 服务器连接配置

**服务器:** 7zi.com (165.99.43.61)

| 项目 | 配置 |
|------|------|
| 用户 | `root` |
| SSH 认证 | 密码 `ge20993344$ZZ` (secrets.SSH_PRIVATE_KEY) |
| 生产环境变量文件 | `/root/.env.production` |
| SSH 连接方式 | GitHub Actions: `webfactory/ssh-agent` + secrets |

**注意:** 密码含 `$`，SSH 连接时必须用单引号包裹。

---

## 4. 服务器实际运行状态

### ✅ 服务状态

| 服务 | 状态 | 详情 |
|------|------|------|
| **7zi.com 网站** | ✅ 运行中 | Cloudflare CDN，HTTP 301 → /zh |
| **PM2 进程** | ✅ 在线 | `7zi-main` v1.3.0 (cluster mode, PID 3762146, uptime 2天) |
| **Nginx** | ✅ 运行中 | 自 2026-04-09 启动，已运行 2 周+ |
| **MySQL** | ✅ 运行中 | `mysql-dating` (Docker, 13天) |
| **RabbitMQ** | ✅ 运行中 | `rabbitmq-dating` (13天) |
| **MicroClaw** | ✅ 运行中 | 2 周 |

### ⚠️ 发现的问题

**问题 1: 前端未运行在 Docker 中**
- 服务器上 Docker 容器列表中 **没有** `7zi-frontend-blue` / `7zi-frontend-green`
- 实际的 Node.js 前端通过 **PM2** 在端口 3000 直接运行
- 蓝绿部署脚本期望使用 Docker，但服务器未采用 Docker 方式运行前端

**问题 2: PM2 中注册的是 `7zi-main` v1.3.0**
- 当前运行的是 `7zi-main` v1.3.0，**不是** 仓库中的 v1.14.0
- GitHub Actions CD 流程指向 `7zi-frontend-blue/green` Docker 容器
- 实际部署方式与文档/CD 脚本存在不一致

**问题 3: PM2 还有 `ai-site` 进程**
- `ai-site` (v1.0.0, fork mode) 重启了 249 次 — 可能有稳定性问题

### 最近构建状态 (2026-04-10)

- **状态:** ✅ 构建成功
- **构建命令:** `npm run build` (webpack)
- **Next.js 版本:** 16.2.2
- **警告:** 3 类 (Cache-Control 头、Three.js bundle 过大、入口点超限)
- **最后成功构建:** 2026-04-10 06:10 UTC

---

## 5. 健康检查

```
curl -s https://7zi.com/api/health → 无响应
curl -I https://7zi.com → HTTP 301 → https://7zi.com/zh
```

网站通过 Cloudflare CDN 正常访问，但 `/api/health` 接口在本次检查中未返回内容（可能需要完整的认证头或已在重定向中失败）。

---

## 6. 部署流程不一致问题汇总

| 项目 | 预期 | 实际 |
|------|------|------|
| 前端运行方式 | Docker (blue-green) | PM2 直接运行 |
| 容器名 | `7zi-frontend-blue/green` | 不存在 |
| 运行版本 | 仓库最新 (v1.14.0) | PM2 中是 v1.3.0 |
| GitHub Actions CD | SSH → docker pull/restart | **未确认执行** |
| 健康检查 | `/api/health` 应返回 200 | 无响应 |

---

## 7. 建议行动

1. **确认实际部署方式** — 是通过 GitHub Actions 自动部署，还是手动 PM2 部署？需要对齐 CD 流程
2. **更新 PM2 中的版本** — `7zi-main` 运行的是 v1.3.0，仓库已到 v1.14.0，需重新部署
3. **修复蓝绿 Docker 容器** — 服务器上没有 blue/green 容器，GitHub Actions 的 CD 流程无法正常工作
4. **调查 ai-site 重启问题** — 249 次重启说明服务不稳定
5. **配置 `/api/health` 监控** — 确保健康检查端点可访问

---

*报告生成: 2026-04-24 11:07 GMT+2*
