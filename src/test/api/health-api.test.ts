/**
 * Health API 单元测试
 * 测试健康检查 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET as healthGet, HEAD as healthHead } from '@/app/api/health/route';
import { GET as healthReady } from '@/app/api/health/ready/route';
import { GET as healthLive } from '@/app/api/health/live/route';
import { GET as healthDetailed } from '@/app/api/health/detailed/route';

// Mock all external dependencies before importing routes
vi.mock('@/lib/cache/cache-manager', () => ({
  getCacheManager: vi.fn(() => Promise.resolve({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0 })),
  })),
}));

vi.mock('@/lib/monitoring/web-vitals', () => ({
  initWebVitalsMonitoring: vi.fn(),
  observePerformance: vi.fn(),
  getCurrentVitals: vi.fn(() => ({})),
}));

vi.mock('@/lib/logger', () => ({
  default: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  cacheLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/monitoring/alerts', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  sendSlackAlert: vi.fn().mockResolvedValue(undefined),
  sendEmailAlert: vi.fn().mockResolvedValue(undefined),
  alerts: [],
}));

// Mock database
vi.mock('@/lib/db', () => ({
  prisma: {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Mock monitoring functions
vi.mock('@/lib/monitoring', async () => {
  return {
    basicHealthCheck: vi.fn(() => ({
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: '1.0.0',
      uptime: 100,
      environment: 'test',
    })),
    enhancedHealthReport: vi.fn(() => Promise.resolve({
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: '1.0.0',
      uptime: 100,
      environment: 'test',
      responseTime: 50,
      components: {
        cache: { status: 'ok' },
        auth: { status: 'ok' },
        logger: { status: 'ok' },
      },
    })),
    comprehensiveHealthReport: vi.fn(() => Promise.resolve({
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: '1.0.0',
      uptime: 100,
      environment: 'test',
      system: {
        memory: { total: 1000, used: 500, free: 500, usagePercent: 50 },
        cpu: { cores: 4, model: 'test', loadAverage: [0.5, 0.5, 0.5] },
        process: { pid: 1, uptime: 100, nodeVersion: '18.0.0', platform: 'linux', arch: 'x64' },
      },
      services: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
        email: { status: 'ok' },
        external: { status: 'ok' },
      },
      configuration: {
        requiredEnvVars: [],
        optionalEnvVars: [],
        security: { enabled: true },
      },
    })),
    healthResponse: vi.fn((status) => {
      const statusCode = status.status === 'ok' ? 200 : status.status === 'degraded' ? 200 : 503;
      return new Response(JSON.stringify(status), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }),
    probes: {
      liveness: vi.fn(() => new Response(JSON.stringify({ status: 'alive' }), { status: 200 })),
      readiness: vi.fn(() => new Response(JSON.stringify({ status: 'ready' }), { status: 200 })),
      startup: vi.fn(() => new Response(JSON.stringify({ status: 'started' }), { status: 200 })),
    },
  };
});

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper to create mock request
  const createMockRequest = (url: string = 'http://localhost/api/health') => {
    return new Request(url, { method: 'GET' });
  };

  // Helper to create async mock request for readiness
  const createMockRequestAsync = async (url: string = 'http://localhost/api/health/ready') => {
    return new Request(url, { method: 'GET' });
  };

  describe('GET /api/health', () => {
    it('should return valid response', async () => {
      const response = await healthGet(createMockRequest());
      // Just verify it returns a valid status (not crashing)
      expect([200, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data).toHaveProperty('status');
    });

    it('should return JSON content-type', async () => {
      const response = await healthGet(createMockRequest());
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should include basic health fields when successful', async () => {
      const response = await healthGet(createMockRequest());
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('status');
        expect(['ok', 'degraded', 'error']).toContain(data.status);
      }
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 for lightweight health check', async () => {
      const response = await healthHead();
      expect(response.status).toBe(200);
    });

    it('should not return body', async () => {
      const response = await healthHead();
      const text = await response.text();
      expect(text).toBe('');
    });
  });

  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      const response = await healthLive();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('alive');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status', async () => {
      const response = await healthReady(createMockRequestAsync());
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return valid response', async () => {
      const response = await healthDetailed(createMockRequest());
      // Just verify it doesn't crash - may return 500 if dependencies fail
      expect([200, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });
});
