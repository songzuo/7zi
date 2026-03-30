'use client';

/**
 * Permission Context
 *
 * React Context 用于权限管理，提供全局权限状态和检查函数
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import {
  Role,
  Permission,
  User,
  CheckPermissionOptions,
  PermissionContextType,
} from './types';

import {
  checkPermission,
  checkPermissions,
  checkRole,
  checkIsAdmin,
  checkResourceAccess,
  createUserFromPayload,
} from './utils';

/**
 * Permission Context
 */
const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

/**
 * Permission Provider Props
 */
export interface PermissionProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

/**
 * Permission Provider
 *
 * 提供全局权限状态和检查函数
 */
export function PermissionProvider({ children, initialUser = null }: PermissionProviderProps) {
  const [user, setUserState] = useState<User | null>(initialUser);

  /**
   * 检查单个权限
   */
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return checkPermission(user, permission).allowed;
    },
    [user]
  );

  /**
   * 检查多个权限
   */
  const hasPermissions = useCallback(
    (permissions: Permission[], options?: CheckPermissionOptions): boolean => {
      return checkPermissions(user, permissions, options).allowed;
    },
    [user]
  );

  /**
   * 检查角色
   */
  const hasRole = useCallback(
    (role: Role): boolean => {
      return checkRole(user, role);
    },
    [user]
  );

  /**
   * 检查是否是管理员
   */
  const isAdmin = useCallback((): boolean => {
    return checkIsAdmin(user);
  }, [user]);

  /**
   * 检查是否可以访问资源
   */
  const canAccessResource = useCallback(
    (resourceOwnerId: string, requiredPermission: Permission): boolean => {
      return checkResourceAccess(user, resourceOwnerId, requiredPermission).allowed;
    },
    [user]
  );

  /**
   * 设置当前用户
   */
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
  }, []);

  /**
   * 清除当前用户
   */
  const clearUser = useCallback(() => {
    setUserState(null);
  }, []);

  /**
   * Context 值
   */
  const value: PermissionContextType = {
    user,
    hasPermission,
    hasPermissions,
    hasRole,
    isAdmin,
    canAccessResource,
    setUser,
    clearUser,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/**
 * usePermission Hook
 *
 * 使用权限上下文
 */
export function usePermission(): PermissionContextType {
  const context = useContext(PermissionContext);

  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }

  return context;
}

/**
 * 导出类型
 */
export type { PermissionContextType };
