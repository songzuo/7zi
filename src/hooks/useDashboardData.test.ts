import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error to suppress noise in tests
const originalConsoleError = console.error;

describe('useDashboardData', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError;
  });

  // Mock data factory
  const createMockIssue = (overrides = {}) => ({
    number: 1,
    title: 'Test Issue',
    state: 'open' as const,
    labels: [],
    assignee: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_url: 'https://github.com/test/test/issues/1',
    ...overrides,
  });

  const createMockCommit = (overrides = {}) => ({
    sha: 'abc123',
    commit: {
      message: 'Test commit',
      author: {
        name: 'Test Author',
        date: new Date().toISOString(),
      },
    },
    html_url: 'https://github.com/test/test/commit/abc123',
    author: null,
    ...overrides,
  });

  describe('基本功能', () => {
    it('应该初始时数据为空数组', () => {
      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      expect(result.current.issues).toEqual([]);
      expect(result.current.commits).toEqual([]);
      expect(result.current.activities).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBe(null);
    });

    it('应该成功获取 Issues 和 Commits', async () => {
      const mockIssues = [
        createMockIssue({ number: 1, title: 'Issue 1' }),
        createMockIssue({ number: 2, title: 'Issue 2' }),
      ];

      const mockCommits = [
        createMockCommit({ sha: 'abc123' }),
        createMockCommit({ sha: 'def456' }),
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.issues).toHaveLength(2);
      expect(result.current.commits).toHaveLength(2);
      expect(result.current.activities.length).toBeGreaterThan(0);
      expect(result.current.lastUpdated).not.toBe(null);
    });

    it('应该过滤掉 Pull Requests', async () => {
      // API route already filters PRs, so mock returns only real issues
      const mockIssues = [
        createMockIssue({ number: 1, title: 'Real Issue' }),
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.issues).toHaveLength(1);
      expect(result.current.issues[0].title).toBe('Real Issue');
    });

    it('应该正确合并活动', async () => {
      const now = Date.now();
      const mockIssues = [
        createMockIssue({
          number: 1,
          title: 'Issue 1',
          updated_at: new Date(now).toISOString(),
        }),
      ];

      const mockCommits = [
        createMockCommit({
          sha: 'abc123',
          commit: {
            message: 'Commit 1',
            author: { name: 'Author', date: new Date(now - 1000).toISOString() },
          },
        }),
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.activities.length).toBe(2);
      }, { timeout: 5000 });
    });
  });

  describe('Token 支持', () => {
    it('应该调用内部 API 代理端点', async () => {
      // 现在 hook 调用内部 API 端点，token 参数保留但不再使用
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo', 'test-token')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // 验证调用了内部 API 端点
      expect(mockFetch).toHaveBeenCalled();
      const firstCall = mockFetch.mock.calls[0];
      expect(firstCall[0]).toContain('/api/github/issues');
      expect(firstCall[0]).toContain('owner=owner');
      expect(firstCall[0]).toContain('repo=repo');
    });

    it('应该在没有 token 时调用内部 API 代理', async () => {
      // 测试调用内部 API 端点（不需要 token）
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // 验证调用了内部 API 端点
      expect(mockFetch).toHaveBeenCalled();
      const firstCall = mockFetch.mock.calls[0];
      expect(firstCall[0]).toContain('/api/github/');
    });
  });

  describe('错误处理', () => {
    it('应该处理 404 错误（仓库不存在）', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: '仓库 nonexistent/repo 不存在' }),
      });

      const { result } = renderHook(() =>
        useDashboardData('nonexistent', 'repo')
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, { timeout: 5000 });

      expect(result.current.error).toContain('不存在');
    });

    it('应该处理 401 错误（Token 无效）', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'GitHub Token 无效' }),
      });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo', 'invalid-token')
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Token 无效');
      }, { timeout: 5000 });
    });

    it('应该处理 403 错误（API 速率限制）', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'API 速率限制，请稍后再试' }),
      });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.error).toContain('速率限制');
      }, { timeout: 5000 });
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      }, { timeout: 5000 });
    });

    it('应该处理非 Error 类型的错误', async () => {
      mockFetch.mockRejectedValue('Unknown error');

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.error).toBe('获取 Issues 失败');
      }, { timeout: 5000 });
    });
  });

  describe('refreshData', () => {
    it('应该能够手动刷新数据', async () => {
      const firstIssues = [createMockIssue({ number: 1 })];
      const secondIssues = [createMockIssue({ number: 2 })];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.issues).toHaveLength(1);
        expect(result.current.issues[0].number).toBe(1);
      }, { timeout: 5000 });

      // 手动刷新
      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.issues[0].number).toBe(2);
    });
  });

  describe('活动格式化', () => {
    it('应该正确格式化 commit 活动', async () => {
      const mockCommits = [
        createMockCommit({
          sha: 'abc123',
          commit: {
            message: 'feat: new feature\n\nDetailed description',
            author: {
              name: 'Developer',
              date: new Date().toISOString(),
            },
          },
          author: { avatar_url: 'https://avatar.url/me.png' },
        }),
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.activities.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      const activity = result.current.activities.find(a => a.type === 'commit');
      expect(activity).toBeDefined();
      expect(activity?.title).toBe('feat: new feature'); // 只取第一行
      expect(activity?.author).toBe('Developer');
      expect(activity?.avatar).toBe('https://avatar.url/me.png');
    });

    it('应该正确格式化 issue 活动', async () => {
      const mockIssues = [
        createMockIssue({
          number: 42,
          title: 'Bug Report',
          state: 'open',
          assignee: {
            login: 'assignee',
            avatar_url: 'https://avatar.url/assignee.png',
          },
        }),
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.activities.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      const activity = result.current.activities.find(a => a.type === 'issue');
      expect(activity).toBeDefined();
      expect(activity?.title).toContain('#42');
      expect(activity?.title).toContain('Bug Report');
    });

    it('应该限制活动数量为 20 条', async () => {
      // 创建超过 20 条记录
      const mockIssues = Array.from({ length: 15 }, (_, i) =>
        createMockIssue({ number: i + 1 })
      );
      const mockCommits = Array.from({ length: 15 }, (_, i) =>
        createMockCommit({ sha: `sha${i}` })
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.activities.length).toBeLessThanOrEqual(20);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 Issues 和 Commits', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.issues).toEqual([]);
      expect(result.current.commits).toEqual([]);
      expect(result.current.activities).toEqual([]);
    });

    it('应该处理 Issues 获取失败但 Commits 成功', async () => {
      const mockCommits = [createMockCommit()];

      mockFetch
        .mockRejectedValueOnce(new Error('Issues failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.commits).toHaveLength(1);
      }, { timeout: 5000 });

      // Issues 失败时返回空数组
      expect(result.current.issues).toEqual([]);
      // 活动应该只有 commits
      expect(result.current.activities.length).toBe(1);
    });

    it('应该处理 Commits 获取失败但 Issues 成功', async () => {
      const mockIssues = [createMockIssue()];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockRejectedValueOnce(new Error('Commits failed'));

      const { result } = renderHook(() =>
        useDashboardData('owner', 'repo')
      );

      await waitFor(() => {
        expect(result.current.issues).toHaveLength(1);
      }, { timeout: 5000 });

      expect(result.current.commits).toEqual([]);
    });
  });
});