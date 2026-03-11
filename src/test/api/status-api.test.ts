/**
 * Status API 单元测试
 * 测试状态 API 端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/status/route';
import type { StatusApiService } from '@/test/types';

describe('Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/status', () => {
    it('should return status with 200', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it('should return correct content-type', async () => {
      const response = await GET();
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return overall status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(['operational', 'degraded', 'outage']).toContain(data.status);
    });

    it('should return lastUpdated timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('lastUpdated');
      const date = new Date(data.lastUpdated);
      expect(date.toISOString()).toBe(data.lastUpdated);
    });

    it('should return services array', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('services');
      expect(Array.isArray(data.services)).toBe(true);
      expect(data.services.length).toBeGreaterThan(0);
    });

    it('should have correct service structure', async () => {
      const response = await GET();
      const data = await response.json();

      data.services.forEach((service: any) => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('uptime');
        expect(service).toHaveProperty('responseTime');
        expect(typeof service.name).toBe('string');
        expect(['operational', 'degraded', 'outage']).toContain(service.status);
      });
    });

    it('should return metrics object', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toHaveProperty('requests');
      expect(data.metrics).toHaveProperty('errors');
      expect(data.metrics).toHaveProperty('avgResponseTime');
      expect(data.metrics).toHaveProperty('p95ResponseTime');
    });

    it('should return incidents array', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('incidents');
      expect(Array.isArray(data.incidents)).toBe(true);
    });

    it('should return maintenance array', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('maintenance');
      expect(Array.isArray(data.maintenance)).toBe(true);
    });

    it('should return valid JSON structure', async () => {
      const response = await GET();
      const data = await response.json();

      // Ensure all expected keys exist
      const expectedKeys = ['status', 'lastUpdated', 'services', 'metrics', 'incidents', 'maintenance'];
      expectedKeys.forEach(key => {
        expect(data).toHaveProperty(key);
      });
    });

    it('should have Website service', async () => {
      const response = await GET();
      const data = await response.json();

      const websiteService = data.services.find((s: any) => s.name === 'Website');
      expect(websiteService).toBeDefined();
      expect(websiteService.status).toBe('operational');
    });

    it('should have API service', async () => {
      const response = await GET();
      const data = await response.json();

      const apiService = data.services.find((s: any) => s.name === 'API');
      expect(apiService).toBeDefined();
      expect(apiService.status).toBe('operational');
    });

    it('should have CDN service', async () => {
      const response = await GET();
      const data = await response.json();

      const cdnService = data.services.find((s: any) => s.name === 'CDN');
      expect(cdnService).toBeDefined();
      expect(cdnService.status).toBe('operational');
    });

    it('should return numeric uptime values', async () => {
      const response = await GET();
      const data = await response.json();

      data.services.forEach((service: any) => {
        expect(typeof service.uptime).toBe('number');
        expect(service.uptime).toBeGreaterThanOrEqual(0);
        expect(service.uptime).toBeLessThanOrEqual(100);
      });
    });

    it('should return numeric response time values', async () => {
      const response = await GET();
      const data = await response.json();

      data.services.forEach((service: any) => {
        expect(typeof service.responseTime).toBe('number');
        expect(service.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return numeric metrics values', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.metrics.requests).toBe('number');
      expect(typeof data.metrics.errors).toBe('number');
      expect(typeof data.metrics.avgResponseTime).toBe('number');
      expect(typeof data.metrics.p95ResponseTime).toBe('number');
    });
  });
});