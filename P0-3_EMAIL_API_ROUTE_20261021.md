# P0-3 安全修复报告：nodemailer 邮件发送逻辑迁移到服务端 API Route

- **日期**：2026-10-21
- **执行人**：⚡ Executor（执行实现）
- **范围**：`7zi-frontend/`（未触碰 `7zi-backend`，未升级依赖，未引入新包，未执行 git commit）

---

## 1. 问题背景

`7zi-frontend`（Next.js 16 / React 19）在浏览器端代码中直接加载 nodemailer：

| 位置 | 问题代码 |
| --- | --- |
| `src/lib/monitoring/channels/email-alert.ts:109` | `await import('nodemailer')` → `createTransport(...)` → `sendMail(...)` |
| `src/lib/monitoring/channels/email-alert.ts:401` | `await import('nodemailer')` → `createTransport(...)` → `verify()` |
| `src/lib/alerting/smtp-tester.ts:8` | `import nodemailer from 'nodemailer'`（**静态 import**，必然进入客户端 bundle） |

后果：SMTP 凭据、邮件模板与发送逻辑被打进客户端 bundle，用户可在浏览器 devtools 中直接读取 SMTP 主机/账号（密码若由 `createEmailChannelFromEnv()` 注入 config，则一并泄漏）。

---

## 2. 改动点

### 2.1 新增：服务端 API Route — `src/app/api/email/route.ts`（新建）

- Next.js App Router Route Handler，`runtime = 'nodejs'`、`dynamic = 'force-dynamic'`。
- 路由文件位于 `src/app/api/` 下 → **只在服务端执行**，客户端 bundle 不会包含该文件。
- **SMTP 配置来自服务端环境变量**（客户端无法读取）：
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`
  - 兼容旧变量名：`EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT` / `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASS` / `EMAIL_FROM`
- **缺配置时返回 503 + 明确错误信息**：
  ```
  503 { success: false, error: "SMTP is not configured on the server. Missing environment variable(s): SMTP_HOST, SMTP_USER" }
  ```
- `export function resolveSmtpConfig(env)` 导出为纯函数，便于单测；`port === 465` 自动启用 `secure`。
- `POST /api/email` 支持两种 `action`：
  - `action: 'send'`（默认）→ 发送邮件，返回 `{ messageId, accepted, rejected, response }`
  - `action: 'test'` → 仅 `transporter.verify()`，返回 `{ verified: true, host, port }`
- `GET /api/email` → 健康检查，返回 `{ configured, missing, host, port }`，**不暴露任何凭据**。
- 错误分类透传：底层 SMTP 错误（`ETIMEDOUT` / `ECONNREFUSED` / `ENOTFOUND` / `Invalid login` / 证书错误）以 500 原样返回，便于客户端做错误归类。
- 400：非法 JSON / 缺少收件人。
- nodemailer 通过 `await import('nodemailer')` 在**路由内部按需加载**（仅服务端）。

### 2.2 新增：浏览器安全 API 客户端 — `src/lib/email/api-client.ts`（新建）

- 纯 `fetch` 封装，无任何 node 依赖，可安全用于客户端：
  - `callEmailApi(body, init?)` → 统一处理 HTTP 状态 / JSON 解析 / 网络异常，返回 `{ success, status, error?, data? }`
  - `sendEmailViaApi(options)` → `POST /api/email`（`action: 'send'`）
  - `testSmtpViaApi(timeout?)` → `POST /api/email`（`action: 'test'`）
- 网络不可达时返回 `status: 0`，供上层区分「服务不可用」与「发送失败」。

### 2.3 修改：`src/lib/monitoring/channels/email-alert.ts`

- 删除 `NodemailerTransporter` 接口与 `private transporter` 字段。
- `sendInternal()` 改为调用 `sendEmailViaApi()`：
  - 成功 → `logger.debug('[EmailAlert] Sent: ...')`
  - **503（未配置 SMTP）或 status 0（API 不可达）→ 保留原 console fallback 逻辑**（`Would send` / `To` / `Body` 三条 debug 日志），不抛错
  - 其它错误（真实发送失败）→ `throw`，交由 BaseAlertChannel 的重试机制处理
- `testConnection()` 改为调用 `testSmtpViaApi()`，签名与返回语义不变（`Promise<boolean>`）。
- `createEmailChannelFromEnv()` 改为优先读取 `SMTP_*`，回退到 `EMAIL_*`，与服务端路由保持一致。
- 头部文档更新为 `@version 2.1.0`，说明 nodemailer 只在服务端。

### 2.4 修改：`src/lib/alerting/smtp-tester.ts`

- 移除静态 `import nodemailer from 'nodemailer'`。
- `testSMTPConnection(credentials, options)` / `testSMTPConnectionOnly(credentials, timeout)` **签名完全不变**，内部改为调用 `callEmailApi()`。
- 保留原有行为：
  - 凭证格式校验（`validateSMTPCredentials`）—— 校验不通过时**不发起请求**，直接返回错误
  - 错误归一化（`ETIMEDOUT`→`Connection timeout:`、`ECONNREFUSED`→`Connection refused:`、`ENOTFOUND`→`Host not found:`、认证失败、证书错误）
  - `responseTime` 计时
  - `getDefaultSMTPConfig()` 预设表
- **客户端传入的 `credentials` 只用于校验与错误提示，不会随请求上传到服务端**（SMTP 账号密码始终由服务端环境变量持有）。

### 2.5 修改：测试文件（全部改为 mock fetch）

| 文件 | 改动 |
| --- | --- |
| `src/lib/monitoring/channels/email-alert.test.ts` | 移除 `vi.mock('nodemailer')`；改用 `vi.stubGlobal('fetch', fetchMock)`；新增 4 个用例（走 API 成功 / 503 fallback / 网络不可达 fallback / 真实失败抛错）+ 3 个连接测试用例 |
| `src/lib/alerting/__tests__/smtp-tester.test.ts` | 重写为 mock fetch；新增「不应把 SMTP 凭据上传到服务端」断言；覆盖 503 / 各类 SMTP 错误归一化 |
| `src/lib/monitoring/__tests__/email-alert.test.ts` | 移除 `vi.mock('nodemailer')`；改用 fetch mock |
| `src/lib/monitoring/__tests__/integration.test.ts` | 移除 `vi.mock('nodemailer')`；改用 fetch mock |
| `src/app/api/email/__tests__/route.test.ts` | **新建**：路由级单测（此处 mock nodemailer 是合理的——它是服务端模块） |

### 2.6 修改：`src/lib/alerting/smtp-tester.README.md`

- 新增「架构说明（P0-3 安全修复）」章节：说明 nodemailer 只在服务端、环境变量表、以及客户端凭据不会上传的约定。

---

## 3. Bundle 验证证据

### 3.1 构建

```bash
cd /root/.openclaw/workspace/7zi-frontend && rm -rf .next && npx next build
```

结果：
```
✓ Compiled successfully in 44s
✓ Generating static pages using 3 workers (68/68) in 2.0s
```

### 3.2 客户端 bundle 中无 nodemailer ✅

```bash
$ grep -rl "nodemailer" .next/static/ 2>/dev/null | wc -l
0
```

服务端产物中存在（预期正确）：
```bash
$ grep -rl "nodemailer" .next/server/ 2>/dev/null | wc -l
5
```

### 3.3 路由已注册

```bash
$ grep -o '"/api/email"' .next/app-path-routes-manifest.json
"/api/email"
```

### 3.4 源码级校验：nodemailer 仅存在于服务端路由

```bash
$ grep -rn "from 'nodemailer'\|import('nodemailer')\|require('nodemailer')" src/ | grep -v "__tests__\|__mocks__"
src/app/api/email/route.ts:149:  let nodemailer: typeof import('nodemailer')
src/app/api/email/route.ts:151:    nodemailer = await import('nodemailer')
```

其余 `src/` 中出现的 "nodemailer" 全部是**注释/文档文字**，无任何实际 import。

---

## 4. 测试结果

### 4.1 本次改动直接相关的 5 个测试文件

```bash
$ npx vitest run src/lib/monitoring/channels/email-alert.test.ts \
                src/lib/monitoring/__tests__/email-alert.test.ts \
                src/lib/monitoring/__tests__/integration.test.ts \
                src/lib/alerting/__tests__/smtp-tester.test.ts \
                src/app/api/email
```

```
 ✓ src/lib/monitoring/channels/email-alert.test.ts (36 tests) 76ms
 ✓ src/lib/monitoring/__tests__/integration.test.ts (27 tests) 122ms
 ✓ src/app/api/email/__tests__/route.test.ts (12 tests) 50ms
 ✓ src/lib/monitoring/__tests__/email-alert.test.ts (19 tests) 66ms
 ✓ src/lib/alerting/__tests__/smtp-tester.test.ts (30 tests) 29ms

 Test Files  5 passed (5)
      Tests  124 passed (124)
```

### 4.2 相关目录全量回归

```bash
$ npx vitest run src/lib/monitoring src/lib/alerting src/app/api/email
```

```
 Test Files  2 failed | 15 passed (17)
      Tests  2 failed | 408 passed | 5 skipped (415)
```

两个失败为**改动前既已存在的基线失败**（已通过 `git worktree` 在 HEAD 原始代码上复现验证，与本次改动无关）：

| 失败用例 | 基线验证 |
| --- | --- |
| `src/lib/monitoring/channels/sms-alert.test.ts > SMSAlertChannel > Gateway Communication > should log to console when gateway not configured` | 在 HEAD 原始代码（`/tmp/p0orig` worktree）上同样失败 ✅ 基线问题 |
| `src/lib/alerting/__tests__/MultiChannelNotifications.test.ts > MultiChannelAlertService > alert - 单渠道失败不影响其他` | 在 HEAD 原始代码上同样失败 ✅ 基线问题 |

### 4.3 TypeScript 类型检查

`npx tsc --noEmit` 在本次改动的文件上**无新增错误**（`api/email/route.ts`、`smtp-tester.ts`、`email-alert.ts`、`api-client.ts` 均无报错）。仓库中存在若干**改动前既有**的 TS 错误，已通过 HEAD worktree 对比确认与本次无关。

---

## 5. 行为兼容性说明

| 场景 | 改动前 | 改动后 |
| --- | --- | --- |
| SMTP 正常 | nodemailer 直接发信 | 服务端 nodemailer 发信，客户端 fetch ✅ 行为一致 |
| 未配置 SMTP | `import('nodemailer')` 成功但无 transporter → console fallback | 服务端返回 503 → 客户端 console fallback ✅ 行为一致 |
| nodemailer 包缺失 | catch → console fallback | 服务端 500（模块加载失败）→ 客户端按真实失败处理（会抛错重试）⚠️ 行为略有差异，但服务端已内置该依赖，实际不会发生 |
| SMTP 认证失败 | 抛错 → 重试 | 服务端 500 透传原始错误 → 客户端抛错 → 重试 ✅ 行为一致 |
| `testConnection()` | 直接 verify | 服务端 verify（`action: 'test'`）✅ 签名/语义一致 |
| `testSMTPConnection()` | 直接发信 | 服务端发信（`action: 'send'`）✅ 签名/错误语义一致 |

**唯一的行为变化**：客户端不再直接持有 SMTP 凭据；实际发信所用凭据来自**服务端环境变量**。这是本次修复的目的本身。

---

## 6. 部署注意事项

生产环境需在服务端配置以下环境变量（否则 `/api/email` 返回 503，客户端自动降级为 console 日志）：

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user@example.com
SMTP_PASS=your-password-or-app-token
SMTP_FROM=alerts@7zi.com
```

旧变量名 `EMAIL_SMTP_*` / `EMAIL_FROM` 仍然可用。

---

## 7. 交付物清单

### 新增文件
- `7zi-frontend/src/app/api/email/route.ts` — 服务端邮件 API Route
- `7zi-frontend/src/app/api/email/__tests__/route.test.ts` — 路由单测（12 用例）
- `7zi-frontend/src/lib/email/api-client.ts` — 浏览器安全 fetch 客户端

### 修改文件
- `7zi-frontend/src/lib/monitoring/channels/email-alert.ts` — 改用 `/api/email`
- `7zi-frontend/src/lib/alerting/smtp-tester.ts` — 改用 `/api/email`
- `7zi-frontend/src/lib/monitoring/channels/email-alert.test.ts` — mock fetch
- `7zi-frontend/src/lib/alerting/__tests__/smtp-tester.test.ts` — mock fetch
- `7zi-frontend/src/lib/monitoring/__tests__/email-alert.test.ts` — mock fetch
- `7zi-frontend/src/lib/monitoring/__tests__/integration.test.ts` — mock fetch
- `7zi-frontend/src/lib/alerting/smtp-tester.README.md` — 架构说明

### diff 统计
```
 7zi-frontend/src/lib/alerting/__tests__/smtp-tester.test.ts | 231 ++++++++++++---------
 7zi-frontend/src/lib/alerting/smtp-tester.README.md         |  23 +-
 7zi-frontend/src/lib/alerting/smtp-tester.ts               | 197 ++++++++++++----------
 7zi-frontend/src/lib/monitoring/__tests__/email-alert.test.ts |  46 ++--
 7zi-frontend/src/lib/monitoring/__tests__/integration.test.ts |  30 ++-
 7zi-frontend/src/lib/monitoring/channels/email-alert.ts    | 111 +++++-----
 7 files changed, 426 insertions(+), 312 deletions(-)
```

---

## 8. 过程中的注意事项（供主管知悉）

工作区中存在**并行的其他子代理**在 `7zi-frontend/` 目录执行 `git checkout -- .`（清理其自身改动），导致本次改动的 **tracked 文件被两次回滚**（新文件因 untracked 得以幸免）。

处理方式：已将完整的、可重复执行的补丁脚本保存在 **`/root/p0-3-backup/apply.py`**（含所有改动的完整文件副本）。

```bash
python3 /root/p0-3-backup/apply.py   # 幂等，随时可重放
```

**若在其它子代理结束后发现本次改动丢失，执行上述脚本即可恢复。**
建议后续统一由单一代理操作该目录，或在合并前由主管统一执行一次该脚本。
