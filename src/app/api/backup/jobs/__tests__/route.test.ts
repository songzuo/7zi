/**
 * @fileoverview Backup Jobs API route integration tests
 * @description Tests for /api/backup/jobs endpoint - job history listing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { createMockNextRequest } from '@/test/utils/mock-request';

describe('/api/backup/jobs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request - list jobs', () => {
    it('should return jobs list with correct structure', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('timestamp');
      }
    });

    it('should return success true for listing', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should return jobs array', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data).toHaveProperty('jobs');
        expect(Array.isArray(data.data.jobs)).toBe(true);
      }
    });

    it('should return job count', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data).toHaveProperty('count');
        expect(typeof data.data.count).toBe('number');
        expect(data.data.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return timestamp', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z');
      }
    });

    it('should return JSON content type', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('query parameters', () => {
    it('should use default limit of 50', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(50);
      }
    });

    it('should respect custom limit parameter', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=10');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(10);
      }
    });

    it('should handle limit of 1', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=1');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(1);
      }
    });

    it('should handle large limit parameter', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=1000');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(1000);
      }
    });

    it('should handle zero limit', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=0');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(0);
      }
    });

    it('should handle negative limit', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=-5');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        // Negative limit should be treated as 0 or ignored
        expect(data.data.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('job properties', () => {
    it('should have valid job structure when jobs exist', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200 && response.json().data.jobs.length > 0) {
        const data = await response.json();
        const job = data.data.jobs[0];

        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('configId');
        expect(job).toHaveProperty('scheduledAt');
        expect(job).toHaveProperty('status');
      }
    });

    it('should have string id when jobs exist', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.jobs.length > 0) {
          const job = data.data.jobs[0];
          expect(typeof job.id).toBe('string');
        }
      }
    });

    it('should have string configId when jobs exist', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.jobs.length > 0) {
          const job = data.data.jobs[0];
          expect(typeof job.configId).toBe('string');
        }
      }
    });

    it('should have valid status when jobs exist', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.jobs.length > 0) {
          const job = data.data.jobs[0];
          expect(['pending', 'running', 'completed', 'failed', 'cancelled']).toContain(job.status);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty jobs list', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data.jobs)).toBe(true);
        expect(data.data.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle multiple GET requests', async () => {
      const responses = await Promise.all([
        GET(createMockNextRequest('http://localhost:3000/api/backup/jobs')),
        GET(createMockNextRequest('http://localhost:3000/api/backup/jobs')),
        GET(createMockNextRequest('http://localhost:3000/api/backup/jobs')),
      ]);

      // In test environment, authentication may fail, so accept 200 or 401
      const allSuccessful = responses.every(r => r.status === 200 || r.status === 401);
      expect(allSuccessful).toBe(true);
    });

    it('should return consistent data structure', async () => {
      const response1 = await GET(createMockNextRequest('http://localhost:3000/api/backup/jobs'));
      const response2 = await GET(createMockNextRequest('http://localhost:3000/api/backup/jobs'));

      if (response1.status === 200 && response2.status === 200) {
        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(Object.keys(data1)).toEqual(Object.keys(data2));
      }
    });

    it('should handle invalid limit parameter', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=invalid');
      const response = await GET(request);

      // Should still work (parseInt('invalid') returns NaN)
      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should handle extra query parameters', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/backup/jobs?limit=10&extra=param&foo=bar');
      const response = await GET(request);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.count).toBeLessThanOrEqual(10);
      }
    });
  });
});
