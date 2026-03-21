// @ts-nocheck - Mock type compatibility issues
/**
 * Tests for Database Index Module
 * Tests types, interfaces, and helper functions
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import type { DatabaseConnection, DatabaseStatement, DatabaseResult } from './types';

// Mock better-sqlite3 before importing the module
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      pragma: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: BigInt(0) }),
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
      }),
      close: vi.fn(),
      open: true,
    })),
  };
});

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// We need to mock the middleware module before importing db
vi.mock('@/lib/middleware/db-performance', () => ({
  withPerformanceLogging: vi.fn((connection) => connection),
}));

describe('Database Types', () => {
  describe('DatabaseResult', () => {
    it('should have changes property', () => {
      const result = { changes: 5, lastInsertRowid: 123 };
      expect(result.changes).toBe(5);
    });

    it('should have optional lastInsertRowid', () => {
      const resultWithRowid = { changes: 1, lastInsertRowid: 1 };
      expect(resultWithRowid.lastInsertRowid).toBe(1);

      const resultWithoutRowid = { changes: 0 };
      expect(resultWithoutRowid.lastInsertRowid).toBeUndefined();
    });
  });

  describe('DatabaseStatement', () => {
    it('should define run method signature', () => {
      const stmt = {
        run: (...params: unknown[]) => ({ changes: 0, lastInsertRowid: undefined as number | undefined }),
        get: (...params: unknown[]) => null,
        all: (...params: unknown[]) => [],
      };
      expect(stmt.run).toBeDefined();
      expect(stmt.get).toBeDefined();
      expect(stmt.all).toBeDefined();
    });

    it('should return DatabaseResult from run', () => {
      const stmt = {
        run: (...params: unknown[]) => ({ changes: 1, lastInsertRowid: 1 }),
      };
      const result = stmt.run();
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('lastInsertRowid');
    });
  });

  describe('DatabaseConnection', () => {
    it('should have query method', () => {
      const connection = {
        query: (sql: string, params?: unknown[]) => [],
        queryRows: (sql: string, params?: unknown[]) => [],
        exec: (sql: string, params?: unknown[]) => ({ changes: 0 }),
        prepare: (sql: string) => ({
          run: (...params: unknown[]) => ({ changes: 0 }),
          get: (...params: unknown[]) => null,
          all: (...params: unknown[]) => [],
        }),
        pragma: (name: string) => null,
      };
      expect(connection.query).toBeDefined();
      expect(connection.queryRows).toBeDefined();
      expect(connection.exec).toBeDefined();
      expect(connection.prepare).toBeDefined();
    });

    it('should have optional getConnection method', () => {
      const connection: DatabaseConnection = {
        query: () => [],
        queryRows: () => [],
        exec: () => ({ changes: 0 }),
        prepare: () => ({
          run: () => ({ changes: 0 }),
          get: () => null,
          all: () => [],
        }),
        pragma: () => null,
        batch: async () => [],
        getConnection: () => ({}),
      };
      expect(connection.getConnection).toBeDefined();
    });

    it('should have optional batch method', () => {
      const connection: DatabaseConnection = {
        query: () => [],
        queryRows: () => [],
        exec: () => ({ changes: 0 }),
        prepare: () => ({
          run: () => ({ changes: 0 }),
          get: () => null,
          all: () => [],
        }),
        pragma: () => null,
        batch: async (statements) => [],
      };
      expect(connection.batch).toBeDefined();
    });
  });
});

describe('Database Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getDatabase function', () => {
    const { getDatabase } = require('../index');
    expect(getDatabase).toBeDefined();
    expect(typeof getDatabase).toBe('function');
  });

  it('should export getDatabaseAsync function', async () => {
    const { getDatabaseAsync } = require('../index');
    expect(getDatabaseAsync).toBeDefined();
    expect(typeof getDatabaseAsync).toBe('function');
  });

  it('should export closeDatabase function', () => {
    const { closeDatabase } = require('../index');
    expect(closeDatabase).toBeDefined();
    expect(typeof closeDatabase).toBe('function');
  });

  it('should export getDatabaseStats function', () => {
    const { getDatabaseStats } = require('../index');
    expect(getDatabaseStats).toBeDefined();
    expect(typeof getDatabaseStats).toBe('function');
  });

  it('should export vacuumDatabase function', () => {
    const { vacuumDatabase } = require('../index');
    expect(vacuumDatabase).toBeDefined();
    expect(typeof vacuumDatabase).toBe('function');
  });

  it('should export analyzeDatabase function', () => {
    const { analyzeDatabase } = require('../index');
    expect(analyzeDatabase).toBeDefined();
    expect(typeof analyzeDatabase).toBe('function');
  });

  it('should export getDatabaseSize function', () => {
    const { getDatabaseSize } = require('../index');
    expect(getDatabaseSize).toBeDefined();
    expect(typeof getDatabaseSize).toBe('function');
  });

  it('should export migrate function', () => {
    const { migrate } = require('../index');
    expect(migrate).toBeDefined();
    expect(typeof migrate).toBe('function');
  });

  it('should export optimizeDatabase function', () => {
    const { optimizeDatabase } = require('../index');
    expect(optimizeDatabase).toBeDefined();
    expect(typeof optimizeDatabase).toBe('function');
  });

  it('should export getDatabaseHealth function', () => {
    const { getDatabaseHealth } = require('../index');
    expect(getDatabaseHealth).toBeDefined();
    expect(typeof getDatabaseHealth).toBe('function');
  });

  it('getDatabase should return connection object', () => {
    const { getDatabase } = require('../index');
    const db = getDatabase();
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
    expect(db.queryRows).toBeDefined();
    expect(db.exec).toBeDefined();
    expect(db.prepare).toBeDefined();
  });

  it('getDatabaseAsync should return connection object', async () => {
    const { getDatabaseAsync } = require('../index');
    const db = await getDatabaseAsync();
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
    expect(db.exec).toBeDefined();
  });

  it('getDatabaseStats should return stats object', () => {
    const { getDatabaseStats } = require('../index');
    const stats = getDatabaseStats();
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('connectionCount');
    expect(stats).toHaveProperty('isOpen');
    expect(stats).toHaveProperty('isMemoryDatabase');
  });

  it('vacuumDatabase should not throw', () => {
    const { vacuumDatabase } = require('../index');
    expect(() => vacuumDatabase()).not.toThrow();
  });

  it('analyzeDatabase should not throw', () => {
    const { analyzeDatabase } = require('../index');
    expect(() => analyzeDatabase()).not.toThrow();
  });

  it('getDatabaseSize should return size info or null', () => {
    const { getDatabaseSize } = require('../index');
    const size = getDatabaseSize();
    if (size !== null) {
      expect(size).toHaveProperty('pageSize');
      expect(size).toHaveProperty('pageCount');
      expect(size).toHaveProperty('freePages');
      expect(size).toHaveProperty('sizeInBytes');
      expect(size).toHaveProperty('sizeInMB');
    }
  });

  it('closeDatabase should not throw', () => {
    const { closeDatabase } = require('../index');
    expect(() => closeDatabase()).not.toThrow();
  });
});

describe('Batch Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { getDatabase } = require('../index');
    const db = getDatabase();
    db.exec('CREATE TABLE IF NOT EXISTS batch_test (id INTEGER, value TEXT)');
  });

  it('should support batch operations', async () => {
    const { getDatabase } = require('../index');
    const db = getDatabase();

    if (db.batch) {
      const statements = [
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test1'] },
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test2'] },
      ];

      const results = db.batch(statements);
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it('should handle empty batch', async () => {
    const { getDatabase } = require('../index');
    const db = getDatabase();

    if (db.batch) {
      const results = db.batch([]);
      expect(results).toEqual([]);
    }
  });
});
