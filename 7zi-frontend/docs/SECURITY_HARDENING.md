# 安全加固文档

**项目**: 7zi-frontend
**版本**: 1.0.0
**更新日期**: 2026-03-28
**责任者**: 系统管理员

---

## 目录

1. [安全加固概述](#安全加固概述)
2. [依赖漏洞修复](#依赖漏洞修复)
3. [API 端点认证保护](#api-端点认证保护)
4. [安全响应头配置](#安全响应头配置)
5. [XSS 防护增强](#xss-防护增强)
6. [环境变量配置](#环境变量配置)
7. [安全检查清单](#安全检查清单)
8. [安全事件响应](#安全事件响应)

---

## 安全加固概述

### 已实施的安全措施

本项目的安全加固方案基于以下原则：

1. **深度防御** - 在多个层级实施安全控制
2. **最小权限** - 只授予必要的权限
3. **安全默认** - 默认配置为安全状态
4. **持续监控** - 记录和审计所有安全相关事件

### 安全架构

```
┌─────────────────────────────────────────────────────┐
│                   用户请求                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  中间件层 (middleware.ts)                           │
│  • 速率限制                                          │
│  • 安全响应头 (CSP, HSTS, X-Frame-Options)          │
│  • IP 白名单/黑名单                                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  认证层 (src/lib/auth.ts)                           │
│  • JWT 令牌验证                                      │
│  • 会话管理                                          │
│  • 权限检查                                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  验证层 (src/lib/validation-schemas.ts)              │
│  • 输入验证 (Zod)                                    │
│  • SQL 注入防护                                       │
│  • NoSQL 注入防护                                    │
│  • XSS 防护                                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  业务逻辑层                                          │
│  • 业务规则执行                                       │
│  • 数据操作                                          │
└─────────────────────────────────────────────────────┘
```

---

## 依赖漏洞修复

### 1. xlsx 包原型污染漏洞

#### 状态

**✅ 无风险**

经过检查，当前项目 (`package.json`) 中未安装 `xlsx` 包。该漏洞报告可能为误报或来自其他项目。

#### 原型污染防护措施

即使未使用 `xlsx`，项目已实施通用防护措施以防范原型污染：

##### 1.1 输入验证

```typescript
// src/lib/validation-schemas.ts
import { z } from 'zod'

// 使用 Zod 进行严格的类型验证
export const safeObjectSchema = z
  .object({
    // 明确定义所有允许的字段
    name: z.string(),
    value: z.number(),
    // ...
  })
  .passthrough(false) // 拒绝未定义的字段
```

##### 1.2 Object 原型保护

```typescript
// 在应用启动时执行 (src/lib/security/prototype-pollution-guard.ts)
export function protectPrototype() {
  // 冻结 Object.prototype
  Object.freeze(Object.prototype)

  // 监控原型链污染
  const originalObjectCreate = Object.create
  Object.create = function (proto: object | null, propertiesObject?: PropertyDescriptorMap) {
    if (proto && proto !== Object.prototype && typeof proto === 'object') {
      // 检查是否有可疑属性
      const suspiciousProps = ['__proto__', 'constructor', 'prototype']
      for (const prop of suspiciousProps) {
        if (prop in proto) {
          console.warn(`[Security] Attempted prototype pollution via property: ${prop}`)
        }
      }
    }
    return originalObjectCreate.call(this, proto, propertiesObject)
  }
}

// 在 src/app/layout.tsx 或入口文件中调用
if (typeof window !== 'undefined') {
  protectPrototype()
}
```

##### 1.3 JSON 解析保护

```typescript
// src/lib/security/json-parser.ts
export function safeParseJSON<T>(json: string): T | null {
  try {
    const parsed = JSON.parse(json)

    // 检查原型污染特征
    if (parsed && typeof parsed === 'object') {
      const suspiciousKeys = ['__proto__', 'constructor', 'prototype']
      for (const key of suspiciousKeys) {
        if (key in parsed) {
          console.warn(`[Security] Detected potential prototype pollution in JSON: ${key}`)
          delete parsed[key]
        }
      }
    }

    return parsed as T
  } catch (error) {
    console.error('[Security] JSON parse error:', error)
    return null
  }
}
```

#### 未来使用 xlsx 时的安全建议

如果未来需要使用 `xlsx` 或类似库处理 Excel 文件：

1. **使用安全版本**

   ```bash
   npm install xlsx@latest --save-exact
   npm audit
   ```

2. **沙箱化处理**

   ```typescript
   import * as XLSX from 'xlsx'

   export function safelyParseExcel(buffer: Buffer) {
     // 限制文件大小 (最大 10MB)
     const MAX_SIZE = 10 * 1024 * 1024
     if (buffer.length > MAX_SIZE) {
       throw new Error('File too large')
     }

     // 创建干净的工作簿对象
     const workbook = XLSX.read(buffer, {
       type: 'buffer',
       cellFormula: false, // 禁用公式
       cellHTML: false, // 禁用 HTML
       cellNF: false, // 禁用数字格式
       cellDates: false, // 禁用日期解析
     })

     // 白名单验证
     const allowedSheets = ['Sheet1', 'Data']
     const sheets = workbook.SheetNames.filter(name => allowedSheets.includes(name))

     // 只处理白名单中的工作表
     const data = sheets.map(sheetName => {
       const sheet = workbook.Sheets[sheetName]
       return XLSX.utils.sheet_to_json(sheet, {
         header: ['id', 'name', 'value'], // 限制列
         raw: false, // 不保留原始格式
         defval: null, // 默认值
       })
     })

     return data
   }
   ```

---

## API 端点认证保护

### 需要认证的端点

根据任务要求，以下端点需要认证保护：

| 端点路径           | 认证要求 | 状态      | 实现方式       |
| ------------------ | -------- | --------- | -------------- |
| `/api/data/import` | 必须认证 | 🟡 待创建 | JWT 验证中间件 |
| `/api/feedback`    | 必须认证 | 🟡 待创建 | JWT 验证中间件 |
| `/api/search`      | 必须认证 | 🟡 待创建 | JWT 验证中间件 |

### 1. 创建认证中间件

```typescript
// src/middleware/auth.middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '../lib/auth/jwt'

/**
 * 需要认证的路径列表
 */
const AUTHENTICATED_PATHS = ['/api/data/import', '/api/feedback', '/api/search']

/**
 * 跳过认证的路径
 */
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/reset-password']

/**
 * 检查路径是否需要认证
 */
function requiresAuth(pathname: string): boolean {
  return AUTHENTICATED_PATHS.some(path => pathname.startsWith(path))
}

/**
 * 检查路径是否公开
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

/**
 * 验证 JWT 令牌
 */
function verifyAuthToken(request: NextRequest): { userId: string } | null {
  // 从 Cookie 获取令牌
  const token = request.cookies.get('auth-token')?.value

  // 从 Authorization 头获取令牌
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  const jwtToken = token || bearerToken

  if (!jwtToken) {
    return null
  }

  try {
    const payload = verifyJWT(jwtToken)
    return { userId: payload.userId }
  } catch (error) {
    console.error('[Auth] Token verification failed:', error)
    return null
  }
}

/**
 * 认证中间件
 */
export function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公开路径不需要认证
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // 检查是否需要认证
  if (requiresAuth(pathname)) {
    const user = verifyAuthToken(request)

    if (!user) {
      // 未认证：返回 401
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: '请先登录',
        },
        { status: 401 }
      )
    }

    // 添加用户信息到请求头（供后续使用）
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.userId)
    return response
  }

  // 其他路径正常处理
  return NextResponse.next()
}
```

### 2. 创建 JWT 工具函数

```typescript
// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export interface JWTPayload {
  userId: string
  username: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 生成 JWT 令牌
 */
export async function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)

  return token
}

/**
 * 验证 JWT 令牌
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * 解析 JWT 令牌（不验证签名，仅用于调试）
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    return payload
  } catch (error) {
    return null
  }
}
```

### 3. 创建认证保护的端点

```typescript
// src/app/api/data/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '../../../middleware/auth.middleware'
import { validateAndSanitizeBody } from '../../../lib/validation-schemas'
import { z } from 'zod'

/**
 * 导入数据验证模式
 */
const importDataSchema = z.object({
  data: z.array(z.record(z.unknown())).max(1000, '单次最多导入 1000 条数据'),
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
})

/**
 * POST /api/data/import - 导入数据（需要认证）
 */
export async function POST(request: NextRequest) {
  // 验证认证
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')

  try {
    const body = await request.json()
    const validationResult = await validateAndSanitizeBody(body, importDataSchema, 'nosql')

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { data, format } = validationResult.data

    // TODO: 实际的数据导入逻辑
    // 1. 验证数据格式
    // 2. 检查权限
    // 3. 导入数据库
    // 4. 记录审计日志

    return NextResponse.json({
      success: true,
      message: `成功导入 ${data.length} 条数据`,
      imported: data.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Import Failed',
        message: '数据导入失败',
      },
      { status: 500 }
    )
  }
}
```

```typescript
// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '../../middleware/auth.middleware'
import { validateAndSanitizeBody } from '../../lib/validation-schemas'
import { z } from 'zod'

/**
 * 反馈验证模式
 */
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  url: z.string().url().optional(),
  email: z.string().email().optional(),
  attachments: z.array(z.string()).max(5).optional(),
})

/**
 * POST /api/feedback - 提交反馈（需要认证）
 */
export async function POST(request: NextRequest) {
  // 验证认证
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')

  try {
    const body = await request.json()
    const validationResult = await validateAndSanitizeBody(body, feedbackSchema, 'html')

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          errors: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { type, title, description, url, email, attachments } = validationResult.data

    // TODO: 保存反馈到数据库
    // 1. 清理用户输入
    // 2. 保存到反馈表
    // 3. 发送通知

    return NextResponse.json(
      {
        success: true,
        message: '感谢您的反馈！我们会尽快处理。',
        feedbackId: `FB-${Date.now()}`,
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Submission Failed',
        message: '反馈提交失败',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback - 获取用户反馈列表（需要认证）
 */
export async function GET(request: NextRequest) {
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // TODO: 查询用户的反馈列表

  return NextResponse.json({
    success: true,
    feedbacks: [],
    total: 0,
    page,
    limit,
  })
}
```

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '../../middleware/auth.middleware'
import { searchSchema } from '../../lib/validation-schemas'

/**
 * GET /api/search - 搜索功能（需要认证）
 */
export async function GET(request: NextRequest) {
  // 验证认证
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  // 验证搜索参数
  const validationResult = searchSchema.safeParse({
    query,
    page,
    limit,
  })

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        errors: validationResult.error.errors,
      },
      { status: 400 }
    )
  }

  // 防止搜索注入攻击
  const sanitizedQuery = validationResult.data.query.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').trim()

  if (sanitizedQuery.length === 0) {
    return NextResponse.json(
      {
        error: 'Invalid Query',
        message: '搜索关键词无效',
      },
      { status: 400 }
    )
  }

  // TODO: 执行搜索
  // 1. 使用全文搜索
  // 2. 返回结果
  // 3. 记录搜索日志

  return NextResponse.json({
    success: true,
    query: sanitizedQuery,
    results: [],
    total: 0,
    page,
    limit,
  })
}
```

---

## 安全响应头配置

### 已实施的安全响应头

项目已在 `src/middleware.ts` 中配置了完整的安全响应头。

```typescript
// src/middleware.ts (摘要)
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // HSTS (仅生产环境)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}
```

### 安全响应头说明

| 响应头                    | 作用                   | 当前值                          | 推荐值           |
| ------------------------- | ---------------------- | ------------------------------- | ---------------- |
| Content-Security-Policy   | 防止 XSS、数据注入攻击 | `'self'` 等                     | ✅ 已配置        |
| X-Frame-Options           | 防止点击劫持           | DENY                            | ✅ 已配置        |
| X-Content-Type-Options    | 防止 MIME 类型混淆     | nosniff                         | ✅ 已配置        |
| X-XSS-Protection          | 启用浏览器 XSS 过滤    | 1; mode=block                   | ✅ 已配置        |
| Referrer-Policy           | 控制 Referer 信息      | strict-origin-when-cross-origin | ✅ 已配置        |
| Permissions-Policy        | 禁用浏览器功能         | geolocation=() 等               | ✅ 已配置        |
| Strict-Transport-Security | 强制 HTTPS             | max-age=31536000                | ✅ 已配置 (生产) |

### CSP 策略增强建议

对于生产环境，建议使用更严格的 CSP：

```typescript
// 生产环境 CSP
const productionCsp = [
  "default-src 'self'",
  "script-src 'self' 'sha256-xyz...' 'sha256-abc...'", // 使用 nonce 或 hash
  "style-src 'self' 'nonce-xyz...'",
  "img-src 'self' data: https://cdn.example.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.example.com",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  'report-uri https://csp-report.example.com',
].join('; ')
```

---

## XSS 防护增强

### 1. 输入验证和清理

项目已在 `src/lib/validation-schemas.ts` 中实现了 XSS 防护：

```typescript
/**
 * 防止 XSS：清理 HTML 内容
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}
```

### 2. 使用 DOMPurify 增强 XSS 防护

```bash
npm install dompurify @types/dompurify
```

```typescript
// src/lib/security/html-sanitizer.ts
import DOMPurify from 'dompurify'

/**
 * 安全的 HTML 清理器
 */
export function sanitizeHtmlAdvanced(input: string): string {
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  }

  return DOMPurify.sanitize(input, config)
}

/**
 * 严格模式清理（只允许纯文本）
 */
export function sanitizeStrict(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}
```

### 3. React 组件安全实践

```typescript
// 使用 React 的自动转义
export function SafeHtmlComponent({ content }: { content: string }) {
  // ❌ 危险：不要使用
  // return <div dangerouslySetInnerHTML={{ __html: content }} />;

  // ✅ 安全：使用 DOMPurify
  const sanitizedContent = useMemo(
    () => sanitizeHtmlAdvanced(content),
    [content]
  );

  // 如果允许 HTML，必须先清理
  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
}

// 更好的方式：使用纯文本
export function TextComponent({ content }: { content: string }) {
  return <div>{content}</div>;  // React 自动转义
}
```

### 4. URL 参数安全处理

```typescript
// src/lib/security/url-sanitizer.ts
import { URL } from 'url'

/**
 * 安全的 URL 验证
 */
export function validateUrl(input: string): boolean {
  try {
    const url = new URL(input)

    // 只允许 http 和 https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    // 检查是否包含 javascript:
    if (url.href.toLowerCase().includes('javascript:')) {
      return false
    }

    // 检查数据 URL（可能用于 XSS）
    if (url.protocol === 'data:') {
      return false
    }

    // 白名单域名
    const allowedDomains = ['example.com', 'trusted.com']
    if (allowedDomains.includes(url.hostname)) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * 安全的重定向
 */
export function safeRedirect(url: string, fallback: string = '/') {
  if (validateUrl(url)) {
    return url
  }
  return fallback
}
```

---

## 环境变量配置

### 创建 .env.example

```bash
# 应用配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# 安全配置 - 🔒 重要！
# ==========================================

# JWT 密钥 - 用于生成和验证 JWT 令牌
# ⚠️ 生产环境必须使用强随机密钥！
# 生成方法: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-secret-key-change-this-in-production-at-least-64-chars

# JWT 配置
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ==========================================
# 数据库配置
# ==========================================

# 数据库 URL（使用环境变量避免硬编码）
DATABASE_URL=mongodb://localhost:27017/7zi
# DATABASE_URL=postgresql://user:password@localhost:5432/7zi

# ==========================================
# Redis 配置（可选，用于速率限制）
# ==========================================

# Redis 连接 URL
REDIS_URL=redis://localhost:6379

# ==========================================
# CORS 配置
# ==========================================

# 允许的源（逗号分隔）
ALLOWED_ORIGINS=http://localhost:3000,https://7zi.com

# ==========================================
# 会话配置
# ==========================================

# 会话密钥（用于 Cookie 签名）
SESSION_SECRET=your-session-secret-change-this

# ==========================================
# 速率限制配置
# ==========================================

# 全局速率限制（请求/分钟）
RATE_LIMIT_GLOBAL=100

# API 速率限制
RATE_LIMIT_API=60

# 登录速率限制
RATE_LIMIT_LOGIN=5

# ==========================================
# 邮件配置（可选）
# ==========================================

# SMTP 服务器
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-smtp-password

# ==========================================
# 监控和日志
# ==========================================

# Sentry DSN（错误追踪）
SENTRY_DSN=

# 日志级别 (debug, info, warn, error)
LOG_LEVEL=info

# ==========================================
# 第三方服务（可选）
# ==========================================

# Analytics
NEXT_PUBLIC_GA_ID=

# Recaptcha
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# ==========================================
# 文件上传配置
# ==========================================

# 最大文件大小（字节）
MAX_FILE_SIZE=10485760

# 允许的文件类型
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# ==========================================
# 安全模式
# ==========================================

# 启用安全模式（额外的安全检查）
SECURITY_MODE=true

# 启用审计日志
AUDIT_LOG_ENABLED=true
```

### 环境变量验证

```typescript
// src/lib/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // 安全配置
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // 数据库
  DATABASE_URL: z.string(),

  // CORS
  ALLOWED_ORIGINS: z.string().transform(val => val.split(',')),

  // 安全模式
  SECURITY_MODE: z.coerce.boolean().default(true),
  AUDIT_LOG_ENABLED: z.coerce.boolean().default(true),
})

export const env = envSchema.parse(process.env)
```

---

## 安全检查清单

### 部署前检查

#### 🔒 认证和授权

- [ ] 所有需要认证的 API 端点都实施了 JWT 验证
- [ ] 密码使用 bcrypt 或 argon2 哈希存储
- [ ] JWT 密钥使用强随机值（至少 64 字符）
- [ ] 会话超时配置合理（24 小时或更短）
- [ ] 实现了权限检查（RBAC）
- [ ] 敏感操作需要重新认证

#### 🛡️ 输入验证

- [ ] 所有用户输入都经过验证（Zod schema）
- [ ] SQL 查询使用参数化查询
- [ ] NoSQL 查询使用白名单验证
- [ ] 文件上传验证类型和大小
- [ ] URL 参数清理和验证

#### 🚫 防护措施

- [ ] CSP 策略正确配置
- [ ] HSTS 已启用（生产环境）
- [ ] XSS 防护已实施
- [ ] CSRF 令牌已启用
- [ ] 速率限制已配置
- [ ] 原型污染防护已实施

#### 🔐 数据安全

- [ ] 敏感数据加密存储
- [ ] 数据库连接使用 SSL
- [ ] API 密钥不提交到版本控制
- [ ] 环境变量正确配置
- [ ] 日志不记录敏感信息

#### 📝 审计和监控

- [ ] 重要操作记录审计日志
- [ ] 登录失败监控和告警
- [ ] 异常活动检测
- [ ] 日志定期备份
- [ ] 错误追踪集成（Sentry 等）

### 定期安全检查

| 检查项             | 频率   | 责任人   |
| ------------------ | ------ | -------- |
| 依赖更新和漏洞扫描 | 每周   | 开发     |
| 代码安全审查       | 每月   | 安全主管 |
| 渗透测试           | 每季度 | 第三方   |
| 安全配置审查       | 每季度 | DevOps   |
| 员工安全培训       | 每半年 | HR + IT  |

---

## 安全事件响应

### 事件分类

| 严重级别   | 描述                 | 响应时间  |
| ---------- | -------------------- | --------- |
| 🚨 P0 严重 | 数据泄露、系统入侵   | < 1 小时  |
| ⚠️ P1 高   | 未授权访问、账户被盗 | < 4 小时  |
| ⚡ P2 中   | 异常活动、可疑行为   | < 24 小时 |
| 📋 P3 低   | 潜在风险、配置问题   | < 1 周    |

### 响应流程

```
1. 发现和报告
   └─ 监控告警 / 用户报告 / 审计日志

2. 确认和评估
   ├─ 验证事件真实性
   ├─ 评估影响范围
   └─ 确定严重级别

3. 遏制和控制
   ├─ 隔离受影响系统
   ├─ 停止受损服务
   └─ 收集证据

4. 根除和修复
   ├─ 修复漏洞
   ├─ 加强防护
   └─ 验证修复

5. 恢复和验证
   ├─ 恢复服务
   ├─ 数据恢复
   └─ 功能验证

6. 总结和改进
   ├─ 事件报告
   ├─ 流程改进
   └─ 经验分享
```

### 紧急联系

| 角色          | 姓名 | 联系方式 | 响应时间 |
| ------------- | ---- | -------- | -------- |
| 安全主管      | -    | -        | 24/7     |
| DevOps 负责人 | -    | -        | 24/7     |
| 开发负责人    | -    | -        | 工作时间 |

---

## 附录

### A. 安全工具推荐

```bash
# 依赖漏洞扫描
npm audit
npm audit fix

# SAST (静态应用安全测试)
npm install -g snyk
snyk test

# 代码质量检查
npm install -g eslint
npm install -g prettier

# 密钥泄露检测
npm install -g git-secrets
git secrets --install
git secrets --register-aws
```

### B. 安全学习资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Web Security Academy](https://portswigger.net/web-security)

### C. 安全模板和脚本

```typescript
// src/lib/security/security-headers.ts
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-28
**维护者**: 系统管理员

---

## 变更日志

| 日期       | 版本  | 变更内容                    |
| ---------- | ----- | --------------------------- |
| 2026-03-28 | 1.0.0 | 初始版本 - 完整安全加固方案 |
