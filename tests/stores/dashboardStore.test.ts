/**
 * Dashboard Store Tests
 * Tests for src/stores/dashboardStore.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDashboardStore, useDashboardStats, useMembers, getDashboardStats, getDashboardSnapshot, type AIMember, type ActivityItem } from '@/stores/dashboardStore';

// Mock GitHub API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Dashboard Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDashboardStore.setState({
      members: [],
      issues: [],
      activities: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      owner: '',
      repo: '',
      token: null,
      refreshInterval: 30000,
    });

    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    // Clean up any pending refresh intervals
    const state = useDashboardStore.getState();
    if (state.refreshInterval) {
      // Store doesn't expose cleanup, so we just reset state
    }
  });

  describe('initial state', () => {
    it('should initialize with empty data', () => {
      const state = useDashboardStore.getState();

      expect(state.members).toEqual([]);
      expect(state.issues).toEqual([]);
      expect(state.activities).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.lastUpdated).toBe(null);
    });

    it('should have default config', () => {
      const state = useDashboardStore.getState();

      expect(state.owner).toBe('');
      expect(state.repo).toBe('');
      expect(state.token).toBe(null);
      expect(state.refreshInterval).toBe(30000);
    });

    it('should have config setter', () => {
      const state = useDashboardStore.getState();

      expect(typeof state.setConfig).toBe('function');
    });

    it('should have data fetcher', () => {
      const state = useDashboardStore.getState();

      expect(typeof state.fetchAllData).toBe('function');
    });

    it('should have refresh method', () => {
      const state = useDashboardStore.getState();

      expect(typeof state.refreshData).toBe('function');
    });

    it('should have error clearer', () => {
      const state = useDashboardStore.getState();

      expect(typeof state.clearError).toBe('function');
    });
  });

  describe('setConfig', () => {
    it('should set owner, repo, and token', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('test-owner', 'test-repo', 'test-token');

      const state = useDashboardStore.getState();

      expect(state.owner).toBe('test-owner');
      expect(state.repo).toBe('test-repo');
      expect(state.token).toBe('test-token');
    });

    it('should work without token', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('test-owner', 'test-repo');

      const state = useDashboardStore.getState();

      expect(state.owner).toBe('test-owner');
      expect(state.repo).toBe('test-repo');
      expect(state.token).toBe(null);
    });

    it('should update config multiple times', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('owner1', 'repo1', 'token1');
      setConfig('owner2', 'repo2', 'token2');

      const state = useDashboardStore.getState();

      expect(state.owner).toBe('owner2');
      expect(state.repo).toBe('repo2');
      expect(state.token).toBe('token2');
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status', () => {
      const { updateMemberStatus, setConfig } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: undefined,
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberStatus('test-member', 'working');

      const state = useDashboardStore.getState();

      expect(state.members[0].status).toBe('working');
    });

    it('should not update non-existent member', () => {
      const { updateMemberStatus } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: undefined,
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberStatus('non-existent', 'working');

      const state = useDashboardStore.getState();

      expect(state.members[0].status).toBe('idle');
    });

    it('should update status to valid values', () => {
      const { updateMemberStatus } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: undefined,
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      const statuses: AIMember['status'][] = ['working', 'busy', 'idle', 'offline'];

      statuses.forEach(status => {
        updateMemberStatus('test-member', status);
        expect(useDashboardStore.getState().members[0].status).toBe(status);
      });
    });
  });

  describe('updateMemberTask', () => {
    it('should update member task', () => {
      const { updateMemberTask } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: undefined,
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberTask('test-member', '#42 New task');

      const state = useDashboardStore.getState();

      expect(state.members[0].currentTask).toBe('#42 New task');
    });

    it('should clear member task', () => {
      const { updateMemberTask } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'working',
        provider: 'minimax',
        currentTask: '#42 Old task',
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberTask('test-member', undefined);

      const state = useDashboardStore.getState();

      expect(state.members[0].currentTask).toBeUndefined();
    });

    it('should not update non-existent member', () => {
      const { updateMemberTask } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: '#42 Original',
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberTask('non-existent', '#42 New');

      const state = useDashboardStore.getState();

      expect(state.members[0].currentTask).toBe('#42 Original');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { clearError } = useDashboardStore.getState();

      useDashboardStore.setState({ error: 'Test error' });

      clearError();

      const state = useDashboardStore.getState();

      expect(state.error).toBe(null);
    });

    it('should handle null error', () => {
      const { clearError } = useDashboardStore.getState();

      expect(() => {
        clearError();
      }).not.toThrow();
    });
  });

  describe('loading state', () => {
    it('should set loading to false after successful fetch', async () => {
      const { fetchAllData, setConfig } = useDashboardStore.getState();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      setConfig('test-owner', 'test-repo');

      await fetchAllData();

      expect(useDashboardStore.getState().isLoading).toBe(false);
    });

    it('should set loading to false after failed fetch', async () => {
      const { fetchAllData, setConfig } = useDashboardStore.getState();

      mockFetch.mockRejectedValue(new Error('Network error'));

      setConfig('test-owner', 'test-repo');

      // The store catches errors internally, so this should not throw
      await fetchAllData();

      expect(useDashboardStore.getState().isLoading).toBe(false);
    });
  });

  describe('lastUpdated', () => {
    it('should update lastUpdated after successful fetch', async () => {
      const { fetchAllData, setConfig } = useDashboardStore.getState();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      setConfig('test-owner', 'test-repo');

      const beforeFetch = useDashboardStore.getState().lastUpdated;

      await fetchAllData();

      const afterFetch = useDashboardStore.getState().lastUpdated;

      expect(afterFetch).not.toBeNull();
      expect(afterFetch).not.toBe(beforeFetch);
    });
  });

  describe('useDashboardStats selector', () => {
    it('should calculate stats from members', () => {
      const testMembers: AIMember[] = [
        {
          id: 'member1',
          name: 'Member 1',
          role: 'Role 1',
          emoji: '🧪',
          status: 'working',
          provider: 'minimax',
          currentTask: '#1 Task',
          completedTasks: 10,
        },
        {
          id: 'member2',
          name: 'Member 2',
          role: 'Role 2',
          emoji: '🧪',
          status: 'busy',
          provider: 'minimax',
          currentTask: '#2 Task',
          completedTasks: 20,
        },
        {
          id: 'member3',
          name: 'Member 3',
          role: 'Role 3',
          emoji: '🧪',
          status: 'idle',
          provider: 'minimax',
          currentTask: undefined,
          completedTasks: 30,
        },
        {
          id: 'member4',
          name: 'Member 4',
          role: 'Role 4',
          emoji: '🧪',
          status: 'offline',
          provider: 'minimax',
          currentTask: undefined,
          completedTasks: 40,
        },
      ];

      useDashboardStore.setState({
        members: testMembers,
        issues: [],
      });

      const stats = getDashboardStats();

      expect(stats.totalMembers).toBe(4);
      expect(stats.working).toBe(1);
      expect(stats.busy).toBe(1);
      expect(stats.idle).toBe(1);
      expect(stats.offline).toBe(1);
    });

    it('should calculate stats from issues', () => {
      useDashboardStore.setState({
        members: [],
        issues: [
          { number: 1, state: 'open', title: 'Open Issue', user: { login: 'user' } },
          { number: 2, state: 'open', title: 'Another Open', user: { login: 'user' } },
          { number: 3, state: 'closed', title: 'Closed Issue', user: { login: 'user' } },
        ] as any[],
      });

      const stats = getDashboardStats();

      expect(stats.openIssues).toBe(2);
      expect(stats.closedIssues).toBe(1);
    });

    it('should handle empty data', () => {
      useDashboardStore.setState({
        members: [],
        issues: [],
      });

      const stats = getDashboardStats();

      expect(stats.totalMembers).toBe(0);
      expect(stats.working).toBe(0);
      expect(stats.busy).toBe(0);
      expect(stats.idle).toBe(0);
      expect(stats.offline).toBe(0);
      expect(stats.openIssues).toBe(0);
      expect(stats.closedIssues).toBe(0);
    });
  });

  describe('useMembers selector', () => {
    it('should return members from state', () => {
      const testMembers: AIMember[] = [
        {
          id: 'member1',
          name: 'Member 1',
          role: 'Role 1',
          emoji: '🧪',
          status: 'working',
          provider: 'minimax',
          currentTask: '#1 Task',
          completedTasks: 10,
        },
      ];

      useDashboardStore.setState({ members: testMembers });

      const members = getDashboardSnapshot().members;

      expect(members).toEqual(testMembers);
    });

    it('should return empty array when no members', () => {
      useDashboardStore.setState({ members: [] });

      const members = getDashboardSnapshot().members;

      expect(members).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty owner/repo', async () => {
      const { fetchAllData } = useDashboardStore.getState();

      // This should not throw, just return early or fetch empty data
      await expect(fetchAllData()).resolves.not.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      const { fetchAllData, setConfig } = useDashboardStore.getState();

      mockFetch.mockRejectedValue(new Error('API Error'));

      setConfig('test-owner', 'test-repo');

      await fetchAllData();

      const state = useDashboardStore.getState();

      // The store catches errors and sets them in state
      // Note: The store's fetchAllData uses Promise.all with .catch,
      // so it won't throw but will log warnings
      expect(state.isLoading).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const { fetchAllData, setConfig } = useDashboardStore.getState();

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      setConfig('test-owner', 'test-repo');

      await fetchAllData();

      const state = useDashboardStore.getState();

      // The store catches errors and sets them in state
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshData', () => {
    it('should call fetchAllData', async () => {
      const { refreshData, setConfig } = useDashboardStore.getState();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      setConfig('test-owner', 'test-repo');

      await refreshData();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should refresh data with current config', async () => {
      const { refreshData, setConfig } = useDashboardStore.getState();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      setConfig('test-owner', 'test-repo', 'test-token');

      await refreshData();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-owner'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('test-token'),
          }),
        })
      );
    });
  });

  describe('multiple state updates', () => {
    it('should handle rapid member updates', () => {
      const { updateMemberStatus, updateMemberTask } = useDashboardStore.getState();

      const testMember: AIMember = {
        id: 'test-member',
        name: 'Test Member',
        role: 'Tester',
        emoji: '🧪',
        status: 'idle',
        provider: 'minimax',
        currentTask: undefined,
        completedTasks: 0,
      };

      useDashboardStore.setState({ members: [testMember] });

      updateMemberStatus('test-member', 'working');
      updateMemberTask('test-member', '#1 Task');
      updateMemberStatus('test-member', 'busy');
      updateMemberTask('test-member', '#2 Task');

      const state = useDashboardStore.getState();

      expect(state.members[0].status).toBe('busy');
      expect(state.members[0].currentTask).toBe('#2 Task');
    });

    it('should handle multiple config updates', () => {
      const { setConfig } = useDashboardStore.getState();

      setConfig('owner1', 'repo1');
      setConfig('owner2', 'repo2');
      setConfig('owner3', 'repo3');

      const state = useDashboardStore.getState();

      expect(state.owner).toBe('owner3');
      expect(state.repo).toBe('repo3');
    });
  });
});
