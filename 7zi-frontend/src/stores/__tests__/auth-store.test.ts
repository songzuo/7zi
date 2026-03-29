/**
 * Auth Store 测试
 *
 * 测试目标:
 * - 登录/登出功能
 * - 用户信息更新
 * - Token 管理
 * - 持久化功能
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthStore } from '../auth-store';

describe('useAuthStore', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    // 重置 Store 状态
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('登录功能', () => {
    it('应该能使用 Token 和用户信息登录', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      act(() => {
        result.current.loginWithToken('mock-token', mockUser);
      });

      expect(result.current.token).toBe('mock-token');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('登录失败时应该设置错误状态', async () => {
      const { result } = renderHook(() => useAuthStore());

      // Mock fetch 失败
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        } as Response)
      );

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong-password');
        } catch (error) {
          // 预期会抛出错误
        }
      });

      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('登出功能', () => {
    it('应该能清除用户状态', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.loginWithToken('mock-token', {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // 登出
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('用户信息更新', () => {
    it('应该能更新用户资料', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      act(() => {
        result.current.loginWithToken('mock-token', mockUser);
      });

      // 更新资料
      act(() => {
        result.current.updateProfile({ name: 'Updated Name' });
      });

      expect(result.current.user?.name).toBe('Updated Name');
      expect(result.current.user?.email).toBe('test@example.com');
    });

    it('应该能设置头像', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.loginWithToken('mock-token', {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
        });
      });

      // 设置头像
      act(() => {
        result.current.setAvatar('https://example.com/avatar.png');
      });

      expect(result.current.user?.avatar).toBe('https://example.com/avatar.png');
    });
  });

  describe('错误处理', () => {
    it('应该能设置和清除错误', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('加载状态', () => {
    it('应该能设置加载状态', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('持久化功能', () => {
    it('应该将用户信息持久化到 localStorage', async () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      act(() => {
        result.current.loginWithToken('mock-token', mockUser);
      });

      // 等待 persist 中间件完成
      await waitFor(() => {
        const stored = localStorage.getItem('7zi-auth-storage');
        expect(stored).toBeTruthy();
      });

      const stored = localStorage.getItem('7zi-auth-storage');
      const parsed = JSON.parse(stored!);

      expect(parsed.state.user).toEqual(mockUser);
      expect(parsed.state.token).toBe('mock-token');
      expect(parsed.state.isAuthenticated).toBe(true);
    });

    it('应该从 localStorage 恢复状态', async () => {
      // 预设 localStorage
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      localStorage.setItem(
        '7zi-auth-storage',
        JSON.stringify({
          state: {
            user: mockUser,
            token: 'mock-token',
            isAuthenticated: true,
          },
          version: 0,
        })
      );

      // 创建新的 Store 实例
      const { result } = renderHook(() => useAuthStore());

      // 等待恢复完成
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('选择器', () => {
    it('选择器应该返回正确的状态切片', () => {
      const { result } = renderHook(() => useAuthStore());

      const user = result.current.user;
      const isAuthenticated = result.current.isAuthenticated;
      const token = result.current.token;
      const isLoading = result.current.isLoading;
      const error = result.current.error;

      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(token).toBeNull();
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
    });
  });
});
