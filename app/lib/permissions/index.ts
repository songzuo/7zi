/**
 * 权限管理模块
 * Permission Management Module
 */

// 类型导出
export * from './types';
export { RolePermissions, RoleHierarchy, getRolePermissions, roleHasPermission, compareRoles, canManageRole, getAllRoles, getAssignableRoles } from './role-config';
export { PermissionChecker, permissionChecker, hasPermission, hasPermissions } from './permission-checker';
export { withPermission, withAllPermissions, withAnyPermission, withRole, adminOnly, managerOrAbove, withResourceOwnership, canAssignRole, extractUserFromRequest } from './middleware';
export type { AuthenticatedUser } from './middleware';