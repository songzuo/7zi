/**
 * 用户活动日志 - 数据仓库
 */

import { randomUUID } from 'crypto';
import type {
  UserActivity,
  UserActivityStats,
  UserActivityQuery,
  CreateUserActivityParams,
  ActivityTrend,
  ActivityTimelineItem,
  UserActivityType,
  ActivitySource,
  ActivitySeverity,
} from './types';

// ========== 工具函数 ==========

/** 生成唯一 ID */
function generateId(): string {
  return `ua-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** 格式化相对时间 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return date.toLocaleDateString('zh-CN');
}

/** 获取日期分组标签 */
function getDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) return '今天';
  if (targetDate.getTime() === yesterday.getTime()) return '昨天';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/** 检查是否是今天 */
function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** 检查是否是昨天 */
function isYesterday(date: Date): boolean {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

// ========== Repository 类 ==========

class UserActivityRepository {
  private activities: UserActivity[] = [];
  private initialized = false;

  constructor() {
    this.initializeWithSampleData();
  }

  /** 初始化示例数据 */
  private initializeWithSampleData(): void {
    if (this.initialized) return;

    const userId = 'current-user';
    const now = Date.now();

    // 生成最近 7 天的活动
    const sampleActivities: CreateUserActivityParams[] = [
      // 今天
      { userId, type: 'login', title: '用户登录', source: 'web', timestamp: new Date(now - 1000 * 60 * 5) },
      { userId, type: 'page_view', title: '浏览仪表板', metadata: { page: '/dashboard' }, source: 'web', timestamp: new Date(now - 1000 * 60 * 4) },
      { userId, type: 'task_create', title: '创建任务：实现用户活动日志', source: 'web', timestamp: new Date(now - 1000 * 60 * 30) },
      { userId, type: 'task_update', title: '更新任务状态：进行中', source: 'web', timestamp: new Date(now - 1000 * 60 * 25) },
      { userId, type: 'comment_create', title: '在任务中添加评论', source: 'web', timestamp: new Date(now - 1000 * 60 * 15) },
      
      // 昨天的活动
      { userId, type: 'login', title: '用户登录', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 25) },
      { userId, type: 'file_upload', title: '上传文件：report.pdf', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 24) },
      { userId, type: 'task_complete', title: '完成任务：修复登录 Bug', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 23) },
      { userId, type: 'export', title: '导出任务报告', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 22) },
      { userId, type: 'settings_change', title: '修改通知设置', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 20) },
      
      // 前天的活动
      { userId, type: 'search', title: '搜索：用户管理', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 50) },
      { userId, type: 'page_view', title: '浏览用户列表', metadata: { page: '/users' }, source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 49) },
      { userId, type: 'profile_update', title: '更新个人资料', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 48) },
      { userId, type: 'api_call', title: 'API 调用：获取任务列表', metadata: { endpoint: '/api/tasks' }, source: 'api', timestamp: new Date(now - 1000 * 60 * 60 * 47) },
      
      // 更早的活动
      { userId, type: 'error', title: '页面加载错误', description: '网络超时', severity: 'error', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 75) },
      { userId, type: 'import', title: '导入数据：用户列表', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 100) },
      { userId, type: 'file_download', title: '下载文件：backup.zip', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 120) },
      { userId, type: 'logout', title: '用户登出', source: 'web', timestamp: new Date(now - 1000 * 60 * 60 * 150) },
    ];

    sampleActivities.forEach((params) => {
      this.activities.push({
        id: generateId(),
        ...params,
        description: params.description,
        metadata: params.metadata || {},
        source: params.source || 'web',
        severity: params.severity || 'info',
        timestamp: params.timestamp || new Date(),
        createdAt: params.timestamp || new Date(),
      });
    });

    // 按时间倒序排序
    this.activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.initialized = true;
  }

  /** 创建活动记录 */
  async createActivity(params: CreateUserActivityParams): Promise<UserActivity> {
    const activity: UserActivity = {
      id: generateId(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      description: params.description,
      metadata: params.metadata || {},
      source: params.source || 'web',
      severity: params.severity || 'info',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      sessionId: params.sessionId,
      duration: params.duration,
      timestamp: params.duration ? new Date(Date.now() - params.duration) : new Date(),
      createdAt: new Date(),
    };

    this.activities.unshift(activity);
    return activity;
  }

  /** 批量创建活动记录 */
  async createActivities(paramsList: CreateUserActivityParams[]): Promise<UserActivity[]> {
    const activities: UserActivity[] = [];
    for (const params of paramsList) {
      const activity = await this.createActivity(params);
      activities.push(activity);
    }
    return activities;
  }

  /** 获取活动列表 */
  async getActivities(query: UserActivityQuery = {}): Promise<{
    activities: UserActivity[];
    total: number;
    hasMore: boolean;
  }> {
    let filtered = [...this.activities];

    // 按用户过滤
    if (query.userId) {
      filtered = filtered.filter((a) => a.userId === query.userId);
    }

    // 按类型过滤
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      filtered = filtered.filter((a) => types.includes(a.type));
    }

    // 按来源过滤
    if (query.source) {
      filtered = filtered.filter((a) => a.source === query.source);
    }

    // 按严重程度过滤
    if (query.severity) {
      filtered = filtered.filter((a) => a.severity === query.severity);
    }

    // 按时间范围过滤
    if (query.startDate) {
      filtered = filtered.filter((a) => a.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((a) => a.timestamp <= query.endDate!);
    }

    // 搜索
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase().includes(searchLower)
      );
    }

    // 排序
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortBy === 'severity') {
        const severityOrder: Record<ActivitySeverity, number> = {
          error: 0,
          warning: 1,
          info: 2,
          success: 3,
        };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = filtered.length;
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      activities: paginated,
      total,
      hasMore: offset + limit < total,
    };
  }

  /** 获取单个活动 */
  async getActivityById(id: string): Promise<UserActivity | null> {
    return this.activities.find((a) => a.id === id) || null;
  }

  /** 删除活动 */
  async deleteActivity(id: string): Promise<boolean> {
    const index = this.activities.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.activities.splice(index, 1);
    return true;
  }

  /** 清除用户所有活动 */
  async clearUserActivities(userId: string): Promise<number> {
    const initialLength = this.activities.length;
    this.activities = this.activities.filter((a) => a.userId !== userId);
    return initialLength - this.activities.length;
  }

  /** 获取活动统计 */
  async getStats(userId?: string): Promise<UserActivityStats> {
    const activities = userId
      ? this.activities.filter((a) => a.userId === userId)
      : this.activities;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byType: Record<UserActivityType, number> = {
      login: 0, logout: 0, page_view: 0, task_create: 0, task_update: 0,
      task_delete: 0, task_complete: 0, comment_create: 0, file_upload: 0,
      file_download: 0, settings_change: 0, profile_update: 0, search: 0,
      export: 0, import: 0, error: 0, api_call: 0,
    };

    const bySource: Record<ActivitySource, number> = {
      web: 0, mobile: 0, api: 0, system: 0,
    };

    const bySeverity: Record<ActivitySeverity, number> = {
      info: 0, warning: 0, error: 0, success: 0,
    };

    const hourCounts: number[] = new Array(24).fill(0);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let lastActivityAt: Date | null = null;

    activities.forEach((a) => {
      byType[a.type]++;
      bySource[a.source]++;
      bySeverity[a.severity]++;
      hourCounts[a.timestamp.getHours()]++;

      if (a.timestamp >= today) todayCount++;
      if (a.timestamp >= weekAgo) weekCount++;
      if (a.timestamp >= monthAgo) monthCount++;

      if (!lastActivityAt || a.timestamp > lastActivityAt) {
        lastActivityAt = a.timestamp;
      }
    });

    // 计算平均每日活动数
    const daysWithData = monthCount > 0 ? 30 : 1;
    const avgDailyActivities = Math.round(activities.length / daysWithData * 10) / 10;

    // 找出最活跃的小时
    let mostActiveHour = 0;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveHour = hour;
      }
    });

    return {
      totalActivities: activities.length,
      todayActivities: todayCount,
      weekActivities: weekCount,
      monthActivities: monthCount,
      byType,
      bySource,
      bySeverity,
      avgDailyActivities,
      mostActiveHour,
      lastActivityAt,
    };
  }

  /** 获取活动趋势 */
  async getTrend(
    userId?: string,
    days: number = 7
  ): Promise<ActivityTrend[]> {
    const activities = userId
      ? this.activities.filter((a) => a.userId === userId)
      : this.activities;

    const trends: ActivityTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayActivities = activities.filter(
        (a) => a.timestamp >= dayStart && a.timestamp < dayEnd
      );

      const byType: Partial<Record<UserActivityType, number>> = {};
      dayActivities.forEach((a) => {
        byType[a.type] = (byType[a.type] || 0) + 1;
      });

      trends.push({
        date: dateStr,
        count: dayActivities.length,
        byType,
      });
    }

    return trends;
  }

  /** 获取时间线视图数据 */
  async getTimeline(
    userId?: string,
    limit: number = 50
  ): Promise<ActivityTimelineItem[]> {
    const activities = userId
      ? this.activities.filter((a) => a.userId === userId)
      : this.activities;

    return activities.slice(0, limit).map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      timestamp: a.timestamp,
      severity: a.severity,
      metadata: a.metadata,
      relativeTime: formatRelativeTime(a.timestamp),
      isToday: isToday(a.timestamp),
      isYesterday: isYesterday(a.timestamp),
      dateGroup: getDateGroup(a.timestamp),
    }));
  }

  /** 记录页面浏览 */
  async logPageView(
    userId: string,
    page: string,
    metadata?: Record<string, unknown>
  ): Promise<UserActivity> {
    return this.createActivity({
      userId,
      type: 'page_view',
      title: `浏览页面：${page}`,
      metadata: { page, ...metadata },
      source: 'web',
    });
  }

  /** 记录 API 调用 */
  async logApiCall(
    userId: string,
    endpoint: string,
    method: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<UserActivity> {
    return this.createActivity({
      userId,
      type: 'api_call',
      title: `API 调用：${method} ${endpoint}`,
      metadata: { endpoint, method, ...metadata },
      source: 'api',
      duration,
      severity: duration > 1000 ? 'warning' : 'info',
    });
  }

  /** 记录错误 */
  async logError(
    userId: string,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<UserActivity> {
    return this.createActivity({
      userId,
      type: 'error',
      title: `错误：${error}`,
      description: error,
      metadata,
      source: 'system',
      severity: 'error',
    });
  }
}

// ========== 导出单例 ==========

export const userActivityRepository = new UserActivityRepository();

export type {
  UserActivity,
  UserActivityStats,
  UserActivityQuery,
  CreateUserActivityParams,
  ActivityTrend,
  ActivityTimelineItem,
};
