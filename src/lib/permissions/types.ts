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

  // 任务权限
  TASK_READ = 'task:read',
  TASK_CREATE = 'task:create',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_BATCH = 'task:batch',

  // 设置权限
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // 审批权限
  APPROVAL_READ = 'approval:read',
  APPROVAL_CREATE = 'approval:create',
  APPROVAL_UPDATE = 'approval:update',
  APPROVAL_DELETE = 'approval:delete',
  APPROVAL_APPROVE = 'approval:approve',
  APPROVAL_REJECT = 'approval:reject',

  // 报表权限
  REPORTS_EXPORT = 'reports:export',
  REPORTS_VIEW = 'reports:view',
}

/**
 * 角色定义
 */
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

/**
 * 用户权限上下文
 */
export interface PermissionContext {
  userId: string;
  roles: RoleDefinition[];
  customPermissions?: Permission[];
}
