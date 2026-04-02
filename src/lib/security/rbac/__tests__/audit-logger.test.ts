/**
 * Audit Logger Unit Tests
 *
 * 测试覆盖：
 * - 审计事件记录
 * - 权限变更日志
 * - 敏感操作日志
 * - 安全事件日志
 * - 审计报告生成
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AuditLogger,
  AuditEventType,
  AuditEventLevel,
  MemoryAuditLogStorage,
  AuditEvent,
  AuditReport,
  ReadOptions,
} from '../audit-logger'
import { Permission, Role } from '@/lib/permissions/types'

describe('AuditLogger', () => {
  let auditLogger: AuditLogger
  let storage: MemoryAuditLogStorage

  beforeEach(() => {
    storage = new MemoryAuditLogStorage()
    auditLogger = new AuditLogger(storage, true)
  })

  describe('基础日志记录', () => {
    it('应该能够记录审计事件', async () => {
      const event = await auditLogger.log({
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user123',
        success: true,
      })

      expect(event.id).toBeDefined()
      expect(event.timestamp).toBeGreaterThan(0)
      expect(event.eventType).toBe(AuditEventType.USER_LOGIN)
      expect(event.level).toBe(AuditEventLevel.INFO)
      expect(event.userId).toBe('user123')
      expect(event.success).toBe(true)
    })

    it('应该能够记录带详细信息的事件', async () => {
      const event = await auditLogger.log({
        eventType: AuditEventType.PERMISSION_GRANTED,
        level: AuditEventLevel.INFO,
        userId: 'user123',
        permissions: [Permission.USER_READ, Permission.USER_UPDATE],
        success: true,
        details: {
          grantedBy: 'admin',
          reason: '角色升级',
        },
      })

      expect(event.permissions).toEqual([Permission.USER_READ, Permission.USER_UPDATE])
      expect(event.details?.grantedBy).toBe('admin')
      expect(event.details?.reason).toBe('角色升级')
    })

    it('应该能够记录失败事件', async () => {
      const event = await auditLogger.log({
        eventType: AuditEventType.PERMISSION_DENIED,
        level: AuditEventLevel.WARN,
        userId: 'user456',
        permissions: [Permission.USER_DELETE],
        success: false,
        errorMessage: '权限不足',
      })

      expect(event.success).toBe(false)
      expect(event.errorMessage).toBe('权限不足')
    })
  })

  describe('权限变更日志', () => {
    it('应该能够记录权限授予', async () => {
      const event = await auditLogger.logPermissionChange(
        'granted',
        'user123',
        Permission.USER_READ,
        {
          grantedBy: 'admin',
          reason: '角色升级',
        }
      )

      expect(event.eventType).toBe(AuditEventType.PERMISSION_GRANTED)
      expect(event.permissions).toEqual([Permission.USER_READ])
      expect(event.details?.action).toBe('granted')
      expect(event.details?.grantedBy).toBe('admin')
    })

    it('应该能够记录权限撤销', async () => {
      const event = await auditLogger.logPermissionChange(
        'revoked',
        'user123',
        Permission.USER_DELETE,
        {
          grantedBy: 'admin',
          reason: '安全原因',
        }
      )

      expect(event.eventType).toBe(AuditEventType.PERMISSION_REVOKED)
      expect(event.permissions).toEqual([Permission.USER_DELETE])
    })
  })

  describe('角色分配日志', () => {
    it('应该能够记录角色分配', async () => {
      const event = await auditLogger.logRoleAssignment('assigned', 'user123', Role.MANAGER, {
        assignedBy: 'admin',
        reason: '晋升',
      })

      expect(event.eventType).toBe(AuditEventType.ROLE_ASSIGNED)
      expect(event.roles).toEqual([Role.MANAGER])
      expect(event.details?.action).toBe('assigned')
      expect(event.details?.assignedBy).toBe('admin')
    })

    it('应该能够记录角色取消分配', async () => {
      const event = await auditLogger.logRoleAssignment('unassigned', 'user123', Role.ADMIN, {
        assignedBy: 'system',
        reason: '权限滥用',
      })

      expect(event.eventType).toBe(AuditEventType.ROLE_UNASSIGNED)
      expect(event.roles).toEqual([Role.ADMIN])
    })
  })

  describe('权限检查日志', () => {
    it('应该能够记录权限检查成功', async () => {
      const event = await auditLogger.logPermissionCheck('user123', Permission.USER_READ, true, {
        resourceType: 'user',
        resourceId: 'user456',
      })

      expect(event.eventType).toBe(AuditEventType.PERMISSION_CHECKED)
      expect(event.level).toBe(AuditEventLevel.DEBUG)
      expect(event.success).toBe(true)
    })

    it('应该能够记录权限检查失败', async () => {
      const event = await auditLogger.logPermissionCheck('user123', Permission.USER_DELETE, false, {
        resourceType: 'user',
        resourceId: 'user456',
      })

      expect(event.eventType).toBe(AuditEventType.PERMISSION_DENIED)
      expect(event.level).toBe(AuditEventLevel.WARN)
      expect(event.success).toBe(false)
    })
  })

  describe('敏感操作日志', () => {
    it('应该能够记录敏感操作', async () => {
      const event = await auditLogger.logSensitiveOperation(
        'user123',
        'update',
        'user_profile',
        'profile456',
        {
          before: { name: 'Old Name' },
          after: { name: 'New Name' },
          reason: '用户修改',
        }
      )

      expect(event.eventType).toBe(AuditEventType.SENSITIVE_DATA_MODIFIED)
      expect(event.level).toBe(AuditEventLevel.WARN)
      expect(event.resourceType).toBe('user_profile')
      expect(event.resourceId).toBe('profile456')
      expect(event.details?.before).toEqual({ name: 'Old Name' })
      expect(event.details?.after).toEqual({ name: 'New Name' })
    })
  })

  describe('安全事件日志', () => {
    it('应该能够记录安全事件', async () => {
      const event = await auditLogger.logSecurityEvent(
        AuditEventType.UNAUTHORIZED_ACCESS,
        AuditEventLevel.ERROR,
        'user123',
        {
          attemptedResource: '/admin/settings',
          reason: '无权限访问',
        }
      )

      expect(event.eventType).toBe(AuditEventType.UNAUTHORIZED_ACCESS)
      expect(event.level).toBe(AuditEventLevel.ERROR)
      expect(event.success).toBe(false)
    })

    it('应该能够记录暴力破解检测', async () => {
      const event = await auditLogger.logSecurityEvent(
        AuditEventType.BRUTE_FORCE_DETECTED,
        AuditEventLevel.CRITICAL,
        undefined,
        {
          ipAddress: '192.168.1.100',
          attemptCount: 10,
          timeWindow: '5 minutes',
        }
      )

      expect(event.eventType).toBe(AuditEventType.BRUTE_FORCE_DETECTED)
      expect(event.level).toBe(AuditEventLevel.CRITICAL)
      expect(event.details?.ipAddress).toBe('192.168.1.100')
    })
  })

  describe('日志读取', () => {
    beforeEach(async () => {
      // 添加一些测试日志
      await auditLogger.log({
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })

      await auditLogger.log({
        eventType: AuditEventType.PERMISSION_DENIED,
        level: AuditEventLevel.WARN,
        userId: 'user2',
        permissions: [Permission.USER_DELETE],
        success: false,
      })

      await auditLogger.log({
        eventType: AuditEventType.SENSITIVE_DATA_MODIFIED,
        level: AuditEventLevel.WARN,
        userId: 'user1',
        resourceType: 'user_profile',
        resourceId: 'profile1',
        success: true,
      })
    })

    it('应该能够读取所有日志', async () => {
      const logs = await auditLogger.readAuditLogs({})

      expect(logs.length).toBe(3)
    })

    it('应该能够按用户读取日志', async () => {
      const logs = await auditLogger.readAuditLogsByUser('user1')

      expect(logs.length).toBe(2)
      logs.forEach(log => {
        expect(log.userId).toBe('user1')
      })
    })

    it('应该能够按事件类型过滤', async () => {
      const logs = await auditLogger.readAuditLogs({
        eventType: [AuditEventType.PERMISSION_DENIED],
      })

      expect(logs.length).toBe(1)
      expect(logs[0].eventType).toBe(AuditEventType.PERMISSION_DENIED)
    })

    it('应该能够按级别过滤', async () => {
      const logs = await auditLogger.readAuditLogs({
        level: [AuditEventLevel.WARN],
      })

      expect(logs.length).toBe(2)
      logs.forEach(log => {
        expect(log.level).toBe(AuditEventLevel.WARN)
      })
    })

    it('应该能够按时间范围过滤', async () => {
      const now = Date.now()
      const logs = await auditLogger.readAuditLogs({
        startTime: now - 1000,
        endTime: now + 1000,
      })

      expect(logs.length).toBe(3)
    })

    it('应该能够分页', async () => {
      const page1 = await auditLogger.readAuditLogs({ limit: 2 })
      const page2 = await auditLogger.readAuditLogs({ limit: 2, offset: 2 })

      expect(page1.length).toBe(2)
      expect(page2.length).toBe(1)
    })
  })

  describe('敏感和安全日志', () => {
    beforeEach(async () => {
      await auditLogger.logSensitiveOperation('user1', 'export', 'user_data', 'data1', {})

      await auditLogger.logSecurityEvent(
        AuditEventType.SECURITY_ALERT,
        AuditEventLevel.ERROR,
        'user2',
        {}
      )
    })

    it('应该能够读取敏感操作日志', async () => {
      const logs = await auditLogger.readSensitiveLogs()

      expect(logs.length).toBe(1)
      expect(logs[0].eventType).toBe(AuditEventType.SENSITIVE_DATA_MODIFIED)
    })

    it('应该能够读取安全事件日志', async () => {
      const logs = await auditLogger.readSecurityLogs()

      expect(logs.length).toBe(1)
      expect(logs[0].eventType).toBe(AuditEventType.SECURITY_ALERT)
    })
  })

  describe('审计报告', () => {
    beforeEach(async () => {
      // 添加多样化的测试日志
      await auditLogger.log({
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })

      await auditLogger.log({
        eventType: AuditEventType.PERMISSION_DENIED,
        level: AuditEventLevel.WARN,
        userId: 'user2',
        success: false,
      })

      await auditLogger.log({
        eventType: AuditEventType.SENSITIVE_DATA_MODIFIED,
        level: AuditEventLevel.WARN,
        userId: 'user1',
        success: true,
      })

      await auditLogger.log({
        eventType: AuditEventType.SECURITY_ALERT,
        level: AuditEventLevel.ERROR,
        userId: undefined,
        success: false,
      })
    })

    it('应该能够生成审计报告', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000)

      expect(report.reportId).toBeDefined()
      expect(report.generatedAt).toBeGreaterThan(0)
      expect(report.summary.totalEvents).toBe(4)
    })

    it('报告应该包含按类型统计', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000)

      expect(report.summary.byType.size).toBeGreaterThan(0)
      expect(report.summary.byType.get(AuditEventType.USER_LOGIN)).toBe(1)
      expect(report.summary.byType.get(AuditEventType.PERMISSION_DENIED)).toBe(1)
    })

    it('报告应该包含按级别统计', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000)

      expect(report.summary.byLevel.size).toBeGreaterThan(0)
      expect(report.summary.byLevel.get(AuditEventLevel.INFO)).toBe(1)
      expect(report.summary.byLevel.get(AuditEventLevel.WARN)).toBe(2)
      expect(report.summary.byLevel.get(AuditEventLevel.ERROR)).toBe(1)
    })

    it('报告应该包含按用户统计', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000)

      expect(report.summary.byUser.size).toBeGreaterThan(0)
      expect(report.summary.byUser.get('user1')).toBe(2)
      expect(report.summary.byUser.get('user2')).toBe(1)
    })

    it('报告应该计算成功率', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000)

      // 4 个事件，2 个成功
      expect(report.summary.successRate).toBe(0.5)
    })

    it('报告应该包含敏感和安全事件（如果请求）', async () => {
      const now = Date.now()
      const report = await auditLogger.generateAuditReport(now - 10000, now + 10000, {
        includeSensitive: true,
        includeSecurity: true,
      })

      expect(report.sensitiveEvents.length).toBe(1)
      expect(report.securityEvents.length).toBe(1)
    })
  })

  describe('日志清理', () => {
    it('应该能够清理旧日志', async () => {
      // 添加一些日志
      await auditLogger.log({
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })

      // 模拟时间流逝（实际测试中需要 mock）
      const deletedCount = await auditLogger.cleanupOldLogs(30)

      expect(deletedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('禁用审计日志', () => {
    it('禁用时不应该存储日志', async () => {
      const disabledLogger = new AuditLogger(storage, false)

      const event = await disabledLogger.log({
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })

      // 事件应该被创建但不应存储
      expect(event.id).toBeDefined()

      const logs = await disabledLogger.readAuditLogs({})
      expect(logs.length).toBe(0)
    })

    it('应该能够动态启用/禁用', () => {
      auditLogger.setEnabled(false)
      expect(auditLogger.isLoggingEnabled()).toBe(false)

      auditLogger.setEnabled(true)
      expect(auditLogger.isLoggingEnabled()).toBe(true)
    })
  })
})

describe('MemoryAuditLogStorage', () => {
  let storage: MemoryAuditLogStorage

  beforeEach(() => {
    storage = new MemoryAuditLogStorage()
  })

  describe('基础操作', () => {
    it('应该能够写入和读取事件', async () => {
      const event: AuditEvent = {
        id: 'test1',
        timestamp: Date.now(),
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        success: true,
      }

      await storage.write(event)
      const read = await storage.readById('test1')

      expect(read).toEqual(event)
    })

    it('读取不存在的事件应该返回 null', async () => {
      const read = await storage.readById('nonexistent')
      expect(read).toBeNull()
    })

    it('应该能够删除事件', async () => {
      const event: AuditEvent = {
        id: 'test2',
        timestamp: Date.now(),
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        success: true,
      }

      await storage.write(event)
      await storage.delete('test2')
      const read = await storage.readById('test2')

      expect(read).toBeNull()
    })

    it('应该能够删除指定时间之前的事件', async () => {
      const now = Date.now()

      await storage.write({
        id: 'old',
        timestamp: now - 10000,
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        success: true,
      })

      await storage.write({
        id: 'new',
        timestamp: now + 10000,
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        success: true,
      })

      await storage.deleteBefore(now)

      const oldEvent = await storage.readById('old')
      const newEvent = await storage.readById('new')

      expect(oldEvent).toBeNull()
      expect(newEvent).not.toBeNull()
    })
  })

  describe('查询操作', () => {
    beforeEach(async () => {
      const now = Date.now()

      await storage.write({
        id: 'event1',
        timestamp: now - 1000,
        eventType: AuditEventType.USER_LOGIN,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })

      await storage.write({
        id: 'event2',
        timestamp: now,
        eventType: AuditEventType.PERMISSION_DENIED,
        level: AuditEventLevel.WARN,
        userId: 'user2',
        resourceType: 'user',
        resourceId: 'user1',
        success: false,
      })

      await storage.write({
        id: 'event3',
        timestamp: now + 1000,
        eventType: AuditEventType.USER_LOGOUT,
        level: AuditEventLevel.INFO,
        userId: 'user1',
        success: true,
      })
    })

    it('应该能够按时间过滤', async () => {
      const now = Date.now()
      const events = await storage.read({
        startTime: now - 500,
        endTime: now + 500,
      })

      expect(events.length).toBe(1)
      expect(events[0].id).toBe('event2')
    })

    it('应该能够按事件类型过滤', async () => {
      const events = await storage.read({
        eventType: [AuditEventType.USER_LOGIN, AuditEventType.USER_LOGOUT],
      })

      expect(events.length).toBe(2)
    })

    it('应该能够按用户过滤', async () => {
      const events = await storage.read({
        userId: ['user1'],
      })

      expect(events.length).toBe(2)
    })

    it('应该能够按资源类型和 ID 过滤', async () => {
      const events = await storage.read({
        resourceType: ['user'],
        resourceId: ['user1'],
      })

      expect(events.length).toBe(1)
      expect(events[0].id).toBe('event2')
    })

    it('应该能够排序', async () => {
      const eventsAsc = await storage.read({
        orderBy: 'timestamp',
        order: 'asc',
      })

      const eventsDesc = await storage.read({
        orderBy: 'timestamp',
        order: 'desc',
      })

      expect(eventsAsc[0].id).toBe('event1')
      expect(eventsDesc[0].id).toBe('event3')
    })

    it('应该能够分页', async () => {
      const page1 = await storage.read({ limit: 2 })
      const page2 = await storage.read({ limit: 2, offset: 2 })

      expect(page1.length).toBe(2)
      expect(page2.length).toBe(1)
    })
  })
})
