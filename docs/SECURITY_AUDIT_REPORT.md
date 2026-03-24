# 7zi-frontend 安全审查报告

**审查日期:** 2026-03-07  
**审查人:** AI 安全咨询师  
**项目:** 7zi-frontend  
**技术栈:** Next.js 16.2.1, React 19.2.4, TypeScript

---

## 📋 执行摘要

| 项目 | 状态 |
|------|------|
| 敏感信息泄露 | ⚠️ 中等风险 |
| 依赖项安全性 | ⚠️ 高风险 (1个高危漏洞) |
| XSS 防护 | ✅ 良好 |
| CSRF 防护 | ✅ 已实现 |
| 认证授权 | ℹ️ 无用户认证系统 |
| 输入验证 | ✅ 良好 |
| 安全头配置 | ✅ 优秀 |

**总体评估:** 项目整体安全性较好，但存在几个需要立即关注的问题。

---

## 🚨 高风险问题

### 1. xlsx 包存在高危漏洞

**风险等级:** 🔴 高  
**CVE:** GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9

**问题:**
- xlsx 包存在原型污染漏洞 (CVSS 7.8)
- 存在正则表达式拒绝服务漏洞 (CVSS 7.5)
- 当前版本 0.18.5 无法修复

**npm audit 输出:**
```
xlsx  *  Severity: high
Prototype Pollution in sheetJS
SheetJS Regular Expression Denial of Service (ReDoS)
No fix available
```

**修复建议:**
1. **立即:** 如果不使用 Excel 导出功能，移除 xlsx 依赖
2. **短期:** 如果需要 Excel 功能，考虑使用替代库:
   - `exceljs` (活跃维护，安全)
   - `xlsx-populate`
   - `SheetJS` (付费版本有安全修复)
3. **配置:** 如果必须使用，限制用户上传文件大小，验证输入

```bash
# 移除依赖
npm uninstall xlsx

# 或替换为 exceljs
npm uninstall xlsx && npm install exceljs
```

---

### 2. dangerouslySetInnerHTML 使用风险

**风险等级:** 🟡 中 (当前代码安全，但存在潜在风险)

**问题:**
项目中多处使用 `dangerouslySetInnerHTML`，存在潜在的 XSS 风险。

**使用位置:**
- `src/app/blog/[slug]/page.tsx` - 博客文章内容
- `src/components/SEO.tsx` - 结构化数据
- `src/app/[locale]/contact/page.tsx` - 结构化数据
- `src/components/Analytics.tsx` - 百度统计代码

**当前状态:** ✅ 大部分使用安全
- 博客内容为静态硬编码内容，无用户输入
- SEO 结构化数据为 JSON 序列化，安全
- Analytics 脚本注入使用环境变量 ID，相对安全

**潜在风险:**
- 如果将来博客内容来自 CMS 或数据库，需要严格的 XSS 过滤
- Analytics 中的百度统计使用了 `innerHTML`，依赖环境变量安全

**修复建议:**
1. 为博客内容添加 HTML 净化器:
```bash
npm install dompurify
npm install -D @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

// 在使用前净化
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'li', 'strong', 'a', 'code'],
    ALLOWED_ATTR: ['href', 'class']
  })
}} />
```

2. 为 Analytics 组件添加环境变量验证:
```typescript
// 验证 baiduId 格式
if (baiduId && /^[a-f0-9]{32}$/.test(baiduId)) {
  // 安全使用
}
```

---

## ⚠️ 中等风险问题

### 3. 环境变量管理

**风险等级:** 🟡 中

**问题:**
- `.env.local` 和 `.env.production` 文件存在于仓库中
- Git 状态显示 `nothing to commit, working tree clean` - 文件可能已被提交

**检查结果:**
```bash
$ git status .env.local .env.production
nothing to commit, working tree clean
```

**.env.production 敏感信息:**
- `NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com` (可接受，公开信息)
- 注释中包含示例 API 密钥格式 (可接受)

**.env.local 敏感信息:**
- `NEXT_PUBLIC_SENTRY_DSN=https://xxxx...` (占位符，安全)
- 调试模式配置 (开发用，可接受)

**修复建议:**
1. 确认敏感文件未被提交:
```bash
git log --all --full-history -- .env.local .env.production
```

2. 如果已提交，从历史中移除:
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local .env.production' \
  --prune-empty --tag-name-filter cat -- --all
```

3. 强制 gitignore 规则:
```gitignore
# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
```

---

### 4. API 路由缺乏速率限制

**风险等级:** 🟡 中

**问题:**
GitHub API 代理端点 (`/api/github/commits`, `/api/github/issues`) 没有速率限制。

**影响:**
- 可能被滥用导致 GitHub API 配额耗尽
- 潜在的 DoS 攻击向量

**修复建议:**
添加速率限制中间件:
```typescript
// src/lib/rate-limit.ts
import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  ip: string, 
  limit: number = 60, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}
```

---

### 5. localStorage 存储敏感设置

**风险等级:** 🟢 低-中

**问题:**
用户设置存储在 localStorage 中，如果未来添加敏感数据可能存在风险。

**当前状态:** 只存储主题/语言偏好，无敏感数据。

**修复建议:**
- 永远不要在 localStorage 存储认证 token 或敏感数据
- 未来如添加敏感功能，使用 httpOnly cookies

---

## ✅ 良好实践

### 安全头配置 (优秀)

项目在 `next.config.ts` 中配置了全面的安全头:

```typescript
headers: [
  'Content-Security-Policy',      // ✅ XSS 防护
  'Strict-Transport-Security',    // ✅ HTTPS 强制
  'X-Frame-Options',              // ✅ 点击劫持防护
  'X-Content-Type-Options',       // ✅ MIME 类型嗅探防护
  'X-XSS-Protection',             // ✅ XSS 过滤器
  'Referrer-Policy',              // ✅ 引用泄露防护
  'Permissions-Policy',           // ✅ 功能权限限制
]
```

**CSP 配置分析:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...;
```

⚠️ **注意:** `'unsafe-inline'` 和 `'unsafe-eval'` 削弱了 CSP 保护，但对于 Next.js 和 Tailwind CSS 是必需的。考虑使用 nonce 或 hash 替代。

---

### CSRF 保护 (良好)

项目实现了 CSRF 保护:

**实现细节:**
- `/api/csrf-token` 生成随机 token
- Token 存储 httpOnly cookie (SameSite=strict)
- 表单提交时通过 `X-CSRF-Token` 头传递
- 服务端验证使用时间安全比较

```typescript
// src/lib/csrf.ts
export function validateCsrfToken(headerToken, cookieToken): boolean {
  // 使用 Buffer.equals() 防止时序攻击
  return headerBuf.equals(cookieBuf);
}
```

---

### 输入验证 (良好)

联系表单有完整的输入验证:

```typescript
// src/components/ContactForm.tsx
- 必填字段验证
- 邮箱格式验证
- 消息最小长度 (10 字符)
```

项目还包含验证工具库 (`src/lib/validation/validators.ts`):
- `required` - 必填验证
- `email` - 邮箱格式验证
- `minLength/maxLength` - 长度验证
- `pattern` - 正则验证
- `phone` - 中国手机号验证
- `url` - URL 格式验证

---

### XSS 防护测试 (良好)

项目包含完整的 XSS 防护测试套件 (`src/test/security/xss-protection.test.ts`):
- 输入净化测试
- 脚本注入防护测试
- 事件处理器注入测试
- URL XSS 测试
- HTML 实体编码测试
- DOM XSS 测试
- 模板注入测试

---

### GitHub Token 保护 (优秀)

敏感 token 正确地从客户端隐藏:

```typescript
// src/app/api/github/commits/route.ts
const githubToken = process.env.GITHUB_TOKEN; // 非 NEXT_PUBLIC_ 前缀
```

API 路由作为代理，避免 token 暴露到前端。

---

### Sentry 配置 (良好)

Sentry 配置考虑了隐私:
- `sendDefaultPii: false` - 不发送个人数据
- `maskAllText: true` - Replay 中遮蔽文本
- `blockAllMedia: true` - 阻止媒体捕获
- `beforeSend` 钩子过滤敏感头信息

---

## 📊 安全检查清单

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 无硬编码密钥 | ✅ | 无敏感硬编码 |
| .gitignore 正确配置 | ✅ | 环境变量已忽略 |
| CSP 头配置 | ✅ | 配置完善 |
| HSTS 配置 | ✅ | 63072000 秒 |
| X-Frame-Options | ✅ | SAMEORIGIN |
| 输入验证 | ✅ | 有验证库 |
| 输出编码 | ⚠️ | 需要 DOMPurify |
| CSRF 保护 | ✅ | 已实现 |
| 依赖审计 | ❌ | 1 高危漏洞 |
| 无 eval() | ✅ | 未使用 |
| httpOnly cookies | ✅ | CSRF token 使用 |
| 安全比较函数 | ✅ | 时序攻击防护 |

---

## 🔧 修复优先级

### 立即处理 (P0)
1. 移除或替换 xlsx 包
2. 检查并确保 .env 文件未被提交

### 短期处理 (P1)
3. 为 dangerouslySetInnerHTML 添加 DOMPurify
4. 添加 API 速率限制

### 长期改进 (P2)
5. 考虑使用 CSP nonce 替代 unsafe-inline
6. 添加安全头扫描到 CI/CD

---

## 📝 建议命令

```bash
# 1. 移除漏洞依赖
npm uninstall xlsx

# 2. 安装 HTML 净化器
npm install dompurify
npm install -D @types/dompurify

# 3. 检查敏感文件历史
git log --all --full-history -- .env.local .env.production

# 4. 运行安全审计
npm audit fix --force  # 谨慎使用

# 5. 安装安全检查工具
npm install -D better-npm-audit
```

---

## 结论

7zi-frontend 项目整体安全性较好，已经实现了多项安全最佳实践：
- 完善的安全头配置
- CSRF 保护机制
- 输入验证系统
- 服务端 API token 保护
- XSS 防护测试

主要需要关注的是 **xlsx 包的高危漏洞**，建议立即移除或替换。其他中等风险问题可以在后续迭代中逐步修复。

---

**审查完成时间:** 2026-03-07  
**下次审查建议:** 在添加用户认证功能或引入新依赖后