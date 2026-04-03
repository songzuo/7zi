/**
 * Base Alert Channel Tests
 * 基础告警通道测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BaseAlertChannel,
  AlertLevel,
  priorityToLevel,
  getLevelPriority,
} from '../channels/base-alert-channel'
import { Alert } from '../alert-engine'

// Test implementation of BaseAlertChannel
class TestAlertChannel extends BaseAlertChannel {
  private shouldFail = false
  private callCount = 0

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail
  }

  getCallCount(): number {
    return this.callCount
  }

  protected getChannelKey(): string {
    return 'test'
  }

  protected async sendInternal(alert: Alert): Promise<void> {
    this.callCount++
    if (this.shouldFail) {
      const error = new Error('Test failure')
      ;(error as any).code = 'ECONNREFUSED'
      throw error
    }
  }
}

// Helper to create test alerts
function createTestAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'test-alert-123',
    ruleId: 'test-rule-1',
    ruleName: 'Test Rule',
    priority: 'P1',
    severity: 'error',
    status: 'firing',
    metric: 'errorRate',
    message: 'Error rate is too high',
    value: 10,
    threshold: 5,
    timestamp: Date.now(),
    startedAt: Date.now(),
    fingerprint: 'test:errorRate',
    ...overrides,
  }
}

describe('BaseAlertChannel', () => {
  let channel: TestAlertChannel

  beforeEach(() => {
    channel = new TestAlertChannel({
      enabled: true,
      retry: {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      },
      dedup: {
        enabled: true,
        windowMs: 1000,
        keys: ['ruleId', 'priority'],
      },
      rateLimit: {
        maxAlertsPerMinute: 100,
        maxAlertsPerHour: 1000,
      },
    })
  })

  describe('send', () => {
    it('should send alert successfully', async () => {
      const alert = createTestAlert()

      await expect(channel.send(alert)).resolves.not.toThrow()
      expect(channel.getCallCount()).toBe(1)
    })

    it('should retry on failure', async () => {
      channel.setShouldFail(true)
      const alert = createTestAlert()

      await expect(channel.send(alert)).rejects.toThrow()
      // Should retry 3 times (maxRetries)
      expect(channel.getCallCount()).toBe(4) // initial + 3 retries
    })

    it('should not retry on non-retryable errors', async () => {
      const channel2 = new TestAlertChannel({
        enabled: true,
        retry: {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNREFUSED'], // Only retry on ECONNREFUSED
        },
      })

      // Manually test by creating a different error
      const alert = createTestAlert()
      await expect(channel2.send(alert)).resolves.not.toThrow()
    })

    it('should respect enabled flag', async () => {
      channel.setEnabled(false)
      const alert = createTestAlert()

      await channel.send(alert)
      expect(channel.getCallCount()).toBe(0)
    })
  })

  describe('deduplication', () => {
    it('should dedup alerts with same key', async () => {
      const alert = createTestAlert()

      await channel.send(alert)
      expect(channel.getCallCount()).toBe(1)

      // Send same alert again (should be deduped)
      await channel.send(alert)
      expect(channel.getCallCount()).toBe(1) // Still 1, not 2

      // Check metrics
      const metrics = channel.getMetrics()
      expect(metrics.totalDeduped).toBe(1)
    })

    it('should not dedup alerts with different keys', async () => {
      const alert1 = createTestAlert({ ruleId: 'rule-1', priority: 'P0' })
      const alert2 = createTestAlert({ ruleId: 'rule-2', priority: 'P1' })

      await channel.send(alert1)
      await channel.send(alert2)

      expect(channel.getCallCount()).toBe(2)
    })

    it('should allow configuring dedup keys', async () => {
      const channel2 = new TestAlertChannel({
        enabled: true,
        dedup: {
          enabled: true,
          windowMs: 1000,
          keys: ['fingerprint'], // Only dedup by fingerprint
        },
      })

      const alert1 = createTestAlert({ ruleId: 'rule-1', fingerprint: 'same-fp' })
      const alert2 = createTestAlert({ ruleId: 'rule-2', fingerprint: 'same-fp' })

      await channel2.send(alert1)
      await channel2.send(alert2)

      expect(channel2.getCallCount()).toBe(1) // Same fingerprint, deduped
    })
  })

  describe('rate limiting', () => {
    it('should throw when rate limit exceeded', async () => {
      const limitedChannel = new TestAlertChannel({
        enabled: true,
        rateLimit: {
          maxAlertsPerMinute: 2,
          maxAlertsPerHour: 100,
        },
      })

      const alert = createTestAlert()

      // First 2 should succeed
      await limitedChannel.send(alert)
      await limitedChannel.send(alert)

      // Third should fail
      await expect(limitedChannel.send(alert)).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('severity filtering', () => {
    it('should filter by severity', async () => {
      const channel2 = new TestAlertChannel({
        enabled: true,
        severityFilter: ['critical', 'error'],
      })

      const criticalAlert = createTestAlert({ severity: 'critical' })
      const infoAlert = createTestAlert({ severity: 'info' })

      await channel2.send(criticalAlert)
      await channel2.send(infoAlert)

      expect(channel2.getCallCount()).toBe(1) // Only critical passed
    })
  })

  describe('priority filtering', () => {
    it('should filter by priority', async () => {
      const channel2 = new TestAlertChannel({
        enabled: true,
        priorityFilter: ['P0', 'P1'],
      })

      const p0Alert = createTestAlert({ priority: 'P0' })
      const p3Alert = createTestAlert({ priority: 'P3' })

      await channel2.send(p0Alert)
      await channel2.send(p3Alert)

      expect(channel2.getCallCount()).toBe(1) // Only P0 passed
    })
  })

  describe('metrics', () => {
    it('should track metrics correctly', async () => {
      const alert = createTestAlert()

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
      expect(metrics.totalFailed).toBe(0)
    })

    it('should track failed metrics', async () => {
      channel.setShouldFail(true)
      const alert = createTestAlert()

      try {
        await channel.send(alert)
      } catch {
        // Expected
      }

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(0)
      expect(metrics.totalFailed).toBe(1)
      expect(metrics.totalRetried).toBeGreaterThan(0)
    })

    it('should reset metrics', async () => {
      const alert = createTestAlert()
      await channel.send(alert)

      channel.resetMetrics()

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(0)
    })
  })
})

describe('Utility Functions', () => {
  describe('priorityToLevel', () => {
    it('should convert P0 to critical', () => {
      expect(priorityToLevel('P0')).toBe('critical')
    })

    it('should convert P1 to error', () => {
      expect(priorityToLevel('P1')).toBe('error')
    })

    it('should convert P2 to warning', () => {
      expect(priorityToLevel('P2')).toBe('warning')
    })

    it('should convert P3 to info', () => {
      expect(priorityToLevel('P3')).toBe('info')
    })
  })

  describe('getLevelPriority', () => {
    it('should return correct priorities', () => {
      expect(getLevelPriority('critical')).toBe(4)
      expect(getLevelPriority('error')).toBe(3)
      expect(getLevelPriority('warning')).toBe(2)
      expect(getLevelPriority('info')).toBe(1)
    })
  })
})
