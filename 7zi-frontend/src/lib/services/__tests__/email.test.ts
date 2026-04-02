/**
 * Email Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EmailService, emailService } from '../email'
import { logger } from '@/lib/logger'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch
global.fetch = vi.fn()

describe('EmailService', () => {
  let service: EmailService

  beforeEach(() => {
    service = new EmailService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      const config = {
        apiKey: 'test-api-key',
        fromEmail: 'noreply@test.com',
        replyTo: 'reply@test.com',
      }

      service.initialize(config)

      expect(service.isEnabled()).toBe(true)
      expect(logger.log).toHaveBeenCalledWith('[EmailService] Email service initialized')
    })

    it('should be disabled when API key is missing', () => {
      const config = {
        apiKey: '',
        fromEmail: 'noreply@test.com',
      }

      service.initialize(config)

      expect(service.isEnabled()).toBe(false)
      expect(logger.warn).toHaveBeenCalledWith(
        '[EmailService] Email service disabled: No API key provided'
      )
    })

    it('should return correct status', () => {
      const config = {
        apiKey: 'test-key',
        fromEmail: 'noreply@test.com',
      }

      const statusBefore = service.getStatus()
      expect(statusBefore.enabled).toBe(false)
      expect(statusBefore.configured).toBe(false)

      service.initialize(config)

      const statusAfter = service.getStatus()
      expect(statusAfter.enabled).toBe(true)
      expect(statusAfter.configured).toBe(true)
    })
  })

  describe('sendEmail', () => {
    beforeEach(() => {
      service.initialize({
        apiKey: 'test-key',
        fromEmail: 'noreply@test.com',
      })
    })

    it('should send email successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      const result = await service.sendEmail({
        to: { email: 'user@test.com', name: 'Test User' },
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test Email'),
        })
      )

      expect(logger.log).toHaveBeenCalledWith('[EmailService] Email sent successfully:', 'msg-123')
    })

    it('should handle single recipient', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: { email: 'user@test.com', name: 'Test User' },
        subject: 'Test',
        html: '<p>Content</p>',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.to).toContain('Test User <user@test.com>')
    })

    it('should handle multiple recipients', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: [
          { email: 'user1@test.com', name: 'User 1' },
          { email: 'user2@test.com', name: 'User 2' },
        ],
        subject: 'Test',
        html: '<p>Content</p>',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.to).toHaveLength(2)
      expect(body.to[0]).toContain('User 1 <user1@test.com>')
      expect(body.to[1]).toContain('User 2 <user2@test.com>')
    })

    it('should handle CC recipients', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: { email: 'to@test.com' },
        cc: [{ email: 'cc@test.com' }],
        subject: 'Test',
        html: '<p>Content</p>',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.cc).toContain('cc@test.com')
    })

    it('should handle BCC recipients', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: { email: 'to@test.com' },
        bcc: [{ email: 'bcc@test.com' }],
        subject: 'Test',
        html: '<p>Content</p>',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.bcc).toContain('bcc@test.com')
    })

    it('should handle tags', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: { email: 'user@test.com' },
        subject: 'Test',
        html: '<p>Content</p>',
        tags: [{ name: 'category', value: 'notification' }],
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.tags).toEqual([{ name: 'category', value: 'notification' }])
    })

    it('should return error when service is not enabled', async () => {
      const disabledService = new EmailService()

      const result = await disabledService.sendEmail({
        to: { email: 'user@test.com' },
        subject: 'Test',
        html: '<p>Content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not enabled')
    })

    it('should validate required fields', async () => {
      const result = await service.sendEmail({
        to: [],
        subject: '',
        html: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Recipient is required')
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      })

      const result = await service.sendEmail({
        to: { email: 'user@test.com' },
        subject: 'Test',
        html: '<p>Content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')

      expect(logger.error).toHaveBeenCalledWith(
        '[EmailService] Failed to send email:',
        expect.any(Error)
      )
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await service.sendEmail({
        to: { email: 'user@test.com' },
        subject: 'Test',
        html: '<p>Content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should use replyTo when provided', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendEmail({
        to: { email: 'user@test.com' },
        subject: 'Test',
        html: '<p>Content</p>',
        replyTo: 'custom@test.com',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.from).toBe('custom@test.com')
    })
  })

  describe('sendNotificationEmail', () => {
    beforeEach(() => {
      service.initialize({
        apiKey: 'test-key',
        fromEmail: 'noreply@test.com',
      })
    })

    it('should send notification email with standard template', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      const result = await service.sendNotificationEmail({
        to: { email: 'user@test.com' },
        title: 'Test Notification',
        message: 'Test message content',
        type: 'info',
      })

      expect(result.success).toBe(true)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.subject).toBe('[7zi] Test Notification')
      expect(body.html).toContain('Test Notification')
      expect(body.html).toContain('Test message content')
      expect(body.html).toContain('#3b82f6') // info color
    })

    it('should include action button when actionUrl is provided', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendNotificationEmail({
        to: { email: 'user@test.com' },
        title: 'Action Required',
        message: 'Please review',
        type: 'warning',
        actionUrl: 'https://example.com/action',
        actionText: 'Review Now',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.html).toContain('https://example.com/action')
      expect(body.html).toContain('Review Now')
    })

    it('should include metadata when provided', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendNotificationEmail({
        to: { email: 'user@test.com' },
        title: 'Test',
        message: 'Test message',
        type: 'info',
        metadata: { taskId: 'task-123', projectId: 'proj-456' },
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.html).toContain('task-123')
      expect(body.html).toContain('proj-456')
    })

    it('should handle different notification types with correct colors', async () => {
      const types = ['info' as const, 'success' as const, 'warning' as const, 'error' as const]
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

      for (let i = 0; i < types.length; i++) {
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ id: `msg-${i}` }),
        })

        await service.sendNotificationEmail({
          to: { email: 'user@test.com' },
          title: 'Test',
          message: 'Message',
          type: types[i],
        })

        const fetchCall = (global.fetch as any).mock.calls[i]
        const body = JSON.parse(fetchCall[1].body)

        expect(body.html).toContain(colors[i])
      }
    })

    it('should generate both HTML and plain text versions', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      await service.sendNotificationEmail({
        to: { email: 'user@test.com' },
        title: 'Test',
        message: 'Test message',
        type: 'info',
      })

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.html).toBeTruthy()
      expect(body.text).toBeTruthy()
      expect(body.html).toContain('<html>')
      expect(body.text).toContain('Test')
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(emailService).toBeInstanceOf(EmailService)
    })
  })
})
