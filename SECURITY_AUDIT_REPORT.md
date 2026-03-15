# 7zi 项目安全审计报告

**审计日期**: 2026-03-15  
**审计范围**: API 端点、认证授权、输入验证、敏感信息处理、文件上传  
**严重级别**: 🔴 高危 | 🟠 中危 | 🟡 低危 | 🔵 信息

---

## 执行摘要

本次安全审计发现了 **18 个安全问题**，其中包括 **3 个高危漏洞**、**7 个中危问题** 和 **8 个低危/信息性问题**。最严重的问题是管理员凭据硬编码、JWT 默认密钥和部分 API 缺乏认证。

### 风险评估

| 严重级别 | 数量 | 修复优先级 |
|----------|------|------------|
| 🔴 高危 | 3 | 立即修复 |
| 🟠 中危 | 7 | 1-2 周内修复 |
| 🟡 低危 | 5 | 下次迭代修复 |
| 🔵 信息 | 3 | 按需改进 |

---

## 🔴 高危漏洞

### 1. 管理员凭据硬编码在环境变量示例中

**文件**: `.env.example`  
**严重级别**: 高危  
**CVSS 评分**: 9.8 (Critical)

**问题描述**:
管理员邮箱和密码在 `.env.example` 中以明文形式展示：
```env
ADMIN_EMAIL=admin@7zi.studio
ADMIN_PASSWORD=your_secure_password_here
```

这可能导致：
1. 开发人员使用示例值作为生产密码
2. 如果 `.env` 文件被意外提交，凭据泄露
3. 攻击者可猜测默认管理员账户

**修复建议**:
1. 删除 `.env.example` 中的密码示例
2. 首次部署时强制要求设置管理员密码
3. 实现密码复杂度检查
4. 添加账户锁定机制（5次失败后锁定）

```typescript
// 建议的实现
if (process.env.ADMIN_PASSWORD === 'your_secure_password_here') {
  throw new Error('SECURITY: Please change ADMIN_PASSWORD in production!');
}
if (process.env.ADMIN_PASSWORD?.length < 16) {
  throw new Error('ADMIN_PASSWORD must be at least 16 characters');
}
```

---

### 2. JWT 密钥使用默认值

**文件**: `src/lib/security/auth.ts:15`  
**严重级别**: 高危  
**CVSS 评分**: 9.1 (Critical)

**问题描述**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-secure-random-string-min-32-chars';
```

虽然有警告日志，但：
1. 程序不会停止运行
2. 警告可能被忽略
3. 攻击者可使用默认密钥伪造 JWT Token

**修复建议**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

// 启动时验证
if (process.env.NODE_ENV === 'production' && 
    JWT_SECRET === 'change-me-to-a-secure-random-string-min-32-chars') {
  throw new Error('SECURITY: Default JWT_SECRET detected in production!');
}
```

---

### 3. 部分敏感 API 端点缺乏认证

**文件**: 多个 API 路由  
**严重级别**: 高危  
**CVSS 评分**: 8.6 (High)

**问题描述**:

| 端点 | 问题 | 风险 |
|------|------|------|
| `POST /api/knowledge/nodes` | 无认证 | 任何人可创建知识节点 |
| `POST /api/knowledge/edges` | 无认证 | 任何人可修改知识图谱 |
| `POST /api/knowledge/inference` | 无认证 | 可消耗服务器资源 |
| `POST /api/comments` | 无认证 | 垃圾评论、XSS 载体 |
| `GET /api/logs` | 认证可选 | 日志信息泄露 |
| `POST /api/tasks` | 认证可选 | 匿名用户可创建任务 |

**修复建议**:
```typescript
// knowledge/nodes/route.ts - POST 应要求认证
export async function POST(request: NextRequest) {
  // 添加认证检查
  const token = extractToken(request);
  if (!token) {
    return authError('Authentication required', request);
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return authError('Invalid token', request);
  }
  // ... 继续处理
}

// 或使用中间件
export const POST = requireAuth(async (request, { user }) => {
  // ...
});
```

---

## 🟠 中危问题

### 4. 登录 API 缺乏账户锁定机制

**文件**: `src/app/api/auth/login/route.ts`  
**严重级别**: 中危

**问题描述**:
虽然有速率限制（5次/分钟），但没有实现账户锁定机制。攻击者可以：
1. 持续尝试密码猜测
2. 绕过 IP 限制（使用代理）
3. 长期暴力破解

**修复建议**:
```typescript
// 添加账户锁定机制
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 分钟

function checkAccountLock(email: string): { locked: boolean; remainingMs?: number } {
  const attempts = loginAttempts.get(email);
  if (!attempts) return { locked: false };
  
  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingMs = attempts.lockedUntil - Date.now();
    if (remainingMs > 0) {
      return { locked: true, remainingMs };
    }
    // 锁定已过期，重置
    loginAttempts.delete(email);
  }
  return { locked: false };
}
```

---

### 5. 评论系统无 XSS 防护

**文件**: `src/app/api/comments/route.ts`  
**严重级别**: 中危

**问题描述**:
评论内容仅验证长度（< 5000），未进行 HTML 转义或净化：
```typescript
content: body.content.trim(), // 无 XSS 防护
```

**修复建议**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// 净化 HTML
const sanitizedContent = DOMPurify.sanitize(body.content, {
  ALLOWED_TAGS: [], // 纯文本，不允许任何 HTML
  ALLOWED_ATTR: [],
});

// 或转义特殊字符
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

---

### 6. 日志查询可能泄露敏感信息

**文件**: `src/app/api/logs/route.ts`  
**严重级别**: 中危

**问题描述**:
日志查询仅"可选"认证，任何人可访问：
```typescript
// 可选认证检查 (查看日志可能需要登录)
const token = extractToken(request);
if (token) {
  const payload = await verifyToken(token);
  // ...
}
// 即使没有 token 也会继续执行查询
```

日志可能包含：
- 用户 ID 和请求路径
- 错误堆栈信息
- 系统内部状态

**修复建议**:
```typescript
// 强制要求认证
const token = extractToken(request);
if (!token) {
  return authError('Authentication required to view logs', request);
}
const payload = await verifyToken(token);
if (!payload) {
  return authError('Invalid token', request);
}

// 非管理员只能查看自己的日志
if (!isAdmin(payload)) {
  query.userId = payload.sub;
}
```

---

### 7. 任务导入 API 缺乏文件大小限制

**文件**: `src/app/api/tasks/import/route.ts`  
**严重级别**: 中危

**问题描述**:
CSV 导入没有明确的文件大小限制，可能导致：
1. 内存耗尽攻击
2. 拒绝服务
3. 超大文件处理超时

**修复建议**:
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 10000; // 最大行数

// 检查文件大小
if (csvContent.length > MAX_FILE_SIZE) {
  return validationError('文件大小不能超过 5MB', 'file', request);
}

// 检查行数
if (lines.length > MAX_ROWS + 1) { // +1 为标题行
  return validationError(`最多导入 ${MAX_ROWS} 条任务`, 'rows', request);
}
```

---

### 8. Content-Security-Policy 允许 unsafe-inline 和 unsafe-eval

**文件**: `src/middleware.ts:20`  
**严重级别**: 中危

**问题描述**:
```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
```

`unsafe-inline` 和 `unsafe-eval` 大大降低了 CSP 的保护效果：
- 允许内联脚本执行
- 允许 eval() 调用
- 增加 XSS 攻击面

**修复建议**:
```typescript
// 使用 nonce 或 hash 代替 unsafe-inline
"script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://plausible.io",

// 或使用 strict-dynamic
"script-src 'self' 'strict-dynamic' 'unsafe-inline' https:",
```

---

### 9. 知识图谱 API 无速率限制

**文件**: `src/app/api/knowledge/nodes/route.ts`  
**严重级别**: 中危

**问题描述**:
知识图谱相关 API 没有速率限制，可能被滥用：
- 创建大量垃圾节点
- 耗尽服务器资源
- 影响其他用户

**修复建议**:
```typescript
import { rateLimit } from '@/lib/middleware';

const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;
  // ... 继续处理
}
```

---

### 10. dangerouslySetInnerHTML 使用需审计

**文件**: `src/components/SEO.tsx`  
**严重级别**: 中危

**问题描述**:
多处使用 `dangerouslySetInnerHTML`，虽然当前使用是安全的（JSON.stringify），但需要确保：
1. 输入始终是可信的
2. 未来不会被修改为接受用户输入

```tsx
dangerouslySetInnerHTML={{
  __html: JSON.stringify(schema),
}}
```

**修复建议**:
1. 添加代码注释说明安全性
2. 对所有 Schema 数据进行类型检查
3. 考虑使用专用组件库

---

## 🟡 低危问题

### 11. 错误消息泄露实现细节

**文件**: 多个 API 文件  
**严重级别**: 低危

**问题描述**:
部分错误消息暴露了内部实现：
```typescript
return NextResponse.json(
  { error: 'Failed to create node', code: 'INTERNAL_ERROR' },
  { status: 500 }
);
```

生产环境应避免返回技术细节。

**修复建议**:
```typescript
// 生产环境返回通用消息
const isDev = process.env.NODE_ENV === 'development';
return NextResponse.json(
  { 
    error: isDev ? error.message : 'An error occurred',
    code: 'INTERNAL_ERROR',
    ...(isDev && { details: error.stack })
  },
  { status: 500 }
);
```

---

### 12. Cookie 安全属性在生产环境需要验证

**文件**: `src/lib/security/auth.ts`  
**严重级别**: 低危

**问题描述**:
```typescript
headers.append(
  'Set-Cookie',
  `${COOKIE_NAME}=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; ...`
);
```

`Secure` 属性要求 HTTPS，开发环境可能失败。需要确保生产环境正确配置。

**修复建议**:
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const secureFlag = isProduction ? 'Secure;' : '';

headers.append(
  'Set-Cookie',
  `${COOKIE_NAME}=${accessToken}; Path=/; HttpOnly; ${secureFlag} SameSite=Strict; ...`
);
```

---

### 13. 缺乏审计日志敏感操作

**文件**: 多处  
**严重级别**: 低危

**问题描述**:
部分敏感操作缺乏详细审计日志，如：
- 知识节点创建/删除
- 评论删除
- 项目成员变更

**修复建议**:
添加一致的审计日志记录：
```typescript
apiLogger.audit('Knowledge node created', {
  nodeId: node.id,
  createdBy: user.id,
  timestamp: new Date().toISOString(),
  ip: request.headers.get('x-forwarded-for'),
});
```

---

### 14. 数据持久化存储无加密

**文件**: `src/lib/store/persistent-store.ts`  
**严重级别**: 低危

**问题描述**:
数据以明文 JSON 文件存储在 `data/` 目录，如果包含敏感信息（如用户数据），可能存在风险。

**修复建议**:
1. 敏感数据加密存储
2. 设置适当的文件权限
3. 定期清理旧数据

---

### 15. 验证码/机器人验证缺失

**文件**: 表单相关 API  
**严重级别**: 低危

**问题描述**:
公开表单（如联系表单、评论）没有验证码保护，可能被自动化脚本滥用。

**修复建议**:
集成 reCAPTCHA 或 hCaptcha：
```typescript
import { verifyRecaptcha } from '@/lib/security/recaptcha';

const isHuman = await verifyRecaptcha(body.recaptchaToken);
if (!isHuman) {
  return badRequest('Please complete the CAPTCHA', request);
}
```

---

## 🔵 信息性问题

### 16. 安全头部配置良好

**正面发现**:
中间件中已配置良好的安全头部：
```typescript
'X-Frame-Options': 'DENY',
'X-XSS-Protection': '1; mode=block',
'X-Content-Type-Options': 'nosniff',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
```

这是良好的安全实践。

---

### 17. CSRF 保护实现完善

**正面发现**:
CSRF 保护实现使用了双重提交 Cookie 模式，并支持签名 Token：
```typescript
export function generateSignedCsrfToken(secret: string): string
export function verifySignedCsrfToken(token: string, secret: string): boolean
```

---

### 18. 速率限制已实现

**正面发现**:
登录 API 已实现速率限制：
```typescript
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 5,
};
```

建议将此保护扩展到其他敏感端点。

---

## 修复优先级路线图

### P0 - 立即修复（1-3 天）
1. 🔴 强制要求 JWT_SECRET 环境变量
2. 🔴 移除默认管理员密码示例
3. 🔴 为知识图谱 API 添加认证

### P1 - 短期修复（1-2 周）
4. 🟠 实现账户锁定机制
5. 🟠 添加评论 XSS 防护
6. 🟠 日志 API 强制认证
7. 🟠 添加文件上传大小限制

### P2 - 中期改进（1 个月）
8. 🟠 改进 CSP 策略
9. 🟠 添加知识图谱 API 速率限制
10. 🟡 改进错误消息处理

### P3 - 长期优化
11. 🟡 添加审计日志
12. 🟡 数据存储加密
13. 🟡 添加验证码保护

---

## 安全测试建议

1. **自动化扫描**: 使用 OWASP ZAP 或 Burp Suite 进行自动化安全扫描
2. **渗透测试**: 定期进行人工渗透测试
3. **依赖审计**: 使用 `npm audit` 定期检查依赖漏洞
4. **代码审查**: 在 PR 流程中添加安全审查清单

---

## 结论

7zi 项目具有良好的安全基础（CSRF 保护、JWT 认证、安全头部），但存在一些关键问题需要立即解决：

1. **认证机制不完整** - 部分敏感 API 缺乏认证保护
2. **默认凭据风险** - JWT 密钥和管理员密码使用默认值
3. **输入验证不足** - XSS 防护和文件大小限制缺失

建议按照优先级路线图逐步修复，并在生产部署前完成所有 P0 和 P1 级别的修复。

---

*审计报告由 AI 安全专家生成 - 2026-03-15*