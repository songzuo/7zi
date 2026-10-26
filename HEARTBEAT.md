# HEARTBEAT.md

# OpenClaw相关任务前必读

在执行任何OpenClaw配置相关任务之前，请先阅读:
- openclaw-knowledge-base.md (本机的OpenClaw知识库)

这样可以确保使用最新的配置格式和最佳实践，避免使用过时的大模型知识。

---

# Claw-Mesh 集群巡检清单

集群节点：bot2 / bot3 / bot4 / bot5 / bot6，共享仓库 `songzuo/botmem`。

**先确认自己在哪台**：`hostname` + `curl -s ifconfig.me` ——
⚠️ **本机是 bot3**（hostname=VM-0-4-opencloudos，公网 159.75.149.84 = bot3.szspd.cn）。
"本机"指 bot3，**不是 bot2 也不是 bot4**。bot6 是另一台独立机器 109.123.246.140。
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

## 24. 备份仓库会"推飞"（2026-10-25 踩过）
`/root/.openclaw/backups/github/repo` 长期不 pull → **ahead 29 / behind 305**，
`backup-static.sh` 的 push 被拒（非 fast-forward），备份静默堆积。
- 巡检必查：`cd /root/.openclaw/backups/github/repo && git rev-list --left-right --count HEAD...origin/main`
- 修复：`git pull --rebase origin main`（`claw-mesh-state.json` 会反复冲突，
  循环 `git checkout --theirs` + `git add` + `git rebase --continue` 处理）
- ⚠️ rebase 前先 `git checkout -- claw-mesh-deploy/scripts/claw-mesh-sync.sh`，
  本地可能是含 `YOUR_GITHUB_TOKEN_HERE` 的陈旧模板
- 根因：备份脚本 push 前没有可靠地 pull --rebase

## 25. 跨节点 SSH 现状（2026-10-25）
**只有 bot2 ↔ bot6 能互访**（用 `~/.ssh/b6_ed25519`）。
bot2 → bot3/4/5 全 `Permission denied`；bot6 → bot3/4/5 同样被拒。
bot2 本机的 `id_ed25519` 私钥**已不存在**（只剩 `b6_ed25519` 与
`id_ed25519_backuptunnel`），对端 authorized_keys 都不认。
→ 清单第 2/3/4/5 项目前只能靠共享仓库里的 state 副本间接核对。

## 26. 备份仓库 push 被拒（2026-10-25 已修复脚本）
`backup-memory.sh` / `backup-static.sh` 原来用
`git pull --rebase origin main 2>/dev/null || ... || true` —— **失败被吞掉**，
本地落后远端后 push 必然 non-fast-forward，备份静默堆积（实测 ahead 2 / behind 23）。
→ 脚本已改为：rebase 失败自动解决冲突重试 5 次，仍失败则**中止并报错**（不再 `|| true`）。
→ 巡检必查：`cd /root/.openclaw/backups/github/repo && git rev-list --left-right --count HEAD...origin/main`（应为 `0 0`）
→ 修复手法：残留 rebase 状态先 `rm -rf .git/rebase-merge .git/rebase-apply`；
  rebase 后 HEAD 会 detached，**必须 `git checkout main` 再 push**，否则推的是陈旧 ref。

## 27. 脱敏 pattern 漏了 `moltbook_sk_` 下划线形式（2026-10-25 定位）

**症状**：moltbook API key 一直"脱敏不干净"——
旧 pattern 是 `s/sk_[A-Za-z0-9]*/[已移除]/g`（下划线，破坏标识符），
换成安全版 `s/(^|[^A-Za-z0-9_])sk-[A-Za-z0-9_-]{20,}/...`（连字符）之后，
**`moltbook_sk_XXXX` 这种下划线形式反而完全匹配不上了** → key 从未被脱敏。

**更阴的一点**：手工/半自动脱敏只替换了 key 的前半段，尾部 `-<尾部已脱敏>`
仍以明文留在文件里（形如 `moltbook_sk_[已移除]`），
而且**源文件不变 → 下一轮同步又把带尾部的旧值推回仓库**，
形成"每天自动复活"。

→ 修法（已落地，bot4 2026-10-25 推到 origin/main）：
  1. sed 补两条 pattern：
     `s/(^|[^A-Za-z0-9_])moltbook_sk_[A-Za-z0-9]{10,}/\1moltbook_sk_[已移除]/g`
     `s/moltbook_\[已移除\][-A-Za-z0-9_]*/moltbook_[已移除]/g`
  2. `grep -rlE` 的定位 pattern 也要加 `moltbook_sk_[A-Za-z0-9]{20,}` 和 `moltbook_\[已移除\]`
     —— 否则文件根本不会被 sed 扫到
  3. 注意：`sk-`（连字符）≠ `sk_`（下划线），**两种都要覆盖**

**自查**：
```bash
grep -rnE 'moltbook_[A-Za-z0-9_\[\]-]{8,}' --include='*.md' . | grep -v '已移除]'
git grep -nE 'moltbook_sk_[A-Za-z0-9]{20,}|moltbook_\[已移除\]' origin/main -- .
```

## 28. 每日备份脚本会把已脱敏的密钥"复活"（2026-10-25 定位）

**症状**：`7zi.com/memory/2026-07-30.md` 里的两把真实 API key
（`sk-` 开头的一对真实 key（Coze/第三方端点））在 01:09 被 "OpenClaw Security" 脱敏，
**当天 08:00 又原样出现**。

**根因**：`7zi.com` 节点的**每日上传脚本不做脱敏**，
它把本机源文件（仍是明文）原样推到共享仓库，覆盖掉安全提交。
→ 这是"源在明文 + 上传不做脱敏"的循环，不是单次事故。

→ 处置：先在仓库侧重新脱敏（bot4 已做，提交 `09885abb11`），
  **但根治必须在 7zi 节点上做**：源文件脱敏 + 上传脚本加脱敏步骤。
  巡检必查：
```bash
git grep -nE '(^|[^A-Za-z0-9_])(sk-[A-Za-z0-9]{25,}|gh[p]_[A-Za-z0-9]{20,})' origin/main -- .
```
→ **只要这条命令有输出，就是密钥又活了**，必须重新脱敏并追查来源节点。

**教训**：在共享仓库里做"脱敏"只是止血；
**只要还有节点的源文件是明文、且它的上传脚本不脱敏，明天就会复活**。

## 29. 同步脚本改完要真的跑一遍（2026-10-25 做法）
改 live 脚本后：
1. `bash -n` 语法校验
2. **直接执行一次** `bash /root/.openclaw/cron/claw-mesh-sync.sh`，看日志是否走到"✅ 同步完成"
3. 用 `git show <sha> --name-only --format=''` 确认提交只动了本节点目录
4. 用独立 clone 推送到 origin/main（**不要在同步专用工作副本里改**——
   它每 5 分钟被 `git reset --hard origin/main` 清空，改动会丢）

## 30. 护栏本身会误报，把节点静默停摆（2026-10-25 bot5 实测）

**症状**：bot5 在 10:43 加了"提交前损坏不变量校验"之后，
同步提交只剩 10:50 一条，之后全部消失（它平时每 5 分钟一次）。
**看起来像"节点掉线"，实际是护栏每轮都中止提交。**

**根因**：护栏用
```bash
grep -qE '[A-Za-z0-9_]+\[已移除\]' "$f"   # 文件里有就报错
```
判断文件是否被损坏。但**巡检记录本身会引用损坏样例**
（如 ``ta[已移除]` 出现在"如何还原被误伤标识符"的复盘文档里）→ 误报 →
`save_state 3 "identifier_corrupted"` + `return 1` → 每轮同步都失败。

**更隐蔽的一点**：护栏在 `git commit` **之前**中止，
所以仓库里 bot5 的 `claw-mesh-state.json` 仍停在最后一次成功那轮的
`healthy` —— **"状态看起来健康"与"节点已停摆"同时成立**。
→ 光看 state 里的 status 会漏掉这种停摆，**必须看 lastSync 是否在推进**。

**正确判据**（只拦"本次新增"的损坏）：
```python
old_marks  = set(re.findall(r"[A-Za-z0-9_]*\[已移除\]", old))   # HEAD 版本
old_tokens = set(re.findall(r"[A-Za-z0-9_]*sk_[A-Za-z0-9_]*", old))
# 新版本里出现 HEAD 没有的 [已移除]，且其前缀在 HEAD 里对应 X_sk_Y → 真损坏
```
已用真实数据验证：bot5 的复盘文档 → 放行；bot6 历史损坏版 → 拦截。

**教训**：**护栏必须先在真实数据上验证放行/拦截两个方向，再上生产**。
只测"能拦住坏文件"不够 —— 还会误伤好文件，而误伤的表现是"节点静默消失"，
比不装护栏更难查。

## 31. 巡检必查：lastSync 是否在推进（不只是 status）
state 里 `status: healthy` 只说明**最后一次写 state 时**是健康的。
护栏中止、push 被拒、fetch 挂死（bot5 10:50-11:10 复现：进程挂在 fetch 上 20 分钟）
都会留下"健康的旧 state"。
```bash
git log --format='%ad %s' --date=format:'%H:%M' origin/main --grep='<节点>: Claw-Mesh' | head -4
# 对比该节点的推送节奏（bot5 每 5 分钟、bot2 :00 / bot4 :15 / bot6 :30 / bot3 :45）
```
落后超过 2 个周期 → 节点已停摆，即使 state 显示 healthy。

⚠️ **各节点节奏不同，别用同一把尺子**（据 2026-10-25 实测）：
| 节点 | 节奏 | 槽位 |
|---|---|---|
| bot5 | 每 5 分钟 | `*/5` |
| bot2 | 每 4 小时 | `:00` |
| bot3 | 每 4 小时 | `:45` |
| bot4 | 每 4 小时 | `:15` |
| bot6 | 每 4 小时 | `:30` |
→ bot3 08:45、bot6 08:30 之后没新同步是**正常**，下一槽位 12:45 / 12:30。
→ 只有超出**自己节奏** 2 个周期才算停摆。

## 32. 部署脚本会被 bot4 的本地副本覆盖（2026-10-25 踩过两遍）
`claw-mesh-deploy/scripts/` 下的文件**由 bot4 自己的本地副本推送**（bot4 的 live 脚本
`git add claw-mesh-deploy/`）。所以：
- bot2 在仓库里改 `claw-mesh-selfheal.sh` → **bot4 下一轮同步（:15）会用它本地的旧副本覆盖回去**
  （实测：bot2 15:53 的修复被 bot4 15:52 的提交覆盖，第二次应用才成功）
- 推论：**改仓库里的部署脚本 ≠ 修好节点**（第 21 条的又一次应验）。
  → 部署类修复必须让 bot4 侧也更新本地副本，bot4 拉一次 origin/main 才生效
  → 或由 bot2 在 bot4 同步前把修复提交好并观察下一轮是否被覆盖

## 33. 脚本里的"修复版"要验证它真的执行（2026-10-25）
bot4 的 selfheal 脚本注释写着「实测 bot5 15:35 后停摆」并声称已修 rebase 残留，
但检查的路径 `$WORK_DIR/botmem/.git/rebase-merge` **永远不存在**
（`WORK_DIR` 就是 clone 根，git dir 是 `$WORK_DIR/.git`）→ 清理逻辑一次都没跑过。
- **注释里的"实测"不等于代码真的走过那条路径**
- 修完脚本必须：① `bash -n` ② 造出触发条件实跑 ③ 检查目标路径确实被访问
- 巡检时看脚本里的路径变量是否与实际目录结构一致（`WORK_DIR` vs `WORK_DIR/.git`）

## 34. 节点互相覆盖污染：三条路径要一起堵（2026-10-25 实测）

**症状**：bot6 在 16:30 的"提交合并完成"提交（`d0970581b8`）里，
bot2/MEMORY.md、bot2/memory/2026-10-25.md、bot3/MEMORY.md、bot3/memory/2026-10-25.md
**全变成了 bot6 自己的内容**（bot3/MEMORY.md 开头是"bot6 巡检记录"）。
bot6 自己 16:30 的状态显示 `files_synced: 70`，而其他节点只有 1-8 → **数量异常就是信号**。

### 三条污染路径（第 23 节只记了第一条）
1. **提交时暂存范围**：`git add .` / `git add -A` 会把**所有**节点目录一起提交。
   → 必须是 `git add "$MACHINE_NAME"/`
   （同一段里前一行已经是对的，唯独"提交合并完成"那步漏了 → **要逐行核对**）
2. **脱敏范围**：全仓库 `find $BOTMEM_DIR | sed -i` → 节点 A 的 sed 改写节点 B 的文件。
   → 必须是 `find "$BOTMEM_DIR/$MACHINE_NAME"`
3. **拷贝顺序**：`git reset --hard origin/main` 在前、`cp -r $WORKSPACE_DIR/$MACHINE_NAME`
   在后 → 本机副本（可能已脏）把仓库里已修好的版本**盖回去**。
   实测 bot3 因此**无法自愈**：仓库恢复干净后，它在 20:45/20:52/21:03
   **三次**把污染内容又推回来。→ 拷贝前先 fetch+reset，且**跳过空文件**
   （空文件几乎总是"覆盖事故"的结果，不是真实内容）。

### 巡检必查
```bash
# 1) 每个提交只动了自己的目录吗？
for c in $(git log --format='%h' origin/main -12); do
  echo -n "$c: "; git show $c --name-only --format='' | grep -oE '^[a-z0-9._-]+/' | sort -u | tr '\n' ' '; echo
done
# 2) 各节点文件归属对吗？（第一行应该像自己的内容）
for n in bot2 bot3 bot4 bot5 bot6; do
  echo -n "$n/MEMORY.md :: "; git show origin/main:$n/MEMORY.md | head -1 | cut -c1-40; echo
done
```
→ 出现别人的内容、或文件数明显偏多（70 vs 平时 8）= **正在污染**。

**教训**：堵污染要**三条路径一起堵**。只堵了脱敏范围，
提交范围和拷贝顺序照样能把内容送到别人目录里。

## 35. 同一时刻槽的两个任务写同一个文件 = 永久死循环（2026-10-25 20:00 实测）
**症状**：bot2 20:00 的同步 6 次 push 全被拒，日志 `❌ Claw-Mesh 同步失败`，
但 `claw-mesh-state.json` 写着 `status: healthy` —— **状态文件完全掩盖了失败**。

**根因（三层）**：
1. `backup-memory.sh`（`0 */4` = **:00**）与同步脚本（`:00`）**同槽**，
   且**都写** `bot2/memory/claw-mesh-state.json` → 互为对方制造冲突
2. 同步脚本 push 重试里 rebase 冲突只 `abort` —— 等于什么都没做，
   下一轮 push 照样 non-fast-forward → 6 次重试全废
3. `save_state 4 "push_failed"` 被后面的 `save_state 0 "idle"` 覆盖 → 永远 healthy

**修法**：
- rebase 冲突时**自动解决**（冲突文件取远端版）+ `rebase --continue`，不要只 abort
- push 失败写独立标记文件（成功时清除），巡检优先读它
- **运行时状态文件只允许一个任务写**（备份脚本不要提交 state 文件）
- crontab **错峰**：同一台机器上所有写共享仓库的任务不能落在同一分钟

**巡检必查**：
```bash
grep -E '推送失败|同步失败' /var/log/claw-mesh.log | tail -5   # 不能只看 state.status
ls -la /var/run/claw-mesh-sync.pushfailed 2>/dev/null          # 存在=上轮没推上去
crontab -l | grep -E 'backup|claw-mesh|sync-from'               # 看有没有同槽
```

## 36. rebase 冲突时 --theirs / --ours 的方向容易搞反（2026-10-25）
在 `git rebase` 过程中：
- **`--theirs` = 待重放的那一侧**（= 你的本地提交）
- **`--ours` = 已经变基到远端的那一侧**（= 远端内容）
备份脚本原写法 `checkout --theirs || checkout --ours` → 优先取的是**本地**，
等于用本地覆盖远端 —— 方向反了。
→ 全量覆盖式备份脚本应取 **`--ours`（远端侧）**；
  但普通同步脚本要保留自己的改动，取 `--theirs`（本地侧）—— **两者相反，要按场景选**。

## 37. `git diff --quiet` 守卫在共享仓库里**永远为假** → 共享清单从未分发（2026-10-26 00:00 实测）

**症状**：bot3 是唯一还在跑旧脚本的节点（383 行 vs 其他节点 423 行），
22:25 它把 bot2 的身份行写进了 `bot2/memory/2026-10-26.md`，
23:28 又把 bot4 的身份行写进了 `bot4/memory/2026-10-26.md`。

**根因（两层，都很隐蔽）**：
1. 共享清单的分发逻辑带了守卫：
   ```bash
   if git -C "$WORKSPACE_DIR" diff --quiet -- HEARTBEAT.md 2>/dev/null; then
       cp "$STATIC_DIR/HEARTBEAT.md" "$WORKSPACE_DIR/HEARTBEAT.md"
   fi
   ```
   本意是"本机改过就别覆盖"。但**同步工作区本身就是共享仓库的 checkout**，
   里面还有 `bot2/ bot5/ ...` 等其它节点的目录 → `git diff` **永远非空**
   → 守卫**永远为假** → **共享清单从未分发到 bot3**。
2. 于是 bot3 一直拿不到第 31/34 节的教训（"必须 `git add "$MACHINE_NAME"/`"），
   一直跑着带 `git add .` 的旧脚本 → 持续污染别人的目录。
   **一个看起来合理的"保护性守卫"，反而让最需要修复的节点永远收不到修复指引。**

**修法**：分发时**不要用 `git diff` 判断"本机是否改过"**。
```bash
if [ -f "$STATIC_DIR/HEARTBEAT.md" ]; then
    if [ -f "$WORKSPACE_DIR/HEARTBEAT.md" ] && \
       ! cmp -s "$STATIC_DIR/HEARTBEAT.md" "$WORKSPACE_DIR/HEARTBEAT.md"; then
        cp "$WORKSPACE_DIR/HEARTBEAT.md" "$WORKSPACE_DIR/HEARTBEAT.md.local.bak"
    fi
    cp "$STATIC_DIR/HEARTBEAT.md" "$WORKSPACE_DIR/HEARTBEAT.md"
fi
```

### ⚠️ 更要紧的：**crontab 里可能内嵌了整份脚本副本**
bot3 的 crontab **不是**调用 `/root/.openclaw/cron/claw-mesh-sync.sh`，
而是**内嵌了一整份 1000+ 行的脚本**。于是：
- 你改了 `/root/.openclaw/cron/claw-mesh-sync.sh` → **完全不起作用**（cron 跑的是内嵌副本）
- 仓库里的 `botN/claw-mesh-sync.sh` 副本同理（每次同步都会被节点自己的 live 脚本覆盖回去）

**巡检必查（每个节点都要查，不能只看本机）**：
```bash
# 1) crontab 是调用脚本，还是内嵌了脚本？
crontab -l | grep -cE '^\s*git add \.|rebase origin/main'   # >0 = 内嵌副本，必须一起改
crontab -l | grep -nE 'claw-mesh-sync\.sh'                   # 期望：只有一行调用
# 2) 节点的 live 脚本和仓库副本是否一致？
ssh root@botN.szspd.cn 'grep -c "git add \"\$MACHINE_NAME\"/" /root/.openclaw/cron/claw-mesh-sync.sh'
# 3) 静态分发守卫是否被 git diff 卡死？
grep -n 'git diff --quiet -- HEARTBEAT.md' <脚本>
```

**教训**：**"仓库里改了"≠"节点上生效"**（第 21、24 节）——
这里还要再加一层：**"脚本文件改了"≠"cron 会跑它"**。
判断节点是否修好，要看 **cron 实际执行的那份脚本**，
而不是 `/root/.openclaw/cron/` 下你改的那个文件。

## 已知遗留（需用户决策，勿擅自处理）
- git 历史中可能仍残留旧 token —— 彻底清除需重写历史 + 强制推送
- 仓库内 7.5 万个 node_modules 文件 —— 清理需重写历史
- bot5 每 5 分钟推送一次，频率高于其他节点
- **跨节点 SSH 从 bot4 全部被拒**（bot4 → bot2/3/5/6 `Permission denied (publickey)`）。
  需在其它节点把 bot4 的公钥加进 `~/.ssh/authorized_keys`。
  bot4 公钥指纹：`selfadm-bot4 SHA256:HVsRFkhJH6LJBZsPD3XbDVtyoHO45Ow3sjVx64NTtQM`

## 推送时间（已错峰，勿改成同一时刻）
bot2 `:00` / bot4 `:15` / bot6 `:30` / bot3 `:45` / bot5 `*/5`

## 38. 备份脚本的 rebase 会因"工作区有改动"而中止（2026-10-26 05:05 实测）

**症状**：`/var/log/backup-memory.log` 出现
`!! pull --rebase 失败，中止备份（避免 push 被拒）`，
备份仓库 `rev-list --left-right --count HEAD...origin/main` = `0 59`（持续落后堆积）。

**根因**：**不是 rebase 冲突**，而是
`error: cannot rebase: You have unstaged changes`
—— 上一轮运行残留的运行期文件改动（如 `bot2/memory/claw-mesh-state.json`
的 lastUpdate/lastSync 字段）留在工作区 → `git pull --rebase` 直接拒绝执行。

**另一个坑**：这种情况本来是 **fast-forward 可拉取**的，
用 rebase 反而多引入了这个失败条件。

**修法（已落地）**：`backup-memory.sh` / `backup-static.sh` 在
`git fetch origin` 之后、`git pull --rebase` 之前加：
```bash
git checkout -- . 2>/dev/null || true
git reset -q HEAD 2>/dev/null || true
```
备份内容随后会从工作区 `cp -r` 覆盖回来，**拉取前丢弃工作区改动是安全的**。

**巡检必查**：
```bash
tail -20 /var/log/backup-memory.log | grep -E '中止备份|PUSH FAILED'
cd /root/.openclaw/backups/github/repo && git rev-list --left-right --count HEAD...origin/main   # 应为 0 0
```

**教训**：**"pull --rebase 失败"有多种原因**，日志里 CONFLICT 关键字只是其中一种。
遇到 rebase 类报错，先把 `git rebase` 的完整输出读一遍再下结论，
别默认是冲突。（这跟第 35 节"rebase 冲突只 abort → 等于什么都没做"是同一类问题：
**看真实错误信息，不要按预设的剧本处理**。）

## 39. watchdog 改写 status → 同步脚本每轮都误判"未完成"并重置工作副本（2026-10-26 05:35 实测）

**症状**：`/var/log/claw-mesh.log` 里每天 00:00 / 04:00 固定出现：
```
[WARN] [bot2] 检测到未完成的同步，触发恢复
[INFO] [bot2] 启动故障恢复...
HEAD is now at <sha> ...
```
看起来像"节点总在故障恢复"，但每次同步其实都成功了。

**根因（两层）**：
1. `claw-mesh-watchdog.sh` 每 5 分钟执行
   `sed -i 's/"status": "[^"]*"/"status": "healthy"/' $STATE_FILE`
   → **status 永远是 `healthy`，永远不会回到 `idle`**。
2. 同步脚本的恢复判据是
   `status != "idle" && (now - lastUpdate) > 3600`
   → `lastUpdate` 只有同步脚本自己更新，watchdog 不碰它
   → **距上次同步超过 1 小时后，每一轮同步都满足条件**
   → 每轮都执行 `recover_from_failure()`（`git reset --hard` + `git clean -fd`）
   → **反复清空同步工作副本**，看起来"在同步"其实一直在重置。

**修法（已落地）**：判据改用 **step**。
`step > 0` 才表示"上轮真的停在中途"（step 0 = 正常完成）。
```bash
local step=$(echo "$state" | grep -o '"step": [0-9]*' | cut -d' ' -f2)
[ -z "$step" ] && step=0
if [ "$step" -gt 0 ] && [ $((now - last_update)) -gt 3600 ]; then
    log "WARN" "检测到未完成的同步（step=$step），触发恢复"
    recover_from_failure
fi
```
已同步到模板 + bot2/3/5/6 脚本副本（commit `9df0476a89`），
bot2 / bot6 的 live 脚本也已更新并实跑验证（日志不再出现恢复刷屏）。

**教训**：**多个组件写同一个状态字段时，"谁写谁读"要一起看**。
watchdog 只写 `status`，同步脚本却拿 `status` 当"是否正常"的判据 →
两个组件对同一个字段的语义理解不一致，就出现这种"每天定时误报"。
→ **状态文件里每个字段都要有唯一语义归属**；
→ 判据要选**不会被别的组件覆盖**的字段（step / lastSync，而不是 status）。

## 40. 节点 live 脚本可能落后仓库副本很远（2026-10-26 05:35 实测）

**症状**：bot6 每 4 小时把自己的 17 个文件改坏（`ta[已移除]`），
仓库侧却已经有修好的脚本副本 —— 一直以为是"selfheal 在打补丁"。

**实测**（用 `~/.ssh/b6_ed25519` 登上 bot6，比之前所有节点都好使）：
- bot6 live 脚本：**589 行**，含破坏性 sed
  `-e 's/sk_[A-Za-z0-9]*/[已移除]/g'`（会吃掉 `task_request` / `disk_usage`）
- 仓库里 bot6/claw-mesh-sync.sh 副本：**700 行**，破坏性 sed 已删
- 差距 = **111 行 / 4 天**，期间 bot6 一直在用旧规则破坏自己

**同时发现 bot2 自己的 live 脚本也落后**（676 行 vs 仓库 700 行），
缺三处防护：清理遗留 rebase 状态 / 拷贝跳过空文件 / merge-heartbeat 合并。

**修法（已落地）**：
- 从仓库副本（已修复版本）出发，替换 `MACHINE_NAME` 后下发到节点
  `scp -i ~/.ssh/b6_ed25519 bot6/claw-mesh-sync.sh root@bot6:/root/.openclaw/cron/`
- 同时补上节点缺失的依赖：`/usr/local/bin/merge-heartbeat.py`
  （bot6 上原本没有 → 脚本里的 merge 分支永远走不到 → 共享清单只能 cp 覆盖）
- 下发后**实跑一次**并核对：提交只动 `bot6/` 目录、无标识符损坏

**教训（再次应验第 21 条）**：
**"仓库里改了"≠"节点上生效"** —— 而且这次差了 4 天没人发现，
因为巡检只看了"提交里有没有损坏"，没看**节点上那份脚本是第几版**。

**巡检必查（比什么都要靠前）**：
```bash
# 节点的 live 脚本 vs 仓库副本 —— 行数/关键防护一眼见分晓
ssh root@botN 'wc -l /root/.openclaw/cron/claw-mesh-sync.sh'
git show origin/main:botN/claw-mesh-sync.sh | wc -l
# 关键防护是否在位
ssh root@botN 'grep -c "git add \"\$MACHINE_NAME\"/" /root/.openclaw/cron/claw-mesh-sync.sh'
ssh root@botN 'grep -cE "s/sk_\[A-Za-z0-9\]\*/|s/ghp_\[A-Za-z0-9\]\*/" /root/.openclaw/cron/claw-mesh-sync.sh'  # 必须 0
```
