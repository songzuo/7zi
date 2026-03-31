/**
 * 权限状态管理 Store (Permission Store) - v2
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 * 更新日期: 2026-03-30 (v1.5.0 PermissionContext 迁移)
 *
 * 功能:
 * - 用户权限状态管理
 * - 角色权限映射
 * - 权限检查和验证
 * - 权限持久化
 * - PermissionContext API 完全兼容层
 *
 * 基于 src/lib/permissions.ts 中的 RBAC 系统
 * 兼容 src/contexts/PermissionContext 的 API
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
  UserWithRoles,
  createUserWithRoles,
} from '@/lib/permissions';
import { User as AuthStoreUser } from './auth-store';
import { User } from '@/lib/auth';

/**
 * ==================== PermissionContext 兼容类型 ====================
 */

/**
 * 简化角色枚举 (兼容 PermissionContext)
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * 简化权限枚举 (兼容 PermissionContext)
 */
export enum ContextPermission {
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
 * 简化用户信息 (兼容 PermissionContext)
 */
export interface SimpleUser {
  id: string;
  username: string;
  email?: string;
  role: Role;
  permissions: ContextPermission[];
}

/**
 * 权限检查选项 (兼容 PermissionContext)
 */
export interface CheckPermissionOptions {
  resourceOwnerId?: string;
  requireAll?: boolean;
}

/**
 * ==================== 核心类型定义 ====================
 */

/**
 * 用户角色信息
 */
export interface UserPermissionState {
  userId: string;
  roleIds: string[];
  roles: RoleDefinition[];
  permissions: Permission[]; // 直接权限（不通过角色获得的）
  simpleUser: SimpleUser | null; // 简化用户对象 (兼容 PermissionContext)
}

/**
 * 权限状态接口
 */
export interface PermissionState {
  // ==================== 核心状态 ====================
  userPermissions: UserPermissionState | null;
  isLoading: boolean;
  error: string | null;

  // ==================== PermissionContext 兼容 API ====================
  /**
   * 简化用户对象 (兼容 PermissionContext)
   */
  user: SimpleUser | null;

  /**
   * 设置当前用户 (兼容 PermissionContext)
   */
  setUser: (user: SimpleUser | null) => void;

  /**
   * 清除当前用户 (兼容 PermissionContext)
   */
  clearUser: () => void;

  /**
   * 检查单个权限 (兼容 PermissionContext)
   */
  checkSimplePermission: (permission: ContextPermission) => boolean;

  /**
   * 检查多个权限 (兼容 PermissionContext)
   */
  checkSimplePermissions: (permissions: ContextPermission[], options?: CheckPermissionOptions) => boolean;

  /**
   * 检查角色 (兼容 PermissionContext)
   */
  checkRole: (role: Role) => boolean;

  /**
   * 检查是否是管理员 (兼容 PermissionContext)
   */
  checkIsAdmin: () => boolean;

  /**
   * 检查是否可以访问资源 (兼容 PermissionContext)
   */
  checkResourceAccess: (
    resourceOwnerId: string,
    requiredPermission: ContextPermission
  ) => boolean;

  // ==================== RBAC 原有 API ====================
  /**
   * 初始化用户权限
   */
  initializePermissions: (user: AuthStoreUser, roleIds: string[]) => void;
  clearPermissions: () => void;

  /**
   * RBAC 权限检查 - 检查是否有指定权限
   */
  hasPermission: (permission: Permission) => boolean;

  /**
   * RBAC 权限检查 - 检查是否有任一权限
   */
  hasAnyPermission: (permissions: Permission[]) => boolean;

  /**
   * RBAC 权限检查 - 检查是否有所有权限
   */
  hasAllPermissions: (permissions: Permission[]) => boolean;

  /**
   * RBAC 权限检查 - 检查资源访问权限
   */
  checkAccess: (
    resourceType: ResourceType,
    action: ActionType,
    context?: any
  ) => PermissionCheckResult;

  /**
   * RBAC 权限检查 - 检查是否可以访问资源
   */
  canAccessResource: (
    resourceType: ResourceType,
    action: ActionType,
    resourceOwnerId?: string,
    userId?: string
  ) => boolean;

  /**
   * 角色等级检查
   */
  hasRoleLevel: (minLevel: number) => boolean;
  getUserMaxLevel: () => number;

  /**
   * 权限管理方法（管理员用）
   */
  grantPermission: (permission: Permission) => boolean;
  revokePermission: (permission: Permission) => boolean;
  getEffectivePermissions: () => Permission[];

  /**
   * 错误处理
   */
  setError: (error: string | null) => void;
  clearError: () => void;

  /**
   * 重置状态
   */
  reset: () => void;
}

/**
 * ==================== 工具函数 ====================
 */

/**
 * 角色权限映射 (PermissionContext 风格)
 */
const ROLE_PERMISSIONS: Record<Role, ContextPermission[]> = {
  [Role.ADMIN]: [
    ContextPermission.READ,
    ContextPermission.WRITE,
    ContextPermission.DELETE,
    ContextPermission.USER_MANAGE,
    ContextPermission.ROOM_MANAGE,
    ContextPermission.DATA_IMPORT,
    ContextPermission.DATA_EXPORT,
    ContextPermission.ADMIN,
    ContextPermission.SETTINGS,
    ContextPermission.AUDIT,
  ],
  [Role.USER]: [
    ContextPermission.READ,
    ContextPermission.WRITE,
    ContextPermission.DELETE,
  ],
  [Role.GUEST]: [
    ContextPermission.READ,
  ],
};

/**
 * 获取角色的默认权限
 */
function getDefaultPermissions(role: Role): ContextPermission[] {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
}

/**
 * 创建简化用户对象
 */
function createSimpleUser(
  id: string,
  username: string,
  role: Role,
  options?: {
    email?: string;
    permissions?: ContextPermission[];
  }
): SimpleUser {
  const defaultPermissions = getDefaultPermissions(role);
  const userPermissions = options?.permissions ?? defaultPermissions;

  return {
    id,
    username,
    email: options?.email,
    role,
    permissions: userPermissions,
  };
}

/**
 * ==================== Store 实现 ====================
 */

/**
 * 初始状态
 */
const initialState = {
  userPermissions: null,
  isLoading: false,
  error: null,
  user: null,
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

      // ==================== PermissionContext 兼容 API ====================

      /**
       * 设置当前用户 (兼容 PermissionContext)
       */
      setUser: (user: SimpleUser | null) => {
        if (!user) {
          set({
            user: null,
            userPermissions: null,
          });
          return;
        }

        // 将简化用户转换为完整的用户权限状态
        set({
          user,
          userPermissions: {
            userId: user.id,
            roleIds: [user.role],
            roles: [], // 简化版不包含完整角色定义
            permissions: user.permissions as any as Permission[],
            simpleUser: user,
          },
        });
      },

      /**
       * 清除当前用户 (兼容 PermissionContext)
       */
      clearUser: () => {
        set({
          user: null,
          userPermissions: null,
        });
      },

      /**
       * 检查单个权限 (兼容 PermissionContext)
       */
      checkSimplePermission: (permission: ContextPermission) => {
        const { user } = get();
        if (!user) return false;

        // 管理员拥有所有权限
        if (user.role === Role.ADMIN) {
          return true;
        }

        // 检查用户权限列表
        return user.permissions.includes(permission);
      },

      /**
       * 检查多个权限 (兼容 PermissionContext)
       */
      checkSimplePermissions: (permissions: ContextPermission[], options?: CheckPermissionOptions) => {
        const { user } = get();
        if (!user) return false;

        // 管理员拥有所有权限
        if (user.role === Role.ADMIN) {
          return true;
        }

        // 如果有资源所有者检查
        if (options?.resourceOwnerId) {
          // 用户是资源所有者，允许访问
          if (user.id === options.resourceOwnerId) {
            return true;
          }
        }

        // 空权限列表
        if (permissions.length === 0) {
          return true;
        }

        // 检查权限
        if (options?.requireAll) {
          return permissions.every(permission => user.permissions.includes(permission));
        }

        return permissions.some(permission => user.permissions.includes(permission));
      },

      /**
       * 检查角色 (兼容 PermissionContext)
       */
      checkRole: (role: Role) => {
        const { user } = get();
        if (!user) return false;
        return user.role === role;
      },

      /**
       * 检查是否是管理员 (兼容 PermissionContext)
       */
      checkIsAdmin: () => {
        return get().checkRole(Role.ADMIN);
      },

      /**
       * 检查是否可以访问资源 (兼容 PermissionContext)
       */
      checkResourceAccess: (
        resourceOwnerId: string,
        requiredPermission: ContextPermission
      ) => {
        const { user } = get();
        if (!user) return false;

        // 管理员可以访问所有资源
        if (user.role === Role.ADMIN) {
          return true;
        }

        // 资源所有者可以访问自己的资源
        if (user.id === resourceOwnerId) {
          return true;
        }

        // 检查是否有必需的权限
        return user.permissions.includes(requiredPermission);
      },

      // ==================== RBAC 原有 API ====================

      /**
       * 初始化用户权限
       */
      initializePermissions: (user: AuthStoreUser, roleIds: string[]) => {
        set({ isLoading: true, error: null });

        try {
          // 转换 User 类型以符合权限系统的要求
          const permissionUser: User = {
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role as any,
            permissions: [],
            createdAt: new Date(user.createdAt || new Date()),
            updatedAt: new Date(user.updatedAt || new Date()),
          };

          const userWithRoles = createUserWithRoles(permissionUser, roleIds);

          // 获取角色权限
          const permissions = roleIds.flatMap(id =>
            permissionManager.getPermissionsByRole(id)
          );

          // 创建简化用户对象
          const simpleUser = createSimpleUser(
            user.id,
            user.name,
            user.role as Role,
            {
              email: user.email,
              permissions: permissions as any as ContextPermission[],
            }
          );

          set({
            userPermissions: {
              userId: user.id,
              roleIds,
              roles: userWithRoles.roles,
              permissions,
              simpleUser,
            },
            user: simpleUser,
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
        context?: any
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
        user: state.user,
      }),
    }
  )
);

/**
 * ==================== 选择器 ====================
 */

export const selectUserPermissions = (state: PermissionState) => state.userPermissions;
export const selectIsLoading = (state: PermissionState) => state.isLoading;
export const selectError = (state: PermissionState) => state.error;

/**
 * ==================== PermissionContext 兼容 Hooks ====================
 */

/**
 * usePermission Hook - 完全兼容 PermissionContext
 */
export function usePermission() {
  const {
    user,
    checkSimplePermission,
    checkSimplePermissions,
    checkRole,
    checkIsAdmin,
    checkResourceAccess,
    setUser,
    clearUser,
  } = usePermissionStore();

  return {
    user,
    hasPermission: checkSimplePermission,
    hasPermissions: checkSimplePermissions,
    hasRole: checkRole,
    isAdmin: checkIsAdmin,
    canAccessResource: checkResourceAccess,
    setUser,
    clearUser,
  };
}

/**
 * ==================== RBAC Hooks ====================
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
 * ==================== 导出权限常量 ====================
 */

export { SYSTEM_ROLES } from '@/lib/permissions';
export type {
  ResourceType,
  ActionType,
  Permission,
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

/**
 * ==================== 工具函数导出 ====================
 */

/**
 * 从 payload 创建用户 (兼容 PermissionContext)
 */
export function createUserFromPayload(
  payload: { userId: string; username: string; role: string }
): SimpleUser {
  const role = payload.role as Role;
  const permissions = getDefaultPermissions(role);

  return {
    id: payload.userId,
    username: payload.username,
    role,
    permissions,
  };
}

/**
 * 检查权限 (兼容 PermissionContext - 服务端使用)
 */
export function checkPermission(user: SimpleUser | null, permission: ContextPermission): boolean {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return user.permissions.includes(permission);
}

/**
 * 检查多个权限 (兼容 PermissionContext - 服务端使用)
 */
export function checkPermissions(
  user: SimpleUser | null,
  permissions: ContextPermission[],
  options?: CheckPermissionOptions
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: '用户未登录' };
  if (user.role === Role.ADMIN) return { allowed: true };

  if (options?.resourceOwnerId) {
    if (user.id === options.resourceOwnerId) {
      return { allowed: true };
    }
  }

  if (permissions.length === 0) return { allowed: true };

  if (options?.requireAll) {
    const hasAll = permissions.every(p => user.permissions.includes(p));
    return hasAll ? { allowed: true } : { allowed: false, reason: '权限不足' };
  }

  const hasAny = permissions.some(p => user.permissions.includes(p));
  return hasAny ? { allowed: true } : { allowed: false, reason: '权限不足' };
}

/**
 * 检查角色 (兼容 PermissionContext - 服务端使用)
 */
export function checkRole(user: SimpleUser | null, role: Role): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * 检查是否是管理员 (兼容 PermissionContext - 服务端使用)
 */
export function checkIsAdmin(user: SimpleUser | null): boolean {
  return checkRole(user, Role.ADMIN);
}

/**
 * 检查资源访问权限 (兼容 PermissionContext - 服务端使用)
 */
export function checkResourceAccess(
  user: SimpleUser | null,
  resourceOwnerId: string,
  requiredPermission: ContextPermission
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: '用户未登录' };
  if (user.role === Role.ADMIN) return { allowed: true };
  if (user.id === resourceOwnerId) return { allowed: true };
  return user.permissions.includes(requiredPermission)
    ? { allowed: true }
    : { allowed: false, reason: '权限不足' };
}

/**
 * ==================== Provider 组件 (兼容 React Context) ====================
 */

import { ReactNode, useEffect } from 'react';

export interface PermissionProviderProps {
  children: ReactNode;
  initialUser?: SimpleUser | null;
}

/**
 * PermissionProvider - 兼容 React Context 的 Provider 组件
 *
 * 使用 Zustand store 但提供 Context 风格的 API
 */
export function PermissionProvider({ children, initialUser }: PermissionProviderProps) {
  const { setUser } = usePermissionStore();

  // 初始化用户
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  return <>{children}</>;
}
