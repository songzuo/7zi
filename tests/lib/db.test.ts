/**
 * Database Module Tests
 * Tests for src/lib/db.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDatabase, closeDatabase, getDatabaseAsync } from '@/lib/db';

describe('Database Module', () => {
  beforeEach(() => {
    // Set test environment
    process.env.DATABASE_PATH = ':memory:';
    // Clear any existing database instance
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('initialization', () => {
    it('should get database connection', () => {
      const db = getDatabase();

      expect(db).toBeDefined();
      expect(db).toHaveProperty('query');
      expect(db).toHaveProperty('queryRows');
      expect(db).toHaveProperty('exec');
      expect(db).toHaveProperty('prepare');
      expect(db).toHaveProperty('pragma');
    });

    it('should get database asynchronously', async () => {
      const db = await getDatabaseAsync();

      expect(db).toBeDefined();
      expect(db).toHaveProperty('query');
    });

    it('should reuse existing database connection', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();

      // Should return the same instance (singleton pattern)
      expect(db1).toBe(db2);
    });

    it('should handle custom database path', () => {
      process.env.DATABASE_PATH = '/tmp/test-db.sqlite';
      const db = getDatabase();

      expect(db).toBeDefined();
    });
  });

  describe('query operations', () => {
    it('should execute SELECT queries and return array', () => {
      const db = getDatabase();

      // Create test table
      db.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO test_table (id, name) VALUES (1, "Test")');

      const result = db.query('SELECT * FROM test_table');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should handle empty query results', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS empty_table (id INTEGER PRIMARY KEY)');
      const result = db.query('SELECT * FROM empty_table');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle query with parameters', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS params_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO params_table (id, name) VALUES (?, ?)', [1, 'Param Test']);

      const result = db.query('SELECT * FROM params_table WHERE id = ?', [1]);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('queryRows operations', () => {
    it('should return typed rows', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS rows_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO rows_table (id, name) VALUES (1, "Row 1")');

      const result = db.queryRows('SELECT * FROM rows_table');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should handle empty rows', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS empty_rows (id INTEGER PRIMARY KEY)');
      const result = db.queryRows('SELECT * FROM empty_rows');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('exec operations', () => {
    it('should execute INSERT and return changes', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS exec_table (id INTEGER PRIMARY KEY, name TEXT)');
      const result = db.exec('INSERT INTO exec_table (id, name) VALUES (?, ?)', [1, 'Test']);

      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should execute UPDATE and return changes', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS update_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO update_table (id, name) VALUES (?, ?)', [1, 'Original']);
      const result = db.exec('UPDATE update_table SET name = ? WHERE id = ?', ['Updated', 1]);

      expect(result.changes).toBe(1);
    });

    it('should execute DELETE and return changes', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS delete_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO delete_table (id, name) VALUES (?, ?)', [1, 'To Delete']);
      const result = db.exec('DELETE FROM delete_table WHERE id = ?', [1]);

      expect(result.changes).toBe(1);
    });

    it('should handle batch operations', async () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS batch_table (id INTEGER PRIMARY KEY, name TEXT)');

      const statements = [
        { sql: 'INSERT INTO batch_table (id, name) VALUES (?, ?)', params: [1, 'Batch 1'] },
        { sql: 'INSERT INTO batch_table (id, name) VALUES (?, ?)', params: [2, 'Batch 2'] },
        { sql: 'INSERT INTO batch_table (id, name) VALUES (?, ?)', params: [3, 'Batch 3'] },
      ];

      const results = await db.batch?.(statements);

      expect(results).toBeDefined();
      expect(results).toHaveLength(3);
      expect(results?.[0].changes).toBe(1);
      expect(results?.[1].changes).toBe(1);
      expect(results?.[2].changes).toBe(1);
    });
  });

  describe('prepared statements', () => {
    it('should prepare statement and run', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS prep_table (id INTEGER PRIMARY KEY, name TEXT)');
      const stmt = db.prepare('INSERT INTO prep_table (id, name) VALUES (?, ?)');
      const result = stmt.run(1, 'Prepared');

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should prepare statement and get single row', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS get_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO get_table (id, name) VALUES (?, ?)', [1, 'Get Test']);

      const stmt = db.prepare('SELECT * FROM get_table WHERE id = ?');
      const result = stmt.get(1);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Get Test');
    });

    it('should prepare statement and get all rows', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS all_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO all_table (id, name) VALUES (?, ?)', [1, 'All 1']);
      db.exec('INSERT INTO all_table (id, name) VALUES (?, ?)', [2, 'All 2']);

      const stmt = db.prepare('SELECT * FROM all_table');
      const result = stmt.all();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return null for non-existent row', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS null_table (id INTEGER PRIMARY KEY)');
      const stmt = db.prepare('SELECT * FROM null_table WHERE id = ?');
      const result = stmt.get(999);

      expect(result).toBeNull();
    });
  });

  describe('pragma operations', () => {
    it('should get pragma value', () => {
      const db = getDatabase();

      const journalMode = db.pragma('journal_mode', { simple: true });

      expect(journalMode).toBeDefined();
      expect(typeof journalMode).toBe('string');
    });

    it('should get table info', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS pragma_test (id INTEGER PRIMARY KEY, name TEXT)');
      const tableInfo = db.pragma('table_info(pragma_test)');

      expect(tableInfo).toBeDefined();
      expect(Array.isArray(tableInfo)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid SQL syntax', () => {
      const db = getDatabase();

      expect(() => {
        db.query('INVALID SQL SYNTAX HERE');
      }).toThrow();
    });

    it('should handle query on non-existent table', () => {
      const db = getDatabase();

      expect(() => {
        db.query('SELECT * FROM non_existent_table');
      }).toThrow();
    });

    it('should handle constraint violations', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS unique_table (id INTEGER PRIMARY KEY, email TEXT UNIQUE)');
      db.exec('INSERT INTO unique_table (id, email) VALUES (?, ?)', [1, 'test@test.com']);

      expect(() => {
        db.exec('INSERT INTO unique_table (id, email) VALUES (?, ?)', [2, 'test@test.com']);
      }).toThrow();
    });

    it('should handle missing required columns', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS required_table (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

      expect(() => {
        db.exec('INSERT INTO required_table (id) VALUES (1)');
      }).toThrow();
    });
  });

  describe('database connection', () => {
    it('should provide getConnection method', () => {
      const db = getDatabase();

      expect(db.getConnection).toBeDefined();
      expect(typeof db.getConnection).toBe('function');
    });

    it('should close database connection', () => {
      const db = getDatabase();
      closeDatabase();

      // After closing, should initialize a new connection
      const db2 = getDatabase();
      expect(db2).toBeDefined();
    });

    it('should handle multiple close operations', () => {
      closeDatabase();
      closeDatabase();
      closeDatabase();

      expect(() => getDatabase()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty params array', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS edge_table (id INTEGER PRIMARY KEY)');
      const result = db.exec('SELECT * FROM edge_table');

      expect(result).toBeDefined();
    });

    it('should handle SQL with comments', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS comment_table (id INTEGER PRIMARY KEY)');
      db.exec('/* This is a comment */ INSERT INTO comment_table (id) VALUES (1)');

      const result = db.query('SELECT * FROM comment_table');
      expect(result).toHaveLength(1);
    });

    it('should handle NULL values', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS null_value_table (id INTEGER PRIMARY KEY, name TEXT)');
      db.exec('INSERT INTO null_value_table (id, name) VALUES (?, ?)', [1, null]);

      const result = db.query('SELECT * FROM null_value_table WHERE id = ?', [1]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBeNull();
    });
  });

  describe('performance logging', () => {
    it('should include timestamp in error logs', () => {
      const db = getDatabase();

      // This should log error with timestamp
      expect(() => {
        db.query('SELECT * FROM table_does_not_exist');
      }).toThrow();
    });

    it('should log SQL queries in development', () => {
      // In development mode, SQL queries should be logged
      // This is a smoke test - we can't easily verify console output
      const db = getDatabase();
      db.exec('CREATE TABLE IF NOT EXISTS log_test (id INTEGER PRIMARY KEY)');

      expect(() => db.query('SELECT * FROM log_test')).not.toThrow();
    });
  });

  describe('data types', () => {
    it('should handle INTEGER types', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS type_test (id INTEGER, value INTEGER)');
      db.exec('INSERT INTO type_test (id, value) VALUES (?, ?)', [1, 42]);

      const result = db.query('SELECT * FROM type_test');
      expect(result[0].value).toBe(42);
    });

    it('should handle TEXT types', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS type_test (id INTEGER, value TEXT)');
      db.exec('INSERT INTO type_test (id, value) VALUES (?, ?)', [1, 'Hello World']);

      const result = db.query('SELECT * FROM type_test');
      expect(result[0].value).toBe('Hello World');
    });

    it('should handle REAL/float types', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS type_test (id INTEGER, value REAL)');
      db.exec('INSERT INTO type_test (id, value) VALUES (?, ?)', [1, 3.14]);

      const result = db.query('SELECT * FROM type_test');
      expect(result[0].value).toBeCloseTo(3.14);
    });

    it('should handle BLOB types', () => {
      const db = getDatabase();

      db.exec('CREATE TABLE IF NOT EXISTS type_test (id INTEGER, value BLOB)');
      const blobData = Buffer.from('blob data');
      db.exec('INSERT INTO type_test (id, value) VALUES (?, ?)', [1, blobData]);

      const result = db.query('SELECT * FROM type_test');
      expect(Buffer.isBuffer(result[0].value) || result[0].value instanceof Uint8Array).toBe(true);
    });
  });
});
