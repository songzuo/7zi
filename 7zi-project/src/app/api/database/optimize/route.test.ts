/**
 * @fileoverview Database Optimize API route integration tests
 * @description Tests for /api/database/optimize endpoint - database optimization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createMockRequest } from '@/test/mocks/api-mocks';

// Mock better-sqlite3 to avoid native binding issues
vi.mock('better-sqlite3', () => {
  const createMockDatabase = () => ({
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    })),
    close: vi.fn(),
    open: true,
  });

  return {
    default: class MockDatabase {
      constructor() {
        Object.assign(this, createMockDatabase());
      }
    },
  };
});

// Mock database functions
vi.mock('@/lib/db', () => ({
  getDatabaseAsync: vi.fn(),
  optimizeDatabase: vi.fn(),
  vacuumDatabase: vi.fn(),
  getDatabaseStats: vi.fn(),
  getDatabaseHealth: vi.fn(),
}));

// Mock connection pool
vi.mock('@/lib/db/connection-pool', () => ({
  getConnectionPool: vi.fn(),
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

import { getDatabaseAsync, optimizeDatabase, vacuumDatabase, getDatabaseStats, getDatabaseHealth } from '@/lib/db';
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';
import { getConnectionPool } from '@/lib/db/connection-pool';
import { getCacheStats } from '@/lib/db/cache';

describe('/api/database/optimize', () => {
  const mockDb = {
    pragma: vi.fn(),
    exec: vi.fn(),
  };

  const mockPoolStats = {
    totalConnections: 10,
    activeConnections: 2,
    idleConnections: 8,
    waitingRequests: 0,
    totalAcquires: 100,
    totalReleases: 98,
    totalErrors: 0,
    avgAcquireTime: 5,
  };

  const mockPool = {
    getStats: vi.fn(() => mockPoolStats),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDatabaseAsync as any).mockResolvedValue(mockDb);
    (optimizeDatabase as any).mockResolvedValue({ success: true });
    (vacuumDatabase as any).mockReturnValue(undefined);
    (getDatabaseStats as any).mockReturnValue(mockPoolStats);
    (getConnectionPool as any).mockReturnValue(mockPool);
    mockDb.pragma.mockImplementation((name: string) => {
      if (name === 'page_size') return 4096;
      if (name === 'page_count') return 1000;
      if (name === 'freelist_count') return 50;
      return null;
    });

    (generatePerformanceReport as any).mockResolvedValue({
      timestamp: new Date().toISOString(),
      slowQueries: [],
      tableAnalyses: [],
      recommendations: [],
      databaseSize: {
        pageSize: 4096,
        pageCount: 1000,
        freePages: 50,
        sizeInMB: 3.81,
      },
      missingIndexes: [],
    });

    (getDatabaseHealth as any).mockResolvedValue({
      size: { sizeInMB: 10, fragmentationPercent: 5 },
      migrationVersion: 1,
      latestMigration: 1,
      needsMigration: false,
      slowQueryAnalysis: {
        tablesWithoutIndexes: [],
        largeTables: [],
        suggestions: [],
      },
      recommendations: [],
    });

    (getCacheStats as any).mockReturnValue({
      hitRate: 0.85,
      totalSize: 1024000,
      hits: 85,
      misses: 15,
      entries: 10,
      evictions: 0,
    });
  });

  describe('GET request', () => {
    it('should return optimization report', async () => {
      const response = await GET(createMockRequest("http://localhost:3000/api/database/optimize"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.dbAnalysis).toBeDefined();
      expect(data.data.dbAnalysis.databaseSize).toBeDefined();
    });

    it('should return pool and performance data', async () => {
      const response = await GET(createMockRequest("http://localhost:3000/api/database/optimize"));
      const data = await response.json();

      expect(data.data.pool).toBeDefined();
      expect(data.data.performance).toBeDefined();
    });

    it('should return analysis structure correctly', async () => {
      const response = await GET(createMockRequest("http://localhost:3000/api/database/optimize"));
      const data = await response.json();

      expect(Array.isArray(data.data.dbAnalysis.slowQueries)).toBe(true);
      expect(Array.isArray(data.data.dbAnalysis.tableAnalyses)).toBe(true);
      expect(Array.isArray(data.data.dbAnalysis.recommendations)).toBe(true);
      expect(Array.isArray(data.data.dbAnalysis.missingIndexes)).toBe(true);
    });
  });

  describe('POST request', () => {
    it('should run analyze operation', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['analyze'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].operation).toBe('analyze');
      expect(data.data.results[0].success).toBe(true);
    });

    it('should run vacuum operation', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['vacuum'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].operation).toBe('vacuum');
      expect(data.data.results[0].success).toBe(true);
    });

    it('should run clear_metrics operation', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['clear_metrics'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].operation).toBe('clear_metrics');
      expect(data.data.results[0].success).toBe(true);
    });

    it('should run rebuild_indexes operation', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['rebuild_indexes'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].operation).toBe('rebuild_indexes');
      expect(data.data.results[0].success).toBe(true);
    });

    it('should run multiple operations', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['analyze', 'vacuum', 'clear_metrics'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(3);
      expect(data.data.results.map((r: { operation: string; success: boolean; message?: string; error?: string }) => r.operation)).toEqual(['analyze', 'vacuum', 'clear_metrics']);
    });
  });

  describe('error handling', () => {
    it('should handle missing operations', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: [] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle invalid operations', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: { operations: ['invalid_operation'] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle parse errors', async () => {
      const request = createMockRequest('http://localhost:3000/api/database/optimize', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
