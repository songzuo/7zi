# 安全漏洞扫描报告

**项目**: 7zi-frontend  
**扫描日期**: 2026-04-23  
**扫描范围**: src/ 目录 - API routes, components, lib  
**扫描工具**: 静态代码分析 + 手动代码审查

---

## 🔴 严重漏洞 (Critical) - ✅ 已修复

### 1. 硬编码测试凭据 [严重] - ✅ 已修复

**文件**: `src/app/api/auth/route.ts:45-46` 和 `src/features/auth/api/route.ts:42-44`

**问题**: 
- 直接绕过认证，任何人可以用 `admin` / `password123` 登录
- 两个 auth route 文件都有此问题

**修复** (2026-04-23):
- 移除了所有硬编码的 `username === 'admin' && password === 'password123'` 测试凭据
- 认证端点现在返回 501 Not Implemented，直到正确实现
- 记录审计日志以跟踪未授权登录尝试

**验证**:
```bash
grep -rn "password123\|isAuthenticated.*=.*username" src/app/api/auth/route.ts src/features/auth/api/route.ts
# 返回: (空) - 已无硬编码凭据
```

---

## 🟠 高危漏洞 (High)

### 2. API 鉴权缺失 - 健康检查端点

**文件**: `src/app/api/health/route.ts`

**问题**: `/api/health` 端点没有任何认证，可被任何人访问，且返回系统详细信息（内存、CPU、负载等）

**风险**:
- 暴露服务器内部状态给未授权用户
- 可用于针对性的基础设施攻击

**修复建议**:
```typescript
// 添加简单的白名单认证或移除敏感信息
export async function GET(request: Request) {
  // 检查是否来自受信任的监控服务
  const authHeader = request.headers.get('x-health-check-secret')
  if (authHeader !== process.env.HEALTH_CHECK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

### 3. API 鉴权缺失 - 分析和告警端点 - ✅ 部分修复

**文件**: `src/app/api/analytics/*/route.ts`, `src/app/api/alerts/*/route.ts`, `src/app/api/performance/*/route.ts`

**问题**: 以下端点没有 `authenticateJWT` 验证

**已修复** (2026-04-23):
- ✅ `/api/analytics/overview` - 添加认证
- ✅ `/api/analytics/nodes` - 添加认证
- ✅ `/api/analytics/resources` - 添加认证
- ✅ `/api/analytics/anomalies` - 添加认证
- ✅ `/api/analytics/trends` - 添加认证

**待修复**:
- `/api/alerts/history` - 告警历史
- `/api/alerts/rules` - 告警规则
- `/api/performance/*` - 性能统计

**修复建议**: 所有这些端点应该添加认证检查:
```typescript
export async function GET(request: NextRequest) {
  const authResult = await authenticateJWT(request)
  if (!authResult.authenticated) {
    return createUnauthorizedError('Authentication required')
  }
  // ...
}
```

---

## 🟡 中等漏洞 (Medium)

### 4. XSS 风险 - dangerouslySetInnerHTML 使用

**文件**: `src/app/layout.tsx:109,113`

```typescript
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
dangerouslySetInnerHTML={{ __html: getThemeScript() }}
```

**风险**: 
- 如果 `jsonLd` 或 `getThemeScript()` 返回的内容被污染，可导致 XSS
- `getThemeScript()` 执行可能引入恶意代码

**修复建议**:
1. 对 `jsonLd` 进行严格验证
2. 确保 `getThemeScript()` 只返回可信内容
3. 考虑使用 React 的子元素代替 dangerouslySetInnerHTML

### 5. 搜索端点缺少输入验证

**文件**: `src/app/api/search/route.ts:52`

```typescript
const sanitizedQuery = validationResult.data.query.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').trim()
```

**问题**: 虽然有 sanitization，但 regex 可能被绕过

**修复建议**: 使用更严格的验证 schema (zod)

---

## 🟢 低风险项 (Low)

### 6. PWA VAPID 密钥回退到空字符串

**文件**: `src/app/api/pwa/route.ts:16-17`

```typescript
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
```

**风险**: 如果环境变量未设置，`web-push` 可能行为异常

**建议**: 在启动时验证 VAPID 密钥是否正确配置

### 7. API 路径信息泄露

**文件**: 多个 API routes

**问题**: 多个 API 返回详细的错误堆栈或内部路径信息

**建议**: 在生产环境中禁用详细错误信息

---

## ✅ 安全最佳实践 (已正确实现)

| 项目 | 状态 | 说明 |
|------|------|------|
| CSRF 保护 | ✅ | `withCSRF` 中间件正确应用于 POST/PUT/PATCH/DELETE |
| 速率限制 | ✅ | `withRateLimit` 应用于敏感端点 (auth, feedback) |
| 密码强度验证 | ✅ | `src/lib/auth.ts` 实现了强密码策略 |
| SQL 注入防护 | ✅ | 使用 `better-sqlite3` 的 prepared statements |
| HTML 清理 | ✅ | `sanitizeHtml` 在 user-generated content 中使用 |
| JWT 验证 | ✅ | `authenticateJWT` 在受保护端点正确实现 |
| 输入验证 | ✅ | 使用 Zod schemas 进行验证 |
| 日志敏感字段过滤 | ✅ | `src/lib/logger.ts:56-59` 过滤 password, token, secret |

---

## 📋 修复优先级

1. **立即修复**: 移除 `src/app/api/auth/route.ts` 中的硬编码凭据
2. **24小时内**: 为 `/api/health`, `/api/analytics/*`, `/api/alerts/*`, `/api/performance/*` 添加认证
3. **本周内**: 检查 `dangerouslySetInnerHTML` 的内容来源
4. **计划中**: 增强搜索输入验证

---

## 🔧 建议的安全增强

1. **实现全局认证中间件**: 为所有 `/api/*` 端点添加统一的认证检查
2. **环境变量验证**: 启动时检查必需的环境变量是否设置
3. **安全头**: 添加 CSP, X-Content-Type-Options, X-Frame-Options 等安全头
4. **定期密钥轮换**: 实现 JWT 密钥定期轮换机制