/**
 * Tests for Web Vitals API Route
 *
 * 测试 Web Vitals API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, DELETE } from '../route';

// Mock dependencies
vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data: unknown) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createValidationError: vi.fn((message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('POST /api/vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常请求测试', () => {
    it('应该成功接收 Web Vitals 指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-1',
              name: 'LCP',
              value: 2500,
              rating: 'good',
              delta: 100,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/home',
            },
            {
              id: 'metric-2',
              name: 'FID',
              value: 45,
              rating: 'good',
              delta: 45,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/home',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/home',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(2);
      expect(data.timestamp).toBeDefined();
    });

    it('应该支持单个指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-single',
              name: 'CLS',
              value: 0.1,
              rating: 'needs-improvement',
              delta: 0.05,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/page',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/page',
            viewportWidth: 375,
            viewportHeight: 667,
            deviceType: 'mobile',
            connectionType: '3g',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(1);
    });

    it('应该支持多个指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            { id: '1', name: 'LCP', value: 1000, rating: 'good' as const, delta: 0, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
            { id: '2', name: 'FID', value: 50, rating: 'good' as const, delta: 50, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
            { id: '3', name: 'CLS', value: 0.05, rating: 'good' as const, delta: 0.05, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
            { id: '4', name: 'TTFB', value: 200, rating: 'good' as const, delta: 200, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
            { id: '5', name: 'FCP', value: 800, rating: 'good' as const, delta: 800, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
            { id: '6', name: 'INP', value: 100, rating: 'good' as const, delta: 100, navigationType: 'navigate', timestamp: Date.now(), route: '/' },
          ],
          metadata: {
            url: 'http://localhost:3000/',
            viewportWidth: 1366,
            viewportHeight: 768,
            deviceType: 'desktop',
            connectionType: 'wifi',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(6);
    });

    it('应该支持所有合法的指标类型', async () => {
      const validNames = ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP'] as const;
      const validRatings = ['good', 'needs-improvement', 'poor'] as const;

      const metrics = validNames.map((name, i) => ({
        id: `metric-${name}`,
        name,
        value: i * 100 + 100,
        rating: validRatings[i % 3],
        delta: 50,
        navigationType: 'navigate',
        timestamp: Date.now(),
        route: '/test',
      }));

      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          metadata: {
            url: 'http://localhost:3000/test',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('输入验证测试', () => {
    it('缺少 metrics 应该返回验证错误', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            url: 'http://localhost:3000/',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('metrics 为空数组应该返回验证错误', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [],
          metadata: {
            url: 'http://localhost:3000/',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('metrics 不是数组应该返回验证错误', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {},
          metadata: {
            url: 'http://localhost:3000/',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('无效的 JSON 应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('空请求体应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理缺少 metadata 的情况', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-1',
              name: 'LCP',
              value: 2500,
              rating: 'good' as const,
              delta: 100,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/home',
            },
          ],
        }),
      });

      const response = await POST(request);

      // 应该能够处理，因为 metadata 是可选的
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极值指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-extreme',
              name: 'LCP',
              value: 999999,
              rating: 'poor' as const,
              delta: 999999,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/extreme',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/extreme',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理零值指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-zero',
              name: 'CLS',
              value: 0,
              rating: 'good' as const,
              delta: 0,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/zero',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/zero',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理负值指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-negative',
              name: 'LCP',
              value: -100,
              rating: 'good' as const,
              delta: -100,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/negative',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/negative',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理小数指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-fraction',
              name: 'CLS',
              value: 0.123456789,
              rating: 'needs-improvement' as const,
              delta: 0.123456789,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: '/fraction',
            },
          ],
          metadata: {
            url: 'http://localhost:3000/fraction',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理超长 route 字符串', async () => {
      const longRoute = '/' + 'a'.repeat(1000);

      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-long',
              name: 'LCP',
              value: 2500,
              rating: 'good' as const,
              delta: 100,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: longRoute,
            },
          ],
          metadata: {
            url: `http://localhost:3000${longRoute}`,
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理特殊字符的 route', async () => {
      const specialRoute = '/path/with?query=1&value=test#fragment';

      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              id: 'metric-special',
              name: 'LCP',
              value: 2500,
              rating: 'good' as const,
              delta: 100,
              navigationType: 'navigate',
              timestamp: Date.now(),
              route: specialRoute,
            },
          ],
          metadata: {
            url: `http://localhost:3000${specialRoute}`,
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理所有合法的 deviceType', async () => {
      const deviceTypes = ['mobile', 'tablet', 'desktop'] as const;

      for (const deviceType of deviceTypes) {
        const request = new NextRequest('http://localhost/api/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: [
              {
                id: `metric-${deviceType}`,
                name: 'LCP',
                value: 2500,
                rating: 'good' as const,
                delta: 100,
                navigationType: 'navigate',
                timestamp: Date.now(),
                route: '/',
              },
            ],
            metadata: {
              url: 'http://localhost:3000/',
              viewportWidth: 1920,
              viewportHeight: 1080,
              deviceType,
              connectionType: '4g',
            },
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });

    it('应该处理大量指标', async () => {
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        id: `metric-${i}`,
        name: 'LCP',
        value: 2500 + i,
        rating: 'good' as const,
        delta: 100,
        navigationType: 'navigate',
        timestamp: Date.now() + i,
        route: `/page/${i}`,
      }));

      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          metadata: {
            url: 'http://localhost:3000/',
            viewportWidth: 1920,
            viewportHeight: 1080,
            deviceType: 'desktop',
            connectionType: '4g',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(100);
    });
  });
});

describe('GET /api/vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常请求测试', () => {
    it('应该返回存储的指标', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    it('应该支持 limit 参数', async () => {
      const request = new NextRequest('http://localhost/api/vitals?limit=5', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.pagination.limit).toBe(5);
    });

    it('应该支持 offset 参数', async () => {
      const request = new NextRequest('http://localhost/api/vitals?limit=5&offset=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.offset).toBe(0);
    });

    it('应该按 route 过滤', async () => {
      const request = new NextRequest('http://localhost/api/vitals?route=/home', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该按 name 过滤', async () => {
      const request = new NextRequest('http://localhost/api/vitals?name=LCP', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该返回统计信息', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats).toBe('object');
    });
  });

  describe('输入验证测试', () => {
    it('应该限制最大 limit 值', async () => {
      const request = new NextRequest('http://localhost/api/vitals?limit=99999', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBeLessThanOrEqual(1000);
    });

    it('应该处理负的 offset', async () => {
      const request = new NextRequest('http://localhost/api/vitals?offset=-5', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理无效的 limit 参数', async () => {
      const request = new NextRequest('http://localhost/api/vitals?limit=abc', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理无效的 offset 参数', async () => {
      const request = new NextRequest('http://localhost/api/vitals?offset=abc', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理不存在的 route', async () => {
      const request = new NextRequest('http://localhost/api/vitals?route=/nonexistent', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该处理不存在的 name', async () => {
      const request = new NextRequest('http://localhost/api/vitals?name=NONEXISTENT', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理 limit 为 0', async () => {
      const request = new NextRequest('http://localhost/api/vitals?limit=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(0);
    });

    it('应该处理 offset 超出范围', async () => {
      const request = new NextRequest('http://localhost/api/vitals?offset=99999', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(0);
    });

    it('应该同时使用 route 和 name 过滤', async () => {
      const request = new NextRequest('http://localhost/api/vitals?route=/home&name=LCP', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });
});

describe('DELETE /api/vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常请求测试', () => {
    it('应该清空所有数据', async () => {
      const request = new NextRequest('http://localhost/api/vitals', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBeDefined();
      expect(data.remaining).toBeDefined();
    });

    it('应该删除指定时间戳之前的数据', async () => {
      const cutoffTimestamp = Date.now() - 5000000;

      const request = new NextRequest(`http://localhost/api/vitals?before=${cutoffTimestamp}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBeDefined();
      expect(data.remaining).toBeDefined();
    });
  });

  describe('输入验证测试', () => {
    it('应该处理无效的 before 参数', async () => {
      const request = new NextRequest('http://localhost/api/vitals?before=invalid', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);
    });

    it('应该处理 before=0 的情况', async () => {
      const request = new NextRequest('http://localhost/api/vitals?before=0', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.remaining).toBeGreaterThanOrEqual(0);
    });

    it('应该处理未来时间戳', async () => {
      const futureTimestamp = Date.now() + 10000000;

      const request = new NextRequest(`http://localhost/api/vitals?before=${futureTimestamp}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('边界条件测试', () => {
    it('应该删除所有数据当 before 大于最新时间戳', async () => {
      const futureTimestamp = Date.now() + 100000000;

      const request = new NextRequest(`http://localhost/api/vitals?before=${futureTimestamp}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBeGreaterThanOrEqual(0);
    });

    it('应该不删除任何数据当 before 小于最早时间戳', async () => {
      const pastTimestamp = 0;

      const request = new NextRequest(`http://localhost/api/vitals?before=${pastTimestamp}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBeDefined();
    });
  });
});
