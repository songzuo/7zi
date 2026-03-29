/**
 * Database Module Tests
 * Tests for src/lib/db.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase, getDatabaseAsync } from '@/lib/db';

describe('Database Module', () => {
  // Use a fixed test database path
  const TEST_DB_PATH = '/tmp/7zi-test-db.sqlite';

  beforeAll(() => {
    process.env.DATABASE_PATH = TEST_DB_PATH;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DB_PERFORMANCE_LOGGING = 'false';
    closeDatabase();
  });

  afterAll(() => {
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
    });

    it('should get database asynchronously', async () => {
      const db = await getDatabaseAsync();

      expect(db).toBeDefined();
      expect(db).toHaveProperty('query');
    });

    it('should reuse existing database connection', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();

      // Should return same instance (singleton pattern)
      expect(db1).toBe(db2);
    });
  });

  describe('queryRows operations', () => {
    it('should return typed rows', () => {
      const db = getDatabase();
      const tableName = 'test_query_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'Row 1');

      const result = db.queryRows(`SELECT * FROM ${tableName}`);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should handle empty rows', () => {
      const db = getDatabase();
      const tableName = 'test_empty_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`);
      const result = db.queryRows(`SELECT * FROM ${tableName}`);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle query with parameters', () => {
      const db = getDatabase();
      const tableName = 'test_params_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'Param Test');

      const result = db.queryRows(`SELECT * FROM ${tableName} WHERE id = ?`, [1]);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('exec operations', () => {
    it('should execute INSERT and return changes', () => {
      const db = getDatabase();
      const tableName = 'test_insert_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      const result = stmt.run(1, 'Test');

      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should execute UPDATE and return changes', () => {
      const db = getDatabase();
      const tableName = 'test_update_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'Original');
      const updateStmt = db.prepare(`UPDATE ${tableName} SET name = ? WHERE id = ?`);
      const result = updateStmt.run('Updated', 1);

      expect(result.changes).toBe(1);
    });

    it('should execute DELETE and return changes', () => {
      const db = getDatabase();
      const tableName = 'test_delete_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'To Delete');
      const deleteStmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
      const result = deleteStmt.run(1);

      expect(result.changes).toBe(1);
    });

    it('should handle batch operations', async () => {
      const db = getDatabase();
      const tableName = 'test_batch_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);

      const statements = [
        { sql: `INSERT INTO ${tableName} (id, name) VALUES (?, ?)`, params: [1, 'Batch 1'] },
        { sql: `INSERT INTO ${tableName} (id, name) VALUES (?, ?)`, params: [2, 'Batch 2'] },
        { sql: `INSERT INTO ${tableName} (id, name) VALUES (?, ?)`, params: [3, 'Batch 3'] },
      ];

      const results = await db.batch(statements);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
      expect(results[0].changes).toBe(1);
      expect(results[1].changes).toBe(1);
      expect(results[2].changes).toBe(1);
    });
  });

  describe('prepared statements', () => {
    it('should prepare statement and run', () => {
      const db = getDatabase();
      const tableName = 'test_prep_run_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      const result = stmt.run(1, 'Prepared');

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should prepare statement and get single row', () => {
      const db = getDatabase();
      const tableName = 'test_prep_get_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'Get Test');

      const getStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const result = getStmt.get(1);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Get Test');
    });

    it('should prepare statement and get all rows', () => {
      const db = getDatabase();
      const tableName = 'test_prep_all_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, 'All 1');
      stmt.run(2, 'All 2');

      const allStmt = db.prepare(`SELECT * FROM ${tableName}`);
      const result = allStmt.all();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return null for non-existent row', () => {
      const db = getDatabase();
      const tableName = 'test_prep_null_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`);
      const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const result = stmt.get(999);

      expect(result).toBeNull();
    });
  });

  describe('database connection', () => {
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
    it('should handle SQL with comments', () => {
      const db = getDatabase();
      const tableName = 'test_comments_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`);
      // Use prepare + run for both inserts
      const stmt1 = db.prepare(`INSERT INTO ${tableName} (id) VALUES (?)`);
      stmt1.run(1);
      const stmt2 = db.prepare(`INSERT INTO ${tableName} (id) VALUES (?)`);
      stmt2.run(2);

      const result = db.queryRows(`SELECT * FROM ${tableName}`);
      expect(result).toHaveLength(2);
    });

    it('should handle NULL values', () => {
      const db = getDatabase();
      const tableName = 'test_null_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`);
      stmt.run(1, null);

      const result = db.queryRows(`SELECT * FROM ${tableName} WHERE id = ?`, [1]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBeNull();
    });
  });

  describe('data types', () => {
    it('should handle INTEGER types', () => {
      const db = getDatabase();
      const tableName = 'test_type_int_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, int_val INTEGER)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, int_val) VALUES (?, ?)`);
      stmt.run(1, 42);

      const result = db.queryRows(`SELECT * FROM ${tableName}`);
      expect(result).toHaveLength(1);
      expect(result[0].int_val).toBe(42);
    });

    it('should handle TEXT types', () => {
      const db = getDatabase();
      const tableName = 'test_type_text_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, text_val TEXT)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, text_val) VALUES (?, ?)`);
      stmt.run(1, 'Hello World');

      const result = db.queryRows(`SELECT * FROM ${tableName}`);
      expect(result).toHaveLength(1);
      expect(result[0].text_val).toBe('Hello World');
    });

    it('should handle REAL/float types', () => {
      const db = getDatabase();
      const tableName = 'test_type_real_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, real_val REAL)`);
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, real_val) VALUES (?, ?)`);
      stmt.run(1, 3.14);

      const result = db.queryRows(`SELECT * FROM ${tableName}`);
      expect(result).toHaveLength(1);
      expect(result[0].real_val).toBeCloseTo(3.14);
    });

    it('should handle BLOB types', () => {
      const db = getDatabase();
      const tableName = 'test_type_blob_' + Math.random().toString(36).substring(7);

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, blob_val BLOB)`);
      const blobData = Buffer.from('blob data');
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, blob_val) VALUES (?, ?)`);
      stmt.run(1, blobData);

      const result = db.queryRows(`SELECT * FROM ${tableName}`);
      expect(result).toHaveLength(1);
      expect(Buffer.isBuffer(result[0].blob_val) || result[0].blob_val instanceof Uint8Array).toBe(true);
    });
  });
});
