/**
 * Audit Service
 * 审计日志服务
 */

import { db } from '../db'
import { logger } from '../logger'

/**
 * 审计日志
 */
export interface AuditLog {
  id: string
  tenantId: string
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * 审计查询参数
 */
export interface AuditQueryParams {
  tenantId: string
  userId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * 审计统计
 */
export interface AuditStats {
  totalActions: number
  actionsByType: Record<string, number>
  actionsByUser: Array<{ userId: string; count: number }>
  actionsByResource: Array<{ resourceType: string; count: number }>
}

/**
 * 审计服务类
 */
export class AuditService {
  /**
   * 记录审计日志
   */
  async log(params: {
    tenantId: string
    userId?: string
    action: string
    resourceType: string
    resourceId?: string
    oldValue?: unknown
    newValue?: unknown
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }): Promise<AuditLog> {
    const id = this.generateId('audit')
    
    await db.exec(`
      INSERT INTO audit_logs (
        id, tenant_id, user_id, action, resource_type, resource_id,
        old_value, new_value, ip_address, user_agent, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      params.tenantId,
      params.userId || null,
      params.action,
      params.resourceType,
      params.resourceId || null,
      params.oldValue ? JSON.stringify(params.oldValue) : null,
      params.newValue ? JSON.stringify(params.newValue) : null,
      params.ipAddress || null,
      params.userAgent || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ])
    
    logger.debug('Audit log recorded', {
      tenantId: params.tenantId,
      action: params.action,
      resourceType: params.resourceType,
    })
    
    return {
      id,
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
      createdAt: new Date(),
    }
  }

  /**
   * 查询审计日志
   */
  async query(params: AuditQueryParams): Promise<AuditLog[]> {
    const conditions = ['tenant_id = ?']
    const queryParams: unknown[] = [params.tenantId]
    
    if (params.userId) {
      conditions.push('user_id = ?')
      queryParams.push(params.userId)
    }
    if (params.action) {
      conditions.push('action = ?')
      queryParams.push(params.action)
    }
    if (params.resourceType) {
      conditions.push('resource_type = ?')
      queryParams.push(params.resourceType)
    }
    if (params.resourceId) {
      conditions.push('resource_id = ?')
      queryParams.push(params.resourceId)
    }
    if (params.startDate) {
      conditions.push('created_at >= ?')
      queryParams.push(params.startDate.toISOString())
    }
    if (params.endDate) {
      conditions.push('created_at <= ?')
      queryParams.push(params.endDate.toISOString())
    }
    
    const limit = params.limit || 100
    const offset = params.offset || 0
    
    const rows = await db.queryRows<{
      id: string
      tenant_id: string
      user_id: string | null
      action: string
      resource_type: string
      resource_id: string | null
      old_value: string | null
      new_value: string | null
      ip_address: string | null
      user_agent: string | null
      metadata: string | null
      created_at: string
    }>(
      `SELECT * FROM audit_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )
    
    return rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id || undefined,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id || undefined,
      oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    }))
  }

  /**
   * 获取审计统计
   */
  async getStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStats> {
    const conditions = ['tenant_id = ?']
    const params: unknown[] = [tenantId]
    
    if (startDate) {
      conditions.push('created_at >= ?')
      params.push(startDate.toISOString())
    }
    if (endDate) {
      conditions.push('created_at <= ?')
      params.push(endDate.toISOString())
    }
    
    const whereClause = conditions.join(' AND ')
    
    // 总数
    const totalResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params
    )
    const totalActions = totalResult?.count || 0
    
    // 按类型统计
    const byTypeRows = await db.queryRows<{ action: string; count: number }>(
      `SELECT action, COUNT(*) as count
       FROM audit_logs
       WHERE ${whereClause}
       GROUP BY action`,
      params
    )
    const actionsByType = byTypeRows.reduce((acc, row) => {
      acc[row.action] = row.count
      return acc
    }, {} as Record<string, number>)
    
    // 按用户统计
    const byUserRows = await db.queryRows<{ user_id: string; count: number }>(
      `SELECT user_id, COUNT(*) as count
       FROM audit_logs
       WHERE ${whereClause} AND user_id IS NOT NULL
       GROUP BY user_id
       ORDER BY count DESC
       LIMIT 10`,
      params
    )
    const actionsByUser = byUserRows.map(row => ({
      userId: row.user_id,
      count: row.count,
    }))
    
    // 按资源类型统计
    const byResourceRows = await db.queryRows<{ resource_type: string; count: number }>(
      `SELECT resource_type, COUNT(*) as count
       FROM audit_logs
       WHERE ${whereClause}
       GROUP BY resource_type
       ORDER BY count DESC`,
      params
    )
    const actionsByResource = byResourceRows.map(row => ({
      resourceType: row.resource_type,
      count: row.count,
    }))
    
    return {
      totalActions,
      actionsByType,
      actionsByUser,
      actionsByResource,
    }
  }

  /**
   * 导出审计日志
   */
  async export(
    tenantId: string,
    format: 'json' | 'csv' = 'json',
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    const logs = await this.query({
      tenantId,
      startDate,
      endDate,
      limit: 10000,
    })
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2)
    }
    
    // CSV 格式
    const headers = [
      'ID',
      'Tenant',
      'User',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'Created At',
    ]
    
    const rows = logs.map(log => [
      log.id,
      log.tenantId,
      log.userId || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.ipAddress || '',
      log.createdAt.toISOString(),
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * 清理过期日志
   */
  async cleanup(retentionDays: number = 180): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    
    const result = await db.exec(
      'DELETE FROM audit_logs WHERE created_at < ?',
      [cutoffDate.toISOString()]
    )
    
    logger.info('Audit logs cleaned up', {
      retentionDays,
      cutoffDate,
      deletedCount: result.changes,
    })
    
    return result.changes
  }

  /**
   * 记录登录事件
   */
  async logLogin(
    tenantId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: success ? 'login_success' : 'login_failed',
      resourceType: 'session',
      ipAddress,
      userAgent,
      metadata: { success },
    })
  }

  /**
   * 记录登出事件
   */
  async logLogout(
    tenantId: string,
    userId: string,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'logout',
      resourceType: 'session',
      ipAddress,
    })
  }

  /**
   * 记录数据访问
   */
  async logDataAccess(
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'export' | 'download',
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: `data_${action}`,
      resourceType,
      resourceId,
      ipAddress,
    })
  }

  /**
   * 记录数据修改
   */
  async logDataChange(
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'create' | 'update' | 'delete',
    oldValue?: unknown,
    newValue?: unknown,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: `data_${action}`,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress,
    })
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    tenantId: string,
    userId: string,
    targetUserId: string,
    action: 'role_assigned' | 'role_revoked' | 'permission_granted' | 'permission_revoked',
    oldValue?: unknown,
    newValue?: unknown,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      resourceType: 'permission',
      resourceId: targetUserId,
      oldValue,
      newValue,
      ipAddress,
    })
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 15)
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
  }
}

// 导出单例
export const auditService = new AuditService()