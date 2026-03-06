import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetch, useGitHub } from './useFetch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本功能', () => {
    it('应该初始时 loading 为 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { result } = renderHook(() => useFetch('/api/test'));
      
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('应该成功获取数据', async () => {
      const mockData = { message: 'success' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
    });

    it('应该使用正确的请求头', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          headers: {
            'Accept': 'application/json',
          },
        });
      });
    });

    it('应该支持 initialData', () => {
      const initialData = { initial: true };
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useFetch('/api/test', { initialData })
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('错误处理', () => {
    it('应该处理 HTTP 错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('HTTP error! status: 404');
      expect(result.current.data).toBe(null);
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('应该处理非 Error 类型的错误', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('应该处理 500 服务器错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.error).toBe('HTTP error! status: 500');
      });
    });
  });

  describe('refetch 功能', () => {
    it('应该能够手动重新获取数据', async () => {
      const firstData = { count: 1 };
      const secondData = { count: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondData),
        });

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.data).toEqual(firstData);
      });

      // 手动重新获取
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual(secondData);
    });
  });

  describe('revalidateOnFocus', () => {
    it('当 revalidateOnFocus 为 true 时，窗口获得焦点应该重新获取', async () => {
      const firstData = { version: 1 };
      const secondData = { version: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondData),
        });

      const { result } = renderHook(() =>
        useFetch('/api/test', { revalidateOnFocus: true })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(firstData);
      });

      // 触发 focus 事件
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(secondData);
      });
    });

    it('当 revalidateOnFocus 为 false 时，窗口获得焦点不应该重新获取', async () => {
      const data = { version: 1 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const { result } = renderHook(() =>
        useFetch('/api/test', { revalidateOnFocus: false })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(data);
      });

      // 清空 mock 来验证不再调用
      mockFetch.mockClear();

      // 触发 focus 事件
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // 等待一下确保没有新的 fetch
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('revalidateInterval', () => {
    it('应该按间隔自动重新获取数据', async () => {
      vi.useFakeTimers();
      
      const firstData = { count: 1 };
      const secondData = { count: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondData),
        });

      const { result } = renderHook(() =>
        useFetch('/api/test', { revalidateInterval: 5000 })
      );

      // 等待初始数据加载
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.data).toEqual(firstData);

      // 快进时间
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.data).toEqual(secondData);
      
      vi.useRealTimers();
    });

    it('当 revalidateInterval 为 0 时不应该自动重新获取', async () => {
      const data = { count: 1 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const { result } = renderHook(() =>
        useFetch('/api/test', { revalidateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(data);
      });

      mockFetch.mockClear();

      // 等待一段时间
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('清理', () => {
    it('组件卸载时应该清理 focus 事件监听器', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useFetch('/api/test', { revalidateOnFocus: true })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('组件卸载时应该清理 interval', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { unmount } = renderHook(() =>
        useFetch('/api/test', { revalidateInterval: 1000 })
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      unmount();

      // 快进时间，确保不再调用
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // 仍然只被调用一次
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });
});

describe('useGitHub', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('基本功能', () => {
    it('应该构建正确的 GitHub API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderHook(() => useGitHub('repos/owner/repo'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/owner/repo',
          expect.any(Object)
        );
      });
    });

    it('应该返回 rateLimit 信息', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useGitHub('repos/test/test'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // rateLimit 当前实现返回 null
      expect(result.current.rateLimit).toBe(null);
    });

    it('应该支持自定义选项', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderHook(() =>
        useGitHub('repos/test/test', {
          revalidateOnFocus: false,
          revalidateInterval: 10000,
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理 GitHub API 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() => useGitHub('repos/test/test'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('应该处理 404 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useGitHub('repos/nonexistent/repo'));

      await waitFor(() => {
        expect(result.current.error).toBe('HTTP error! status: 404');
      });
    });
  });

  describe('refetch', () => {
    it('应该能够手动刷新数据', async () => {
      const firstData = { name: 'repo1' };
      const secondData = { name: 'repo2' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondData),
        });

      const { result } = renderHook(() => useGitHub('repos/test/test'));

      await waitFor(() => {
        expect(result.current.data).toEqual(firstData);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual(secondData);
    });
  });
});