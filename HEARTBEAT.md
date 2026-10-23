# HEARTBEAT - 持续工作调度

## 最后检查: 2026-10-24 00:40 (Beijing)

### ✅ 代码门禁全绿
| 门禁 | 结果 |
|---|---|
| 根 `eslint src` | **0 errors** / 1630 warnings |
| 根 `tsc --noEmit` | **0 errors** |
| 7zi-frontend `eslint .` | **0 errors** / 88 warnings |
| 7zi-backend `eslint .` | **0 errors** / 0 warnings |

提交：`3254d4838e` 根级 src/ ESLint 错误清零 + 恢复被清空的 eslint.config.mjs
（配置在结构收敛时被截断为 0 字节，根级 lint 完全失效）

### ⚠️ 部署链路 3 个高危未决（详见 T81_DEPLOY_READINESS.md）
1. **源站内存仅剩 339MB / 97% 占用** → 绝对不能在 198.44.179.155 上跑 `next build`
2. **`deploy.sh` 健康检查打 `localhost:3000`，但 3000 无服务**（实际在 3001/28080）
   → 会误判失败并自动回滚
3. **`/opt/7zi-frontend` 与本地不同源**（服务器 HEAD `d523bcb1` vs 本地 `a1914975fb`，
   服务器另有 55 个未提交改动）→ rsync `--delete` 有不可逆丢失风险
4. **bot5.szspd.cn SSH 密码与 key 全部被拒** → 测试环境无法做部署前验证

### 待主人拍板
1. 部署目标：bot5 还是 /opt/7zi-frontend 容器？
2. rsync 还是服务器 git pull（55 个 dirty 改动归属）？
3. 是否允许本地/CI 构建镜像推源站（源站内存不足）？
4. bot5 的正确凭据？
5. git 历史明文密码是否重写 / GitHub PAT 是否轮换？

---

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

## 已知遗留（需用户决策，勿擅自处理）
- git 历史中可能仍残留旧 token —— 彻底清除需重写历史 + 强制推送
- 仓库内 7.5 万个 node_modules 文件 —— 清理需重写历史
- bot5 每 5 分钟推送一次，频率高于其他节点
- **跨节点 SSH 从 bot4 全部被拒**（bot4 → bot2/3/5/6 `Permission denied (publickey)`）。
  需在其它节点把 bot4 的公钥加进 `~/.ssh/authorized_keys`。
  bot4 公钥指纹：`selfadm-bot4 SHA256:HVsRFkhJH6LJBZsPD3XbDVtyoHO45Ow3sjVx64NTtQM`

## 推送时间（已错峰，勿改成同一时刻）
bot2 `:00` / bot4 `:15` / bot6 `:30` / bot3 `:45` / bot5 `*/5`
