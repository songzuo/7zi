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
  ssh root@$m.szspd.cn "grep -rlE '[已移除][A-Za-z0-9]{20,}' /root/.openclaw/cron/ | grep -v git-credential"
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

## 六、注意事项

- 改任何节点的 cron 前，确认 `/etc/cron.d/` 也要看 —— 只看 `crontab -l` 会漏
- 各节点 SSH 时注意 SSHLIMIT：短时间内反复重试会把自己封掉，等 60 秒窗口过期即可
- bot4 主机本身偶发 SSH 不稳（与 SSHLIMIT 无关），重试即可恢复
- 推送时间已错峰，**不要改成同一时刻**，会互相抢 push
