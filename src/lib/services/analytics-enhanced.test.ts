/**
 * Analytics Enhanced Service 单元测试
 * 测试实时数据、仪表板摘要和聚合计算功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateRealtimeData,
  calculateTrend,
  calculateDashboardSummary,
  aggregateData,
  clearEnhancedStore,
  addEventToStore,
  enhancedStore,
  type StoredEvent,
  type AggregatePeriod,
} from './analytics-enhanced';

// ============================================
// 测试数据工厂
// ============================================

const createMockEvent = (
  overrides: Partial<StoredEvent> = {}
): StoredEvent => ({
  type: 'pageView',
  path: '/dashboard',
  timestamp: new Date().toISOString(),
  sessionId: `session-${Math.random().toString(36).slice(2, 8)}`,
  duration: 120,
  device: 'desktop',
  ...overrides,
});

const createMockEvents = (count: number, baseTime: Date = new Date()): StoredEvent[] => {
  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(baseTime.getTime() - i * 60 * 1000); // 每分钟一个事件
    return createMockEvent({
      timestamp: timestamp.toISOString(),
      sessionId: `session-${i % 5}`, // 创建5个不同的会话
    });
  });
};

// ============================================
// calculateRealtimeData 测试
// ============================================

describe('calculateRealtimeData', () => {
  beforeEach(() => {
    clearEnhancedStore();
  });

  it('should return correct data structure', () => {
    const events = createMockEvents(10);
    const result = calculateRealtimeData(events);

    expect(result).toHaveProperty('activeUsers');
    expect(result).toHaveProperty('pageViewsLastHour');
    expect(result).toHaveProperty('pageViewsLast24Hours');
    expect(result).toHaveProperty('topActivePages');
    expect(result).toHaveProperty('recentEvents');
    expect(result).toHaveProperty('lastUpdated');

    expect(typeof result.activeUsers).toBe('number');
    expect(typeof result.pageViewsLastHour).toBe('number');
    expect(typeof result.pageViewsLast24Hours).toBe('number');
    expect(Array.isArray(result.topActivePages)).toBe(true);
    expect(Array.isArray(result.recentEvents)).toBe(true);
    expect(typeof result.lastUpdated).toBe('string');
  });

  it('should count active users correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30分钟前

    const events: StoredEvent[] = [
      createMockEvent({ sessionId: 'session-1', timestamp: oneHourAgo.toISOString() }),
      createMockEvent({ sessionId: 'session-2', timestamp: oneHourAgo.toISOString() }),
      createMockEvent({ sessionId: 'session-3', timestamp: oneHourAgo.toISOString() }),
    ];

    const result = calculateRealtimeData(events, now);
    expect(result.activeUsers).toBe(3);
  });

  it('should count page views in last hour', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: oneHourAgo.toISOString() }),
      createMockEvent({ type: 'pageView', timestamp: oneHourAgo.toISOString() }),
      createMockEvent({ type: 'pageView', timestamp: twoHoursAgo.toISOString() }), // 超过1小时
      createMockEvent({ type: 'behavior', timestamp: oneHourAgo.toISOString() }), // 不是 pageView
    ];

    const result = calculateRealtimeData(events, now);
    expect(result.pageViewsLastHour).toBe(2);
  });

  it('should count page views in last 24 hours', () => {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: twelveHoursAgo.toISOString() }),
      createMockEvent({ type: 'pageView', timestamp: twelveHoursAgo.toISOString() }),
      createMockEvent({ type: 'pageView', timestamp: twentyFiveHoursAgo.toISOString() }), // 超过24小时
    ];

    const result = calculateRealtimeData(events, now);
    expect(result.pageViewsLast24Hours).toBe(2);
  });

  it('should return top active pages sorted by count', () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const events: StoredEvent[] = [
      createMockEvent({ path: '/dashboard', timestamp: thirtyMinutesAgo.toISOString() }),
      createMockEvent({ path: '/dashboard', timestamp: thirtyMinutesAgo.toISOString() }),
      createMockEvent({ path: '/dashboard', timestamp: thirtyMinutesAgo.toISOString() }),
      createMockEvent({ path: '/tasks', timestamp: thirtyMinutesAgo.toISOString() }),
      createMockEvent({ path: '/tasks', timestamp: thirtyMinutesAgo.toISOString() }),
      createMockEvent({ path: '/settings', timestamp: thirtyMinutesAgo.toISOString() }),
    ];

    const result = calculateRealtimeData(events, now);

    expect(result.topActivePages[0].path).toBe('/dashboard');
    expect(result.topActivePages[0].activeUsers).toBe(3);
    expect(result.topActivePages[1].path).toBe('/tasks');
    expect(result.topActivePages[1].activeUsers).toBe(2);
  });

  it('should return recent events sorted by timestamp (newest first)', () => {
    const now = new Date();
    const event1 = createMockEvent({ timestamp: new Date(now.getTime() - 1000).toISOString() });
    const event2 = createMockEvent({ timestamp: new Date(now.getTime() - 2000).toISOString() });
    const event3 = createMockEvent({ timestamp: new Date(now.getTime() - 3000).toISOString() });

    const result = calculateRealtimeData([event3, event1, event2], now);

    expect(result.recentEvents[0].timestamp).toBe(event1.timestamp);
    expect(result.recentEvents[1].timestamp).toBe(event2.timestamp);
    expect(result.recentEvents[2].timestamp).toBe(event3.timestamp);
  });

  it('should return correct lastUpdated timestamp', () => {
    const now = new Date('2026-03-16T12:00:00Z');
    const result = calculateRealtimeData([], now);
    expect(result.lastUpdated).toBe('2026-03-16T12:00:00.000Z');
  });

  it('should handle empty events array', () => {
    const result = calculateRealtimeData([]);

    expect(result.activeUsers).toBe(0);
    expect(result.pageViewsLastHour).toBe(0);
    expect(result.pageViewsLast24Hours).toBe(0);
    expect(result.topActivePages).toEqual([]);
    expect(result.recentEvents).toEqual([]);
  });
});

// ============================================
// calculateTrend 测试
// ============================================

describe('calculateTrend', () => {
  it('should calculate upward trend correctly', () => {
    const result = calculateTrend(150, 100);

    expect(result.current).toBe(150);
    expect(result.previous).toBe(100);
    expect(result.change).toBe(50);
    expect(result.changePercent).toBe(50);
    expect(result.trend).toBe('up');
  });

  it('should calculate downward trend correctly', () => {
    const result = calculateTrend(80, 100);

    expect(result.current).toBe(80);
    expect(result.previous).toBe(100);
    expect(result.change).toBe(-20);
    expect(result.changePercent).toBe(-20);
    expect(result.trend).toBe('down');
  });

  it('should return stable for small changes (< 5%)', () => {
    const result = calculateTrend(103, 100);

    expect(result.changePercent).toBe(3);
    expect(result.trend).toBe('stable');
  });

  it('should handle zero previous value', () => {
    const result = calculateTrend(100, 0);

    expect(result.current).toBe(100);
    expect(result.previous).toBe(0);
    expect(result.change).toBe(100);
    expect(result.changePercent).toBe(100);
    expect(result.trend).toBe('up');
  });

  it('should return stable when both values are zero', () => {
    const result = calculateTrend(0, 0);

    expect(result.current).toBe(0);
    expect(result.previous).toBe(0);
    expect(result.change).toBe(0);
    expect(result.changePercent).toBe(0);
    expect(result.trend).toBe('stable');
  });

  it('should handle negative change from zero current', () => {
    const result = calculateTrend(0, 100);

    expect(result.current).toBe(0);
    expect(result.previous).toBe(100);
    expect(result.change).toBe(-100);
    expect(result.changePercent).toBe(-100);
    expect(result.trend).toBe('down');
  });

  it('should round changePercent to 1 decimal place', () => {
    const result = calculateTrend(123, 100);

    expect(result.changePercent).toBe(23); // 23% 而不是 23.0
  });
});

// ============================================
// calculateDashboardSummary 测试
// ============================================

describe('calculateDashboardSummary', () => {
  beforeEach(() => {
    clearEnhancedStore();
  });

  const createPeriodEvents = (periodDays: number = 7): StoredEvent[] => {
    const now = new Date();
    const events: StoredEvent[] = [];

    // 当前周期事件
    for (let i = 0; i < 10; i++) {
      events.push(
        createMockEvent({
          timestamp: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(),
          sessionId: `current-session-${i % 5}`,
          duration: 100 + i * 10,
          device: i % 3 === 0 ? 'desktop' : i % 3 === 1 ? 'mobile' : 'tablet',
        })
      );
    }

    // 上一个周期事件
    for (let i = 0; i < 5; i++) {
      events.push(
        createMockEvent({
          timestamp: new Date(
            now.getTime() - (periodDays + i) * 24 * 60 * 60 * 1000
          ).toISOString(),
          sessionId: `previous-session-${i % 3}`,
          duration: 80 + i * 5,
        })
      );
    }

    return events;
  };

  it('should return correct data structure', () => {
    const events = createPeriodEvents();
    const result = calculateDashboardSummary(events);

    expect(result).toHaveProperty('pageViews');
    expect(result).toHaveProperty('uniqueVisitors');
    expect(result).toHaveProperty('avgSessionDuration');
    expect(result).toHaveProperty('bounceRate');
    expect(result).toHaveProperty('topPages');
    expect(result).toHaveProperty('deviceBreakdown');
    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('lastUpdated');
  });

  it('should return TrendData for metrics', () => {
    const events = createPeriodEvents();
    const result = calculateDashboardSummary(events);

    ['pageViews', 'uniqueVisitors', 'avgSessionDuration', 'bounceRate'].forEach(metric => {
      const trend = result[metric as keyof typeof result] as typeof result.pageViews;
      expect(trend).toHaveProperty('current');
      expect(trend).toHaveProperty('previous');
      expect(trend).toHaveProperty('change');
      expect(trend).toHaveProperty('changePercent');
      expect(trend).toHaveProperty('trend');
      expect(['up', 'down', 'stable']).toContain(trend.trend);
    });
  });

  it('should calculate pageViews trend correctly', () => {
    const now = new Date();
    const periodDays = 7;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const events: StoredEvent[] = [
      // 当前周期: 15 个 pageView
      ...Array.from({ length: 15 }, (_, i) =>
        createMockEvent({
          type: 'pageView',
          timestamp: new Date(periodStart.getTime() + i * 60 * 60 * 1000).toISOString(),
        })
      ),
      // 上一个周期: 10 个 pageView
      ...Array.from({ length: 10 }, (_, i) =>
        createMockEvent({
          type: 'pageView',
          timestamp: new Date(previousStart.getTime() + i * 60 * 60 * 1000).toISOString(),
        })
      ),
    ];

    const result = calculateDashboardSummary(events, periodDays, now);

    expect(result.pageViews.current).toBe(15);
    expect(result.pageViews.previous).toBe(10);
    expect(result.pageViews.trend).toBe('up');
  });

  it('should calculate uniqueVisitors trend correctly', () => {
    const now = new Date();
    const periodDays = 7;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const events: StoredEvent[] = [
      // 当前周期: 3 个独立访客
      createMockEvent({ type: 'pageView', sessionId: 'user-1', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', sessionId: 'user-2', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', sessionId: 'user-3', timestamp: periodStart.toISOString() }),
      // 上一个周期: 2 个独立访客
      createMockEvent({ type: 'pageView', sessionId: 'prev-1', timestamp: previousStart.toISOString() }),
      createMockEvent({ type: 'pageView', sessionId: 'prev-2', timestamp: previousStart.toISOString() }),
    ];

    const result = calculateDashboardSummary(events, periodDays, now);

    expect(result.uniqueVisitors.current).toBe(3);
    expect(result.uniqueVisitors.previous).toBe(2);
    expect(result.uniqueVisitors.trend).toBe('up');
  });

  it('should return topPages sorted by views', () => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', path: '/dashboard', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', path: '/dashboard', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', path: '/dashboard', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', path: '/tasks', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', path: '/tasks', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', path: '/settings', timestamp: periodStart.toISOString() }),
    ];

    const result = calculateDashboardSummary(events, 7, now);

    expect(result.topPages[0].path).toBe('/dashboard');
    expect(result.topPages[0].views).toBe(3);
    expect(result.topPages[1].path).toBe('/tasks');
    expect(result.topPages[1].views).toBe(2);
  });

  it('should return deviceBreakdown with percentages', () => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', device: 'desktop', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', device: 'desktop', timestamp: periodStart.toISOString() }),
      createMockEvent({ type: 'pageView', device: 'mobile', timestamp: periodStart.toISOString() }),
    ];

    const result = calculateDashboardSummary(events, 7, now);

    expect(result.deviceBreakdown).toBeDefined();
    expect(result.deviceBreakdown.length).toBeGreaterThan(0);
    expect(result.deviceBreakdown[0]).toHaveProperty('device');
    expect(result.deviceBreakdown[0]).toHaveProperty('count');
    expect(result.deviceBreakdown[0]).toHaveProperty('percentage');
  });

  it('should return correct period range', () => {
    const now = new Date('2026-03-16T12:00:00Z');
    const periodDays = 7;
    const events = createPeriodEvents(periodDays);

    const result = calculateDashboardSummary(events, periodDays, now);

    expect(result.period.end).toBe('2026-03-16T12:00:00.000Z');
    // 验证开始时间是 7 天前
    const startDate = new Date(result.period.start);
    const endDate = new Date(result.period.end);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(daysDiff)).toBe(7);
  });

  it('should handle empty events array', () => {
    const result = calculateDashboardSummary([]);

    expect(result.pageViews.current).toBe(0);
    expect(result.pageViews.previous).toBe(0);
    expect(result.uniqueVisitors.current).toBe(0);
    expect(result.topPages).toEqual([]);
    expect(result.deviceBreakdown).toEqual([]);
  });
});

// ============================================
// aggregateData 测试
// ============================================

describe('aggregateData', () => {
  beforeEach(() => {
    clearEnhancedStore();
  });

  const createAggregateEvents = (): StoredEvent[] => {
    const now = new Date();
    const events: StoredEvent[] = [];

    // 创建跨越多天的事件
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour += 4) {
        events.push(
          createMockEvent({
            type: 'pageView',
            timestamp: new Date(
              now.getTime() - (day * 24 + hour) * 60 * 60 * 1000
            ).toISOString(),
            sessionId: `session-${day}-${hour}`,
            duration: 100 + day * 10,
          })
        );
      }
    }

    // 添加一些行为事件
    for (let i = 0; i < 10; i++) {
      events.push(
        createMockEvent({
          type: 'behavior',
          timestamp: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(),
        })
      );
    }

    return events;
  };

  it('should return correct data structure', () => {
    const events = createAggregateEvents();
    const result = aggregateData(events, 'day');

    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('totals');
    expect(result).toHaveProperty('generatedAt');

    expect(result.period).toBe('day');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.totals).toHaveProperty('pageViews');
    expect(result.totals).toHaveProperty('uniqueVisitors');
    expect(result.totals).toHaveProperty('avgDuration');
  });

  it('should aggregate by hour correctly', () => {
    const now = new Date('2026-03-16T12:00:00Z');
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-16T11:30:00Z', sessionId: 's1' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-16T11:45:00Z', sessionId: 's2' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-16T10:30:00Z', sessionId: 's3' }),
    ];

    const result = aggregateData(events, 'hour', '2026-03-16T00:00:00Z', '2026-03-16T23:59:59Z');

    expect(result.period).toBe('hour');
    // 应该有不同的小时键
    const keys = result.data.map(d => d.key);
    expect(keys.some(k => k.startsWith('2026-03-16T11'))).toBe(true);
  });

  it('should aggregate by day correctly', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-16T10:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-16T12:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-15T10:00:00Z' }),
    ];

    const result = aggregateData(events, 'day');

    expect(result.period).toBe('day');
    // 验证日期键格式
    result.data.forEach(d => {
      expect(d.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should aggregate by week correctly', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-15T10:00:00Z' }), // Sunday
      createMockEvent({ type: 'pageView', timestamp: '2026-03-14T10:00:00Z' }), // Saturday
      createMockEvent({ type: 'pageView', timestamp: '2026-03-10T10:00:00Z' }), // Monday
    ];

    const result = aggregateData(events, 'week');

    expect(result.period).toBe('week');
    // 周聚合应该返回周开始日期
    result.data.forEach(d => {
      expect(d.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('should filter by time range', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-15T10:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-10T10:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-05T10:00:00Z' }),
    ];

    const result = aggregateData(
      events,
      'day',
      '2026-03-08T00:00:00Z',
      '2026-03-16T00:00:00Z'
    );

    // 应该只包含时间范围内的事件
    result.data.forEach(d => {
      const keyDate = new Date(d.key);
      expect(keyDate >= new Date('2026-03-08')).toBe(true);
      expect(keyDate <= new Date('2026-03-16')).toBe(true);
    });
  });

  it('should throw error for invalid time range (start > end)', () => {
    const events = createAggregateEvents();

    expect(() =>
      aggregateData(events, 'day', '2026-03-15T00:00:00Z', '2026-03-10T00:00:00Z')
    ).toThrow('Invalid time range: start time must be before end time');
  });

  it('should throw error for invalid date format', () => {
    const events = createAggregateEvents();

    expect(() =>
      aggregateData(events, 'day', 'invalid-date', '2026-03-15T00:00:00Z')
    ).toThrow('Invalid time range: invalid date format');
  });

  it('should calculate totals correctly', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', sessionId: 's1', duration: 100 }),
      createMockEvent({ type: 'pageView', sessionId: 's2', duration: 200 }),
      createMockEvent({ type: 'pageView', sessionId: 's1', duration: 150 }),
    ];

    const result = aggregateData(events, 'day');

    expect(result.totals.pageViews).toBe(3);
    expect(result.totals.uniqueVisitors).toBe(2); // s1 和 s2
    expect(result.totals.avgDuration).toBe(150); // (100 + 200 + 150) / 3
  });

  it('should sort data by key (ascending)', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-15T10:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-10T10:00:00Z' }),
      createMockEvent({ type: 'pageView', timestamp: '2026-03-12T10:00:00Z' }),
    ];

    const result = aggregateData(events, 'day');

    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i].key >= result.data[i - 1].key).toBe(true);
    }
  });

  it('should handle empty events array', () => {
    const result = aggregateData([], 'day');

    expect(result.data).toEqual([]);
    expect(result.totals.pageViews).toBe(0);
    expect(result.totals.uniqueVisitors).toBe(0);
  });

  it('should include behaviors count in aggregated data', () => {
    const events: StoredEvent[] = [
      createMockEvent({ type: 'pageView', timestamp: '2026-03-15T10:00:00Z' }),
      createMockEvent({ type: 'behavior', timestamp: '2026-03-15T10:30:00Z' }),
      createMockEvent({ type: 'behavior', timestamp: '2026-03-15T11:00:00Z' }),
    ];

    const result = aggregateData(events, 'day');

    // 检查是否有行为数据
    const dayData = result.data.find(d => d.key === '2026-03-15');
    expect(dayData?.behaviors).toBe(2);
  });
});

// ============================================
// 集成测试 - enhancedStore
// ============================================

describe('enhancedStore integration', () => {
  beforeEach(() => {
    clearEnhancedStore();
  });

  it('should add events to store', () => {
    const event = createMockEvent();
    addEventToStore(event);

    expect(enhancedStore.events).toHaveLength(1);
    expect(enhancedStore.events[0]).toEqual(event);
  });

  it('should clear store', () => {
    addEventToStore(createMockEvent());
    addEventToStore(createMockEvent());

    expect(enhancedStore.events).toHaveLength(2);

    clearEnhancedStore();

    expect(enhancedStore.events).toHaveLength(0);
  });

  it('should use stored events in calculations', () => {
    const events = [createMockEvent(), createMockEvent(), createMockEvent()];
    events.forEach(e => addEventToStore(e));

    const realtimeData = calculateRealtimeData(enhancedStore.events);
    expect(realtimeData.pageViewsLastHour).toBe(3);
  });
});