# 失配 commit 回迁清单（MISSING_COMMIT MIGRATION）

**生成者**：T111（📚 咨询师） · **日期**：2026-10-25 00:10–00:26 (Asia/Shanghai)
**工作目录**：`/root/.openclaw/workspace`（bot6）
**范围**：本地 `main` 领先 `origin/main` 的全部 commit，筛选出**未在任何报告 / CHANGELOG 中出现记录**者。

> ⚠️ **本文件只出清单，不执行任何 git 操作。**
> 本轮**未**执行 `git add` / `git commit` / `git push` / `git push --force` / `git rebase` / `git filter-branch`，
> **未改写任何历史**，也未触碰任何 `src/**` 或 `7zi-frontend/**` 源文件。
> 下方所有 `MIGRATE` 建议**均需主人授权后**由主管统一执行。

---

## 0. 判定口径

| 口径 | 说明 |
|---|---|
| **本地领先远程** | `git log --oneline origin/main..HEAD` → **55 个 commit**（`origin/main` = `17cf105a92`，2026-10-23 00:44） |
| **已被记录** | 该 commit 的 sha 字符串出现在工作区任一 `*.md`（含 `CHANGELOG.md` / `HEARTBEAT.md` / 各 `T*_*.md` 报告）中 |
| **未被记录** | sha 在任何 `*.md` 中**均未出现** → 进入本清单 |
| **发布树** | 根级 `src/` + `tests/`（`vitest.config.ts` include、`Dockerfile` `COPY . .`、`deploy.sh` rsync 整仓 —— 实际发布的只有这棵树） |
| **嵌套树（非发布）** | `7zi-frontend/src/` —— 根 CI 从未跑过、`deploy.sh` 不发布 |
| **SKIP** | 内容为文档 / 状态 / 忽略规则，或已在发布树等价落地 → 无需回迁 |
| **MIGRATE** | 修复只落在嵌套树或未落在任何树，发布树确实缺这段逻辑 → 建议差异化回迁（需授权） |
| **UNKNOWN** | 提交声称与实际 diff 不符，且无法从仓库内判定真实意图 → 需人工复核后再定 |

---

## 1. 总览

| 分类 | 数量 | 处置 |
|---|---|---|
| 本地领先远程的 commit | **55** | — |
| 其中 sha 已在报告 / CHANGELOG 中被引用 | **43** | 无需处理（仅核对内容是否同步） |
| **其中 sha 未在任何 md 中出现（本清单主体）** | **12** | 见第 2 节 |
| 其中「修复只落在嵌套树 / 声称与实际不符」的失配项 | **13**（含 2 个同时命中上面 12 项） | 见第 3 节 |

---

## 2. 未在任何报告 / CHANGELOG 中出现记录的 commit（12 个）

> 全部为 **docs / chore / 状态类**或**已被后续提交覆盖**的条目，无一需要代码回迁。

| # | commit | 时间 | 主题 | 改动文件 | 内容是否已在文档中 | 判定 | 依据 / 建议 |
|---|---|---|---|---|---|---|---|
| 1 | `e1d65ce2c9` | 10-24 10:44 | docs: 交接文档修正 PAT 扫描正则 + 记录 2026-10-23 日志 | `DEV_TASKS_20261024_1004.md`、`docs/CLAW-MESH-HANDOVER.md`、`memory/2026-10-23.md` | 文档本体已在仓库，但 CHANGELOG 未引用 | **SKIP** | 属交接文档正文，无需回迁；建议仅在 CHANGELOG 补一行 sha 引用（待主人批准后由主管加） |
| 2 | `ba24addb78` | 10-24 10:12 | docs: 回填 T82-T86 成果 + CI 门禁实测结论 + 修正根级 warnings 计数 | `CHANGELOG.md`、`README.md` | **是**（CHANGELOG 的 T86 段落即其产物） | **SKIP** | 仅缺 sha 引用，内容已在 CHANGELOG |
| 3 | `5a2cdc9d81` | 10-24 09:58 | docs: 收录 T82/T85/T86 报告与待拍板决策清单 | `DECISION_PENDING_20261024.md` + 3 份 `DEV_TASKS` + `T82/T85/T86` 报告 | **是**（T86 段落引用了三份报告） | **SKIP** | 报告文件均已入库 |
| 4 | `5015c2d62e` | 10-24 09:41 | docs: 心跳更新 — CI 门禁实测结论 + 更正 prometheus.js 误判 | `HEARTBEAT.md` | **是**（该段落内容已由 T111 本次回迁，见 §4） | **SKIP** | 内容已回迁 |
| 5 | `871af00a97` | 10-24 09:22 | docs: 心跳更新 — CI 门禁实测结论（前端 test-unit 211 失败，后端全绿） | `HEARTBEAT.md` | **是**（同上，本次回迁 31 行 CI 门禁实测结论） | **SKIP** | 内容已回迁 |
| 6 | `fa6e088e21` | 10-24 09:03 | chore: 忽略 vitest 4 缓存目录 `.vitest/` | `.gitignore` | 否（`.gitignore` 生效但无文档记录） | **SKIP** | 纯忽略规则，无业务逻辑；可在 CHANGELOG 顺带记一笔 |
| 7 | `a9d354f15c` | 10-24 08:40 | docs: 部署文档同步到真实 CI 现状 + 后端测试指南补齐 | `DEPLOYMENT.md`、`docs/BACKEND_TESTING_GUIDE.md` | 部分（CHANGELOG 仅 1 处提及） | **SKIP** | 文档类，文件本身在仓库即生效；建议补 sha 引用 |
| 8 | `ae07c00915` | 10-24 08:14 | docs: 心跳补充 — 根级完整 `eslint .` 门禁 140 秒 exit 0 | `HEARTBEAT.md` | **是**（该条结论在本次回迁的 T86 基线表中） | **SKIP** | 内容已回迁 |
| 9 | `0223360e80` | 10-24 07:40 | docs: 同步 T69-T81 报告到仓库 + 修正根级 lint 口径 + 补记部署高危项 | `CHANGELOG.md`、`README.md` + 8 份 T6x/T7x 报告 | **是**（CHANGELOG「部署链路高危未决」段落即其产物） | **SKIP** | 内容已在 CHANGELOG |
| 10 | `9207252f0a` | 10-24 07:29 | docs: 心跳更新 — 四道门禁全绿 + 本轮提交与关键判断记录 | `HEARTBEAT.md` | **是**（心跳巡检结论已在文件内） | **SKIP** | 内容已在 HEARTBEAT |
| 11 | `888be49974` | 10-24 00:32 | docs: 心跳更新 — 门禁全绿 + T81 部署就绪度 3 个高危未决 | `HEARTBEAT.md` | **是**（3 个高危未决已收进 CHANGELOG） | **SKIP** | 内容已在 CHANGELOG |
| 12 | `9e49e41ba3` | 10-23 21:33 | fix(lint): T71 后端 catch 可选绑定，消除双 flat config 下潜伏 warning | `7zi-backend/websocket/__tests__/{server.integration,smoke}.test.js` + `T71_BACKEND_LINT_CLEANUP.md` | **是**（CHANGELOG「后端 11 warnings」处置段落已引用 `T71_BACKEND_LINT_CLEANUP.md`） | **SKIP** | 后端测试文件属 `7zi-backend/`（独立服务、有独立 CI），**不涉及双前端树失配**；成果已记录 |

> **结论：本清单 12 项全部为 SKIP —— 没有一个需要把代码从嵌套树搬回发布树。**
> 唯一「值得主人知情」的是第 2/3/9 项：它们的**内容**已经在 CHANGELOG 里，只是**没有标注 sha**，建议授权后统一补引用。

---

## 3. 失配 commit 清单（修复只落在非发布树 / 声称与实际不符，13 个）

> 这部分**不是**「未记录」，而是「记录了但改动落错了树」—— 详见 `T97_FRONTEND_TREE_DEDUP_AUDIT.md`。
> 依据：`git show --name-only <sha>` 统计 `7zi-frontend/src/` 与根级 `src/` 的改动分布。
> **同样只出清单，不执行。**

| # | commit | 时间 | 主题 | 嵌套树文件数 | 根级 `src/` 文件数 | 判定 | 建议（需授权） |
|---|---|---|---|---|---|---|---|
| 1 | `d2328ff110` | 10-24 11:35 | fix(auth): 关闭登录接口的用户枚举 oracle + 修复 sanitizeHtml XSS 绕过 | 0 | **0** | **UNKNOWN** | `git show --numstat` 显示**源码改动 = 0**，只改了 `DEV_TASKS_*.md` / `state/tasks.json` —— 声称的安全修复**从未进入任何树**；同类修复已在 `e52333a7b5` 于发布树真正落地（见 `T99_AUTH_TIMING_FIX.md`），本条建议 **SKIP**，但需人工确认无遗漏 |
| 2 | `6bc88ab75f` | 10-24 15:58 | fix(hooks): 修复 useTouchGestures 手势缺陷，52/52 测试通过 | 2 | 0 | **MIGRATE** | 6 项真实产品缺陷（双指缩放比例恒等于 1 / 滑动额外触发 `onTap` / DOM 监听闭包固化 / 阈值 `>` 应为 `>=` / 只读 `changedTouches` / 元素晚于 effect 就绪绑不上）**发布树没有 `useTouchGestures`** → 需决策：在根级新建该 hook，或删除旧树后废弃 |
| 3 | `cb56fd87bb` | 10-24 16:02 | fix(hooks): 修复 useSwipe 滑动手势缺陷，25/25 测试通过 | 2 | 0 | **MIGRATE** | 同上（`useSwipe` + `useSwipeGestures.ts`）；发布树是否需要该 hook 待定 |
| 4 | `e475608a72` | 10-24 10:40 | fix(auth-test): 对齐 501 安全契约，修正 4 个过时断言 | 1 | 0 | **SKIP** | 根级 `src/app/api/auth/login/route.ts` 是**真实 `loginUser` 实现**，没有 501 短路，「501 契约」模型在根级不适用 → 断言不成立 |
| 5 | `f1fd650ddf` | 10-24 06:05 | fix(prometheus): 撤销编译产物 prometheus.js 手工改动，改 lint 忽略 | 6 | 1 | **MIGRATE（低）** | 改动含 `eslint.config.mjs` 忽略规则（根级已生效）+ 嵌套树编译产物撤销；发布树 `src/lib/monitoring/prometheus.js` 同名产物需同样确认一次 |
| 6 | `399351b6cc` | 10-24 00:46 | fix(audit): 清理过期日志的边界条件 `<` → `<=` | 1 | 0 | **MIGRATE** | 真实边界条件 bug（偶发失败）；发布树同模块需核对是否同样使用 `<` |
| 7 | `0ad99bb99e` | 10-24 00:36 | fix(collab): 防御性丢弃非法协作消息 + 搜索建议中英双语补齐 | 3 | 0 | **MIGRATE** | `isValidCollabMessage` 类型守卫 + `search/suggestions` 中英双语；已在 CHANGELOG T86 段落记录，但**只落在嵌套树** → 发布树需补 |
| 8 | `86af086f5e` | 10-23 20:56 | fix(ts): 补 `HistoryDataPanel` 缺失的 `useCallback` 导入 | 1 | 0 | **MIGRATE** | 纯类型修复，发布树对应组件需核对 |
| 9 | `f2a4fdc944` | 10-23 20:55 | fix(retry): 修复 `retry.ts` 的 3 个真 Bug + 重写 retry 测试（246s → 3.8s） | 2 | 0 | **MIGRATE** | 3 个真 Bug（`shouldRetry` 被默认规则覆盖 / `@retry` 装饰器泄漏 `RetryResult` / `RetryOptions` 泛型未使用）已在 CHANGELOG 记录；**发布树未落地** |
| 10 | `a4a055457e` | 10-23 21:11 | fix(lint): 前端 ESLint 警告全清 + `RetryOptions` 泛型参数移除 | 22 | 0 | **MIGRATE** | 22 个文件全在嵌套树；「警告全清」结论**不适用于发布树** |
| 11 | `4f72fa7fec` | 10-23 10:56 | chore(lint): 修复**根级** `src/` 的 36 个 TypeScript 错误与 ESLint 错误 | **11** | **0** | **UNKNOWN（高危）** | 主题写「根级」，实际 **11 个文件全在 `7zi-frontend/`**，根级 0 个 → **声称与实际不符**，需人工复核是否有根级错误未修 |
| 12 | `cb84f437bd` | 10-23 10:22 | chore: 同步前序子代理产出（前端 lint 清理 164 文件 + 状态/记忆文件） | **159** | 0 | **UNKNOWN** | 159 个文件全在嵌套树（含 `eslint.config.mjs`）；发布树是否同样存在这些 lint 错误需重跑 `npx eslint src` 确认 |
| 13 | `02ef8fe87e` | 10-23 20:35 | chore(supervisor): 归档 T66-T68 子代理未提交改动（前端 retry.ts + 后端 websocket/workflow 修复） | 3 | 0 | **MIGRATE（部分）** | 后端部分（`7zi-backend/websocket`、`workflow-service`）**不涉及双树**，发布/运行有效；仅前端 `retry.ts` 部分需回迁（与 #9 重叠） |

### 3.1 执行顺序建议（若主人授权）

1. **先做发布树存在性核对**：`ls src/hooks/useSwipeGestures.ts src/lib/error-reporting/retry.ts src/features/collab/...` —— 存在同名模块才需回迁，不存在则属「旧树独有功能」，需先定 SSOT 归属。
2. **逐 commit 差异化回迁**（不整 commit cherry-pick，避免带入嵌套树路径与旧版依赖）。
3. **回迁后必跑**：`npx eslint src` → `npx tsc --noEmit` → 根级 `npx vitest run` → `scripts/check-publish-tree.sh`（确认无 `7zi-frontend/` 混入）。
4. **高危项 #11 / #12 先人工复核**再决定是否回迁 —— 二者主题与实际改动树不一致，贸然回迁风险高。

---

## 4. 本次同步（T111）的实际改动与验证

### 4.1 改动清单

| 文件 | 类型 | 改动行数 | 说明 |
|---|---|---|---|
| `HEARTBEAT.md` | 修改 | **+76 / −0** | 回迁 `c3d4e22f7d` 误删的两段历史基线：① `## 当前基线（2026-10-24 05:38–05:52，T86 实测）`（45 行，置于文首）② `## 🔴 CI 门禁实测结论（2026-10-24 06:30…）`（31 行，置于「推送时间」之后）。**未整体覆盖**，现版本新增段落（T91 / T97 / 手势修复）全部保留 |
| `CHANGELOG.md` | 修改 | **+58 / −0** | 新增段落 `## [未发布] / 2026-10-24 ~ 2026-10-25（T87–T110 补记，由 T111 同步）`：T87–T110 共 24 条任务条目（任务号 / 日期 / 类型 / 一句话摘要 / 改动范围），未产出报告者标「待验证」；另含 HEARTBEAT 回迁说明与本清单索引 |
| `MISSING_COMMIT_MIGRATION.md` | 新建（未跟踪） | **142 行** | 失配 commit 回迁清单（§0 口径 / §1 总览 / §2 未记录 12 项 / §3 失配 13 项 / §4 改动与验证） |

### 4.2 验证方式

```bash
cd /root/.openclaw/workspace

# 1) 三个文件的改动统计（预期：HEARTBEAT +76、CHANGELOG +58、MISSING_COMMIT_MIGRATION 为未跟踪新文件）
git diff --stat -- HEARTBEAT.md CHANGELOG.md
git status --short HEARTBEAT.md CHANGELOG.md MISSING_COMMIT_MIGRATION.md

# 2) 确认 HEARTBEAT 回迁的是「纯新增、无删除」
git diff --numstat -- HEARTBEAT.md          # 预期：76  0  HEARTBEAT.md

# 3) 确认回迁内容与被删版本逐字一致（从 c3d4e22f7d^ 取回原文比对）
git show c3d4e22f7d^:HEARTBEAT.md | sed -n '3,47p'   # T86 基线段（45 行）
git show c3d4e22f7d^:HEARTBEAT.md | sed -n '242,272p' # CI 门禁实测结论段（31 行）

# 4) 确认 CHANGELOG 新段落位置与条目数（预期：24 条 T87–T110）
grep -n "T87–T110 补记" CHANGELOG.md
awk '/^## \[未发布\] \/ 2026-10-24 ~ 2026-10-25/,/^## \[未发布\] \/ 2026-10-24$/' CHANGELOG.md \
  | grep -c "^| \*\*T"

# 5) 确认本清单的判定口径可复现（只读命令）
git log --oneline origin/main..HEAD | wc -l          # 预期：55
git log --oneline origin/main..HEAD --format=%h |
  while read h; do grep -rl --include="*.md" -F "$h" . --exclude-dir=node_modules --exclude-dir=.git; done
```

**本次实际执行结果**：`git diff --stat -- HEARTBEAT.md CHANGELOG.md` →
`CHANGELOG.md | 58 +++++`、`HEARTBEAT.md | 76 +++++`，合计 **134 insertions(+), 0 deletions(-)**。

### 4.3 硬约束遵守声明

- ✅ 未执行 `git add` / `git commit` / `git push` / `git push --force` / `git rm --cached`
- ✅ 未改写历史（无 rebase / filter-branch / amend / reset）
- ✅ 只改了 `CHANGELOG.md`、`HEARTBEAT.md`，并新建 `MISSING_COMMIT_MIGRATION.md`；未触碰任何 `src/**`、`7zi-frontend/**`、`state/**`、`memory/**`
- ✅ 本文件与 CHANGELOG 中不含任何真实凭据原文；历史 PAT 仅以形态描述出现（如「真实形态的 `ghp_`」）
- ✅ 未做任何远端部署 / `rsync --delete`

