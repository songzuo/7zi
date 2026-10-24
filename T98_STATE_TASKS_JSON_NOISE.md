# T98 — `state/tasks.json` 运行时噪音剥离报告

**日期**: 2026-10-24
**执行者**: ⚡ Executor (T98)
**关联待办**: DECISION_PENDING_20261024.md → D11 (P3)

---

## 1. 结论摘要

`state/tasks.json` 与 `memory/claw-mesh-state.json` 是**纯运行时状态文件**，每次调度器
/ cron 触发都会改写，且内容 99.6% 是自动生成的 `monitoring` 心跳记录。它们已在 git 中
累积 **1795 行未提交 diff**，且最近 3 个 commit（`d2328ff110`、`c3d4e22f7d`、`3aa6500313`）
都把它们与真实代码改动混在一起提交，严重淹没真实 diff。

本次已完成：

- ✅ 摸清全部写入点（7 个直接写入点 + 4 个辅助写入脚本）
- ✅ `.gitignore` 落地（保留归档文件入库豁免）
- ✅ 生成 `state/tasks.archive.json`：**5285 条历史记录全部保留**，压缩为 **57 条**结构化归档（37 KB，原 975 KB）
- ✅ 验证通过：`git check-ignore -v --no-index` 命中；归档可被 `require()` 解析
- ❌ **未执行** `git rm --cached` / `git add` / `git commit`（按指令交由主管统一提交）

**结论: Partial** — 仓库侧改动已就绪，待主管执行 2 条 git 命令后完全生效。

---

## 2. 写入点清单（生产者）

### 2.1 `state/tasks.json`

| # | 文件路径 | 行号 | 写入方式 | 触发频率 |
|---|---------|------|---------|---------|
| W1 | `tools/bot6_scheduler.py` | 18 | 常量 `TASK_STATE_FILE` | — |
| W2 | `tools/bot6_scheduler.py` | 46-48 | `open(...,'w')` + `json.dump` (init_state) | 首次创建 |
| W3 | `tools/bot6_scheduler.py` | 66-70 | `open(...,'w')` + `json.dump` (save_state) | **每 15 分钟** |
| W4 | `tools/task_scheduler.py` | 20 | 常量 `TASKS_FILE` | — |
| W5 | `tools/task_scheduler.py` | 68-73 | `save_json()` → `json.dump` | 按调用 |
| W6 | `tools/task_scheduler.py` | 99-101 | `save()` → `save_json(TASKS_FILE, data)` | 按调用 |
| W7 | `src/lib/a2a/task-store.ts` | 374, 378, 391-392, 414 | `FileTaskStore`：`fs.writeFileSync(this.filePath, ...)` | 按调用（路径由调用方传入，非默认 `state/tasks.json`） |

**Cron 触发源**（系统 crontab，非仓库内）：
```
*/15 * * * *  /root/.openclaw/workspace/tools/bot6_task_runner.sh
0 8,14,20 * * * /root/.openclaw/workspace/tools/bot6_scheduler.py system-monitoring
```
→ `tools/bot6_task_runner.sh` 每 15 分钟执行 `bot6_scheduler.py dashboard` + `next-task`，
每次执行触发 `save_state()` 全量重写整个 JSON。

**辅助/修复脚本**（低频，非定时）：
- `botmem/VM-0-4-opencloudos/scripts/update-task-progress.py:11`
- `botmem/VM-0-4-opencloudos/scripts/update-completed-at.py:11`
- `botmem/VM-0-4-opencloudos/scripts/bulk-complete-recovery-tasks.py:10`
- `botmem/VM-0-4-opencloudos/scripts/verify-task-status.py:10,44`
- `botmem/VM-0-4-opencloudos/scripts/monitor-task-recovery.py:19`
- `botmem/VM-0-4-opencloudos/scripts/optimized_task_scheduler.py:196`
- `botmem/VM-0-4-opencloudos/scripts/recover-bot-szspd{,-tasks}.py:113,115,131`
- `botmem/VM-0-4-opencloudos/scripts/recover-token-harvester-e2e.py:135`
- `botmem/VM-0-4-opencloudos/scripts/fix-task-scheduler-compatibility.py:13`
- `botmem/VM-0-4-opencloudos/scripts/tmp-recover.sh:116`

> 注：`botmem/` 整个目录已在 `.gitignore` 中（第 98 行 `botmem`），这些脚本本身不入库。

### 2.2 `memory/claw-mesh-state.json`

| # | 文件路径 | 行号 | 写入方式 | 触发频率 |
|---|---------|------|---------|---------|
| M1 | `/root/.openclaw/cron/claw-mesh-sync.sh` | 18 | `STATE_FILE="$BOT4_DIR/memory/claw-mesh-state.json"` | — |
| M2 | `/root/.openclaw/cron/claw-mesh-sync.sh` | 56 | `cat > "$STATE_FILE" << EOF` (save_state) | **每 4 小时**（`30 */4 * * *`） |
| M3 | `/root/.openclaw/cron/claw-mesh-watchdog.sh` | 18 | `STATE_FILE=".../memory/claw-mesh-state.json"` | — |
| M4 | `/root/.openclaw/cron/claw-mesh-watchdog.sh` | 117-118 | `sed -i "s/\"status\": \"[^\"]*\"/..."` | **每 5 分钟**（`*/5 * * * *`） |

**其他读取点**（只读，无需改动）：
- `HEARTBEAT.md:26,35,44` — 巡检时 `json.load` 读取各节点状态
- `docs/CLAW-MESH-HANDOVER.md:29,34` — 交接文档里的 `json.load` 读法
- `/root/.openclaw/cron/claw-mesh-sync.sh:39-40,53,397-398` — 读取并解析 `errorCount` / `step`

**写入点总数：11 处**（state/tasks.json 7 处 + claw-mesh-state.json 4 处）
**直接生产者脚本数：5 个**（`bot6_scheduler.py`、`task_scheduler.py`、`task-store.ts`、`claw-mesh-sync.sh`、`claw-mesh-watchdog.sh`）

---

## 3. 方案对比

| 方案 | 做法 | 优点 | 缺点 | 评价 |
|------|------|------|------|------|
| **A. 纯 .gitignore** | 只加 ignore 规则 | 零风险 | 文件**已追踪**，ignore 对已追踪文件无效 → 仍会进 diff | ❌ 不足 |
| **B. .gitignore + `git rm --cached`（推荐，已落地）** | ignore 规则 + 从索引移除但保留工作区文件 | 彻底消除噪音；工作区文件继续被调度器读写；历史仍可查 | 需一条 git 命令（主管执行） | ✅ **采用** |
| **C. 运行时文件迁出仓库** | 移到 `~/.openclaw/state/` | 仓库最干净 | 需改所有硬编码绝对路径 + cron，跨机器/跨 agent 引用全断 | ⚠️ 风险过大，超出本次范围 |
| **D. 提交前过滤（pre-commit hook）** | hook 里 `git update-index --assume-unchanged` | 不用改追踪状态 | hook 仅本地有效，他人 clone 后噪音回归；且与 `.gitignore` 双轨易混乱 | ⚠️ 不选 |
| **E. 定期清理任务历史** | 调度器里 prune 旧任务 | 从源头减小文件 | 需改 `tools/*.py` 源码（本次禁止）；且历史丢失 | ⚠️ 超出路径互斥范围 |

**采用 B**，并叠加"归档"机制保证**数据零丢失**。

---

## 4. 落地的 `.gitignore` 改动（diff）

```diff
--- a/.gitignore
+++ b/.gitignore
@@ -94,7 +94,12 @@ data/web-vitals.db
 tsconfig.tsbuildinfo
 
 # OpenClaw specific
+# 运行时状态文件：纯噪音，禁止入库（工作区保留，git rm --cached 剥离追踪）
+# 历史归档：state/tasks.archive.json —— 必须入库，供日后追溯
 state/tasks.json
+state/*.runtime.json
+state/*.tmp
+!state/tasks.archive.json
 botmem
 memory/claw-mesh-state.json
```

**核查结论**：
- 原 `.gitignore` 第 97 行已有 `state/tasks.json`、第 99 行已有 `memory/claw-mesh-state.json` → **已存在，无重复添加**，仅补充注释与通配/豁免规则。
- `state/` 目录下当前只有 2 个文件：`tasks.json`（运行时）、`tasks.archive.json`（本次新建归档）。
- **无** schema/种子/配置文件被误伤 —— `git ls-files state/` 改动前仅 `state/tasks.json` 一项。
- `!state/tasks.archive.json` 豁免是**必要的**：显式写明归档必须入库，即使将来有人加 `state/` 整目录规则也不受影响。

---

## 5. 归档方案与前后对比

### 5.1 数据来源（不丢失任何真实数据）

`state/tasks.archive.json` 由以下三处合并生成：

1. **git 全历史**：128 个 commit 中 119 个可解析的 `state/tasks.json` 版本
   （`git log --all --format=%H -- state/tasks.json` → 逐个 `git show <c>:state/tasks.json`）
2. **当前工作区** `state/tasks.json`（含未提交的 39 条新记录）
3. 去重键：`id + created_at`（因为调度器会生成**重复 id** —— 746 条任务只有 744 个唯一 id）

### 5.2 归档内容结构（57 条，顶层为数组，`require().length` 可用）

| 类别 | 条数 | 说明 |
|------|------|------|
| 真实业务任务 | **4** | `ts-error-fix-0512-v3`(development)、`docs-audit-0512`(documentation)、`dependency-check-0512`(maintenance)、`code-quality-audit-0512`(review) —— 这 4 条在当前运行文件中**已被 purge**，仅存在于 git 历史，**靠归档救回** |
| 监控按日汇总 | **52** | `monitoring-rollup-YYYY-MM-DD`，每日一条，含 `total_runs` / `status_breakdown` / `first_run_at` / `last_run_at` |
| 总体汇总 | **1** | `archive-summary` |

### 5.3 前后对比

| 指标 | 归档前（运行时文件） | 归档后 | 比值 |
|------|-------------------|--------|------|
| 文件大小 | 975,154 B (952 KB) | 37,035 B (36 KB) | **1 : 26.3** ↓ |
| 行数 | 34,299 行 | ~1,570 行 | ↓ 95% |
| 记录数 | 746 条任务（3 处重复 id） | 5,285 条唯一记录 → 压缩为 57 条归档条目 | 信息量 **增加** |
| 历史跨度 | 2026-03-03 ~ 2026-10-24（git 内 2026-03 起） | 同上，完整保留 | — |
| 已丢失的真实任务 | 4 条（被 purge） | **已救回** | ✅ |

**完整性校验**：
```
daily sum (52 天 total_runs 之和) === monitoring count (5281) → true
```
即 5,281 条监控运行记录**一条不少**地压缩进了 52 条日汇总。

### 5.4 归档样例

```json
{
  "id": "monitoring-rollup-2026-10-24",
  "description": "系统资源监控和健康检查（按日汇总）",
  "type": "monitoring-rollup",
  "status": "archived",
  "created_at": "2026-10-24T00:00:02.041226",
  "completed_at": "2026-10-24T15:45:23.523357",
  "source": "bot6",
  "total_runs": 126,
  "status_breakdown": { "completed": 126 },
  "first_run_at": "2026-10-24T00:00:02.041226",
  "last_run_at": "2026-10-24T15:45:15.426710",
  "distinct_run_ids": 126
}
```

### 5.5 运行时文件保持轻量

**未修改** `state/tasks.json` 任何内容（受路径互斥约束）。
调度器本身**没有 prune 逻辑**，文件会持续增长 —— 这一点作为遗留问题记录在 §8，
建议后续由主管另行派单（修改 `tools/bot6_scheduler.py` 的 save_state，增加保留窗口，
例如只保留最近 200 条 + 每日自动写入 `state/tasks.archive.json` 的增量）。

---

## 6. 主管需执行的确切 git 命令

**在 `/root/.openclaw/workspace` 依次执行：**

```bash
# 1) 从 git 索引移除运行时文件（保留工作区文件，文件不会被删除）
git rm --cached state/tasks.json
git rm --cached memory/claw-mesh-state.json

# 2) 提交本次改动
git add .gitignore state/tasks.archive.json T98_STATE_TASKS_JSON_NOISE.md
git commit -m "chore(git): 剥离运行时状态文件（state/tasks.json、memory/claw-mesh-state.json）并归档历史"

# 3) 推送（如需）
git push
```

**验证（执行后）：**
```bash
git check-ignore -v --no-index state/tasks.json memory/claw-mesh-state.json
# 期望：
#   .gitignore:99:state/tasks.json            state/tasks.json
#   .gitignore:104:memory/claw-mesh-state.json  memory/claw-mesh-state.json

git status --short
# 期望：不再出现 " M state/tasks.json" 与 " M memory/claw-mesh-state.json"

git ls-files state/ memory/claw-mesh-state.json
# 期望：仅剩 state/tasks.archive.json
```

> ⚠️ `git rm --cached` **只动索引，不删工作区文件**。调度器/cron 继续正常读写，
> 不会有任何功能影响。

---

## 7. 验证结果

| 验证项 | 命令 | 结果 |
|--------|------|------|
| ignore 命中 | `git check-ignore -v --no-index state/tasks.json memory/claw-mesh-state.json` | ✅ 命中 `.gitignore:99` 与 `.gitignore:104` |
| 归档不被忽略 | `git check-ignore -v --no-index state/tasks.archive.json` | ✅ 命中否定规则 `!state/tasks.archive.json`（即**未**被忽略） |
| 归档可解析 | `node -e "console.log(require('./state/tasks.archive.json').length)"` | ✅ 输出 `57` |
| 归档 JSON 合法 | `node -e "JSON.parse(require('fs').readFileSync('state/tasks.archive.json'))"` | ✅ 无异常 |
| 条数合理 | 4 真实任务 + 52 日汇总 + 1 总结 = 57 | ✅ |
| 数据无丢失 | 52 天 `total_runs` 求和 = 5281 = 监控记录总数 | ✅ `true` |
| 运行时文件未被改 | `git diff state/tasks.json` 仍为原有 diff（未由我修改） | ✅ 未触碰 |

---

## 8. 遗留问题

1. **运行时文件仍会持续增长**（未 prune）
   `tools/bot6_scheduler.py:66-70` 的 `save_state()` 每次全量重写并追加，无保留窗口。
   本次受路径互斥约束**未修改源码**。建议后续派单：在 `save_state` 中加入"仅保留最近 N 条
   + 每日增量落 `state/tasks.archive.json`"。若不处理，剥离 git 后文件仍会涨到数 MB。

2. **`.gitignore` 已存在同名条目，剥离前噪音持续**
   在主管执行 `git rm --cached` 之前，`git status` 仍会显示这两个文件的 diff —— 这是预期行为。

3. **`memory/claw-mesh-state.json` 被 Claw-Mesh 跨节点同步**
   `claw-mesh-sync.sh` 会把 `memory/` 目录推到 `botmem` 远端仓库（`REPO=...botmem.git`）。
   剥离本地 git 追踪**不影响** botmem 远端仓库的同步行为；但如果远端也追踪该文件，
   远端同样需要处理（超出本机范围，需另行确认）。

4. **`src/lib/a2a/task-store.ts` 的 `FileTaskStore`**
   写入路径由调用方注入（`getFileTaskStore(filePath)`），默认走内存。
   若将来有人传 `state/tasks.json`，ignore 规则已覆盖，无需额外处理。

5. **`botmem/` 下的历史副本脚本**
   `botmem/**/scripts/*.py` 有 ~10 处引用 `state/tasks.json` 的硬编码绝对路径。
   `botmem/` 已被 gitignore，不影响本仓库，但跨机器执行时会写本机同一文件（符合预期）。

---

## 9. 结论

**Partial**

- ✅ 写入点摸清（11 处 / 5 个直接生产者 / cron 频率 15min + 4h + 5min）
- ✅ `.gitignore` 落地且无误伤（归档文件显式豁免入库）
- ✅ 归档生成，`state/tasks.archive.json` 57 条 / 37 KB，**5285 条历史记录零丢失**，还救回 4 条被 purge 的真实任务
- ✅ 验证全绿
- ⏳ **待主管执行 2 条 `git rm --cached` + commit**，仓库侧噪音才会真正消失

**数据安全**：无任何真实数据丢失。运行时文件保留在工作区继续被调度器使用；
历史全部沉淀在 `state/tasks.archive.json`（入库）并保留在 git 历史中（可查）。
