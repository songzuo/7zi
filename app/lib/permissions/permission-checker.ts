/**
 * 权限检查器
 * Permission Checker Service
 */

import { Permission, Role, UserPermissionInfo } from './types';
import { roleHasPermission } from './role-config';

/**
 * 权限检查器类
 */
export class PermissionChecker {
  private userPermissions: Map<string, Set<Permission>> = new Map();
  private userRoles: Map<string, Role> = new Map();
  private customPermissions: Map<string, Set<Permission>> = new Map();

  /**
   * 加载用户权限信息
   */
  loadUserPermissions(userInfo: UserPermissionInfo): void {
    this.userRoles.set(userInfo.userId, userInfo.role);
    
    // 合并角色权限和自定义权限
    const allPermissions = new Set([
      ...userInfo.permissions,
      ...(userInfo.customPermissions || []),
    ]);
    
    this.userPermissions.set(userInfo.userId, allPermissions);
    
    if (userInfo.customPermissions) {
      this.customPermissions.set(userInfo.userId, new Set(userInfo.customPermissions));
    }
  }

  /**
   * 检查用户是否有某个权限
   */
  check(userId: string, permission: Permission): PermissionCheckResult {
    const permissions = this.userPermissions.get(userId);
    
    if (!permissions) {
      return {
        granted: false,
        permission,
        reason: 'User permissions not loaded',
      };
    }

    const granted = permissions.has(permission);
    
    return {
      granted,
      permission,
      reason: granted ? undefined : `Missing permission: ${permission}`,
    };
  }

  /**
   * 批量检查权限
   */
  checkMultiple(userId: string, permissions: Permission[]): Record<Permission, PermissionCheckResult> {
    const results: Record<string, PermissionCheckResult> = {};
    
    for (const permission of permissions) {
      results[permission] = this.check(userId, permission);
    }
    
    return results as Record<Permission, PermissionCheckResult>;
  }

  /**
   * 检查用户是否有所有指定权限
   */
  hasAll(userId: string, permissions: Permission[]): boolean {
    return permissions.every((p) => this.check(userId, p).granted);
  }

  /**
   * 检查用户是否有任意一个指定权限
   */
  hasAny(userId: string, permissions: Permission[]): boolean {
    return permissions.some((p) => this.check(userId, p).granted);
  }

  /**
   * 获取用户的所有权限
   */
  getUserPermissions(userId: string): Permission[] {
    const permissions = this.userPermissions.get(userId);
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * 获取用户角色
   */
  getUserRole(userId: string): Role | undefined {
    return this.userRoles.get(userId);
  }

  /**
   * 添加自定义权限
   */
  addCustomPermission(userId: string, permission: Permission): void {
    let custom = this.customPermissions.get(userId);
    if (!custom) {
      custom = new Set();
      this.customPermissions.set(userId, custom);
    }
    custom.add(permission);
    
    // 更新总权限
    const all = this.userPermissions.get(userId);
    if (all) {
      all.add(permission);
    }
  }

  /**
   * 移除自定义权限
   */
  removeCustomPermission(userId: string, permission: Permission): void {
    const custom = this.customPermissions.get(userId);
    if (custom) {
      custom.delete(permission);
    }
    
    // 如果权限不在角色权限中，从总权限中移除
    const role = this.userRoles.get(userId);
    if (role && !roleHasPermission(role, permission)) {
      const all = this.userPermissions.get(userId);
      if (all) {
        all.delete(permission);
      }
    }
  }

  /**
   * 清除用户权限缓存
   */
  clearUser(userId: string): void {
    this.userPermissions.delete(userId);
    this.userRoles.delete(userId);
    this.customPermissions.delete(userId);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.userPermissions.clear();
    this.userRoles.clear();
    this.customPermissions.clear();
  }
}

// 全局权限检查器实例
export const permissionChecker = new PermissionChecker();

/**
 * 便捷函数：检查权限
 */
export function hasPermission(userId: string, permission: Permission): boolean {
  return permissionChecker.check(userId, permission).granted;
}

/**
 * 便捷函数：批量检查权限
 */
export function hasPermissions(userId: string, permissions: Permission[]): boolean {
  return permissionChecker.hasAll(userId, permissions);
}