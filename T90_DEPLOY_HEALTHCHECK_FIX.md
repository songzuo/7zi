# T90 — 部署脚本健康检查误判修复（决策清单 D10 / P2）

- 执行人：系统管理员子代理
- 日期：2026-10-24
- 范围：仅修改 `deploy.sh`、`7zi-frontend/deploy.sh`（+ 本报告）
- 未执行任何远端部署（未 ssh deploy / 未 rsync / 未对远端执行 docker 命令 / 未 git add·commit·push）

---

## 1. 事实复核（证据）

### 1.1 缺陷代码（原 `deploy.sh` L187-230 区间）

原 `health_check()` 用**宿主机** `localhost:3000` 判定服务存活：

```bash
# 原 deploy.sh L204
if ssh_cmd "curl -sf http://localhost:3000/ > /dev/null 2>&1"; then
# 原 deploy.sh L214
if ssh_cmd "curl -sf http://localhost:3000/api/health > /dev/null 2>&1"; then
# 原 deploy.sh L224
if ssh_cmd "curl -sf http://localhost:3000/works > /dev/null 2>&1"; then
```

三个 URL 全部指向宿主机 3000，且 `/works` 路由在本仓库中**不存在**（`find src/app -type d -name works` → 无结果；`src/app/[locale]/` 下只有 about / agent-dashboard / analytics / blog / contact / dashboard / knowledge-lattice / performance / portfolio / scheduler / settings / tasks / team）。

### 1.2 3000 是**容器内部端口**，不是宿主机对外服务端口

| 证据 | 位置 | 内容 |
|---|---|---|
| 镜像监听端口 | `Dockerfile:67-68,91` | `ENV PORT=3000` / `ENV HOSTNAME="0.0.0.0"` / `EXPOSE 3000` |
| 镜像健康检查（容器内） | `Dockerfile:95` | `CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"` |
| 同上（prod 镜像） | `7zi-frontend/Dockerfile:69,72,77` / `7zi-frontend/Dockerfile.production-optimized:66,83,87` | 同样是 `localhost:3000/api/health` |
| compose 端口映射 | `7zi-frontend/docker-compose.prod.yml:7-8`、`docker-compose.yml`（根） | `ports: - '3000:3000'`（或 `${PORT:-3000}:3000`） |

即：所有健康检查 URL 都写在**容器内部**语境下，宿主机侧要用 3000 必须在容器内执行。

### 1.3 生产源站实测（证据来自 T81 只读巡检报告 `T81_DEPLOY_READINESS.md` L84-86、L96、L115）

```
| http://127.0.0.1:3000/api/health | ❌ 000（3000 端口无服务） |
| http://127.0.0.1:3001/api/health | ✅ 200 {"status":"ok",...}     |
| https://7zi.com/api/health        | ✅ 200                          |
```

- `T81_DEPLOY_READINESS.md` L247 明确记录了本缺陷：
  > "**3000 端口无服务**，而 `deploy.sh` 的健康检查用 `http://localhost:3000/api/health` 与 `http://localhost:3000/` → **deploy.sh 现有健康检查逻辑会误判失败并触发自动回滚**"
- `T81_DEPLOY_READINESS.md` L96：生产 `/api/health` → `proxy_pass http://127.0.0.1:3001`（next-server）。
- `T81_DEPLOY_READINESS.md` L115：端口 3000/3001 外部 closed（公网），仅 80/443 可用。
- `T81_DEPLOY_READINESS.md` L105：`docker ps | grep 7zi-frontend` → 空（当前没有 7zi-frontend 容器在跑，线上是 next-server/PM2 混合拓扑）。

### 1.4 对外入口 = nginx 反代（本仓库内配置）

| 配置 | 位置 | 上游 |
|---|---|---|
| nginx 主配置 | `nginx/nginx.conf`（`upstream frontend` → `server 7zi-frontend:3000`） | 容器名 + 容器内 3000 |
| 蓝绿 upstream | `nginx/conf.d/upstream.conf` | `server 7zi-frontend-blue:3000` / `-green:3000` |
| 站点 vhost | `7zi-nginx.conf`（`location /health` → `proxy_pass http://7zi-frontend:3000/health`） | 容器名 + 容器内 3000 |
| SSR 站点 vhost | `nginx/7zi-ssr.conf`（`proxy_pass http://127.0.0.1:3000`） | 宿主机 3000（PM2 模式，与 docker 模式不同） |

**结论：nginx 上游写的是容器网络内的 `7zi-frontend*:3000`，宿主机 `localhost:3000` 在 docker 拓扑下永远打不到应用。**

### 1.5 `/api/health` 端点确实存在（由本仓库 Next.js 应用提供）

- 路由文件：`src/app/api/health/route.ts`（GET/HEAD）
- 返回结构：`{ success: true, data: { status: 'healthy' | 'unhealthy', timestamp, uptime, version, checks: {...} } }`（`src/app/api/health/route.ts` L100-113）
- 200 / 503 语义：`status === 'unhealthy' ? 503 : 200`（L109）
- 另有 `src/app/api/health/live`（liveness）、`/ready`、`/detailed` 子路由
- 容器健康检查引用的正是该端点（`Dockerfile:95` 等），说明 **`/api/health` 是应用真实存在的健康端点**

### 1.6 WAF 拦截默认 curl UA

`T81_DEPLOY_READINESS.md` L89、L126：默认 curl UA 请求 `https://7zi.com/` 返回 **403**，带浏览器 UA 才 200 → 健康检查必须带浏览器 UA，否则同样误判。

### 1.7 另两处同类隐患（本次一并修正）

- `deploy.sh` L439（最终验证）：`curl -sf https://7zi.com/api/health`，`-f` + 默认 UA → 受 WAF 影响的误判风险。
- `deploy.sh` L494（回滚校验）：调用同一个坏掉的 `health_check`。
- `deploy.sh` L704（`./deploy.sh health` 子命令）：`local` 在 case 分支中非函数体 → bash 报错 `local: can only be used in a function`（L760），该子命令本身就是坏的。

### 1.8 `7zi-frontend/deploy.sh` 的健康检查（另一份副本）

`7zi-frontend/deploy.sh` L197-233 的 `health_check()` 用 `https://7zi.com/api/health`，方向是对的（走 nginx 公开入口），但有两个缺陷：
1. `curl -f -s` 默认 UA → 受 WAF 403 影响；
2. 解析 `.status` / `.responseTime`，而实际响应是 `{ success, data: { status } }` → `.status` 恒为 `null` → 每次都打印误导性的 "Health status is 'null'"。

---

## 2. 根因

`health_check()` 把**容器内部监听端口**（3000）当成了**宿主机对外服务端口**来探测。docker 拓扑下应用只在容器网络命名空间内监听 3000，宿主机 `curl http://localhost:3000/` 必然连接被拒（curl 返回 000）。因此：

- 第 2 步（基础 HTTP）100% 失败 → 循环 15 次（约 45s）后 `return 1`
- 调用点 `deploy.sh` L461（蓝绿发布后）、L548（回滚校验）、L591（版本回滚）、L760（health 子命令）全部拿到失败 → **误判部署失败 → 触发自动回滚**

叠加 `/works` 路由根本不存在、默认 curl UA 被 WAF 拦这两个次生缺陷。

---

## 3. 判定依据（为什么这样改）

1. **权威依据 = 容器内自检。** Dockerfile/compose 的 healthcheck 一律用 `localhost:3000/api/health`，即"应用是否真的在跑、/api/health 是否真的返回 200"只有容器内知道。宿主机的 3000 在 docker 拓扑下无意义 → 必须 `docker exec <cid> node -e ...` 在容器内访问 `127.0.0.1:3000/api/health`。
   - 判定"**待发布槽位是否可用**"（蓝绿切换前，新槽位还没挂到 upstream，公开入口此时仍指向旧槽位）→ 容器内自检是唯一正确依据。
2. **用户可见链路 = 公开入口。** 生产 `/api/health` 由 nginx 反代（`nginx/nginx.conf` upstream / `nginx/conf.d/upstream.conf` / `7zi-nginx.conf`），线上实测 `https://7zi.com/api/health` 200 → 公开入口探测有效，但它是**整站级**信号，不能用来判定单个新槽位。
3. **两者关系 = 容器内是必要条件，公开入口是充分性补充。** 因此设计为：容器内失败 → 硬失败（重试后 return 1）；公开入口失败 → 默认仅告警（蓝绿切换前属正常），仅在 `strict` 模式下（回滚校验 / `health` 子命令，此时流量已切到被检槽位）才硬失败。
4. **必须带浏览器 UA**（依据 1.6 的 403 实证），且用 `-w '%{http_code}'` 显式判 200，而不是 `curl -f`。
5. **不改 compose / nginx。** 依据 1.2-1.4，3000 出现在 `EXPOSE`/`ports`/nginx upstream 里都是**正确**的（容器网络语义），无需改动任何 compose 或 nginx 配置 —— 本次改动限于两个 shell 脚本。
6. **`/works` 检查删除。** 依据 1.1，该路由不存在，属于"历史页面路径"的过期假设，保留即必然失败。

---

## 4. 改动内容

### 4.1 `deploy.sh`（784 行；改前 730 行，净增 54 行）

新增 3 个可配置项 + 2 个辅助函数，重写 `health_check()`，并修正 3 处调用点。

| 位置 | 改动 |
|---|---|
| L187-205 | 新增拓扑说明注释块（引用本报告） |
| L206-208 | 新增 `HEALTH_INTERNAL_PORT`（默认 3000）、`HEALTH_PUBLIC_URLS`（默认 `http://127.0.0.1/api/health https://7zi.com/api/health`）、`HEALTH_BROWSER_UA`（浏览器 UA），均可用环境变量覆盖 |
| L210-216 | 新增 `remote_http_ok()`：远程 curl 取 `%{http_code}`，带 `-L --max-time 15` + 浏览器 UA + `Host: 7zi.com`，仅 200 判通过 |
| L218-228 | 新增 `container_http_ok()`：先取**精确容器 ID**（`docker ps --format '{{.ID}}'`），再 `docker exec <cid> node -e "http.get('http://127.0.0.1:3000/api/health', ...)"`。用容器 ID 而非 name，避免 name 前缀命中多容器时 `docker exec` 报 "multiple containers" |
| L230-289 | 重写 `health_check()`：①容器 running → ②容器内 `/api/health` 200 → ③公开入口 200；新增第二参数 `mode`（`strict` 时公开入口失败也硬失败）；`target` 为空/`null` 时退化为纯公开入口巡检 |
| L493 | 最终验证：`curl -sf ...` → `remote_http_ok "https://7zi.com/api/health"` |
| L548 | 回滚校验：`health_check "7zi-frontend-$target_slot"` → 加 `"strict"`（流量已切换，公开入口必须可用） |
| L759-760 | `health` 子命令：去掉 case 分支里的 `local`（bash 会报 `local: can only be used in a function`），并传 `"strict"` |

**删除**的三项检查（原 L204/L214/L224）：宿主机 `http://localhost:3000/`、宿主机 `http://localhost:3000/api/health`、宿主机 `http://localhost:3000/works`。

### 4.2 `7zi-frontend/deploy.sh`（349 行）

| 位置 | 改动 |
|---|---|
| L205-206 | `health_url` 改为 `${HEALTH_URL:-https://7zi.com/api/health}`；新增 `health_ua`（浏览器 UA） |
| L212 | `curl -f -s "$health_url"` → `curl -f -s -L --max-time 15 -A "$health_ua" "$health_url"` |
| L216-219 | 状态解析改为 `.data.status // .status // "unknown"`（匹配 `{success, data:{status}}` 真实结构），并移除不存在的 `.responseTime` 字段 |
| L221 | 判定放宽为 `healthy` / `ok` / `unknown` 均不告警（`ok` 是线上 next-server 的实际返回值，见 T81 证据 `{"status":"ok",...}`） |

---

## 5. 校验输出

### 5.1 语法校验

```
$ bash -n deploy.sh ; echo "exit=$?"
exit=0
$ bash -n 7zi-frontend/deploy.sh ; echo "exit=$?"
exit=0
```

### 5.2 本地逻辑验证（mock `ssh_cmd`，无任何远端调用）

抽取 `health_check` + 两个辅助函数到 `/tmp/t90/hc.sh`，用 mock 的 `ssh_cmd` 覆盖四种场景：

| 场景 | 默认模式 | `strict` 模式 |
|---|---|---|
| 容器内 OK + 公开入口 OK | ✅ 通过（exit=0），打印"容器内健康检查通过"+"公开入口健康检查通过" | ✅ 通过（exit=0） |
| 容器内 OK + 公开入口 FAIL | ✅ 放行（exit=0）+ `⚠️ 公开入口健康检查未通过（容器内检查已通过），继续放行` | ❌ 重试 15 次后 `❌ 健康检查失败`（exit=1） |
| 容器内 FAIL | ❌ 重试 15 次后 `❌ 健康检查失败`（exit=1） | ❌ 同左 |

实测输出片段（默认模式 + 公开入口失败）：

```
[STEP] 健康检查: 7zi-frontend-blue
[INFO] ✅ 7zi-frontend-blue 容器内健康检查通过 (127.0.0.1:3000/api/health)
[WARN] ⚠️  公开入口健康检查未通过（容器内检查已通过），继续放行
exit=0
```

### 5.3 其他静态校验

- `node -e "require('http').get(...)"` 表达式在本机实测可用（连接失败时正确 `exit 1`）。
- 生成的远端命令串经 bash 实测展开正确：
  `docker exec abc123 node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"`
- `shellcheck` 本机未安装（`shellcheck NOT installed`），故以 `bash -n` + mock 运行代替。
- `set -e` 兼容性：`[ -z "$cid" ] && return 1` 作为函数内非末位语句时不会触发 `set -e` 误退出（已用 `set -e` 最小用例验证 `rc=0` 且函数继续执行）。

---

## 6. 遗留问题 / 风险

1. **生产真实拓扑与本仓库 compose 仍不一致（阻塞项，非本次范围）。** T81 实测：线上 `/api/health` → `proxy_pass http://127.0.0.1:3001`（next-server / PM2 混合），且 `docker ps | grep 7zi-frontend` 为空；本仓库 `deploy.sh` 假定的是 docker 蓝绿（`7zi-frontend-blue/green` + nginx upstream 切换）。本次只修"健康检查怎么探"，**没有**修"部署目标与线上拓扑不匹配"这一更大的问题。真正上线前仍需主人拍板 Q1/Q2（见 `T81_DEPLOY_READINESS.md` §3）。
2. **`docker-compose.zero-downtime.yml` 不存在。** `deploy.sh` 的 `get_compose_file()` 在 production 环境返回该文件名，但仓库里只有 `docker-compose.yml` / `docker-compose.prod.yml` / `docker-compose.prod.optimized.yml`（根目录与 `7zi-frontend/`），`find . -name docker-compose.zero-downtime.yml` → 无结果。生产发布路径本身会在这一步失败 —— **超出本次范围，未改动**（避免扩大 diff），但需要单独修。
3. **公开入口 URL 列表需按实际拓扑复核。** 默认 `HEALTH_PUBLIC_URLS="http://127.0.0.1/api/health https://7zi.com/api/health"`；生产 nginx 的 `location /health`（不是 `/api/health`）在 `nginx/nginx.conf` 里是**静态 `return 200 "healthy\n"`**，而 `/api/health` 由 `location /api/` 反代到应用。若线上 vhost 与仓库 nginx 配置一致，`http://127.0.0.1/api/health` 可用；否则需按线上 `/etc/nginx/sites-enabled/7zi.com` 调整。已通过 `HEALTH_PUBLIC_URLS` 环境变量留出覆盖点，**默认非 strict 模式下公开入口失败只告警**，不会造成误回滚。
4. **源站内存 97%（可用 339MB）**（T81 L87）→ 服务器上构建会 OOM，与健康检查无关，但会阻碍真实上线验证。
5. **Cloudflare/WAF 403**：`remote_http_ok` 已带浏览器 UA，但若 WAF 对 `/api/health` 也有规则，仍可能误判；strict 模式下会硬失败。可通过 `HEALTH_PUBLIC_URLS` 只保留源站直连 URL 规避。
6. **未做真实远端验证**（任务硬约束：禁止执行远端部署命令）。首次真实上线前建议先单独跑 `./deploy.sh health`（已修为 strict 模式）观察输出。

---

## 7. 执行动作清单（审计）

- ✅ 读取 `deploy.sh`（全文）、`7zi-frontend/deploy.sh`、`docker-compose*.yml`（根 / 7zi-frontend / deploy / deploy-scripts）、`nginx/nginx.conf`、`nginx/conf.d/upstream.conf`、`nginx/7zi-ssr.conf`、`7zi-nginx.conf`、`Dockerfile*`、`src/app/api/health/route.ts`、`7zi-frontend/scripts/deploy/blue-green-deploy.sh`、`T81_DEPLOY_READINESS.md`
- ✅ 修改：`deploy.sh`、`7zi-frontend/deploy.sh`
- ✅ `bash -n` 语法校验通过（两文件均 exit=0）
- ✅ 本地 mock 逻辑验证（4 场景 × 2 模式）
- ❌ 未执行 `deploy.sh` / 未 rsync / 未对远端执行 docker 命令 / 未 ssh 到生产机做部署
- ❌ 未 git add / commit / push
- ❌ 未修改 `src/**`、`tests/**`、任何 `docker-compose*.yml`、`nginx/*`

---

## 8. 补充说明：仓库中存在并行的同类提交（非本代理执行）

复核 `git log` 时发现，本次任务执行期间，仓库出现了由**其他并行会话/进程**产生的提交，内容与本任务高度重合：

```
c196ebb030 fix(deploy): 健康检查改用容器内自检，修掉"打错端口导致误回滚"
            7zi-frontend/deploy.sh | 17 ++++---
            deploy.sh              | 118 +++++++++++++++++++++++++++--------------
394475735d fix(deploy): 移除 case 分支中误用的 local 关键字
            deploy.sh | 3 ++-
```

- 本代理**未执行** `git add` / `git commit` / `git push`（硬约束）。
- 上述提交把本代理工作区中的主体改动（容器内自检、公开入口探测、strict 模式、UA 修正）先行纳入了 HEAD。
- 本代理工作区当前相对 HEAD 仍保留 2 处增量修正（**未提交**，留给主人审阅）：
  1. `deploy.sh` `container_http_ok()`：`cid=$(...)` 追加 `|| true`，避免 `set -e` 下 `tr` 管道异常导致脚本整体退出。
  2. `7zi-frontend/deploy.sh` `health_check()`：状态告警判定放宽到 `healthy` / `ok` / `unknown`（线上 next-server 实际返回 `{"status":"ok",...}`，见 T81 证据），避免每次上线都刷误导性告警。
- 建议主人 review 上述 2 处未提交增量与 `c196ebb030` / `394475735d` 两个提交，确认无冲突后再决定是否提交。
