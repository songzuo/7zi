'use client';

/**
 * Permission Store - Zustand state management for RBAC permissions
 *
 * This store manages user permissions, roles, and authorization state.
 * It replaces the React Context-based PermissionContext for better performance.
 *
 * @module stores/permissionStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Permission, Role } from '@/lib/permissions/types';
import type { PermissionContext } from '@/lib/permissions/types';

/**
 * Legacy to new permission mapping (for backward compatibility)
 */
const LEGACY_TO_NEW_PERMISSIONS: Record<string, Permission> = {
  'read:profile': Permission.USER_READ,
  'write:users': Permission.USER_CREATE,
  'delete:users': Permission.USER_DELETE,
  'manage:team': Permission.TEAM_MANAGE,
  'read:tasks': Permission.TASK_READ,
  'write:tasks': Permission.TASK_CREATE,
  'update:tasks': Permission.TASK_UPDATE,
  'delete:tasks': Permission.TASK_DELETE,
  'access:reports': Permission.REPORTS_VIEW,
  'manage:system': Permission.SYSTEM_MANAGE,
  'access:logs': Permission.LOGS_READ,
};

/**
 * Normalize permissions to Permission enum format
 */
function normalizePermissions(permissions: string[]): Permission[] {
  const result: Permission[] = [];

  for (const perm of permissions) {
    // Try to map legacy string to new enum
    const mapped = LEGACY_TO_NEW_PERMISSIONS[perm];
    if (mapped) {
      result.push(mapped);
    } else {
      // Check if it's already a valid Permission enum value as string
      if (Object.values(Permission).includes(perm as Permission)) {
        result.push(perm as Permission);
      }
    }
  }

  return result;
}

/**
 * Permission Store State Interface
 */
export interface PermissionState {
  // Core state
  userId: string | null;
  permissions: Permission[];
  roles: Role[];
  customPermissions: Permission[] | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions - Permission management
  setPermissions: (permissions: Permission[]) => void;
  addPermission: (permission: Permission) => void;
  removePermission: (permission: Permission) => void;
  clearPermissions: () => void;

  // Actions - Role management
  setRoles: (roles: Role[]) => void;
  addRole: (role: Role) => void;
  removeRole: (role: Role) => void;
  clearRoles: () => void;

  // Actions - User management
  setUserId: (userId: string | null) => void;

  // Actions - Auth initialization
  initializeFromAuth: (auth: PermissionContext) => void;
  initializeFromAuthData: (data: {
    user: {
      id: string;
      permissions?: string[];
      roles?: (Role | { id: Role })[];
      role?: Role;
      customPermissions?: string[];
    };
  }) => void;

  // Actions - Loading and error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Actions - Reset
  reset: () => void;

  // Computed getters (helper functions)
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasAllRoles: (roles: Role[]) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
  isMemberOrHigher: () => boolean;
  isGuest: () => boolean;
  getContext: () => PermissionContext | null;
}

/**
 * Initial state
 */
const initialState = {
  userId: null,
  permissions: [],
  roles: [],
  customPermissions: null,
  loading: false,
  error: null,
  initialized: false,
};

/**
 * Permission Store
 *
 * Uses zustand with persist middleware for state persistence across sessions.
 */
export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Permission management
      setPermissions: (permissions) => set({ permissions }),
      addPermission: (permission) =>
        set((state) => ({
          permissions: [...new Set([...state.permissions, permission])],
        })),
      removePermission: (permission) =>
        set((state) => ({
          permissions: state.permissions.filter((p) => p !== permission),
        })),
      clearPermissions: () => set({ permissions: [] }),

      // Role management
      setRoles: (roles) => set({ roles }),
      addRole: (role) =>
        set((state) => ({
          roles: [...new Set([...state.roles, role])],
        })),
      removeRole: (role) =>
        set((state) => ({
          roles: state.roles.filter((r) => r !== role),
        })),
      clearRoles: () => set({ roles: [] }),

      // User management
      setUserId: (userId) => set({ userId }),

      // Auth initialization
      initializeFromAuth: (auth) =>
        set({
          userId: auth.userId,
          permissions: auth.permissions,
          roles: auth.roles,
          customPermissions: auth.customPermissions || null,
          initialized: true,
          loading: false,
          error: null,
        }),

      initializeFromAuthData: (data) => {
        const { user } = data;
        if (!user) {
          set({ error: 'User data is missing' });
          return;
        }

        // Normalize permissions
        const rawPermissions = user.permissions || [];
        const permissions = normalizePermissions(rawPermissions);

        // Normalize roles
        let roles: Role[] = [];
        if (user.roles && user.roles.length > 0) {
          roles = user.roles.map((r) => (typeof r === 'string' ? r : r.id));
        } else if (user.role) {
          roles = [user.role];
        } else {
          roles = [Role.GUEST]; // Default role
        }

        // Normalize custom permissions
        const customPermissions = user.customPermissions
          ? normalizePermissions(user.customPermissions)
          : null;

        set({
          userId: user.id,
          permissions,
          roles,
          customPermissions,
          initialized: true,
          loading: false,
          error: null,
        });
      },

      // Loading and error
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      clearError: () => set({ error: null }),

      // Reset
      reset: () =>
        set({
          ...initialState,
          customPermissions: null,
        }),

      // Computed getters
      hasPermission: (permission: Permission) => {
        const state = get();
        // Check regular permissions
        if (state.permissions.includes(permission)) {
          return true;
        }
        // Check custom permissions
        if (state.customPermissions?.includes(permission)) {
          return true;
        }
        return false;
      },

      hasAnyPermission: (permissions: Permission[]) => {
        const state = get();
        return permissions.some((p) => state.hasPermission(p));
      },

      hasAllPermissions: (permissions: Permission[]) => {
        const state = get();
        return permissions.every((p) => state.hasPermission(p));
      },

      hasRole: (role: Role) => {
        const state = get();
        return state.roles.includes(role);
      },

      hasAnyRole: (roles: Role[]) => {
        const state = get();
        return roles.some((r) => state.roles.includes(r));
      },

      hasAllRoles: (roles: Role[]) => {
        const state = get();
        return roles.every((r) => state.roles.includes(r));
      },

      isAdmin: () => {
        const state = get();
        return state.roles.includes(Role.ADMIN);
      },

      isManagerOrAdmin: () => {
        const state = get();
        return state.hasAnyRole([Role.ADMIN, Role.MANAGER]);
      },

      isMemberOrHigher: () => {
        const state = get();
        return state.hasAnyRole([Role.ADMIN, Role.MANAGER, Role.MEMBER]);
      },

      isGuest: () => {
        const state = get();
        return state.roles.includes(Role.GUEST);
      },

      getContext: () => {
        const state = get();
        if (!state.userId) {
          return null;
        }
        return {
          userId: state.userId,
          roles: state.roles,
          permissions: state.permissions,
          customPermissions: state.customPermissions || undefined,
        };
      },
    }),
    {
      name: 'permission-storage', // localStorage key
      partialize: (state) => ({
        userId: state.userId,
        permissions: state.permissions,
        roles: state.roles,
        customPermissions: state.customPermissions,
        initialized: state.initialized,
      }), // Only persist auth data, not loading/error states
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */

// Core state selectors
export const usePermissions = () => usePermissionStore((state) => state.permissions);
export const useRoles = () => usePermissionStore((state) => state.roles);
export const useUserId = () => usePermissionStore((state) => state.userId);
export const usePermissionLoading = () => usePermissionStore((state) => state.loading);
export const usePermissionError = () => usePermissionStore((state) => state.error);
export const usePermissionInitialized = () => usePermissionStore((state) => state.initialized);

// Computed selectors
export const useIsAdmin = () => usePermissionStore((state) => state.isAdmin());
export const useIsManagerOrAdmin = () => usePermissionStore((state) => state.isManagerOrAdmin());
export const useIsMemberOrHigher = () => usePermissionStore((state) => state.isMemberOrHigher());
export const useIsGuest = () => usePermissionStore((state) => state.isGuest());

// Action selectors
export const usePermissionActions = () =>
  usePermissionStore((state) => ({
    setPermissions: state.setPermissions,
    addPermission: state.addPermission,
    removePermission: state.removePermission,
    clearPermissions: state.clearPermissions,
    setRoles: state.setRoles,
    addRole: state.addRole,
    removeRole: state.removeRole,
    clearRoles: state.clearRoles,
    initializeFromAuth: state.initializeFromAuth,
    initializeFromAuthData: state.initializeFromAuthData,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    reset: state.reset,
  }));

// Helper function selectors
export const usePermissionHelpers = () =>
  usePermissionStore((state) => ({
    hasPermission: state.hasPermission,
    hasAnyPermission: state.hasAnyPermission,
    hasAllPermissions: state.hasAllPermissions,
    hasRole: state.hasRole,
    hasAnyRole: state.hasAnyRole,
    hasAllRoles: state.hasAllRoles,
    isAdmin: state.isAdmin,
    isManagerOrAdmin: state.isManagerOrAdmin,
    isMemberOrHigher: state.isMemberOrHigher,
    isGuest: state.isGuest,
    getContext: state.getContext,
  }));
