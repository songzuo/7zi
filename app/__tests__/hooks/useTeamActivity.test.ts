/**
 * useTeamActivity Hook 单元测试
 * Team Activity Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type {
  TeamActivity,
  TeamMember,
  ActivityStats,
} from '@/lib/team-activity/types';

// Mock @/lib/team-activity/repository
const mockGetOverview = vi.fn();
const mockGetActivities = vi.fn();

vi.mock('@/lib/team-activity/repository', () => ({
  teamActivityRepository: {
    getOverview: (...args: any[]) => mockGetOverview(...args),
    getActivities: (...args: any[]) => mockGetActivities(...args),
  },
}));

// Mock @/lib/team-activity/store
const mockAddActivity = vi.fn();
const mockSetActivities = vi.fn();
const mockSetMembers = vi.fn();
const mockUpdateMemberStatus = vi.fn();
const mockSetStats = vi.fn();
const mockSetLoading = vi.fn();
const mockSetError = vi.fn();
const mockSetFilters = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('@/lib/team-activity/store', () => ({
  useTeamActivityStore: vi.fn(() => ({
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
    setError: mockSetError,
    setFilters: mockSetFilters,
    clearFilters: mockClearFilters,
  })),
}));

// Import after mocks
import {
  useTeamActivity,
  useTeamActivities,
  useTeamMembers,
  useTeamStats,
} from '@/hooks/useTeamActivity';

// Mock timers
vi.useFakeTimers();

// ============================================================================
// useTeamActivity Hook 测试
// ============================================================================

describe('useTeamActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
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
  });

  describe('addActivity', () => {
    it('应该正确添加活动', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      const newActivity: TeamActivity = {
        id: 'activity-new',
        type: 'task_completed' as const,
        memberId: 'member-1',
        memberName: 'Executor',
        memberRole: 'Executor' as const,
        title: '完成任务',
        description: '任务 #123 已完成',
        timestamp: new Date().toISOString(),
        priority: 'high' as const,
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
  });

  describe('clearFilters', () => {
    it('应该清除所有过滤条件', () => {
      const { result } = renderHook(() => useTeamActivity({ autoLoad: false }));

      act(() => {
        result.current.clearFilters();
      });

      expect(mockClearFilters).toHaveBeenCalled();
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

  it('应该返回活动列表和状态', () => {
    const { result } = renderHook(() => useTeamActivities());

    expect(result.current.activities).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
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

  it('应该返回成员列表和更新方法', () => {
    const { result } = renderHook(() => useTeamMembers());

    expect(result.current.members).toEqual([]);
    expect(typeof result.current.updateMemberStatus).toBe('function');
  });

  it('应该支持更新成员状态', () => {
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
    const { result } = renderHook(() => useTeamStats());

    // 初始状态为 null（因为 mock 返回 null）
    expect(result.current).toBeNull();
  });
});
