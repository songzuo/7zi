import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  basicHealthCheck,
  detailedHealthCheck,
  comprehensiveHealthReport,
  getSystemResources,
  healthResponse,
  probes,
} from './health';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock NextResponse
interface MockNextResponse {
  data: unknown;
  status: number;
}

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options): MockNextResponse => ({ data, status: options?.status || 200 })),
  },
}));

describe('Health Check Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', '1.0.0-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('basicHealthCheck', () => {
    it('should return basic health status', () => {
      const status = basicHealthCheck();

      expect(status.status).toBe('ok');
      expect(status.timestamp).toBeDefined();
      expect(status.version).toBe('1.0.0-test');
      expect(status.uptime).toBeGreaterThanOrEqual(0);
      expect(status.environment).toBe('test');
    });

    it('should return unknown version when SENTRY_RELEASE is not set', () => {
      vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', '');

      const status = basicHealthCheck();

      expect(status.version).toBe('unknown');
    });

    it('should return unknown environment when NODE_ENV is not set', () => {
      vi.stubEnv('NODE_ENV', '');

      const status = basicHealthCheck();

      expect(status.environment).toBe('unknown');
    });

    it('should return valid ISO timestamp', () => {
      const status = basicHealthCheck();

      const timestamp = new Date(status.timestamp);
      expect(timestamp.toISOString()).toBe(status.timestamp);
    });
  });

  describe('detailedHealthCheck', () => {
    it('should return ok status when all checks pass', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const status = await detailedHealthCheck();

      expect(status.status).toBe('ok');
      expect(status.checks).toBeDefined();
    });

    it('should return degraded status when some checks fail', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // GitHub API
        .mockResolvedValueOnce({ ok: false, status: 500 }); // Resend API

      const status = await detailedHealthCheck();

      expect(status.status).toBe('degraded');
    });

    it('should return error status when all checks fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const status = await detailedHealthCheck();

      expect(status.status).toBe('error');
    });

    it('should include GitHub API check', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const status = await detailedHealthCheck();

      expect(status.checks?.githubApi).toBeDefined();
    });

    it('should skip Resend check when API key not configured', async () => {
      vi.stubEnv('RESEND_API_KEY', '');
      mockFetch.mockResolvedValue({ ok: true });

      const status = await detailedHealthCheck();

      expect(status.checks?.emailService).toBeDefined();
      expect(status.checks?.emailService?.message).toContain('not configured');
    });

    it('should handle GitHub API timeout', async () => {
      vi.useFakeTimers();

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 10000);
          })
      );

      const healthPromise = detailedHealthCheck();
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      const status = await healthPromise;

      expect(status.checks?.githubApi?.status).toBe('error');

      vi.useRealTimers();
    });

    it('should measure latency for successful checks', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const status = await detailedHealthCheck();

      expect(status.checks?.githubApi?.latency).toBeDefined();
      expect(status.checks?.githubApi?.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-OK HTTP responses', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const status = await detailedHealthCheck();

      expect(status.checks?.githubApi?.status).toBe('error');
      expect(status.checks?.githubApi?.message).toContain('503');
    });
  });

  describe('getSystemResources', () => {
    it('should return system resource information', () => {
      const resources = getSystemResources();

      expect(resources.memory).toBeDefined();
      expect(resources.memory.total).toBeGreaterThan(0);
      expect(resources.memory.used).toBeGreaterThanOrEqual(0);
      expect(resources.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(resources.memory.usagePercent).toBeLessThanOrEqual(100);

      expect(resources.cpu).toBeDefined();
      expect(resources.cpu.cores).toBeGreaterThan(0);
      expect(resources.cpu.model).toBeDefined();
      expect(resources.cpu.loadAverage).toHaveLength(3);

      expect(resources.process).toBeDefined();
      expect(resources.process.pid).toBeGreaterThan(0);
      expect(resources.process.nodeVersion).toMatch(/^v\d+/);
      expect(resources.process.platform).toBeDefined();
      expect(resources.process.arch).toBeDefined();
    });
  });

  describe('comprehensiveHealthReport', () => {
    it('should return comprehensive health report', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const report = await comprehensiveHealthReport();

      expect(report.status).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.version).toBeDefined();
      expect(report.uptime).toBeGreaterThanOrEqual(0);
      expect(report.environment).toBeDefined();

      expect(report.system).toBeDefined();
      expect(report.services).toBeDefined();
      expect(report.configuration).toBeDefined();
    });

    it('should check all services', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const report = await comprehensiveHealthReport();

      expect(report.services.database).toBeDefined();
      expect(report.services.redis).toBeDefined();
      expect(report.services.email.resend).toBeDefined();
      expect(report.services.email.emailjs).toBeDefined();
      expect(report.services.analytics.umami).toBeDefined();
      expect(report.services.analytics.plausible).toBeDefined();
      expect(report.services.analytics.google).toBeDefined();
      expect(report.services.monitoring.sentry).toBeDefined();
      expect(report.services.external.github).toBeDefined();
    });

    it('should report skipped status for unconfigured services', async () => {
      vi.stubEnv('DATABASE_URL', '');
      vi.stubEnv('REDIS_URL', '');
      mockFetch.mockResolvedValue({ ok: true });

      const report = await comprehensiveHealthReport();

      expect(report.services.database.status).toBe('skipped');
      expect(report.services.redis.status).toBe('skipped');
    });

    it('should check configuration status', async () => {
      vi.stubEnv('JWT_SECRET', 'test-secret-key-at-least-32-chars-long');
      vi.stubEnv('CSRF_SECRET', 'test-csrf-secret-at-least-32-chars');
      mockFetch.mockResolvedValue({ ok: true });

      const report = await comprehensiveHealthReport();

      expect(report.configuration.requiredEnvVars).toBeDefined();
      expect(report.configuration.optionalEnvVars).toBeDefined();
      expect(report.configuration.security).toBeDefined();
    });

    it('should detect security issues', async () => {
      vi.stubEnv('JWT_SECRET', 'short');
      vi.stubEnv('CSRF_SECRET', 'short');
      mockFetch.mockResolvedValue({ ok: true });

      const report = await comprehensiveHealthReport();

      expect(report.configuration.security.jwtConfigured).toBe(false);
      expect(report.configuration.security.csrfConfigured).toBe(false);
      expect(report.status).toBe('error');
    });

    it('should run all checks in parallel', async () => {
      const startTime = Date.now();

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 100);
          })
      );

      await comprehensiveHealthReport();

      const duration = Date.now() - startTime;
      // All checks run in parallel, so should complete in ~100ms, not 300ms+
      expect(duration).toBeLessThan(500);
    });
  });

  describe('healthResponse', () => {
    it('should return 200 for ok status', () => {
      const status = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(status);

      expect(response.status).toBe(200);
    });

    it('should return 200 for degraded status', () => {
      const status = {
        status: 'degraded' as const,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(status);

      expect(response.status).toBe(200);
    });

    it('should return 503 for error status', () => {
      const status = {
        status: 'error' as const,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(status);

      expect(response.status).toBe(503);
    });
  });

  describe('Kubernetes probes', () => {
    describe('liveness probe', () => {
      it('should return alive status', () => {
        const response = probes.liveness();

        expect(response.data).toEqual({ status: 'alive' });
        expect(response.status).toBe(200);
      });
    });

    describe('readiness probe', () => {
      it('should return ready status when healthy', async () => {
        mockFetch.mockResolvedValue({ ok: true });

        const response = await probes.readiness();

        expect(response.status).toBe(200);
      });

      it('should return 503 when unhealthy', async () => {
        mockFetch.mockRejectedValue(new Error('Unhealthy'));

        const response = await probes.readiness();

        expect(response.status).toBe(503);
      });
    });

    describe('startup probe', () => {
      it('should return started status', () => {
        const response = probes.startup();

        expect((response as unknown as { data: { status: string } }).data.status).toBe('started');
        expect(response.status).toBe(200);
      });
    });
  });
});