# HEARTBEAT.md

## 当前基线（2026-10-24 05:38–05:52，T86 实测）

| 检查项 | 命令 | 结果 |
|---|---|---|
| 前端 ESLint（`7zi-frontend/src`） | `cd 7zi-frontend && npx eslint src` | ✅ **0 errors / 0 warnings**（exit 0，无输出） |
| 后端 ESLint | `cd 7zi-backend && npx eslint .` | ✅ **0 errors / 0 warnings**（exit 0，无输出） |
| 根级 ESLint | `npx eslint src` | ✅ **0 errors / 1625 warnings**（exit 0） |
| 后端 Jest | `cd 7zi-backend && npx jest` | ✅ **16 套件 / 342 用例全绿**，15.3s |
| 后端 Jest worker | 同上 | ⚠️ 输出 `A worker process has failed to exit gracefully`（测试全绿，但疑似 teardown 泄漏，**待验证**） |
| 前端 collab-client | `cd 7zi-frontend && npx vitest run tests/features/collab-client.test.ts` | ✅ **38 passed (38)**，Duration 3.82s（05:55 实测；05:39 时为 15 failed / 23 passed，已由 T82 修复） |

### 后端 CI 实际覆盖范围
- `.github/workflows/` 共 **9 个** workflow 配置
- `backend-ci.yml` 5 个 job，**只**覆盖 `7zi-backend/`（根）与 `workflow-engine/backend/`
- **尚未覆盖** `7zi-backend/websocket-service/` 与 `7zi-backend/workflow-service/`
  （两者 `package.json` 都有 `lint` / `test` 脚本，CI 未调用）→ 真实覆盖缺口
- 真实 GitHub Actions 上的**首次运行尚未发生**

### Git 状态（05:40 实测）
- 本地 `main` **领先 `origin/main` 30 个提交**（`origin/main` = `17cf105a92`，2026-10-23 00:44）
- 工作区：**5 个已修改文件**（`HEARTBEAT.md` / `eslint.config.mjs` / `memory/claw-mesh-state.json` /
  `src/lib/monitoring/prometheus.js` / `state/tasks.json`）+ 1 个未跟踪文件（`DEV_TASKS_20261024_0537.md`）
- 全部改动**未 push**

### 关键判断记录
- ⚠️ **更正先前的一处误判**（提交 `f1fd650ddf`）：
  `src/lib/monitoring/prometheus.js` 是 tsc 从同名 `.ts` 编译出的 ES5 产物
  （含 `__awaiter`/`__generator`/`__spreadArray` 等 tsc helper）。
  里面的 `var _this = this` 是 **tsc 对 `.ts` 箭头函数的正确降级**，不是死代码；
  手工改成 `this` 会改坏与 `.ts` 的对应关系，且下次编译即被覆盖。
  已核对两文件方法集与导出完全一致（8 个方法 + 2 个导出）。
  **处理方式：撤销手工改动，在 `eslint.config.mjs` 中忽略该编译产物。**
- prefetch 测试的 9 个失败已用 `git stash` 干净树对照，确认**存量非本次引入**。
- prefetch 测试的 9 个失败已用 `git stash` 干净树对照，确认**存量非本次引入**。
- 裸 `curl` 打 `https://7zi.com/` 返回 403 是 **Cloudflare/WAF 拦 curl UA**，不是站点故障；
  所有健康检查/监控脚本必须带浏览器 UA。

### 集群 SSH 实测（05:44）
| 节点 | 结果 |
|---|---|
| bot3 | ❌ `Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password)` |
| bot4 | ❌ 同上 |
| bot5 | ✅ 用 `~/.ssh/id_bot6_ed25519` 可登录（hostname = `ecm-cd59`）；但 `crontab -l` 显示同步为 **`*/5 * * * *`**（每 5 分钟） |

---
# OpenClaw相关任务前必读

在执行任何OpenClaw配置相关任务之前，请先阅读:
- openclaw-knowledge-base.md (本机的OpenClaw知识库)

这样可以确保使用最新的配置格式和最佳实践，避免使用过时的大模型知识。

---

# Claw-Mesh 集群巡检清单

集群节点：bot2 / bot3 / bot4 / bot5 / bot6，共享仓库 `songzuo/botmem`。

**先确认自己在哪台**：`hostname` —— 不同节点的 HEARTBEAT.md 内容相同，
但"本机"可能指 bot2（本文件原本这么写）或 bot4（bot4 上实际如此）。
清单第 2/3/4/5 项要 SSH 到**其他**节点，先排除本机。

**核心提醒：不要只看"同步是否成功"。** 2026-10-22 的经验是，
同步成功不代表健康 —— 失效 cron、防护规则误伤、时区错配、凭据明文，
都能在"同步成功"的同时长期存在。下面的检查项要逐项过。

## 1. 基础健康
```bash
python3 -c "import json;d=json.load(open('memory/claw-mesh-state.json'));print(d)"
openclaw gateway status | grep Runtime:
```
- 状态必须是 `healthy`/`idle`，`errorCount` 必须是 0
- 状态文件必须是**合法 JSON**（历史上出现过 `errorCount: ,`）

## 2. 各节点状态（要逐台 SSH 确认，不能只看本机）
```bash
for m in bot3 bot4 bot5 bot6; do
  ssh root@$m.szspd.cn "python3 -c \"import json;d=json.load(open('/root/.openclaw/workspace/memory/claw-mesh-state.json'));print(d)\""
done
```
- 每台的 `machine` 字段要等于它自己的机器名
  （历史上 bot5 写成 `ecm-cd59`、bot6 和 bot3 都写成 `bot4`）
- `lastSync` 距今不应超过 6 小时
- **SSH 不通时的退路**：用共享仓库里各节点推上来的 state 文件间接核对
  ```bash
  cd /tmp/botmem-upload/botmem && for n in bot2 bot3 bot4 bot5 bot6 ecm-cd59; do
    echo -n "$n: "; cat $n/memory/claw-mesh-state.json 2>/dev/null | tr -d '\n '; echo; done
  ```
  注意这只能证明"对方最后一次同步时是健康的"，无法证明它现在还活着
- ⚠️ **2026-10-22：bot4 上 SSH 到 bot2/3/5/6 全部 `Permission denied (publickey)`**
  （防火墙规则是对的，是对端 authorized_keys 不认 bot4 的公钥）。
  清单第 2/3/4/5 项因此在 bot4 上做不了 —— 需在其它节点补上 bot4 公钥

## 3. 时钟一致性（**先做这步再看时间戳，否则证据会误导**）
```bash
for m in bot3 bot4 bot5 bot6; do ssh root@$m.szspd.cn "date '+%F %T %Z'; cat /etc/timezone"; done
```
全部应为 `CST / Asia/Shanghai`。历史上 bot6 是 Europe/Berlin，偏移 6 小时。

## 4. 失效 cron（最容易漏）
把 crontab + /etc/cron.d 里的脚本路径全抽出来验证文件是否存在：
```bash
for m in bot3 bot4 bot5 bot6; do
  ssh root@$m.szspd.cn "{ crontab -l; grep -hvE '^#|^$' /etc/cron.d/*; } \
    | grep -oE '/[A-Za-z0-9_./~-]+\.(sh|py|js)' | sort -u \
    | while read s; do [ -f \"\$s\" ] || echo \"MISSING: \$s\"; done"
done
```
注意 `~` 不会被 shell 展开，检查时要用真实路径 `/root/...` 再核对一次。
**同时要看 `/etc/cron.d/`，只看 `crontab -l` 会漏掉整块任务。**

**也要看"有注释没任务"的空条目** —— 注释行下面如果只有下一条注释，
说明这个 cron 被删了但注释没删，任务已经不再运行。
2026-10-22 就在 bot4 上发现 `# Claw-Mesh 同步 (每4小时)` 后面是空的，
完整同步从 2026-03-16 起就没再自动跑过（只有 10-22 手动触发的几次）。

**验证 cron 真的在跑**：查脚本自己的日志时间戳，别只看 `crontab -l`
```bash
grep "同步启动" /var/log/claw-mesh.log | tail -5
```

## 5. 防火墙误伤（bot3/bot4 有）
```bash
ssh root@bot4.szspd.cn "iptables -L INPUT -n --line-numbers | head -12"
```
- 集群 IP 的 ACCEPT 规则必须在 SSHLIMIT 的 DROP 规则**之前**
- SSHLIMIT 按源 IP 计数（60 秒 4 次即 DROP），集群间高频连接会被自己封掉
- 已用 `/usr/local/sbin/allow-cluster-ssh.sh` 修复并持久化
- **验证方法**：连续快速连 8 次，应 8/8 成功

## 6. 凭据泄露
```bash
grep -rlE 'gh[p]_[A-Za-z0-9]{20,}' /root/.openclaw/cron/ 2>/dev/null | grep -v git-credential
```
应为空。凭据统一由 `clawmesh-credential.sh` 提供，脚本内不应有明文。
仓库工作树也应无 token（`git clone` 后扫一遍）。

**也要扫日志** —— git 报错会把带 token 的 URL 回显进日志：
```bash
grep -ohE 'gh[p]_[A-Za-z0-9]{20,}' /var/log/*.log 2>/dev/null | sort -u
```
2026-10-22 在 bot4 上发现 `/var/log/botmem-*.log`、`claw-mesh.log` 里
有 1200+ 处失效 token 明文（已脱敏）。**写完脚本记得回头扫一遍日志。**

**注意脱敏的自我破坏**：全仓库脱敏的 sed 会把**脚本自己**里的
`GIT_TOKEN="ghp_..."` 就地改成 `"[已移除]"` → 下次运行 URL 变成
`https://[已移除]@github.com/...` → clone/pull 全失败。
2026-10-22 bot4 的 `upload-botmem-daily.sh` 就是这样坏的，而且它
**push 失败也打印"✅ 每日上传完成"**。
→ 脚本内一律用 `clawmesh-credential.sh` 取 token，不写明文；
→ 结尾必须按 `git push` 的真实退出码判断成败。

## 7. 共享仓库
```bash
git ls-remote origin main
```
- HEAD 应持续推进
- 注意仓库里混有 7.5 万个 node_modules 文件（历史遗留，未清理）

## 8. 磁盘
五台根分区使用率，超过 85% 需要处理。

## 9. 常驻服务与日志（2026-10-22 新增）
同步脚本之外的进程同样会出事，而且症状容易被误当成"同步成功"：
```bash
systemctl is-active picoclaw.service
systemctl show picoclaw.service -p NRestarts
```
- `NRestarts` 达到几十万次 = 崩溃重启循环，配置有问题
  （2026-10-22：picoclaw 因 `model "auto" not found` 重启了 **111 万次**，
  日志刷到 222MB）
- 检查日志目录有没有 logrotate 规则：
  ```bash
  ls /etc/logrotate.d/ ; du -sh /var/log/*.log | sort -h | tail -5
  ```
  2026-10-22 新增 `/etc/logrotate.d/openclaw-clawmesh`（cron / picoclaw / claw-mesh 日志）

---

## 10. 工作区文件被外部误删（2026-10-22 新增）
`docs/` 全树 305 个文件曾在 20:38 被外部进程直接删除，git reflog 无痕迹。
防护：`workspace-guard.sh`（每5分钟）用 `git ls-files --deleted` 检测并自动恢复。
```bash
git ls-files --deleted | head -20        # 应为空
ls docs/ | wc -l                          # 应为 305
```
**提交前务必看 diff 规模** —— 18 万行删除绝不该静默提交进去。

## 16. 插件加载失败排查手册（2026-10-23 实战）
每次 `openclaw plugins list` 里状态是 `error`，或启动刷
`plugin id mismatch (manifest uses "X", entry hints "Y")`，按这三条查：

1. **目录结构**：插件必须是 `/root/.openclaw/extensions/<插件名>/` 独立目录，
   里面放 `index.ts` + `package.json` + `openclaw.plugin.json`。
   文件直接躺在 `extensions/` 根目录下会被当成单文件插件，idHint 变成 "index" → id mismatch。
2. **SDK 子路径**：新版 OpenClaw 把 `plugin-sdk` 拆成几十个子路径，
   主入口 `openclaw/plugin-sdk` 只剩很少的导出。
   - `createDedupeCache` / `readRequestBodyWithLimit` / `isRequestBodyLimitError` / `withFileLock` → `plugin-sdk/infra-runtime`
   - `normalizeE164` → `plugin-sdk/text-runtime`
   - `defineChannelPluginEntry` → `plugin-sdk/core`
   用 `grep -c '<符号名>' dist/plugin-sdk/<子路径>.js` 确认符号在哪个文件。
3. **registerHttpRoute 必须带 auth**：`{ path, handler, auth: "plugin" }`，
   缺了 doctor 会报 `http route registration missing or invalid auth`。

依赖装不上时（如 `Cannot find module '@sinclair/typebox'`）：本机 `extensions/node_modules`
里可能有 743 个**空目录**（历史遗留），`npm install` 会报 `edgesOut` 错误。
绕法：`ln -s <openclaw>/node_modules/@sinclair/typebox extensions/node_modules/@sinclair/typebox`。

## 17. OpenClaw 升级注意（2026-10-23）
- 本机 Node 22.22.0，**不能**升到 OpenClaw 2026.10.x（要求 Node >=24.22.1）
- 可升到的 2026.3.x 系列无 Node 版本限制，已升到 **2026.3.24**
- 升级前备份 `~/.openclaw/openclaw.json` 和 `~/.openclaw/cron/jobs.json`
- 升完务必跑 `openclaw plugins list` + `openclaw doctor --non-interactive` 验证

## 18. 脱敏 sed 会误伤标识符（2026-10-23 踩过，务必检查）
`claw-mesh-sync.sh` 原来用 `s/sk[_]_[A-Za-z0-9]*/[已移除]/g` 做全仓库脱敏。
`sk_` 匹配到了 **`di`sk[_]_**`usage`、`**ta**sk[_]_**` 里面去 →
`disk_usage` → `di[已移除]`，`task` → `ta[已移除]`。
**17 个 shell 脚本的变量名被改坏，脚本直接语法错误，而且损坏被提交进了共享仓库。**

正确写法（用连字符 + 长度下限 + 左侧边界）：
```bash
sed -i -E -e 's/(^|[^A-Za-z0-9_])gh[p]_[A-Za-z0-9]{20,}/\1[已移除]/g' \
           -e 's/(^|[^A-Za-z0-9_])sk-[A-Za-z0-9_-]{20,}/\1[已移除]/g'
```
**自查命令**（改完脱敏逻辑必跑）：
```bash
grep -rnE '[A-Za-z0-9_]+\[已移除\]' --include='*.sh' .   # 应为空
```
⚠️ `\b` 没用 —— `_` 是单词字符，`\bsk_` 匹配不到 `disk_usage` 里的 `sk_`。

## 19. 共享仓库里有明文 API 密钥（2026-10-24 处置，勿擅自重写历史）
扫描发现 4 个文件含**真实可用**的 API 密钥（Coze / MiniMax / 第三方端点）：
`7zi.com/memory/2026-07-30.md`、`bot6/memory/2026-05-04-security.md`、
`bot6/memory/picoclaw-debug-20260331.md`、
`xunshi-inspector/memory/cluster-confidential-knowledge-base.md`。

- ✅ 工作区已脱敏（`fa0c20ac17`）
- ⚠️ **git 历史里仍在** —— 彻底清除要重写历史 + 强制推送，**需主人决策**
- ⚠️ **这些 key 应视为已泄露，建议在服务端轮换**

区分真 key 与普通标识符（熵值 + 长度）见 `memory/2026-10-24.md` 的脚本。

## 20. 文档里的字面量 token 模式要写成 `gh[p]_`（2026-10-24 教训）
节点上仍跑着旧版脱敏脚本 `s/gh[p]_[A-Za-z0-9]*/[已移除]/g`。
文档里若直接写 `gh[p]_[A-Za-z0-9]{20,}` 这种字面量模式，**会被旧脚本当成真 token 替换掉**。
→ 文档里统一写 `gh[p]_` / `sk[_]_`（正则语义等价，旧脚本匹配不到）。
→ 涉及 HEARTBEAT.md / MEMORY.md / memory/*.md / docs/CLAW-MESH-HANDOVER.md。

## 21. 仓库改了 ≠ 节点生效（2026-10-24 踩过）
`claw-mesh-deploy/README.md` 明确写着「改动需要手动部署到各节点」。
2026-10-24 修好了仓库里的 `claw-mesh-deploy/scripts/claw-mesh-sync.sh`，
**但 bot6 仍在跑旧脚本并继续破坏仓库**。
→ 修完同步脚本，**必须逐节点确认本地副本已更新**（SSH 上去 grep 一下 pattern）。

## 22. 7zi.com 源站 165.99.43.61 SSH 超时（2026-10-23 起）
SSH Connection timed out（7zi.com 域名解析到 CF IP，22 端口 Network unreachable）。
→ `scripts/health-check.sh` 的 Nginx / PM2 / Docker / 磁盘 / 内存 检查全部失败，
  **这不是脚本 bug，是真实的源站不可达**。
→ TOOLS.md 里记的 7zi.com IP 可能已过期，需要重新确认源站地址。

## 23. 节点互相写对方目录 —— `git add -A` 是元凶（2026-10-24 定位）

**症状**：bot5 的同步提交里混进了 `bot2/memory/2026-10-24.md` 的改动；
bot6 的提交里也混进了 `bot2/` 的文件。看起来像"节点在乱写别人"。

**根因（两层）**：
1. live 脚本的脱敏是**全仓库** `grep -rl` + `sed -i`（含 `botN/` 别人的目录）。
   节点 A 的 sed 会把节点 B 的文件改写（`sk_` pattern 还会误伤标识符）。
2. `git add -A` 把**整个工作副本**的改动都暂存 —— 包括刚被别的节点 sed 改坏的 `bot2/`。

→ 修法（已落地）：`git add "$MACHINE_NAME"/` 只暂存本节点目录；
  全仓库 sed 排除 `--exclude-dir=bot2..bot6`；
  提交前加不变量校验：每个 `botN/` 内 state.machine 必须等于目录名，否则中止提交。

**排查手法**（可复用）：
```bash
# 看某个提交实际改了哪些目录
git show <sha> --name-only --format='' | grep -oE '^bot[0-9]+/' | sort -u
# 对比提交自称的节点
git log --format='%h|%s' | grep 'Claw-Mesh 同步' | \
  while IFS='|' read c s; do echo "$c $(echo "$s" | sed 's/:.*//')"; done
```
**教训**：共享仓库里"谁在写谁"必须看**提交实际改了哪些路径**，
不能只看 commit message 里的节点名 —— message 是脚本自报的，可以撒谎。

## 已知遗留（需用户决策，勿擅自处理）
- git 历史中可能仍残留旧 token —— 彻底清除需重写历史 + 强制推送
- 仓库内 7.5 万个 node_modules 文件 —— 清理需重写历史
- bot5 每 5 分钟推送一次，频率高于其他节点
- **跨节点 SSH 从 bot4 全部被拒**（bot4 → bot2/3/5/6 `Permission denied (publickey)`）。
  需在其它节点把 bot4 的公钥加进 `~/.ssh/authorized_keys`。
  bot4 公钥指纹：`selfadm-bot4 SHA256:HVsRFkhJH6LJBZsPD3XbDVtyoHO45Ow3sjVx64NTtQM`

## 推送时间（已错峰，勿改成同一时刻）
bot2 `:00` / bot4 `:15` / bot6 `:30` / bot3 `:45` / bot5 `*/5`

## 🔴 CI 门禁实测结论（2026-10-24 06:30，主管亲自本地复现）

| Workflow | Job | 实测结果 |
|---|---|---|
| `ci.yml` | `lint`（`npm run lint` = `eslint .`） | ✅ **exit 0** / 1767 warnings / 140 秒 |
| `ci.yml` | `typecheck`（`tsc --noEmit`） | ✅ **exit 0** |
| `ci.yml` | `test-unit`（`vitest --shard=N/4`） | ❌ **exit 1** — 全量 5831 用例中 **211 失败 / 5588 通过 / 32 跳过**，耗时 387 秒 |
| `backend-ci.yml` | `security-audit`（4 子目录 npm audit + uuid ≥ 11.1.1） | ✅ 4/4 全绿，uuid 均为 `^11.1.1` |
| `backend-ci.yml` | `test-7zi-backend`（lint + jest --coverage） | ✅ 16/16 套件、342/342 用例，覆盖率 91%+（门槛 60%） |
| `backend-ci.yml` | `test-workflow-engine`（lint + jest --coverage） | ✅ 6/6 套件、214/214 用例，覆盖率 88.85%（门槛 60%） |
| `backend-ci.yml` | `test-workflow-service` / `test-websocket-service` | ✅ **本轮新增**（此前这两个子服务无 lint/test 门禁） |

**结论：后端 CI 全绿；前端 CI 的 `test-unit` 必然红。**

### 前端 211 个失败用例分类（详见 `T85_FRONTEND_TEST_AUDIT.md`）

| 类别 | 用例数 | 性质 | 处置建议 |
|---|---|---|---|
| 断言过时（产品行为已演进，测试期望没跟上） | ~120 | **测试错** | 改测试期望，逐条核对产品新行为 |
| 手势/触摸事件未触发 | 40 | **基建错** | jsdom 未实现 TouchEvent 构造，需注入 Touch 对象 |
| 导入/模块解析失败 | 3 文件 | **基建错** | `supertest` 未安装；vi.mock 工厂引用顶层变量触发 hoist 报错 |
| 超时 | 1 | 基建错 | 双击检测用真实 setTimeout，fake timer 未推进 |
| 解析/收集配置错误 | 5 文件 | ✅ 本轮已修复入库 | — |

### CI 耗时风险
- `ci.yml` 的 `test-unit` 是 **4 分片并行**，每片 10 分钟超时
- 本机 4 核、load average 常驻 9~14（多代理并发），分片耗时会被显著放大
- 慢测试集中：`VisualWorkflowOrchestrator.test.ts`（62.6s）、
  `edge-cases-supplement.test.ts`（75.6s）、`workflow-execution.integration.test.ts`（22.8s），
  均为**真实 setTimeout 等待**（1~5 秒/用例），建议改 fake timer

---

# 7zi 项目 CI 门禁状态（2026-10-24 10:30，主管逐 job 复跑）

## ✅ 后端 CI 全绿
| Job | 结果 |
|---|---|
| `7zi-backend` lint（`eslint websocket/ workflow-engine/`） | ✅ exit 0 |
| `7zi-backend` jest --coverage | ✅ 16/16 套件、342/342 用例，覆盖率 91%+（门槛 60%） |
| `workflow-engine/backend` lint | ✅ exit 0 |
| `workflow-engine/backend` jest --coverage | ✅ 6/6 套件、214/214 用例，覆盖率 88.85% |
| `workflow-service` lint + test | ✅ exit 0，**engine 49/49 + http 41/41** |
| `websocket-service` lint + test | ✅ exit 0，**33/33** |
| 4 子目录 `npm audit --omit=dev --audit-level=moderate` | ✅ 0 漏洞；uuid 均 `^11.1.1` |

## 🔴 前端 CI `test-unit` 仍红
`ci.yml` 的 `test-unit` job（`vitest --shard=N/4`）：**211 失败 / 5588 通过 / 32 跳过**（5831 总数），387 秒。
五类分解（详见 `T85_FRONTEND_TEST_AUDIT.md`）：
- 断言过时（产品行为已演进，测试期望没跟上）~120 → **测试错**
- 手势/触摸事件未触发 40 → jsdom 未实现 TouchEvent 构造
- 导入/模块解析失败 3 文件 → `supertest` 未装；vi.mock 工厂引用顶层变量触发 hoist 报错
- 超时 1 → 双击检测用真实 setTimeout
- 解析/收集配置错误 5 文件 → ✅ 本轮已修

## 本轮关键修复（已入库）
- `8a3a6f2fc0` —— **`workflow-service` 回移加固版 `safeEval`**。该目录此前还在用
  **旧版 `eval()`**，与 `workflow-engine/backend` 已分叉。改为 `new Function` +
  字面量注入，变量内容不再被当代码执行；补齐 `toLiteral`/`buildEvalScope`，
  `resolvePath` 支持数组下标；非法占位符路径（`a..b`）抛 SyntaxError 让
  `evaluateCondition` 能 emit `condition:error`（旧实现静默变 undefined，
  调用方无法区分"条件为 false"和"条件写错了"）。
  同时：HTTP 层不再给 `version` 兜底 `'1.0.0'`（否则引擎的 version 必填校验
  变成死代码，"缺 version 应 400" 契约失效）；bodyParser 上限 100kb → 10mb。
- `c196ebb030` —— **`deploy.sh` 健康检查改用容器内自检**。原先打 `localhost:3000`，
  但 3000 不是宿主机对外端口（生产源站实测连接被拒），会**误判失败并自动回滚**。
  现按三层判定：容器 running → 容器内 `127.0.0.1:3000/api/health` → 公开入口
  （默认只告警，`strict` 才硬失败）。Cloudflare WAF 拦默认 curl UA，探测改带浏览器 UA。
- `f1fd650ddf` —— **更正 `prometheus.js` 的处理方式**。该文件是 tsc 从同名 `.ts`
  编译出的 ES5 产物，里面的 `var _this = this` 是 **tsc 对箭头函数的正确降级**，
  不是死代码。已撤销手工改动，改为在 `eslint.config.mjs` 中忽略该编译产物。

---

# 🔴 生产部署拓扑实测（T91，2026-10-24 10:30，SSH 只读实测源站）

**`deploy.sh` 假设的 Docker 蓝绿拓扑在生产上根本不存在。**

| 项 | 生产实况 |
|---|---|
| Docker 容器 | 12 个，**全是 `octo-*`**（另一个产品），**无 7zi-frontend** |
| PM2 进程 | 5 个，**无 7zi-frontend**；`/var/www/7zi`、`/opt/7zi-frontend` 均无进程在跑 |
| `7zi.com` 首页 | nginx 托管的**纯静态站** `/var/www/erhu-brand/china-for-free`（无 `.next`） |
| `/api/health` | nginx → `127.0.0.1:3001` → `/data/web/marriage` 的 tsx server（**另一项目**） |
| 3002 | `next-server (v15.5.15)` @ `/data/var/www/new-7zi-site`（服务 ai/export 子域） |
| `anti-v2` | **stopped ↺10** —— 未处理的上线故障 |
| RAM | **97.3%** —— 不能 `next build` |
| 健康接口真实响应 | `{"status":"ok"}` —— **不是 `healthy`** |

## deploy.sh 的三处硬伤
1. `get_compose_file()` production 分支指向**不存在**的 `docker-compose.zero-downtime.yml`
2. 蓝绿 service `7zi-frontend-blue` / `-green` 在生产和现有 compose 文件里**都不存在**
3. `/works` 路由在 `src/app` 下**不存在**

## 🔴 生产服务器同样内嵌明文 PAT
`/var/www/7zi/.git/config` 的 remote URL 里有一个**仍有效**的 GitHub PAT
（与本地 botmem 历史里发现的是同一个）。已在报告中脱敏。
**必须吊销**，且吊销后同步修 remote URL。

## 新增待拍板 4 条
1. 部署目标是 `/var/www/7zi`（在跑 git，19 dirty）还是 `/opt/7zi-frontend`（不在进程表）？
2. 服务器 `git pull` + build + PM2 切换，还是本地构建 rsync？
3. 补齐 compose 文件，还是把 `deploy.sh` 改成 PM2 路线？
4. `anti-v2` 反复崩溃是否一并处理？

完整报告：`T91_PRODUCTION_TOPOLOGY.md`

---

# 🔴 前端双树分叉 —— CI 跑的是根级，修复却落在嵌套树（T97，2026-10-24）

**这是本轮最容易被骗的地方，改前端前必须先确认改的是哪棵树。**

| | 根级 `src/` + `tests/` | 嵌套 `7zi-frontend/src/` |
|---|---|---|
| 版本 | 1.14.2 | 1.14.1 |
| CI `test-unit` 跑谁 | ✅ **跑这棵树**（根 `vitest.config.ts` include `src/**`、`tests/**`） | ❌ 从未在根 CI 跑过 |
| 实际发布 | ✅ `deploy.sh` rsync 整仓 + 根 `Dockerfile` `COPY . .` | ❌ 不发布 |
| 文件数 | 1883 | 982 |

**同名文件 121 个，内容分叉 116 个（95.9%），只有 5 个一致。**

## 后果
2026-06-01 以来触碰 `7zi-frontend/src` 的 **35 个 commit 中，31 个（88.6%）只改了非发布树**；
同期根级 `src/` 只收到 7 个 commit。→ **"修好了"不等于"CI 变绿"。**

## 已踩的坑（务必记住）
- `6bc88ab75f` / `cb56fd87bb`（useTouchGestures / useSwipe 手势修复）
  改的是**嵌套树**，根级 CI **一行都跑不到**。
- `e475608a72`（auth 501 契约对齐）同理 —— 根级是真实 `loginUser` 实现，
  没有 501 短路，"501 契约"模型在根级**不适用**。
- `d2328ff110` 声称做了 3 处安全修复，实际 `git show --numstat` 里**源码改动 = 0**
  （只改了 `DEV_TASKS_*.md` / `state/tasks.json`）。修复**从未进入任何树**。

## 强制前置检查（派单时必须写进任务书）
```bash
# 1. 确认目标树
ls src/hooks/useSwipeGestures.ts 2>/dev/null && echo "→ 根级（发布树）"
ls 7zi-frontend/src/hooks/useTouchGestures.ts 2>/dev/null && echo "→ 嵌套树（非发布）"
# 2. 确认 import 路径归属
grep -rn "from '@/" src/ | grep 7zi-frontend   # 应为空
```

## 推荐收敛方案（待主人拍板，勿擅自执行）
- **SSOT = 根级 `src/` + `tests/`**
- Phase 0（零成本）：子代理任务书写死 `src/` 前缀 + pre-flight 断言
- Phase 1：`git mv 7zi-frontend 7zi-frontend.legacy`（可逆、不丢历史）
- Phase 2：13 个根级缺失模块差异化回迁（`lib/automation/`、`components/WorkflowEditor/` 优先）
- Phase 3：`d2328ff110` 的安全修复真正落到根级 `src/app/api/auth/login/route.ts`
- **symlink 方案不推荐**（git 不跟踪 symlink 目标、Windows runner 需 `symlinks: true`）

## 🔴 移除嵌套树前必查（R7 高危）
根级 `tests/` 有 **6 个文件 13 处 import 指向嵌套树**：
`tests/automation/**`（4 个）、`tests/components/WorkflowEditor/AutoLayout.test.tsx`、
`tests/integration/alert-system-edge-cases.test.ts`。
其中 `performance-monitoring/alerting/*` **在嵌套树里也已不存在**
（实际路径是 `lib/performance/alerting/`）→ 这些测试**现在就是断链的**。
→ 移除前必须先改指根级，否则**立即编译失败**。

完整报告：`T97_FRONTEND_TREE_DEDUP_AUDIT.md`（470 行）

---

# 🛠️ 本轮已落地的手势修复（嵌套树，2026-10-24）

`6bc88ab75f` / `cb56fd87bb`，`useTouchGestures.test.ts` 52/52、`useSwipe.test.ts` 25/25。

**真实产品缺陷（不只是测试问题）：**
1. 双指缩放比例分母写成 `touches[0].clientX - touches[0].clientX + 1`，**恒等于 1**
   → 双指缩放完全失效。改为 touchstart 记录初始双指间距。
2. 滑动命中阈值后**仍会额外触发 `onTap`**，一次手势被算成两种。
3. DOM 监听器直接绑定 `handleTouchStart/Move/End`，**绑定那一刻的闭包被固化**
   → handler 依赖的 state（如 `scale`）永远停在初值。改为稳定转发函数。
4. 原实现只在 `useEffect` 里读 `elementRef.current`，元素晚于 effect 就绪时
   **监听永远绑不上**。改为 ref setter 中同步挂载/卸载。
5. 阈值判定 `>` 应为 `>=`（正好等于阈值不触发）；两轴等距应优先水平方向。
6. `touchend` 的抬起手指在真实 DOM 中位于 `changedTouches`，
   原实现只读 `changedTouches[0]`，只填 `touches` 的环境直接失效。
   改为 `e.changedTouches[0] ?? e.touches[0]`。

**新增公开 API：** `setScale(scale)`（与 `resetState` 对称的程序化缩放接口）

**测试基建坑（下次别再踩）：**
- `result.current.gestureState = {...}` **改不了 hook 内部 state**（那只是返回值快照）
- `vi.advanceTimersByTime()` 必须包在 `act()` 里，否则 React 不刷新 state
- fake timers 下 `waitFor` 不推进定时器 → 12s 超时；改同步断言
- `fireEvent.touchEnd` 只填 `touches` 不填 `changedTouches`，需手动补

---

# 🔴 根级 CI 门禁真实基线（T138/T139 实测，2026-10-25）

**注意：之前"211 failed"是嵌套树的口径。根级 CI 跑的是根 `src/` + `tests/`，口径完全不同。**

根级 `npm run test:run`（= CI `test-unit` 的 4 shard）：
- 失败文件 **294 个**，全量跑完**超过 4.6 小时仍未结束**（单进程串行）
- 4 shard、每片 `timeout-minutes: 10` → **分片超时是必然的，不是偶发**

## 本轮已修掉的三处"单文件就能撑爆分片"的元凶

| 文件 | 原耗时 | 现耗时 | 根因 |
|---|---|---|---|
| `src/lib/storage/__tests__/draft-storage.test.ts` | **354s** | 2.6s | mock 的 request 只有 `onsuccess: null`，赋值后没人触发 → Promise 永不 resolve，每个用例都挂到超时 |
| `src/lib/prefetch/prefetch.test.ts` | **73s** | 3.6s | 预取 promise 等 `link.onload` 才 resolve（fire-and-forget 语义错），且超时定时器不清理 |
| `7zi-frontend/src/hooks/__tests__/useTouchGestures.test.ts` | 挂起 26 例 | 52/52 | ref 晚于 effect 就绪 → 监听器永远绑不上 |

## 通用套路（下次照抄）

1. **mock 的 `onsuccess`/`onerror` 必须在赋值时立即回调** —— 否则 Promise 永不 resolve，
   每个用例都等 vitest 超时。写一个 `createAutoRequest()` 用 getter/setter 解决。
2. **mock 的 db 对象要补齐所有方法** —— 少一个 `close()`，`afterEach` 抛 TypeError，
   整个 describe 块全判失败。
3. **动态 `await import()` 拿不到 `vi.mock` 的替换** —— 改静态 import。
4. **mock 路径必须用 `@/` 别名，不能用相对路径** —— `vi.mock('../lib/db/connection')`
   和 `vi.mock('@/lib/db/connection')` 在 vitest 里是**两个不同的模块 ID**，
   用相对路径会导致业务代码里的别名导入拿到**真实模块**（连到真 SQLite）。
   `src/test/vi-mocks.ts` 里已全局踩过这个坑。
5. **mock 工厂漏符号 → 整个文件收集失败（0 test）** —— 用 `importOriginal` 保留真实实现，
   只覆盖要断言的符号，别手写全量工厂。
6. **`vi.mock` 工厂返回 async 函数给同步 API** → 路由解构拿到 undefined。
   `db.queryRows()` 是**同步**的，返回 `T[]` 而不是 Promise。
7. **fake timers 下 `waitFor` 不推进定时器** → 12s 超时；改同步断言。
8. **改 hook 的 state 快照改不了 hook 内部 state** ——
   `result.current.gestureState = {...}` 只是返回值快照；
   要么加公开 setter（如 `setScale`），要么走真实手势路径。

## 改名/契约变更后必须回头改测试（真实踩坑）

- `b4889d4e1` 把 `navigate()` 改名成 `recordPath()`，改了 `user-behavior.test.ts`，
  但 **`prefetch.test.ts` 没跟着改**，调的是一个已不存在的方法。
- `analyzeNavigation()` 返回 `{ routes, predictions, insights }`，
  **没有 `patterns` 字段** —— 那是另一个接口的形状。
- `analyzeNavigation` 只收录 `count >= minVisits(2)` 的路径，单次访问不算模式。
- 用户的密码路由是 `src/app/api/auth/login/` + `register/`，
  **不是** `src/app/api/auth/`（嵌套树才是后者）。
