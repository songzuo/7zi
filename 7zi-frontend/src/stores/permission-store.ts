/**
 * 权限状态管理 Store (Permission Store)
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-30
 *
 * 功能:
 * - 用户权限状态管理
 * - 角色权限映射
 * - 权限检查和验证
 * - 权限持久化
 *
 * 基于 src/lib/permissions.ts 中的 RBAC 系统
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Permission,
  ResourceType,
  ActionType,
  RoleDefinition,
  PermissionCheckResult,
  SYSTEM_ROLES,
  permissionManager,
  hasPermission as libHasPermission,
  hasAnyPermission as libHasAnyPermission,
  hasAllPermissions as libHasAllPermissions,
  canAccessResource as libCanAccessResource,
  PermissionContext,
  UserWithRoles,
  createUserWithRoles,
  PermissionDefinition,
} from '@/lib/permissions';
import { User } from './auth-store';

/**
 * 用户角色信息
 */
export interface UserPermissionState {
  userId: string;
  roleIds: string[];
  roles: RoleDefinition[];
  permissions: Permission[]; // 直接权限（不通过角色获得的）
}

/**
 * 权限状态接口
 */
export interface PermissionState {
  // 状态
  userPermissions: UserPermissionState | null;
  isLoading: boolean;
  error: string | null;

  // 权限操作
  initializePermissions: (user: User, roleIds: string[]) => void;
  clearPermissions: () => void;

  // 权限检查方法
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  checkAccess: (
    resourceType: ResourceType,
    action: ActionType,
    context?: Partial<PermissionContext>
  ) => PermissionCheckResult;

  // 资源级别权限检查
  canAccessResource: (
    resourceType: ResourceType,
    action: ActionType,
    resourceOwnerId?: string,
    userId?: string
  ) => boolean;

  // 角色等级检查
  hasRoleLevel: (minLevel: number) => boolean;
  getUserMaxLevel: () => number;

  // 权限管理方法（管理员用）
  grantPermission: (permission: Permission) => boolean;
  revokePermission: (permission: Permission) => boolean;
  getEffectivePermissions: () => Permission[];

  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;

  // 重置状态
  reset: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  userPermissions: null,
  isLoading: false,
  error: null,
};

/**
 * 权限状态 Store
 *
 * 使用 persist 中间件将用户权限信息持久化到 localStorage
 */
export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * 初始化用户权限
       */
      initializePermissions: (user: User, roleIds: string[]) => {
        set({ isLoading: true, error: null });

        try {
          const userWithRoles = createUserWithRoles(user, roleIds);

          // 获取角色权限
          const permissions = roleIds.flatMap(id =>
            permissionManager.getPermissionsByRole(id)
          );

          set({
            userPermissions: {
              userId: user.id,
              roleIds,
              roles: userWithRoles.roles,
              permissions,
            },
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '权限初始化失败';
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      /**
       * 清除用户权限
       */
      clearPermissions: () => {
        set({
          ...initialState,
        });
      },

      /**
       * 检查是否有指定权限
       */
      hasPermission: (permission: Permission) => {
        const { userPermissions } = get();
        if (!userPermissions) return false;

        // 检查直接权限
        if (userPermissions.permissions.includes(permission)) {
          return true;
        }

        // 检查角色权限
        return userPermissions.roles.some(role =>
          role.permissions.includes(permission)
        );
      },

      /**
       * 检查是否有任一权限
       */
      hasAnyPermission: (permissions: Permission[]) => {
        return permissions.some(permission => get().hasPermission(permission));
      },

      /**
       * 检查是否有所有权限
       */
      hasAllPermissions: (permissions: Permission[]) => {
        return permissions.every(permission => get().hasPermission(permission));
      },

      /**
       * 检查资源访问权限
       */
      checkAccess: (
        resourceType: ResourceType,
        action: ActionType,
        context?: Partial<PermissionContext>
      ): PermissionCheckResult => {
        const { userPermissions } = get();
        if (!userPermissions) {
          return {
            allowed: false,
            reason: 'User not authenticated',
            requiredPermissions: [`${resourceType}:${action}`],
            missingPermissions: [`${resourceType}:${action}`],
          };
        }

        const permission = `${resourceType}:${action}`;

        // 如果用户有直接权限，直接允许
        if (userPermissions.permissions.includes(permission)) {
          return {
            allowed: true,
            requiredPermissions: [permission],
            missingPermissions: [],
          };
        }

        // 检查角色权限
        const hasRolePermission = userPermissions.roles.some(role =>
          role.permissions.includes(permission)
        );

        if (!hasRolePermission) {
          return {
            allowed: false,
            reason: `User does not have permission: ${permission}`,
            requiredPermissions: [permission],
            missingPermissions: [permission],
          };
        }

        // 检查资源所有权
        if (context?.resourceOwnerId && context?.userId) {
          if (context.userId !== context.resourceOwnerId) {
            return {
              allowed: false,
              reason: 'User is not the resource owner',
              requiredPermissions: [permission],
              missingPermissions: [],
            };
          }
        }

        return {
          allowed: true,
          requiredPermissions: [permission],
          missingPermissions: [],
        };
      },

      /**
       * 检查是否可以访问资源
       */
      canAccessResource: (
        resourceType: ResourceType,
        action: ActionType,
        resourceOwnerId?: string,
        userId?: string
      ) => {
        const result = get().checkAccess(resourceType, action, {
          resourceOwnerId,
          userId,
        });
        return result.allowed;
      },

      /**
       * 检查用户角色等级是否高于或等于指定等级
       */
      hasRoleLevel: (minLevel: number) => {
        const { userPermissions } = get();
        if (!userPermissions || userPermissions.roles.length === 0) {
          return false;
        }

        const maxLevel = Math.max(...userPermissions.roles.map(role => role.level));
        return maxLevel >= minLevel;
      },

      /**
       * 获取用户最高角色等级
       */
      getUserMaxLevel: () => {
        const { userPermissions } = get();
        if (!userPermissions || userPermissions.roles.length === 0) {
          return 0;
        }

        return Math.max(...userPermissions.roles.map(role => role.level));
      },

      /**
       * 授予直接权限
       */
      grantPermission: (permission: Permission) => {
        const { userPermissions } = get();
        if (!userPermissions) return false;

        // 检查权限是否已存在
        if (userPermissions.permissions.includes(permission)) {
          return false;
        }

        set({
          userPermissions: {
            ...userPermissions,
            permissions: [...userPermissions.permissions, permission],
          },
        });

        return true;
      },

      /**
       * 撤销直接权限
       */
      revokePermission: (permission: Permission) => {
        const { userPermissions } = get();
        if (!userPermissions) return false;

        // 检查权限是否存在
        if (!userPermissions.permissions.includes(permission)) {
          return false;
        }

        set({
          userPermissions: {
            ...userPermissions,
            permissions: userPermissions.permissions.filter(p => p !== permission),
          },
        });

        return true;
      },

      /**
       * 获取所有有效权限（包括角色权限和直接权限）
       */
      getEffectivePermissions: () => {
        const { userPermissions } = get();
        if (!userPermissions) return [];

        const rolePermissions = userPermissions.roles.flatMap(role => role.permissions);
        const allPermissions = [...new Set([...rolePermissions, ...userPermissions.permissions])];

        return allPermissions;
      },

      /**
       * 设置错误
       */
      setError: (error: string | null) => {
        set({ error });
      },

      /**
       * 清除错误
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 重置状态
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: '7zi-permission-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化用户权限状态
        userPermissions: state.userPermissions,
      }),
    }
  )
);

/**
 * 选择器 - 用于性能优化
 */
export const selectUserPermissions = (state: PermissionState) => state.userPermissions;
export const selectIsLoading = (state: PermissionState) => state.isLoading;
export const selectError = (state: PermissionState) => state.error;

/**
 * 权限检查辅助函数
 */
export const useHasPermission = (permission: Permission) => {
  return usePermissionStore(state => state.hasPermission(permission));
};

export const useHasAnyPermission = (permissions: Permission[]) => {
  return usePermissionStore(state => state.hasAnyPermission(permissions));
};

export const useHasAllPermissions = (permissions: Permission[]) => {
  return usePermissionStore(state => state.hasAllPermissions(permissions));
};

export const useCanAccessResource = (
  resourceType: ResourceType,
  action: ActionType,
  resourceOwnerId?: string
) => {
  const userId = usePermissionStore(state => state.userPermissions?.userId);
  return usePermissionStore(state =>
    state.canAccessResource(resourceType, action, resourceOwnerId, userId)
  );
};

export const useHasRoleLevel = (minLevel: number) => {
  return usePermissionStore(state => state.hasRoleLevel(minLevel));
};

export const useEffectivePermissions = () => {
  return usePermissionStore(state => state.getEffectivePermissions());
};

/**
 * 导出权限常量
 */
export {
  ResourceType,
  ActionType,
  Permission,
  SYSTEM_ROLES,
  PermissionDefinition,
  RoleDefinition,
  PermissionCheckResult,
  PermissionContext,
} from '@/lib/permissions';

/**
 * 导出常用权限常量
 */
export const Permissions = {
  // 用户权限
  USER_READ: 'user:read' as Permission,
  USER_CREATE: 'user:create' as Permission,
  USER_UPDATE: 'user:update' as Permission,
  USER_DELETE: 'user:delete' as Permission,
  USER_LIST: 'user:list' as Permission,

  // 团队权限
  TEAM_CREATE: 'team:create' as Permission,
  TEAM_UPDATE: 'team:update' as Permission,
  TEAM_DELETE: 'team:delete' as Permission,
  TEAM_MANAGE: 'team:manage' as Permission,

  // 项目权限
  PROJECT_CREATE: 'project:create' as Permission,
  PROJECT_UPDATE: 'project:update' as Permission,
  PROJECT_DELETE: 'project:delete' as Permission,

  // 数据权限
  DATA_EXPORT: 'data:export' as Permission,
  DATA_IMPORT: 'data:import' as Permission,

  // 系统权限
  SYSTEM_CONFIG: 'system:config' as Permission,
  SYSTEM_LOG: 'system:log' as Permission,

  // MCP 权限
  MCP_EXECUTE: 'mcp:execute' as Permission,
};
