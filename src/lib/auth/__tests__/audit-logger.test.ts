/**
 * Audit Logger Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  logAuditEvent,
  queryAuditLogs,
  getAuditStats,
  detectSuspiciousActivity,
  exportAuditLogs,
  AuditEventType,
  AuditSeverity,
  initializeAuditLogTable,
} from '../audit-logger'

describe('Audit Logger Service', () => {
  const testUserId = 'user_audit_test'
  const testAgentId = 'agent_audit_test'
  const testIpAddress = '10.0.0.1'
  const testUserAgent = 'TestAgent/1.0'

  beforeEach(async () => {
    await initializeAuditLogTable()
  })

  describe('logAuditEvent', () => {
    it('should log a successful login event', async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        result: 'success',
        details: { email: 'test@example.com' },
      })

      expect(result).toBeDefined()
      expect(result.eventType).toBe(AuditEventType.LOGIN_SUCCESS)
      expect(result.userId).toBe(testUserId)
      expect(result.ipAddress).toBe(testIpAddress)
      expect(result.result).toBe('success')
    })

    it('should log a failed login event with warning severity', async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILURE,
        severity: AuditSeverity.WARNING,
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
        result: 'failure',
        details: { reason: 'Invalid password' },
      })

      expect(result.severity).toBe(AuditSeverity.WARNING)
      expect(result.result).toBe('failure')
    })

    it('should log agent authentication event', async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.AGENT_AUTHENTICATED,
        agentId: testAgentId,
        ipAddress: testIpAddress,
        result: 'success',
      })

      expect(result.agentId).toBe(testAgentId)
      expect(result.eventType).toBe(AuditEventType.AGENT_AUTHENTICATED)
    })

    it('should log permission denied event', async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: testUserId,
        resource: '/api/admin',
        action: 'GET',
        result: 'failure',
        severity: AuditSeverity.WARNING,
      })

      expect(result.eventType).toBe(AuditEventType.PERMISSION_DENIED)
      expect(result.resource).toBe('/api/admin')
      expect(result.action).toBe('GET')
    })

    it('should handle all event types', async () => {
      const eventTypes = [
        AuditEventType.LOGIN_SUCCESS,
        AuditEventType.LOGIN_FAILURE,
        AuditEventType.LOGOUT,
        AuditEventType.TOKEN_REFRESH,
        AuditEventType.REGISTRATION_SUCCESS,
        AuditEventType.PASSWORD_CHANGE,
        AuditEventType.PERMISSION_GRANTED,
        AuditEventType.PERMISSION_DENIED,
        AuditEventType.AGENT_REGISTERED,
        AuditEventType.AGENT_AUTHENTICATED,
        AuditEventType.SUSPICIOUS_ACTIVITY,
      ]

      for (const eventType of eventTypes) {
        const result = await logAuditEvent({
          eventType,
          userId: testUserId,
          result: 'success',
        })
        expect(result.eventType).toBe(eventType)
      }
    })
  })

  describe('queryAuditLogs', () => {
    beforeEach(async () => {
      // Log some test events
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        result: 'success',
      })

      await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILURE,
        userId: testUserId,
        result: 'failure',
      })

      await logAuditEvent({
        eventType: AuditEventType.AGENT_AUTHENTICATED,
        agentId: testAgentId,
        result: 'success',
      })
    })

    it('should query logs by user ID', async () => {
      const logs = await queryAuditLogs({ userId: testUserId })
      expect(logs.length).toBeGreaterThanOrEqual(2)
      expect(logs.every(l => l.userId === testUserId)).toBe(true)
    })

    it('should query logs by agent ID', async () => {
      const logs = await queryAuditLogs({ agentId: testAgentId })
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs.every(l => l.agentId === testAgentId)).toBe(true)
    })

    it('should query logs by event type', async () => {
      const logs = await queryAuditLogs({
        eventTypes: [AuditEventType.LOGIN_SUCCESS],
      })
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs.every(l => l.eventType === AuditEventType.LOGIN_SUCCESS)).toBe(true)
    })

    it('should query logs by result', async () => {
      const logs = await queryAuditLogs({ result: 'failure' })
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs.every(l => l.result === 'failure')).toBe(true)
    })

    it('should support pagination', async () => {
      const logs1 = await queryAuditLogs({ limit: 2, offset: 0 })
      const logs2 = await queryAuditLogs({ limit: 2, offset: 2 })

      expect(logs1.length).toBeLessThanOrEqual(2)
      expect(logs2.length).toBeLessThanOrEqual(2)
      expect(logs1[0]?.id).not.toBe(logs2[0]?.id)
    })

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const endDate = new Date(Date.now() + 60 * 1000) // 1 minute in future

      const logs = await queryAuditLogs({
        startDate,
        endDate,
      })

      logs.forEach(log => {
        expect(log.timestamp >= startDate).toBe(true)
        expect(log.timestamp <= endDate).toBe(true)
      })
    })
  })

  describe('getAuditStats', () => {
    beforeEach(async () => {
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        result: 'success',
      })

      await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILURE,
        userId: testUserId,
        result: 'failure',
        severity: AuditSeverity.WARNING,
      })
    })

    it('should return audit statistics', async () => {
      const stats = await getAuditStats()

      expect(stats).toHaveProperty('totalEvents')
      expect(stats).toHaveProperty('byType')
      expect(stats).toHaveProperty('bySeverity')
      expect(stats).toHaveProperty('successRate')
      expect(stats).toHaveProperty('topFailedEvents')

      expect(stats.totalEvents).toBeGreaterThanOrEqual(2)
      expect(stats.successRate).toBeGreaterThanOrEqual(0)
      expect(stats.successRate).toBeLessThanOrEqual(1)
    })

    it('should filter statistics by user', async () => {
      const stats = await getAuditStats({ userId: testUserId })
      expect(stats.totalEvents).toBeGreaterThanOrEqual(2)
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect multiple failed logins', async () => {
      // Log multiple failed logins
      for (let i = 0; i < 6; i++) {
        await logAuditEvent({
          eventType: AuditEventType.LOGIN_FAILURE,
          userId: testUserId,
          ipAddress: testIpAddress,
          result: 'failure',
        })
      }

      const detection = await detectSuspiciousActivity({
        userId: testUserId,
        ipAddress: testIpAddress,
        timeWindowHours: 24,
      })

      expect(detection.riskScore).toBeGreaterThan(0)
      expect(detection.flags.length).toBeGreaterThan(0)
    })

    it('should return low risk for normal activity', async () => {
      // Log normal activity
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        result: 'success',
      })

      const detection = await detectSuspiciousActivity({
        userId: testUserId,
        timeWindowHours: 24,
      })

      expect(detection.riskScore).toBeLessThan(50)
    })
  })

  describe('exportAuditLogs', () => {
    it('should export logs as JSON', async () => {
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        result: 'success',
      })

      const exported = await exportAuditLogs({ format: 'json' })
      expect(typeof exported).toBe('string')

      const parsed = JSON.parse(exported)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should export logs as CSV', async () => {
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: testUserId,
        result: 'success',
      })

      const exported = await exportAuditLogs({ format: 'csv' })
      expect(typeof exported).toBe('string')
      expect(exported).toContain('id,eventType,severity')
    })
  })
})
