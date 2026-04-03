/**
 * Email Channel Tests
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Skip tests if nodemailer is not available
const nodemailerAvailable = (() => {
  try {
    require.resolve('nodemailer')
    return true
  } catch {
    return false
  }
})()

// Mock nodemailer before importing
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn(() => Promise.resolve(true)),
      sendMail: vi.fn(() => Promise.resolve({ messageId: 'test-id' })),
      close: vi.fn(() => Promise.resolve()),
    })),
  },
}))

// Mock formatting utilities
vi.mock('@/lib/utils/formatting', () => ({
  formatEmailAlert: vi.fn(() => ({
    subject: 'Test Alert',
    text: 'Test body',
    html: '<p>Test body</p>',
  })),
  formatTimestamp: vi.fn((ts) => new Date(ts).toISOString()),
  getLevelEmoji: vi.fn((level) => {
    const emojis: Record<string, string> = { info: 'ℹ️', warning: '⚠️', error: '❌', critical: '🚨' }
    return emojis[level] || '📢'
  }),
}))

import { EmailChannel } from './email'
import type { PerformanceAlert } from '../alerter'

const describeIf = nodemailerAvailable ? describe : describe.skip

describeIf('EmailChannel', () => {
  let channel: EmailChannel
  let mockAlert: PerformanceAlert

  beforeEach(() => {
    channel = new EmailChannel(
      {
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        password: 'password',
        from: 'alerts@example.com',
        to: ['recipient@example.com'],
      },
      {
        includeMetadata: true,
      }
    )

    mockAlert = {
      id: 'test-alert-1',
      title: 'Test Alert',
      message: 'This is a test alert',
      level: 'warning',
      category: 'performance',
      status: 'active',
      source: 'test-source',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      occurrenceCount: 1,
    } as PerformanceAlert
  })

  afterEach(async () => {
    await channel.close()
  })

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(channel.name).toBe('email')
    })

    it('should accept custom options', () => {
      const customChannel = new EmailChannel(
        {
          host: 'smtp.example.com',
          port: 587,
          user: 'test@example.com',
          password: 'password',
          from: 'alerts@example.com',
        },
        {
          to: ['custom@example.com'],
          priority: 'high',
        }
      )

      const options = customChannel.getOptions()
      expect(options.to).toEqual(['custom@example.com'])
      expect(options.priority).toBe('high')
    })
  })

  describe('send', () => {
    it('should send alert successfully', async () => {
      await expect(channel.send(mockAlert)).resolves.not.toThrow()
    })

    it('should handle alerts with no recipients', async () => {
      const noRecipientChannel = new EmailChannel({
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        password: 'password',
        from: 'alerts@example.com',
      })

      await expect(noRecipientChannel.send(mockAlert)).resolves.not.toThrow()
      await noRecipientChannel.close()
    })

    it('should handle send errors', async () => {
      const failingChannel = new EmailChannel(
        {
          host: 'smtp.example.com',
          port: 587,
          user: 'test@example.com',
          password: 'password',
          from: 'alerts@example.com',
          to: ['recipient@example.com'],
        },
        {
          includeMetadata: true,
        }
      )

      // Re-mock sendMail to fail
      const nodemailer = require('nodemailer')
      const mockTransporter = nodemailer.default.createTransport()
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP error'))

      await expect(failingChannel.send(mockAlert)).rejects.toThrow('SMTP error')
      await failingChannel.close()
    })
  })

  describe('test', () => {
    it('should test connectivity successfully', async () => {
      const result = await channel.test()
      expect(result).toBe(true)
    })

    it('should handle test failures', async () => {
      const failingChannel = new EmailChannel({
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        password: 'password',
        from: 'alerts@example.com',
      })

      const nodemailer = require('nodemailer')
      const mockTransporter = nodemailer.default.createTransport()
      mockTransporter.verify.mockRejectedValueOnce(new Error('Connection failed'))

      const result = await failingChannel.test()
      expect(result).toBe(false)
      await failingChannel.close()
    })
  })

  describe('options management', () => {
    it('should update options', () => {
      channel.updateOptions({
        to: ['new@example.com'],
        priority: 'high',
      })

      const options = channel.getOptions()
      expect(options.to).toEqual(['new@example.com'])
      expect(options.priority).toBe('high')
    })

    it('should merge options on update', () => {
      channel.updateOptions({ to: ['new@example.com'] })
      channel.updateOptions({ priority: 'high' })

      const options = channel.getOptions()
      expect(options.to).toEqual(['new@example.com'])
      expect(options.priority).toBe('high')
      expect(options.includeMetadata).toBe(true) // Original option preserved
    })
  })

  describe('close', () => {
    it('should close transporter', async () => {
      await channel.close()
      // Should not throw
      await channel.close()
    })
  })
})