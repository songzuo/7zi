// @ts-nocheck
/**
 * v1.12.0 Permission Audit Logging
 * 权限变更审计日志系统
 */

import {
  PermissionChangeType,
  PermissionAuditLog,
  PermissionCheckRequest,
  PermissionCheckResultV2,
} from './types'
import { getDatabaseAsync, type DatabaseConnection } from '../db'

/**
 * 审计日志配置
 */
interface AuditConfig {
  /** 是否启用审计 */
  enabled: boolean
  /** 保留天数 */
  retentionDays: number
  /** 是否记录详细变更 */
  includeFullDetails: boolean
  /** 是否记录检查日志 */
  logPermissionChecks: boolean
  /** 异步写入 */
  asyncWrite: boolean
  /** 批量写入大小 */
  batchSize: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AuditConfig = {
  enabled: true,
  retentionDays: 90,
  includeFullDetails: true,
  logPermissionChecks: false,
  asyncWrite: true,
  batchSize: 100,
}

/**
 * 审计日志条目（批量写入）
 */
interface AuditLogEntry {
  changeType: string
  operatorId: string
  operatorRole: string
  targetType: string
  targetId: string
  beforeValue?: string
  afterValue?: string
  reason?: string
  permissionIds?: string
  roleIds?: string
  tenantId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: string
}

/**
 * 审计日志管理器
 */
export class AuditLogManager {
  private config: AuditConfig
  private pendingLogs: AuditLogEntry[]
  private writeTimer: NodeJS.Timeout | null

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.pendingLogs = []
    this.writeTimer = null
  }

  /**
   * 记录权限变更
   */
  async logChange(log: Omit<PermissionAuditLog, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    const entry: AuditLogEntry = {
      changeType: log.changeType,
      operatorId: log.operatorId,
      operatorRole: log.operatorRole,
      targetType: log.targetType,
      targetId: log.targetId,
      beforeValue: this.config.includeFullDetails
        ? JSON.stringify(log.beforeValue)
        : undefined,
      afterValue: this.config.includeFullDetails
        ? JSON.stringify(log.afterValue)
        : undefined,
      reason: log.reason,
      permissionIds: log.permissionIds?.join(','),
      roleIds: log.roleIds?.join(','),
      tenantId: log.tenantId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: this.config.includeFullDetails
        ? JSON.stringify(log.metadata)
        : undefined,
    }

    if (this.config.asyncWrite) {
      this.pendingLogs.push(entry)

      // 触发批量写入
      if (this.pendingLogs.length >= this.config.batchSize) {
        await this.flush()
      } else if (!this.writeTimer) {
        // 延迟写入（1秒）
        this.writeTimer = setTimeout(() => {
          this.flush()
        }, 1000)
      }
    } else {
      // 同步写入
      await this.writeLog(entry)
    }
  }

  /**
   * 记录权限检查
   */
  async logCheck(
    request: PermissionCheckRequest,
    result: PermissionCheckResultV2
  ): Promise<void> {
    if (!this.config.enabled || !this.config.logPermissionChecks) {
      return
    }

    const log: Omit<PermissionAuditLog, 'id' | 'timestamp' | 'changeType'> = {
      operatorId: request.user.userId,
      operatorRole: request.user.roles[0] || 'unknown',
      targetType: 'user',
      targetId: request.user.userId,
      beforeValue: JSON.stringify({ resource: request.resource, action: request.action }),
      afterValue: JSON.stringify({ allowed: result.allowed, source: result.source }),
      metadata: {
        check: true,
        matchedPermissionId: result.matchedPermissionId,
        denyReason: result.denyReason,
        evaluationTimeMs: result.evaluationTimeMs,
        cacheHit: result.cacheHit,
      },
    }

    await this.logChange({
      ...log,
      changeType: 'permission_check' as PermissionChangeType,
    })
  }

  /**
   * 刷新待写入的日志
   */
  async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) {
      return
    }

    if (this.writeTimer) {
      clearTimeout(this.writeTimer)
      this.writeTimer = null
    }

    const logs = [...this.pendingLogs]
    this.pendingLogs = []

    try {
      await this.writeLogs(logs)
    } catch (error) {
      // 写入失败，重新加入队列
      this.pendingLogs.unshift(...logs)
      throw error
    }
  }

  /**
   * 写入单条日志
   */
  private async writeLog(entry: AuditLogEntry): Promise<void> {
    const db = await getDatabaseAsync()
    await this.initializeAuditTable(db)

    const now = new Date().toISOString()
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stmt = db.prepare(`
      INSERT INTO permission_audit_logs (
        id, change_type, operator_id, operator_role, target_type, target_id,
        before_value, after_value, reason, permission_ids, role_ids,
        tenant_id, ip_address, user_agent, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      entry.changeType,
      entry.operatorId,
      entry.operatorRole,
      entry.targetType,
      entry.targetId,
      entry.beforeValue,
      entry.afterValue,
      entry.reason,
      entry.permissionIds,
      entry.roleIds,
      entry.tenantId,
      entry.ipAddress,
      entry.userAgent,
      entry.metadata,
      now
    )
  }

  /**
   * 批量写入日志
   */
  private async writeLogs(entries: AuditLogEntry[]): Promise<void> {
    const db = await getDatabaseAsync()
    await this.initializeAuditTable(db)

    const stmt = db.prepare(`
      INSERT INTO permission_audit_logs (
        id, change_type, operator_id, operator_role, target_type, target_id,
        before_value, after_value, reason, permission_ids, role_ids,
        tenant_id, ip_address, user_agent, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction((logs: AuditLogEntry[]) => {
      const now = new Date().toISOString()
      for (const entry of logs) {
        const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        stmt.run(
          id,
          entry.changeType,
          entry.operatorId,
          entry.operatorRole,
          entry.targetType,
          entry.targetId,
          entry.beforeValue,
          entry.afterValue,
          entry.reason,
          entry.permissionIds,
          entry.roleIds,
          entry.tenantId,
          entry.ipAddress,
          entry.userAgent,
          entry.metadata,
          now
        )
      }
    })

    transaction(entries)
  }

  /**
   * 初始化审计表
   */
  private async initializeAuditTable(db: DatabaseConnection): Promise<void> {
    const stmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS permission_audit_logs (
        id TEXT PRIMARY KEY,
        change_type TEXT NOT NULL,
        operator_id TEXT NOT NULL,
        operator_role TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        before_value TEXT,
        after_value TEXT,
        reason TEXT,
        permission_ids TEXT,
        role_ids TEXT,
        tenant_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `)

    stmt.run()

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_operator ON permission_audit_logs(operator_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON permission_audit_logs(target_type, target_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_change_type ON permission_audit_logs(change_type);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON permission_audit_logs(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON permission_audit_logs(tenant_id);',
    ]

    for (const indexSql of indexes) {
      db.exec(indexSql)
    }
  }

  /**
   * 查询审计日志
   */
  async queryLogs(filters: {
    changeType?: PermissionChangeType
    operatorId?: string
    targetType?: 'role' | 'user' | 'policy'
    targetId?: string
    tenantId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<PermissionAuditLog[]> {
    const db = await getDatabaseAsync()
    await this.initializeAuditTable(db)

    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.changeType) {
      conditions.push('change_type = ?')
      params.push(filters.changeType)
    }

    if (filters.operatorId) {
      conditions.push('operator_id = ?')
      params.push(filters.operatorId)
    }

    if (filters.targetType) {
      conditions.push('target_type = ?')
      params.push(filters.targetType)
    }

    if (filters.targetId) {
      conditions.push('target_id = ?')
      params.push(filters.targetId)
    }

    if (filters.tenantId) {
      conditions.push('tenant_id = ?')
      params.push(filters.tenantId)
    }

    if (filters.startDate) {
      conditions.push('created_at >= ?')
      params.push(filters.startDate.toISOString())
    }

    if (filters.endDate) {
      conditions.push('created_at <= ?')
      params.push(filters.endDate.toISOString())
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT *
      FROM permission_audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    params.push(filters.limit || 100, filters.offset || 0)

    const stmt = db.prepare(sql)
    const rows = stmt.all(...params) as Array<Record<string, unknown>>

    return rows.map(row => this.mapRowToAuditLog(row))
  }

  /**
   * 获取权限变更历史
   */
  async getChangeHistory(
    targetId: string,
    targetType: 'role' | 'user' | 'policy',
    limit: number = 50
  ): Promise<PermissionAuditLog[]> {
    return this.queryLogs({
      targetType,
      targetId,
      limit,
    })
  }

  /**
   * 获取用户操作历史
   */
  async getUserHistory(
    operatorId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<PermissionAuditLog[]> {
    return this.queryLogs({
      operatorId,
      startDate,
      endDate,
      limit,
    })
  }

  /**
   * 统计审计日志
   */
  async getAuditStats(filters: {
    tenantId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{
    totalChanges: number
    changesByType: Record<string, number>
    changesByOperator: Record<string, number>
    changesByTarget: Record<string, number>
  }> {
    const db = await getDatabaseAsync()
    await this.initializeAuditTable(db)

    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.tenantId) {
      conditions.push('tenant_id = ?')
      params.push(filters.tenantId)
    }

    if (filters.startDate) {
      conditions.push('created_at >= ?')
      params.push(filters.startDate.toISOString())
    }

    if (filters.endDate) {
      conditions.push('created_at <= ?')
      params.push(filters.endDate.toISOString())
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 总数统计
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM permission_audit_logs ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // 按类型统计
    const typeStmt = db.prepare(`
      SELECT change_type, COUNT(*) as count
      FROM permission_audit_logs
      ${whereClause}
      GROUP BY change_type
    `)
    const typeRows = typeStmt.all(...params) as Array<{ change_type: string; count: number }>
    const changesByType: Record<string, number> = {}
    for (const row of typeRows) {
      changesByType[row.change_type] = row.count
    }

    // 按操作者统计
    const operatorStmt = db.prepare(`
      SELECT operator_id, COUNT(*) as count
      FROM permission_audit_logs
      ${whereClause}
      GROUP BY operator_id
      ORDER BY count DESC
      LIMIT 10
    `)
    const operatorRows = operatorStmt.all(...params) as Array<{ operator_id: string; count: number }>
    const changesByOperator: Record<string, number> = {}
    for (const row of operatorRows) {
      changesByOperator[row.operator_id] = row.count
    }

    // 按目标统计
    const targetStmt = db.prepare(`
      SELECT target_type, target_id, COUNT(*) as count
      FROM permission_audit_logs
      ${whereClause}
      GROUP BY target_type, target_id
      ORDER BY count DESC
      LIMIT 10
    `)
    const targetRows = targetStmt.all(...params) as Array<{ target_type: string; target_id: string; count: number }>
    const changesByTarget: Record<string, number> = {}
    for (const row of targetRows) {
      changesByTarget[`${row.target_type}:${row.target_id}`] = row.count
    }

    return {
      totalChanges: total,
      changesByType,
      changesByOperator,
      changesByTarget,
    }
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs(): Promise<number> {
    const db = await getDatabaseAsync()
    await this.initializeAuditTable(db)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

    const stmt = db.prepare(`
      DELETE FROM permission_audit_logs
      WHERE created_at < ?
    `)

    const result = stmt.run(cutoffDate.toISOString())
    return result.changes || 0
  }

  /**
   * 映射行到审计日志对象
   */
  private mapRowToAuditLog(row: Record<string, unknown>): PermissionAuditLog {
    return {
      id: row.id as string,
      changeType: row.change_type as PermissionChangeType,
      operatorId: row.operator_id as string,
      operatorRole: row.operator_role as string,
      targetType: row.target_type as 'role' | 'user' | 'policy',
      targetId: row.target_id as string,
      beforeValue: row.before_value ? JSON.parse(row.before_value as string) : undefined,
      afterValue: row.after_value ? JSON.parse(row.after_value as string) : undefined,
      reason: row.reason as string | undefined,
      permissionIds: row.permission_ids ? (row.permission_ids as string).split(',') : undefined,
      roleIds: row.role_ids ? (row.role_ids as string).split(',') : undefined,
      tenantId: row.tenantId as string | undefined,
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.userAgent as string | undefined,
      timestamp: new Date(row.created_at as string),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * 导出审计日志
   */
  async exportLogs(filters: {
    startDate?: Date
    endDate?: Date
    changeType?: PermissionChangeType
  } = {}, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.queryLogs({
      ...filters,
      limit: 10000, // 最大导出数量
    })

    if (format === 'csv') {
      const headers = [
        'id',
        'timestamp',
        'change_type',
        'operator_id',
        'operator_role',
        'target_type',
        'target_id',
        'reason',
      ]

      const rows = logs.map(log =>
        [
          log.id,
          log.timestamp.toISOString(),
          log.changeType,
          log.operatorId,
          log.operatorRole,
          log.targetType,
          log.targetId,
          log.reason || '',
        ].join(',')
      )

      return [headers.join(','), ...rows].join('\n')
    } else {
      return JSON.stringify(logs, null, 2)
    }
  }

  /**
   * 关闭审计管理器
   */
  async close(): Promise<void> {
    await this.flush()
  }
}

/**
 * 创建默认审计管理器实例
 */
export function createAuditLogManager(
  config?: Partial<AuditConfig>
): AuditLogManager {
  return new AuditLogManager(config)
}

/**
 * 全局默认审计管理器实例
 */
export const defaultAuditLogManager = createAuditLogManager()
