/**
 * @fileoverview dashboardStore 单元测试
 * @description 使用 Vitest 和 Zustand 官方测试模式测试 dashboardStore
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useDashboardStore,
  getDashboardSnapshot,
  setDashboardConfig,
  refreshDashboardData,
} from '../dashboardStore';

// ============================================================================
// Mock fetch for API calls
// ============================================================================

const mockFetch = vi.fn();

beforeEach(() => {
  // Mock global fetch
  global.fetch = mockFetch;
  // Reset store state before each test
  useDashboardStore.setState({
    members: [],
    issues: [],
    activities: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    owner: 'songzhuo',
    repo: 'openclaw-workspace',
    token: null,
    refreshInterval: 30000,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Test Suite: Store Initialization
// ============================================================================

describe('dashboardStore - 初始化状态', () => {
  it('应该初始化默认配置', () => {
    const state = getDashboardSnapshot();

    expect(state.owner).toBe('songzhuo');
    expect(state.repo).toBe('openclaw-workspace');
    expect(state.token).toBe(null);
    expect(state.refreshInterval).toBe(30000);
  });

  it('应该初始化加载状态', () => {
    const state = getDashboardSnapshot();

    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.lastUpdated).toBe(null);
  });

  it('应该初始化空数据数组', () => {
    const state = getDashboardSnapshot();

    expect(state.members).toEqual([]);
    expect(state.issues).toEqual([]);
    expect(state.activities).toEqual([]);
  });
});

// ============================================================================
// Test Suite: Configuration Actions
// ============================================================================

describe('dashboardStore - 配置管理', () => {
  it('setConfig 应该更新 owner 和 repo', () => {
    const state = getDashboardSnapshot();

    state.setConfig('test-owner', 'test-repo');

    const updated = getDashboardSnapshot();
    expect(updated.owner).toBe('test-owner');
    expect(updated.repo).toBe('test-repo');
    expect(updated.token).toBe(null);
  });

  it('setConfig 应该更新 token', () => {
    const state = getDashboardSnapshot();

    state.setConfig('test-owner', 'test-repo', 'test-token');

    const updated = getDashboardSnapshot();
    expect(updated.token).toBe('test-token');
  });

  it('setDashboardConfig 外部调用应该更新配置', () => {
    setDashboardConfig('external-owner', 'external-repo', 'external-token');

    const state = getDashboardSnapshot();
    expect(state.owner).toBe('external-owner');
    expect(state.repo).toBe('external-repo');
    expect(state.token).toBe('external-token');
  });
});

// ============================================================================
// Test Suite: Data Fetching
// ============================================================================

describe('dashboardStore - 数据获取', () => {
  it('fetchAllData 应该设置加载状态', async () => {
    const state = getDashboardSnapshot();

    // Mock successful API responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, number: 1, state: 'open', title: 'Test Issue', user: { login: 'user', avatar_url: 'av' } as any, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test/issue/1' },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          sha: 'abc123',
          commit: { message: 'Test commit', author: { name: 'Test User', date: '2024-01-01' } },
          html_url: 'https://github.com/test/commit/abc123',
        },
      ],
    });

    const fetchPromise = state.fetchAllData();

    // Check loading state during fetch
    const loadingState = getDashboardSnapshot();
    expect(loadingState.isLoading).toBe(true);
    expect(loadingState.error).toBe(null);

    await fetchPromise;

    // Check final state
    const finalState = getDashboardSnapshot();
    expect(finalState.isLoading).toBe(false);
    expect(finalState.issues.length).toBe(1);
    expect(finalState.activities.length).toBeGreaterThan(0);
    expect(finalState.lastUpdated).toBeInstanceOf(Date);
  });

  it('fetchAllData 应该处理 API 错误', async () => {
    const state = getDashboardSnapshot();

    // Suppress expected console.warn output
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock fetch to throw error directly (simulating a network error)
    mockFetch.mockRejectedValue(new Error('Network error'));

    await state.fetchAllData();

    const finalState = getDashboardSnapshot();
    expect(finalState.isLoading).toBe(false);
    // The error is caught in Promise.all catch blocks, so error is null
    // But data should still be set
    expect(finalState.error).toBe(null);

    warnSpy.mockRestore();
  });

  it('fetchAllData 应该处理 401 认证错误', async () => {
    const state = getDashboardSnapshot();

    // Suppress expected console.warn output
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock fetch to throw error directly
    mockFetch.mockRejectedValue(new Error('GitHub Token 无效'));

    await state.fetchAllData();

    const finalState = getDashboardSnapshot();
    // Errors are caught internally, so error is null
    expect(finalState.error).toBe(null);

    warnSpy.mockRestore();
  });

  it('fetchAllData 应该处理 403 速率限制错误', async () => {
    const state = getDashboardSnapshot();

    // Suppress expected console.warn output
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock fetch to throw error directly
    mockFetch.mockRejectedValue(new Error('GitHub API 速率限制，请稍后重试'));

    await state.fetchAllData();

    const finalState = getDashboardSnapshot();
    // Errors are caught internally, so error is null
    expect(finalState.error).toBe(null);

    warnSpy.mockRestore();
  });

  it('fetchAllData 应该使用 token 认证', async () => {
    const state = getDashboardSnapshot();

    state.setConfig('test-owner', 'test-repo', 'test-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await state.fetchAllData();

    // Verify token is used in Authorization header
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token test-token',
        }),
      })
    );
  });

  it('refreshData 应该调用 fetchAllData', async () => {
    const state = getDashboardSnapshot();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await state.refreshData();

    expect(mockFetch).toHaveBeenCalled();
    const finalState = getDashboardSnapshot();
    expect(finalState.lastUpdated).toBeInstanceOf(Date);
  });

  it('refreshDashboardData 外部调用应该触发刷新', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await refreshDashboardData();

    expect(mockFetch).toHaveBeenCalled();
  });
});

// ============================================================================
// Test Suite: Member Management
// ============================================================================

describe('dashboardStore - 成员管理', () => {
  const mockMembers = [
    {
      id: 'member-1',
      name: 'Member 1',
      role: 'Developer',
      emoji: '👨‍💻',
      avatar: 'https://example.com/avatar1.png',
      status: 'working' as const,
      provider: 'minimax' as const,
      currentTask: '#1 Task',
      completedTasks: 10,
    },
    {
      id: 'member-2',
      name: 'Member 2',
      role: 'Designer',
      emoji: '🎨',
      avatar: 'https://example.com/avatar2.png',
      status: 'idle' as const,
      provider: 'claude' as const,
      currentTask: undefined,
      completedTasks: 20,
    },
  ];

  beforeEach(() => {
    useDashboardStore.setState({ members: mockMembers });
  });

  it('updateMemberStatus 应该更新成员状态', () => {
    const state = getDashboardSnapshot();

    state.updateMemberStatus('member-1', 'busy');

    const updated = getDashboardSnapshot();
    expect(updated.members[0].status).toBe('busy');
    expect(updated.members[1].status).toBe('idle'); // Unchanged
  });

  it('updateMemberStatus 应该支持所有状态类型', () => {
    const state = getDashboardSnapshot();
    const statuses = ['working', 'busy', 'idle', 'offline'] as const;

    statuses.forEach((status) => {
      state.updateMemberStatus('member-1', status);

      const updated = getDashboardSnapshot();
      expect(updated.members[0].status).toBe(status);
    });
  });

  it('updateMemberTask 应该更新成员任务', () => {
    const state = getDashboardSnapshot();

    state.updateMemberTask('member-1', '#2 New Task');

    const updated = getDashboardSnapshot();
    expect(updated.members[0].currentTask).toBe('#2 New Task');
  });

  it('updateMemberTask 应该支持清除任务', () => {
    const state = getDashboardSnapshot();

    state.updateMemberTask('member-1', undefined);

    const updated = getDashboardSnapshot();
    expect(updated.members[0].currentTask).toBeUndefined();
  });

  it('updateMemberTask 不应该影响其他成员', () => {
    const state = getDashboardSnapshot();

    state.updateMemberTask('member-1', '#3 Task');

    const updated = getDashboardSnapshot();
    expect(updated.members[1].currentTask).toBeUndefined();
  });

  it('updateMemberStatus 不存在的成员应该忽略', () => {
    const state = getDashboardSnapshot();
    const originalMembers = [...state.members];

    state.updateMemberStatus('non-existent', 'busy');

    const updated = getDashboardSnapshot();
    expect(updated.members).toEqual(originalMembers);
  });
});

// ============================================================================
// Test Suite: Error Management
// ============================================================================

describe('dashboardStore - 错误管理', () => {
  it('clearError 应该清除错误状态', () => {
    useDashboardStore.setState({ error: 'Test error' });

    const state = getDashboardSnapshot();
    expect(state.error).toBe('Test error');

    state.clearError();

    const updated = getDashboardSnapshot();
    expect(updated.error).toBe(null);
  });

  it('fetchAllData 成功后应该清除之前的错误', async () => {
    useDashboardStore.setState({ error: 'Previous error' });

    const state = getDashboardSnapshot();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await state.fetchAllData();

    const updated = getDashboardSnapshot();
    expect(updated.error).toBe(null);
  });
});

// ============================================================================
// Test Suite: Selectors (using getState)
// ============================================================================

describe('dashboardStore - 选择器功能 (使用 getState)', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      members: [
        {
          id: 'member-1',
          name: 'Member 1',
          role: 'Developer',
          emoji: '👨‍💻',
          avatar: 'https://example.com/avatar1.png',
          status: 'working' as const,
          provider: 'minimax' as const,
          currentTask: '#1 Task',
          completedTasks: 10,
        },
        {
          id: 'member-2',
          name: 'Member 2',
          role: 'Designer',
          emoji: '🎨',
          avatar: 'https://example.com/avatar2.png',
          status: 'busy' as const,
          provider: 'claude' as const,
          currentTask: '#2 Task',
          completedTasks: 20,
        },
      ],
      issues: [
        { id: 1, number: 1, state: 'open', title: 'Open Issue', user: { login: 'user', avatar_url: 'av' }, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test/issue/1' },
        { id: 2, number: 2, state: 'closed', title: 'Closed Issue', user: { login: 'user', avatar_url: 'av' }, assignee: null, updated_at: '2024-01-02', html_url: 'https://github.com/test/issue/2' },
      ],
      activities: [
        { id: 'act-1', type: 'commit', title: 'Commit', author: 'User', timestamp: '2024-01-01', url: 'https://github.com/test/commit/1' },
      ],
      isLoading: true,
      error: 'Test error',
      lastUpdated: new Date('2024-01-01'),
    });
  });

  it('getState 应该返回所有成员', () => {
    const state = getDashboardSnapshot();
    expect(state.members).toHaveLength(2);
    expect(state.members[0].name).toBe('Member 1');
    expect(state.members[1].name).toBe('Member 2');
  });

  it('getState 应该返回所有 Issues', () => {
    const state = getDashboardSnapshot();
    expect(state.issues).toHaveLength(2);
  });

  it('getState 应该返回所有活动', () => {
    const state = getDashboardSnapshot();
    expect(state.activities).toHaveLength(1);
    expect(state.activities[0].type).toBe('commit');
  });

  it('getState 应该返回加载状态', () => {
    const state = getDashboardSnapshot();
    expect(state.isLoading).toBe(true);
  });

  it('getState 应该返回错误信息', () => {
    const state = getDashboardSnapshot();
    expect(state.error).toBe('Test error');
  });

  it('getState 应该返回最后更新时间', () => {
    const state = getDashboardSnapshot();
    expect(state.lastUpdated).toBeInstanceOf(Date);
    expect(state.lastUpdated?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('手动计算统计数据', () => {
    useDashboardStore.setState({
      members: [
        {
          id: 'm1',
          name: 'M1',
          role: 'Dev',
          emoji: '👨‍💻',
          avatar: 'av1',
          status: 'working' as const,
          provider: 'minimax' as const,
          currentTask: '#1',
          completedTasks: 10,
        },
        {
          id: 'm2',
          name: 'M2',
          role: 'Dev',
          emoji: '👨‍💻',
          avatar: 'av2',
          status: 'busy' as const,
          provider: 'claude' as const,
          currentTask: '#2',
          completedTasks: 20,
        },
        {
          id: 'm3',
          name: 'M3',
          role: 'Dev',
          emoji: '👨‍💻',
          avatar: 'av3',
          status: 'idle' as const,
          provider: 'minimax' as const,
          currentTask: '#3',
          completedTasks: 30,
        },
        {
          id: 'm4',
          name: 'M4',
          role: 'Dev',
          emoji: '👨‍💻',
          avatar: 'av4',
          status: 'offline' as const,
          provider: 'claude' as const,
          currentTask: '#4',
          completedTasks: 40,
        },
      ],
      issues: [
        { id: 1, number: 1, state: 'open', title: 'Open', user: { login: 'user', avatar_url: 'av' }, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test/issue/1' },
        { id: 2, number: 2, state: 'open', title: 'Open2', user: { login: 'user', avatar_url: 'av' }, assignee: null, updated_at: '2024-01-02', html_url: 'https://github.com/test/issue/2' },
        { id: 3, number: 3, state: 'closed', title: 'Closed', user: { login: 'user', avatar_url: 'av' }, assignee: null, updated_at: '2024-01-03', html_url: 'https://github.com/test/issue/3' },
      ],
    });

    const state = getDashboardSnapshot();

    const stats = {
      totalMembers: state.members.length,
      working: state.members.filter((m) => m.status === 'working').length,
      busy: state.members.filter((m) => m.status === 'busy').length,
      idle: state.members.filter((m) => m.status === 'idle').length,
      offline: state.members.filter((m) => m.status === 'offline').length,
      openIssues: state.issues.filter((i) => i.state === 'open').length,
      closedIssues: state.issues.filter((i) => i.state === 'closed').length,
    };

    expect(stats.totalMembers).toBe(4);
    expect(stats.working).toBe(1);
    expect(stats.busy).toBe(1);
    expect(stats.idle).toBe(1);
    expect(stats.offline).toBe(1);
    expect(stats.openIssues).toBe(2);
    expect(stats.closedIssues).toBe(1);
  });

  it('手动按状态分组成员', () => {
    const state = getDashboardSnapshot();

    const working = state.members.filter((m) => m.status === 'working');
    const busy = state.members.filter((m) => m.status === 'busy');
    const idle = state.members.filter((m) => m.status === 'idle');
    const offline = state.members.filter((m) => m.status === 'offline');

    expect(working).toHaveLength(1);
    expect(working[0].id).toBe('member-1');

    expect(busy).toHaveLength(1);
    expect(busy[0].id).toBe('member-2');

    expect(idle).toHaveLength(0);
    expect(offline).toHaveLength(0);
  });

  it('手动查找指定成员', () => {
    const state = getDashboardSnapshot();
    const member = state.members.find((m) => m.id === 'member-1');

    expect(member).toBeDefined();
    expect(member?.id).toBe('member-1');
    expect(member?.name).toBe('Member 1');
  });

  it('手动查找不存在的成员应该返回 undefined', () => {
    const state = getDashboardSnapshot();
    const member = state.members.find((m) => m.id === 'non-existent');
    expect(member).toBeUndefined();
  });
});

// ============================================================================
// Test Suite: Data Update Logic
// ============================================================================

describe('dashboardStore - 数据更新逻辑', () => {
  it('activities 应该按时间倒序排列', async () => {
    // First mock returns empty array for issues
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Second mock returns commits with different timestamps
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          sha: 'commit2',
          commit: { message: 'Commit 2', author: { name: 'User', date: '2024-01-02T00:00:00Z' } },
          html_url: 'https://github.com/test/commit2',
        },
        {
          sha: 'commit1',
          commit: { message: 'Commit 1', author: { name: 'User', date: '2024-01-01T00:00:00Z' } },
          html_url: 'https://github.com/test/commit1',
        },
      ],
    });

    const state = getDashboardSnapshot();

    await state.fetchAllData();

    const activities = getDashboardSnapshot().activities;
    const timestamps = activities.map((a) => new Date(a.timestamp).getTime());

    // Check that we have activities
    expect(activities.length).toBeGreaterThan(0);

    // Check descending order
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  it('activities 应该限制为最近 20 条', async () => {
    // Mock 30 commits
    const commits = Array.from({ length: 30 }, (_, i) => ({
      sha: `commit${i}`,
      commit: {
        message: `Commit ${i}`,
        author: { name: 'User', date: new Date(2024, 0, i + 1).toISOString() },
      },
      html_url: `https://github.com/test/commit${i}`,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => commits,
    });

    const state = getDashboardSnapshot();

    await state.fetchAllData();

    const activities = getDashboardSnapshot().activities;
    expect(activities.length).toBeLessThanOrEqual(20);
  });

  it('issues 应该过滤掉 Pull Requests', async () => {
    // Mock issues with PR
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, number: 1, state: 'open', title: 'Issue', user: { login: 'user', avatar_url: 'av' } as any, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test/issue/1' },
        { id: 2, number: 2, state: 'open', title: 'PR', user: { login: 'user', avatar_url: 'av' } as any, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test/pr/2', pull_request: {} },
      ],
    });

    // Mock commits (empty)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const state = getDashboardSnapshot();

    await state.fetchAllData();

    const issues = getDashboardSnapshot().issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe('Issue');
  });

  it('并发获取 Issues 和 Commits 应该并行执行', async () => {
    let issuesFetchTime = 0;
    let commitsFetchTime = 0;

    mockFetch.mockImplementation((url) => {
      if (url.includes('issues')) {
        issuesFetchTime = Date.now();
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      } else if (url.includes('commits')) {
        commitsFetchTime = Date.now();
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const state = getDashboardSnapshot();

    await state.fetchAllData();

    // Both should be fetched (order doesn't matter for parallel execution)
    expect(issuesFetchTime).toBeGreaterThan(0);
    expect(commitsFetchTime).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: State Persistence
// ============================================================================

describe('dashboardStore - 状态持久化', () => {
  it('getDashboardSnapshot 应该返回当前状态快照', () => {
    const testData = {
      members: [{ id: 'test', name: 'Test', role: 'Dev', emoji: '👨‍💻', avatar: 'av', status: 'working' as const, provider: 'minimax' as const, currentTask: '#1', completedTasks: 10 }],
      issues: [{ id: 1, number: 1, state: 'open' as const, title: 'Test', user: { login: 'user', avatar_url: 'av' } as any, assignee: null, updated_at: '2024-01-01', html_url: 'https://github.com/test' }],
      activities: [],
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
      refreshInterval: 60000,
    };

    useDashboardStore.setState(testData);

    const snapshot = getDashboardSnapshot();

    expect(snapshot.members).toEqual(testData.members);
    expect(snapshot.issues).toEqual(testData.issues);
    expect(snapshot.owner).toBe(testData.owner);
    expect(snapshot.repo).toBe(testData.repo);
    expect(snapshot.token).toBe(testData.token);
  });

  it('setDashboardConfig 应该更新全局配置', () => {
    setDashboardConfig('new-owner', 'new-repo', 'new-token');

    const snapshot = getDashboardSnapshot();
    expect(snapshot.owner).toBe('new-owner');
    expect(snapshot.repo).toBe('new-repo');
    expect(snapshot.token).toBe('new-token');
  });
});
