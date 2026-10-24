# 待主人拍板决策清单 — 2026-10-24

**汇总人**：📚 咨询师（T86） | **生成时间**：2026-10-24 05:38–05:55 (Asia/Shanghai)
**来源**：`STAGE_REPORT_20261023.md`、`T81_DEPLOY_READINESS.md`、`HEARTBEAT.md` 遗留段、
`~/.openclaw/cron/jobs.json` 与 `~/.openclaw/cron/runs/*.jsonl` 实测、SSH 实连、模型端点实探、git 实测。
**执行动作**：全部为**只读**核实；未改代码、未 `git add/commit/push`、未部署、未改线上文件。

> 阅读约定：每条给出 **问题 → 影响 → 建议方案 → 默认不处理的后果**。
> 标注「实测」的结论都是本轮亲自跑出来的；未验证的一律写「待验证」。

---

## 优先级速览

| 级别 | 编号 | 一句话 |
|---|---|---|
| 🔴 P0 | D1 | botmem 仓库 git 历史里有一个**真实形态**的 GitHub PAT 从未吊销 |
| 🔴 P0 | D2 | 本地领先远程 **30 个提交**没 push，源码与线上严重脱节 |
| 🟠 P1 | D3 | bot3 / bot4 SSH 全部拒认，集群三台失联 |
| 🟠 P1 | D4 | 模型提供商只剩 minimax 一家，子代理并发能力归零 |
| 🟠 P1 | D5 | cron 的 rate-limit 失败集中（实测 203 次），但「挤在整点」的归因**不成立** |
| 🟡 P2 | D6 | bot5 每 5 分钟推送一次，写放大 |
| 🟡 P2 | D7 | 仓库 git 历史含 5.9 万个 node_modules 路径，`.git` 已膨胀到 241M/361M |
| 🟡 P2 | D8 | 部署目标未定义 + `rsync --delete` 会抹掉服务器 55 个未提交改动 |
| 🟡 P2 | D9 | 源站内存只剩 339MB（97%），不能在上面构建 |
| 🟡 P2 | D10 | `deploy.sh` 健康检查打 3000 端口（无服务）→ 部署必然误判回滚 |
| 🔵 P3 | D11 | `state/tasks.json` 每次运行都变，+1290 行 diff |
| 🔵 P3 | D12 | `prometheus.js` 是编译产物被直接改 |
| 🔵 P3 | D13 | `use-prefetch` 批量预取换了 prefetcher 实例，需回归 |
| 🔵 P3 | D14 | 后端 CI 未覆盖 `websocket-service` / `workflow-service` |
| 🔵 P3 | D15 | `anti-v2` PM2 进程反复重启 ↺10 |

---

## 🔴 P0

### D1 · botmem 仓库历史中的 GitHub PAT 未吊销

**问题**
实测在 `/tmp/botmem-upload/botmem`（`songzuo/botmem` 的本地克隆）的 **git 历史对象**中扫到一个
真实形态的 PAT（形如 `ghp_` + 36 位字母数字，**此处刻意不回显原文**）。

另有占位符 `ghp_abcdefghijklmnopqrstuvwxyz123456` 与 `ghp_xxxxxxxx…`（后者是文档模板，非真实）。
`7zi` 仓库历史里只扫到**占位符** `ghp_xxxxxxxx…`，未发现真实 PAT。
`HEARTBEAT.md` 第 6 节记录：2026-10-22 在 bot4 上发现 `/var/log/botmem-*.log`、`claw-mesh.log`
里有 1200+ 处失效 token 明文。

**影响**
- 只要该 PAT 仍然有效，任何拿到仓库历史的人都能读取/写入 `songzuo/botmem`（含各节点
  `memory/claw-mesh-state.json`、工作区文件同步内容）。
- 历史里的 token **不会因为删掉当前文件而消失**——`git log -p` 就能翻出来。
- 日志里的明文 token 即使已失效，也会污染日志系统（`HEARTBEAT.md` 提到的「全仓库脱敏 sed
  把脚本自己的 token 改坏」的自我破坏风险仍然存在）。

**建议方案**（需主人授权，我不会自行执行）
1. **先吊销**：在 GitHub Settings → Developer settings → Personal access tokens 里
   **吊销/重置**该 PAT，并生成新的、权限最小化的新 token（只读 + 单仓库即可）。
2. **再轮换**：把新 token 写进各节点 `~/.openclaw/cron/clawmesh-credential.sh`，
   **脚本内一律不写明文**（HEARTBEAT 第 6 节已有此约定）。
3. **清理历史**（可选，风险最高）：`git filter-repo` / BFG 重写 `botmem` 历史 + 强制推送。
   5 台节点都在克隆这个仓库，重写后**所有节点必须重新克隆**，否则会持续推送旧历史。
4. **清理日志**：对 `/var/log/*.log` 做一次定向脱敏，脱敏后再跑一次推送脚本验证（避免
   又把脚本里的 token 一起 sed 掉）。

**默认不处理的后果**
旧 PAT 一旦被他人利用，`botmem` 仓库内容可被任意改写——包括各节点的
`claw-mesh-state.json` 状态文件，**可以伪造"节点健康"**让监控失去意义；也会污染 botmem 仓库历史，
后续任何「仓库已被克隆到第三方机器」的追溯都无解。

---

### D2 · 本地领先远程 30 个提交未 push（且已被改写过一次）

**问题**
实测：

| 项 | 值 |
|---|---|
| `origin` | `https://github.com/songzuo/7zi.git`（另有 `7zi` / `botmem` / `ssh` 三个 remote） |
| `origin/main` HEAD | `17cf105a92`（2026-10-23 00:44） |
| 本地领先 | **30 个提交**（`git rev-list --count origin/main..HEAD`） |
| 工作区 | 5 个已修改文件（`HEARTBEAT.md` / `eslint.config.mjs` / `memory/claw-mesh-state.json` / `src/lib/monitoring/prometheus.js` / `state/tasks.json`）+ 1 个未跟踪文件 |

注：`STAGE_REPORT_20261023.md` 记的是「领先 11 个提交」，现已扩大到 **30 个**；
其中 `d2d0dd412a`…`3254d4838e` 是 00:32–00:46 一小时内连续入库的（与 T81 审查、
门禁归零、collab 防御性修复相关）。

**影响**
- 远程仓库上的代码是 **10-23 00:44 的旧版**，缺后端 CI 门禁、根级 lint 归零、
  `retry.ts` 修复、collab 防御性修复等全部近期成果。
- `botmem` 仓库同期被 `forced update`（实测 fetch 时出现 `62df0668f4...9092f844b4 (forced update)`），
  说明**远端历史已经被重写过至少一次**——继续积压只会让将来再做一次历史重写更贵。
- 远程 `backend-ci.yml` 从未在真实 GitHub Actions 上跑过首次运行（至今仍「尚未首跑」）。

**建议方案**
1. **先备份**：本地 `git branch backup/pre-push-20261024`（只建分支，不 push）。
2. **拆成两笔提交**再推：
   - ① 运行时代码（`src/`、`eslint.config.mjs`、`7zi-backend/`、`7zi-frontend/`）
   - ② 文档 / 状态（`CHANGELOG.md`、`README.md`、`HEARTBEAT.md`、报告 md）
   `state/tasks.json` 建议**不进版本库**（见 D11）。
3. **推完盯一次 Actions**：观察 `Backend CI` 首次真实运行结果（当前仍是"尚未首跑"状态）。
4. **推之前扫敏感信息**：`git diff -U0 | grep -nE "^\+.*(password|secret|token|apiKey|BEGIN [A-Z ]*PRIVATE KEY)"`
   应无输出。

**默认不处理的后果**
- 30 个提交的成果只存在于 bot6 一台机器的 `.git` 里（361M），**单点故障即全部丢失**。
- 其他人 / CI / 生产环境看到的都是旧代码，「门禁全绿」这个结论在远程无法复现。
- 一旦 bot6 重装或磁盘故障，本轮所有修复（lint 归零、retry 修复、collab 防御、覆盖率修复）**归零**。

---

## 🟠 P1

### D3 · bot3 / bot4 SSH 全部拒认（集群三台失联）

**问题**
实测（本轮 05:44）：

| 节点 | 结果 |
|---|---|
| bot3 | ❌ `Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password)` |
| bot4 | ❌ 同上 |
| bot5 | ✅ 用 `~/.ssh/id_bot6_ed25519` 可登录（hostname 返回 `ecm-cd59`）；但用默认 `id_ed25519` / 密码均被拒 |

历史记录：2026-10-22 在 bot4 上从 bot4 → bot2/3/5/6 全部 `Permission denied (publickey)`；
bot4 公钥指纹 `selfadm-bot4 SHA256:HVsRFkhJH6LJBZsPD3XbDVtyoHO45Ow3sjVx64NTtQM`。
`STAGE_REPORT_20261023.md` 另记：`.env.secrets` 里的 `SSH_PASSWORD` 与本机 6 个私钥对 bot3/bot4 **两台机器均 Permission denied**。

**影响**
- 集群巡检清单的**第 2/3/4/5 项（节点状态、时钟一致性、失效 cron、防火墙误伤）在 bot3/bot4 上完全做不了**——
  这四项恰恰是 2026-10-22 抓出「同步脚本已死 6 个月」「时钟偏移 6 小时」「防火墙误伤」的那几项。
- 只能退回到「读 botmem 仓库里各节点推上来的 state 文件」间接核对，而这只证明**它最后一次同步时是健康的**，
  不能证明它现在还活着（HEARTBEAT 第 2 节已明确写了这条局限）。
- bot5 的 `crontab -l` 实测仍为 `*/5 * * * *`（见 D6）。

**建议方案**（二选一，需主人选）
1. **主人重新提供 bot3/bot4 的密码**，或
2. **主人授权把 bot6 公钥写入 bot3/bot4 的 `~/.ssh/authorized_keys`**（需主人在那两台机器上执行，
   或提供可用凭据让我代劳），并顺手把 bot4 的公钥补进其它节点（这是 10-22 遗留至今的老问题）。

**默认不处理的后果**
- bot3/bot4 变成**不可观测的盲节点**：它们仍会往 botmem 推文件，但没人知道它们是否还在跑、
  时钟是否偏移、cron 是否失效、iptables 是否误伤。
- 集群实际只剩 bot5 + bot6 可管，「5 台集群」的安全冗余是假的。

---

### D4 · 模型提供商只剩 minimax 一家可用（子代理并发能力归零）

**问题**
实测四个 provider 的 `/chat/completions` 端点（2026-10-24 05:47）：

| provider | baseUrl | 实测结果 |
|---|---|---|
| `minimax` | `https://api.minimaxi.com/v1` | ✅ **HTTP 200** |
| `coze` | `https://3138fb57-….dev.coze.site/api/v1` | ❌ HTTP 500 `no sandbox ID found for taskID` |
| `custom1` | `https://code.coolyeah.net/v1` | ❌ HTTP 401 「认证错误：身份验证失败，请检查 API Key」 |
| `volcengine` | `https://ark.cn-beijing.volces.com/api/v3` | ❌ HTTP 404 `InvalidEndpointOrModel.NotFound` |

`~/.openclaw/openclaw.json` 的 `agents.defaults.model` = `primary: minimax/MiniMax-M2.7`，
`fallbacks: [minimax/MiniMax-M2.7]`（**fallback 与 primary 是同一家**，等于没有兜底）。

**影响**
- **所有子代理共用同一个 provider、同一个模型、同一个配额池**。
  这直接解释了 `STAGE_REPORT_20261023.md` 里的现象：连续两轮（T55–T59、T60–T62）子代理
  任务零产出——不是子代理不努力，是**一个模型 + 一份配额**扛不住 3–5 个并发。
- 与 D5 的 rate limit 直接叠加：所有 cron 也走同一个 provider，配额被 5 个 cron + N 个子代理瓜分。

**建议方案**
1. **volcengine**：404 是「模型/端点不存在」，不是鉴权问题 → 去方舟控制台确认当前可用的
   **推理接入点 ID / 模型 ID**，把它填进 `models.providers.volcengine.models[].id`。
   （`baseUrl` 是对的，ark 的 chat 接口是 `/api/v3/chat/completions`。）
2. **custom1**：401 → API Key 失效或身份验证方式不对（该服务要求身份验证，不是标准 Bearer）
   → 需要主人提供新的 Key 或确认它是否走别的鉴权头。
3. **coze**：500 `no sandbox ID found for taskID` → 是 Coze 侧的沙箱/应用配置问题，
   `auto` 模型在当前沙箱下不可用 → 换 Coze 应用 ID 或改用固定模型 id。
4. **改 fallback**：一旦至少两家恢复，把 `fallbacks` 改成**不同厂商**（而不是现在这样
   `minimax` 指两次）。这是最有价值的一步——零成本，直接消除单点。
5. **给报告类 cron 单独指定轻量模型**，避免把大模型的配额花在"生成一段日报"上。

**默认不处理的后果**
- 整个 AI 团队的实际并发能力 = **1**。任何一次 provider 抖动或配额打满，
  **所有子代理任务 + 所有 cron 同时停摆**（本轮之前已连续发生 2 轮）。
- 报告类任务与执行类任务抢同一配额——写文档的 cron 可以把跑代码的子代理挤掉。

---

### D5 · cron 的 rate-limit 失败集中，但「挤在整点/半点」的归因不成立

**问题**
实测 `~/.openclaw/cron/runs/*.jsonl`（累计全部历史）：

| cron | 运行数 | 失败 | 其中 rate limit | 失败率 | 最近一次 |
|---|---|---|---|---|---|
| 开发任务生成器 | 2475 | 311 | **110** | 12% | 10-24 04:42 |
| 持续工作调度器 | 2000 | 130 | **93** | 6% | 10-24 04:37 |
| 每日状态报告 | 1653 | 389 | 56 | 23% | 10-23 19:43 |
| 阶段性总结报告 | 568 | 164 | 18 | 28% | 10-23 18:53 |
| 每4小时推送记忆文件 | 390 | 96 | 14 | 24% | 10-23 20:53 |
| 每天同步常规文件到 botmem | 69 | 20 | 3 | 28% | 10-23 14:37 |
| 每天推送工作区文件 | 69 | 19 | 3 | 27% | 10-23 14:17 |
| 每4小时推送记忆文件 | 389 | 81 | 5 | 20% | 10-23 14:07 |
| 每日自我提升会议 | 54 | 7 | 2 | 12% | 10-23 14:04 |
| 7zi-auto-publish（已停用） | 993 | 43 | 4 | 4% | 03-21 18:21 |
| （已删除的 check-test-fix-progress） | 323 | **323** | 1 | **100%** | 04-03 15:14 |

**重要更正**：`STAGE_REPORT_20261023.md` 说「现在全部挤在整点/半点」。实测 `jobs.json` 的
cron 表达式**已经错峰**：

```
每日自我提升会议   0 8 * * 1-5     ← 08:00
每4小时推送记忆    7 8 * * *       ← 08:07
每天推送工作区文件 17 8 * * *      ← 08:17
每天同步常规文件   37 8 * * *      ← 08:37
每日状态报告      23 9 * * *       ← 09:23
持续工作调度器     every 30 min
开发任务生成器     every 40 min
```

跑时分布（实测每分钟计数）也**不是**集中在整点/半点（开发任务生成器 59 个不同分钟都有分布）。
**所以「错峰」这条建议在 cron 表达式层面已经落地，失败主因更可能是 D4 的单 provider 配额**
（203 次 rate limit 里，绝大多数来自两个 every 型高频任务 + 同一份 minimax 配额）。
另有 1 个 100% 失败的僵尸任务（`check-test-fix-progress`，04-03 已确认禁用并删出 jobs.json）。

**影响**
- 失败表现为 `FailoverError: ⚠️ API rate limit reached`，**但 fallback 就是同一个 provider**，
  所以 failover 等于没 failover——这是 D4 的直接后果。
- 高频 every 型任务（30/40 分钟一次）是最容易被掐断的两个。

**建议方案**
1. **先做 D4**（恢复第二家 provider + 改 fallback），这才是根因。
2. **给 every 型任务加错峰 jitter**：把「持续工作调度器」「开发任务生成器」的 anchor
   错开（例如一个锚在 :07、一个锚在 :23），避免两者与 5 个 cron 撞在同一分钟。
3. **给报告类 cron 换轻量模型**（见 D4 第 5 点）。
4. **清理僵尸任务**：确认 `check-test-fix-progress` 及其 323 条历史记录可以从 jobs.json / runs 中清除。
5. **给失败加退避**：rate limit 时指数退避重试，而不是直接记 error 结束。

**默认不处理的后果**
- 报告类 cron 每天稳定丢 20–28% 的运行（「每日状态报告」1653 次里失败 389 次），
  **主人看到的日报是残缺的**，而且缺失是静默的。
- 「持续工作调度器」正是驱动子代理派发的那条 cron（本次 T86 就是它派出来的）——
  它失败 = **整轮子代理任务零产出**，这正是连续两轮零报告的直接原因。

---

## 🟡 P2

### D6 · bot5 每 5 分钟推送一次

**问题**
实测（2026-10-24 05:44，SSH 到 bot5，`hostname` = `ecm-cd59`）：

```
*/5 * * * * /root/.openclaw/cron/claw-mesh-sync.sh >> /tmp/sync-cron.log 2>&1
```

`HEARTBEAT.md` 末尾「推送时间（已错峰，勿改成同一时刻）」表里也写着
`bot2 :00 / bot4 :15 / bot6 :30 / bot3 :45 / bot5 */5`。
bot5 是**唯一**非整点/15 分节奏的节点，频率是其它节点的 **6–12 倍**。

**影响**
- 写放大：`botmem` 仓库每天被 bot5 推 **288 次**，每次一个完整工作区快照。
- 与 D7 直接相关：`botmem` 的 `.git` 已经 **241M**，其中 5.9 万个路径是 node_modules（见 D7）。
- 高频 push 会放大 D1 的凭据暴露面与 D2 的历史重写成本。

**建议方案**
把 bot5 改成 `*/30 * * * *`（与其余节点的 :00/:15/:30/:45 错开即可，不要撞点），
或改成 `7,37 * * * *` 这种双次节奏。**改动需要在 bot5 上执行**，需主人授权或主人代执行。

**默认不处理的后果**
- `botmem` 仓库体积与 push 次数持续无谓增长，推送失败的概率随体积上升；
  将来做 D7 的历史清理时，代价按这 288 次/天累积。

---

### D7 · 仓库 git 历史含 5.9 万个 node_modules 路径（`.git` 膨胀）

**问题**
实测：

| 仓库 | 当前 HEAD 树中的 node_modules | **git 历史对象**中的 node_modules 唯一路径 | `.git` 体积 |
|---|---|---|---|
| `songzuo/botmem` | **0** | **58,986** | **241M** |
| `songzuo/7zi`（本仓库） | **0** | **9,782** | **361M** |

即：**工作树已经干净了（HEAD 里没有 node_modules），但历史里还留着**——所以 clone 下来的新仓库
不带 node_modules，但 `.git` 目录仍是几百 M。
`HEARTBEAT.md` 第 7 节写的「仓库里混有 7.5 万个 node_modules 文件」，实测口径是
「历史唯一路径数 58,986（botmem）」，当前工作树里**已经没有**了。
`.gitignore` 也已补齐 `.env.*` / 私钥 / 压缩包规则。

**影响**
- `.git` 361M + 241M，clone / fetch 全量历史都慢（实测 botmem fetch 触发一次 forced update）。
- **D2 的 30 个提交 + D1 的历史重写，都会被这个体积放大**：任何一次 `filter-repo` 都要重写
  近 6 万个 blob。
- 这是"看起来已经解决、其实只解决了表面"的典型：只加 `.gitignore` 不清历史，体积不会降。

**建议方案**（优先级低于 D1/D2，且**必须**在 D1 的凭据轮换之后再做）
1. 先做 D1 吊销 PAT —— 历史重写会改变所有节点的克隆，**要在凭据干净之后再动**。
2. 用 `git filter-repo --path node_modules --invert-paths` 重写 `botmem` 历史 + 强制推送；
   随后 **5 台节点全部重新克隆**。
3. `7zi` 仓库同样处理（9,782 个路径）。
4. 重写前先 `git gc --aggressive --prune=now` 看能回收多少 —— 如果回收不明显，
   说明体积主要来自现在的正常提交，可以只做 D1 不做重写。

**默认不处理的后果**
- 仓库体积与 clone/fetch 时间持续增长；
- 未来任何一次「因为凭据泄露而必须重写历史」的操作，成本比现在**再高 6 万个 blob**。

---

### D8 · 部署目标未定义 + `rsync --delete` 会抹掉服务器 55 个未提交改动

**问题**（来自 `T81_DEPLOY_READINESS.md`，本轮未复核）
- 线上 `7zi.com` **首页是静态站**（`/var/www/erhu-brand/china-for-free`），
  **不是**本仓库的 Next.js 应用；Next 只代理 `/api/health`（3001 端口）。
- 服务器 `/opt/7zi-frontend` 的 HEAD 是 `d523bcb1`，**本地是 `a1914975fb`**（不同源，
  `git cat-file a1914975fb` 在服务器上 `fatal: not found`）；
  服务器工作区另有 **55 个未提交改动**。
- `deploy.sh` 默认走 `rsync --delete` → **会直接抹掉那 55 个改动**。
- 服务器上**没有 `7zi-frontend` 容器在跑**（`docker ps | grep 7zi-frontend` 为空），
  但 compose 文件存在 → 直接跑 blue-green 会**新建一套与当前生产拓扑无关的容器**。

**影响**
- 一次误部署就可能**不可逆地丢掉服务器上 55 个人的改动**，且这些改动从未进过版本库，
  丢了就是永久丢失。
- 部署完可能既没换掉真正的首页静态站，又多起一套容器，**看起来"部署成功"但线上毫无变化**。

**建议方案**
1. **先定部署目标**（主人拍板）：是 bot5 测试环境？`/opt/7zi-frontend` 容器？还是先只更新 `/api/health` 代理的 Next 服务？
2. **先备份再动**：`tar czf /opt/backups/7zi-frontend-pre-<ts>.tar.gz`（排除 `node_modules` / `.next`）。
3. **不要用 `rsync --delete`**，改用「服务器端 `git pull`」或「不带 `--delete` 的 rsync」。
4. 先在 bot5 验证，**不要直接碰生产 vhost**。

**默认不处理的后果**
- 部署随时可能造成**不可逆数据丢失**（55 个未提交改动）；
- 或者"部署成功"但线上毫无变化，浪费一轮窗口并掩盖真实故障。

---

### D9 · 源站内存只剩 339MB（97% 占用），不能在上面构建

**问题**（T81 实测，本轮未复核）
`198.44.179.155`：`11959 MB 总 / 11620 MB 已用 / 339 MB 可用` → **97.1%**。
12 个 `octo-*` 容器虽全部 healthy，但宿主机内存已近枯竭。

**影响**
- 在源站执行 `docker build` / `next build` 极可能 **OOM**，且会**先把线上容器挤死**
  （12 个容器都在这台机器上）。
- OOM 触发内核杀进程时，**被杀的不一定是 build 进程** —— 可能是 MySQL / Redis / MinIO。

**建议方案**
**本地或 CI 构建镜像 → 推送到服务器 → 服务器只 `docker pull` + `up -d`**，
源站**只做运行态操作，不做构建**。

**默认不处理的后果**
- 一次构建失败可能连带杀掉生产数据库/对象存储 —— **事故半径从"部署失败"扩大到"数据丢失"**。

---

### D10 · `deploy.sh` 健康检查打 `localhost:3000`，但 3000 端口无服务

**问题**（T81 实测，本轮未复核）
线上监听的是 3001 / 3003 / 3004 / 28080–28087，**3000 端口无任何服务**
（`http://127.0.0.1:3000/api/health` → `000`；`http://127.0.0.1:3001/api/health` → 200 `{"status":"ok"}`）。
而 `deploy.sh` 的健康检查用 `http://localhost:3000/api/health` 与 `http://localhost:3000/`。

**影响**
- 部署**必然**被判失败 → 触发 deploy.sh 内置的**自动回滚** → 部署流程永远走不到成功。
- 更糟：回滚逻辑本身可能也基于错误的端口假设，形成"回滚也失败"。

**建议方案**
把 `deploy.sh` 的健康检查端口改为 **3001**（或 28080 这类 nginx 代理后的端口），
并在部署前先用 `ss -lntp` 实测确认；改完在 bot5 先演练一遍。

**默认不处理的后果**
- 每次部署都会"成功上线后立刻回滚"，团队会误以为部署脚本坏了 / 线上不稳定，
  反复折腾而找不到真因。

---

## 🔵 P3

### D11 · `state/tasks.json` 每次运行都变（+1290 行 diff）

**问题**：T81 实测该文件本轮 +1290 行，是纯运行时追加日志。
**影响**：每次提交都产生巨大 diff，掩盖真正的代码改动，也让 `git blame` 失去意义。
**建议方案**：加入 `.gitignore`（`git check-ignore -v state/tasks.json` 目前**不**被忽略），
或单独一次提交并约定定期归档。
**默认不处理的后果**：代码评审噪音持续放大，误合并/漏改的风险上升。

### D12 · `src/lib/monitoring/prometheus.js` 是编译产物被直接改

**问题**：`.js` 编译产物被改（`_this` → `this`）。后续提交 `3254d4838e` 已修正为
「把回调改成箭头函数（与 `.ts` 源码一致）」并 `node --check` 验证，但**源码与产物的同步关系**
仍需长期保证。
**影响**：若只改 `.js` 不改 `.ts`，下次 build 会覆盖回退。
**建议方案**：只改 `.ts` 源，重新编译生成 `.js`；或把 `src/**/*.js`（与同名 `.ts` 并存时）加入 lint 豁免说明。
**默认不处理的后果**：修复"看起来好了"，一次 build 就静默回退，且没人会发现。

### D13 · `use-prefetch` 批量预取换了 prefetcher 实例

**问题**：T81 指出 `useBatchPrefetch` 改用默认 `globalPrefetcher`，可能与 `usePrefetch`
使用的实例不一致（提交 `db6d4a1a94` 抽出 `performPrefetch` 纯函数后，Hook 与批量预取共用同一实现，
风险方向与 T81 描述相反 —— **该点需重新验证**）。
**影响**：批量预取可能命中不同缓存 → 重复请求或缓存不命中。
**建议方案**：跑一次预取回归（或补一个断言两者共用同一实例的测试）。
**默认不处理的后果**：预取静默失效 → 首屏加载变慢 → 表现为"性能回退"，难定位。

### ✅ D14 · 后端 CI 未覆盖 `websocket-service` / `workflow-service` —— 已解决

> **状态：已由 T112 修复并由主管提交（`9295d821df`）。** 下列内容保留作决策留痕。
> - `backend-ci.yml` 的 path 过滤已显式列出两个子服务目录
> - 两个 CommonJS 服务各加一道「构建校验」（生产依赖树可解析 + `node --check`
>   全源文件语法合法 + 入口文件存在）
> - 同批把三处 `body-parser` 从 1.20.2 升到 1.20.9（GHSA-27r3-jxmh-p828），
>   修掉让 CI 审计门禁失败的 high 级漏洞 —— 见 `e00c13e4e6`
> - **仍需主人确认**：是否批准在真实 GitHub Actions 上首跑验证

<details><summary>原始问题描述</summary>

### D14-原始 · 后端 CI 未覆盖 `websocket-service` / `workflow-service`

**问题**：实测 `.github/workflows/backend-ci.yml` 的 path 过滤与 job 工作目录只有
`7zi-backend/`（根）与 `workflow-engine/backend/`；两个子服务虽有 `lint` / `test` 脚本，
CI **不调用**。`.github/workflows/` 共 9 个 workflow。
**影响**：这两个子服务的 lint 回归 / 测试失败**不会挡住合并**。
**建议方案**：在 `backend-ci.yml` 增加两个 job（复用现有 job 模板，`working-directory` 指向子目录），
并把 `websocket-service` / `workflow-service` 加进 path 过滤。
**默认不处理的后果**：刚清零的后端 lint 门禁在这两个目录上是**假门禁**，
下一个 no-dupe-keys 类真 Bug 可能再次悄悄合入。

</details>

### D15 · PM2 `anti-v2` 进程反复重启（stopped，↺10）

**问题**：线上 PM2 里 `anti-v2` 已停止并重启 10 次，其余 4 个（`7zi-shop` / `agenthub` /
`ai-7zi` / `ge-website`）均 online。T81 判定与本仓库改动无关。
**影响**：不明；可能只是遗留进程，也可能是有业务在用。
**建议方案**：主人确认是否下线；下线前先查访问日志确认无流量。
**默认不处理的后果**：长期占用一个 PM2 槽位并刷日志，干扰告警判读。

---

## 附：需要主人回答的一句话清单

请主人直接回复编号即可（可多选）：

- **D1** —— 吊销 botmem 历史里的那个 PAT？（新 Key 我来配 / 主人自己配 / 暂不处理）
  （注：本文件刻意**不回显**该 PAT 原文，需查请让主管从 `botmem` 仓库历史里取，不要在群里传播）
- **D2** —— 批准推送本地 30 个提交（拆两笔）并盯一次 Actions 首跑？
- **D3** —— 提供 bot3/bot4 凭据，还是授权我把 bot6 公钥写进那两台？
- **D4** —— volcengine 的可用模型 ID / custom1 的新 Key / coze 的应用 ID，主人能提供吗？
  fallback 要不要现在就改成异厂商？
- **D5** —— 是否同意给两个 every 型 cron 加错峰 + 报告类 cron 换轻量模型？
- **D6** —— bot5 改成 30 分钟一次，同意吗？（需要 bot5 的执行通道）
- **D7** —— 仓库历史清理（约 6 万 blob，**必须在 D1 吊销凭据之后**），同意吗？
- **D8** —— 部署目标定为哪个？（bot5 测试 / `/opt/7zi-frontend` / 只更新 Next 服务 / 暂不部署）
- **D9 / D10** —— 同意「本地或 CI 构建镜像、源站只 pull」+「修 deploy.sh 健康检查端口为 3001」吗？
- **D11** —— `state/tasks.json` 移出版本库？
- **D12 / D13** —— ~~`prometheus.js` 改为只改 `.ts` 源~~ ✅ 已解决（`f1fd650ddf`）
  + ~~`use-prefetch` 跑一次回归~~ ✅ 已解决（`db6d4a1a94`）
- **D14** —— ~~补 backend-ci 的两个 job~~ ✅ 已解决（`9295d821df` + `e00c13e4e6`）；
  **仅剩**：是否批准在真实 GitHub Actions 上首跑验证？
- **D15** —— `anti-v2` 进程下线？

---

## 一句话总览

**最急的两件事**：**D1（吊销泄露的 PAT）** 与 **D2（推送 30 个提交）**。
前者是安全止血，后者是防止本轮全部工作成果因单点故障归零。
其余 13 条都可以慢慢排，但 **D4（恢复第二个模型提供商）** 值得优先——
它是「连续两轮子代理零产出」和「cron 大面积 rate limit」的共同根因。

*本清单由 T86 生成，所有"实测"结论均可复现；未验证项均标注「待验证」。*
*生成过程未做任何写操作（除本文件与三份文档），未 `git add/commit/push`，未部署。*