/**
 * Health Monitoring Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  basicHealthCheck,
  detailedHealthCheck,
  healthResponse,
  probes,
  HealthStatus,
} from '@/lib/monitoring/health';

// Mock process.uptime
vi.spyOn(process, 'uptime').mockReturnValue(3600);

// Mock fetch
global.fetch = vi.fn();

describe('Health Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', 'v1.0.0');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('basicHealthCheck', () => {
    it('should return basic health status', () => {
      const health = basicHealthCheck();

      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBe('v1.0.0');
      expect(health.uptime).toBe(3600);
      expect(health.environment).toBe('test');
    });

    it('should use unknown for missing version', () => {
      vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', undefined);
      
      const health = basicHealthCheck();
      expect(health.version).toBe('unknown');
    });

    it('should use unknown for missing environment', () => {
      vi.stubEnv('NODE_ENV', undefined);
      
      const health = basicHealthCheck();
      expect(health.environment).toBe('unknown');
    });
  });

  describe('detailedHealthCheck', () => {
    it('should return ok status when all services are healthy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const health = await detailedHealthCheck();

      expect(health.status).toBe('ok');
      expect(health.checks).toBeDefined();
      expect(health.checks?.githubApi?.status).toBe('ok');
      expect(health.checks?.emailService?.status).toBe('ok');
    });

    it('should return degraded when some services fail', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response);

      const health = await detailedHealthCheck();

      expect(health.status).toBe('degraded');
      expect(health.checks?.githubApi?.status).toBe('error');
      expect(health.checks?.emailService?.status).toBe('ok');
    });

    it('should return error when all services fail', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const health = await detailedHealthCheck();

      expect(health.status).toBe('error');
      expect(health.checks?.githubApi?.status).toBe('error');
      expect(health.checks?.emailService?.status).toBe('error');
    });

    it('should include latency in check results', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const health = await detailedHealthCheck();

      expect(health.checks?.githubApi?.latency).toBeDefined();
      expect(typeof health.checks?.githubApi?.latency).toBe('number');
    });
  });

  describe('healthResponse', () => {
    it('should return 200 for ok status', () => {
      const status: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      };

      const response = healthResponse(status);
      
      expect(response.status).toBe(200);
    });

    it('should return 200 for degraded status', () => {
      const status: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      };

      const response = healthResponse(status);
      expect(response.status).toBe(200);
    });

    it('should return 503 for error status', () => {
      const status: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      };

      const response = healthResponse(status);
      expect(response.status).toBe(503);
    });
  });

  describe('probes', () => {
    describe('liveness', () => {
      it('should return alive status', () => {
        const response = probes.liveness();
        
        expect(response.status).toBe(200);
      });
    });

    describe('readiness', () => {
      it('should check detailed health', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
        } as unknown as Response);

        const response = await probes.readiness();
        
        expect(response.status).toBe(200);
      });
    });

    describe('startup', () => {
      it('should return started status', () => {
        const response = probes.startup();
        
        expect(response.status).toBe(200);
      });
    });
  });
});
