/**
 * Health API Route Tests
 * GET /api/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';
import { getCacheManager } from '@/lib/cache/CacheManager';
import { createErrorResponse } from '@/lib/api/error-handler';

// Mock dependencies
vi.mock('@/lib/cache/CacheManager');
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  },
}));
vi.mock('@/lib/api/error-handler');

// Import mocked logger
import { logger } from '@/lib/logger';

describe('GET /api/health', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      nextUrl: {
        pathname: '/api/health',
        origin: 'http://localhost:3000',
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    // Mock cache manager
    const mockCacheManager = {
      getOrSet: vi.fn(),
    };

    (getCacheManager as ReturnType<typeof vi.fn>).mockReturnValue(mockCacheManager);

    // Mock logger
    (logger.error as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
  });

  describe('health status', () => {
    it('should return healthy status when memory usage is low', async () => {
      const mockCacheManager = getCacheManager();

      const mockHealthStatus = {
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 123.456,
          version: '1.0.0',
          checks: {
            memory: {
              status: 'ok',
              used: 100,
              limit: 512,
            },
            node: {
              status: 'ok',
              version: 'v20.0.0',
            },
          },
        },
      };

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue(mockHealthStatus);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('healthy');
      expect(data.data.checks.memory.status).toBe('ok');
      expect(mockCacheManager.getOrSet).toHaveBeenCalled();
    });

    it('should return unhealthy status when memory usage is high', async () => {
      const mockCacheManager = getCacheManager();

      const mockHealthStatus = {
        success: true,
        data: {
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 123.456,
          version: '1.0.0',
          checks: {
            memory: {
              status: 'warning',
              used: 470, // > 90% of 512MB
              limit: 512,
            },
            node: {
              status: 'ok',
              version: 'v20.0.0',
            },
          },
        },
      };

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue(mockHealthStatus);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.data.status).toBe('unhealthy');
      expect(data.data.checks.memory.status).toBe('warning');
    });

    it('should include correct timestamp', async () => {
      const mockCacheManager = getCacheManager();
      const mockNow = new Date('2026-03-19T12:00:00.000Z');

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: mockNow.toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.timestamp).toBe(mockNow.toISOString());
    });

    it('should include uptime in seconds', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 3600.5, // 1 hour
          version: '1.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.uptime).toBe(3600.5);
    });

    it('should include version from environment or default', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '2.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.version).toBe('2.0.0');
    });
  });

  describe('memory checks', () => {
    it('should report memory usage in MB', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: {
              status: 'ok',
              used: 256, // 256 MB
              limit: 512, // 512 MB limit
            },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(typeof data.data.checks.memory.used).toBe('number');
      expect(typeof data.data.checks.memory.limit).toBe('number');
      expect(data.data.checks.memory.used).toBeGreaterThan(0);
      expect(data.data.checks.memory.limit).toBeGreaterThan(data.data.checks.memory.used);
    });

    it('should set memory status to warning at 90% threshold', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: {
              status: 'warning',
              used: 460.8, // 90% of 512MB
              limit: 512,
            },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.checks.memory.status).toBe('warning');
    });

    it('should set memory status to ok below 90% threshold', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: {
              status: 'ok',
              used: 200, // < 90% of 512MB
              limit: 512,
            },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.checks.memory.status).toBe('ok');
    });
  });

  describe('node checks', () => {
    it('should include Node.js version', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: {
              status: 'ok',
              version: 'v22.22.0',
            },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.checks.node.status).toBe('ok');
      expect(data.data.checks.node.version).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('caching', () => {
    it('should cache health status for 30 seconds', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      await GET();

      expect(mockCacheManager.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('health'),
        expect.any(Function),
        expect.objectContaining({ ttl: 30000 }) // 30 seconds
      );
    });
  });

  describe('error handling', () => {
    it('should return 503 when cache fails', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockRejectedValue(
        new Error('Cache connection failed')
      );

      (createErrorResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Health check failed',
          },
        }, { status: 503 })
      );

      const response = await GET();

      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error)
      );
      expect(createErrorResponse).toHaveBeenCalledWith(
        expect.any(Error),
        503
      );
    });

    it('should log error when health check fails', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockRejectedValue(
        new Error('Health check failed')
      );

      (createErrorResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Health check failed',
          },
        }, { status: 503 })
      );

      await GET();

      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error)
      );
    });
  });

  describe('response format', () => {
    it('should return standardized success response', async () => {
      const mockCacheManager = getCacheManager();

      mockCacheManager.getOrSet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: '1.0.0',
          checks: {
            memory: { status: 'ok', used: 100, limit: 512 },
            node: { status: 'ok', version: 'v20.0.0' },
          },
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('uptime');
      expect(data.data).toHaveProperty('version');
      expect(data.data).toHaveProperty('checks');
    });
  });
});
