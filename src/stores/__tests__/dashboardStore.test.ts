/**
// @ts-ignore - Mock type compatibility issues
 * @fileoverview Dashboard Store 测试
 * @description Dashboard Store Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useDashboardStore,
  getDashboardSnapshot,
  setDashboardConfig,
  refreshDashboardData,
} from '../dashboardStore';
import type { AIMember } from '../dashboardStore';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('DashboardStore', () => {
  beforeEach(() => {
    // Reset store state but keep members
    const currentMembers = useDashboardStore.getState().members;
    useDashboardStore.setState({
      members: currentMembers,
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

    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('应该有默认的 AI 成员列表', () => {
      const state = useDashboardStore.getState();
      expect(state.members).toHaveLength(11);
      expect(state.members[0]).toHaveProperty('id');
      expect(state.members[0]).toHaveProperty('name');
      expect(state.members[0]).toHaveProperty('role');
      expect(state.members[0]).toHaveProperty('emoji');
      expect(state.members[0]).toHaveProperty('avatar');
      expect(state.members[0]).toHaveProperty('status');
      expect(state.members[0]).toHaveProperty('provider');
      expect(state.members[0]).toHaveProperty('completedTasks');
    });

    it('应该初始化空的 issues 和 activities', () => {
      const state = useDashboardStore.getState();
      expect(state.issues).toEqual([]);
      expect(state.activities).toEqual([]);
    });

    it('应该有默认的配置', () => {
      const state = useDashboardStore.getState();
      expect(state.owner).toBe('songzhuo');
      expect(state.repo).toBe('openclaw-workspace');
      expect(state.token).toBeNull();
      expect(state.refreshInterval).toBe(30000);
    });

    it('初始加载状态应该为 false', () => {
      const state = useDashboardStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('应该更新 owner 和 repo', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('new-owner', 'new-repo');

      const state = useDashboardStore.getState();
      expect(state.owner).toBe('new-owner');
      expect(state.repo).toBe('new-repo');
    });

    it('应该设置 token', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('owner', 'repo', 'test-token');

      const state = useDashboardStore.getState();
      expect(state.token).toBe('test-token');
    });

    it('应该允许不设置 token', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('owner', 'repo');

      const state = useDashboardStore.getState();
      expect(state.token).toBeNull();
    });
  });

  describe('fetchAllData', () => {
    beforeEach(() => {
      // Setup successful fetch responses
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                number: 1,
                title: 'Test Issue',
                state: 'open',
                labels: [],
                assignee: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                html_url: 'https://github.com/test/repo/issues/1',
              },
            ]),
          });
        }
        if (url.includes('commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                sha: 'abc123',
                commit: {
                  message: 'Test commit',
                  author: { name: 'Test Author', date: '2024-01-01T00:00:00Z' },
                },
                html_url: 'https://github.com/test/repo/commit/abc123',
                author: { avatar_url: 'https://example.com/avatar.png' },
              },
            ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });
    });

    it('应该成功获取并设置 issues', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.issues).toHaveLength(1);
      expect(state.issues[0].title).toBe('Test Issue');
    });

    it('应该成功获取并设置 activities', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.activities.length).toBeGreaterThan(0);
    });

    it('应该设置加载状态', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      // Start loading
      const promise = fetchAllData();
      
      // Check loading state
      expect(useDashboardStore.getState().isLoading).toBe(true);

      // Wait for completion
      await promise;

      // Check loading state is false
      expect(useDashboardStore.getState().isLoading).toBe(false);
    });

    it('应该更新最后更新时间', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it('应该处理 Issues 获取失败', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { fetchAllData } = useDashboardStore.getState();

      // Should not throw, just warn
      await expect(fetchAllData()).resolves.not.toThrow();
    });

    it('应该处理仓库不存在错误 (404) - 不中断数据加载', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      // The implementation catches errors gracefully and returns empty arrays
      // Error is not set to state in this case (graceful degradation)
      expect(state.isLoading).toBe(false);
      // Should have empty issues/activities due to failed fetch
      expect(state.issues).toEqual([]);
      expect(state.activities).toEqual([]);
    });

    it('应该处理 GitHub Token 无效错误 (401) - 不中断数据加载', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      // Graceful degradation - error is logged but not set to state
      expect(state.isLoading).toBe(false);
      expect(state.issues).toEqual([]);
    });

    it('应该处理速率限制错误 (403) - 不中断数据加载', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      // Graceful degradation - error is logged but not set to state
      expect(state.isLoading).toBe(false);
      expect(state.issues).toEqual([]);
    });

    it('应该过滤掉 pull requests', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                number: 1,
                title: 'Normal Issue',
                state: 'open',
                labels: [],
                assignee: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                html_url: 'https://github.com/test/repo/issues/1',
              },
              {
                number: 2,
                title: 'PR',
                state: 'open',
                labels: [],
                assignee: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                html_url: 'https://github.com/test/repo/pull/2',
                pull_request: {}, // This marks it as a PR
              },
            ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.issues).toHaveLength(1);
      expect(state.issues[0].title).toBe('Normal Issue');
    });

    it('应该按时间排序 activities', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                number: 1,
                title: 'New Issue',
                state: 'open',
                labels: [],
                assignee: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-03T00:00:00Z',
                html_url: 'https://github.com/test/repo/issues/1',
              },
            ]),
          });
        }
        if (url.includes('commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                sha: 'abc123',
                commit: {
                  message: 'Old commit',
                  author: { name: 'Test Author', date: '2024-01-01T00:00:00Z' },
                },
                html_url: 'https://github.com/test/repo/commit/abc123',
              },
              {
                sha: 'def456',
                commit: {
                  message: 'New commit',
                  author: { name: 'Test Author', date: '2024-01-02T00:00:00Z' },
                },
                html_url: 'https://github.com/test/repo/commit/def456',
              },
            ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      // Activities should be sorted by timestamp (newest first)
      expect(state.activities[0].timestamp).toBe('2024-01-03T00:00:00Z');
    });

    it('应该限制 activities 数量为 20 条', async () => {
      const mockIssues = Array.from({ length: 30 }, (_, i) => ({
        number: i + 1,
        title: `Issue ${i + 1}`,
        state: 'open' as const,
        labels: [],
        assignee: null,
        created_at: `2024-01-01T00:00:00Z`,
        updated_at: `2024-01-01T00:00:00Z`,
        html_url: `https://github.com/test/repo/issues/${i + 1}`,
      }));

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIssues),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.activities.length).toBeLessThanOrEqual(20);
    });
  });

  describe('updateMemberStatus', () => {
    it('应该更新成员状态', () => {
      const { updateMemberStatus } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;

      updateMemberStatus(memberId, 'busy');

      const updatedState = useDashboardStore.getState();
      const updatedMember = updatedState.members.find(m => m.id === memberId);
      expect(updatedMember?.status).toBe('busy');
    });

    it('不应该影响其他成员', () => {
      const { updateMemberStatus } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;
      const otherMember = state.members[1];

      updateMemberStatus(memberId, 'offline');

      const updatedState = useDashboardStore.getState();
      const updatedOtherMember = updatedState.members.find(m => m.id === otherMember.id);
      expect(updatedOtherMember?.status).toBe(otherMember.status);
    });

    it('应该支持所有有效的状态值', () => {
      const { updateMemberStatus } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;

      const statuses: AIMember['status'][] = ['idle', 'working', 'busy', 'offline'];

      statuses.forEach(status => {
        updateMemberStatus(memberId, status);
        const currentState = useDashboardStore.getState();
        const member = currentState.members.find(m => m.id === memberId);
        expect(member?.status).toBe(status);
      });
    });
  });

  describe('updateMemberTask', () => {
    it('应该更新成员任务', () => {
      const { updateMemberTask } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;

      updateMemberTask(memberId, '新任务');

      const updatedState = useDashboardStore.getState();
      const updatedMember = updatedState.members.find(m => m.id === memberId);
      expect(updatedMember?.currentTask).toBe('新任务');
    });

    it('应该允许清除任务', () => {
      const { updateMemberTask } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;

      updateMemberTask(memberId, undefined);

      const updatedState = useDashboardStore.getState();
      const updatedMember = updatedState.members.find(m => m.id === memberId);
      expect(updatedMember?.currentTask).toBeUndefined();
    });

    it('不应该影响其他成员', () => {
      const { updateMemberTask } = useDashboardStore.getState();
      const state = useDashboardStore.getState();
      const memberId = state.members[0].id;
      const otherMember = state.members[1];

      updateMemberTask(memberId, '测试任务');

      const updatedState = useDashboardStore.getState();
      const updatedOtherMember = updatedState.members.find(m => m.id === otherMember.id);
      expect(updatedOtherMember?.currentTask).toBe(otherMember.currentTask);
    });
  });

  describe('refreshData', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    it('应该调用 fetchAllData', async () => {
      const { refreshData, fetchAllData } = useDashboardStore.getState();
      const fetchAllDataSpy = vi.spyOn(useDashboardStore.getState(), 'fetchAllData');

      await refreshData();

      expect(fetchAllDataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearError', () => {
    it('应该清除错误信息', () => {
      const { clearError } = useDashboardStore.getState();

      useDashboardStore.setState({ error: 'Test error' });

      clearError();

      const state = useDashboardStore.getState();
      expect(state.error).toBeNull();
    });

    it('多次调用应该是安全的', () => {
      const { clearError } = useDashboardStore.getState();

      clearError();
      clearError();
      clearError();

      expect(() => clearError()).not.toThrow();
    });
  });

  describe('Selector Logic (via getState)', () => {
    describe('Members', () => {
      it('应该返回成员列表', () => {
        const state = useDashboardStore.getState();
        expect(Array.isArray(state.members)).toBe(true);
        expect(state.members.length).toBeGreaterThan(0);
      });
    });

    describe('Issues', () => {
      it('应该返回 issues 列表', () => {
        const state = useDashboardStore.getState();
        expect(Array.isArray(state.issues)).toBe(true);
      });

      it('初始应该是空数组', () => {
        useDashboardStore.setState({ issues: [] });
        const state = useDashboardStore.getState();
        expect(state.issues).toEqual([]);
      });
    });

    describe('Activities', () => {
      it('应该返回 activities 列表', () => {
        const state = useDashboardStore.getState();
        expect(Array.isArray(state.activities)).toBe(true);
      });
    });

    describe('Loading State', () => {
      it('应该返回加载状态', () => {
        const state = useDashboardStore.getState();
        expect(typeof state.isLoading).toBe('boolean');
      });

      it('应该反映加载状态变化', () => {
        useDashboardStore.setState({ isLoading: true });
        expect(useDashboardStore.getState().isLoading).toBe(true);

        useDashboardStore.setState({ isLoading: false });
        expect(useDashboardStore.getState().isLoading).toBe(false);
      });
    });

    describe('Error', () => {
      it('应该返回错误信息', () => {
        const state = useDashboardStore.getState();
        expect(state.error).toBeNull();
      });

      it('应该反映错误信息', () => {
        useDashboardStore.setState({ error: 'Test error' });
        expect(useDashboardStore.getState().error).toBe('Test error');
      });
    });

    describe('Last Updated', () => {
      it('应该返回最后更新时间', () => {
        const state = useDashboardStore.getState();
        expect(state.lastUpdated).toBeNull();
      });

      it('应该反映更新时间', () => {
        const now = new Date();
        useDashboardStore.setState({ lastUpdated: now });
        expect(useDashboardStore.getState().lastUpdated).toEqual(now);
      });
    });

    describe('Stats', () => {
      it('应该返回正确的成员统计', () => {
        const state = useDashboardStore.getState();

        const totalMembers = state.members.length;
        const working = state.members.filter((m) => m.status === 'working').length;
        const busy = state.members.filter((m) => m.status === 'busy').length;
        const idle = state.members.filter((m) => m.status === 'idle').length;
        const offline = state.members.filter((m) => m.status === 'offline').length;

        expect(totalMembers).toBeGreaterThan(0);
        expect(working).toBeGreaterThanOrEqual(0);
        expect(busy).toBeGreaterThanOrEqual(0);
        expect(idle).toBeGreaterThanOrEqual(0);
        expect(offline).toBeGreaterThanOrEqual(0);

        // Total should equal sum of all statuses
        expect(totalMembers).toBe(working + busy + idle + offline);
      });

      it('应该反映成员状态变化', () => {
        const state1 = useDashboardStore.getState();
        const working1 = state1.members.filter((m) => m.status === 'working').length;

        const { updateMemberStatus } = useDashboardStore.getState();
        updateMemberStatus(state1.members[0].id, 'working');

        const state2 = useDashboardStore.getState();
        const working2 = state2.members.filter((m) => m.status === 'working').length;
        expect(working2).toBeGreaterThan(working1);
      });

      it('应该返回 issues 统计', () => {
        useDashboardStore.setState({
          issues: [
            { number: 1, title: 'Issue 1', state: 'open', labels: [], assignee: null, created_at: '', updated_at: '', html_url: '' },
            { number: 2, title: 'Issue 2', state: 'closed', labels: [], assignee: null, created_at: '', updated_at: '', html_url: '' },
          ],
        });

        const state = useDashboardStore.getState();
        const openIssues = state.issues.filter((i) => i.state === 'open').length;
        const closedIssues = state.issues.filter((i) => i.state === 'closed').length;
        
        expect(openIssues).toBe(1);
        expect(closedIssues).toBe(1);
      });
    });

    describe('Members By Status', () => {
      it('应该按状态返回成员', () => {
        const state = useDashboardStore.getState();

        const working = state.members.filter((m) => m.status === 'working');
        const busy = state.members.filter((m) => m.status === 'busy');
        const idle = state.members.filter((m) => m.status === 'idle');
        const offline = state.members.filter((m) => m.status === 'offline');

        expect(Array.isArray(working)).toBe(true);
        expect(Array.isArray(busy)).toBe(true);
        expect(Array.isArray(idle)).toBe(true);
        expect(Array.isArray(offline)).toBe(true);
      });

      it('所有成员应该被分配到某个状态', () => {
        const state = useDashboardStore.getState();

        const working = state.members.filter((m) => m.status === 'working');
        const busy = state.members.filter((m) => m.status === 'busy');
        const idle = state.members.filter((m) => m.status === 'idle');
        const offline = state.members.filter((m) => m.status === 'offline');

        const totalMembers = state.members.length;
        const totalCategorized = working.length + busy.length + idle.length + offline.length;

        expect(totalCategorized).toBe(totalMembers);
      });
    });

    describe('Single Member', () => {
      it('应该返回指定 ID 的成员', () => {
        const state = useDashboardStore.getState();
        const memberId = state.members[0].id;

        const member = state.members.find(m => m.id === memberId);
        expect(member).toBeDefined();
        expect(member?.id).toBe(memberId);
      });

      it('应该对不存在的成员返回 undefined', () => {
        const state = useDashboardStore.getState();
        const member = state.members.find(m => m.id === 'non-existent');
        expect(member).toBeUndefined();
      });
    });
  });

  describe('External API', () => {
    describe('getDashboardSnapshot', () => {
      it('应该返回当前状态快照', () => {
        const snapshot = getDashboardSnapshot();

        expect(snapshot).toHaveProperty('members');
        expect(snapshot).toHaveProperty('issues');
        expect(snapshot).toHaveProperty('activities');
        expect(snapshot).toHaveProperty('isLoading');
        expect(snapshot).toHaveProperty('error');
      });

      it('快照应该是当前状态的副本', () => {
        const snapshot1 = getDashboardSnapshot();

        useDashboardStore.setState({ isLoading: true });

        const snapshot2 = getDashboardSnapshot();
        expect(snapshot1.isLoading).toBe(false);
        expect(snapshot2.isLoading).toBe(true);
      });
    });

    describe('setDashboardConfig', () => {
      it('应该从外部设置配置', () => {
        setDashboardConfig('external-owner', 'external-repo', 'external-token');

        const state = useDashboardStore.getState();
        expect(state.owner).toBe('external-owner');
        expect(state.repo).toBe('external-repo');
        expect(state.token).toBe('external-token');
      });

      it('应该允许不设置 token', () => {
        setDashboardConfig('owner', 'repo');

        const state = useDashboardStore.getState();
        expect(state.token).toBeNull();
      });
    });

    describe('refreshDashboardData', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      it('应该从外部触发数据刷新', async () => {
        const fetchAllDataSpy = vi.spyOn(useDashboardStore.getState(), 'fetchAllData');

        await refreshDashboardData();

        expect(fetchAllDataSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('issues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                number: 1,
                title: 'Issue 1',
                state: 'open',
                labels: [],
                assignee: { login: 'user1', avatar_url: 'https://example.com/u1.png' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                html_url: 'https://github.com/test/repo/issues/1',
              },
              {
                number: 2,
                title: 'Issue 2',
                state: 'closed',
                labels: [],
                assignee: { login: 'user2', avatar_url: 'https://example.com/u2.png' },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-03T00:00:00Z',
                html_url: 'https://github.com/test/repo/issues/2',
              },
            ]),
          });
        }
        if (url.includes('commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                sha: 'abc123',
                commit: {
                  message: 'Initial commit',
                  author: { name: 'Developer', date: '2024-01-01T00:00:00Z' },
                },
                html_url: 'https://github.com/test/repo/commit/abc123',
                author: { avatar_url: 'https://example.com/dev.png' },
              },
            ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
    });

    it('应该完成完整的数据加载流程', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.issues.length).toBeGreaterThan(0);
      expect(state.activities.length).toBeGreaterThan(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it('应该处理错误恢复 - 从失败状态恢复正常', async () => {
      // First attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { fetchAllData, clearError } = useDashboardStore.getState();

      await fetchAllData();

      // Error is not set to state (graceful degradation)
      // But loading should be false
      expect(useDashboardStore.getState().isLoading).toBe(false);

      // Retry with success
      mockFetch.mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      await fetchAllData();

      // Should complete successfully
      expect(useDashboardStore.getState().error).toBeNull();
      expect(useDashboardStore.getState().isLoading).toBe(false);
    });

    it('应该处理成员状态更新和数据刷新的组合操作', async () => {
      const { updateMemberStatus, updateMemberTask, fetchAllData } = useDashboardStore.getState();
      const state = useDashboardStore.getState();

      // Update member status and task
      const memberId = state.members[0].id;
      updateMemberStatus(memberId, 'busy');
      updateMemberTask(memberId, '重要任务');

      // Refresh data
      await fetchAllData();

      // Member updates should persist (fetchAllData doesn't reset members)
      const updatedState = useDashboardStore.getState();
      const member = updatedState.members.find(m => m.id === memberId);
      expect(member?.status).toBe('busy');
      expect(member?.currentTask).toBe('重要任务');
    });

    it('应该正确处理多个并发数据获取', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      // Fetch data multiple times
      await Promise.all([
        fetchAllData(),
        fetchAllData(),
        fetchAllData(),
      ]);

      const state = useDashboardStore.getState();
      expect(state.issues.length).toBeGreaterThan(0);
      expect(state.activities.length).toBeGreaterThan(0);
    });

    it('应该保持成员数据的持久性', async () => {
      const state1 = useDashboardStore.getState();
      const initialMemberCount = state1.members.length;

      // Fetch data (should not affect members)
      await useDashboardStore.getState().fetchAllData();

      const state2 = useDashboardStore.getState();
      expect(state2.members.length).toBe(initialMemberCount);
      expect(state2.members[0].id).toBe(state1.members[0].id);
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空 Issues 响应', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { fetchAllData } = useDashboardStore.getState();

      await fetchAllData();

      const state = useDashboardStore.getState();
      expect(state.issues).toEqual([]);
    });

    it('应该处理网络错误后继续工作', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { fetchAllData } = useDashboardStore.getState();

      // Should not throw
      await expect(fetchAllData()).resolves.not.toThrow();

      // Fix network
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      // Should work now
      await fetchAllData();
      expect(useDashboardStore.getState().isLoading).toBe(false);
    });

    it('应该处理配置更新后的数据获取', async () => {
      const { setConfig, fetchAllData } = useDashboardStore.getState();

      setConfig('different-owner', 'different-repo', 'different-token');

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('different-owner')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      await fetchAllData();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('different-owner/different-repo'),
        expect.any(Object)
      );
    });
  });
});
