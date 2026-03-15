/**
 * Activity Store Tests
 * 活动存储单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getActivityStore, getActivityStoreSingleton } from '@/lib/activity/store';
import type { Activity, ActivityQuery, ActivityStore } from '@/lib/activity/types';

// Mock ID generator
vi.mock('@/lib/id', () => ({
  generateActivityId: () => 'act_test123',
}));

describe('ActivityStore', () => {
  let store: ActivityStore;

  beforeEach(() => {
    // 获取新的存储实例（每次都是新的内存实例）
    store = getActivityStore();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('应创建活动记录', () => {
      const activity = store.create({
        type: 'task_created',
        description: '创建了一个新任务',
      });

      expect(activity.id).toBe('act_test123');
      expect(activity.type).toBe('task_created');
      expect(activity.description).toBe('创建了一个新任务');
      expect(activity.timestamp).toBeDefined();
    });

    it('应包含用户信息', () => {
      const activity = store.create({
        type: 'user_login',
        userId: 'user-001',
        userName: '张三',
        description: '用户登录',
      });

      expect(activity.userId).toBe('user-001');
      expect(activity.userName).toBe('张三');
    });

    it('应包含目标信息', () => {
      const activity = store.create({
        type: 'task_assigned',
        targetId: 'task-001',
        targetType: 'task',
        description: '任务已分配',
      });

      expect(activity.targetId).toBe('task-001');
      expect(activity.targetType).toBe('task');
    });

    it('应支持元数据', () => {
      const activity = store.create({
        type: 'task_updated',
        description: '任务已更新',
        metadata: {
          changes: ['status', 'priority'],
          oldValue: 'pending',
          newValue: 'completed',
        },
      });

      expect(activity.metadata).toEqual({
        changes: ['status', 'priority'],
        oldValue: 'pending',
        newValue: 'completed',
      });
    });

    it('应生成有效的 ISO 时间戳', () => {
      const before = new Date().toISOString();
      const activity = store.create({
        type: 'task_created',
        description: '测试',
      });
      const after = new Date().toISOString();

      expect(activity.timestamp >= before).toBe(true);
      expect(activity.timestamp <= after).toBe(true);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // 创建测试数据
      store.create({ type: 'task_created', userId: 'user-001', description: '任务1创建' });
      store.create({ type: 'task_updated', userId: 'user-001', description: '任务1更新' });
      store.create({ type: 'task_deleted', userId: 'user-002', description: '任务2删除' });
      store.create({ type: 'project_created', userId: 'user-002', description: '项目创建' });
      store.create({ type: 'user_login', userId: 'user-003', description: '用户登录' });
    });

    it('应返回所有记录（无过滤）', () => {
      const result = store.query({});
      expect(result.activities.length).toBe(5);
      expect(result.total).toBe(5);
    });

    it('应按类型过滤', () => {
      const result = store.query({ type: 'task_created' });
      expect(result.activities.length).toBe(1);
      expect(result.activities[0].type).toBe('task_created');
    });

    it('应按多个类型过滤', () => {
      const result = store.query({ types: ['task_created', 'task_updated'] });
      expect(result.activities.length).toBe(2);
    });

    it('应按用户过滤', () => {
      const result = store.query({ userId: 'user-001' });
      expect(result.activities.length).toBe(2);
      result.activities.forEach(a => {
        expect(a.userId).toBe('user-001');
      });
    });

    it('应支持分页', () => {
      const page1 = store.query({ page: 1, limit: 2 });
      const page2 = store.query({ page: 2, limit: 2 });

      expect(page1.activities.length).toBe(2);
      expect(page1.page).toBe(1);
      expect(page1.hasMore).toBe(true);

      expect(page2.activities.length).toBe(2);
      expect(page2.page).toBe(2);
    });

    it('应支持 offset 分页', () => {
      const result = store.query({ offset: 2, limit: 2 });
      expect(result.activities.length).toBe(2);
    });

    it('应按时间戳降序排序（默认）', () => {
      const result = store.query({ orderBy: 'timestamp', order: 'desc' });
      for (let i = 1; i < result.activities.length; i++) {
        const prev = new Date(result.activities[i - 1].timestamp).getTime();
        const curr = new Date(result.activities[i].timestamp).getTime();
        expect(prev >= curr).toBe(true);
      }
    });

    it('应按时间戳升序排序', () => {
      const result = store.query({ orderBy: 'timestamp', order: 'asc' });
      for (let i = 1; i < result.activities.length; i++) {
        const prev = new Date(result.activities[i - 1].timestamp).getTime();
        const curr = new Date(result.activities[i].timestamp).getTime();
        expect(prev <= curr).toBe(true);
      }
    });

    it('应按类型排序', () => {
      const result = store.query({ orderBy: 'type', order: 'asc' });
      for (let i = 1; i < result.activities.length; i++) {
        expect(result.activities[i - 1].type <= result.activities[i].type).toBe(true);
      }
    });

    it('应支持搜索（描述）', () => {
      const result = store.query({ search: '任务' });
      expect(result.activities.length).toBe(3);
    });

    it('应支持搜索（用户名）', () => {
      // 由于没有设置 userName，搜索会匹配 type 或 description
      const result = store.query({ search: 'user_login' });
      expect(result.activities.length).toBe(1);
    });

    it('应限制最大返回数量', () => {
      const result = store.query({ limit: 1000 });
      expect(result.limit).toBeLessThanOrEqual(500);
    });
  });

  describe('query - 时间范围过滤', () => {
    beforeEach(() => {
      // 创建带不同时间的活动
      const now = Date.now();
      vi.useFakeTimers();
      
      vi.setSystemTime(now - 3 * 24 * 60 * 60 * 1000); // 3天前
      store.create({ type: 'task_created', description: '3天前' });
      
      vi.setSystemTime(now - 1 * 24 * 60 * 60 * 1000); // 1天前
      store.create({ type: 'task_updated', description: '1天前' });
      
      vi.setSystemTime(now); // 现在
      store.create({ type: 'task_completed', description: '现在' });
      
      vi.useRealTimers();
    });

    it('应按开始日期过滤', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000);
      
      const result = store.query({ startDate: yesterday.toISOString() });
      expect(result.activities.length).toBe(2);
    });

    it('应按结束日期过滤', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000);
      
      const result = store.query({ endDate: yesterday.toISOString() });
      expect(result.activities.length).toBe(2);
    });
  });

  describe('getById', () => {
    it('应通过 ID 获取活动', () => {
      const created = store.create({
        type: 'task_created',
        description: '测试任务',
      });

      const found = store.getById(created.id);
      expect(found).toEqual(created);
    });

    it('应返回 null（不存在）', () => {
      const found = store.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('应删除存在的活动', () => {
      const created = store.create({
        type: 'task_created',
        description: '待删除',
      });

      const result = store.delete(created.id);
      expect(result).toBe(true);

      const found = store.getById(created.id);
      expect(found).toBeNull();
    });

    it('应返回 false（不存在）', () => {
      const result = store.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      const now = Date.now();

      // 创建不同时间的活动
      vi.setSystemTime(now - 60 * 24 * 60 * 60 * 1000); // 60天前
      store.create({ type: 'task_created', description: '60天前' });

      vi.setSystemTime(now - 30 * 24 * 60 * 60 * 1000); // 30天前
      store.create({ type: 'task_updated', description: '30天前' });

      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000); // 10天前
      store.create({ type: 'task_completed', description: '10天前' });

      vi.useRealTimers();
    });

    it('应清理超过指定天数的记录', () => {
      const deleted = store.cleanup(20);
      expect(deleted).toBe(2); // 60天前和30天前的记录

      const remaining = store.query({});
      expect(remaining.total).toBe(1);
    });

    it('应不删除未过期的记录', () => {
      const deleted = store.cleanup(5);
      expect(deleted).toBe(0);

      const remaining = store.query({});
      expect(remaining.total).toBe(3);
    });
  });

  describe('count', () => {
    beforeEach(() => {
      store.create({ type: 'task_created', userId: 'user-001', description: '任务1' });
      store.create({ type: 'task_updated', userId: 'user-001', description: '任务2' });
      store.create({ type: 'task_completed', userId: 'user-002', description: '任务3' });
    });

    it('应统计所有记录', () => {
      expect(store.count({})).toBe(3);
    });

    it('应按类型统计', () => {
      expect(store.count({ type: 'task_created' })).toBe(1);
    });

    it('应按用户统计', () => {
      expect(store.count({ userId: 'user-001' })).toBe(2);
    });
  });
});

describe('getActivityStoreSingleton', () => {
  it('应返回单例实例', () => {
    const instance1 = getActivityStoreSingleton();
    const instance2 = getActivityStoreSingleton();
    
    expect(instance1).toBe(instance2);
  });
});
