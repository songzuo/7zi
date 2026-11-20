/**
 * Slack Channel Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SlackChannel } from './slack'
import type { PerformanceAlert } from '../alerter'

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('ok'),
  } as Response)
) as any

// Mock formatting utilities
vi.mock('@/lib/utils/formatting', () => ({
  formatSlackAlert: vi.fn((alert: any, options: any) => ({
    text: options?.mention ? `${options.mention} Test alert message` : 'Test alert message',
    attachments: [
      {
        color: '#daa038',
        title: 'Test Alert',
        text: 'This is a test alert',
        fields: [],
        footer: options?.footer || 'Test',
        ts: 1234567890,
      },
    ],
  })),
  getSlackLevelEmoji: vi.fn((level) => {
    const emojis: Record<string, string> = { info: 'ℹ️', warning: '⚠️', error: '❌', critical: '🚨' }
    return emojis[level] || '📢'
  }),
  getLevelColor: vi.fn((level) => {
    const colors: Record<string, string> = { info: '#36a64f', warning: '#daa038', error: '#dc3545', critical: '#b60205' }
    return colors[level] || '#808080'
  }),
  formatTimestamp: vi.fn((ts) => new Date(ts).toISOString()),
}))

describe('SlackChannel', () => {
  let channel: SlackChannel
  let mockAlert: PerformanceAlert

  beforeEach(() => {
    vi.clearAllMocks()

    channel = new SlackChannel(
      {
        webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        username: 'TestBot',
        iconEmoji: ':robot_face:',
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(channel.name).toBe('slack')
    })

    it('should accept custom options', () => {
      const customChannel = new SlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          channel: '#alerts',
          mention: '@oncall',
        }
      )

      const options = customChannel.getOptions()
      expect(options.channel).toBe('#alerts')
      expect(options.mention).toBe('@oncall')
    })
  })

  describe('send', () => {
    it('should send alert successfully', async () => {
      await expect(channel.send(mockAlert)).resolves.not.toThrow()

      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/TEST/TEST/TEST',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should include channel override', async () => {
      const channelOverride = new SlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          channel: '#custom-channel',
        }
      )

      await channelOverride.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.channel).toBe('#custom-channel')
    })

    it('should handle webhook errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(channel.send(mockAlert)).rejects.toThrow('Slack webhook failed: 500')
    })

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(channel.send(mockAlert)).rejects.toThrow('Network error')
    })
  })

  describe('test', () => {
    it('should test webhook successfully', async () => {
      const result = await channel.test()
      expect(result).toBe(true)
    })

    it('should handle test failures', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      })

      const result = await channel.test()
      expect(result).toBe(false)
    })

    it('should handle test network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await channel.test()
      expect(result).toBe(false)
    })
  })

  describe('options management', () => {
    it('should update options', () => {
      channel.updateOptions({
        channel: '#new-channel',
        mention: '@team',
      })

      const options = channel.getOptions()
      expect(options.channel).toBe('#new-channel')
      expect(options.mention).toBe('@team')
    })

    it('should merge options on update', () => {
      channel.updateOptions({ channel: '#new-channel' })
      channel.updateOptions({ mention: '@team' })

      const options = channel.getOptions()
      expect(options.channel).toBe('#new-channel')
      expect(options.mention).toBe('@team')
      expect(options.includeMetadata).toBe(true) // Original option preserved
    })
  })

  describe('message formatting', () => {
    it('should include mention when configured', async () => {
      const mentionChannel = new SlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          mention: '@oncall',
        }
      )

      await mentionChannel.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.text).toContain('@oncall')
    })

    it('should include custom footer when configured', async () => {
      const footerChannel = new SlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          footer: 'Custom Footer',
        }
      )

      await footerChannel.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.attachments[0].footer).toBe('Custom Footer')
    })
  })
})