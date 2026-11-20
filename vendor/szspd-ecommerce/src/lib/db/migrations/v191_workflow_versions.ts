/**
 * v1.9.1 Migration: Workflow Version History
 *
 * This migration adds workflow version history support:
 * - workflow_versions: Store workflow snapshots for version history
 * - workflow_version_diffs: Store diff information between versions
 *
 * Features:
 * - Save workflow snapshots on each modification
 * - Support version comparison (diff)
 * - Support version rollback
 * - Auto cleanup of old versions (keep last N)
 */

import { getDatabaseAsync } from '../connection'
import { logger } from '../../logger'

/**
 * Migration version 8: Add Workflow Version History tables
 */
export async function up(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 8: Creating Workflow Version History tables', { category: 'db' })

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON')

  // ========================================
  // Table 1: workflow_versions
  // Stores complete workflow snapshots for version history
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      
      -- Complete workflow snapshot (JSON)
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      config TEXT NOT NULL DEFAULT '{}',
      
      -- Version metadata
      change_summary TEXT,
      change_type TEXT DEFAULT 'update',
      parent_version_id TEXT,
      
      -- Audit fields
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      
      -- Constraints
      UNIQUE(workflow_id, version_number)
    )
  `)

  // Indexes for workflow_versions
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON workflow_versions(workflow_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_versions_version ON workflow_versions(workflow_id, version_number DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_versions_created ON workflow_versions(created_at DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_versions_created_by ON workflow_versions(created_by)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_versions_parent ON workflow_versions(parent_version_id)'
  )

  // ========================================
  // Table 2: workflow_version_diffs
  // Stores computed diffs between versions for quick comparison
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_version_diffs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      from_version_id TEXT NOT NULL,
      to_version_id TEXT NOT NULL,
      
      -- Diff details (JSON)
      nodes_added TEXT DEFAULT '[]',
      nodes_removed TEXT DEFAULT '[]',
      nodes_modified TEXT DEFAULT '[]',
      edges_added TEXT DEFAULT '[]',
      edges_removed TEXT DEFAULT '[]',
      edges_modified TEXT DEFAULT '[]',
      config_changed TEXT DEFAULT '{}',
      
      -- Statistics
      total_changes INTEGER DEFAULT 0,
      
      -- Metadata
      computed_at TEXT NOT NULL DEFAULT (datetime('now')),
      
      -- Constraints
      UNIQUE(from_version_id, to_version_id)
    )
  `)

  // Indexes for workflow_version_diffs
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_version_diffs_workflow ON workflow_version_diffs(workflow_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_version_diffs_from ON workflow_version_diffs(from_version_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_version_diffs_to ON workflow_version_diffs(to_version_id)'
  )

  // ========================================
  // Table 3: workflow_version_settings
  // Per-workflow version settings (retention, etc.)
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_version_settings (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL UNIQUE,
      max_versions INTEGER DEFAULT 50,
      auto_version_on_update INTEGER DEFAULT 1,
      retention_days INTEGER DEFAULT 90,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_version_settings_workflow ON workflow_version_settings(workflow_id)'
  )

  logger.info('Migration 8: Created 3 tables with 11 indexes', { category: 'db' })
}

/**
 * Rollback: Drop all Workflow Version History tables
 */
export async function down(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 8 rollback: Dropping Workflow Version History tables', { category: 'db' })

  // Drop tables in reverse order
  const tables = ['workflow_version_settings', 'workflow_version_diffs', 'workflow_versions']

  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`)
  }

  // Drop indexes
  const indexes = [
    'idx_workflow_versions_workflow',
    'idx_workflow_versions_version',
    'idx_workflow_versions_created',
    'idx_workflow_versions_created_by',
    'idx_workflow_versions_parent',
    'idx_workflow_version_diffs_workflow',
    'idx_workflow_version_diffs_from',
    'idx_workflow_version_diffs_to',
    'idx_workflow_version_settings_workflow',
  ]

  for (const index of indexes) {
    db.exec(`DROP INDEX IF EXISTS ${index}`)
  }

  logger.info('Migration 8 rollback: All tables and indexes removed', { category: 'db' })
}

/**
 * Verify migration success
 */
export async function verify(): Promise<{
  success: boolean
  tables: string[]
  missingTables: string[]
  indexes: number
}> {
  const db = await getDatabaseAsync()

  const expectedTables = ['workflow_versions', 'workflow_version_diffs', 'workflow_version_settings']

  const result = db.queryRows(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  )
  const existingTables = result.map(r => r.name as string)

  const missingTables = expectedTables.filter(t => !existingTables.includes(t))

  // Count indexes
  const indexResult = db.queryRows(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_workflow_version%'"
  )
  const indexCount = (indexResult[0]?.count as number) || 0

  return {
    success: missingTables.length === 0,
    tables: existingTables.filter(t => expectedTables.includes(t)),
    missingTables,
    indexes: indexCount,
  }
}

export default { up, down, verify }
