/**
 * API Tracker Tests
 * API 追踪器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { APITracker, DEFAULT_API_TRACKER_CONFIG } from '../api-tracker';
import { SlowAPICall } from '../types';

describe('APITracker', () => {
  let tracker: APITracker;

  beforeEach(() => {
    tracker = new APITracker();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(tracker).toBeDefined();
    });

    it('should accept custom config', () => {
      const customTracker = new APITracker({ threshold: 1000 });
      expect(customTracker).toBeDefined();
    });
  });

  describe('trackApiCall', () => {
    it('should track slow API calls above threshold', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      
      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(1);
      expect(slowApis[0].duration).toBe(3000);
    });

    it('should track API calls with errors', () => {
      tracker.trackApiCall('/api/users', 'GET', 500, 500, { error: 'Internal Server Error' });
      
      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(1);
    });

    it('should not track fast successful API calls', () => {
      tracker.trackApiCall('/api/users', 'GET', 500, 200);
      
      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(0);
    });

    it('should exclude configured endpoints', () => {
      const excludeTracker = new APITracker({
        endpoints: { exclude: ['/api/health'] }
      });

      excludeTracker.trackApiCall('/api/health', 'GET', 5000, 200);
      
      const slowApis = excludeTracker.getSlowApis();
      expect(slowApis.length).toBe(0);
    });

    it('should track API calls when disabled', () => {
      const disabledTracker = new APITracker({ enabled: false });
      disabledTracker.trackApiCall('/api/users', 'GET', 5000, 200);
      
      const slowApis = disabledTracker.getSlowApis();
      expect(slowApis.length).toBe(0);
    });

    it('should track different HTTP methods', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'POST', 2500, 201);
      tracker.trackApiCall('/api/users/1', 'PUT', 2100, 200);
      tracker.trackApiCall('/api/users/1', 'DELETE', 2500, 200);

      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(4);
    });
  });

  describe('identifyAPIIssues', () => {
    it('should detect server errors (5xx)', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 500,
        statusCode: 500,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('server-error');
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect client errors (4xx)', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 500,
        statusCode: 404,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('client-error');
      expect(issues[0].severity).toBe('high');
    });

    it('should detect rate limiting (429)', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 500,
        statusCode: 429,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.some(i => i.type === 'rate-limit')).toBe(true);
    });

    it('should detect timeout (> 10s)', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 12000,
        statusCode: 200,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.some(i => i.type === 'timeout')).toBe(true);
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect slow response', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 4000,
        statusCode: 200,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.some(i => i.type === 'slow-response')).toBe(true);
    });

    it('should detect connection errors', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 5000,
        statusCode: 0,
        timestamp: Date.now(),
        error: 'ECONNREFUSED',
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.some(i => i.type === 'connection-error')).toBe(true);
    });

    it('should return empty array for healthy APIs', () => {
      const apis: SlowAPICall[] = [{
        endpoint: '/api/users',
        method: 'GET',
        duration: 500,
        statusCode: 200,
        timestamp: Date.now(),
      }];

      const issues = tracker.identifyAPIIssues(apis);
      expect(issues.length).toBe(0);
    });
  });

  describe('getSlowApis', () => {
    it('should return all slow API calls', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/orders', 'GET', 2500, 200);

      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(2);
    });

    it('should return limited number of API calls', () => {
      for (let i = 0; i < 20; i++) {
        tracker.trackApiCall(`/api/endpoint${i}`, 'GET', 2000 + i * 100, 200);
      }

      const slowApis = tracker.getSlowApis(5);
      expect(slowApis.length).toBe(5);
    });

    it('should return API calls sorted by duration (descending)', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/orders', 'GET', 5000, 200);
      tracker.trackApiCall('/api/products', 'GET', 4000, 200);

      const slowApis = tracker.getSlowApis();
      expect(slowApis[0].duration).toBe(5000);
      expect(slowApis[1].duration).toBe(4000);
      expect(slowApis[2].duration).toBe(3000);
    });
  });

  describe('getSlowestApis', () => {
    it('should return top N slowest API calls', () => {
      for (let i = 0; i < 15; i++) {
        tracker.trackApiCall(`/api/endpoint${i}`, 'GET', 2000 + i * 100, 200);
      }

      const slowest = tracker.getSlowestApis(5);
      expect(slowest.length).toBe(5);
      expect(slowest[0].duration).toBe(3400);
    });
  });

  describe('getAPIsByStatus', () => {
    it('should count API calls by status code', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'GET', 3000, 404);
      tracker.trackApiCall('/api/users', 'GET', 3000, 500);

      const counts = tracker.getAPIsByStatus();
      expect(counts['200']).toBe(2);
      expect(counts['404']).toBe(1);
      expect(counts['500']).toBe(1);
    });
  });

  describe('getAPIsByEndpoint', () => {
    it('should aggregate API calls by endpoint', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'GET', 5000, 200);
      tracker.trackApiCall('/api/orders', 'GET', 2500, 200);

      const stats = tracker.getAPIsByEndpoint();
      expect(stats['GET /api/users'].count).toBe(2);
      expect(stats['GET /api/users'].avgDuration).toBe(4000);
    });
  });

  describe('getErrorRate', () => {
    it('should calculate error rate correctly', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'GET', 3000, 500);
      tracker.trackApiCall('/api/users', 'GET', 3000, 404);

      const errorRate = tracker.getErrorRate();
      expect(errorRate).toBeCloseTo(66.67, 1);
    });

    it('should return 0 for no API calls', () => {
      const errorRate = tracker.getErrorRate();
      expect(errorRate).toBe(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should calculate average response time', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/users', 'GET', 5000, 200);
      tracker.trackApiCall('/api/users', 'GET', 4000, 200);

      const avg = tracker.getAverageResponseTime();
      expect(avg).toBe(4000);
    });

    it('should return 0 for no API calls', () => {
      const avg = tracker.getAverageResponseTime();
      expect(avg).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/orders', 'GET', 2500, 200);

      tracker.clearHistory();

      const slowApis = tracker.getSlowApis();
      expect(slowApis.length).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      tracker.updateConfig({ threshold: 1000 });

      tracker.trackApiCall('/api/users', 'GET', 1500, 200);
      const slowApis = tracker.getSlowApis();

      expect(slowApis.length).toBe(1);
    });
  });

  describe('exportData', () => {
    it('should export tracker data', () => {
      tracker.trackApiCall('/api/users', 'GET', 3000, 200);
      tracker.trackApiCall('/api/orders', 'GET', 2500, 200);

      const data = tracker.exportData();

      expect(data.slowApis.length).toBe(2);
      expect(data.config).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive API report', () => {
      tracker.trackApiCall('/api/users', 'GET', 5000, 200);
      tracker.trackApiCall('/api/users', 'GET', 3000, 500);
      tracker.trackApiCall('/api/orders', 'GET', 4000, 200);

      const report = tracker.generateReport();

      expect(report.summary.totalSlowApis).toBe(3);
      expect(report.summary.averageResponseTime).toBe(4000);
      expect(report.summary.errorRate).toBeCloseTo(33.33, 1);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('maxHistorySize', () => {
    it('should respect max history size', () => {
      const limitedTracker = new APITracker({ maxHistorySize: 5 });

      for (let i = 0; i < 10; i++) {
        limitedTracker.trackApiCall(`/api/endpoint${i}`, 'GET', 3000, 200);
      }

      const slowApis = limitedTracker.getSlowApis();
      expect(slowApis.length).toBe(5);
    });
  });
});

describe('APITracker Integration', () => {
  it('should handle multiple API calls and provide comprehensive analysis', () => {
    const tracker = new APITracker();

    tracker.trackApiCall('/api/users', 'GET', 3000, 200);
    tracker.trackApiCall('/api/users', 'POST', 5000, 201);
    tracker.trackApiCall('/api/orders', 'GET', 15000, 200);
    tracker.trackApiCall('/api/products', 'GET', 2000, 500);

    const slowApis = tracker.getSlowApis();
    const report = tracker.generateReport();

    expect(slowApis.length).toBe(4);
    expect(report.summary.totalSlowApis).toBe(4);
  });

  it('should track API call patterns over time', () => {
    const tracker = new APITracker();

    for (let i = 0; i < 10; i++) {
      tracker.trackApiCall('/api/users', 'GET', 2000 + i * 100, 200);
    }

    const stats = tracker.getAPIStats();
    const endpointStats = stats.get('GET /api/users');

    expect(endpointStats).toBeDefined();
    expect(endpointStats?.count).toBe(10);
    expect(endpointStats?.avgDuration).toBeCloseTo(2450, 0);
  });

  it('should identify cascading failures', () => {
    const tracker = new APITracker();

    tracker.trackApiCall('/api/users', 'GET', 500, 503);
    tracker.trackApiCall('/api/orders', 'GET', 500, 503);
    tracker.trackApiCall('/api/products', 'GET', 500, 503);

    const issues = tracker.identifyAPIIssues(tracker.getSlowApis());
    expect(issues.filter(i => i.type === 'server-error').length).toBe(3);
  });
});
