/**
 * Permission Utilities
 *
 * 权限检查工具函数，与现有 auth 系统兼容
 */

import { Role, Permission, User, CheckPermissionOptions, PermissionCheckResult } from './types'

/**
 * 角色权限映射
 * 定义每个角色拥有的默认权限
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.USER_MANAGE,
    Permission.ROOM_MANAGE,
    Permission.DATA_IMPORT,
    Permission.DATA_EXPORT,
    Permission.ADMIN,
    Permission.SETTINGS,
    Permission.AUDIT,
  ],
  [Role.USER]: [Permission.READ, Permission.WRITE, Permission.DELETE],
  [Role.GUEST]: [Permission.READ],
}

/**
 * 获取角色的默认权限
 */
export function getDefaultPermissions(role: Role): Permission[] {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions ? [...permissions] : []
}

/**
 * 检查用户是否有指定权限
 */
export function checkPermission(user: User | null, permission: Permission): PermissionCheckResult {
  // 用户未登录
  if (!user) {
    return { allowed: false, reason: '用户未登录' }
  }

  // 管理员拥有所有权限
  if (user.role === Role.ADMIN) {
    return { allowed: true }
  }

  // 检查用户权限列表
  if (user.permissions.includes(permission)) {
    return { allowed: true }
  }

  return { allowed: false, reason: '权限不足' }
}

/**
 * 检查用户是否有任一权限
 */
export function checkAnyPermission(
  user: User | null,
  permissions: Permission[]
): PermissionCheckResult {
  // 用户未登录
  if (!user) {
    return { allowed: false, reason: '用户未登录' }
  }

  // 空数组意味着不需要任何权限
  if (permissions.length === 0) {
    return { allowed: true }
  }

  // 管理员拥有所有权限
  if (user.role === Role.ADMIN) {
    return { allowed: true }
  }

  // 检查用户是否有任一权限
  const hasPermission = permissions.some(permission => user.permissions.includes(permission))

  if (hasPermission) {
    return { allowed: true }
  }

  return { allowed: false, reason: '权限不足' }
}

/**
 * 检查用户是否有所有权限
 */
export function checkAllPermissions(
  user: User | null,
  permissions: Permission[]
): PermissionCheckResult {
  // 用户未登录
  if (!user) {
    return { allowed: false, reason: '用户未登录' }
  }

  // 管理员拥有所有权限
  if (user.role === Role.ADMIN) {
    return { allowed: true }
  }

  // 检查用户是否有所有权限
  const hasAll = permissions.every(permission => user.permissions.includes(permission))

  if (hasAll) {
    return { allowed: true }
  }

  return { allowed: false, reason: '权限不足' }
}

/**
 * 检查用户是否有指定角色
 */
export function checkRole(user: User | null, role: Role): boolean {
  if (!user) {
    return false
  }

  return user.role === role
}

/**
 * 检查用户是否是管理员
 */
export function checkIsAdmin(user: User | null): boolean {
  return checkRole(user, Role.ADMIN)
}

/**
 * 检查用户是否可以访问资源
 */
export function checkResourceAccess(
  user: User | null,
  resourceOwnerId: string,
  requiredPermission: Permission
): PermissionCheckResult {
  // 用户未登录
  if (!user) {
    return { allowed: false, reason: '用户未登录' }
  }

  // 管理员可以访问所有资源
  if (user.role === Role.ADMIN) {
    return { allowed: true }
  }

  // 资源所有者可以访问自己的资源
  if (user.id === resourceOwnerId) {
    return { allowed: true }
  }

  // 检查是否有必需的权限
  return checkPermission(user, requiredPermission)
}

/**
 * 检查多个权限
 */
export function checkPermissions(
  user: User | null,
  permissions: Permission[],
  options?: CheckPermissionOptions
): PermissionCheckResult {
  // 用户未登录
  if (!user) {
    return { allowed: false, reason: '用户未登录' }
  }

  // 管理员拥有所有权限
  if (user.role === Role.ADMIN) {
    return { allowed: true }
  }

  // 如果有资源所有者检查
  if (options?.resourceOwnerId) {
    // 用户是资源所有者，允许访问
    if (user.id === options.resourceOwnerId) {
      return { allowed: true }
    }
  }

  // 空权限列表
  if (permissions.length === 0) {
    return { allowed: true }
  }

  // 检查权限
  if (options?.requireAll) {
    return checkAllPermissions(user, permissions)
  }

  return checkAnyPermission(user, permissions)
}

/**
 * 创建用户
 */
export function createUser(
  id: string,
  username: string,
  role: Role,
  options?: {
    email?: string
    permissions?: Permission[]
  }
): User {
  const defaultPermissions = getDefaultPermissions(role)
  const userPermissions = options?.permissions ?? defaultPermissions

  return {
    id,
    username,
    email: options?.email,
    role,
    permissions: userPermissions,
  }
}

/**
 * 从 JWT payload 创建用户
 * 与现有 auth.middleware 兼容
 */
export function createUserFromPayload(payload: {
  userId: string
  username: string
  role: string
}): User {
  const role = payload.role as Role
  const permissions = getDefaultPermissions(role)

  return {
    id: payload.userId,
    username: payload.username,
    role,
    permissions,
  }
}
