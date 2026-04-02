/**
 * RBAC (Role-Based Access Control) Permission System
 *
 * 提供细粒度的权限控制系统，包括：
 * - 角色（Role）、权限（Permission）、资源（Resource）模型
 * - 权限检查中间件
 * - API 路由权限装饰器
 * - 资源级别的访问控制
 */

import { User, UserRole } from './auth'

/**
 * ==================== RBAC 模型定义 ====================
 */

/**
 * 资源类型枚举
 */
export enum ResourceType {
  // 用户相关
  USER = 'user',
  USER_PROFILE = 'user_profile',

  // 团队相关
  TEAM = 'team',
  TEAM_MEMBER = 'team_member',
  TEAM_INVITATION = 'team_invitation',

  // 项目相关
  PROJECT = 'project',
  PROJECT_TASK = 'project_task',
  PROJECT_MILESTONE = 'project_milestone',

  // 数据相关
  DATA = 'data',
  DATA_EXPORT = 'data_export',

  // 系统相关
  SYSTEM = 'system',
  SYSTEM_CONFIG = 'system_config',
  SYSTEM_LOG = 'system_log',

  // MCP 相关
  MCP_SERVER = 'mcp_server',
  MCP_TOOL = 'mcp_tool',
  MCP_RESOURCE = 'mcp_resource',

  // 钱包相关
  WALLET = 'wallet',
  WALLET_TRANSACTION = 'wallet_transaction',
}

/**
 * 操作类型枚举
 */
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  EXECUTE = 'execute',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage', // 包含所有操作
}

/**
 * 权限标识符 - 使用更宽松的类型以支持动态权限
 */
export type Permission = string

/**
 * 权限定义
 */
export interface PermissionDefinition {
  id: string
  name: string
  description: string
  resourceType: ResourceType
  actionType: ActionType
  isSystem: boolean // 是否为系统权限（不可删除）
}

/**
 * 角色定义
 */
export interface RoleDefinition {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean // 是否为系统角色（不可删除）
  level: number // 角色等级，数字越大权限越高
}

/**
 * 资源访问规则
 */
export interface ResourceAccessRule {
  resourceType: ResourceType
  requiredPermissions: Permission[]
  ownerAccessRule?: 'full' | 'read-only' | 'custom'
  publicAccess?: boolean // 是否允许公开访问
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  requiredPermissions: Permission[]
  missingPermissions: Permission[]
}

/**
 * 上下文信息 - 用于权限检查
 */
export interface PermissionContext {
  userId: string
  resourceOwnerId?: string
  resourceId?: string
  resourceType?: ResourceType
  additionalData?: Record<string, unknown>
}

/**
 * ==================== 系统权限定义 ====================
 */

/**
 * 所有系统权限列表
 */
export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // 用户管理
  {
    id: 'user:read',
    name: '查看用户',
    description: '查看用户信息',
    resourceType: ResourceType.USER,
    actionType: ActionType.READ,
    isSystem: true,
  },
  {
    id: 'user:create',
    name: '创建用户',
    description: '创建新用户',
    resourceType: ResourceType.USER,
    actionType: ActionType.CREATE,
    isSystem: true,
  },
  {
    id: 'user:update',
    name: '更新用户',
    description: '更新用户信息',
    resourceType: ResourceType.USER,
    actionType: ActionType.UPDATE,
    isSystem: true,
  },
  {
    id: 'user:delete',
    name: '删除用户',
    description: '删除用户',
    resourceType: ResourceType.USER,
    actionType: ActionType.DELETE,
    isSystem: true,
  },
  {
    id: 'user:list',
    name: '列出用户',
    description: '列出所有用户',
    resourceType: ResourceType.USER,
    actionType: ActionType.LIST,
    isSystem: true,
  },

  // 团队管理
  {
    id: 'team:create',
    name: '创建团队',
    description: '创建新团队',
    resourceType: ResourceType.TEAM,
    actionType: ActionType.CREATE,
    isSystem: true,
  },
  {
    id: 'team:update',
    name: '更新团队',
    description: '更新团队信息',
    resourceType: ResourceType.TEAM,
    actionType: ActionType.UPDATE,
    isSystem: true,
  },
  {
    id: 'team:delete',
    name: '删除团队',
    description: '删除团队',
    resourceType: ResourceType.TEAM,
    actionType: ActionType.DELETE,
    isSystem: true,
  },
  {
    id: 'team:manage',
    name: '管理团队',
    description: '完全管理团队（包括成员管理）',
    resourceType: ResourceType.TEAM,
    actionType: ActionType.MANAGE,
    isSystem: true,
  },

  // 项目管理
  {
    id: 'project:create',
    name: '创建项目',
    description: '创建新项目',
    resourceType: ResourceType.PROJECT,
    actionType: ActionType.CREATE,
    isSystem: true,
  },
  {
    id: 'project:read',
    name: '读取项目',
    description: '读取项目信息',
    resourceType: ResourceType.PROJECT,
    actionType: ActionType.READ,
    isSystem: true,
  },
  {
    id: 'project:update',
    name: '更新项目',
    description: '更新项目信息',
    resourceType: ResourceType.PROJECT,
    actionType: ActionType.UPDATE,
    isSystem: true,
  },
  {
    id: 'project:delete',
    name: '删除项目',
    description: '删除项目',
    resourceType: ResourceType.PROJECT,
    actionType: ActionType.DELETE,
    isSystem: true,
  },

  // 团队
  {
    id: 'team:read',
    name: '读取团队',
    description: '读取团队信息',
    resourceType: ResourceType.TEAM,
    actionType: ActionType.READ,
    isSystem: true,
  },

  // 数据管理
  {
    id: 'data:export',
    name: '导出数据',
    description: '导出数据',
    resourceType: ResourceType.DATA,
    actionType: ActionType.EXPORT,
    isSystem: true,
  },
  {
    id: 'data:import',
    name: '导入数据',
    description: '导入数据',
    resourceType: ResourceType.DATA,
    actionType: ActionType.IMPORT,
    isSystem: true,
  },

  // 系统管理
  {
    id: 'system:config',
    name: '系统配置',
    description: '修改系统配置',
    resourceType: ResourceType.SYSTEM_CONFIG,
    actionType: ActionType.MANAGE,
    isSystem: true,
  },
  {
    id: 'system:log',
    name: '系统日志',
    description: '查看系统日志',
    resourceType: ResourceType.SYSTEM_LOG,
    actionType: ActionType.READ,
    isSystem: true,
  },

  // MCP 管理
  {
    id: 'mcp:execute',
    name: '执行 MCP 工具',
    description: '执行 MCP 服务器工具',
    resourceType: ResourceType.MCP_TOOL,
    actionType: ActionType.EXECUTE,
    isSystem: true,
  },
]

/**
 * ==================== 系统角色定义 ====================
 */

/**
 * 超级管理员角色 - 拥有所有权限
 */
export const SUPER_ADMIN_ROLE: RoleDefinition = {
  id: 'super_admin',
  name: '超级管理员',
  description: '拥有系统的所有权限',
  permissions: SYSTEM_PERMISSIONS.map(p => p.id as Permission),
  isSystem: true,
  level: 100,
}

/**
 * 管理员角色 - 拥有大部分管理权限
 */
export const ADMIN_ROLE: RoleDefinition = {
  id: 'admin',
  name: '管理员',
  description: '拥有大部分管理权限，但无法修改系统配置',
  permissions: [
    'user:read',
    'user:list',
    'user:update',
    'team:create',
    'team:update',
    'team:manage',
    'project:create',
    'project:update',
    'project:delete',
    'data:export',
    'system:log',
    'mcp:execute',
  ],
  isSystem: true,
  level: 80,
}

/**
 * 团队负责人角色 - 管理团队和项目
 */
export const TEAM_LEADER_ROLE: RoleDefinition = {
  id: 'team_leader',
  name: '团队负责人',
  description: '可以管理团队和项目',
  permissions: [
    'team:update',
    'team:manage',
    'project:create',
    'project:update',
    'project:delete',
    'data:export',
    'mcp:execute',
  ],
  isSystem: true,
  level: 60,
}

/**
 * 开发者角色 - 可以创建和编辑项目
 */
export const DEVELOPER_ROLE: RoleDefinition = {
  id: 'developer',
  name: '开发者',
  description: '可以查看项目',
  permissions: ['project:read', 'data:export', 'mcp:execute'],
  isSystem: true,
  level: 40,
}

/**
 * 普通用户角色 - 基本查看权限
 */
export const USER_ROLE: RoleDefinition = {
  id: 'user',
  name: '普通用户',
  description: '基本查看权限',
  permissions: ['user:read', 'project:read', 'team:read'],
  isSystem: true,
  level: 20,
}

/**
 * 访客角色 - 只读权限
 */
export const GUEST_ROLE: RoleDefinition = {
  id: 'guest',
  name: '访客',
  description: '只读权限',
  permissions: ['project:read'],
  isSystem: true,
  level: 10,
}

/**
 * 所有系统角色
 */
export const SYSTEM_ROLES: RoleDefinition[] = [
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  TEAM_LEADER_ROLE,
  DEVELOPER_ROLE,
  USER_ROLE,
  GUEST_ROLE,
]

/**
 * ==================== 权限管理类 ====================
 */

/**
 * 权限管理器
 */
export class PermissionManager {
  private customPermissions: Map<string, PermissionDefinition> = new Map()
  private customRoles: Map<string, RoleDefinition> = new Map()

  /**
   * 获取所有权限（包括系统权限和自定义权限）
   */
  getAllPermissions(): PermissionDefinition[] {
    return [...SYSTEM_PERMISSIONS, ...Array.from(this.customPermissions.values())]
  }

  /**
   * 获取所有角色（包括系统角色和自定义角色）
   */
  getAllRoles(): RoleDefinition[] {
    return [...SYSTEM_ROLES, ...Array.from(this.customRoles.values())]
  }

  /**
   * 根据角色ID获取角色
   */
  getRoleById(roleId: string): RoleDefinition | undefined {
    return SYSTEM_ROLES.find(r => r.id === roleId) || this.customRoles.get(roleId)
  }

  /**
   * 根据角色ID获取权限列表
   */
  getPermissionsByRole(roleId: string): Permission[] {
    const role = this.getRoleById(roleId)
    return role?.permissions || []
  }

  /**
   * 添加自定义权限
   */
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

  /**
   * 添加自定义角色
   */
  addCustomRole(role: RoleDefinition): boolean {
    if (role.isSystem) {
      throw new Error('Cannot add system role as custom')
    }

    if (this.customRoles.has(role.id) || SYSTEM_ROLES.some(r => r.id === role.id)) {
      return false
    }

    // 验证权限是否存在
    const allPermissions = this.getAllPermissions()
    const validPermissions = role.permissions.filter(p => allPermissions.some(ap => ap.id === p))

    if (validPermissions.length !== role.permissions.length) {
      throw new Error('Some permissions do not exist')
    }

    this.customRoles.set(role.id, role)
    return true
  }

  /**
   * 更新自定义角色
   */
  updateCustomRole(roleId: string, updates: Partial<RoleDefinition>): boolean {
    const role = this.customRoles.get(roleId)
    if (!role) {
      return false
    }

    if (updates.permissions) {
      // 验证权限是否存在
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

  /**
   * 删除自定义角色
   */
  deleteCustomRole(roleId: string): boolean {
    return this.customRoles.delete(roleId)
  }

  /**
   * 删除自定义权限
   */
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
 * 扩展用户接口，包含角色信息
 */
export interface UserWithRoles extends User {
  roleIds: string[]
  roles: RoleDefinition[]
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(user: UserWithRoles, permission: Permission): boolean {
  // 检查用户的角色中是否有该权限
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

  // 1. 检查用户是否有该权限
  if (!hasPermission(user, requiredPermission)) {
    return {
      allowed: false,
      reason: 'User does not have required permission',
      requiredPermissions: [requiredPermission],
      missingPermissions: [requiredPermission],
    }
  }

  // 2. 检查资源所有权（如果提供）
  if (context.resourceOwnerId && context.userId !== context.resourceOwnerId) {
    // 不是资源所有者，需要额外的检查
    // 这里可以根据实际业务逻辑添加更复杂的规则
    return {
      allowed: false,
      reason: 'User is not the resource owner',
      requiredPermissions: [requiredPermission],
      missingPermissions: [],
    }
  }

  // 3. 检查通过
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
 * Next.js API 路由上下文
 */
export interface ApiContext {
  user: UserWithRoles
}

/**
 * 权限检查中间件选项
 */
export interface PermissionMiddlewareOptions {
  resourceType: ResourceType
  action: ActionType
  checkOwnership?: boolean // 是否检查资源所有权
  allowPublic?: boolean // 是否允许公开访问
}

/**
 * 创建权限检查中间件
 */
export function createPermissionMiddleware(options: PermissionMiddlewareOptions) {
  return async (ctx: ApiContext, next: () => Promise<unknown>) => {
    const { user } = ctx
    const { resourceType, action, checkOwnership = false, allowPublic = false } = options

    // 如果允许公开访问，直接放行
    if (allowPublic) {
      return next()
    }

    // 检查用户是否有权限
    const result = canExecuteAction(user, resourceType, action)

    if (!result.allowed) {
      throw new PermissionDeniedError(
        result.requiredPermissions,
        result.missingPermissions,
        result.reason
      )
    }

    // 继续执行下一个中间件
    return next()
  }
}

/**
 * 权限装饰器工厂（用于类方法）
 */
export function RequirePermission(
  resourceType: ResourceType,
  action: ActionType,
  options: { checkOwnership?: boolean; allowPublic?: boolean } = {}
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      // 获取用户上下文（假设第一个参数包含 ctx）
      const ctx = args[0] as ApiContext
      const { user } = ctx

      // 如果允许公开访问，直接执行
      if (options.allowPublic) {
        return originalMethod.apply(this, args)
      }

      // 检查权限
      const result = canExecuteAction(user, resourceType, action)

      if (!result.allowed) {
        throw new PermissionDeniedError(
          result.requiredPermissions,
          result.missingPermissions,
          result.reason
        )
      }

      // 继续执行原方法
      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 多权限装饰器工厂（需要满足任一权限）
 */
export function RequireAnyPermission(
  requirements: Array<{ resourceType: ResourceType; action: ActionType }>
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as ApiContext
      const { user } = ctx

      // 检查是否有任一权限
      const results = requirements.map(req => canExecuteAction(user, req.resourceType, req.action))

      const allowedResult = results.find(r => r.allowed)

      if (!allowedResult) {
        // 汇总所有缺失的权限
        const allMissing = results.flatMap(r => r.missingPermissions)
        const allRequired = results.flatMap(r => r.requiredPermissions)

        throw new PermissionDeniedError(
          allRequired,
          allMissing,
          'User does not have any of the required permissions'
        )
      }

      // 继续执行原方法
      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 多权限装饰器工厂（需要满足所有权限）
 */
export function RequireAllPermissions(
  requirements: Array<{ resourceType: ResourceType; action: ActionType }>
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as ApiContext
      const { user } = ctx

      // 检查是否满足所有权限
      const results = requirements.map(req => canExecuteAction(user, req.resourceType, req.action))

      const deniedResult = results.find(r => !r.allowed)

      if (deniedResult) {
        throw new PermissionDeniedError(
          deniedResult.requiredPermissions,
          deniedResult.missingPermissions,
          deniedResult.reason
        )
      }

      // 继续执行原方法
      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * 角色等级装饰器工厂
 */
export function RequireRoleLevel(minLevel: number) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const ctx = args[0] as ApiContext
      const { user } = ctx

      if (!hasRoleLevel(user, minLevel)) {
        throw new Error(
          `User role level (${getUserMaxLevel(user)}) is below required level (${minLevel})`
        )
      }

      // 继续执行原方法
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
 * 导出所有权限常量（便于使用）
 */
export const Permissions = {
  // 用户
  USER_READ: 'user:read' as Permission,
  USER_CREATE: 'user:create' as Permission,
  USER_UPDATE: 'user:update' as Permission,
  USER_DELETE: 'user:delete' as Permission,
  USER_LIST: 'user:list' as Permission,

  // 团队
  TEAM_CREATE: 'team:create' as Permission,
  TEAM_UPDATE: 'team:update' as Permission,
  TEAM_DELETE: 'team:delete' as Permission,
  TEAM_MANAGE: 'team:manage' as Permission,

  // 项目
  PROJECT_CREATE: 'project:create' as Permission,
  PROJECT_UPDATE: 'project:update' as Permission,
  PROJECT_DELETE: 'project:delete' as Permission,

  // 数据
  DATA_EXPORT: 'data:export' as Permission,
  DATA_IMPORT: 'data:import' as Permission,

  // 系统
  SYSTEM_CONFIG: 'system:config' as Permission,
  SYSTEM_LOG: 'system:log' as Permission,

  // MCP
  MCP_EXECUTE: 'mcp:execute' as Permission,
}
