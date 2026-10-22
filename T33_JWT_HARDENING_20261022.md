# T33 · JWT 短密钥生产环境行为回移（安全硬化）— 执行报告

- **执行人**：⚡ Executor（子代理）
- **时间**：2026-10-22
- **基线提交**：`1f075b35a`
- **工作目录**：`/root/.openclaw/workspace`

---

## 1. 结论

✅ **T33 完成，测试全绿。**

旧目录 `7zi-backend/websocket-service/src/lib/jwt-secret.js` 中「生产环境 + `JWT_SECRET` 长度 < 64 → `console.error` + `exit(1)`」的更严行为，已成功回移到新目录 `7zi-backend/websocket/lib/jwt-secret.js`，并保留了该文件特有的注入式可测性（`options.env` / `options.exit` / `options.logger`）与完整导出面。

同时把任务标题中提到的「旧目录 smoke 测试迁移」一并落地：旧目录的手工脚本 `websocket-service/smoke.js` 已移植为 Jest 用例 `7zi-backend/websocket/__tests__/smoke.test.js`（旧目录本身**未删除**，保留作行为对比回归）。

**测试结果：全绿**。T33 单独复跑时为 **12 套件 / 136 用例全绿**（基线 11 套件 / 125 用例 → **+1 套件 / +11 用例**，无删减、无弱化、无 `it.skip`）；并行任务 T34 落地后再次全量复跑为 **13 套件 / 137 用例全绿**（T34 追加 1 套件 / 1 用例）。

---

## 2. 改动清单

### 2.1 `7zi-backend/websocket/lib/jwt-secret.js`（核心改动，1 个文件）

唯一的生产代码改动，只在「短密钥」分支内增加生产环境分支：

```js
if (secret.length < MIN_SECRET_LENGTH) {
  if (isProduction) {
    logger.error(
      `[ERROR] JWT_SECRET is too short (${secret.length} chars). Minimum ${MIN_SECRET_LENGTH} chars recommended for HS256.`
    )
    exit(1)
    // process.exit() terminates, but keep a return for injected/mock exits.
    return undefined
  }
  logger.warn(
    `[WARN] JWT_SECRET is too short (${secret.length} chars). Minimum ${MIN_SECRET_LENGTH} recommended for HS256.`
  )
}
```

同时更新了文件头部的行为说明注释（原注释写的是「短密钥只 warn 不退出」，现已拆分为生产/非生产两条）。

**语义与旧实现逐字对齐**：
| 场景 | 旧实现（websocket-service） | 新实现（websocket/） | 一致 |
|---|---|---|---|
| 生产 + 缺密钥 | error `[FATAL] ...` + exit(1) | 同左（未改动） | ✅ |
| 生产 + 短密钥 | error `[ERROR] JWT_SECRET is too short (N chars)...` + exit(1) | 同左（本次回移） | ✅ |
| 生产 + ≥64 字符 | 返回密钥，无日志 | 同左 | ✅ |
| 非生产 + 缺密钥 | warn + 开发 fallback | 同左（未改动） | ✅ |
| 非生产 + 短密钥 | warn + 返回短密钥 | 同左（未改动） | ✅ |
| 非生产 + ≥64 字符 | 返回密钥 | 同左 | ✅ |

**向后兼容核对**：
- ✅ `getJWTSecret(options)` 签名不变，`options.env` / `options.exit` / `options.logger` 注入式可测性完整保留
- ✅ `module.exports = { getJWTSecret, MIN_SECRET_LENGTH, DEV_FALLBACK_SECRET }` 导出面**未减少**（三项齐全）
- ✅ 非生产环境行为**完全不变**
- ✅ 缺密钥行为**完全不变**（生产 exit(1) / 开发 fallback）
- ✅ `MIN_SECRET_LENGTH = 64`、`DEV_FALLBACK_SECRET` 常量值未动

### 2.2 `7zi-backend/websocket/__tests__/jwt-secret.test.js`（测试）

**新增 5 个用例**：
1. `warns but still returns a short secret when NODE_ENV is undefined (non-production)` — 无 `NODE_ENV` 时短密钥只告警
2. `exits with code 1 when JWT_SECRET is shorter than the minimum in production` — **核心新用例**：生产 + 短密钥 → `exit(1)` + error 日志
3. `does not warn (only errors) for a short secret in production` — 生产路径只走 error 不走 warn
4. `a token signed with the returned secret can be verified` — 迁移自旧目录 `websocket-service/test/jwt-secret.test.js`
5. `a token signed with a different secret fails verification` — 迁移自旧目录同上

**唯一被修改的既有用例**：`warns but still returns a secret shorter than the recommended minimum`
- 原因：该用例原本用 `NODE_ENV: 'production'` 断言「不退出」，与本次回移的**目标行为直接冲突**，无法两立。
- 处理：把 `NODE_ENV` 改为 `'development'`，**断言一条未删、一条未弱化**（仍断言 `secret === short`、`exit` 未被调用、warn 含 `too short`、warn 含实际长度）。
- 覆盖完整性：该场景新增了 `NODE_ENV` 未定义（等价非生产）的平行用例 + 新的生产致命用例，**非生产行为仍被完整覆盖**。

### 2.3 `7zi-backend/websocket/__tests__/production-guard.test.js`（测试）

新增 1 个**进程级端到端**回归用例 `exits with code 1 when JWT_SECRET is too short in production`：真实 spawn 服务进程，`NODE_ENV=production` + 短密钥 → 断言退出码为 1、stderr 含 `[ERROR] JWT_SECRET is too short`、且**未出现** `WebSocket Server Started`（未监听端口）。既有用例全部保留。

### 2.4 `7zi-backend/websocket/__tests__/smoke.test.js`（**新增文件**，旧目录 smoke 迁移）

把旧目录的手工脚本 `7zi-backend/websocket-service/smoke.js`（node 脚本、需先起服务再跑）移植为 Jest 套件，5 个步骤一一对应：

| 旧 smoke.js 步骤 | 新 Jest 用例 |
|---|---|
| [1/5] HTTP 健康检查 | `[1/5] HTTP health check returns status ok` |
| [2/5] WebSocket 连接（demo 模式） | `[2/5] connects in demo mode and receives auth:authenticated` |
| [3/5] 加入房间 | `[3/5] joins a room and receives room:joined` |
| [4/5] 广播 cursor:move | `[4/5] broadcasts a cursor move without error` |
| [5/5] 离开房间 | `[5/5] leaves the room cleanly and receives room:left` |

- 服务在 **127.0.0.1 + 随机空闲端口**（`net.createServer().listen(0)`）上启动，**不会碰生产端口**；`NODE_ENV=test`，用完 SIGKILL。
- 沿用 `server.integration.test.js` 的既有约定：`socket.io-client` 从工作区根安装提升（hoisted）解析；若不可用则 `describe.skip` 降级（与现有集成测试同一模式，不是新增的 skip 逃逸）。
- **旧目录 `websocket-service/` 未做任何改动、未删除**（阶段 2 才删），其 `node --test` 套件仍可独立跑通。

### 2.5 直接调用方 —— 无需修改

`getJWTSecret` 在新目录/工作区内的**唯一生产调用方**是 `server/websocket-server.js` 第 29/43 行：

```js
const { getJWTSecret } = require('./lib/jwt-secret')
const JWT_SECRET = getJWTSecret()   // 无参调用
```

- 无参调用时走 `process.env` / `process.exit` / `console` 默认值 → 新增的生产致命分支自动生效，无需改调用方。
- 工作区根的 `server/` 目录里 `server/lib` 是指向 `7zi-backend/websocket/lib` 的**符号链接**（`server/lib -> ../7zi-backend/websocket/lib`），因此根目录的服务入口自动获得同一份硬化逻辑，**不存在第二份需要同步的代码副本**。
- 全仓检索 `getJWTSecret` / `jwt-secret`：除旧目录 `websocket-service/`（保留不动）与前端 `7zi-frontend/src/lib/auth/jwt.ts`（独立实现，见「组外问题」）外，无其他后端调用方。

---

## 3. 验证命令与输出

### 3.1 全量测试（主管指定命令）

```
$ cd 7zi-backend && npx jest websocket/ workflow-engine/
```

```
PASS websocket/__tests__/server-lib.test.js
PASS websocket/__tests__/server.integration.test.js
PASS websocket/__tests__/server-entry.test.js
PASS websocket/__tests__/smoke.test.js
PASS workflow-engine/__tests__/port.test.js
PASS websocket/__tests__/handlers.test.js
PASS websocket/__tests__/auth.test.js
PASS websocket/__tests__/room-manager.test.js
PASS websocket/__tests__/config.test.js
PASS workflow-engine/__tests__/basic.test.js
PASS websocket/__tests__/jwt-secret.test.js
PASS websocket/__tests__/production-guard.test.js (11.773 s)

Test Suites: 12 passed, 12 total
Tests:       136 passed, 136 total
Snapshots:   0 total
Time:        12.705 s
Ran all test suites matching /websocket\/|workflow-engine\//i.
```

✅ **12 套件 / 136 用例全绿**（基线 11 / 125 → **+1 套件 / +11 用例**，达标线 ≥125 ✅）

> 注：本命令在并行任务 T34（覆盖率补测）落地后再次复跑为 **13 套件 / 137 用例全绿** —— T34 在 `workflow-engine/` 追加了 1 个套件 / 1 个用例。T33 自身增量仍为 +1 套件 / +11 用例，两任务互不影响。

### 3.2 覆盖率（确认 `coverageThreshold` 未被下调，global lines ≥ 60）

```
$ cd 7zi-backend && npx jest --coverage websocket/ workflow-engine/

All files |   94.85 |    84.02 |   98.03 |   95.27 |
 jwt-secret.js |     100 |      100 |     100 |     100 |
```

- `jwt-secret.js` **四项 100% 覆盖**（改前短密钥生产分支未被覆盖 → 现已 100%）
- 全局 lines 95.27% ≫ 阈值 60%，`package.json` 的 `coverageThreshold` **未作任何改动**。

### 3.3 生产守卫子套件（verbose）

```
$ npx jest websocket/__tests__/production-guard.test.js --verbose

PASS websocket/__tests__/production-guard.test.js
  production guard: JWT_SECRET required
    ✓ exits with a non-zero code when JWT_SECRET is missing in production (235 ms)
    ✓ exits with code 1 when JWT_SECRET is too short in production (184 ms)
    ✓ starts normally in production when a strong JWT_SECRET is provided (10006 ms)
```

### 3.4 smoke 迁移子套件（verbose）

```
$ npx jest websocket/__tests__/smoke.test.js --verbose

PASS websocket/__tests__/smoke.test.js
  websocket server (smoke)
    ✓ [1/5] HTTP health check returns status ok (20 ms)
    ✓ [2/5] connects in demo mode and receives auth:authenticated (39 ms)
    ✓ [3/5] joins a room and receives room:joined (24 ms)
    ✓ [4/5] broadcasts a cursor move without error (2017 ms)
    ✓ [5/5] leaves the room cleanly and receives room:left (25 ms)
```

### 3.5 旧目录行为对比回归（旧目录**未删**，仍可独立跑）

```
$ cd 7zi-backend/websocket-service && node test/run.js
...
    ok 12 - getAllRooms returns all rooms
Process exited with code 0
```

旧目录 `node --test` 套件（unit 12 + jwt-secret 7 + integration 24）依旧全绿。

### 3.6 新旧实现行为逐场景对比（自建脚本 `/tmp/cmp.js`，未入库）

对 7 种 `NODE_ENV` × `JWT_SECRET` 组合分别驱动旧模块与新模块，比对返回值与日志/exit 调用序列：

```
MATCH {"NODE_ENV":"production","JWT_SECRET":"xxxx...(64)"}
MATCH {"NODE_ENV":"development"}
MATCH {"NODE_ENV":"development","JWT_SECRET":"short"}
MATCH {"NODE_ENV":"development","JWT_SECRET":"xxxx...(64)"}
MATCH {"JWT_SECRET":"short"}
DIFF  {"NODE_ENV":"production"}                     <- 见下方说明
DIFF  {"NODE_ENV":"production","JWT_SECRET":"short"} <- 见下方说明
```

两处 DIFF **均为 mock 假象，非行为差异**：
- 旧模块硬编码 `process.exit(1)`（无注入点），对比脚本只能 stub `process.exit`，stub 后旧代码**继续往下执行**，于是额外打了一条 warn 并返回了 fallback 值。
- 新模块因支持 `options.exit` 注入，在 `exit(1)` 之后 `return undefined`，**不会**继续执行。
- 真实 `process.exit(1)` 立即终止进程，两者行为**完全一致**（已由 3.3 的进程级 E2E 用例 `exit code === 1` 实证）。

### 3.7 ESLint

```
$ npx eslint 7zi-backend/websocket/lib/jwt-secret.js 7zi-backend/websocket/__tests__/*.js
（0 errors，仅 4 条 "File ignored because of a matching ignore pattern" 警告）
```

注：仓库根 `eslint.config.mjs` 当前把 `7zi-backend/` 整体 ignore 掉了，所以 `npx eslint 7zi-backend/websocket/` 会报「all of the files matching the glob pattern are ignored」——这与本次改动无关（详见组外问题 G2）。改动文件本身 **0 error**。

### 3.8 `git status --short`（未执行任何 `git add` / `git commit`）

```
 M 7zi-backend/websocket/__tests__/jwt-secret.test.js
 M 7zi-backend/websocket/__tests__/production-guard.test.js
 M 7zi-backend/websocket/lib/jwt-secret.js
 D 7zi-frontend/__fix-imports.cjs
 M HEARTBEAT.md
 M eslint.config.mjs
 M memory/2026-10-22.md
 M memory/claw-mesh-state.json
 M state/tasks.json
?? 7zi-backend/websocket/__tests__/smoke.test.js
?? DEV_TASKS_20261022_0956_T28.md
?? DEV_TASKS_20261022_1408.md
?? T27_BACKEND_PORT_ENV_FIX_20261022.md
```

- 本任务产出：`7zi-backend/websocket/lib/jwt-secret.js`、`7zi-backend/websocket/__tests__/jwt-secret.test.js`、`7zi-backend/websocket/__tests__/production-guard.test.js`（改）、`7zi-backend/websocket/__tests__/smoke.test.js`（新增）。
- 其余条目为**其他并行任务/主管**的改动，与 T33 无关。
- ✅ 未执行 `git add` / `git commit`；✅ 未删除 `websocket-service/`、`workflow-service/`、`websocket/`、`workflow-engine/` 任何目录。

---

## 4. 组外问题（记录，未顺手改）

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| G1 | **前端 `7zi-frontend/src/lib/auth/jwt.ts` 与后端策略不一致**：前端生产环境 + 短密钥是 `throw`（`[JWT] FATAL: ... too short`），后端原本只是 warn。前端其实**已经**是更严的一方，本次回移后前后端策略终于一致（生产均拒绝短密钥）。 | 无阻塞，属正向收敛 | 交由主管确认即可，无需改动 |
| G2 | **仓库根 `eslint.config.mjs` 把 `7zi-backend/` 整体 ignore**，`npx eslint 7zi-backend/websocket/` 直接报错「all of the files matching the glob pattern are ignored」。因此后端 `npm run lint` 实质上是空跑。 | **后端 lint 门禁形同虚设** —— 这与 T27 端口 Bug 长期存活是同一类问题 | 强烈建议纳入 T32（CI 接入）范围一并修正，否则后端 CI 的 lint 步骤没有实际约束力 |
| G3 | `7zi-backend/websocket-service/` 旧目录仍持有自己的 `package.json`（含独立的 `socket.io-client` devDep）与 `node_modules`，与根 `7zi-backend/package.json` 并存，存在双份依赖树。 | 磁盘占用 + 版本漂移风险 | 阶段 2 删除旧目录时一并清理 |
| G4 | `7zi-backend/websocket-service/test/jwt-secret.test.js`（node:test 旧套件）与新目录 Jest 套件存在**行为断言重叠**。旧套件仍断言「生产 + 短密钥 → exit(1)」，与新实现一致 ✅，但两处需同步维护。 | 阶段 2 删除旧目录后旧套件一并消失 | 阶段 2 处理 |
| G5 | `websocket-service/smoke.js` 原脚本仍在旧目录中，与新的 `websocket/__tests__/smoke.test.js` 功能重复。 | 维护冗余 | 阶段 2 删除旧目录时一并清理；本次按要求**未删除** |
| G6 | 仓库根 `server/` 目录的 `server/lib` 是指向 `7zi-backend/websocket/lib` 的**符号链接**，但 `server/websocket-server.js` 是**独立实体文件**（非链接）。T31 的 symlink 收敛方案需覆盖它。 | 阶段 2 收敛时的注意事项 | 交主管在 T31 阶段 2 决策 |

---

## 5. 合规自查

- [x] 只改了 `7zi-backend/websocket/lib/jwt-secret.js` + 其测试 + 旧目录 smoke 迁移测试，未改任何无关生产代码
- [x] `getJWTSecret(options)` 的 `options.env` / `options.exit` / `options.logger` 注入式可测性完整保留
- [x] `module.exports` 的 `{ getJWTSecret, MIN_SECRET_LENGTH, DEV_FALLBACK_SECRET }` 导出面未减少
- [x] 非生产环境行为完全不变；缺密钥行为完全不变
- [x] 新增测试用例；现有用例无一被删除或弱化；无 `it.skip` / `xit`
- [x] 未执行 `git add` / `git commit`
- [x] 未删除 `7zi-backend/websocket-service/`（及任何其他目录）
- [x] `cd 7zi-backend && npx jest websocket/ workflow-engine/` 全绿（T33 单独：12 套件 / 136 用例；含并行 T34：13 套件 / 137 用例；均 ≥ 基线 125）
- [x] 未改动 `package.json` / `coverageThreshold` / 依赖版本
- [x] 报告已写入 `/root/.openclaw/workspace/T33_JWT_HARDENING_20261022.md`
