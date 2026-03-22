# 7zi-frontend 安全审计报告

**审计日期**: 2026-03-07  
**审计人**: 架构师  
**项目**: 7zi-frontend (Next.js 16.1.7)

---

## 🔴 严重问题 (Critical)

### 1. 敏感令牌暴露在客户端代码 ⚠️ **高危**

**位置**: `src/app/dashboard/page.tsx:201`

```typescript
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
```

**问题**: 
- 使用 `NEXT_PUBLIC_` 前缀的环境变量会被打包到客户端 JavaScript 中
- GitHub Token 会暴露给所有访问网站的用户
- 攻击者可以滥用此 Token 访问 GitHub API

**风险等级**: 🔴 高危  
**影响**: API 滥用、数据泄露、账户接管

**修复建议**:
1. 移除 `NEXT_PUBLIC_` 前缀，使用服务器端环境变量
2. 创建 API Route (`/api/github/*`) 作为代理
3. 所有 GitHub API 请求通过服务器端代理执行

```typescript
// ✅ 正确做法
// 服务端 API Route: src/app/api/github/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = process.env.GITHUB_TOKEN; // 服务端环境变量
  const response = await fetch('https://api.github.com/...', {
    headers: { Authorization: `token ${token}` }
  });
  return NextResponse.json(await response.json());
}
```

---

## 🟠 中等问题 (Medium)

### 2. Content-Security-Policy 头缺失

**位置**: `next.config.ts`

**问题**: 
- 已配置安全头，但缺少 CSP (Content-Security-Policy)
- CSP 是防御 XSS 攻击的重要手段

**当前配置**:
```typescript
headers: [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // ❌ 缺少 Content-Security-Policy
]
```

**修复建议**: 添加 CSP 头

```typescript
{
  key: 'Content-Security-Policy',
  value: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://www.googletagmanager.com 
      https://analytics.umami.is;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://api.github.com https://api.resend.com https://o123456.ingest.sentry.io;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
  `.replace(/\n/g, '').replace(/\s+/g, ' '),
}
```

### 3. dangerouslySetInnerHTML 使用存在 XSS 风险

**位置**: 多个文件

| 文件 | 行号 | 风险评估 |
|------|------|----------|
| `src/app/blog/[slug]/page.tsx` | 228 | ⚠️ 中等风险 - 博客内容未过滤 |
| `src/components/SEO.tsx` | 54, 66, 140, 190, 244 | ✅ 低风险 - JSON 结构化数据 |
| `src/app/layout.tsx` | 100 | ✅ 低风险 - JSON 结构化数据 |

**博客内容问题**:
```typescript
// src/app/blog/[slug]/page.tsx:228
dangerouslySetInnerHTML={{ __html: post.content }}
```

博客内容 `post.content` 是硬编码的静态 HTML，目前安全。但如果未来支持用户输入，可能存在 XSS 风险。

**修复建议**:
1. 如需支持动态内容，安装并使用 DOMPurify:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

// 在渲染前净化 HTML
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'strong', 'em'],
    ALLOWED_ATTR: ['href']
  })
}} />
```

### 4. 缺少 CSRF 保护

**位置**: 整个应用

**问题**: 
- 没有发现 CSRF Token 实现
- Next.js API Routes 默认不提供 CSRF 保护

**影响**: 联系表单提交可能被恶意网站伪造

**修复建议**:
1. 对于敏感操作（如联系表单），添加 CSRF 保护:

```typescript
// 使用 Next.js 内置的 CSRF 保护或中间件
// src/proxy.ts 添加 CSRF 验证
import { csrf } from './lib/csrf';

export async function middleware(request: NextRequest) {
  // 对 POST/PUT/DELETE 请求验证 CSRF Token
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // 简单的 Origin 检查
    if (origin && !origin.includes(host || '')) {
      return new NextResponse('CSRF validation failed', { status: 403 });
    }
  }
}
```

### 5. API 没有速率限制

**位置**: 所有 API 端点

**问题**: 
- `/api/health/*` 和 `/api/status` 端点无速率限制
- 可能被滥用进行 DoS 攻击

**修复建议**:
```typescript
// src/lib/rate-limit.ts
import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  ip: string, 
  limit: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) return false;
  
  record.count++;
  return true;
}
```

---

## 🟡 低等问题 (Low)

### 6. localStorage 存储敏感数据风险

**位置**: `src/contexts/SettingsContext.tsx`

**问题**: 设置存储在 localStorage 中，可能被恶意脚本读取

**影响**: 低风险 - 仅存储用户偏好设置，非敏感数据

**建议**: 保持现状，但确保不存储敏感信息

### 7. 客户端错误信息可能泄露内部信息

**位置**: 多处 catch 块

```typescript
// 示例: 错误信息直接返回
console.error("Form submission error:", error);
```

**修复建议**: 生产环境过滤错误信息

```typescript
// 生产环境隐藏详细错误
if (process.env.NODE_ENV === 'production') {
  setSubmitStatus("error");
} else {
  console.error("Form submission error:", error);
}
```

### 8. 依赖项安全检查结果

**npm audit 结果**: ✅ 无已知漏洞

```
{
  "vulnerabilities": {
    "total": 0
  },
  "dependencies": { "total": 810 }
}
```

---

## 📋 检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| npm audit | ✅ 通过 | 无已知漏洞 |
| XSS 防护 | ⚠️ 需改进 | dangerouslySetInnerHTML 需监控 |
| CSRF 防护 | ❌ 缺失 | 需实现 CSRF Token |
| CSP 头 | ❌ 缺失 | 需添加 Content-Security-Policy |
| 敏感数据暴露 | 🔴 高危 | GitHub Token 暴露 |
| 速率限制 | ❌ 缺失 | API 无速率限制 |
| HTTPS | ✅ 配置 | HSTS 已配置 |
| X-Frame-Options | ✅ 配置 | SAMEORIGIN |
| X-Content-Type-Options | ✅ 配置 | nosniff |
| Referrer-Policy | ✅ 配置 | strict-origin-when-cross-origin |
| 环境变量保护 | ⚠️ 需改进 | 部分敏感变量使用 NEXT_PUBLIC_ |

---

## 🔧 修复优先级

### 立即修复 (P0 - 24小时内)
1. **移除客户端 GitHub Token** - 创建服务端 API 代理

### 短期修复 (P1 - 1周内)
2. 添加 Content-Security-Policy 头
3. 实现 CSRF 保护
4. 添加 API 速率限制

### 中期修复 (P2 - 2周内)
5. 对动态 HTML 内容实施 DOMPurify 净化
6. 完善错误处理，避免敏感信息泄露

---

## 📊 风险评估总结

| 风险等级 | 数量 | 占比 |
|----------|------|------|
| 🔴 高危 | 1 | 12.5% |
| 🟠 中等 | 4 | 50% |
| 🟡 低 | 3 | 37.5% |
| ✅ 通过 | - | - |

**总体安全评分**: 65/100

**结论**: 项目存在一个高危问题需要立即修复。基础安全头配置良好，但缺少 CSP 和 CSRF 保护。建议在部署生产环境前完成所有 P0 和 P1 修复项。

---

**审计完成** - 架构师 @ 2026-03-07