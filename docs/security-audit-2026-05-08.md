# 安全审计报告

**项目:** 7zi-frontend  
**版本:** v1.0.0  
**技术栈:** Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI  
**审计时间:** 2026-05-08  
**审计人:** 🛡️ 系统管理员

---

## 依赖安全

### 发现的问题

| 严重程度 | 包名 | 漏洞描述 | 建议 |
|---------|------|----------|------|
| **🟡 中危** | `postcss` | 存在已知漏洞 (GHSA-qx2v-qp2m-jg93)，无修复版本 | 持续监控，等待上游修复 |
| **🔴 高危** | `protobufjs` | 存在严重漏洞 (GHSA-xq3m-2v4x-88gg)，无修复版本 | **需重点关注** - protobufjs 通常由 `socket.io` 等依赖间接引入，建议确认传递依赖链并评估是否能替换 |
| ✅ **通过** | `exceljs` | 使用 exceljs 替代了有安全漏洞的 xlsx 包，处理正确 | - |
| ✅ **通过** | `nodemailer` | 使用 v8.x（较新版本），无已知漏洞 | - |

### 额外说明
- `protobufjs` 高危漏洞通过 socket.io-client 间接引入，需评估是否能升级 socket.io-client 或其传递依赖
- 已配置 `pnpm.overrides` 强制 `serialize-javascript >= 7.0.5`，防止序列化漏洞
- `better-sqlite3`、`nodemailer`、`web-push` 等敏感库使用需确保服务端环境隔离

---

## API 安全

### 发现的问题

#### 1. 🔴 高危 - 认证系统未实现
**位置:** `/api/auth/route.ts`

**问题描述:**
- `POST /api/auth/login`、`PUT /api/auth/register`、`PATCH /api/auth/reset-password` 均返回 501 "Authentication system not yet configured"
- 任何人都可以调用这些端点，认证功能形同虚设
- 代码中虽有审计日志记录，但无实际认证逻辑

**建议:** 尽快实现真正的认证逻辑（密码哈希、数据库查询、JWT签发）

---

#### 2. 🟡 中危 - 搜索端点缺少数据库查询安全隔离
**位置:** `/api/search/route.ts`

**问题描述:**
- 搜索参数有基本的字符串清理，但搜索功能实际为 mock 数据
- 如果后续接入真实数据库，需防止 NoSQL 注入（如使用 MongoDB）

**建议:**
- 确认最终使用的搜索实现（Elasticsearch/MongoDB Full Text）
- 确保搜索查询使用参数化查询，禁止字符串拼接

---

#### 3. 🟡 中危 - 数据导入端点角色权限未验证
**位置:** `/api/data/import/route.ts`

**问题描述:**
- 虽然检查了 `x-user-role` header，但仅验证了用户是否已认证
- 未验证用户是否有管理员权限或数据导入权限
- `TODO` 注释表明导入逻辑尚未实现

**建议:** 实现完整的 RBAC 权限检查

---

#### 4. ✅ 通过 - CSRF 保护
**位置:** `/api/csrf/token/route.ts`, `/lib/middleware/csrf.ts`

- CSRF token 端点正常，敏感操作（注册）使用了 `withCSRF` 中间件
- 登录端点正确地跳过了 CSRF（因无会话存在）

---

#### 5. ✅ 通过 - MCP API Key 认证
**位置:** `/api/mcp/rpc/route.ts`

- JSON-RPC 请求使用 API Key 认证
- 批量请求处理正确
- JSON-RPC 错误码使用标准定义（-32700, -32600, -32601 等）

---

#### 6. ✅ 通过 - 请求签名防篡改
**位置:** `/middleware/auth.middleware.ts`

- 使用 HMAC-SHA256 + timing-safe 比较，防止 timing attack
- 时间戳校验防止 replay attack（5分钟窗口）
- `NODE_ENV=production` 时无密钥会告警

---

## 配置安全

### 发现的问题

#### 1. 🔴 高危 - .env.production 包含真实 JWT_SECRET
**位置:** `/root/.openclaw/workspace/7zi-frontend/.env.production`

**问题描述:**
- JWT_SECRET 已硬编码为真实值：`8861d60e34463a2e0feafb90a6e249edaa1322c7fb7361f87cd1d227adbf4d8ddf84c27814c5069bea57595df00c7484fb76f3fa7b2b33ba72fc583047a2047f`
- SESSION_SECRET 仍为占位符：`your-session-secret-change-this-at-least-32-characters`
- SMTP_PASSWORD 仍为占位符：`your-smtp-password`

**风险:**
- 如果 .env.production 被提交到 GitHub 或泄露，所有 JWT token 可被伪造
- SESSION_SECRET 过弱或使用默认值可能被预测

**建议:**
- ✅ 从未将 .env.production 提交到版本控制
- ✅ 将 `.env.production` 添加到 .gitignore
- 生产环境使用真正随机的 SESSION_SECRET 和 SMTP_PASSWORD

---

#### 2. 🟡 中危 - 远程图片域名白名单过于宽松
**位置:** `next.config.ts`

```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**',  // 允许所有 HTTPS 域名
  },
],
```

**风险:** 可能允许从恶意域名加载图片

**建议:** 生产环境应限制为具体可信的 CDN 域名

---

#### 3. ✅ 通过 - Content Security Policy 配置良好
**位置:** `next.config.ts` headers

- `script-src 'self'` 禁止内联脚本
- `frame-src 'none'` 防止 clickjacking
- `object-src 'none'` 防止 Flash 类型攻击
- 未使用 `unsafe-eval`（注释明确说明已移除）

---

#### 4. ✅ 通过 - 安全响应头完整
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` 启用（63072000s）
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` 禁用摄像头、麦克风、地理位置

---

#### 5. ✅ 通过 - poweredByHeader 已禁用
```typescript
poweredByHeader: false,
```
防止攻击者通过 `X-Powered-By: Next.js` 识别服务端

---

#### 6. ✅ 通过 - next.config.ts 构建配置
- `typescript.ignoreBuildErrors: true` - ⚠️ 可能掩盖类型错误，建议仅开发环境使用
- 图片优化配置了 `contentSecurityPolicy`

---

## 总体评估

### 🟡 中危 (Medium Risk)

### 关键发现总结

| 类别 | 高危 | 中危 | 低危 | 通过 |
|------|------|------|------|------|
| 依赖安全 | 1 | 1 | 0 | 3 |
| API 安全 | 1 | 2 | 0 | 3 |
| 配置安全 | 1 | 1 | 0 | 4 |
| **合计** | **3** | **4** | **0** | **10** |

### 紧急处理项（24-48小时内）

1. **🔴 .env.production 密钥泄露风险**  
   - 立即检查该文件是否在 Git 历史或任何共享位置暴露
   - 如果已泄露，立即轮换 JWT_SECRET
   - 将 SESSION_SECRET 替换为真实随机值

2. **🔴 认证系统形同虚设**  
   - 尽快实现真正的用户认证逻辑
   - 在此之前，考虑临时关闭 auth 端点或返回 503

3. **🔴 protobufjs 高危漏洞**  
   - 确认漏洞是否通过 socket.io-client 实际触发（客户端漏洞）
   - 评估是否能升级 socket.io-client 版本

### 中期改进项（1-2周内）

1. 数据导入端点添加完整的 RBAC 权限验证
2. 搜索功能接入真实数据库时，使用参数化查询防止注入
3. 收紧 `remotePatterns` 图片域名白名单
4. 将 `typescript.ignoreBuildErrors` 改为仅开发环境生效

### 安全做得好的方面

- ✅ CSP 配置严格，`unsafe-eval` 已移除
- ✅ 完整的安全响应头配置
- ✅ CSRF 保护机制正确实现
- ✅ 使用 exceljs 替代有漏洞的 xlsx
- ✅ MCP API 使用 API Key + CORS 控制
- ✅ 请求签名防篡改机制完善
- ✅ pnpm overrides 强制序列化安全版本

---

*审计完成。建议优先处理上述 3 个紧急项。*
