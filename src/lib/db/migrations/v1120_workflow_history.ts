/**
 * v1.12.0 Migration: Workflow History / Audit Trail
 *
 * This migration adds workflow history/audit support:
 * - workflow_history: Store audit trail for all workflow operations
 *
 * Features:
 * - Track all workflow operations (create, update, delete, execute, etc.)
 * - Query by time range, user, operation type
 * - Export audit logs (CSV, JSON)
 * - Support compliance and debugging
 */

import { getDatabaseAsync } from '../connection'
import { logger } from '../../logger'

/**
 * Migration version 9: Add Workflow History table
 */
export async function up(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 9: Creating Workflow History table', { category: 'db' })

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON')

  // ========================================
  // Table: workflow_history
  // Stores audit trail for all workflow operations
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_history (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      ip_address TEXT,
      user_agent TEXT,

      -- Operation details (JSON)
      details TEXT NOT NULL DEFAULT '{}',

      -- Result
      success INTEGER NOT NULL DEFAULT 1,
      error_code TEXT,
      error_message TEXT,

      -- Timing
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      duration INTEGER,

      -- Related entities
      related_version_id TEXT,
      related_instance_id TEXT,
      related_node_id TEXT
    )
  `)

  // Indexes for workflow_history
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow ON workflow_history(workflow_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_operation ON workflow_history(operation)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_user ON workflow_history(user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_timestamp ON workflow_history(timestamp DESC)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_success ON workflow_history(success)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_timestamp ON workflow_history(workflow_id, timestamp DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_user_timestamp ON workflow_history(user_id, timestamp DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_history_operation_timestamp ON workflow_history(operation, timestamp DESC)'
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_version ON workflow_history(related_version_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_instance ON workflow_history(related_instance_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_history_node ON workflow_history(related_node_id)')

  logger.info('Migration 9: Created workflow_history table with 11 indexes', { category: 'db' })
}

/**
 * Rollback: Drop Workflow History table
 */
export async function down(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 9 rollback: Dropping Workflow History table', { category: 'db' })

  // Drop table
  db.exec('DROP TABLE IF EXISTS workflow_history')

  // Drop indexes
  const indexes = [
    'idx_workflow_history_workflow',
    'idx_workflow_history_operation',
    'idx_workflow_history_user',
    'idx_workflow_history_timestamp',
    'idx_workflow_history_success',
    'idx_workflow_history_workflow_timestamp',
    'idx_workflow_history_user_timestamp',
    'idx_workflow_history_operation_timestamp',
    'idx_workflow_history_version',
    'idx_workflow_history_instance',
    'idx_workflow_history_node',
  ]

  for (const index of indexes) {
    db.exec(`DROP INDEX IF EXISTS ${index}`)
  }

  logger.info('Migration 9 rollback: Table and indexes removed', { category: 'db' })
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

  const expectedTables = ['workflow_history']

  const result = db.queryRows(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  )
  const existingTables = result.map(r => r.name as string)

  const missingTables = expectedTables.filter(t => !existingTables.includes(t))

  // Count indexes
  const indexResult = db.queryRows(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_workflow_history%'"
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