# CSP Header 实现方案设计文档

**项目**: 7zi (Next.js 全栈应用)  
**日期**: 2026-10-20  
**作者**: 🏗️ 架构师 (Architect)  
**版本**: v1.0

---

## 一、项目现状分析

### 1.1 当前 CSP 状态

**next.config.ts (已配置)** — 基础 CSP 存在但不够严格：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';    ← 问题：unsafe-inline
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://sentry.io wss: https://;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

**nginx/nginx.conf** — CSP 被注释掉（占位符），安全头仅有 X-Frame-Options、HSTS 等基础头。

**src/lib/security/headers.ts** — 已有一套完整的 CSP 配置库（开发/生产/严格模式），但**未被 next.config.ts 实际使用**。

### 1.2 资源加载情况

| 资源类型 | 来源 | 示例 |
|----------|------|------|
| **JavaScript** | Next.js `_next/static` | `/chunks/app-layout-xxx.js` |
| **CSS** | Next.js `_next/static` + 内联 | inline `<style>` 标签 |
| **字体** | `next/font` (本地) + Google Fonts (间接) | Inter, Noto Sans 等 |
| **图片** | 远程图片 (所有 HTTPS) | 用户上传、CDN |
| **WebSocket** | 内部 `wss://` + Sentry `wss://` | 实时通信 |
| **外部服务** | Sentry (错误监控) | `sentry.io` |

### 1.3 现有安全头（nginx 层）

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

### 1.4 发现的问题

1. **`style-src 'unsafe-inline'`** — 允许内联样式，XSS 风险仍然存在
2. **无 nonce 机制** — 无法精细化控制内联脚本/样式
3. **nginx 层 CSP 注释** — 未激活，无法在后端统一管理
4. **Google Fonts** — 如果使用，fontSrc 需要包含 `fonts.googleapis.com` 和 `fonts.gstatic.com`
5. **`frame-ancestors` 缺失** — 当前只有 `frame-src 'none'`，缺少 `frame-ancestors`
6. **无 Report-Only 机制** — 上线后无法收集 CSP 违规报告

---

## 二、三种实现方案对比

### 方案 A — 严格模式（最高安全）

**目标**: 消除所有 `unsafe-inline` / `unsafe-eval`，使用 **Nonce** 机制保护内联资源。

#### 策略设计

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}';
  style-src 'self' 'nonce-{RANDOM}';
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://sentry.io wss: https://;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  block-all-mixed-content;
  upgrade-insecure-requests;
```

#### Nonce 生成机制

Next.js 中间件为每个请求生成唯一 nonce：

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://sentry.io wss: https://`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `block-all-mixed-content`,
    `upgrade-insecure-requests`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.rewrite(request.url, {
    request: { headers: requestHeaders },
  })

  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}
```

#### Next.js 组件中使用 nonce

```tsx
// src/app/layout.tsx
import { headers } from 'next/headers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? ''

  return (
    <html>
      <head>
        {/* 需要 nonce 的内联脚本 */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: '...' }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

#### 优点
- ✅ 最高安全性，完全消除内联执行风险
- ✅ 每个请求 nonce 随机，无法预测
- ✅ 符合现代 CSP 最佳实践

#### 缺点
- ⚠️ 需要修改所有内联 script/style 标签
- ⚠️ 需要中间件支持，部署复杂度增加
- ⚠️ SSR 时 nonce 需要从请求头传递
- ⚠️ 如果有第三方脚本不支持 nonce，会被阻止

#### 适用场景
- 高安全需求（金融、医疗、政府等）
- 内部系统（可控的脚本来源）
- 愿意投入改造成本的场景

---

### 方案 B — 平衡模式（安全+兼容）✅ 推荐

**目标**: 保留 `unsafe-inline` for styles（Next.js 要求），但使用 **Hash** 机制控制明确的内联脚本，同时在 nginx 层统一管理 CSP。

#### 策略设计

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';        ← Next.js/CSS-in-JS 要求
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://sentry.io wss: https://;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  block-all-mixed-content;
```

#### Nginx 配置（推荐）

在 `nginx/nginx.conf` 中添加 CSP Header（替代 next.config.ts）：

```nginx
# HTTPS server block 中添加
map $request_uri $csp_policy {
    default "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://sentry.io wss: https://; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; block-all-mixed-content;";
}

# 或使用 include 引用外部文件方便管理
include /etc/nginx/csp-policy.conf;
```

#### next.config.ts 更新

移除现有的内联 CSP（在 nginx 层统一管理后）：

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        // 仅保留 next.config 独有的头，不重复 CSP
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
        // ⚠️ 移除 Content-Security-Policy（由 nginx 管理）
      ],
    },
    // ... 其他规则
  ]
}
```

#### Hash 用于特定内联脚本

对于必须存在的内联脚本，计算其 SHA-256 hash：

```nginx
# 已知内联脚本的 hash（示例）
# <script>console.log('app init')</script>
# hash = sha256-abc123...
```

```nginx
# nginx 中使用 hash
add_header Content-Security-Policy "script-src 'self' 'sha256-abc123...'" always;
```

#### 优点
- ✅ 兼容性好，Next.js CSS-in-JS / Tailwind 正常工作
- ✅ nginx 层统一管理，维护成本低
- ✅ 无需修改应用代码，部署风险低
- ✅ 可使用 `style-src 'unsafe-inline'` 兼容模式

#### 缺点
- ⚠️ `unsafe-inline` for styles 仍存在理论风险（但实际 XSS 通常通过 JS）
- ⚠️ 无法完全防止内联 style 注入攻击

#### 适用场景
- **推荐 7zi 采用此方案**
- 现有 Next.js 应用不想大规模重构
- 需要平衡安全性和兼容性

---

### 方案 C — 宽松模式（最小改动）

**目标**: 在现有 next.config.ts 基础上做最小调整，不动架构。

#### 当前配置优化

```typescript
// next.config.ts — 优化后的 CSP
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",   // ← 改为 unsafe-inline 而非 nonce（简化）
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://sentry.io wss: https://",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "block-all-mixed-content",
    "upgrade-insecure-requests",
  ].join('; '),
}
```

#### 优化点

1. 添加 `upgrade-insecure-requests` — 自动升级 HTTP 请求
2. 添加 `base-uri 'self'` — 防止 base 标签注入
3. 添加 `form-action 'self'` — 限制表单提交目标
4. 补全 `fontSrc` 包含 `fonts.gstatic.com`（如果有 Google Fonts）
5. 添加 `block-all-mixed-content`

#### 优点
- ✅ 最小改动，几乎无风险上线
- ✅ 修复了混合内容问题
- ✅ 立即提升基础安全水平

#### 缺点
- ⚠️ 仍使用 `unsafe-inline`，安全收益有限
- ⚠️ 没有从根本上解决 XSS 风险
- ⚠️ 长期来看需要升级到方案 A 或 B

#### 适用场景
- 快速上线应急
- 不想立即投入工程资源
- 作为迁移到方案 B 的过渡阶段

---

## 三、7zi 推荐方案（方案 B + 阶段性迁移）

### 3.1 部署架构

```
[浏览器]
    ↓ HTTPS
[Cloudflare]
    ↓
[Nginx] ← CSP Header 在此设置
    ↓ proxy_pass
[Next.js (7zi-frontend:3000)]
```

**关键决策**: CSP 在 **Nginx 层设置**，而非 Next.js 层。

**原因**:
1. Nginx 是所有流量的统一出口， CSP 一处配置全局生效
2. Next.js 的 `headers()` API 会在 CDN 缓存问题上有不确定性
3. Cloudflare 可能添加额外的安全层，需要在 nginx 配合

### 3.2 完整 nginx CSP 配置

```nginx
# /etc/nginx/csp-policy.conf （独立文件便于管理）

# CSP Policy - 平衡模式
set $csp "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://sentry.io wss: https://; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; block-all-mixed-content; upgrade-insecure-requests;";

# Report-Only 模式（用于上线前测试）
# set $csp "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://sentry.io wss: https://; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; block-all-mixed-content; upgrade-insecure-requests; report-uri /api/security/csp-report;";
```

### 3.3 迁移步骤

#### Phase 0: 准备（1 天）

```bash
# 1. 备份当前配置
cp nginx/nginx.conf nginx/nginx.conf.bak.$(date +%Y%m%d)

# 2. 创建 CSP 配置文件
vim /etc/nginx/csp-policy.conf
```

#### Phase 1: 测试环境验证（1-2 天）

```bash
# 使用 report-uri 测试（不拦截仅报告）
# 1. 在测试环境 nginx 启用 CSP Report-Only
# 2. 访问所有核心页面，收集违规报告
# 3. 分析 report-uri 收集到的数据
```

#### Phase 2: 生产灰度（2-3 天）

```bash
# 1. nginx 层启用 CSP（先使用 report-uri）
# 2. next.config.ts 移除 CSP 头（避免重复）
# 3. 监控 sentry.io 错误和 nginx 日志
# 4. 如果有 CSP 违规，通过 report-uri 收集
```

#### Phase 3: 全量上线（1 天）

```bash
# 1. 移除 report-uri，正式启用 CSP
# 2. 验证所有功能正常
# 3. 更新 nginx 配置到 deploy/docker/nginx.conf
```

### 3.4 next.config.ts 更新

移除 next.config.ts 中的 CSP header，保留其他安全头：

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
        // ⚠️ Content-Security-Policy 已移除，由 nginx 管理
      ],
    },
    // ... 其他 header 规则保持不变
  ]
}
```

---

## 四、CSP Report 机制

### 4.1 Report-Only 模式

上线前使用 `Content-Security-Policy-Report-Only` 收集违规但不拦截：

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; ..." always;
```

### 4.2 Next.js API 路由处理 Report

```typescript
// src/app/api/security/csp-report/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const report = await request.json()
    
    // 记录到日志或发送到监控系统
    console.error('[CSP Violation]', JSON.stringify(report, null, 2))
    
    // 可以发送到外部服务如 Sentry
    // await fetch('https://sentry.io/api/...', { ... })
    
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }
}
```

### 4.3 Nginx 配置 Report URI

```nginx
# 需要一个报告接收端点
location /api/security/csp-report {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    add_header Content-Security-Policy-Report-Only "default-src 'self'; ..." always;
}
```

---

## 五、测试验证方法

### 5.1 功能测试清单

| 测试项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| 主页加载 | 访问 7zi.com | 正常显示，无 console 错误 |
| 登录功能 | 测试登录流程 | 登录成功，无 CSP 拦截 |
| 图片上传 | 上传图片 | 上传成功 |
| 外部图片 | 加载外部 CDN 图片 | 正常显示 |
| WebSocket | 打开实时功能 | 连接成功 |
| 控制台 XSS | 在控制台执行 `alert(1)` | 不执行（script-src 限制）|
| 内联脚本测试 | 创建含 inline script 的页面 | 行为符合预期 |

### 5.2 CSP 违规测试

```bash
# 测试 XSS 注入是否被阻止
# 在任意输入框输入: <img src=x onerror=alert(1)>
# 预期: CSP 阻止，浏览器 console 显示违规

# 测试外部脚本加载
# 预期: 外部 <script src="https://evil.com/x.js"> 被阻止
```

### 5.3 自动化测试脚本

```typescript
// test/csp-test.ts
describe('CSP Security Tests', () => {
  it('should block inline script execution', async () => {
    const response = await fetch('https://7zi.com')
    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toBeTruthy()
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('should block frame embedding', async () => {
    const response = await fetch('https://7zi.com')
    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('should restrict connect-src', async () => {
    const response = await fetch('https://7zi.com')
    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain('https://sentry.io')
  })
})
```

### 5.4 浏览器开发者工具验证

1. 打开 Chrome DevTools → Network
2. 访问页面，查看 `Response Headers` 中的 `Content-Security-Policy`
3. 打开 Security 面板，查看 CSP 状态
4. 故意触发 XSS，检查 Console 中的 CSP 违规报告

---

## 六、已知兼容性问题

### 6.1 Next.js 内联样式

Next.js 的 CSS-in-JS 方案（如 styled-jsx）会生成内联 `<style>` 标签，这是 **`style-src 'unsafe-inline'`** 存在的主要原因。

**解决方案**: 接受这一限制，因为:
- 样式注入 XSS 危害远低于脚本注入
- Next.js 本身对 style 内容有处理
- 这是 Next.js 生态的已知 trade-off

### 6.2 Tailwind CSS

Tailwind 3.x 使用 CSS-in-JS 进行 JIT 编译，会产生内联样式。配置 `style-src 'unsafe-inline'` 是必须的。

### 6.3 第三方脚本

如果后续引入第三方脚本（如 ChatGPT widget、Livechat），需要将其域名加入 `script-src`：

```
script-src 'self' https://cdn.example.com
```

---

## 七、最终推荐配置

### Nginx 层 (推荐)

```nginx
# /etc/nginx/csp-policy.conf
set $csp "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://sentry.io wss: https://; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; block-all-mixed-content; upgrade-insecure-requests;";
```

### next.config.ts (简化版)

保留非 CSP 安全头，移除 CSP（由 nginx 管理）：

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      ],
    },
    {
      source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ]
}
```

### 图片配置优化（next.config.ts）

当前 `next.config.ts` 中的 `contentSecurityPolicy` 配置需要更新：

```typescript
images: {
  // ... 现有配置
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  // 注意：图片优化路由使用独立的 CSP，与主站 CSP 分离
}
```

---

## 八、迁移检查清单

- [ ] 备份 `nginx/nginx.conf`
- [ ] 备份 `7zi-frontend/next.config.ts`
- [ ] 创建 `/etc/nginx/csp-policy.conf`
- [ ] 测试环境 nginx 配置 CSP Report-Only
- [ ] 运行完整功能测试
- [ ] 收集并分析 CSP 违规报告
- [ ] 生产环境灰度（10% 流量）
- [ ] 生产环境全量
- [ ] 更新 `deploy/docker/nginx.conf`
- [ ] 更新 `nginx/nginx.conf` (workspace)
- [ ] 监控 Sentry 错误（72 小时内）
- [ ] 文档更新

---

## 九、相关文档

- 现有安全头配置: `src/lib/security/headers.ts`
- Nginx 配置: `nginx/nginx.conf`
- Docker 部署 Nginx: `deploy/docker/nginx.conf`
- 安全审计报告: `SECURITY_AUDIT_20261019.md`
