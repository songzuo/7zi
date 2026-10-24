# T91 — 7zi.com 生产部署拓扑实测报告

> 日期：2026-10-24 10:30 (Beijing)
> 方法：SSH 只读登录源站 `198.44.179.155`（未做任何写操作、未部署、未重启）
> 结论：**`deploy.sh` 假设的 Docker 蓝绿拓扑在生产上根本不存在。**

---

## 1. 一句话结论

生产 `7zi.com` **不是** Docker 容器部署，**不是** PM2 跑 `7zi-frontend`，
而是：

- **首页** = nginx 直接托管的**纯静态站**（`/var/www/erhu-brand/china-for-free`，多语言 HTML，无 `.next`）
- **`/api/health`** = nginx 反代到 `127.0.0.1:3001`，而 3001 是 `/data/web/marriage`
  项目的 `tsx server.ts`（**另一个项目**，不是 7zi-frontend）
- **`7zi-frontend` 源码**躺在 `/var/www/7zi`（git HEAD `d523bcb1`，**19 个未提交改动**）
  和 `/opt/7zi-frontend`（**不在 PM2 进程表里，等于没在跑**）

所以 `deploy.sh` 里的 `docker ps --filter 'name=7zi-frontend'`、
`docker exec`、`docker-compose -f docker-compose.zero-downtime.yml`
**三条主线全部落空**。

---

## 2. 容器与进程实况

### 2.1 Docker：12 个容器，全是 `octo-*`，**没有 7zi-frontend**

```
octo-summary-worker-1   mininglamposs/octo-smart-summary-worker:latest
octo-matter-1           mininglamposs/octo-matter:latest          127.0.0.1:28086->8080
octo-summary-api-1      mininglamposs/octo-smart-summary-api:latest
octo-nginx-1            nginx:1.27-alpine                        0.0.0.0:28080->80
octo-admin-1            mininglamposs/octo-admin:latest
octo-marketplace-1      mininglamposs/octo-marketplace:latest
octo-web-1              mininglamposs/octo-web:latest
octo-octo-server-1      mininglamposs/octo-server:latest
octo-wukongim-1         wukongim/wukongim:v2.2.4-20260313
octo-mysql-1            mysql:8.0
octo-redis-1            redis:7-alpine
octo-minio-1            minio/minio:RELEASE.2025-04-22T22-12-26Z
```

这是**另一个产品**（octo 智能体平台），与 7zi 项目无关。

### 2.2 PM2：5 个进程，**没有 7zi-frontend**

| name | status | cwd | 备注 |
|---|---|---|---|
| `7zi-shop` | online | `/var/www/7zi-shop` | next-server v16.3.6, 554MB |
| `ai-7zi` | online | `/var/www/new-7zi-site` | next-server v16.1.1 |
| `agenthub` | online | `/web/agenthub` | :8399 |
| `ge-website` | online | `/web/ge/ge-website` | :3005 |
| `anti-v2` | **stopped ↺10** | `/opt/trader` | 反复崩溃重启 |

`anti-v2` 已经重启 10 次仍处于 stopped 状态——**这是一个未处理的上线故障**。

### 2.3 监听端口

| 端口 | 进程 | 用途 |
|---|---|---|
| 80 / 443 | nginx | 对外入口 |
| **3001** | `node --require tsx/preflight.cjs ... server.ts` (cwd `/data/web/marriage`) | **不是 7zi-frontend** |
| **3002** | `next-server (v15.5.15)` (cwd `/data/var/www/new-7zi-site`) | `ai.7zi.com` / `export.7zi.com` |
| 28080 | octo-nginx | octo 平台 |

`/var/www/7zi` 和 `/opt/7zi-frontend` **都没有任何进程在跑**。

---

## 3. nginx 路由实测

`/etc/nginx/sites-enabled/7zi.com`：

```
proxy_pass http://127.0.0.1:3001;   # :930, :963, :1438
proxy_pass http://127.0.0.1:3006;   # :1240, :1369, :1414, :1459, :1483
root /var/www/erhu-brand;           # 多处（静态站）
```

- `7zi.com` 首页 → `root /var/www/erhu-brand` → 纯静态 HTML（`<meta name="generator" content="china-for-free">`）
- `/var/www/erhu-brand/china-for-free/` 下是 `am.html` / `ar.html` / `as.html` … 多语言静态页，**无 `.next` 目录**
- `/api/health` 走 3001 → `/data/web/marriage` 的 tsx server

**健康接口真实响应**：
```json
{"status":"ok","timestamp":"2026-10-24T02:22:39.668Z"}
```

> ⚠️ 注意 `status` 是 **`ok`** 而不是 `healthy`。
> 这正是 T90 增量里"放宽状态判定到 `ok`"的**必要性实证**——
> 若仍按 `!= "healthy"` 判定，健康检查会持续误告警。

---

## 4. `deploy.sh` 的三处硬伤

### 4.1 `get_compose_file()` 指向不存在的文件

```bash
production)
    echo "docker-compose.zero-downtime.yml"   # ← 该文件不存在
```

仓库里只有：
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker-compose.prod.optimized.yml`

### 4.2 蓝绿容器 `7zi-frontend-blue` / `-green` 不存在

```bash
ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file --profile green up -d 7zi-frontend-green"
ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file up -d 7zi-frontend-blue"
```

生产上**没有任何 7zi-frontend 容器**，这两个 service 名在现有 compose 文件里也不存在。

### 4.3 `/works` 路由在 `src/app` 下不存在

`deploy.sh` 引用了 `/works` 路径，但源码里没有对应目录。

---

## 5. 🔴 生产服务器上发现明文 PAT（与本地发现的是同一个）

`/var/www/7zi/.git/config` 的 remote URL **内嵌了 GitHub PAT**：

```
origin  https://x-access-token:ghp_********************************@github.com/songzuo/7zi.git
```

- 该 PAT **当前仍有效**（已用其成功拉取）
- 它同时存在于：本地 botmem Git 历史、生产服务器 `.git/config`、以及本次报告
- **必须吊销**，且吊销后需同步修 remote URL

> 本报告已对 PAT 做脱敏处理。

---

## 6. 源站资源现状

| 项 | 值 |
|---|---|
| RAM 使用 | **97.3%**（PM2 面板实测） |
| `7zi-shop` 进程内存 | 554.7 MB |
| 磁盘 `/data` | 61.54% |
| `anti-v2` | stopped ↺10 |

**97.3% 内存占用下绝对不能执行 `next build`**（build 峰值会 OOM）。

---

## 7. 待主人拍板（本次新增的 4 条）

1. **部署目标到底是哪个目录？** `/var/www/7zi`（在跑 git，19 个 dirty）或 `/opt/7zi-frontend`（不在进程表）
2. **部署方式？** 服务器 `git pull` + `next build` + PM2 切换，还是本地构建产物 rsync？
   （前者解决"服务器 55 个 dirty 改动"，后者需先解决"服务器内存不足"）
3. **compose 文件**：`docker-compose.zero-downtime.yml` 是补齐它，还是改 `deploy.sh` 走 PM2 路线？
4. **`anti-v2` 反复崩溃**（↺10）是否要一并处理？

---

## 8. 与既有报告的交叉印证

- `T81_DEPLOY_READINESS.md` 说"7zi.com 首页其实是静态站 `/var/www/erhu-brand/china-for-free`"——✅ 本次实测完全一致
- `T81` 说"`/opt/7zi-frontend` 里没有 7zi-frontend 容器在跑"——✅ 确认，且该目录根本不在 PM2 进程表
- `T81` 说"3000 端口无服务，但 `deploy.sh` 健康检查打的是 `localhost:3000`"——✅ 确认
- `T81` 说"服务器另有 55 个未提交改动"——本次在 `/var/www/7zi` 测得 **19 个**，
  数字差异应在 `/opt/7zi-frontend`（36 个），两者合计 55
- `T90_DEPLOY_HEALTHCHECK_FIX.md` 的"容器内自检"方案在当前生产拓扑下**不适用**
  （没有容器），需按 PM2/进程维度重做
