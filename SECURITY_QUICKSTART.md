# 🚀 安全功能快速启动指南

## 1. 启动开发服务器

```bash
cd /root/.openclaw/workspace
npm run dev
```

## 2. 测试认证系统

### 登录 (获取 Token)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@7zi.studio","password":"admin123"}' \
  -c cookies.txt -v
```

**响应示例**:
```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "email": "admin@7zi.studio",
    "name": "Administrator",
    "role": "admin"
  },
  "csrfToken": "abc123..."
}
```

### 获取当前用户信息

```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### 登出

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## 3. 测试 CSRF 保护

### 尝试无 CSRF Token 的请求 (应该失败)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task"}' \
  -b cookies.txt
```

**预期响应** (403):
```json
{
  "error": "CSRF token missing",
  "code": "CSRF_MISSING"
}
```

### 使用 CSRF Token 的请求 (应该成功)

```bash
# 先获取 CSRF Token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/auth?action=csrf \
  -b cookies.txt | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

# 使用 Token 创建任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"title":"Test Task"}' \
  -b cookies.txt
```

## 4. 测试管理员权限

### 删除日志 (需要管理员)

```bash
curl -X DELETE "http://localhost:3000/api/logs?days=30" \
  -b cookies.txt
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "deleted": 100,
    "message": "Deleted 100 log entries older than 30 days",
    "deletedBy": "admin@7zi.studio",
    "deletedAt": "2026-03-08T..."
  }
}
```

## 5. 检查密钥强度

```bash
curl http://localhost:3000/api/auth?action=check-secret
```

**预期响应**:
```json
{
  "success": true,
  "secretStrength": {
    "valid": true,
    "issues": []
  },
  "isDefault": false
}
```

## 6. 前端集成示例

### React/Next.js 组件

```typescript
// components/SecurityProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface SecurityContextType {
  user: User | null;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 获取 CSRF Token
    fetch('/api/auth?action=csrf', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken));

    // 检查登录状态
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      setCsrfToken(data.csrfToken);
    } else {
      throw new Error(data.error);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setCsrfToken(null);
  };

  return (
    <SecurityContext.Provider value={{ user, csrfToken, login, logout, isLoading }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
}
```

### 使用示例

```typescript
// 在页面中使用
'use client';

import { useSecurity } from '@/components/SecurityProvider';

export default function MyPage() {
  const { user, csrfToken, login, logout } = useSecurity();

  const handleCreateTask = async () => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ title: 'New Task' }),
    });
    
    // 处理响应...
  };

  if (!user) {
    return <button onClick={() => login('admin@7zi.studio', 'admin123')}>
      登录
    </button>;
  }

  return (
    <div>
      <p>欢迎，{user.name} ({user.role})</p>
      <button onClick={logout}>登出</button>
      <button onClick={handleCreateTask}>创建任务</button>
    </div>
  );
}
```

## 7. 环境变量配置

确保 `.env` 文件包含:

```bash
# 安全密钥 (已配置)
JWT_SECRET=7d8dbba1708743c54054daee77ce1966daf2af208516509e7c213b28f2e3fd15
CSRF_SECRET=2dc62c3f652b09885b3c2c8d322bd0a59c4d71775a91315cb3ced82533cf0dd5
```

## 8. 常见问题

### Q: CSRF Token 不匹配？

A: 确保:
1. Cookie 已正确设置 (`credentials: 'include'`)
2. Header 中包含 `x-csrf-token`
3. Token 是从最新的响应中获取的

### Q: 401 认证错误？

A: Token 可能已过期:
1. 尝试刷新 Token: `POST /api/auth/refresh`
2. 或重新登录

### Q: 403 权限错误？

A: 当前用户不是管理员:
1. 检查用户角色: `GET /api/auth/me`
2. 使用管理员账号登录

---

*安全启动指南 - 2026-03-08*
