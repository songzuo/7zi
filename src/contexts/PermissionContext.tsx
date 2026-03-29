'use client';

/**
 * PermissionContext - Compatibility layer using Zustand store
 *
 * This file provides backward-compatible hooks and components that internally
 * use the Zustand permission store for better performance.
 *
 * @module contexts/PermissionContext
 */

import { useEffect, ReactNode } from 'react';
import type { Permission, Role } from '@/lib/permissions/types';
import {
  usePermissionStore,
  usePermissionLoading,
  usePermissionError,
  usePermissionHelpers,
  usePermissionActions,
} from '@/stores/permissionStore';

/**
 * Permission Provider
 *
 * Since Zustand doesn't require a provider, this is a compatibility wrapper
 * that fetches permissions on mount and initializes the store.
 */
interface PermissionProviderProps {
  children: ReactNode;
  skipFetch?: boolean; // Optional: skip fetching on mount (for testing)
}

export function PermissionProvider({ children, skipFetch = false }: PermissionProviderProps) {
  const { setLoading, setError, initializeFromAuthData, reset } = usePermissionActions();
  const loading = usePermissionLoading();
  const error = usePermissionError();

  useEffect(() => {
    if (skipFetch) {
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          // No token, reset permissions
          reset();
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();

        if (data.success && data.user) {
          initializeFromAuthData(data);
        } else {
          reset();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        reset();
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [skipFetch, setLoading, setError, initializeFromAuthData, reset]);

  // Store works without provider, so just render children
  return <>{children}</>;
}

/**
 * usePermissions hook
 *
 * Provides the same API as the old Context-based hook but uses Zustand internally.
 */
export function usePermissions() {
  const loading = usePermissionLoading();
  const error = usePermissionError();
  const helpers = usePermissionHelpers();
  const actions = usePermissionActions();

  // Build context object for backward compatibility
  const context = usePermissionStore((state) => {
    if (!state.userId) return null;
    return {
      userId: state.userId,
      roles: state.roles,
      permissions: state.permissions,
      customPermissions: state.customPermissions || undefined,
    };
  });

  return {
    context,
    loading,
    error,
    hasPermission: helpers.hasPermission,
    hasAnyPermission: helpers.hasAnyPermission,
    hasAllPermissions: helpers.hasAllPermissions,
    hasRole: helpers.hasRole,
    hasAnyRole: helpers.hasAnyRole,
    hasAllRoles: helpers.hasAllRoles,
    isAdmin: helpers.isAdmin,
    isManagerOrAdmin: helpers.isManagerOrAdmin,
    isMemberOrHigher: helpers.isMemberOrHigher,
    refresh: () => {
      // Trigger a refresh by fetching again
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        actions.reset();
        return Promise.resolve();
      }

      return fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            actions.initializeFromAuthData(data);
          } else {
            actions.reset();
          }
        })
        .catch((err) => {
          actions.setError(err instanceof Error ? err.message : 'Failed to load permissions');
          actions.reset();
        });
    },
  };
}

/**
 * HOC for components that require a specific permission
 */
export function withPermission(permission: Permission) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function PermissionGuard(props: P) {
      const { hasPermission, loading } = usePermissions();

      if (loading) {
        return <div>Loading...</div>;
      }

      if (!hasPermission(permission)) {
        return <div>Access denied</div>;
      }

      return <Component {...props} />;
    };
  };
}

/**
 * HOC for components that require a specific role
 */
export function withRole(role: Role) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function RoleGuard(props: P) {
      const { hasRole, loading } = usePermissions();

      if (loading) {
        return <div>Loading...</div>;
      }

      if (!hasRole(role)) {
        return <div>Access denied</div>;
      }

      return <Component {...props} />;
    };
  };
}

/**
 * Component to conditionally render children based on permission
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component to conditionally render children based on role
 */
export function RoleGate({
  role,
  fallback = null,
  children,
}: {
  role: Role;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasRole, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component to conditionally render children based on any of multiple roles
 */
export function AnyRoleGate({
  roles,
  fallback = null,
  children,
}: {
  roles: Role[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasAnyRole, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Re-export selectors for direct Zustand usage (for better performance)
 */
export {
  usePermissionStore,
  usePermissions as useZustandPermissions,
  useRoles,
  useUserId,
  usePermissionLoading,
  usePermissionError,
  usePermissionInitialized,
  useIsAdmin,
  useIsManagerOrAdmin,
  useIsMemberOrHigher,
  useIsGuest,
  usePermissionActions,
  usePermissionHelpers,
} from '@/stores/permissionStore';
