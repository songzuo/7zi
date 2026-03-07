'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTeamActivityStore } from '@/lib/team-activity/store';
import { teamActivityRepository } from '@/lib/team-activity/repository';
import type { TeamActivityType, ActivityPriority } from '@/lib/team-activity/types';

interface UseTeamActivityOptions {
  autoLoad?: boolean;
  wsUrl?: string;
  refreshInterval?: number;
  filters?: {
    memberId?: string;
    type?: TeamActivityType;
    priority?: ActivityPriority;
  };
}

interface UseTeamActivityReturn {
  activities: ReturnType<typeof useTeamActivityStore>['activities'];
  members: ReturnType<typeof useTeamActivityStore>['members'];
  stats: ReturnType<typeof useTeamActivityStore>['stats'];
  isLoading: ReturnType<typeof useTeamActivityStore>['isLoading'];
  error: ReturnType<typeof useTeamActivityStore>['error'];
  lastUpdated: ReturnType<typeof useTeamActivityStore>['lastUpdated'];
  refresh: () => Promise<void>;
  addActivity: (activity: Parameters<typeof useTeamActivityStore>['getState'] extends { addActivity: (a: infer A) => void } ? A : never) => void;
  setFilters: (filters: Partial<ReturnType<typeof useTeamActivityStore>['getState'] extends { filters: infer F } ? F : never>) => void;
  clearFilters: () => void;
}

/**
 * 团队活动追踪 Hook
 * 
 * 功能：
 * 1. 自动加载活动数据
 * 2. 支持实时更新（通过轮询或 WebSocket）
 * 3. 支持过滤和分页
 * 4. 缓存和状态管理
 */
export function useTeamActivity(options: UseTeamActivityOptions = {}): UseTeamActivityReturn {
  const {
    autoLoad = true,
    refreshInterval = 60000, // 默认 1 分钟刷新一次
    filters: initialFilters,
  } = options;

  const store = useTeamActivityStore();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载数据
  const refresh = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);

    try {
      // 并行加载概览数据
      const [overview, activitiesResult] = await Promise.all([
        teamActivityRepository.getOverview(),
        teamActivityRepository.getActivities({
          limit: 100,
          ...store.filters,
        }),
      ]);

      store.setMembers(overview.members);
      store.setActivities(activitiesResult.activities);
      store.setStats(activitiesResult.stats);
    } catch (error) {
      console.error('Failed to load team activity data:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // 添加活动
  const addActivity = useCallback((activity: any) => {
    store.addActivity(activity);
  }, [store]);

  // 设置过滤条件
  const setFilters = useCallback((filters: any) => {
    store.setFilters(filters);
  }, [store]);

  // 清除过滤条件
  const clearFilters = useCallback(() => {
    store.clearFilters();
  }, [store]);

  // 初始化加载
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  // 应用初始过滤条件
  useEffect(() => {
    if (initialFilters) {
      store.setFilters(initialFilters);
    }
  }, [initialFilters, store]);

  // 设置定时刷新
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshTimerRef.current = setInterval(refresh, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, refresh]);

  return {
    activities: store.activities,
    members: store.members,
    stats: store.stats,
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    refresh,
    addActivity,
    setFilters,
    clearFilters,
  };
}

/**
 * 简化版 Hook - 只获取活动列表
 */
export function useTeamActivities(limit = 50) {
  const activities = useTeamActivityStore((state) => state.activities.slice(0, limit));
  const isLoading = useTeamActivityStore((state) => state.isLoading);
  const error = useTeamActivityStore((state) => state.error);

  return { activities, isLoading, error };
}

/**
 * 简化版 Hook - 只获取成员列表
 */
export function useTeamMembers() {
  const members = useTeamActivityStore((state) => state.members);
  const updateMemberStatus = useTeamActivityStore((state) => state.updateMemberStatus);

  return { members, updateMemberStatus };
}

/**
 * 简化版 Hook - 只获取统计数据
 */
export function useTeamStats() {
  const stats = useTeamActivityStore((state) => state.stats);
  return stats;
}

export default useTeamActivity;
