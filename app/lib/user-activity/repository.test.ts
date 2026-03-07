/**
 * 用户活动日志 Repository 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  userActivityRepository,
  UserActivity,
  CreateUserActivityParams,
} from './repository';

// 重置仓库状态
function resetRepository() {
  // @ts-ignore - 访问私有属性进行测试
  userActivityRepository.activities = [];
  // @ts-ignore
  userActivityRepository.initialized = false;
}

describe('UserActivityRepository', () => {
  beforeEach(() => {
    resetRepository();
  });

  describe('createActivity', () => {
    it('应该创建新的活动记录', async () => {
      const params: CreateUserActivityParams = {
        userId: 'user-1',
        type: 'login',
        title: '用户登录',
        source: 'web',
      };

      const activity = await userActivityRepository.createActivity(params);

      expect(activity).toBeDefined();
      expect(activity.id).toMatch(/^ua-/);
      expect(activity.userId).toBe('user-1');
      expect(activity.type).toBe('login');
      expect(activity.title).toBe('用户登录');
      expect(activity.source).toBe('web');
      expect(activity.severity).toBe('info');
      expect(activity.timestamp).toBeInstanceOf(Date);
    });

    it('应该使用提供的严重程度', async () => {
      const activity = await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'error',
        title: '测试错误',
        severity: 'error',
      });

      expect(activity.severity).toBe('error');
    });

    it('应该存储元数据', async () => {
      const activity = await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'page_view',
        title: '浏览页面',
        metadata: { page: '/dashboard', duration: 5000 },
      });

      expect(activity.metadata).toEqual({ page: '/dashboard', duration: 5000 });
    });

    it('应该存储持续时间', async () => {
      const activity = await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'api_call',
        title: 'API 调用',
        duration: 150,
      });

      expect(activity.duration).toBe(150);
    });
  });

  describe('getActivities', () => {
    beforeEach(async () => {
      // 创建测试数据
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '用户登录',
        timestamp: new Date(),
      });
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'task_create',
        title: '创建任务',
        timestamp: new Date(Date.now() - 3600000), // 1小时前
      });
      await userActivityRepository.createActivity({
        userId: 'user-2',
        type: 'error',
        title: '错误',
        severity: 'error',
        timestamp: new Date(Date.now() - 7200000), // 2小时前
      });
    });

    it('应该返回所有活动', async () => {
      const result = await userActivityRepository.getActivities();

      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.activities.length);
    });

    it('应该按用户过滤', async () => {
      const result = await userActivityRepository.getActivities({ userId: 'user-1' });

      expect(result.activities.every((a) => a.userId === 'user-1')).toBe(true);
    });

    it('应该按类型过滤', async () => {
      const result = await userActivityRepository.getActivities({ type: 'login' });

      expect(result.activities.every((a) => a.type === 'login')).toBe(true);
    });

    it('应该按多个类型过滤', async () => {
      const result = await userActivityRepository.getActivities({
        type: ['login', 'error'],
      });

      expect(result.activities.every((a) => ['login', 'error'].includes(a.type))).toBe(true);
    });

    it('应该按严重程度过滤', async () => {
      const result = await userActivityRepository.getActivities({ severity: 'error' });

      expect(result.activities.every((a) => a.severity === 'error')).toBe(true);
    });

    it('应该按时间范围过滤', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);

      const result = await userActivityRepository.getActivities({
        startDate: hourAgo,
      });

      expect(result.activities.every((a) => a.timestamp >= hourAgo)).toBe(true);
    });

    it('应该支持搜索', async () => {
      const result = await userActivityRepository.getActivities({
        search: '登录',
      });

      expect(result.activities.every((a) => 
        a.title.includes('登录') || a.description?.includes('登录')
      )).toBe(true);
    });

    it('应该支持分页', async () => {
      const result = await userActivityRepository.getActivities({
        limit: 2,
        offset: 0,
      });

      expect(result.activities.length).toBeLessThanOrEqual(2);
      expect(result.hasMore).toBeDefined();
    });

    it('应该支持排序', async () => {
      const result = await userActivityRepository.getActivities({
        sortBy: 'timestamp',
        sortOrder: 'asc',
      });

      for (let i = 1; i < result.activities.length; i++) {
        expect(result.activities[i].timestamp.getTime())
          .toBeGreaterThanOrEqual(result.activities[i - 1].timestamp.getTime());
      }
    });
  });

  describe('getActivityById', () => {
    it('应该返回指定活动', async () => {
      const created = await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '测试',
      });

      const found = await userActivityRepository.getActivityById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('应该返回 null 如果活动不存在', async () => {
      const found = await userActivityRepository.getActivityById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('deleteActivity', () => {
    it('应该删除活动', async () => {
      const created = await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '测试',
      });

      const deleted = await userActivityRepository.deleteActivity(created.id);

      expect(deleted).toBe(true);

      const found = await userActivityRepository.getActivityById(created.id);
      expect(found).toBeNull();
    });

    it('应该返回 false 如果活动不存在', async () => {
      const deleted = await userActivityRepository.deleteActivity('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('clearUserActivities', () => {
    it('应该清除用户所有活动', async () => {
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '测试1',
      });
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'logout',
        title: '测试2',
      });
      await userActivityRepository.createActivity({
        userId: 'user-2',
        type: 'login',
        title: '测试3',
      });

      const count = await userActivityRepository.clearUserActivities('user-1');

      expect(count).toBe(2);

      const remaining = await userActivityRepository.getActivities({ userId: 'user-1' });
      expect(remaining.activities.length).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // 创建今天的活动
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '登录',
        timestamp: new Date(),
      });
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'task_create',
        title: '创建任务',
        timestamp: new Date(),
      });
      // 创建错误活动
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'error',
        title: '错误',
        severity: 'error',
        timestamp: new Date(),
      });
    });

    it('应该返回正确的统计数据', async () => {
      const stats = await userActivityRepository.getStats('user-1');

      expect(stats.totalActivities).toBeGreaterThan(0);
      expect(stats.todayActivities).toBeGreaterThan(0);
      expect(stats.byType.login).toBeGreaterThan(0);
      expect(stats.bySeverity.error).toBeGreaterThan(0);
      expect(stats.lastActivityAt).toBeInstanceOf(Date);
    });

    it('应该计算平均每日活动', async () => {
      const stats = await userActivityRepository.getStats('user-1');

      expect(stats.avgDailyActivities).toBeGreaterThanOrEqual(0);
    });

    it('应该找出最活跃的小时', async () => {
      const stats = await userActivityRepository.getStats('user-1');

      expect(stats.mostActiveHour).toBeGreaterThanOrEqual(0);
      expect(stats.mostActiveHour).toBeLessThan(24);
    });
  });

  describe('getTrend', () => {
    it('应该返回趋势数据', async () => {
      // 创建一些历史活动
      for (let i = 0; i < 7; i++) {
        await userActivityRepository.createActivity({
          userId: 'user-1',
          type: 'login',
          title: `登录 ${i}`,
          timestamp: new Date(Date.now() - i * 86400000),
        });
      }

      const trend = await userActivityRepository.getTrend('user-1', 7);

      expect(trend.length).toBe(7);
      expect(trend[0]).toHaveProperty('date');
      expect(trend[0]).toHaveProperty('count');
      expect(trend[0]).toHaveProperty('byType');
    });
  });

  describe('getTimeline', () => {
    it('应该返回时间线数据', async () => {
      await userActivityRepository.createActivity({
        userId: 'user-1',
        type: 'login',
        title: '测试',
        timestamp: new Date(),
      });

      const timeline = await userActivityRepository.getTimeline('user-1', 10);

      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('id');
      expect(timeline[0]).toHaveProperty('type');
      expect(timeline[0]).toHaveProperty('relativeTime');
      expect(timeline[0]).toHaveProperty('dateGroup');
    });

    it('应该返回包含时间信息的完整数据', async () => {
      const now = new Date();
      
      await userActivityRepository.createActivity({
        userId: 'user-timeline-test',
        type: 'login',
        title: '测试活动',
        timestamp: now,
      });

      const timeline = await userActivityRepository.getTimeline('user-timeline-test', 10);
      
      const item = timeline.find((t) => t.title === '测试活动');
      expect(item).toBeDefined();
      expect(item?.relativeTime).toBeDefined();
      expect(item?.dateGroup).toBeDefined();
    });
  });

  describe('便捷方法', () => {
    it('logPageView 应该创建页面浏览活动', async () => {
      const activity = await userActivityRepository.logPageView(
        'user-1',
        '/dashboard',
        { referrer: '/home' }
      );

      expect(activity.type).toBe('page_view');
      expect(activity.title).toContain('/dashboard');
      expect(activity.metadata?.page).toBe('/dashboard');
      expect(activity.metadata?.referrer).toBe('/home');
    });

    it('logApiCall 应该创建 API 调用活动', async () => {
      const activity = await userActivityRepository.logApiCall(
        'user-1',
        '/api/tasks',
        'GET',
        150
      );

      expect(activity.type).toBe('api_call');
      expect(activity.title).toContain('GET');
      expect(activity.title).toContain('/api/tasks');
      expect(activity.duration).toBe(150);
    });

    it('logApiCall 应该对慢请求设置警告级别', async () => {
      const activity = await userActivityRepository.logApiCall(
        'user-1',
        '/api/slow',
        'GET',
        1500
      );

      expect(activity.severity).toBe('warning');
    });

    it('logError 应该创建错误活动', async () => {
      const activity = await userActivityRepository.logError(
        'user-1',
        '网络超时',
        { code: 'TIMEOUT' }
      );

      expect(activity.type).toBe('error');
      expect(activity.severity).toBe('error');
      expect(activity.title).toContain('网络超时');
    });
  });
});