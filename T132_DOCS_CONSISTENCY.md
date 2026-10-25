# T132 — API.md 错误响应口径统一（error.code → error.type）+ CHANGELOG 补记

> 执行者：📚 咨询师 子代理
> 时间：2026-10-25 10:26–10:40 (Asia/Shanghai)
> 工作目录：`/root/.openclaw/workspace`
> 硬约束遵守：仅改动 `API.md` 与 `CHANGELOG.md`（`README.md` 经核对**无需改动**）；
> 未 `git add` / `git commit` / `git push`；未改动任何 `.ts` 源码（实现全程只读）；
> 未删除任何既有章节，只做精确替换；未写入任何真实凭据原文。

---

## 0. 结论速览

**结论：Yes**（任务 A 与任务 B 均完成；发现 1 处「实现本身两套口径并存」，已按实现原样保留并就地标注，未擅自改实现）

| 任务 | 状态 | 说明 |
|---|---|---|
| A1. 确认实现字段真名 | ✅ | 标准错误响应体字段为 **`error.type`**；但仓库内**另有 13 个路由文件手写 `error.code`**（详见 §1.3） |
| A2. `API.md` 口径统一 | ✅ | 「Common Error Responses」5 个示例 `error.code` → `error.type`；新增字段口径说明块 |
| A3. grep 自检 | ✅ | `error.code` 剩余 7 处**全部是有意保留**的口径说明行（详见 §2.3） |
| A4. `README.md` 核对 | ✅ | README **无任何错误响应示例**（0 个 json 代码块、0 处 `error.code`）→ **无需改动，未改动** |
| B. CHANGELOG 补记 | ✅ | 顶部新增「[未发布] / 2026-10-21 ~ 2026-10-25（T119–T131 补记，由 T132 同步）」段落，**+112 行 / 0 删除** |

---

## 1. 实现字段真名的确认过程与结论

### 1.1 grep 证据（实现侧）

```bash
$ grep -rn "error\.type\|error\.code" src/lib/errors.ts src/lib/error/ src/lib/api/error-handler.ts src/lib/errors/
src/lib/api/error-handler.ts:152:    const errorData = await buildErrorResponse(
src/lib/api/error-handler.ts:153:      error.type,          # ← ApiError 实例字段是 .type
src/lib/api/error-handler.ts:170:    ErrorType.INTERNAL,
src/lib/api/error-types.ts:  (ErrorType 枚举：VALIDATION_ERROR / UNAUTHORIZED / NOT_FOUND / FORBIDDEN / CONFLICT / RATE_LIMIT / INTERNAL_ERROR ...)
```

关键实现（`src/lib/api/error-handler.ts`）：

```ts
export async function createErrorResponse(error, statusCode?, details?, locale='zh', requestId?) {
  if (error instanceof ApiError) {
    const errorData = await buildErrorResponse(
      error.type,              // ← 分类字段取自 error.type
      error.message,
      error.statusCode,
      error.details,
      locale,
      requestId
    )
    return errorResponseToNextResponse(errorData, error.statusCode)
  }
  ...
}
```

**结论（标准路径）**：走统一错误处理器的接口，错误响应体的分类字段是 **`error.type`**，
取值域为 `src/lib/api/error-types.ts` 的 `ErrorType` 枚举
（`VALIDATION_ERROR` / `UNAUTHORIZED` / `NOT_FOUND` / `FORBIDDEN` / `CONFLICT` /
`RATE_LIMIT` / `INTERNAL_ERROR` 等）。

`error.code` 在实现里**不是**标准路径的字段名。

### 1.2 「两者关系」——标准路径下不存在 `error.code`，但仓库里有「手写响应体」的第二套口径

```bash
$ python3 - <<'EOF'   # 扫描 src/app/api 下所有非测试 route
import re,os
hits=[]
for root,d,files in os.walk('src/app/api'):
    for f in files:
        if f.endswith('.ts') and not f.endswith('.test.ts'):
            s=open(os.path.join(root,f),encoding='utf-8',errors='ignore').read()
            if re.search(r"error:\s*\{[^}]*code:", s, re.S):
                hits.append(os.path.join(root,f))
print(len(hits))
EOF
13
src/app/api/v1/tenants/route.ts
src/app/api/v1/tenants/transfer/route.ts
src/app/api/v1/tenants/invite/route.ts
src/app/api/v1/tenants/login/route.ts
src/app/api/v1/tenants/switch/route.ts
src/app/api/v1/tenants/accept/route.ts
src/app/api/performance/clear/route.ts
src/app/api/a2a/jsonrpc/route.ts
src/app/api/rbac/system/route.ts
src/app/api/rbac/roles/[roleId]/route.ts
src/app/api/rbac/roles/[roleId]/permissions/route.ts
src/app/api/rbac/users/[userId]/permissions/route.ts
src/app/api/rbac/users/[userId]/roles/route.ts
```

典型证据（`src/app/api/rbac/roles/[roleId]/route.ts` L38-47）：

```ts
if (!role) {
  return NextResponse.json(
    { success: false, error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' } },
    { status: 404 }
  )
}
```

> 注：`src/app/api/a2a/jsonrpc/route.ts` 命中的是 **JSON-RPC 2.0 协议自身的数值 `error.code`**
> （`-32600` / `-32601` / `-32603`），那是**协议标准字段**，与本任务的口径无关，**不修改**。

按路由族统计调用方式：

| 路由族 | 错误字段 | 说明 |
|---|---|---|
| `src/app/api/rbac/roles/route.ts`、`src/app/api/rbac/permissions/route.ts` | `error.type` | 走 `createErrorResponse` / `createValidationError` |
| `src/app/api/rbac/{system,roles/[roleId],roles/[roleId]/permissions,users/[userId]/permissions,users/[userId]/roles}/route.ts` | `error.code` | 手写 `NextResponse.json` |
| `src/app/api/v1/tenants/**`、`src/app/api/performance/clear/route.ts` | `error.code` | 手写 `NextResponse.json` |
| 走 `src/lib/api/error-handler.ts` 的其余 61 个引用文件 | `error.type` | 标准路径 |

**结论**：`error.type` 是**实现的主口径**；`error.code` 仅残留在**手写响应体**的少数路由上。
本任务**只改文档**，故对这些路由**按其实际返回保留 `error.code`**，并就地加注说明。

### 1.3 其它实现侧佐证

- `docs/api-optimization-final-report.md` 早已确立口径：
  `**Error Response Property Name Change:** - Before: error.code - After: error.type`，
  且成功标准里写明 `All API routes use error.type (not error.code)` —— **文档口径的历史依据成立**。
- `docs/API-UPDATES-NEEDED.md:59` 早已挂着待办 `Replace all error.code with error.type` —— 本次结清其中 `API.md` 部分。

---

## 2. 改动文件列表

### 2.1 `API.md`（+24 / −9）

| 位置 | 改动 |
|---|---|
| L2438–2444 | 「RBAC Error Responses」小节**新增**字段口径提示块（说明该路由族两种实现并存，建议 `error.type ?? error.code` 兜底） |
| L3200–3205 | 「Common Error Responses」小节**新增**字段口径说明块（`error.type` + `ErrorType` 枚举来源 + 历史更名说明 + 手写路由例外提示） |
| L3213 / L3230 / L3242 / L3254 / L3267 | 「Common Error Responses」5 个示例的 `"code"` → `"type"`（400 / 401 / 404 / 429 / 500） |
| L3633–3636 | analytics 小节尾注改写：原「两者不一致 / 不在 T121 范围内」→ 改为「已于 2026-10-25（T132）全局更名」 |

**未改动（有意保留）**：

- L950 / L966 / L979 —— JSON-RPC 2.0 协议的数值错误码 `"code": -32600 / -32601 / -32603`（协议标准字段）
- L2452–2524 —— RBAC 小节 7 个示例的 `"code"`（**与手写路由实际返回一致**，按硬约束 3 不擅自改实现口径）
- 全文业务数据里的 `code` 字段（`"type": "code_review"` 等属 `type` 字段，未动）

### 2.2 `README.md` —— **未改动（0 行）**

核对结论：

```bash
$ grep -c 'error\.code' README.md   → 0
$ grep -c '"error"'  README.md       → 0
$ grep -c '```json'  README.md       → 0
$ grep -n -i '错误响应|error response|失败响应' README.md → 无输出
```

README 全文**没有 JSON 响应示例代码块**，也没有任何 `error.code` / 错误响应体字段引用，
仅有 `TypeScript 错误`、`error-reporting`、`0 errors` 等与本任务无关的措辞。
按「README 改动请控制在错误响应示例范围内」的口径 —— **示例不存在 → 无需改动**，故保持 0 字节 diff。

### 2.3 `CHANGELOG.md`（+112 / −0）

顶部新增段落：`## [未发布] / 2026-10-21 ~ 2026-10-25（T119–T131 补记，由 T132 同步）`，
完全**新增**、未删除任何既有内容，风格对齐既有段落（`> 本段落由 **Txxx（📚 咨询师）** 补记` +
`### 📌 … 速览` 表 + `### 🐛 Fixed / ### 🧪 Added / ### 🔧 Changed / ### 📝 Docs / ### ⚠️ 本轮遗留`）。

### 2.4 grep 计数对比（改动前后）

| 文件 | 指标 | 改动前 | 改动后 |
|---|---|---|---|
| `API.md` | `grep -c "error\.code"` | **2** | **7**（全部为有意保留的口径说明行，见下） |
| `API.md` | `grep -c "error\.type"` | **2** | **6** |
| `README.md` | `grep -c "error\.code"` | **0** | **0**（未改动） |
| `README.md` | `grep -c "error\.type"` | **0** | **0**（未改动） |

> `API.md` 中 `error.code` 计数**上升**是预期结果 —— 改动前只有 2 处「顺带提到」，
> 改动后新增了 5 行**显式的口径说明**（历史更名 + 手写路由例外）。
> **示例层面**的 `error.code` → `error.type` 替换为 5 处（Common Error Responses 的 5 个 json 示例），
> 由 `git diff` 逐行核对确认。

改动后 `grep -n "error\.code" API.md` 的全部 7 行（**均为有意保留**）：

```
2442:> 直接手写 `NextResponse.json({ success: false, error: { code: ... } })`，返回体字段是 **`error.code`**。
2443:> 下表示例按**手写路由的实际返回**给出（`error.code`）；接入方请同时兼容两种字段名，
2444:> 或以 `error.type ?? error.code` 兜底读取。统一该路由族属**实现侧**改造，不在本次文档口径统一范围内。
3203:> 早期文档示例写作 `error.code`，现已全局更名为 `error.type`。
3204:> ⚠️ 少数**手写 `NextResponse.json` 的路由**（如 RBAC 路由族、v1/tenants 系）仍返回 `error.code`，
3634:> 早期文档曾写作 `error.code`，**已于 2026-10-25（T132）全局更名为 `error.type`**；
3636:> 仍按实际返回保留 `error.code`（该节已就地标注两种实现并存的情况）。
```

### 2.5 `git diff --stat` 与误改自查

```
$ git diff --stat API.md README.md CHANGELOG.md
 API.md       | 33 +++++++++++++-----
 CHANGELOG.md | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 136 insertions(+), 9 deletions(-)
```

（`README.md` 未出现在 diff 中，符合预期。）

`git diff API.md | head -100` 自查结论：
新增段落全部为 `>` 引用块（口径说明），删除行 **9 行**全部是 `"code":` → `"type":` 的**单行精确替换**
（5 处 Common Error Responses 示例），**无章节删除、无内容丢失**。

---

## 3. CHANGELOG 补记了哪些条目

新增段落标题：**`## [未发布] / 2026-10-21 ~ 2026-10-25（T119–T131 补记，由 T132 同步）`**

### 3.1 条目标题清单

**📌 速览表**：T121 / T122 / T123 / T124 / T125–T129 / T130 / T131 / T132 共 8 行。

**🐛 Fixed**
1. analytics metrics / export 端点非法 body 由 500 收敛为 400（`ab39579a6f`、`8967d2bc5d`）
2. 全局 db 测试替身 5 处失真修复（`dd4ed233e9`）
3. claw-mesh-sync 反复冲掉本机 HEARTBEAT.md 的根因修复（T119）
4. workflow 测试文件 6 处 TS2538 类型错误清零（T130）
5. jose 测试替身失真 + logger 丢弃错误对象修复（`b6cfb405ab`）
6. tasks API 路由测试收集失败与过时断言修复（`d401c0588f`）

**🧪 Added**
1. workflow API 测试补齐 48 个用例（T123，8 个路由）
2. `src/lib/security/` 三模块单元测试（T100，123 用例）
3. 后端 CI 盲区补齐（T112，websocket-service / workflow-service 两个 job）

**🔧 Changed**
1. `API.md` 错误响应字段口径全局统一：`error.code` → `error.type`（T132）
2. `ExportFormat` 类型收窄为 `'csv' | 'xlsx' | 'json'`（T122）
3. `docs/api-optimization-final-report.md` 早已确立的 `error.type` 口径（早前批次）

**📝 Docs**
1. `API.md` 新增 analytics 两端点小节（T121，`3dcac4461a`）
2. `API.md` 清理 T120 落地后的 400 契约在途标注（`3dcac4461a`）
3. T121 遗留项 L2 结清（`API.md` 全局 `error.code` → `error.type`）
4. HEARTBEAT.md 恢复被误删 157 行 + CHANGELOG 补记 T103–T112（T115，`9295d821df`）
5. 部署脚本健康检查误判修复（T90）

**⚠️ 本轮遗留**（4 条）：RBAC/v1-tenants 路由族两套错误字段并存、T131 无报告、
T123 暴露的 D1–D9 未修、T125–T129 无产物。

### 3.2 素材核对说明

素材均**自行 grep 核对**后方才落笔，未照抄派单原文：

- `T119` —— 核对 `T119_CLAWMESH_HEARTBEAT_FIX.md`（cron `30 */4 * * *`、无条件覆盖、行数判定修复、
  253 → 486 行、日志 `00:30:43` / `04:30:23` 实证）。
- `T120` —— 核对 `git show --stat ab39579a6f / 8967d2bc5d` 与 `T121_DOCS_SYNC.md`、`T122_ANALYTICS_RECONCILE.md`。
- `T121` / `T115` —— 核对各自报告 md 与提交 `3dcac4461a` / `9295d821df`。
- `T122` —— 核对 `T122_ANALYTICS_RECONCILE.md`（SQL 形状替身 `COUNT(*)` → `COUNT(DISTINCT DATE(created_at))`、
  `ExportFormat` 收窄、10 组边界测试、结论 Yes）。
- `T123` —— 核对 `T123_WORKFLOW_API_TESTS.md`（8 路由 / 48 用例全绿、D1–D9、结论 Partial、既存失败基线 4 条）。
- `T90` / `T100` / `T112` —— 核对 `T90_DEPLOY_HEALTHCHECK_FIX.md`、`T100_SECURITY_TESTS.md`、
  `T112_CI_GATE.md`（结论 Partial 及 `Backend CI` 仍红的原因），并与 CHANGELOG 既有 T87–T110 段落比对避免重复。
- 额外补入派单未提及但确实未在 CHANGELOG 体现的提交：`dd4ed233e9`（db 替身 5 处失真）、
  `b6cfb405ab`（jose 替身 + logger）、`20ad5150bb`（T120 教训入库）、`4fd954afbe`。
  核对方式：`for sha in $(git log --oneline -40 --format=%h); do grep -c $sha CHANGELOG.md; done` → 找出计数为 0 的提交。

---

## 4. 遗留问题（文档与实现不符但本次**未改**的地方）

| # | 遗留 | 证据 | 为何未改 |
|---|---|---|---|
| L1 | **RBAC 路由族错误字段两套并存**：`roles/route.ts`、`permissions/route.ts` 返回 `error.type`；`system`、`roles/[roleId]`、`roles/[roleId]/permissions`、`users/[userId]/permissions`、`users/[userId]/roles` 手写返回 `error.code` | `src/app/api/rbac/**/route.ts`（见 §1.2） | 属**实现侧**统一，硬约束 3 禁止改 `.ts`；已在 `API.md` RBAC 小节就地标注并建议 `error.type ?? error.code` 兼容 |
| L2 | **`src/app/api/v1/tenants/**`（6 个路由）与 `src/app/api/performance/clear/route.ts` 同样手写 `error.code`** | §1.2 扫描清单 | 同上；`API.md` 目前**没有** v1/tenants 与 performance/clear 的章节，故无处标注 |
| L3 | **`src/app/api/a2a/jsonrpc/route.ts` 使用 JSON-RPC 协议的数值 `error.code`** | §1.2 | 这是 **JSON-RPC 2.0 协议标准字段**，与本次口径无关，**故意不改** |
| L4 | **T123 发现的 D7**：`src/app/api/workflow/[id]/versions/[versionId]/route.ts` 状态码 403 但 `error.type` 为 `INTERNAL_ERROR` | `T123_WORKFLOW_API_TESTS.md` §6 D7 | 属实现缺陷，未改实现；亦未在 `API.md` 记录该路由的 403 语义 |
| L5 | **T123 发现的 D6**：`rollback` 路由归属不匹配返回 404 而非 403/400，与同仓其它路由不一致，建议在 API.md 记录统一约定 | `T123_WORKFLOW_API_TESTS.md` §6 D6 | 该约定需先由主管定夺，再统一写入文档；本次不臆造口径 |
| L6 | **`API.md` 未收录 `src/app/api/v1/tenants/**`、`src/app/api/performance/clear` 等路由** | `grep -n "tenants" API.md` → 无输出 | 属**文档缺失**（非口径问题），超出本任务「口径统一 + CHANGELOG 补记」范围 |
| L7 | **`docs/API-UPDATES-NEEDED.md:59`** 仍挂着 `Replace all error.code with error.type` | 该文件 | 硬约束 2 限定只改 3 个文件，**未动**；`API.md` 部分已由本次结清 |
| L8 | **其它 md 文档仍写 `error.code`**：`docs/TECH_DEBT.md:204/223/426`、`docs/v110_QUICK_REFERENCE.md:140/144`、`docs/api-optimization-analysis.md:120/121/150`、`SPRINT4_PLAN_v150_DRAFT.md:198`、`docs/TELEGRAM-BOT.md:396` | 全仓 grep | 超出 3 个文件白名单，**未动** |
| L9 | **T131 无报告无提交**，workflow 4 条失败用例仍在 | `DEV_TASKS_20261025_1020.md` 基线 | 与本任务无关，仅在 CHANGELOG 遗留段记录 |

---

## 5. 验证记录

```bash
$ git diff --stat API.md README.md CHANGELOG.md
 API.md       | 33 +++++++++++++-----
 CHANGELOG.md | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 136 insertions(+), 9 deletions(-)

$ grep -c "error\.code" API.md   # 改前 2 → 改后 7（7 处全为口径说明行）
$ grep -c "error\.type" API.md   # 改前 2 → 改后 6
$ grep -c "error\.code" README.md  # 改前 0 → 改后 0（README 未改动）

$ git diff API.md | head -100     # 已逐行自查：仅 9 行 "code"→"type" 单行替换 + 2 段新增引用块
```

未执行任何 `git add` / `git commit` / `git push`；未触碰 `src/` 下任何文件。

---

## 6. 结论

**Yes** —— 实现真名确认为 `error.type`（标准路径），`API.md` 全局口径已统一；
少数手写响应体的路由按实现原样保留并就地标注；CHANGELOG 已补记 T119–T131 口径；
README 无错误响应示例故无需改动；实现侧的两套口径并存已作为 L1/L2 列入遗留待主管决策。
