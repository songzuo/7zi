# T243 — 管理端限流规则 API 的 JWT 真校验（安全加固）

**任务编号**：T243
**执行者**：🛡️ 系统管理员（安全方向）子代理
**日期**：2026-10-29
**独占路径**：
- `src/app/api/admin/rate-limit/rules/route.ts`
- `src/app/api/admin/rate-limit/rules/__tests__/route.auth.test.ts`（新建）

**结论：Yes**

---

## 1. 漏洞说明与影响

### 修复前的代码（`src/app/api/admin/rate-limit/rules/route.ts`）

```ts
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }
  const token = authHeader.replace('Bearer ', '')
  // TODO: Implement proper JWT verification
  // For now, just check if token exists
  if (!token || token === 'invalid') {
    return { success: false, error: 'Invalid token' }
  }
  const userId = 'admin' // Default admin user for now
  return { success: true, userId }
}
```

### 风险

| 项 | 说明 |
|---|---|
| **认证绕过** | 任何非空字符串（如 `Bearer abc`）都能通过鉴权。签名、有效期、issuer、audience **全部未校验**。 |
| **授权缺失** | 无任何角色检查；token 是否含 admin 角色完全不看。 |
| **身份伪造** | `userId` 硬编码为 `'admin'`，审计日志（`repositories.auditLog.create({ userId: auth.userId! })`）记录的操作者永远是 `admin`，无法追溯真实操作人。 |
| **影响面** | `GET /api/admin/rate-limit/rules`（列全部规则）、`POST /api/admin/rate-limit/rules`（创建限流规则）。攻击者可任意读取/新增限流策略，用于放行自己的流量或瘫痪他人接口。 |
| **严重级别** | P0（管理端接口完全敞开） |

---

## 2. 鉴权方案（引用真实字段名）

复用仓库既有能力，**未造轮子**：

- `src/lib/auth/jwt.ts` → `export async function verify(token: string): Promise<TokenVerifyResult>`
  - 内部使用 `jose` 的 `jwtVerify()` + `getSecretKey()`（`JWT_SECRET` / `AGENT_ENCRYPTION_SECRET`），并校验 `issuer = '7zi-api'`、`audience = '7zi-users'`。
  - 返回结构（源码真实定义）：
    ```ts
    export interface TokenVerifyResult {
      valid: boolean
      payload?: JwtPayload
      error?: string
    }
    ```
- `src/lib/auth/jwt.ts` → `export interface JwtPayload extends JWTPayload`（真实字段）：
  ```ts
  sub: string            // Subject (user ID)
  email: string
  role: string           // User role
  roles?: string[]       // User roles
  permissions?: string[]
  customPermissions?: string[]
  type: 'user' | 'agent' | 'api'
  ```

### 角色判定依据（grep 真实用例，未臆造字段）

- `src/app/api/auth/audit-logs/route.ts:82` → `payload.role === 'admin'`
- `src/app/api/feedback/route.ts:377` → `payload.roles?.includes('admin') || payload.role === 'admin'`
- `src/lib/auth/enhanced-permissions.ts:19` → `ADMIN = 'admin'`（角色枚举）

因此 admin 判定采用与仓库一致的口径：

```ts
const roles = payload.roles || []
const isAdmin = payload.role === 'admin' || roles.includes('admin')
```

### 响应风格

与 `src/app/api/auth/permissions/route.ts` / `audit-logs/route.ts` 一致：
- 认证失败（401）：`{ success: false, error }`，`error` 直接透传 `result.error`（不写死文案），例如 `Invalid signature` / `Token expired`。
- 权限不足（403）：`{ success: false, error: 'Admin privileges required' }`。
- 成功：`userId` 取自 `payload.sub`（真实用户 ID，不再硬编码 `'admin'`）。

---

## 3. 改动清单

| 文件 | 改动 |
|---|---|
| `src/app/api/admin/rate-limit/rules/route.ts` | ① 新增 `import { verify } from '@/lib/auth/jwt'`；② 新增 `AuthResult` 接口（带 `status?: number`）；③ `checkAuth()` 改为真实 `verify(token)` + admin 角色校验；④ GET / POST 处理器改用 `status: auth.status \|\| 401`（401/403 区分）。 |
| `src/app/api/admin/rate-limit/rules/__tests__/route.auth.test.ts` | **新建**，9 个用例覆盖鉴权矩阵。 |

**未使用** `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable`；未改动 lint / tsconfig / vitest 配置；未触碰 `HEARTBEAT.md` / `state/tasks.json` / `memory/*` / `MEMORY.md` / `DEV_TASKS_*.md` / `src/lib/db/**`；未执行任何 git 写操作。

### 关键实现（修复后）

```ts
async function checkAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header', status: 401 }
  }
  const token = authHeader.substring('Bearer '.length).trim()
  if (!token) {
    return { success: false, error: 'Missing or invalid authorization header', status: 401 }
  }
  const result = await verify(token)
  if (!result.valid || !result.payload) {
    return { success: false, error: result.error || 'Invalid token', status: 401 }
  }
  const { payload } = result
  const roles = payload.roles || []
  const isAdmin = payload.role === 'admin' || roles.includes('admin')
  if (!isAdmin) {
    return { success: false, error: 'Admin privileges required', status: 403 }
  }
  return { success: true, userId: payload.sub }
}
```

### 测试设计

- 只 mock 了 `@/lib/auth/jwt`（`verify`）与 `@/lib/rate-limit-dashboard/database`（数据库依赖）以及 `@/lib/logger`；**没有** mock 掉路由里的 header 解析、角色判定、状态码选择等真实鉴权逻辑。
- `verify` 的 mock 同时提供 **valid: false**（`Invalid signature` / `Token expired`）与 **valid: true**（admin / 非 admin / 无角色 / 仅 roles[] 含 admin）四条分支，断言均为具体值（如 `expect(body.error).toBe('Invalid signature')`），无永真断言。
- 覆盖矩阵：

| 用例 | 期望 |
|---|---|
| 无 Authorization 头 | 401，且 `verify` 未被调用、DB 未被调用 |
| `Basic ...` 非 Bearer | 401，`error === 'Missing or invalid authorization header'` |
| 伪造 token（verify 返回 false） | 401，`error === 'Invalid signature'`（真实错误透传） |
| 过期 token | 401，`error === 'Token expired'` |
| 合法 token + 非 admin 角色 | 403，`error === 'Admin privileges required'` |
| 合法 token + 无角色字段 | 403 |
| 合法 token + `role: 'admin'` | 200，进入业务逻辑（`findAll` 被调用） |
| 合法 token + 仅 `roles: [...,'admin']` | 200 |
| 合法 admin token POST 创建规则 | 201，审计日志 `userId === 'admin-user-1'`（来自 `payload.sub`） |

---

## 4. 前后测试输出对比

### 修复前（占位实现下不存在任何测试文件）

```
$ ls src/app/api/admin/rate-limit/rules/
[id]  route.ts
```

`src/app/api/admin/rate-limit/` 下**没有任何** `__tests__` 目录或测试文件 —— 该接口此前零测试覆盖，这正是占位 `checkAuth()` 能长期存活的原因。

### 修复后

```
$ timeout 300 npx vitest run src/app/api/admin/rate-limit/rules

 RUN  v4.1.12 /root/.openclaw/workspace

 ✓ src/app/api/admin/rate-limit/rules/__tests__/route.auth.test.ts (9 tests) 46ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  10:24:01
   Duration  4.61s (transform 910ms, setup 960ms, import 502ms, tests 46ms, environment 2.31s)
```

（首次运行同一文件：`9 passed (9)`，77ms。）

```
$ timeout 300 npx tsc --noEmit
（无输出 —— 0 错误）
```

```
$ timeout 200 npx eslint src/app/api/admin/rate-limit/rules
（无输出 —— 0 错误 0 警告）
```

---

## 5. 遗留问题

1. **同目录其他管理端路由仍是占位鉴权（P0，同类漏洞）** —— 不在本次独占路径内，未修改：
   - `src/app/api/admin/rate-limit/rules/[id]/route.ts:49` → `// TODO: Implement proper JWT verification`，第 55 行 `const userId = 'admin'`（GET/PUT/DELETE 单条规则，含**删除**操作）。
   - `src/app/api/admin/rate-limit/statistics/route.ts:49` → `const userId = 'admin'`。
   - **建议**：分配同形态的 T2xx 任务，复用本次的 `checkAuth` + 角色判定写法（可抽取为共享 helper，但本次未新增公共文件以遵守独占路径限制）。
2. **被旧行为打破的现存测试**：**无**。grep `src/` 与 `tests/` 下 `admin/rate-limit` 关键字，仅命中本次新建的测试文件，因此不存在依赖“任意 token 即 admin”的旧测试被打破的情况。
3. **前端/调用方兼容性**：若管理后台前端此前依赖“随手塞一个 token 就能调管理接口”，升级后需改为携带真实 admin JWT。仓库内未找到该接口的前端调用代码（grep 未命中 `admin/rate-limit`），风险较低，但部署前建议确认线上后台页面。
4. **角色体系一致性**：本次仅按 `role === 'admin'` / `roles.includes('admin')` 判定（与 `audit-logs`、`feedback` 两处现有实现一致）。仓库另有 `permissions` 机制（如 `admin:*`、`*:*`，见 `audit-logs/route.ts`），若后续要支持“细粒度权限持有者操作限流规则”，需另行扩展判定逻辑。
5. **`@/lib/auth/jwt` 的 `verify()` 在缺少 `JWT_SECRET` 环境变量时会抛错**（`getJwtSecret()` throw），异常发生在 `jwtVerify` 之外 → 会被路由的 `try/catch` 捕获并返回 500 而非 401。属于既有实现特性，未在本次修改；如需 401 语义可在 `checkAuth` 内追加 try/catch（本次未改，因需保持与 `permissions`/`audit-logs` 路由一致的行为）。

---

## 6. 收尾

```
$ ps aux | grep -E "[v]itest|[t]sc" | grep -v grep
root  3909171 timeout 300 npx vitest run src/lib/workflow
root  3909174 npm exec vitest run src/lib/workflow
root  3909187 node .../vitest.mjs run src/lib/workflow
root  3909215 node .../vitest/dist/workers/forks.js
root  3909216 node .../vitest/dist/workers/forks.js
root  3909222 node .../vitest/dist/workers/forks.js
```

本次任务自身启动的 vitest / tsc 进程**已全部正常退出**（无 `rate-limit` 相关残留）。
上列残留进程属于**其它并行子任务**（`vitest run src/lib/workflow`，启动于 10:25），
为避免破坏他人任务，**未做 kill**，仅在此记录。
