/**
 * 测试 src/app/api/status/route.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

// Properly mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: ResponseInit) => {
      const response = new NextResponse(JSON.stringify(data), init);
      // Add json method for testing
      (response as unknown as { json: () => Promise<unknown> }).json = async () => data;
      return response;
    }),
  },
}));

describe('api/status/route', () => {
  describe('GET', () => {
    it('should return system status', async () => {
      const response = await GET();
      const data = await response.json() as Record<string, unknown>;
      
      expect(data.status).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.incidents).toBeDefined();
      expect(data.maintenance).toBeDefined();
    });

    it('should have valid status value', async () => {
      const response = await GET();
      const data = await response.json() as { status: string };
      
      expect(['operational', 'degraded', 'outage']).toContain(data.status);
    });

    it('should return services array', async () => {
      const response = await GET();
      const data = await response.json() as { services: Array<Record<string, unknown>> };
      const services = data.services;
      
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      
      services.forEach((service) => {
        expect(service.name).toBeDefined();
        expect(['operational', 'degraded', 'outage']).toContain(service.status);
        expect(typeof service.uptime).toBe('number');
        expect(typeof service.responseTime).toBe('number');
      });
    });

    it('should return metrics object', async () => {
      const response = await GET();
      const data = await response.json() as { metrics: Record<string, unknown> };
      const metrics = data.metrics;
      
      expect(typeof metrics.requests).toBe('number');
      expect(typeof metrics.errors).toBe('number');
      expect(typeof metrics.avgResponseTime).toBe('number');
      expect(typeof metrics.p95ResponseTime).toBe('number');
    });

    it('should return incidents array', async () => {
      const response = await GET();
      const data = await response.json() as { incidents: unknown[] };
      
      expect(Array.isArray(data.incidents)).toBe(true);
    });

    it('should return maintenance array', async () => {
      const response = await GET();
      const data = await response.json() as { maintenance: unknown[] };
      
      expect(Array.isArray(data.maintenance)).toBe(true);
    });

    it('should have valid ISO 8601 timestamp', async () => {
      const response = await GET();
      const data = await response.json() as { lastUpdated: string };
      const lastUpdated = data.lastUpdated;
      
      // Check ISO 8601 format
      expect(new Date(lastUpdated).toISOString()).toBe(lastUpdated);
    });

    it('should have expected services', async () => {
      const response = await GET();
      const data = await response.json() as { services: Array<{ name: string }> };
      const serviceNames = data.services.map((s) => s.name);
      
      expect(serviceNames).toContain('Website');
      expect(serviceNames).toContain('API');
      expect(serviceNames).toContain('CDN');
    });

    it('should have reasonable metric values', async () => {
      const response = await GET();
      const data = await response.json() as { metrics: Record<string, number> };
      const metrics = data.metrics;
      
      // Requests should be positive
      expect(metrics.requests).toBeGreaterThan(0);
      
      // Errors should be non-negative
      expect(metrics.errors).toBeGreaterThanOrEqual(0);
      
      // Response times should be reasonable (< 1 second)
      expect(metrics.avgResponseTime).toBeLessThan(1000);
      expect(metrics.p95ResponseTime).toBeLessThan(1000);
    });
  });
});