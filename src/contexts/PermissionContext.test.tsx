import { act } from 'react';
import { render } from '@testing-library/react';

// ============================================================================
// Mock Setup (before imports)
// ============================================================================

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

/**
 * @fileoverview PermissionContext Tests
 * @description Tests for Permission Context Provider and Hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PermissionProvider,
  usePermissions,
  withPermission,
  withRole,
  PermissionGate,
  RoleGate,
  AnyRoleGate,
} from './PermissionContext';
import { Permission, Role } from '@/lib/permissions/types';
import { ReactNode } from 'react';

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
};

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
};

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
};

const mockUserWithLegacyPermissions = {
  id: 'user4',
  email: 'legacy@example.com',
  name: 'Legacy User',
  role: Role.MEMBER,
  roles: [Role.MEMBER],
  permissions: ['read:profile', 'read:tasks', 'write:tasks'], // Legacy format
  customPermissions: ['manage:team'], // Legacy custom permissions
};

// ============================================================================
// Test Utilities
// ============================================================================

const wrapper = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <PermissionProvider>{children}</PermissionProvider>;
};

const mockFetchSuccess = (user: any) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      user,
    }),
  });
};

const mockFetchFailure = () => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({
      success: false,
      error: 'Unauthorized',
    }),
  });
};

const mockFetchError = () => {
  (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
};

// ============================================================================
// Test Suites
// ============================================================================

describe('PermissionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('usePermissions', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => usePermissions());
      }).toThrow('usePermissions must be used within a PermissionProvider');
    });

    it('should load permissions on mount', async () => {
      mockFetchSuccess(mockUserWithAdmin);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.context).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      mockFetchFailure();

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.context).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetchError();

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.context).toBeNull();
      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Permission Checks', () => {
    it('should check if user has specific permission', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission(Permission.TASK_READ)).toBe(true);
      expect(result.current.hasPermission(Permission.USER_DELETE)).toBe(false);
    });

    it('should check if user has any of multiple permissions', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.hasAnyPermission([
          Permission.USER_DELETE,
          Permission.TASK_READ,
        ])
      ).toBe(true);

      expect(
        result.current.hasAnyPermission([
          Permission.USER_DELETE,
          Permission.SYSTEM_MANAGE,
        ])
      ).toBe(false);
    });

    it('should check if user has all permissions', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.hasAllPermissions([
          Permission.USER_READ,
          Permission.TASK_READ,
        ])
      ).toBe(true);

      expect(
        result.current.hasAllPermissions([
          Permission.TASK_READ,
          Permission.USER_DELETE,
        ])
      ).toBe(false);
    });
  });

  describe('Role Checks', () => {
    it('should check if user has specific role', async () => {
      mockFetchSuccess(mockUserWithManager);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasRole(Role.MANAGER)).toBe(true);
      expect(result.current.hasRole(Role.ADMIN)).toBe(false);
    });

    it('should check if user has any of multiple roles', async () => {
      mockFetchSuccess(mockUserWithAdmin);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.hasAnyRole([Role.MANAGER, Role.ADMIN])
      ).toBe(true);

      expect(
        result.current.hasAnyRole([Role.MEMBER, Role.GUEST])
      ).toBe(false);
    });

    it('should check if user has all roles', async () => {
      const userWithMultipleRoles = {
        ...mockUserWithAdmin,
        roles: [Role.ADMIN, Role.MANAGER],
      };
      mockFetchSuccess(userWithMultipleRoles);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.hasAllRoles([Role.ADMIN, Role.MANAGER])
      ).toBe(true);

      expect(
        result.current.hasAllRoles([Role.ADMIN, Role.MEMBER])
      ).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    it('should check if user is admin', async () => {
      mockFetchSuccess(mockUserWithAdmin);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin()).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin()).toBe(false);
    });

    it('should check if user is manager or admin', async () => {
      mockFetchSuccess(mockUserWithManager);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isManagerOrAdmin()).toBe(true);
    });

    it('should check if user is member or higher', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isMemberOrHigher()).toBe(true);
    });
  });

  describe('Legacy Permission Support', () => {
    it('should map legacy permissions to new format', async () => {
      mockFetchSuccess(mockUserWithLegacyPermissions);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.context?.permissions).toContain(
        Permission.USER_READ
      );
      expect(result.current.context?.permissions).toContain(
        Permission.TASK_READ
      );
      expect(result.current.context?.permissions).toContain(
        Permission.TASK_CREATE
      );
    });

    it('should map legacy custom permissions', async () => {
      mockFetchSuccess(mockUserWithLegacyPermissions);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.context?.customPermissions).toContain(
        Permission.TEAM_MANAGE
      );
    });
  });

  describe('Refresh', () => {
    it('should refresh permissions', async () => {
      mockFetchSuccess(mockUserWithMember);

      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock admin user for refresh
      mockFetchSuccess(mockUserWithAdmin);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasRole(Role.ADMIN)).toBe(true);
    });
  });
});

describe('withPermission HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('should render component when user has permission', async () => {
    mockFetchSuccess(mockUserWithAdmin);

    const TestComponent = () => <div>Protected Content</div>;
    const ProtectedComponent = withPermission(Permission.USER_DELETE)(TestComponent);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText } = render(
      <PermissionProvider>
        <ProtectedComponent />
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show access denied when user lacks permission', async () => {
    mockFetchSuccess(mockUserWithMember);

    const TestComponent = () => <div>Protected Content</div>;
    const ProtectedComponent = withPermission(Permission.USER_DELETE)(TestComponent);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText } = render(
      <PermissionProvider>
        <ProtectedComponent />
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('should show loading while fetching permissions', async () => {
    // Don't mock fetch immediately to simulate loading
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    (global.fetch as any).mockReturnValue(fetchPromise);

    const TestComponent = () => <div>Protected Content</div>;
    const ProtectedComponent = withPermission(Permission.USER_DELETE)(TestComponent);

    const { getByText } = render(
      <PermissionProvider>
        <ProtectedComponent />
      </PermissionProvider>
    );

    expect(getByText('Loading...')).toBeInTheDocument();

    // Resolve fetch
    resolveFetch({
      ok: true,
      json: async () => ({ success: true, user: mockUserWithAdmin }),
    });
  });
});

describe('PermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('should render children when user has permission', async () => {
    mockFetchSuccess(mockUserWithAdmin);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText } = render(
      <PermissionProvider>
        <PermissionGate permission={Permission.USER_DELETE}>
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should render fallback when user lacks permission', async () => {
    mockFetchSuccess(mockUserWithMember);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText, queryByText } = render(
      <PermissionProvider>
        <PermissionGate
          permission={Permission.USER_DELETE}
          fallback={<div>Access Denied</div>}
        >
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(queryByText('Protected Content')).not.toBeInTheDocument();
      expect(getByText('Access Denied')).toBeInTheDocument();
    });
  });

  it('should render nothing when no fallback provided', async () => {
    mockFetchSuccess(mockUserWithMember);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { queryByText } = render(
      <PermissionProvider>
        <PermissionGate permission={Permission.USER_DELETE}>
          <div>Protected Content</div>
        </PermissionGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});

describe('RoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('should render children when user has role', async () => {
    mockFetchSuccess(mockUserWithAdmin);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText } = render(
      <PermissionProvider>
        <RoleGate role={Role.ADMIN}>
          <div>Admin Only</div>
        </RoleGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(getByText('Admin Only')).toBeInTheDocument();
    });
  });

  it('should render fallback when user lacks role', async () => {
    mockFetchSuccess(mockUserWithMember);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText, queryByText } = render(
      <PermissionProvider>
        <RoleGate
          role={Role.ADMIN}
          fallback={<div>Not Admin</div>}
        >
          <div>Admin Only</div>
        </RoleGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(queryByText('Admin Only')).not.toBeInTheDocument();
      expect(getByText('Not Admin')).toBeInTheDocument();
    });
  });
});

describe('AnyRoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  it('should render children when user has any of the roles', async () => {
    mockFetchSuccess(mockUserWithManager);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText } = render(
      <PermissionProvider>
        <AnyRoleGate roles={[Role.ADMIN, Role.MANAGER]}>
          <div>Manager or Admin</div>
        </AnyRoleGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(getByText('Manager or Admin')).toBeInTheDocument();
    });
  });

  it('should render fallback when user has none of the roles', async () => {
    mockFetchSuccess(mockUserWithMember);

    const { result } = renderHook(() => usePermissions(), { wrapper });

    const { getByText, queryByText } = render(
      <PermissionProvider>
        <AnyRoleGate
          roles={[Role.ADMIN, Role.MANAGER]}
          fallback={<div>Not Allowed</div>}
        >
          <div>Manager or Admin</div>
        </AnyRoleGate>
      </PermissionProvider>
    );

    await waitFor(() => {
      expect(queryByText('Manager or Admin')).not.toBeInTheDocument();
      expect(getByText('Not Allowed')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Helper Imports
// ============================================================================
import { act } from 'react';
import { render } from '@testing-library/react';
