/**
 * 团队活动追踪 - 状态管理 (Zustand Store)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  TeamActivity,
  TeamMember,
  ActivityStats,
  TeamActivityType,
  ActivityPriority,
  MemberStatus,
  TeamActivityState,
} from './types';

/** 生成唯一 ID */
function generateId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 创建 Store */
export const useTeamActivityStore = create<TeamActivityState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    activities: [],
    members: [],
    stats: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    filters: {},

    // Actions
    setActivities: (activities: TeamActivity[]) => {
      set({ activities, lastUpdated: new Date().toISOString() });
    },

    addActivity: (activity: TeamActivity) => {
      set((state) => {
        // 检查是否已存在
        const exists = state.activities.some((a) => a.id === activity.id);
        if (exists) return state;

        // 添加到列表开头
        const newActivities = [activity, ...state.activities].slice(0, 200); // 限制最大 200 条

        return {
          activities: newActivities,
          lastUpdated: new Date().toISOString(),
        };
      });
    },

    setMembers: (members: TeamMember[]) => {
      set({ members });
    },

    updateMemberStatus: (memberId: string, status: MemberStatus) => {
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId
            ? { ...m, status, lastActiveAt: new Date().toISOString() }
            : m
        ),
      }));
    },

    setStats: (stats: ActivityStats) => {
      set({ stats });
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    setFilters: (filters: Partial<TeamActivityState['filters']>) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
      }));
    },

    clearFilters: () => {
      set({ filters: {} });
    },
  }))
);

// ========== 选择器 ==========

/** 获取在线成员 */
export const useOnlineMembers = () =>
  useTeamActivityStore((state) =>
    state.members.filter((m) => m.status === 'online')
  );

/** 获取忙碌成员 */
export const useBusyMembers = () =>
  useTeamActivityStore((state) =>
    state.members.filter((m) => m.status === 'busy' || m.status === 'meeting')
  );

/** 获取指定成员的活动 */
export const useMemberActivities = (memberId: string) =>
  useTeamActivityStore((state) =>
    state.activities.filter((a) => a.memberId === memberId)
  );

/** 获取指定类型的活动 */
export const useActivitiesByType = (type: TeamActivityType) =>
  useTeamActivityStore((state) =>
    state.activities.filter((a) => a.type === type)
  );

/** 获取高优先级活动 */
export const useHighPriorityActivities = () =>
  useTeamActivityStore((state) =>
    state.activities.filter((a) => a.priority === 'high' || a.priority === 'urgent')
  );

/** 获取今日活动 */
export const useTodayActivities = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useTeamActivityStore((state) =>
    state.activities.filter((a) => new Date(a.timestamp) >= today)
  );
};

/** 获取本周活动 */
export const useWeekActivities = () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return useTeamActivityStore((state) =>
    state.activities.filter((a) => new Date(a.timestamp) >= weekAgo)
  );
};

/** 获取过滤后的活动 */
export const useFilteredActivities = () => {
  return useTeamActivityStore((state) => {
    let filtered = [...state.activities];

    const { memberId, type, priority, startDate, endDate } = state.filters;

    if (memberId) {
      filtered = filtered.filter((a) => a.memberId === memberId);
    }

    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }

    if (priority) {
      filtered = filtered.filter((a) => a.priority === priority);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((a) => new Date(a.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((a) => new Date(a.timestamp) <= end);
    }

    return filtered;
  });
};

// ========== 实时更新助手 ==========

/** 创建活动更新消息 */
export function createActivityUpdateMessage(
  activity: TeamActivity
): { type: 'team_activity_update'; activity: TeamActivity } {
  return {
    type: 'team_activity_update',
    activity,
  };
}

/** 创建成员状态更新消息 */
export function createMemberStatusUpdateMessage(
  memberId: string,
  status: MemberStatus
): {
  type: 'member_status_update';
  memberId: string;
  status: MemberStatus;
  timestamp: string;
} {
  return {
    type: 'member_status_update',
    memberId,
    status,
    timestamp: new Date().toISOString(),
  };
}

export type { TeamActivityState };
