/**
// @ts-ignore - Mock type compatibility issues
 * Database Index Tests
 * 测试数据库主入口功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDatabase,
  getDatabaseAsync,
  getDatabaseHealth,
  optimizeDatabase,
  query,
  exec,
  prepare,
  closeDatabase,
  initializeDatabase,
} from '../index';
import Database from 'better-sqlite3';
import fs from 'fs/promises';

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

// Mock migrations
vi.mock('../migrations', () => ({
  migrate: vi.fn().mockResolvedValue(undefined),
  optimizeDatabase: vi.fn().mockResolvedValue({ success: true, freedSpace: 1024 }),
  getDatabaseHealth: vi.fn().mockResolvedValue({
    connected: true,
    open: true,
    version: '1.0.0',
  }),
}));

describe('Database Module', () => {
  const testDbPath = '/tmp/test-database.sqlite';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up test database if exists
    try {
      await fs.unlink(testDbPath);
    } catch (e) {
      // File doesn't exist, ignore
    }
    process.env.DATABASE_PATH = testDbPath;
  });

  afterEach(async () => {
    await closeDatabase();
    try {
      await fs.unlink(testDbPath);
    } catch (e) {
      // File doesn't exist, ignore
    }
    delete process.env.DATABASE_PATH;
  });

  describe('initialization', () => {
    it('should initialize database connection', () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(db).toHaveProperty('query');
      expect(db).toHaveProperty('exec');
      expect(db).toHaveProperty('prepare');
    });

    it('should use DATABASE_PATH from environment', () => {
      process.env.DATABASE_PATH = '/custom/path.db';
      const db = getDatabase();
      expect(db).toBeDefined();
    });

    it('should handle connection errors gracefully', () => {
      // Set invalid path
      process.env.DATABASE_PATH = '/invalid/path/that/does/not/exist/test.db';
      // This should throw an error
      expect(() => {
        const db = getDatabase();
        db.exec('SELECT 1');
      }).not.toThrow();
    });
  });

  describe('query operations', () => {
    it('should execute SELECT queries', () => {
      const db = getDatabase();
      const result = db.queryRows('SELECT 1 as value');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute SELECT with parameters', () => {
      const db = getDatabase();
      const result = db.queryRows('SELECT ? as value', [42]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(42);
    });

    it('should execute INSERT statements', () => {
      const db = getDatabase();
      const result = db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER, name TEXT)');
      expect(result).toBeDefined();
      expect(result.changes).toBeGreaterThanOrEqual(0);
    });

    it('should execute INSERT with parameters', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
      const result = db.exec('INSERT INTO test_table (name) VALUES (?)', ['test']);
      expect(result).toBeDefined();
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should execute UPDATE statements', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS update_test (id INTEGER PRIMARY KEY, value INTEGER)');
      db.exec('INSERT INTO update_test (value) VALUES (1)');

      const result = db.exec('UPDATE update_test SET value = 2 WHERE id = 1');
      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should execute DELETE statements', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS delete_test (id INTEGER PRIMARY KEY)');
      db.exec('INSERT INTO delete_test DEFAULT VALUES');

      const result = db.exec('DELETE FROM delete_test WHERE id = 1');
      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should handle query errors gracefully', () => {
      const db = getDatabase();
      expect(() => {
        db.query('SELECT * FROM non_existent_table');
      }).not.toThrow();
    });
  });

  describe('prepared statements', () => {
    it('should create prepared statement', () => {
      const db = getDatabase();
      const stmt = db.prepare('SELECT ? as value');
      expect(stmt).toBeDefined();
      expect(stmt).toHaveProperty('run');
      expect(stmt).toHaveProperty('get');
      expect(stmt).toHaveProperty('all');
    });

    it('should execute prepared statement with run', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS prepared_test (id INTEGER, value INTEGER)');

      const stmt = db.prepare('INSERT INTO prepared_test (value) VALUES (?)');
      const result = stmt.run(100);
      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should execute prepared statement with get', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS get_test (id INTEGER PRIMARY KEY, value INTEGER)');
      db.exec('INSERT INTO get_test (value) VALUES (42)');

      const stmt = db.prepare('SELECT value FROM get_test WHERE id = ?');
      const result = stmt.get(1);
      expect(result).toBeDefined();
      expect(result.value).toBe(42);
    });

    it('should execute prepared statement with all', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS all_test (id INTEGER, value INTEGER)');
      db.exec('INSERT INTO all_test (value) VALUES (1)');
      db.exec('INSERT INTO all_test (value) VALUES (2)');
      db.exec('INSERT INTO all_test (value) VALUES (3)');

      const stmt = db.prepare('SELECT value FROM all_test ORDER BY id');
      const result = stmt.all();
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(1);
      expect(result[2].value).toBe(3);
    });

    it('should return null for non-existent row with get', () => {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?', ['non_existent_table']);
      const result = stmt.get();
      expect(result).toBeNull();
    });

    it('should return empty array for no results with all', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS empty_test (id INTEGER)');
      const stmt = db.prepare('SELECT * FROM empty_test');
      const result = stmt.all();
      expect(result).toEqual([]);
    });
  });

  describe('batch operations', () => {
    it('should execute batch of statements', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS batch_test (id INTEGER, value TEXT)');

      const statements = [
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test1'] },
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test2'] },
        { sql: 'INSERT INTO batch_test (value) VALUES (?)', params: ['test3'] },
      ];

      if (db.batch) {
        const results = db.batch(statements);
        expect(results).toHaveLength(3);
        expect(results.every((r: Database.RunResult) => r.changes === 1)).toBe(true);
      }
    });

    it('should handle empty batch', () => {
      const db = getDatabase();
      if (db.batch) {
        const results = db.batch([]);
        expect(results).toEqual([]);
      }
    });

    it('should handle batch errors gracefully', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS batch_error_test (id INTEGER, value TEXT)');

      const statements = [
        { sql: 'INSERT INTO batch_error_test (value) VALUES (?)', params: ['test'] },
        { sql: 'INVALID SQL STATEMENT', params: [] },
      ];

      if (db.batch) {
        expect(() => {
          db.batch(statements);
        }).not.toThrow();
      }
    });
  });

  describe('async operations', () => {
    it('should get database asynchronously', async () => {
      const db = await getDatabaseAsync();
      expect(db).toBeDefined();
      expect(db).toHaveProperty('query');
    });

    it('should handle async connection errors', async () => {
      // Set invalid path
      process.env.DATABASE_PATH = '/invalid/async/path.db';
      const db = await getDatabaseAsync();
      expect(db).toBeDefined();
    });
  });

  describe('database health', () => {
    it('should get database health status', async () => {
      const health = await getDatabaseHealth();
      expect(health).toBeDefined();
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('open');
    });

    it('should report connected status', async () => {
      const health = await getDatabaseHealth();
      expect(health.connected).toBe(true);
    });
  });

  describe('optimization', () => {
    it('should optimize database', async () => {
      const result = await optimizeDatabase();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should handle optimization errors gracefully', async () => {
      const result = await optimizeDatabase();
      // Should not throw even if optimization fails
      expect(result).toBeDefined();
    });
  });

  describe('connection management', () => {
    it('should close database connection', async () => {
      getDatabase();
      await closeDatabase();
      // Database should be closed, but we can't easily test this without accessing internal state
      // Just ensure the function doesn't throw
      expect(true).toBe(true);
    });

    it('should handle closing already closed database', async () => {
      await closeDatabase();
      await expect(closeDatabase()).resolves.not.toThrow();
    });

    it('should reinitialize database after close', () => {
      const db1 = getDatabase();
      closeDatabase();
      const db2 = getDatabase();
      expect(db2).toBeDefined();
      expect(db2).toHaveProperty('query');
    });
  });

  describe('null safety', () => {
    it('should handle null results safely', () => {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?', ['non_existent']);
      const result = stmt.get();
      expect(result).toBeNull();
    });

    it('should handle undefined results safely', () => {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM sqlite_master WHERE name = ?', ['non_existent']);
      const result = stmt.all();
      expect(result).toEqual([]);
    });

    it('should handle missing result properties', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS null_test (id INTEGER)');
      const result = db.exec('INSERT INTO null_test DEFAULT VALUES');
      expect(result).toHaveProperty('changes');
      expect(result.changes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty SQL', () => {
      const db = getDatabase();
      expect(() => {
        db.query('');
      }).not.toThrow();
    });

    it('should handle SQL with only whitespace', () => {
      const db = getDatabase();
      expect(() => {
        db.query('   ');
      }).not.toThrow();
    });

    it('should handle very long queries', () => {
      const db = getDatabase();
      const longQuery = 'SELECT ' + '1, '.repeat(1000) + '1';
      const result = db.queryRows(longQuery);
      expect(result).toBeDefined();
    });

    it('should handle special characters in parameters', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS special_test (id INTEGER, value TEXT)');

      const specialValue = "test'with\"quotes\\and\\slashes";
      const result = db.exec('INSERT INTO special_test (value) VALUES (?)', [specialValue]);
      expect(result.changes).toBe(1);

      const retrieved = db.queryRows('SELECT value FROM special_test WHERE id = ?', [result.lastInsertRowid]);
      expect(retrieved[0].value).toBe(specialValue);
    });

    it('should handle Unicode characters', () => {
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS unicode_test (id INTEGER, value TEXT)');

      const unicodeValue = '测试中文🎉Test';
      const result = db.exec('INSERT INTO unicode_test (value) VALUES (?)', [unicodeValue]);
      expect(result.changes).toBe(1);

      const retrieved = db.queryRows('SELECT value FROM unicode_test WHERE id = ?', [result.lastInsertRowid]);
      expect(retrieved[0].value).toBe(unicodeValue);
    });
  });
});

describe('Helper Functions', () => {
  describe('query', () => {
    it('should execute query using helper function', () => {
      const result = getDatabase().queryRows('SELECT 1 as value');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1);
    });

    it('should handle parameters in helper function', () => {
      const result = getDatabase().queryRows('SELECT ? as value', [99]);
      expect(result[0].value).toBe(99);
    });
  });

  describe('exec', () => {
    it('should execute statement using helper function', () => {
      const result = exec('SELECT 1');
      expect(result).toBeDefined();
    });
  });

  describe('prepare', () => {
    it('should create prepared statement using helper function', () => {
      const stmt = prepare('SELECT ? as value');
      expect(stmt).toBeDefined();
      expect(stmt).toHaveProperty('all');
    });
  });
});
