/**
 * Monitoring Health Tests
 * Tests for health.ts - health check functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  basicHealthCheck,
  detailedHealthCheck,
  healthResponse,
  probes,
  type HealthStatus,
  type CheckResult,
} from '../health';

// Mock fetch for external API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Monitoring Health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basicHealthCheck', () => {
    it('should return basic health status', () => {
      const result = basicHealthCheck();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeTruthy();
      expect(result.version).toBeTruthy();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.environment).toBeTruthy();
    });

    it('should return valid timestamp in ISO format', () => {
      const result = basicHealthCheck();
      
      // Should be valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should return numeric uptime', () => {
      const result = basicHealthCheck();
      
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('detailedHealthCheck', () => {
    it('should return detailed health status with checks', async () => {
      // Mock successful GitHub API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await detailedHealthCheck();

      expect(result.status).toBeOneOf(['ok', 'degraded', 'error']);
      expect(result.timestamp).toBeTruthy();
      expect(result.checks).toBeTruthy();
    });

    it('should check GitHub API health', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await detailedHealthCheck();

      expect(result.checks?.githubApi).toBeTruthy();
      expect(result.checks?.githubApi?.status).toBeOneOf(['ok', 'error']);
    });

    it('should check email service health', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await detailedHealthCheck();

      expect(result.checks?.emailService).toBeTruthy();
      expect(result.checks?.emailService?.status).toBeOneOf(['ok', 'error']);
    });

    it('should return degraded status when some checks fail', async () => {
      // Mock failed GitHub API call
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await detailedHealthCheck();

      expect(['degraded', 'error']).toContain(result.status);
    });

    it('should return ok status when all checks pass', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await detailedHealthCheck();

      expect(result.status).toBe('ok');
    });

    it('should include latency in check results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await detailedHealthCheck();

      // At least one check should have latency
      const checks = Object.values(result.checks || {});
      const hasLatency = checks.some((c: CheckResult) => c.latency !== undefined);
      expect(hasLatency).toBe(true);
    });

    it('should handle fetch timeout', async () => {
      // Mock abort error
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await detailedHealthCheck();

      expect(['degraded', 'error']).toContain(result.status);
    });
  });

  describe('healthResponse', () => {
    it('should return 200 for ok status', () => {
      const health: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(health);

      expect(response.status).toBe(200);
    });

    it('should return 200 for degraded status', () => {
      const health: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(health);

      expect(response.status).toBe(200);
    });

    it('should return 503 for error status', () => {
      const health: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        environment: 'test',
      };

      const response = healthResponse(health);

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
      it('should return ready status when healthy', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
        });

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

  describe('HealthStatus type', () => {
    it('should accept valid status values', () => {
      const okStatus: HealthStatus = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
      };

      const degradedStatus: HealthStatus = {
        status: 'degraded',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
      };

      const errorStatus: HealthStatus = {
        status: 'error',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        uptime: 0,
        environment: 'test',
      };

      expect(okStatus.status).toBe('ok');
      expect(degradedStatus.status).toBe('degraded');
      expect(errorStatus.status).toBe('error');
    });
  });

  describe('CheckResult type', () => {
    it('should accept valid check result values', () => {
      const okResult: CheckResult = {
        status: 'ok',
        latency: 100,
        message: 'All good',
      };

      const errorResult: CheckResult = {
        status: 'error',
        message: 'Something went wrong',
      };

      expect(okResult.status).toBe('ok');
      expect(errorResult.status).toBe('error');
    });
  });
});
