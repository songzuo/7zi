# HEARTBEAT.md

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
