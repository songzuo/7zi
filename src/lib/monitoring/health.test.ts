import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  basicHealthCheck,
  detailedHealthCheck,
  healthResponse,
  probes,
} from './health';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({ data, status: options?.status || 200 })),
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

        expect(response.data.status).toBe('started');
        expect(response.status).toBe(200);
      });
    });
  });
});