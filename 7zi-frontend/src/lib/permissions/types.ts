/**
 * Permission Types - 权限类型定义
 */

import type { User } from '../auth'

/**
 * ==================== 枚举定义 ====================
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
 * ==================== 类型定义 ====================
 */

/**
 * 权限标识符
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
  isSystem: boolean
}

/**
 * 角色定义
 */
export interface RoleDefinition {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  level: number
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
 * 上下文信息
 */
export interface PermissionContext {
  userId: string
  resourceOwnerId?: string
  resourceId?: string
  resourceType?: ResourceType
  additionalData?: Record<string, unknown>
}

/**
 * 扩展用户接口
 */
export interface UserWithRoles extends User {
  roleIds: string[]
  roles: RoleDefinition[]
}

/**
 * API 上下文
 */
export interface ApiContext {
  user: UserWithRoles
}

/**
 * 权限中间件选项
 */
export interface PermissionMiddlewareOptions {
  resourceType: ResourceType
  action: ActionType
  checkOwnership?: boolean
  allowPublic?: boolean
}
