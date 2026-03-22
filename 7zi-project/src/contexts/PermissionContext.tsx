'use client';

/**
 * PermissionContext - React Context for RBAC permissions
 * Provides permission and role information to client-side components
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Permission, Role, PermissionContext as PermissionContextType } from '@/lib/permissions/types';

/**
 * Legacy to new permission mapping (simplified version for client-side)
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
 * Normalize permissions to Permission enum format (client-side version)
 */
function normalizePermissionsClient(permissions: string[]): Permission[] {
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

interface PermissionProviderState {
  context: PermissionContextType | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasAllRoles: (roles: Role[]) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
  isMemberOrHigher: () => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionProviderState | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [context, setContext] = useState<PermissionContextType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Build permission context from user data
        // Handle both legacy string permissions and new Permission enums
        const rawPermissions = data.user.permissions || [];

        const permissionContext: PermissionContextType = {
          userId: data.user.id,
          roles: data.user.roles?.map((r: Role | { id: Role }) => typeof r === 'string' ? r : r.id) || [data.user.role],
          permissions: normalizePermissionsClient(rawPermissions),
          customPermissions: data.user.customPermissions ? normalizePermissionsClient(data.user.customPermissions) : undefined,
        };

        setContext(permissionContext);
      } else {
        setContext(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (permission: Permission): boolean => {
    if (!context) return false;
    return context.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!context) return false;
    return permissions.some((p) => context.permissions.includes(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!context) return false;
    return permissions.every((p) => context.permissions.includes(p));
  };

  const hasRole = (role: Role): boolean => {
    if (!context) return false;
    return context.roles.includes(role);
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!context) return false;
    return roles.some((r) => context.roles.includes(r));
  };

  const hasAllRoles = (roles: Role[]): boolean => {
    if (!context) return false;
    return roles.every((r) => context.roles.includes(r));
  };

  const isAdmin = (): boolean => {
    return hasRole(Role.ADMIN);
  };

  const isManagerOrAdmin = (): boolean => {
    return hasAnyRole([Role.ADMIN, Role.MANAGER]);
  };

  const isMemberOrHigher = (): boolean => {
    return hasAnyRole([Role.ADMIN, Role.MANAGER, Role.MEMBER]);
  };

  const value: PermissionProviderState = {
    context,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isManagerOrAdmin,
    isMemberOrHigher,
    refresh: fetchPermissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionProviderState {
  const context = useContext(PermissionContext);

  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }

  return context;
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
export function PermissionGate({ permission, fallback = null, children }: { permission: Permission; fallback?: ReactNode; children: ReactNode }) {
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
export function RoleGate({ role, fallback = null, children }: { role: Role; fallback?: ReactNode; children: ReactNode }) {
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
export function AnyRoleGate({ roles, fallback = null, children }: { roles: Role[]; fallback?: ReactNode; children: ReactNode }) {
  const { hasAnyRole, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
