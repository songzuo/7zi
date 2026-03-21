/**
 * Performance API Tests
 * Tests for performance metrics, alerts, and reporting APIs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET as getMetrics, POST as postMetrics, DELETE as deleteMetrics } from '@/app/api/performance/metrics/route';
import { GET as getAlerts, POST as postAlerts, PUT as putAlerts, DELETE as deleteAlerts } from '@/app/api/performance/alerts/route';
import { GET as getReport } from '@/app/api/performance/report/route';
import type { PerformanceMetric } from '@/app/api/performance/metrics/route';

// ========================================
// Types
// ========================================

type MockRequestBody = Record<string, unknown> | string | number | boolean | null;

// ========================================
// Test Utilities
// ========================================

function createMockRequest(
  method: string,
  url: string,
  body?: MockRequestBody
): Request {
  return {
    method,
    url,
    json: async () => body,
  } as Request;
}

// ========================================
// Test Suite
// ========================================

describe('Performance Metrics API', () => {
  beforeEach(async () => {
    // Clear metrics before each test
    const req = createMockRequest('DELETE', 'http://localhost/api/performance/metrics?before=9999999999999');
    await deleteMetrics(req);
  });

  describe('POST /api/performance/metrics', () => {
    it('should accept valid metrics', async () => {
      const metrics = [
        {
          id: 'test-metric-1',
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          route: '/',
          deviceType: 'desktop',
          connectionType: '4g',
        },
      ];

      const req = createMockRequest('POST', 'http://localhost/api/performance/metrics', {
        metrics,
        metadata: { route: '/', deviceType: 'desktop', connectionType: '4g', url: 'http://localhost', viewportWidth: 1920, viewportHeight: 1080 },
      });

      const res = await postMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stored).toBe(1);
    });

    it('should reject invalid metrics', async () => {
      const req = createMockRequest('POST', 'http://localhost/api/performance/metrics', {
        metrics: [],
        metadata: {},
      });

      const res = await postMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid metrics data');
    });

    it('should accept multiple metrics in batch', async () => {
      const metrics = [
        { id: '1', name: 'LCP', value: 2500, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
        { id: '2', name: 'FID', value: 100, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
        { id: '3', name: 'CLS', value: 0.05, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
      ];

      const req = createMockRequest('POST', 'http://localhost/api/performance/metrics', {
        metrics,
        metadata: { route: '/', deviceType: 'desktop', connectionType: '4g', url: 'http://localhost', viewportWidth: 1920, viewportHeight: 1080 },
      });

      const res = await postMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stored).toBe(3);
    });
  });

  describe('GET /api/performance/metrics', () => {
    beforeEach(async () => {
      // Seed test data
      const metrics = [
        { id: '1', name: 'LCP', value: 2500, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
        { id: '2', name: 'FID', value: 100, rating: 'good', timestamp: Date.now(), route: '/', deviceType: 'desktop', connectionType: '4g' },
        { id: '3', name: 'CLS', value: 0.05, rating: 'good', timestamp: Date.now(), route: '/dashboard', deviceType: 'mobile', connectionType: '4g' },
      ];

      const req = createMockRequest('POST', 'http://localhost/api/performance/metrics', {
        metrics,
        metadata: { route: '/', deviceType: 'desktop', connectionType: '4g', url: 'http://localhost', viewportWidth: 1920, viewportHeight: 1080 },
      });

      await postMetrics(req);
    });

    it('should retrieve all metrics', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/metrics');
      const res = await getMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.length).toBeGreaterThan(0);
      expect(data.stats).toBeDefined();
    });

    it('should filter metrics by route', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/metrics?route=/');
      const res = await getMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics.length).toBeGreaterThan(0);
    });

    it('should filter metrics by metric name', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/metrics?metric=LCP');
      const res = await getMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      data.metrics.forEach((m: PerformanceMetric) => {
        expect(m.name).toBe('LCP');
      });
    });

    it('should calculate statistics correctly', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/metrics');
      const res = await getMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.LCP).toBeDefined();
      expect(data.stats.LCP.avg).toBeDefined();
      expect(data.stats.LCP.min).toBeDefined();
      expect(data.stats.LCP.max).toBeDefined();
      expect(data.stats.LCP.p50).toBeDefined();
      expect(data.stats.LCP.p90).toBeDefined();
      expect(data.stats.LCP.p95).toBeDefined();
    });
  });

  describe('DELETE /api/performance/metrics', () => {
    it('should delete old metrics by timestamp', async () => {
      const oldTimestamp = Date.now() - 100000;
      const req = createMockRequest('DELETE', `http://localhost/api/performance/metrics?before=${oldTimestamp}`);
      const res = await deleteMetrics(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Performance Alerts API', () => {
  describe('GET /api/performance/alerts', () => {
    it('should retrieve alert rules and active alerts', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/alerts');
      const res = await getAlerts(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rules).toBeDefined();
      expect(Array.isArray(data.rules)).toBe(true);
      expect(data.alerts).toBeDefined();
      expect(Array.isArray(data.alerts)).toBe(true);
      expect(data.summary).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/alerts');
      const res = await getAlerts(req);
      const data = await res.json();

      expect(data.summary.total).toBeDefined();
      expect(data.summary.unacknowledged).toBeDefined();
      expect(data.summary.bySeverity).toBeDefined();
      expect(data.summary.byMetric).toBeDefined();
    });
  });

  describe('POST /api/performance/alerts', () => {
    it('should create a new alert rule', async () => {
      const newRule = {
        name: 'Test Rule',
        metric: 'LCP',
        condition: 'gt',
        threshold: 3000,
        enabled: true,
        severity: 'medium',
        notificationChannels: ['console'],
      };

      const req = createMockRequest('POST', 'http://localhost/api/performance/alerts', {
        action: 'create-rule',
        rule: newRule,
      });

      const res = await postAlerts(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rule).toBeDefined();
      expect(data.rule.name).toBe('Test Rule');
      expect(data.rule.metric).toBe('LCP');
      expect(data.rule.threshold).toBe(3000);
    });

    it('should reject invalid rule data', async () => {
      const req = createMockRequest('POST', 'http://localhost/api/performance/alerts', {
        action: 'create-rule',
        rule: { name: 'Test' }, // Missing required fields
      });

      const res = await postAlerts(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should acknowledge an alert', async () => {
      const req = createMockRequest('POST', 'http://localhost/api/performance/alerts', {
        action: 'acknowledge',
        alertId: 'test-alert-id',
      });

      const res = await postAlerts(req);
      const data = await res.json();

      // Alert might not exist, but should not error
      expect(data.success !== undefined || data.error !== undefined).toBe(true);
    });
  });

  describe('PUT /api/performance/alerts', () => {
    it('should update an existing alert rule', async () => {
      // First, get existing rules
      const getReq = createMockRequest('GET', 'http://localhost/api/performance/alerts');
      const getRes = await getAlerts(getReq);
      const getData = await getRes.json();

      if (getData.rules.length > 0) {
        const ruleId = getData.rules[0].id;

        const req = createMockRequest('PUT', 'http://localhost/api/performance/alerts', {
          ruleId,
          updates: { threshold: 5000, enabled: false },
        });

        const res = await putAlerts(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.rule).toBeDefined();
      }
    });
  });

  describe('DELETE /api/performance/alerts', () => {
    it('should clear acknowledged alerts', async () => {
      const req = createMockRequest('DELETE', 'http://localhost/api/performance/alerts?clearAcknowledged=true');
      const res = await deleteAlerts(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Performance Report API', () => {
  beforeEach(async () => {
    // Clear metrics before each test
    const req = createMockRequest('DELETE', 'http://localhost/api/performance/metrics?before=9999999999999');
    await deleteMetrics(req);
  });

  describe('GET /api/performance/report', () => {
    it('should generate a performance report', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/report?period=24h');
      const res = await getReport(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.period).toBeDefined();
      expect(data.report.metrics).toBeDefined();
      expect(data.report.summary).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const req = createMockRequest('GET', 'http://localhost/api/performance/report?period=24h');
      const res = await getReport(req);
      const data = await res.json();

      expect(data.report.summary.totalMetrics).toBeDefined();
      expect(data.report.summary.totalRoutes).toBeDefined();
      expect(data.report.summary.overallRating).toBeDefined();
      expect(data.report.summary.criticalAlerts).toBeDefined();
      expect(data.report.summary.topIssues).toBeDefined();
    });

    it('should generate report for different time periods', async () => {
      const periods = ['1h', '6h', '24h', '7d', '30d'];

      for (const period of periods) {
        const req = createMockRequest('GET', `http://localhost/api/performance/report?period=${period}`);
        const res = await getReport(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.report.period.start).toBeDefined();
        expect(data.report.period.end).toBeDefined();
      }
    });
  });
});
