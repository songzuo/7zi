/**
 * @fileoverview Database Health API route integration tests
 * @description Tests for /api/database/health endpoint - database health checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../health/route';

// Mock database functions
vi.mock('@/lib/db', () => ({
  getDatabaseAsync: vi.fn(),
}));

// Mock migration functions
vi.mock('@/lib/db/migrations', () => ({
  getDatabaseHealth: vi.fn(),
}));

// Mock performance analyzer
vi.mock('@/lib/db/performance-analyzer', () => ({
  generatePerformanceReport: vi.fn(),
}));

// Mock cache functions
vi.mock('@/lib/db/cache', () => ({
  getCacheStats: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

import { getDatabaseAsync } from '@/lib/db';
import { getDatabaseHealth } from '@/lib/db/migrations';
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';
import { getCacheStats } from '@/lib/db/cache';

describe('/api/database/health', () => {
  const mockDb = {
    open: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabaseAsync as any).mockResolvedValue(mockDb);
    (getDatabaseHealth as any).mockResolvedValue({
      size: { sizeInMB: 10, fragmentationPercent: 5 },
      migrationVersion: 1,
      latestMigration: 1,
      needsMigration: false,
    });
    (generatePerformanceReport as any).mockResolvedValue({
      slowQueries: [],
      missingIndexes: [],
      databaseSize: { sizeInMB: 10 },
      tableAnalyses: [],
    });
    (getCacheStats as any).mockReturnValue({
      hitRate: 0.85,
      totalSize: 1024000,
    });
  });

  describe('GET request', () => {
    it('should return database health status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.health).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.data.health);
      expect(data.data.healthScore).toBeGreaterThanOrEqual(0);
      expect(data.data.healthScore).toBeLessThanOrEqual(100);
    });

    it('should return connection status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.connection).toBeDefined();
      expect(data.data.connection.connected).toBe(true);
      expect(data.data.connection.isOpen).toBe(true);
    });

    it('should return database size information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.database).toBeDefined();
      expect(data.data.database.size).toBeDefined();
      expect(data.data.database.migrations).toBeDefined();
      expect(data.data.database.migrations.current).toBeDefined();
      expect(data.data.database.migrations.latest).toBeDefined();
      expect(data.data.database.migrations.needsMigration).toBeDefined();
    });

    it('should return performance metrics', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.performance).toBeDefined();
      expect(data.data.performance.slowQueries).toBeDefined();
      expect(data.data.performance.missingIndexes).toBeDefined();
      expect(data.data.performance.databaseSize).toBeDefined();
    });

    it('should return cache statistics', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.cache).toBeDefined();
      expect(data.data.cache.hitRate).toBeDefined();
      expect(data.data.cache.hitRatePercent).toBeDefined();
      expect(data.data.cache.totalSizeMB).toBeDefined();
      expect(data.data.cache.status).toBeDefined();
    });

    it('should return recommendations', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.recommendations).toBeDefined();
      expect(Array.isArray(data.data.recommendations)).toBe(true);
    });

    it('should return table details', async () => {
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: [],
        missingIndexes: [],
        databaseSize: { sizeInMB: 10 },
        tableAnalyses: [
          {
            name: 'users',
            rowCount: 100,
            size: 1024,
            indexes: [],
            suggestions: [],
          },
        ],
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.details).toBeDefined();
      expect(data.data.details.tables).toBeDefined();
      expect(Array.isArray(data.data.details.tables)).toBe(true);
      expect(data.data.details.tables[0].name).toBe('users');
      expect(data.data.details.tables[0].rowCount).toBe(100);
    });

    it('should calculate cache hit rate percentage correctly', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.85,
        totalSize: 1024000,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.cache.hitRatePercent).toBe(85.0);
    });

    it('should calculate cache total size in MB correctly', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.85,
        totalSize: 2048000,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.cache.totalSizeMB).toBeCloseTo(1.95, 2);
    });

    it('should determine cache status based on hit rate', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.85,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.cache.status).toBe('good');
    });

    it('should determine cache status as fair for medium hit rate', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.6,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.cache.status).toBe('fair');
    });

    it('should determine cache status as poor for low hit rate', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.3,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.cache.status).toBe('poor');
    });

    it('should return healthy status for high health score', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { pageCount: 1000, freePages: 50 },
        migrationVersion: 1,
        latestMigration: 1,
        needsMigration: false,
        slowQueryAnalysis: { tablesWithoutIndexes: [], largeTables: [], suggestions: [] },
        recommendations: [],
      });
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: [],
        missingIndexes: [],
        databaseSize: { sizeInMB: 10 },
        tableAnalyses: [],
      });
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.9,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.health).toBe('healthy');
      expect(data.data.healthScore).toBeGreaterThan(80);
    });

    it('should return degraded status for medium health score', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { pageCount: 1000, freePages: 80 }, // 8% fragmentation
        migrationVersion: 1,
        latestMigration: 1,
        needsMigration: false,
        slowQueryAnalysis: { tablesWithoutIndexes: [], largeTables: [], suggestions: [] },
        recommendations: [],
      });
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: Array.from({ length: 6 }, (_, i) => ({ suggestedIndex: `idx${i}` })),
        missingIndexes: [],
        databaseSize: { sizeInMB: 100 },
        tableAnalyses: [],
      });
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.65, // Fair cache
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.health).toBe('degraded');
      expect(data.data.healthScore).toBeGreaterThanOrEqual(50);
      expect(data.data.healthScore).toBeLessThan(80);
    });

    it('should return unhealthy status for low health score', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { pageCount: 1000, freePages: 50 },
        migrationVersion: 1,
        latestMigration: 1,
        needsMigration: false,
        slowQueryAnalysis: { tablesWithoutIndexes: [], largeTables: [], suggestions: [] },
        recommendations: [],
      });
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: Array.from({ length: 15 }, (_, i) => ({ suggestedIndex: `idx${i}` })),
        missingIndexes: Array.from({ length: 10 }, (_, i) => ({ table: `t${i}`, columns: ['c1'], reason: 'no index' })),
        databaseSize: { sizeInMB: 10 },
        tableAnalyses: [],
      });
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.3,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.health).toBe('unhealthy');
      expect(data.data.healthScore).toBeLessThan(50);
    });

    it('should generate recommendations for slow queries', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { pageCount: 1000, freePages: 50 },
        migrationVersion: 1,
        latestMigration: 1,
        needsMigration: false,
        slowQueryAnalysis: { tablesWithoutIndexes: [], largeTables: [], suggestions: [] },
        recommendations: [],
      });
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: [
          { suggestedIndex: 'CREATE INDEX idx1' },
          { suggestedIndex: 'CREATE INDEX idx2' },
        ],
        missingIndexes: [],
        databaseSize: { sizeInMB: 10 },
        tableAnalyses: [],
      });
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.9,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.recommendations.some((r: string) => r.includes('慢查询'))).toBe(true);
    });

    it('should generate recommendations for missing indexes', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { pageCount: 1000, freePages: 50 },
        migrationVersion: 1,
        latestMigration: 1,
        needsMigration: false,
        slowQueryAnalysis: { tablesWithoutIndexes: [], largeTables: [], suggestions: [] },
        recommendations: [],
      });
      (generatePerformanceReport as any).mockResolvedValue({
        slowQueries: [],
        missingIndexes: [
          { table: 'users', columns: ['email'], reason: 'no index', suggestedIndex: 'CREATE INDEX idx1' },
          { table: 'orders', columns: ['user_id'], reason: 'no index', suggestedIndex: 'CREATE INDEX idx2' },
        ],
        databaseSize: { sizeInMB: 10 },
        tableAnalyses: [],
      });
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.9,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.recommendations.some((r: string) => r.includes('缺失的索引'))).toBe(true);
    });

    it('should generate recommendations for pending migrations', async () => {
      (getDatabaseHealth as any).mockResolvedValue({
        size: { sizeInMB: 10, fragmentationPercent: 5 },
        migrationVersion: 1,
        latestMigration: 2,
        needsMigration: true,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.recommendations.some((r: string) => r.includes('迁移'))).toBe(true);
    });

    it('should generate recommendations for low cache hit rate', async () => {
      (getCacheStats as any).mockReturnValue({
        hitRate: 0.5,
        totalSize: 0,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.data.recommendations.some((r: string) => r.includes('缓存命中率'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return service unavailable when database not connected', async () => {
      (getDatabaseAsync as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('SERVICE_UNAVAILABLE');
      expect(data.error.message).toContain('Database connection failed');
    });

    it('should return service unavailable when database not open', async () => {
      (getDatabaseAsync as any).mockResolvedValue({ open: false });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle unexpected errors', async () => {
      (getDatabaseAsync as any).mockRejectedValue(new Error('Unexpected error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('INTERNAL_ERROR');
    });
  });
});
