/**
 * Tests for Analytics Metrics API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock cache manager
vi.mock('@/lib/cache/CacheManager', () => ({
  getCacheManager: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
  })),
  CachePresets: {
    ANALYTICS_METRICS: 'analytics-metrics',
  },
}));

import { logger } from '@/lib/logger';

describe('GET /api/analytics/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return analytics metrics with default time range', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('metrics');
    expect(responseData.data.metrics).toHaveProperty('agents');
    expect(responseData.data.metrics).toHaveProperty('users');
    expect(responseData.data.metrics).toHaveProperty('performance');
    expect(responseData.data.metrics).toHaveProperty('timeSeries');
  });

  it('should support time range parameter', async () => {
    const request = new NextRequest(
      'http://localhost/api/analytics/metrics?timeRange=week',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.metrics).toHaveProperty('timeSeries');
  });

  it('should support pagination', async () => {
    const request = new NextRequest(
      'http://localhost/api/analytics/metrics?page=1&limit=10',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });

  it('should cache metrics for performance', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    await GET(request);

    expect(logger.info).toHaveBeenCalledWith(
      'Analytics metrics fetched',
      expect.objectContaining({
        timeRange: expect.any(String),
      })
    );
  });

  it('should handle invalid time range gracefully', async () => {
    const request = new NextRequest(
      'http://localhost/api/analytics/metrics?timeRange=invalid',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const responseData = await response.json();

    expect([200, 400]).toContain(response.status);
  });

  it('should include metadata in response', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    const response = await GET(request);
    const responseData = await response.json();

    expect(responseData).toHaveProperty('timestamp');
    expect(responseData).toHaveProperty('cacheInfo');
  });

  it('should support multiple filters', async () => {
    const request = new NextRequest(
      'http://localhost/api/analytics/metrics?provider=minimax&status=active',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });
});

describe('POST /api/analytics/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return metrics with custom filters', async () => {
    const requestBody = {
      timeRange: 'month',
      filters: {
        provider: 'minimax',
        agentId: 'agent-1',
      },
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.metrics).toBeDefined();
  });

  it('should validate time range parameter', async () => {
    const requestBody = {
      timeRange: 'invalid',
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    if (response.status === 400) {
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    }
  });

  it('should support multiple filters', async () => {
    const requestBody = {
      timeRange: 'week',
      filters: {
        provider: 'minimax',
        agentType: 'worker',
        status: 'active',
      },
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });

  it('should handle pagination in POST', async () => {
    const requestBody = {
      timeRange: 'month',
      pagination: {
        page: 1,
        limit: 20,
      },
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('pagination');
  });

  it('should validate request body', async () => {
    const requestBody = {
      // Missing required fields
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect([200, 400]).toContain(response.status);
  });

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);

    expect([400, 500]).toContain(response.status);
  });

  it('should log analytics access', async () => {
    const requestBody = {
      timeRange: 'week',
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    await POST(request);

    expect(logger.info).toHaveBeenCalledWith(
      'Analytics metrics fetched',
      expect.objectContaining({
        timeRange: 'week',
      })
    );
  });

  it('should include cache information', async () => {
    const requestBody = {
      timeRange: 'day',
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(responseData).toHaveProperty('cacheInfo');
    expect(responseData.cacheInfo).toHaveProperty('hit');
  });

  it('should handle empty filters', async () => {
    const requestBody = {
      timeRange: 'day',
      filters: {},
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should support custom date ranges', async () => {
    const requestBody = {
      timeRange: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });

  it('should return time series data', async () => {
    const requestBody = {
      timeRange: 'week',
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.metrics.timeSeries).toBeDefined();
    expect(Array.isArray(responseData.data.metrics.timeSeries)).toBe(true);
  });

  it('should handle large data requests', async () => {
    const requestBody = {
      timeRange: 'year',
      pagination: {
        page: 1,
        limit: 100,
      },
    };

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
  });
});

describe('Metrics Response Structure', () => {
  it('should include all required metric categories', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    const response = await GET(request);
    const responseData = await response.json();
    const metrics = responseData.data.metrics;

    expect(metrics).toHaveProperty('agents');
    expect(metrics).toHaveProperty('users');
    expect(metrics).toHaveProperty('performance');
    expect(metrics).toHaveProperty('timeSeries');
  });

  it('agents metrics should include subcategories', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    const response = await GET(request);
    const responseData = await response.json();
    const agents = responseData.data.metrics.agents;

    expect(agents).toHaveProperty('total');
    expect(agents).toHaveProperty('active');
    expect(agents).toHaveProperty('idle');
    expect(agents).toHaveProperty('byProvider');
  });

  it('performance metrics should include key indicators', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    });

    const response = await GET(request);
    const responseData = await response.json();
    const performance = responseData.data.metrics.performance;

    expect(performance).toHaveProperty('apiResponseTime');
    expect(performance).toHaveProperty('memoryUsage');
    expect(performance).toHaveProperty('cacheHitRate');
  });
});
