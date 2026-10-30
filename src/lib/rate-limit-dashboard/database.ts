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
  AttackEventFilters,
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

/**
 * 解析数据库里存成 TEXT 的 JSON 列。
 * 坏数据不让整条查询炸掉 —— 返回 undefined 表示"没有可解析的内容"。
 */
function parseJsonColumn(value: unknown): Record<string, unknown> | undefined {
  if (value === null || value === undefined || value === '') return undefined

  // 数组不是 Record<string, unknown> —— 直接排除，否则脏数据会把数组漏给调用方
  if (Array.isArray(value)) return undefined

  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }

  if (typeof value !== 'string') return undefined

  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

/**
 * 把 snake_case 的数据库行转成对外的 camelCase 类型。
 *
 * 缺陷背景：表里的列名是 `window_ms` / `max_requests` / `key_type` / `created_at`，
 * 而对外的 `RateLimitRule` 用的是 `windowMs` / `maxRequests` / `keyType` / `createdAt`。
 * 直接 `SELECT *` 透传出去，调用方拿到的 `windowMs` 是 `undefined` —— 限流规则读回来全是空字段。
 */
function toRateLimitRule(row: Record<string, unknown>): RateLimitRule {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description === null || row.description === undefined ? undefined : String(row.description),
    pattern: String(row.pattern),
    algorithm: row.algorithm as RateLimitRule['algorithm'],
    windowMs: Number(row.window_ms),
    maxRequests: Number(row.max_requests),
    keyType: row.key_type as RateLimitRule['keyType'],
    priority: Number(row.priority ?? 0),
    enabled: Number(row.enabled) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function toBlacklistEntry(row: Record<string, unknown>): BlacklistEntry {
  return {
    id: String(row.id),
    type: row.type as BlacklistEntry['type'],
    value: String(row.value),
    reason: row.reason === null || row.reason === undefined ? undefined : String(row.reason),
    expiresAt: row.expires_at === null || row.expires_at === undefined ? null : Number(row.expires_at),
    createdBy: row.created_by === null || row.created_by === undefined ? undefined : String(row.created_by),
    createdAt: Number(row.created_at),
  }
}

function toWhitelistEntry(row: Record<string, unknown>): WhitelistEntry {
  return {
    id: String(row.id),
    type: row.type as WhitelistEntry['type'],
    value: String(row.value),
    description: row.description === null || row.description === undefined ? undefined : String(row.description),
    createdBy: row.created_by === null || row.created_by === undefined ? undefined : String(row.created_by),
    createdAt: Number(row.created_at),
  }
}

function toAttackEvent(row: Record<string, unknown>): AttackEvent {
  return {
    id: String(row.id),
    type: row.type as AttackEvent['type'],
    identifier: String(row.identifier),
    severity: row.severity as AttackEvent['severity'],
    description: row.description === null || row.description === undefined ? undefined : String(row.description),
    evidence: parseJsonColumn(row.evidence),
    detectedAt: Number(row.detected_at),
    resolved: Number(row.resolved) === 1,
    resolvedAt: row.resolved_at === null || row.resolved_at === undefined ? undefined : Number(row.resolved_at),
    resolvedBy: row.resolved_by === null || row.resolved_by === undefined ? undefined : String(row.resolved_by),
  }
}

function toSecurityAlert(row: Record<string, unknown>): SecurityAlert {
  return {
    id: String(row.id),
    type: String(row.type),
    severity: row.severity as SecurityAlert['severity'],
    title: String(row.title),
    message: row.message === null || row.message === undefined ? undefined : String(row.message),
    metadata: parseJsonColumn(row.metadata),
    dismissed: Number(row.dismissed) === 1,
    dismissedAt: row.dismissed_at === null || row.dismissed_at === undefined ? undefined : Number(row.dismissed_at),
    dismissedBy: row.dismissed_by === null || row.dismissed_by === undefined ? undefined : String(row.dismissed_by),
    createdAt: Number(row.created_at),
  }
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

/**
 * 安全告警的 WHERE 条件 —— `findAll` 与 `count` 共用同一份，
 * 保证 "count 的结果 == findAll 过滤后的条数" 恒成立。
 */
function buildSecurityAlertWhere(filters?: SecurityFilters): { where: string; params: unknown[] } {
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
    const items = itemsStmt.all(...whereParams, limit, offset) as Record<string, unknown>[]

    // 把 snake_case 列名映射成对外的 camelCase 字段，并转换布尔值
    const convertedItems = items.map(toRateLimitRule)

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
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return toRateLimitRule(row)
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

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 RateLimitRule（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
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

    // count 与 items 必须用同一套"未过期"条件，
    // 否则 meta.total 会把已过期条目也算进去，与 items 长度对不上。
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM blacklist
      WHERE expires_at IS NULL OR expires_at > ?
    `)
    const { total } = countStmt.get(Date.now()) as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM blacklist
      WHERE expires_at IS NULL OR expires_at > ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const items = (itemsStmt.all(Date.now(), limit, offset) as Record<string, unknown>[]).map(toBlacklistEntry)

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
    const row = stmt.get(id) as Record<string, unknown> | undefined
    return row ? toBlacklistEntry(row) : null
  }

  async create(dto: CreateBlacklistEntryDTO, createdBy?: string): Promise<BlacklistEntry> {
    const id = generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO blacklist (id, type, value, reason, expires_at, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, dto.type, dto.value, dto.reason || null, dto.expiresAt || null, createdBy || null, now)

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 BlacklistEntry（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
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
    const row = stmt.get(type, value, Date.now()) as Record<string, unknown> | undefined
    return row ? toBlacklistEntry(row) : null
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
    const items = (itemsStmt.all(limit, offset) as Record<string, unknown>[]).map(toWhitelistEntry)

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
    const row = stmt.get(id) as Record<string, unknown> | undefined
    return row ? toWhitelistEntry(row) : null
  }

  async create(dto: CreateWhitelistEntryDTO, createdBy?: string): Promise<WhitelistEntry> {
    const id = generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO whitelist (id, type, value, description, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, dto.type, dto.value, dto.description || null, createdBy || null, now)

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 WhitelistEntry（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM whitelist WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async check(type: string, value: string): Promise<WhitelistEntry | null> {
    const stmt = this.db.prepare('SELECT * FROM whitelist WHERE type = ? AND value = ? LIMIT 1')
    const row = stmt.get(type, value) as Record<string, unknown> | undefined
    return row ? toWhitelistEntry(row) : null
  }
}

// ============================================================================
// Rate Limit Events Repository
// ============================================================================

/**
 * 把 rate_limit_events 表的一行转成 RateLimitEvent
 *
 * 表里存的是 `max_requests`（`limit` 是 SQLite 保留字，建表时不能用），
 * 而对外的 RateLimitEvent 类型字段叫 `limit` —— 这里做一次映射。
 * 同时把 `rule_id` 映射成 `ruleId`、allowed 从 0/1 转成 boolean、
 * metadata 从 JSON 字符串解回对象。
 *
 * 注意：不能简单地 `...row` 透传 —— 那样会把 `rule_id` / `max_requests`
 * 这些 snake_case 原始列名一起漏给调用方，而 `ruleId` 反而是 undefined。
 */
function toRateLimitEvent(row: Record<string, unknown>): RateLimitEvent {
  return {
    id: String(row.id),
    identifier: String(row.identifier),
    path: String(row.path),
    ruleId: row.rule_id === null || row.rule_id === undefined ? undefined : String(row.rule_id),
    allowed: Number(row.allowed) === 1,
    remaining: Number(row.remaining ?? 0),
    limit: Number(row.max_requests ?? row.limit ?? 0),
    algorithm: row.algorithm as RateLimitEvent['algorithm'],
    timestamp: Number(row.timestamp),
    metadata: parseJsonColumn(row.metadata),
  }
}

export class RateLimitEventsRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  async create(event: Omit<RateLimitEvent, 'id'>): Promise<RateLimitEvent> {
    const id = generateId()

    const stmt = this.db.prepare(`
      INSERT INTO rate_limit_events (
        id, identifier, path, rule_id, allowed, remaining, max_requests,
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

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 RateLimitEvent（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
  }

  async findById(id: string): Promise<RateLimitEvent | null> {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_events WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return toRateLimitEvent(row)
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
    const rows = stmt.all(identifier, limit) as Record<string, unknown>[]

    return rows.map(toRateLimitEvent)
  }

  async findByTimeRange(startTime: number, endTime: number, limit: number = 1000): Promise<RateLimitEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rate_limit_events
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    const rows = stmt.all(startTime, endTime, limit) as Record<string, unknown>[]

    return rows.map(toRateLimitEvent)
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

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 AttackEvent（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
  }

  async findById(id: string): Promise<AttackEvent | null> {
    const stmt = this.db.prepare('SELECT * FROM attack_events WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return toAttackEvent(row)
  }

  async findAll(
    filters?: AttackEventFilters,
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
    const rows = itemsStmt.all(...params, limit, offset) as Record<string, unknown>[]

    const items = rows.map(toAttackEvent)

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

    // 刚刚 INSERT 过，这一行必然存在；用 await + 非空断言，
    // 而不是把整个 Promise 强行 cast 成 SecurityAlert（那样 null 分支就被类型系统骗过去了）。
    const created = await this.findById(id)
    return created!
  }

  async findById(id: string): Promise<SecurityAlert | null> {
    const stmt = this.db.prepare('SELECT * FROM security_alerts WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return toSecurityAlert(row)
  }

  async findAll(
    filters?: SecurityFilters,
    pagination?: PaginationParams
  ): Promise<PaginationResponse<SecurityAlert>> {
    const { limit, offset } = buildPaginationSQL(pagination || {})

    const { where, params } = buildSecurityAlertWhere(filters)

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM security_alerts WHERE ${where}`)
    const { total } = countStmt.get(...params) as { total: number }

    const itemsStmt = this.db.prepare(`
      SELECT * FROM security_alerts
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = itemsStmt.all(...params, limit, offset) as Record<string, unknown>[]

    const items = rows.map(toSecurityAlert)

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
    const { where, params } = buildSecurityAlertWhere(filters)

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

function toAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(row.id),
    action: String(row.action),
    userId: String(row.user_id),
    resource: String(row.resource),
    resourceId: row.resource_id === null || row.resource_id === undefined ? undefined : String(row.resource_id),
    details: parseJsonColumn(row.details),
    ipAddress: row.ip_address === null || row.ip_address === undefined ? undefined : String(row.ip_address),
    userAgent: row.user_agent === null || row.user_agent === undefined ? undefined : String(row.user_agent),
    createdAt: Number(row.created_at),
  }
}

export class AuditLogRepository {
  private db: Database.Database

  constructor(database?: Database.Database) {
    this.db = database || getDatabase()
  }

  /**
   * 写入一条审计日志。
   *
   * P0 缺陷修复：`created_at` 在表里是 `INTEGER NOT NULL`（毫秒时间戳），
   * 而生产调用方不会总是传 `createdAt` —— 旧实现直接把 `undefined` 塞进 INSERT，
   * SQLite 立刻抛 `NOT NULL constraint failed: audit_log.created_at`，写库路径整个崩掉。
   * 现在缺省时用 `Date.now()` 兜底，保持 INTEGER ms 语义，
   * 与 `findByUser` / `cleanup` 的比较口径完全一致。
   */
  async create(entry: Omit<AuditLogEntry, 'id' | 'createdAt'> & { createdAt?: number }): Promise<AuditLogEntry> {
    const id = generateId()
    const createdAt =
      typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now()

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
      createdAt
    )

    return {
      ...entry,
      id,
      createdAt,
    }
  }

  async findByUser(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    const rows = stmt.all(userId, limit) as Record<string, unknown>[]

    return rows.map(toAuditLogEntry)
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
