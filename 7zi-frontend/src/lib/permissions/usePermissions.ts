/**
 * usePermissions Hook - 权限检查 React Hook
 * 
 * 注意: 此 Hook 简化实现，完整版需与 auth-store 的 User 类型对齐
 */

import { useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { Permission as Permission, RoleDefinition, UserWithRoles } from './types'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleLevel,
  getUserMaxLevel,
  permissionManager,
} from './index'

/**
 * usePermissions Hook 返回类型
 */
export interface UsePermissionsReturn {
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  hasRoleLevel: (minLevel: number) => boolean
  getMaxLevel: () => number
  roles: RoleDefinition[]
  isLoaded: boolean
  hasRoles: boolean
}

/**
 * 权限检查 Hook
 */
export function usePermissions(): UsePermissionsReturn {
  const user = useAuthStore(state => state.user)
  
  const isLoaded = useMemo(() => !!user, [user])

  // 从 user 对象提取角色
  const roles: RoleDefinition[] = useMemo(() => {
    if (!user?.role) return []
    const role = permissionManager.getRoleById(user.role)
    return role ? [role] : []
  }, [user])

  const userWithRoles: UserWithRoles | null = useMemo(() => {
    if (!user) return null
    const roleIds = user.role ? [user.role] : []
    const userRoles = roleIds
      .map(id => permissionManager.getRoleById(id))
      .filter((r): r is RoleDefinition => r !== undefined)
    
    return {
      id: user.id,
      username: user.name || user.email || '',
      email: user.email || '',
      role: user.role,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      roleIds,
      roles: userRoles,
    }
  }, [user])

  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      if (!userWithRoles) return false
      return hasPermission(userWithRoles, permission)
    },
    [userWithRoles]
  )

  const checkAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (!userWithRoles) return false
      return hasAnyPermission(userWithRoles, permissions)
    },
    [userWithRoles]
  )

  const checkAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      if (!userWithRoles) return false
      return hasAllPermissions(userWithRoles, permissions)
    },
    [userWithRoles]
  )

  const checkRoleLevel = useCallback(
    (minLevel: number): boolean => {
      if (!userWithRoles) return false
      return hasRoleLevel(userWithRoles, minLevel)
    },
    [userWithRoles]
  )

  const getMaxLevel = useCallback((): number => {
    if (!userWithRoles) return 0
    return getUserMaxLevel(userWithRoles)
  }, [userWithRoles])

  return {
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    hasRoleLevel: checkRoleLevel,
    getMaxLevel,
    roles,
    isLoaded,
    hasRoles: roles.length > 0,
  }
}

/**
 * 简化版权限检查 Hook - 用于只需要基础功能时
 * 
 * @example
 * ```tsx
 * const canCreateUser = usePermission('user:create')
 * ```
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission: check } = usePermissions()
  return check(permission)
}

/**
 * 检查多个权限（任一）- Hook 版本
 * 
 * @example
 * ```tsx
 * const canEdit = useAnyPermission(['user:update', 'team:update'])
 * ```
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission: check } = usePermissions()
  return check(permissions)
}

/**
 * 检查多个权限（所有）- Hook 版本
 * 
 * @example
 * ```tsx
 * const isAdmin = useAllPermissions(['user:create', 'user:delete'])
 * ```
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions: check } = usePermissions()
  return check(permissions)
}

/**
 * 检查角色等级 - Hook 版本
 * 
 * @example
 * ```tsx
 * const isManager = useRoleLevel(60)
 * ```
 */
export function useRoleLevel(minLevel: number): boolean {
  const { hasRoleLevel: check } = usePermissions()
  return check(minLevel)
}
