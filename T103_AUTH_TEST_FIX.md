# T103 — 修复 `src/lib/auth/` 的 11 条历史遗留测试失败

- **执行人**：🧪 测试员子代理
- **时间**：2026-10-24 20:22 – 20:33 (Asia/Shanghai)
- **范围**：仅 `src/lib/auth/**`（未触碰 `src/lib/security/**`、`src/app/**`、`7zi-frontend/**`、`state/**`、根 `vitest.config.ts`）
- **结论**：**Yes**（11 条全绿，115/115 通过；tsc 干净；eslint 0 error）

---

## 1. 基线 vs 结果

| | Test Files | Tests |
|---|---|---|
| 改动前（主管 20:15 基线） | 3 failed / 5 passed (8) | **11 failed / 104 passed (115)** |
| 改动后 | **8 passed (8)** | **0 failed / 115 passed (115)** |

连续两次运行结果一致（无 flaky）。

---

## 2. 逐条根因表（11 条）

真正的根因有两个层次：
- **(A) 测试基础设施（隔离/替身）问题**：全局测试替身 `src/test/vi-mocks.ts` 把 `src/lib/db` 换成了一个**手写简化 SQL 执行器**，它只认 `WHERE workflow_id = ?` 一种条件，**不实现通用 `WHERE`、`IN (...)`、字面量 `OFFSET`**。于是所有过滤条件被静默忽略，`queryAuditLogs`/`getEntityPermissions`/`isTokenBlacklisted` 等一律返回**全表数据**——这就是 11 条失败的共同根源。
- **(B) 生产代码真 bug**：真实 SQLite 下暴露出 **3 处非法 DDL**（`CREATE TABLE` 内联 `INDEX ...` 不是合法 SQLite 语法），生产运行时会直接抛 `SqliteError`，此前被替身掩盖。

| # | 文件 | 用例 | 真实根因 | 分类 | 处理 |
|---|---|---|---|---|---|
| 1 | `audit-logger.test.ts` | `queryAuditLogs > should query logs by user ID` | 替身忽略 `WHERE user_id = ?`，返回全表 → `every(l => l.userId === testUserId)` 失败 | **隔离问题** | 测试文件改用 per-file 真实内存 SQLite + `beforeEach` 清表 |
| 2 | 同上 | `... by agent ID` | 同上（`WHERE agent_id = ?` 被忽略） | **隔离问题** | 同上 |
| 3 | 同上 | `... by event type` | 同上（`WHERE event_type IN (...)` 被忽略，替身只支持 `IN` 单参数形态） | **隔离问题** | 同上 |
| 4 | 同上 | `... by result` | 同上（`WHERE result = ?` 被忽略） | **隔离问题** | 同上 |
| 5 | 同上 | `... should support pagination` | 替身只认 `OFFSET ?`（参数化），生产用**字面量** `OFFSET 2` → offset 被忽略，两页返回同一批数据，`logs1[0].id === logs2[0].id` | **隔离问题**（+ 生产侧补确定性排序） | 同上；生产 `ORDER BY timestamp DESC` → `ORDER BY timestamp DESC, rowid DESC`（分页确定性） |
| 6 | `enhanced-permissions.test.ts` | `getEntityPermissions > should exclude expired permissions` | 替身忽略 `WHERE (expires_at IS NULL OR expires_at > ?)` → 过期权限仍返回；且该用例依赖“本文件内不残留上一用例的 REPORT 权限” | **隔离问题** | per-file 真实 SQLite + `beforeEach` `DELETE FROM resource_permissions` |
| 7 | 同上 | `checkPermission > should check resource-specific permissions` | 断言本身与**同文件夹具自相矛盾**：`checkPermission` 的 `beforeEach` 同时授予了**无 resourceId 的 `PROJECT` + `MANAGE`**，按生产契约（`!perm.resourceId || perm.resourceId === params.resourceId`，`MANAGE` 覆盖全部 action）该授权本就允许访问 `project_456`；期望 `result2.allowed === false` 与生产契约不可兼得 | **测试夹具过时（断言与真实契约冲突）** | 把 `PROJECT/MANAGE` 授权从 `beforeEach` 移入真正需要它的 `should allow MANAGE permission for all actions` 用例内部；**断言强度不变**（`result1.allowed === true` / `result2.allowed === false`），未删/未弱化任何断言 |
| 8 | `token-blacklist.test.ts` | `blacklistToken > should handle different blacklist reasons` | 替身忽略 `WHERE token_hash = ?`（`existingStmt.get()` 恒命中首行）→ 第 2 个 token 就抛 `Token is already blacklisted` | **隔离问题** | per-file 真实 SQLite |
| 9 | 同上 | `isTokenBlacklisted > should return false for expired blacklist entry` | 替身忽略 `WHERE token_hash = ? AND expires_at > ?` → 过期条目仍返回 true | **隔离问题**（生产逻辑本身正确：`expires_at > now` 过滤生效） | 同上 |
| 10 | 同上 | `getUserBlacklistedTokens > should return all blacklisted tokens for a user` | 替身忽略 `WHERE user_id = ? AND expires_at > ?` | **隔离问题** | 同上 |
| 11 | 同上 | `getBlacklistStats > should return blacklist statistics` | `COUNT(*)`/`GROUP BY` 在替身里返回空/错值 | **隔离问题** | 同上 |

**分类汇总**：隔离/替身问题 **10 条**；测试夹具与真实契约冲突（断言过时）**1 条**；其中**真实生产 bug 0 条出现在测试断言层**，但修复过程中**发现并修复了 2 类生产缺陷（见 §4）**。

> 说明：任务给出的“已知根因方向”中第 2 条（logger mock 断言形状过时）与第 3 条（过期用例依赖真实时间/时区）**经核实均不成立**——11 条失败里没有任何一条是 logger 断言形状问题；过期相关用例（#6/#9）失败的真实原因是替身不执行 `expires_at` 过滤，而不是时间/时区。

---

## 3. 发现并修复的生产缺陷（真实 bug，此前被测试替身掩盖）

1. **非法 SQLite DDL（3 个文件）** — `CREATE TABLE` 内部内联 `INDEX idx_x (col)` 是 MySQL 风格语法，SQLite 会直接抛 `SqliteError: near "INDEX": syntax error`。在真实 `better-sqlite3` 下 `initializeAuditLogTable()` / `initializeBlacklistTable()` / `initializePermissionTables()` **每次都会失败**（即这三个初始化函数在生产上根本不可用）。已改为独立的 `CREATE INDEX IF NOT EXISTS ...` 语句（与 `src/lib/auth/repository.ts` 既有写法一致）：
   - `src/lib/auth/audit-logger.ts`（5 个索引）
   - `src/lib/auth/token-blacklist.ts`（3 个索引）
   - `src/lib/auth/enhanced-permissions.ts`（6 个索引，2 张表）
2. **审计日志分页排序不确定** — `queryAuditLogs` 仅 `ORDER BY timestamp DESC`，而 `timestamp` 精度为毫秒，同批写入会并列，跨页结果不可复现。已补 `rowid DESC` 作为次级排序键。

其余生产代码经逐行核对**未发现缺陷**：过期权限排除（`expires_at IS NULL OR expires_at > ?`）、过期黑名单排除（`expires_at > ?`）、resourceId 作用域判断（`!perm.resourceId || perm.resourceId === params.resourceId`）均与测试期望一致。

---

## 4. 改动文件列表

| 文件 | +/- | 说明 |
|---|---|---|
| `src/lib/auth/__tests__/helpers/auth-test-db.ts` | **+113 / -0**（新增） | per-test-file 真实内存 SQLite 替身（`better-sqlite3`），实现 `DatabaseConnection` 契约（`prepare/exec/query/get/batch/transaction`） |
| `src/lib/auth/__tests__/audit-logger.test.ts` | +14 / -1 | 引入真实 DB 替身 + `beforeEach` 清表（`DELETE FROM auth_audit_log`） |
| `src/lib/auth/__tests__/token-blacklist.test.ts` | +10 / -1 | 引入真实 DB 替身（原用例已有 per-test 清理） |
| `src/lib/auth/__tests__/enhanced-permissions.test.ts` | +25 / -8 | 引入真实 DB 替身 + `beforeEach` 清表；修正 `checkPermission` 夹具冲突（`PROJECT/MANAGE` 授权下沉到具体用例） |
| `src/lib/auth/audit-logger.ts` | +12 / -7 | **生产修复**：拆出 `CREATE INDEX IF NOT EXISTS`；`ORDER BY timestamp DESC, rowid DESC` |
| `src/lib/auth/token-blacklist.ts` | +9 / -4 | **生产修复**：拆出 `CREATE INDEX IF NOT EXISTS` |
| `src/lib/auth/enhanced-permissions.ts` | +16 / -8 | **生产修复**：拆出 `CREATE INDEX IF NOT EXISTS`（2 张表 6 个索引） |

> 未改 `vitest.config.ts`；未删除/skip/弱化任何用例；未新增依赖（`better-sqlite3` 已是项目既有依赖）；未执行 `git add/commit/push`。

---

## 5. 验证命令与真实输出摘要

```
$ npx vitest run src/lib/auth/__tests__ --reporter=dot
 Test Files  8 passed (8)
      Tests  115 passed (115)
   Duration  11.09s
```
（连续两次运行均为 8 passed / 115 passed，无 flaky）

```
$ npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/lib/auth"
（无输出 → src/lib/auth 类型检查干净）
```

```
$ npx eslint src/lib/auth 2>&1 | tail -20
✖ 46 problems (0 errors, 46 warnings)
（0 error；warning 全部为改动前既有的 no-unused-vars / no-require-imports / import 默认导出等存量告警）
```

回归抽查（使用 token-blacklist 的下游用例）：
```
$ npx vitest run src/app/api/auth/token/__tests__/route.test.ts --reporter=dot
 Test Files  1 passed (1)
      Tests  15 passed (15)
```

---

## 6. 隔离方案说明

- 新增 `helpers/auth-test-db.ts`：用 `better-sqlite3` 打开 **`:memory:`** 数据库，实现与 `src/lib/db/connection.ts` 相同的 `DatabaseConnection` 接口。
- 三个测试文件各自通过 `vi.mock('@/lib/db/index', ...)` **文件级**替换 db 模块：每个测试文件一个独立库实例 → **跨文件零污染**；文件内再通过 `beforeEach` 清表 → **跨用例零污染**。
- 未修改全局 `src/test/vi-mocks.ts`（不在授权范围内），因此其他模块的测试行为完全不受影响。
- `login-timing.test.ts`（T99 新增）经检查**不存在互相干扰**：它只 mock `../repository` 的 `getUserByEmail` 与 `../password`，不触碰 db 替身；本次新增的文件级 db 替身也只作用于那 3 个文件。复跑 8 文件 115/115 全绿，确认无污染。

---

## 7. 遗留问题 / 建议

1. **全局测试替身 `src/test/vi-mocks.ts` 的 SQL 执行器能力不足**（不支持通用 `WHERE`/`IN`/字面量 `OFFSET`），会让其它模块产生同类“假绿/假红”。本次未越界修改，建议后续单独立项：要么换成真实 SQLite 内存库，要么补齐 SQL 解析能力。
2. `src/lib/auth/enhanced-permissions.ts` 中 `checkPermission` 有未使用的 `db` 变量（eslint warning，改动前既有），可顺手清理。
3. `token-blacklist.ts` 仍使用 `require('crypto')`（eslint warning，改动前既有），可改为 ESM import。

---

## 8. 结论

**Yes** —— 11 条历史遗留失败全部修复，`src/lib/auth` 115/115 全绿（≥115 要求满足），tsc 对 `src/lib/auth` 无报错，eslint 0 error；过程中发现并修复了 3 个文件的非法 SQLite DDL（真实生产缺陷）与 1 处审计日志分页排序不确定性；未弱化/删除任何断言，未越界修改受限目录。
