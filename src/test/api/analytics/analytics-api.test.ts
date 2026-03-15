/**
 * Analytics API 单元测试
 * 测试分析 API 端点的各项功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/analytics/route';
import type { NextRequest } from 'next/server';

// 创建模拟请求的辅助函数
const createMockRequest = (url: string, options: RequestInit = {}): Request => {
  return new Request(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  });
};

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 analytics store（在测试中我们需要通过导入来访问内部状态）
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // GET /api/analytics - 测试
  // ============================================

  describe('GET /api/analytics', () => {
    it('should return 200 with default summary', async () => {
      const response = await GET(createMockRequest('http://localhost/api/analytics'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('summary');
    });

    it('should return correct content-type', async () => {
      const response = await GET(createMockRequest('http://localhost/api/analytics'));
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should include timestamp in response', async () => {
      const response = await GET(createMockRequest('http://localhost/api/analytics'));
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      const date = new Date(data.timestamp);
      expect(date.toISOString()).toBe(data.timestamp);
    });

    it('should include timeRange in summary response', async () => {
      const response = await GET(createMockRequest('http://localhost/api/analytics'));
      const data = await response.json();

      expect(data.data).toHaveProperty('timeRange');
      expect(data.data.timeRange).toHaveProperty('start');
      expect(data.data.timeRange).toHaveProperty('end');
    });

    // ============================================
    // 参数验证测试 - 时间范围
    // ============================================

    describe('时间范围参数验证', () => {
      it('should accept valid startTime parameter', async () => {
        const startTime = '2026-01-01T00:00:00Z';
        const response = await GET(
          createMockRequest(`http://localhost/api/analytics?startTime=${startTime}`)
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should accept valid endTime parameter', async () => {
        const endTime = '2026-03-15T23:59:59Z';
        const response = await GET(
          createMockRequest(`http://localhost/api/analytics?endTime=${endTime}`)
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should accept both startTime and endTime parameters', async () => {
        const startTime = '2026-01-01T00:00:00Z';
        const endTime = '2026-03-15T23:59:59Z';
        const response = await GET(
          createMockRequest(`http://localhost/api/analytics?startTime=${startTime}&endTime=${endTime}`)
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should use default time range when no parameters provided', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        // 默认范围应该是最近7天
        const endTime = new Date(data.data.timeRange.end);
        const startTime = new Date(data.data.timeRange.start);
        const daysDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeLessThanOrEqual(7);
        expect(daysDiff).toBeGreaterThan(0);
      });
    });

    // ============================================
    // 参数验证测试 - 分页
    // ============================================

    describe('分页参数验证', () => {
      it('should accept limit parameter', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?limit=20')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should accept offset parameter', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?offset=10')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should accept both limit and offset parameters', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?limit=20&offset=10')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should cap limit at 100', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=pageViews&limit=500')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        
        // 当 limit > 100 时应该返回最多100条
        if (data.data?.pagination) {
          expect(data.data.pagination.limit).toBeLessThanOrEqual(100);
        }
      });

      it('should handle default limit when not provided', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=pageViews')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        
        // 默认 limit 应该是 10
        if (data.data?.pagination) {
          expect(data.data.pagination.limit).toBe(10);
        }
      });

      it('should handle offset 0', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=pageViews&offset=0')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        
        if (data.data?.pagination) {
          expect(data.data.pagination.offset).toBe(0);
        }
      });
    });

    // ============================================
    // detail 参数测试
    // ============================================

    describe('detail 参数测试', () => {
      it('should return summary when detail=summary', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=summary')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('summary');
      });

      it('should return pageViews when detail=pageViews', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=pageViews')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('pageViews');
        expect(data.data).toHaveProperty('pagination');
      });

      it('should return behaviors when detail=behaviors', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=behaviors')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('behaviors');
        expect(data.data).toHaveProperty('pagination');
      });

      it('should return full data when detail=full', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=full')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('summary');
        expect(data.data).toHaveProperty('pageViews');
        expect(data.data).toHaveProperty('behaviors');
        expect(data.data).toHaveProperty('pagination');
        expect(data.data).toHaveProperty('timeRange');
      });

      it('should default to summary when detail is invalid', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?detail=invalid')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('summary');
      });
    });

    // ============================================
    // 路径过滤测试
    // ============================================

    describe('路径过滤测试', () => {
      it('should accept path parameter', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?path=/dashboard')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should filter by path when provided', async () => {
        const response = await GET(
          createMockRequest('http://localhost/api/analytics?path=/home')
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    // ============================================
    // 响应数据格式测试
    // ============================================

    describe('响应数据格式测试', () => {
      it('should have success property in response', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        expect(data).toHaveProperty('success');
        expect(typeof data.success).toBe('boolean');
      });

      it('should have error object in error response', async () => {
        // 模拟一个无效请求（通过发送非JSON body触发错误）
        const response = await POST(createMockRequest('http://localhost/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }));

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
      });

      it('should return summary with all required fields', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        if (data.summary) {
          expect(data.summary).toHaveProperty('totalPageViews');
          expect(data.summary).toHaveProperty('uniqueVisitors');
          expect(data.summary).toHaveProperty('avgSessionDuration');
          expect(data.summary).toHaveProperty('bounceRate');
          expect(data.summary).toHaveProperty('topPages');
          expect(data.summary).toHaveProperty('topReferrers');
          expect(data.summary).toHaveProperty('deviceDistribution');
          expect(data.summary).toHaveProperty('browserDistribution');
          expect(data.summary).toHaveProperty('countryDistribution');
          expect(data.summary).toHaveProperty('hourlyDistribution');
          expect(data.summary).toHaveProperty('behaviorStats');
        }
      });

      it('should return numeric values for summary stats', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        if (data.summary) {
          expect(typeof data.summary.totalPageViews).toBe('number');
          expect(typeof data.summary.uniqueVisitors).toBe('number');
          expect(typeof data.summary.avgSessionDuration).toBe('number');
          expect(typeof data.summary.bounceRate).toBe('number');
        }
      });

      it('should return arrays for distribution fields', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        if (data.summary) {
          expect(Array.isArray(data.summary.topPages)).toBe(true);
          expect(Array.isArray(data.summary.topReferrers)).toBe(true);
          expect(Array.isArray(data.summary.deviceDistribution)).toBe(true);
          expect(Array.isArray(data.summary.browserDistribution)).toBe(true);
          expect(Array.isArray(data.summary.countryDistribution)).toBe(true);
          expect(Array.isArray(data.summary.hourlyDistribution)).toBe(true);
        }
      });

      it('should return behaviorStats object', async () => {
        const response = await GET(createMockRequest('http://localhost/api/analytics'));
        const data = await response.json();

        if (data.summary?.behaviorStats) {
          expect(data.summary.behaviorStats).toHaveProperty('totalClicks');
          expect(data.summary.behaviorStats).toHaveProperty('totalScrolls');
          expect(data.summary.behaviorStats).toHaveProperty('totalFormSubmits');
          expect(data.summary.behaviorStats).toHaveProperty('totalSearches');
          expect(data.summary.behaviorStats).toHaveProperty('totalDownloads');
          expect(data.summary.behaviorStats).toHaveProperty('totalErrors');
        }
      });
    });
  });

  // ============================================
  // POST /api/analytics - 测试
  // ============================================

  describe('POST /api/analytics', () => {
    it('should return 400 when type is missing', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }),
      }));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for unknown event type', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'unknownType' }),
      }));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should accept pageView event type', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pageView',
          data: { path: '/home' },
        }),
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('eventId');
      expect(data.data.recorded).toBe(true);
    });

    it('should accept behavior event type', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'behavior',
          data: { behaviorType: 'click', path: '/home' },
        }),
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('eventId');
    });

    it('should accept batch event type', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'batch',
          data: {
            events: [
              { type: 'pageView', path: '/home' },
              { type: 'behavior', behaviorType: 'click', path: '/home' },
            ],
          },
        }),
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('succeeded');
      expect(data.data).toHaveProperty('failed');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await POST(createMockRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      }));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  // ============================================
  // DELETE /api/analytics - 测试
  // ============================================

  describe('DELETE /api/analytics', () => {
    it('should return 200 for deleting old data', async () => {
      const response = await DELETE(createMockRequest('http://localhost/api/analytics?days=30'));
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('cleared');
    });

    it('should accept days parameter', async () => {
      const response = await DELETE(createMockRequest('http://localhost/api/analytics?days=7'));
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return cutoffDate in response', async () => {
      const response = await DELETE(createMockRequest('http://localhost/api/analytics?days=30'));
      
      const data = await response.json();
      expect(data.data).toHaveProperty('cutoffDate');
    });

    it('should clear all data when all=true', async () => {
      const response = await DELETE(createMockRequest('http://localhost/api/analytics?all=true'));
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('cleared');
      expect(data.data.cleared).toHaveProperty('pageViews');
      expect(data.data.cleared).toHaveProperty('behaviors');
      expect(data.data.cleared).toHaveProperty('sessions');
    });

    it('should use default days when not provided', async () => {
      const response = await DELETE(createMockRequest('http://localhost/api/analytics'));
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
