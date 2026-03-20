/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGitHubData, getMockCommits, getMockStats, getMockIssues } from './useGitHubData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.warn
const originalConsoleWarn = console.warn;

describe('useGitHubData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockClear();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    console.warn = originalConsoleWarn;
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

  const createMockRepoStats = (overrides = {}) => ({
    stargazers_count: 100,
    forks_count: 20,
    open_issues_count: 5,
    ...overrides,
  });

  describe('基本功能', () => {
    it('应该初始时数据为空', () => {
      const { result } = renderHook(() =>
        useGitHubData({ owner: 'owner', repo: 'repo' })
      );

      expect(result.current.issues).toEqual([]);
      expect(result.current.commits).toEqual([]);
      expect(result.current.stats).toBe(null);
      expect(result.current.activities).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('应该成功获取 Issues、Commits 和 Stats', async () => {
      const mockIssues = [createMockIssue()];
      const mockCommits = [createMockCommit()];
      const mockStats = createMockRepoStats();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });

      const { result } = renderHook(() =>
        useGitHubData({ owner: 'owner', repo: 'repo' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.issues).toHaveLength(1);
      expect(result.current.commits).toHaveLength(1);
      expect(result.current.stats).not.toBe(null);
      expect(result.current.stats?.stars).toBe(100);
    });

    it('应该构建正确的 API URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderHook(() =>
        useGitHubData({ owner: 'facebook', repo: 'react' })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });

      const calls = mockFetch.mock.calls;
      const urls = calls.map(call => call[0]);

      expect(urls.some(url => url.includes('facebook/react/issues'))).toBe(true);
      expect(urls.some(url => url.includes('facebook/react/commits'))).toBe(true);
    });

    it('应该正确设置默认分页参数', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderHook(() =>
        useGitHubData({ owner: 'owner', repo: 'repo' })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      const calls = mockFetch.mock.calls;
      const issuesCall = calls.find(call => call[0].includes('issues'));
      const commitsCall = calls.find(call => call[0].includes('commits'));

      expect(issuesCall?.[0]).toContain('per_page=50');
      expect(commitsCall?.[0]).toContain('per_page=30');
    });

    it('应该支持自定义分页参数', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderHook(() =>
        useGitHubData({
          owner: 'owner',
          repo: 'repo',
          issuesPerPage: 10,
          commitsPerPage: 5,
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      const calls = mockFetch.mock.calls;
      const issuesCall = calls.find(call => call[0].includes('issues'));
      const commitsCall = calls.find(call => call[0].includes('commits'));

      expect(issuesCall?.[0]).toContain('per_page=10');
      expect(commitsCall?.[0]).toContain('per_page=5');
    });
  });

  describe('Token 支持', () => {
    it('应该在请求头中包含 token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderHook(() =>
        useGitHubData({ owner: 'owner', repo: 'repo', token: 'secret-token' })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      const calls = mockFetch.mock.calls;
      const headers = calls[0][1].headers;
      expect(headers['Authorization']).toBe('token secret-token');
    });
  });

  describe('错误处理', () => {
    it('应该处理 404 错误（仓库不存在）', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() =>
        useGitHubData({ owner: 'nonexistent', repo: 'repo' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      // 由于 Promise.allSettled 模式，错误被吞掉，返回空数组
      expect(result.current.issues).toEqual([]);
      expect(result.current.commits).toEqual([]);
    });

    it('应该处理 403 错误（API 速率限制）', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() =>
        useGitHubData({ owner: 'owner', repo: 'repo' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.issues).toEqual([]);
    });
  });

  describe('自动刷新', () => {
    it('应该按指定间隔自动刷新数据', async () => {
      vi.useFakeTimers();

      try {
        const mockIssues1 = [createMockIssue({ number: 1 })];
        const mockIssues2 = [createMockIssue({ number: 2 })];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockIssues1),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          })
          // 第二次刷新
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockIssues2),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { result } = renderHook(() =>
          useGitHubData({
            owner: 'owner',
            repo: 'repo',
            refreshInterval: 60000, // 1 minute
          })
        );

        // 等待初始加载
        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.issues).toHaveLength(1);
        expect(result.current.issues[0].number).toBe(1);

        // 快进时间
        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        // 等待第二次请求完成
        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.issues[0].number).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('当 refreshInterval 为 0 时不应该自动刷新', async () => {
      vi.useFakeTimers();

      try {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        renderHook(() =>
          useGitHubData({
            owner: 'owner',
            repo: 'repo',
            refreshInterval: 0,
          })
        );

        // 等待初始加载
        await act(async () => {
          await vi.runAllTimersAsync();
        });

        // 初始调用 3 次
        expect(mockFetch).toHaveBeenCalledTimes(3);

        mockFetch.mockClear();

        // 快进时间，确保不再调用
        await act(async () => {
          await vi.advanceTimersByTimeAsync(60000);
        });

        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('手动刷新', () => {
    it('应该能够手动刷新数据', async () => {
      vi.useFakeTimers();

      try {
        const mockIssues1 = [createMockIssue({ number: 1 })];
        const mockIssues2 = [createMockIssue({ number: 2 })];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockIssues1),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          })
          // 第二次刷新
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockIssues2),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { result } = renderHook(() =>
          useGitHubData({ owner: 'owner', repo: 'repo' })
        );

        // 等待初始加载
        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.issues).toHaveLength(1);
        expect(result.current.issues[0].number).toBe(1);

        // 手动刷新
        await act(async () => {
          await result.current.refresh();
          await vi.runAllTimersAsync();
        });

        expect(result.current.issues[0].number).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('活动合并', () => {
    it('应该正确合并活动', async () => {
      vi.useFakeTimers();

      try {
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
              author: { name: 'Dev', date: new Date(now - 1000).toISOString() },
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
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { result } = renderHook(() =>
          useGitHubData({ owner: 'owner', repo: 'repo' })
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.activities.length).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('应该限制活动数量为 20 条', async () => {
      vi.useFakeTimers();

      try {
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
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { result } = renderHook(() =>
          useGitHubData({ owner: 'owner', repo: 'repo' })
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.activities.length).toBeLessThanOrEqual(20);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('PR 过滤', () => {
    it('应该过滤掉 Pull Requests', async () => {
      vi.useFakeTimers();

      try {
        const mockIssues = [
          createMockIssue({ number: 1, title: 'Real Issue' }),
          createMockIssue({ number: 2, title: 'PR', pull_request: {} }),
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockIssues),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { result } = renderHook(() =>
          useGitHubData({ owner: 'owner', repo: 'repo' })
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(result.current.issues).toHaveLength(1);
        expect(result.current.issues[0].title).toBe('Real Issue');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('清理', () => {
    it('组件卸载时应该清理 interval', async () => {
      vi.useFakeTimers();

      try {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockRepoStats()),
          });

        const { unmount } = renderHook(() =>
          useGitHubData({
            owner: 'owner',
            repo: 'repo',
            refreshInterval: 1000,
          })
        );

        await act(async () => {
          await vi.runAllTimersAsync();
        });

        expect(mockFetch).toHaveBeenCalledTimes(3);

        unmount();

        mockFetch.mockClear();

        // 快进时间，确保不再调用
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });

        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe('Mock 数据生成器', () => {
  describe('getMockCommits', () => {
    it('应该返回正确格式的 commits', () => {
      const commits = getMockCommits();

      expect(Array.isArray(commits)).toBe(true);
      expect(commits.length).toBeGreaterThan(0);

      commits.forEach(commit => {
        expect(commit).toHaveProperty('sha');
        expect(commit).toHaveProperty('commit');
        expect(commit.commit).toHaveProperty('message');
        expect(commit.commit).toHaveProperty('author');
        expect(commit.commit.author).toHaveProperty('name');
        expect(commit.commit.author).toHaveProperty('date');
        expect(commit).toHaveProperty('html_url');
      });
    });
  });

  describe('getMockStats', () => {
    it('应该返回正确格式的 stats', () => {
      const stats = getMockStats();

      expect(stats).toHaveProperty('stars');
      expect(stats).toHaveProperty('forks');
      expect(stats).toHaveProperty('openIssues');

      expect(typeof stats.stars).toBe('number');
      expect(typeof stats.forks).toBe('number');
      expect(typeof stats.openIssues).toBe('number');
    });
  });

  describe('getMockIssues', () => {
    it('应该返回正确格式的 issues', () => {
      const issues = getMockIssues();

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);

      issues.forEach(issue => {
        expect(issue).toHaveProperty('number');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('state');
        expect(['open', 'closed']).toContain(issue.state);
        expect(issue).toHaveProperty('labels');
        expect(issue).toHaveProperty('created_at');
        expect(issue).toHaveProperty('updated_at');
        expect(issue).toHaveProperty('html_url');
      });
    });
  });
});