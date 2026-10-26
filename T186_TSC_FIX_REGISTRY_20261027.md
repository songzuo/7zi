# T186 — 编译修复报告：`src/app/api/a2a/registry/[id]/route.ts`

日期：2026-10-27
执行人：⚡ 编译修复工程师 T186
范围：仅 `src/app/api/a2a/registry/[id]/route.ts`（其它文件零改动）

---

## 1. 根因分析

Next.js App Router 的动态路由 handler 签名为：

```ts
(request: NextRequest, context: { params: Promise<{ id: string }> })
```

其中 `context` 是 Next 运行时注入的**第二个位置参数**。

本文件的四个导出 handler（GET / PUT / DELETE / PATCH）只声明了 `request`：

```ts
export async function GET(request: NextRequest) {
  return withA2AAuth(request, (req) => GETHandler(req, context))   // ← context 从未定义
}
```

闭包内引用的 `context` 并不存在于作用域中 → TypeScript 报 `TS2304: Cannot find name 'context'`（4 处：原第 24、48、94、121 行）。

注意：
- 文件顶部已声明 `interface RouteContext { params: Promise<{ id: string }> }`，类型定义本身正确，缺的只是**形参绑定**。
- 内部 `GETHandler/PUTHandler/DELETEHandler/PATCHHandler` 的 `(request, context)` 形参本来就是对的，只是拿不到实参。
- `withA2AAuth(request, handler)` 的回调签名是 `(request: NextRequest, auth: A2AAuthContext) => Promise<Response>`（见 `src/lib/agents/a2a/auth.ts`），**它不会把路由 context 传进回调**，因此 `context` 必须在导出层用闭包捕获并显式传给内部 handler —— 这也正是原代码的写法意图。

## 2. 具体改动

文件：`src/app/api/a2a/registry/[id]/route.ts`

| 行号（改后） | 改动 |
| --- | --- |
| 23 | `export async function GET(request: NextRequest)` → `export async function GET(request: NextRequest, context: RouteContext)` |
| 47 | `export async function PUT(request: NextRequest)` → `export async function PUT(request: NextRequest, context: RouteContext)` |
| 93 | `export async function DELETE(request: NextRequest)` → `export async function DELETE(request: NextRequest, context: RouteContext)` |
| 120 | `export async function PATCH(request: NextRequest)` → `export async function PATCH(request: NextRequest, context: RouteContext)` |

内部调用 `(req) => XXXHandler(req, context)` 保持原样（闭包捕获新绑定的 `context`），内部 handler 的 `await context.params` 逻辑一字未动。

**对外行为零变化**：响应信封（`createSuccessResponse` / `createErrorResponse` / `createNotFoundError`）、状态码、鉴权语义（`withA2AAuth` 调用位置与参数不变）、缓存/审计/SSE/DB 均未触碰。
**未使用任何** `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` / `eslint-disable`；未改 tsconfig / eslint / vitest 配置；未新增依赖；未做任何 git 写操作（提交由主管统一处理）。

## 3. 验证（真实输出）

### 3.1 TypeScript

```
$ npx tsc --noEmit 2>&1 | tail -20
COUNT: 0
```

即 `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **0**（整仓库 0 error）。

修复前（记录对照）：
```
src/app/api/a2a/registry/[id]/route.ts(24,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(48,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(94,59): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(121,59): error TS2304: Cannot find name 'context'.
```

### 3.2 ESLint

```
$ npx eslint src/app/api/a2a/registry 2>&1 | tail -10
/root/.openclaw/workspace/src/app/api/a2a/registry/[id]/route.ts
  10:23  warning  'canAccessAgent' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/root/.openclaw/workspace/src/app/api/a2a/registry/route.ts
  8:23  warning  'canAccessAgent' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

✖ 2 problems (0 errors, 2 warnings)
```

**0 errors**，未新增任何 error；2 条 warning 为改动前既有的未使用 import（`canAccessAgent`），非本次引入，且本任务限定只能改一个文件、亦不应改行为语义，故保留原样（可在后续 lint 清理任务中统一处理）。

### 3.3 改动范围

```
$ git status --porcelain
 M src/app/api/a2a/registry/[id]/route.ts     ← 本次唯一改动
```
（其余 M 项均为工作区其他既有改动，非本任务产生。）

## 4. 遗留问题

1. **`canAccessAgent` 未使用 warning（×2）**：`registry/route.ts` 与 `registry/[id]/route.ts` 都 import 了 `canAccessAgent` 但未调用。注意 `auth.ts` 里明确写了「registry 专用的额外校验：API Key 方式必须与目标 agent 匹配」——即该函数**本应**在 `[id]` 路由的 GET/PUT/DELETE/PATCH 里对 `auth.agentId` 做匹配校验，但当前 handler 只接收 `request`，把 `withA2AAuth` 传入的 `auth` 参数丢掉了（回调签名 `(req) => ...` 忽略了第二参）。这属于**鉴权语义缺口**，属超出本任务范围（且会改变对外鉴权行为），建议主管另开 T187 专项：在 `[id]/route.ts` 内部改用 `withA2AAuth(request, async (req, auth) => { ... })`，在操作前调用 `canAccessAgent(auth, id)`，失败返回 403。**本任务未做任何改动。**
2. **同级 `registry/[id]/heartbeat/route.ts` 的 params 类型不一致**：该文件用 `params: { id: string }`（非 Promise）且 `const { id } = context.params` 未 await，在 Next 16 下 `context.params` 实际是 Promise，会导致 `id` 为 `undefined` —— 这是运行时隐患而非类型错误，`tsc` 不会报。它不在本任务的可改路径内（且改它需要同步 `heartbeat` 目录路由），建议一并纳入 T187。
3. 未执行单元/集成测试（vitest / playwright）——本任务为纯类型层修复，且验证命令已指定为 `tsc` + `eslint`；但建议主管在合并后跑一次 `npm run test:run` 复核 a2a 相关用例。

## 5. 结论

**Yes** — 4 个 `TS2304` 已全部消除，`npx tsc --noEmit` 全仓库 0 error；ESLint 0 error、无新增问题；对外契约与鉴权语义零变化；改动严格限定在 `src/app/api/a2a/registry/[id]/route.ts` 单文件内。
