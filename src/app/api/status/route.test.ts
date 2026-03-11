/**
 * 测试 src/app/api/status/route.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data) => ({
      json: data,
      status: 200,
    })),
  },
}));

describe('api/status/route', () => {
  describe('GET', () => {
    it('should return system status', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      
      expect(response.json.status).toBeDefined();
      expect(response.json.lastUpdated).toBeDefined();
      expect(response.json.services).toBeDefined();
      expect(response.json.metrics).toBeDefined();
      expect(response.json.incidents).toBeDefined();
      expect(response.json.maintenance).toBeDefined();
    });

    it('should have valid status value', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      
      expect(['operational', 'degraded', 'outage']).toContain(response.json.status);
    });

    it('should return services array', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      const services = response.json.services as Array<Record<string, unknown>>;
      
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
      const response = await GET() as { json: Record<string, unknown> };
      const metrics = response.json.metrics as Record<string, unknown>;
      
      expect(typeof metrics.requests).toBe('number');
      expect(typeof metrics.errors).toBe('number');
      expect(typeof metrics.avgResponseTime).toBe('number');
      expect(typeof metrics.p95ResponseTime).toBe('number');
    });

    it('should return incidents array', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      
      expect(Array.isArray(response.json.incidents)).toBe(true);
    });

    it('should return maintenance array', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      
      expect(Array.isArray(response.json.maintenance)).toBe(true);
    });

    it('should have valid ISO 8601 timestamp', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      const lastUpdated = response.json.lastUpdated as string;
      
      // Check ISO 8601 format
      expect(new Date(lastUpdated).toISOString()).toBe(lastUpdated);
    });

    it('should have expected services', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      const services = response.json.services as Array<Record<string, unknown>>;
      const serviceNames = services.map((s) => s.name);
      
      expect(serviceNames).toContain('Website');
      expect(serviceNames).toContain('API');
      expect(serviceNames).toContain('CDN');
    });

    it('should have reasonable metric values', async () => {
      const response = await GET() as { json: Record<string, unknown> };
      const metrics = response.json.metrics as Record<string, unknown>;
      
      // Requests should be positive
      expect(metrics.requests as number).toBeGreaterThan(0);
      
      // Errors should be non-negative
      expect(metrics.errors as number).toBeGreaterThanOrEqual(0);
      
      // Response times should be reasonable (< 1 second)
      expect(metrics.avgResponseTime as number).toBeLessThan(1000);
      expect(metrics.p95ResponseTime as number).toBeLessThan(1000);
    });
  });
});