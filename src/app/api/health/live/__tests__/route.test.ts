/**
 * @fileoverview Health/Live API route integration tests
 * @description Tests for /api/health/live endpoint - Kubernetes liveness probe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('/api/health/live', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request', () => {
    it('should return 200 status', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return alive status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data.status).toBe('alive');
    });

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

      const data = await responses[0].json();
      expect(data.status).toBe('alive');
    });

    it('should return consistent data structure', async () => {
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1).toEqual(data2);
      expect(data1.status).toBe('alive');
    });
  });

  describe('Kubernetes requirements', () => {
    it('should always return 200 (liveness probe requirement)', async () => {
      const response = await GET();

      // Liveness probes should always return 200 if the process is running
      expect(response.status).toBe(200);
    });

    it('should return minimal response for fast checks', async () => {
      const response = await GET();
      const data = await response.json();

      // Should return minimal data for fast liveness checks
      expect(Object.keys(data)).toEqual(['status']);
    });
  });
});
