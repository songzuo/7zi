/**
 * Database Migration and Optimization Module
 * Provides database schema migrations and performance optimization tools
 */

import { getDatabaseAsync, getDatabaseSize, analyzeDatabase, vacuumDatabase } from './index';

export interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async () => {
      // This migration is handled by initializeAgentTables and initializeWalletTables
      console.log('Migration 1: Initial schema (already handled)');
    },
    down: async () => {
      console.log('Migration 1 down: Drop tables');
      const db = await getDatabaseAsync();
      db.exec('DROP TABLE IF EXISTS wallet_transactions');
      db.exec('DROP TABLE IF EXISTS agent_wallets');
      db.exec('DROP TABLE IF EXISTS agent_data_access');
      db.exec('DROP TABLE IF EXISTS agent_tokens');
      db.exec('DROP TABLE IF EXISTS agents');
    },
  },
  {
    version: 2,
    name: 'add_composite_indexes',
    up: async () => {
      console.log('Migration 2: Adding composite indexes for better query performance');
      const db = await getDatabaseAsync();

      // Composite indexes for agents table
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status_provider ON agents(status, provider)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status_type ON agents(status, type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active_at DESC)');

      // Composite indexes for tokens table
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_tokens_expires ON agent_tokens(expires_at)');

      // Composite indexes for data access table
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_agent_data_access_resource ON agent_data_access(resource_type, resource_id)');

      // Composite indexes for wallet transactions
      db.exec('CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_status ON wallet_transactions(wallet_id, status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type_status ON wallet_transactions(type, status)');
    },
    down: async () => {
      console.log('Migration 2 down: Remove composite indexes');
      const db = await getDatabaseAsync();

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
      ];

      for (const index of indexes) {
        db.exec(`DROP INDEX IF EXISTS ${index}`);
      }
    },
  },
];

/**
 * Get current migration version
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    const db = await getDatabaseAsync();
    const stmt = db.prepare(`
      SELECT value FROM migrations WHERE key = 'version'
    `);
    const row = stmt.get() as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Initialize migrations table
 */
async function initializeMigrationsTable(): Promise<void> {
  const db = await getDatabaseAsync();
  const schema = `
    CREATE TABLE IF NOT EXISTS migrations (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;
  db.exec(schema);
}

/**
 * Set migration version
 */
async function setVersion(version: number): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeMigrationsTable();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO migrations (key, value, updated_at)
    VALUES ('version', ?, ?)
  `);
  stmt.run(version.toString(), new Date().toISOString());
}

/**
 * Run pending migrations
 */
export async function migrate(): Promise<void> {
  await initializeMigrationsTable();
  const currentVersion = await getCurrentVersion();
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version || 0;

  if (currentVersion >= latestVersion) {
    console.log(`Database is up to date (version ${currentVersion})`);
    return;
  }

  console.log(`Migrating from version ${currentVersion} to ${latestVersion}`);

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      try {
        await migration.up();
        await setVersion(migration.version);
        console.log(`Migration ${migration.version} completed`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Migration ${migration.version} failed:`, errorMessage);

        // Attempt to rollback to preserve database integrity
        try {
          console.log(`Attempting to rollback migration ${migration.version}`);
          await migration.down();
          console.log(`Rollback of migration ${migration.version} completed`);
        } catch (rollbackError) {
          const rollbackErrorMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          console.error(`Rollback of migration ${migration.version} failed:`, rollbackErrorMsg);
          // Create a compound error with both errors
          const compoundError = new Error(
            `Migration ${migration.version} failed: ${errorMessage}. Rollback also failed: ${rollbackErrorMsg}`
          );
          throw compoundError;
        }

        throw error;
      }
    }
  }

  console.log('All migrations completed successfully');
}

/**
 * Rollback to specific version
 */
export async function rollback(targetVersion: number): Promise<void> {
  const currentVersion = await getCurrentVersion();

  if (targetVersion >= currentVersion) {
    throw new Error(`Target version ${targetVersion} is not lower than current version ${currentVersion}`);
  }

  console.log(`Rolling back from version ${currentVersion} to ${targetVersion}`);

  // Run migrations in reverse order
  for (let i = MIGRATIONS.length - 1; i >= 0; i--) {
    const migration = MIGRATIONS[i];
    if (migration.version > targetVersion && migration.version <= currentVersion) {
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
      try {
        await migration.down();
        console.log(`Migration ${migration.version} rolled back`);
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  await setVersion(targetVersion);
  console.log('Rollback completed successfully');
}

/**
 * Analyze slow queries and suggest optimizations
 */
export async function analyzeSlowQueries(): Promise<{
  tablesWithoutIndexes: string[];
  largeTables: Array<{ name: string; count: number }>;
  suggestions: string[];
}> {
  const db = await getDatabaseAsync();
  const suggestions: string[] = [];

  // Get all tables
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `);
  const tables = tablesStmt.all() as Array<{ name: string }>;

  const largeTables: Array<{ name: string; count: number }> = [];
  const tablesWithoutIndexes: string[] = [];

  for (const { name } of tables) {
    // Check row count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${name}`);
    const { count } = countStmt.get() as { count: number };

    if (count > 10000) {
      largeTables.push({ name, count });
    }

    // Check for indexes
    const indexStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'
    `);
    const { count: indexCount } = indexStmt.get(name) as { count: number };

    if (indexCount === 0 && count > 1000) {
      tablesWithoutIndexes.push(name);
    }
  }

  // Generate suggestions
  if (tablesWithoutIndexes.length > 0) {
    suggestions.push(
      `Consider adding indexes to tables with many rows: ${tablesWithoutIndexes.join(', ')}`
    );
  }

  if (largeTables.length > 0) {
    suggestions.push(
      `Large tables detected: ${largeTables.map((t) => `${t.name} (${t.count} rows)`).join(', ')}. Consider partitioning or archiving old data.`
    );
  }

  return {
    tablesWithoutIndexes,
    largeTables,
    suggestions,
  };
}

/**
 * Clean up old/expired data
 */
export async function cleanupOldData(options: {
  daysToKeep?: number;
  tables?: string[];
}): Promise<{
  cleanedRows: number;
  tablesCleaned: Array<{ table: string; rows: number }>;
}> {
  const daysToKeep = options.daysToKeep || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffDateStr = cutoffDate.toISOString();

  const db = await getDatabaseAsync();
  let cleanedRows = 0;
  const tablesCleaned: Array<{ table: string; rows: number }> = [];

  // Clean up expired tokens
  const deleteExpiredTokensStmt = db.prepare(`
    DELETE FROM agent_tokens 
    WHERE expires_at < ?
  `);
  const expiredTokensResult = deleteExpiredTokensStmt.run(cutoffDateStr);
  if ((expiredTokensResult.changes ?? 0) > 0) {
    cleanedRows += expiredTokensResult.changes ?? 0;
    tablesCleaned.push({ table: 'agent_tokens', rows: expiredTokensResult.changes ?? 0 });
  }

  // Clean up old data access logs (older than specified days)
  const deleteOldAccessLogsStmt = db.prepare(`
    DELETE FROM agent_data_access 
    WHERE timestamp < ?
  `);
  const accessLogsResult = deleteOldAccessLogsStmt.run(cutoffDateStr);
  if ((accessLogsResult.changes ?? 0) > 0) {
    cleanedRows += accessLogsResult.changes ?? 0;
    tablesCleaned.push({ table: 'agent_data_access', rows: accessLogsResult.changes ?? 0 });
  }

  return {
    cleanedRows,
    tablesCleaned,
  };
}

/**
 * Optimize database
 */
export async function optimizeDatabase(): Promise<{
  vacuumed: boolean;
  analyzed: boolean;
  sizeBefore: ReturnType<typeof getDatabaseSize>;
  sizeAfter: ReturnType<typeof getDatabaseSize>;
  cleanupResult: Awaited<ReturnType<typeof cleanupOldData>>;
}> {
  console.log('Starting database optimization...');

  const sizeBefore = getDatabaseSize();

  // Run migrations if needed
  try {
    await migrate();
  } catch (error) {
    console.warn('Migration failed, continuing with optimization:', error);
  }

  // Clean up old data
  const cleanupResult = await cleanupOldData({ daysToKeep: 90 });

  // Vacuum to compact the database
  console.log('Vacuuming database...');
  vacuumDatabase();

  // Analyze tables to update statistics
  console.log('Analyzing database...');
  analyzeDatabase();

  const sizeAfter = getDatabaseSize();

  console.log('Database optimization completed');

  return {
    vacuumed: true,
    analyzed: true,
    sizeBefore,
    sizeAfter,
    cleanupResult,
  };
}

/**
 * Get database health report
 */
export async function getDatabaseHealth(): Promise<{
  size: ReturnType<typeof getDatabaseSize>;
  migrationVersion: number;
  latestMigration: number;
  needsMigration: boolean;
  slowQueryAnalysis: Awaited<ReturnType<typeof analyzeSlowQueries>>;
  recommendations: string[];
}> {
  const size = getDatabaseSize();
  const migrationVersion = await getCurrentVersion();
  const latestMigration = MIGRATIONS[MIGRATIONS.length - 1]?.version || 0;
  const slowQueryAnalysis = await analyzeSlowQueries();

  const recommendations: string[] = [];

  // Check if migration is needed
  if (migrationVersion < latestMigration) {
    recommendations.push(`Database needs migration from version ${migrationVersion} to ${latestMigration}`);
  }

  // Add suggestions from slow query analysis
  recommendations.push(...slowQueryAnalysis.suggestions);

  // Check database size
  if (size && size.sizeInMB > 500) {
    recommendations.push('Database is large (>500MB). Consider archiving old data or running vacuum.');
  }

  // Recommend periodic optimization
  recommendations.push('Run optimizeDatabase() periodically (e.g., weekly) for best performance');

  return {
    size,
    migrationVersion,
    latestMigration,
    needsMigration: migrationVersion < latestMigration,
    slowQueryAnalysis,
    recommendations,
  };
}

export default {
  migrate,
  rollback,
  optimizeDatabase,
  cleanupOldData,
  analyzeSlowQueries,
  getDatabaseHealth,
  getCurrentVersion,
};
