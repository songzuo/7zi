# Claw-Mesh 集群交接说明

> 生成于 2026-10-22。当天巡检发现集群同步链路自 2026-03-15 起全线瘫痪，
> 经 8 轮排查全部修复。此文是给值班人的速查版，
> 详细排查过程见 `memory/2026-10-22.md`，巡检清单见 `HEARTBEAT.md`。

## 一、集群构成

| 节点 | 公网 IP | 主机名 | 推送 cron | 作用 |
|------|---------|--------|-----------|------|
| bot2 | 47.81.39.226 | bot2 | `0 */4` | 本机；拉取走 `sync-from-botmem.sh` |
| bot3 | 159.75.149.84 | bot3 | `45 */4` | 从节点 |
| bot4 | 43.159.49.231 | bot4 | `15 */4` | 从节点；上传走 `upload-botmem.sh` |
| bot5 | 182.43.36.134 | bot5 | `*/5` | 主力推送节点（每 5 分钟） |
| bot6 | 109.123.246.140 | bot6 | `30 */4` | 从节点 |

共享仓库：`https://github.com/songzuo/botmem`（仓库目录名 = 机器名）
SSH 密码统一为 `[已移除]`（已用 sshpass）

## 二、日常巡检（八项，缺一不可）

**核心原则：不要只看"同步是否成功"。** 今天修的 8 个问题，每一个都是在
"同步成功"的同时长期存在的。

```bash
cd /root/.openclaw/workspace

# 1. 本机健康
python3 -c "import json;print(json.load(open('memory/claw-mesh-state.json')))"
openclaw gateway status | grep Runtime:

# 2. 各节点状态 + 机器名（machine 字段必须等于真实机器名）
for m in bot3 bot4 bot5 bot6; do
  ssh root@$m.szspd.cn "python3 -c \"import json;print(json.load(open('/root/.openclaw/workspace/memory/claw-mesh-state.json')))\""
done

# 3. 时钟一致性（先做这步再看时间戳）
for m in bot3 bot4 bot5 bot6; do ssh root@$m.szspd.cn "date '+%F %T %Z'"; done
# 全部应为 CST / Asia/Shanghai

# 4. 失效 cron（crontab 和 /etc/cron.d 都要查）
for m in bot3 bot4 bot5 bot6; do
  ssh root@$m.szspd.cn "{ crontab -l; grep -hvE '^#|^$' /etc/cron.d/*; } \
    | grep -oE '/[A-Za-z0-9_./~-]+\.(sh|py|js)' | sed 's|^~|/root/|' | sort -u \
    | while read s; do [ -f \"\$s\" ] || echo \"MISSING: \$s\"; done"
done

# 5. 防火墙误伤（bot3/bot4）
for m in bot3 bot4; do ssh root@$m.szspd.cn "iptables -L INPUT -n --line-numbers | head -8"; done
# 集群 IP 的 ACCEPT 必须在 SSHLIMIT 的 DROP 之前

# 6. 凭据泄露
for m in bot3 bot4 bot5 bot6; do
  ssh root@$m.szspd.cn "grep -rlE 'gh[p]_[A-Za-z0-9]{20,}' /root/.openclaw/cron/ | grep -v git-credential"
done
# 应为空

# 7. 仓库
git ls-remote origin main    # HEAD 应持续推进

# 8. 磁盘
for m in bot3 bot4 bot5 bot6; do ssh root@$m.szspd.cn "df -h / | tail -1"; done
```

**验证防火墙修复是否生效**：连续快速连 8 次，应 8/8 成功。
```bash
ok=0; for i in $(seq 1 8); do
  ssh root@bot4.szspd.cn "echo ok" 2>/dev/null | grep -q ok && ok=$((ok+1)); done; echo "$ok/8"
```

## 三、今天修的 8 类问题（供理解背景，勿重复排查）

| # | 问题 | 影响面 | 修复位置 |
|---|------|--------|---------|
| 1 | 同步脚本依赖上游 `/tmp/botmem-sync/`，上游已迁走 | 全集群同步自 3 月起失败 | bot2 `scripts/sync-from-botmem.sh`（直连 GitHub） |
| 2 | `select_sync_node()` 用 `tee` 写 stdout 污染返回值 | SSH 拿到整段日志文本 | 该函数已删除 |
| 3 | watchdog 用 `pgrep` 检查**一次性 cron 脚本**，永远判失败 | 永久 degraded + 每 5 分钟刷屏 | 改为检查 `/var/run/claw-mesh-sync.ok` 新鲜度 |
| 4 | `save_state` 写出 `errorCount: ,`（非法 JSON） | 状态文件解析失败 | 缺省置 0 |
| 5 | 各节点 `MACHINE_NAME` 互相写错（bot4/ecm-cd59/bot4） | 状态与仓库目录错位 | 全部改为各自真实机器名 |
| 6 | 脱敏只作用于本机目录，其他目录的 token 被提交 | 仓库泄露 token | 改为全仓库 grep+sed |
| 7 | bot4 的 SSHLIMIT 规则按源IP计数，误伤集群自身 | bot4 SSH 一天掉线 3 次 | `/usr/local/sbin/allow-cluster-ssh.sh` |
| 8 | bot6 时区是 Europe/Berlin | 时间戳偏移 6 小时 | 改为 Asia/Shanghai |
| 9 | 失效 cron 指向已删除脚本 | 每次触发只打 `not found` | 已清理（bot5 3 个、bot2 2 个脚本）|

## 四、关键文件

| 文件 | 位置 | 作用 |
|------|------|------|
| `HEARTBEAT.md` | 各节点 workspace | 八项巡检清单 + 遗留清单 |
| `memory/2026-10-22.md` | 各节点 workspace | 完整排查过程（285 行） |
| `claw-mesh-sync.sh` | `/root/.openclaw/cron/` | 各节点主同步脚本 |
| `claw-mesh-watchdog.sh` | `/root/.openclaw/cron/` | 监控 + 健康判定 |
| `clawmesh-credential.sh` | `/root/.openclaw/cron/` | 凭据读取（唯一来源） |
| `.git-credential` | `/root/.openclaw/cron/` | 实际 token（权限 600） |
| `allow-cluster-ssh.sh` | `/usr/local/sbin/` | 集群 SSH 白名单（bot3/bot4） |
| `sync-from-botmem.sh` | bot2 `scripts/` | bot2 拉取脚本 |

## 五、待办（需用户决策，勿擅自执行）

- 🔴 **git 历史中的旧 token**：彻底清除需重写历史 + 强制推送，会冲掉所有节点本地克隆
- 🟡 **仓库内 7.5 万个 node_modules 文件**：清理需重写历史
- 🟡 **bot5 每 5 分钟推送**：频率高于其他节点，可改错峰

## 六、共享文件分发机制

集群共享的两份文件通过仓库的 `static/` 目录分发：

| 文件 | 用途 |
|------|------|
| `static/HEARTBEAT.md` | 集群共用的巡检清单，各节点运行时以仓库版本为准 |
| `static/docs/CLAW-MESH-HANDOVER.md` | 本交接说明 |

- 推送方：各节点 `claw-mesh-sync.sh` 的 `sync_to_github` 步骤
- 拉取方：`read_other_machines` 步骤，**始终以仓库版本覆盖本机**（防止版本漂移）
- **白名单机制**：只同步上述两份，**不要整目录拷贝 `docs/`**，
  否则会把本机几百份私有文档污染到所有节点（已发生过一次，317 份）
- 写入采用**临时文件 + mv** 原子替换；脱敏逻辑**排除 `static/`**，
  否则会与拷贝竞态把文件截断为 0 字节（已发生过一次）

### ⚠️ 0 字节陷阱（务必了解）
`cp` 直接写目标文件会**先截断目标**。若进程在拷贝过程中被 kill / 超时中断
（弱网节点上同步常被打断），目标就变成**空文件**。
2026-10-22 因此清空过仓库的 `static/HEARTBEAT.md` 以及 bot2/bot3/bot4 的本机清单。

**正确写法**（脚本里已采用）：
```bash
rm -f "$dst.tmp"
if cp "$src" "$dst.tmp" && [ -s "$dst.tmp" ]; then
    mv -f "$dst.tmp" "$dst"      # 原子替换
else
    rm -f "$dst.tmp"              # 失败则保留原文件
fi
```
**排查提示**：若发现某节点清单/文档变成 0 字节，先看
`wc -c < 文件` 确认，再检查是否有脚本在直接 `cp` 到该文件。

## 七、弱网与 GitHub 访问

部分节点到 `github.com` 的链路会**间歇性黑洞**（TCP 通但 TLS 无响应，
或直接不可达），表现为 `git fetch` 永久挂起、状态停在 `step: 1 pulling`。

**已装的自愈**：
- `github-ip-pin.sh`（每 10 分钟）：探测 `github.com` 可达性，
  不可达时从候选 IP 里挑一个能完成 TLS 的写进 `/etc/hosts`
- 候选 IP：`20.27.177.113` / `20.200.245.247` / `20.207.73.82` /
  `20.205.243.166` / `140.82.121.3`
- 已知黑洞 IP（2026-10-23 实测 bot5 命中）：`20.205.243.166`、
  `140.82.121.4` / `140.82.114.3` / `140.82.113.4` / `140.82.112.4`

**手动排查**：
```bash
getent hosts github.com
timeout 15 curl -s -o /dev/null -w "%{http_code}\n" https://github.com/
for ip in 20.27.177.113 140.82.121.3; do
  timeout 20 curl -s -o /dev/null -w "$ip=%{http_code}\n" --resolve github.com:443:$ip https://github.com/
done
```
注意：`api.github.com` / `codeload.github.com` 可用**不代表**
`github.com` 可用 —— 它们的 IP 段和路由不同。

**手动恢复**：
```bash
pkill -f git-remote-https                      # 先杀掉挂起的 fetch
sed -i '/[[:space:]]github\.com$/d' /etc/hosts
echo "<可用IP> github.com" >> /etc/hosts
```

## 八、常驻服务与日志

日志无上限增长曾把 bot6 的磁盘推到 250MB 日志占用。
现五台统一有 `/etc/logrotate.d/openclaw-clawmesh`（size 20M / rotate 3 / compress）。

**注意**：`logrotate` 要求日志目录权限安全。bot5/bot6 的 `/var/log`
曾是 `drwxrwxr-x`（组/其他可写），logrotate 会直接拒绝执行并报
`parent directory has insecure permissions`。已收紧为 755，
规则里也加了 `su root root`。

**`~` 在 crontab 里不展开**：所有 cron 里的脚本路径一律写绝对路径。
（bot6 的 evomap 心跳曾写成 `~/.openclaw/skills/evomap/evomap-cli.js`，
实际指向不存在的 `/.openclaw/...`，静默失败了很久。）

## 九、工作区文件保护

`docs/` 全树曾被外部进程整体删除（bot4 305 个文件、bot6 477 个文件）。
**各节点现都有 `workspace-guard.sh`（每 5 分钟）**：
用 `git ls-files --deleted` 检测已跟踪但缺失的文件，自动从 HEAD 恢复。

```bash
git ls-files --deleted | head -20   # 应为空
ls docs/ | wc -l                    # 与本节点历史一致
```

⚠️ **清理"疑似污染文件"前务必确认归属**。
2026-10-22 曾把各节点自己的历史文档误判为同步污染并删除。
判据要看内容来源，不能只看"文件名像不像共享文件"或"几台节点文件名是否相同"。

## 十、注意事项

- 改任何节点的 cron 前，确认 `/etc/cron.d/` 也要看 —— 只看 `crontab -l` 会漏
- 各节点 SSH 时注意 SSHLIMIT：短时间内反复重试会把自己封掉，等 60 秒窗口过期即可
- bot4 / bot6 主机本身偶发 SSH 不稳（ping 通但 22 端口不通，与 SSHLIMIT 无关），
  重试或等 1~2 分钟即可恢复；bot6 在 2026-10-22 20:20 前后出现过一次
- **SSH 排障提示**：若 `ssh -vv` 显示 `Authentication succeeded` 但命令无输出，
  那是会话层（PTY 分配）的问题，不是网络问题。加 `-T -n`（不分配伪终端、
  不读 stdin）即可正常返回
- bot3 到 github.com 的链路有**间歇性丢包**（5 次请求约 2 次成功），
  同步脚本已加 connectTimeout=15 + 5 次重试 + 分步 fetch/rebase 来适配
- bot3 出现过**整机服务不可用**（22 和 18789 端口同时不通，ping 正常），
  属主机自身问题，恢复后需手动确认同步与文件分发状态
- 排查"文件变空"时优先怀疑 `cp` 的截断行为，不要只在文件内容里找原因
- 推送时间已错峰，**不要改成同一时刻**，会互相抢 push
