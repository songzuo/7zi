/**
 * Email API Route Unit Tests
 * /api/email 路由单元测试
 *
 * P0-3 安全修复：nodemailer 只在服务端路由内加载，
 * 测试通过 mock nodemailer 模块来验证路由行为（SMTP 凭据来自服务端环境变量）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSendMail = vi.fn()
const mockVerify = vi.fn()
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify,
}))

vi.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}))

import { POST, GET, resolveSmtpConfig } from '../route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/email route', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMail.mockResolvedValue({
      messageId: '<test-id@example.com>',
      accepted: ['recipient@example.com'],
      rejected: [],
      response: '250 OK',
    })
    mockVerify.mockResolvedValue(true)
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
    })

    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'secret'
    process.env.SMTP_FROM = 'alerts@example.com'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  describe('resolveSmtpConfig', () => {
    it('should resolve config from SMTP_* env variables', () => {
      const { config, missing } = resolveSmtpConfig()
      expect(config).not.toBeNull()
      expect(config?.host).toBe('smtp.example.com')
      expect(config?.port).toBe(587)
      expect(config?.secure).toBe(false)
      expect(config?.user).toBe('user@example.com')
      expect(config?.pass).toBe('secret')
      expect(config?.from).toBe('alerts@example.com')
      expect(missing).toHaveLength(0)
    })

    it('should mark port 465 as secure', () => {
      process.env.SMTP_PORT = '465'
      const { config } = resolveSmtpConfig()
      expect(config?.secure).toBe(true)
    })

    it('should report missing variables', () => {
      const { config, missing } = resolveSmtpConfig({} as NodeJS.ProcessEnv)
      expect(config).toBeNull()
      expect(missing).toContain('SMTP_HOST')
      expect(missing).toContain('SMTP_USER')
      expect(missing).toContain('SMTP_PASS')
    })
  })

  describe('POST /api/email', () => {
    it('should return 503 when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST
      delete process.env.SMTP_USER
      delete process.env.SMTP_PASS

      const response = await POST(makeRequest({ to: 'a@example.com' }))
      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body.success).toBe(false)
      expect(body.error).toContain('SMTP is not configured')
      expect(body.error).toContain('SMTP_HOST')
    })

    it('should return 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Invalid JSON body')
    })

    it('should return 400 when no recipient is provided', async () => {
      const response = await POST(makeRequest({ action: 'send', subject: 'Hi' }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toContain('recipient')
    })

    it('should send an email successfully', async () => {
      const response = await POST(
        makeRequest({
          action: 'send',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
        })
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.messageId).toBe('<test-id@example.com>')
      expect(mockSendMail).toHaveBeenCalledTimes(1)
      expect(mockSendMail.mock.calls[0][0]).toMatchObject({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test Body',
      })
    })

    it('should not leak SMTP credentials in the response', async () => {
      const response = await POST(
        makeRequest({ to: 'recipient@example.com', subject: 'x', text: 'y' })
      )
      const raw = JSON.stringify(await response.json())

      expect(raw).not.toContain('secret')
      expect(raw).not.toContain('SMTP_PASS')
    })

    it('should verify connection for action=test', async () => {
      const response = await POST(makeRequest({ action: 'test' }))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.verified).toBe(true)
      expect(mockVerify).toHaveBeenCalledTimes(1)
      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('should return 500 when sending fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid login credentials'))

      const response = await POST(makeRequest({ to: 'a@example.com' }))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toContain('Invalid login credentials')
    })
  })

  describe('GET /api/email', () => {
    it('should report configured status without exposing credentials', async () => {
      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.configured).toBe(true)
      expect(JSON.stringify(body)).not.toContain('secret')
    })

    it('should report missing variables when not configured', async () => {
      delete process.env.SMTP_HOST
      delete process.env.SMTP_USER
      delete process.env.SMTP_PASS

      const response = await GET()
      const body = await response.json()

      expect(body.data.configured).toBe(false)
      expect(body.data.missing).toContain('SMTP_HOST')
    })
  })
})
