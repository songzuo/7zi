'use client'

/**
 * PermissionContext - Compatibility layer using Zustand store
 *
 * This file provides backward-compatible hooks and components that internally
 * use the Zustand permission store for better performance.
 *
 * @module contexts/PermissionContext
 */

import { useEffect, ReactNode, useMemo } from 'react'
import type { Permission, Role } from '@/lib/permissions/types'
import {
  usePermissionStore,
  usePermissionLoading,
  usePermissionError,
  usePermissionActions,
} from '@/stores/permissionStore'

/**
 * Permission Provider
 *
 * Since Zustand doesn't require a provider, this is a compatibility wrapper
 * that fetches permissions on mount and initializes the store.
 */
interface PermissionProviderProps {
  children: ReactNode
  skipFetch?: boolean // Optional: skip fetching on mount (for testing)
}

export function PermissionProvider({ children, skipFetch = false }: PermissionProviderProps) {
  const { setLoading, setError, initializeFromAuthData, reset } = usePermissionActions()
  const loading = usePermissionLoading()
  const error = usePermissionError()

  useEffect(() => {
    if (skipFetch) {
      return
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          // No token, reset permissions
          reset()
          return
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch permissions')
        }

        const data = await response.json()

        if (data.success && data.user) {
          initializeFromAuthData(data)
        } else {
          reset()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions')
        reset()
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [skipFetch, setLoading, setError, initializeFromAuthData, reset])

  // Store works without provider, so just render children
  return <>{children}</>
}

/**
 * usePermissions hook
 *
 * Provides the same API as the old Context-based hook but uses Zustand internally.
 * Uses stable references to prevent infinite re-renders.
 */
export function usePermissions() {
  const loading = usePermissionLoading()
  const error = usePermissionError()
  const actions = usePermissionActions()

  // Get all state in one selector to minimize re-renders
  const state = usePermissionStore(state => ({
    userId: state.userId,
    roles: state.roles,
    permissions: state.permissions,
    customPermissions: state.customPermissions,
  }))

  // Build context object for backward compatibility
  const context = useMemo(() => {
    if (!state.userId) return null
    return {
      userId: state.userId,
      roles: state.roles,
      permissions: state.permissions,
      customPermissions: state.customPermissions || undefined,
    }
  }, [state.userId, state.roles, state.permissions, state.customPermissions])

  // Memoize permission/role check functions
  const hasPermission = useMemo(
    () => (permission: Permission) => {
      return (
        state.permissions.includes(permission) ||
        (state.customPermissions?.includes(permission) ?? false)
      )
    },
    [state.permissions, state.customPermissions]
  )

  const hasAnyPermission = useMemo(
    () => (permissions: Permission[]) => permissions.some(p => hasPermission(p)),
    [hasPermission]
  )

  const hasAllPermissions = useMemo(
    () => (permissions: Permission[]) => permissions.every(p => hasPermission(p)),
    [hasPermission]
  )

  const hasRole = useMemo(
    () => (role: Role) => state.roles.includes(role),
    [state.roles]
  )

  const hasAnyRole = useMemo(
    () => (roles: Role[]) => roles.some(r => state.roles.includes(r)),
    [state.roles]
  )

  const hasAllRoles = useMemo(
    () => (roles: Role[]) => roles.every(r => state.roles.includes(r)),
    [state.roles]
  )

  const isAdmin = useMemo(() => state.roles.includes('admin' as Role), [state.roles])

  const isManagerOrAdmin = useMemo(
    () => state.roles.includes('admin' as Role) || state.roles.includes('manager' as Role),
    [state.roles]
  )

  const isMemberOrHigher = useMemo(
    () =>
      state.roles.includes('admin' as Role) ||
      state.roles.includes('manager' as Role) ||
      state.roles.includes('member' as Role),
    [state.roles]
  )

  const refresh = useMemo(
    () => () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        actions.reset()
        return Promise.resolve()
      }

      return fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            actions.initializeFromAuthData(data)
          } else {
            actions.reset()
          }
        })
        .catch(err => {
          actions.setError(err instanceof Error ? err.message : 'Failed to load permissions')
          actions.reset()
        })
    },
    [actions]
  )

  return {
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
    refresh,
  }
}

/**
 * HOC for components that require a specific permission
 */
export function withPermission(permission: Permission) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function PermissionGuard(props: P) {
      const { hasPermission, loading } = usePermissions()

      if (loading) {
        return <div>Loading...</div>
      }

      if (!hasPermission(permission)) {
        return <div>Access denied</div>
      }

      return <Component {...props} />
    }
  }
}

/**
 * HOC for components that require a specific role
 */
export function withRole(role: Role) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function RoleGuard(props: P) {
      const { hasRole, loading } = usePermissions()

      if (loading) {
        return <div>Loading...</div>
      }

      if (!hasRole(role)) {
        return <div>Access denied</div>
      }

      return <Component {...props} />
    }
  }
}

/**
 * Component to conditionally render children based on permission
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}) {
  const { hasPermission, loading } = usePermissions()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component to conditionally render children based on role
 */
export function RoleGate({
  role,
  fallback = null,
  children,
}: {
  role: Role
  fallback?: ReactNode
  children: ReactNode
}) {
  const { hasRole, loading } = usePermissions()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!hasRole(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component to conditionally render children based on any of multiple roles
 */
export function AnyRoleGate({
  roles,
  fallback = null,
  children,
}: {
  roles: Role[]
  fallback?: ReactNode
  children: ReactNode
}) {
  const { hasAnyRole, loading } = usePermissions()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!hasAnyRole(roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
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
} from '@/stores/permissionStore'
