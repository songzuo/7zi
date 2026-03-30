/**
 * Permission Types
 *
 * 权限系统的类型定义，基于 RBAC 模型
 */

/**
 * 用户角色
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * 权限枚举
 */
export enum Permission {
  // 基础权限
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',

  // 资源权限
  USER_MANAGE = 'user:manage',
  ROOM_MANAGE = 'room:manage',
  DATA_IMPORT = 'data:import',
  DATA_EXPORT = 'data:export',

  // 管理权限
  ADMIN = 'admin',
  SETTINGS = 'settings',
  AUDIT = 'audit',
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  role: Role;
  permissions: Permission[];
}

/**
 * 权限检查选项
 */
export interface CheckPermissionOptions {
  /**
   * 资源所有者 ID
   * 用于检查用户是否是资源所有者
   */
  resourceOwnerId?: string;
  /**
   * 是否要求所有权限
   * false 表示只需要任一权限
   */
  requireAll?: boolean;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 权限上下文类型
 */
export interface PermissionContextType {
  /**
   * 当前用户
   */
  user: User | null;

  /**
   * 检查单个权限
   */
  hasPermission: (permission: Permission) => boolean;

  /**
   * 检查多个权限
   */
  hasPermissions: (permissions: Permission[], options?: CheckPermissionOptions) => boolean;

  /**
   * 检查角色
   */
  hasRole: (role: Role) => boolean;

  /**
   * 检查是否是管理员
   */
  isAdmin: () => boolean;

  /**
   * 检查是否可以访问资源
   */
  canAccessResource: (
    resourceOwnerId: string,
    requiredPermission: Permission
  ) => boolean;

  /**
   * 设置当前用户
   */
  setUser: (user: User | null) => void;

  /**
   * 清除当前用户
   */
  clearUser: () => void;
}
