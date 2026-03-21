# RBAC API Implementation Report

为 7zi-project 实现的细粒度权限控制系统（RBAC）。

## 实施概要

✅ 创建了完整的 RBAC API 端点
✅ 实现了基于 JWT 的身份验证中间件
✅ 支持角色和权限的数据库持久化
✅ 提供细粒度的权限检查功能
✅ 完整的 TypeScript 类型支持

---

## 新增 API 端点

### 1. 系统管理端点

#### GET /api/rbac/system
**描述**: 获取 RBAC 系统状态
**权限**: ADMIN
**请求参数**: 无
**响应示例**:
```json
{
  "success": true,
  "data": {
    "systemInitialized": true,
    "rolesInDb": 5,
    "permissionsInDb": 45,
    "defaultRolesCount": 5,
    "needsSeeding": false
  }
}
```

#### POST /api/rbac/system/initialize
**描述**: 初始化 RBAC 系统（创建默认角色和权限）
**权限**: ADMIN
**请求参数**:
```json
{
  "force": false  // 是否强制重新初始化
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Roles and permissions seeded successfully",
    "rolesSeeded": ["admin", "manager", "member", "viewer", "guest"],
    "permissionsSeeded": 45
  }
}
```

#### DELETE /api/rbac/system/reset
**描述**: 重置 RBAC 系统到默认状态（删除所有自定义角色和权限）
**权限**: ADMIN
**请求参数**: 无
**响应示例**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Roles and permissions reset successfully"
  }
}
```

---

### 2. 角色管理端点

#### GET /api/rbac/roles
**描述**: 获取所有角色
**权限**: ADMIN
**请求参数**:
- `includeCount` (boolean): 是否包含用户统计数量
**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system access with all permissions",
      "permissions": ["user:read", "user:create", ...],
      "isSystem": true,
      "userCount": 3
    }
  ],
  "meta": {
    "count": 5,
    "timestamp": "2026-03-21T14:00:00.000Z"
  }
}
```

#### POST /api/rbac/roles
**描述**: 创建自定义角色
**权限**: ADMIN
**请求参数**:
```json
{
  "id": "content_editor",
  "name": "Content Editor",
  "description": "Can edit content but not delete",
  "permissions": ["content:read", "content:create", "content:update"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "content_editor",
    "name": "Content Editor",
    "description": "Can edit content but not delete",
    "permissions": ["content:read", "content:create", "content:update"],
    "isSystem": false
  },
  "message": "Role created successfully"
}
```

---

#### GET /api/rbac/roles/[roleId]
**描述**: 获取单个角色详情
**权限**: ADMIN
**请求参数**:
- `includePermissions` (boolean): 是否包含权限列表
**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "admin",
    "name": "Administrator",
    "description": "Full system access",
    "permissions": ["user:read", "user:create", ...],
    "isSystem": true
  }
}
```

#### PUT /api/rbac/roles/[roleId]
**描述**: 更新角色信息
**权限**: ADMIN
**请求参数**:
```json
{
  "name": "Updated Role Name",
  "description": "Updated description",
  "permissions": ["permission1", "permission2"]  // 仅自定义角色
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "content_editor",
    "name": "Updated Role Name",
    "description": "Updated description",
    "permissions": ["permission1", "permission2"],
    "isSystem": false
  },
  "message": "Role updated successfully"
}
```

#### DELETE /api/rbac/roles/[roleId]
**描述**: 删除自定义角色
**权限**: ADMIN
**响应示例**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

### 3. 角色权限管理端点

#### GET /api/rbac/roles/[roleId]/permissions
**描述**: 获取角色的所有权限
**权限**: ADMIN
**响应示例**:
```json
{
  "success": true,
  "data": {
    "roleId": "admin",
    "permissions": ["user:read", "user:create", ...],
    "count": 45
  }
}
```

#### POST /api/rbac/roles/[roleId]/permissions
**描述**: 为角色添加权限
**权限**: ADMIN
**请求参数**:
```json
{
  "permissions": ["user:read", "user:create", "user:update"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "roleId": "content_editor",
    "addedPermissions": ["user:read", "user:create", "user:update"],
    "count": 3
  },
  "message": "Permissions assigned successfully"
}
```

#### DELETE /api/rbac/roles/[roleId]/permissions
**描述**: 从角色移除权限
**权限**: ADMIN
**请求参数**:
```json
{
  "permissions": ["user:delete"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "roleId": "content_editor",
    "removedPermissions": ["user:delete"],
    "count": 1
  },
  "message": "Permissions removed successfully"
}
```

---

### 4. 用户角色管理端点

#### GET /api/rbac/users/[userId]/roles
**描述**: 获取用户的所有角色
**权限**: MANAGER 或 ADMIN
**请求参数**:
- `includePermissions` (boolean): 是否包含权限列表
**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "roles": ["member", "developer"],
    "permissions": ["task:read", "task:create", ...],
    "count": 2
  }
}
```

#### POST /api/rbac/users/[userId]/roles
**描述**: 为用户添加角色
**权限**: MANAGER 或 ADMIN
**请求参数**:
```json
{
  "roles": ["member", "developer"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "addedRoles": ["member", "developer"],
    "count": 2
  },
  "message": "Roles added successfully"
}
```

#### DELETE /api/rbac/users/[userId]/roles
**描述**: 从用户移除角色
**权限**: MANAGER 或 ADMIN
**请求参数**:
```json
{
  "roles": ["developer"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "removedRoles": ["developer"],
    "count": 1
  },
  "message": "Roles removed successfully"
}
```

---

### 5. 权限查询端点

#### GET /api/rbac/permissions
**描述**: 获取所有系统权限
**权限**: ADMIN
**请求参数**:
- `groupBy` (string): 分组方式 ('resource' 或 'action')
**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": ["user:read", "user:create", "user:update", "user:delete"],
    "team": ["team:read", "team:create", "team:update", "team:delete"],
    ...
  },
  "meta": {
    "count": 45,
    "timestamp": "2026-03-21T14:00:00.000Z"
  }
}
```

---

### 6. 用户权限查询端点

#### GET /api/rbac/users/[userId]/permissions
**描述**: 获取用户的所有权限
**权限**: 用户自己或 ADMIN
**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "roles": ["member", "developer"],
    "permissions": ["task:read", "task:create", ...],
    "roleCount": 2,
    "permissionCount": 15
  }
}
```

#### POST /api/rbac/users/[userId]/permissions/check
**描述**: 检查用户是否有特定权限
**权限**: 用户自己或 ADMIN
**请求参数**:
```json
{
  "permissions": ["user:read", "user:create"],
  "checkType": "all",  // "all" 或 "any"
  "roles": ["admin", "manager"]
}
```
**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "roles": ["member"],
    "hasAllPermissions": false,
    "hasAnyPermission": true,
    "permissions": ["user:read", "user:create"],
    "hasAnyRole": false,
    "hasAllRoles": false,
    "roleChecks": ["admin", "manager"]
  }
}
```

---

## 核心功能

### 1. JWT 认证中间件
- `withUserAuth`: 基础用户认证
- `withPermissions`: 检查是否有所有权限
- `withAnyPermission`: 检查是否有任一权限
- `withRole`: 检查是否有特定角色
- `withAnyRole`: 检查是否有任一角色
- `withAdmin`: 管理员权限
- `withManagerOrAdmin`: 管理员或经理权限
- `withOptionalAuth`: 可选认证

### 2. 权限检查函数
- `hasPermission`: 检查单个权限
- `hasAnyPermission`: 检查是否有任一权限
- `hasAllPermissions`: 检查是否有所有权限
- `hasRole`: 检查角色
- `hasAnyRole`: 检查是否有任一角色
- `hasAllRoles`: 检查是否有所有角色

### 3. 数据库表结构

#### roles 表
- `id`: 角色ID（主键）
- `name`: 角色名称
- `description`: 角色描述
- `permissions`: 权限列表（JSON）
- `is_system`: 是否系统角色
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### user_roles 表
- `id`: 映射ID（主键）
- `user_id`: 用户ID（外键）
- `role`: 角色ID（外键）
- `assigned_at`: 分配时间
- `assigned_by`: 分配者

#### role_permissions 表
- `id`: 映射ID（主键）
- `role`: 角色ID（外键）
- `permission`: 权限
- `created_at`: 创建时间
- `created_by`: 创建者

---

## 系统角色

### GUEST (guest)
- 描述：有限访客访问
- 权限：无

### VIEWER (viewer)
- 描述：只读访问
- 权限：查看所有资源（只读）

### MEMBER (member)
- 描述：标准团队成员
- 权限：查看、创建、更新任务；查看团队和审批

### MANAGER (manager)
- 描述：管理团队和任务
- 权限：团队管理、任务管理、审批管理、报表导出

### ADMIN (admin)
- 描述：系统管理员
- 权限：所有权限

---

## 权限类型

### 用户管理
- `user:read`, `user:create`, `user:update`, `user:delete`, `user:manage_role`

### 团队管理
- `team:read`, `team:create`, `team:update`, `team:delete`, `team:add_member`, `team:remove_member`, `team:manage`

### 任务管理
- `task:read`, `task:create`, `task:update`, `task:delete`, `task:batch`, `task:assign`

### 设置管理
- `settings:read`, `settings:update`, `settings:manage`

### 审批管理
- `approval:read`, `approval:create`, `approval:update`, `approval:delete`, `approval:approve`, `approval:reject`, `approval:manage`

### 报表管理
- `reports:export`, `reports:view`, `reports:manage`

### 系统管理
- `system:read`, `system:manage`, `system:config`

### 日志管理
- `logs:read`, `logs:export`

### AI Agent 管理
- `agent:read`, `agent:create`, `agent:update`, `agent:delete`, `agent:manage`, `agent:execute`

### 钱包管理
- `wallet:read`, `wallet:manage`, `wallet:transfer`

---

## 使用示例

### 1. 初始化 RBAC 系统

```bash
curl -X POST https://your-domain.com/api/rbac/system/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### 2. 创建自定义角色

```bash
curl -X POST https://your-domain.com/api/rbac/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "content_editor",
    "name": "Content Editor",
    "description": "Can edit content but not delete",
    "permissions": ["content:read", "content:create", "content:update"]
  }'
```

### 3. 为用户分配角色

```bash
curl -X POST https://your-domain.com/api/rbac/users/user-123/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["member", "developer"]
  }'
```

### 4. 检查用户权限

```bash
curl -X POST https://your-domain.com/api/rbac/users/user-123/permissions/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["user:read", "user:create"],
    "checkType": "any"
  }'
```

### 5. 为角色添加权限

```bash
curl -X POST https://your-domain.com/api/rbac/roles/content_editor/permissions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["task:read", "task:create", "task:update"]
  }'
```

---

## 中间件使用示例

### 在 API 路由中使用权限中间件

```typescript
import { withPermissions, withRole } from '@/lib/auth/middleware-rbac';
import { Permission, Role } from '@/lib/permissions/types';

// 使用权限检查
export async function GET(request: NextRequest) {
  return withPermissions(Permission.USER_READ, Permission.USER_CREATE)(request, async (req, context) => {
    // 用户有 user:read 和 user:create 权限
    return NextResponse.json({ data: '...' });
  });
}

// 使用角色检查
export async function POST(request: NextRequest) {
  return withRole(Role.ADMIN)(request, async (req, context) => {
    // 用户是管理员
    return NextResponse.json({ data: '...' });
  });
}
```

---

## 安全特性

1. **JWT Token 验证**: 所有端点都需要有效的 JWT Token
2. **权限等级**: 系统角色和自定义角色分离
3. **审计日志**: 所有权限变更都有记录
4. **系统角色保护**: 系统角色不能删除，权限不能随意修改
5. **细粒度控制**: 权限精确到资源-操作级别

---

## 数据库迁移

RBAC 系统的数据库表已包含在现有迁移系统中：

- `roles` 表
- `user_roles` 表
- `role_permissions` 表

运行迁移时自动创建这些表。

---

## 测试

运行 RBAC 相关测试：

```bash
# 运行所有测试
npm test

# 运行权限系统测试
npm test -- permissions.test.ts

# 运行 RBAC 集成测试
npm test -- rbac.test.ts
```

---

## 总结

本次实现为 7zi-project 提供了完整的 RBAC 权限控制系统，包括：

- **6 个主要 API 模块**
- **15+ 个 API 端点**
- **完整的 JWT 认证中间件**
- **数据库持久化支持**
- **细粒度的权限控制**
- **系统角色保护机制**

所有端点都已实现并提交到 git，可以直接使用。
