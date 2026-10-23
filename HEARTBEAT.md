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
grep -rlE 'ghp_[A-Za-z0-9]{20,}' /root/.openclaw/cron/ 2>/dev/null | grep -v git-credential
```
应为空。凭据统一由 `clawmesh-credential.sh` 提供，脚本内不应有明文。
仓库工作树也应无 token（`git clone` 后扫一遍）。

**也要扫日志** —— git 报错会把带 token 的 URL 回显进日志：
```bash
grep -ohE 'ghp_[A-Za-z0-9]{20,}' /var/log/*.log 2>/dev/null | sort -u
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

## 2026-10-23 20:55 北京时间 — 代码门禁现状

### ✅ 后端 lint 双配置全绿（T71）
`7zi-backend` 下两套 flat config 并存是隐患：`eslint.config.js`（ESLint 9 自动选中）
与 `eslint.config.mjs`（死配置）的 `caughtErrorsIgnorePattern` 不一致，
`catch (_error) {}` 在默认配置不报、在 `.mjs` 下必报 → CI 一旦切配置就浮现。
修法：改用 ES2019 **可选 catch 绑定** `catch {`，语义等价且两套配置下无条件豁免。
零 `eslint-disable`、零配置改动。
验证：`npx eslint workflow-service/src workflow-engine websocket` → exit 0；
`--config eslint.config.mjs` 同范围 → exit 0。

### 仓库结构已收敛
`7zi-frontend/` 已并入主仓，`src/` 与 `7zi-frontend/src/` 副本问题自然消解。
前端 retry 测试从 **246s → 3.8s**（`f2a4fdc944` 修 3 个真 Bug + 重写测试）。

### 并发教训（本日两次）
1. 子代理的"清理"提交会**静默回退**已修好的 ESLint 配置 —— 提交前必须排除已修复文件。
2. `vitest` 报 11 failed 可能是**竞态**：跑测试期间并发 agent 提交了修复，重跑即 21/21 全绿。
   **看到失败先确认是否有人在同时改**，再判定是不是真 bug。
3. 提交时严格按路径 `git add`，避免把其他 agent 的在途改动卷进来。

### 遗留
- 全仓 `npx eslint .` 剩余 11 warnings 全在 `websocket-service/` 与 `workflow-service/test/`。
- `workflow-engine/websocket-integration-example.js` 是显式 ignore 的示例片段，
  `--no-ignore` 会出 16 个 `no-undef`，属 intentional ignore，不建议动。

## 已知遗留（需用户决策，勿擅自处理）
- git 历史中可能仍残留旧 token —— 彻底清除需重写历史 + 强制推送
- 仓库内 7.5 万个 node_modules 文件 —— 清理需重写历史
- bot5 每 5 分钟推送一次，频率高于其他节点
- **跨节点 SSH 从 bot4 全部被拒**（bot4 → bot2/3/5/6 `Permission denied (publickey)`）。
  需在其它节点把 bot4 的公钥加进 `~/.ssh/authorized_keys`。
  bot4 公钥指纹：`selfadm-bot4 SHA256:HVsRFkhJH6LJBZsPD3XbDVtyoHO45Ow3sjVx64NTtQM`

## 推送时间（已错峰，勿改成同一时刻）
bot2 `:00` / bot4 `:15` / bot6 `:30` / bot3 `:45` / bot5 `*/5`
