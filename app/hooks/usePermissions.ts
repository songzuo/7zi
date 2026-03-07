/**
 * 权限管理 Hook
 * Permission Management React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { Permission, Role, PermissionCheckResult } from '../lib/permissions/types';
import { getRolePermissions, roleHasPermission } from '../lib/permissions';

/**
 * 用户权限状态
 */
export interface UserPermissionState {
  userId: string | null;
  role: Role | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
}

/**
 * 权限管理 Hook
 */
export function usePermissions(userId?: string | null) {
  const [state, setState] = useState<UserPermissionState>({
    userId: userId || null,
    role: null,
    permissions: [],
    isLoading: false,
    error: null,
  });

  // 加载用户权限
  const loadPermissions = useCallback(async (uid: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`/api/permissions/check?userId=${uid}`);
      const result = await response.json();
      
      if (result.success) {
        setState({
          userId: uid,
          role: result.data.role,
          permissions: result.data.permissions,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load permissions',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // 当 userId 变化时重新加载
  useEffect(() => {
    if (userId) {
      loadPermissions(userId);
    }
  }, [userId, loadPermissions]);

  // 检查单个权限
  const checkPermission = useCallback(
    (permission: Permission): PermissionCheckResult => {
      const granted = state.permissions.includes(permission);
      return {
        granted,
        permission,
        reason: granted ? undefined : `Missing permission: ${permission}`,
      };
    },
    [state.permissions]
  );

  // 检查多个权限（需要全部）
  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  // 检查多个权限（需要任意一个）
  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some((p) => state.permissions.includes(p));
    },
    [state.permissions]
  );

  // 检查角色
  const hasRole = useCallback(
    (role: Role): boolean => {
      return state.role === role;
    },
    [state.role]
  );

  // 检查角色层级（是否达到或超过指定角色）
  const hasRoleLevel = useCallback(
    (minRole: Role): boolean => {
      if (!state.role) return false;
      
      const hierarchy: Record<Role, number> = {
        [Role.ADMIN]: 100,
        [Role.MANAGER]: 50,
        [Role.MEMBER]: 20,
        [Role.VIEWER]: 10,
      };
      
      return hierarchy[state.role] >= hierarchy[minRole];
    },
    [state.role]
  );

  return {
    ...state,
    checkPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasRoleLevel,
    reload: userId ? () => loadPermissions(userId) : undefined,
  };
}

/**
 * 权限检查 Hook（简化版）
 * 只检查特定权限
 */
export function usePermissionCheck(userId: string | null, permission: Permission) {
  const { checkPermission, isLoading, error } = usePermissions(userId);
  
  return {
    ...checkPermission(permission),
    isLoading,
    error,
  };
}

/**
 * 角色信息 Hook
 * 获取所有角色定义
 */
export function useRoles() {
  const [roles, setRoles] = useState<Array<{
    role: Role;
    label: string;
    description: string;
    permissions: Permission[];
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/permissions/roles');
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data.roles);
      } else {
        setError(result.error || 'Failed to load roles');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return { roles, isLoading, error, reload: loadRoles };
}