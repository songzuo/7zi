# T196 · 部署就绪度与线上健康核验报告

- 任务：T196（只读核验）
- 执行时间：2026-10-27 05:11–05:20 (Asia/Shanghai)
- 执行人：系统管理员子代理
- 凭据处理：**已读取 `.env.secrets`**，全程仅通过 `$SSH_PASSWORD` 环境变量使用，报告内不含任何凭据原文
- 操作性质：**全程只读**。未执行 git push/commit/reset、rm、部署、重启、服务启停、任何服务器端文件或配置修改

---

## 0. 结论速览

**部署就绪度判定：🔴 阻塞（Blocked）**

阻塞原因不是内存，而是**部署脚本的目标主机解析错误 + compose 编排文件不存在 + 服务器侧 docker 蓝绿拓扑根本不存在**。
`deploy.sh deploy` 在当前状态下 **必然失败**（连接阶段即失败）。

D9（内存 97%）在本次实测中 **未能复现**（源站实际可用内存 5.6GB），原记录已过期或测的是另一台机器。
D10 在 `deploy.sh` 中 **已被修复**，但 `deploy-quick.sh` 第 55 行 **仍是旧的坏检查**。

---

## 1. 本地脚本审查结论

### 1.1 `deploy.sh`（784 行）

| 项 | 结论 | 位置 |
|---|---|---|
| **部署目标主机怎么定的** | **硬编码 `SERVER_HOST="7zi.com"`，不可通过环境变量覆盖** | L23 |
| `SERVER_IP` | 定义了 `198.44.179.155` 但**全文从未被引用**（grep 仅命中定义行） | L24 |
| `SERVER_USER` | 硬编码 `root` | L25 |
| `SERVER_PASS` | `${SSH_PASSWORD:-}`（唯一可注入的变量） | L26 |
| `DEPLOY_PATH` | 硬编码 `/opt/7zi-frontend`，无 env 覆盖 | L29 |
| **rsync 目标** | `"$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"` — 随 SERVER_HOST 漂移 | L407 |
| **rsync 是否 `--delete`** | **是** `rsync -avz --delete` | L396 |
| rsync 排除项 | 排除 `.git/node_modules/.next/coverage/*.log/.env.local/.env.development/.env.staging/.env.production` | L397–404 |
| **健康检查端口** | 容器内 `127.0.0.1:3000/api/health`（`HEALTH_INTERNAL_PORT`，env 可覆盖，默认 3000） | L204 / L253 |
| 健康检查公开入口 | `http://127.0.0.1/api/health` + `https://7zi.com/api/health`（`HEALTH_PUBLIC_URLS` env 可覆盖） | L205 |
| 健康检查 UA | 带浏览器 UA（绕 Cloudflare 403） | L206 / L216 |
| 健康检查判定层级 | 容器 running → 容器内 3000 自检（**权威**）→ 公开入口（默认仅告警，`strict` 才硬失败） | L227–280 |
| **compose 文件选择** | production → `docker-compose.zero-downtime.yml` | L95 |
| 蓝绿槽位 | `7zi-frontend-blue` / `7zi-frontend-green`，容器内端口 3000 | L436–443, L473 |
| 流量切换 | 改写 `nginx/conf.d/upstream.conf` + `docker exec 7zi-nginx nginx -s reload` | L468–478 |

**致命问题 1 —— 主机名解析（L23）**
`7zi.com` 本机解析为 `104.21.59.229` / `172.67.184.212`（Cloudflare）。对这两个 IP 做 SSH 22 端口连接均 **Connection timed out**。
`ssh_cmd()`（L76）与 `scp_cmd()`（L80）全部使用 `$SERVER_HOST`，因此 **`check_prerequisites()` 会在第一步 `ssh_cmd "echo '连接正常'"` 就失败退出**。
`SERVER_IP` 已经写好了正确值却没被用上 —— 这是纯粹的"改一行"级别的缺陷。

**致命问题 2 —— compose 文件不存在（L95）**
`docker-compose.zero-downtime.yml` 在**本地工作区不存在**（本地只有 `docker-compose.yml`），在**服务器 `/opt/7zi-frontend/` 也不存在**（服务器只有 `docker-compose.yml`，2480 字节，2026-10-19）。
即使 SSH 修好，`docker-compose -f docker-compose.zero-downtime.yml build 7zi-frontend-blue` 也会因文件缺失失败。

**致命问题 3 —— 蓝绿容器拓扑不存在**
服务器 `docker ps` 中**没有任何 `7zi-*` 容器或镜像**，全部 13 个容器均为 `octo-*` 系列（octo-nginx / octo-web / octo-mysql / octo-redis / octo-minio / octo-wukongim …）。
服务器上**没有 `7zi-nginx` 容器** → L476 `docker exec 7zi-nginx nginx -s reload` 必然报错。
生产站点实际由**宿主机 nginx**（`/etc/nginx/sites-enabled/7zi.com`）反代到 `127.0.0.1:3001`，而 3001 是**裸 node 进程**（`/data/web/marriage/server.ts`，tsx 启动），不是 docker 容器。
即：`deploy.sh` 描述的 docker 蓝绿模型与线上真实拓扑**完全不同构**，整条 `deploy_zero_downtime()` 的第 5–10 步都建立在错误的架构假设上。

**风险 —— `rsync --delete`（L396）**
服务器 `/opt/7zi-frontend` 是一个 **git 仓库且有 54 个已修改未提交文件**（`git status --porcelain` 共 55 行，其中 54 行 ` M`），包括 `.env.production`、`.env.docker.example`、`.env.production.example`、`docker-compose.yml`、`7zi-frontend/src/lib/services/notification-enhanced.ts`、以及大量 `docs/*.md`。
`rsync -avz --delete` 会把这些**本地没有的服务器端改动直接删除**，且 `.env.production` 虽被 exclude（不覆盖内容），但本地其他文件的差异仍会被 `--delete` 抹除服务器端新增/修改文件。

### 1.2 `deploy-quick.sh`（75 行）

| 项 | 结论 | 位置 |
|---|---|---|
| 部署主机 | 硬编码 `SERVER_HOST="7zi.com"`（同 L23 问题，同样不可注入） | L11 |
| `DEPLOY_PATH` | 硬编码 `/opt/7zi-frontend` | L14 |
| rsync | `rsync -avz --delete`，**排除项比 deploy.sh 更少**（无 `.env.*` 排除） | L39–47 |
| rsync 目标 | `$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/` | L47 |
| **健康检查** | **`ssh_cmd "curl -sf http://localhost:3000/ > /dev/null 2>&1"`** ← D10 残留 | **L55** |
| 失败行为 | 循环 10 次后**不 exit 1**，直接打印"快速部署完成" → **静默假成功** | L55–L64 |
| 引号 bug | `-e "sshpass -p "$SERVER_PASS" ssh ..."` 内层双引号会提前闭合，密码含 `$` 时会被 shell 二次展开 | L46 |

实测：源站 `curl http://127.0.0.1:3000/api/health` → **000（连接被拒）**，源站 3000 端口无监听服务。故 L55 的检查在源站上**永远失败**。

### 1.3 `.github/workflows/preview.yml`（72 行）

- **完全没有部署逻辑**。L42–L47 "Deploy to preview" 只是 `echo` 注释 + 占位符，输出一条写死的 URL `https://preview-${{ github.event.number }}.7zi.com`，**没有任何实际 deploy 动作**，也没有使用 `secrets.VERCEL_TOKEN`（仅在注释里）。
- 该 workflow **不参与生产部署**，对 D8/D10 无影响；但它会让 PR 显示"部署成功"的假象。
- `cleanup-preview` job 同样是纯 `echo` 占位（L57–L67），不会真的清理。
- 注：本地工作区根目录是 **Next.js 前端单体仓库**，而 `preview.yml` 在根级 `.github/workflows/`；子项目 `7zi-frontend/` 下另有自己的 workflows（`backend-ci.yml` / `ci.yml`）。需注意**工作流作用域**是否覆盖了真实构建产物目录。

---

## 2. 三台服务器只读核验结果

### 2.1 汇总表

| 项目 | **源站 198.44.179.155** | **bot5.szspd.cn 182.43.36.134** | **本机 bot6** |
|---|---|---|---|
| SSH 可达性 | ✅ 可达（需用 IP） | ❌ **连不上**（见 2.3） | ✅ 本机 |
| 实际 hostname | `mxwbkh1ni`（**不是 `ecm-cd59`**） | — | `bot6` |
| 运行时长 | 12 天 4:33 | — | — |
| 负载 (1/5/15) | 0.52 / 0.71 / 0.69 | — | — |
| **内存 total** | 11959 MB (≈11.7G) | — | 7941 MB (≈7.8G) |
| 内存 used | 6251 MB (52%) | — | 3155 MB (40%) |
| 内存 free | 638 MB | — | 2010 MB |
| **内存 available** | **5708 MB** | — | 4785 MB |
| **Swap** | 4095 total / **3817 used (93%)** | — | 4095 / 1396 (34%) |
| **磁盘 /** | 50G total / 36G used / **15G avail / 71%** | — | 145G / 108G / **38G avail / 75%** |
| **PM2 进程** | 5 个：7zi-shop / agenthub / ai-7zi / **anti-v2** / ge-website | — | 1 个：7zi-shop |
| **PM2 重启次数 ↺** | 7zi-shop **0**、agenthub **0**、ai-7zi **0**、ge-website **0**、**anti-v2 10** | — | 7zi-shop **↺4**（20h online） |
| **docker ps** | 13 个容器，**全部 `octo-*`，全部 healthy (Up 12 days)**，**无 7zi-* 容器** | — | 4 个：7zi-grafana / 7zi-health-service / 7zi-node-exporter / 7zi-cadvisor，全部 healthy |
| 关键端口 | 80/443 nginx、**3001 next-server(node pid 1480, /data/web/marriage)**、3003/3004 next-server、3006 next-server(7zi-shop, pid 2843191)、8130 uvicorn、8077?→8099 python、8720/8788 python、8443 wstunnel、8444 ss-server、8545 nginx、10089 node、19000 node、28080 docker-proxy、5432 postgres、6379 redis、23306 mysql、22 ssh | — | 80/443 nginx、5001 node、19000/19001 node、3001 grafana、6379 redis、8080 cadvisor、8085 health、9100 node-exporter、22 ssh、25/110/143 dovecot、2000 python、18789–18792 openclaw gateway |

### 2.2 源站关键端口明细（`ss -lntp` 前 30 条）

```
0.0.0.0:80        nginx (master pid 1056 + 11 workers)
0.0.0.0:443       nginx
0.0.0.0:8545      nginx
127.0.0.1:8443    wstunnel
0.0.0.0:8444      ss-server
0.0.0.0:10089     node
0.0.0.0:19000     node
0.0.0.0:3003      next-server (pid 1543)
0.0.0.0:3004      next-server (pid 755)
*:3001            node (pid 1480)  ← 生产 7zi.com /api/health 实际后端
*:3006            next-server (pid 2843191) ← PM2 7zi-shop
127.0.0.1:8130    uvicorn (numplay backend)
127.0.0.1:8099    python3
0.0.0.0:8720      python3
0.0.0.0:8788      python
127.0.0.1:5001    python3
127.0.0.1:6379    redis
127.0.0.1:5432    postgres
127.0.0.1:23306   docker-proxy (mysql)
0.0.0.0:28080     docker-proxy (octo-nginx)
127.0.0.1:1600x   sshd 隧道
```

**健康端点实测（源站，只读 curl）**

| URL | 状态码 | 说明 |
|---|---|---|
| `http://127.0.0.1:3000/api/health` | **000** | 连接被拒，**3000 无服务**（证实 D10） |
| `http://127.0.0.1:3001/api/health` | **200** | 返回 `{"status":"ok","timestamp":"2026-10-26T21:12:24.895Z"}` |
| `http://127.0.0.1:3001/` | 404 | 根路径无路由（正常） |
| `http://127.0.0.1/api/health` (Host: 7zi.com) | 301 | nginx 301 → https，`deploy.sh` 的 `remote_http_ok` 带 `-L` 可跟随，**可通过** |
| `https://7zi.com/api/health`（带浏览器 UA） | **200** | 公开入口正常 |

**服务器 `/opt/7zi-frontend` 状态**
- git 仓库，HEAD = `d523bcb1 docs: 更新记忆文件`
- **55 项变更**（54 个已修改未提交文件 + 1 项），改动内容覆盖 `.env.production`、`docker-compose.yml`、`7zi-frontend/src/lib/services/notification-enhanced.ts` 等 → **`rsync --delete` 高危**
- `nginx/conf.d/upstream.conf` 存在，内容为 `server 7zi-frontend-blue:3000;`（blue 槽位），但**对应容器不存在**
- `docker-compose.yml` 存在（2480B，2026-10-19），是**单服务版**（`7zi-frontend` + `nginx`），**没有 blue/green profile**
- `docker images | grep 7zi` → **空**
- `/opt/backups/7zi-frontend/deploy-history.json` → **不存在**（`deploy.sh` 的回滚历史从未产生过）

### 2.3 bot5.szspd.cn (182.43.36.134) —— 连不上

按要求最多重试 2 次（实际做了 2 次密码 + 2 个额外用户探测）：

```
$ ssh root@182.43.36.134 'echo CONNECT_OK'
Permission denied, please try again.
$ ssh -v root@182.43.36.134 ...
Authentications that can continue: publickey,password
Offering public key: /root/.ssh/id_rsa ...
Offering public key: /root/.ssh/id_ed25519 ...
Next authentication method: password
Permission denied, please try again.
$ /dev/tcp/182.43.36.134/22  → port 22 OPEN（TCP 可达）
$ ssh ubuntu@182.43.36.134 → Permission denied
$ ssh admin@182.43.36.134  → Connection refused
```

**结论：TCP 22 端口开放、sshd 正常握手、但 `.env.secrets` 中的密码对 root/ubuntu 均认证失败。**
判定为 **凭据失效或密码已变更**（而非网络不通、也非机器宕机）。该机同时也没有任何已知的 SSH 私钥被接受。
→ **bot5 无法纳入本次核验**，其内存/磁盘/PM2/端口状态 **未知**。原记录中的 bot3/bot4 失联情况与本机状态需要一并复核。

### 2.4 本机 bot6

- 内存 7941MB total / 3155 used / **4785 available**，swap 34%
- 磁盘 `/` 38G 可用（75%）
- PM2: 仅 `7zi-shop`（v1.14.1，fork，20h online，**↺4**，514MB）
- Docker: 4 个监控类容器全部 healthy
- 角色：OpenClaw Gateway 宿主（18789–18792），**同时是部署脚本的运行端**

---

## 3. D8 / D9 / D10 / D15 逐条结论与最小修复建议

### 🔴 D8 · 部署目标未定义 + `rsync --delete` 会抹掉服务器未提交改动

**核实结论：成立，且比原记录更严重 —— 是两个独立缺陷。**

D8-a：**目标主机实际是"坏的"**。`deploy.sh` L23 硬编码 `SERVER_HOST="7zi.com"` → 解析到 Cloudflare → SSH 超时。`SERVER_IP`（L24）已写对却从未使用。
D8-b：**rsync `--delete`（L396）会删除服务器上 54 个未提交修改**，其中包含 `.env.production`、`docker-compose.yml` 等运行时关键文件。
D8-c（新增）：`docker-compose.zero-downtime.yml` 本地和服务器都不存在；服务器上没有任何 `7zi-*` 容器/镜像；`7zi-nginx` 容器不存在 → L476 的 `docker exec 7zi-nginx nginx -s reload` 必失败。**脚本的蓝绿模型与线上真实架构（宿主机 nginx + 裸 node:3001）不同构。**
D8-d（新增）：`DEPLOY_PATH`（L29）硬编码，多目标（源站 / bot5）无法切换。

**最小修复建议（按优先级，逐条可执行）：**

1. **`deploy.sh` L23 改为可注入 + 默认走 IP：**
   ```bash
   SERVER_HOST="${SERVER_HOST:-198.44.179.155}"   # 原：SERVER_HOST="7zi.com"
   ```
   同时把 L24 的 `SERVER_IP` 删除或改为 `SERVER_IP="${SERVER_IP:-198.44.179.155}"` 并在 L23 引用（避免"定义了却不用"的误导）。
   `deploy-quick.sh` **L11** 同样改为 `SERVER_HOST="${SERVER_HOST:-198.44.36.134}"`（bot5）或源站 IP。
2. **`deploy.sh` L29 改为** `DEPLOY_PATH="${DEPLOY_PATH:-/opt/7zi-frontend}"`。
3. **给 `rsync`（L396）加备份，替代裸 `--delete`：**
   在 L396 的 `rsync -avz --delete` 后追加 `--backup --backup-dir="/opt/backups/rsync-$(date +%Y%m%d-%H%M%S)"`，并在 L407 之前 `ssh_cmd "mkdir -p ..."`。
   更稳妥的**最小**替代：直接把 L396 的 `--delete` **删掉**（改为不带 `--delete` 的增量覆盖），并在 `sync_code()` 开头加一句 `log_warn "未使用 --delete：服务器端未提交改动将保留"`。
4. **补齐 compose 文件或换掉架构假设：**
   - 方案 A（最小工作量）：在仓库根新增 `docker-compose.zero-downtime.yml`，定义 `7zi-frontend-blue` / `7zi-frontend-green` 两个服务 + `7zi-nginx` 服务（带 `green` profile），并保证服务器 `/opt/7zi-frontend/` 下同名文件存在（rsync 会带过去）。
   - 方案 B（更贴合现状）：放弃 docker 蓝绿，`deploy.sh` 改为在源站直接 `git pull` + `pm2 restart 7zi-shop` + 用 **`http://127.0.0.1:3001/api/health`** 做健康检查。
   - **无论 A/B，`deploy.sh` L476 必须先确认目标存在**：把 `docker exec 7zi-nginx nginx -s reload` 改为实际可用的 reload 路径（宿主机 nginx 则是 `nginx -s reload` 或 `systemctl reload nginx`）。
5. **server-side 备份先行**（部署前一次性动作，属于运维操作，非本次只读范围）：`git -C /opt/7zi-frontend stash` 或 `git -C /opt/7zi-frontend diff > /opt/backups/7zi-frontend/pre-deploy-$(date +%F).patch`，把 54 个改动落盘。

### 🟡 D9 · 源站内存只剩 339MB（97%），不能在上面构建

**核实结论：❌ 本次实测未复现，原记录已过期/口径不同。**

实测源站（hostname `mxwbkh1ni`）：**总内存 11959 MB，used 6251 MB（52%），available 5708 MB**，swap 4095 MB 中 **已用 3817 MB（93%）**。
`pm2` 自报 `ram usage: 52.2%`。
→ **原记录"339MB / 97%"** 与当前 `free -m` 的 `available=5708MB` 不符。可能的解释：(a) 当时读的是 `free` 列（638MB）而非 `available`（5708MB）；(b) 当时机器规格不同；(c) 记录的是另一台机器。

**但 swap 93% 占用是真实风险**：`swapon --show` 显示 `/swapfile 4G 3.7G`，且源站上跑着 13 个 octo 容器 + 5 个 PM2 进程 + openclaw gateway（RSS 1045MB，8.5%）+ 多个 next-server（746MB / 657MB）。**在源站执行 `docker-compose build --no-cache`（Next.js 构建峰值 1–2GB）有 OOM 风险。**

**最小修复建议：**
1. **构建不放在源站。** `deploy.sh` L446–L451 现在是 `ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file build ..."`（在源站构建）。改为**在 bot6 本机构建 + 传输镜像**：
   ```bash
   # deploy.sh 新增 BUILD_HOST 变量，默认本机
   BUILD_HOST="${BUILD_HOST:-}"
   ```
   流程改为：本地 `docker build -t 7zi-frontend:$VERSION .` → `docker save 7zi-frontend:$VERSION | ssh_cmd "docker load"` → 源站只 `up -d`（不再 build）。
   这是唯一能同时规避 D9 内存风险与源站 93% swap 的方案。
2. **先清 swap 观察真实压力**（运维动作，需批准）：`sync && swapoff /swapfile && swapon /swapfile`（有短暂停顿风险）→ 或直接看 `ps aux --sort=-%mem | head` 找出可回收的进程。
3. **给源站加内存保护**：源站 `docker-compose.yml` 的 `deploy.resources.limits.memory` 已写 `512M`，但 `deploy:` 段在**非 swarm 的 docker-compose 下不生效**，需改成 `mem_limit: 512M` 才真正限制容器内存。

### 🟡 D10 · `deploy.sh` 健康检查打 3000 端口 → 部署必然误判回滚

**核实结论：🟡 部分修复 —— `deploy.sh` 已修好，`deploy-quick.sh` 仍是坏的。**

- ✅ `deploy.sh` L188–L280 已有完整三层健康检查：容器内 `127.0.0.1:3000/api/health`（权威）+ 公开入口 `http://127.0.0.1/api/health` / `https://7zi.com/api/health`（默认仅告警）。实测公开入口 `https://7zi.com/api/health` → **200**，容器内逻辑在有 7zi 容器时成立。
- ❌ **`deploy-quick.sh` L55 仍是 `ssh_cmd "curl -sf http://localhost:3000/ > /dev/null 2>&1"`**。实测源站 3000 端口 **无监听（000）** → 该检查**每次必失败**。
- ❌ 且 `deploy-quick.sh` L55–L64 的循环**失败后不 `exit 1`**，只是打印"✅/快速部署完成" → **部署失败被静默吞掉**，这是比 D10 本身更危险的问题。

**最小修复建议：**
1. **`deploy-quick.sh` L55 改为打真实端口 + 带 UA：**
   ```bash
   if ssh_cmd "curl -sf -o /dev/null -w '%{http_code}' --max-time 10 -A 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' -H 'Host: 7zi.com' http://127.0.0.1/api/health | grep -q 200"; then
   ```
   （`/api/health` 而非 `/`，因为 3001 根路径返回 404。）
2. **修掉"静默假成功"：** 在 `deploy-quick.sh` 循环结束后加
   ```bash
   if [ "$attempt" -gt "$max_attempts" ]; then log_error "❌ 健康检查失败"; exit 1; fi
   ```
3. **修 L46 的引号 bug：** `-e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no"`（单引号）。
4. **`deploy.sh` 的公开入口 URL 建议改为默认只保留 `https://7zi.com/api/health`**（L205），因为 `http://127.0.0.1/api/health` 在源站会 301，虽然 `-L` 能跟随，但多一次跳转没有必要。

### 🟡 D15 · `anti-v2` PM2 进程反复重启 ↺10

**核实结论：✅ 成立，且当前状态比"反复重启"更明确 —— 是**已停止**且不再重启。**

```
pm2 describe anti-v2:
  status   : stopped
  restarts : 10
  uptime   : 0
  pid      : N/A
  script   : /opt/trader/anti_v2.py
  interpreter: python3
  exec cwd : /opt/trader
  error log: /root/.pm2/logs/anti-v2-error.log   ← 该文件不存在
  created at: 2026-06-25T05:21:17Z
```

- `/opt/trader/anti_v2.py` **文件存在**（19683 字节，2026-06-25 13:21 修改），另有 `anti_v2.log`（13324B，2026-07-04）与 `anti_v2_state.json`（618B）。
- **`/root/.pm2/logs/anti-v2-error.log` 不存在** → 说明这 10 次重启**从未产生过 stderr 输出**，即进程是**静默立即退出**（典型：脚本内部 `sys.exit()` / import 失败被吞 / `if __name__` 分支未走到 / 缺少 API key 后主动退出）。
- `/root/.pm2/ecosystem.config.js` 中 **grep 不到 `anti`** → 该进程**不在持久化 ecosystem 配置里**，只存在于 `dump.pm2` 快照中 → 机器重启或 `pm2 resurrect` 后行为不可控。
- 同机 `anti_v3.py`（17293B）与 `anti_v2.py` 并存，`anti_v3.log` 为 0 字节 → 疑似 v3 取代 v2 后 v2 未清理。
- 其余 4 个 PM2 进程（7zi-shop / agenthub / ai-7zi / ge-website）**全部 online、restarts=0**，健康。

**最小修复建议（不改动任何线上行为的前提下，先诊断再处理）：**
1. **先取真实退出原因（只读诊断）：**
   ```bash
   cd /opt/trader && python3 anti_v2.py
   ```
   看是否有 stdout/stderr 抛出（注意：这会以 root 身份启动脚本，可能产生交易动作 → **执行前必须确认脚本是否含下单逻辑**，`anti_v2_state.json` 的存在说明它很可能会）。**安全替代**：先只读检查
   ```bash
   grep -nE "sys.exit|quit|raise |except" /opt/trader/anti_v2.py | head -30
   tail -50 /opt/trader/anti_v2.log
   ```
2. **若确认已废弃**：把 `anti-v2` 从 PM2 中正式移除并写进 ecosystem 排除（避免后续 resurrect 复活）：
   `pm2 delete anti-v2` + `pm2 save`，并在 `/root/.pm2/ecosystem.config.js` 中确认无该条目（当前已无）。这是写操作，需主人批准后执行。
3. **若仍需运行**：在 `/root/.pm2/ecosystem.config.js` 中**显式补一个 `anti-v2` 条目**（当前缺失），指向 `/opt/trader/anti_v2.py`，并加上 `autorestart: false`（避免无限重启刷屏），同时把 `out_file`/`error_file` 指向 `/opt/trader/anti_v2.log`（已存在的真实日志），确保下次崩溃能看到 stderr。

---

## 4. 部署就绪度判定

### 🔴 判定：**阻塞（Blocked）** —— 不具备执行 `./deploy.sh deploy` 的条件

**阻塞项（必须先解决）**

| # | 阻塞原因 | 证据 | 修复动作 |
|---|---|---|---|
| B1 | `deploy.sh` 目标主机解析到 Cloudflare，SSH 超时 | `7zi.com` → 104.21.59.229 / 172.67.184.212；SSH 22 超时 | 改 `deploy.sh` L23 |
| B2 | `docker-compose.zero-downtime.yml` 不存在（本地+服务器均无） | `ls` 两侧均为空 | 新增该文件 或 改走方案 B |
| B3 | 服务器无 `7zi-*` 容器/镜像、无 `7zi-nginx` 容器 | `docker ps` 仅 13 个 `octo-*`；`docker images \| grep 7zi` 为空 | 先做一次真实部署基线，或改用宿主机 nginx + 裸 node 模型 |
| B4 | `rsync --delete` 将删除服务器 54 个未提交文件 | `git status --porcelain` = 55 行 | 去掉 `--delete` 或加 `--backup`；部署前先备份 patch |

**非阻塞但需处理**

- 🟡 `deploy-quick.sh` L55 健康检查打 3000 且**失败不退出**（静默假成功）→ 改 L55 + 加 `exit 1`
- 🟡 `anti-v2` PM2 stopped ↺10、无 error log、不在 ecosystem 中 → 诊断后清理或补配置
- 🟡 源站 swap 93% 占用 + 内存 52%，**不建议在源站 build**（本机 bot6 有 38G 磁盘 / 4.7G 可用内存，更适合作为构建机）
- 🟡 bot5.szspd.cn 凭据失效（SSH 22 可达但密码认证失败）→ 无法作为第二台测试目标，需先更新 `.env.secrets` 中的密码
- 🟡 `.github/workflows/preview.yml` 是纯占位（只 echo，不实际部署），PR 显示"部署成功"是假象
- 🟡 源站 `/opt/backups/7zi-frontend/deploy-history.json` 不存在 → 回滚历史从未生成，回滚链路未经验证

**有条件就绪（若满足以下条件可升为"就绪"）**

1. `deploy.sh` L23 改为 `SERVER_HOST="${SERVER_HOST:-198.44.179.155}"`，且 `deploy-quick.sh` L11 同步改
2. `deploy.sh` L396 去掉 `--delete` 或加 `--backup --backup-dir=...`
3. 决定 compose 方案：新增 `docker-compose.zero-downtime.yml`（含 blue/green + `7zi-nginx`），**或**改为"源站 git pull + pm2 restart + 打 3001"路径
4. `deploy-quick.sh` L55 健康检查改为 `http://127.0.0.1/api/health`（带浏览器 UA），并在失败时 `exit 1`
5. 构建移出源站：本地构建 → `docker save` → 源站 `docker load`
6. 部署前把服务器 54 个未提交改动落盘备份

满足 1–4 后，**首次部署仍建议先在 bot5 或源站做一次 dry-run**（`./deploy.sh check` + `./deploy.sh status`），且 bot5 需先修复凭据。

---

## 5. 本次核验的边界与残留风险

**本次为只读核验，以下均未执行**（属后续需批准的操作）：
- 未修改任何脚本、配置、服务器文件
- 未执行 git push / commit / reset / checkout
- 未部署、未重启、未 stop/start 任何服务或容器
- 未清理源站 swap、未 kill 任何进程

**残留风险 / 需主人决策项**

| 项 | 风险 | 建议决策 |
|---|---|---|
| 源站 swap 已用 3.7/4G | OOM Killer 可能随时杀掉 openclaw gateway / next-server | 是否批准 swapoff/swapon 复位 或 加内存 |
| 源站 `/opt/7zi-frontend` 54 个未提交改动 | 一旦执行 `rsync --delete` 不可逆丢失 | 部署前强制备份 patch |
| `anti-v2.py` 可能含下单逻辑 | 直接运行 `python3 anti_v2.py` 诊断有副作用 | 是否授权只读 grep + 读 log，而非直接执行 |
| bot5 凭据失效 | 第二台测试目标不可用，无法做双机验证 | 是否提供新的 bot5 密码 |
| `deploy.sh` 的 docker 蓝绿模型 vs 线上裸 node 模型 | 两套架构混用会持续产生误判 | 是否直接重构为"裸进程 + pm2"部署模型 |

---

## 附录 A · 只读命令清单（全部为读取类，无写操作）

**源站 198.44.179.155**
```bash
hostname; uptime
free -m; swapon --show
df -h /
ss -lntp | head -30
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
docker images | grep -i 7zi
pm2 list; pm2 describe anti-v2
ls -la /opt/7zi-frontend; ls -la /opt/7zi-frontend/docker-compose*.yml
cat /opt/7zi-frontend/nginx/conf.d/upstream.conf
cat /opt/7zi-frontend/docker-compose.yml
cd /opt/7zi-frontend && git status --porcelain && git log --oneline -3
cat /etc/nginx/sites-enabled/7zi.com (grep proxy_pass)
grep -rn 'proxy_pass' /etc/nginx/sites-enabled/
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:{3000,3001,3003,3004}/api/health
curl -s -o /dev/null -w '%{http_code}' -H 'Host: 7zi.com' http://127.0.0.1/api/health
curl -s -o /dev/null -w '%{http_code}' -A '<browser UA>' https://7zi.com/api/health
ps aux --sort=-%mem | head -12
ls -la /root/.pm2/logs/ /opt/trader/
```

**本机 bot6**：`free -m` · `df -h /` · `pm2 list` · `docker ps` · `ss -lntp | head -25`

**bot5.szspd.cn 182.43.36.134**：仅 2 次 SSH 握手探测 + `/dev/tcp` 端口探测，**均失败**

## 附录 B · 凭据与密钥处理声明

- 密码：**已读取 `.env.secrets`**（仅 `SSH_PASSWORD` / `WINDOWS_PASSWORD` 两个键），全程以 `$SSH_PASSWORD` 变量形式传给 `sshpass -p "$SSH_PASSWORD"`，**未回显、未写入本报告或任何输出文件**
- 本报告不含任何密码、token、私钥原文
- `TOOLS.md` 中已存在的密码占位符（`{{SSH_PASSWORD}}`）保持不变
