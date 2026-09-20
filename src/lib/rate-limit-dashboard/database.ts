// @ts-nocheck
/**
 * Rate Limiting & Security Dashboard - Database Layer
 * 限流与安全仪表板 - 数据库层
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type {
  RateLimitRule,
  CreateRateLimitRuleDTO,
  UpdateRateLimitRuleDTO,
  BlacklistEntry,
  CreateBlacklistEntryDTO,
  WhitelistEntry,
  CreateWhitelistEntryDTO,
  RateLimitEvent,
  AttackEvent,
  SecurityAlert,
  PaginationParams,
  PaginationResponse,
  RuleFilters,
  SecurityFilters,
} from './types'

// ============================================================================
// Configuration
// ============================================================================

const DB_DIR = process.env.RATE_LIMIT_DB_DIR || join(process.cwd(), 'data', 'rate-limit')
const DB_PATH = process.env.RATE_LIMIT_DB_PATH || join(DB_DIR, 'dashboard.db')

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true })
}

// ============================================================================
// Database Connection
// ============================================================================

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    })

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// ============================================================================
// Schema Migration
// ============================================================================

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase()

  // Read schema file
  const { readFileSync } = await import('fs')
  const schemaPath = join(__dirname, 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')

  // Execute schema
  db.exec(schema)
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function buildPaginationSQL(params: PaginationParams): { limit: number; offset: number } {
  const limit = Math.min(params.limit || 20, 100)
  const page = Math.max(params.page || 1, 1)
  const offset = (page - 1) * limit

  return { limit, offset }
}

function buildWhereClause(filters: RuleFilters): { where: string; params: unknown[] } {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.enabled !== undefined) {
    conditions.push('enabled = ?')
    params.push(filters.enabled ? 1 : 0)
  }

  if (filters.algorithm) {
    conditions.push('algorithm = ?')
    params.push(filters.algorithm)
  }

  if (filters.keyType) {
    conditions.push('key_type = ?')
    params.push(filters.keyType)
  }

  if (filters.search) {
    conditions.push('(name LIKE ? OR pattern LIKE ? OR description LIKE ?)')
    const searchPattern = `%${filters.search}%`
    params.push(searchPattern, searchPattern, searchPattern)
  }

  return {
    where: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params,
  }
}

// ============================================================================
// Rate Limit Rules Repository
// ============================================================================

export class RateLimitRulesRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async findAll(filters?: RuleFilters, pagination?: PaginationParams): Promise<PaginationResponse<RateLimitRule>> {
    const { where, params: whereParams } = buildWhereClause(filters || {})
    const { limit, offset } = buildPaginationSQL(pagination || {})

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM rate_limit_rules WHERE ${where}`)
    const { total } = countStmt.get(...whereParams) as { total: number }

    // Get items
    const itemsStmt = this.db.prepare(`
      SELECT * FROM rate_limit_rules
      WHERE ${where}
      ORDER BY priority DESC, created_at DESC
      LIMIT ? OFFSET ?
    `)
    const items = itemsStmt.all(...whereParams, limit, offset) as RateLimitRule[]

    // Convert boolean values
    const convertedItems = items.map(item => ({
      ...item,
      enabled: item.enabled === 1,
    }))

    const totalPages = Math.ceil(total / limit)

    return {
      items: convertedItems,
      meta: {
        currentPage: pagination?.page || 1,
        perPage: limit,
        total,
        totalPages,
        hasNext: (pagination?.page || 1) < totalPages,
        hasPrevious: (pagination?.page || 1) > 1,
      },
    }
  }

  async findById(id: string): Promise<RateLimitRule | null> {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_rules WHERE id = ?')
    const row = stmt.get(id) as RateLimitRule | undefined

    if (!row) return null

    return {
      ...row,
      enabled: row.enabled === 1,
    }
  }

  async create(dto: CreateRateLimitRuleDTO): Promise<RateLimitRule> {
    const id = generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO rate_limit_rules (
        id, name, description, pattern, algorithm, window_ms, max_requests,
        key_type, priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      dto.name,
      dto.description || null,
      dto.pattern,
      dto.algorithm,
      dto.windowMs,
      dto.maxRequests,
      dto.keyType,
      dto.priority || 0,
      dto.enabled !== undefined ? (dto.enabled ? 1 : 0) : 1,
      now,
      now
    )

    return this.findById(id)! as Promise<RateLimitRule>
  }

  async update(id: string, dto: UpdateRateLimitRuleDTO): Promise<RateLimitRule | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []

    if (dto.name !== undefined) {
      updates.push('name = ?')
      params.push(dto.name)
    }
    if (dto.description !== undefined) {
      updates.push('description = ?')
      params.push(dto.description)
    }
    if (dto.pattern !== undefined) {
      updates.push('pattern = ?')
      params.push(dto.pattern)
    }
    if (dto.algorithm !== undefined) {
      updates.push('algorithm = ?')
      params.push(dto.algorithm)
    }
    if (dto.windowMs !== undefined) {
      updates.push('window_ms = ?')
      params.push(dto.windowMs)
    }
    if (dto.maxRequests !== undefined) {
      updates.push('max_requests = ?')
      params.push(dto.maxRequests)
    }
    if (dto.keyType !== undefined) {
      updates.push('key_type = ?')
      params.push(dto.keyType)
    }
    if (dto.priority !== undefined) {
      updates.push('priority = ?')
      params.push(dto.priority)
    }
    if (dto.enabled !== undefined) {
      updates.push('enabled = ?')
      params.push(dto.enabled ? 1 : 0)
    }

    if (updates.length === 0) return existing

    params.push(id)
    const stmt = this.db.prepare(`
      UPDATE rate_limit_rules SET ${updates.join(', ')} WHERE id = ?
    `)
    stmt.run(...params)

    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM rate_limit_rules WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async toggle(id: string, enabled: boolean): Promise<RateLimitRule | null> {
    return this.update(id, { enabled })
  }

  async count(filters?: RuleFilters): Promise<number> {
    const { where, params } = buildWhereClause(filters || {})
    const stmt = this.db.prepare(`SELECT COUNT(*) as total FROM rate_limit_rules WHERE ${where}`)
    const { total } = stmt.get(...params) as { total: number }
    return total
  }
}

// ============================================================================
// Blacklist Repository
// ============================================================================

export class BlacklistRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async findAll(pagination?: PaginationParams): Promise<PaginationResponse<BlacklistEntry>> {
    const { limit, offset } = buildPaginationSQL(pagination || {})

    const countStmt = this.db.prepare('SELECT COUNT(*) as total FROM blacklist')
    const { total } = countStmt.get() as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM blacklist
      WHERE expires_at IS NULL OR expires_at > ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const items = itemsStmt.all(Date.now(), limit, offset) as BlacklistEntry[]

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        currentPage: pagination?.page || 1,
        perPage: limit,
        total,
        totalPages,
        hasNext: (pagination?.page || 1) < totalPages,
        hasPrevious: (pagination?.page || 1) > 1,
      },
    }
  }

  async findById(id: string): Promise<BlacklistEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM blacklist WHERE id = ?')
    return stmt.get(id) as BlacklistEntry | null
  }

  async create(dto: CreateBlacklistEntryDTO, createdBy?: string): Promise<BlacklistEntry> {
    const id = generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO blacklist (id, type, value, reason, expires_at, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, dto.type, dto.value, dto.reason || null, dto.expiresAt || null, createdBy || null, now)

    return this.findById(id)! as Promise<BlacklistEntry>
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM blacklist WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async check(type: string, value: string): Promise<BlacklistEntry | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM blacklist
      WHERE type = ? AND value = ?
      AND (expires_at IS NULL OR expires_at > ?)
      LIMIT 1
    `)
    return stmt.get(type, value, Date.now()) as BlacklistEntry | null
  }

  async cleanupExpired(): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM blacklist WHERE expires_at IS NOT NULL AND expires_at < ?')
    const result = stmt.run(Date.now())
    return result.changes
  }
}

// ============================================================================
// Whitelist Repository
// ============================================================================

export class WhitelistRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async findAll(pagination?: PaginationParams): Promise<PaginationResponse<WhitelistEntry>> {
    const { limit, offset } = buildPaginationSQL(pagination || {})

    const countStmt = this.db.prepare('SELECT COUNT(*) as total FROM whitelist')
    const { total } = countStmt.get() as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM whitelist
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const items = itemsStmt.all(limit, offset) as WhitelistEntry[]

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        currentPage: pagination?.page || 1,
        perPage: limit,
        total,
        totalPages,
        hasNext: (pagination?.page || 1) < totalPages,
        hasPrevious: (pagination?.page || 1) > 1,
      },
    }
  }

  async findById(id: string): Promise<WhitelistEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM whitelist WHERE id = ?')
    return stmt.get(id) as WhitelistEntry | null
  }

  async create(dto: CreateWhitelistEntryDTO, createdBy?: string): Promise<WhitelistEntry> {
    const id = generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO whitelist (id, type, value, description, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, dto.type, dto.value, dto.description || null, createdBy || null, now)

    return this.findById(id)! as Promise<WhitelistEntry>
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM whitelist WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async check(type: string, value: string): Promise<WhitelistEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM whitelist WHERE type = ? AND value = ? LIMIT 1')
    return stmt.get(type, value) as WhitelistEntry | null
  }
}

// ============================================================================
// Rate Limit Events Repository
// ============================================================================

export class RateLimitEventsRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async create(event: Omit<RateLimitEvent, 'id'>): Promise<RateLimitEvent> {
    const id = generateId()

    const stmt = this.db.prepare(`
      INSERT INTO rate_limit_events (
        id, identifier, path, rule_id, allowed, remaining, limit,
        algorithm, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      event.identifier,
      event.path,
      event.ruleId || null,
      event.allowed ? 1 : 0,
      event.remaining,
      event.limit,
      event.algorithm,
      event.timestamp,
      event.metadata ? JSON.stringify(event.metadata) : null
    )

    return this.findById(id)! as Promise<RateLimitEvent>
  }

  async findById(id: string): Promise<RateLimitEvent | null> {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_events WHERE id = ?')
    const row = stmt.get(id) as RateLimitEvent | undefined

    if (!row) return null

    return {
      ...row,
      allowed: row.allowed === 1,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  async findByIdentifier(
    identifier: string,
    limit: number = 100
  ): Promise<RateLimitEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rate_limit_events
      WHERE identifier = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    const rows = stmt.all(identifier, limit) as RateLimitEvent[]

    return rows.map(row => ({
      ...row,
      allowed: row.allowed === 1,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  async findByTimeRange(startTime: number, endTime: number, limit: number = 1000): Promise<RateLimitEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rate_limit_events
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    const rows = stmt.all(startTime, endTime, limit) as RateLimitEvent[]

    return rows.map(row => ({
      ...row,
      allowed: row.allowed === 1,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  async cleanup(olderThan: number): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM rate_limit_events WHERE timestamp < ?')
    const result = stmt.run(olderThan)
    return result.changes
  }
}

// ============================================================================
// Attack Events Repository
// ============================================================================

export class AttackEventsRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async create(event: Omit<AttackEvent, 'id'>): Promise<AttackEvent> {
    const id = generateId()

    const stmt = this.db.prepare(`
      INSERT INTO attack_events (
        id, type, identifier, severity, description, evidence,
        detected_at, resolved, resolved_at, resolved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      event.type,
      event.identifier,
      event.severity,
      event.description || null,
      event.evidence ? JSON.stringify(event.evidence) : null,
      event.detectedAt,
      event.resolved ? 1 : 0,
      event.resolvedAt || null,
      event.resolvedBy || null
    )

    return this.findById(id)! as Promise<AttackEvent>
  }

  async findById(id: string): Promise<AttackEvent | null> {
    const stmt = this.db.prepare('SELECT * FROM attack_events WHERE id = ?')
    const row = stmt.get(id) as AttackEvent | undefined

    if (!row) return null

    return {
      ...row,
      resolved: row.resolved === 1,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
    }
  }

  async findAll(
    filters?: SecurityFilters,
    pagination?: PaginationParams
  ): Promise<PaginationResponse<AttackEvent>> {
    const { limit, offset } = buildPaginationSQL(pagination || {})

    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.type) {
      conditions.push('type = ?')
      params.push(filters.type)
    }

    if (filters?.severity) {
      conditions.push('severity = ?')
      params.push(filters.severity)
    }

    if (filters?.resolved !== undefined) {
      conditions.push('resolved = ?')
      params.push(filters.resolved ? 1 : 0)
    }

    if (filters?.timeRange) {
      conditions.push('detected_at >= ? AND detected_at <= ?')
      params.push(filters.timeRange.start, filters.timeRange.end)
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM attack_events WHERE ${where}`)
    const { total } = countStmt.get(...params) as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM attack_events
      WHERE ${where}
      ORDER BY detected_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = itemsStmt.all(...params, limit, offset) as AttackEvent[]

    const items = rows.map(row => ({
      ...row,
      resolved: row.resolved === 1,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
    }))

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        currentPage: pagination?.page || 1,
        perPage: limit,
        total,
        totalPages,
        hasNext: (pagination?.page || 1) < totalPages,
        hasPrevious: (pagination?.page || 1) > 1,
      },
    }
  }

  async resolve(id: string, resolvedBy: string): Promise<AttackEvent | null> {
    const stmt = this.db.prepare(`
      UPDATE attack_events
      SET resolved = 1, resolved_at = ?, resolved_by = ?
      WHERE id = ?
    `)
    stmt.run(Date.now(), resolvedBy, id)

    return this.findById(id)
  }
}

// ============================================================================
// Security Alerts Repository
// ============================================================================

export class SecurityAlertsRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async create(alert: Omit<SecurityAlert, 'id'>): Promise<SecurityAlert> {
    const id = generateId()

    const stmt = this.db.prepare(`
      INSERT INTO security_alerts (
        id, type, severity, title, message, metadata,
        dismissed, dismissed_at, dismissed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      alert.type,
      alert.severity,
      alert.title,
      alert.message || null,
      alert.metadata ? JSON.stringify(alert.metadata) : null,
      alert.dismissed ? 1 : 0,
      alert.dismissedAt || null,
      alert.dismissedBy || null,
      alert.createdAt
    )

    return this.findById(id)! as Promise<SecurityAlert>
  }

  async findById(id: string): Promise<SecurityAlert | null> {
    const stmt = this.db.prepare('SELECT * FROM security_alerts WHERE id = ?')
    const row = stmt.get(id) as SecurityAlert | undefined

    if (!row) return null

    return {
      ...row,
      dismissed: row.dismissed === 1,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  async findAll(
    filters?: SecurityFilters,
    pagination?: PaginationParams
  ): Promise<PaginationResponse<SecurityAlert>> {
    const { limit, offset } = buildPaginationSQL(pagination || {})

    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.severity) {
      conditions.push('severity = ?')
      params.push(filters.severity)
    }

    if (filters?.dismissed !== undefined) {
      conditions.push('dismissed = ?')
      params.push(filters.dismissed ? 1 : 0)
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM security_alerts WHERE ${where}`)
    const { total } = countStmt.get(...params) as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM security_alerts
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = itemsStmt.all(...params, limit, offset) as SecurityAlert[]

    const items = rows.map(row => ({
      ...row,
      dismissed: row.dismissed === 1,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      meta: {
        currentPage: pagination?.page || 1,
        perPage: limit,
        total,
        totalPages,
        hasNext: (pagination?.page || 1) < totalPages,
        hasPrevious: (pagination?.page || 1) > 1,
      },
    }
  }

  async dismiss(id: string, dismissedBy: string): Promise<SecurityAlert | null> {
    const stmt = this.db.prepare(`
      UPDATE security_alerts
      SET dismissed = 1, dismissed_at = ?, dismissed_by = ?
      WHERE id = ?
    `)
    stmt.run(Date.now(), dismissedBy, id)

    return this.findById(id)
  }

  async count(filters?: SecurityFilters): Promise<number> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.severity) {
      conditions.push('severity = ?')
      params.push(filters.severity)
    }

    if (filters?.dismissed !== undefined) {
      conditions.push('dismissed = ?')
      params.push(filters.dismissed ? 1 : 0)
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

    const stmt = this.db.prepare(`SELECT COUNT(*) as total FROM security_alerts WHERE ${where}`)
    const { total } = stmt.get(...params) as { total: number }
    return total
  }
}

// ============================================================================
// Audit Log Repository
// ============================================================================

export interface AuditLogEntry {
  id: string
  action: string
  userId: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: number
}

export class AuditLogRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async create(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
    const id = generateId()

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        id, action, user_id, resource, resource_id, details, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.action,
      entry.userId,
      entry.resource,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.createdAt
    )

    return { ...entry, id }
  }

  async findByUser(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    const rows = stmt.all(userId, limit) as AuditLogEntry[]

    return rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details as string) : undefined,
    }))
  }

  async cleanup(olderThan: number): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM audit_log WHERE created_at < ?')
    const result = stmt.run(olderThan)
    return result.changes
  }
}

// ============================================================================
// Export repositories
// ============================================================================

export const repositories = {
  rateLimitRules: new RateLimitRulesRepository(),
  blacklist: new BlacklistRepository(),
  whitelist: new WhitelistRepository(),
  rateLimitEvents: new RateLimitEventsRepository(),
  attackEvents: new AttackEventsRepository(),
  securityAlerts: new SecurityAlertsRepository(),
  auditLog: new AuditLogRepository(),
}
