'use client';

/**
 * Permission Guard Components
 *
 * 用于根据权限条件渲染内容的 React 组件
 */

import { ReactNode } from 'react';

import { usePermission } from './index';
import { Role, Permission, CheckPermissionOptions } from './types';

/**
 * PermissionGuard Props
 */
export interface PermissionGuardProps {
  /**
   * 子组件
   */
  children: ReactNode;

  /**
   * 必需的权限
   */
  permissions?: Permission[];

  /**
   * 必需的角色
   */
  role?: Role;

  /**
   * 权限检查选项
   */
  options?: CheckPermissionOptions;

  /**
   * 无权限时显示的内容
   * 如果为 null，则不渲染任何内容
   */
  fallback?: ReactNode | null;
}

/**
 * PermissionGuard
 *
 * 根据权限条件渲染内容
 */
export function PermissionGuard({
  children,
  permissions,
  role,
  options,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermissions, hasRole } = usePermission();

  // 检查角色
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // 检查权限
  if (permissions && !hasPermissions(permissions, options)) {
    return <>{fallback}</>;
  }

  // 通过检查，渲染子组件
  return <>{children}</>;
}

/**
 * AdminGuard Props
 */
export interface AdminGuardProps {
  /**
   * 子组件
   */
  children: ReactNode;

  /**
   * 非管理员时显示的内容
   * 如果为 null，则不渲染任何内容
   */
  fallback?: ReactNode | null;
}

/**
 * AdminGuard
 *
 * 仅管理员可以访问的内容
 */
export function AdminGuard({ children, fallback = null }: AdminGuardProps) {
  const { isAdmin } = usePermission();

  if (!isAdmin()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * RoleGuard Props
 */
export interface RoleGuardProps {
  /**
   * 子组件
   */
  children: ReactNode;

  /**
   * 允许的角色列表
   */
  allowedRoles: Role[];

  /**
   * 角色不匹配时显示的内容
   * 如果为 null，则不渲染任何内容
   */
  fallback?: ReactNode | null;
}

/**
 * RoleGuard
 *
 * 仅指定角色可以访问的内容
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user } = usePermission();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
