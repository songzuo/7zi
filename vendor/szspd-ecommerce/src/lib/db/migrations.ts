/**
 * Database Migration and Optimization Module
 * Provides database schema migrations and performance optimization tools
 */

import { getDatabaseAsync, getDatabaseSize, analyzeDatabase, vacuumDatabase } from './connection'
import { initializeUserPreferencesTable } from './user-preferences'
import { initializeAuditLogsTable } from './audit-log'
import { up as v190Up, down as v190Down } from './migrations/v190_agent_learning'
import { logger } from '../logger'

export interface Migration {
  version: number
  name: string
  up: () => Promise<void>
  down: () => Promise<void>
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async () => {
      // This migration is handled by initializeAgentTables and initializeWalletTables
      logger.debug('Migration 1: Initial schema (already handled)', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 1 down: Drop tables', { category: 'db' })
      const db = await getDatabaseAsync()
      db.exec('DROP TABLE IF EXISTS wallet_transactions')
      db.exec('DROP TABLE IF EXISTS agent_wallets')
      db.exec('DROP TABLE IF EXISTS agent_data_access')
      db.exec('DROP TABLE IF EXISTS agent_tokens')
      db.exec('DROP TABLE IF EXISTS agents')
    },
  },
  {
    version: 2,
    name: 'add_composite_indexes',
    up: async () => {
      logger.info('Migration 2: Adding composite indexes for better query performance', {
        category: 'db',
      })
      const db = await getDatabaseAsync()

      // Composite indexes for agents table
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status_provider ON agents(status, provider)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status_type ON agents(status, type)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active_at DESC)')

      // Composite indexes for tokens table
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_tokens_expires ON agent_tokens(expires_at)')

      // Composite indexes for data access table
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_agent_data_access_resource ON agent_data_access(resource_type, resource_id)'
      )

      // Composite indexes for wallet transactions
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_status ON wallet_transactions(wallet_id, status)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type_status ON wallet_transactions(type, status)'
      )
    },
    down: async () => {
      logger.debug('Migration 2 down: Remove composite indexes', { category: 'db' })
      const db = await getDatabaseAsync()

      const indexes = [
        'idx_agents_status_provider',
        'idx_agents_status_type',
        'idx_agents_last_active',
        'idx_agent_tokens_expires',
        'idx_agent_data_access_agent_timestamp',
        'idx_agent_data_access_resource',
        'idx_wallet_transactions_wallet_status',
        'idx_wallet_transactions_wallet_created',
        'idx_wallet_transactions_type_status',
      ]

      for (const index of indexes) {
        db.exec(`DROP INDEX IF EXISTS ${index}`)
      }
    },
  },
  {
    version: 3,
    name: 'add_critical_indexes',
    up: async () => {
      logger.info('Migration 3: Adding critical performance indexes', { category: 'db' })
      const db = await getDatabaseAsync()

      // Critical indexes for token expiration queries
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_agent_tokens_agent_expires ON agent_tokens(agent_id, expires_at)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_user_tokens_user_expires ON user_tokens(user_id, expires_at)'
      )

      // Critical indexes for role lookups
      db.exec('CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system)')

      // Critical indexes for wallet currency queries
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_wallets_currency ON agent_wallets(currency)')
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_currency_status ON wallet_transactions(currency, status)'
      )

      logger.info('Migration 3: Added 6 critical indexes', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 3 down: Remove critical indexes', { category: 'db' })
      const db = await getDatabaseAsync()

      const indexes = [
        'idx_agent_tokens_agent_expires',
        'idx_user_tokens_user_expires',
        'idx_roles_name',
        'idx_roles_is_system',
        'idx_agent_wallets_currency',
        'idx_wallet_transactions_currency_status',
      ]

      for (const index of indexes) {
        db.exec(`DROP INDEX IF EXISTS ${index}`)
      }
    },
  },
  {
    version: 4,
    name: 'add_user_preferences',
    up: async () => {
      logger.info('Migration 4: Adding user preferences table', { category: 'db' })
      await initializeUserPreferencesTable()
      logger.info('Migration 4: User preferences table created', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 4 down: Remove user preferences table', { category: 'db' })
      const db = await getDatabaseAsync()
      db.exec('DROP TABLE IF EXISTS user_preferences')
      db.exec('DROP INDEX IF EXISTS idx_user_preferences_locale')
      db.exec('DROP INDEX IF EXISTS idx_user_preferences_theme')
    },
  },
  {
    version: 5,
    name: 'add_audit_logs',
    up: async () => {
      logger.info('Migration 5: Adding audit logs table', { category: 'db' })
      await initializeAuditLogsTable()
      logger.info('Migration 5: Audit logs table created', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 5 down: Remove audit logs table', { category: 'db' })
      const db = await getDatabaseAsync()
      db.exec('DROP TABLE IF EXISTS audit_logs')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_user_id')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_action')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_entity')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_resource')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_status')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_created_at')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_user_created')
      db.exec('DROP INDEX IF EXISTS idx_audit_logs_action_created')
    },
  },
  {
    version: 6,
    name: 'add_feedback_ratings_indexes',
    up: async () => {
      logger.info('Migration 6: Adding feedback and ratings performance indexes', {
        category: 'db',
      })
      const db = await getDatabaseAsync()

      // Composite indexes for feedbacks table
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_feedbacks_status_created ON feedbacks(status, created_at DESC)'
      )
      db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_type_rating ON feedbacks(type, rating)')
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_feedbacks_priority_rating ON feedbacks(priority, rating)'
      )
      db.exec('CREATE INDEX IF NOT EXISTS idx_feedbacks_user_rating ON feedbacks(user_id, rating)')
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_feedbacks_created_user ON feedbacks(created_at DESC, user_id)'
      )

      // Composite indexes for ratings table
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_ratings_target_type_id ON ratings(target_type, target_id)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_ratings_user_target ON ratings(user_id, target_type, target_id)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_ratings_rating_created ON ratings(rating DESC, created_at DESC)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_ratings_target_status ON ratings(target_type, status)'
      )

      // Composite index for helpful_votes
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_helpful_votes_rating_user ON helpful_votes(rating_id, user_id)'
      )
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_helpful_votes_rating_helpful ON helpful_votes(rating_id, is_helpful)'
      )

      logger.info('Migration 6: Added 11 feedback/ratings indexes', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 6 down: Remove feedback and ratings indexes', { category: 'db' })
      const db = await getDatabaseAsync()

      const indexes = [
        'idx_feedbacks_status_created',
        'idx_feedbacks_type_rating',
        'idx_feedbacks_priority_rating',
        'idx_feedbacks_user_rating',
        'idx_feedbacks_created_user',
        'idx_ratings_target_type_id',
        'idx_ratings_user_target',
        'idx_ratings_rating_created',
        'idx_ratings_target_status',
        'idx_helpful_votes_rating_user',
        'idx_helpful_votes_rating_helpful',
      ]

      for (const index of indexes) {
        db.exec(`DROP INDEX IF EXISTS ${index}`)
      }
    },
  },
  {
    version: 7,
    name: 'add_agent_learning_system',
    up: async () => {
      logger.info('Migration 7: Adding Agent Learning System tables', { category: 'db' })
      await v190Up()
      logger.info('Migration 7: Agent Learning System tables created', { category: 'db' })
    },
    down: async () => {
      logger.debug('Migration 7 down: Remove Agent Learning System tables', { category: 'db' })
      await v190Down()
      logger.info('Migration 7: Agent Learning System tables removed', { category: 'db' })
    },
  },
]

/**
 * Get current migration version
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    const db = await getDatabaseAsync()
    const stmt = db.prepare(`
      SELECT value FROM migrations WHERE key = 'version'
    `)
    const row = stmt.get() as { value: string } | undefined
    return row ? parseInt(row.value, 10) : 0
  } catch (error) {
    return 0
  }
}

/**
 * Initialize migrations table
 */
async function initializeMigrationsTable(): Promise<void> {
  const db = await getDatabaseAsync()
  const schema = `
    CREATE TABLE IF NOT EXISTS migrations (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `
  db.exec(schema)
}

/**
 * Set migration version
 */
async function setVersion(version: number): Promise<void> {
  const db = await getDatabaseAsync()
  await initializeMigrationsTable()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO migrations (key, value, updated_at)
    VALUES ('version', ?, ?)
  `)
  stmt.run(version.toString(), new Date().toISOString())
}

/**
 * Run pending migrations
 */
export async function migrate(): Promise<void> {
  await initializeMigrationsTable()
  const currentVersion = await getCurrentVersion()
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version || 0

  if (currentVersion >= latestVersion) {
    logger.info(`Database is up to date (version ${currentVersion})`, { category: 'db' })
    return
  }

  logger.info(`Migrating from version ${currentVersion} to ${latestVersion}`, { category: 'db' })

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      logger.info(`Running migration ${migration.version}: ${migration.name}`, { category: 'db' })
      try {
        await migration.up()
        await setVersion(migration.version)
        logger.info(`Migration ${migration.version} completed`, { category: 'db' })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Migration ${migration.version} failed`, error, {
          category: 'db',
          message: errorMessage,
        })

        // Attempt to rollback to preserve database integrity
        try {
          logger.info(`Attempting to rollback migration ${migration.version}`, { category: 'db' })
          await migration.down()
          logger.info(`Rollback of migration ${migration.version} completed`, { category: 'db' })
        } catch (rollbackError) {
          const rollbackErrorMsg =
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          logger.error(`Rollback of migration ${migration.version} failed`, rollbackError, {
            category: 'db',
            message: rollbackErrorMsg,
          })
          // Create a compound error with both errors
          const compoundError = new Error(
            `Migration ${migration.version} failed: ${errorMessage}. Rollback also failed: ${rollbackErrorMsg}`
          )
          throw compoundError
        }

        throw error
      }
    }
  }

  logger.info('All migrations completed successfully', { category: 'db' })
}

/**
 * Rollback to specific version
 */
export async function rollback(targetVersion: number): Promise<void> {
  const currentVersion = await getCurrentVersion()

  if (targetVersion >= currentVersion) {
    throw new Error(
      `Target version ${targetVersion} is not lower than current version ${currentVersion}`
    )
  }

  logger.info(`Rolling back from version ${currentVersion} to ${targetVersion}`, { category: 'db' })

  // Run migrations in reverse order
  for (let i = MIGRATIONS.length - 1; i >= 0; i--) {
    const migration = MIGRATIONS[i]
    if (migration.version > targetVersion && migration.version <= currentVersion) {
      logger.info(`Rolling back migration ${migration.version}: ${migration.name}`, {
        category: 'db',
      })
      try {
        await migration.down()
        logger.info(`Migration ${migration.version} rolled back`, { category: 'db' })
      } catch (error) {
        logger.error(`Rollback of migration ${migration.version} failed`, error, { category: 'db' })
        throw error
      }
    }
  }

  await setVersion(targetVersion)
  logger.info('Rollback completed successfully', { category: 'db' })
}

/**
 * Analyze slow queries and suggest optimizations
 */
export async function analyzeSlowQueries(): Promise<{
  tablesWithoutIndexes: string[]
  largeTables: Array<{ name: string; count: number }>
  suggestions: string[]
}> {
  const db = await getDatabaseAsync()
  const suggestions: string[] = []

  // Get all tables
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `)
  const tables = tablesStmt.all() as Array<{ name: string }>

  const largeTables: Array<{ name: string; count: number }> = []
  const tablesWithoutIndexes: string[] = []

  for (const { name } of tables) {
    // Check row count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${name}`)
    const { count } = countStmt.get() as { count: number }

    if (count > 10000) {
      largeTables.push({ name, count })
    }

    // Check for indexes
    const indexStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'
    `)
    const { count: indexCount } = indexStmt.get(name) as { count: number }

    if (indexCount === 0 && count > 1000) {
      tablesWithoutIndexes.push(name)
    }
  }

  // Generate suggestions
  if (tablesWithoutIndexes.length > 0) {
    suggestions.push(
      `Consider adding indexes to tables with many rows: ${tablesWithoutIndexes.join(', ')}`
    )
  }

  if (largeTables.length > 0) {
    suggestions.push(
      `Large tables detected: ${largeTables.map(t => `${t.name} (${t.count} rows)`).join(', ')}. Consider partitioning or archiving old data.`
    )
  }

  return {
    tablesWithoutIndexes,
    largeTables,
    suggestions,
  }
}

/**
 * Clean up old/expired data
 */
export async function cleanupOldData(options: { daysToKeep?: number; tables?: string[] }): Promise<{
  cleanedRows: number
  tablesCleaned: Array<{ table: string; rows: number }>
}> {
  const daysToKeep = options.daysToKeep || 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoffDateStr = cutoffDate.toISOString()

  const db = await getDatabaseAsync()
  let cleanedRows = 0
  const tablesCleaned: Array<{ table: string; rows: number }> = []

  // Clean up expired tokens
  const deleteExpiredTokensStmt = db.prepare(`
    DELETE FROM agent_tokens 
    WHERE expires_at < ?
  `)
  const expiredTokensResult = deleteExpiredTokensStmt.run(cutoffDateStr)
  if ((expiredTokensResult.changes ?? 0) > 0) {
    cleanedRows += expiredTokensResult.changes ?? 0
    tablesCleaned.push({ table: 'agent_tokens', rows: expiredTokensResult.changes ?? 0 })
  }

  // Clean up old data access logs (older than specified days)
  const deleteOldAccessLogsStmt = db.prepare(`
    DELETE FROM agent_data_access 
    WHERE timestamp < ?
  `)
  const accessLogsResult = deleteOldAccessLogsStmt.run(cutoffDateStr)
  if ((accessLogsResult.changes ?? 0) > 0) {
    cleanedRows += accessLogsResult.changes ?? 0
    tablesCleaned.push({ table: 'agent_data_access', rows: accessLogsResult.changes ?? 0 })
  }

  return {
    cleanedRows,
    tablesCleaned,
  }
}

/**
 * Optimize database
 */
export async function optimizeDatabase(): Promise<{
  vacuumed: boolean
  analyzed: boolean
  sizeBefore: ReturnType<typeof getDatabaseSize>
  sizeAfter: ReturnType<typeof getDatabaseSize>
  cleanupResult: Awaited<ReturnType<typeof cleanupOldData>>
}> {
  logger.info('Starting database optimization...', { category: 'db' })

  const sizeBefore = getDatabaseSize()

  // Run migrations if needed
  try {
    await migrate()
  } catch (error) {
    logger.warn('Migration failed, continuing with optimization', { error, category: 'db' })
  }

  // Clean up old data
  const cleanupResult = await cleanupOldData({ daysToKeep: 90 })

  // Vacuum to compact the database
  logger.info('Vacuuming database...', { category: 'db' })
  vacuumDatabase()

  // Analyze tables to update statistics
  logger.info('Analyzing database...', { category: 'db' })
  analyzeDatabase()

  const sizeAfter = getDatabaseSize()

  logger.info('Database optimization completed', { category: 'db', sizeBefore, sizeAfter })

  return {
    vacuumed: true,
    analyzed: true,
    sizeBefore,
    sizeAfter,
    cleanupResult,
  }
}

/**
 * Get database health report
 */
export type DatabaseHealthResult = {
  size: ReturnType<typeof getDatabaseSize>
  migrationVersion: number
  latestMigration: number
  needsMigration: boolean
  slowQueryAnalysis: Awaited<ReturnType<typeof analyzeSlowQueries>>
  recommendations: string[]
}

export async function getDatabaseHealth(): Promise<DatabaseHealthResult> {
  const size = getDatabaseSize()
  const migrationVersion = await getCurrentVersion()
  const latestMigration = MIGRATIONS[MIGRATIONS.length - 1]?.version || 0
  const slowQueryAnalysis = await analyzeSlowQueries()

  const recommendations: string[] = []

  // Check if migration is needed
  if (migrationVersion < latestMigration) {
    recommendations.push(
      `Database needs migration from version ${migrationVersion} to ${latestMigration}`
    )
  }

  // Add suggestions from slow query analysis
  recommendations.push(...slowQueryAnalysis.suggestions)

  // Check database size
  if (size && size.sizeInMB > 500) {
    recommendations.push(
      'Database is large (>500MB). Consider archiving old data or running vacuum.'
    )
  }

  // Recommend periodic optimization
  recommendations.push('Run optimizeDatabase() periodically (e.g., weekly) for best performance')

  return {
    size,
    migrationVersion,
    latestMigration,
    needsMigration: migrationVersion < latestMigration,
    slowQueryAnalysis,
    recommendations,
  }
}

export default {
  migrate,
  rollback,
  optimizeDatabase,
  cleanupOldData,
  analyzeSlowQueries,
  getDatabaseHealth,
  getCurrentVersion,
}
