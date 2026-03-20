/**
 * @fileoverview Health API route integration tests
 * @description Tests for /api/health endpoint - health check for Kubernetes/Docker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('/api/health', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request', () => {
    it('should return health status with correct structure', async () => {
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('timestamp');
      const data = body.data;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('checks');
    });

    it('should return healthy status', async () => {
      const response = await GET();
      const body = await response.json();
      const data = body.data;

      expect(data.status).toBe('healthy');
    });

    it('should return timestamp', async () => {
      const response = await GET();
      const body = await response.json();
      const data = body.data;

      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z');
    });

    it('should return uptime in seconds', async () => {
      const response = await GET();
      const body = await response.json();
      const data = body.data;

      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.uptime).toBe('number');
    });

    it('should return version string', async () => {
      const response = await GET();
      const body = await response.json();
      const data = body.data;

      expect(typeof data.version).toBe('string');
      expect(data.version.length).toBeGreaterThan(0);
    });

    describe('checks', () => {
      it('should return checks object', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks).toHaveProperty('memory');
        expect(data.checks).toHaveProperty('node');
      });

      it('should return memory check with correct structure', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.memory).toHaveProperty('status');
        expect(data.checks.memory).toHaveProperty('used');
        expect(data.checks.memory).toHaveProperty('limit');
      });

      it('should return memory status as ok or warning', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(['ok', 'warning']).toContain(data.checks.memory.status);
      });

      it('should return memory used in MB', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.memory.used).toBeGreaterThanOrEqual(0);
        expect(typeof data.checks.memory.used).toBe('number');
      });

      it('should return memory limit in MB', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.memory.limit).toBe(512);
      });

      it('should return node check with correct structure', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.node).toHaveProperty('status');
        expect(data.checks.node).toHaveProperty('version');
      });

      it('should return node status as ok', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.node.status).toBe('ok');
      });

      it('should return Node.js version', async () => {
        const response = await GET();
        const body = await response.json();
        const data = body.data;

        expect(data.checks.node.version).toMatch(/^v\d+\.\d+\.\d+/);
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

      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it('should return consistent data structure', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const body1 = await response1.json();
      const body2 = await response2.json();
      const data1 = body1.data;
      const data2 = body2.data;

      expect(Object.keys(data1)).toEqual(Object.keys(data2));
      expect(typeof data1.uptime).toBe('number');
      expect(typeof data2.uptime).toBe('number');
    });
  });

  describe('memory threshold validation', () => {
    it('should return 200 when memory is below 90% threshold', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe('status enum validation', () => {
    it('should only return valid status values', async () => {
      const response = await GET();
      const body = await response.json();
      const data = body.data;

      const validStatuses = ['healthy', 'unhealthy'];
      expect(validStatuses).toContain(data.status);
    });
  });
});
