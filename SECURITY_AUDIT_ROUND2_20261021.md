# 安全审计报告 Round 2 — 7zi-frontend / 7zi-backend

- **日期**: 2026-10-21
- **执行人**: 咨询师-安全审计（子代理）
- **范围**: 7zi-frontend（Next.js 16 前端）+ 7zi-backend（Express/WS 后端）
- **性质**: 只读审计，未修改任何代码
- **前序文档**: `SECURITY_AUDIT_20261019.md`、`SECURITY_FIXES_20261021.md`、`NPM_SECURITY_FIX_20261021.md`、`CSP_HEADER_DESIGN_20261020.md`

## 摘要

| 级别 | 数量 |
|------|------|
| P0   | 4     |
| P1   | 7     |
| P2   | 6     |

**凭据泄漏高危项**：**有 1 项 P0** —— `7zi-frontend/.env.production` 中的真实 `JWT_SECRET`（128 hex 字符）已提交进 **公开** GitHub 仓库 `songzuo/7zi`（`private: false`，raw.githubusercontent.com 可直接读取）。这与 nodemailer 无关，但比它更严重。

**nodemailer 回归检查结果：干净。** 全仓库前端 `src/` 无任何 `import nodemailer`；nodemailer 仅在 `src/app/api/email/route.ts:150` 以动态 `await import('nodemailer')` 加载（服务端路由内）。构建产物 `.next/static/` 76 个 JS chunk 中未出现 `nodemailer`、`SMS_API_KEY`、`RESEND_API_KEY`、`WEBHOOK_SECRET` 等字面量。**上一次 P0-3 修复保持有效，未回归。**

---

## P0（必须立即处理）

### P0-1　`JWT_SECRET` 明文提交进公开 GitHub 仓库

- **位置**: `7zi-frontend/.env.production:23`
- **问题**:
  ```
  JWT_SECRET=8861d60e34463a2e0feafb90a6e249edaa1322c7fb7361f87cd1d227adbf4d8ddf84c27814c5069be
  ```
  该文件被 git 跟踪（`git ls-files` 命中），仓库 `https://github.com/songzuo/7zi` 为 **public**，已验证可直接读取：
  ```
  https://raw.githubusercontent.com/songzuo/7zi/main/7zi-frontend/.env.production
  → 23:JWT_SECRET=8861d60e34463a2e0feafb90a6e249edaa1322c7fb7361f87cd1d227adb...
  ```
  该值 128 hex 字符（= 64 字节），符合 `src/lib/auth/jwt.ts:18` 注释中推荐的 `randomBytes(64).toString('hex')` 生成方式，**是真实密钥而非占位符**。同文件 `SESSION_SECRET` 仍是 `your-session-secret-change-this-...` 占位符，说明 JWT_SECRET 是被实际生成并写入的。
- **影响**: 任何人都可以用该密钥伪造 HS256 JWT。若线上 `7zi.com` 生产环境使用了同一把密钥（`.env.production` 就是生产配置文件，且 `Dockerfile.production-optimized` 未排除该文件——见 P1-6），则可冒充任意用户、任意角色。
- **修复建议**:
  1. **立即轮换**线上 `JWT_SECRET`（`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`），并同步 `SESSION_SECRET` / `ENCRYPTION_KEY`。
  2. `git rm --cached 7zi-frontend/.env.production`，将 `*.env.production`（除 `.example`）加入 `.gitignore`。
  3. 清理 git 历史（`git filter-repo --invert-paths --path 7zi-frontend/.env.production`）+ 强制推送 + 通知 GitHub 清除缓存。
  4. 生产环境密钥改由 CI/CD secret 注入（`deploy/docker/docker-compose.prod.yml` 已支持 `${JWT_SECRET}` 注入模式，照此走即可）。
- **预估工作量**: 30 分钟（轮换） + 1-2 小时（历史清理 + 协同）

### P0-2　`/api/email` 公开可调用的邮件发送接口（无鉴权、无 CSRF、可任意收件人）

- **位置**: `7zi-frontend/src/app/api/email/route.ts`（全文；`POST` 处理器在 `:101-210`）
- **问题**:
  - 整个 route **没有导入任何鉴权中间件**（`grep -n "auth\|csrf" src/app/api/email/route.ts` 仅命中 `:162` 的 `auth: { user, pass }`——那是 nodemailer 的 SMTP 认证配置，不是接口鉴权）。
  - `POST` 接受客户端传入的 `to`（任意收件人）、`from`（可伪造发件人）、`subject`、`html`、`text`，服务端用真实 SMTP 凭据代发（`:185-193`）。`action=test` 还会对 SMTP 做 `verify()`（`:170`）并回显 `host`/`port`。
  - `GET`（`:216-230`）匿名可读 SMTP 配置状态：`configured` / `missing`（**缺失的环境变量名列表**）/ `host` / `port`。
  - 无 CSRF 校验（`src/lib/middleware/csrf.ts` 的 `withCSRF` 全仓库只用于 `src/app/api/auth/register/route.ts`）。
  - 唯一缓解是 `src/proxy.ts:65` 的全局 `/api` 限流，默认档 100 次/分钟（`src/lib/rate-limit/config.ts` `RateLimitPresets.default`）——远不足以阻止垃圾邮件。
- **影响**: 站点被当作开放邮件中继（open relay）滥用，损害 7zi.com 域名信誉与 SMTP 配额；可被用于钓鱼（伪造 `from`）；可被用于探测内网 SMTP；错误响应（见 P1-1）可回显 SMTP 主机信息。
- **修复建议**:
  1. 给 `POST /api/email` 加鉴权：仅允许已登录管理员，或改为内部服务间调用（`x-internal-token` + 固定 IP 白名单）。
  2. 收敛 `from`：只允许服务端配置的发件人（`config.from`），丢弃客户端传入的 `body.from`。
  3. `GET /api/email` 去掉 `missing` 与 `host`/`port`，只返回 `{ configured: boolean }`。
  4. 收敛收件人白名单（或仅允许配置的 `EMAIL_RECIPIENTS`）。
  5. 加 `withCSRF` + 独立限流档（如 5 次/分钟）。
- **预估工作量**: 1-2 小时

### P0-3　`/api/feedback/export`、`/api/feedback/stats`、`/api/feedback/response` 权限完全依赖客户端可伪造的 `x-user-role` 头

- **位置**:
  - `7zi-frontend/src/app/api/feedback/export/route.ts:23`（`request.headers.get('x-user-role') || 'user'`）、`:36`（`if (userRole !== 'admin')`）
  - `7zi-frontend/src/app/api/feedback/stats/route.ts:23,36`
  - `7zi-frontend/src/app/api/feedback/response/route.ts:36,49`
- **问题**: 这三个接口把"是否管理员"的判定完全交给请求头 `x-user-role`。而：
  - `nginx/nginx.conf` 与 `deploy/docker/nginx.conf` 中 **没有任何** `proxy_set_header x-user-role ...` 或剔除该头的规则（`grep -n "x-user-id\|x-user-role" nginx/nginx.conf deploy/docker/nginx.conf` → 0 命中）——即客户端自带的 `x-user-role: admin` 头会原样透传到 Next.js。
  - `src/proxy.ts` 也没有做该头的清洗。
  - 同理，`src/app/api/users/route.ts:84,118` 和 `src/app/api/projects/route.ts` 用 `x-user-id` 判定数据归属，客户端可任意伪造他人 userId 访问/修改他人数据。
- **影响**: 未认证攻击者只要 `curl -H "x-user-role: admin" https://7zi.com/api/feedback/export` 即可导出**全站用户反馈（含邮箱、描述、URL）CSV**；`/api/feedback/response` 可伪造管理员回复注入内容。`/api/users`、`/api/projects` 存在横向越权（IDOR）。
- **修复建议**:
  1. 在 `nginx` 侧**主动覆盖**（而不是透传）这些头：
     ```nginx
     proxy_set_header x-user-id $http_x_user_id;   # 或直接清空
     proxy_set_header x-user-role "";
     ```
     更稳妥的做法是前端不再信任这些头，改用 `src/lib/auth/api-auth.ts` 的 `authenticateJWT(request)`（`src/lib/auth/api-auth.ts:50+` 已实现，从 `auth-token` cookie 读 JWT）。
  2. 短期兜底：在 `src/proxy.ts` 中对 `/api/*` 强制 `request.headers.delete('x-user-role')` / `delete('x-user-id')`。
  3. `src/app/api/feedback/response/route.ts:67` 的 `adminId`/`adminName` 来自请求体而非会话，需一并改为会话派生。
- **预估工作量**: 2-3 小时（含回归测试）

### P0-4　`workflow-engine` 后端 **无任何鉴权**，且依赖存在 critical 漏洞

- **位置**: `7zi-backend/workflow-engine/server.js`（`grep -n "auth\|token"` → 0 命中；所有 `app.post/get` 无 auth 中间件）；`7zi-backend/workflow-engine/package.json:23-27`
- **问题**:
  1. `workflow-engine/server.js` 暴露 `POST /api/workflows/:id/execute`、`POST /api/workflows/:id/cancel`、`GET /api/workflows`、`GET /api/health` 等，**没有任何身份校验**。其 `HttpExecutor`（`workflow-service/src/engine/executors/HttpExecutor.js`）可发起任意 HTTP 请求 → 构成 SSRF 跳板（内网探测、云元数据 169.254.169.254）。
  2. `npm audit --omit=dev` 结果（`7zi-backend/workflow-engine`）：
     ```
     critical  proxy-addr  IP spoofing via IPv4-mapped IPv6 trust subnet (GHSA-jqcg-44mw-7w3h)
     high      ws         Uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx)
     high      fast-uri   9 advisories: host confusion / path traversal / SSRF via IPv6 normalization
     moderate  qs         DoS + array-limit bypass
     moderate  uuid        missing buffer bounds check
     low       body-parser invalid limit value disables size enforcement
     ```
     `ws` 与 `fast-uri` 均为**直接依赖**（`package.json:25,26` 声明 `ws: ^8.14.0`），`proxy-addr` 是 `express` 传递依赖 → `npm audit fix` 可修。
  3. `workflow-service/src/index.js:29` 起的 CORS 配置在 `CORS_ORIGIN` 缺省时放开到 `*`（`.env.example` 未列出 `CORS_ORIGIN`）。
- **影响**: 若该服务端口被暴露到公网（`docker-compose.prod.yml` 未映射端口，当前看起来只在内网），攻击者可无认证触发任意工作流 → SSRF → 读取云元数据/内网服务；同时 `ws` 未初始化内存泄漏可致进程崩溃。
- **修复建议**:
  1. 给 `workflow-engine/server.js` 加 API Key / JWT 中间件（`7zi-backend/websocket-service/src/index.js` 已有 `API_KEY` 校验模式可复用）。
  2. `HttpExecutor` 增加 SSRF 防护：拒绝私有网段 / 环回 / link-local / 元数据地址，禁用重定向跟随到私网。
  3. 依赖：`npm audit fix`（`ws`/`fast-uri`/`proxy-addr`/`qs`/`body-parser` 均可非破坏性升级）；`uuid` 需升到 ≥11.1.1（`^9.0.0` → `^11.1.1`，破坏性，需改 `import { v4 }` 调用点）。**注意：`7zi-frontend` 用 pnpm + lockfile，勿直接 `npm install fix`。**
  4. `CORS_ORIGIN` 设为显式白名单，默认拒绝。
- **预估工作量**: 4-6 小时（含依赖升级验证）

---

## P1（应在本轮迭代内处理）

### P1-1　`/api/email` 把底层 SMTP 错误原文回显客户端

- **位置**: `7zi-frontend/src/app/api/email/route.ts:203-208`
  ```ts
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 保留底层错误信息（ETIMEDOUT / ECONNREFUSED / Invalid login ...）
    return errorResponse(500, message)
  }
  ```
  另有 `:149-152`：`Failed to load nodemailer on server: ${message}`。
- **问题**: nodemailer 原始 `error.message` 会包含 SMTP 服务器返回的原始文本，典型如 `Invalid login: 535 Authentication credentials invalid`（含认证用户名/域）、`Greeting never received from smtp.internal.corp`（含内网主机名）、`ECONNREFUSED 10.0.x.x:587`（含内网 IP）。
- **修复建议**: 服务端记录完整错误到日志，客户端只返回归类后的错误码（`SMTP_AUTH_FAILED` / `SMTP_TIMEOUT` / `SMTP_UNREACHABLE`）与通用文案。
- **预估工作量**: 30 分钟

### P1-2　`7zi-frontend` 生产依赖存在 1 个 high（braces 栈耗尽 DoS）

- **位置**: `cd 7zi-frontend && pnpm audit --prod`
  ```
  high  braces  vulnerable to stack-exhaustion denial of service  (via micromatch ← fast-glob ← next-pwa)
  Severity: 1 high
  ```
  传导链：`next-pwa` → `fast-glob` → `micromatch` → `braces`。属于构建期/预缓存工具链，但 `next-pwa` 在 `next build` 时执行。
- **修复建议**: `pnpm.overrides` 已存在同类条目，追加 `"braces": ">=2.0.2"`（或 `>=1.1.12`）与 `"micromatch": ">=4.0.8"`；升级 `next-pwa` 到最新主版本。**按要求仅列出，未自动执行。**
- **预估工作量**: 20 分钟（含 lockfile 校验）

### P1-3　`7zi-backend` 三个子服务 `uuid` moderate 漏洞

- **位置**: `7zi-backend/package.json:50`、`7zi-backend/websocket-service/package.json`、`7zi-backend/workflow-service/package.json`（均为 `uuid: ^9.0.0`）
- **问题**: `GHSA-w5hq-g745-h8pq` — uuid <11.1.1 在 v3/v5/v6 传 `buf` 时缺 buffer bounds check。修复需升到 `uuid@14`（semver major），`npm audit fix --force` 会自动改。
- **修复建议**: 手动升 `"uuid": "^11.1.1"`（若代码只用 `v4()`，11.x API 兼容，改动很小），先跑 `npm audit --omit=dev` 确认清零。
- **预估工作量**: 1 小时（含测试）

### P1-4　CSP 与 `CSP_HEADER_DESIGN_20261020.md` 设计稿存在多处差异/缺口

- **位置**: `7zi-frontend/next.config.ts:423-437`（实际） vs `CSP_HEADER_DESIGN_20261020.md:71-114`（设计稿）

  | 项 | 设计稿要求 | 实际 `next.config.ts` | 差异 |
  |---|---|---|---|
  | `script-src` | `'self' 'nonce-{RANDOM}'`（消除 unsafe-inline/eval） | `'self' 'unsafe-inline' https://www.googletagmanager.com` | 仍为 unsafe-inline，未上 nonce 机制（设计稿 Phase 1 未落地） |
  | `frame-ancestors` | `'none'` | `'self'` | 弱于设计稿（可被同站 frame 嵌入） |
  | `block-all-mixed-content` | 必须有 | **缺失** | 缺口 |
  | `upgrade-insecure-requests` | 必须有 | **缺失** | 缺口 |
  | `report-uri` | `/api/security/csp-report` | **缺失**，且该端点**不存在**（`src/app/api/` 下无 `security/` 目录） | 设计稿 Phase 2/3 的闭环缺失，违规无法观测 |
  | `connect-src` | `'self' https://sentry.io wss: https:` | 多了 `https://api.openai.com`、GA | 客户端直连 OpenAI 值得复核（见 P2-4） |
  | nginx 层 CSP | 设计稿第 3 阶段在 nginx 统一下发 | `nginx/nginx.conf:188` 该行**被注释掉** | 双层未统一 |

- **修复建议**:
  1. 短期：把 `block-all-mixed-content`、`upgrade-insecure-requests` 补进 `next.config.ts` 的 CSP；`frame-ancestors` 改 `'none'`（若确需同站嵌套再放宽）。
  2. 中期：实现 `src/app/api/security/csp-report/route.ts` 接收 CSP 违规报告（POST，限流 + 只记不执行），并以 `Content-Security-Policy-Report-Only` 灰度。
  3. 长期：按设计稿引入 nonce（Next.js 16 `proxy.ts` 中间件可为每个响应生成 nonce 并注入 header）。
  4. 明确 CSP 的唯一权威来源（建议 nginx 层，避免 `next.config.ts` 与 nginx 双份漂移）。
- **预估工作量**: 报告端点 1-2 小时；nonce 改造 4-8 小时（需回归 Next 内联脚本）

### P1-5　`src/middleware/auth.middleware.ts` 的签名校验在生产会被静默关闭，且保护路径仅 3 条

- **位置**: `7zi-frontend/src/middleware/auth.middleware.ts:37`（`PROTECTED_PATHS = ['/api/search', '/api/data/import', '/api/data/export']`）、`:51-58`
  ```ts
  if (!SIGNATURE_SECRET) {
    if (process.env.NODE_ENV === 'production') { console.warn(...) }
    return true // Allow in dev, require in production
  }
  ```
- **问题**:
  1. `MIDDLEWARE_SIGNATURE_SECRET` 只在 `7zi-frontend/.env` 中有值（`dev-middleware-signature-secret-32-chars`），**`7zi-frontend/.env.production` 中没有**（已确认 0 命中）→ 生产构建 `SIGNATURE_SECRET` 为空 → 签名校验整体失效，仅剩 `x-user-id` 头存在性检查，而该头客户端可伪造（见 P0-3）。
  2. 该中间件**只保护 3 个路径**，而 `src/app/api` 下有 60+ 个 route；其中大量 route 直接读 `x-user-id`。
  3. `src/proxy.ts` **没有引用** `auth.middleware.ts`（`grep authMiddleware src/proxy.ts` → 0 命中）——该中间件只在 `src/app/api/search/route.ts:8` 和 `src/app/api/data/import/route.ts:14` 被**手动调用**，覆盖面极小。
- **修复建议**:
  1. 在生产配置中强制注入 `MIDDLEWARE_SIGNATURE_SECRET`（≥32 随机字符），且在 `getJWTSecret` 风格的 fail-closed 处理：`production` 下缺失应 `throw` 而非 `return true`。
  2. 把鉴权提升到 `src/proxy.ts` 统一层，按路由分组标注 public/protected/admin，而不是逐个 route 手写。
  3. 逐个 route 收敛到 `src/lib/auth/api-auth.ts` 的 `authenticateJWT`。
- **预估工作量**: 1 天

### P1-6　`Dockerfile.production-optimized` 未排除 `.env.production`，构建镜像内含明文密钥

- **位置**: `7zi-frontend/.dockerignore:38-43`（只排除了 `.env` / `.env.local` / `.env.development.local` / `.env.test.local` / `.env.production.local` / `.env.example`——**`.env.production` 不在列表中**）；`7zi-frontend/Dockerfile.production-optimized:41`（`COPY . .`）
- **问题**: 构建阶段 `COPY . .` 会把 `7zi-frontend/.env.production`（含真实 `JWT_SECRET`）复制进 builder 镜像层。Next.js 构建时会读取 `.env.production`，其中 `NEXT_PUBLIC_*` 变量会被**编译进客户端 bundle**；虽然当前 `NEXT_PUBLIC_*` 列表里没有敏感项，但 `JWT_SECRET` 等非 `NEXT_PUBLIC` 变量在 Next 的 `server` runtime 中会随镜像分发，任何能拉到该镜像的人都能读到。
- **修复建议**: `.dockerignore` 增加 `.env.production`、`.env*.local`、`.env`；Dockerfile 构建期不 `COPY` 任何 env 文件，生产密钥一律运行时由 `docker-compose.prod.yml` 的 `environment:` / `env_file:` 注入。
- **预估工作量**: 15 分钟

### P1-7　WebSocket 服务 `WS_STRICT_AUTH` 未在任何环境模板中定义，生产默认宽松

- **位置**: `7zi-backend/websocket/lib/auth.js`（`authenticateConnection`，`WS_STRICT_AUTH` 控制）、`7zi-backend/.env.example`、`7zi-backend/websocket-service/.env.example`
- **问题**: `grep -rn "WS_STRICT_AUTH"` 在 `7zi-backend/.env.example`、`websocket-service/.env.example`、所有 compose 文件、nginx 配置中**均为 0 命中**——即从未显式配置。默认分支为"演示模式"：接受任意 `userId` 且**签发随机 userId**。生产未显式置 `WS_STRICT_AUTH=true` 即等价于关闭鉴权。
- **修复建议**: 在 `7zi-backend/.env.example` 与 `websocket-service/.env.example` 补 `WS_STRICT_AUTH=true`；生产 `.env` 显式置真；`auth.js` 在 `NODE_ENV==='production'` 时把"演示模式"视为致命错误（fail-closed）。
- **预估工作量**: 1 小时

---

## P2（技术债 / 纵深防御）

### P2-1　前端 `src/lib/monitoring/channels/index.ts` 把服务端凭据读取模块导出到客户端可达的 barrel

- **位置**: `7zi-frontend/src/lib/monitoring/channels/index.ts:36-41`
  ```ts
  export { createSMSChannelFromEnv, SMSAlertChannel } from './sms-alert'
  export { createWebhookChannelFromEnv, WebhookAlertChannel } from './webhook-alert'
  ```
  这两个模块读取 `SMS_GATEWAY_URL` / `SMS_API_KEY` / `SMS_RECIPIENTS_*`（`sms-alert.ts:267-293`）与 `WEBHOOK_URL` / `WEBHOOK_SECRET`（`webhook-alert.ts:220-230`，并会拼成 `Authorization: Bearer`）。
- **可达性**: 经 `src/lib/monitoring/index.ts:75-77` → `src/lib/websocket/core.ts` → `src/lib/websocket-manager.ts` → `src/features/collab/hooks/useCollabWebSocket.ts` → `src/features/collab/index.ts` → 客户端页面 `src/app/collaboration-cursor-demo/page.tsx`（**16 个客户端根**）。
- **当前实际风险**: **低**。实测 `.next/static/` 76 个 chunk 中未出现 `SMS_API_KEY` / `WEBHOOK_SECRET` / `smsConfig` / `createSMSChannelFromEnv` 等字面量——webpack tree-shaking 生效（`sideEffects` 声明 + 具名导出未被使用）。且 `process.env.SMS_API_KEY` 这类非 `NEXT_PUBLIC_` 变量在客户端 bundle 中会被 Next 编译为 `undefined`，不会携带真实值。
- **但**: 这是**典型的"差一点就泄漏"结构**——只要有人写 `import { createSMSChannelFromEnv } from '@/lib/monitoring'` 到任何 `'use client'` 文件并实际调用，行为就会变；也没有 `server-only` 保护标记（`grep -rn "server-only" src/` 仅 3 处注释级提及，**没有 `import 'server-only'` 实际使用**）。
- **修复建议**:
  1. 引入 `server-only` 包（`pnpm add server-only`），在 `sms-alert.ts` / `webhook-alert.ts` / `notification-enhanced.ts` 顶部加 `import 'server-only'`。
  2. 把 `sms-alert` / `webhook-alert` 从 `channels/index.ts` 的 barrel 中移除（参照同文件 `:31-34` 对 email/slack 的既有注释做法），改为按需深路径导入。
  3. 在 `eslint.config.mjs` 增加 `no-restricted-imports` 规则：禁止 `src/**`（除 `src/app/api/**`）导入 `nodemailer`、`sms-alert`、`webhook-alert`、`notification-enhanced`——**这是防止历史 P0-3 回归复发的最有效护栏**。
- **预估工作量**: 2-3 小时

### P2-2　`src/lib/services/notification-enhanced.ts` 同样处于客户端可达图

- **位置**: `7zi-frontend/src/lib/services/notification-enhanced.ts`（读 `RESEND_API_KEY` / `FROM_EMAIL` / `CONTACT_EMAIL`），客户端根 `src/app/notification-demo/enhanced/page.tsx`。
- **当前实际风险**: **低**。该模块目前只在 `.next/server/chunks/...notification-enhanced_ts_*.js` 出现，`.next/static/` 中无命中（demo 页面 import 的是 `import type`，被编译擦除）。
- **风险点**: 一旦 demo 页改成值导入（去掉 `type`），`RESEND_API_KEY` 就会进入客户端编译单元。属于"擦除式安全"（靠 import 语法维持），非常脆弱。
- **修复建议**: 同 P2-1，加 `import 'server-only'`；demo 页面保持 `import type` 并加 eslint 规则锁定。
- **预估工作量**: 30 分钟

### P2-3　`/api/email` 与多个 API 的 `GET` 返回内部元数据

- **位置**: `src/app/api/email/route.ts:222-223`（`host`、`port`）、`:219`（`missing` 环境变量名列表）
- **修复建议**: 见 P0-2 建议 3。
- **预估工作量**: 15 分钟

### P2-4　CSP `connect-src` 放行 `https://api.openai.com`，但代码未在浏览器直连 OpenAI

- **位置**: `7zi-frontend/next.config.ts:430`；`src/lib/audio/STTRouter.ts` 使用 `NEXT_PUBLIC_OPENAI_API_KEY`，`src/lib/audio/speech-to-text.ts` 使用 `NEXT_PUBLIC_STT_API_KEY`。
- **问题**: `NEXT_PUBLIC_*` 前缀意味着这两个 key 一旦配置就会**进客户端 bundle**。当前 `.env` / `.env.production` 中这两个变量均未设置（已确认），且 `src/lib/audio/` 无任何组件引用（`grep -rn "from '@/lib/audio'"` → 0 命中），暂不可达。但这是"下一颗雷"：`NEXT_PUBLIC_OPENAI_API_KEY` 这种命名方式本身是错的。
- **修复建议**: 去掉 `NEXT_PUBLIC_` 前缀改为 `OPENAI_API_KEY` / `STT_API_KEY`（服务端使用）；`connect-src` 移除 `https://api.openai.com`（除非确有浏览器直连需求并改用后端代理）。
- **预估工作量**: 1 小时

### P2-5　`src/lib/middleware/csrf.ts` 的 CSRF 保护几乎未启用

- **位置**: `src/lib/middleware/csrf.ts`（`withCSRF` / `validateCSRFToken` 实现完整，含 HMAC、时间戳、双提交 cookie）；实际使用仅 `src/app/api/auth/register/route.ts`。
- **问题**: `src/app/api` 下 60+ 个写接口（POST/PUT/DELETE）均未启用 CSRF 校验。`src/proxy.ts` 也没有挂载。当前因鉴权主要靠 header（无 cookie 会话）而未直接暴雷，但一旦接入 cookie 会话（`auth-token` cookie 已在 `src/lib/auth/api-auth.ts` 使用），CSRF 缺口会立刻变成可利用漏洞。
- **修复建议**: 在 `src/proxy.ts` 对所有非 GET 的 `/api/*` 统一挂 `withCSRF`；`CSRF_COOKIE_NAME` 建议同时支持 `__Host-` 前缀。
- **预估工作量**: 1 天

### P2-6　`x-user-id` / `x-user-role` 头信任模型分散在多个 route

- **位置**: `grep -rln "x-user-role\|x-user-id" src/app/api --include=route.ts` → 至少 6 个 route（`users`、`projects`、`feedback/export`、`feedback/stats`、`feedback/response`、`data/import` 等）
- **问题**: 每个 route 各自实现、各自 fallback（如 `|| 'user-2' || 'anonymous'`），无统一契约，审计成本高，也是 P0-3 的根因。
- **修复建议**: 收敛到 `src/lib/auth/api-auth.ts` 单一实现 + 显式角色枚举（`src/lib/auth` 已有 `UserRole`），route 只消费 `AuthResult`。
- **预估工作量**: 1-2 天

---

## 已验证为"干净"的项（无需处理）

| 检查项 | 结果 |
|---|---|
| `nodemailer` 引入客户端 | ✅ 干净。`src/` 内 0 处 `import nodemailer`；仅 `src/app/api/email/route.ts:150` 服务端动态 import |
| `.next/static/` 客户端 bundle 含 SMTP/SMS/Webhook/Resend 凭据 | ✅ 干净。76 个 chunk 全量 grep 无命中 |
| `NEXT_PUBLIC_*` 变量含真实密钥 | ✅ 干净。`.env` / `.env.production` 中所有 `NEXT_PUBLIC_*` 均为空或公开值（GA/GTM/Recaptcha site key） |
| 源码硬编码密钥 | ✅ 干净。仅 `src/test/__mocks__/auth.ts` 中的 mock token |
| `src/lib/alerting/smtp-tester.ts` | ✅ 干净。已改为走 `callEmailApi()`（`src/lib/email/api-client.ts`），浏览器安全 |
| `src/lib/monitoring/channels/email-alert.ts` / `slack-alert.ts` | ✅ 干净。均通过 `api-client` 调服务端路由，无 `nodemailer` |
| `src/lib/api/error-handler.ts` `createErrorResponse` | ✅ 干净。仅在 `NODE_ENV !== 'production'` 时附带 `originalMessage`（`:140`），生产不外泄 |
| API route 是否回传 stack trace | ✅ 干净。`grep -rn "stack" src/app/api --include=*.ts` 仅命中 `src/app/api/ai/chat/route.ts:180` 的 `maxTokens` 字段名，非 stack 输出 |
| `pnpm audit --prod`（7zi-frontend） | ⚠️ 1 high（见 P1-2），无 critical |
| `npm audit --omit=dev`（7zi-backend 主包 / websocket-service / workflow-service） | ⚠️ 各 1 moderate uuid（见 P1-3），无 high/critical |
| `npm audit --omit=dev`（7zi-backend/workflow-engine） | ❌ 1 critical + 2 high（见 P0-4） |

---

## 建议执行顺序

1. **立刻（今天）**：P0-1 轮换 `JWT_SECRET` 并清理 git 历史；P0-3 修 nginx 头覆盖（改动最小、收益最大）；P0-2 给 `/api/email` 加鉴权。
2. **本周**：P1-1、P1-2、P1-3、P1-6、P1-7；P0-4 的依赖升级（`ws`/`fast-uri`/`proxy-addr`/`qs`/`body-parser`）。
3. **本迭代内**：P1-4（CSP 补齐 + report 端点）、P1-5（鉴权统一到 proxy 层）。
4. **下迭代**：P2 全部，重点是 P2-1 / P2-3 的 eslint `no-restricted-imports` 护栏——**这是防止 nodemailer 回归的唯一结构性保障**。

## 附：审计方法

- 凭据面：编写 import-graph 脚本（`/tmp/trace2.js`），从全部 `'use client'` 文件出发做传递闭包，标出读取非 `NEXT_PUBLIC_` 环境变量的模块，并逐个反查客户端可达路径；同时对 `.next/static/` 76 个 chunk 做字面量 grep 双重验证。
- API 鉴权面：枚举 `src/app/api/**/route.ts` 全量 grep 鉴权中间件用法，定位到 `src/lib/auth/api-auth.ts`（`authenticateJWT` / `withAuth` / `withAdmin`）与 `src/middleware/auth.middleware.ts`（`authMiddleware`）两套并存的实现，以及 `x-user-*` 头信任模型。
- 依赖面：`pnpm audit --prod`（7zi-frontend，pnpm lockfile）、`npm audit --omit=dev`（7zi-backend 及其 3 个子服务）。**未执行任何自动修复**，避免破坏 lockfile。
- CSP：`next.config.ts:395-450` 与 `CSP_HEADER_DESIGN_20261020.md` 逐项比对，并核对 `nginx/nginx.conf:188`（被注释）与 `src/lib/security/headers.ts`（设计稿实现，但未被 `next.config.ts` 引用——**三处 CSP 定义互不一致**）。
- 密钥暴露面：确认 GitHub 仓库 `songzuo/7zi` 为 public，并通过 `raw.githubusercontent.com` 实际拉取 `7zi-frontend/.env.production` 验证 `JWT_SECRET` 已公开。
