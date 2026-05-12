//  - Test file with complex type issues
/**
 * Database Migrations Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  migrate,
  getCurrentVersion,
  optimizeDatabase,
  getDatabaseHealth,
  rollback,
} from '../migrations'
import { getDatabaseAsync, closeDatabase } from '../index'
describe('Database Migrations', () => {
  beforeEach(async () => {
    // Use file database for tests
    process.env.DATABASE_PATH = '/tmp/test-migrations-db.sqlite'
    // @ts-expect-error - NODE_ENV is technically readonly but we need to set it for tests
    process.env.NODE_ENV = 'test'
    process.env.ENABLE_DB_PERFORMANCE_LOGGING = 'false'
    closeDatabase()
  })
  afterEach(async () => {
    // Clean up environment
    closeDatabase()
    delete process.env.DATABASE_PATH
  })
  describe('getCurrentVersion', () => {
    it('should return 0 for new database', async () => {
      const version = await getCurrentVersion()
      expect(version).toBe(0)
    })
    it('should return current migration version', async () => {
      // Create migrations table
      const db = await getDatabaseAsync()
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)
      const stmt = db.prepare("INSERT INTO migrations (key, value) VALUES ('version', '2')")
      stmt.run()
      const version = await getCurrentVersion()
      expect(version).toBe(2)
    })
  })
  describe('migrate', () => {
    it('should run pending migrations', async () => {
      await migrate()
      const version = await getCurrentVersion()
      expect(version).toBeGreaterThan(0)
    })
    it('should not run migrations if already up to date', async () => {
      await migrate()
      const version1 = await getCurrentVersion()
      await migrate() // Run again
      const version2 = await getCurrentVersion()
      expect(version2).toBe(version1)
    })
    it('should handle migrations table creation', async () => {
      await migrate()
      const db = await getDatabaseAsync()
      const result = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
        .get()
      expect(result).toBeDefined()
    })
    it('should track migration execution', async () => {
      await migrate()
      const db = await getDatabaseAsync()
      const row = db.prepare("SELECT * FROM migrations WHERE key = 'version'").get()
      expect(row).toBeDefined()
    })
  })
  describe('optimizeDatabase', () => {
    it('should optimize database', async () => {
      const result = await optimizeDatabase()
      expect(result).toHaveProperty('vacuumed')
      expect(result).toHaveProperty('analyzed')
      expect(result).toHaveProperty('indexesOptimized')
    })
    it('should run VACUUM', async () => {
      const result = await optimizeDatabase()
      expect(result.vacuumed).toBe(true)
    })
    it('should run ANALYZE', async () => {
      const result = await optimizeDatabase()
      expect(result.analyzed).toBe(true)
    })
    it('should optimize indexes', async () => {
      // Create some indexes first
      await migrate()
      const db = await getDatabaseAsync()
      const stmt1 = db.prepare(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY,
          name TEXT
        )
      `)
      stmt1.run()
      const stmt2 = db.prepare('CREATE INDEX IF NOT EXISTS idx_test_table_name ON test_table(name)')
      stmt2.run()
      const result = await optimizeDatabase()
      expect(result.vacuumed).toBeDefined()
      expect(result.analyzed).toBeDefined()
    })
  })
  describe('getDatabaseHealth', () => {
    it('should return database health status', async () => {
      const health = await getDatabaseHealth()
      expect(health).toHaveProperty('migrationVersion')
      expect(health).toHaveProperty('latestMigration')
      expect(health).toHaveProperty('needsMigration')
      expect(health).toHaveProperty('size')
      expect(health).toHaveProperty('recommendations')
    })
    it('should detect healthy database', async () => {
      await migrate()
      const health = await getDatabaseHealth()
      expect(health.needsMigration).toBe(false)
    })
    it('should return database version', async () => {
      await migrate()
      const health = await getDatabaseHealth()
      expect(typeof health.migrationVersion).toBe('number')
      expect(typeof health.latestMigration).toBe('number')
    })
    it('should return database size info', async () => {
      const health = await getDatabaseHealth()
      expect(health.size).toBeDefined()
      expect(health.size?.sizeInMB).toBeDefined()
    })
  })
  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      await migrate()
      const versionBefore = await getCurrentVersion()
      if (versionBefore > 0) {
        await rollback(versionBefore - 1)
        const versionAfter = await getCurrentVersion()
        expect(versionAfter).toBeLessThan(versionBefore)
      }
    })
    it('should handle rollback to specific version', async () => {
      await migrate()
      await rollback(1)
      const version = await getCurrentVersion()
      expect(version).toBe(1)
    })
    it('should not rollback if already at target version', async () => {
      await migrate()
      const currentVersion = await getCurrentVersion()
      if (currentVersion > 0) {
        await rollback(0) // Start at version 0
        const version = await getCurrentVersion()
        expect(version).toBe(0)
      }
    })
    it('should handle invalid version', async () => {
      await expect(rollback(-1)).resolves.not.toThrow()
    })
  })
  describe('edge cases', () => {
    it('should handle concurrent migrations', async () => {
      // Run migrations in parallel
      await Promise.all([migrate(), migrate()])
      const version = await getCurrentVersion()
      expect(version).toBeGreaterThan(0)
    })
    it('should handle missing migrations table', async () => {
      const version = await getCurrentVersion()
      expect(version).toBe(0)
    })
    it('should handle empty migration list', async () => {
      await migrate()
      // Running again with no pending migrations should not throw
      await expect(migrate()).resolves.not.toThrow()
    })
  })
  describe('integration tests', () => {
    it('should complete full migration cycle', async () => {
      // Run migrations
      await migrate()
      const versionAfterRun = await getCurrentVersion()
      expect(versionAfterRun).toBeGreaterThan(0)
      // Check health
      const health = await getDatabaseHealth()
      expect(health.needsMigration).toBe(false)
      // Optimize
      await optimizeDatabase()
      // Rollback
      const versionToRollback = await getCurrentVersion()
      if (versionToRollback > 0) {
        await rollback(versionToRollback - 1)
      }
      const versionAfterRollback = await getCurrentVersion()
      expect(versionAfterRollback).toBeLessThan(versionAfterRun)
    })
    it('should maintain database consistency after migrations', async () => {
      await migrate()
      const db = await getDatabaseAsync()
      // Check that migrations table exists
      const migrationsTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
        .get()
      expect(migrationsTable).toBeDefined()
      // Check that version is stored
      const versionRow = db.prepare("SELECT * FROM migrations WHERE key='version'").get()
      expect(versionRow).toBeDefined()
    })
  })
})
