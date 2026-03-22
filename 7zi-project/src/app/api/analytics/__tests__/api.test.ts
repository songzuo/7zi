/**
 * @fileoverview analytics API 集成测试
 * @description 测试 /api/analytics/metrics 和 /api/analytics/export 端点
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetch } from 'next/test';
import { type TimeSeriesDataPoint } from '@/lib/types/analytics';

// ============================================================================
// Test Suite: Analytics Metrics API
// ============================================================================

describe('Analytics API - Metrics', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics';

  it('GET /api/analytics/metrics should return analytics data', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('filters');

    expect(data.data).toHaveProperty('metrics');
    expect(data.data).toHaveProperty('timeSeries');
  });

  it('should return correct metrics structure', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(data.data.metrics).toHaveProperty('agents');
    expect(data.data.metrics).toHaveProperty('users');
    expect(data.data.metrics).toHaveProperty('tasks');
    expect(data.data.metrics).toHaveProperty('revenue');
    expect(data.data.metrics).toHaveProperty('performance');

    expect(data.data.metrics.agents).toHaveProperty('total');
    expect(data.data.metrics.agents).toHaveProperty('active');
    expect(data.data.metrics.agents).toHaveProperty('idle');
    expect(data.data.metrics.agents).toHaveProperty('offline');
    expect(data.data.metrics.agents).toHaveProperty('byProvider');
  });

  it('should return time series data', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(Array.isArray(data.data.timeSeries)).toBe(true);
    expect(data.data.timeSeries.length).toBeGreaterThan(0);

    expect(data.data.timeSeries[0]).toHaveProperty('timestamp');
    expect(data.data.timeSeries[0]).toHaveProperty('agents');
    expect(data.data.timeSeries[0]).toHaveProperty('users');
    expect(data.data.timeSeries[0]).toHaveProperty('tasks');
  });

  it('should support different time ranges', async () => {
    const timeRanges = ['today', 'week', 'month', 'quarter', 'year'];

    for (const range of timeRanges) {
      const response = await fetch(`${baseUrl}?timeRange=${range}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.timeRange).toBe(range);
    }
  });

  it('should handle custom date range', async () => {
    const customRange = JSON.stringify({
      start: '2024-01-01',
      end: '2024-01-31'
    });

    const response = await fetch(`${baseUrl}?timeRange=custom&customRange=${encodeURIComponent(customRange)}`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.filters.customRange).toEqual({
      start: '2024-01-01',
      end: '2024-01-31'
    });
  });

  it('should handle invalid custom range format', async () => {
    const response = await fetch(`${baseUrl}?timeRange=custom&customRange=invalid-json`);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid customRange format');
  });

  it('POST /api/analytics/metrics with filters', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeRange: 'month',
        agentIds: ['agent-1', 'agent-2'],
        taskStatuses: ['completed', 'in-progress'],
        metrics: ['agents', 'users', 'tasks']
      })
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.filters.timeRange).toBe('month');
    expect(data.filters.agentIds).toEqual(['agent-1', 'agent-2']);
  });

  it('should handle invalid POST body', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should include cache headers', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=30');
  });
});

// ============================================================================
// Test Suite: Analytics Export API
// ============================================================================

describe('Analytics API - Export', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/export';

  it('GET /api/analytics/export should return export options', async () => {
    const response = await fetch(baseUrl);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.formats).toContain('csv');
    expect(data.data.formats).toContain('xlsx');
    expect(data.data.formats).toContain('json');
  });

  it('POST /api/analytics/export should export CSV', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 }
    ];

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export',
        includeHeaders: true
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');

    const content = await response.text();
    expect(content).toContain('timestamp');
    expect(content).toContain('agents');
    expect(content).toContain('users');
    expect(content).toContain('10');
    expect(content).toContain('50');
  });

  it('POST /api/analytics/export should export XLSX', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 }
    ];

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'xlsx',
        data: mockData,
        filename: 'test-export'
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/vnd.openxmlformats');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('POST /api/analytics/export should export JSON', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 }
    ];

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'json',
        data: mockData,
        filename: 'test-export'
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const content = await response.json();
    expect(Array.isArray(content)).toBe(true);
    expect(content).toEqual(mockData);
  });

  it('should handle unsupported export format', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'pdf',
        data: []
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unsupported export format');
  });

  it('should handle empty data', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: []
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('No data to export');
  });

  it('should handle missing data', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should include proper Content-Disposition header', async () => {
    const mockData = [{ timestamp: '2024-01-01', agents: 10 }];
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export'
      })
    });

    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('filename=');
  });

  it('should include date range in filename when provided', async () => {
    const mockData = [{ timestamp: '2024-01-01', agents: 10 }];

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export',
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      })
    });

    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('2024-01-01');
    expect(disposition).toContain('2024-01-31');
  });
});

// ============================================================================
// Test Suite: Analytics Data Validation
// ============================================================================

describe('Analytics API - Data Validation', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics';

  it('should return valid timestamp format', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return numeric values in metrics', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(typeof data.data.metrics.agents.total).toBe('number');
    expect(typeof data.data.metrics.users.total).toBe('number');
    expect(typeof data.data.metrics.revenue.total).toBe('number');
  });

  it('should return arrays for byProvider metrics', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(typeof data.data.metrics.agents.byProvider).toBe('object');
    expect(Object.keys(data.data.metrics.agents.byProvider).length).toBeGreaterThan(0);
  });

  it('should return valid time series data points', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    data.data.timeSeries.forEach((point: TimeSeriesDataPoint) => {
      expect(point).toHaveProperty('timestamp');
      expect(typeof point.agents).toBe('number');
      expect(typeof point.users).toBe('number');
      expect(typeof point.tasks).toBe('number');
    });
  });

  it('should return performance metrics within valid ranges', async () => {
    const response = await fetch(`${baseUrl}?timeRange=week`);
    const data = await response.json();

    expect(data.data.metrics.performance.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(data.data.metrics.performance.cpuUsage).toBeLessThanOrEqual(100);
    expect(data.data.metrics.performance.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(data.data.metrics.performance.memoryUsage).toBeLessThanOrEqual(100);
    expect(data.data.metrics.performance.uptime).toBeGreaterThanOrEqual(0);
    expect(data.data.metrics.performance.uptime).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Test Suite: Analytics Error Handling
// ============================================================================

describe('Analytics API - Error Handling', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics';

  it('should handle server errors gracefully', async () => {
    // Mock a scenario where the server might error
    const response = await fetch(`${baseUrl}?timeRange=invalid`);
    const data = await response.json();

    expect(data).toHaveProperty('success');
  });

  it('should return proper error structure', async () => {
    const response = await fetch(`${baseUrl}?timeRange=custom&customRange=invalid`);
    const data = await response.json();

    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
  });
});
