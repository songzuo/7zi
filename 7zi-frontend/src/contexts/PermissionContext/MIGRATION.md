# PermissionContext Migration Guide

## 概述

v1.5.0 版本引入了新的 `PermissionContext` 用于统一权限管理。本指南帮助你从旧的权限系统迁移到新的系统。

## 迁移步骤

### 1. 更新 auth.ts 导出

在 `src/lib/auth.ts` 中，添加对新权限类型的导出，确保向后兼容：

```typescript
// 添加以下导出
export { Role, Permission, type User } from '@/contexts/PermissionContext';
export {
  checkPermission,
  checkPermissions,
  checkRole,
  checkIsAdmin,
  createUserFromPayload,
} from '@/contexts/PermissionContext/utils';
```

### 2. 更新 middleware.ts

在 `src/middleware.ts` 中，使用新的权限工具函数：

```typescript
// 添加导入
import { createUserFromPayload, Permission, Role } from '@/contexts/PermissionContext';

// 在 verifyAuthToken 函数中，使用 createUserFromPayload 创建用户对象
async function verifyAuthToken(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get('auth-token')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  const jwtToken = token || bearerToken;

  if (!jwtToken) {
    return null;
  }

  try {
    const payload = await verifyJWT(jwtToken);
    // 使用新工具函数创建用户对象
    return createUserFromPayload({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    });
  } catch (error) {
    console.error('[Middleware] Token verification failed:', error);
    return null;
  }
}
```

### 3. 在组件中使用权限检查

#### 使用 usePermission Hook

```typescript
import { usePermission, Permission } from '@/contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, isAdmin } = usePermission();

  if (!hasPermission(Permission.WRITE)) {
    return <div>无写入权限</div>;
  }

  return (
    <div>
      <button>执行写入操作</button>
    </div>
  );
}
```

#### 使用权限守卫组件

```typescript
import { PermissionGuard, AdminGuard, Permission } from '@/contexts/PermissionContext';

function MyComponent() {
  return (
    <div>
      <PermissionGuard permissions={[Permission.WRITE]}>
        <button>写入操作</button>
      </PermissionGuard>

      <AdminGuard>
        <button>管理员操作</button>
      </AdminGuard>
    </div>
  );
}
```

### 4. 服务器端权限检查

```typescript
import { checkPermission, Permission } from '@/contexts/PermissionContext';
import { getUserFromRequest } from '@/lib/auth';

async function handleRequest(request: Request) {
  const user = await getUserFromRequest(request);

  if (!checkPermission(user, Permission.ADMIN).allowed) {
    return Response.json({ error: '权限不足' }, { status: 403 });
  }

  // 执行需要管理员权限的操作
}
```

## 主要变更

### 1. 用户角色

旧系统使用 `UserRole` 枚举，新系统使用 `Role` 枚举：

```typescript
// 旧系统
import { UserRole } from '@/lib/auth';

// 新系统
import { Role } from '@/contexts/PermissionContext';
```

### 2. 权限检查

旧系统使用独立函数，新系统提供统一的 Context 和 Hook：

```typescript
// 旧系统
import { hasPermission, hasAllPermissions } from '@/lib/auth';
const result = hasPermission(user, Permission.READ);

// 新系统
import { usePermission } from '@/contexts/PermissionContext';
const { hasPermission } = usePermission();
const result = hasPermission(Permission.READ);
```

### 3. 权限枚举

新系统扩展了权限列表，增加了更多细粒度的权限：

```typescript
export enum Permission {
  // 基础权限
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',

  // 资源权限
  USER_MANAGE = 'user:manage',
  ROOM_MANAGE = 'room:manage',
  DATA_IMPORT = 'data:import',
  DATA_EXPORT = 'data:export',

  // 管理权限
  ADMIN = 'admin',
  SETTINGS = 'settings',
  AUDIT = 'audit',
}
```

## 兼容性说明

为了确保平滑迁移，我们保持了向后兼容性：

1. 旧有的 `UserRole` 枚举仍然可以通过 `@/lib/auth` 导出
2. 旧的权限检查函数仍然可用
3. 现有的认证流程不需要修改

建议：
1. 新代码使用新的 `PermissionContext`
2. 旧代码可以逐步迁移
3. 完全迁移后可以移除旧的权限检查函数

## 最佳实践

### 1. 在组件中使用权限守卫

使用 `PermissionGuard` 组件而不是条件渲染，代码更清晰：

```typescript
// 推荐
<PermissionGuard permissions={[Permission.WRITE]}>
  <button>写入</button>
</PermissionGuard>

// 不推荐
{hasPermission(Permission.WRITE) && <button>写入</button>}
```

### 2. 使用服务器端权限检查

对于敏感操作，必须在服务器端进行权限检查：

```typescript
import { checkPermissions } from '@/contexts/PermissionContext';

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);

  if (!checkPermissions(user, [Permission.DELETE, Permission.ADMIN]).allowed) {
    return Response.json({ error: '权限不足' }, { status: 403 });
  }

  // 执行删除操作
}
```

### 3. 资源访问控制

使用 `canAccessResource` 检查资源访问权限：

```typescript
const { canAccessResource } = usePermission();

const isOwnerOrAdmin = canAccessResource(resourceOwnerId, Permission.WRITE);
```

## 测试清单

- [ ] TypeScript 编译无错误
- [ ] 构建成功
- [ ] 权限检查逻辑正确
- [ ] 管理员权限正常
- [ ] 普通用户权限正常
- [ ] 未登录用户无法访问受保护资源
- [ ] 权限守卫组件正常工作

## 支持

如有问题，请查看：
- `/root/.openclaw/workspace/7zi-frontend/src/contexts/PermissionContext/`
- 测试文件：`src/contexts/PermissionContext/__tests__/`
