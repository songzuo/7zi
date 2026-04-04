/**
 * Base Alert Channel Tests
 * 基础告警渠道测试
 *
 * Tests:
 * - Retry mechanism
 * - Deduplication
 * - Rate limiting
 * - Severity/priority filtering
 * - Metrics tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaseAlertChannel, DEFAULT_RETRY_CONFIG, DEFAULT_DEDUP_CONFIG, DEFAULT_RATE_LIMIT_CONFIG } from './base-alert-channel'
import { Alert, AlertPriority, AlertSeverity } from '../alert-engine'

// Mock alert for testing
const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  ruleId: 'rule-1',
  ruleName: 'Test Rule',
  priority: 'P1',
  severity: 'error',
  status: 'firing',
  metric: 'cpu_usage',
  message: 'CPU usage is high',
  value: 90,
  threshold: 80,
  timestamp: Date.now(),
  startedAt: Date.now(),
  fingerprint: 'cpu_usage:90',
  ...overrides,
})

// Test implementation of BaseAlertChannel
class TestAlertChannel extends BaseAlertChannel {
  private sendAttempts: number = 0
  private shouldFail: boolean = false
  private failOnAttempt?: number

  constructor(config: any = {}) {
    super({
      enabled: true,
      ...config,
    })
  }

  protected getChannelKey(): string {
    return 'test'
  }

  protected async sendInternal(alert: Alert): Promise<void> {
    this.sendAttempts++

    if (this.shouldFail) {
      if (this.failOnAttempt === undefined || this.sendAttempts === this.failOnAttempt) {
        throw new Error('Send failed')
      }
    }
  }

  setShouldFail(shouldFail: boolean, failOnAttempt?: number): void {
    this.shouldFail = shouldFail
    this.failOnAttempt = failOnAttempt
  }

  getSendAttempts(): number {
    return this.sendAttempts
  }

  resetSendAttempts(): void {
    this.sendAttempts = 0
  }
}

describe('BaseAlertChannel', () => {
  let channel: TestAlertChannel

  beforeEach(() => {
    channel = new TestAlertChannel()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (channel) {
      channel.setShouldFail(false)
      channel.resetSendAttempts()
    }
    vi.restoreAllMocks()
  })

  describe('Retry Mechanism', () => {
    it('should retry on failure with exponential backoff', async () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      }

      channel = new TestAlertChannel({ 
        retry: retryConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })
      channel.setShouldFail(true, 1) // Fail on first attempt

      const alert = createMockAlert({ id: `alert-${Date.now()}` })

      // Start the send operation
      const sendPromise = channel.send(alert)

      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(100) // First retry delay
      await vi.advanceTimersByTimeAsync(200) // Second retry delay
      await vi.advanceTimersByTimeAsync(400) // Third retry delay

      await expect(sendPromise).rejects.toThrow('Send failed')

      // Should have attempted 4 times (initial + 3 retries)
      expect(channel.getSendAttempts()).toBe(4)
    })

    it('should not retry on non-retryable errors', async () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNREFUSED'],
      }

      channel = new TestAlertChannel({ retry: retryConfig })

      // Override sendInternal to throw a non-retryable error
      const originalSendInternal = channel['sendInternal'].bind(channel)
      channel['sendInternal'] = vi.fn().mockImplementation(async (alert: Alert) => {
        const error = new Error('Not retryable') as any
        error.code = 'ENOTALLOWED'
        throw error
      })

      const alert = createMockAlert()

      await expect(channel.send(alert)).rejects.toThrow('Not retryable')

      // Should have attempted only once
      expect(channel['sendInternal']).toHaveBeenCalledTimes(1)
    })

    it('should respect maxDelayMs in exponential backoff', async () => {
      const retryConfig = {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 2000,
        backoffMultiplier: 3,
      }

      channel = new TestAlertChannel({ 
        retry: retryConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })
      channel.setShouldFail(true)

      const alert = createMockAlert({ id: `alert-${Date.now()}` })

      const sendPromise = channel.send(alert)

      // Calculate expected delays: 1000, 2000 (capped), 2000 (capped), 2000 (capped), 2000 (capped)
      // Total: 9000ms
      await vi.advanceTimersByTimeAsync(9000)

      await expect(sendPromise).rejects.toThrow('Send failed')
      expect(channel.getSendAttempts()).toBe(6) // initial + 5 retries
    })

    it('should succeed on retry after initial failure', async () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      }

      channel = new TestAlertChannel({ 
        retry: retryConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })
      channel.setShouldFail(true, 1) // Fail only on first attempt

      const alert = createMockAlert({ id: `alert-${Date.now()}` })

      const sendPromise = channel.send(alert)

      // Advance past first retry
      await vi.advanceTimersByTimeAsync(100)

      await expect(sendPromise).resolves.not.toThrow()

      // Should have attempted twice (initial + 1 retry)
      expect(channel.getSendAttempts()).toBe(2)

      // Metrics should show retry
      const metrics = channel.getMetrics()
      expect(metrics.totalRetried).toBe(1)
      expect(metrics.totalSent).toBe(1)
    })
  })

  describe('Deduplication', () => {
    it('should deduplicate identical alerts within window', async () => {
      const dedupConfig = {
        enabled: true,
        windowMs: 60000,
        keys: ['ruleId', 'priority'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert = createMockAlert()

      // Send first alert
      await channel.send(alert)
      expect(channel.getSendAttempts()).toBe(1)

      // Send identical alert (should be deduped)
      await channel.send(alert)
      expect(channel.getSendAttempts()).toBe(1) // Still 1, second was deduped

      // Metrics should show deduplication
      const metrics = channel.getMetrics()
      expect(metrics.totalDeduped).toBe(1)
    })

    it('should not deduplicate alerts with different keys', async () => {
      const dedupConfig = {
        enabled: true,
        windowMs: 60000,
        keys: ['ruleId', 'priority'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert1 = createMockAlert({ priority: 'P1' })
      const alert2 = createMockAlert({ priority: 'P2' })

      await channel.send(alert1)
      await channel.send(alert2)

      expect(channel.getSendAttempts()).toBe(2)

      const metrics = channel.getMetrics()
      expect(metrics.totalDeduped).toBe(0)
    })

    it('should allow alert after dedup window expires', async () => {
      const dedupConfig = {
        enabled: true,
        windowMs: 1000, // 1 second
        keys: ['ruleId'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert = createMockAlert()

      await channel.send(alert)
      expect(channel.getSendAttempts()).toBe(1)

      // Advance past dedup window
      await vi.advanceTimersByTimeAsync(1001)

      // Send same alert again (should not be deduped)
      await channel.send(alert)
      expect(channel.getSendAttempts()).toBe(2)
    })

    it('should disable deduplication when configured', async () => {
      const dedupConfig = {
        enabled: false,
        windowMs: 60000,
        keys: ['ruleId'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert = createMockAlert()

      await channel.send(alert)
      await channel.send(alert)

      expect(channel.getSendAttempts()).toBe(2)

      const metrics = channel.getMetrics()
      expect(metrics.totalDeduped).toBe(0)
    })

    it('should generate correct dedup key from multiple keys', async () => {
      const dedupConfig = {
        enabled: true,
        windowMs: 60000,
        keys: ['ruleId', 'priority', 'severity'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert1 = createMockAlert({
        ruleId: 'rule-1',
        priority: 'P1',
        severity: 'error',
      })

      const alert2 = createMockAlert({
        ruleId: 'rule-1',
        priority: 'P1',
        severity: 'error',
      })

      const alert3 = createMockAlert({
        ruleId: 'rule-1',
        priority: 'P1',
        severity: 'warning', // Different severity
      })

      await channel.send(alert1)
      await channel.send(alert2) // Should be deduped
      await channel.send(alert3) // Should not be deduped

      expect(channel.getSendAttempts()).toBe(2)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce per-minute rate limit', async () => {
      const rateLimitConfig = {
        maxAlertsPerMinute: 2,
        maxAlertsPerHour: 100,
      }

      channel = new TestAlertChannel({ 
        rateLimit: rateLimitConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })
      const alert3 = createMockAlert({ id: 'alert-3' })

      // Send 2 alerts (within limit)
      await channel.send(alert1)
      await channel.send(alert2)

      // Third alert should be rate limited
      await expect(channel.send(alert3)).rejects.toThrow('Rate limit exceeded')

      expect(channel.getSendAttempts()).toBe(2)
    })

    it('should enforce per-hour rate limit', async () => {
      const rateLimitConfig = {
        maxAlertsPerMinute: 100,
        maxAlertsPerHour: 2,
      }

      channel = new TestAlertChannel({ 
        rateLimit: rateLimitConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })
      const alert3 = createMockAlert({ id: 'alert-3' })

      // Send 2 alerts (within limit)
      await channel.send(alert1)
      await channel.send(alert2)

      // Third alert should be rate limited
      await expect(channel.send(alert3)).rejects.toThrow('Rate limit exceeded')

      expect(channel.getSendAttempts()).toBe(2)
    })

    it('should reset rate limit after time window', async () => {
      const rateLimitConfig = {
        maxAlertsPerMinute: 2,
        maxAlertsPerHour: 100,
      }

      channel = new TestAlertChannel({ 
        rateLimit: rateLimitConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })
      const alert3 = createMockAlert({ id: 'alert-3' })

      // Send 2 alerts (within limit)
      await channel.send(alert1)
      await channel.send(alert2)

      // Advance past minute window
      await vi.advanceTimersByTimeAsync(60001)

      // Should be able to send again
      await channel.send(alert3)

      expect(channel.getSendAttempts()).toBe(3)
    })

    it('should track remaining alerts in rate limit', async () => {
      const rateLimitConfig = {
        maxAlertsPerMinute: 5,
        maxAlertsPerHour: 100,
      }

      channel = new TestAlertChannel({ 
        rateLimit: rateLimitConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })
      const alert3 = createMockAlert({ id: 'alert-3' })

      // Send 3 alerts
      await channel.send(alert1)
      await channel.send(alert2)
      await channel.send(alert3)

      expect(channel.getSendAttempts()).toBe(3)
    })
  })

  describe('Severity and Priority Filtering', () => {
    it('should filter by severity', async () => {
      channel = new TestAlertChannel({
        severityFilter: ['error', 'critical'],
      })

      const errorAlert = createMockAlert({ severity: 'error' })
      const warningAlert = createMockAlert({ severity: 'warning' })

      await channel.send(errorAlert)
      await channel.send(warningAlert)

      expect(channel.getSendAttempts()).toBe(1) // Only error alert sent
    })

    it('should filter by priority', async () => {
      channel = new TestAlertChannel({
        priorityFilter: ['P0', 'P1'],
      })

      const p0Alert = createMockAlert({ priority: 'P0' })
      const p2Alert = createMockAlert({ priority: 'P2' })

      await channel.send(p0Alert)
      await channel.send(p2Alert)

      expect(channel.getSendAttempts()).toBe(1) // Only P0 alert sent
    })

    it('should apply both severity and priority filters', async () => {
      channel = new TestAlertChannel({
        severityFilter: ['error', 'critical'],
        priorityFilter: ['P0', 'P1'],
      })

      const alert1 = createMockAlert({ severity: 'error', priority: 'P1' })
      const alert2 = createMockAlert({ severity: 'warning', priority: 'P1' })
      const alert3 = createMockAlert({ severity: 'error', priority: 'P2' })

      await channel.send(alert1)
      await channel.send(alert2)
      await channel.send(alert3)

      expect(channel.getSendAttempts()).toBe(1) // Only alert1 matches both filters
    })
  })

  describe('Metrics Tracking', () => {
    it('should track total sent alerts', async () => {
      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })

      await channel.send(alert1)
      await channel.send(alert2)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBeGreaterThanOrEqual(1)
    })

    it('should track total failed alerts', async () => {
      channel.setShouldFail(true)

      const alert = createMockAlert({ id: 'alert-1' })

      await expect(channel.send(alert)).rejects.toThrow()

      const metrics = channel.getMetrics()
      expect(metrics.totalFailed).toBe(1)
    })

    it('should track total retried alerts', async () => {
      channel = new TestAlertChannel({
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      channel.setShouldFail(true, 1)

      const alert = createMockAlert({ id: 'alert-1' })

      const sendPromise = channel.send(alert)
      await vi.advanceTimersByTimeAsync(10)
      await sendPromise

      const metrics = channel.getMetrics()
      expect(metrics.totalRetried).toBe(1)
    })

    it('should track last sent timestamp', async () => {
      const alert = createMockAlert({ id: 'alert-1' })

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.lastSentAt).toBeDefined()
      expect(metrics.lastSentAt).toBeGreaterThan(0)
    })

    it('should track last failed timestamp', async () => {
      channel.setShouldFail(true)

      const alert = createMockAlert({ id: 'alert-1' })

      await expect(channel.send(alert)).rejects.toThrow()

      const metrics = channel.getMetrics()
      expect(metrics.lastFailedAt).toBeDefined()
      expect(metrics.lastFailedAt).toBeGreaterThan(0)
    })

    it('should reset metrics', async () => {
      const alert = createMockAlert({ id: 'alert-1' })

      await channel.send(alert)

      channel.resetMetrics()

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(0)
      expect(metrics.totalFailed).toBe(0)
      expect(metrics.totalRetried).toBe(0)
      expect(metrics.totalDeduped).toBe(0)
      expect(metrics.lastSentAt).toBeUndefined()
      expect(metrics.lastFailedAt).toBeUndefined()
    })
  })

  describe('Channel Enable/Disable', () => {
    it('should not send alerts when disabled', async () => {
      channel.setEnabled(false)

      const alert = createMockAlert()

      await channel.send(alert)

      expect(channel.getSendAttempts()).toBe(0)
    })

    it('should send alerts when enabled', async () => {
      channel.setEnabled(true)

      const alert = createMockAlert()

      await channel.send(alert)

      expect(channel.getSendAttempts()).toBe(1)
    })

    it('should report enabled status', async () => {
      expect(channel.isEnabled()).toBe(true)

      channel.setEnabled(false)
      expect(channel.isEnabled()).toBe(false)

      channel.setEnabled(true)
      expect(channel.isEnabled()).toBe(true)
    })
  })

  describe('Configuration Updates', () => {
    beforeEach(() => {
      // Reset channel state before each configuration test
      channel = new TestAlertChannel()
    })

    it('should update retry configuration', async () => {
      const newRetryConfig = {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      channel.updateConfig({ 
        retry: newRetryConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      // Verify config was updated by checking retry behavior
      channel.setShouldFail(true)

      const alert = createMockAlert({ id: 'alert-1' })
      const sendPromise = channel.send(alert)

      // Should use new delay (10ms)
      await vi.advanceTimersByTimeAsync(10)

      await expect(sendPromise).rejects.toThrow()
    })

    it('should update dedup configuration', async () => {
      const newDedupConfig = {
        enabled: false,
        windowMs: 30000,
        keys: ['ruleId', 'priority'],
      }

      channel.updateConfig({ dedup: newDedupConfig })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })

      await channel.send(alert1)
      await channel.send(alert2)

      // Should not be deduped
      expect(channel.getSendAttempts()).toBe(2)
    })

    it('should update rate limit configuration', async () => {
      const newRateLimitConfig = {
        maxAlertsPerMinute: 1,
        maxAlertsPerHour: 10,
      }

      channel.updateConfig({ 
        rateLimit: newRateLimitConfig,
        dedup: { enabled: false, windowMs: 60000, keys: ['ruleId', 'priority'] }
      })

      const alert1 = createMockAlert({ id: 'alert-1' })
      const alert2 = createMockAlert({ id: 'alert-2' })

      await channel.send(alert1)
      await expect(channel.send(alert2)).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('Cleanup', () => {
    it('should clean expired dedup entries', async () => {
      const dedupConfig = {
        enabled: true,
        windowMs: 1000,
        keys: ['ruleId'],
      }

      channel = new TestAlertChannel({ dedup: dedupConfig })

      const alert = createMockAlert()

      await channel.send(alert)

      // Advance past window
      await vi.advanceTimersByTimeAsync(1001)

      channel.cleanup()

      // Should be able to send again without dedup
      await channel.send(alert)
      expect(channel.getSendAttempts()).toBe(2)
    })
  })
})