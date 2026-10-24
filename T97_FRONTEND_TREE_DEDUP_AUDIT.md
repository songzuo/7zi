# T97 — 前端双树去重审计报告

**审计人**：🏗️ 架构师 / 📚 咨询师（T97）
**时间**：2026-10-24 15:45–15:57 CST
**工作目录**：`/root/.openclaw/workspace`（git repo 根）
**任务性质**：只读审计 + 方案设计。**未做任何删除/移动/改写**，未 `git add/commit/push`。

---

## 0. 结论速览（TL;DR）

| 项目 | 结论 |
|---|---|
| 事实源（SSOT） | **根级 `src/` + `tests/`**（版本 1.14.2）——由 `deploy.sh` rsync 与根 `Dockerfile` `COPY . .` 实际构建发布 |
| 两树同名文件总数 | 121（相对 `src/` 而言） |
| 其中**内容分叉** | **116**（95.9%） |
| 其中内容一致 | **5**（`components/seo/JsonLd.tsx`、`lib/security/README.md`、`lib/security/headers.ts`、`test/seo/seo-integration.test.ts`、`test/seo/seo-schema.test.tsx`） |
| 只在根级存在 | **1762** 个文件 |
| 只在嵌套存在 | **861** 个文件 |
| 失配 commit（改了非发布树） | **35 个 commit 触碰 `7zi-frontend/src`**，其中 **22 个**改到的文件在根级 `src/` 有等价路径（可回迁），**13 个**是根级完全没有的模块（纯嵌套功能） |
| 最严重失配 | **`d2328ff110` 的 commit message 声称做了 3 处安全修复，实际 commit 内 `src/` 改动 = 0**（只改了 `DEV_TASKS_20261024_1023.md` / `state/tasks.json` / `memory/claw-mesh-state.json`）。修复**从未进入任何树** |
| 推荐方案 | **Phase 1（1 步、零风险）**：把嵌套树改名归档 `7zi-frontend.legacy/`，根级为唯一 SSOT；**Phase 2**：选择性回迁 13 个根级缺失模块。**不建议用 symlink**（git 不跟踪 symlink 目标 + CI/lint/tsconfig 路径假设复杂） |
| 最终结论 | **Partial**（审计与方案完整；实施需主管批准，且 Phase 2 有 2 个决策项待主人拍板） |

---

## 1. 审计方法

```bash
# 1) 两树文件清单（git 跟踪视角）
git ls-files src            → 1883 行
git ls-files 7zi-frontend/src → 982 行
git ls-files 7zi-frontend    → 1306 行（src 982 + tests 37 + 其余 287）

# 2) 归一化后 comm 三分
git ls-files src | sed 's|^src/||' | sort > /tmp/root_src.txt
git ls-files 7zi-frontend/src | sed 's|^7zi-frontend/src/||' | sort > /tmp/nest_src.txt
comm -23 root nest   → 1762  (只在根级)
comm -13 root nest   →  861  (只在嵌套)
comm -12 root nest   →  121  (同名)

# 3) 同名文件内容比对：git show HEAD:<path> | cmp（比对 HEAD 快照，避免工作区脏文件干扰）
for f in $(comm -12 /tmp/root_src.txt /tmp/nest_src.txt); do
  git show HEAD:src/$f | cmp -s - <(git show HEAD:7zi-frontend/src/$f) \
    && echo SAME $f || echo DIFF $f
done
→ same=5  diff=116

# 4) 失配 commit 扫描
git log --since=2026-06-01 --format=%h -- 7zi-frontend/src | while read c; do
  git show --numstat --format="" $c | awk '{if($3~/^7zi-frontend\/src/)n++; else if($3~/^src\//)r++; else o++}
    END{printf "nested=%d root=%d other=%d",n,r,o}'
done

# 5) 路径依赖 grep（CI / deploy / scripts / tests / eslint / docker）
grep -rn "7zi-frontend" .github/ scripts/ *.json *.yml *.mjs *.js deploy.sh Dockerfile docker-compose.yml
grep -rn "7zi-frontend/" src/ tests/     # 反向依赖检查
```

**方法说明**：全部基于 `git ls-files`（跟踪文件），不使用 `find`，避免 `.next/`、`node_modules/` 等构建产物污染统计。内容比对统一在 `HEAD` 快照上做，因此工作区未提交改动（`useTouchGestures.ts`、新增 `xss-probe.test.ts`）被隔离在第 5 节单列。

---

## 2. 两树对照表

### 2.1 总量

| 维度 | 根级（发布树） | 嵌套（旧副本） |
|---|---|---|
| `package.json` version | **1.14.2** | 1.14.1 |
| `src/` 跟踪文件 | **1883** | 982 |
| `src/` 磁盘文件 | 1886 | 984 |
| `tests/` 跟踪文件 | **211** | 37 |
| 全树跟踪文件 | 1883+211+… | 1306（src 982 + tests 37 + 其他 287） |
| 磁盘占用 | — | 5.6 GB（含 node_modules/.next） |
| 首次出现 | `c19a1e0dca` 2026-03-20（v1.0.5） | `b1a3da0105` 2026-03-21（TS 修复） |
| 最近改动 | `f1fd650ddf` 2026-10-24 | `e475608a72` 2026-10-24 |
| ESLint | 被 lint（根 `eslint.config.mjs`） | **被 lint 忽略**（`'7zi-frontend/**'`） |
| tsc | `tsconfig.json` include `src/**/*.ts(x)` | **不被根 tsc 覆盖**（嵌套有独立 tsconfig） |
| vitest | `vitest.config.ts` include `src/**` + `tests/**` | **不被根 vitest 覆盖** |
| Dockerfile | 根 `Dockerfile` `COPY . .` → 构建根树 | 嵌套自带 `Dockerfile`（不被调用） |
| deploy.sh | 根 `deploy.sh` rsync 仓库根 → `/opt/7zi-frontend` | 嵌套自带 `deploy.sh`（不被调用） |

### 2.2 按模块（同名 = 相对路径同名）

| 模块 | 根级 | 嵌套 | 同名 | 只在根级 | 只在嵌套 | 同名但分叉 | 分叉率 |
|---|---|---|---|---|---|---|---|
| `lib/` | 1157 | 389 | 64 | 1093 | 325 | 62 | 96.9% |
| `components/` | 284 | 252 | 14 | 270 | 238 | 13 | 92.9% |
| `app/` | 253 | 145 | 27 | 226 | 118 | 27 | 100% |
| `test/` | 79 | 11 | 6 | 73 | 5 | 4 | 66.7% |
| `hooks/` | 31 | 32 | 4 | 27 | 28 | 4 | 100% |
| `middleware/` | 6 | 3 | 2 | 4 | 1 | 2 | 100% |
| `stores/` | 14 | 13 | 1 | 13 | 12 | 1 | 100% |
| `types/` | 17 | 8 | 1 | 16 | 7 | 1 | 100% |
| `contexts/` | 4 | 8 | 0 | 4 | 8 | — | — |
| `features/` | 5 | 79 | 0 | 5 | **79** | — | — |
| `i18n/` | 15 | 0 | 0 | 15 | 0 | — | — |
| `workflows/` | 9 | 0 | 0 | 9 | 0 | — | — |
| `shared/` | 0 | 20 | 0 | 0 | **20** | — | — |
| `locales/` | 0 | 14 | 0 | 0 | **14** | — | — |
| `core/` | 0 | 4 | 0 | 0 | 4 | — | — |
| 根级顶层文件 | 4 | 2 | 2 | — | — | 2 (`vitest.d.ts`, `proxy.ts`) | 100% |
| **合计（src）** | **1883** | **982** | **121** | **1762** | **861** | **116** | **95.9%** |

**核心风险信号**：同名文件 95.9% 内容分叉。任何人（包括子代理）凭直觉在「看起来对的那棵树」改代码，只有 4.1% 概率改对。

### 2.3 关键差异样例（同名分叉的具体表现）

| 文件 | 根级（发布） | 嵌套（旧副本） |
|---|---|---|
| `hooks/useSwipeGestures.ts` | 存在 + 有 `.test.ts` | **不存在**（嵌套只有 `__tests__/useSwipe.test.ts`） |
| `hooks/useTouchGestures.ts` | **不存在** | 存在（且工作区有未提交的 +88/-28 修复） |
| `hooks/useDebounce.ts` | 存在 | 存在（内容分叉） |
| `app/api/auth/` | 10 个子路由（login/register/logout/refresh/token/verify/me/permissions/audit-logs），带 `__tests__` | 仅 1 个 `route.ts`（单文件版），带 2 个 `__tests__` |
| `app/api/auth/login/route.ts` | **存在**（207 行，真实 loginUser 实现） | **不存在**（登录在嵌套的单文件 `auth/route.ts` 里） |
| `lib/auth/` | 21 文件（service/repository/jwt/middleware-rbac/tenant/…） | 4 文件（api-auth/encrypted-storage/index/jwt） |
| `lib/validation-schemas.ts` | **不存在** | 存在（含 `sanitizeHtml`） |
| `lib/auth/password.ts` | **不存在**（两树都没有） | **不存在** |
| `lib/utils/validation.ts` | 存在（纯函数校验，**无 sanitizeHtml**） | — |
| `lib/api/validation.ts` | 存在（zod schema） | — |
| `lib/evomap/`（7 文件）、`lib/audio/`（19）、`lib/automation/`（9）、`lib/reporting/`（16）、`lib/error-reporting/`（9） | **全部不存在** | 存在 |
| `features/`（79 文件：websocket/monitoring/dashboard/collab/rate-limit/mcp/auth/audit） | 不存在 | 存在 |

### 2.4 「只在嵌套存在」的内容定性

嵌套独有代码共 861 个文件，分两类：

**A 类：根级有等价物（命名/路径不同）—— 低价值，可丢弃**
- `lib/performance/*`（39）、`lib/monitoring/*`（31）→ 根级 `src/lib/performance/`（51）、`src/lib/monitoring/`（82）
- `lib/ai/*`（14）→ 根级 `src/lib/ai/`（76）
- `lib/db/*`（11）→ 根级 `src/lib/db/`（60）
- `lib/collab/*`（11）→ 根级 `src/lib/collab/`
- `lib/alerting/*`（11）→ 根级 `src/lib/alerting/`
- `lib/search/*`（7）、`lib/rate-limit/*`（5）、`lib/agents/*`（8）、`lib/workflow/*`（11）
- `lib/theme/*`（11）、`lib/pwa/*`（5）、`lib/keyboard/*`（5）
→ 结论：绝大部分是「同一模块的两代实现」，根级版本更新更全。

**B 类：根级完全没有 —— 真·功能缺口（13 个模块，决策项）**

| 模块 | 文件数 | 根级有无 | 引入时间 |
|---|---|---|---|
| `lib/evomap/` | 7 | ❌ 无 | 2026-04-30 (`559c9eecf2`) |
| `lib/audio/` | 19 | ❌ 无 | 2026-04-05 (`00b86a2a15`) |
| `lib/automation/` | 9 | ❌ 无 | 2026-04-04 (`5406a0e237`) |
| `lib/reporting/` | 16 | ❌ 无 | 2026-04-05 (`60ae1f52e8`) |
| `lib/error-reporting/` | 9 | ❌ 无 | — |
| `features/` 全 79 | 79 | ❌ 无 | 2026-03-29 (`75d141648d`) |
| `shared/` | 20 | ❌ 无 | 2026-03-29 |
| `locales/` | 14 | ❌ 无 | — |
| `core/` | 4 | ❌ 无 | — |
| `contexts/` | 8 | ❌ 无 | — |
| `hooks` 独有（useCollaboration/useTouchGestures/usePWA/useKeyboardShortcuts/useDeviceType/useMediaQuery/useRichTextEditor/useImagePreload/useAnalytics/useWorkflowTemplate/useWebhooks/useRoomWebSocket/usePerformanceMonitor(ing)/useNotificationsStable/useMobileTouchOptimization 等 28 个） | 28 | 根级 hooks 仅 31 个且多数同名不同实现 | — |

**其中 `features/` 与 `shared/` 是嵌套树 2026-03-29 架构尝试（`75d141648d`「docs: 同步 7zi-frontend 文档与 hooks 重构」）引入的中间态分层**，根级从未采用，属于**被废弃的架构方向**——不建议回迁。

---

## 3. 分叉点清单（同名但内容不一致 = 116 个）

完整清单见 `/tmp/div.txt`（本次审计生成）。按模块分布：

| 模块 | 分叉数 | 代表文件 |
|---|---|---|
| `lib/` | 62 | `lib/auth/jwt.ts`, `lib/auth/index.ts`, `lib/api/error-handler.ts`, `lib/api/error-logger.ts`, `lib/middleware/csrf.ts`, `lib/permissions.ts`, `lib/permissions/index.ts`, `lib/permissions/types.ts`, `lib/errors.ts`, `lib/cache/index.ts`, `lib/websocket-manager.ts`, `lib/workflow/index.ts`, `lib/workflow/VisualWorkflowOrchestrator.ts`, `lib/offline/sync-manager.ts`, `lib/mcp/server.ts`, `lib/tools/executor.ts`, `lib/seo/metadata.ts`, `lib/services/email.ts`, `lib/services/notification*.ts`, `lib/storage/draft-storage.ts`, `lib/webhook/index.ts`, `lib/websocket/*`, `lib/validation/*`, `lib/agents/learning/*`, `lib/performance/**` … |
| `app/` | 27 | `app/api/a2a/jsonrpc/route.ts`, `app/api/a2a/queue/route.ts`, `app/api/a2a/registry/route.ts`, `app/api/data/import/route.ts`, `app/api/feedback/route.ts`, `app/api/health/route.ts`, `app/api/performance/alerts/route.ts`, `app/api/projects/route.ts`, `app/api/search/route.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/[locale]/dashboard/page.tsx`, `app/[locale]/knowledge-lattice/page.tsx`, … |
| `components/` | 13 | `components/index.ts`, `components/ui/{Badge,Button,Card,Input,Select,Skeleton}.tsx`, `components/ui/index.ts`, `components/analytics/index.ts`, `components/dashboard/AgentStatusPanel.tsx`, `components/dashboard/index.ts`, `components/knowledge-lattice/KnowledgeLattice3D.tsx`, `components/OptimizedImage.tsx` |
| `hooks/` | 4 | `hooks/index.ts`, `hooks/useDebounce.ts`, `hooks/useNotifications.ts`, `hooks/useWorkflowDraft.ts` |
| `test/` | 4 | `test/setup.ts`, `test/seo/seo-{meta-tags,robots,sitemap}.test.ts` |
| `middleware/` | 2 | `middleware/index.ts`, `middleware/auth.middleware.ts` |
| 其他 | 4 | `proxy.ts`, `stores/index.ts`, `types/performance.ts`, `vitest.d.ts` |

**一致（5 个，可作为「两树同源」证据）**：`components/seo/JsonLd.tsx`、`lib/security/README.md`、`lib/security/headers.ts`、`test/seo/seo-integration.test.ts`、`test/seo/seo-schema.test.tsx`

---

## 4. 失配 commit 清单（改到了非发布树）

### 4.1 全部 35 个触碰 `7zi-frontend/src` 的 commit（2026-06-01 起）

按 `nested/root/other` 文件数统计（`other` = 文档/状态/配置）：

| commit | 日期 | 主题 | nested | root | 判定 |
|---|---|---|---|---|---|
| `e475608a72` | 10-24 | fix(auth-test): 对齐 501 安全契约 | 1 | 0 | **失配**（改 `7zi-frontend/src/app/api/auth/__tests__/route.test.ts`） |
| `f1fd650ddf` | 10-24 | fix(prometheus) | 6 | 1 | 混合（根级也改了，OK） |
| `399351b6cc` | 10-24 | fix(audit) | 1 | 0 | **失配** |
| `0ad99bb99e` | 10-24 | fix(collab) | 3 | 0 | **失配** |
| `a4a055457e` | 10-23 | fix(lint): 前端 ESLint 警告全清 | 22 | 0 | **失配** |
| `86af086f5e` | 10-23 | fix(ts): HistoryDataPanel 缺 useCallback | 1 | 0 | **失配** |
| `f2a4fdc944` | 10-23 | fix(retry): 修 3 个真 Bug + 重写测试 | 2 | 0 | **失配** |
| `02ef8fe87e` | 10-23 | chore: 归档 T66-T68 | 3 | 0 | **失配** |
| `4f72fa7fec` | 10-23 | chore(lint): 修根级 src/ 的 36 个 TS 错误 | 11 | 0 | **失配**（标题说根级，实际改嵌套） |
| `cb84f437bd` | 10-23 | chore: 同步前序子代理产出 | **159** | 0 | **失配（最大量级）** |
| `1f075b35ae` | 10-22 | docs: 同步 7zi-frontend 文档与 hooks 重构 | **171** | 0 | **失配（最大量级）** |
| `c540772caa` | 10-22 | chore: 同步文档、修 TS 错误 | 5 | 0 | **失配** |
| `7bf0b6e346` | 10-22 | fix(types): TS 错误归零 | 7 | 0 | **失配** |
| `2357198735` | 10-22 | fix(lint): 修 4 月起中断的 CI lint 门禁 | 1 | 0 | **失配** |
| `8b1a7bd4f5` | 10-22 | fix(lint): 前端 ESLint 错误归零 | 7 | 0 | **失配** |
| `113c6dc9ba` | 10-22 | fix(lint): no-unsafe-function-type 等 | 8 | 0 | **失配** |
| `e89c0093e2` | 10-22 | fix(lint): no-case-declarations | 3 | 0 | **失配** |
| `c8c4c59d2d` | 10-22 | fix(types): G-1 组测试文件 | 5 | 0 | **失配** |
| `d66b7ce117` | 10-22 | fix(types): G-2 组 | 3 | 0 | **失配** |
| `18d66cb6e3` | 10-22 | fix(types): 测试文件类型错误 | 30 | 0 | **失配** |
| `af9e3db6d5` | 10-22 | fix(types) | 2 | 0 | **失配** |
| `a7ad3a1d04` | 10-22 | fix(types): T8-T12 遗留 | 22 | 0 | **失配** |
| `f10d8bbb3b` | 10-21 | fix(types): a2a 测试签名 | 3 | 0 | **失配** |
| `f2f81e7588` | 10-21 | chore(security): 清除明文密码残留 | 21 | 0 | **失配**（含安全改动！） |
| `0d2d5a7284` | 10-21 | fix(types): 197→131 | 26 | 0 | **失配** |
| `bfad61fa75` | 10-21 | fix(ui): Tailwind v4 工具类 P0 构建失效 | 1 | 0 | **失配** |
| `fa0c56ecf6` | 10-21 | fix(types): logger/project/push | 3 | 0 | **失配** |
| `7c19b893ae` | 10-21 | fix(types): notification-center types | 1 | 0 | **失配** |
| `6ca47cb1a1` | 10-21 | chore: consolidate 7zi-frontend/backend work | **206** | 0 | **失配（最大量级）** |
| `d09b678992` | 10-21 | fix(websocket): 补边界测试 + 恢复 P0-3 安全修复 | 3 | 0 | **失配（安全）** |
| `05dde5d3eb` | 10-21 | docs: 更新记忆文件 | **211** | 0 | **失配（最大量级）** |
| `c95d8af045` | 10-21 | feat(backend): 独立化 websocket/workflow service | 10 | 0 | **失配** |
| `106050e0be` | 10-20 | chore: 日常维护 | 1 | 16 | 混合（根级为主，OK） |
| `cbc3c214cf` | 10-19 | chore: vite 8.3.4 + server action tests | 1 | 4 | 混合（OK） |
| `863ae91657` | 10-19 | fix(types): JsonValue/JsonRecord | 2 | 0 | **失配** |

> **量化结论**：2026-06-01 以来所有前端改动中，**31 / 35（88.6%）的 commit 只改了非发布树**；同期根级 `src/` 只收到 **7** 个 commit（`f1fd650ddf` 的 1 个、`106050e0be` 的 16 个、`cbc3c214cf` 的 4 个等）。**这解释了为什么根级前端 vitest 仍有 212 个失败基线**——大量「修复」根本没进发布树。

### 4.2 最高优先级：`d2328ff110` —— 声称修复但**实际零源码改动**

```
commit d2328ff110f91f25711e6ab87e6f0aefdf4a9177
fix(auth): 关闭登录接口的用户枚举 oracle + 修复 sanitizeHtml XSS 绕过
```
`git show --numstat d2328ff110` 输出：
```
44   0  DEV_TASKS_20261024_1023.md
2    2  memory/claw-mesh-state.json
1611 1  state/tasks.json
```
**`src/` 与 `7zi-frontend/src/` 改动均为 0**。commit message 声称的三处修复：

| # | message 声称路径 | 根级（发布树）是否存在 | 嵌套是否存在 | 实际状态 |
|---|---|---|---|---|
| 1 | `src/app/api/auth/login/route.ts` | ✅ 存在（207 行，真实 loginUser） | ❌ 不存在（嵌套是单文件 `auth/route.ts`） | **未修复** |
| 2 | `src/lib/auth/password.ts` | ❌ 不存在 | ❌ **两树都没有** | **目标文件不存在** |
| 3 | `src/lib/validation-schemas.ts` | ❌ 不存在 | ✅ 仅嵌套有 | **未修复**（嵌套版 sanitizeHtml 仍是旧实现，见下） |

**证据：嵌套 `7zi-frontend/src/lib/validation-schemas.ts` 第 240–250 行 `sanitizeHtml` 仍是旧实现**——只做「整段标签移除 + `on\w+=` 正则」，**没有逐属性校验**：
```ts
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b.../gi, '')  .replace(/<object\b.../gi, '')  .replace(/<embed\b.../gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}
```
message 声称「原正则只检查第一个属性，改为逐属性校验」——**该改动在两棵树里都不存在**。

**同源的孤儿探针文件**：工作区未跟踪的 `7zi-frontend/src/__tests__/xss-probe.test.ts`（含 11 条 XSS 向量、`console.log` 调试输出）正是为验证这次修复而写的，但修复本体从未落盘。

**根级是否受影响？** ✅ **是**。根级 `src/` 中 `grep -rn "sanitizeHtml" src/` = **0 命中**，即根级根本没有 `sanitizeHtml` 概念；但根级 `src/app/api/feedback/route.ts` 同样没有 sanitize 调用。结论：**根级发布树目前不存在被 `sanitizeHtml` 绕过的直接攻击面**（因为该函数不存在），但也**没有 XSS 输入净化层**——反馈接口等用户输入落库路径需主管另行评估。

### 4.3 `e475608a72` —— 真实失配，改到了非发布树

```
fix(auth-test): 对齐 501 安全契约，修正 4 个过时断言
M  7zi-frontend/src/app/api/auth/__tests__/route.test.ts
```
- 嵌套的被改文件：`7zi-frontend/src/app/api/auth/__tests__/route.test.ts`（对应**嵌套的单文件认证 API** `7zi-frontend/src/app/api/auth/route.ts`，其中 login/register/reset 全在一个 route 里，2026-04-24 加的 501 保护就在这里）
- **根级对应路径**：`src/app/api/auth/login/__tests__/route.test.ts`（根级 login 是独立子路由）+ `src/app/api/auth/register/__tests__/route.test.ts`（register）+ `src/app/api/auth/__tests__/auth.routes.test.ts`（聚合）
- 根级 `src/app/api/auth/login/route.ts` **没有 501 短路**（是真实 loginUser 实现），所以「501 安全契约」这个断言模型**不适用于根级**——根级需要的是「未找到用户 / 密码错误」响应一致性断言（对应 d2328ff110 声称但没做的那件事）。

### 4.4 可直接回迁的失配改动（22 个文件，根级有等价路径）

以下 commit 改的嵌套文件，在根级 `src/` 有**同名等价路径**——意味着这些修复**本可以直接应用到发布树**，逐条比对后可选择性回迁：

| commit | 嵌套路径 | 根级对应路径 |
|---|---|---|
| `cb84f437bd` | `7zi-frontend/src/lib/performance/root-cause-analysis/api-tracker.ts` | `src/lib/performance/root-cause-analysis/api-tracker.ts` |
| `cb84f437bd` | `.../root-cause-analysis/database-tracker.ts` | `src/lib/performance/root-cause-analysis/database-tracker.ts` |
| `cb84f437bd` | `7zi-frontend/src/lib/permissions.ts` | `src/lib/permissions.ts` |
| `cb84f437bd` | `7zi-frontend/src/lib/services/notification.ts` | `src/lib/services/notification.ts` |
| `cb84f437bd` | `.../notification-enhanced.ts` | `src/lib/services/notification-enhanced.ts` |
| `cb84f437bd` | `7zi-frontend/src/proxy.ts` | `src/proxy.ts` |
| `cb84f437bd` | `7zi-frontend/src/test/setup.ts` | `src/test/setup.ts` |
| `a7ad3a1d04` | `.../root-cause-analysis/types.ts` | `src/lib/performance/root-cause-analysis/types.ts` |
| `18d66cb6e3` | `7zi-frontend/src/lib/security/headers.test.ts` | `src/lib/security/headers.test.ts` |
| `113c6dc9ba` | `.../lib/security/prototype-pollution-guard.ts` | `src/lib/security/prototype-pollution-guard.ts` |
| `05dde5d3eb` | `.../services/__tests__/notification-enhanced.test.ts` | `src/lib/services/__tests__/notification-enhanced.test.ts` |
| `d09b678992` | `.../services/__tests__/notification-service.edge-cases.test.ts` | `src/lib/services/__tests__/notification-service.edge-cases.test.ts` |
| `c95d8af045` | `7zi-frontend/src/lib/services/notification-storage.ts` | `src/lib/services/notification-storage.ts` |
| `0d2d5a7284` | `7zi-frontend/src/lib/search/index.ts` | `src/lib/search/index.ts` |
| `0d2d5a7284` | `7zi-frontend/src/lib/websocket-manager.ts` | `src/lib/websocket-manager.ts` |
| `1f075b35ae` | `7zi-frontend/src/lib/validation/form-validator.ts` | `src/lib/validation/form-validator.ts` |
| `1f075b35ae` | `7zi-frontend/src/lib/validation/types.ts` | `src/lib/validation/types.ts` |
| `1f075b35ae` | `.../lib/validation/validators.ts` | `src/lib/validation/validators.ts` |
| `1f075b35ae` | `.../lib/workflow/VisualWorkflowOrchestrator.ts` | `src/lib/workflow/VisualWorkflowOrchestrator.ts` |

> 注：`git show --name-only` 对重命名/复制有折叠，同一 commit 可能还含更多等价路径；上表为自动比对去重后的**可确认集**。回迁时必须逐文件 `diff` 而非直接覆盖（两树已分叉）。

---

## 5. 工作区未提交改动（单列，不污染上表）

| 路径 | 状态 | 判定 |
|---|---|---|
| `7zi-frontend/src/hooks/useTouchGestures.ts` | M，+88/−28 | **缩放手势修复，改在非发布树**。根级**没有** `useTouchGestures.ts`，根级对应物是 `src/hooks/useSwipeGestures.ts`（+ `useSwipeGestures.test.ts`）。该修复**当前对生产零影响** |
| `7zi-frontend/src/__tests__/xss-probe.test.ts` | ?? 未跟踪，含 `console.log` | **临时探针，不应入库**（与 §4.2 的孤儿修复配套） |

---

## 6. SSOT 收敛方案（分步骤、可执行）

### Phase 0 — 止血（立即，零写操作，仅靠流程）

1. **在 `AGENTS.md` / `HEARTBEAT.md` / 子代理任务模板中写死路径规则**：
   > 前端源码唯一位置 = 仓库根 `src/` + `tests/`。**禁止**在 `7zi-frontend/` 下修改任何文件；该目录为历史归档，任何“修复”必须落在根级。
2. 所有新的子代理任务书里，把「主改路径」显式写成 `src/**`（根级），并加一行断言 `test -f src/<file> || echo "路径不存在于发布树"`。
3. 复核 `DEV_TASKS_20261024_1023.md` 中 T92/T93/T94 的路径互斥约定——写的是 `src/hooks/**`、`tests/**`（根级，正确）；但实际改动却落在 `7zi-frontend/src/hooks/`，说明**路径约定未被执行**。建议在任务书里加一条可执行的 pre-flight 校验命令。

### Phase 1 — 冻结并归档嵌套树（1 步，低风险，建议本周做）

**目标**：让 `7zi-frontend/` 变成**纯冗余**，且不可能再被误改。

```
# 步骤 1：确认无独有内容需要保留（见 §2.4 B 类决策项）
git mv 7zi-frontend 7zi-frontend.legacy
# 或者更彻底：
git rm -r --cached 7zi-frontend && mv 7zi-frontend /mnt/backup/7zi-frontend-20261024
```

**推荐做法**：**先 `git mv 7zi-frontend 7zi-frontend.legacy`（保留在仓库内、Git 可回滚），而不是直接删。**

理由：
- `git mv` 是**可逆**的（`git mv 7zi-frontend.legacy 7zi-frontend` 即回滚），不丢历史，blob 仍在 git 里；
- 删除 5.6 GB 工作副本能显著缩小 clone 体积（`git rm` 后历史仍在，但工作区省 5.6 GB；`.next/standalone/7zi-frontend` 22 MB 是构建产物，与 git 无关）；
- 命名 `.legacy` 后缀让任何新子代理/脚本都**不可能误以为是发布树**。

**配套改动（与 Phase 1 同一个 commit）**：
| 文件 | 改动 |
|---|---|
| `eslint.config.mjs` | `'7zi-frontend/**'` → `'7zi-frontend*/**'`（或保留两条） |
| `.gitignore` | `7zi-frontend/browser/` → `7zi-frontend*/browser/`；`7zi-frontend/public/sw.js` → `7zi-frontend*/public/sw.js` |
| `audit-api-types.js` / `audit-api-types-v2.js` | `join(workspaceRoot,'7zi-frontend/src/app/api')` → `'src/app/api'`（这两个脚本当前指向归档树） |
| `scripts/archive/analyze-unused-exports.js` | `join(WORKSPACE_DIR,'7zi-frontend','src')` → `'src'` |
| `tests/**`（6 个文件、13 处 import） | 见 §7 风险条目 R7 |

**Phase 1 之后的收益**：
- 根级 lint/tsc/vitest **不会**再被嵌套树干扰（嵌套现在虽被 eslint ignore，但 tsconfig include `src/**` 是相对根的，不会扫嵌套——不过 `next build` 的 `COPY . .` 会把 5.6 GB 塞进 build context，`.dockerignore` 未排除 `7zi-frontend/`——**这是被忽略的构建上下文膨胀点**）

### Phase 2 — 差异化回迁（可选，需主管/主人拍板）

对 §2.4 B 类的 13 个「根级完全没有」的模块，逐个决定：

| 候选 | 是否建议回迁 | 理由 |
|---|---|---|
| `lib/automation/`（9） | **是（优先）** | 根级 `tests/automation/**` 4 个测试文件**正在 import 嵌套树**，删嵌套树会导致这些测试直接断链 |
| `components/WorkflowEditor/` | **是（优先）** | 同上，`tests/components/WorkflowEditor/AutoLayout.test.tsx` import 嵌套树 |
| `lib/evomap/`（7） | 待定 | 与「智能体世界专家」业务线相关，若该线仍在用则需回迁 |
| `lib/audio/`（19） | 待定 | 根级有 6 处 audio 相关文件但无 `lib/audio/` |
| `lib/reporting/`（16）、`lib/error-reporting/`（9） | 倾向否 | 根级已有 `src/lib/logger/`、`src/lib/audit-log/` 等更完整实现 |
| `features/`（79）、`shared/`（20）、`locales/`（14）、`core/`（4） | **否** | 2026-03-29 引入的中间态分层，根级从未采用，属废弃架构方向 |
| `hooks/` 独有 28 个 | **部分** | `useTouchGestures` 的未提交修复应改写为根级 `useSwipeGestures`；`useCollaboration`/`useWebhooks` 等视根级是否已有等价实现 |

### Phase 3 — 回迁失配修复（按价值排序，建议与 Phase 1 同批或紧随）

1. **P0｜把 `d2328ff110` 声称的安全修复真正做出来**，落在**根级**：
   - 用户枚举 oracle：改 `src/app/api/auth/login/route.ts`（当前 207 行，含真实 `loginUser`），让「用户不存在」与「密码错误」返回**完全相同**的 status + body + error code。
   - 时序侧信道：根级 `src/lib/auth/service.ts` / `repository.ts`（`src/lib/auth/` 有 21 文件）中，用户不存在时也做一次等价哈希比较。
   - XSS 净化层：根级**没有** `validation-schemas.ts`，需要新建 `src/lib/validation-schemas.ts`（含逐属性校验版 `sanitizeHtml`）或直接在 `src/lib/utils/validation.ts` 增加 `sanitizeHtml`。**注意**：这会引入根级目前不存在的模块，需评估是否引入 zod 依赖（根级已有 `src/lib/api/validation.ts` 用 zod，OK）。
   - 测试：把孤儿探针 `7zi-frontend/src/__tests__/xss-probe.test.ts` 的 11 条向量，改写为根级 `src/lib/__tests__/validation-schemas.test.ts`，去掉 `console.log`。
2. **P1｜回迁 §4.4 的 22 个「根级有等价路径」的失配改动**（逐文件 diff 后应用，不是覆盖）。
3. **P2｜`e475608a72` 的测试断言**：根级是子路由结构（login/register/...），不能照搬「501」模型；应改为「未实现认证时拒绝」或「响应一致性」断言，落在 `src/app/api/auth/login/__tests__/route.test.ts` 与 `src/app/api/auth/register/__tests__/route.test.ts`。

### 关于 symlink 方案（评估后**不推荐**）

主管提到的「改成 symlink」思路，审计结论是**不推荐**，理由：

1. **git 不跟踪 symlink 目标**——`git add` 只会存一个 blob 记录「这是符号链接」，目标路径不随仓库走。CI（GitHub Actions checkout）默认**不还原 symlink 指向的目录内容**，而是把 symlink 建成一个断链 → Next.js build 直接失败。
2. **Windows / Docker 构建上下文**对 symlink 处理不一致，`.dockerignore` + `COPY . .` 在跨平台场景下不可控。
3. **Next.js `outputFileTracing` / `tsconfig` / `eslint` / `vitest` 的路径解析**都基于物理路径，symlink 会引入 `realpath` 与 `logical path` 混杂，排查成本高。
4. 收益仅是「省一次 `mv`」，而 `git mv 7zi-frontend 7zi-frontend.legacy` 同样能达成「一眼可辨、不可误改」，且完全可逆、无 symlink 陷阱。

**若主管仍倾向 symlink**，最小可行形态是：
```
git rm -r --cached 7zi-frontend
ln -s . 7zi-frontend        # 指向仓库根
```
但**必须**同时：① 在 CI 里 `git config core.symlinks true`（Windows runner 需 `checkout` 时开 `symlinks: true`）；② 确认 `next build` 在 `7zi-frontend -> .` 自指环下不死循环。**风险显著高于 `git mv`，不建议在生产仓库使用。**

---

## 7. 移除 `7zi-frontend/` 的风险评估（逐条 grep 证据）

| # | 依赖点 | grep 证据 | 移除影响 | 判定 |
|---|---|---|---|---|
| **R1** | 根 `deploy.sh` rsync | `deploy.sh:396` `rsync -avz --delete --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'coverage' --exclude '*.log' --exclude '.env.local' … "$SCRIPT_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"` | **不排除 `7zi-frontend/`** → 整个嵌套树（当前 5.6 GB 工作区，含 `node_modules`、`.next`）会被 rsync 到 `/opt/7zi-frontend/`。移除嵌套树后**镜像体积大幅下降**；`--delete` 会清掉服务器上的旧嵌套副本 → **服务器端行为改变，需确认 `/opt/7zi-frontend/7zi-frontend/` 没有运行时依赖** | ⚠️ **中** — 移除前应确认生产容器不读该路径；移除后首次部署会删掉服务器上的嵌套副本 |
| **R2** | 根 `Dockerfile` | `Dockerfile:45` `COPY . .`；`Dockerfile:54` `RUN npm run build` | `.dockerignore` **未排除 `7zi-frontend/`** → 嵌套树进 build context，镜像变大。移除后 build context 变小、构建更快。**但** `Dockerfile:80-82` `COPY --from=builder /app/public`, `/app/.next/standalone`, `/app/.next/static` 不涉及嵌套树 | ✅ **低**（纯收益） |
| **R3** | `docker-compose.yml` | `docker-compose.yml:9-17` `7zi-frontend: build: context: . dockerfile: Dockerfile / image: 7zi-frontend:latest / container_name: 7zi-frontend` | 服务名/镜像名是 `7zi-frontend`（**项目名**，与目录名无关）。`context: .` = 仓库根。移除嵌套树不影响 | ✅ **无影响** |
| **R4** | `.github/workflows/ci.yml` | `ci.yml:578` `cd /opt/7zi-frontend`；`ci.yml:651` `cd /opt/7zi-frontend`；`ci.yml:657` `BACKUP_DIR="/opt/backups/7zi-frontend-…"`；`ci.yml:686` `ls -dt /opt/backups/7zi-frontend-*` | 全部是**服务器上的绝对路径** `/opt/7zi-frontend`，与仓库内目录名无关。仓库内 CI 步骤（`:200 npm run lint`、`:240 npm run type-check`、`:281 npm run test:run`、`:338 npm run build`）都从**仓库根**执行，root `package.json` 的 `test:run` → `vitest run`，`vitest.config.ts` include `src/**` + `tests/**` → **不覆盖嵌套树** | ✅ **无影响** |
| **R5** | `.github/workflows/tests.yml` | `tests.yml:47 npm run test:run -- --shard=…`；`:88 npm run build`；`:94 npm run test:e2e` | 全部从仓库根执行，同 R4 | ✅ **无影响** |
| **R6** | 其他 workflow | `.github/workflows/performance-audit.yml:202 "name": "7zi-frontend-standalone"`；`.github/workflows/security-scan.yml`、`version-check.yml`、`backend-ci.yml`、`preview.yml`、`v191-e2e-tests.yml` | `performance-audit.yml:202` 是 matrix 的**展示名**，非路径 | ✅ **无影响** |
| **R7** | ⚠️ **根级 `tests/` 反向 import 嵌套树** | `tests/integration/alert-system-edge-cases.test.ts:16,22,29,32` → `../7zi-frontend/src/lib/performance-monitoring/alerting/{alerter,types,channels}` + `../7zi-frontend/src/lib/logger`<br>`tests/automation/{default-templates,default-templates-edge-cases,automation-engine,automation-storage}.test.ts` → `../../7zi-frontend/src/lib/automation/{automation-engine,default-templates,automation-storage}`<br>`tests/components/WorkflowEditor/AutoLayout.test.tsx` → `../../../7zi-frontend/src/components/WorkflowEditor/{AutoLayout,types}` | **共 6 个测试文件、13 处 import**。其中 `performance-monitoring/alerting/*` **在嵌套树里也已不存在**（实际路径是 `7zi-frontend/src/lib/performance/alerting/`）→ **这些测试目前就是断链的**（应为存量失败源之一）。其余 5 个文件指向**确实存在**的嵌套文件 → **移除嵌套树会让这 5 个测试立即编译失败** | 🔴 **高** — **移除前必须先把它们改指向根级**（或按 Phase 2 回迁被测源码到根级） |
| **R8** | `eslint.config.mjs` | `:48-50` `'7zi-frontend/html/**'`, `'7zi-frontend/.next/**'`, `'7zi-frontend/out/**'`；`:74` `'7zi-frontend/**'` | 移除目录后这些 ignore 规则变成空规则，无害（eslint 不会报错）。若改名为 `.legacy`，需同步更新为 `'7zi-frontend*/**'`，否则**归档树会被根级 lint 扫进去**（可能产生大量新 lint 错误，拖慢 CI） | ⚠️ **中** — 改名方案必须同步改 eslint ignore |
| **R9** | `.gitignore` | `:102` `7zi-frontend/browser/`；`:134` `7zi-frontend/public/sw.js` | 这两条**只会**匹配嵌套树下的路径。磁盘实况：`7zi-frontend/browser/`（空目录，只有 `default-stylesheet.css`）、`7zi-frontend/public/sw.js`（25638 字节，5 月 9 日）。**根级已有 `public/sw.js`（10694 字节，4 月 11 日）**。若改名为 `.legacy`，需同步改 `.gitignore`；若直接删除，这两条 ignore 变成空规则 | ⚠️ **低** — 仅需在改名方案下同步 |
| **R10** | `scripts/` | `scripts/archive/analyze-unused-exports.js:15` `path.join(WORKSPACE_DIR,'7zi-frontend','src')` → 指向嵌套树<br>`scripts/analyze-coverage.sh:3`（仅 echo 标题）<br>`scripts/cleanup-disk.sh:250` `"/opt/7zi-frontend/logs"`（服务器路径）<br>`scripts/docker-healthcheck.sh:3`（仅注释） | `analyze-unused-exports.js` 是**归档工具**，指向嵌套树 → 移除后会扫空目录（无害）或报错（需确认）。另两个是服务器路径/注释 | ⚠️ **低** — 建议一并改指根级 `src` |
| **R11** | 仓库根工具脚本 | `audit-api-types.js:21` `join(workspaceRoot,'7zi-frontend/src/app/api')`；`audit-api-types-v2.js:17,18` `'7zi-frontend/src/app/api'`、`'7zi-frontend/src/types'` | 这两个审计脚本**当前就在扫非发布树** → 它们产出的「API 类型一致性」报告全部是**无效数据** | ⚠️ **低**（但**误导性高**）— 应改指根级 |
| **R12** | `ecosystem.config.production.js` | `:34` `error_file: '/var/log/7zi-frontend/error.log'`；`:35` `out_file: '/var/log/7zi-frontend/out.log'` | 服务器日志路径，与仓库目录无关 | ✅ **无影响** |
| **R13** | 嵌套自带 CI / deploy | `7zi-frontend/.github/workflows/`（12 个 yml）、`7zi-frontend/deploy.sh`、`7zi-frontend/Dockerfile`、`7zi-frontend/next.config.ts`（+2 个 .backup） | 这些是**嵌套副本自己的**历史 CI 定义，**GitHub Actions 只读仓库根 `.github/workflows/`**，嵌套下的 workflow 永远不会被执行（GitHub 不支持嵌套 workflow 目录）。移除即删除死配置 | ✅ **低**（纯收益） |
| **R14** | 嵌套 `.env.production` / `.auth/` | `git ls-files` 显示 `7zi-frontend/.env.production`、`7zi-frontend/.auth/admin.json`、`7zi-frontend/.auth/user.json` **均被 git 跟踪** | ⚠️ **潜在凭据泄露面**（`f2f81e7588`「全仓清除明文密码残留」显然没覆盖到这两处）。根级也跟踪了 `.env.production`。**移除嵌套树可顺带消除 3 个跟踪文件的泄露面** —— 建议移除前先跑一次 secret 扫描 | ⚠️ **中（安全）** |
| **R15** | 根 `src/` 反向依赖 | `grep -rn "7zi-frontend/" src/` → 仅命中 `User-Agent: '7zi-frontend/1.0'` 字符串（5 处），**无 import 依赖** | 根级源码树**完全自洽**，不 import 嵌套树 | ✅ **无影响** |
| **R16** | `next.config.ts` | `:127 experimental: {…}`，**无 `outputFileTracingRoot`** | Next.js 默认 `outputFileTracingRoot` = 项目根 = 仓库根。构建产物 `.next/standalone/7zi-frontend/`（22 MB）是**因为 `COPY . .` 把整个嵌套树带进了 build context**，不是 trace 出来的依赖。移除嵌套树后该目录自然消失 | ✅ **低**（纯收益） |
| **R17** | `tsconfig.json` | `:include` 为 `src/**/*.ts(x)`（相对根），`:exclude` 无嵌套项 | 根 tsc **不覆盖嵌套树**；但嵌套树有自己的 `tsconfig`，若被删除则其代码不再有任何类型检查 | ✅ **无影响**（发布树不受影响） |
| **R18** | `vitest.config.ts` | `:38-42 include: ['src/**/*.{test,spec}…', 'app/**/*…', 'tests/**/*…']`；`:75-81 exclude` 无 `7zi-frontend` | 根 vitest **不跑嵌套树**；嵌套树的 224 个「嵌套独有」测试文件**从未在根 CI 中执行** | ✅ **无影响**（但这些测试的覆盖价值本来就在嵌套树里，移除即永久消失 → 见 Phase 2） |

### 风险汇总

| 级别 | 条目 | 说明 |
|---|---|---|
| 🔴 高 | **R7** | 5 个根级测试文件 import 嵌套树，移除会编译失败 → **必须先改指根级** |
| ⚠️ 中 | R1（rsync `--delete` 首次会清服务器旧副本）、R8（eslint ignore 需同步）、R9（.gitignore 需同步）、R14（跟踪的 .env.production/.auth 凭据面）、R11（审计脚本数据源错误） | 改名方案下必须同步处理 |
| ✅ 低/无 | R2, R3, R4, R5, R6, R10, R12, R13, R15, R16, R17, R18 | 移除为**净收益**（瘦 build context、瘦 rsync 负载、瘦 clone 体积、消除死配置） |

---

## 8. 结论

**结论：Partial**

- ✅ **审计方法**：完整、可复现（全部基于 `git ls-files` + `git show | cmp`）。
- ✅ **两树对照表**：已完成（模块级 + 总量 + 3 个分叉维度）。
- ✅ **分叉点清单**：116 个同名分叉文件，已按模块分组，完整清单在 `/tmp/div.txt`。
- ✅ **失配 commit 清单**：35 个触碰嵌套树的 commit 全列出；其中 **d2328ff110 零源码改动（声称 3 处安全修复全部未落盘）**、**e475608a72 改到非发布树** 为最高优先级；另给出 22 个可直接回迁的等价路径。
- ✅ **SSOT 收敛方案**：Phase 0 止血 / Phase 1 `git mv` 归档 / Phase 2 差异化回迁 / Phase 3 回迁失配修复；symlink 方案评估为不推荐并给出理由。
- ✅ **移除风险评估**：18 条逐条 grep 证据，标注 R1–R18。
- ⚠️ **Partial 的原因**：Phase 2 的「13 个根级缺失模块是否回迁」需要产品/业务判断（`evomap`/`audio`/`automation` 是否仍在用），属主人/主管决策项；本报告已列出建议但未代为决定。Phase 1/3 属写操作，超出本任务「只读 + 仅写报告」的授权范围。

**给主管的三条立即可执行建议**：
1. **立刻在下一轮子代理任务书里写死路径前缀**（`src/` 而非 `7zi-frontend/src/`），并加 pre-flight 断言 —— 这能立刻止血，且零成本。
2. **把 `d2328ff110` 打回重做**，落到根级 `src/app/api/auth/login/route.ts`（用户枚举 + 时序）—— 这是当前唯一确认的安全债。
3. **移除前先修 R7**（6 个测试文件的 import 指向），再执行 `git mv 7zi-frontend 7zi-frontend.legacy` + 同步 eslint/.gitignore/脚本路径。

---

## 附录 A：本次审计生成的中间产物（未入库，仅供复核）

| 文件 | 内容 |
|---|---|
| `/tmp/root_src.txt` | 根级 `src/` 归一化文件清单（1883 行） |
| `/tmp/nest_src.txt` | 嵌套 `src/` 归一化文件清单（982 行） |
| `/tmp/common.txt` | 同名文件清单（121 行） |
| `/tmp/div.txt` | **内容分叉的 116 个文件完整清单** |

## 附录 B：关键复核命令（任何人均可重跑）

```bash
# 1) 事实源确认
grep -n "rsync -avz --delete" -A10 deploy.sh
grep -n "COPY \. \." Dockerfile

# 2) 分叉计数
git ls-files src | sed 's|^src/||' | sort > /tmp/r.txt
git ls-files 7zi-frontend/src | sed 's|^7zi-frontend/src/||' | sort > /tmp/n.txt
comm -12 /tmp/r.txt /tmp/n.txt | while read f; do
  git show HEAD:src/$f | cmp -s - <(git show HEAD:7zi-frontend/src/$f) || echo DIFF $f
done | wc -l     # → 116

# 3) d2328ff110 零源码改动
git show --numstat d2328ff110 | grep -E "^(src|7zi-frontend)"   # → 空

# 4) R7 断链测试
grep -rn "7zi-frontend/src" tests/ | wc -l                       # → 13
```
