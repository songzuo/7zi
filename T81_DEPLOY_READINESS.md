# T81 — 部署就绪度审查报告（只读，未部署）

**审查人**：🛡️ 系统管理员（子代理）
**时间**：2026-10-24 00:08 (GMT+8)
**范围**：`/root/.openclaw/workspace`（git repo `songzuo/7zi`，分支 `main`，HEAD = `a1914975fb`）
**结论**：🟡 **有条件就绪 — 代码层面低风险，但部署链路存在 3 个高危未决问题，需主人拍板后才能上线。**
**本次未执行**：未部署、未 push、未 commit、未重启任何服务、未修改任何线上文件（全程只读命令）。

---

## 1. 未提交改动清单与风险评级

共 **19 个已修改文件 + 9 个未跟踪文件**（`git status --short` 28 行，未跟踪项含更早的 DEV_TASKS 文档）。

### 1.1 代码改动（src/）

| # | 文件 | 改动量 | 内容摘要 | 风险 | 上线判断 |
|---|------|--------|---------|------|---------|
| 1 | `src/lib/error-handler.ts` | +1/-1 | `withErrorBoundary` 返回值由箭头函数改为具名 `function ErrorBoundaryWrapper(props: P)`（ESLint `react/display-name` 修复） | 🟢 极低 | 可上线（纯函数形式变更，行为等价） |
| 2 | `src/lib/plugins/PluginSandbox.ts` | +1/-1 | `code: string \| Function` → `string \| ((...args: unknown[]) => unknown)`（去 `Function` 宽类型） | 🟢 极低 | 可上线（仅类型收窄，运行时不变） |
| 3 | `src/lib/plugins/types.ts` | +1/-1 | 接口 `PluginSandbox.execute` 同步收窄 | 🟢 极低 | 可上线（接口与实现一致，无破坏） |
| 4 | `src/lib/monitoring/prometheus.js` | +11/-11 | 编译产物（`.js`）中 `_this` 箭头捕获改为 `this` | 🟡 **中** | ⚠️ **需确认**：这是 TS→JS 编译产物被手工/工具改写。若 `.ts` 源文件未同步改，**下次 build 会被覆盖回退**；若源已改则 OK，但源码被直接改到 `src/` 里属于反模式 |
| 5 | `src/lib/monitoring/web-vitals.ts` | +1/-1 | `requestIdleCallback` 类型从 `Function` 改为 `(cb: IdleRequestCallback) => number` | 🟢 极低 | 可上线（类型修复） |
| 6 | `src/lib/prefetch/hooks/use-prefetch.ts` | +80/-52 | 抽出纯函数 `performPrefetch()`；`useBatchPrefetch` 不再在循环里调用 `usePrefetch`（修复 react-hooks 违规） | 🟡 **中** | ⚠️ **需确认**：属运行时行为变更（重构）。原代码在循环里调 Hook 是 bug；新逻辑用默认 `globalPrefetcher` 而非 ref 里的实例，**批量预取可能与 `usePrefetch` 走不同 prefetcher 实例**，需回归验证 |
| 7 | `src/components/mobile/SwipeContainer.tsx` | +6/-6 | 3 个 `React.memo(() => {...})` 改为 `React.memo(function XImpl() {...})`（display-name lint） | 🟢 极低 | 可上线（组件名变化可能影响 React DevTools 显示名，不影响行为） |
| 8 | `src/components/room/RoomSettings.tsx` | +1/-1 | JSX 引号 `"` → `&quot;`（react/no-unescaped-entities） | 🟢 极低 | 可上线（显示文本一致） |
| 9 | `src/components/search/GlobalSearch.tsx` | +1/-1 | 同上 | 🟢 极低 | 可上线 |
| 10 | `src/components/workflow/NodeEditorPanel.tsx` | +1/-1 | 同上 | 🟢 极低 | 可上线 |
| 11 | `src/components/workflow/WorkflowEditorWithDraft.tsx` | +1/-1 | 同上 | 🟢 极低 | 可上线 |
| 12 | `eslint.config.mjs` | +133/-0 | 从**空文件**补全为完整 flat config（storybook + next core-web-vitals + typescript + 大量 ignores） | 🟡 **中** | ⚠️ 仅影响 lint/CI，**不影响运行时**。但 ignores 屏蔽了 `7zi-frontend/**`、`7zi-backend/**`、`scripts/**`、`tests/**` 等目录 → 主仓 lint 覆盖度下降，需主人确认是否接受 |

### 1.2 文档 / 状态改动

| # | 文件 | 改动量 | 风险 | 说明 |
|---|------|--------|------|------|
| 13 | `CHANGELOG.md` | +30/-14 | 🟢 无 | 文档 |
| 14 | `DEPLOYMENT.md` | +130/-45 | 🟢 无 | 文档（**重要**：与线上实际拓扑需比对，见 §4） |
| 15 | `README.md` | +29/-11 | 🟢 无 | 文档 |
| 16 | `docs/BACKEND_TESTING_GUIDE.md` | +56/-20 | 🟢 无 | 文档 |
| 17 | `memory/2026-10-23.md` | +62 | 🟢 无 | 记忆日志 |
| 18 | `memory/claw-mesh-state.json` | +2/-2 | 🟢 无 | 运行时状态 |
| 19 | `state/tasks.json` | +1290/-8 | 🟡 **中** | 任务运行时状态文件，纯追加日志。**建议不纳入版本库**（每次运行都变 → 每次提交都产生巨大 diff） |

### 1.3 未跟踪文件（9 个新文件 + 多个旧 DEV_TASKS）

`T67_BACKEND_BUGFIX_20261023.md`、`T70_BACKEND_FIXES.md`、`T72_FRONTEND_LINT_CLEANUP.md`、`T73_DOCS_SYNC.md`、`T75_BACKEND_LINT_WARNINGS.md`、`T76_ERROR_REPORTING_TESTS.md`、`DEV_TASKS_20261023_2035.md / 2101.md / 2105.md`
→ 🟢 纯 markdown 任务记录，**建议归档到 docs/ 或单独提交**，不要混进功能提交。

### 1.4 敏感文件审查 ✅

| 检查项 | 结果 |
|--------|------|
| `.env.secrets` 是否被 git 跟踪 | ✅ **未跟踪**（`git ls-files --error-unmatch .env.secrets` → 不在索引）；`.gitignore` 第 42-43 行已排除 |
| `.env.production` / `7zi-frontend/.env.production` | ⚠️ **已被 git 跟踪**（历史遗留），但**本次未修改**；内容为公开配置（`NODE_ENV`/`PORT`/`NEXT_PUBLIC_*`），未见密钥明文 |
| 本次 diff 中是否混入 env 文件 | ✅ 无（`git status` 无任何 `.env*` 条目） |
| 本次 diff 新增行中是否有密码/token/硬编码地址 | ✅ 无（已用 grep 扫 `password/secret/token/apiKey/http://` 等，仅命中 eslint 注释里的一个 URL） |
| `console.log` / 调试残留 | ✅ 无（新增行无 console.log/debug） |
| 硬编码 IP / localhost | ✅ 无 |

---

## 2. 线上只读健康检查结果

### 2.1 生产 7zi.com 源站（198.44.179.155，SSH key 可达 ✅）

```
主机名：mxwbkh1ni     运行时长：up 8 days 23:32
负载：load average 2.20 / 2.46 / 2.42
磁盘：/dev/vda1 50G，已用 28G (55%)，可用 23G
内存：11959 MB 总 / 11620 MB 已用 / 339 MB 可用  →  ⚠️ 内存 97.1%
```

**容器（全部 healthy）**：`octo-nginx / octo-web / octo-admin / octo-marketplace / octo-octo-server / octo-wukongim / octo-matter / octo-summary-api / octo-summary-worker / octo-mysql / octo-redis / octo-minio` — 12 个，均 `Up 8 days (healthy)`，端口 28080-28087 / 23306 / 26379 / 29000-29001。

**PM2**：`7zi-shop`(online) / `agenthub`(online) / `ai-7zi`(online) / `ge-website`(online) / **`anti-v2`(stopped, ↺10)** — anti-v2 已停 10 次重启，属遗留告警，与本次改动无关。

**监听端口**：nginx :80；next-server pid1543 :3003、pid755 :3004、pid1339 :3005(?)；node :19000/:8262/:10087-10089；postgrest :3007；docker-proxy :28080-28087。

**HTTP 健康检查**：
| 目标 | 结果 |
|------|------|
| `http://127.0.0.1:28080/` | ✅ 200（0.06s） |
| `http://127.0.0.1:28083/` | ✅ 200（0.09s） |
| `http://127.0.0.1:3000/api/health` | ❌ 000（**3000 端口无服务**；deploy.sh 的健康检查用 3000 → 会失败） |
| `http://127.0.0.1:3001/api/health` | ✅ 200 `{"status":"ok","timestamp":"2026-10-23T16:12:15.450Z"}` |
| `https://7zi.com/api/health` | ✅ 200 |
| `https://7zi.com/`（默认 curl UA） | ⚠️ **403**（WAF/机器人防护拦截 curl，非故障） |
| `https://7zi.com/`（浏览器 UA） | ✅ 200，`<title>China for free — Live, Learn</title>` |

**systemd --failed**：仅 `snap-*` 挂载单元失败（无关注解）；nginx `active`。

### 2.2 线上 7zi.com 实际架构（关键发现）

- 7zi.com / www.7zi.com / mainlander.cn 的 **vhost**：`/etc/nginx/sites-enabled/7zi.com`（28KB，2026-10-19 更新），nginx 由 systemd 管理。
- **首页是静态站**：`root /var/www/erhu-brand/china-for-free`（HTML + assets，最后修改 2026-10-11），**不是**本仓库的 Next.js 应用。
- `/api/health` → `proxy_pass http://127.0.0.1:3001`（next-server）。
- 预约接口 → `proxy_pass http://127.0.0.1:8321`；另有 `:3001` 直代。

### 2.3 服务器端仓库状态（`/opt/7zi-frontend`，deploy.sh 的目标目录）

```
HEAD = d523bcb1 "docs: 更新记忆文件"   ← 与本地 HEAD a1914975fb 【不同源】
git cat-file a1914975fb → fatal: not found   ← 服务器【没有】本地最新提交
git status --short | wc -l = 55          ← 服务器工作区有 55 个未提交改动
docker ps | grep 7zi-frontend → 空     ← 没有 7zi-frontend 容器在跑
存在 docker-compose.yml + Dockerfile；无 blue-green compose 文件
```

### 2.4 测试机 bot5.szspd.cn（182.43.36.134）

| 检查项 | 结果 |
|--------|------|
| HTTP `http://bot5.szspd.cn/` | ✅ 200（0.70s） |
| 端口 22 / 80 | ✅ OPEN |
| 端口 3000 / 3001 | ❌ closed |
| SSH 密码认证（`$SSH_PASSWORD`） | ❌ **Permission denied**（publickey,password 均失败；`.env.secrets` 中 `SSH_PASSWORD` 长度 10） |
| SSH key 认证 | ❌ Permission denied |
| → 结论 | **无法对 bot5 做服务级只读检查**（仅能确认 80 端口有响应）。需主人提供 bot5 的正确凭据或配置公钥 |

### 2.5 本地类型检查 ✅

`npx tsc --noEmit -p tsconfig.json` → **0 error（exit 0，无输出）**。
即本次 12 个 `src/` 改动的类型层面全部自洽，`PluginSandbox` 接口收窄与实现一致，无破坏性类型变更。

---

## 3. 待主人决策项（需拍板）

| # | 问题 | 我的建议 |
|---|------|---------|
| **Q1** | **部署目标是谁？** 本仓库（Next.js 7zi-frontend）当前**不是** 7zi.com 首页的提供方——首页是静态站 `/var/www/erhu-brand/china-for-free`，而 Next 服务在 3001/3003/3004。是要部署到 **bot5（测试）**、**/opt/7zi-frontend 容器**、还是**某条新链路**？ | 先在 bot5 验证，再灰度生产；不要直接碰生产 vhost |
| **Q2** | **本地与服务器代码不同源**（本地 `a1914975fb` 不在服务器 `/opt/7zi-frontend` 历史中，服务器另有 55 个未提交改动）。是走 **rsync（deploy.sh 默认，带 `--delete`）** 还是 **服务器端 git pull**？ | rsync `--delete` 会**直接抹掉服务器上那 55 个改动**，必须先备份/确认归属 |
| **Q3** | **服务器内存仅剩 339MB（97%）**，在源站执行 `docker build` / `next build` 极可能 OOM。是否允许**在本地或 CI 构建镜像后推送到服务器**？ | 强烈建议本地构建 + 传输镜像，禁止在源站构建 |
| **Q4** | **`src/lib/monitoring/prometheus.js` 是编译产物被改动**（`_this` → `this`）。是否要改回并只在 `.ts` 源文件修复？ | 应改 `.ts` 源，本地重新编译生成 `.js`，避免下次 build 覆盖回退 |
| **Q5** | **`use-prefetch.ts` 重构**：批量预取改用默认 `globalPrefetcher`，与 `usePrefetch` 的实例可能不一致 | 需跑一次预取回归；否则维持旧行为 + 只加 eslint-disable |
| **Q6** | **`eslint.config.mjs` 新增大量 ignores**（屏蔽 `7zi-frontend/**`、`7zi-backend/**`、`tests/**`、`scripts/**`） | 需主人确认接受主仓 lint 覆盖下降，或改为分别跑子项目 lint |
| **Q7** | **`state/tasks.json`（+1290 行运行时日志）是否入库** | 建议加入 `.gitignore`，或单独一次提交 |
| **Q8** | **bot5.szspd.cn 的 SSH 凭据失效**（密码+key 都不通） | 需要主人重新提供密码或授权我配置公钥，否则测试环境无法做部署前验证 |
| **Q9** | **`anti-v2` PM2 进程已 stopped（↺10 次重启）** | 与本次无关，但建议排查；需主人确认是否下线 |
| **Q10** | **本批改动是否要先合并到 `main` 并 push 到 `songzuo/7zi`？** | 建议分两笔提交：① 运行时代码（src/）② 文档/状态；本次**未执行任何 commit/push** |

---

## 4. 部署前检查清单（可直接执行 · 只读或低风险）

> 全部命令在**本地**执行；远端命令用 `ssh -o StrictHostKeyChecking=no root@198.44.179.155 '<cmd>'`（已验证 key 可用）。
> 密码一律用 `$SSH_PASSWORD` 占位：`sshpass -p "$SSH_PASSWORD" ssh ...`。

### A. 本地（提交前）— 必过

```bash
cd /root/.openclaw/workspace

# A1 类型检查（0 错误才算过）
npx tsc --noEmit -p tsconfig.json; echo "EXIT=$?"
# 预期：EXIT=0，无 error 输出

# A2 Lint（0 error，warning 允许但需登记）
npx eslint src/ --max-warnings 0; echo "EXIT=$?"
# 预期：EXIT=0

# A3 生产构建（本地构建，勿在源站构建 —— 见 Q3）
npm run build; echo "EXIT=$?"
# 预期：EXIT=0；Next.js build 成功；注意 .next 体积

# A4 确认没有敏感文件进入暂存区（先看，别 add）
git status --short
git diff --stat
git diff -U0 | grep -nE "^\+.*(password|secret|token|apiKey|BEGIN [A-Z ]*PRIVATE KEY)" 
# 预期：无输出

# A5 确认构建产物与源码一致（针对 prometheus.js）
grep -rn "_this" src/lib/monitoring/*.ts | head
# 预期：.ts 源文件里没有 _this（若有，说明改动没落到源码，见 Q4）

# A6 确认 state/tasks.json / DEV_TASKS 处理方式（见 Q7）
git check-ignore -v state/tasks.json || echo "NOT-IGNORED -> 需要决策"
```

### B. 远端只读预检（部署前 5 分钟）

```bash
# B1 源站资源（重点看内存）
ssh root@198.44.179.155 'free -m; df -h / | tail -1; uptime'
# 预期：available 内存 > 2048 MB（当前仅 339 MB → 不满足，禁止在源站构建）

# B2 容器状态
ssh root@198.44.179.155 'docker ps --format "{{.Names}}\t{{.Status}}" | sort'
# 预期：12 个 octo-* 全部 (healthy)

# B3 PM2 状态
ssh root@198.44.179.155 'pm2 list'
# 预期：7zi-shop / agenthub / ai-7zi / ge-website = online

# B4 关键 URL 探活（部署前基线）
ssh root@198.44.179.155 'curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" https://7zi.com/ ; curl -s -o /dev/null -w "%{http_code}\n" https://7zi.com/api/health'
# 预期：200 / 200（记录为基线，用于回滚对比）

# B5 目标目录现状与备份（备份是唯一有写入的动作，需主人批准）
ssh root@198.44.179.155 'cd /opt/7zi-frontend && git log --oneline -1 && git status --short | wc -l && ls -l docker-compose.yml'
# 预期：记录 HEAD=d523bcb1、55 个 dirty（见 Q2）

# B6 测试机（需有效凭据，见 Q8）
sshpass -p "$SSH_PASSWORD" ssh root@182.43.36.134 'docker ps --format "{{.Names}}\t{{.Status}}"; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health'
# 预期：容器 healthy + 200（当前凭据失败，先解决 Q8）

# B7 备份（⚠️ 有写入，需主人明确批准后执行）
ssh root@198.44.179.155 'cd /opt && tar czf /opt/backups/7zi-frontend-pre-t81-$(date +%Y%m%d_%H%M%S).tar.gz 7zi-frontend --exclude=7zi-frontend/node_modules --exclude=7zi-frontend/.next 2>/dev/null; ls -lh /opt/backups/ | tail -3'
# 预期：生成 tar.gz 并列出文件
```

### C. 部署（**本次禁止执行**，待主人批准后按此流程）

```bash
# C0 前置：Q1~Q10 全部拍板 + A1~A5 全绿 + B1 内存达标
cd /root/.openclaw/workspace
git add src/ eslint.config.mjs          # 仅代码，不含 state/tasks.json
git commit -m "fix(lint): T69-T76 后端/前端 lint 与错误处理清理"
# 主人批准后：git push origin main

# C1 测试机先行（bot5）
ENVIRONMENT=staging bash deploy.sh      # 或 deploy-scripts/deploy-7zi-bot5.sh

# C2 生产：蓝绿 + 健康检查（deploy.sh 内置）
ENVIRONMENT=production bash deploy.sh
# deploy.sh 关键步骤：rsync --delete → docker-compose build → up blue/green →
# nginx reload → curl https://7zi.com/api/health → 失败自动回滚
```

### D. 回滚方案

| 层级 | 回滚命令 | 预期 |
|------|---------|------|
| **L1 容器级（最快）** | `ssh root@198.44.179.155 'cd /opt/7zi-frontend && docker-compose -f docker-compose.yml up -d <上一个 green slot>'` | 切回上一 slot，nginx reload 后立即生效（<1 min） |
| **L2 镜像级** | `ssh root@198.44.179.155 'docker images | grep 7zi-frontend'` 找到上一个 tag → `docker tag <old> 7zi-frontend:latest && docker-compose up -d --force-recreate` | 恢复旧镜像 |
| **L3 源码级** | `ssh root@198.44.179.155 'cd /opt/7zi-frontend && git reset --hard <HEAD>'`（**注意：会丢弃服务器 55 个 dirty 改动，务必先备份**，见 B7） | 回到 d523bcb1 |
| **L4 文件级** | `ssh root@198.44.179.155 'cd /opt && tar xzf /opt/backups/7zi-frontend-pre-t81-*.tar.gz'` | 从备份完整恢复 |
| **L5 源站整体** | Cloudflare 侧临时改 DNS / 源站切 maintenance 页 | 极端情况隔离 |
| **回滚触发条件** | `curl https://7zi.com/api/health` 非 200，或首页 5xx 持续 >60s，或 PM2/容器状态非 online/healthy | 立即执行 L1 |

---

## 5. 遗留问题

1. **bot5.szspd.cn 无法 SSH**（密码 + key 均被拒）→ 测试环境部署前验证被阻断（Q8）。
2. **源站内存 97%**（可用 339MB）→ 任何源站构建都会 OOM（Q3）。
3. **3000 端口无服务**，而 `deploy.sh` 的健康检查用 `http://localhost:3000/api/health` 与 `http://localhost:3000/` → **deploy.sh 现有健康检查逻辑会误判失败并触发自动回滚**，需先修正为 3001/8443/28080（Q2 相关）。
4. **服务器 `/opt/7zi-frontend` 与本地不同源**，且有 55 个未提交改动 → rsync `--delete` 会造成**不可逆丢失风险**（Q2）。
5. **`prometheus.js` 编译产物被直接修改** → 下次 build 覆盖回退（Q4）。
6. **`use-prefetch` 批量预取换了 prefetcher 实例** → 需回归（Q5）。
7. **`systemctl --failed`** 显示多个 `snap-*` 挂载失败（chromium/gnome/cups 等）→ 与站点无关，但说明机器上装了无用 snap，可择机清理（不在本次范围）。
8. **PM2 `anti-v2` stopped（↺10）** → 遗留故障进程（Q9）。
9. **无 `7zi-frontend` 容器在跑**，但 `/opt/7zi-frontend` 存在 compose 文件 → deploy.sh 若执行 blue-green，会**新建一套与当前生产拓扑无关的容器**，务必先确认 Q1。
10. 本地 `tsc --noEmit` 已通过（0 error）；但**尚未跑 `npm run build`**（Next.js 生产构建 + Docker 构建）验证，源站内存不足无法代劳，需在本地/其他机器补做（见 A3）。
11. **Cloudflare/WAF 对默认 UA 返回 403** → 所有健康检查/监控脚本必须带浏览器 UA，否则误判站点故障。

---

## 6. 本次执行动作清单（审计）

- ✅ `git status --short` / `git diff --stat` / 逐文件 diff 审查（只读）
- ✅ `npx tsc --noEmit`（本地，只读编译检查）
- ✅ SSH 只读命令到 198.44.179.155（hostname/uptime/df/free/docker ps/systemctl/pm2/ss/curl/ls/git log）
- ❌ 未执行 deploy.sh / 未 rsync / 未 docker build / 未 restart / 未 pm2 reload
- ❌ 未 git add / commit / push
- ❌ 未修改任何线上文件（备份命令 B7 仅列为清单，**未执行**）
- ❌ 报告中未出现明文密码（统一使用 `$SSH_PASSWORD`）
