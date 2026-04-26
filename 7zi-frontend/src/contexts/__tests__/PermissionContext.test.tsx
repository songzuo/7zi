/**
 * PermissionContext Tests
 * 
 * Tests for permission context features:
 * - User authentication state
 * - Permission checking (single and multiple)
 * - Role checking
 * - Admin check
 * - Resource access control
 * - User management (set/clear)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { PermissionProvider, usePermission } from '@/contexts/PermissionContext'
import { Role, Permission } from '@/contexts/PermissionContext/types'

// Mock utils
vi.mock('@/contexts/PermissionContext/utils', () => ({
  checkPermission: vi.fn((user, permission) => ({
    allowed: user?.permissions.includes(permission) ?? false,
  })),
  checkPermissions: vi.fn((user, permissions, options) => {
    if (options?.requireAll) {
      return { allowed: permissions.every(p => user?.permissions.includes(p) ?? false) }
    }
    return { allowed: permissions.some(p => user?.permissions.includes(p) ?? false) }
  }),
  checkRole: vi.fn((user, role) => user?.role === role),
  checkIsAdmin: vi.fn((user) => user?.role === Role.ADMIN),
  checkResourceAccess: vi.fn((user, resourceOwnerId, requiredPermission) => ({
    allowed: (user?.id === resourceOwnerId) || (user?.permissions.includes(requiredPermission) ?? false),
  })),
  createUserFromPayload: vi.fn((payload) => payload),
}))

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: Role.USER,
  permissions: [Permission.READ, Permission.WRITE],
}

const mockAdmin = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.com',
  role: Role.ADMIN,
  permissions: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <PermissionProvider initialUser={null}>{children}</PermissionProvider>
)

describe('PermissionProvider', () => {
  describe('initial state', () => {
    it('should initialize with null user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.user).toBeNull()
    })

    it('should initialize with provided user', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('hasPermission', () => {
    it('should return false when no user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.hasPermission(Permission.READ)).toBe(false)
    })

    it('should return true when user has permission', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasPermission(Permission.READ)).toBe(true)
    })

    it('should return false when user lacks permission', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasPermission(Permission.DELETE)).toBe(false)
    })
  })

  describe('hasPermissions', () => {
    it('should return false when no user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.hasPermissions([Permission.READ, Permission.WRITE])).toBe(false)
    })

    it('should return true when user has all permissions (requireAll=true)', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasPermissions([Permission.READ, Permission.WRITE], { requireAll: true })).toBe(true)
    })

    it('should return false when user lacks any permission (requireAll=true)', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasPermissions([Permission.READ, Permission.DELETE], { requireAll: true })).toBe(false)
    })

    it('should return true when user has any permission (requireAll=false)', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasPermissions([Permission.READ, Permission.DELETE], { requireAll: false })).toBe(true)
    })
  })

  describe('hasRole', () => {
    it('should return false when no user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.hasRole(Role.USER)).toBe(false)
    })

    it('should return true when user has role', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasRole(Role.USER)).toBe(true)
    })

    it('should return false when user lacks role', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.hasRole(Role.ADMIN)).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return false when no user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.isAdmin()).toBe(false)
    })

    it('should return false for regular user', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.isAdmin()).toBe(false)
    })

    it('should return true for admin user', () => {
      const wrapperWithAdmin = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockAdmin}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithAdmin })

      expect(result.current.isAdmin()).toBe(true)
    })
  })

  describe('canAccessResource', () => {
    it('should return false when no user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      expect(result.current.canAccessResource('owner-1', Permission.WRITE)).toBe(false)
    })

    it('should return true when user is resource owner', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.canAccessResource('user-1', Permission.DELETE)).toBe(true)
    })

    it('should return true when user has required permission', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.canAccessResource('other-owner', Permission.READ)).toBe(true)
    })

    it('should return false when user is not owner and lacks permission', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      expect(result.current.canAccessResource('other-owner', Permission.DELETE)).toBe(false)
    })
  })

  describe('setUser', () => {
    it('should set user', () => {
      const { result } = renderHook(() => usePermission(), { wrapper })

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toEqual(mockUser)
    })

    it('should update existing user', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      act(() => {
        result.current.setUser(mockAdmin)
      })

      expect(result.current.user).toEqual(mockAdmin)
    })
  })

  describe('clearUser', () => {
    it('should clear user', () => {
      const wrapperWithUser = ({ children }: { children: ReactNode }) => (
        <PermissionProvider initialUser={mockUser}>{children}</PermissionProvider>
      )

      const { result } = renderHook(() => usePermission(), { wrapper: wrapperWithUser })

      act(() => {
        result.current.clearUser()
      })

      expect(result.current.user).toBeNull()
    })
  })
})

describe('usePermission hook', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => usePermission())
    }).toThrow('usePermission must be used within a PermissionProvider')

    consoleSpy.mockRestore()
  })
})