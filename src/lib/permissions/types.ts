// @ts-nocheck
/**
 * 权限系统类型定义
 * Permission System Type Definitions
 */

/**
 * 权限枚举
 */
export enum Permission {
  // 用户权限
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLE = 'user:manage:role',

  // 团队权限
  TEAM_READ = 'team:read',
  TEAM_CREATE = 'team:create',
  TEAM_UPDATE = 'team:update',
  TEAM_DELETE = 'team:delete',
  TEAM_ADD_MEMBER = 'team:add:member',
  TEAM_REMOVE_MEMBER = 'team:remove:member',
  TEAM_MANAGE = 'team:manage',

  // 任务权限
  TASK_READ = 'task:read',
  TASK_CREATE = 'task:create',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_BATCH = 'task:batch',
  TASK_ASSIGN = 'task:assign',

  // 设置权限
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_MANAGE = 'settings:manage',

  // 审批权限
  APPROVAL_READ = 'approval:read',
  APPROVAL_CREATE = 'approval:create',
  APPROVAL_UPDATE = 'approval:update',
  APPROVAL_DELETE = 'approval:delete',
  APPROVAL_APPROVE = 'approval:approve',
  APPROVAL_REJECT = 'approval:reject',
  APPROVAL_MANAGE = 'approval:manage',

  // 报表权限
  REPORTS_EXPORT = 'reports:export',
  REPORTS_VIEW = 'reports:view',
  REPORTS_MANAGE = 'reports:manage',

  // 系统权限
  SYSTEM_READ = 'system:read',
  SYSTEM_MANAGE = 'system:manage',
  SYSTEM_CONFIG = 'system:config',

  // 日志权限
  LOGS_READ = 'logs:read',
  LOGS_EXPORT = 'logs:export',

  // 智能体权限
  AGENT_READ = 'agent:read',
  AGENT_CREATE = 'agent:create',
  AGENT_UPDATE = 'agent:update',
  AGENT_DELETE = 'agent:delete',
  AGENT_MANAGE = 'agent:manage',
  AGENT_EXECUTE = 'agent:execute',

  // 钱包权限
  WALLET_READ = 'wallet:read',
  WALLET_MANAGE = 'wallet:manage',
  WALLET_TRANSFER = 'wallet:transfer',
}

/**
 * 角色定义
 */
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest',
  VIEWER = 'viewer',
}

export interface RoleDefinition {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  isSystem?: boolean
}

/**
 * 用户权限上下文
 */
export interface PermissionContext {
  userId: string
  roles: Role[]
  permissions: Permission[]
  customPermissions?: (Permission | string)[]
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  missingPermissions?: Permission[]
}

/**
 * 权限动作
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'execute'

/**
 * 解析后的权限
 */
export interface ParsedPermission {
  resource: string
  action: PermissionAction
  conditions?: Record<string, unknown>
}

/**
 * 角色定义（带计数）
 */
export interface RoleDefinitionWithCount extends RoleDefinition {
  userCount: number
}

/**
 * 角色权限映射
 */
export interface RolePermissionMapping {
  roleId: string
  permission: Permission
  grantedAt: Date
  grantedBy: string
}

/**
 * 用户角色映射
 */
export interface UserRoleMapping {
  userId: string
  roleId: string
  assignedAt: Date
  assignedBy: string
  expiresAt?: Date
}
