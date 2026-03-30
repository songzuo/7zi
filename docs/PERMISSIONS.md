# 权限系统文档 (Permissions System)

**版本**: v1.4.0
**最后更新**: 2026-03-29

## 目录

- [快速开始](#快速开始)
- [权限系统概述](#权限系统概述)
- [v1.4.0 WebSocket 权限系统](#v140-websocket-权限系统)
- [任务权限系统](#任务权限系统)
- [角色定义](#角色定义)
- [权限列表](#权限列表)
- [权限分组](#权限分组)
- [API 参考](#api-参考)
- [中间件](#中间件)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 快速开始

### 安装和导入

```typescript
// 任务权限系统
import {
  Permission,
  Role,
  PermissionChecker,
  hasPermission,
  hasPermissions,
  withPermission,
  permissionChecker
} from '@/lib/permissions';

// WebSocket 权限系统 (v1.4.0)
import {
  getPermissionManager,
  UserRole,
  Permission as WSPermission
} from '@/lib/websocket/permissions';
```

### 基础用法

```typescript
// 1. 加载用户权限
permissionChecker.loadUserPermissions({
  userId: 'user-123',
  role: Role.MEMBER,
  permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
});

// 2. 检查单个权限
const canCreateTask = hasPermission('user-123', Permission.TASK_CREATE);
console.log(canCreateTask); // true

// 3. 批量检查权限
const canManageTasks = hasPermissions('user-123', [
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
]);
console.log(canManageTasks); // true

// 4. 使用 PermissionChecker 类
const checker = new PermissionChecker();
checker.loadUserPermissions({
  userId: 'user-456',
  role: Role.MANAGER,
  permissions: [Permission.TASK_ASSIGN, Permission.TEAM_INVITE],
});

const result = checker.check('user-456', Permission.TASK_ASSIGN);
console.log(result.granted); // true
```

---

## 权限系统概述

本权限系统基于 **RBAC (Role-Based Access Control)** 模型，提供细粒度的权限管理能力。

### 核心特性

- ✅ **基于角色的访问控制** - 预定义4个角色层级
- ✅ **细粒度权限** - 23个独立权限覆盖所有功能
- ✅ **权限分组** - 按功能模块组织权限
- ✅ **自定义权限** - 支持在角色基础上添加额外权限
- ✅ **中间件支持** - API 路由权限保护
- ✅ **类型安全** - 完整的 TypeScript 类型定义

### 架构设计

```
用户 (User)
  │
  ├── 角色 (Role)
  │     └── 角色权限 (Role Permissions)
  │
  └── 自定义权限 (Custom Permissions)
        └── 额外授权
```

---

## v1.4.0 WebSocket 权限系统

v1.4.0 引入了 **WebSocket 房间权限系统**，用于控制房间内的用户行为。这与任务权限系统是独立的两个系统。

### 核心特性

- ✅ **5 种角色层级** - owner > admin > moderator > member > guest
- ✅ **16 种细粒度权限** - 房间权限(7) + 消息权限(6) + 管理权限(3)
- ✅ **RBAC 集成** - 角色层级强制、权限授予/撤销
- ✅ **临时权限** - 支持过期时间的权限授予
- ✅ **封禁系统** - 用户封禁、权限自动撤销

### WebSocket 角色定义

| 角色 | 层级 | 描述 | 默认权限数 |
|------|------|------|-----------|
| `owner` | 最高 | 房间所有者，完全控制 | 16 (所有权限) |
| `admin` | 高 | 管理员，除删除房间外 | 15 |
| `moderator` | 中 | 版主，管理消息和用户 | 12 |
| `member` | 低 | 成员，基础权限 | 10 |
| `guest` | 最低 | 访客，只读权限 | 6 |

### WebSocket 权限列表

#### 房间权限 (7 种)

| 权限 | 说明 | Guest | Member | Moderator | Admin | Owner |
|------|------|-------|--------|-----------|-------|-------|
| `room:join` | 加入房间 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `room:leave` | 离开房间 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `room:manage` | 管理房间设置 | ❌ | ❌ | ✅ | ✅ | ✅ |
| `room:view` | 查看房间内容 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `room:invite` | 邀请用户 | ❌ | ❌ | ✅ | ✅ | ✅ |
| `room:kick` | 踢出用户 | ❌ | ❌ | ✅ | ✅ | ✅ |
| `room:ban` | 封禁用户 | ❌ | ❌ | ✅ | ✅ | ✅ |

#### 消息权限 (6 种)

| 权限 | 说明 | Guest | Member | Moderator | Admin | Owner |
|------|------|-------|--------|-----------|-------|-------|
| `message:send` | 发送消息 | ❌ | ✅ | ✅ | ✅ | ✅ |
| `message:edit` | 编辑自己的消息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `message:delete` | 删除自己的消息 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `message:react` | 添加反应 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `message:pin` | 置顶消息 | ❌ | ❌ | ✅ | ✅ | ✅ |
| `message:view_history` | 查看消息历史 | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 管理权限 (3 种)

| 权限 | 说明 | Guest | Member | Moderator | Admin | Owner |
|------|------|-------|--------|-----------|-------|-------|
| `admin:manage_users` | 管理用户 | ❌ | ❌ | ❌ | ✅ | ✅ |
| `admin:manage_rooms` | 管理房间设置 | ❌ | ❌ | ❌ | ✅ | ✅ |
| `admin:manage_permissions` | 管理权限 | ❌ | ❌ | ❌ | ✅ | ✅ |

### 使用示例

```typescript
import { getPermissionManager } from '@/lib/websocket/permissions';

const permissionManager = getPermissionManager();

// 设置用户角色
permissionManager.setUserRole(
  'user-456',           // 用户 ID
  'project-alpha-2024', // 房间 ID
  'admin',              // 角色
  'user-123'            // 授权者 (必须是 owner/admin)
);

// 检查权限
if (permissionManager.hasPermission('user-456', 'project-alpha-2024', 'message:send')) {
  console.log('用户可以发送消息');
}

// 授予临时权限 (24 小时后过期)
permissionManager.grantPermission(
  'user-789',
  'project-alpha-2024',
  'message:pin',
  Date.now() + (24 * 60 * 60 * 1000)
);
```

### 详细文档

- **[api/websocket.md](./api/websocket.md)** - WebSocket 权限 API 完整文档
- **[adr/0008-websocket-room-system-design.md](./adr/0008-websocket-room-system-design.md)** - 设计决策

---

## 任务权限系统

系统定义了4个角色，层级从高到低：

### 1. 管理员 (Admin)

- **层级**: 100 (最高)
- **权限**: 所有权限
- **描述**: 拥有系统的完全控制权，可以管理所有功能和用户

**典型权限**:
```typescript
[
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
  Permission.USER_CREATE,
  Permission.USER_DELETE,
  Permission.USER_MANAGE_ROLE,
  Permission.TEAM_MANAGE,
  Permission.SETTINGS_UPDATE,
  // ... 所有其他权限
]
```

### 2. 经理 (Manager)

- **层级**: 50
- **权限**: 任务管理、团队管理、报告查看
- **描述**: 可以管理任务、查看报告、邀请成员

**典型权限**:
```typescript
[
  // 任务权限（完整）
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
  Permission.TASK_BATCH,
  
  // 用户权限（只读）
  Permission.USER_READ,
  
  // 团队权限
  Permission.TEAM_INVITE,
  Permission.TEAM_REMOVE_MEMBER,
  
  // 报告权限（完整）
  Permission.REPORTS_READ,
  Permission.REPORTS_EXPORT,
  Permission.REPORTS_GENERATE,
  
  // 标签权限
  Permission.TAG_CREATE,
  Permission.TAG_UPDATE,
  Permission.TAG_DELETE,
  
  // 通知权限
  Permission.NOTIFICATION_SEND,
]
```

### 3. 成员 (Member)

- **层级**: 20
- **权限**: 管理自己的任务、查看报告
- **描述**: 可以创建和管理自己的任务

**典型权限**:
```typescript
[
  // 任务权限（仅自己的）
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  
  // 用户权限（只读）
  Permission.USER_READ,
  
  // 报告权限（只读）
  Permission.REPORTS_READ,
  
  // 通知权限
  Permission.NOTIFICATION_SEND,
]
```

### 4. 观察者 (Viewer)

- **层级**: 10 (最低)
- **权限**: 仅查看
- **描述**: 只能查看任务和报告，不能修改

**典型权限**:
```typescript
[
  Permission.TASK_READ,
  Permission.USER_READ,
  Permission.REPORTS_READ,
]
```

### 角色层级关系

```typescript
import { RoleHierarchy, compareRoles, canManageRole } from '@/lib/permissions';

// 角色层级
console.log(RoleHierarchy[Role.ADMIN]);   // 100
console.log(RoleHierarchy[Role.MANAGER]); // 50
console.log(RoleHierarchy[Role.MEMBER]);  // 20
console.log(RoleHierarchy[Role.VIEWER]);  // 10

// 比较角色
compareRoles(Role.ADMIN, Role.MANAGER);  // 1 (Admin > Manager)
compareRoles(Role.MEMBER, Role.ADMIN);   // -1 (Member < Admin)
compareRoles(Role.MANAGER, Role.MANAGER); // 0 (相等)

// 检查是否可以管理
canManageRole(Role.ADMIN, Role.MANAGER);  // true
canManageRole(Role.MEMBER, Role.MANAGER); // false
```

---

## 权限列表

系统定义了23个权限，按功能模块分组：

### 任务管理权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `TASK_CREATE` | `task:create` | 创建任务 |
| `TASK_READ` | `task:read` | 查看任务 |
| `TASK_UPDATE` | `task:update` | 更新任务 |
| `TASK_DELETE` | `task:delete` | 删除任务 |
| `TASK_ASSIGN` | `task:assign` | 分配任务给他人 |
| `TASK_BATCH` | `task:batch` | 批量操作任务 |

### 用户管理权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `USER_CREATE` | `user:create` | 创建用户 |
| `USER_READ` | `user:read` | 查看用户信息 |
| `USER_UPDATE` | `user:update` | 更新用户信息 |
| `USER_DELETE` | `user:delete` | 删除用户 |
| `USER_MANAGE_ROLE` | `user:manage-role` | 管理用户角色 |

### 团队管理权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `TEAM_MANAGE` | `team:manage` | 管理团队设置 |
| `TEAM_INVITE` | `team:invite` | 邀请成员加入 |
| `TEAM_REMOVE_MEMBER` | `team:remove-member` | 移除团队成员 |

### 报告权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `REPORTS_READ` | `reports:read` | 查看报告 |
| `REPORTS_EXPORT` | `reports:export` | 导出报告 |
| `REPORTS_GENERATE` | `reports:generate` | 生成报告 |

### 系统设置权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `SETTINGS_READ` | `settings:read` | 查看系统设置 |
| `SETTINGS_UPDATE` | `settings:update` | 更新系统设置 |

### 标签管理权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `TAG_CREATE` | `tag:create` | 创建标签 |
| `TAG_UPDATE` | `tag:update` | 更新标签 |
| `TAG_DELETE` | `tag:delete` | 删除标签 |

### 通知管理权限

| 权限 | 值 | 说明 |
|------|-----|------|
| `NOTIFICATION_SEND` | `notification:send` | 发送通知 |
| `NOTIFICATION_MANAGE` | `notification:manage` | 管理通知设置 |

### 完整权限枚举

```typescript
import { Permission } from '@/lib/permissions';

// 使用权限枚举
const permission = Permission.TASK_CREATE;
console.log(permission); // "task:create"

// 获取所有权限
const allPermissions = Object.values(Permission);
console.log(allPermissions.length); // 23
```

---

## 权限分组

为了便于UI展示和管理，权限按功能模块分组：

```typescript
import { PermissionGroups } from '@/lib/permissions';

console.log(PermissionGroups);
// [
//   { name: '任务管理', permissions: [...] },
//   { name: '用户管理', permissions: [...] },
//   { name: '团队管理', permissions: [...] },
//   { name: '报告管理', permissions: [...] },
//   { name: '系统设置', permissions: [...] },
//   { name: '标签管理', permissions: [...] },
//   { name: '通知管理', permissions: [...] }
// ]
```

### UI 展示示例

```typescript
import { PermissionGroups, RoleLabels } from '@/lib/permissions';

function PermissionMatrix() {
  return (
    <table>
      <thead>
        <tr>
          <th>权限</th>
          {Object.values(Role).map(role => (
            <th key={role}>{RoleLabels[role]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PermissionGroups.map(group => (
          <>
            <tr key={group.name}>
              <td colSpan={5}><strong>{group.name}</strong></td>
            </tr>
            {group.permissions.map(permission => (
              <tr key={permission}>
                <td>{permission}</td>
                {Object.values(Role).map(role => (
                  <td key={role}>
                    {roleHasPermission(role, permission) ? '✓' : '✗'}
                  </td>
                ))}
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}
```

---

## API 参考

### PermissionChecker 类

权限检查器核心类，用于管理和检查用户权限。

#### 构造函数

```typescript
const checker = new PermissionChecker();
```

#### 方法

##### loadUserPermissions()

加载用户权限信息。

```typescript
loadUserPermissions(userInfo: UserPermissionInfo): void

interface UserPermissionInfo {
  userId: string;
  role: Role;
  permissions: Permission[];
  customPermissions?: Permission[];
}
```

**示例**:
```typescript
checker.loadUserPermissions({
  userId: 'user-123',
  role: Role.MEMBER,
  permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
  customPermissions: [Permission.TEAM_INVITE], // 可选：额外权限
});
```

##### check()

检查用户是否有某个权限。

```typescript
check(userId: string, permission: Permission): PermissionCheckResult

interface PermissionCheckResult {
  granted: boolean;
  permission: Permission;
  reason?: string;
}
```

**示例**:
```typescript
const result = checker.check('user-123', Permission.TASK_CREATE);
if (result.granted) {
  console.log('权限通过');
} else {
  console.log('权限拒绝:', result.reason);
}
```

##### checkMultiple()

批量检查多个权限。

```typescript
checkMultiple(
  userId: string,
  permissions: Permission[]
): Record<Permission, PermissionCheckResult>
```

**示例**:
```typescript
const results = checker.checkMultiple('user-123', [
  Permission.TASK_CREATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
]);

results[Permission.TASK_CREATE].granted; // true
results[Permission.TASK_DELETE].granted; // false
results[Permission.TASK_ASSIGN].granted; // false
```

##### hasAll()

检查用户是否有所有指定权限。

```typescript
hasAll(userId: string, permissions: Permission[]): boolean
```

**示例**:
```typescript
const canFullyManage = checker.hasAll('user-123', [
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
]);
```

##### hasAny()

检查用户是否有任意一个指定权限。

```typescript
hasAny(userId: string, permissions: Permission[]): boolean
```

**示例**:
```typescript
const canAccess = checker.hasAny('user-123', [
  Permission.TASK_READ,
  Permission.REPORTS_READ,
]);
```

##### getUserPermissions()

获取用户的所有权限列表。

```typescript
getUserPermissions(userId: string): Permission[]
```

**示例**:
```typescript
const permissions = checker.getUserPermissions('user-123');
console.log(permissions); // ['task:create', 'task:read', ...]
```

##### getUserRole()

获取用户角色。

```typescript
getUserRole(userId: string): Role | undefined
```

**示例**:
```typescript
const role = checker.getUserRole('user-123');
console.log(role); // 'member'
```

##### addCustomPermission()

添加自定义权限。

```typescript
addCustomPermission(userId: string, permission: Permission): void
```

**示例**:
```typescript
checker.addCustomPermission('user-123', Permission.TEAM_INVITE);
```

##### removeCustomPermission()

移除自定义权限。

```typescript
removeCustomPermission(userId: string, permission: Permission): void
```

**示例**:
```typescript
checker.removeCustomPermission('user-123', Permission.TEAM_INVITE);
```

##### clearUser()

清除用户权限缓存。

```typescript
clearUser(userId: string): void
```

##### clearAll()

清除所有用户权限缓存。

```typescript
clearAll(): void
```

### 便捷函数

##### hasPermission()

检查用户是否有某个权限（使用全局检查器）。

```typescript
hasPermission(userId: string, permission: Permission): boolean
```

**示例**:
```typescript
import { hasPermission, Permission } from '@/lib/permissions';

if (hasPermission('user-123', Permission.TASK_CREATE)) {
  // 允许创建任务
}
```

##### hasPermissions()

批量检查权限（使用全局检查器）。

```typescript
hasPermissions(userId: string, permissions: Permission[]): boolean
```

**示例**:
```typescript
import { hasPermissions, Permission } from '@/lib/permissions';

if (hasPermissions('user-123', [
  Permission.TASK_CREATE,
  Permission.TASK_READ,
])) {
  // 允许操作
}
```

### 角色配置函数

##### getRolePermissions()

获取角色的所有权限。

```typescript
getRolePermissions(role: Role): Permission[]
```

**示例**:
```typescript
import { getRolePermissions, Role } from '@/lib/permissions';

const memberPerms = getRolePermissions(Role.MEMBER);
console.log(memberPerms);
// ['task:create', 'task:read', 'task:update', ...]
```

##### roleHasPermission()

检查角色是否拥有特定权限。

```typescript
roleHasPermission(role: Role, permission: Permission): boolean
```

**示例**:
```typescript
import { roleHasPermission, Role, Permission } from '@/lib/permissions';

const canAssign = roleHasPermission(Role.MANAGER, Permission.TASK_ASSIGN);
console.log(canAssign); // true
```

##### compareRoles()

比较两个角色的层级。

```typescript
compareRoles(role1: Role, role2: Role): number
// 返回: 1 (role1 > role2), -1 (role1 < role2), 0 (相等)
```

##### canManageRole()

检查角色1是否可以管理角色2。

```typescript
canManageRole(managerRole: Role, targetRole: Role): boolean
```

**示例**:
```typescript
import { canManageRole, Role } from '@/lib/permissions';

canManageRole(Role.ADMIN, Role.MANAGER);  // true
canManageRole(Role.MEMBER, Role.MANAGER); // false
```

##### getAssignableRoles()

获取用户可分配的角色（不能分配比自己高或相等的角色）。

```typescript
getAssignableRoles(currentRole: Role): Role[]
```

**示例**:
```typescript
import { getAssignableRoles, Role } from '@/lib/permissions';

const assignable = getAssignableRoles(Role.MANAGER);
console.log(assignable); // [Role.MEMBER, Role.VIEWER]
```

---

## 中间件

权限系统提供了多种中间件用于保护 API 路由。

### withPermission()

单个权限检查中间件。

```typescript
import { withPermission, Permission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withPermission(Permission.TASK_CREATE)(
  async (request: NextRequest, context) => {
    // context.user 包含认证用户信息
    const { user } = context;
    
    // 处理请求...
    return NextResponse.json({ success: true });
  }
);
```

### withAllPermissions()

多权限检查中间件（需要所有权限）。

```typescript
import { withAllPermissions, Permission } from '@/lib/permissions';

export const POST = withAllPermissions([
  Permission.TASK_CREATE,
  Permission.TASK_ASSIGN,
])(
  async (request, context) => {
    // 需要同时拥有 TASK_CREATE 和 TASK_ASSIGN 权限
    return NextResponse.json({ success: true });
  }
);
```

### withAnyPermission()

多权限检查中间件（需要任意一个权限）。

```typescript
import { withAnyPermission, Permission } from '@/lib/permissions';

export const GET = withAnyPermission([
  Permission.TASK_READ,
  Permission.REPORTS_READ,
])(
  async (request, context) => {
    // 拥有 TASK_READ 或 REPORTS_READ 任意一个即可
    return NextResponse.json({ data: [] });
  }
);
```

### withRole()

角色检查中间件。

```typescript
import { withRole, Role } from '@/lib/permissions';

export const DELETE = withRole(Role.MANAGER)(
  async (request, context) => {
    // 需要 MANAGER 或更高角色
    return NextResponse.json({ success: true });
  }
);
```

### adminOnly()

管理员专用中间件。

```typescript
import { adminOnly } from '@/lib/permissions';

export const POST = adminOnly(async (request, context) => {
  // 仅管理员可访问
  return NextResponse.json({ success: true });
});
```

### managerOrAbove()

经理及以上中间件。

```typescript
import { managerOrAbove } from '@/lib/permissions';

export const PUT = managerOrAbove(async (request, context) => {
  // 经理及以上可访问
  return NextResponse.json({ success: true });
});
```

### withResourceOwnership()

资源所有权检查中间件。

```typescript
import { withResourceOwnership, Permission } from '@/lib/permissions';

// 假设有一个任务更新接口，只有任务所有者或管理员可以访问
export const PUT = withResourceOwnership(
  async (request) => {
    // 从请求中获取资源所有者ID
    const taskId = request.url.split('/').pop();
    // 从数据库查询任务所有者
    const task = await getTask(taskId);
    return task?.ownerId || null;
  }
)(
  async (request, context) => {
    // context.isOwner 表示是否为资源所有者
    // context.user.role === Role.ADMIN 时也会通过
    const { user, isOwner } = context;
    
    // 更新任务...
    return NextResponse.json({ success: true });
  }
);
```

### canAssignRole()

角色分配检查中间件。

```typescript
import { canAssignRole, Role } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export const POST = canAssignRole(
  async (request, context) => {
    const { user, targetRole } = context;
    
    // 分配角色...
    return NextResponse.json({ success: true });
  },
  (request: NextRequest) => {
    // 从请求中提取目标角色
    const body = await request.json();
    return body.role as Role;
  }
);
```

---

## 使用示例

### 示例 1: API 路由权限保护

```typescript
// app/api/tasks/route.ts
import { withPermission, Permission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// 创建任务 - 需要 TASK_CREATE 权限
export const POST = withPermission(Permission.TASK_CREATE)(
  async (request: NextRequest, context) => {
    const { user } = context;
    const body = await request.json();
    
    const task = await createTask({
      ...body,
      createdBy: user.id,
    });
    
    return NextResponse.json(task);
  }
);

// 查看任务 - 需要 TASK_READ 权限
export const GET = withPermission(Permission.TASK_READ)(
  async (request: NextRequest, context) => {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  }
);
```

### 示例 2: 条件渲染 UI 组件

```typescript
// components/TaskActions.tsx
import { hasPermission, Permission } from '@/lib/permissions';
import { useSession } from 'next-auth/react';

export function TaskActions({ taskId }: { taskId: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  if (!userId) return null;
  
  const canEdit = hasPermission(userId, Permission.TASK_UPDATE);
  const canDelete = hasPermission(userId, Permission.TASK_DELETE);
  const canAssign = hasPermission(userId, Permission.TASK_ASSIGN);
  
  return (
    <div className="flex gap-2">
      {canEdit && (
        <button onClick={() => editTask(taskId)}>编辑</button>
      )}
      {canAssign && (
        <button onClick={() => assignTask(taskId)}>分配</button>
      )}
      {canDelete && (
        <button onClick={() => deleteTask(taskId)}>删除</button>
      )}
    </div>
  );
}
```

### 示例 3: 批量操作权限检查

```typescript
// lib/task-actions.ts
import { PermissionChecker, Permission } from '@/lib/permissions';

const checker = new PermissionChecker();

export async function batchUpdateTasks(
  userId: string,
  taskIds: string[],
  updates: any
) {
  // 加载用户权限
  await loadUserPermissions(userId, checker);
  
  // 检查是否有批量操作权限
  if (!checker.check(userId, Permission.TASK_BATCH).granted) {
    throw new Error('没有批量操作权限');
  }
  
  // 检查是否有更新权限
  if (!checker.check(userId, Permission.TASK_UPDATE).granted) {
    throw new Error('没有任务更新权限');
  }
  
  // 执行批量更新
  const results = await Promise.all(
    taskIds.map(id => updateTask(id, updates))
  );
  
  return results;
}
```

### 示例 4: 自定义权限管理

```typescript
// app/api/users/[id]/permissions/route.ts
import { withPermission, Permission, permissionChecker } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// 为用户添加自定义权限
export const POST = withPermission(Permission.USER_MANAGE_ROLE)(
  async (request: NextRequest, context) => {
    const { id } = request.params;
    const { permission } = await request.json();
    
    // 添加自定义权限
    permissionChecker.addCustomPermission(id, permission);
    
    // 保存到数据库
    await saveUserCustomPermission(id, permission);
    
    return NextResponse.json({ success: true });
  }
);

// 移除用户自定义权限
export const DELETE = withPermission(Permission.USER_MANAGE_ROLE)(
  async (request: NextRequest, context) => {
    const { id } = request.params;
    const { permission } = await request.json();
    
    permissionChecker.removeCustomPermission(id, permission);
    await removeUserCustomPermission(id, permission);
    
    return NextResponse.json({ success: true });
  }
);
```

### 示例 5: 角色管理

```typescript
// app/api/users/[id]/role/route.ts
import { 
  withPermission, 
  Permission, 
  canAssignRole,
  getAssignableRoles 
} from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// 获取可分配的角色列表
export const GET = withPermission(Permission.USER_MANAGE_ROLE)(
  async (request: NextRequest, context) => {
    const { user } = context;
    const assignable = getAssignableRoles(user.role);
    
    return NextResponse.json({ roles: assignable });
  }
);

// 分配角色
export const POST = canAssignRole(
  async (request: NextRequest, context) => {
    const { id } = request.params;
    const { user, targetRole } = context;
    
    // 更新用户角色
    await updateUserRole(id, targetRole);
    
    // 清除权限缓存
    permissionChecker.clearUser(id);
    
    return NextResponse.json({ success: true });
  },
  async (request: NextRequest) => {
    const body = await request.json();
    return body.role;
  }
);
```

### 示例 6: 权限矩阵展示

```typescript
// components/PermissionMatrix.tsx
import { 
  PermissionGroups, 
  Role, 
  RoleLabels,
  RoleDescriptions,
  roleHasPermission 
} from '@/lib/permissions';

export function PermissionMatrix() {
  return (
    <div className="permission-matrix">
      <h2>权限矩阵</h2>
      
      {/* 角色说明 */}
      <div className="roles-info">
        {Object.values(Role).map(role => (
          <div key={role} className="role-card">
            <h3>{RoleLabels[role]}</h3>
            <p>{RoleDescriptions[role]}</p>
          </div>
        ))}
      </div>
      
      {/* 权限矩阵表格 */}
      <table>
        <thead>
          <tr>
            <th>权限</th>
            {Object.values(Role).map(role => (
              <th key={role}>{RoleLabels[role]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PermissionGroups.map(group => (
            <React.Fragment key={group.name}>
              <tr className="group-header">
                <td colSpan={5}>
                  <strong>{group.name}</strong>
                </td>
              </tr>
              {group.permissions.map(permission => (
                <tr key={permission}>
                  <td>{permission}</td>
                  {Object.values(Role).map(role => (
                    <td key={role} className="text-center">
                      {roleHasPermission(role, permission) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 最佳实践

### 1. 最小权限原则

始终授予用户完成工作所需的最小权限集。

```typescript
// ✅ 好的做法：只授予必要的权限
checker.loadUserPermissions({
  userId: 'user-123',
  role: Role.MEMBER, // 从最低权限开始
  permissions: [Permission.TASK_CREATE, Permission.TASK_READ],
});

// ❌ 不好的做法：授予过多权限
checker.loadUserPermissions({
  userId: 'user-123',
  role: Role.ADMIN, // 不必要的高权限
  permissions: Object.values(Permission),
});
```

### 2. 使用中间件保护 API

在 API 路由层进行权限检查，而不是在组件中。

```typescript
// ✅ 好的做法：在 API 层检查
// app/api/tasks/route.ts
export const POST = withPermission(Permission.TASK_CREATE)(
  async (request, context) => {
    // 处理请求
  }
);

// ❌ 不好的做法：只在 UI 层检查
// 组件中检查权限但不保护 API
function CreateTaskButton() {
  const canCreate = hasPermission(userId, Permission.TASK_CREATE);
  if (!canCreate) return null;
  return <button onClick={createTask}>创建</button>;
}
// API 没有保护，可以直接调用
```

### 3. 缓存权限信息

权限检查会被频繁调用，使用 PermissionChecker 缓存权限。

```typescript
// ✅ 好的做法：使用全局检查器缓存
import { permissionChecker } from '@/lib/permissions';

// 应用启动时加载
permissionChecker.loadUserPermissions(userInfo);

// 后续检查使用缓存
hasPermission(userId, Permission.TASK_CREATE);

// ❌ 不好的做法：每次都查询数据库
async function checkPermission(userId, permission) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return user.permissions.includes(permission);
}
```

### 4. 定期清除缓存

用户权限变更时，及时清除缓存。

```typescript
// 用户角色变更后
await updateUserRole(userId, newRole);
permissionChecker.clearUser(userId);

// 或重新加载
permissionChecker.loadUserPermissions({
  userId,
  role: newRole,
  permissions: getRolePermissions(newRole),
});
```

### 5. 使用类型安全

充分利用 TypeScript 的类型检查。

```typescript
// ✅ 好的做法：使用枚举
import { Permission } from '@/lib/permissions';

hasPermission(userId, Permission.TASK_CREATE); // 类型安全

// ❌ 不好的做法：使用字符串
hasPermission(userId, 'task:create'); // 容易拼写错误
```

### 6. 记录权限变更

在审计日志中记录权限和角色的变更。

```typescript
async function assignRole(userId: string, newRole: Role, assignedBy: string) {
  const oldRole = await getUserRole(userId);
  
  await updateUserRole(userId, newRole);
  permissionChecker.clearUser(userId);
  
  // 记录审计日志
  await auditLog.create({
    action: 'ROLE_CHANGE',
    userId,
    oldRole,
    newRole,
    assignedBy,
    timestamp: new Date(),
  });
}
```

### 7. 错误处理

提供清晰的权限错误信息。

```typescript
// ✅ 好的做法：清晰的错误信息
export const POST = withPermission(Permission.TASK_CREATE)(
  async (request, context) => {
    // 处理请求
  }
);
// 返回: { "error": "Permission denied: task:create", "code": "FORBIDDEN" }

// 也可以自定义错误处理
export const POST = async (request: NextRequest) => {
  const user = extractUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: '请先登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  
  if (!hasPermission(user.id, Permission.TASK_CREATE)) {
    return NextResponse.json(
      { error: '您没有创建任务的权限', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  
  // 处理请求
};
```

### 8. 资源级权限

对于需要细粒度控制的场景，结合资源所有权检查。

```typescript
// 检查是否可以编辑任务
async function canEditTask(userId: string, taskId: string): boolean {
  // 1. 检查基础权限
  if (!hasPermission(userId, Permission.TASK_UPDATE)) {
    return false;
  }
  
  // 2. 检查资源所有权（对于 MEMBER 角色）
  const userRole = permissionChecker.getUserRole(userId);
  if (userRole === Role.MEMBER) {
    const task = await getTask(taskId);
    return task.createdBy === userId;
  }
  
  // 3. MANAGER 和 ADMIN 可以编辑所有任务
  return true;
}
```

---

## 常见问题

### Q1: 如何为新功能添加权限？

**A**: 按以下步骤添加新权限：

1. 在 `types.ts` 中添加权限枚举：

```typescript
export enum Permission {
  // ... 现有权限
  
  // 新功能权限
  FEATURE_NEW = 'feature:new',
  FEATURE_NEW_ADVANCED = 'feature:new:advanced',
}
```

2. 在 `types.ts` 中更新权限分组：

```typescript
export const PermissionGroups: PermissionGroup[] = [
  // ... 现有分组
  {
    name: '新功能',
    permissions: [
      Permission.FEATURE_NEW,
      Permission.FEATURE_NEW_ADVANCED,
    ],
  },
];
```

3. 在 `role-config.ts` 中为角色分配权限：

```typescript
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [...Object.values(Permission)],
  
  [Role.MANAGER]: [
    // ... 现有权限
    Permission.FEATURE_NEW,
  ],
  
  [Role.MEMBER]: [
    // ... 现有权限
    Permission.FEATURE_NEW,
  ],
  
  [Role.VIEWER]: [
    // 不给观察者权限
  ],
};
```

4. 在 API 中使用权限：

```typescript
export const POST = withPermission(Permission.FEATURE_NEW)(
  async (request, context) => {
    // 处理请求
  }
);
```

### Q2: 如何实现临时权限授予？

**A**: 使用自定义权限功能：

```typescript
// 授予临时权限
permissionChecker.addCustomPermission(userId, Permission.REPORTS_EXPORT);

// 设置过期时间（需要自己实现）
await db.temporaryPermission.create({
  data: {
    userId,
    permission: Permission.REPORTS_EXPORT,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
  },
});

// 定期清理过期权限
async function cleanupExpiredPermissions() {
  const expired = await db.temporaryPermission.findMany({
    where: { expiresAt: { lt: new Date() } },
  });
  
  for (const perm of expired) {
    permissionChecker.removeCustomPermission(perm.userId, perm.permission);
    await db.temporaryPermission.delete({ where: { id: perm.id } });
  }
}
```

### Q3: 如何实现权限继承？

**A**: 当前系统通过角色层级实现权限继承：

```typescript
// 角色层级自动继承
// ADMIN > MANAGER > MEMBER > VIEWER

// 检查时使用角色比较
function requireMinRole(minRole: Role) {
  return withRole(minRole);
}

// 使用示例
export const POST = requireMinRole(Role.MANAGER)(handler);
// MANAGER 和 ADMIN 都可以访问
```

### Q4: 如何处理跨团队权限？

**A**: 可以在 UserPermissionInfo 中添加团队上下文：

```typescript
interface TeamUserPermissionInfo extends UserPermissionInfo {
  teamId: string;
  teamRole: Role;
}

// 为每个团队维护独立的权限检查器
const teamCheckers = new Map<string, PermissionChecker>();

function getTeamChecker(teamId: string): PermissionChecker {
  if (!teamCheckers.has(teamId)) {
    teamCheckers.set(teamId, new PermissionChecker());
  }
  return teamCheckers.get(teamId)!;
}

// 使用
const teamChecker = getTeamChecker('team-123');
teamChecker.loadUserPermissions({
  userId: 'user-456',
  role: Role.MANAGER,
  teamId: 'team-123',
  teamRole: Role.MEMBER, // 在团队中是成员
  permissions: [...],
});
```

### Q5: 如何优化权限检查性能？

**A**: 采用以下策略：

1. **使用缓存**: PermissionChecker 自动缓存权限
2. **批量检查**: 使用 `checkMultiple` 一次检查多个权限
3. **预加载**: 在用户登录时加载所有权限
4. **分层检查**: 先检查角色，再检查具体权限

```typescript
// 优化前：多次单独检查
if (hasPermission(userId, Permission.TASK_READ) &&
    hasPermission(userId, Permission.TASK_UPDATE) &&
    hasPermission(userId, Permission.TASK_DELETE)) {
  // ...
}

// 优化后：批量检查
if (hasPermissions(userId, [
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
])) {
  // ...
}

// 优化后：先检查角色（更快）
const role = permissionChecker.getUserRole(userId);
if (role === Role.ADMIN) {
  // 管理员直接通过，无需检查具体权限
  return true;
}

// 对于其他角色，再检查具体权限
return hasPermission(userId, Permission.TASK_CREATE);
```

### Q6: 如何测试权限逻辑？

**A**: 使用单元测试和集成测试：

```typescript
// 单元测试示例
import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionChecker, Permission, Role } from '@/lib/permissions';

describe('PermissionChecker', () => {
  let checker: PermissionChecker;

  beforeEach(() => {
    checker = new PermissionChecker();
  });

  it('should grant permission for admin', () => {
    checker.loadUserPermissions({
      userId: 'admin-1',
      role: Role.ADMIN,
      permissions: Object.values(Permission),
    });

    expect(checker.check('admin-1', Permission.TASK_CREATE).granted).toBe(true);
    expect(checker.check('admin-1', Permission.USER_DELETE).granted).toBe(true);
  });

  it('should deny permission for viewer', () => {
    checker.loadUserPermissions({
      userId: 'viewer-1',
      role: Role.VIEWER,
      permissions: [Permission.TASK_READ, Permission.USER_READ, Permission.REPORTS_READ],
    });

    expect(checker.check('viewer-1', Permission.TASK_CREATE).granted).toBe(false);
    expect(checker.check('viewer-1', Permission.TASK_READ).granted).toBe(true);
  });
});

// 集成测试示例（API）
describe('Tasks API', () => {
  it('should deny access without permission', async () => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'x-user-id': 'viewer-1',
        'x-user-role': 'viewer',
      },
      body: JSON.stringify({ title: 'New Task' }),
    });

    expect(response.status).toBe(403);
  });
});
```

### Q7: 如何在前端和后端共享权限逻辑？

**A**: 权限系统定义在共享的 lib 目录中：

```
app/
├── lib/
│   └── permissions/        # 共享权限模块
│       ├── index.ts
│       ├── types.ts
│       ├── role-config.ts
│       ├── permission-checker.ts
│       └── middleware.ts
├── components/
│   └── TaskActions.tsx     # 前端组件使用
└── api/
    └── tasks/
        └── route.ts        # API 路由使用
```

前端和后端都从同一位置导入：

```typescript
// 前端组件
import { hasPermission, Permission } from '@/lib/permissions';

// API 路由
import { withPermission, Permission } from '@/lib/permissions';
```

### Q8: 如何处理动态权限（基于数据）？

**A**: 结合资源所有权检查和权限系统：

```typescript
// 方案1：在业务逻辑中检查
async function updateTask(userId: string, taskId: string, updates: any) {
  // 检查基础权限
  if (!hasPermission(userId, Permission.TASK_UPDATE)) {
    throw new Error('No permission to update tasks');
  }

  // 检查数据所有权
  const task = await db.task.findUnique({ where: { id: taskId } });
  const userRole = permissionChecker.getUserRole(userId);
  
  // MEMBER 只能更新自己的任务
  if (userRole === Role.MEMBER && task.createdBy !== userId) {
    throw new Error('Can only update own tasks');
  }

  // MANAGER 和 ADMIN 可以更新所有任务
  return db.task.update({ where: { id: taskId }, data: updates });
}

// 方案2：使用中间件
export const PUT = withResourceOwnership(
  async (request) => {
    const taskId = request.url.split('/').pop();
    const task = await db.task.findUnique({ where: { id: taskId } });
    return task?.createdBy || null;
  }
)(async (request, context) => {
  const { isOwner, user } = context;
  
  // isOwner 为 true 或用户是 ADMIN
  const taskId = request.url.split('/').pop();
  const updates = await request.json();
  
  return NextResponse.json(
    await db.task.update({ where: { id: taskId }, data: updates })
  );
});
```

### Q9: 如何实现权限的细粒度控制？

**A**: 系统已经支持细粒度权限，可以：

1. **使用具体权限而非角色检查**：

```typescript
// ❌ 粗粒度：基于角色
if (user.role === Role.MANAGER) {
  // ...
}

// ✅ 细粒度：基于权限
if (hasPermission(userId, Permission.TASK_ASSIGN)) {
  // ...
}
```

2. **组合多个权限**：

```typescript
// 需要同时满足多个条件
const canFullyManage = hasPermissions(userId, [
  Permission.TASK_CREATE,
  Permission.TASK_READ,
  Permission.TASK_UPDATE,
  Permission.TASK_DELETE,
  Permission.TASK_ASSIGN,
]);

// 只需满足任意一个条件
const canAccess = hasAnyPermission(userId, [
  Permission.TASK_READ,
  Permission.REPORTS_READ,
]);
```

3. **使用自定义权限扩展**：

```typescript
// 为特定用户添加额外权限
permissionChecker.loadUserPermissions({
  userId: 'special-user',
  role: Role.MEMBER,
  permissions: getRolePermissions(Role.MEMBER),
  customPermissions: [
    Permission.REPORTS_EXPORT, // 额外授权
    Permission.TEAM_INVITE,    // 额外授权
  ],
});
```

### Q10: 如何迁移现有的权限系统？

**A**: 按以下步骤迁移：

1. **映射现有角色到新系统**：

```typescript
// 旧系统 -> 新系统
const roleMapping = {
  'super_admin': Role.ADMIN,
  'team_lead': Role.MANAGER,
  'developer': Role.MEMBER,
  'guest': Role.VIEWER,
};
```

2. **迁移数据**：

```typescript
async function migrateUserRoles() {
  const users = await db.user.findMany();
  
  for (const user of users) {
    const newRole = roleMapping[user.oldRole] || Role.VIEWER;
    
    await db.user.update({
      where: { id: user.id },
      data: { role: newRole },
    });
  }
}
```

3. **更新 API 路由**：

```typescript
// 旧代码
if (user.role === 'super_admin') {
  // ...
}

// 新代码
export const POST = withPermission(Permission.USER_DELETE)(
  async (request, context) => {
    // ...
  }
);
```

4. **逐步替换**：可以先在新功能中使用新系统，旧功能保持不变，逐步迁移。

---

## 附录

### 完整权限列表

| 权限 | 枚举值 | Admin | Manager | Member | Viewer |
|------|--------|:-----:|:-------:|:------:|:------:|
| **任务管理** |
| TASK_CREATE | task:create | ✓ | ✓ | ✓ | ✗ |
| TASK_READ | task:read | ✓ | ✓ | ✓ | ✓ |
| TASK_UPDATE | task:update | ✓ | ✓ | ✓ | ✗ |
| TASK_DELETE | task:delete | ✓ | ✓ | ✓ | ✗ |
| TASK_ASSIGN | task:assign | ✓ | ✓ | ✗ | ✗ |
| TASK_BATCH | task:batch | ✓ | ✓ | ✗ | ✗ |
| **用户管理** |
| USER_CREATE | user:create | ✓ | ✗ | ✗ | ✗ |
| USER_READ | user:read | ✓ | ✓ | ✓ | ✓ |
| USER_UPDATE | user:update | ✓ | ✗ | ✗ | ✗ |
| USER_DELETE | user:delete | ✓ | ✗ | ✗ | ✗ |
| USER_MANAGE_ROLE | user:manage-role | ✓ | ✗ | ✗ | ✗ |
| **团队管理** |
| TEAM_MANAGE | team:manage | ✓ | ✗ | ✗ | ✗ |
| TEAM_INVITE | team:invite | ✓ | ✓ | ✗ | ✗ |
| TEAM_REMOVE_MEMBER | team:remove-member | ✓ | ✓ | ✗ | ✗ |
| **报告管理** |
| REPORTS_READ | reports:read | ✓ | ✓ | ✓ | ✓ |
| REPORTS_EXPORT | reports:export | ✓ | ✓ | ✗ | ✗ |
| REPORTS_GENERATE | reports:generate | ✓ | ✓ | ✗ | ✗ |
| **系统设置** |
| SETTINGS_READ | settings:read | ✓ | ✗ | ✗ | ✗ |
| SETTINGS_UPDATE | settings:update | ✓ | ✗ | ✗ | ✗ |
| **标签管理** |
| TAG_CREATE | tag:create | ✓ | ✓ | ✗ | ✗ |
| TAG_UPDATE | tag:update | ✓ | ✓ | ✗ | ✗ |
| TAG_DELETE | tag:delete | ✓ | ✓ | ✗ | ✗ |
| **通知管理** |
| NOTIFICATION_SEND | notification:send | ✓ | ✓ | ✓ | ✗ |
| NOTIFICATION_MANAGE | notification:manage | ✓ | ✗ | ✗ | ✗ |

### 角色对比表

| 特性 | Admin | Manager | Member | Viewer |
|------|:-----:|:-------:|:------:|:------:|
| 层级 | 100 | 50 | 20 | 10 |
| 创建任务 | ✓ | ✓ | ✓ | ✗ |
| 查看任务 | ✓ | ✓ | ✓ | ✓ |
| 编辑任务 | ✓ | ✓ | 仅自己的 | ✗ |
| 删除任务 | ✓ | ✓ | 仅自己的 | ✗ |
| 分配任务 | ✓ | ✓ | ✗ | ✗ |
| 批量操作 | ✓ | ✓ | ✗ | ✗ |
| 管理用户 | ✓ | ✗ | ✗ | ✗ |
| 邀请成员 | ✓ | ✓ | ✗ | ✗ |
| 移除成员 | ✓ | ✓ | ✗ | ✗ |
| 查看报告 | ✓ | ✓ | ✓ | ✓ |
| 导出报告 | ✓ | ✓ | ✗ | ✗ |
| 生成报告 | ✓ | ✓ | ✗ | ✗ |
| 系统设置 | ✓ | ✗ | ✗ | ✗ |

### 类型定义参考

```typescript
// 权限枚举
enum Permission {
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  // ... 其他权限
}

// 角色枚举
enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

// 权限检查结果
interface PermissionCheckResult {
  granted: boolean;
  permission: Permission;
  reason?: string;
}

// 用户权限信息
interface UserPermissionInfo {
  userId: string;
  role: Role;
  permissions: Permission[];
  customPermissions?: Permission[];
}

// 权限分组
interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

// 认证用户
interface AuthenticatedUser {
  id: string;
  role: Role;
  permissions: Permission[];
}
```

---

## 总结

本权限系统提供了完整的 RBAC 实现，包括：

✅ **4个预定义角色** - Admin、Manager、Member、Viewer  
✅ **23个细粒度权限** - 覆盖任务、用户、团队、报告等功能  
✅ **权限分组** - 按功能模块组织，便于管理  
✅ **PermissionChecker 类** - 提供缓存和批量检查  
✅ **中间件支持** - 保护 API 路由  
✅ **自定义权限** - 在角色基础上扩展  
✅ **角色层级** - 支持角色比较和管理  
✅ **完整类型定义** - TypeScript 类型安全  
✅ **测试覆盖** - 包含单元测试  

使用本系统可以轻松实现细粒度的访问控制，保护应用的安全性和数据完整性。

---

**文档版本**: 1.0  
**最后更新**: 2024-03-07  
**相关文档**: [API Reference](./API-REFERENCE.md) | [Architecture](./ARCHITECTURE.md)