/**
 * useTeamActivity Hook 单元测试
 * Team Activity Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useTeamActivity,
  useTeamActivities,
  useTeamMembers,
  useTeamStats,
} from '@/hooks/useTeamActivity';
import type {
  TeamActivity,
  TeamMember,
  ActivityStats,
} from '@/lib/team-activity/types';

// Mock @/lib/team-activity/store
const mockAddActivity = vi.fn();
const mockSetActivities = vi.fn();
const mockSetMembers = vi.fn();
const mockUpdateMemberStatus = vi.fn();
const mockSetStats = vi.fn();
const mockSetLoading = vi.fn();
const mockSetFilters = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('@/lib/team-activity/store', () => ({
  useTeamActivityStore: vi.fn((selector) => {
    const store = {
      activities: [],
      members: [],
      stats: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      filters: {},
      addActivity: mockAddActivity,
      setActivities: mockSetActivities,
      setMembers: mockSetMembers,
      updateMemberStatus: mockUpdateMemberStatus,
      setStats: mockSetStats,
      setLoading: mockSetLoading,
      setFilters: mockSetFilters,
      clearFilters: mockClearFilters,
    };

    // Apply selector if provided
    if (selector) {
      return selector(store);
    }

    return store;
  }),
}));

// Mock @/lib/team-activity/repository
const mockGetOverview = vi.fn();
const mockGetActivities = vi.fn();

vi.mock('@/lib/team-activity/repository', () => ({
  teamActivityRepository: {
    getOverview: mockGetOverview,
    getActivities: mockGetActivities,
  },
}));

// Mock timers
vi.useFakeTimers();

// ============================================================================
// useTeamActivity Hook 测试
// ============================================================================

describe('useTeamActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    mockAddActivity.mockClear();
    mockSetActivities.mockClear();
    mockSetMembers.mockClear();
    mockUpdateMemberStatus.mockClear();
    mockSetStats.mockClear();
    mockSetLoading.mockClear();
    mockSetFilters.mockClear();
    mockClearFilters.mockClear();
    mockGetOverview.mockClear();
    mockGetActivities.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('应该初始化为默认状态', () => {
    const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

    expect(result.current.activities).toEqual([]);
    expect(result.current.members).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('应该在 autoLoad 为 true 时自动加载数据', async () => {
    const mockOverview = {
      members: [
        {
          id: 'member-1',
          name: 'Executor',
          role: 'Executor',
          status: 'online',
          provider: 'Volcengine',
          lastActiveAt: new Date().toISOString(),
          tasksCompleted: 10,
          tasksInProgress: 2,
          efficiency: 85,
        },
      ],
      activeMembers: 1,
      totalTasks: 12,
      completedTasks: 10,
      inProgressTasks: 2,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 85,
      activeProjects: 1,
      recentActivities: [],
      stats: {
        totalActivities: 5,
        todayActivities: 2,
        weekActivities: 5,
        byType: {
          task_created: 2,
          task_completed: 3,
        },
        byMember: {
          'member-1': 5,
        },
        avgCompletionTime: 2,
        productivityScore: 85,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [
        {
          id: 'activity-1',
          type: 'task_created',
          memberId: 'member-1',
          memberName: 'Executor',
          memberRole: 'Executor',
          title: '创建了新任务',
          description: '任务 #123 已创建',
          timestamp: new Date().toISOString(),
          priority: 'normal',
        },
      ],
      total: 1,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() => useTeamActivity({ autoLoad: true }));

    expect(mockSetLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    expect(mockSetMembers).toHaveBeenCalledWith(mockOverview.members);
    expect(mockSetActivities).toHaveBeenCalledWith(mockActivitiesResult.activities);
    expect(mockSetStats).toHaveBeenCalledWith(mockActivitiesResult.stats);
  });

  it('应该支持手动刷新', async () => {
    const mockOverview = {
      members: [],
      activeMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 0,
      activeProjects: 0,
      recentActivities: [],
      stats: {
        totalActivities: 0,
        todayActivities: 0,
        weekActivities: 0,
        byType: {} as any,
        byMember: {},
        avgCompletionTime: 0,
        productivityScore: 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [],
      total: 0,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetOverview).toHaveBeenCalled();
    expect(mockGetActivities).toHaveBeenCalled();
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('应该正确处理加载错误', async () => {
    const error = new Error('加载失败');
    mockGetOverview.mockRejectedValueOnce(error);
    mockGetActivities.mockRejectedValueOnce(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useTeamActivity({ autoLoad: true }));

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    consoleErrorSpy.mockRestore();
  });

  describe('addActivity', () => {
    it('应该正确添加活动', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      const newActivity: TeamActivity = {
        id: 'activity-new',
        type: 'task_completed',
        memberId: 'member-1',
        memberName: 'Executor',
        memberRole: 'Executor',
        title: '完成任务',
        description: '任务 #123 已完成',
        timestamp: new Date().toISOString(),
        priority: 'high',
      };

      act(() => {
        result.current.addActivity(newActivity);
      });

      expect(mockAddActivity).toHaveBeenCalledWith(newActivity);
    });
  });

  describe('setFilters', () => {
    it('应该设置过滤条件', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      const filters = {
        memberId: 'member-1',
        type: 'task_completed' as const,
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(mockSetFilters).toHaveBeenCalledWith(filters);
    });

    it('应该支持部分更新过滤条件', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      act(() => {
        result.current.setFilters({ memberId: 'member-1' });
      });

      act(() => {
        result.current.setFilters({ type: 'task_completed' as const });
      });

      expect(mockSetFilters).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearFilters', () => {
    it('应该清除所有过滤条件', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      act(() => {
        result.current.setFilters({
          memberId: 'member-1',
          type: 'task_completed' as const,
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(mockClearFilters).toHaveBeenCalled();
    });
  });

  describe('定时刷新', () => {
    it('应该设置定时刷新', async () => {
      const mockOverview = {
        members: [],
        activeMembers: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        teamEfficiency: 0,
        activeProjects: 0,
        recentActivities: [],
        stats: {
          totalActivities: 0,
          todayActivities: 0,
          weekActivities: 0,
          byType: {} as any,
          byMember: {},
          avgCompletionTime: 0,
          productivityScore: 0,
        },
        lastUpdated: new Date().toISOString(),
      };

      const mockActivitiesResult = {
        activities: [],
        total: 0,
        hasMore: false,
        stats: mockOverview.stats,
      };

      mockGetOverview.mockResolvedValue(mockOverview);
      mockGetActivities.mockResolvedValue(mockActivitiesResult);

      renderHook(() => useTeamActivity({ autoLoad: true, refreshInterval: 30000 }));

      // 等待初始加载
      await waitFor(() => {
        expect(mockGetOverview).toHaveBeenCalledTimes(1);
      });

      // 快进时间
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockGetOverview).toHaveBeenCalledTimes(2);
      });
    });

    it('应该在 unmount 时清除定时器', () => {
      const { unmount } = renderHook(() =>
        useTeamActivity({ autoLoad: true, refreshInterval: 30000 })
      );

      expect(mockGetOverview).toHaveBeenCalled();

      unmount();

      // 快进时间，定时器应该不会触发
      vi.advanceTimersByTime(30000);

      // 没有新的调用
      expect(mockGetOverview).toHaveBeenCalledTimes(1);
    });

    it('应该在 refreshInterval 为 0 时不设置定时器', async () => {
      const mockOverview = {
        members: [],
        activeMembers: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        teamEfficiency: 0,
        activeProjects: 0,
        recentActivities: [],
        stats: {
          totalActivities: 0,
          todayActivities: 0,
          weekActivities: 0,
          byType: {} as any,
          byMember: {},
          avgCompletionTime: 0,
          productivityScore: 0,
        },
        lastUpdated: new Date().toISOString(),
      };

      const mockActivitiesResult = {
        activities: [],
        total: 0,
        hasMore: false,
        stats: mockOverview.stats,
      };

      mockGetOverview.mockResolvedValueOnce(mockOverview);
      mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

      const { unmount } = renderHook(() =>
        useTeamActivity({ autoLoad: true, refreshInterval: 0 })
      );

      // 等待初始加载
      await waitFor(() => {
        expect(mockGetOverview).toHaveBeenCalledTimes(1);
      });

      // 快进时间，不应该有新的调用
      vi.advanceTimersByTime(30000);

      expect(mockGetOverview).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe('初始过滤条件', () => {
    it('应该在初始化时应用初始过滤条件', () => {
      const initialFilters = {
        memberId: 'member-1',
        type: 'task_completed' as const,
      };

      renderHook(() =>
        useTeamActivity({ autoLoad: false, filters: initialFilters })
      );

      expect(mockSetFilters).toHaveBeenCalledWith(initialFilters);
    });
  });
});

// ============================================================================
// useTeamActivities Hook 测试（简化版）
// ============================================================================

describe('useTeamActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回指定数量的活动', () => {
    const mockActivities: TeamActivity[] = [
      { id: '1', type: 'task_created', memberId: '1', memberName: 'Test', memberRole: 'Executor', title: '任务1', description: '描述1', timestamp: new Date().toISOString(), priority: 'normal' },
      { id: '2', type: 'task_completed', memberId: '2', memberName: 'Test2', memberRole: 'Tester', title: '任务2', description: '描述2', timestamp: new Date().toISOString(), priority: 'normal' },
      { id: '3', type: 'task_updated', memberId: '3', memberName: 'Test3', memberRole: 'Advisor', title: '任务3', description: '描述3', timestamp: new Date().toISOString(), priority: 'normal' },
    ];

    // Mock the selector to return activities
    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          activities: mockActivities,
          isLoading: false,
          error: null,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamActivities(2));

    expect(result.current.activities).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该返回加载状态', () => {
    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          activities: [],
          isLoading: true,
          error: null,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamActivities());

    expect(result.current.isLoading).toBe(true);
  });

  it('应该返回错误状态', () => {
    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          activities: [],
          isLoading: false,
          error: '加载失败',
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamActivities());

    expect(result.current.error).toBe('加载失败');
  });
});

// ============================================================================
// useTeamMembers Hook 测试（简化版）
// ============================================================================

describe('useTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回成员列表', () => {
    const mockMembers: TeamMember[] = [
      {
        id: 'member-1',
        name: 'Executor',
        role: 'Executor',
        status: 'online',
        provider: 'Volcengine',
        lastActiveAt: new Date().toISOString(),
        tasksCompleted: 10,
        tasksInProgress: 2,
        efficiency: 85,
      },
      {
        id: 'member-2',
        name: 'Tester',
        role: '测试员',
        status: 'busy',
        provider: 'MiniMax',
        lastActiveAt: new Date().toISOString(),
        tasksCompleted: 5,
        tasksInProgress: 1,
        efficiency: 90,
      },
    ];

    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          members: mockMembers,
          updateMemberStatus: mockUpdateMemberStatus,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamMembers());

    expect(result.current.members).toEqual(mockMembers);
    expect(result.current.members).toHaveLength(2);
  });

  it('应该支持更新成员状态', () => {
    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          members: [],
          updateMemberStatus: mockUpdateMemberStatus,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamMembers());

    act(() => {
      result.current.updateMemberStatus('member-1', 'offline');
    });

    expect(mockUpdateMemberStatus).toHaveBeenCalledWith('member-1', 'offline');
  });
});

// ============================================================================
// useTeamStats Hook 测试（简化版）
// ============================================================================

describe('useTeamStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回统计数据', () => {
    const mockStats: ActivityStats = {
      totalActivities: 100,
      todayActivities: 10,
      weekActivities: 50,
      byType: {
        task_created: 30,
        task_completed: 40,
        task_updated: 30,
      },
      byMember: {
        'member-1': 50,
        'member-2': 30,
        'member-3': 20,
      },
      avgCompletionTime: 2.5,
      productivityScore: 85,
    };

    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          stats: mockStats,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamStats());

    expect(result.current).toEqual(mockStats);
    expect(result.current.totalActivities).toBe(100);
    expect(result.current.todayActivities).toBe(10);
    expect(result.current.weekActivities).toBe(50);
    expect(result.current.productivityScore).toBe(85);
  });

  it('应该在统计数据为 null 时返回 null', () => {
    const { useTeamActivityStore } = require('@/lib/team-activity/store');
    useTeamActivityStore.mockImplementation((selector) => {
      if (selector) {
        const state = {
          stats: null,
        };
        return selector(state);
      }
      return {};
    });

    const { result } = renderHook(() => useTeamStats());

    expect(result.current).toBeNull();
  });
});

// ============================================================================
// 活动追踪功能测试
// ============================================================================

describe('活动追踪功能', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该追踪所有活动类型', async () => {
    const mockOverview = {
      members: [],
      activeMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 0,
      activeProjects: 0,
      recentActivities: [],
      stats: {
        totalActivities: 16,
        todayActivities: 8,
        weekActivities: 16,
        byType: {
          task_created: 3,
          task_completed: 2,
          task_updated: 2,
          task_assigned: 1,
          comment_added: 1,
          meeting_started: 1,
          meeting_ended: 1,
          status_changed: 1,
          project_created: 1,
          project_updated: 1,
          code_committed: 1,
          code_reviewed: 1,
          bug_reported: 0,
          bug_fixed: 0,
          document_created: 0,
          report_generated: 0,
        },
        byMember: {},
        avgCompletionTime: 0,
        productivityScore: 75,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [],
      total: 0,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() => useTeamActivity({ autoLoad: true }));

    await waitFor(() => {
      expect(mockSetStats).toHaveBeenCalled();
    });

    expect(mockSetStats).toHaveBeenCalledWith(mockActivitiesResult.stats);
  });

  it('应该支持不同优先级的活动', async () => {
    const mockActivitiesResult = {
      activities: [
        {
          id: '1',
          type: 'task_created',
          memberId: '1',
          memberName: 'Test',
          memberRole: 'Executor',
          title: '紧急任务',
          description: '描述',
          timestamp: new Date().toISOString(),
          priority: 'urgent' as const,
        },
        {
          id: '2',
          type: 'task_completed',
          memberId: '2',
          memberName: 'Test2',
          memberRole: 'Tester',
          title: '高优先级任务',
          description: '描述',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
        },
        {
          id: '3',
          type: 'task_updated',
          memberId: '3',
          memberName: 'Test3',
          memberRole: 'Advisor',
          title: '普通任务',
          description: '描述',
          timestamp: new Date().toISOString(),
          priority: 'normal' as const,
        },
        {
          id: '4',
          type: 'comment_added',
          memberId: '4',
          memberName: 'Test4',
          memberRole: 'Architect',
          title: '低优先级任务',
          description: '描述',
          timestamp: new Date().toISOString(),
          priority: 'low' as const,
        },
      ],
      total: 4,
      hasMore: false,
      stats: {
        totalActivities: 4,
        todayActivities: 2,
        weekActivities: 4,
        byType: {} as any,
        byMember: {},
        avgCompletionTime: 0,
        productivityScore: 80,
      },
    };

    const mockOverview = {
      members: [],
      activeMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 0,
      activeProjects: 0,
      recentActivities: [],
      stats: mockActivitiesResult.stats,
      lastUpdated: new Date().toISOString(),
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() => useTeamActivity({ autoLoad: true }));

    await waitFor(() => {
      expect(mockSetActivities).toHaveBeenCalled();
    });

    expect(mockSetActivities).toHaveBeenCalledWith(mockActivitiesResult.activities);

    // 验证所有优先级都被包含
    const priorities = mockActivitiesResult.activities.map((a) => a.priority);
    expect(priorities).toContain('urgent');
    expect(priorities).toContain('high');
    expect(priorities).toContain('normal');
    expect(priorities).toContain('low');
  });

  it('应该支持成员活动追踪', async () => {
    const mockOverview = {
      members: [
        {
          id: 'member-1',
          name: 'Executor',
          role: 'Executor',
          status: 'online',
          provider: 'Volcengine',
          lastActiveAt: new Date().toISOString(),
          tasksCompleted: 15,
          tasksInProgress: 3,
          efficiency: 92,
        },
      ],
      activeMembers: 1,
      totalTasks: 18,
      completedTasks: 15,
      inProgressTasks: 3,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 92,
      activeProjects: 1,
      recentActivities: [],
      stats: {
        totalActivities: 20,
        todayActivities: 5,
        weekActivities: 20,
        byType: {} as any,
        byMember: {
          'member-1': 20,
        },
        avgCompletionTime: 1.5,
        productivityScore: 92,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [],
      total: 0,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() => useTeamActivity({ autoLoad: true }));

    await waitFor(() => {
      expect(mockSetMembers).toHaveBeenCalled();
    });

    expect(mockSetMembers).toHaveBeenCalledWith(mockOverview.members);
    expect(mockOverview.members[0].tasksCompleted).toBe(15);
    expect(mockOverview.members[0].efficiency).toBe(92);
  });

  it('应该支持按成员过滤活动', async () => {
    const mockOverview = {
      members: [],
      activeMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 0,
      activeProjects: 0,
      recentActivities: [],
      stats: {
        totalActivities: 0,
        todayActivities: 0,
        weekActivities: 0,
        byType: {} as any,
        byMember: {},
        avgCompletionTime: 0,
        productivityScore: 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [],
      total: 0,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() =>
      useTeamActivity({
        autoLoad: true,
        filters: { memberId: 'member-1' },
      })
    );

    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalled();
    });

    expect(mockSetFilters).toHaveBeenCalledWith({ memberId: 'member-1' });
  });

  it('应该支持按类型过滤活动', async () => {
    const mockOverview = {
      members: [],
      activeMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      teamEfficiency: 0,
      activeProjects: 0,
      recentActivities: [],
      stats: {
        totalActivities: 0,
        todayActivities: 0,
        weekActivities: 0,
        byType: {} as any,
        byMember: {},
        avgCompletionTime: 0,
        productivityScore: 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockActivitiesResult = {
      activities: [],
      total: 0,
      hasMore: false,
      stats: mockOverview.stats,
    };

    mockGetOverview.mockResolvedValueOnce(mockOverview);
    mockGetActivities.mockResolvedValueOnce(mockActivitiesResult);

    const { result } = renderHook(() =>
      useTeamActivity({
        autoLoad: true,
        filters: { type: 'task_completed' },
      })
    );

    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalled();
    });

    expect(mockSetFilters).toHaveBeenCalledWith({ type: 'task_completed' });
  });
});