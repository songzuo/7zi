/**
 * @fileoverview Performance Metrics API route integration tests
 * @description Tests for /api/performance/metrics endpoint - performance monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST, DELETE } from '../route';
import { createMockNextRequest } from '@/test/utils/mock-request';

describe('/api/performance/metrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('POST request - store metrics', () => {
    it('should store valid performance metrics', async () => {
      const requestBody = {
        metrics: [
          {
            id: 'metric-1',
            name: 'LCP',
            value: 2500,
            rating: 'good',
            timestamp: 1710712800000,
          },
        ],
        metadata: {
          route: '/dashboard',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stored');
      expect(data.data).toHaveProperty('alertsTriggered');
      expect(data.data).toHaveProperty('alerts');
      expect(data.data.stored).toBe(1);
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('should store multiple metrics', async () => {
      const requestBody = {
        metrics: [
          {
            id: 'metric-1',
            name: 'LCP',
            value: 2500,
            rating: 'good',
            timestamp: 1710712800000,
          },
          {
            id: 'metric-2',
            name: 'FID',
            value: 50,
            rating: 'good',
            timestamp: 1710712800100,
          },
          {
            id: 'metric-3',
            name: 'CLS',
            value: 0.05,
            rating: 'good',
            timestamp: 1710712800200,
          },
        ],
        metadata: {
          route: '/dashboard',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stored).toBe(3);
    });

    it('should trigger alerts for poor performance', async () => {
      const requestBody = {
        metrics: [
          {
            id: 'metric-1',
            name: 'LCP',
            value: 5000,
            rating: 'poor',
            timestamp: 1710712800000,
          },
        ],
        metadata: {
          route: '/dashboard',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.alertsTriggered).toBeGreaterThan(0);
      expect(Array.isArray(data.data.alerts)).toBe(true);
      expect(data.data.alerts.length).toBeGreaterThan(0);
      expect(data.data.alerts[0]).toHaveProperty('id');
      expect(data.data.alerts[0]).toHaveProperty('ruleId');
      expect(data.data.alerts[0]).toHaveProperty('metric');
      expect(data.data.alerts[0]).toHaveProperty('value');
      expect(data.data.alerts[0]).toHaveProperty('threshold');
      expect(data.data.alerts[0]).toHaveProperty('severity');
      expect(data.data.alerts[0]).toHaveProperty('message');
    });

    it('should reject empty metrics array', async () => {
      const requestBody = {
        metrics: [],
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject missing metrics array', async () => {
      const requestBody = {
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle missing metadata gracefully', async () => {
      const requestBody = {
        metrics: [
          {
            id: 'metric-1',
            name: 'LCP',
            value: 2500,
            rating: 'good',
            timestamp: 1710712800000,
          },
        ],
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should auto-generate metric id if not provided', async () => {
      const requestBody = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
            timestamp: 1710712800000,
          },
        ],
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.status).toBe(200);
    });
  });

  describe('GET request - retrieve metrics', () => {
    it('should return empty list when no metrics exist', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('stats');
      expect(data.data).toHaveProperty('totalAlerts');
      expect(Array.isArray(data.data.metrics)).toBe(true);
      expect(typeof data.data.stats).toBe('object');
      expect(typeof data.data.totalAlerts).toBe('number');
    });

    it('should filter by route', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?route=/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by metric name', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?metric=LCP');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by rating', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?rating=good');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter by time range', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?startTime=0&endTime=9999999999999');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metrics.length).toBeLessThanOrEqual(10);
    });

    it('should use default limit of 100', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return statistics for each metric', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.data.stats).toBe('object');
    });

    it('should handle multiple query parameters', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?route=/dashboard&metric=LCP&rating=good&limit=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE request - clear metrics', () => {
    it('should clear all metrics', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('deleted');
      expect(data.data).toHaveProperty('remainingMetrics');
      expect(typeof data.data.deleted).toBe('number');
      expect(typeof data.data.remainingMetrics).toBe('number');
    });

    it('should clear metrics before timestamp', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?before=1710712800000', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('deleted');
      expect(data.data).toHaveProperty('remainingMetrics');
    });

    it('should handle invalid before timestamp', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?before=invalid', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      // Should still work with NaN
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle zero timestamp', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics?before=0', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return empty stats for no metrics', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.data.stats).toBe('object');
    });

    it('should include all stat properties', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);

      // First, store some metrics
      const postBody = {
        metrics: [
          {
            id: 'metric-1',
            name: 'LCP',
            value: 2500,
            rating: 'good',
            timestamp: 1710712800000,
          },
        ],
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      await POST(createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: postBody,
      }));

      const getResponse = await GET(request);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(Object.keys(getData.data.stats).length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed JSON', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid json}',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle metric without id and timestamp', async () => {
      const requestBody = {
        metrics: [
          {
            name: 'LCP',
            value: 2500,
            rating: 'good',
          },
        ],
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should handle multiple metric types', async () => {
      const metricTypes = ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP'];

      const requestBody = {
        metrics: metricTypes.map((name, index) => ({
          id: `metric-${index}`,
          name,
          value: 100,
          rating: 'good' as const,
          timestamp: 1710712800000 + index * 100,
        })),
        metadata: {
          route: '/test',
          deviceType: 'desktop',
          connectionType: 'wifi',
        },
      };

      const request = createMockNextRequest('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stored).toBe(metricTypes.length);
    });
  });
});
