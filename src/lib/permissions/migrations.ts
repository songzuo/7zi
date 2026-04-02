/**
 * RBAC Database Migrations
 * Add support for multi-role RBAC system
 */

import { getDatabaseAsync } from '../db'
import { logger } from '../logger'

/**
 * Migration 3: Add RBAC tables
 */
export async function migrate(): Promise<void> {
  const db = await getDatabaseAsync()

  // Check if migration has already run
  const checkStmt = db.prepare(`
    SELECT value FROM migrations WHERE key = 'rbac_version'
  `)
  const existing = checkStmt.get() as { value: string } | undefined

  if (existing) {
    logger.info('RBAC migration already applied', { category: 'db', version: existing.value })
    return
  }

  logger.info('Applying RBAC migration...', { category: 'db' })

  const statements = [
    // Users table updates (add roles array support)
    `ALTER TABLE users ADD COLUMN roles TEXT DEFAULT '[]'`,

    // Roles table
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // User-roles mapping table (many-to-many)
    `CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      assigned_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, role)
    )`,

    // Role-permissions mapping table (many-to-many)
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY (role) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(role, permission)
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role)`,
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)`,
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission)`,

    // Record migration
    `INSERT INTO migrations (key, value, updated_at) VALUES ('rbac_version', '1', ?)`,
  ]

  for (const statement of statements) {
    try {
      db.exec(statement)
      logger.debug(`Applied: ${statement.substring(0, 50)}...`, { category: 'db' })
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        logger.error('Migration failed', error, { category: 'db' })
        throw error
      }
      // Column might already exist, continue
    }
  }

  // Seed default roles and permissions
  const { seedDefaultRolesAndPermissions } = await import('./seed')
  const seedResult = await seedDefaultRolesAndPermissions()

  if (seedResult.success) {
    logger.info('RBAC migration completed successfully', {
      category: 'db',
      rolesSeeded: seedResult.rolesSeeded,
      permissionsSeeded: seedResult.permissionsSeeded,
    })
  } else {
    logger.error('Failed to seed roles', new Error(seedResult.message), { category: 'db' })
  }
}

/**
 * Rollback RBAC migration
 */
export async function rollback(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Rolling back RBAC migration...', { category: 'db' })

  const statements = [
    `DROP TABLE IF EXISTS role_permissions`,
    `DROP TABLE IF EXISTS user_roles`,
    `DROP TABLE IF EXISTS roles`,
    `DELETE FROM migrations WHERE key = 'rbac_version'`,
  ]

  for (const statement of statements) {
    try {
      db.exec(statement)
      logger.debug(`Rolled back: ${statement}`, { category: 'db' })
    } catch (error) {
      logger.error('Rollback failed', error, { category: 'db' })
      throw error
    }
  }

  logger.info('RBAC rollback completed', { category: 'db' })
}

/**
 * Check RBAC migration status
 */
export async function getMigrationStatus(): Promise<{
  applied: boolean
  version: string | null
}> {
  const db = await getDatabaseAsync()

  const stmt = db.prepare(`
    SELECT value FROM migrations WHERE key = 'rbac_version'
  `)
  const row = stmt.get() as { value: string } | undefined

  return {
    applied: !!row,
    version: row?.value || null,
  }
}

export default {
  migrate,
  rollback,
  getMigrationStatus,
}
