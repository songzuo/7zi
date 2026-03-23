/**
 * API Metrics Performance Endpoint Tests
 * GET /api/metrics/performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';
import {
  getApiPerformanceReport,
  clearApiPerformanceData,
} from '@/lib/middleware/api-performance';
import {
  getRateLimitStats,
  clearAllRateLimits,
} from '@/lib/middleware/rate-limit';
// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked logger
import { logger as mockedLogger } from '@/lib/logger';

describe('GET /api/metrics/performance', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      nextUrl: {
        pathname: '/api/metrics/performance',
        origin: 'http://localhost:3000',
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    // Clear existing data for clean test
    clearApiPerformanceData();
    clearAllRateLimits();
  });

  afterEach(() => {
    // Clean up after each test
    clearApiPerformanceData();
    clearAllRateLimits();
  });

  describe('response structure', () => {
    it('should return 200 OK status', async () => {
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.headers.get('content-type')).toContain('application/json');
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should include all metric categories by default', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data).toHaveProperty('apiPerformance');
      expect(data.data).toHaveProperty('rateLimiting');
      expect(data.data).toHaveProperty('system');
    });
  });

  describe('category filtering', () => {
    it('should return only API performance metrics when category=api', async () => {
      mockRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/metrics/performance?category=api',
      } as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data).toHaveProperty('apiPerformance');
      expect(data.data).not.toHaveProperty('rateLimiting');
      expect(data.data).not.toHaveProperty('system');
    });

    it('should return only rate limit metrics when category=ratelimit', async () => {
      mockRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/metrics/performance?category=ratelimit',
      } as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data).not.toHaveProperty('apiPerformance');
      expect(data.data).toHaveProperty('rateLimiting');
      expect(data.data).not.toHaveProperty('system');
    });

    it('should return only system metrics when category=system', async () => {
      mockRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/metrics/performance?category=system',
      } as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data).not.toHaveProperty('apiPerformance');
      expect(data.data).not.toHaveProperty('rateLimiting');
      expect(data.data).toHaveProperty('system');
    });

    it('should return all metrics when category=all', async () => {
      mockRequest = {
        ...mockRequest,
        url: 'http://localhost:3000/api/metrics/performance?category=all',
      } as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data).toHaveProperty('apiPerformance');
      expect(data.data).toHaveProperty('rateLimiting');
      expect(data.data).toHaveProperty('system');
    });
  });

  describe('API performance metrics', () => {
    it('should include API performance summary', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.apiPerformance).toHaveProperty('summary');
      expect(data.data.apiPerformance.summary).toHaveProperty('totalRequests');
      expect(data.data.apiPerformance.summary).toHaveProperty('averageDuration');
      expect(data.data.apiPerformance.summary).toHaveProperty('maxDuration');
      expect(data.data.apiPerformance.summary).toHaveProperty('minDuration');
      expect(data.data.apiPerformance.summary).toHaveProperty('successfulRequests');
      expect(data.data.apiPerformance.summary).toHaveProperty('failedRequests');
      expect(data.data.apiPerformance.summary).toHaveProperty('slowRequests');
      expect(data.data.apiPerformance.summary).toHaveProperty('errors');
    });

    it('should include top slow requests', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.apiPerformance).toHaveProperty('topSlowRequests');
      expect(Array.isArray(data.data.apiPerformance.topSlowRequests)).toBe(true);
    });

    it('should include route count', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.apiPerformance).toHaveProperty('routeCount');
      expect(typeof data.data.apiPerformance.routeCount).toBe('number');
    });
  });

  describe('rate limiting metrics', () => {
    it('should include rate limit statistics', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.rateLimiting).toHaveProperty('totalEntries');
      expect(data.data.rateLimiting).toHaveProperty('trackedPaths');
      expect(data.data.rateLimiting).toHaveProperty('totalRequestsTracked');
      expect(data.data.rateLimiting).toHaveProperty('pathsCount');
    });

    it('should return array of tracked paths', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(Array.isArray(data.data.rateLimiting.trackedPaths)).toBe(true);
    });

    it('should include numeric counts', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(typeof data.data.rateLimiting.totalEntries).toBe('number');
      expect(typeof data.data.rateLimiting.totalRequestsTracked).toBe('number');
      expect(typeof data.data.rateLimiting.pathsCount).toBe('number');
    });
  });

  describe('system metrics', () => {
    it('should include uptime information', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.system).toHaveProperty('uptime');
      expect(data.data.system.uptime).toHaveProperty('seconds');
      expect(data.data.system.uptime).toHaveProperty('formatted');
      expect(typeof data.data.system.uptime.seconds).toBe('number');
      expect(typeof data.data.system.uptime.formatted).toBe('string');
    });

    it('should include memory usage', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.system).toHaveProperty('memory');
      expect(data.data.system.memory).toHaveProperty('heapUsed');
      expect(data.data.system.memory).toHaveProperty('heapTotal');
      expect(data.data.system.memory).toHaveProperty('external');
      expect(data.data.system.memory).toHaveProperty('rss');
      expect(data.data.system.memory).toHaveProperty('heapUsedPercent');
    });

    it('should format memory values with units', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.system.memory.heapUsed).toMatch(/Bytes|KB|MB|GB|TB/);
      expect(data.data.system.memory.heapTotal).toMatch(/Bytes|KB|MB|GB|TB/);
      expect(data.data.system.memory.external).toMatch(/Bytes|KB|MB|GB|TB/);
      expect(data.data.system.memory.rss).toMatch(/Bytes|KB|MB|GB|TB/);
    });

    it('should include process information', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.data.system).toHaveProperty('nodeVersion');
      expect(data.data.system).toHaveProperty('platform');
      expect(data.data.system).toHaveProperty('arch');
      expect(data.data.system.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock getApiPerformanceReport to throw an error
      getApiPerformanceReport.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve performance metrics');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        '[Metrics API] Failed to retrieve performance metrics',
        expect.objectContaining({
          error: 'Test error',
        })
      );
    });
  });

  describe('timestamp format', () => {
    it('should return ISO 8601 timestamp', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe('data consistency', () => {
    it('should return consistent data across multiple calls', async () => {
      const response1 = await GET(mockRequest);
      const data1 = await response1.json();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await GET(mockRequest);
      const data2 = await response2.json();

      // System uptime should have increased
      expect(data2.data.system.uptime.seconds).toBeGreaterThan(data1.data.system.uptime.seconds);
    });
  });
});
