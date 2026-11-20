/**
 * Authentication Audit Logger
 * Records all authentication and authorization events for security analysis
 */

import { getDatabaseAsync } from '../db'
import { logger } from '../logger'

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REFRESH_FAILURE = 'token_refresh_failure',
  TOKEN_REVOKED = 'token_revoked',

  // Registration events
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILURE = 'registration_failure',

  // Password events
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',

  // Authorization events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',

  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TOKEN_BLACKLISTED = 'token_blacklisted',

  // Agent events
  AGENT_REGISTERED = 'agent_registered',
  AGENT_AUTHENTICATED = 'agent_authenticated',
  AGENT_AUTH_FAILURE = 'agent_auth_failure',
  AGENT_TOKEN_GENERATED = 'agent_token_generated',
  AGENT_PERMISSION_CHECK = 'agent_permission_check',
}

/**
 * Audit event severity
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  agentId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  result: 'success' | 'failure'
  details?: Record<string, unknown>
  timestamp: Date
  sessionId?: string
  requestId?: string
}

/**
 * Initialize audit log table
 */
export async function initializeAuditLogTable(): Promise<void> {
  const db = await getDatabaseAsync()

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_audit_log (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      user_id TEXT,
      agent_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      resource TEXT,
      action TEXT,
      result TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      session_id TEXT,
      request_id TEXT,
      INDEX idx_event_type (event_type),
      INDEX idx_user_id (user_id),
      INDEX idx_agent_id (agent_id),
      INDEX idx_timestamp (timestamp),
      INDEX idx_severity (severity)
    )
  `)
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: {
  eventType: AuditEventType
  severity?: AuditSeverity
  userId?: string
  agentId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  result: 'success' | 'failure'
  details?: Record<string, unknown>
  sessionId?: string
  requestId?: string
}): Promise<AuditLogEntry> {
  await initializeAuditLogTable()

  const db = await getDatabaseAsync()
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const timestamp = new Date()

  const stmt = db.prepare(`
    INSERT INTO auth_audit_log (
      id, event_type, severity, user_id, agent_id,
      ip_address, user_agent, resource, action,
      result, details, timestamp, session_id, request_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    params.eventType,
    params.severity || AuditSeverity.INFO,
    params.userId || null,
    params.agentId || null,
    params.ipAddress || null,
    params.userAgent || null,
    params.resource || null,
    params.action || null,
    params.result,
    params.details ? JSON.stringify(params.details) : null,
    timestamp.toISOString(),
    params.sessionId || null,
    params.requestId || null
  )

  // Also log to application logger
  const logLevel =
    params.severity === AuditSeverity.CRITICAL || params.severity === AuditSeverity.ERROR
      ? 'error'
      : params.severity === AuditSeverity.WARNING
        ? 'warn'
        : 'info'

  logger[logLevel](`Audit: ${params.eventType}`, {
    userId: params.userId,
    agentId: params.agentId,
    result: params.result,
    details: params.details,
    category: 'audit',
  })

  return {
    id,
    eventType: params.eventType,
    severity: params.severity || AuditSeverity.INFO,
    userId: params.userId,
    agentId: params.agentId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    resource: params.resource,
    action: params.action,
    result: params.result,
    details: params.details,
    timestamp,
    sessionId: params.sessionId,
    requestId: params.requestId,
  }
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(params: {
  userId?: string
  agentId?: string
  eventTypes?: AuditEventType[]
  severity?: AuditSeverity[]
  result?: 'success' | 'failure'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<AuditLogEntry[]> {
  await initializeAuditLogTable()

  const db = await getDatabaseAsync()
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (params.userId) {
    conditions.push('user_id = ?')
    values.push(params.userId)
  }

  if (params.agentId) {
    conditions.push('agent_id = ?')
    values.push(params.agentId)
  }

  if (params.eventTypes && params.eventTypes.length > 0) {
    conditions.push(`event_type IN (${params.eventTypes.map(() => '?').join(',')})`)
    values.push(...params.eventTypes)
  }

  if (params.severity && params.severity.length > 0) {
    conditions.push(`severity IN (${params.severity.map(() => '?').join(',')})`)
    values.push(...params.severity)
  }

  if (params.result) {
    conditions.push('result = ?')
    values.push(params.result)
  }

  if (params.startDate) {
    conditions.push('timestamp >= ?')
    values.push(params.startDate.toISOString())
  }

  if (params.endDate) {
    conditions.push('timestamp <= ?')
    values.push(params.endDate.toISOString())
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = params.limit ? `LIMIT ${params.limit}` : ''
  const offsetClause = params.offset ? `OFFSET ${params.offset}` : ''

  const stmt = db.prepare(`
    SELECT * FROM auth_audit_log 
    ${whereClause}
    ORDER BY timestamp DESC
    ${limitClause}
    ${offsetClause}
  `)

  const rows = stmt.all(...values) as Record<string, unknown>[]

  return rows.map(row => ({
    id: row.id as string,
    eventType: row.event_type as AuditEventType,
    severity: row.severity as AuditSeverity,
    userId: row.user_id as string | undefined,
    agentId: row.agent_id as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    resource: row.resource as string | undefined,
    action: row.action as string | undefined,
    result: row.result as 'success' | 'failure',
    details: row.details ? JSON.parse(row.details as string) : undefined,
    timestamp: new Date(row.timestamp as string),
    sessionId: row.session_id as string | undefined,
    requestId: row.request_id as string | undefined,
  }))
}

/**
 * Get audit statistics
 */
export async function getAuditStats(params?: {
  startDate?: Date
  endDate?: Date
  userId?: string
  agentId?: string
}): Promise<{
  totalEvents: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  successRate: number
  topFailedEvents: { eventType: string; count: number }[]
}> {
  await initializeAuditLogTable()

  const db = await getDatabaseAsync()
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (params?.userId) {
    conditions.push('user_id = ?')
    values.push(params.userId)
  }

  if (params?.agentId) {
    conditions.push('agent_id = ?')
    values.push(params.agentId)
  }

  if (params?.startDate) {
    conditions.push('timestamp >= ?')
    values.push(params.startDate.toISOString())
  }

  if (params?.endDate) {
    conditions.push('timestamp <= ?')
    values.push(params.endDate.toISOString())
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total events
  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM auth_audit_log ${whereClause}`)
  const totalResult = totalStmt.get(...values) as { count: number }

  // By type
  const typeStmt = db.prepare(`
    SELECT event_type, COUNT(*) as count 
    FROM auth_audit_log ${whereClause}
    GROUP BY event_type
  `)
  const typeResults = typeStmt.all(...values) as { event_type: string; count: number }[]
  const byType: Record<string, number> = {}
  typeResults.forEach(r => {
    byType[r.event_type] = r.count
  })

  // By severity
  const severityStmt = db.prepare(`
    SELECT severity, COUNT(*) as count 
    FROM auth_audit_log ${whereClause}
    GROUP BY severity
  `)
  const severityResults = severityStmt.all(...values) as {
    severity: string
    count: number
  }[]
  const bySeverity: Record<string, number> = {}
  severityResults.forEach(r => {
    bySeverity[r.severity] = r.count
  })

  // Success rate
  const successStmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) as success_count
    FROM auth_audit_log ${whereClause}
  `)
  const successResult = successStmt.get(...values) as { total: number; success_count: number }
  const successRate = successResult.total > 0 ? successResult.success_count / successResult.total : 0

  // Top failed events
  const failedStmt = db.prepare(`
    SELECT event_type, COUNT(*) as count 
    FROM auth_audit_log ${whereClause}
    ${whereClause ? 'AND' : 'WHERE'} result = 'failure'
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT 5
  `)
  const failedResults = failedStmt.all(...values) as { event_type: string; count: number }[]

  return {
    totalEvents: totalResult.count,
    byType,
    bySeverity,
    successRate,
    topFailedEvents: failedResults.map(r => ({
      eventType: r.event_type,
      count: r.count,
    })),
  }
}

/**
 * Detect suspicious activity
 * Analyzes patterns and flags potential security issues
 */
export async function detectSuspiciousActivity(params: {
  userId?: string
  agentId?: string
  ipAddress?: string
  timeWindowHours?: number
}): Promise<{
  isSuspicious: boolean
  riskScore: number
  flags: string[]
  recommendations: string[]
}> {
  await initializeAuditLogTable()

  const db = await getDatabaseAsync()
  const timeWindow = params.timeWindowHours || 24
  const startDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000)

  const flags: string[] = []
  const recommendations: string[] = []
  let riskScore = 0

  // Check for multiple failed logins
  const failedLoginsStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM auth_audit_log 
    WHERE event_type = ? AND timestamp >= ?
    ${params.userId ? 'AND user_id = ?' : ''}
    ${params.ipAddress ? 'AND ip_address = ?' : ''}
  `)

  const failedLoginsParams: (string | number)[] = [
    AuditEventType.LOGIN_FAILURE,
    startDate.toISOString(),
  ]
  if (params.userId) failedLoginsParams.push(params.userId)
  if (params.ipAddress) failedLoginsParams.push(params.ipAddress)

  const failedLogins = failedLoginsStmt.get(...failedLoginsParams) as { count: number }

  if (failedLogins.count >= 5) {
    flags.push(`High number of failed logins: ${failedLogins.count}`)
    riskScore += 30
    recommendations.push('Consider implementing account lockout after multiple failures')
  }

  // Check for multiple IP addresses
  if (params.userId) {
    const ipStmt = db.prepare(`
      SELECT COUNT(DISTINCT ip_address) as count 
      FROM auth_audit_log 
      WHERE user_id = ? AND timestamp >= ?
    `)

    const ipResult = ipStmt.get(params.userId, startDate.toISOString()) as { count: number }

    if (ipResult.count >= 3) {
      flags.push(`Multiple IP addresses used: ${ipResult.count}`)
      riskScore += 20
      recommendations.push('Verify account ownership and consider 2FA')
    }
  }

  // Check for unusual event patterns
  const eventStmt = db.prepare(`
    SELECT event_type, COUNT(*) as count 
    FROM auth_audit_log 
    WHERE timestamp >= ?
    ${params.userId ? 'AND user_id = ?' : ''}
    ${params.agentId ? 'AND agent_id = ?' : ''}
    GROUP BY event_type
    HAVING count > 10
  `)

  const eventParams: (string | number)[] = [startDate.toISOString()]
  if (params.userId) eventParams.push(params.userId)
  if (params.agentId) eventParams.push(params.agentId)

  const eventResults = eventStmt.all(...eventParams) as {
    event_type: string
    count: number
  }[]

  eventResults.forEach(r => {
    if (r.event_type === AuditEventType.PERMISSION_DENIED) {
      flags.push(`Multiple permission denials: ${r.count}`)
      riskScore += 15
      recommendations.push('Review user permissions and access patterns')
    }
  })

  return {
    isSuspicious: riskScore >= 50,
    riskScore: Math.min(100, riskScore),
    flags,
    recommendations,
  }
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(params: {
  format: 'json' | 'csv'
  startDate?: Date
  endDate?: Date
  userId?: string
  agentId?: string
}): Promise<string> {
  const logs = await queryAuditLogs({
    startDate: params.startDate,
    endDate: params.endDate,
    userId: params.userId,
    agentId: params.agentId,
    limit: 10000,
  })

  if (params.format === 'json') {
    return JSON.stringify(logs, null, 2)
  }

  // CSV format
  const headers = [
    'id',
    'eventType',
    'severity',
    'userId',
    'agentId',
    'ipAddress',
    'resource',
    'action',
    'result',
    'timestamp',
  ]

  const rows = logs.map(log =>
    [
      log.id,
      log.eventType,
      log.severity,
      log.userId || '',
      log.agentId || '',
      log.ipAddress || '',
      log.resource || '',
      log.action || '',
      log.result,
      log.timestamp.toISOString(),
    ]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
