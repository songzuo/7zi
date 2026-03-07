/**
 * useRoleManagement Hook 单元测试
 * Role Management Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoleManagement, useRoleSelector } from '@/hooks/useRoleManagement';
import { Role, RoleLabels, RoleDescriptions } from '@/lib/permissions/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock @/lib/permissions
vi.mock('@/lib/permissions', () => ({
  getAllRoles: vi.fn(() => [Role.ADMIN, Role.MANAGER, Role.MEMBER, Role.VIEWER]),
  getAssignableRoles: vi.fn((currentRole) => {
    const assignable = {
      [Role.ADMIN]: [Role.ADMIN, Role.MANAGER, Role.MEMBER, Role.VIEWER],
      [Role.MANAGER]: [Role.MEMBER, Role.VIEWER],
      [Role.MEMBER]: [Role.VIEWER],
      [Role.VIEWER]: [],
    };
    return assignable[currentRole] || [];
  }),
  canManageRole: vi.fn((currentRole, targetRole) => {
    const hierarchy = {
      [Role.ADMIN]: [Role.ADMIN, Role.MANAGER, Role.MEMBER, Role.VIEWER],
      [Role.MANAGER]: [Role.MEMBER, Role.VIEWER],
      [Role.MEMBER]: [Role.VIEWER],
      [Role.VIEWER]: [],
    };
    return hierarchy[currentRole]?.includes(targetRole) ?? false;
  }),
}));

// Mock @/lib/users/types
vi.mock('@/lib/users/types', () => ({
  User: {
    id: 'string',
    name: 'string',
    email: 'string',
    role: 'admin',
  },
}));

// ============================================================================
// useRoleManagement Hook 测试
// ============================================================================

describe('useRoleManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该初始化为默认状态', () => {
    const { result } = renderHook(() => useRoleManagement(Role.MANAGER));

    expect(result.current.users).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
    expect(result.current.assignableRoles).toEqual([Role.MEMBER, Role.VIEWER]);
  });

  it('应该正确计算可分配角色', () => {
    const { result: adminResult } = renderHook(() =>
      useRoleManagement(Role.ADMIN)
    );
    const { result: managerResult } = renderHook(() =>
      useRoleManagement(Role.MANAGER)
    );
    const { result: memberResult } = renderHook(() =>
      useRoleManagement(Role.MEMBER)
    );
    const { result: viewerResult } = renderHook(() =>
      useRoleManagement(Role.VIEWER)
    );

    expect(adminResult.current.assignableRoles).toEqual([
      Role.ADMIN,
      Role.MANAGER,
      Role.MEMBER,
      Role.VIEWER,
    ]);
    expect(managerResult.current.assignableRoles).toEqual([
      Role.MEMBER,
      Role.VIEWER,
    ]);
    expect(memberResult.current.assignableRoles).toEqual([Role.VIEWER]);
    expect(viewerResult.current.assignableRoles).toEqual([]);
  });

  it('应该提供所有角色', () => {
    const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

    expect(result.current.allRoles).toEqual([
      Role.ADMIN,
      Role.MANAGER,
      Role.MEMBER,
      Role.VIEWER,
    ]);
  });

  it('应该提供角色标签和描述', () => {
    const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

    expect(result.current.roleLabels).toEqual(RoleLabels);
    expect(result.current.roleDescriptions).toEqual(RoleDescriptions);
  });

  describe('loadUsers', () => {
    it('应该成功加载所有用户', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: Role.MEMBER,
        },
        {
          id: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: Role.VIEWER,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { users: mockUsers },
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/role');
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('应该支持按角色过滤加载用户', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: Role.MEMBER,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { users: mockUsers },
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      await act(async () => {
        await result.current.loadUsers(Role.MEMBER);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/role?role=member');
      expect(result.current.users).toEqual(mockUsers);
    });

    it('应该正确处理 API 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: '加载用户失败',
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.error).toBe('加载用户失败');
      expect(result.current.users).toEqual([]);
    });

    it('应该正确处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('网络错误'));

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.error).toBe('网络错误');
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
                  data: { users: [] },
                }),
              });
            }, 100)
          )
      );

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      act(() => {
        result.current.loadUsers();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('updateUserRole', () => {
    it('应该成功更新用户角色', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: 'user-1', newRole: Role.MANAGER },
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.MANAGER,
          'admin-123'
        );
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          newRole: Role.MANAGER,
          adminId: 'admin-123',
        }),
      });
      expect(success).toBe(true);
      expect(result.current.success).toBe('User role updated to 经理');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('应该在 API 返回失败时返回 false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: '权限不足',
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.MANAGER));

      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.ADMIN,
          'manager-123'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('权限不足');
      expect(result.current.success).toBeNull();
    });

    it('应该正确处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('网络连接失败'));

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.MANAGER,
          'admin-123'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('网络连接失败');
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
                  data: { userId: 'user-1', newRole: Role.MANAGER },
                }),
              });
            }, 50)
          )
      );

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      // Start the update
      act(() => {
        result.current.updateUserRole(
          'user-1',
          Role.MANAGER,
          'admin-123'
        );
      });

      // Wait a bit for the state to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isLoading).toBe(true);

      // Wait for the promise to resolve and state to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('canModifyUser', () => {
    it('应该允许管理员修改任何角色', () => {
      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      expect(result.current.canModifyUser(Role.ADMIN)).toBe(true);
      expect(result.current.canModifyUser(Role.MANAGER)).toBe(true);
      expect(result.current.canModifyUser(Role.MEMBER)).toBe(true);
      expect(result.current.canModifyUser(Role.VIEWER)).toBe(true);
    });

    it('应该允许经理修改成员和观察者', () => {
      const { result } = renderHook(() => useRoleManagement(Role.MANAGER));

      expect(result.current.canModifyUser(Role.ADMIN)).toBe(false);
      expect(result.current.canModifyUser(Role.MANAGER)).toBe(false);
      expect(result.current.canModifyUser(Role.MEMBER)).toBe(true);
      expect(result.current.canModifyUser(Role.VIEWER)).toBe(true);
    });

    it('应该允许成员修改观察者', () => {
      const { result } = renderHook(() => useRoleManagement(Role.MEMBER));

      expect(result.current.canModifyUser(Role.ADMIN)).toBe(false);
      expect(result.current.canModifyUser(Role.MANAGER)).toBe(false);
      expect(result.current.canModifyUser(Role.MEMBER)).toBe(false);
      expect(result.current.canModifyUser(Role.VIEWER)).toBe(true);
    });

    it('不应该允许观察者修改任何角色', () => {
      const { result } = renderHook(() => useRoleManagement(Role.VIEWER));

      expect(result.current.canModifyUser(Role.ADMIN)).toBe(false);
      expect(result.current.canModifyUser(Role.MANAGER)).toBe(false);
      expect(result.current.canModifyUser(Role.MEMBER)).toBe(false);
      expect(result.current.canModifyUser(Role.VIEWER)).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('应该清除错误和成功消息', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: '测试错误',
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      await act(async () => {
        await result.current.updateUserRole('user-1', Role.MANAGER, 'admin-123');
      });

      expect(result.current.error).toBe('测试错误');

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.success).toBeNull();
    });

    it('应该在没有消息时正常工作', () => {
      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.success).toBeNull();
    });
  });

  // 角色变更场景测试
  describe('角色变更场景', () => {
    it('应该支持将成员升级为经理', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: Role.MEMBER,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { users: mockUsers },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', newRole: Role.MANAGER },
          }),
        });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      // 加载用户
      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users[0].role).toBe(Role.MEMBER);

      // 升级为经理
      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.MANAGER,
          'admin-123'
        );
      });

      expect(success).toBe(true);
      expect(result.current.success).toBe('User role updated to 经理');
    });

    it('应该支持将经理降级为成员', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: 'user-1', newRole: Role.MEMBER },
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.ADMIN));

      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.MEMBER,
          'admin-123'
        );
      });

      expect(success).toBe(true);
      expect(result.current.success).toBe('User role updated to 成员');
    });

    it('应该防止经理提升其他人为管理员', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: '权限不足：无法提升为管理员',
        }),
      });

      const { result } = renderHook(() => useRoleManagement(Role.MANAGER));

      const success = await act(async () => {
        return await result.current.updateUserRole(
          'user-1',
          Role.ADMIN,
          'manager-123'
        );
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('权限不足：无法提升为管理员');
    });

    it('应该支持批量角色变更', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: Role.VIEWER,
        },
        {
          id: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: Role.VIEWER,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { users: mockUsers },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', newRole: Role.MEMBER },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { userId: 'user-2', newRole: Role.MEMBER },
          }),
        });

      const { result } = renderHook(() => useRoleManagement(Role.MANAGER));

      await act(async () => {
        await result.current.loadUsers();
      });

      // 批量升级为成员
      const promises = [
        result.current.updateUserRole('user-1', Role.MEMBER, 'manager-123'),
        result.current.updateUserRole('user-2', Role.MEMBER, 'manager-123'),
      ];

      const results = await act(async () => {
        return await Promise.all(promises);
      });

      expect(results).toEqual([true, true]);
    });
  });
});

// ============================================================================
// useRoleSelector Hook 测试
// ============================================================================

describe('useRoleSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该为管理员提供所有角色选项', () => {
    const { result } = renderHook(() => useRoleSelector(Role.ADMIN));

    expect(result.current.options).toEqual([
      {
        value: Role.ADMIN,
        label: RoleLabels[Role.ADMIN],
        description: RoleDescriptions[Role.ADMIN],
      },
      {
        value: Role.MANAGER,
        label: RoleLabels[Role.MANAGER],
        description: RoleDescriptions[Role.MANAGER],
      },
      {
        value: Role.MEMBER,
        label: RoleLabels[Role.MEMBER],
        description: RoleDescriptions[Role.MEMBER],
      },
      {
        value: Role.VIEWER,
        label: RoleLabels[Role.VIEWER],
        description: RoleDescriptions[Role.VIEWER],
      },
    ]);
    expect(result.current.hasAssignableRoles).toBe(true);
  });

  it('应该为经理提供成员和观察者选项', () => {
    const { result } = renderHook(() => useRoleSelector(Role.MANAGER));

    expect(result.current.options).toEqual([
      {
        value: Role.MEMBER,
        label: RoleLabels[Role.MEMBER],
        description: RoleDescriptions[Role.MEMBER],
      },
      {
        value: Role.VIEWER,
        label: RoleLabels[Role.VIEWER],
        description: RoleDescriptions[Role.VIEWER],
      },
    ]);
    expect(result.current.hasAssignableRoles).toBe(true);
  });

  it('应该为成员提供观察者选项', () => {
    const { result } = renderHook(() => useRoleSelector(Role.MEMBER));

    expect(result.current.options).toEqual([
      {
        value: Role.VIEWER,
        label: RoleLabels[Role.VIEWER],
        description: RoleDescriptions[Role.VIEWER],
      },
    ]);
    expect(result.current.hasAssignableRoles).toBe(true);
  });

  it('应该为观察者提供空选项', () => {
    const { result } = renderHook(() => useRoleSelector(Role.VIEWER));

    expect(result.current.options).toEqual([]);
    expect(result.current.hasAssignableRoles).toBe(false);
  });
});