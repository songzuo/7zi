// @ts-nocheck - Test file with complex type issues
/**
// @ts-expect-error - Mock type compatibility issues
 * Database Migrations Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  migrate,
  getCurrentVersion,
  runMigrations,
  optimizeDatabase,
  getDatabaseHealth,
  rollback,
  getMigrationStatus,
  createMigration,
} from '../migrations';
import { getDatabaseAsync } from '../index';

describe('Database Migrations', () => {
  beforeEach(async () => {
    // Use in-memory database for tests
    process.env.DATABASE_PATH = ':memory:';
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up environment
    delete process.env.DATABASE_PATH;
  });

  describe('getCurrentVersion', () => {
    it('should return 0 for new database', async () => {
      const version = await getCurrentVersion();
      expect(version).toBe(0);
    });

    it('should return current migration version', async () => {
      // Create migrations table
      const db = await getDatabaseAsync();
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
      db.exec("INSERT INTO migrations (key, value) VALUES ('version', '2')");

      const version = await getCurrentVersion();
      expect(version).toBe(2);
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations', async () => {
      await runMigrations();

      const version = await getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });

    it('should not run migrations if already up to date', async () => {
      await runMigrations();

      const version1 = await getCurrentVersion();

      await runMigrations(); // Run again

      const version2 = await getCurrentVersion();
      expect(version2).toBe(version1);
    });

    it('should handle migrations table creation', async () => {
      await runMigrations();

      const db = await getDatabaseAsync();
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();

      expect(result).toBeDefined();
    });

    it('should track migration execution', async () => {
      await runMigrations();

      const db = await getDatabaseAsync();
      const row = db.prepare("SELECT * FROM migrations WHERE key = 'version'").get();

      expect(row).toBeDefined();
    });
  });

  describe('migrate', () => {
    it('should be an alias for runMigrations', async () => {
      await migrate();

      const version = await getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });
  });

  describe('optimizeDatabase', () => {
    it('should optimize database', async () => {
      const result = await optimizeDatabase();

      expect(result).toHaveProperty('vacuumed');
      expect(result).toHaveProperty('analyzed');
      expect(result).toHaveProperty('indexesOptimized');
    });

    it('should run VACUUM', async () => {
      const result = await optimizeDatabase();
      expect(result.vacuumed).toBe(true);
    });

    it('should run ANALYZE', async () => {
      const result = await optimizeDatabase();
      expect(result.analyzed).toBe(true);
    });

    it('should optimize indexes', async () => {
      // Create some indexes first
      const db = await getDatabaseAsync();
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY,
          name TEXT
        )
      `);
      db.exec('CREATE INDEX IF NOT EXISTS idx_test_table_name ON test_table(name)');

      const result = await optimizeDatabase();
      expect(result.indexesOptimized).toBeGreaterThan(0);
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health status', async () => {
      const health = await getDatabaseHealth();

      expect(health).toHaveProperty('ok');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('size');
      expect(health).toHaveProperty('tables');
      expect(health).toHaveProperty('indexes');
    });

    it('should detect healthy database', async () => {
      const health = await getDatabaseHealth();
      expect(health.ok).toBe(true);
    });

    it('should return database version', async () => {
      const health = await getDatabaseHealth();
      expect(typeof health.version).toBe('number');
    });

    it('should return database size', async () => {
      const health = await getDatabaseHealth();
      expect(typeof health.size).toBe('number');
      expect(health.size).toBeGreaterThan(0);
    });

    it('should count tables', async () => {
      const db = await getDatabaseAsync();
      db.exec('CREATE TABLE IF NOT EXISTS test_table_1 (id INTEGER)');
      db.exec('CREATE TABLE IF NOT EXISTS test_table_2 (id INTEGER)');

      const health = await getDatabaseHealth();
      expect(health.tables).toBeGreaterThanOrEqual(2);
    });

    it('should count indexes', async () => {
      const db = await getDatabaseAsync();
      db.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_test ON test_table(id)');

      const health = await getDatabaseHealth();
      expect(health.indexes).toBeGreaterThan(0);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status', async () => {
      await runMigrations();

      const status = await getMigrationStatus();

      expect(status).toHaveProperty('currentVersion');
      expect(status).toHaveProperty('latestVersion');
      expect(status).toHaveProperty('pendingMigrations');
      expect(status).toHaveProperty('appliedMigrations');
    });

    it('should show no pending migrations after running', async () => {
      await runMigrations();

      const status = await getMigrationStatus();
      expect(status.pendingMigrations).toHaveLength(0);
    });

    it('should show applied migrations', async () => {
      await runMigrations();

      const status = await getMigrationStatus();
      expect(status.appliedMigrations.length).toBeGreaterThan(0);
    });
  });

  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      await runMigrations();

      const versionBefore = await getCurrentVersion();

      await rollback();

      const versionAfter = await getCurrentVersion();
      expect(versionAfter).toBeLessThan(versionBefore);
    });

    it('should handle rollback to specific version', async () => {
      await runMigrations();

      await rollback(1);

      const version = await getCurrentVersion();
      expect(version).toBe(1);
    });

    it('should not rollback if already at target version', async () => {
      await rollback(0); // Start at version 0

      const version = await getCurrentVersion();
      expect(version).toBe(0);
    });

    it('should handle invalid version', async () => {
      await expect(rollback(-1)).resolves.not.toThrow();
    });
  });

  describe('createMigration', () => {
    it('should create migration object', () => {
      const migration = createMigration({
        version: 3,
        name: 'test_migration',
        up: async () => {},
        down: async () => {},
      });

      expect(migration).toHaveProperty('version');
      expect(migration).toHaveProperty('name');
      expect(migration).toHaveProperty('up');
      expect(migration).toHaveProperty('down');
      expect(migration.version).toBe(3);
      expect(migration.name).toBe('test_migration');
    });

    it('should execute up migration', async () => {
      const upFn = vi.fn().mockResolvedValue(undefined);
      const migration = createMigration({
        version: 3,
        name: 'test_migration',
        up: upFn,
        down: async () => {},
      });

      await migration.up();

      expect(upFn).toHaveBeenCalledTimes(1);
    });

    it('should execute down migration', async () => {
      const downFn = vi.fn().mockResolvedValue(undefined);
      const migration = createMigration({
        version: 3,
        name: 'test_migration',
        up: async () => {},
        down: downFn,
      });

      await migration.down();

      expect(downFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent migrations', async () => {
      // Run migrations in parallel
      await Promise.all([runMigrations(), runMigrations()]);

      const version = await getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      // Set invalid database path
      process.env.DATABASE_PATH = '/invalid/path/database.db';

      await expect(runMigrations()).rejects.toThrow();

      // Restore valid path
      process.env.DATABASE_PATH = ':memory:';
    });

    it('should handle missing migrations table', async () => {
      const version = await getCurrentVersion();
      expect(version).toBe(0);
    });

    it('should handle empty migration list', async () => {
      await runMigrations();

      // Running again with no pending migrations should not throw
      await expect(runMigrations()).resolves.not.toThrow();
    });
  });

  describe('integration tests', () => {
    it('should complete full migration cycle', async () => {
      // Run migrations
      await runMigrations();
      const versionAfterRun = await getCurrentVersion();
      expect(versionAfterRun).toBeGreaterThan(0);

      // Check health
      const health = await getDatabaseHealth();
      expect(health.ok).toBe(true);

      // Optimize
      await optimizeDatabase();

      // Rollback
      await rollback();
      const versionAfterRollback = await getCurrentVersion();
      expect(versionAfterRollback).toBeLessThan(versionAfterRun);
    });

    it('should maintain database consistency after migrations', async () => {
      await runMigrations();

      const db = await getDatabaseAsync();

      // Check that migrations table exists
      const migrationsTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      ).get();
      expect(migrationsTable).toBeDefined();

      // Check that version is stored
      const versionRow = db.prepare("SELECT * FROM migrations WHERE key='version'").get();
      expect(versionRow).toBeDefined();
    });
  });
});
