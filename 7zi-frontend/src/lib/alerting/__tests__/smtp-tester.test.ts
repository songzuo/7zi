/**
 * SMTP Tester Unit Tests
 * SMTP 测试模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  testSMTPConnection,
  testSMTPConnectionOnly,
  validateSMTPCredentials,
  getDefaultSMTPConfig,
  type SMTPCredentials,
  type TestResult,
} from '../smtp-tester'

// 模拟 nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn(),
      sendMail: vi.fn(),
    })),
  },
}))

// 导入 nodemailer 以获取模拟版本
import nodemailer from 'nodemailer'

describe('SMTP Tester Module', () => {
  const mockCredentials: SMTPCredentials = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'password123',
    },
  }

  const mockTestOptions = {
    to: 'recipient@example.com',
    subject: 'Test Email',
    text: 'This is a test email',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateSMTPCredentials', () => {
    it('should return valid for correct credentials', () => {
      const result = validateSMTPCredentials(mockCredentials)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return invalid for missing host', () => {
      const credentials = { ...mockCredentials, host: '' }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Host is required and must be a string')
    })

    it('should return invalid for invalid port', () => {
      const credentials = { ...mockCredentials, port: 99999 }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Port must be a number between 1 and 65535')
    })

    it('should return invalid for missing auth', () => {
      const credentials = { ...mockCredentials, auth: undefined }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Auth is required')
    })

    it('should return invalid for missing auth user', () => {
      const credentials = { ...mockCredentials, auth: { user: '', pass: 'pass' } }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Auth user is required and must be a string')
    })

    it('should return invalid for missing auth pass', () => {
      const credentials = { ...mockCredentials, auth: { user: 'user', pass: '' } }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Auth pass is required and must be a string')
    })

    it('should return invalid for missing secure', () => {
      const credentials = { ...mockCredentials, secure: undefined }
      const result = validateSMTPCredentials(credentials as unknown as SMTPCredentials)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Secure must be a boolean')
    })
  })

  describe('getDefaultSMTPConfig', () => {
    it('should return Gmail config', () => {
      const config = getDefaultSMTPConfig('gmail')
      expect(config.host).toBe('smtp.gmail.com')
      expect(config.port).toBe(587)
      expect(config.secure).toBe(false)
    })

    it('should return Outlook config', () => {
      const config = getDefaultSMTPConfig('outlook')
      expect(config.host).toBe('smtp-mail.outlook.com')
      expect(config.port).toBe(587)
    })

    it('should return SendGrid config', () => {
      const config = getDefaultSMTPConfig('sendgrid')
      expect(config.host).toBe('smtp.sendgrid.net')
      expect(config.port).toBe(587)
    })

    it('should return undefined for unknown provider', () => {
      const config = getDefaultSMTPConfig('unknown')
      expect(config).toEqual({})
    })

    it('should be case insensitive', () => {
      const config1 = getDefaultSMTPConfig('Gmail')
      const config2 = getDefaultSMTPConfig('GMAIL')
      const config3 = getDefaultSMTPConfig('gmail')

      expect(config1).toEqual(config2)
      expect(config2).toEqual(config3)
    })
  })

  describe('testSMTPConnection', () => {
    it('should successfully connect and send email', async () => {
      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockResolvedValue({
          response: '250 OK',
          messageId: '<test@example.com>',
          accepted: ['recipient@example.com'],
          rejected: [],
        }),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.details).toBeDefined()
      expect(result.details?.messageId).toBe('<test@example.com>')
      expect(result.details?.acceptedRecipients).toContain('recipient@example.com')
    })

    it('should handle connection timeout', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should handle connection refused', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('refused')
    })

    it('should handle host not found', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle authentication failure', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('Invalid login')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })

    it('should handle SSL certificate error', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('certificate')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('SSL/TLS certificate error')
    })

    it('should use default options when not provided', async () => {
      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockResolvedValue({
          response: '250 OK',
          messageId: '<test@example.com>',
          accepted: ['recipient@example.com'],
          rejected: [],
        }),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, {
        to: 'recipient@example.com',
      })

      expect(result.success).toBe(true)
    })

    it('should include response time in result', async () => {
      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockResolvedValue({
          response: '250 OK',
          messageId: '<test@example.com>',
          accepted: ['recipient@example.com'],
          rejected: [],
        }),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(typeof result.responseTime).toBe('number')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('testSMTPConnectionOnly', () => {
    it('should successfully verify connection', async () => {
      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnectionOnly(mockCredentials)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(mockTransporter.verify).toHaveBeenCalled()
    })

    it('should handle connection failure', async () => {
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue(new Error('Connection failed')),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      const result = await testSMTPConnectionOnly(mockCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect custom timeout', async () => {
      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
      }

      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any)

      await testSMTPConnectionOnly(mockCredentials, 5000)

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        })
      )
    })
  })
})
