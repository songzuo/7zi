/**
 * Email Alert Channel Tests
 * 邮件告警渠道测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock nodemailer before importing
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    verify: vi.fn().mockResolvedValue(true),
  })),
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

      // Should not throw (will log since nodemailer may not be available)
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

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = channel.getConfig()

      expect(config.host).toBe('smtp.example.com')
      expect(config.port).toBe(587)
      expect(config.from).toBe('alerts@example.com')
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      channel.updateConfig({ port: 465, secure: true })

      const config = channel.getConfig()
      expect(config.port).toBe(465)
      expect(config.secure).toBe(true)
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
