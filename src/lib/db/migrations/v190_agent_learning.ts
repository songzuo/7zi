/**
 * v1.9.0 Migration: Agent Learning System Tables
 *
 * This migration adds 8 new tables to support the Agent Learning System:
 * - agent_features: Feature storage for agent performance metrics
 * - agent_models: ML model storage for predictions
 * - task_graphs: Task dependency graph storage
 * - a2a_sessions: A2A communication session tracking
 * - audit_log_archive: Long-term audit log storage
 * - agent_learning_features: Learned features/patterns from agent behavior
 * - workflow_analytics: Analytics data for workflow execution patterns
 * - metrics_time_series: Time-series metrics for monitoring
 *
 * Design Principles:
 * - Zero-downtime migration (tables are new, no existing data affected)
 * - SQLite-compatible (using TEXT for UUID, JSON for JSONB)
 * - Indexed for optimal query performance
 * - Supports both JSON and TEXT columns for flexibility
 */

import { getDatabaseAsync } from '../connection'
import { logger } from '../../logger'

/**
 * Migration version 7: Add Agent Learning System tables
 */
export async function up(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 7: Creating Agent Learning System tables', { category: 'db' })

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON')

  // ========================================
  // Table 1: agent_features
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_features (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL UNIQUE,
      complexity_avg REAL,
      duration_avg INTEGER,
      success_rate REAL,
      reliability REAL,
      capabilities TEXT DEFAULT '[]',
      current_load REAL DEFAULT 0,
      max_concurrent INTEGER DEFAULT 5,
      total_tasks_completed INTEGER DEFAULT 0,
      specialization_scores TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_features_agent_id ON agent_features(agent_id)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_features_reliability ON agent_features(reliability DESC)'
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_features_load ON agent_features(current_load)')

  // ========================================
  // Table 2: agent_models
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_models (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      model_version TEXT,
      model_type TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      metrics TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 0,
      trained_at TEXT,
      deployed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_models_type ON agent_models(model_type)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_models_active ON agent_models(is_active)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_models_name ON agent_models(model_name)')

  // ========================================
  // Table 3: task_graphs
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_graphs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      graph_data TEXT NOT NULL,
      node_count INTEGER DEFAULT 0,
      edge_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_task_graphs_workflow ON task_graphs(workflow_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_task_graphs_created ON task_graphs(created_at DESC)')

  // ========================================
  // Table 4: a2a_sessions
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS a2a_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      agent_a TEXT NOT NULL,
      agent_b TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      context TEXT DEFAULT '{}',
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_a2a_sessions_session ON a2a_sessions(session_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_a2a_sessions_status ON a2a_sessions(status)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_a2a_sessions_agents ON a2a_sessions(agent_a, agent_b)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_a2a_sessions_started ON a2a_sessions(started_at DESC)')

  // ========================================
  // Table 5: audit_log_archive
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log_archive (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor_id TEXT,
      target_id TEXT,
      action TEXT,
      metadata TEXT DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_archive_type ON audit_log_archive(event_type)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_archive_actor ON audit_log_archive(actor_id)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_audit_log_archive_created ON audit_log_archive(created_at DESC)'
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_archive_target ON audit_log_archive(target_id)')

  // ========================================
  // Table 6: agent_learning_features (特征存储)
  // Stores learned features/patterns from agent behavior
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_learning_features (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      feature_type TEXT NOT NULL DEFAULT 'numeric',
      feature_value REAL,
      feature_vector TEXT,
      metadata TEXT DEFAULT '{}',
      confidence REAL DEFAULT 1.0,
      sample_count INTEGER DEFAULT 1,
      last_updated TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_learning_features_agent ON agent_learning_features(agent_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_learning_features_name ON agent_learning_features(feature_name)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_learning_features_type ON agent_learning_features(feature_type)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_learning_features_agent_name ON agent_learning_features(agent_id, feature_name)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_learning_features_confidence ON agent_learning_features(confidence DESC)'
  )

  // ========================================
  // Table 7: workflow_analytics (工作流分析)
  // Analytics data for workflow execution patterns
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_analytics (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_name TEXT,
      execution_id TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      duration_ms INTEGER,
      task_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      resource_usage TEXT DEFAULT '{}',
      bottlenecks TEXT DEFAULT '[]',
      optimizations TEXT DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow ON workflow_analytics(workflow_id)'
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_workflow_analytics_status ON workflow_analytics(status)')
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_analytics_execution ON workflow_analytics(execution_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_analytics_created ON workflow_analytics(created_at DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_analytics_duration ON workflow_analytics(duration_ms DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow_status ON workflow_analytics(workflow_id, status)'
  )

  // ========================================
  // Table 8: metrics_time_series (时序指标)
  // Time-series metrics for monitoring and analysis
  // ========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_time_series (
      id TEXT PRIMARY KEY,
      metric_name TEXT NOT NULL,
      metric_type TEXT NOT NULL DEFAULT 'gauge',
      value REAL NOT NULL,
      unit TEXT,
      tags TEXT DEFAULT '{}',
      source TEXT,
      agent_id TEXT,
      workflow_id TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_name ON metrics_time_series(metric_name)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_type ON metrics_time_series(metric_type)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_timestamp ON metrics_time_series(timestamp DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_name_timestamp ON metrics_time_series(metric_name, timestamp DESC)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_agent ON metrics_time_series(agent_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_workflow ON metrics_time_series(workflow_id)'
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metrics_time_series_source ON metrics_time_series(source)'
  )

  logger.info('Migration 7: Created 8 tables with 28 indexes', { category: 'db' })
}

/**
 * Rollback: Drop all Agent Learning System tables
 */
export async function down(): Promise<void> {
  const db = await getDatabaseAsync()

  logger.info('Migration 7 rollback: Dropping Agent Learning System tables', { category: 'db' })

  // Drop tables in reverse order
  const tables = [
    'metrics_time_series',
    'workflow_analytics',
    'agent_learning_features',
    'audit_log_archive',
    'a2a_sessions',
    'task_graphs',
    'agent_models',
    'agent_features',
  ]

  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`)
  }

  // Drop indexes (automatically dropped with tables in SQLite, but explicit for clarity)
  const indexes = [
    'idx_agent_features_agent_id',
    'idx_agent_features_reliability',
    'idx_agent_features_load',
    'idx_agent_models_type',
    'idx_agent_models_active',
    'idx_agent_models_name',
    'idx_task_graphs_workflow',
    'idx_task_graphs_created',
    'idx_a2a_sessions_session',
    'idx_a2a_sessions_status',
    'idx_a2a_sessions_agents',
    'idx_a2a_sessions_started',
    'idx_audit_log_archive_type',
    'idx_audit_log_archive_actor',
    'idx_audit_log_archive_created',
    'idx_audit_log_archive_target',
    'idx_agent_learning_features_agent',
    'idx_agent_learning_features_name',
    'idx_agent_learning_features_type',
    'idx_agent_learning_features_agent_name',
    'idx_agent_learning_features_confidence',
    'idx_workflow_analytics_workflow',
    'idx_workflow_analytics_status',
    'idx_workflow_analytics_execution',
    'idx_workflow_analytics_created',
    'idx_workflow_analytics_duration',
    'idx_workflow_analytics_workflow_status',
    'idx_metrics_time_series_name',
    'idx_metrics_time_series_type',
    'idx_metrics_time_series_timestamp',
    'idx_metrics_time_series_name_timestamp',
    'idx_metrics_time_series_agent',
    'idx_metrics_time_series_workflow',
    'idx_metrics_time_series_source',
  ]

  for (const index of indexes) {
    db.exec(`DROP INDEX IF EXISTS ${index}`)
  }

  logger.info('Migration 7 rollback: All tables and indexes removed', { category: 'db' })
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

  const expectedTables = [
    'agent_features',
    'agent_models',
    'task_graphs',
    'a2a_sessions',
    'audit_log_archive',
    'agent_learning_features',
    'workflow_analytics',
    'metrics_time_series',
  ]

  const result = db.queryRows(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  )
  const existingTables = result.map(r => r.name as string)

  const missingTables = expectedTables.filter(t => !existingTables.includes(t))

  // Count indexes
  const indexResult = db.queryRows(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
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
