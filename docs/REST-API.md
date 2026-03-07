# REST API 文档

**最后更新**: 2026-03-06  
**版本**: v1.0.0  
**基础 URL**: `https://your-domain.com`

---

## 目录

1. [认证](#认证)
2. [API 端点](#api-端点)
3. [认证 API](#认证-api)
4. [受保护 API](#受保护-api)
5. [错误处理](#错误处理)
6. [使用示例](#使用示例)

---

## 认证

本 API 使用 **JWT (JSON Web Token)** 进行身份验证。

### 认证流程

1. 用户通过 `/api/auth/login` 或 `/api/auth/register` 获取 token
2. token 以 HTTP-only cookie 形式存储在客户端
3. 后续请求会自动携带 cookie
4. 中间件验证 token 的有效性

### 测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@7zi.com | admin123 | admin |
| user@7zi.com | user123 | user |

---

## API 端点

### 认证 API

#### 登录

```http
POST /api/auth/login
```

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**成功响应** (200):

```json
{
  "message": "Login successful",
  "user": {
    "id": "1",
    "email": "admin@7zi.com",
    "name": "Admin User",
    "role": "admin",
    "createdAt": "2026-03-06T00:00:00.000Z"
  }
}
```

**错误响应** (401):

```json
{
  "error": "Invalid credentials"
}
```

---

#### 注册

```http
POST /api/auth/register
```

**请求体**:

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}
```

**成功响应** (200):

```json
{
  "message": "Registration successful",
  "user": {
    "id": "3",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "user",
    "createdAt": "2026-03-06T00:00:00.000Z"
  }
}
```

**错误响应** (409):

```json
{
  "error": "User with this email already exists"
}
```

---

#### 登出

```http
POST /api/auth/logout
```

**成功响应** (200):

```json
{
  "message": "Logout successful"
}
```

---

#### 获取当前用户

```http
GET /api/auth/me
```

**请求头**: 自动携带 Cookie

**成功响应** (200):

```json
{
  "userId": "1",
  "email": "admin@7zi.com",
  "role": "admin"
}
```

**错误响应** (401):

```json
{
  "error": "Not authenticated"
}
```

---

### 受保护 API

#### 示例受保护路由

```http
GET /api/protected
```

**请求头**: 自动携带 Cookie

**成功响应** (200):

```json
{
  "message": "This is a protected route",
  "user": {
    "userId": "1",
    "email": "admin@7zi.com",
    "role": "admin"
  },
  "data": {
    "projects": ["7zi Studio", "AI Dashboard", "OpenClaw"],
    "stats": {
      "totalIssues": 42,
      "openIssues": 12,
      "closedIssues": 30,
      "totalCommits": 156
    }
  }
}
```

**错误响应** (401):

```json
{
  "error": "Unauthorized - No token provided"
}
```

---

## 错误处理

### 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "error": "错误描述信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 (无效或缺失 token) |
| 409 | 资源冲突 (如用户已存在) |
| 500 | 服务器内部错误 |

### 错误响应示例

**400 - 请求参数错误**:

```json
{
  "error": "Email and password are required"
}
```

**401 - 未授权**:

```json
{
  "error": "Unauthorized - Invalid token"
}
```

**409 - 冲突**:

```json
{
  "error": "User with this email already exists"
}
```

---

## 使用示例

### 使用 Fetch API

#### 登录

```javascript
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // 重要：包含 cookies
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('Logged in:', data.user);
  } else {
    const error = await response.json();
    console.error('Login failed:', error.error);
  }
}
```

#### 获取当前用户

```javascript
async function getCurrentUser() {
  const response = await fetch('/api/auth/me', {
    credentials: 'include'
  });
  
  if (response.ok) {
    return await response.json();
  }
  return null;
}
```

#### 登出

```javascript
async function logout() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (response.ok) {
    console.log('Logged out successfully');
  }
}
```

#### 访问受保护路由

```javascript
async function fetchProtectedData() {
  const response = await fetch('/api/protected', {
    credentials: 'include'
  });
  
  if (response.ok) {
    return await response.json();
  }
  throw new Error('Access denied');
}
```

### 使用 cURL

#### 登录

```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@7zi.com","password":"admin123"}' \
  -c cookies.txt
```

#### 获取当前用户

```bash
curl https://your-domain.com/api/auth/me \
  -b cookies.txt
```

#### 登出

```bash
curl -X POST https://your-domain.com/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

---

## 前端集成

### React Hook 示例

```tsx
'use client';

import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me', { 
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
      await fetchUser();
      return true;
    }
    return false;
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  }

  return { user, loading, login, logout };
}
```

---

## 安全注意事项

1. **JWT Secret**: 确保在生产环境中设置强随机值的 `JWT_SECRET`
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **Cookie 安全**: 
   - `httpOnly`: 防止 XSS 攻击
   - `secure`: 仅在 HTTPS 中传输
   - `sameSite`: 防止 CSRF 攻击
4. **密码**: 生产环境应使用更强的密码策略

---

## 相关文件

- 认证逻辑: `lib/auth.ts`
- 用户数据: `lib/users.ts`
- 中间件: `middleware.ts`
- 环境变量: `.env.example`

---

*文档由 7zi Studio AI 团队维护 🤖*
