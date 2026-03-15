/**
 * Activity Store
 * In-memory implementation for activity logging
 */

import type {
  Activity,
  ActivityQuery,
  ActivityQueryResult,
  ActivityStore,
} from './types';
import { generateActivityId } from '@/lib/id';

// In-memory storage
const activities: Activity[] = [];
const MAX_ACTIVITIES = 50000; // 最大存储数量

// 使用统一的 ID 生成工具 (已导入 generateActivityId)

/**
 * 创建内存存储实例
 */
export function getActivityStore(): ActivityStore {
  return {
    /**
     * 创建活动记录
     */
    create: (data: Omit<Activity, 'id' | 'timestamp'>): Activity => {
      const activity: Activity = {
        ...data,
        id: generateActivityId(),
        timestamp: new Date().toISOString(),
      };

      activities.unshift(activity); // 新记录放前面

      // 超出限制时清理旧记录
      if (activities.length > MAX_ACTIVITIES) {
        activities.splice(MAX_ACTIVITIES);
      }

      return activity;
    },

    /**
     * 查询活动记录
     */
    query: (query: ActivityQuery): ActivityQueryResult => {
      let filtered = [...activities];

      // 按类型过滤
      if (query.type) {
        filtered = filtered.filter(a => a.type === query.type);
      }
      if (query.types?.length) {
        filtered = filtered.filter(a => query.types!.includes(a.type));
      }

      // 按用户过滤
      if (query.userId) {
        filtered = filtered.filter(a => a.userId === query.userId);
      }
      if (query.userId?.length) {
        filtered = filtered.filter(a => a.userId!.includes(a.userId || ''));
      }

      // 按目标过滤
      if (query.targetId) {
        filtered = filtered.filter(a => a.targetId === query.targetId);
      }
      if (query.targetType) {
        filtered = filtered.filter(a => a.targetType === query.targetType);
      }

      // 时间范围过滤
      if (query.startDate) {
        const start = new Date(query.startDate).getTime();
        filtered = filtered.filter(a => new Date(a.timestamp).getTime() >= start);
      }
      if (query.endDate) {
        const end = new Date(query.endDate).getTime();
        filtered = filtered.filter(a => new Date(a.timestamp).getTime() <= end);
      }

      // 搜索过滤
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filtered = filtered.filter(a =>
          a.description.toLowerCase().includes(searchLower) ||
          a.userName?.toLowerCase().includes(searchLower) ||
          a.type.toLowerCase().includes(searchLower)
        );
      }

      // 排序
      const orderBy = query.orderBy || 'timestamp';
      const order = query.order || 'desc';
      filtered.sort((a, b) => {
        if (orderBy === 'timestamp') {
          const aTime = new Date(a.timestamp).getTime();
          const bTime = new Date(b.timestamp).getTime();
          return order === 'desc' ? bTime - aTime : aTime - bTime;
        }
        // 按类型排序
        return order === 'desc' 
          ? b.type.localeCompare(a.type) 
          : a.type.localeCompare(b.type);
      });

      // 分页
      const page = query.page || 1;
      const limit = Math.min(query.limit || 50, 500);
      const offset = query.offset || (page - 1) * limit;
      const paginatedActivities = filtered.slice(offset, offset + limit);

      return {
        activities: paginatedActivities,
        total: filtered.length,
        page,
        limit,
        hasMore: offset + limit < filtered.length,
      };
    },

    /**
     * 根据ID获取活动
     */
    getById: (id: string): Activity | null => {
      return activities.find(a => a.id === id) || null;
    },

    /**
     * 删除活动
     */
    delete: (id: string): boolean => {
      const index = activities.findIndex(a => a.id === id);
      if (index !== -1) {
        activities.splice(index, 1);
        return true;
      }
      return false;
    },

    /**
     * 清理旧记录
     */
    cleanup: (days: number): number => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const initialLength = activities.length;

      for (let i = activities.length - 1; i >= 0; i--) {
        if (new Date(activities[i].timestamp).getTime() < cutoff) {
          activities.splice(i, 1);
        }
      }

      return initialLength - activities.length;
    },

    /**
     * 统计记录数
     */
    count: (query: ActivityQuery): number => {
      let filtered = [...activities];

      if (query.type) {
        filtered = filtered.filter(a => a.type === query.type);
      }
      if (query.userId) {
        filtered = filtered.filter(a => a.userId === query.userId);
      }
      if (query.startDate) {
        const start = new Date(query.startDate).getTime();
        filtered = filtered.filter(a => new Date(a.timestamp).getTime() >= start);
      }
      if (query.endDate) {
        const end = new Date(query.endDate).getTime();
        filtered = filtered.filter(a => new Date(a.timestamp).getTime() <= end);
      }

      return filtered.length;
    },
  };
}

// 单例实例
let storeInstance: ActivityStore | null = null;

/**
 * 获取单例存储实例
 */
export function getActivityStoreSingleton(): ActivityStore {
  if (!storeInstance) {
    storeInstance = getActivityStore();
  }
  return storeInstance;
}
