# T135 — 部署就绪度体检报告（只读）

- 执行人：🛡️ 系统管理员子代理
- 日期：2026-10-25
- 范围：仅本地只读检查（未部署、未 rsync、未 SSH 写操作、未 git add/commit/push）
- 结论摘要：**当前不建议直接执行生产部署**。存在 5 条阻塞项，核心是「部署产物/脚本与线上真实拓扑不匹配」+「远端 origin/main 落后本地 77 个提交（含安全修复）」。

---

## 0. 检查方法与证据来源

全部结论来自本地文件读取与只读命令：
`git status/log/rev-list`、`df -h`、`free -m`、`du -sh`、`docker system df`、`docker ps`、`ss -ltnp`、`npm audit --omit=dev --json`、`docker-compose config --services`。

**未执行任何 SSH 连接**（含只读），因此线上端口/容器现状未二次核实，线上相关结论均标注为「依据仓库内配置 + 历史报告（T81/T90）」。

---

## 1. 端口清单（实际监听 / 声明监听）

### 1.1 应用进程

| 来源 | 端口 | 说明 |
|---|---|---|
| `Dockerfile:67,91` | `ENV PORT=3000` / `EXPOSE 3000` | 容器**内部**端口 |
| `docker-compose.yml`（根，dev） | `${PORT:-3000}:3000` → 宿主机 3000；`nginx` 服务 `80:80` `443:443` | 根 compose 已通过 `docker-compose config --services` 校验（服务：7zi-frontend、nginx） |
| `7zi-frontend/docker-compose.prod.yml:7-8` | `3000:3000`，容器名 `7zi-frontend-prod` | 生产镜像 `7zi-frontend:prod-v3` |
| `ecosystem.config.production.js` | `PORT=3000`、`HOSTNAME=0.0.0.0`、pm2 名 `7zi-frontend`、`cwd=/var/www/7zi`、cluster `instances: max` | PM2 模式，端口 3000 |
| `nginx/7zi-ssr.conf:20,95,107,115,126,161,181` | `proxy_pass http://127.0.0.1:3000` | **PM2/宿主机 3000** 语义 |
| `nginx/nginx.conf:110-112` | `upstream frontend { server 7zi-frontend:3000; }` | 容器名 + 容器内 3000 |
| `nginx/conf.d/upstream.conf:9-16` | `upstream frontend_backend { server 7zi-frontend-blue:3000; }` | 蓝绿槽位 |
| `7zi-nginx.conf:10,20,59,77,84,91,99,109` | `proxy_pass http://7zi-frontend:3000` | 容器名 + 容器内 3000 |

### 1.2 监控栈（`monitoring/docker-compose.yml`）

9090(Prometheus)、9093(Alertmanager)、**3001→3000(Grafana)**、3100(Loki)、9101→9100(node-exporter)、8080(cAdvisor)、9091、8085(health-service)

### 1.3 本机实际监听（`ss -ltnp`，本机 bot6，非生产源站）

22, 25, 80, 110, 143, 443, 993, 995, 2000, 3001, 5001, 6379, 8080, 8085, 9090, 9091, 9100, 9101, 18789/18790/18791/18792, 19000/19001, 49833
（`docker ps`：7zi-grafana 3001、7zi-health-service 8085、7zi-node-exporter 9101、7zi-cadvisor 8080）

> ⚠️ **本机 3001 已被 Grafana 占用**；历史报告 T81 记录生产源站 `/api/health → proxy_pass http://127.0.0.1:3001`（next-server）。本机与生产端口语义不同，排查时勿混淆。

---

## 2. 健康检查端口 vs 实际服务端口 —— 已知历史问题的**现状核实**

### 2.1 根 `deploy.sh`：**已修复** ✅

`deploy.sh:187-283` 已改为三层判定（commit `c196ebb030` "健康检查改用容器内自检"）：

1. `HEALTH_INTERNAL_PORT=3000` → `docker exec <cid> node -e "...http://127.0.0.1:3000/api/health..."`（**容器内**自检，正确）
2. 公开入口 `http://127.0.0.1/api/health` + `https://7zi.com/api/health`（走 nginx 80/443，正确）
3. 公开入口探测强制带浏览器 UA（规避 Cloudflare/WAF 403）
4. 非 strict 模式下公开入口失败**只告警不硬失败**（避免蓝绿切换前误判回滚）；strict 仅用于流量已切换后的回滚校验

**结论：根 `deploy.sh` 已不再打宿主机 3000，历史"打 3000 导致误判回滚"问题在该脚本中已闭环。**

### 2.2 `7zi-frontend/deploy.sh`：**已修复** ✅

`7zi-frontend/deploy.sh:205-226`：`HEALTH_URL` 默认 `https://7zi.com/api/health`，带浏览器 UA，状态判定放宽为 `healthy/ok/unknown`。同样闭环。

### 2.3 但仍有 **3 处遗留同一缺陷模式**（宿主机 3000 探测）❌

| 文件 | 行 | 内容 | 风险 |
|---|---|---|---|
| `deploy/deploy.sh` | 177 | `curl -f http://localhost:${PORT:-3000}/api/health` | 旧 k8s/OpenClaw 通用脚本，未修；误判→返回 1 |
| `.github/workflows/ci.yml`（staging 部署） | 596 | `curl -sf http://localhost:3000/` | 宿主机 3000 在源站**无服务**（T81 实测 000）→ 10 次重试全失败 → **CI 判定部署失败并触发回滚** |
| `.github/workflows/ci.yml`（production 部署） | 683 | `curl -sf http://localhost:3000/` | 同上，失败即 `docker-compose down` + 恢复备份 + `exit 1` |

**这两条 CI 部署任务即为「部署即误回滚」的现网残留路径**，是本次最关键的历史问题复现点。

---

## 3. 三档结论

### 🔴 阻塞部署（5 条，必须处理后再上线）

**B1 — CI 部署流水线仍用宿主机 3000 探测，会误判失败并自动回滚**
- 位置：`.github/workflows/ci.yml:596`（staging）、`:683`（production）
- 建议修复命令（改配置，非本任务范围）：
  ```bash
  # 将宿主机 3000 探测替换为容器内自检 + 公开入口探测
  # staging:  curl -sf http://127.0.0.1/api/health
  # production: curl -sf -A "Mozilla/5.0" https://7zi.com/api/health
  ```
  或直接复用根 `deploy.sh` 的 `container_http_ok()` + `remote_http_ok()` 逻辑（已带 UA 与 strict 分级）。

**B2 — `deploy.sh` 生产环境依赖的 compose 文件在仓库中不存在**
- `deploy.sh:86-99` `get_compose_file()` → production 固定返回 `docker-compose.zero-downtime.yml`
- 实测：`ls docker-compose.zero-downtime.yml` → 不存在；`git cat-file -e HEAD:docker-compose.zero-downtime.yml` → **NOT in HEAD**（历史上存在过，现已从仓库移除）
- 同理 `docker-compose.dev.yml` / `docker-compose.staging.yml` 也缺失（仅 `deploy/docker/docker-compose.dev.yml`、`deploy/docker/docker-compose.prod.yml` 存在）
- 影响：`deploy_zero_downtime` 第 6 步 `docker-compose -f <file> build` 直接失败 → 零停机部署路径不可用
- 建议命令：
  ```bash
  # 方案A（推荐）：补齐 compose 文件并纳入版本管理
  #   从线上 /opt/7zi-frontend/docker-compose.zero-downtime.yml 取回，或基于根 docker-compose.yml 补写 blue/green profile
  # 方案B：改 ENVIRONMENT/DEPLOY_PATH 走 PM2 路径（见 B3）
  ```

**B3 — 仓库内存在 3 套互相冲突的部署拓扑，部署目标不唯一**

| 脚本 | 目标主机 | 路径 | 运行方式 | 健康检查 |
|---|---|---|---|---|
| `deploy.sh` | `7zi.com` / `198.44.179.155` | `/opt/7zi-frontend` | Docker 蓝绿（blue/green 容器） | 已修复 ✅ |
| `deploy-scripts/deploy-7zi-production-v1141.sh` | `165.99.43.61` | `/var/www/7zi/7zi-frontend` | rsync `.next/` + `pm2 restart 7zi-main` | 仅看 pm2 状态 |
| `deploy-scripts/deploy-7zi-www.sh` | `7zi.com` | `/var/www/7zi` | `rm -rf /var/www/7zi/*` + scp `out/` | 无 |

- `TOOLS.md` 记录的源站 IP 是 `198.44.179.155`，而 v1141 脚本指向 `165.99.43.61` —— **两个不同的生产 IP 指向同一站点**
- `deploy-scripts/deploy-7zi-www.sh` 里有 `rm -rf /var/www/7zi/*`，属高危脚本，**严禁在未确认目标路径的情况下执行**
- `ecosystem.config.production.js` 的 deploy 段是**占位符**：`repo: 'git@github.com:your-repo/7zi-frontend.git'`（无法使用）
- 建议命令（先确认再动）：
  ```bash
  # 澄清线上真实拓扑（需主人授权后再做只读核实）
  # ssh -o StrictHostKeyChecking=no root@<确认后的IP> 'docker ps --format "{{.Names}}\t{{.Ports}}"; pm2 list; ss -ltnp | grep -E "3000|3001"'
  ```

**B4 — 远端 `origin/main` 落后本地 77 个提交，包含已知安全修复**

```
本地 HEAD        : 22ecdcb77  chore(tasks): 归档 152 条 completed 任务
远端 origin/main : 17cf105a9  docs: 记录 2026-10-23 心跳巡检结果
git rev-list --count origin/main..HEAD = 77
git rev-list --count HEAD..origin/main = 0
```
77 个未推送提交中包含安全类修复：`d892253cb9 fix(security): 修复租户身份可伪造、写权限可提权为删权限、配额恒不触发`、`568cee6677 fix(audit-log): 修复审计日志服务无法启动`、`e00c13e4e6 fix(deps): 修复后端 CI 审计门禁` 等。
- 若走 CI（`git pull origin main`）→ **上线的是不含这些修复的旧代码**，安全回归
- 若走本地 `deploy.sh`（rsync 本地工作区）→ 与 CI 行为不一致，线上内容不可复现
- 建议命令（**本任务不执行**，需主人批准）：
  ```bash
  git push origin main        # 由主管/主人决策后执行
  ```

**B5 — `.next` 构建产物严重过期（早于 75 个源文件）**
- `.next/BUILD_ID` 与 `.next/standalone/server.js` mtime = **2026-10-21 09:43**
- `find src -newer .next/BUILD_ID -type f | wc -l` = **75**（含 workflow executor / monitoring / audit-log 等近期改动）
- `deploy-scripts/deploy-7zi-production-v1141.sh` 直接 rsync `.next/` → 会发布 4 天前的旧构建
- 建议命令：
  ```bash
  cd /root/.openclaw/workspace && npm run build && ls -l .next/BUILD_ID
  ```

### 🟡 建议但非阻塞（6 条）

**N1 — nginx upstream 切换可能"写了但没生效"**
- `deploy.sh:472,537` 把蓝绿 upstream 写入 **`nginx/conf.d/upstream.conf`**（upstream 名 `frontend_backend`）
- 但 **`nginx/nginx.conf` 内没有 `include /etc/nginx/conf.d/*.conf`**（只有 `include /etc/nginx/mime.types`），且其自身定义的是 `upstream frontend { server 7zi-frontend:3000; }`，所有 `proxy_pass http://frontend;`
- 只有 `nginx/nginx-zero-downtime.conf:89` 才有 `include /etc/nginx/conf.d/upstream.conf;` 且使用 `proxy_pass http://frontend_backend;`
- ⇒ 若线上挂载的是 `nginx/nginx.conf`，**蓝绿切换不会生效**（切了 upstream 但没有 server 引用它）
- 建议命令：
  ```bash
  grep -n "include" nginx/nginx.conf nginx/nginx-zero-downtime.conf
  # 确认线上：nginx -T | grep -nE "include|upstream|proxy_pass"
  ```

**N2 — CI 期望的 `deploy-zero-downtime.sh` 不存在**（`ci.yml:586,666`），会静默回退到 `docker-compose.prod.yml` 分支（该文件也不在根目录，仅 `deploy/docker/docker-compose.prod.yml`）。建议：补脚本或修正 CI 路径引用。

**N3 — 依赖树存在 peer 版本失配**：`npm ls` 显示 `next@16.4.2` 被 `@ducanh2912/next-pwa@10.2.9`（期望 `14.2.12`）与 `@sentry/nextjs@10.76.2`（期望 `14.2.35`）标记为 `invalid`。构建/运行期可能踩坑，建议：
```bash
pnpm why next && pnpm outdated | head -20
```

**N4 — 磁盘与内存余量偏紧**：根分区 145G 已用 113G（**78%**），可用 33G；`/var/lib/docker` 占 36G；workspace 内 `node_modules` 4.8G、`.next` 747M、`.git` 365M。内存 7.9G 总量 / 3.5G 已用 / swap 4G 已用 1.9G。
建议（部署前清理，纯本地）：
```bash
docker system df
docker image prune -a -f      # 可回收 ~3.9G 镜像 + ~1.9G 容器
docker container prune -f
rm -rf .next && npm run build  # 重建后清理旧缓存
```

**N5 — 仓库内提交了明文监控口令**：`monitoring/docker-compose.yml:96` 硬编码 Grafana 管理员口令（值已打码：`****`），且该文件已被 git 跟踪（commit `b3304a0c6d`）。
建议：改用 `${GRAFANA_ADMIN_PASSWORD}` 从环境注入，并轮换线上口令（本次报告不回显原文）。

**N6 — `.env.production` 已被 git 跟踪，与 `.gitignore` 策略冲突**（`.gitignore` 有 `.env.*` 但该文件历史上已被跟踪，`git check-ignore` 未命中）。当前内容仅含 `NODE_ENV/PORT/HOSTNAME/统计 ID/GitHub owner-repo` 等非敏感项，风险低但策略不一致。
建议：`git rm --cached .env.production`（**本任务禁止执行，需主人批准**）。

### 🟢 已就绪（7 条）

| # | 项 | 证据 |
|---|---|---|
| R1 | 根 `deploy.sh` 健康检查端口语义正确 | `deploy.sh:187-283` 容器内 3000 自检 + nginx/域名探测 + UA + strict 分级 |
| R2 | `7zi-frontend/deploy.sh` 健康检查正确 | `7zi-frontend/deploy.sh:205-226` |
| R3 | 根 `docker-compose.yml` 语法有效 | `docker-compose -f docker-compose.yml config --services` → `7zi-frontend`, `nginx` |
| R4 | `/api/health` 路由存在且返回语义明确 | `src/app/api/health/route.ts`（200/503），另有 `/api/health/{live,ready,detailed}` |
| R5 | git 工作区无未推送历史冲突 | `HEAD..origin/main = 0`（本地领先 77，落后 0，无分叉） |
| R6 | 依赖审计**无 critical** | `npm audit --omit=dev`：`critical 0 / high 2 / moderate 7 / low 0 / info 0`（合计 9） |
| R7 | 磁盘尚有 33G 可用，内存可用 4.3G | `df -h` / `free -m` |

---

## 4. 依赖安全明细（`npm audit --omit=dev`，未执行任何 fix）

```
critical: 0 | high: 2 | moderate: 7 | low: 0 | info: 0   （合计 9 个包）
```

**HIGH（2）**
| 包 | 级别 | 直接/间接 | 公告 | 修复 |
|---|---|---|---|---|
| `body-parser@2.3.0` | high | 间接（`express@5.3.0` ← `@modelcontextprotocol/sdk@1.32.1` ← 直接依赖） | GHSA-27r3-jxmh-p828（压缩请求体尾部字节 DoS，CVSS 7.5） | `fixAvailable: true`（≥2.4.0） |
| `serialize-javascript` | high | 间接（`@rollup/plugin-terser` ← `workbox-build`/`workbox-webpack-plugin` ← `@ducanh2912/next-pwa@10.2.9`） | GHSA-5c6j-r48x-rmvq（RegExp.flags / toISOString 触发 RCE） | 需把 `@ducanh2912/next-pwa` 降到 `10.2.6`（semver-major，会影响 PWA 构建） |

**MODERATE（7）**：`@ducanh2912/next-pwa`、`@rollup/plugin-terser`、`bull`、`exceljs`、`uuid` 相关链、`workbox-*` 等。

**处置建议（不在本任务执行）**
```bash
# 仅查看，不自动修
npm audit --omit=dev
# 评估 body-parser 单独升级（npm audit fix 会牵动 next-pwa 降级，需分开处理）
npm view body-parser version
pnpm why body-parser
```

---

## 5. 部署前可执行 checklist（按顺序执行）

```bash
# ── 阶段 0：决策（需主人拍板，AI 不得自行执行）
#   [ ] Q1 线上真实部署拓扑 = Docker 蓝绿 还是 PM2(next-server)？   → 决定用 deploy.sh 还是 v1141 脚本
#   [ ] Q2 生产源站 IP = 198.44.179.155 还是 165.99.43.61？
#   [ ] Q3 77 个本地提交是否推送 origin/main？（决定 CI 路径是否可用）

# ── 阶段 1：本地修复（不碰线上）
# [ ] 修 ci.yml:596 / :683 的宿主机 3000 探测 → 改为 nginx/域名入口 + 浏览器 UA
# [ ] 补齐 docker-compose.zero-downtime.yml（或改 get_compose_file 指向真实存在的文件）
# [ ] 确认 nginx 实际挂载的是 nginx-zero-downtime.conf（含 conf.d/upstream.conf）
# [ ] 重建产物：npm run build && ls -l .next/BUILD_ID   （必须晚于所有 src 文件 mtime）
# [ ] 处理 peer 失配：pnpm why next / pnpm outdated
# [ ] 清理磁盘：docker image prune -a -f && docker container prune -f

# ── 阶段 2：推送（需主人授权）
# [ ] git push origin main
# [ ] 确认：git rev-list --count origin/main..HEAD == 0

# ── 阶段 3：部署前只读核实（需主人授权后 SSH）
# [ ] ssh root@<IP> 'docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"'
# [ ] ssh root@<IP> 'pm2 list'
# [ ] ssh root@<IP> 'nginx -T 2>/dev/null | grep -nE "include|upstream|proxy_pass"'
# [ ] ssh root@<IP> 'curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" https://7zi.com/api/health'   # 期望 200

# ── 阶段 4：部署
# [ ] 记录部署前状态与备份（deploy.sh 自动备份到 /opt/backups/7zi-frontend）
# [ ] 执行部署（按 Q1 结论选唯一脚本）
# [ ] 部署后验证：健康检查 + 首页 + 一个关键 API
```

---

## 6. 合规声明

- 本次**未**执行：`git add` / `git commit` / `git push` / `git rm --cached` / `rsync` / 远端部署 / 任何 SSH 连接 / 任何线上文件写入
- 本次**未**新增或修改任何源码文件，**仅新建本报告** `T135_DEPLOY_READINESS.md`
- 本次**未**执行 `npm audit fix` 或任何依赖变更
- 报告中所有口令/密钥均以 `****` 打码，未回显原文
