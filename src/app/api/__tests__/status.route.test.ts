/**
 * @fileoverview Status API route integration tests
 * @description Tests for /api/status endpoint - status page data aggregation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../status/route';

describe('/api/status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET request', () => {
    it('should return status data with correct structure', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('incidents');
      expect(data).toHaveProperty('maintenance');
    });

    it('should return operational status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('operational');
    });

    it('should return lastUpdated timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.lastUpdated).toBe('2026-03-18T08:00:00.000Z');
    });

    describe('services', () => {
      it('should return list of services', async () => {
        const response = await GET();
        const data = await response.json();

        expect(Array.isArray(data.services)).toBe(true);
        expect(data.services.length).toBeGreaterThan(0);
      });

      it('should include Website service', async () => {
        const response = await GET();
        const data = await response.json();

        const website = data.services.find((s: { name: string }) => s.name === 'Website');
        expect(website).toBeDefined();
        expect(website.status).toBe('operational');
        expect(website).toHaveProperty('uptime');
        expect(website).toHaveProperty('responseTime');
      });

      it('should include API service', async () => {
        const response = await GET();
        const data = await response.json();

        const api = data.services.find((s: { name: string }) => s.name === 'API');
        expect(api).toBeDefined();
        expect(api.status).toBe('operational');
        expect(api.uptime).toBeGreaterThan(90);
        expect(api.responseTime).toBeGreaterThan(0);
      });

      it('should include CDN service', async () => {
        const response = await GET();
        const data = await response.json();

        const cdn = data.services.find((s: { name: string }) => s.name === 'CDN');
        expect(cdn).toBeDefined();
        expect(cdn.status).toBe('operational');
      });

      it('should have valid uptime percentages', async () => {
        const response = await GET();
        const data = await response.json();

        data.services.forEach((service: { uptime: number }) => {
          expect(service.uptime).toBeGreaterThanOrEqual(0);
          expect(service.uptime).toBeLessThanOrEqual(100);
        });
      });

      it('should have valid response times in milliseconds', async () => {
        const response = await GET();
        const data = await response.json();

        data.services.forEach((service: { responseTime: number }) => {
          expect(service.responseTime).toBeGreaterThan(0);
          expect(service.responseTime).toBeLessThan(5000); // 5 seconds max
        });
      });
    });

    describe('metrics', () => {
      it('should return 24-hour metrics', async () => {
        const response = await GET();
        const data = await response.json();

        expect(data.metrics).toHaveProperty('requests');
        expect(data.metrics).toHaveProperty('errors');
        expect(data.metrics).toHaveProperty('avgResponseTime');
        expect(data.metrics).toHaveProperty('p95ResponseTime');
      });

      it('should have positive request count', async () => {
        const response = await GET();
        const data = await response.json();

        expect(data.metrics.requests).toBeGreaterThan(0);
        expect(typeof data.metrics.requests).toBe('number');
      });

      it('should have error count', async () => {
        const response = await GET();
        const data = await response.json();

        expect(data.metrics.errors).toBeGreaterThanOrEqual(0);
        expect(typeof data.metrics.errors).toBe('number');
      });

      it('should have valid response time metrics', async () => {
        const response = await GET();
        const data = await response.json();

        expect(data.metrics.avgResponseTime).toBeGreaterThan(0);
        expect(data.metrics.p95ResponseTime).toBeGreaterThan(data.metrics.avgResponseTime);
      });

      it('should calculate error rate under threshold', async () => {
        const response = await GET();
        const data = await response.json();

        const errorRate = data.metrics.errors / data.metrics.requests;
        expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate
      });
    });

    describe('incidents', () => {
      it('should return incidents array', async () => {
        const response = await GET();
        const data = await response.json();

        expect(Array.isArray(data.incidents)).toBe(true);
      });

      it('should handle empty incidents array', async () => {
        const response = await GET();
        const data = await response.json();

        // Should not throw error even if empty
        expect(() => {
          data.incidents.forEach((incident: any) => {
            expect(incident).toHaveProperty('id');
            expect(incident).toHaveProperty('title');
            expect(incident).toHaveProperty('status');
          });
        }).not.toThrow();
      });
    });

    describe('maintenance', () => {
      it('should return maintenance array', async () => {
        const response = await GET();
        const data = await response.json();

        expect(Array.isArray(data.maintenance)).toBe(true);
      });

      it('should handle empty maintenance array', async () => {
        const response = await GET();
        const data = await response.json();

        // Should not throw error even if empty
        expect(() => {
          data.maintenance.forEach((item: any) => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('title');
            expect(item).toHaveProperty('startTime');
          });
        }).not.toThrow();
      });
    });
  });

  describe('response headers', () => {
    it('should return JSON content type', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should include CORS headers if configured', async () => {
      const response = await GET();

      // CORS may not be implemented yet, so this is informational
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (corsHeader) {
        expect(corsHeader).toBe('*');
      }
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

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1)).toEqual(Object.keys(data2));
      expect(data1.services).toHaveLength(data2.services.length);
    });
  });

  describe('status enum validation', () => {
    it('should only return valid status values', async () => {
      const response = await GET();
      const data = await response.json();

      const validStatuses = ['operational', 'degraded', 'outage'];
      expect(validStatuses).toContain(data.status);

      data.services.forEach((service: { status: string }) => {
        expect(validStatuses).toContain(service.status);
      });
    });
  });
});
