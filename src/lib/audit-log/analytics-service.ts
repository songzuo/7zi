/**
 * 审计日志系统 - 分析服务
 * @module lib/audit-log/analytics-service
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditAggregationOptions,
  AuditAggregationResult,
  AuditAggregationItem,
  AuditTrendResult,
  AuditTrendPoint,
  AuditQueryFilter,
  UserActivityStats,
  ResourceAccessStats,
  AuditLogLevel,
  AuditEventCategory,
  AuditActionType,
} from './types.js';
import type { AuditLogStorage } from './types.js';

/**
 * 审计日志分析服务
 */
export class AuditAnalyticsService {
  constructor(private storage: AuditLogStorage) {}

  /**
   * 聚合统计
   */
  public async aggregate(options: AuditAggregationOptions): Promise<AuditAggregationResult> {
    const startTime = Date.now();

    // 获取所有事件
    const result = await this.storage.query({
      filter: { ...options.filter, timeRange: options.timeRange },
      pagination: { page: 1, pageSize: 100000 }, // 大数量
    });

    const events = result.data;
    const total = events.length;

    // 按字段分组统计
    const groups = this.groupByField(events, options.field);
    const items = this.buildAggregationItems(groups, total, options.limit);

    return {
      field: options.field,
      timeRange: options.timeRange || { start: new Date(0), end: new Date() },
      total,
      items,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 趋势分析
   */
  public async getTrends(
    timeRange: { start: Date; end: Date },
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AuditTrendResult> {
    const startTime = Date.now();

    // 获取时间范围内的事件
    const result = await this.storage.query({
      filter: { timeRange },
      pagination: { page: 1, pageSize: 100000 },
    });

    const events = result.data;
    const points = this.buildTrendPoints(events, timeRange, interval);

    return {
      timeRange,
      interval,
      points,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 用户活动统计
   */
  public async getUserActivityStats(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<UserActivityStats> {
    const result = await this.storage.query({
      filter: { userIds: [userId], timeRange },
      pagination: { page: 1, pageSize: 100000 },
    });

    const events = result.data;

    // 统计操作
    const actionCounts = new Map<AuditActionType, number>();
    const resourceCounts = new Map<string, number>();
    let successActions = 0;
    let failedActions = 0;
    let lastActivity: Date | undefined;

    for (const event of events) {
      // 操作计数
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);

      // 资源计数
      if (event.resource) {
        resourceCounts.set(
          event.resource.type,
          (resourceCounts.get(event.resource.type) || 0) + 1
        );
      }

      // 成功/失败计数
      if (event.status === 'success') {
        successActions++;
      } else if (event.status === 'failure') {
        failedActions++;
      }

      // 最后活动时间
      const timestamp = new Date(event.timestamp);
      if (!lastActivity || timestamp > lastActivity) {
        lastActivity = timestamp;
      }
    }

    // 获取用户名
    const firstEvent = events[0];
    const username = firstEvent?.user?.username;

    // 构建最常用操作列表
    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 构建最常访问资源列表
    const topResources = Array.from(resourceCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      userId,
      username,
      totalActions: events.length,
      successActions,
      failedActions,
      lastActivity: lastActivity || new Date(),
      topActions,
      topResources,
    };
  }

  /**
   * 资源访问统计
   */
  public async getResourceAccessStats(
    resourceType: string,
    resourceId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ResourceAccessStats> {
    const filter: AuditQueryFilter = {
      resourceTypes: [resourceType],
      timeRange,
    };

    if (resourceId) {
      filter.resourceIds = [resourceId];
    }

    const result = await this.storage.query({
      filter,
      pagination: { page: 1, pageSize: 100000 },
    });

    const events = result.data;

    let readCount = 0;
    let writeCount = 0;
    let deleteCount = 0;
    const uniqueUsers = new Set<string>();
    let lastAccess: Date | undefined;

    for (const event of events) {
      // 操作计数
      if (event.action === 'read') readCount++;
      else if (event.action === 'create' || event.action === 'update') writeCount++;
      else if (event.action === 'delete') deleteCount++;

      // 唯一用户
      if (event.user?.userId) {
        uniqueUsers.add(event.user.userId);
      }

      // 最后访问时间
      const timestamp = new Date(event.timestamp);
      if (!lastAccess || timestamp > lastAccess) {
        lastAccess = timestamp;
      }
    }

    return {
      resourceType,
      resourceId,
      totalAccess: events.length,
      readCount,
      writeCount,
      deleteCount,
      uniqueUsers: uniqueUsers.size,
      lastAccess: lastAccess || new Date(),
    };
  }

  /**
   * 活跃用户统计
   */
  public async getActiveUsers(
    timeRange?: { start: Date; end: Date },
    limit: number = 10
  ): Promise<Array<{ userId: string; username?: string; count: number }>> {
    const result = await this.storage.query({
      filter: { timeRange },
      pagination: { page: 1, pageSize: 100000 },
    });

    const userCounts = new Map<string, { username?: string; count: number }>();

    for (const event of result.data) {
      if (event.user?.userId) {
        const existing = userCounts.get(event.user.userId);
        userCounts.set(event.user.userId, {
          username: event.user.username || existing?.username,
          count: (existing?.count || 0) + 1,
        });
      }
    }

    return Array.from(userCounts.entries())
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 活跃资源统计
   */
  public async getActiveResources(
    timeRange?: { start: Date; end: Date },
    limit: number = 10
  ): Promise<Array<{ resourceType: string; count: number }>> {
    const result = await this.storage.query({
      filter: { timeRange },
      pagination: { page: 1, pageSize: 100000 },
    });

    const resourceCounts = new Map<string, number>();

    for (const event of result.data) {
      if (event.resource?.type) {
        resourceCounts.set(
          event.resource.type,
          (resourceCounts.get(event.resource.type) || 0) + 1
        );
      }
    }

    return Array.from(resourceCounts.entries())
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 错误率分析
   */
  public async getErrorRate(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalOperations: number;
    errorCount: number;
    errorRate: number;
    byLevel: Record<AuditLogLevel, number>;
  }> {
    const result = await this.storage.query({
      filter: { timeRange },
      pagination: { page: 1, pageSize: 100000 },
    });

    const events = result.data;
    const totalOperations = events.length;
    const byLevel: Record<AuditLogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };

    let errorCount = 0;

    for (const event of events) {
      byLevel[event.level]++;

      if (event.status === 'failure' || event.level === 'error' || event.level === 'critical') {
        errorCount++;
      }
    }

    return {
      totalOperations,
      errorCount,
      errorRate: totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0,
      byLevel,
    };
  }

  // ========== 私有方法 ==========

  /**
   * 按字段分组
   */
  private groupByField(
    events: AuditEvent[],
    field: AuditAggregationOptions['field']
  ): Map<string, AuditEvent[]> {
    const groups = new Map<string, AuditEvent[]>();

    for (const event of events) {
      const key = this.getFieldValue(event, field);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    return groups;
  }

  /**
   * 获取字段值
   */
  private getFieldValue(
    event: AuditEvent,
    field: AuditAggregationOptions['field']
  ): string {
    switch (field) {
      case 'user':
        return event.user?.userId || 'anonymous';
      case 'action':
        return event.action;
      case 'category':
        return event.category;
      case 'level':
        return event.level;
      case 'severity':
        return event.severity;
      case 'status':
        return event.status;
      case 'resource_type':
        return event.resource?.type || 'none';
      case 'hour':
        return new Date(event.timestamp).toISOString().slice(0, 13) + ':00:00';
      case 'day':
        return new Date(event.timestamp).toISOString().slice(0, 10);
      case 'week':
        const date = new Date(event.timestamp);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return new Date(event.timestamp).toISOString().slice(0, 7);
      default:
        return 'unknown';
    }
  }

  /**
   * 构建聚合结果项
   */
  private buildAggregationItems(
    groups: Map<string, AuditEvent[]>,
    total: number,
    limit?: number
  ): AuditAggregationItem[] {
    const items: AuditAggregationItem[] = [];

    for (const [key, events] of groups) {
      items.push({
        key,
        count: events.length,
        percentage: total > 0 ? (events.length / total) * 100 : 0,
      });
    }

    // 按计数降序排序
    items.sort((a, b) => b.count - a.count);

    // 限制数量
    if (limit && items.length > limit) {
      return items.slice(0, limit);
    }

    return items;
  }

  /**
   * 构建趋势数据点
   */
  private buildTrendPoints(
    events: AuditEvent[],
    timeRange: { start: Date; end: Date },
    interval: 'hour' | 'day' | 'week'
  ): AuditTrendPoint[] {
    // 生成时间点
    const points: AuditTrendPoint[] = [];
    const current = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    while (current < end) {
      const point: AuditTrendPoint = {
        timestamp: new Date(current),
        count: 0,
        successCount: 0,
        failureCount: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0, critical: 0 },
        byCategory: {
          user: 0,
          system: 0,
          business: 0,
          security: 0,
          compliance: 0,
          data: 0,
          admin: 0,
        },
      };

      points.push(point);

      // 前进到下一个时间点
      switch (interval) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
      }
    }

    // 分配事件到时间点
    for (const event of events) {
      const eventTime = new Date(event.timestamp);
      const point = this.findClosestPoint(points, eventTime, interval);

      if (point) {
        point.count++;
        if (event.status === 'success') point.successCount++;
        else if (event.status === 'failure') point.failureCount++;

        if (point.byLevel) {
          point.byLevel[event.level]++;
        }
        if (point.byCategory) {
          point.byCategory[event.category]++;
        }
      }
    }

    return points;
  }

  /**
   * 找到最近的时间点
   */
  private findClosestPoint(
    points: AuditTrendPoint[],
    time: Date,
    interval: 'hour' | 'day' | 'week'
  ): AuditTrendPoint | null {
    for (const point of points) {
      const pointTime = new Date(point.timestamp);
      let duration: number;

      switch (interval) {
        case 'hour':
          duration = 60 * 60 * 1000;
          break;
        case 'day':
          duration = 24 * 60 * 60 * 1000;
          break;
        case 'week':
          duration = 7 * 24 * 60 * 60 * 1000;
          break;
      }

      if (time >= pointTime && time < new Date(pointTime.getTime() + duration)) {
        return point;
      }
    }

    return null;
  }
}