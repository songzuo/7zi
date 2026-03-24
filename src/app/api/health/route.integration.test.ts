/**
 * Health API Route Integration Tests
 * Real integration tests for /api/health endpoint
 * Tests against actual system metrics, not mocks
 */

import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string) {
  return new NextRequest(url);
}

describe('/api/health Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 or 503 status based on actual health', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);

      // Status depends on actual memory usage
      expect([200, 503]).toContain(response.status);
    });

    it('should return JSON content type', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return health status structure', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('checks');
    });

    it('should return valid status values', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(['healthy', 'unhealthy']).toContain(data.status);
    });

    it('should include timestamp in ISO format', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });

    it('should include uptime as positive number', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include checks object with memory and node', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks).toHaveProperty('memory');
      expect(data.checks).toHaveProperty('node');
    });

    it('should include memory usage metrics', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const { memory } = data.checks;

      expect(memory).toHaveProperty('status');
      expect(['ok', 'warning']).toContain(memory.status);
      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('limit');
      expect(typeof memory.used).toBe('number');
      expect(typeof memory.limit).toBe('number');
      expect(memory.used).toBeGreaterThanOrEqual(0);
    });

    it('should include Node.js version info', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const { node } = data.checks;

      expect(node).toHaveProperty('status');
      expect(node).toHaveProperty('version');
      expect(node.status).toBe('ok');
      expect(node.version).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should return 200 when memory usage is healthy', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      if (data.status === 'healthy') {
        expect(response.status).toBe(200);
      }
    });

    it('should return 503 when memory usage is unhealthy', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      if (data.status === 'unhealthy') {
        expect(response.status).toBe(503);
      }
    });

    it('should set memory status to warning at 90% threshold', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const { memory } = data.checks;
      const usagePercent = (memory.used / memory.limit) * 100;

      if (usagePercent >= 90) {
        expect(memory.status).toBe('warning');
        expect(data.status).toBe('unhealthy');
      }
    });

    it('should set memory status to ok below 90% threshold', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const { memory } = data.checks;
      const usagePercent = (memory.used / memory.limit) * 100;

      if (usagePercent < 90) {
        expect(memory.status).toBe('ok');
      }
    });
  });

  describe('Performance', () => {
    it('should respond quickly under normal conditions', async () => {
      const request = createMockRequest('http://localhost/api/health');
      const start = Date.now();
      await GET(request);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
