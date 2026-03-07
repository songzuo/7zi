/**
 * 角色权限映射 (RBAC)
 * Role-Based Access Control Configuration
 */

import { Permission, Role } from './types';

/**
 * 角色权限映射表
 * 定义每个角色拥有的默认权限
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // 管理员拥有所有权限
    ...Object.values(Permission),
  ],

  [Role.MANAGER]: [
    // 任务权限
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.TASK_BATCH,

    // 用户权限（只读）
    Permission.USER_READ,

    // 团队权限
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE_MEMBER,

    // 报告权限
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
    Permission.REPORTS_GENERATE,

    // 标签权限
    Permission.TAG_CREATE,
    Permission.TAG_UPDATE,
    Permission.TAG_DELETE,

    // 通知权限
    Permission.NOTIFICATION_SEND,
  ],

  [Role.MEMBER]: [
    // 任务权限（仅自己的）
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,

    // 用户权限（只读）
    Permission.USER_READ,

    // 报告权限
    Permission.REPORTS_READ,

    // 通知权限
    Permission.NOTIFICATION_SEND,
  ],

  [Role.VIEWER]: [
    // 只能查看
    Permission.TASK_READ,
    Permission.USER_READ,
    Permission.REPORTS_READ,
  ],
};

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(role: Role): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * 检查角色是否拥有特定权限
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * 获取权限所属的角色列表
 */
export function getRolesByPermission(permission: Permission): Role[] {
  return Object.entries(RolePermissions)
    .filter(([_, permissions]) => permissions.includes(permission))
    .map(([role]) => role as Role);
}

/**
 * 角色层级（数字越大权限越高）
 */
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.MANAGER]: 50,
  [Role.MEMBER]: 20,
  [Role.VIEWER]: 10,
};

/**
 * 比较角色层级
 * @returns 1 如果 role1 > role2, -1 如果 role1 < role2, 0 如果相等
 */
export function compareRoles(role1: Role, role2: Role): number {
  const level1 = RoleHierarchy[role1];
  const level2 = RoleHierarchy[role2];
  
  if (level1 > level2) return 1;
  if (level1 < level2) return -1;
  return 0;
}

/**
 * 检查角色1是否可以管理角色2
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  // 只有更高层级才能管理
  return compareRoles(managerRole, targetRole) > 0;
}

/**
 * 获取所有可用的角色
 */
export function getAllRoles(): Role[] {
  return Object.values(Role);
}

/**
 * 获取用户可分配的角色
 * （不能分配比自己当前角色更高或相等的角色）
 */
export function getAssignableRoles(currentRole: Role): Role[] {
  const currentLevel = RoleHierarchy[currentRole];
  return getAllRoles().filter((role) => RoleHierarchy[role] < currentLevel);
}