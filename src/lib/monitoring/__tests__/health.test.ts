/**
 * Monitoring Health Tests
 * Tests for health.ts - health check functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HealthCheckResult,
  checkDatabaseHealth,
  checkRedisHealth,
  checkExternalApiHealth,
  checkMemoryHealth,
  checkDiskHealth,
  checkCpuHealth,
  runHealthChecks,
  HealthStatus,
} from '../health';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Monitoring Health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when database is accessible', async () => {
      // Mock successful database connection
      vi.mock('../db', () => ({
        getDatabaseAsync: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue([]),
        }),
      }));

      const result = await checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('database');
      expect(result.message).toBeTruthy();
    });

    it('should return degraded status when database is slow', async () => {
      // Mock slow database connection
      vi.mock('../db', () => ({
        getDatabaseAsync: vi.fn().mockImplementation(() =>
          new Promise((resolve) => setTimeout(resolve, 2000))
        ),
      }));

      const result = await checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it('should return unhealthy status when database is down', async () => {
      // Mock failed database connection
      vi.mock('../db', () => ({
        getDatabaseAsync: vi.fn().mockRejectedValue(new Error('Connection failed')),
      }));

      const result = await checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.error).toBeTruthy();
    });
  });

  describe('checkRedisHealth', () => {
    it('should return healthy status when Redis is accessible', async () => {
      // Mock successful Redis connection
      vi.mock('../cache', () => ({
        cache: {
          set: vi.fn().mockResolvedValue('OK'),
          get: vi.fn().mockResolvedValue('value'),
          del: vi.fn().mockResolvedValue(1),
        },
      }));

      const result = await checkRedisHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('redis');
    });

    it('should return unhealthy status when Redis is down', async () => {
      // Mock failed Redis connection
      vi.mock('../cache', () => ({
        cache: {
          set: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        },
      }));

      const result = await checkRedisHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.error).toBeTruthy();
    });
  });

  describe('checkExternalApiHealth', () => {
    it('should return healthy status for successful API call', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await checkExternalApiHealth('https://api.example.com');

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('external-api');
    });

    it('should return unhealthy status for failed API call', async () => {
      // Mock failed fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await checkExternalApiHealth('https://api.example.com');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should handle network errors', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await checkExternalApiHealth('https://api.example.com');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.error).toBeTruthy();
    });
  });

  describe('checkMemoryHealth', () => {
    it('should return healthy status when memory usage is normal', () => {
      // Mock process.memoryUsage
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024, // 100 MB
        heapTotal: 50 * 1024 * 1024, // 50 MB
        heapUsed: 30 * 1024 * 1024, // 30 MB
        external: 5 * 1024 * 1024, // 5 MB
        arrayBuffers: 2 * 1024 * 1024, // 2 MB
      });

      const result = checkMemoryHealth(0.8); // 80% threshold

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('memory');

      mockMemoryUsage.mockRestore();
    });

    it('should return degraded status when memory usage is high', () => {
      // Mock high memory usage
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1000 * 1024 * 1024, // 1 GB
        heapTotal: 500 * 1024 * 1024, // 500 MB
        heapUsed: 450 * 1024 * 1024, // 450 MB (90% of heapTotal)
        external: 50 * 1024 * 1024, // 50 MB
        arrayBuffers: 20 * 1024 * 1024, // 20 MB
      });

      const result = checkMemoryHealth(0.8); // 80% threshold

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.name).toBe('memory');

      mockMemoryUsage.mockRestore();
    });

    it('should return unhealthy status when memory usage is critical', () => {
      // Mock critical memory usage
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1000 * 1024 * 1024, // 1 GB
        heapTotal: 500 * 1024 * 1024, // 500 MB
        heapUsed: 480 * 1024 * 1024, // 480 MB (96% of heapTotal)
        external: 50 * 1024 * 1024, // 50 MB
        arrayBuffers: 20 * 1024 * 1024, // 20 MB
      });

      const result = checkMemoryHealth(0.8); // 80% threshold

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.name).toBe('memory');

      mockMemoryUsage.mockRestore();
    });
  });

  describe('checkDiskHealth', () => {
    it('should return healthy status when disk space is sufficient', async () => {
      // Mock file system stats
      vi.mock('fs', () => ({
        promises: {
          statfs: vi.fn().mockResolvedValue({
            bavail: 1000000,
            btotal: 5000000,
            bsize: 4096,
          }),
        },
      }));

      const result = await checkDiskHealth('/');

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('disk');
    });

    it('should return degraded status when disk space is low', async () => {
      // Mock low disk space
      vi.mock('fs', () => ({
        promises: {
          statfs: vi.fn().mockResolvedValue({
            bavail: 100000,
            btotal: 5000000,
            bsize: 4096,
          }),
        },
      }));

      const result = await checkDiskHealth('/');

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.name).toBe('disk');
    });

    it('should return unhealthy status when disk is full', async () => {
      // Mock full disk
      vi.mock('fs', () => ({
        promises: {
          statfs: vi.fn().mockResolvedValue({
            bavail: 10000,
            btotal: 5000000,
            bsize: 4096,
          }),
        },
      }));

      const result = await checkDiskHealth('/');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.name).toBe('disk');
    });

    it('should handle file system errors', async () => {
      // Mock fs error
      vi.mock('fs', () => ({
        promises: {
          statfs: vi.fn().mockRejectedValue(new Error('Access denied')),
        },
      }));

      const result = await checkDiskHealth('/');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.error).toBeTruthy();
    });
  });

  describe('checkCpuHealth', () => {
    it('should return healthy status when CPU usage is normal', () => {
      // Mock CPU usage
      const mockCpuUsage = vi.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 100000,
        system: 50000,
      });

      const result = checkCpuHealth(0.8);

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.name).toBe('cpu');

      mockCpuUsage.mockRestore();
    });

    it('should return degraded status when CPU usage is high', () => {
      // Mock high CPU usage
      const mockCpuUsage = vi.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 8000000,
        system: 4000000,
      });

      const result = checkCpuHealth(0.8);

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.name).toBe('cpu');

      mockCpuUsage.mockRestore();
    });
  });

  describe('runHealthChecks', () => {
    it('should run all health checks and return results', async () => {
      const results = await runHealthChecks({
        checks: ['database', 'memory', 'disk'],
        thresholds: {
          memory: 0.8,
          disk: 0.2,
        },
      });

      expect(results).toHaveProperty('status');
      expect(results).toHaveProperty('checks');
      expect(Array.isArray(results.checks)).toBe(true);
    });

    it('should return overall healthy status when all checks pass', async () => {
      const results = await runHealthChecks({
        checks: ['memory'],
        thresholds: {
          memory: 0.9,
        },
      });

      expect(results.status).toBe(HealthStatus.HEALTHY);
    });

    it('should return overall unhealthy status when any check fails', async () => {
      const results = await runHealthChecks({
        checks: ['memory'],
        thresholds: {
          memory: 0.1, // Very low threshold
        },
      });

      expect(results.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should handle empty checks array', async () => {
      const results = await runHealthChecks({
        checks: [],
      });

      expect(results.status).toBe(HealthStatus.HEALTHY);
      expect(results.checks).toHaveLength(0);
    });
  });
});
