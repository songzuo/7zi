/**
 * 角色管理 Hook
 * Role Management React Hook
 */

import { useState, useCallback } from 'react';
import { Role, RoleLabels, RoleDescriptions } from '../lib/permissions/types';
import { getAllRoles, getAssignableRoles, canManageRole } from '../lib/permissions';
import { User } from '../lib/users/types';

/**
 * 角色管理状态
 */
export interface RoleManagementState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

/**
 * 角色管理 Hook
 */
export function useRoleManagement(currentUserRole: Role) {
  const [state, setState] = useState<RoleManagementState>({
    users: [],
    isLoading: false,
    error: null,
    success: null,
  });

  // 获取可分配的角色
  const assignableRoles = getAssignableRoles(currentUserRole);

  // 加载所有用户
  const loadUsers = useCallback(async (role?: Role) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const url = role 
        ? `/api/users/role?role=${role}`
        : '/api/users/role';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setState((prev) => ({
          ...prev,
          users: result.data.users,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load users',
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

  // 更新用户角色
  const updateUserRole = useCallback(
    async (userId: string, newRole: Role, adminId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, success: null }));
      
      try {
        const response = await fetch('/api/users/role', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, newRole, adminId }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            success: `User role updated to ${RoleLabels[newRole]}`,
          }));
          return true;
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error || 'Failed to update role',
          }));
          return false;
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        return false;
      }
    },
    []
  );

  // 检查是否可以修改某用户的角色
  const canModifyUser = useCallback(
    (targetUserRole: Role): boolean => {
      return canManageRole(currentUserRole, targetUserRole);
    },
    [currentUserRole]
  );

  // 清除消息
  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, success: null }));
  }, []);

  return {
    ...state,
    assignableRoles,
    allRoles: getAllRoles(),
    roleLabels: RoleLabels,
    roleDescriptions: RoleDescriptions,
    loadUsers,
    updateUserRole,
    canModifyUser,
    clearMessages,
  };
}

/**
 * 角色选择器 Hook
 */
export function useRoleSelector(currentRole: Role) {
  const assignableRoles = getAssignableRoles(currentRole);
  
  const options = assignableRoles.map((role) => ({
    value: role,
    label: RoleLabels[role],
    description: RoleDescriptions[role],
  }));
  
  return {
    options,
    hasAssignableRoles: assignableRoles.length > 0,
  };
}