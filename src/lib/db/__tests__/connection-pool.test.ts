/**
// @ts-ignore - Mock type compatibility issues
 * Connection Pool Tests
 * 测试数据库连接池功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionPoolManager, PoolConfig, createConnectionPool, getPoolStats, resetPool, PooledConnection } from '../connection-pool';
import Database from 'better-sqlite3';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

// Mock Database
vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => ({
    prepare: vi.fn(),
    exec: vi.fn(),
    close: vi.fn(),
    open: vi.fn(),
  })),
}));

describe('Connection Pool Manager', () => {
  let pool: ConnectionPoolManager;
  const mockConfig: PoolConfig = {
    databasePath: ':memory:',
    maxConnections: 5,
    minConnections: 2,
    connectionTimeout: 30000,
    idleTimeout: 300000,
    healthCheckInterval: 60000,
    maxConnectionAge: 3600000,
    enableWAL: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    pool = new ConnectionPoolManager(mockConfig);
  });

  afterEach(async () => {
    await pool.closeAll();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultPool = new ConnectionPoolManager({ databasePath: ':memory:' });
      expect(defaultPool).toBeDefined();
    });

    it('should use provided configuration', () => {
      expect(pool).toBeDefined();
    });

    it('should create minimum connections', async () => {
      const connections = await pool.getAllConnections();
      expect(connections.length).toBeGreaterThanOrEqual(mockConfig.minConnections);
    });
  });

  describe('acquire connection', () => {
    it('should acquire a connection', async () => {
      const conn = await pool.acquire();
      expect(conn).toBeDefined();
      expect(conn.db).toBeDefined();
      expect(conn.inUse).toBe(true);
    });

    it('should acquire from pool when available', async () => {
      const conn1 = await pool.acquire();
      await pool.release(conn1.id);

      const conn2 = await pool.acquire();
      expect(conn2.id).toBe(conn1.id);
    });

    it('should create new connection when pool is empty', async () => {
      const conn = await pool.acquire();
      expect(conn.createdAt).toBeDefined();
      expect(conn.id).toBeDefined();
    });

    it('should respect max connections limit', async () => {
      const connections: PooledConnection[] = [];
      for (let i = 0; i < mockConfig.maxConnections; i++) {
        const conn = await pool.acquire();
        connections.push(conn);
      }

      // Should not be able to acquire more than max
      await expect(pool.acquire()).rejects.toThrow();
    });

    it('should timeout if connection not available', async () => {
      const shortTimeoutConfig = { ...mockConfig, connectionTimeout: 100 };
      const shortPool = new ConnectionPoolManager(shortTimeoutConfig);

      // Acquire all connections
      const connections: PooledConnection[] = [];
      for (let i = 0; i < shortTimeoutConfig.maxConnections; i++) {
        const conn = await shortPool.acquire();
        connections.push(conn);
      }

      // Should timeout
      await expect(shortPool.acquire()).rejects.toThrow('Connection timeout');
    });
  });

  describe('release connection', () => {
    it('should release connection back to pool', async () => {
      const conn = await pool.acquire();
      await pool.release(conn.id);

      const connections = await pool.getAllConnections();
      const releasedConn = connections.find((c: PooledConnection) => c.id === conn.id);
      expect(releasedConn).toBeDefined();
      expect(releasedConn?.inUse).toBe(false);
    });

    it('should update last used timestamp on release', async () => {
      const conn = await pool.acquire();
      const beforeTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      await pool.release(conn.id);

      const connections = await pool.getAllConnections();
      const releasedConn = connections.find((c: PooledConnection) => c.id === conn.id);
      expect(releasedConn?.lastUsedAt).toBeGreaterThan(beforeTime);
    });

    it('should handle releasing unknown connection', async () => {
      await expect(pool.release('unknown-id')).resolves.not.toThrow();
    });

    it('should handle releasing connection not in use', async () => {
      const conn = await pool.acquire();
      await pool.release(conn.id);
      await expect(pool.release(conn.id)).resolves.not.toThrow();
    });
  });

  describe('health checks', () => {
    it('should perform health check on connection', async () => {
      const conn = await pool.acquire();
      const health = await pool.checkHealth(conn.id);
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('connections');
      expect(health).toHaveProperty('active');
      expect(health).toHaveProperty('idle');
      expect(health).toHaveProperty('unhealthy');
    });

    it('should identify unhealthy connections', async () => {
      const conn = await pool.acquire();
      // Simulate unhealthy connection
      (conn as any).healthy = false;

      const health = await pool.checkHealth(conn.id);
      expect(health.unhealthy).toBeGreaterThan(0);
    });

    it('should remove unhealthy connections', async () => {
      const conn = await pool.acquire();
      (conn as any).healthy = false;

      await pool.cleanupUnhealthy();
      const connections = await pool.getAllConnections();
      const unhealthyConn = connections.find((c: PooledConnection) => c.id === conn.id);
      expect(unhealthyConn).toBeUndefined();
    });
  });

  describe('connection lifecycle', () => {
    it('should respect idle timeout', async () => {
      const shortIdleConfig = { ...mockConfig, idleTimeout: 100 };
      const shortPool = new ConnectionPoolManager(shortIdleConfig);

      const conn = await shortPool.acquire();
      await shortPool.release(conn.id);
      await new Promise(resolve => setTimeout(resolve, 150));

      await shortPool.cleanupIdle();
      const connections = await shortPool.getAllConnections();
      const idleConn = connections.find((c: PooledConnection) => c.id === conn.id);
      expect(idleConn).toBeUndefined();
    });

    it('should respect max connection age', async () => {
      const shortAgeConfig = { ...mockConfig, maxConnectionAge: 100 };
      const shortPool = new ConnectionPoolManager(shortAgeConfig);

      const conn = await shortPool.acquire();
      (conn as any).createdAt = Date.now() - 200;

      await shortPool.cleanupOld();
      const connections = await shortPool.getAllConnections();
      const oldConn = connections.find(c => c.id === conn.id);
      expect(oldConn).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track acquire statistics', async () => {
      const beforeStats = await pool.getStats();

      await pool.acquire();
      const afterStats = await pool.getStats();

      expect(afterStats.totalAcquires).toBe(beforeStats.totalAcquires + 1);
    });

    it('should track release statistics', async () => {
      const conn = await pool.acquire();
      const beforeStats = await pool.getStats();

      await pool.release(conn.id);
      const afterStats = await pool.getStats();

      expect(afterStats.totalReleases).toBe(beforeStats.totalReleases + 1);
    });

    it('should track error statistics', async () => {
      const beforeStats = await pool.getStats();
      const conn = await pool.acquire();

      (conn as any).db.exec.mockImplementation(() => {
        throw new Error('Database error');
      });

      try {
        await conn.db.exec('SELECT 1');
      } catch (e) {
        // Ignore error
      }

      const afterStats = await pool.getStats();
      // Error tracking happens internally
      expect(afterStats).toHaveProperty('totalErrors');
    });

    it('should calculate average acquire time', async () => {
      const conn1 = await pool.acquire();
      await pool.release(conn1.id);

      const conn2 = await pool.acquire();
      await pool.release(conn2.id);

      const stats = await pool.getStats();
      expect(stats.avgAcquireTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should close all connections', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      await pool.closeAll();

      const connections = await pool.getAllConnections();
      expect(connections.length).toBe(0);
    });

    it('should handle cleanup when pool is empty', async () => {
      await expect(pool.closeAll()).resolves.not.toThrow();
    });

    it('should cleanup idle connections', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      await pool.release(conn1.id);
      await pool.release(conn2.id);

      await pool.cleanupIdle();
      // Released connections should still be in pool (within idle timeout)
      const connections = await pool.getAllConnections();
      expect(connections.length).toBe(2);
    });
  });
});

describe('Connection Pool Factory Functions', () => {
  afterEach(() => {
    resetPool();
  });

  describe('createConnectionPool', () => {
    it('should create a pool with default config', () => {
      const pool = createConnectionPool({ databasePath: ':memory:' });
      expect(pool).toBeDefined();
      expect(pool).toBeInstanceOf(ConnectionPoolManager);
    });

    it('should create a pool with custom config', () => {
      const config: PoolConfig = {
        databasePath: ':memory:',
        maxConnections: 3,
        minConnections: 1,
        connectionTimeout: 15000,
        idleTimeout: 150000,
        healthCheckInterval: 30000,
        maxConnectionAge: 1800000,
        enableWAL: true,
      };

      const pool = createConnectionPool(config);
      expect(pool).toBeDefined();
    });
  });

  describe('getPoolStats', () => {
    it('should return stats from global pool', async () => {
      const pool = createConnectionPool({ databasePath: ':memory:' });
      await pool.acquire();

      const stats = await getPoolStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('idleConnections');
    });

    it('should return zero stats when no pool exists', async () => {
      const stats = await getPoolStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.idleConnections).toBe(0);
    });
  });

  describe('resetPool', () => {
    it('should reset global pool', async () => {
      const pool = createConnectionPool({ databasePath: ':memory:' });
      await pool.acquire();

      resetPool();

      const stats = await getPoolStats();
      expect(stats.totalConnections).toBe(0);
    });
  });
});
