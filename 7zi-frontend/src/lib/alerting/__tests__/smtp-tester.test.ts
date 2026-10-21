/**
 * SMTP Tester Unit Tests
 * SMTP 测试模块单元测试
 *
 * P0-3 安全修复：nodemailer 已迁移到服务端路由 `/api/email`，
 * 因此这里 mock 的是 global fetch，而不是 nodemailer。
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

/**
 * 构造一个模拟的 fetch Response
 */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

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

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

    it('should return empty object for unknown provider', () => {
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
    it('should call the server API and return success details', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            messageId: '<test@example.com>',
            accepted: ['recipient@example.com'],
            rejected: [],
            response: '250 OK',
          },
        })
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.details).toBeDefined()
      expect(result.details?.messageId).toBe('<test@example.com>')
      expect(result.details?.acceptedRecipients).toContain('recipient@example.com')
    })

    it('should POST to /api/email with action send', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))

      await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/email')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.action).toBe('send')
      expect(body.to).toBe('recipient@example.com')
      expect(body.subject).toBe('Test Email')
    })

    it('should not send SMTP credentials to the server', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))

      await testSMTPConnection(mockCredentials, mockTestOptions)

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.auth).toBeUndefined()
      expect(body.pass).toBeUndefined()
      expect(JSON.stringify(body)).not.toContain('password123')
    })

    it('should handle connection timeout', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'ETIMEDOUT connection failed' }, 500)
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should handle connection refused', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'ECONNREFUSED connect failed' }, 500)
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('refused')
    })

    it('should handle host not found', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'ENOTFOUND getaddrinfo failed' }, 500)
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'Invalid login credentials' }, 500)
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })

    it('should handle SSL certificate error', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'unable to verify the first certificate' }, 500)
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('SSL/TLS certificate error')
    })

    it('should surface 503 when SMTP is not configured on the server', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { success: false, error: 'SMTP is not configured on the server. Missing: SMTP_HOST' },
          503
        )
      )

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('SMTP is not configured')
    })

    it('should use default options when not provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))

      const result = await testSMTPConnection(mockCredentials, {
        to: 'recipient@example.com',
      })

      expect(result.success).toBe(true)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.subject).toBe('SMTP Test Email')
    })

    it('should include response time in result', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }))

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(typeof result.responseTime).toBe('number')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await testSMTPConnection(mockCredentials, mockTestOptions)

      expect(result.success).toBe(false)
      expect(result.error).toContain('network down')
    })

    it('should not call the API when credentials are invalid', async () => {
      const result = await testSMTPConnection(
        { ...mockCredentials, host: '' } as unknown as SMTPCredentials,
        mockTestOptions
      )

      expect(result.success).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('testSMTPConnectionOnly', () => {
    it('should successfully verify connection', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: true, data: { verified: true, host: 'smtp.example.com' } })
      )

      const result = await testSMTPConnectionOnly(mockCredentials)

      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should call the server API with action test', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { verified: true } }))

      await testSMTPConnectionOnly(mockCredentials)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/email')
      const body = JSON.parse(init.body)
      expect(body.action).toBe('test')
    })

    it('should handle connection failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: false, error: 'Connection failed' }, 500))

      const result = await testSMTPConnectionOnly(mockCredentials)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect custom timeout', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { verified: true } }))

      await testSMTPConnectionOnly(mockCredentials, 5000)

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.timeout).toBe(5000)
    })

    it('should return a TestResult shape', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { verified: true } }))

      const result: TestResult = await testSMTPConnectionOnly(mockCredentials)

      expect(typeof result.success).toBe('boolean')
      expect(typeof result.responseTime).toBe('number')
    })
  })
})
