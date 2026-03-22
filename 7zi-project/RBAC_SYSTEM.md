# RBAC 权限控制系统

为 7zi-project 实现的细粒度基于角色的访问控制（RBAC）系统。

## 目录

- [概述](#概述)
- [核心概念](#核心概念)
- [系统权限](#系统权限)
- [系统角色](#系统角色)
- [快速开始](#快速开始)
- [API 路由使用](#api-路由使用)
- [高级功能](#高级功能)
- [测试](#测试)
- [最佳实践](#最佳实践)

## 概述

本 RBAC 系统提供了一套完整的权限管理解决方案，包括：

- **角色（Role）** - 定义用户身份和权限集合
- **权限（Permission）** - 定义对特定资源的操作能力
- **资源（Resource）** - 系统中的实体类型（用户、项目、团队等）
- **操作（Action）** - 可以对资源执行的操作类型（创建、读取、更新、删除等）

### 特性

✅ 细粒度权限控制到资源-操作级别
✅ 角色继承和等级系统
✅ 资源所有权检查
✅ 自定义角色和权限
✅ 装饰器和中间件支持
✅ 完整的 TypeScript 类型支持
✅ 内置权限检查函数
✅ 易于测试和扩展

## 核心概念

### 资源类型（ResourceType）

定义系统中的所有资源类型：

```typescript
enum ResourceType {
  USER = 'user',                    // 用户
  TEAM = 'team',                    // 团队
  PROJECT = 'project',              // 项目
  DATA = 'data',                    // 数据
  SYSTEM = 'system',                // 系统
  MCP_SERVER = 'mcp_server',        // MCP 服务器
  MCP_TOOL = 'mcp_tool',            // MCP 工具
  WALLET = 'wallet',                // 钱包
  // ... 更多资源类型
}
```

### 操作类型（ActionType）

定义可以对资源执行的操作：

```typescript
enum ActionType {
  CREATE = 'create',    // 创建
  READ = 'read',       // 读取
  UPDATE = 'update',    // 更新
  DELETE = 'delete',    // 删除
  LIST = 'list',       // 列表
  EXECUTE = 'execute', // 执行
  EXPORT = 'export',   // 导出
  IMPORT = 'import',   // 导入
  MANAGE = 'manage',   // 管理（包含所有操作）
}
```

### 权限标识符（Permission）

权限标识符格式：`{ResourceType}:{ActionType}`

示例：
- `user:read` - 读取用户信息
- `project:create` - 创建项目
- `data:export` - 导出数据
- `system:config` - 系统配置管理

## 系统权限

系统内置了以下权限（不可删除）：

### 用户管理
- `user:read` - 查看用户信息
- `user:create` - 创建新用户
- `user:update` - 更新用户信息
- `user:delete` - 删除用户
- `user:list` - 列出所有用户

### 团队管理
- `team:create` - 创建团队
- `team:update` - 更新团队信息
- `team:delete` - 删除团队
- `team:manage` - 完全管理团队

### 项目管理
- `project:create` - 创建项目
- `project:update` - 更新项目
- `project:delete` - 删除项目

### 数据管理
- `data:export` - 导出数据
- `data:import` - 导入数据

### 系统管理
- `system:config` - 修改系统配置
- `system:log` - 查看系统日志

### MCP 管理
- `mcp:execute` - 执行 MCP 服务器工具

## 系统角色

系统内置了以下角色（按权限等级排序）：

### 超级管理员（Super Admin）
- **等级**: 100
- **权限**: 所有权限
- **角色 ID**: `super_admin`

### 管理员（Admin）
- **等级**: 80
- **权限**: 大部分管理权限（不包括系统配置）
- **角色 ID**: `admin`

### 团队负责人（Team Leader）
- **等级**: 60
- **权限**: 管理团队和项目
- **角色 ID**: `team_leader`

### 开发者（Developer）
- **等级**: 40
- **权限**: 创建和编辑项目
- **角色 ID**: `developer`

### 普通用户（User）
- **等级**: 20
- **权限**: 基本查看权限
- **角色 ID**: `user`

### 访客（Guest）
- **等级**: 10
- **权限**: 只读权限
- **角色 ID**: `guest`

## 快速开始

### 1. 创建带角色的用户

```typescript
import { createUserWithRoles } from '@/lib/permissions';

const userWithRoles = createUserWithRoles(
  {
    id: 'user-123',
    username: 'john_doe',
    email: 'john@example.com',
    role: 'user',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ['developer', 'team_leader'] // 角色列表
);
```

### 2. 检查权限

```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

// 检查单个权限
if (hasPermission(userWithRoles, 'project:create')) {
  // 用户可以创建项目
}

// 检查是否有任一权限
if (hasAnyPermission(userWithRoles, ['project:create', 'project:update'])) {
  // 用户可以创建或更新项目
}

// 检查是否有所有权限
if (hasAllPermissions(userWithRoles, ['user:read', 'user:create'])) {
  // 用户可以读取和创建用户
}
```

### 3. 检查角色等级

```typescript
import { hasRoleLevel, getUserMaxLevel } from '@/lib/permissions';

// 检查用户等级是否 >= 60（团队负责人级别）
if (hasRoleLevel(userWithRoles, 60)) {
  // 用户可以执行团队负责人级别的操作
}

// 获取用户的最高角色等级
const maxLevel = getUserMaxLevel(userWithRoles);
console.log(`用户的最高角色等级: ${maxLevel}`);
```

## API 路由使用

### 使用装饰器

```typescript
import { RequirePermission, RequireAnyPermission, RequireAllPermissions } from '@/lib/permissions';
import { ResourceType } from '@/lib/permissions';

class UserController {
  // 单个权限检查
  @RequirePermission(ResourceType.USER, 'read')
  async getUsers(ctx: ApiContext) {
    // 方法实现
  }

  // 需要任一权限
  @RequireAnyPermission([
    { resourceType: ResourceType.USER, action: 'update' },
    { resourceType: ResourceType.USER, action: 'delete' },
  ])
  async manageUser(ctx: ApiContext) {
    // 方法实现
  }

  // 需要所有权限
  @RequireAllPermissions([
    { resourceType: ResourceType.USER, action: 'create' },
    { resourceType: ResourceType.USER, action: 'update' },
  ])
  async fullManageUser(ctx: ApiContext) {
    // 方法实现
  }

  // 需要特定角色等级
  @RequireRoleLevel(80)
  async adminOperation(ctx: ApiContext) {
    // 只有管理员级别（等级 >= 80）的用户可以访问
  }
}
```

### 资源级别权限控制

```typescript
import { canAccessResource } from '@/lib/permissions';
import { ResourceType } from '@/lib/permissions';

async function updateProject(ctx: ApiContext, projectId: string, updates: unknown) {
  const { user } = ctx;
  const project = await getProjectById(projectId);

  // 检查资源访问权限
  const permissionContext = {
    userId: user.id,
    resourceOwnerId: project.ownerId,
    resourceId: projectId,
    resourceType: ResourceType.PROJECT,
  };

  const result = canAccessResource(
    user,
    ResourceType.PROJECT,
    'update',
    permissionContext
  );

  if (!result.allowed) {
    throw new Error(`Permission denied: ${result.reason}`);
  }

  // 执行更新
  return await projectRepository.update(projectId, updates);
}
```

### Next.js API 路由示例

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createUserWithRoles } from '@/lib/permissions';
import { PermissionDeniedError } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // 1. 从请求中获取用户信息
    const userId = request.headers.get('x-user-id');
    const user = await getUserById(userId);

    // 2. 创建带角色的用户对象
    const userWithRoles = createUserWithRoles(user, user.roleIds);

    // 3. 创建 API 上下文
    const ctx: ApiContext = { user: userWithRoles, request };

    // 4. 调用控制器方法（带权限检查的装饰器会自动执行）
    const controller = new UserController();
    return await controller.getUsers(ctx);

  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: error.message,
          requiredPermissions: error.requiredPermissions,
          missingPermissions: error.missingPermissions,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 高级功能

### 自定义权限

```typescript
import { permissionManager } from '@/lib/permissions';

// 添加自定义权限
const customPermission = {
  id: 'custom:action',
  name: 'Custom Action',
  description: 'A custom permission for specific use case',
  resourceType: ResourceType.SYSTEM,
  actionType: ActionType.EXECUTE,
  isSystem: false,
};

const success = permissionManager.addCustomPermission(customPermission);
console.log(`自定义权限添加${success ? '成功' : '失败'}`);
```

### 自定义角色

```typescript
import { permissionManager } from '@/lib/permissions';

// 添加自定义角色
const customRole = {
  id: 'content_editor',
  name: '内容编辑',
  description: '可以编辑内容但不能删除',
  permissions: [
    'content:read',
    'content:update',
    'content:create',
  ],
  isSystem: false,
  level: 30,
};

const success = permissionManager.addCustomRole(customRole);
console.log(`自定义角色添加${success ? '成功' : '失败'}`);

// 更新自定义角色
permissionManager.updateCustomRole('content_editor', {
  description: '更新的描述',
});

// 删除自定义角色
permissionManager.deleteCustomRole('content_editor');
```

### 权限检查结果

```typescript
import { canExecuteAction } from '@/lib/permissions';

const result = canExecuteAction(userWithRoles, ResourceType.PROJECT, 'create');

if (result.allowed) {
  console.log('用户可以创建项目');
} else {
  console.log('权限被拒绝:', result.reason);
  console.log('需要权限:', result.requiredPermissions);
  console.log('缺失权限:', result.missingPermissions);
}
```

### 权限常量

使用预定义的权限常量，避免拼写错误：

```typescript
import { Permissions } from '@/lib/permissions';

if (hasPermission(userWithRoles, Permissions.USER_READ)) {
  // 用户有读取用户信息的权限
}

if (hasPermission(userWithRoles, Permissions.PROJECT_CREATE)) {
  // 用户有创建项目的权限
}
```

## 测试

运行权限系统测试：

```bash
# 运行所有测试
npm test

# 运行权限系统测试
npm test -- permissions.test.ts

# 运行测试并查看覆盖率
npm test -- --coverage --collectCoverageFrom='src/lib/permissions.ts'
```

### 测试覆盖

测试文件位于 `src/lib/__tests__/permissions.test.ts`，包含：

- 核心模型测试
- 权限管理器测试
- 权限检查函数测试
- 装饰器测试
- 错误处理测试
- 边界条件测试

## 最佳实践

### 1. 使用装饰器进行权限控制

```typescript
// ✅ 推荐：使用装饰器
@RequirePermission(ResourceType.PROJECT, 'create')
async createProject(ctx: ApiContext) {
  // 方法实现
}

// ❌ 不推荐：在方法内部手动检查
async createProject(ctx: ApiContext) {
  if (!hasPermission(ctx.user, 'project:create')) {
    throw new Error('Permission denied');
  }
  // 方法实现
}
```

### 2. 使用资源级别的权限检查

```typescript
// ✅ 推荐：检查资源所有权
const result = canAccessResource(
  user,
  ResourceType.PROJECT,
  'update',
  {
    userId: user.id,
    resourceOwnerId: project.ownerId,
  }
);

// ❌ 不推荐：只检查权限，不检查所有权
if (hasPermission(user, 'project:update')) {
  // 可能访问其他用户的项目
}
```

### 3. 使用权限常量

```typescript
// ✅ 推荐：使用权限常量
if (hasPermission(user, Permissions.USER_READ)) {
  // ...
}

// ❌ 不推荐：使用字符串
if (hasPermission(user, 'user:read')) {
  // 容易拼写错误
}
```

### 4. 提供详细的错误信息

```typescript
// ✅ 推荐：使用 PermissionDeniedError
try {
  return await controller.updateProject(ctx, projectId, updates);
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    return NextResponse.json(
      {
        error: 'Permission denied',
        message: error.message,
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      },
      { status: 403 }
    );
  }
}

// ❌ 不推荐：只返回简单的错误
catch (error) {
  return NextResponse.json(
    { error: 'Permission denied' },
    { status: 403 }
  );
}
```

### 5. 角色设计原则

- **单一职责**: 每个角色应该有明确的职责范围
- **最小权限原则**: 只授予必要的权限
- **角色继承**: 使用角色等级而不是复杂的继承关系
- **可审计**: 角色和权限的变更应该可追踪

## TypeScript 支持

本系统提供完整的 TypeScript 类型支持：

```typescript
import type {
  UserWithRoles,
  Permission,
  PermissionDefinition,
  RoleDefinition,
  PermissionCheckResult,
  PermissionContext,
} from '@/lib/permissions';

// 使用类型
const user: UserWithRoles = createUserWithRoles(baseUser, ['admin']);
const permission: Permission = 'user:read';
const result: PermissionCheckResult = canExecuteAction(user, ResourceType.USER, 'read');
```

## 常见问题

### Q: 如何添加新的资源类型？

A: 在 `ResourceType` 枚举中添加新值：

```typescript
export enum ResourceType {
  // 现有类型...
  NEW_RESOURCE = 'new_resource',
}
```

然后定义相应的权限：

```typescript
{
  id: 'new_resource:read',
  name: '查看新资源',
  description: '查看新资源信息',
  resourceType: ResourceType.NEW_RESOURCE,
  actionType: ActionType.READ,
  isSystem: true,
}
```

### Q: 如何处理超级管理员？

A: 超级管理员拥有所有权限，不需要单独检查：

```typescript
// 系统会自动处理超级管理员
// 超级管理员角色的等级是 100，包含所有权限
```

### Q: 如何在客户端检查权限？

A: 不要在客户端进行权限检查，客户端只用于 UI 显示。所有权限检查必须在服务器端进行：

```typescript
// ❌ 客户端检查 - 不安全
if (user.hasPermission('project:delete')) {
  showDeleteButton();
}

// ✅ 服务器端检查 - 安全
// 客户端根据用户角色显示/隐藏 UI 元素
if (user.roles.some(r => r.level >= 60)) {
  showDeleteButton(); // 实际删除操作在服务器端验证
}
```

### Q: 如何处理资源所有权？

A: 使用 `canAccessResource` 函数并提供 `resourceOwnerId`：

```typescript
const result = canAccessResource(
  user,
  ResourceType.PROJECT,
  'update',
  {
    userId: user.id,
    resourceOwnerId: project.ownerId,
    resourceId: project.id,
    resourceType: ResourceType.PROJECT,
  }
);
```

## 性能考虑

- **权限缓存**: 考虑缓存用户的角色和权限信息
- **批量检查**: 使用 `hasAnyPermission` 和 `hasAllPermissions` 而不是多次调用 `hasPermission`
- **角色索引**: 为角色 ID 创建索引以提高查询性能

## 安全建议

1. **永远不要在客户端进行权限验证**
2. **使用 HTTPS 传输所有权限相关数据**
3. **定期审计角色和权限分配**
4. **记录所有权限拒绝事件**
5. **实现角色分配的审批流程**

## 扩展阅读

- [OWASP 访问控制指南](https://owasp.org/www-project-access-control/)
- [NIST RBAC 标准](https://csrc.nist.gov/projects/role-based-access-control)
- [OAuth 2.0 和 RBAC](https://oauth.net/2/rbac/)

## 支持

如有问题或建议，请联系开发团队或在项目中提交 Issue。
