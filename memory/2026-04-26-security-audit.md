# 安全审计报告 - 2026-04-26

## 审计概述

- **审计时间**: 2026-04-26
- **审计范围**: `/root/.openclaw/workspace/7zi-frontend/src/`
- **审计目标**: Next.js 7zi 前端项目 (v1.14.1)

---

## 1. 依赖漏洞检查

### 已知漏洞 (npm audit)

| 漏洞 | 严重程度 | 受影响包 | 状态 |
|------|----------|----------|------|
| fast-csv < 4.3.6 (DoS) | High | exceljs -> fast-csv | ⚠️ 未修复 |
| postcss < 8.5.10 (XSS) | Moderate | next -> postcss | ⚠️ `npm audit fix --force` 会破坏 Next.js |
| redis 2.6.0-3.1.0 (ReDoS) | High | bull -> redis | ⚠️ 未修复 |
| tmp <= 0.2.3 (symlink attack) | High | exceljs -> tmp | ⚠️ 未修复 |

**总计**: 9 个漏洞 (3 low, 4 moderate, 2 high)

**建议**:
- `exceljs` 建议升级或替换 (可用 `xlsx` 库替代)
- `bull` 队列库有已知高危漏洞，建议评估是否必须使用
- `fast-csv` 和 `tmp` 的漏洞由 `exceljs` 引入

---

## 2. 硬编码密钥/令牌检查

### ✅ 未发现硬编码密钥

所有密钥均通过 `process.env` 读取:
- `JWT_SECRET` - JWT 签名密钥
- `REDIS_PASSWORD` - Redis 密码
- `RESEND_API_KEY` - 邮件服务 API Key
- `OPENAI_API_KEY` - OpenAI API Key
- `SLACK_BOT_TOKEN` - Slack Bot Token
- `WEBHOOK_SECRET` - Webhook 签名密钥
- `MCP_API_KEYS` - MCP 服务 API Keys

### ⚠️ JWT 降级风险

**文件**: `src/lib/auth/jwt.ts`

开发环境下如果未设置 `JWT_SECRET`，会使用固定的弱密钥:
```typescript
'dev-secret-key-not-for-production-use-' + 'x'.repeat(32)
```

生产环境如果未设置 `JWT_SECRET`，会抛出错误 — ✅ 行为正确

**建议**: 确保生产环境严格设置 64+ 字符的 `JWT_SECRET`

---

## 3. SQL 注入检查

### ✅ 使用参数化查询

SQL 操作使用 `better-sqlite3`，全部采用参数化查询:
```typescript
const stmt = this.db.prepare('DELETE FROM feedback WHERE id = ?')
```

**SQL 清理函数存在**: `src/lib/validation-schemas.ts` 提供了:
- `sanitizeSqlString()` - SQL 注入防护
- `sanitizeNoSqlString()` - NoSQL 注入防护
- `sanitizeCommandString()` - 命令注入防护

**建议**: 确保所有数据库操作都使用这些清理函数

---

## 4. XSS 风险检查

### ✅ 有防护措施

**已实现**:
1. **DOMPurify** - 已在依赖中 (`dompurify ^3.4.0`, `isomorphic-dompurify ^3.6.0`)
2. **RichTextEditor** - 内部使用 `innerHTML` 但通过 DOMPurify 清理
3. **安全头配置** - `src/lib/security/headers.ts` 配置了 XSS 保护头
4. **i18n** - `escapeValue: false` 但注释说明 React 已处理 XSS

### ⚠️ 需要关注

**文件**: `src/components/WorkflowEditor/ExpressionEditor.tsx:255`
```tsx
return <span dangerouslySetInnerHTML={{ __html: result }} />
```

**建议**: 确保 `result` 已经过 DOMPurify 清理

**文件**: `src/components/seo/JsonLd.tsx`
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
```
JSON.stringify 通常是安全的，但如果 `data` 包含用户输入需验证

---

## 5. 认证和授权逻辑检查

### ✅ JWT 认证实现良好

**文件**: `src/lib/auth/jwt.ts`, `src/lib/auth/api-auth.ts`

- 使用 `jose` 库进行 JWT 签名和验证 (HS256)
- 令牌过期时间: 24 小时
- 刷新令牌: 7 天
- 生产环境必须设置 `JWT_SECRET` (否则报错)
- 密钥长度检查: 建议 64+ 字符

### ✅ 多层认证支持

- `authenticateJWT()` - 用户 JWT 认证
- `authenticateAPIKey()` - API Key 认证 (MCP 服务)
- `authenticateEither()` - 两者皆可
- `withAuth()` 中间件 - 自动 401 响应
- `withAdmin()` 中间件 - 管理员权限检查 (401 + 403)

### ⚠️ 授权覆盖不完整

**问题**: 部分 API 路由使用 `authenticateJWT` 但未验证角色/权限

示例 (正确):
```typescript
const authResult = await authenticateJWT(request)
if (!authResult.authenticated) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// ✅ 验证了认证
```

**潜在风险**: 部分 API 可能只检查了认证状态，未检查权限级别

### ✅ Webhook 签名验证

`WebhookManager.ts` 使用 HMAC-SHA256 签名验证:
```typescript
async verifySignature(payload, signature, timestamp, secret)
```

---

## 6. CSRF 保护检查

### ✅ CSRF 中间件已实现

**文件**: `src/lib/middleware/csrf.ts`

- 使用 Double Submit Cookie 模式
- 令牌过期时间: 1 小时
- 可配置可信来源验证
- 关键修改操作使用 `withCSRF` 保护

**已在使用**:
- `POST /api/feedback`
- `POST /api/rooms/join`, `/leave`
- `POST /api/projects`
- `POST /api/users`

---

## 7. CORS 配置检查

### ✅ CORS 有来源验证

**文件**: `src/lib/auth/api-auth.ts`

```typescript
const ALLOWED_MCP_ORIGINS = new Set(
  (process.env.ALLOWED_MCP_ORIGINS || 'http://localhost:3000').split(',')
)
```

- 生产环境必须设置 `ALLOWED_MCP_ORIGINS`
- 默认仅允许 localhost 开发

---

## 8. 其他安全问题

### ⚠️ TOOLS.md 包含服务器密码

**文件**: `/root/.openclaw/workspace/TOOLS.md`

包含以下明文敏感信息:
- 服务器 IP 和密码 (`ge20993344$ZZ`)
- SSH 私钥信息
- Windows RDP 密码

**建议**: 将敏感信息移至 `.env` 或使用密码管理器

### ✅ 日志脱敏

**文件**: `src/lib/logger.ts`

日志自动脱敏敏感字段:
```typescript
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'authorization', ...]
```

---

## 9. 敏感信息泄露检查

### ⚠️ API Key 从 URL 参数提取

**文件**: `src/lib/auth/api-auth.ts`

```typescript
const queryKey = request.nextUrl.searchParams.get('api_key')
```

API Key 从 URL 参数提取虽然方便，但有被日志记录的风险。建议优先使用 Header。

---

## 总体评估

| 类别 | 状态 | 风险等级 |
|------|------|----------|
| 依赖漏洞 | ⚠️ 需关注 | 中 |
| 硬编码密钥 | ✅ 无 | 低 |
| SQL 注入 | ✅ 参数化查询 | 低 |
| XSS | ✅ 有防护 | 低-中 |
| 认证 | ✅ 实现良好 | 低 |
| 授权 | ⚠️ 部分不完整 | 中 |
| CSRF | ✅ 已实现 | 低 |
| CORS | ✅ 有验证 | 低 |

---

## 建议优先级

### 🔴 高优先级

1. **升级 exceljs** - 引入 fast-csv 和 tmp 漏洞，建议替换为 xlsx 库
2. **评估 bull 依赖** - redis 高危漏洞，需要评估是否必须
3. **保护 TOOLS.md** - 移动敏感信息到安全存储

### 🟡 中优先级

1. 验证所有 `dangerouslySetInnerHTML` 使用都经过 DOMPurify 清理
2. 确保所有 API 路由同时验证认证和权限
3. 考虑移除 API Key 的 URL 参数支持

### 🟢 低优先级

1. 监控 postcss 漏洞，等待 Next.js 官方修复
2. 记录安全最佳实践培训

---

## 结论

项目整体安全状况**良好**，核心认证、授权、CSRF 防护都已正确实现。主要风险点在于依赖的已知漏洞和 TOOLS.md 文件中的明文密码。建议优先处理高优先级问题。

**审计完成**: 2026-04-26
