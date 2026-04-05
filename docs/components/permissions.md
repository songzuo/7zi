# 🔐 权限管理组件文档

## 概述

权限管理组件提供完整的 RBAC v2.0 权限控制界面，支持角色管理、权限管理、审计日志等功能。

## 组件列表

| 组件 | 文件 | 说明 |
|------|------|------|
| PermissionManagementDashboard | `PermissionManagementDashboard.tsx` | 权限管理主仪表板 |

---

## PermissionManagementDashboard 权限管理仪表板

### 用途说明

提供完整的权限管理界面，包括角色管理、权限管理和审计日志三个主要功能模块。

### 功能特性

- ✅ 角色管理（创建、编辑、删除角色）
- ✅ 权限管理（细粒度权限配置）
- ✅ 审计日志（权限变更历史）
- ✅ 标签页切换界面
- ✅ 实时数据加载
- ✅ 响应式设计

### Props 接口

组件为受控组件，无需传入 props，内部自动处理数据获取和状态管理。

```typescript
// 无需 props，内部自动处理
interface PermissionManagementDashboardProps {}
```

### 使用示例

```tsx
import { PermissionManagementDashboard } from '@/components/permissions'

function PermissionsPage() {
  return (
    <div className="permissions-container">
      <PermissionManagementDashboard />
    </div>
  )
}
```

### 内部结构

组件包含三个子模块：

1. **RoleManagement** - 角色管理
2. **PermissionManagement** - 权限管理
3. **AuditLogViewer** - 审计日志查看器

---

## 子组件说明

### 1. RoleManagement 角色管理

#### 功能

- ✅ 查看所有角色列表
- ✅ 创建新角色
- ✅ 编辑角色信息
- ✅ 删除角色
- ✅ 查看角色权限

#### API 调用

```typescript
// 获取角色列表
GET /api/v2/permissions/roles

Response:
{
  success: true,
  data: EnhancedRoleDefinition[]
}

// 创建角色
POST /api/v2/permissions/roles
Body: Partial<EnhancedRoleDefinition>

// 更新角色
PUT /api/v2/permissions/roles/:id
Body: Partial<EnhancedRoleDefinition>

// 删除角色
DELETE /api/v2/permissions/roles/:id
```

#### 数据结构

```typescript
interface EnhancedRoleDefinition {
  id: string
  name: string
  displayName: string
  description?: string
  permissions: FineGrainedPermission[]
  metadata?: {
    createdAt: string
    updatedAt: string
    createdBy?: string
  }
}
```

---

### 2. PermissionManagement 权限管理

#### 功能

- ✅ 查看所有权限列表
- ✅ 按资源类型筛选
- ✅ 按操作类型筛选
- ✅ 创建新权限
- ✅ 编辑权限
- ✅ 删除权限

#### API 调用

```typescript
// 获取权限列表
GET /api/v2/permissions

Response:
{
  success: true,
  data: FineGrainedPermission[]
}

// 创建权限
POST /api/v2/permissions
Body: Partial<FineGrainedPermission>

// 更新权限
PUT /api/v2/permissions/:id
Body: Partial<FineGrainedPermission>

// 删除权限
DELETE /api/v2/permissions/:id
```

#### 数据结构

```typescript
interface FineGrainedPermission {
  id: string
  name: string
  resource: ResourceType
  action: ActionType
  conditions?: Record<string, unknown>
  metadata?: {
    createdAt: string
    updatedAt: string
  }
}

type ResourceType = 
  | 'workflow'
  | 'agent'
  | 'user'
  | 'role'
  | 'permission'
  | 'audit_log'
  | 'system'

type ActionType = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'manage'
```

---

### 3. AuditLogViewer 审计日志查看器

#### 功能

- ✅ 查看权限变更历史
- ✅ 按时间范围筛选
- ✅ 按操作类型筛选
- ✅ 按用户筛选
- ✅ 查看变更详情

#### API 调用

```typescript
// 获取审计日志
GET /api/v2/permissions/audit-logs

Query Parameters:
- startDate: string
- endDate: string
- changeType: PermissionChangeType
- userId: string

Response:
{
  success: true,
  data: PermissionAuditLog[]
}
```

#### 数据结构

```typescript
interface PermissionAuditLog {
  id: string
  timestamp: string
  userId: string
  userName?: string
  changeType: PermissionChangeType
  targetType: 'role' | 'permission'
  targetId: string
  targetName: string
  changes: Record<string, { old: unknown; new: unknown }>
  metadata?: {
    ipAddress?: string
    userAgent?: string
  }
}

type PermissionChangeType = 
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'permission_created'
  | 'permission_updated'
  | 'permission_deleted'
  | 'permission_granted'
  | 'permission_revoked'
```

---

## 集成示例

### 基础使用

```tsx
import { PermissionManagementDashboard } from '@/components/permissions'

function AdminPanel() {
  return (
    <div className="admin-panel">
      <h1>管理后台</h1>
      
      <nav>
        <a href="/admin/users">用户管理</a>
        <a href="/admin/permissions">权限管理</a>
      </nav>
      
      <Routes>
        <Route path="/admin/permissions" element={
          <PermissionManagementDashboard />
        } />
      </Routes>
    </div>
  )
}
```

### 带权限检查

```tsx
import { PermissionManagementDashboard } from '@/components/permissions'
import { usePermissions } from '@/hooks/usePermissions'

function ProtectedPermissionsPage() {
  const { hasPermission } = usePermissions()
  
  // 检查是否有权限管理权限
  if (!hasPermission('permission', 'manage')) {
    return <div>您没有权限访问此页面</div>
  }
  
  return <PermissionManagementDashboard />
}
```

---

## 样式定制

组件使用 Tailwind CSS，可以通过自定义 CSS 修改样式：

```css
/* 修改仪表板容器 */
.permission-management-dashboard {
  @apply min-h-screen bg-gray-50 dark:bg-gray-900;
}

/* 修改标签页样式 */
.dashboard-tabs .tab {
  @apply px-4 py-2 rounded-lg transition-colors;
}

.dashboard-tabs .tab.active {
  @apply bg-blue-600 text-white;
}

/* 修改卡片样式 */
.role-card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow p-4;
}
```

---

## 后端 API 要求

### 角色管理 API

```typescript
// 获取角色列表
GET /api/v2/permissions/roles

// 创建角色
POST /api/v2/permissions/roles
Body: {
  name: string
  displayName: string
  description?: string
  permissions: string[]
}

// 更新角色
PUT /api/v2/permissions/roles/:id
Body: Partial<EnhancedRoleDefinition>

// 删除角色
DELETE /api/v2/permissions/roles/:id
```

### 权限管理 API

```typescript
// 获取权限列表
GET /api/v2/permissions

// 创建权限
POST /api/v2/permissions
Body: {
  name: string
  resource: ResourceType
  action: ActionType
  conditions?: Record<string, unknown>
}

// 更新权限
PUT /api/v2/permissions/:id
Body: Partial<FineGrainedPermission>

// 删除权限
DELETE /api/v2/permissions/:id
```

### 审计日志 API

```typescript
// 获取审计日志
GET /api/v2/permissions/audit-logs
Query: {
  startDate?: string
  endDate?: string
  changeType?: PermissionChangeType
  userId?: string
  limit?: number
  offset?: number
}
```

---

## 注意事项

1. **权限检查**：建议在路由层面进行权限检查
2. **API 认证**：所有 API 调用需要携带认证 token
3. **审计日志**：所有权限变更操作都会记录到审计日志
4. **级联删除**：删除角色时需要处理关联的权限分配
5. **缓存策略**：角色和权限数据建议缓存，减少 API 调用

---

## 相关文档

- [权限类型定义](../../lib/permissions/v2/types.ts)
- [权限 Hook](../../hooks/usePermissions.ts)
- [RBAC v2.0 规范](../../docs/rbac-v2.md)

---

**文档版本**: v1.13.0
**更新日期**: 2026-04-05