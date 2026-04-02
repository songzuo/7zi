/**
 * Audit Log Database Module
 * Tracks all sensitive operations for compliance and security auditing
 */

import { getDatabaseAsync } from './connection'
import { logger } from '../logger'

/**
 * Audit log entry interface
 */
export interface AuditLog {
  id: string
  user_id: string | null
  action: AuditAction
  entity_type: string
  entity_id: string | null
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  status: AuditStatus
  error_message: string | null
  created_at: string
}

/**
 * Audit action types
 */
export enum AuditAction {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',

  // User management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_PERMISSION_CHANGED = 'user_permission_changed',
  USER_STATUS_CHANGED = 'user_status_changed',

  // Permission management
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',

  // Data access
  DATA_READ = 'data_read',
  DATA_CREATED = 'data_created',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_EXPORTED = 'data_exported',

  // System operations
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_RESTORE = 'system_restore',

  // Agent operations
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',
  AGENT_ACTIVATED = 'agent_activated',
  AGENT_DEACTIVATED = 'agent_deactivated',

  // Wallet operations
  WALLET_CREATED = 'wallet_created',
  WALLET_TRANSACTION = 'wallet_transaction',
  WALLET_FUNDS_ADDED = 'wallet_funds_added',
  WALLET_FUNDS_WITHDRAWN = 'wallet_funds_withdrawn',
}

/**
 * Audit status types
 */
export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

/**
 * Query options for audit logs
 */
export interface AuditLogQuery {
  user_id?: string
  action?: AuditAction
  entity_type?: string
  entity_id?: string
  status?: AuditStatus
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

/**
 * Database row interface for audit logs
 */
interface AuditLogRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  resource_type: string | null
  resource_id: string | null
  details: string
  ip_address: string | null
  user_agent: string | null
  status: string
  error_message: string | null
  created_at: string
}

/**
 * Initialize audit logs table
 */
export async function initializeAuditLogsTable(): Promise<void> {
  try {
    const db = await getDatabaseAsync()

    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Create indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
    `)

    logger.info('Audit logs table initialized', { category: 'db' })
  } catch (error) {
    logger.error('Failed to initialize audit logs table', { category: 'db', error })
    throw error
  }
}

/**
 * Generate unique audit log ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  entry: Omit<AuditLog, 'id' | 'created_at'>
): Promise<AuditLog> {
  try {
    const db = await getDatabaseAsync()
    await initializeAuditLogsTable()

    const id = generateAuditId()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, action, entity_type, entity_id,
        resource_type, resource_id, details, ip_address,
        user_agent, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.user_id || null,
      entry.action,
      entry.entity_type,
      entry.entity_id || null,
      entry.resource_type || null,
      entry.resource_id || null,
      JSON.stringify(entry.details || {}),
      entry.ip_address || null,
      entry.user_agent || null,
      entry.status,
      entry.error_message || null,
      now
    )

    logger.debug('Audit log created', {
      category: 'audit',
      action: entry.action,
      user_id: entry.user_id,
      entity_type: entry.entity_type,
    })

    return {
      id,
      ...entry,
      created_at: now,
    }
  } catch (error) {
    logger.error('Failed to create audit log', { category: 'db', error })
    // Don't throw error to avoid disrupting the original operation
    throw error
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  try {
    const db = await getDatabaseAsync()
    await initializeAuditLogsTable()

    const stmt = db.prepare('SELECT * FROM audit_logs WHERE id = ?')
    const row = stmt.get(id) as unknown as AuditLogRow | undefined

    if (!row) return null

    return mapRowToAuditLog(row)
  } catch (error) {
    logger.error('Failed to get audit log', { category: 'db', error, id })
    throw error
  }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(options: AuditLogQuery): Promise<{
  logs: AuditLog[]
  total: number
}> {
  try {
    const db = await getDatabaseAsync()
    await initializeAuditLogsTable()

    const conditions: string[] = []
    const params: unknown[] = []

    if (options.user_id) {
      conditions.push('user_id = ?')
      params.push(options.user_id)
    }
    if (options.action) {
      conditions.push('action = ?')
      params.push(options.action)
    }
    if (options.entity_type) {
      conditions.push('entity_type = ?')
      params.push(options.entity_type)
    }
    if (options.entity_id) {
      conditions.push('entity_id = ?')
      params.push(options.entity_id)
    }
    if (options.status) {
      conditions.push('status = ?')
      params.push(options.status)
    }
    if (options.start_date) {
      conditions.push('created_at >= ?')
      params.push(options.start_date)
    }
    if (options.end_date) {
      conditions.push('created_at <= ?')
      params.push(options.end_date)
    }

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM audit_logs'
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ')
    }
    const countStmt = db.prepare(countSql)
    const countResult = countStmt.get(...params) as { count: number }
    const total = countResult.count

    // Get paginated results
    let sql = 'SELECT * FROM audit_logs'
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY created_at DESC'

    const limit = options.limit || 50
    const offset = options.offset || 0
    sql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const stmt = db.prepare(sql)
    const rows = stmt.all(...params) as unknown as AuditLogRow[]

    const logs = rows.map(mapRowToAuditLog)

    return { logs, total }
  } catch (error) {
    logger.error('Failed to query audit logs', { category: 'db', error, options })
    throw error
  }
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; actions?: AuditAction[] } = {}
): Promise<AuditLog[]> {
  const { logs } = await queryAuditLogs({
    user_id: userId,
    limit: options.limit || 50,
  })

  if (options.actions && options.actions.length > 0) {
    return logs.filter(log => options.actions!.includes(log.action))
  }

  return logs
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  options: { limit?: number } = {}
): Promise<AuditLog[]> {
  const { logs } = await queryAuditLogs({
    entity_type: entityType,
    entity_id: entityId,
    limit: options.limit || 50,
  })

  return logs
}

/**
 * Get failed login attempts for a user (security monitoring)
 */
export async function getFailedLoginAttempts(
  userId: string | null,
  timeWindowMinutes: number = 15
): Promise<AuditLog[]> {
  const db = await getDatabaseAsync()
  await initializeAuditLogsTable()

  const cutoffDate = new Date()
  cutoffDate.setMinutes(cutoffDate.getMinutes() - timeWindowMinutes)

  const stmt = db.prepare(`
    SELECT * FROM audit_logs
    WHERE action = ?
      AND status = ?
      AND created_at >= ?
      ${userId ? 'AND user_id = ?' : ''}
    ORDER BY created_at DESC
  `)

  const params: unknown[] = [AuditAction.LOGIN_FAILED, AuditStatus.FAILED, cutoffDate.toISOString()]
  if (userId) {
    params.push(userId)
  }

  const rows = stmt.all(...params) as unknown as AuditLogRow[]
  return rows.map(mapRowToAuditLog)
}

/**
 * Check if user has too many failed login attempts (rate limiting)
 */
export async function hasExcessiveFailedLogins(
  userId: string | null,
  threshold: number = 5,
  timeWindowMinutes: number = 15
): Promise<boolean> {
  const failedAttempts = await getFailedLoginAttempts(userId, timeWindowMinutes)
  return failedAttempts.length >= threshold
}

/**
 * Cleanup old audit logs
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const db = await getDatabaseAsync()
    await initializeAuditLogsTable()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const stmt = db.prepare('DELETE FROM audit_logs WHERE created_at < ?')
    const result = stmt.run(cutoffDate.toISOString())

    const deleted = result.changes || 0
    if (deleted > 0) {
      logger.info('Old audit logs cleaned up', {
        category: 'db',
        deleted,
        daysToKeep,
      })
    }

    return deleted
  } catch (error) {
    logger.error('Failed to cleanup old audit logs', { category: 'db', error })
    throw error
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(
  options: {
    start_date?: string
    end_date?: string
  } = {}
): Promise<{
  totalLogs: number
  successCount: number
  failedCount: number
  actionBreakdown: Record<string, number>
  topUsers: Array<{ user_id: string; count: number }>
}> {
  const db = await getDatabaseAsync()
  await initializeAuditLogsTable()

  let dateFilter = ''
  const params: unknown[] = []

  if (options.start_date) {
    dateFilter += ' AND created_at >= ?'
    params.push(options.start_date)
  }
  if (options.end_date) {
    dateFilter += ' AND created_at <= ?'
    params.push(options.end_date)
  }

  // Total logs
  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE 1=1${dateFilter}`)
  const { count: totalLogs } = totalStmt.get(...params) as { count: number }

  // Success/failed breakdown
  const statusStmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM audit_logs
    WHERE 1=1${dateFilter}
    GROUP BY status
  `)
  const statusRows = statusStmt.all(...params) as Array<{ status: string; count: number }>

  const successCount = statusRows.find(r => r.status === AuditStatus.SUCCESS)?.count || 0
  const failedCount = statusRows.find(r => r.status === AuditStatus.FAILED)?.count || 0

  // Action breakdown
  const actionStmt = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM audit_logs
    WHERE 1=1${dateFilter}
    GROUP BY action
    ORDER BY count DESC
  `)
  const actionRows = actionStmt.all(...params) as Array<{ action: string; count: number }>
  const actionBreakdown = actionRows.reduce(
    (acc, row) => {
      acc[row.action] = row.count
      return acc
    },
    {} as Record<string, number>
  )

  // Top users
  const userStmt = db.prepare(`
    SELECT user_id, COUNT(*) as count
    FROM audit_logs
    WHERE user_id IS NOT NULL${dateFilter}
    GROUP BY user_id
    ORDER BY count DESC
    LIMIT 10
  `)
  const topUsers = userStmt.all(...params) as Array<{ user_id: string; count: number }>

  return {
    totalLogs,
    successCount,
    failedCount,
    actionBreakdown,
    topUsers,
  }
}

/**
 * Map database row to AuditLog object
 */
function mapRowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action as AuditAction,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    details: JSON.parse(row.details || '{}'),
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    status: row.status as AuditStatus,
    error_message: row.error_message,
    created_at: row.created_at,
  }
}
