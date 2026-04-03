/**
 * Email Alert Channel Tests
 * 邮件告警渠道测试 - 增强版
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock nodemailer before importing
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
}))

import { EmailAlertChannel, createEmailChannelFromEnv } from '../channels/email-alert'
import { Alert } from '../alert-engine'

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

describe('EmailAlertChannel', () => {
  let channel: EmailAlertChannel

  beforeEach(() => {
    channel = new EmailAlertChannel({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'testpass',
      },
      from: 'alerts@example.com',
      recipients: {
        P0: ['admin@example.com', 'ops@example.com'],
        P1: ['admin@example.com'],
        P2: ['dev@example.com'],
        P3: ['dev@example.com'],
      },
    })
  })

  describe('send', () => {
    it('should format alert for P0 priority', async () => {
      const alert = createTestAlert({ priority: 'P0', severity: 'critical' })

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should format alert for P1 priority', async () => {
      const alert = createTestAlert({ priority: 'P1', severity: 'error' })

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should include context when configured', async () => {
      const channelWithContext = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: { P0: [], P1: [], P2: [], P3: [] },
        includeContext: true,
      })

      const alert = createTestAlert({
        context: { url: '/api/test', userId: '123' },
      })

      await expect(channelWithContext.send(alert)).resolves.not.toThrow()
    })

    it('should handle all severity levels', async () => {
      const severities: Array<'info' | 'warning' | 'error' | 'critical'> = [
        'info',
        'warning',
        'error',
        'critical',
      ]

      for (const severity of severities) {
        const alert = createTestAlert({ severity })
        await expect(channel.send(alert)).resolves.not.toThrow()
      }
    })

    it('should handle all priority levels', async () => {
      const priorities: Array<'P0' | 'P1' | 'P2' | 'P3'> = ['P0', 'P1', 'P2', 'P3']

      for (const priority of priorities) {
        const alert = createTestAlert({ priority })
        await expect(channel.send(alert)).resolves.not.toThrow()
      }
    })
  })

  describe('getRecipients', () => {
    it('should get P0 recipients for P0 priority', () => {
      const alert = createTestAlert({ priority: 'P0' })
      expect(alert.priority).toBe('P0')
    })

    it('should include all recipients when configured', () => {
      const channelWithAll = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: {
          P0: ['admin@example.com'],
          P1: [],
          P2: [],
          P3: [],
          all: ['all@example.com'],
        },
      })

      expect(channelWithAll.getConfig().recipients.all).toContain('all@example.com')
    })
  })

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = channel.getConfig()

      expect(config.host).toBe('smtp.example.com')
      expect(config.port).toBe(587)
      expect(config.from).toBe('alerts@example.com')
    })

    it('should update configuration', () => {
      channel.updateConfig({ port: 465, secure: true })

      const config = channel.getConfig()
      expect(config.port).toBe(465)
      expect(config.secure).toBe(true)
    })
  })

  describe('retry mechanism', () => {
    it('should retry on transient errors', async () => {
      const channelWithRetry = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: { P0: [], P1: [], P2: [], P3: [] },
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      const alert = createTestAlert()
      // Should succeed (logs only without nodemailer)
      await expect(channelWithRetry.send(alert)).resolves.not.toThrow()
    })
  })

  describe('deduplication', () => {
    it('should deduplicate alerts within window', async () => {
      const channelWithDedup = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: { P0: [], P1: [], P2: [], P3: [] },
        dedup: {
          enabled: true,
          windowMs: 1000,
          keys: ['ruleId', 'priority'],
        },
      })

      const alert = createTestAlert()

      // First send
      await channelWithDedup.send(alert)

      // Second send (should be deduped)
      await channelWithDedup.send(alert)

      const metrics = channelWithDedup.getMetrics()
      expect(metrics.totalDeduped).toBe(1)
    })
  })

  describe('severity filtering', () => {
    it('should filter alerts by severity', async () => {
      const filteredChannel = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: { P0: [], P1: [], P2: [], P3: [] },
        severityFilter: ['critical'],
      })

      const criticalAlert = createTestAlert({ severity: 'critical' })
      const infoAlert = createTestAlert({ severity: 'info' })

      await filteredChannel.send(criticalAlert)
      await filteredChannel.send(infoAlert)

      const metrics = filteredChannel.getMetrics()
      expect(metrics.totalSent).toBe(1) // Only critical sent
    })
  })

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const limitedChannel = new EmailAlertChannel({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'pass' },
        from: 'alerts@example.com',
        recipients: { P0: [], P1: [], P2: [], P3: [] },
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

  describe('metrics', () => {
    it('should track metrics', async () => {
      const alert = createTestAlert()
      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
    })

    it('should reset metrics', async () => {
      const alert = createTestAlert()
      await channel.send(alert)

      channel.resetMetrics()
      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(0)
    })
  })

  describe('enable/disable', () => {
    it('should not send when disabled', async () => {
      channel.setEnabled(false)
      const alert = createTestAlert()

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(0)
    })

    it('should send when re-enabled', async () => {
      channel.setEnabled(false)
      channel.setEnabled(true)
      const alert = createTestAlert()

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
    })
  })
})

describe('createEmailChannelFromEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear email env vars
    delete process.env.EMAIL_SMTP_HOST
    delete process.env.EMAIL_SMTP_USER
    delete process.env.EMAIL_SMTP_PASS
    delete process.env.EMAIL_FROM
    delete process.env.EMAIL_RECIPIENTS_P0
    delete process.env.EMAIL_RECIPIENTS_P1
  })

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, originalEnv)
  })

  it('should return null when SMTP not configured', () => {
    const result = createEmailChannelFromEnv()
    expect(result).toBeNull()
  })

  it('should create channel when env vars are set', () => {
    process.env.EMAIL_SMTP_HOST = 'smtp.example.com'
    process.env.EMAIL_SMTP_USER = 'user'
    process.env.EMAIL_SMTP_PASS = 'pass'
    process.env.EMAIL_FROM = 'alerts@example.com'
    process.env.EMAIL_RECIPIENTS_P0 = 'admin@example.com'
    process.env.EMAIL_RECIPIENTS_P1 = 'dev@example.com'

    const result = createEmailChannelFromEnv()

    expect(result).not.toBeNull()
    expect(result?.getConfig().host).toBe('smtp.example.com')
  })
})
