/**
 * Permission Core - 权限核心模块
 * 
 * 提供细粒度的权限控制系统，包括：
 * - 角色（Role）、权限（Permission）、资源（Resource）模型
 * - 权限检查中间件
 * - API 路由权限装饰器
 */

import { 
  Permission, 
  PermissionDefinition, 
  RoleDefinition, 
  PermissionCheckResult,
  PermissionContext,
  UserWithRoles,
  ResourceType,
  ActionType
} from './types'
import { 
  SYSTEM_PERMISSIONS, 
  SYSTEM_ROLES 
} from './constants'
import type { User } from '../auth'

/**
 * ==================== 权限管理类 ====================
 */

/**
 * 权限管理器
 */
export class PermissionManager {
  private customPermissions: Map<string, PermissionDefinition> = new Map()
  private customRoles: Map<string, RoleDefinition> = new Map()

  getAllPermissions(): PermissionDefinition[] {
    return [...SYSTEM_PERMISSIONS, ...Array.from(this.customPermissions.values())]
  }

  getAllRoles(): RoleDefinition[] {
    return [...SYSTEM_ROLES, ...Array.from(this.customRoles.values())]
  }

  getRoleById(roleId: string): RoleDefinition | undefined {
    return SYSTEM_ROLES.find(r => r.id === roleId) || this.customRoles.get(roleId)
  }

  getPermissionsByRole(roleId: string): Permission[] {
    const role = this.getRoleById(roleId)
    return role?.permissions || []
  }

  addCustomPermission(permission: PermissionDefinition): boolean {
    if (permission.isSystem) {
      throw new Error('Cannot add system permission as custom')
    }
    if (this.customPermissions.has(permission.id)) {
      return false
    }
    this.customPermissions.set(permission.id, permission)
    return true
  }

  addCustomRole(role: RoleDefinition): boolean {
    if (role.isSystem) {
      throw new Error('Cannot add system role as custom')
    }
    if (this.customRoles.has(role.id) || SYSTEM_ROLES.some(r => r.id === role.id)) {
      return false
    }
    const allPermissions = this.getAllPermissions()
    const validPermissions = role.permissions.filter(p => allPermissions.some(ap => ap.id === p))
    if (validPermissions.length !== role.permissions.length) {
      throw new Error('Some permissions do not exist')
    }
    this.customRoles.set(role.id, role)
    return true
  }

  updateCustomRole(roleId: string, updates: Partial<RoleDefinition>): boolean {
    const role = this.customRoles.get(roleId)
    if (!role) return false
    if (updates.permissions) {
      const allPermissions = this.getAllPermissions()
      const validPermissions = updates.permissions.filter(p =>
        allPermissions.some(ap => ap.id === p)
      )
      if (validPermissions.length !== updates.permissions.length) {
        throw new Error('Some permissions do not exist')
      }
    }
    this.customRoles.set(roleId, { ...role, ...updates })
    return true
  }

  deleteCustomRole(roleId: string): boolean {
    return this.customRoles.delete(roleId)
  }

  deleteCustomPermission(permissionId: string): boolean {
    return this.customPermissions.delete(permissionId)
  }
}

/**
 * 全局权限管理器实例
 */
export const permissionManager = new PermissionManager()

/**
 * ==================== 权限检查函数 ====================
 */

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(user: UserWithRoles, permission: Permission): boolean {
  for (const role of user.roles) {
    if (role.permissions.includes(permission)) {
      return true
    }
  }
  return false
}

/**
 * 检查用户是否有任一权限
 */
export function hasAnyPermission(user: UserWithRoles, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * 检查用户是否有所有权限
 */
export function hasAllPermissions(user: UserWithRoles, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * 检查用户是否可以访问资源
 */
export function canAccessResource(
  user: UserWithRoles,
  resourceType: ResourceType,
  action: ActionType,
  context: PermissionContext
): PermissionCheckResult {
  const requiredPermission: Permission = `${resourceType}:${action}`

  if (!hasPermission(user, requiredPermission)) {
    return {
      allowed: false,
      reason: 'User does not have required permission',
      requiredPermissions: [requiredPermission],
      missingPermissions: [requiredPermission],
    }
  }

  if (context.resourceOwnerId && context.userId !== context.resourceOwnerId) {
    return {
      allowed: false,
      reason: 'User is not the resource owner',
      requiredPermissions: [requiredPermission],
      missingPermissions: [],
    }
  }

  return {
    allowed: true,
    requiredPermissions: [requiredPermission],
    missingPermissions: [],
  }
}

/**
 * 检查用户是否可以执行操作
 */
export function canExecuteAction(
  user: UserWithRoles,
  resourceType: ResourceType,
  action: ActionType
): PermissionCheckResult {
  const requiredPermission: Permission = `${resourceType}:${action}`

  if (!hasPermission(user, requiredPermission)) {
    return {
      allowed: false,
      reason: `User does not have permission ${requiredPermission}`,
      requiredPermissions: [requiredPermission],
      missingPermissions: [requiredPermission],
    }
  }

  return {
    allowed: true,
    requiredPermissions: [requiredPermission],
    missingPermissions: [],
  }
}

/**
 * 获取用户的最高角色等级
 */
export function getUserMaxLevel(user: UserWithRoles): number {
  if (user.roles.length === 0) {
    return 0
  }
  return Math.max(...user.roles.map(role => role.level))
}

/**
 * 检查用户角色等级是否高于或等于指定等级
 */
export function hasRoleLevel(user: UserWithRoles, minLevel: number): boolean {
  return getUserMaxLevel(user) >= minLevel
}

/**
 * ==================== API 中间件和装饰器 ====================
 */

/**
 * 权限错误类
 */
export class PermissionDeniedError extends Error {
  constructor(
    public requiredPermissions: Permission[],
    public missingPermissions: Permission[],
    message = 'Permission denied'
  ) {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

/**
 * 创建权限检查中间件
 */
export function createPermissionMiddleware(options: {
  resourceType: ResourceType
  action: ActionType
  checkOwnership?: boolean
  allowPublic?: boolean
}) {
  return async (ctx: { user: UserWithRoles }, next: () => Promise<unknown>) => {
    const { user } = ctx
    const { resourceType, action, allowPublic = false } = options

    if (allowPublic) {
      return next()
    }

    const result = canExecuteAction(user, resourceType, action)

    if (!result.allowed) {
      throw new PermissionDeniedError(
        result.requiredPermissions,
        result.missingPermissions,
        result.reason
      )
    }

    return next()
  }
}

/**
 * 权限装饰器工厂
 */
export function RequirePermission(
  resourceType: ResourceType,
  action: ActionType,
  options: { checkOwnership?: boolean; allowPublic?: boolean } = {}
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as { user: UserWithRoles }
      const { user } = ctx

      if (options.allowPublic) {
        return originalMethod.apply(this, args)
      }

      const result = canExecuteAction(user, resourceType, action)

      if (!result.allowed) {
        throw new PermissionDeniedError(
          result.requiredPermissions,
          result.missingPermissions,
          result.reason
        )
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 多权限装饰器（任一）
 */
export function RequireAnyPermission(
  requirements: Array<{ resourceType: ResourceType; action: ActionType }>
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as { user: UserWithRoles }
      const { user } = ctx

      const results = requirements.map(req => canExecuteAction(user, req.resourceType, req.action))
      const allowedResult = results.find(r => r.allowed)

      if (!allowedResult) {
        const allMissing = results.flatMap(r => r.missingPermissions)
        const allRequired = results.flatMap(r => r.requiredPermissions)

        throw new PermissionDeniedError(
          allRequired,
          allMissing,
          'User does not have any of the required permissions'
        )
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 多权限装饰器（所有）
 */
export function RequireAllPermissions(
  requirements: Array<{ resourceType: ResourceType; action: ActionType }>
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as { user: UserWithRoles }
      const { user } = ctx

      const results = requirements.map(req => canExecuteAction(user, req.resourceType, req.action))
      const deniedResult = results.find(r => !r.allowed)

      if (deniedResult) {
        throw new PermissionDeniedError(
          deniedResult.requiredPermissions,
          deniedResult.missingPermissions,
          deniedResult.reason
        )
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 角色等级装饰器
 */
export function RequireRoleLevel(minLevel: number) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as { user: UserWithRoles }
      const { user } = ctx

      if (!hasRoleLevel(user, minLevel)) {
        throw new Error(
          `User role level (${getUserMaxLevel(user)}) is below required level (${minLevel})`
        )
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * ==================== 辅助函数 ====================
 */

/**
 * 创建用户角色信息
 */
export function createUserWithRoles(user: User, roleIds: string[]): UserWithRoles {
  const roles = roleIds
    .map(id => permissionManager.getRoleById(id))
    .filter((r): r is RoleDefinition => r !== undefined)

  return {
    ...user,
    roleIds,
    roles,
  }
}

/**
 * 从权限标识符解析资源类型和操作类型
 */
export function parsePermission(permission: Permission): {
  resourceType: ResourceType
  actionType: ActionType
} {
  const [resourceType, actionType] = permission.split(':') as [ResourceType, ActionType]
  return { resourceType, actionType }
}

/**
 * 构建权限标识符
 */
export function buildPermission(resourceType: ResourceType, actionType: ActionType): Permission {
  return `${resourceType}:${actionType}`
}

/**
 * 获取权限描述
 */
export function getPermissionDescription(permission: Permission): string {
  const definition = SYSTEM_PERMISSIONS.find(p => p.id === permission)
  return definition?.description || permission
}

/**
 * 验证权限格式
 */
export function isValidPermission(permission: string): permission is Permission {
  const parts = permission.split(':')
  if (parts.length !== 2) return false
  const [resourceType, actionType] = parts
  return (
    Object.values(ResourceType).includes(resourceType as ResourceType) &&
    Object.values(ActionType).includes(actionType as ActionType)
  )
}

/**
 * 导出类型和类
 */
export * from './types'
export * from './constants'
