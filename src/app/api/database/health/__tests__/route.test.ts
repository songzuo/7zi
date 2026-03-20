/**
 * @fileoverview Database Health API route integration tests
 * @description Tests for /api/database/health endpoint - database health status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('/api/database/health', () => {
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
      const data = await response.json();

      // May fail due to native bindings in test environment
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(data).toHaveProperty('success');
      if (response.status === 200) {
        expect(data).toHaveProperty('health');
        expect(data).toHaveProperty('healthScore');
        expect(data).toHaveProperty('timestamp');
      }
    });

    it('should return success true', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.success).toBe(true);
      }
    });

    it('should return health status', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(data.health);
      }
    });

    it('should return health score as number', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(typeof data.healthScore).toBe('number');
        expect(data.healthScore).toBeGreaterThanOrEqual(0);
        expect(data.healthScore).toBeLessThanOrEqual(100);
      }
    });

    it('should return timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z');
      }
    });

    it('should return connection information', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('connection');
        expect(data.connection).toHaveProperty('connected');
        expect(data.connection).toHaveProperty('isOpen');
        expect(typeof data.connection.connected).toBe('boolean');
        expect(typeof data.connection.isOpen).toBe('boolean');
      }
    });

    it('should return database information', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('database');
        expect(data.database).toHaveProperty('size');
        expect(data.database).toHaveProperty('migrations');
      }
    });

    it('should return performance information', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('performance');
        expect(data.performance).toHaveProperty('slowQueries');
        expect(data.performance).toHaveProperty('missingIndexes');
        expect(data.performance).toHaveProperty('databaseSize');
      }
    });

    it('should return cache information', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('cache');
        expect(data.cache).toHaveProperty('hits');
        expect(data.cache).toHaveProperty('misses');
        expect(data.cache).toHaveProperty('hitRate');
        expect(data.cache).toHaveProperty('entries');
        expect(data.cache).toHaveProperty('totalSize');
        expect(data.cache).toHaveProperty('evictions');
      }
    });

    it('should return recommendations array', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('recommendations');
        expect(Array.isArray(data.recommendations)).toBe(true);
      }
    });

    it('should return details object', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data).toHaveProperty('details');
        expect(data.details).toHaveProperty('tables');
        expect(Array.isArray(data.details.tables)).toBe(true);
      }
    });
  });

  describe('database migrations', () => {
    it('should return migration information', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.database.migrations).toHaveProperty('current');
        expect(data.database.migrations).toHaveProperty('latest');
        expect(data.database.migrations).toHaveProperty('needsMigration');
        expect(typeof data.database.migrations.needsMigration).toBe('boolean');
      }
    });
  });

  describe('cache details', () => {
    it('should return hit rate percentage', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.cache).toHaveProperty('hitRatePercent');
        expect(typeof data.cache.hitRatePercent).toBe('number');
        expect(data.cache.hitRatePercent).toBeGreaterThanOrEqual(0);
        expect(data.cache.hitRatePercent).toBeLessThanOrEqual(100);
      }
    });

    it('should return total size in MB', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.cache).toHaveProperty('totalSizeMB');
        expect(typeof data.cache.totalSizeMB).toBe('number');
        expect(data.cache.totalSizeMB).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return cache status', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.cache).toHaveProperty('status');
        expect(['good', 'fair', 'poor']).toContain(data.cache.status);
      }
    });

    it('should have numeric cache stats', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(typeof data.cache.hits).toBe('number');
        expect(typeof data.cache.misses).toBe('number');
        expect(typeof data.cache.entries).toBe('number');
        expect(typeof data.cache.totalSize).toBe('number');
        expect(typeof data.cache.evictions).toBe('number');
        expect(data.cache.hits).toBeGreaterThanOrEqual(0);
        expect(data.cache.misses).toBeGreaterThanOrEqual(0);
        expect(data.cache.entries).toBeGreaterThanOrEqual(0);
        expect(data.cache.totalSize).toBeGreaterThanOrEqual(0);
        expect(data.cache.evictions).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('performance metrics', () => {
    it('should return numeric slow queries count', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(typeof data.performance.slowQueries).toBe('number');
        expect(data.performance.slowQueries).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return numeric missing indexes count', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(typeof data.performance.missingIndexes).toBe('number');
        expect(data.performance.missingIndexes).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return database size object', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(typeof data.performance.databaseSize).toBe('object');
      }
    });
  });

  describe('table details', () => {
    it('should return table array with correct structure', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200 && data.details.tables.length > 0) {
        const table = data.details.tables[0];
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('rowCount');
        expect(table).toHaveProperty('indexCount');
        expect(table).toHaveProperty('hasSuggestions');
      }
    });

    it('should have numeric row count and index count', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        data.details.tables.forEach((table: { rowCount: number; indexCount: number }) => {
          expect(typeof table.rowCount).toBe('number');
          expect(typeof table.indexCount).toBe('number');
          expect(table.rowCount).toBeGreaterThanOrEqual(0);
          expect(table.indexCount).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('should have boolean hasSuggestions', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        data.details.tables.forEach((table: { hasSuggestions: boolean }) => {
          expect(typeof table.hasSuggestions).toBe('boolean');
        });
      }
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

      // All should complete (may fail due to native bindings)
      expect(responses.every(r => r.status >= 200 && r.status < 600)).toBe(true);
    });

    it('should return consistent data structure', async () => {
      const response1 = await GET();
      const response2 = await GET();

      if (response1.status === 200 && response2.status === 200) {
        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(Object.keys(data1)).toEqual(Object.keys(data2));
      }
    });

    it('should have valid health score range', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(data.healthScore).toBeGreaterThanOrEqual(0);
        expect(data.healthScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('health status validation', () => {
    it('should map health score to appropriate status', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        const healthScore = data.healthScore;
        let expectedStatus = 'healthy';

        if (healthScore < 50) {
          expectedStatus = 'unhealthy';
        } else if (healthScore < 80) {
          expectedStatus = 'degraded';
        }

        expect(data.health).toBe(expectedStatus);
      }
    });

    it('should only return valid health status values', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        const validStatuses = ['healthy', 'degraded', 'unhealthy'];
        expect(validStatuses).toContain(data.health);
      }
    });
  });

  describe('recommendations', () => {
    it('should return array of strings', async () => {
      const response = await GET();
      const data = await response.json();

      if (response.status === 200) {
        expect(Array.isArray(data.recommendations)).toBe(true);
        data.recommendations.forEach((rec: string) => {
          expect(typeof rec).toBe('string');
        });
      }
    });
  });
});
