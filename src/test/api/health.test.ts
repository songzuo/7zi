/**
 * Health API Routes Tests
 * Tests for /api/health/* endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock the monitoring module
const mockBasicHealthCheck = vi.fn();
const mockDetailedHealthCheck = vi.fn();
const mockComprehensiveHealthReport = vi.fn();

vi.mock('@/lib/monitoring', () => ({
  basicHealthCheck: () => mockBasicHealthCheck(),
  detailedHealthCheck: () => mockDetailedHealthCheck(),
  comprehensiveHealthReport: () => mockComprehensiveHealthReport(),
  healthResponse: (status: unknown) => {
    const statusCode = (status as { status: string }).status === 'ok' ? 200 : 
                       (status as { status: string }).status === 'degraded' ? 200 : 503;
    return NextResponse.json(status, { status: statusCode });
  },
  probes: {
    liveness: () => NextResponse.json({ status: 'alive' }, { status: 200 }),
    readiness: async () => {
      const health = await mockDetailedHealthCheck();
      const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
      return NextResponse.json(health, { status: statusCode });
    },
    startup: () => NextResponse.json({ status: 'started' }, { status: 200 }),
  },
}));

// Import after mocking
import { GET as healthGET, HEAD as healthHEAD } from '@/app/api/health/route';
import { GET as readyGET } from '@/app/api/health/ready/route';
import { GET as liveGET } from '@/app/api/health/live/route';
import { GET as detailedGET, HEAD as detailedHEAD } from '@/app/api/health/detailed/route';

describe('Health API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', '1.0.0-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ============================================================================
  // GET /api/health - Basic Health Check
  // ============================================================================

  describe('GET /api/health', () => {
    it('should return basic health status', async () => {
      mockBasicHealthCheck.mockReturnValue({
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0-test',
        uptime: 100,
        environment: 'test',
      });

      const response = await healthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe('1.0.0-test');
      expect(data.uptime).toBe(100);
      expect(data.environment).toBe('test');
    });

    it('should call basicHealthCheck', async () => {
      mockBasicHealthCheck.mockReturnValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
      });

      await healthGET();

      expect(mockBasicHealthCheck).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // HEAD /api/health - Lightweight Health Check
  // ============================================================================

  describe('HEAD /api/health', () => {
    it('should return 200 status', async () => {
      const response = await healthHEAD();

      expect(response.status).toBe(200);
    });

    it('should return null body', async () => {
      const response = await healthHEAD();

      expect(response.body).toBeNull();
    });
  });

  // ============================================================================
  // GET /api/health/ready - Readiness Probe
  // ============================================================================

  describe('GET /api/health/ready', () => {
    it('should return 200 when healthy', async () => {
      mockDetailedHealthCheck.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        checks: {},
      });

      const response = await readyGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('should return 503 when unhealthy', async () => {
      mockDetailedHealthCheck.mockResolvedValue({
        status: 'error',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        checks: {
          database: { status: 'error', message: 'Connection failed' },
        },
      });

      const response = await readyGET();

      expect(response.status).toBe(503);
    });

    it('should return 200 for degraded status', async () => {
      mockDetailedHealthCheck.mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        checks: {
          redis: { status: 'skipped', message: 'Not configured' },
        },
      });

      const response = await readyGET();

      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // GET /api/health/live - Liveness Probe
  // ============================================================================

  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      const response = await liveGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('alive');
    });

    it('should always return 200', async () => {
      const response = await liveGET();

      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // GET /api/health/detailed - Detailed Health Report
  // ============================================================================

  describe('GET /api/health/detailed', () => {
    it('should return comprehensive health report', async () => {
      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        system: {
          memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
          cpu: { cores: 8, model: 'Test CPU', loadAverage: [1, 1, 1] },
          process: { pid: 1234, uptime: 100, nodeVersion: 'v18.0.0', platform: 'linux', arch: 'x64' },
        },
        services: {
          database: { status: 'ok' },
          redis: { status: 'skipped' },
          email: { resend: { status: 'ok' }, emailjs: { status: 'ok' } },
          analytics: { umami: { status: 'skipped' }, plausible: { status: 'skipped' }, google: { status: 'skipped' } },
          monitoring: { sentry: { status: 'skipped' } },
          external: { github: { status: 'ok' } },
        },
        configuration: {
          requiredEnvVars: { allPresent: true, missing: [] },
          optionalEnvVars: { present: [], missing: [] },
          security: { jwtConfigured: true, httpsEnabled: true, csrfConfigured: true },
        },
      });

      const response = await detailedGET(new Request('http://localhost/api/health/detailed'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.system).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.configuration).toBeDefined();
    });

    it('should filter response based on include parameter', async () => {
      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        system: {
          memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
          cpu: { cores: 8, model: 'Test CPU', loadAverage: [1, 1, 1] },
          process: { pid: 1234, uptime: 100, nodeVersion: 'v18.0.0', platform: 'linux', arch: 'x64' },
        },
        services: {
          database: { status: 'ok' },
          redis: { status: 'skipped' },
          email: { resend: { status: 'ok' }, emailjs: { status: 'ok' } },
          analytics: { umami: { status: 'skipped' }, plausible: { status: 'skipped' }, google: { status: 'skipped' } },
          monitoring: { sentry: { status: 'skipped' } },
          external: { github: { status: 'ok' } },
        },
        configuration: {
          requiredEnvVars: { allPresent: true, missing: [] },
          optionalEnvVars: { present: [], missing: [] },
          security: { jwtConfigured: true, httpsEnabled: true, csrfConfigured: true },
        },
      });

      const response = await detailedGET(
        new Request('http://localhost/api/health/detailed?include=system,services')
      );
      const data = await response.json();

      expect(data.system).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.configuration).toBeUndefined();
    });

    it('should include status, timestamp, version, uptime, environment in filtered response', async () => {
      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        system: { memory: {}, cpu: {}, process: {} },
        services: {},
        configuration: {},
      });

      const response = await detailedGET(
        new Request('http://localhost/api/health/detailed?include=system')
      );
      const data = await response.json();

      expect(data.status).toBe('ok');
      expect(data.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(data.version).toBe('1.0.0');
      expect(data.uptime).toBe(100);
      expect(data.environment).toBe('test');
    });

    it('should handle errors gracefully', async () => {
      mockComprehensiveHealthReport.mockRejectedValue(new Error('Health check failed'));

      const response = await detailedGET(new Request('http://localhost/api/health/detailed'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toContain('Health check failed');
    });

    it('should handle unknown errors', async () => {
      mockComprehensiveHealthReport.mockRejectedValue('Unknown error string');

      const response = await detailedGET(new Request('http://localhost/api/health/detailed'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Unknown error during health check');
    });

    it('should return 503 for error status', async () => {
      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'error',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        system: {},
        services: {},
        configuration: {},
      });

      const response = await detailedGET(new Request('http://localhost/api/health/detailed'));

      expect(response.status).toBe(503);
    });

    it('should return 200 for degraded status', async () => {
      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
        system: {},
        services: {},
        configuration: {},
      });

      const response = await detailedGET(new Request('http://localhost/api/health/detailed'));

      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // HEAD /api/health/detailed - Lightweight Check
  // ============================================================================

  describe('HEAD /api/health/detailed', () => {
    it('should return 200 status', async () => {
      const response = await detailedHEAD();

      expect(response.status).toBe(200);
    });

    it('should return null body', async () => {
      const response = await detailedHEAD();

      expect(response.body).toBeNull();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('all endpoints should be accessible', async () => {
      mockBasicHealthCheck.mockReturnValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
      });

      mockDetailedHealthCheck.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
        checks: {},
      });

      mockComprehensiveHealthReport.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
        system: {},
        services: {},
        configuration: {},
      });

      const responses = await Promise.all([
        healthGET(),
        healthHEAD(),
        readyGET(),
        liveGET(),
        detailedGET(new Request('http://localhost/api/health/detailed')),
        detailedHEAD(),
      ]);

      // All should return valid responses (no exceptions thrown)
      expect(responses).toHaveLength(6);
      expect(responses.every(r => r instanceof NextResponse)).toBe(true);
    });
  });
});
