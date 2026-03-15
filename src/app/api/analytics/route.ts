/**
 * Analytics API
 * 
 * 提供页面访问量、用户行为等统计数据
 * 支持时间范围过滤和多种聚合维度
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Analytics');

// ============================================
// 类型定义
// ============================================

interface PageViewEvent {
  id: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  duration?: number;
}

interface UserBehaviorEvent {
  id: string;
  type: 'click' | 'scroll' | 'form_submit' | 'button_click' | 'page_exit' | 'search' | 'download' | 'error';
  element?: string;
  path: string;
  data?: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number; avgDuration: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  deviceDistribution: Array<{ device: string; count: number; percentage: number }>;
  browserDistribution: Array<{ browser: string; count: number; percentage: number }>;
  countryDistribution: Array<{ country: string; count: number; percentage: number }>;
  hourlyDistribution: Array<{ hour: string; pageViews: number; visitors: number }>;
  behaviorStats: {
    totalClicks: number;
    totalScrolls: number;
    totalFormSubmits: number;
    totalSearches: number;
    totalDownloads: number;
    totalErrors: number;
  };
}

interface SessionData {
  startTime: number;
  pageViews: number;
  lastActivity: number;
}

// ============================================
// 内存存储 (生产环境应替换为数据库)
// ============================================

const MAX_EVENTS = 10000;
const SESSION_TIMEOUT = 30 * 60 * 1000;

const analyticsStore = {
  pageViews: [] as PageViewEvent[],
  behaviors: [] as UserBehaviorEvent[],
  sessions: new Map<string, SessionData>(),
};

// ============================================
// 工具函数
// ============================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseDevice(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function parseBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/opera|opr/i.test(userAgent)) return 'Opera';
  return 'Other';
}

function parseDateRange(startTime?: string, endTime?: string): { start: Date; end: Date } {
  const end = endTime ? new Date(endTime) : new Date();
  const start = startTime ? new Date(startTime) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function isInTimeRange(timestamp: string, start: Date, end: Date): boolean {
  const time = new Date(timestamp).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of analyticsStore.sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      analyticsStore.sessions.delete(sessionId);
    }
  }
}

function successResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      message,
    },
    timestamp: new Date().toISOString(),
  }, { status });
}

// ============================================
// GET /api/analytics - 获取分析数据
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startTime = searchParams.get('startTime') || undefined;
    const endTime = searchParams.get('endTime') || undefined;
    const detail = searchParams.get('detail') || 'summary';
    const path = searchParams.get('path') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    const { start, end } = parseDateRange(startTime, endTime);
    
    const filteredPageViews = analyticsStore.pageViews.filter(pv => 
      isInTimeRange(pv.timestamp, start, end) && 
      (!path || pv.path === path)
    );
    
    const filteredBehaviors = analyticsStore.behaviors.filter(b => 
      isInTimeRange(b.timestamp, start, end) &&
      (!path || b.path === path)
    );
    
    cleanupExpiredSessions();
    
    switch (detail) {
      case 'pageViews':
        return successResponse({
          pageViews: filteredPageViews.slice(offset, offset + limit),
          total: filteredPageViews.length,
          pagination: { offset, limit, total: filteredPageViews.length },
        });
        
      case 'behaviors':
        return successResponse({
          behaviors: filteredBehaviors.slice(offset, offset + limit),
          total: filteredBehaviors.length,
          pagination: { offset, limit, total: filteredBehaviors.length },
        });
        
      case 'full':
        return successResponse({
          summary: calculateSummary(filteredPageViews, filteredBehaviors),
          pageViews: filteredPageViews.slice(offset, offset + limit),
          behaviors: filteredBehaviors.slice(offset, offset + limit),
          pagination: { offset, limit, total: filteredPageViews.length },
          timeRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });
        
      case 'summary':
      default:
        return successResponse({
          summary: calculateSummary(filteredPageViews, filteredBehaviors),
          timeRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });
    }
  } catch (error) {
    logger.error('Analytics GET error', error);
    return errorResponse('Internal server error', 500);
  }
}

// ============================================
// POST /api/analytics - 记录分析事件
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;
    
    if (!type) {
      return errorResponse('Event type is required');
    }
    
    cleanupExpiredSessions();
    
    if (type === 'pageView') {
      const userAgent = request.headers.get('user-agent') || '';
      
      const event: PageViewEvent = {
        id: generateId(),
        path: data?.path || '/',
        referrer: data?.referrer || request.headers.get('referer') || undefined,
        userAgent,
        device: parseDevice(userAgent),
        browser: parseBrowser(userAgent),
        country: data?.country || undefined,
        timestamp: new Date().toISOString(),
        sessionId: data?.sessionId || undefined,
        userId: data?.userId || undefined,
        duration: data?.duration || undefined,
      };
      
      analyticsStore.pageViews.push(event);
      
      if (event.sessionId) {
        const session = analyticsStore.sessions.get(event.sessionId);
        if (session) {
          session.pageViews++;
          session.lastActivity = Date.now();
        } else {
          analyticsStore.sessions.set(event.sessionId, {
            startTime: Date.now(),
            pageViews: 1,
            lastActivity: Date.now(),
          });
        }
      }
      
      if (analyticsStore.pageViews.length > MAX_EVENTS) {
        analyticsStore.pageViews = analyticsStore.pageViews.slice(-MAX_EVENTS);
      }
      
      logger.info('Page view recorded', { path: event.path, sessionId: event.sessionId });
      
      return successResponse({ eventId: event.id, recorded: true });
    }
    
    if (type === 'behavior') {
      const event: UserBehaviorEvent = {
        id: generateId(),
        type: data?.behaviorType || 'click',
        element: data?.element || undefined,
        path: data?.path || '/',
        data: data?.data || undefined,
        timestamp: new Date().toISOString(),
        sessionId: data?.sessionId || undefined,
        userId: data?.userId || undefined,
      };
      
      analyticsStore.behaviors.push(event);
      
      if (event.sessionId) {
        const session = analyticsStore.sessions.get(event.sessionId);
        if (session) {
          session.lastActivity = Date.now();
        } else {
          analyticsStore.sessions.set(event.sessionId, {
            startTime: Date.now(),
            pageViews: 0,
            lastActivity: Date.now(),
          });
        }
      }
      
      if (analyticsStore.behaviors.length > MAX_EVENTS) {
        analyticsStore.behaviors = analyticsStore.behaviors.slice(-MAX_EVENTS);
      }
      
      logger.info('User behavior recorded', { type: event.type, path: event.path });
      
      return successResponse({ eventId: event.id, recorded: true });
    }
    
    if (type === 'batch') {
      const results: Array<{ id: string; type: string; success: boolean }> = [];
      const events = Array.isArray(data?.events) ? data.events : [];
      
      for (const evt of events) {
        try {
          if (evt.type === 'pageView') {
            const pageView: PageViewEvent = {
              id: generateId(),
              path: evt.path || '/',
              referrer: evt.referrer,
              userAgent: evt.userAgent,
              device: evt.device || 'desktop',
              browser: evt.browser || 'Other',
              timestamp: evt.timestamp || new Date().toISOString(),
              sessionId: evt.sessionId,
              userId: evt.userId,
              duration: evt.duration,
            };
            analyticsStore.pageViews.push(pageView);
            results.push({ id: pageView.id, type: 'pageView', success: true });
          } else if (evt.type === 'behavior') {
            const behavior: UserBehaviorEvent = {
              id: generateId(),
              type: evt.behaviorType || 'click',
              element: evt.element,
              path: evt.path || '/',
              data: evt.data,
              timestamp: evt.timestamp || new Date().toISOString(),
              sessionId: evt.sessionId,
              userId: evt.userId,
            };
            analyticsStore.behaviors.push(behavior);
            results.push({ id: behavior.id, type: 'behavior', success: true });
          }
        } catch {
          results.push({ id: 'failed', type: evt.type || 'unknown', success: false });
        }
      }
      
      if (analyticsStore.pageViews.length > MAX_EVENTS) {
        analyticsStore.pageViews = analyticsStore.pageViews.slice(-MAX_EVENTS);
      }
      if (analyticsStore.behaviors.length > MAX_EVENTS) {
        analyticsStore.behaviors = analyticsStore.behaviors.slice(-MAX_EVENTS);
      }
      
      logger.info('Batch events recorded', { count: results.filter(r => r.success).length });
      
      return successResponse({
        total: events.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    }
    
    return errorResponse(`Unknown event type: ${type}`);
  } catch (error) {
    logger.error('Analytics POST error', error);
    return errorResponse('Invalid request body', 400);
  }
}

// ============================================
// DELETE /api/analytics - 清理数据
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const clearAll = searchParams.get('all') === 'true';
    
    if (clearAll) {
      const clearedPageViews = analyticsStore.pageViews.length;
      const clearedBehaviors = analyticsStore.behaviors.length;
      const clearedSessions = analyticsStore.sessions.size;
      
      analyticsStore.pageViews = [];
      analyticsStore.behaviors = [];
      analyticsStore.sessions = new Map();
      
      logger.info('Analytics data cleared', { clearAll: true });
      
      return successResponse({
        cleared: {
          pageViews: clearedPageViews,
          behaviors: clearedBehaviors,
          sessions: clearedSessions,
        },
        message: 'All analytics data cleared',
      });
    }
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const originalPageViewsCount = analyticsStore.pageViews.length;
    const originalBehaviorsCount = analyticsStore.behaviors.length;
    
    analyticsStore.pageViews = analyticsStore.pageViews.filter(
      pv => new Date(pv.timestamp) >= cutoffDate
    );
    analyticsStore.behaviors = analyticsStore.behaviors.filter(
      b => new Date(b.timestamp) >= cutoffDate
    );
    
    const clearedPageViews = originalPageViewsCount - analyticsStore.pageViews.length;
    const clearedBehaviors = originalBehaviorsCount - analyticsStore.behaviors.length;
    
    logger.info('Old analytics data cleared', { days, cutoffDate: cutoffDate.toISOString() });
    
    return successResponse({
      cleared: {
        pageViews: clearedPageViews,
        behaviors: clearedBehaviors,
      },
      cutoffDate: cutoffDate.toISOString(),
      message: `Cleared analytics data older than ${days} days`,
    });
  } catch (error) {
    logger.error('Analytics DELETE error', error);
    return errorResponse('Internal server error', 500);
  }
}

// ============================================
// 辅助函数：计算汇总统计
// ============================================

function calculateSummary(
  pageViews: PageViewEvent[],
  behaviors: UserBehaviorEvent[]
): AnalyticsSummary {
  const uniqueSessions = new Set(pageViews.map(pv => pv.sessionId).filter(Boolean));
  
  const durations = pageViews.filter(pv => pv.duration).map(pv => pv.duration!);
  const avgSessionDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  const sessionPageCounts = new Map<string, number>();
  pageViews.forEach(pv => {
    if (pv.sessionId) {
      sessionPageCounts.set(pv.sessionId, (sessionPageCounts.get(pv.sessionId) || 0) + 1);
    }
  });
  const bouncedSessions = Array.from(sessionPageCounts.values()).filter(count => count === 1).length;
  const bounceRate = uniqueSessions.size > 0
    ? (bouncedSessions / uniqueSessions.size) * 100
    : 0;
  
  const pageViewCounts = new Map<string, { views: number; durations: number[] }>();
  pageViews.forEach(pv => {
    const existing = pageViewCounts.get(pv.path) || { views: 0, durations: [] };
    existing.views++;
    if (pv.duration) existing.durations.push(pv.duration);
    pageViewCounts.set(pv.path, existing);
  });
  const topPages = Array.from(pageViewCounts.entries())
    .map(([path, data]) => ({
      path,
      views: data.views,
      avgDuration: data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  
  const referrerCounts = new Map<string, number>();
  pageViews.forEach(pv => {
    if (pv.referrer) {
      try {
        const url = new URL(pv.referrer);
        const domain = url.hostname;
        referrerCounts.set(domain, (referrerCounts.get(domain) || 0) + 1);
      } catch {
        referrerCounts.set('(direct)', (referrerCounts.get('(direct)') || 0) + 1);
      }
    } else {
      referrerCounts.set('(direct)', (referrerCounts.get('(direct)') || 0) + 1);
    }
  });
  const topReferrers = Array.from(referrerCounts.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const deviceCounts = new Map<string, number>();
  pageViews.forEach(pv => {
    if (pv.device) {
      deviceCounts.set(pv.device, (deviceCounts.get(pv.device) || 0) + 1);
    }
  });
  const totalDevices = Array.from(deviceCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const deviceDistribution = Array.from(deviceCounts.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: Math.round((count / totalDevices) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);
  
  const browserCounts = new Map<string, number>();
  pageViews.forEach(pv => {
    if (pv.browser) {
      browserCounts.set(pv.browser, (browserCounts.get(pv.browser) || 0) + 1);
    }
  });
  const totalBrowsers = Array.from(browserCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const browserDistribution = Array.from(browserCounts.entries())
    .map(([browser, count]) => ({
      browser,
      count,
      percentage: Math.round((count / totalBrowsers) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);
  
  const countryCounts = new Map<string, number>();
  pageViews.forEach(pv => {
    if (pv.country) {
      countryCounts.set(pv.country, (countryCounts.get(pv.country) || 0) + 1);
    }
  });
  const totalCountries = Array.from(countryCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const countryDistribution = Array.from(countryCounts.entries())
    .map(([country, count]) => ({
      country,
      count,
      percentage: Math.round((count / totalCountries) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const hourlyData = new Map<string, { pageViews: number; sessions: Set<string> }>();
  pageViews.forEach(pv => {
    const hour = pv.timestamp.slice(0, 13);
    const existing = hourlyData.get(hour) || { pageViews: 0, sessions: new Set() };
    existing.pageViews++;
    if (pv.sessionId) existing.sessions.add(pv.sessionId);
    hourlyData.set(hour, existing);
  });
  const hourlyDistribution = Array.from(hourlyData.entries())
    .map(([hour, data]) => ({
      hour,
      pageViews: data.pageViews,
      visitors: data.sessions.size,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
    .slice(-24);
  
  const behaviorStats = {
    totalClicks: behaviors.filter(b => b.type === 'click' || b.type === 'button_click').length,
    totalScrolls: behaviors.filter(b => b.type === 'scroll').length,
    totalFormSubmits: behaviors.filter(b => b.type === 'form_submit').length,
    totalSearches: behaviors.filter(b => b.type === 'search').length,
    totalDownloads: behaviors.filter(b => b.type === 'download').length,
    totalErrors: behaviors.filter(b => b.type === 'error').length,
  };
  
  return {
    totalPageViews: pageViews.length,
    uniqueVisitors: uniqueSessions.size,
    avgSessionDuration: Math.round(avgSessionDuration),
    bounceRate: Math.round(bounceRate * 10) / 10,
    topPages,
    topReferrers,
    deviceDistribution,
    browserDistribution,
    countryDistribution,
    hourlyDistribution,
    behaviorStats,
  };
}
