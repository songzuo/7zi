/**
 * PermissionGate - 权限门组件
 * 
 * 根据用户权限条件渲染子组件或显示替代内容
 */

import { ReactNode } from 'react'
import { Permission, ActionType, ResourceType } from './types'
import { usePermissions } from './usePermissions'

export type PermissionCondition = 
  | Permission                    // 单个权限
  | Permission[]                 // 多个权限（AND 关系）
  | { any?: Permission[] }       // 多个权限（OR 关系）
  | { level?: number }          // 角色等级

interface PermissionGateProps {
  /** 权限条件 */
  permission: PermissionCondition
  /** 渲染子组件 */
  children: ReactNode
  /** 无权限时显示的内容 */
  fallback?: ReactNode
  /** 是否反转权限逻辑（无权限时显示子组件） */
  invert?: boolean
  /** 自定义权限检查函数（可选） */
  checkPermission?: (permission: Permission) => boolean
  /** 角色等级检查（可选） */
  level?: number
}

/**
 * 权限门组件
 * 
 * @example
 * ```tsx
 * // 单个权限
 * <PermissionGate permission="user:create">
 *   <CreateUserButton />
 * </PermissionGate>
 * 
 * // 多个权限（AND）
 * <PermissionGate permission={['user:create', 'team:create']}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // 多个权限（OR）
 * <PermissionGate permission={{ any: ['user:create', 'team:create'] }}>
 *   <CreatorPanel />
 * </PermissionGate>
 * 
 * // 角色等级
 * <PermissionGate permission={{ level: 80 }}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * // 自定义检查
 * <PermissionGate 
 *   permission="user:delete"
 *   checkPermission={(p) => isAdmin}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  invert = false,
  checkPermission,
  level,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRoleLevel } = usePermissions()

  // 解析权限条件
  const hasAccess = (): boolean => {
    // 1. 角色等级检查
    if (level !== undefined) {
      const levelResult = hasRoleLevel(level)
      return invert ? !levelResult : levelResult
    }

    // 2. 自定义检查函数
    if (checkPermission) {
      const customResult = checkPermission(permission as Permission)
      return invert ? !customResult : customResult
    }

    // 3. 单个权限
    if (typeof permission === 'string') {
      const result = hasPermission(permission)
      return invert ? !result : result
    }

    // 4. 数组（AND 关系）
    if (Array.isArray(permission)) {
      const result = hasAllPermissions(permission)
      return invert ? !result : result
    }

    // 5. 对象条件
    if (typeof permission === 'object') {
      // any (OR 关系)
      if ('any' in permission && Array.isArray(permission.any)) {
        const result = hasAnyPermission(permission.any)
        return invert ? !result : result
      }
      // level
      if ('level' in permission) {
        const result = hasRoleLevel(permission.level!)
        return invert ? !result : result
      }
    }

    return false
  }

  const allowed = hasAccess()

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * 权限包装器组件 - 简化版
 * 
 * @example
 * ```tsx
 * <WithPermission permission="user:create">
 *   <Button>创建用户</Button>
 * </WithPermission>
 * ```
 */
export function WithPermission({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission | Permission[]
  children: ReactNode
  fallback?: ReactNode
}) {
  return (
    <PermissionGate permission={permission} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * 角色等级门组件
 * 
 * @example
 * ```tsx
 * <RoleLevelGate minLevel={80}>
 *   <AdminPanel />
 * </RoleLevelGate>
 * ```
 */
export function RoleLevelGate({
  minLevel,
  children,
  fallback = null,
}: {
  minLevel: number
  children: ReactNode
  fallback?: ReactNode
}) {
  return (
    <PermissionGate permission={{ level: minLevel }} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}
