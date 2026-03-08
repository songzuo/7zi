# 🔒 安全 API 使用指南

本文档说明如何在 7zi 项目中使用安全模块。

---

## 📦 已安装的安全模块

### 1. 认证系统 (`src/lib/security/auth.ts`)

提供 JWT Token 认证和会话管理。

**主要功能**:
- `generateAccessToken(user)` - 生成访问令牌
- `generateRefreshToken(user)` - 生成刷新令牌
- `verifyToken(token)` - 验证令牌
- `extractToken(request)` - 从请求提取令牌
- `createAuthMiddleware(options)` - 创建认证中间件
- `isAdmin(user)` - 检查是否管理员
- `generateSecureSecret()` - 生成安全密钥

**使用示例**:

```typescript
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';

export async function GET(request: NextRequest) {
  // 提取令牌
  const token = extractToken(request);
  
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 验证令牌
  const payload = await verifyToken(token);
  
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 检查管理员权限
  if (!isAdmin(payload)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  // 继续处理...
}
```

---

### 2. CSRF 保护 (`src/lib/security/csrf.ts`)

防止跨站请求伪造攻击。

**主要功能**:
- `generateCsrfToken()` - 生成 CSRF Token
- `createCsrfMiddleware(options)` - 创建 CSRF 中间件
- `withCsrfProtection(handler)` - 包装处理器
- `validateDoubleSubmitCookie(request)` - 双重提交验证

**使用示例**:

```typescript
import { createCsrfMiddleware } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // CSRF 检查
  const csrfMiddleware = createCsrfMiddleware();
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult; // 返回 403 错误
  }

  // 继续处理...
}
```

**前端集成**:

```javascript
// 获取 CSRF Token
const csrfRes = await fetch('/api/auth/csrf?action=csrf');
const { csrfToken } = await csrfRes.json();

// 在请求中发送 CSRF Token
fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify({ title: 'New Task' }),
});
```

---

### 3. 统一安全中间件 (`src/lib/security/index.ts`)

组合认证和 CSRF 保护。

**预定义配置**:
- `publicSecurity` - 公开端点 (仅 CSRF)
- `authSecurity` - 需要登录
- `adminSecurity` - 需要管理员
- `serviceSecurity` - 服务间通信

**使用示例**:

```typescript
import { withSecurity, adminSecurity } from '@/lib/security';

// 方式 1: 使用包装器
export const POST = withSecurity(
  async (request) => {
    // 处理请求
    return NextResponse.json({ success: true });
  },
  { auth: true, csrf: true }
);

// 方式 2: 使用预定义中间件
export async function DELETE(request: NextRequest) {
  const securityResult = await adminSecurity(request);
  if (securityResult) {
    return securityResult;
  }
  
  // 继续处理...
}
```

---

## 🔐 认证流程

### 1. 用户登录

```typescript
// 前端
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@7zi.studio',
    password: 'admin123', // 生产环境请使用强密码
  }),
});

const { user, csrfToken } = await response.json();

// CSRF Token 会自动存储在 Cookie 中
```

### 2. 访问受保护 API

```typescript
// 前端 - 认证后的请求
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify({ title: 'New Task' }),
  credentials: 'include', // 发送 Cookie
});
```

### 3. 用户登出

```typescript
await fetch('/api/auth/logout', { method: 'POST' });
```

---

## 🛡️ API 端点安全级别

| 端点 | 认证 | CSRF | 授权 | 说明 |
|------|------|------|------|------|
| `GET /api/tasks` | ❌ | ❌ | ❌ | 公开读取 |
| `POST /api/tasks` | ⚠️ | ✅ | ❌ | 可选认证 |
| `PUT /api/tasks` | ⚠️ | ✅ | ❌ | 可选认证 |
| `DELETE /api/tasks` | ✅ | ✅ | 管理员 | 仅管理员 |
| `GET /api/logs` | ⚠️ | ❌ | ❌ | 可选认证 |
| `DELETE /api/logs` | ✅ | ✅ | 管理员 | 仅管理员 |
| `POST /api/auth/login` | ❌ | ❌ | ❌ | 公开 |
| `POST /api/auth/logout` | ❌ | ✅ | ❌ | 公开 |

---

## ⚙️ 环境配置

### .env 文件

```bash
# JWT 密钥 - 必须至少 32 字符
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# CSRF 密钥
CSRF_SECRET=your-csrf-secret-key-min-32-chars-long

# 生成安全密钥:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 检查密钥强度

```bash
curl http://localhost:3000/api/auth?action=check-secret
```

---

## 📝 审计日志

所有敏感操作都会记录审计日志:

- 用户登录/登出
- 任务创建/更新/删除
- 日志清理

查看日志:

```typescript
// 控制台输出
[Auth] User logged in: { userId, email, role, timestamp }
[Audit] Task created: { taskId, createdBy, userRole, timestamp }
[Audit] Logs deleted by admin: { userId, userEmail, days, deletedCount }
```

---

## 🔒 安全最佳实践

### 1. 密钥管理

- ✅ 使用强随机密钥 (至少 32 字符)
- ✅ 定期轮换密钥 (建议每 90 天)
- ✅ 不同环境使用不同密钥
- ❌ 不要提交 .env 到 Git
- ❌ 不要使用示例密钥

### 2. Token 安全

- ✅ 使用 HttpOnly Cookie
- ✅ 设置 Secure 标志 (HTTPS)
- ✅ 设置 SameSite=Strict
- ✅ 实现令牌刷新机制
- ❌ 不要在 URL 中传递 Token

### 3. CSRF 防护

- ✅ 所有状态变更请求都需要 CSRF Token
- ✅ 使用双重提交 Cookie 模式
- ✅ 豁免登录/注册端点
- ❌ 不要豁免业务端点

### 4. 权限控制

- ✅ 最小权限原则
- ✅ 服务端验证所有权限
- ✅ 记录所有敏感操作
- ❌ 不要信任客户端权限检查

---

## 🧪 测试

### 测试认证

```bash
# 1. 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@7zi.studio","password":"admin123"}' \
  -c cookies.txt

# 2. 访问受保护端点
curl http://localhost:3000/api/auth/me \
  -b cookies.txt

# 3. 登出
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### 测试 CSRF 保护

```bash
# 没有 CSRF Token - 应该失败
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  -b cookies.txt

# 有 CSRF Token - 应该成功
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -d '{"title":"Test"}' \
  -b cookies.txt
```

### 测试管理员权限

```bash
# 普通用户尝试删除日志 - 应该失败 (403)
# 管理员删除日志 - 应该成功
curl -X DELETE "http://localhost:3000/api/logs?days=30" \
  -b cookies.txt
```

---

## 🚨 错误代码

| 代码 | 说明 | 处理 |
|------|------|------|
| `AUTH_REQUIRED` | 需要认证 | 重定向到登录页 |
| `AUTH_INVALID` | Token 无效/过期 | 清除 Cookie，重新登录 |
| `AUTH_FORBIDDEN` | 权限不足 | 显示无权访问 |
| `CSRF_MISSING` | 缺少 CSRF Token | 刷新 Token 重试 |
| `CSRF_MISMATCH` | CSRF Token 不匹配 | 刷新 Token 重试 |
| `CSRF_INVALID` | CSRF Token 验证失败 | 刷新 Token 重试 |
| `ADMIN_REQUIRED` | 需要管理员权限 | 联系管理员 |

---

## 📚 相关文件

- `src/lib/security/auth.ts` - 认证模块
- `src/lib/security/csrf.ts` - CSRF 保护
- `src/lib/security/index.ts` - 统一安全中间件
- `src/lib/security/middleware.ts` - 基础安全中间件
- `src/app/api/auth/route.ts` - 认证 API
- `src/app/api/logs/route.ts` - 日志 API (已加固)
- `src/app/api/tasks/route.ts` - 任务 API (已加固)

---

*最后更新：2026-03-08*
