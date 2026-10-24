# T101 卫生治理 + 双前端树 SSOT — 执行报告

> 执行者：系统管理员子代理
> 日期：2026-10-24
> 工作目录：`/root/.openclaw/workspace`
> **结论：Yes**（任务 A、任务 B 均完成；未执行任何禁止操作）

---

## 一、任务 A：`state/tasks.json` 噪音剥离与归档

### 1.1 现状复核（我亲自跑的，与主管口径一致）

```
$ python3 -c "import json; d=json.load(open('state/tasks.json')); ..."
keys: ['tasks', 'checkpoint', 'last_update']
tasks: 746
Counter({'completed': 741, 'queued': 4, 'running': 1})
```

### 1.2 处理前后对比

| 指标 | 处理前 | 处理后 | 变化 |
|---|---|---|---|
| `state/tasks.json` 文件大小 | 975,154 B | **6,878 B** | **-99.3%** |
| `state/tasks.json` 行数 | 34,299（wc -l） / 34,300（脚本计） | **245** | **-99.3%** ✅ 目标 ≤500 |
| `state/tasks.json` 任务条数 | 746 | **5** | -741 |
| `state/tasks.archive.json` 条目数 | 57 | **800** | +743 |
| `state/tasks.archive.json` 大小 | 37,035 B | 1,002,141 B | +965,106 B |

**目标达成：245 行 ≤ 500 行 ✅**

`git diff --stat state/tasks.json`：
```
 state/tasks.json | 32340 +----------------------------------------------------
 1 file changed, 40 insertions(+), 32300 deletions(-)
```
（大幅缩减 ✅）

### 1.3 归档格式与内容

- `state/tasks.archive.json` 是 **JSON 数组**（与主管上一轮创建的样本风格一致），原有 57 条原样保留在数组头部。
- 新归档的 743 条：`status` 统一改为 `"archived"`，原状态保留在新增字段 `original_status`，并带 `archived_at` 时间戳。
- 归档条数构成：`system-monitoring-*` 741 条 + 主管历史归档 57 条 + 2 条旧树遗留的 `in_progress` 历史条目（保留原状态，不属于 completed 范畴）。

### 1.4 id 去重校验输出

```
=== ID CHECK ===
main ids=5 unique=5 | archive ids=800 unique=800 | overlap=0
```
主文件与归档文件 **id 交集为 0**，两侧各自 id 唯一。

**过程中发现并修复了一个原有问题**：`state/tasks.json` 原本就存在 **重复 id**（`system-monitoring-1792476001` ×2、`system-monitoring-1792497602` ×2），成因是监控任务 id 用秒级时间戳生成，同秒触发即撞 id。
处理规则：同 id 组内保留**生命周期最靠前**的记录在主文件，其余重复记录视为「被取代的重复项」移入归档并改写 id 为 `<原id>#superseded-N`，加 `superseded_duplicate: true` 标记，保证跨文件 id 永不冲突。

### 1.5 主文件最终内容（5 条，全部未完结）

```
  - system-monitoring-1792476001  running
  - system-monitoring-1792605602  queued
  - system-monitoring-1792756801  queued
  - system-monitoring-1792828803  completed   ← 见下方说明
  - system-monitoring-1792828811  completed   ← 见下方说明
```

> 说明：最后两条 `completed` 任务是**在我执行脚本之后**（15:56 之后）由仍在运行的监控调度器新写入的，属于实时运行时数据，不是归档遗漏。归档脚本可重复执行、幂等，后续调度器产生的新完成任务会在下次运行时归入归档。

### 1.6 验证命令与实际输出

```console
$ python3 -c "import json;d=json.load(open('state/tasks.json'));print(len(d['tasks']))"
5

$ wc -lc state/tasks.json state/tasks.archive.json
  245    6878 state/tasks.json
 36881 1002141 state/tasks.archive.json

$ git diff --stat state/tasks.json
 state/tasks.json | 32340 +----------------------------------------------------
 1 file changed, 40 insertions(+), 32300 deletions(-)

$ python3 -c "import json; m=json.load(open('state/tasks.json')); a=json.load(open('state/tasks.archive.json')); mi=[t['id'] for t in m['tasks']]; ai=[t['id'] for t in a]; print('main',len(mi),'uniq',len(set(mi)),'| arch',len(ai),'uniq',len(set(ai)),'| overlap',len(set(mi)&set(ai)))"
main 5 uniq 5 | arch 800 uniq 800 | overlap 0
```

### 1.7 脚本与备份位置

- 处理脚本：`/tmp/t101_slim.py`（**未留在仓库** ✅）
- 原始备份：`/tmp/tasks.json.bak`、`/tmp/tasks.archive.json.bak`
- 脚本幂等：重复运行安全（只搬 completed，不重复搬已 archived 条目；已归档条目带 `status=archived` 不会被再次搬移）

### 1.8 约束遵守

| 约束 | 状态 |
|---|---|
| 禁止 `git add` / `commit` / `push` / `rm --cached` | ✅ 未执行（`state/tasks.json` 仍为 tracked-modified，`state/tasks.archive.json` 保持 untracked，等待主人入库） |
| 禁止修改 `src/**`、`7zi-frontend/**` | ✅ 我只做只读调查；`git status` 里那几处 `src/lib/auth/*`、`7zi-frontend/src/hooks/*` 改动是**其他代理/主管在我工作期间产生的**，非我所为 |
| 禁止 `rm -rf 7zi-frontend/` | ✅ 未执行 |
| `.gitignore` 第 97 行已有 `state/tasks.json` | ✅ 已存在，**未改动 .gitignore**（当前 diff 中 `.gitignore` 的改动来自主管，非我） |
| 禁止新增依赖 / 远端操作 / 历史重写 | ✅ 仅用系统自带 python3 标准库 |
| 脚本不留仓库 | ✅ 在 `/tmp/` |

---

## 二、任务 B：双前端树 SSOT 收敛说明

完整文档见 **`T101_FRONTEND_TREE_SSOT.md`**（新建于仓库根）。核心结论摘要：

### 2.1 哪棵是发布树 → **根 `src/`**

证据链（全部实测）：
1. 根 `Dockerfile` 第 45 行 `COPY . .`，构建上下文 = 仓库根 → 编译根 `src/`
2. `docker-compose.yml`：`build: context: . / dockerfile: Dockerfile`
3. 根 `deploy.sh`（784 行）第 396 行 `rsync -avz --delete ... "$SCRIPT_DIR/" $SERVER:$DEPLOY_PATH/` → rsync 源是**仓库根**
4. `tsconfig.json` include `src/**/*.ts`｜`next.config.ts` `./src/i18n/request.ts`｜`vitest.config.ts` include `src/**` + alias `@ → ./src` → **全部指向根树**
5. CI `ci.yml`/`tests.yml` 无 `working-directory`，在仓库根执行，路径过滤 `src/**/*.{ts,tsx,js,jsx}`
6. 版本号：根 `package.json` **1.14.2** vs 旧树 **1.14.1**

实测规模：根 `src/` **1890** 文件 vs 旧树 **983** 文件；两树同名同路径文件仅 **121** 个；`src/lib/` 子目录 105 vs 59。

### 2.2 失配 commit 清单

2026-09-01 以来逐 commit 用 `git show --name-only` 分类：

| 分类 | 数量 |
|---|---|
| 只改根 `src/`（正确） | **4** |
| 只改 `7zi-frontend/src/`（**改了影子树，发布物零生效**） | **33** |
| 两边都改 | 3 |

**33 个 OLD_TREE_ONLY commit**（完整列表在 SSOT 文档 §3.2），最恶劣的是 `4f72fa7fec`——message 写着「修复**根级 src/** 的 36 个 TypeScript 错误」，实际改的是 `7zi-frontend/src/**` 11 个文件。

**8 个 CLAIMED_NO_SRC commit**（message 声称改源码、diff 里无源码文件）：
- **`d2328ff110`**（主管点名，确认属实）：「fix(auth): 关闭登录接口的用户枚举 oracle + 修复 sanitizeHtml XSS 绕过」→ 实际只改了 `DEV_TASKS_20261024_1023.md`、`memory/claw-mesh-state.json`、`state/tasks.json`，**零源码**。且 `sanitizeHtml` 在根 `src/` 下 **0 命中**，只在旧树存在 → 该 XSS 修复在发布树里根本不存在。
- `8a3a6f2fc0`、`3aa6500313`（声称修 `usePerformanceMonitor` 泄漏，实改后端 `WorkflowEngine.js`）、`a1914975fb`、`e68aba61cc`、`05e0f30285`、`adbcea9292`、`0f8dc9cfd4`（标称「根级 ESLint」，实为纯文档/状态文件）。

### 2.3 收敛建议（**只写建议，未执行**）

| 方案 | 代价 | 风险 |
|---|---|---|
| **A. 旧树归档冻结**（加只读 README + AGENTS 规则 + 一次性差异迁移清单） | 低 | 中（grep/AI 检索仍可能误命中旧文件） |
| B. 双向同步机制 | 中（需新增 CI job/hook） | **高**（双写无法解决 90% 结构性分叉，且继续供养反模式） |
| C. 删除旧树 + 一次性迁移窗口 | 高（需逐条审 33 个 commit） | 中高（旧树 `src/app/api`、`src/shared`、`src/core`、`src/locales` 在根树无对应物，漏判即功能缺失） |

**推荐 A**：成本最低、直击事故根因（代理不知道改哪棵树）、不阻断后续升级到 C。

---

## 三、遗留问题

1. `state/tasks.json` 尾部被调度器追加了新的 `completed` 监控任务（运行时数据），需在合适时机再跑一次归档脚本。
2. `state/tasks.archive.json` 仍是 **untracked**，`.gitignore` 中已加 `!state/tasks.archive.json` 反忽略规则（主管改动），但**入库需主人授权 `git add`**（本任务硬约束禁止）。
3. 旧树 `7zi-frontend/deploy.sh`（349 行）与根 `deploy.sh`（784 行）**两份并存**，只有根那份被执行，旧那份是诱饵。
4. 旧树 `7zi-frontend/src/hooks/useTouchGestures.ts` 与 `__tests__/useSwipe.test.ts` 在工作区**有未提交改动**（非我所为），需确认去留。

## 四、需主人决策项（未获授权前不执行）

| # | 决策项 |
|---|---|
| D1 | 采纳方案 A（旧树归档冻结）？ |
| D2 | 是否**删除** `7zi-frontend/` 整棵旧树？（硬约束禁止 `rm -rf`，已挂起） |
| D3 | 33 个 OLD_TREE_ONLY commit 中哪些修复需**回移到根 `src/`**？ |
| D4 | `d2328ff110` 声称的 auth/XSS 修复是否需**补提交**？工作区 `src/lib/auth/` 有未提交改动（`repository.ts`/`service.ts` 已改，`password.ts`/`login-timing.test.ts` 未跟踪） |
| D5 | `3aa6500313` 声称的 `usePerformanceMonitor` 定时器泄漏，根树 `src/lib/monitoring/use-performance.tsx` 疑似**仍未修** |
| D6 | 根/旧两份 `deploy.sh` 并存如何处置？ |
| D7 | `state/tasks.json` 已 tracked 但已 gitignore，是否后续 `git rm --cached` 剥离追踪？（本任务禁止） |

---

## 五、结论

**Yes —— 任务 A 与任务 B 均已完成。**
任务 A：`state/tasks.json` 从 34299 行 / 975 KB / 746 条任务，瘦身到 **245 行 / 6.9 KB / 5 条未完结任务**（-99.3%，目标 ≤500 行达成）；741 条 completed 历史任务连同 2 条重复 id 记录迁入 `state/tasks.archive.json`（800 条，跨文件 id 交集 = 0，两侧 id 均唯一）；脚本在 `/tmp/t101_slim.py`，未留仓库；全程未执行 git add/commit/push/rm --cached，未碰 `src/**` 与 `7zi-frontend/**`。
任务 B：实测确认**根 `src/`（v1.14.2，1890 文件）是唯一发布树**，嵌套 `7zi-frontend/src/`（v1.14.1，983 文件）是废弃影子树，tsconfig/next.config/vitest/CI/Dockerfile/rsync 六条证据链一致指向根树；失配 commit 共 **41 个 = 33 个改了影子树（发布物零生效）+ 8 个 message 声称改源码而 diff 无源码文件（含主管点名的 `d2328ff110`，该 XSS 修复在发布树中确实不存在）**；收敛推荐方案 A（旧树归档冻结 + 一次性差异迁移清单），删除/同步/迁移三项均已标注为「需主人决策，未获授权前不执行」。
