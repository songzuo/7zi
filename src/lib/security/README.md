# Security Headers Configuration

安全头部配置模块，用于增强 Next.js 应用的安全性。

## 功能特性

### 1. CSP (Content Security Policy)

**内容安全策略**，防止 XSS 攻击、数据注入等安全威胁。

#### 开发环境（宽松模式）

```typescript
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
```

- 允许 `unsafe-inline` 和 `unsafe-eval`（方便开发调试）
- 不启用 `upgrade-insecure-requests`

#### 生产环境（严格模式）

```typescript
script-src 'self'
style-src 'self'
upgrade-insecure-requests
block-all-mixed-content
```

- 移除 `unsafe-inline` 和 `unsafe-eval`
- 启用 `upgrade-insecure-requests`（强制 HTTPS）
- 启用 `block-all-mixed-content`（阻止混合内容）

### 2. HSTS (HTTP Strict Transport Security)

**HTTP 严格传输安全**，强制浏览器使用 HTTPS 连接。

#### 开发环境

- 不启用 HSTS（开发环境通常使用 HTTP）

#### 生产环境

```typescript
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

- `max-age=63072000`（2 年）
- `includeSubDomains`（包含所有子域名）
- `preload`（可选，需要向 hstspreload.org 申请）

### 3. X-Frame-Options

**框架保护**，防止点击劫持攻击。

- **开发环境**: `SAMEORIGIN`（允许同源框架嵌入）
- **生产环境**: `DENY`（完全禁止框架嵌入）

### 4. X-Content-Type-Options

**MIME 类型嗅探保护**。

```typescript
X-Content-Type-Options: nosniff
```

防止浏览器猜测资源类型，减少安全风险。

### 5. X-XSS-Protection

**XSS 过滤器**（现代浏览器已弃用，但仍提供兼容性保护）。

```typescript
X-XSS-Protection: 1; mode=block
```

### 6. Referrer-Policy

**Referrer 策略**，控制 Referrer 头部的发送。

```typescript
Referrer-Policy: strict-origin-when-cross-origin
```

- 同源请求：发送完整 URL
- 跨域请求：只发送源（origin）
- 降级请求（HTTPS → HTTP）：不发送 Referrer

### 7. Permissions-Policy

**权限策略**，控制浏览器功能的访问权限。

```typescript
Permissions-Policy: 
  geolocation=none,
  microphone=none,
  camera=none,
  payment=none,
  usb=none,
  bluetooth=none,
  notifications=none,
  autoplay='self',
  fullscreen='self',
  interest-cohort=none
```

- 禁用不必要的设备权限（地理位置、麦克风、摄像头等）
- 允许同源自动播放和全屏
- 禁用 FLoC（`interest-cohort=none`）

### 8. Cross-Origin Policies

**跨域安全策略**，增强跨域资源访问的安全性。

```typescript
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

## 使用方法

### 基本使用

```typescript
import { applySecurityHeaders } from '@/lib/security/headers';

// 在 middleware.ts 中应用
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  
  // 应用安全头部
  applySecurityHeaders(
    response,
    process.env.NODE_ENV === 'development' ? 'development' : 'production'
  );
  
  return response;
}
```

### 自定义配置

```typescript
import { 
  getSecurityConfig, 
  generateCSP, 
  generateHSTS 
} from '@/lib/security/headers';

// 获取环境配置
const config = getSecurityConfig('production');

// 自定义 CSP
const customCSP = generateCSP({
  strictMode: true,
  scriptSrc: ["'self'", 'https://cdn.example.com'],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  connectSrc: ["'self'", 'https://api.example.com'],
  allowInlineScripts: false,
  allowInlineStyles: false,
  allowEval: false,
});

// 应用到响应
response.headers.set('Content-Security-Policy', customCSP);
```

### CSP Report-Only 模式

用于测试 CSP 策略，不实际阻止，只报告违规。

```typescript
import { getCSPReportOnlyConfig } from '@/lib/security/headers';

const reportHeaders = getCSPReportOnlyConfig('production');
// Content-Security-Policy-Report-Only: ...
```

## 配置说明

### 开发环境 vs 生产环境

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| **CSP 严格模式** | ❌ 宽松 | ✅ 严格 |
| **unsafe-inline** | ✅ 允许 | ❌ 禁止 |
| **unsafe-eval** | ✅ 允许 | ❌ 禁止 |
| **HSTS** | ❌ 不启用 | ✅ 启用（2年） |
| **X-Frame-Options** | SAMEORIGIN | DENY |
| **upgrade-insecure-requests** | ❌ 不启用 | ✅ 启用 |

### 生产环境 CSP 示例

```
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net;
style-src 'self' https://fonts.googleapis.com;
connect-src 'self' https:;
img-src 'self' data: https: blob:;
font-src 'self' data: https://fonts.gstatic.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
manifest-src 'self';
upgrade-insecure-requests;
```

## 迁移指南

### 从 unsafe-inline/unsafe-eval 迁移

**问题**: 生产环境禁用 `unsafe-inline` 和 `unsafe-eval` 后，内联脚本和样式将无法执行。

**解决方案**:

#### 1. 内联脚本

```typescript
// ❌ 之前：内联脚本
<button onclick="alert('clicked')">Click</button>

// ✅ 之后：外部脚本或事件监听器
<button id="myButton">Click</button>
<script src="/scripts/button.js"></script>
```

#### 2. 内联样式

```typescript
// ❌ 之前：内联样式
<div style="color: red;">Text</div>

// ✅ 之后：CSS 类
<div className="text-red">Text</div>
```

#### 3. eval() 和 new Function()

```typescript
// ❌ 之前：使用 eval
const result = eval(code);

// ✅ 之后：使用安全的替代方案
const result = JSON.parse(code); // 如果是 JSON
// 或使用 Web Workers 执行不受信任的代码
```

### 添加受信任的外部资源

如果需要加载外部资源（如 CDN），需要更新 CSP 配置：

```typescript
const config = getSecurityConfig('production');
config.csp.scriptSrc.push('https://cdn.example.com');
config.csp.styleSrc.push('https://fonts.googleapis.com');
config.csp.connectSrc.push('https://api.example.com');
```

## 测试

运行测试：

```bash
npm test -- src/lib/security/headers.test.ts
```

测试覆盖：

- ✅ 开发/生产环境配置正确性
- ✅ CSP 生成（严格模式 vs 宽松模式）
- ✅ HSTS 生成（max-age, includeSubDomains, preload）
- ✅ Permissions-Policy 生成
- ✅ 所有安全头部应用
- ✅ CSP 验证函数

## 安全评分

使用 [Security Headers](https://securityheaders.com/) 测试：

- **开发环境**: B+ （宽松模式，便于开发）
- **生产环境**: A （严格模式，最佳实践）

## 相关文档

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

## 更新日志

### v1.4.0 (2026-03-29)

- ✅ 创建安全头部配置模块
- ✅ 支持开发/生产环境差异化配置
- ✅ 生产环境启用严格 CSP（移除 unsafe-inline/unsafe-eval）
- ✅ 生产环境启用 HSTS（2年，includeSubDomains）
- ✅ 添加 Permissions-Policy（禁用不必要的权限）
- ✅ 添加 Cross-Origin Policies
- ✅ 48 个单元测试全部通过
- ✅ 更新 middleware.ts 使用新配置
- ✅ 保持向后兼容（`addSecurityHeaders` 函数保留）
