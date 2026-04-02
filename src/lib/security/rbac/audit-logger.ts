/**
 * Audit Logger - Enhanced Security Audit Logging
 *
 * 提供完整的审计日志功能：
 * - 记录所有权限变更
 * - 记录敏感操作
 * - 生成审计报告
 * - 支持多种日志存储后端
 *
 * 预期收益：
 * - 完整的审计追踪
 * - 合规性支持（GDPR、SOX、HIPAA 等）
 * - 安全事件快速定位
 */

import { Permission, Role } from '@/lib/permissions/types'
import { logger } from '@/lib/logger'

/**
 * 审计事件类型
 */
export enum AuditEventType {
  // 权限相关
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  PERMISSION_CHECKED = 'permission.checked',
  PERMISSION_DENIED = 'permission.denied',

  // 角色相关
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_UNASSIGNED = 'role.unassigned',
  // 用户相关
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  // 敏感操作
  SENSITIVE_DATA_ACCESSED = 'sensitive.accessed',
  SENSITIVE_DATA_MODIFIED = 'sensitive.modified',
  SENSITIVE_DATA_EXPORTED = 'sensitive.exported',
  // 安全事件
  SECURITY_ALERT = 'security.alert',
  UNAUTHORIZED_ACCESS = 'unauthorized.access',
  BRUTE_FORCE_DETECTED = 'brute_force.detected',
  SUSPICIOUS_ACTIVITY = 'suspicious.activity',

  // 其他
}

/**
 * 审计事件级别
 */
export enum AuditEventLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 审计事件接口
 */
export interface AuditEvent {
  id: string
  timestamp: number
  eventType: AuditEventType
  level: AuditEventLevel
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resourceType?: string
  resourceId?: string
  action?: string
  details?: Record<string, unknown>
  permissions?: Permission[]
  roles?: Role[]
  success: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * 审计报告接口
 */
export interface AuditReport {
  reportId: string
  generatedAt: number
  period: {
    start: number
    end: number
  }
  summary: {
    totalEvents: number
    byType: Map<AuditEventType, number>
    byLevel: Map<AuditEventLevel, number>
    byUser: Map<string, number>
    successRate: number
  }
  events: AuditEvent[]
  sensitiveEvents: AuditEvent[]
  securityEvents: AuditEvent[]
}

/**
 * 审计日志存储接口
 */
export interface AuditLogStorage {
  write(event: AuditEvent): Promise<void>
  read(options: ReadOptions): Promise<AuditEvent[]>
  readById(id: string): Promise<AuditEvent | null>
  delete(id: string): Promise<void>
  deleteBefore(timestamp: number): Promise<void>
}

/**
 * 读取选项
 */
export interface ReadOptions {
  startTime?: number
  endTime?: number
  eventType?: AuditEventType[]
  level?: AuditEventLevel[]
  userId?: string[]
  resourceType?: string[]
  resourceId?: string[]
  limit?: number
  offset?: number
  orderBy?: 'timestamp' | 'level'
  order?: 'asc' | 'desc'
}

/**
 * 内存审计日志存储实现
 */
export class MemoryAuditLogStorage implements AuditLogStorage {
  private events: Map<string, AuditEvent> = new Map()
  private eventsByType: Map<AuditEventType, Set<string>> = new Map()
  private eventsByLevel: Map<AuditEventLevel, Set<string>> = new Map()
  private eventsByUser: Map<string, Set<string>> = new Map()

  async write(event: AuditEvent): Promise<void> {
    this.events.set(event.id, event)

    // 更新索引
    this.updateIndex(this.eventsByType, event.eventType, event.id)
    this.updateIndex(this.eventsByLevel, event.level, event.id)
    if (event.userId) {
      this.updateIndex(this.eventsByUser, event.userId, event.id)
    }
  }

  async read(options: ReadOptions): Promise<AuditEvent[]> {
    let events = Array.from(this.events.values())

    // 过滤
    if (options.startTime) {
      events = events.filter(e => e.timestamp >= options.startTime!)
    }

    if (options.endTime) {
      events = events.filter(e => e.timestamp <= options.endTime!)
    }

    if (options.eventType && options.eventType.length > 0) {
      const typeSet = new Set(options.eventType)
      events = events.filter(e => typeSet.has(e.eventType))
    }

    if (options.level && options.level.length > 0) {
      const levelSet = new Set(options.level)
      events = events.filter(e => levelSet.has(e.level))
    }

    if (options.userId && options.userId.length > 0) {
      const userSet = new Set(options.userId)
      events = events.filter(e => e.userId && userSet.has(e.userId))
    }

    if (options.resourceType && options.resourceType.length > 0) {
      const typeSet = new Set(options.resourceType)
      events = events.filter(e => e.resourceType && typeSet.has(e.resourceType))
    }

    if (options.resourceId && options.resourceId.length > 0) {
      const idSet = new Set(options.resourceId)
      events = events.filter(e => e.resourceId && idSet.has(e.resourceId))
    }

    // 排序
    const orderBy = options.orderBy ?? 'timestamp'
    const order = options.order ?? 'desc'

    events.sort((a, b) => {
      let comparison = 0

      if (orderBy === 'timestamp') {
        comparison = a.timestamp - b.timestamp
      } else if (orderBy === 'level') {
        const levelOrder = ['debug', 'info', 'warn', 'error', 'critical']
        comparison = levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
      }

      return order === 'asc' ? comparison : -comparison
    })

    // 分页
    if (options.offset) {
      events = events.slice(options.offset)
    }

    if (options.limit) {
      events = events.slice(0, options.limit)
    }

    return events
  }

  async readById(id: string): Promise<AuditEvent | null> {
    return this.events.get(id) ?? null
  }

  async delete(id: string): Promise<void> {
    const event = this.events.get(id)
    if (!event) return

    this.events.delete(id)
    this.deleteFromIndex(this.eventsByType, event.eventType, id)
    this.deleteFromIndex(this.eventsByLevel, event.level, id)
    if (event.userId) {
      this.deleteFromIndex(this.eventsByUser, event.userId, id)
    }
  }

  async deleteBefore(timestamp: number): Promise<void> {
    const toDelete: string[] = []

    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < timestamp) {
        toDelete.push(id)
      }
    }

    for (const id of toDelete) {
      await this.delete(id)
    }
  }

  private updateIndex<T>(index: Map<T, Set<string>>, key: T, value: string): void {
    const set = index.get(key) ?? new Set()
    set.add(value)
    index.set(key, set)
  }

  private deleteFromIndex<T>(index: Map<T, Set<string>>, key: T, value: string): void {
    const set = index.get(key)
    if (set) {
      set.delete(value)
      if (set.size === 0) {
        index.delete(key)
      }
    }
  }
}

/**
 * 审计日志类
 */
export class AuditLogger {
  private storage: AuditLogStorage
  private isEnabled: boolean

  constructor(storage?: AuditLogStorage, enabled: boolean = true) {
    this.storage = storage ?? new MemoryAuditLogStorage()
    this.isEnabled = enabled
  }

  /**
   * 生成事件 ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 记录审计事件
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    if (!this.isEnabled) {
      // 创建一个最小的事件对象用于返回
      return {
        id: this.generateEventId(),
        timestamp: Date.now(),
        ...event,
      } as AuditEvent
    }

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event,
    }

    await this.storage.write(auditEvent)

    // 根据事件级别记录到日志
    switch (auditEvent.level) {
      case AuditEventLevel.DEBUG:
        logger.debug('[AuditLogger]', auditEvent as unknown as Record<string, unknown>)
        break
      case AuditEventLevel.INFO:
        logger.info('[AuditLogger]', auditEvent as unknown as Record<string, unknown>)
        break
      case AuditEventLevel.WARN:
        logger.warn('[AuditLogger]', auditEvent as unknown as Record<string, unknown>)
        break
      case AuditEventLevel.ERROR:
        logger.error('[AuditLogger]', auditEvent as unknown as Record<string, unknown>)
        break
      case AuditEventLevel.CRITICAL:
        logger.error('[AuditLogger] CRITICAL', auditEvent as unknown as Record<string, unknown>)
        break
    }

    return auditEvent
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    action: 'granted' | 'revoked',
    userId: string,
    permission: Permission,
    context?: {
      grantedBy?: string
      reason?: string
      expiresAt?: number
    }
  ): Promise<AuditEvent> {
    return this.log({
      eventType:
        action === 'granted'
          ? AuditEventType.PERMISSION_GRANTED
          : AuditEventType.PERMISSION_REVOKED,
      level: AuditEventLevel.INFO,
      userId,
      permissions: [permission],
      success: true,
      details: {
        action,
        permission,
        ...context,
      },
    })
  }

  /**
   * 记录角色分配
   */
  async logRoleAssignment(
    action: 'assigned' | 'unassigned',
    userId: string,
    role: Role,
    context?: {
      assignedBy?: string
      reason?: string
      expiresAt?: number
    }
  ): Promise<AuditEvent> {
    return this.log({
      eventType:
        action === 'assigned' ? AuditEventType.ROLE_ASSIGNED : AuditEventType.ROLE_UNASSIGNED,
      level: AuditEventLevel.INFO,
      userId,
      roles: [role],
      success: true,
      details: {
        action,
        role,
        ...context,
      },
    })
  }

  /**
   * 记录权限检查
   */
  async logPermissionCheck(
    userId: string,
    permission: Permission,
    allowed: boolean,
    context?: {
      resourceType?: string
      resourceId?: string
    }
  ): Promise<AuditEvent> {
    return this.log({
      eventType: allowed ? AuditEventType.PERMISSION_CHECKED : AuditEventType.PERMISSION_DENIED,
      level: allowed ? AuditEventLevel.DEBUG : AuditEventLevel.WARN,
      userId,
      permissions: [permission],
      success: allowed,
      details: {
        permission,
        allowed,
        ...context,
      },
    })
  }

  /**
   * 记录敏感操作
   */
  async logSensitiveOperation(
    userId: string,
    operation: string,
    resourceType: string,
    resourceId: string,
    context?: {
      before?: unknown
      after?: unknown
      reason?: string
    }
  ): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.SENSITIVE_DATA_MODIFIED,
      level: AuditEventLevel.WARN,
      userId,
      resourceType,
      resourceId,
      action: operation,
      success: true,
      details: {
        operation,
        resource: `${resourceType}:${resourceId}`,
        ...context,
      },
    })
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    level: AuditEventLevel,
    userId?: string,
    context?: Record<string, unknown>
  ): Promise<AuditEvent> {
    return this.log({
      eventType,
      level,
      userId,
      success: false,
      details: context,
    })
  }

  /**
   * 读取审计日志
   */
  async readAuditLogs(options: ReadOptions): Promise<AuditEvent[]> {
    return this.storage.read(options)
  }

  /**
   * 按用户读取审计日志
   */
  async readAuditLogsByUser(
    userId: string,
    options?: Omit<ReadOptions, 'userId'>
  ): Promise<AuditEvent[]> {
    return this.storage.read({ userId: [userId], ...options })
  }

  /**
   * 读取敏感操作日志
   */
  async readSensitiveLogs(options?: ReadOptions): Promise<AuditEvent[]> {
    const sensitiveTypes = [
      AuditEventType.SENSITIVE_DATA_ACCESSED,
      AuditEventType.SENSITIVE_DATA_MODIFIED,
      AuditEventType.SENSITIVE_DATA_EXPORTED,
    ]
    return this.storage.read({ eventType: sensitiveTypes, ...options })
  }

  /**
   * 读取安全事件日志
   */
  async readSecurityLogs(options?: ReadOptions): Promise<AuditEvent[]> {
    const securityTypes = [
      AuditEventType.SECURITY_ALERT,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.BRUTE_FORCE_DETECTED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
    ]
    return this.storage.read({ eventType: securityTypes, ...options })
  }

  /**
   * 生成审计报告
   */
  async generateAuditReport(
    startTime: number,
    endTime: number,
    options?: {
      includeSensitive?: boolean
      includeSecurity?: boolean
      userId?: string
    }
  ): Promise<AuditReport> {
    const allEvents = await this.storage.read({
      startTime,
      endTime,
      userId: options?.userId ? [options.userId] : undefined,
      orderBy: 'timestamp',
      order: 'desc',
    })

    // 统计
    const byType = new Map<AuditEventType, number>()
    const byLevel = new Map<AuditEventLevel, number>()
    const byUser = new Map<string, number>()
    let successCount = 0

    for (const event of allEvents) {
      byType.set(event.eventType, (byType.get(event.eventType) ?? 0) + 1)
      byLevel.set(event.level, (byLevel.get(event.level) ?? 0) + 1)
      if (event.userId) {
        byUser.set(event.userId, (byUser.get(event.userId) ?? 0) + 1)
      }
      if (event.success) {
        successCount++
      }
    }

    const report: AuditReport = {
      reportId: `report_${Date.now()}`,
      generatedAt: Date.now(),
      period: {
        start: startTime,
        end: endTime,
      },
      summary: {
        totalEvents: allEvents.length,
        byType,
        byLevel,
        byUser,
        successRate: allEvents.length > 0 ? successCount / allEvents.length : 1,
      },
      events: allEvents,
      sensitiveEvents: options?.includeSensitive
        ? allEvents.filter(e =>
            [
              AuditEventType.SENSITIVE_DATA_ACCESSED,
              AuditEventType.SENSITIVE_DATA_MODIFIED,
              AuditEventType.SENSITIVE_DATA_EXPORTED,
            ].includes(e.eventType)
          )
        : [],
      securityEvents: options?.includeSecurity
        ? allEvents.filter(e =>
            [
              AuditEventType.SECURITY_ALERT,
              AuditEventType.UNAUTHORIZED_ACCESS,
              AuditEventType.BRUTE_FORCE_DETECTED,
              AuditEventType.SUSPICIOUS_ACTIVITY,
            ].includes(e.eventType)
          )
        : [],
    }

    return report
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000

    const oldEvents = await this.storage.read({
      endTime: cutoffTime,
    })

    for (const event of oldEvents) {
      await this.storage.delete(event.id)
    }

    return oldEvents.length
  }

  /**
   * 启用/禁用审计日志
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * 检查是否启用
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled
  }
}

/**
 * 创建默认的审计日志实例
 */
export const auditLogger = new AuditLogger()

/**
 * 便捷函数：记录权限变更
 */
export async function logPermissionChange(
  action: 'granted' | 'revoked',
  userId: string,
  permission: Permission,
  context?: {
    grantedBy?: string
    reason?: string
    expiresAt?: number
  }
): Promise<AuditEvent> {
  return auditLogger.logPermissionChange(action, userId, permission, context)
}

/**
 * 便捷函数：记录角色分配
 */
export async function logRoleAssignment(
  action: 'assigned' | 'unassigned',
  userId: string,
  role: Role,
  context?: {
    assignedBy?: string
    reason?: string
    expiresAt?: number
  }
): Promise<AuditEvent> {
  return auditLogger.logRoleAssignment(action, userId, role, context)
}

/**
 * 便捷函数：记录权限检查
 */
export async function logPermissionCheck(
  userId: string,
  permission: Permission,
  allowed: boolean,
  context?: {
    resourceType?: string
    resourceId?: string
  }
): Promise<AuditEvent> {
  return auditLogger.logPermissionCheck(userId, permission, allowed, context)
}

/**
 * 便捷函数：记录敏感操作
 */
export async function logSensitiveOperation(
  userId: string,
  operation: string,
  resourceType: string,
  resourceId: string,
  context?: {
    before?: unknown
    after?: unknown
    reason?: string
  }
): Promise<AuditEvent> {
  return auditLogger.logSensitiveOperation(userId, operation, resourceType, resourceId, context)
}

/**
 * 便捷函数：记录安全事件
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  level: AuditEventLevel,
  userId?: string,
  context?: Record<string, unknown>
): Promise<AuditEvent> {
  return auditLogger.logSecurityEvent(eventType, level, userId, context)
}

/**
 * 便捷函数：生成审计报告
 */
export async function generateAuditReport(
  startTime: number,
  endTime: number,
  options?: {
    includeSensitive?: boolean
    includeSecurity?: boolean
    userId?: string
  }
): Promise<AuditReport> {
  return auditLogger.generateAuditReport(startTime, endTime, options)
}

/**
 * 便捷函数：读取审计日志
 */
export async function readAuditLogs(options: ReadOptions): Promise<AuditEvent[]> {
  return auditLogger.readAuditLogs(options)
}

/**
 * 便捷函数：读取敏感操作日志
 */
export async function readSensitiveLogs(options?: ReadOptions): Promise<AuditEvent[]> {
  return auditLogger.readSensitiveLogs(options)
}

/**
 * 便捷函数：读取安全事件日志
 */
export async function readSecurityLogs(options?: ReadOptions): Promise<AuditEvent[]> {
  return auditLogger.readSecurityLogs(options)
}
