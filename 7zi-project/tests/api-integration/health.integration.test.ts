/**
 * @fileoverview Health API integration tests
 * @description Tests for /api/health/* endpoints using MSW
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { server } from './mocks/handlers';

describe('/api/health - Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  describe('GET /api/health', () => {
    it('should return health status with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);
    });

    it('should return data with correct properties', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('uptime');
      expect(data.data).toHaveProperty('version');
      expect(data.data).toHaveProperty('checks');
    });

    it('should return healthy status', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.status).toBe('healthy');
    });

    it('should return valid timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return uptime in seconds', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.data.uptime).toBe('number');
    });

    it('should return version string', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(typeof data.data.version).toBe('string');
      expect(data.data.version.length).toBeGreaterThan(0);
    });
  });

  describe('/api/health - Checks', () => {
    it('should return checks object', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks).toHaveProperty('memory');
      expect(data.data.checks).toHaveProperty('node');
    });

    it('should return memory check with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.memory).toHaveProperty('status');
      expect(data.data.checks.memory).toHaveProperty('used');
      expect(data.data.checks.memory).toHaveProperty('limit');
    });

    it('should return memory status as ok or warning', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(['ok', 'warning']).toContain(data.data.checks.memory.status);
    });

    it('should return memory used in MB', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.memory.used).toBeGreaterThanOrEqual(0);
      expect(typeof data.data.checks.memory.used).toBe('number');
    });

    it('should return memory limit in MB', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.memory.limit).toBe(512);
    });

    it('should return node check with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.node).toHaveProperty('status');
      expect(data.data.checks.node).toHaveProperty('version');
    });

    it('should return node status as ok', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.node.status).toBe('ok');
    });

    it('should return Node.js version', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.data.checks.node.version).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('/api/health - Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch('http://localhost:3000/api/health');

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('/api/health - Edge Cases', () => {
    it('should handle multiple rapid requests', async () => {
      const responses = await Promise.all([
        fetch('http://localhost:3000/api/health'),
        fetch('http://localhost:3000/api/health'),
        fetch('http://localhost:3000/api/health'),
      ]);

      const data = await Promise.all(
        responses.map(r => r.json())
      );

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(data.every(d => d.success === true)).toBe(true);
    });

    it('should return consistent data structure', async () => {
      const response1 = await fetch('http://localhost:3000/api/health');
      const response2 = await fetch('http://localhost:3000/api/health');

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(Object.keys(data1.data)).toEqual(Object.keys(data2.data));
      expect(typeof data1.data.uptime).toBe('number');
      expect(typeof data2.data.uptime).toBe('number');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status', async () => {
      const response = await fetch('http://localhost:3000/api/health/ready');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('ready');
    });

    it('should return valid timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/health/ready');
      const data = await response.json();

      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      const response = await fetch('http://localhost:3000/api/health/live');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('alive');
    });

    it('should return valid timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/health/live');
      const data = await response.json();

      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('/api/health - Status Enum Validation', () => {
    it('should only return valid status values for /api/health', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      const validStatuses = ['healthy', 'unhealthy'];
      expect(validStatuses).toContain(data.data.status);
    });

    it('should return valid ready status for /api/health/ready', async () => {
      const response = await fetch('http://localhost:3000/api/health/ready');
      const data = await response.json();

      expect(data.data.status).toBe('ready');
    });

    it('should return valid alive status for /api/health/live', async () => {
      const response = await fetch('http://localhost:3000/api/health/live');
      const data = await response.json();

      expect(data.data.status).toBe('alive');
    });
  });

  describe('/api/health - Memory Threshold Validation', () => {
    it('should return 200 when memory is below threshold', async () => {
      const response = await fetch('http://localhost:3000/api/health');

      expect(response.status).toBe(200);
    });

    it('should return memory status correctly based on usage', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      const memoryUsed = data.data.checks.memory.used;
      const memoryLimit = data.data.checks.memory.limit;
      const usagePercent = (memoryUsed / memoryLimit) * 100;

      if (usagePercent > 90) {
        expect(data.data.checks.memory.status).toBe('warning');
      } else {
        expect(data.data.checks.memory.status).toBe('ok');
      }
    });
  });
});
