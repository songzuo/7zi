/**
 * Email Alert Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailAlertService } from '../EmailAlertService'
import type { PerformanceAlert } from '@/lib/performance/alerting/alerter'
import type { EmailAlertConfig, EmailRecipient } from '@/config/email'

// ========================================
// Mock nodemailer
// ========================================

const mockSendMail = vi.fn()
const mockVerify = vi.fn()
const mockClose = vi.fn()

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
    close: mockClose,
  })),
}))

// ========================================
// Test Data
// ========================================

const mockConfig: EmailAlertConfig = {
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    auth: {
      user: 'test@example.com',
      pass: 'testpass',
    },
    tls: {
      secure: false,
      rejectUnauthorized: true,
    },
  },
  sender: {
    name: '7zi System',
    email: 'noreply@7zi.com',
  },
  recipients: [
    { email: 'admin@7zi.com', name: 'Admin' },
    { email: 'alerts@7zi.com' },
  ],
  subjectPrefix: '[7zi Alert]',
  enabled: true,
  retry: {
    maxAttempts: 3,
    delayMs: 10,
    backoffMultiplier: 2,
  },
}

const mockAlert: PerformanceAlert = {
  id: 'alert-test-001',
  title: 'CPU Usage High',
  message: 'CPU usage exceeded 90% threshold',
  level: 'critical',
  category: 'performance',
  status: 'active',
  source: 'system',
  metric: 'cpu_usage',
  currentValue: 95,
  threshold: 90,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  occurrenceCount: 1,
}

const mockAlertWithMetadata: PerformanceAlert = {
  ...mockAlert,
  metadata: {
    server: 'prod-01',
    region: 'us-east-1',
  },
}

// ========================================
// Tests
// ========================================

describe('EmailAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerify.mockResolvedValue(true)
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })
  })

  describe('Constructor', () => {
    it('should create service with valid config', () => {
      const service = new EmailAlertService(mockConfig)

      expect(service.name).toBe('email')
      expect(service.isEnabled()).toBe(true)
    })

    it('should throw error with missing SMTP host', () => {
      const invalidConfig = {
        ...mockConfig,
        smtp: {
          ...mockConfig.smtp,
          host: '',
        },
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })

    it('should throw error with invalid port', () => {
      const invalidConfig = {
        ...mockConfig,
        smtp: {
          ...mockConfig.smtp,
          port: 70000,
        },
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })

    it('should throw error with missing auth', () => {
      const invalidConfig = {
        ...mockConfig,
        smtp: {
          ...mockConfig.smtp,
          auth: {
            user: '',
            pass: '',
          },
        },
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })

    it('should throw error with invalid sender email', () => {
      const invalidConfig = {
        ...mockConfig,
        sender: {
          name: 'Test',
          email: 'invalid-email',
        },
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })

    it('should throw error with no recipients', () => {
      const invalidConfig = {
        ...mockConfig,
        recipients: [],
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })

    it('should throw error with invalid recipient email', () => {
      const invalidConfig = {
        ...mockConfig,
        recipients: [{ email: 'not-an-email' }],
      }

      expect(() => new EmailAlertService(invalidConfig)).toThrow('Invalid email configuration')
    })
  })

  describe('connect()', () => {
    it('should connect to SMTP server', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.connect()

      expect(mockVerify).toHaveBeenCalled()
    })

    it('should not reconnect if already connected', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.connect()
      await service.connect()

      // verify should only be called once (second connect is no-op)
      expect(mockVerify).toHaveBeenCalledTimes(1)
    })

    it('should throw error on connection failure', async () => {
      mockVerify.mockRejectedValue(new Error('Connection refused'))

      const service = new EmailAlertService(mockConfig)

      await expect(service.connect()).rejects.toThrow('Connection refused')
    })
  })

  describe('disconnect()', () => {
    it('should disconnect from SMTP server', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.connect()
      await service.disconnect()

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('test()', () => {
    it('should return true when connection is valid', async () => {
      mockVerify.mockResolvedValue(true)

      const service = new EmailAlertService(mockConfig)

      const result = await service.test()

      expect(result).toBe(true)
    })

    it('should return false when connection fails', async () => {
      mockVerify.mockRejectedValue(new Error('Connection failed'))

      const service = new EmailAlertService(mockConfig)

      const result = await service.test()

      expect(result).toBe(false)
    })
  })

  describe('send()', () => {
    it('should send alert email successfully', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.send(mockAlert)

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]

      expect(mailOptions.from).toContain('7zi System')
      expect(mailOptions.to).toContain('admin@7zi.com')
      expect(mailOptions.subject).toContain('CPU Usage High')
      expect(mailOptions.html).toBeDefined()
      expect(mailOptions.text).toBeDefined()
    })

    it('should not send when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false }
      const service = new EmailAlertService(disabledConfig)

      await service.send(mockAlert)

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('should use custom recipients when provided', async () => {
      const service = new EmailAlertService(mockConfig)

      const customRecipients: EmailRecipient[] = [
        { email: 'custom@7zi.com', name: 'Custom' },
      ]

      await service.sendAlertEmail(mockAlert, { recipients: customRecipients })

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.to).toBe('Custom <custom@7zi.com>')
    })

    it('should use custom subject when provided via sendAlertEmail', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.sendAlertEmail(mockAlert, { subject: 'Custom Subject' })

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toBe('Custom Subject')
    })

    it('should throw error on send failure', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'))

      const service = new EmailAlertService(mockConfig)
      service.setEnabled(true) // Ensure enabled

      await expect(service.send(mockAlert)).rejects.toThrow('SMTP error')
    })
  })

  describe('sendAlertEmail()', () => {
    it('should return success result on successful send', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')
      expect(result.attempts).toBe(1)
    })

    it('should return error when no recipients specified in options', async () => {
      const service = new EmailAlertService(mockConfig)

      // Even though config has recipients, passing empty recipients in options should fail
      const result = await service.sendAlertEmail(mockAlert, { recipients: [] })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No recipients')
    })

    it('should retry on ETIMEDOUT error', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledTimes(3)
    })

    it('should retry on ECONNRESET error', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledTimes(2)
    })

    it('should retry on rate limit errors', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledTimes(2)
    })

    it('should not retry on authentication errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Authentication failed'))

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(false)
      expect(mockSendMail).toHaveBeenCalledTimes(1) // No retry for auth errors
    })

    it('should not retry on credential errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid credentials'))

      const service = new EmailAlertService(mockConfig)

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(false)
      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('should throw after max retry attempts', async () => {
      mockSendMail.mockRejectedValue(new Error('ETIMEDOUT'))

      const service = new EmailAlertService({
        ...mockConfig,
        retry: { maxAttempts: 2, delayMs: 10, backoffMultiplier: 2 },
      })

      const result = await service.sendAlertEmail(mockAlert)

      expect(result.success).toBe(false)
      expect(result.error).toBe('ETIMEDOUT')
      expect(result.attempts).toBe(2)
    })

    it('should include priority based on alert level', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      await service.sendAlertEmail(mockAlert) // level: 'critical'

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.priority).toBe('high')
    })

    it('should use normal priority for info level', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      const infoAlert = { ...mockAlert, level: 'info' as const }

      await service.sendAlertEmail(infoAlert)

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.priority).toBe('normal')
    })
  })

  describe('getStatus()', () => {
    it('should return current status', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

      const service = new EmailAlertService(mockConfig)

      await service.connect()
      await service.sendAlertEmail(mockAlert)

      const status = service.getStatus()

      expect(status.enabled).toBe(true)
      expect(status.connected).toBe(true)
      expect(status.totalSent).toBe(1)
      expect(status.totalFailed).toBe(0)
      expect(status.lastSendSuccess).toBeDefined()
    })

    it('should track failed sends', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'))

      const service = new EmailAlertService({
        ...mockConfig,
        retry: { maxAttempts: 1, delayMs: 10, backoffMultiplier: 2 },
      })

      await service.sendAlertEmail(mockAlert)

      const status = service.getStatus()

      expect(status.totalFailed).toBe(1)
      expect(status.lastSendFailure).toBeDefined()
      expect(status.lastError).toBe('SMTP error')
    })
  })

  describe('setEnabled()', () => {
    it('should enable/disable service', () => {
      const service = new EmailAlertService(mockConfig)

      service.setEnabled(false)
      expect(service.isEnabled()).toBe(false)

      service.setEnabled(true)
      expect(service.isEnabled()).toBe(true)
    })
  })

  describe('updateConfig()', () => {
    it('should update configuration', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.updateConfig({
        subjectPrefix: '[Custom Prefix]',
      })

      const config = service.getConfig()
      expect(config.subjectPrefix).toBe('[Custom Prefix]')
    })

    it('should reject invalid configuration', async () => {
      const service = new EmailAlertService(mockConfig)

      await expect(
        service.updateConfig({
          smtp: {
            host: '',
            port: 587,
            auth: { user: '', pass: '' },
          },
        })
      ).rejects.toThrow('Invalid configuration')
    })

    it('should reconnect if SMTP config changes', async () => {
      const service = new EmailAlertService(mockConfig)

      await service.connect()

      // Update with different SMTP host
      await service.updateConfig({
        smtp: {
          host: 'smtp.newserver.com',
          port: 587,
          auth: { user: 'test', pass: 'pass' },
        },
      })

      // Should have reconnected (close called, then new connection made)
      expect(mockClose).toHaveBeenCalled()
      expect(mockVerify).toHaveBeenCalled()
    })
  })

  describe('getConfig()', () => {
    it('should return config without sensitive data', () => {
      const service = new EmailAlertService(mockConfig)

      const config = service.getConfig()

      // SMTP auth should be excluded
      expect('auth' in config.smtp).toBe(false)
      expect(config.smtp.host).toBe('smtp.example.com')
      expect(config.smtp.port).toBe(587)
    })
  })
})

describe('EmailAlertService - Integration Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerify.mockResolvedValue(true)
    mockSendMail.mockResolvedValue({ messageId: 'test-id' })
  })

  it('should handle high priority alerts with custom options', async () => {
    const service = new EmailAlertService(mockConfig)

    await service.sendAlertEmail(mockAlert, {
      priority: 'high',
      replyTo: 'urgent@7zi.com',
      headers: {
        'X-Priority': '1',
      },
    })

    const mailOptions = mockSendMail.mock.calls[0][0]

    expect(mailOptions.priority).toBe('high')
    expect(mailOptions.replyTo).toBe('urgent@7zi.com')
    expect(mailOptions.headers['X-Priority']).toBe('1')
  })

  it('should format emails with alert level emoji in subject', async () => {
    const service = new EmailAlertService(mockConfig)

    await service.sendAlertEmail(mockAlert)

    const mailOptions = mockSendMail.mock.calls[0][0]

    expect(mailOptions.subject).toContain('🚨')
    expect(mailOptions.subject).toContain('CRITICAL')
    expect(mailOptions.subject).toContain('CPU Usage High')
  })

  it('should handle warning level alerts', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-456' })

    const service = new EmailAlertService(mockConfig)

    const warningAlert: PerformanceAlert = {
      ...mockAlert,
      level: 'warning',
      title: 'Memory Usage Warning',
    }

    const result = await service.sendAlertEmail(warningAlert)

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('msg-456')
  })

  it('should handle info level alerts', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-789' })

    const service = new EmailAlertService(mockConfig)

    const infoAlert: PerformanceAlert = {
      ...mockAlert,
      level: 'info',
      title: 'Info Alert',
    }

    const result = await service.sendAlertEmail(infoAlert)

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('msg-789')
  })

  it('should track multiple successful sends', async () => {
    const service = new EmailAlertService(mockConfig)

    await service.sendAlertEmail(mockAlert)
    await service.sendAlertEmail({ ...mockAlert, id: 'alert-002' })
    await service.sendAlertEmail({ ...mockAlert, id: 'alert-003' })

    const status = service.getStatus()

    expect(status.totalSent).toBe(3)
    expect(status.totalFailed).toBe(0)
  })

  it('should track mixed success and failure', async () => {
    mockSendMail
      .mockResolvedValueOnce({ messageId: 'msg-1' })
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ messageId: 'msg-3' })

    const service = new EmailAlertService({
      ...mockConfig,
      retry: { maxAttempts: 1, delayMs: 10, backoffMultiplier: 2 },
    })

    await service.sendAlertEmail({ ...mockAlert, id: 'alert-1' })
    await service.sendAlertEmail({ ...mockAlert, id: 'alert-2' })
    await service.sendAlertEmail({ ...mockAlert, id: 'alert-3' })

    const status = service.getStatus()

    expect(status.totalSent).toBe(2)
    expect(status.totalFailed).toBe(1)
  })
})