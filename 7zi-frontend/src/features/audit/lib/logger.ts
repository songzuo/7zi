/**
 * Audit Logger
 *
 * 审计日志记录器
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'
import { AuditLogEntry, AuditEventType, AuditLogLevel, AuditLogQuery, AuditLogStats } from './types'
import { InMemoryStorage } from '@/lib/db/storage'

/**
 * 审计日志存储
 */
const auditStorage = new InMemoryStorage<AuditLogEntry>()

/**
 * 审计日志记录器类
 */
export class AuditLogger {
  /**
   * 记录审计日志
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date(),
    }

    // 存储到内存（实际应用中应该存储到数据库或日志文件）
    const key = `audit:${auditEntry.id}`
    auditStorage.set(key, auditEntry, 30 * 24 * 60 * 60 * 1000) // 保留 30 天

    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[AUDIT]', auditEntry)
    }

    return auditEntry
  }

  /**
   * 记录认证事件
   */
  static async logAuthEvent(
    eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILED | AuditEventType.LOGOUT,
    data: {
      userId?: string
      username?: string
      ipAddress: string
      userAgent?: string
      sessionId?: string
      success: boolean
      error?: string
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: data.success ? AuditLogLevel.INFO : AuditLogLevel.WARN,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      sessionId: data.sessionId,
      message: this.getAuthEventMessage(eventType, data.success, data.username),
      success: data.success,
      error: data.error,
    })
  }

  /**
   * 记录注册事件
   */
  static async logRegistration(data: {
    userId: string
    username: string
    ipAddress: string
    userAgent?: string
    email?: string
  }): Promise<AuditLogEntry> {
    return this.log({
      eventType: AuditEventType.REGISTER,
      level: AuditLogLevel.INFO,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      message: `User registered: ${data.username}`,
      details: { email: data.email },
      success: true,
    })
  }

  /**
   * 记录密码重置事件
   */
  static async logPasswordReset(
    eventType: AuditEventType.PASSWORD_RESET_REQUEST | AuditEventType.PASSWORD_RESET_SUCCESS,
    data: {
      userId?: string
      username?: string
      ipAddress: string
      success: boolean
      error?: string
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: data.success ? AuditLogLevel.INFO : AuditLogLevel.WARN,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      message: this.getPasswordResetMessage(eventType, data.success),
      success: data.success,
      error: data.error,
    })
  }

  /**
   * 记录权限变更事件
   */
  static async logPermissionChange(
    eventType: AuditEventType.PERMISSION_GRANTED | AuditEventType.PERMISSION_REVOKED,
    data: {
      actorUserId: string
      actorUsername: string
      targetUserId: string
      targetUsername: string
      permission: string
      ipAddress: string
      success: boolean
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: AuditLogLevel.INFO,
      userId: data.actorUserId,
      username: data.actorUsername,
      ipAddress: data.ipAddress,
      message: `${eventType === AuditEventType.PERMISSION_GRANTED ? 'Granted' : 'Revoked'} permission ${data.permission} from user ${data.targetUsername}`,
      details: {
        actorUserId: data.actorUserId,
        actorUsername: data.actorUsername,
        targetUserId: data.targetUserId,
        targetUsername: data.targetUsername,
        permission: data.permission,
      },
      resourceType: 'user',
      resourceId: data.targetUserId,
      success: data.success,
    })
  }

  /**
   * 记录角色变更事件
   */
  static async logRoleChange(
    eventType: AuditEventType.ROLE_GRANT | AuditEventType.ROLE_REVOKE | AuditEventType.ROLE_CHANGE,
    data: {
      actorUserId: string
      actorUsername: string
      targetUserId: string
      targetUsername: string
      role: string
      ipAddress: string
      success: boolean
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: AuditLogLevel.INFO,
      userId: data.actorUserId,
      username: data.actorUsername,
      ipAddress: data.ipAddress,
      message: `Changed role for user ${data.targetUsername}: ${data.role}`,
      details: {
        actorUserId: data.actorUserId,
        actorUsername: data.actorUsername,
        targetUserId: data.targetUserId,
        targetUsername: data.targetUsername,
        role: data.role,
      },
      resourceType: 'user',
      resourceId: data.targetUserId,
      success: data.success,
    })
  }

  /**
   * 记录数据访问事件
   */
  static async logDataAccess(
    eventType:
      | AuditEventType.DATA_READ
      | AuditEventType.DATA_CREATED
      | AuditEventType.DATA_UPDATED
      | AuditEventType.DATA_DELETED,
    data: {
      userId: string
      username: string
      ipAddress: string
      resourceType: string
      resourceId: string
      path?: string
      method?: string
      success: boolean
      error?: string
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: data.success ? AuditLogLevel.INFO : AuditLogLevel.ERROR,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      path: data.path,
      method: data.method,
      message: `${eventType} on ${data.resourceType}:${data.resourceId}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      success: data.success,
      error: data.error,
    })
  }

  /**
   * 记录 API 访问事件
   */
  static async logApiAccess(data: {
    userId?: string
    username?: string
    ipAddress: string
    path: string
    method: string
    success: boolean
    statusCode?: number
    error?: string
  }): Promise<AuditLogEntry> {
    return this.log({
      eventType: AuditEventType.API_ACCESS,
      level: data.success ? AuditLogLevel.INFO : AuditLogLevel.WARN,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      path: data.path,
      method: data.method,
      message: `API ${data.method} ${data.path} - ${data.statusCode || 'N/A'}`,
      details: { statusCode: data.statusCode },
      success: data.success,
      error: data.error,
    })
  }

  /**
   * 记录速率限制超出事件
   */
  static async logRateLimitExceeded(data: {
    userId?: string
    username?: string
    ipAddress: string
    path: string
    limit: number
    windowMs: number
  }): Promise<AuditLogEntry> {
    return this.log({
      eventType: AuditEventType.API_RATE_LIMIT_EXCEEDED,
      level: AuditLogLevel.WARN,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      path: data.path,
      message: `Rate limit exceeded for ${data.path}: ${data.limit} requests per ${data.windowMs}ms`,
      details: {
        limit: data.limit,
        windowMs: data.windowMs,
      },
      success: false,
    })
  }

  /**
   * 记录安全事件
   */
  static async logSecurityEvent(
    eventType:
      | AuditEventType.SECURITY_VIOLATION
      | AuditEventType.SECURITY_ALERT
      | AuditEventType.SUSPICIOUS_ACTIVITY,
    data: {
      userId?: string
      username?: string
      ipAddress: string
      message: string
      details?: Record<string, unknown>
      level?: AuditLogLevel
    }
  ): Promise<AuditLogEntry> {
    return this.log({
      eventType,
      level: data.level || AuditLogLevel.WARN,
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      message: data.message,
      details: data.details,
      success: false,
    })
  }

  /**
   * 查询审计日志
   */
  static async query(query: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    const allKeys = auditStorage.keys()
    const entries: AuditLogEntry[] = []

    for (const key of allKeys) {
      const entry = auditStorage.get(key)
      if (!entry) continue

      // 过滤条件
      if (query.userId && entry.userId !== query.userId) continue
      if (query.ipAddress && entry.ipAddress !== query.ipAddress) continue
      if (query.resourceType && entry.resourceType !== query.resourceType) continue
      if (query.resourceId && entry.resourceId !== query.resourceId) continue
      if (query.success !== undefined && entry.success !== query.success) continue

      // 事件类型过滤
      if (query.eventType) {
        const eventTypes = Array.isArray(query.eventType) ? query.eventType : [query.eventType]
        if (!eventTypes.includes(entry.eventType)) continue
      }

      // 日志级别过滤
      if (query.level) {
        const levels = Array.isArray(query.level) ? query.level : [query.level]
        if (!levels.includes(entry.level)) continue
      }

      // 时间范围过滤
      if (query.startDate && entry.timestamp < query.startDate) continue
      if (query.endDate && entry.timestamp > query.endDate) continue

      entries.push(entry)
    }

    // 排序
    const sortBy = query.sortBy || 'timestamp'
    const sortOrder = query.sortOrder || 'desc'
    entries.sort((a, b) => {
      const comparison = a[sortBy] > b[sortBy] ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // 分页
    const offset = query.offset || 0
    const limit = query.limit || 100
    return entries.slice(offset, offset + limit)
  }

  /**
   * 获取统计信息
   */
  static async getStats(startDate?: Date, endDate?: Date): Promise<AuditLogStats> {
    const allKeys = auditStorage.keys()
    const entries: AuditLogEntry[] = []

    for (const key of allKeys) {
      const entry = auditStorage.get(key)
      if (!entry) continue

      if (startDate && entry.timestamp < startDate) continue
      if (endDate && entry.timestamp > endDate) continue

      entries.push(entry)
    }

    const totalLogs = entries.length
    const successCount = entries.filter(e => e.success).length
    const failureCount = entries.filter(e => !e.success).length

    // 按事件类型分组
    const byEventType: Record<string, number> = {}
    entries.forEach(e => {
      byEventType[e.eventType] = (byEventType[e.eventType] || 0) + 1
    })

    // 按日志级别分组
    const byLevel: Record<string, number> = {}
    entries.forEach(e => {
      byLevel[e.level] = (byLevel[e.level] || 0) + 1
    })

    // 按用户分组
    const byUser: Record<string, number> = {}
    entries.forEach(e => {
      if (e.username) {
        byUser[e.username] = (byUser[e.username] || 0) + 1
      }
    })

    return {
      totalLogs,
      successCount,
      failureCount,
      byEventType,
      byLevel,
      byUser,
      dateRange: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    }
  }

  /**
   * 清理旧日志
   */
  static async cleanup(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    let cleaned = 0
    const allKeys = auditStorage.keys()

    for (const key of allKeys) {
      const entry = auditStorage.get(key)
      if (!entry) continue

      if (entry.timestamp < cutoffDate) {
        auditStorage.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 生成认证事件消息
   */
  private static getAuthEventMessage(
    eventType: AuditEventType,
    success: boolean,
    username?: string
  ): string {
    const userStr = username ? ` for user ${username}` : ''
    const statusStr = success ? 'Success' : 'Failed'

    switch (eventType) {
      case AuditEventType.LOGIN_SUCCESS:
        return `Login success${userStr}`
      case AuditEventType.LOGIN_FAILED:
        return `Login failed${userStr}`
      case AuditEventType.LOGOUT:
        return `Logout${userStr}`
      default:
        return `${eventType} ${statusStr}${userStr}`
    }
  }

  /**
   * 生成密码重置消息
   */
  private static getPasswordResetMessage(
    eventType: AuditEventType.PASSWORD_RESET_REQUEST | AuditEventType.PASSWORD_RESET_SUCCESS,
    success: boolean
  ): string {
    const action =
      eventType === AuditEventType.PASSWORD_RESET_REQUEST
        ? 'Password reset requested'
        : 'Password reset completed'
    return `${action} - ${success ? 'Success' : 'Failed'}`
  }
}
