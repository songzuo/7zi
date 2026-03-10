/**
 * Health API 单元测试
 * 测试健康检查 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET as healthGet, HEAD as healthHead } from '@/app/api/health/route';
import { GET as healthReady } from '@/app/api/health/ready/route';
import { GET as healthLive } from '@/app/api/health/live/route';
import { GET as healthDetailed } from '@/app/api/health/detailed/route';

// Mock monitoring module
vi.mock('@/lib/monitoring', () => ({
  basicHealthCheck: vi.fn(() => ({
    status: 'ok',
    timestamp: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    uptime: 100,
    environment: 'test',
  })),
  detailedHealthCheck: vi.fn(() => Promise.resolve({
    status: 'ok',
    timestamp: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    uptime: 100,
    environment: 'test',
    checks: {
      githubApi: { status: 'ok', latency: 50 },
      emailService: { status: 'ok' },
    },
  })),
  healthResponse: vi.fn((status) => {
    return new Response(JSON.stringify(status), {
      status: status.status === 'ok' ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  probes: {
    liveness: vi.fn(() => new Response(JSON.stringify({ status: 'alive' }), { status: 200 })),
    readiness: vi.fn(() => new Response(JSON.stringify({ status: 'ready' }), { status: 200 })),
    startup: vi.fn(() => new Response(JSON.stringify({ status: 'started' }), { status: 200 })),
  },
}));

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status with 200', async () => {
      const response = await healthGet();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
    });

    it('should return valid health status structure', async () => {
      const response = await healthGet();
      const data = await response.json();

      expect(typeof data.status).toBe('string');
      expect(['ok', 'degraded', 'error']).toContain(data.status);
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.environment).toBe('string');
    });

    it('should return correct content-type', async () => {
      const response = await healthGet();
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return consistent timestamps', async () => {
      const response = await healthGet();
      const data = await response.json();

      // Timestamp should be valid ISO string
      const date = new Date(data.timestamp);
      expect(date.toISOString()).toBe(data.timestamp);
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

    it('should use liveness probe', async () => {
      const { probes } = await import('@/lib/monitoring');
      await healthLive();
      expect(probes.liveness).toHaveBeenCalled();
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status', async () => {
      const response = await healthReady();
      expect(response.status).toBe(200);
    });

    it('should use readiness probe', async () => {
      const { probes } = await import('@/lib/monitoring');
      await healthReady();
      expect(probes.readiness).toHaveBeenCalled();
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health report', async () => {
      const response = await healthDetailed();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('system');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('configuration');
    });

    it('should include system resource information', async () => {
      const response = await healthDetailed();
      const data = await response.json();

      expect(data.system).toBeDefined();
      expect(data.system).toHaveProperty('memory');
      expect(data.system).toHaveProperty('cpu');
      expect(data.system).toHaveProperty('process');
    });

    it('should include service status checks', async () => {
      const response = await healthDetailed();
      const data = await response.json();

      expect(data.services).toBeDefined();
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('redis');
      expect(data.services).toHaveProperty('email');
      expect(data.services).toHaveProperty('external');
    });

    it('should include configuration status', async () => {
      const response = await healthDetailed();
      const data = await response.json();

      expect(data.configuration).toBeDefined();
      expect(data.configuration).toHaveProperty('requiredEnvVars');
      expect(data.configuration).toHaveProperty('optionalEnvVars');
      expect(data.configuration).toHaveProperty('security');
    });
  });
});