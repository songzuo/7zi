# PermissionContext → Zustand 迁移报告

**日期**: 2026-03-30
**执行者**: Executor 子代理
**状态**: ✅ 完成

## 背景

v1.5.0 规划 P0 功能需要将权限状态管理迁移到 Zustand。

经过检查发现，项目中**不存在** `PermissionContext.tsx` 文件。现有的权限系统位于：

- `src/lib/permissions.ts` - 完整的 RBAC 权限系统
- `src/features/auth/lib/permissions.ts` - 重复文件

## 迁移方案

创建 Zustand Store 集成现有 RBAC 系统，而不是迁移不存在的 Context。

## 执行内容

### 1. 创建 `src/stores/permission-store.ts`

集成了 `src/lib/permissions.ts` 的 RBAC 系统，提供：

**状态管理**:

- `userPermissions`: 用户权限状态
- `isLoading`: 加载状态
- `error`: 错误信息

**权限操作方法**:

- `initializePermissions(user, roleIds)`: 初始化用户权限
- `clearPermissions()`: 清除权限
- `hasPermission(permission)`: 检查单个权限
- `hasAnyPermission(permissions)`: 检查是否有任一权限
- `hasAllPermissions(permissions)`: 检查是否有所有权限
- `checkAccess(resourceType, action, context)`: 检查资源访问
- `canAccessResource(...)`: 资源访问快捷方法
- `hasRoleLevel(minLevel)`: 检查角色等级
- `getUserMaxLevel()`: 获取用户最高等级
- `grantPermission(permission)`: 授予直接权限
- `revokePermission(permission)`: 撤销直接权限
- `getEffectivePermissions()`: 获取所有有效权限

**React Hooks**:

- `useHasPermission(permission)`: Hook 版权限检查
- `useHasAnyPermission(permissions)`: Hook 版任一权限检查
- `useHasAllPermissions(permissions)`: Hook 版所有权限检查
- `useCanAccessResource(resourceType, action, resourceOwnerId)`: Hook 版资源访问检查
- `useHasRoleLevel(minLevel)`: Hook 版角色等级检查
- `useEffectivePermissions()`: Hook 版有效权限列表

**导出内容**:

- `usePermissionStore`: 主 Store hook
- `PermissionState`, `UserPermissionState`: 类型定义
- `Permissions`: 权限常量对象
- `ResourceType`, `ActionType`: 枚举导出

**持久化**: 使用 `persist` 中间件自动保存到 localStorage (key: `7zi-permission-storage`)

### 2. 更新 `src/stores/index.ts`

更新导出入口，统一导出所有 Store。

## 验证结果

```bash
cd /root/.openclaw/workspace/7zi-frontend && npx tsc --noEmit
# ✅ 通过 (仅 websocket-store-enhanced.test.ts 有预存语法错误)
```

## 使用示例

```tsx
import {
  usePermissionStore,
  useHasPermission,
  Permissions,
  ResourceType,
  ActionType,
} from '@/stores'

// 方式1: 使用专用 Hook
function ProjectButton() {
  const canCreate = useHasPermission(Permissions.PROJECT_CREATE)
  return canCreate ? <CreateProject /> : null
}

// 方式2: 直接使用 Store
function AdminPanel() {
  const hasAccess = usePermissionStore(state =>
    state.checkAccess(ResourceType.SYSTEM_CONFIG, ActionType.MANAGE)
  )
  return hasAccess.allowed ? <AdminUI /> : <AccessDenied />
}

// 方式3: 角色等级检查
function SettingsLink() {
  const canAccess = useHasRoleLevel(80) // 管理员等级
  return canAccess ? <Link to="/settings">设置</Link> : null
}
```

## 遗留问题

1. ⚠️ `websocket-store-enhanced.test.ts` 存在预存语法错误 (lines 510, 529)
   - 非本次迁移引入
   - 需要单独修复

2. ⚠️ `src/features/auth/lib/permissions.ts` 与 `src/lib/permissions.ts` 重复
   - 建议后续清理

## 后续建议

1. 修复 `websocket-store-enhanced.test.ts` 语法错误
2. 清理重复的 permissions 文件
3. 在应用入口集成 `usePermissionStore.initializePermissions()`
4. 考虑添加权限变更事件通知
