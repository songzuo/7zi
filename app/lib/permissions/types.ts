/**
 * 权限类型定义
 * Permission Type Definitions
 */

/**
 * 权限枚举
 * 所有系统权限的定义
 */
export enum Permission {
  // 任务权限
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  TASK_BATCH = 'task:batch',

  // 用户权限
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLE = 'user:manage-role',

  // 团队权限
  TEAM_MANAGE = 'team:manage',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE_MEMBER = 'team:remove-member',

  // 报告权限
  REPORTS_READ = 'reports:read',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_GENERATE = 'reports:generate',

  // 系统设置权限
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // 标签权限
  TAG_CREATE = 'tag:create',
  TAG_UPDATE = 'tag:update',
  TAG_DELETE = 'tag:delete',

  // 通知权限
  NOTIFICATION_SEND = 'notification:send',
  NOTIFICATION_MANAGE = 'notification:manage',
}

/**
 * 角色枚举
 */
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * 角色显示名称
 */
export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: '管理员',
  [Role.MANAGER]: '经理',
  [Role.MEMBER]: '成员',
  [Role.VIEWER]: '观察者',
};

/**
 * 角色描述
 */
export const RoleDescriptions: Record<Role, string> = {
  [Role.ADMIN]: '拥有所有权限，可以管理系统的所有功能',
  [Role.MANAGER]: '可以管理任务、查看报告、邀请成员',
  [Role.MEMBER]: '可以创建和管理自己的任务',
  [Role.VIEWER]: '只能查看任务和报告，不能修改',
};

/**
 * 权限分组（用于UI显示）
 */
export interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

export const PermissionGroups: PermissionGroup[] = [
  {
    name: '任务管理',
    permissions: [
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      Permission.TASK_ASSIGN,
      Permission.TASK_BATCH,
    ],
  },
  {
    name: '用户管理',
    permissions: [
      Permission.USER_CREATE,
      Permission.USER_READ,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.USER_MANAGE_ROLE,
    ],
  },
  {
    name: '团队管理',
    permissions: [
      Permission.TEAM_MANAGE,
      Permission.TEAM_INVITE,
      Permission.TEAM_REMOVE_MEMBER,
    ],
  },
  {
    name: '报告管理',
    permissions: [
      Permission.REPORTS_READ,
      Permission.REPORTS_EXPORT,
      Permission.REPORTS_GENERATE,
    ],
  },
  {
    name: '系统设置',
    permissions: [Permission.SETTINGS_READ, Permission.SETTINGS_UPDATE],
  },
  {
    name: '标签管理',
    permissions: [Permission.TAG_CREATE, Permission.TAG_UPDATE, Permission.TAG_DELETE],
  },
  {
    name: '通知管理',
    permissions: [Permission.NOTIFICATION_SEND, Permission.NOTIFICATION_MANAGE],
  },
];

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  granted: boolean;
  permission: Permission;
  reason?: string;
}

/**
 * 用户权限信息
 */
export interface UserPermissionInfo {
  userId: string;
  role: Role;
  permissions: Permission[];
  customPermissions?: Permission[];
}