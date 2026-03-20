/**
 * @fileoverview Health/Ready API route integration tests
 * @description Tests for /api/health/ready endpoint - Kubernetes readiness probe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('/api/health/ready', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request', () => {
    it('should return readiness status with correct structure', async () => {
      const response = await GET();
      const data = await response.json();

      expect([200, 503]).toContain(response.status);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
    });

    it('should return ok, degraded, or error status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(['ok', 'degraded', 'error']).toContain(data.status);
    });

    it('should return timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z');
    });

    it('should return uptime in seconds', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.uptime).toBe('number');
    });

    it('should return version string', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.version).toBe('string');
    });

    it('should return environment string', async () => {
      const response = await GET();
      const data = await response.json();

      expect(['test', 'development', 'production']).toContain(data.environment);
    });

    describe('checks', () => {
      it('should return checks object when available', async () => {
        const response = await GET();
        const data = await response.json();

        // Checks may be present for detailed health checks
        if (data.checks) {
          expect(typeof data.checks).toBe('object');
        }
      });

      it('should include githubApi check if checks exist', async () => {
        const response = await GET();
        const data = await response.json();

        if (data.checks && data.checks.githubApi) {
          expect(data.checks.githubApi).toHaveProperty('status');
          expect(['ok', 'error']).toContain(data.checks.githubApi.status);
        }
      });

      it('should include emailService check if checks exist', async () => {
        const response = await GET();
        const data = await response.json();

        if (data.checks && data.checks.emailService) {
          expect(data.checks.emailService).toHaveProperty('status');
          expect(['ok', 'error']).toContain(data.checks.emailService.status);
        }
      });
    });
  });

  describe('response headers', () => {
    it('should return JSON content type', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid requests', async () => {
      const responses = await Promise.all([
        GET(),
        GET(),
        GET(),
      ]);

      // All should complete (may be 200 or 503 depending on health)
      expect(responses.every(r => r.status >= 200 && r.status < 600)).toBe(true);
    });

    it('should return consistent data structure', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1)).toEqual(Object.keys(data2));
    });
  });

  describe('Kubernetes requirements', () => {
    it('should return 200 or 503 based on health status', async () => {
      const response = await GET();

      // Readiness probes should return 200 if ready, 503 if not
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('status mapping', () => {
    it('should map ok status to 200', async () => {
      const response = await GET();
      const data = await response.json();

      if (data.status === 'ok') {
        expect(response.status).toBe(200);
      }
    });

    it('should map degraded status to 200', async () => {
      const response = await GET();
      const data = await response.json();

      if (data.status === 'degraded') {
        expect(response.status).toBe(200);
      }
    });

    it('should map error status to 503', async () => {
      const response = await GET();
      const data = await response.json();

      if (data.status === 'error') {
        expect(response.status).toBe(503);
      }
    });
  });
});
