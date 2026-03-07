/**
 * usePermissions Hook 单元测试
 * Permission Management Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  usePermissions,
  usePermissionCheck,
  useRoles,
} from '@/hooks/usePermissions';
import { Permission, Role } from '@/lib/permissions/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock @/lib/permissions
vi.mock('@/lib/permissions', () => ({
  getRolePermissions: vi.fn((role) => {
    const rolePermissions = {
      [Role.ADMIN]: Object.values(Permission),
      [Role.MANAGER]: [
        Permission.TASK_CREATE,
        Permission.TASK_READ,
        Permission.TASK_UPDATE,
        Permission.TASK_ASSIGN,
        Permission.TASK_BATCH,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.TEAM_INVITE,
        Permission.REPORTS_READ,
        Permission.REPORTS_EXPORT,
        Permission.SETTINGS_READ,
        Permission.TAG_CREATE,
        Permission.TAG_UPDATE,
        Permission.TAG_DELETE,
        Permission.NOTIFICATION_SEND,
      ],
      [Role.MEMBER]: [
        Permission.TASK_CREATE,
        Permission.TASK_READ,
        Permission.TASK_UPDATE,
        Permission.TAG_CREATE,
        Permission.TAG_UPDATE,
      ],
      [Role.VIEWER]: [
        Permission.TASK_READ,
        Permission.REPORTS_READ,
        Permission.SETTINGS_READ,
      ],
    };
    return rolePermissions[role] || [];
  }),
  roleHasPermission: vi.fn((role, permission) => {
    const { getRolePermissions } = require('@/lib/permissions');
    return getRolePermissions(role).includes(permission);
  }),
}));

// ============================================================================
// usePermissions Hook 测试
// ============================================================================

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该初始化为默认状态', () => {
    const { result } = renderHook(() => usePermissions());

    expect(result.current.userId).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.permissions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该在 userId 变化时加载权限', async () => {
    const mockPermissions = [
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          role: Role.MEMBER,
          permissions: mockPermissions,
        },
      }),
    });

    const { result, rerender } = renderHook(
      ({ userId }) => usePermissions(userId),
      { initialProps: { userId: null as string | null } }
    );

    expect(mockFetch).not.toHaveBeenCalled();

    rerender({ userId: 'user-123' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/permissions/check?userId=user-123'
    );
    expect(result.current.userId).toBe('user-123');
    expect(result.current.role).toBe(Role.MEMBER);
    expect(result.current.permissions).toEqual(mockPermissions);
  });

  it('应该正确处理 API 错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: '用户未授权',
      }),
    });

    const { result } = renderHook(() => usePermissions('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('用户未授权');
    expect(result.current.permissions).toEqual([]);
  });

  it('应该正确处理网络错误', async () => {
    mockFetch.mockRejectedValueOnce(new Error('网络连接失败'));

    const { result } = renderHook(() => usePermissions('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('网络连接失败');
  });

  // 权限检查测试
  describe('checkPermission', () => {
    it('应该正确检查已授权的权限', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        // 手动设置权限进行测试
        (result.current as any).permissions = [Permission.TASK_CREATE];
      });

      const checkResult = result.current.checkPermission(Permission.TASK_CREATE);

      expect(checkResult.granted).toBe(true);
      expect(checkResult.permission).toBe(Permission.TASK_CREATE);
      expect(checkResult.reason).toBeUndefined();
    });

    it('应该正确拒绝未授权的权限', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [Permission.TASK_CREATE];
      });

      const checkResult = result.current.checkPermission(Permission.TASK_DELETE);

      expect(checkResult.granted).toBe(false);
      expect(checkResult.permission).toBe(Permission.TASK_DELETE);
      expect(checkResult.reason).toBe('Missing permission: task:delete');
    });
  });

  describe('hasAllPermissions', () => {
    it('应该在拥有所有权限时返回 true', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [
          Permission.TASK_CREATE,
          Permission.TASK_READ,
          Permission.TASK_UPDATE,
        ];
      });

      const hasAll = result.current.hasAllPermissions([
        Permission.TASK_CREATE,
        Permission.TASK_READ,
      ]);

      expect(hasAll).toBe(true);
    });

    it('应该在缺少任一权限时返回 false', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [
          Permission.TASK_CREATE,
          Permission.TASK_READ,
        ];
      });

      const hasAll = result.current.hasAllPermissions([
        Permission.TASK_CREATE,
        Permission.TASK_DELETE,
      ]);

      expect(hasAll).toBe(false);
    });

    it('应该处理空数组', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [];
      });

      const hasAll = result.current.hasAllPermissions([]);

      expect(hasAll).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('应该在拥有任意权限时返回 true', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [
          Permission.TASK_CREATE,
          Permission.TASK_READ,
        ];
      });

      const hasAny = result.current.hasAnyPermission([
        Permission.TASK_DELETE,
        Permission.TASK_CREATE,
      ]);

      expect(hasAny).toBe(true);
    });

    it('应该在没有任何权限时返回 false', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).permissions = [Permission.TASK_READ];
      });

      const hasAny = result.current.hasAnyPermission([
        Permission.TASK_DELETE,
        Permission.TASK_UPDATE,
      ]);

      expect(hasAny).toBe(false);
    });

    it('应该处理空数组', () => {
      const { result } = renderHook(() => usePermissions());

      const hasAny = result.current.hasAnyPermission([]);

      expect(hasAny).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('应该在角色匹配时返回 true', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = Role.ADMIN;
      });

      expect(result.current.hasRole(Role.ADMIN)).toBe(true);
      expect(result.current.hasRole(Role.MANAGER)).toBe(false);
    });

    it('应该在角色为 null 时返回 false', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = null;
      });

      expect(result.current.hasRole(Role.ADMIN)).toBe(false);
    });
  });

  describe('hasRoleLevel', () => {
    it('应该正确检查角色层级 - ADMIN', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = Role.ADMIN;
      });

      expect(result.current.hasRoleLevel(Role.ADMIN)).toBe(true);
      expect(result.current.hasRoleLevel(Role.MANAGER)).toBe(true);
      expect(result.current.hasRoleLevel(Role.MEMBER)).toBe(true);
      expect(result.current.hasRoleLevel(Role.VIEWER)).toBe(true);
    });

    it('应该正确检查角色层级 - MANAGER', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = Role.MANAGER;
      });

      expect(result.current.hasRoleLevel(Role.ADMIN)).toBe(false);
      expect(result.current.hasRoleLevel(Role.MANAGER)).toBe(true);
      expect(result.current.hasRoleLevel(Role.MEMBER)).toBe(true);
      expect(result.current.hasRoleLevel(Role.VIEWER)).toBe(true);
    });

    it('应该正确检查角色层级 - MEMBER', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = Role.MEMBER;
      });

      expect(result.current.hasRoleLevel(Role.ADMIN)).toBe(false);
      expect(result.current.hasRoleLevel(Role.MANAGER)).toBe(false);
      expect(result.current.hasRoleLevel(Role.MEMBER)).toBe(true);
      expect(result.current.hasRoleLevel(Role.VIEWER)).toBe(true);
    });

    it('应该正确检查角色层级 - VIEWER', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = Role.VIEWER;
      });

      expect(result.current.hasRoleLevel(Role.ADMIN)).toBe(false);
      expect(result.current.hasRoleLevel(Role.MANAGER)).toBe(false);
      expect(result.current.hasRoleLevel(Role.MEMBER)).toBe(false);
      expect(result.current.hasRoleLevel(Role.VIEWER)).toBe(true);
    });

    it('应该在角色为 null 时返回 false', () => {
      const { result } = renderHook(() => usePermissions());

      act(() => {
        (result.current as any).role = null;
      });

      expect(result.current.hasRoleLevel(Role.ADMIN)).toBe(false);
    });
  });

  describe('reload', () => {
    it('应该能够重新加载权限', async () => {
      const mockPermissions1 = [Permission.TASK_CREATE];
      const mockPermissions2 = [
        Permission.TASK_CREATE,
        Permission.TASK_READ,
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { role: Role.MEMBER, permissions: mockPermissions1 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { role: Role.MANAGER, permissions: mockPermissions2 },
          }),
        });

      const { result } = renderHook(() => usePermissions('user-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissions).toEqual(mockPermissions1);

      act(() => {
        result.current.reload?.();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permissions).toEqual(mockPermissions2);
      expect(result.current.role).toBe(Role.MANAGER);
    });

    it('应该在 userId 为 null 时没有 reload 方法', () => {
      const { result } = renderHook(() => usePermissions(null));

      expect(result.current.reload).toBeUndefined();
    });
  });
});

// ============================================================================
// usePermissionCheck Hook 测试
// ============================================================================

describe('usePermissionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该检查单个权限并返回结果', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          role: Role.MEMBER,
          permissions: [Permission.TASK_CREATE],
        },
      }),
    });

    const { result } = renderHook(() =>
      usePermissionCheck('user-123', Permission.TASK_CREATE)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.granted).toBe(true);
    expect(result.current.permission).toBe(Permission.TASK_CREATE);
    expect(result.current.reason).toBeUndefined();
  });

  it('应该在权限未授权时返回原因', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          role: Role.MEMBER,
          permissions: [Permission.TASK_CREATE],
        },
      }),
    });

    const { result } = renderHook(() =>
      usePermissionCheck('user-123', Permission.TASK_DELETE)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.granted).toBe(false);
    expect(result.current.reason).toBe('Missing permission: task:delete');
  });

  it('应该在 userId 为 null 时正确处理', () => {
    const { result } = renderHook(() =>
      usePermissionCheck(null, Permission.TASK_CREATE)
    );

    expect(result.current.granted).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

// ============================================================================
// useRoles Hook 测试
// ============================================================================

describe('useRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该初始化为默认状态', () => {
    const { result } = renderHook(() => useRoles());

    expect(result.current.roles).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该在挂载时自动加载角色', async () => {
    const mockRoles = [
      {
        role: Role.ADMIN,
        label: '管理员',
        description: '拥有所有权限',
        permissions: Object.values(Permission),
      },
      {
        role: Role.MANAGER,
        label: '经理',
        description: '可以管理任务',
        permissions: [
          Permission.TASK_CREATE,
          Permission.TASK_READ,
          Permission.TASK_UPDATE,
        ],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { roles: mockRoles },
      }),
    });

    const { result } = renderHook(() => useRoles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/permissions/roles');
    expect(result.current.roles).toEqual(mockRoles);
  });

  it('应该正确处理 API 错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: '加载角色失败',
      }),
    });

    const { result } = renderHook(() => useRoles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('加载角色失败');
  });

  it('应该正确处理网络错误', async () => {
    mockFetch.mockRejectedValueOnce(new Error('网络错误'));

    const { result } = renderHook(() => useRoles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('网络错误');
  });

  it('应该支持手动重新加载', async () => {
    const mockRoles1 = [
      {
        role: Role.ADMIN,
        label: '管理员',
        description: '拥有所有权限',
        permissions: Object.values(Permission),
      },
    ];

    const mockRoles2 = [
      {
        role: Role.ADMIN,
        label: '管理员',
        description: '拥有所有权限',
        permissions: Object.values(Permission),
      },
      {
        role: Role.MANAGER,
        label: '经理',
        description: '可以管理任务',
        permissions: [Permission.TASK_CREATE],
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { roles: mockRoles1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { roles: mockRoles2 },
        }),
      });

    const { result } = renderHook(() => useRoles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toHaveLength(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toHaveLength(2);
  });

  it('应该正确设置加载状态', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: { roles: [] },
              }),
            });
          }, 100)
        )
    );

    const { result } = renderHook(() => useRoles());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoading).toBe(false);
  });
});
