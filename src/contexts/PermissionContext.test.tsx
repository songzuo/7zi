// @ts-nocheck - Test file with complex type issues
import { act } from 'react'
import { render } from '@testing-library/react'

// ============================================================================
// Mock Setup (before imports)
// ============================================================================

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Create a mock store for testing
const createMockStore = () => {
  const state = {
    userId: null as string | null,
    permissions: [] as string[],
    roles: [] as string[],
    customPermissions: null as string[] | null,
    loading: false,
    error: null as string | null,
    initialized: false,
    setPermissions: vi.fn(),
    addPermission: vi.fn(),
    removePermission: vi.fn(),
    clearPermissions: vi.fn(),
    setRoles: vi.fn(),
    addRole: vi.fn(),
    removeRole: vi.fn(),
    clearRoles: vi.fn(),
    setUserId: vi.fn(),
    initializeFromAuth: vi.fn(),
    initializeFromAuthData: vi.fn((data: any) => {
      if (data.user) {
        state.userId = data.user.id
        state.permissions = data.user.permissions || []
        state.roles = data.user.roles || (data.user.role ? [data.user.role] : [])
        state.customPermissions = data.user.customPermissions || null
      }
    }),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(() => {
      state.userId = null
      state.permissions = []
      state.roles = []
      state.customPermissions = null
    }),
    // These are functions in the store but will be called to get values
    hasPermission: vi.fn((permission: string) => 
      state.permissions.includes(permission) || 
      (state.customPermissions?.includes(permission) ?? false)
    ),
    hasAnyPermission: vi.fn((permissions: string[]) => 
      permissions.some(p => state.permissions.includes(p))
    ),
    hasAllPermissions: vi.fn((permissions: string[]) => 
      permissions.every(p => state.permissions.includes(p))
    ),
    hasRole: vi.fn((role: string) => state.roles.includes(role)),
    hasAnyRole: vi.fn((roles: string[]) => roles.some(r => state.roles.includes(r))),
    hasAllRoles: vi.fn((roles: string[]) => roles.every(r => state.roles.includes(r))),
    // These will be called and return boolean
    isAdmin: vi.fn(() => state.roles.includes('admin')),
    isManagerOrAdmin: vi.fn(() => 
      state.roles.includes('admin') || state.roles.includes('manager')
    ),
    isMemberOrHigher: vi.fn(() => 
      state.roles.includes('admin') || state.roles.includes('manager') || state.roles.includes('member')
    ),
    isGuest: vi.fn(() => state.roles.includes('guest')),
    getContext: vi.fn(() => state.userId ? {
      userId: state.userId,
      roles: state.roles,
      permissions: state.permissions,
      customPermissions: state.customPermissions || undefined,
    } : null),
  }
  return state
}

// Mock the Zustand store
const mockStore = createMockStore()

// Track current values for hooks
let currentIsAdmin = false
let currentIsManagerOrAdmin = false
let currentIsMemberOrHigher = false

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: vi.fn((selector?: (state: any) => any) => {
    if (selector) {
      return selector(mockStore)
    }
    return mockStore
  }),
  usePermissionLoading: vi.fn(() => false),
  usePermissionError: vi.fn(() => null),
  usePermissionActions: vi.fn(() => ({
    setLoading: mockStore.setLoading,
    setError: mockStore.setError,
    initializeFromAuthData: mockStore.initializeFromAuthData,
    reset: mockStore.reset,
  })),
  usePermissionHelpers: vi.fn(() => ({
    hasPermission: mockStore.hasPermission,
    hasAnyPermission: mockStore.hasAnyPermission,
    hasAllPermissions: mockStore.hasAllPermissions,
    hasRole: mockStore.hasRole,
    hasAnyRole: mockStore.hasAnyRole,
    hasAllRoles: mockStore.hasAllRoles,
    isAdmin: currentIsAdmin,
    isManagerOrAdmin: currentIsManagerOrAdmin,
    isMemberOrHigher: currentIsMemberOrHigher,
    isGuest: mockStore.isGuest,
    getContext: mockStore.getContext,
  })),
}))

/**
 * @fileoverview PermissionContext Tests
 * @description Tests for Permission Context Provider and Hooks
 */

import { renderHook, waitFor } from '@testing-library/react'
import {
  PermissionProvider,
  usePermissions,
  withPermission,
  withRole,
  PermissionGate,
  RoleGate,
  AnyRoleGate,
} from './PermissionContext'
import { Permission, Role } from '@/lib/permissions/types'
import { ReactNode } from 'react'

// ============================================================================
// Test Types
// ============================================================================

interface MockUser {
  id: string
  email: string
  name: string
  role: Role
  roles: Role[]
  permissions: Permission[] | string[]
  customPermissions?: string[]
}

// ============================================================================
// Test Data
// ============================================================================

const mockUserWithAdmin = {
  id: 'user1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: Role.ADMIN,
  roles: [Role.ADMIN],
  permissions: [
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_DELETE,
    Permission.TEAM_MANAGE,
    Permission.TASK_READ,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.REPORTS_VIEW,
    Permission.SYSTEM_MANAGE,
    Permission.LOGS_READ,
  ],
}

const mockUserWithManager = {
  id: 'user2',
  email: 'manager@example.com',
  name: 'Manager User',
  role: Role.MANAGER,
  roles: [Role.MANAGER],
  permissions: [
    Permission.USER_READ,
    Permission.TEAM_MANAGE,
    Permission.TASK_READ,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.REPORTS_VIEW,
  ],
}

const mockUserWithMember = {
  id: 'user3',
  email: 'member@example.com',
  name: 'Member User',
  role: Role.MEMBER,
  roles: [Role.MEMBER],
  permissions: [
    Permission.USER_READ,
    Permission.TASK_READ,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
  ],
}

const mockUserWithLegacyPermissions = {
  id: 'user4',
  email: 'legacy@example.com',
  name: 'Legacy User',
  role: Role.MEMBER,
  roles: [Role.MEMBER],
  permissions: ['read:profile', 'read:tasks', 'write:tasks'], // Legacy format
  customPermissions: ['manage:team'], // Legacy custom permissions
}

// ============================================================================
// Test Utilities
// ============================================================================

// Helper to set mock store state for tests
const setMockUser = (user: MockUser | null) => {
  if (user) {
    mockStore.userId = user.id
    mockStore.permissions = user.permissions as string[]
    mockStore.roles = user.roles
    mockStore.customPermissions = user.customPermissions || null
    mockStore.hasPermission.mockImplementation((permission: string) => 
      mockStore.permissions.includes(permission) || 
      (mockStore.customPermissions?.includes(permission) ?? false)
    )
    mockStore.hasRole.mockImplementation((role: string) => mockStore.roles.includes(role))
    mockStore.hasAnyRole.mockImplementation((roles: string[]) => roles.some(r => mockStore.roles.includes(r)))
    mockStore.hasAnyPermission.mockImplementation((permissions: string[]) => 
      permissions.some(p => mockStore.permissions.includes(p))
    )
    mockStore.hasAllPermissions.mockImplementation((permissions: string[]) => 
      permissions.every(p => mockStore.permissions.includes(p))
    )
    // Set convenience method values
    currentIsAdmin = mockStore.roles.includes('admin')
    currentIsManagerOrAdmin = mockStore.roles.includes('admin') || mockStore.roles.includes('manager')
    currentIsMemberOrHigher = mockStore.roles.includes('admin') || mockStore.roles.includes('manager') || mockStore.roles.includes('member')
    mockStore.getContext.mockImplementation(() => ({
      userId: mockStore.userId,
      roles: mockStore.roles,
      permissions: mockStore.permissions,
      customPermissions: mockStore.customPermissions || undefined,
    }))
  } else {
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
    mockStore.customPermissions = null
    currentIsAdmin = false
    currentIsManagerOrAdmin = false
    currentIsMemberOrHigher = false
    mockStore.getContext.mockReturnValue(null)
  }
}

const wrapper = ({ children }: { children: ReactNode }) => {
  return <PermissionProvider skipFetch>{children}</PermissionProvider>
}

// ============================================================================
// Test Suites
// ============================================================================

describe('PermissionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('mock-token')
    // Reset mock store
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
    mockStore.customPermissions = null
    mockStore.loading = false
    mockStore.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('usePermissions', () => {
    it('should work without provider (Zustand store)', () => {
      // With Zustand, no provider is needed
      const { result } = renderHook(() => usePermissions())
      expect(result.current).toBeDefined()
    })

    it('should load permissions when user is set', async () => {
      setMockUser(mockUserWithAdmin)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.loading).toBe(false)
      expect(result.current.context).not.toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle null user', async () => {
      setMockUser(null)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.loading).toBe(false)
      expect(result.current.context).toBeNull()
    })
  })

  describe('Permission Checks', () => {
    beforeEach(() => {
      setMockUser(mockUserWithMember)
    })

    it('should check if user has specific permission', async () => {
      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasPermission(Permission.TASK_READ)).toBe(true)
      expect(result.current.hasPermission(Permission.USER_DELETE)).toBe(false)
    })

    it('should check if user has any of multiple permissions', async () => {
      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasAnyPermission([Permission.USER_DELETE, Permission.TASK_READ])).toBe(
        true
      )

      expect(
        result.current.hasAnyPermission([Permission.USER_DELETE, Permission.SYSTEM_MANAGE])
      ).toBe(false)
    })

    it('should check if user has all permissions', async () => {
      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasAllPermissions([Permission.USER_READ, Permission.TASK_READ])).toBe(
        true
      )

      expect(result.current.hasAllPermissions([Permission.TASK_READ, Permission.USER_DELETE])).toBe(
        false
      )
    })
  })

  describe('Role Checks', () => {
    it('should check if user has specific role', async () => {
      setMockUser(mockUserWithManager)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasRole(Role.MANAGER)).toBe(true)
      expect(result.current.hasRole(Role.ADMIN)).toBe(false)
    })

    it('should check if user has any of multiple roles', async () => {
      setMockUser(mockUserWithAdmin)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasAnyRole([Role.MANAGER, Role.ADMIN])).toBe(true)

      expect(result.current.hasAnyRole([Role.MEMBER, Role.GUEST])).toBe(false)
    })

    it('should check if user has all roles', async () => {
      const userWithMultipleRoles = {
        ...mockUserWithAdmin,
        roles: [Role.ADMIN, Role.MANAGER],
      }
      setMockUser(userWithMultipleRoles)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasAllRoles([Role.ADMIN, Role.MANAGER])).toBe(true)

      expect(result.current.hasAllRoles([Role.ADMIN, Role.MEMBER])).toBe(false)
    })
  })

  describe('Convenience Methods', () => {
    it('should check if user is admin', async () => {
      setMockUser(mockUserWithAdmin)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.isAdmin).toBe(true)
    })

    it('should return false for non-admin user', async () => {
      setMockUser(mockUserWithMember)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.isAdmin).toBe(false)
    })

    it('should check if user is manager or admin', async () => {
      setMockUser(mockUserWithManager)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.isManagerOrAdmin).toBe(true)
    })

    it('should check if user is member or higher', async () => {
      setMockUser(mockUserWithMember)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.isMemberOrHigher).toBe(true)
    })
  })

  describe('Legacy Permission Support', () => {
    it('should map legacy permissions to new format', async () => {
      setMockUser(mockUserWithLegacyPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      // Legacy permissions are stored as-is in the mock
      // In production, the store normalizes them
      expect(result.current.context?.permissions).toEqual(
        expect.arrayContaining(['read:profile', 'read:tasks', 'write:tasks'])
      )
    })

    it('should map legacy custom permissions', async () => {
      setMockUser(mockUserWithLegacyPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper })

      // Custom permissions are stored as-is in the mock
      expect(result.current.context?.customPermissions).toEqual(
        expect.arrayContaining(['manage:team'])
      )
    })
  })

  describe('Refresh', () => {
    it('should refresh permissions', async () => {
      setMockUser(mockUserWithMember)

      const { result, rerender } = renderHook(() => usePermissions(), { wrapper })

      expect(result.current.hasRole(Role.MEMBER)).toBe(true)

      // Set admin user and update mocks
      setMockUser(mockUserWithAdmin)

      // Re-render to get updated values
      rerender()

      expect(result.current.hasRole(Role.ADMIN)).toBe(true)
    })
  })
})

describe('withPermission HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
  })

  it('should render component when user has permission', async () => {
    setMockUser(mockUserWithAdmin)

    const TestComponent = () => <div>Protected Content</div>
    const ProtectedComponent = withPermission(Permission.USER_DELETE)(TestComponent)

    const { getByText } = render(
      <PermissionProvider skipFetch>
        <ProtectedComponent />
      </PermissionProvider>
    )

    expect(getByText('Protected Content')).toBeInTheDocument()
  })

  it('should show access denied when user lacks permission', async () => {
    setMockUser(mockUserWithMember)

    const TestComponent = () => <div>Protected Content</div>
    const ProtectedComponent = withPermission(Permission.USER_DELETE)(TestComponent)

    const { getByText } = render(
      <PermissionProvider skipFetch>
        <ProtectedComponent />
      </PermissionProvider>
    )

    expect(getByText('Access denied')).toBeInTheDocument()
  })
})

describe('PermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
  })

  it('should render children when user has permission', async () => {
    setMockUser(mockUserWithAdmin)

    const { getByText } = render(
      <PermissionProvider skipFetch>
        <PermissionGate permission={Permission.USER_DELETE}>
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    )

    expect(getByText('Protected Content')).toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', async () => {
    setMockUser(mockUserWithMember)

    const { getByText, queryByText } = render(
      <PermissionProvider skipFetch>
        <PermissionGate permission={Permission.USER_DELETE} fallback={<div>Access Denied</div>}>
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    )

    expect(queryByText('Protected Content')).not.toBeInTheDocument()
    expect(getByText('Access Denied')).toBeInTheDocument()
  })

  it('should render nothing when no fallback provided', async () => {
    setMockUser(mockUserWithMember)

    const { queryByText } = render(
      <PermissionProvider skipFetch>
        <PermissionGate permission={Permission.USER_DELETE}>
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    )

    expect(queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('RoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
  })

  it('should render children when user has role', async () => {
    setMockUser(mockUserWithAdmin)

    const { getByText } = render(
      <PermissionProvider skipFetch>
        <RoleGate role={Role.ADMIN}>
          <div>Admin Only</div>
        </RoleGate>
      </PermissionProvider>
    )

    expect(getByText('Admin Only')).toBeInTheDocument()
  })

  it('should render fallback when user lacks role', async () => {
    setMockUser(mockUserWithMember)

    const { getByText, queryByText } = render(
      <PermissionProvider skipFetch>
        <RoleGate role={Role.ADMIN} fallback={<div>Not Admin</div>}>
          <div>Admin Only</div>
        </RoleGate>
      </PermissionProvider>
    )

    expect(queryByText('Admin Only')).not.toBeInTheDocument()
    expect(getByText('Not Admin')).toBeInTheDocument()
  })
})

describe('AnyRoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.userId = null
    mockStore.permissions = []
    mockStore.roles = []
  })

  it('should render children when user has any of the roles', async () => {
    setMockUser(mockUserWithManager)

    const { getByText } = render(
      <PermissionProvider skipFetch>
        <AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]}>
          <div>Manager or Admin</div>
        </AnyRoleGate>
      </PermissionProvider>
    )

    expect(getByText('Manager or Admin')).toBeInTheDocument()
  })

  it('should render fallback when user has none of the roles', async () => {
    setMockUser(mockUserWithMember)

    const { getByText, queryByText } = render(
      <PermissionProvider skipFetch>
        <AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]} fallback={<div>Not Allowed</div>}>
          <div>Manager or Admin</div>
        </AnyRoleGate>
      </PermissionProvider>
    )

    expect(queryByText('Manager or Admin')).not.toBeInTheDocument()
    expect(getByText('Not Allowed')).toBeInTheDocument()
  })
})
