# T119 修复报告：claw-mesh-sync 反复冲掉本机 HEARTBEAT.md

- **执行人**：🛡️ 系统管理员子代理
- **时间**：2026-10-25 05:07–05:15 (Asia/Shanghai)
- **结论**：**Yes**（根因已修 + 内容已恢复 + 逻辑验证通过）

---

## 一、根因

`/root/.openclaw/cron/claw-mesh-sync.sh` 的 `read_other_machines()` 函数中，"分发 `static/` 下的共享文件到本机 workspace"这一段，对 `static/HEARTBEAT.md` → 本机 `HEARTBEAT.md` 的处理是**无条件覆盖**：

```bash
if ! cmp -s "static/HEARTBEAT.md" "$BOT4_DIR/HEARTBEAT.md" 2>/dev/null; then
    # ... cp 到 .tmp 再 mv 覆盖本机
fi
```

只有 `cmp` 判断"内容不同"时才会写入，**没有任何行数/内容量比较**，所以 `static/`（bot2 维护的共享清单，253 行）会周期性把本机工作区里叠加了实测结论段的版本（486 行）整份替换掉。

**触发链路**：cron `30 */4 * * *` → 每次同步从 botmem 仓库拉取 `static/HEARTBEAT.md` → 覆盖本机 → 本机专有段落丢失。

**本次复现的实证**：
- `/var/log/claw-mesh.log`：`2026-10-25 00:30:43` 与 `04:30:23` 均有 `[bot6] 已更新本机 HEARTBEAT.md（来自 static/）`
- 工作区 `HEARTBEAT.md` mtime = `2026-10-25 04:30:23`（与日志秒级吻合）
- `git diff HEAD -- HEARTBEAT.md` = 净删 **233 行**（工作区 253 行 vs HEAD 486 行）
- `cmp /tmp/botmem-upload/botmem/static/HEARTBEAT.md HEARTBEAT.md` → **完全一致**，确认当前工作区文件就是 `static/` 的副本
- `diff HEAD版本 工作区版本` → **新增 0 行、删除 233 行** ⇒ HEAD 版本是工作区的**严格超集**，本机没有任何"更新过的本地内容"被遗漏

被冲掉的本机专有段落（现已全部找回）：
- `## 当前基线（2026-10-24 05:38–05:52，T86 实测）`（含后端 CI 覆盖范围、Git 状态、集群 SSH 实测表）
- `# 🔴 CI 门禁实测结论（2026-10-24 06:30）`
- `# 7zi 项目 CI 门禁状态（2026-10-24 10:30）`
- `# 🔴 生产部署拓扑实测（T91，2026-10-24 10:30，SSH 只读实测源站）`
- `# 🔴 前端双树分叉（T97）` + `# 🛠️ 本轮已落地的手势修复（嵌套树）`

---

## 二、改动文件列表

| 文件 | 改动 | 行数变化 |
|---|---|---|
| `/root/.openclaw/cron/claw-mesh-sync.sh` | 修改 `read_other_machines()` 中"分发 static/ 到本机"逻辑（原第 450–467 行 → 现第 450–517 行） | +58 / -18（净 +40 行） |
| `/root/.openclaw/workspace/HEARTBEAT.md` | 恢复被覆盖的 233 行 | 253 → 486 行（27597 字节） |
| `/root/.openclaw/workspace/T119_CLAWMESH_HEARTBEAT_FIX.md` | 新增本报告 | — |

**未触碰**（遵守硬约束）：脚本内其它段落（脱敏 sed、`static/` 写入与 bot2 白名单、HANDOVER 分发、状态管理、锁管理、故障恢复）一字未改；其它 `~/.openclaw` 脚本与其它 cron 任务未改；未 `git add/commit/push`；未重跑 `claw-mesh-sync.sh` 本体。

### 新判定逻辑（脚本 450–517 行）

```
本机 HEARTBEAT.md 缺失或为空  → 直接下发 static/（并校验目标非空）
static/ 与本机内容完全相同    → 什么都不做
static/ 行数 < 本机行数       → 【不覆盖】保留本机版本，记 WARN，并写备份到 /tmp
static/ 行数 >= 本机行数      → 覆盖（避免节点停留在陈旧版本）；失败自动回滚备份
```

配套保障：
- 覆盖前先 `cp -p` 本机文件到 `mktemp` 备份（落在 `$WORK_DIR`，不污染工作区 git 状态）
- 所有写入走 `.tmp` + `mv` 原子替换；`mv` 后再次 `[ -s ]` 校验，若目标为空则**回滚到备份**
- 任何分支都不会产生 0 字节文件
- 行数解析做了非数字兜底（`case` 过滤），避免 `wc` 异常导致比较报错
- 清理 7 天前的旧备份，避免 `/tmp` 堆积

---

## 三、验证命令与输出摘要

### 1. 语法检查
```
$ bash -n /root/.openclaw/cron/claw-mesh-sync.sh
BASH_N_OK exit=0
```

### 2. 内容恢复结果
```
$ wc -l HEARTBEAT.md
486 HEARTBEAT.md
$ grep -n '7zi 项目 CI 门禁状态\|生产部署拓扑实测\|当前基线' HEARTBEAT.md
3:## 当前基线（2026-10-24 05:38–05:52，T86 实测）
333:# 7zi 项目 CI 门禁状态（2026-10-24 10:30，主管逐 job 复跑）
374:# 🔴 生产部署拓扑实测（T91，2026-10-24 10:30，SSH 只读实测源站）
```

### 3. diff 删除行数
```
$ git diff --stat HEAD -- HEARTBEAT.md
(空输出)
$ git diff HEAD -- HEARTBEAT.md | grep -c '^-[^-]'
0
```
⇒ **删除行数 = 0**，工作区与 HEAD 完全一致（且保留了全部本机实测段落；由于本机新增内容为 0 行，无本地内容丢失）。

### 4. 分发逻辑 dry-run（临时脚本 `/tmp/t119_dryrun.sh`，复刻脚本 447–512 行判定）

```
###### 情形 A: static 更短 (253 < 486) — 本次实际情形 ######
[WARN]   - 保留本机 HEARTBEAT.md（static/ 行数 253 < 本机 486，疑似本机含独有段落）；备份：/tmp/t119_dry/.HEARTBEAT.md.local.PyQ9Be
RESULT: 本机文件行数=486 字节=27597
本机内容是否保持? YES 未被破坏

###### 情形 B: 本机更短 (static 486 > local 100) ######
[INFO]   - 已更新本机 HEARTBEAT.md（来自 static/，static 行数 486 >= 本机 100）
RESULT: 本机文件行数=486 字节=27597
本机是否被更新为 static? YES 已覆盖(预期)

###### 情形 C: 完全相同 ######
[INFO]   - static 与本机内容一致，不做修改
RESULT: 本机文件行数=486 字节=27597

###### 情形 D: 本机文件缺失 ######
[INFO]   - 已下发本机 HEARTBEAT.md（来自 static/，本机原文件缺失或为空）
RESULT: 本机文件行数=486 字节=27597
```

四种情形全部符合预期；实际事故场景（A）下本机文件不再被破坏。

---

## 四、遗留风险

1. **行数启发式不完美**：若 `static/` 行数恰好 ≥ 本机但内容仍缺段落，仍可能被覆盖。当前 static 由 bot2 维护、行数单调增长，实践中风险低；若后续需要更严格，可改为"本机是否为 static 的超集"的集合比较。
2. **本机专有段落的收敛**：现在 bot6 本机版本比 `static/` 长 233 行，两者会长期分叉。**建议主管后续裁决**：把 bot6 的独有段落回合到 bot2 的 `static/`，或明确"bot6 本机清单由本地维护、static 只做参考"。否则每 4 小时日志都会打一条 WARN（噪音，但不会损数据）。
3. **`static/` 写入方向**：脚本里只有 `MACHINE_NAME = bot2` 才会写 `static/`，所以 bot6 的本机内容不会回灌仓库——**双向分叉会长期存在**，需人工定期对齐。
4. **备份文件堆积**：备份落在 `$WORK_DIR`（`/tmp/botmem-upload`），已加 7 天清理；`/tmp` 仍可能因未跑 sync 而残留少量文件。
5. **未做真实端到端验证**：按硬约束未重跑 `claw-mesh-sync.sh` 本体（避免远端副作用），故"真实 cron 触发后的日志行为"需等下一次 `30 */4 * * *` 自动触发后由主管核对 `/var/log/claw-mesh.log`。预期会看到 `[WARN] - 保留本机 HEARTBEAT.md（static/ 行数 253 < 本机 486 ...）`。
6. **网关状态**：本次未触发网关重启，服务无中断。

---

## 五、结论

**Yes** — 根因已修（脚本改为非破坏性分发 + 备份 + 回滚），丢失的 233 行已完整恢复（`git diff HEAD -- HEARTBEAT.md` 删除 0 行），`bash -n` 通过，四种分发情形的 dry-run 全部符合预期。未执行任何 git 提交动作，留待主管统一提交。
