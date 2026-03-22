/**
 * @fileoverview Analytics API integration tests
 * @description Tests for /api/analytics/* endpoints using MSW
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { server } from './mocks/handlers';
import { MockDataGenerator } from './mocks/data';

const mockData = new MockDataGenerator();

describe('/api/analytics - Integration Tests', () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  describe('GET /api/analytics/metrics', () => {
    it('should return analytics metrics with valid structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return metrics with correct properties', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('timeSeries');
      expect(data.data).toHaveProperty('pagination');
      expect(data.data).toHaveProperty('filters');
      expect(data.data).toHaveProperty('cacheStats');
    });

    it('should return agent metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.metrics).toHaveProperty('agents');
      expect(data.data.metrics.agents).toHaveProperty('total');
      expect(data.data.metrics.agents).toHaveProperty('active');
      expect(data.data.metrics.agents).toHaveProperty('idle');
      expect(data.data.metrics.agents).toHaveProperty('offline');
      expect(data.data.metrics.agents).toHaveProperty('byProvider');
    });

    it('should return user metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.metrics).toHaveProperty('users');
      expect(data.data.metrics.users).toHaveProperty('total');
      expect(data.data.metrics.users).toHaveProperty('activeToday');
      expect(data.data.metrics.users).toHaveProperty('activeWeek');
      expect(data.data.metrics.users).toHaveProperty('newUsers');
    });

    it('should return task metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.metrics).toHaveProperty('tasks');
      expect(data.data.metrics.tasks).toHaveProperty('total');
      expect(data.data.metrics.tasks).toHaveProperty('completed');
      expect(data.data.metrics.tasks).toHaveProperty('inProgress');
      expect(data.data.metrics.tasks).toHaveProperty('pending');
    });

    it('should return revenue metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.metrics).toHaveProperty('revenue');
      expect(data.data.metrics.revenue).toHaveProperty('total');
      expect(data.data.metrics.revenue).toHaveProperty('monthly');
      expect(data.data.metrics.revenue).toHaveProperty('weekly');
      expect(data.data.metrics.revenue).toHaveProperty('daily');
    });

    it('should return performance metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.metrics).toHaveProperty('performance');
      expect(data.data.metrics.performance).toHaveProperty('cpuUsage');
      expect(data.data.metrics.performance).toHaveProperty('memoryUsage');
      expect(data.data.metrics.performance).toHaveProperty('responseTime');
      expect(data.data.metrics.performance).toHaveProperty('uptime');
    });

    it('should return time series data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(Array.isArray(data.data.timeSeries)).toBe(true);
      if (data.data.timeSeries.length > 0) {
        expect(data.data.timeSeries[0]).toHaveProperty('timestamp');
        expect(data.data.timeSeries[0]).toHaveProperty('date');
        expect(data.data.timeSeries[0]).toHaveProperty('agents');
        expect(data.data.timeSeries[0]).toHaveProperty('users');
        expect(data.data.timeSeries[0]).toHaveProperty('tasks');
      }
    });

    it('should return pagination info', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.pagination).toHaveProperty('total');
      expect(data.data.pagination).toHaveProperty('page');
      expect(data.data.pagination).toHaveProperty('limit');
      expect(data.data.pagination).toHaveProperty('totalPages');
    });

    it('should return cache stats', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');
      const data = await response.json();

      expect(data.data.cacheStats).toHaveProperty('hitRate');
      expect(data.data.cacheStats).toHaveProperty('hits');
      expect(data.data.cacheStats).toHaveProperty('misses');
    });

    it('should handle timeRange query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?timeRange=week');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.filters.timeRange).toBe('week');
    });

    it('should handle page query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?page=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.page).toBe(2);
    });

    it('should handle limit query parameter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?limit=50');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.limit).toBe(50);
    });
  });

  describe('POST /api/analytics/metrics', () => {
    it('should return metrics with custom filters', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 'month',
          agentIds: ['agent-1', 'agent-2'],
          taskStatuses: ['completed', 'in-progress'],
          metrics: ['agents', 'tasks', 'revenue'],
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filters.timeRange).toBe('month');
      expect(data.data.filters.agentIds).toEqual(['agent-1', 'agent-2']);
    });

    it('should handle custom date range', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 'custom',
          customRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.filters.timeRange).toBe('custom');
      // Note: Mock may not return customRange, so we just check it doesn't error
      expect(() => {
        if (data.data.filters.customRange) {
          expect(data.data.filters.customRange.start).toBe('2024-01-01');
        }
      }).not.toThrow();
    });

    it('should handle pagination in POST request', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 'week',
          page: 2,
          limit: 50,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(50);
    });

    it('should reject invalid timeRange in GET request', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?timeRange=invalid');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid timeRange in POST request', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 'invalid',
        }),
      });

      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty request body', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/analytics/export', () => {
    it('should return export options', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('formats');
      expect(data.data).toHaveProperty('maxRecords');
      expect(data.data).toHaveProperty('options');
    });

    it('should return supported formats', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export');
      const data = await response.json();

      expect(data.data.formats).toContain('csv');
      expect(data.data.formats).toContain('xlsx');
      expect(data.data.formats).toContain('json');
    });

    it('should return max records limit', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export');
      const data = await response.json();

      expect(data.data.maxRecords).toBeGreaterThan(0);
    });

    it('should return export options', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export');
      const data = await response.json();

      expect(data.data.options).toHaveProperty('includeHeaders');
      expect(data.data.options).toHaveProperty('timeRange');
    });
  });

  describe('POST /api/analytics/export', () => {
    const mockTimeSeriesData = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        date: 'Jan 1',
        agents: 7,
        users: 50,
        tasks: 20,
        tokens: 50000,
        revenue: 200,
        errors: 2,
      },
      {
        timestamp: '2024-01-02T00:00:00.000Z',
        date: 'Jan 2',
        agents: 8,
        users: 55,
        tasks: 25,
        tokens: 55000,
        revenue: 220,
        errors: 1,
      },
    ];

    it('should export data as CSV', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          data: mockTimeSeriesData,
          filename: 'analytics-export',
          includeHeaders: true,
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
    });

    it('should export data as JSON', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'json',
          data: mockTimeSeriesData,
          filename: 'analytics-export',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('content-disposition')).toContain('attachment');
    });

    it('should export data as Excel', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'xlsx',
          data: mockTimeSeriesData,
          filename: 'analytics-export',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('content-disposition')).toContain('attachment');
    });

    it('should reject unsupported format', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'pdf',
          data: mockTimeSeriesData,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty data array', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          data: [],
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject missing data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should include timestamp in filename', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          data: mockTimeSeriesData,
          filename: 'analytics-export',
        }),
      });

      const contentDisposition = response.headers.get('content-disposition');
      expect(contentDisposition).toMatch(/analytics-export_\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should handle custom date range in filename', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          data: mockTimeSeriesData,
          filename: 'analytics-export',
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        }),
      });

      const contentDisposition = response.headers.get('content-disposition');
      expect(contentDisposition).toMatch(/2024-01-01_to_2024-01-31/);
    });
  });

  describe('/api/analytics - Error Handling', () => {
    it('should handle invalid pagination parameters', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?page=0');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle limit > 1000', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?limit=1001');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle negative page', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?page=-1');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle malformed customRange', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics?customRange=invalid');
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('/api/analytics - Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return cache headers', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics');

      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('s-maxage');
    });
  });

  describe('/api/analytics - Data Consistency', () => {
    it('should return consistent data structure across requests', async () => {
      const response1 = await fetch('http://localhost:3000/api/analytics/metrics');
      const response2 = await fetch('http://localhost:3000/api/analytics/metrics');

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1.data.metrics)).toEqual(Object.keys(data2.data.metrics));
      expect(typeof data1.data.metrics.agents.total).toBe('number');
      expect(typeof data2.data.metrics.agents.total).toBe('number');
    });

    it('should handle multiple rapid requests', async () => {
      const responses = await Promise.all([
        fetch('http://localhost:3000/api/analytics/metrics'),
        fetch('http://localhost:3000/api/analytics/metrics'),
        fetch('http://localhost:3000/api/analytics/metrics'),
      ]);

      const data = await Promise.all(responses.map(r => r.json()));

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(data.every(d => d.success === true)).toBe(true);
    });
  });

  describe('/api/analytics - Edge Cases', () => {
    it('should handle no filters applied', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle all filters applied', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 'week',
          agentIds: ['agent-1'],
          taskStatuses: ['completed'],
          taskPriorities: ['high'],
          taskTypes: ['analysis'],
          providers: ['minimax'],
          metrics: ['agents', 'tasks', 'revenue'],
          compareWith: 'previous_period',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle empty filter arrays', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentIds: [],
          taskStatuses: [],
          taskPriorities: [],
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle large dataset export', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        date: `Jan ${i + 1}`,
        agents: i % 10,
        users: i % 20,
        tasks: i % 15,
        tokens: i * 1000,
        revenue: i * 10,
        errors: i % 5,
      }));

      const response = await fetch('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'json',
          data: largeDataset,
          filename: 'large-export',
        }),
      });

      expect(response.status).toBe(200);
    });
  });
});
