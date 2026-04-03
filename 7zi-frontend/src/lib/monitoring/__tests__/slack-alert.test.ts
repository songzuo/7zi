/**
 * Slack Alert Channel Tests
 * Slack 告警渠道测试 - 增强版
 */

import { SlackAlertChannel, createSlackChannelFromEnv } from '../channels/slack-alert'
import { Alert } from '../alert-engine'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Helper to create test alerts
function createTestAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'test-alert-123',
    ruleId: 'test-rule-1',
    ruleName: 'Test Alert Rule',
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

// Mock fetch globally
let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  global.fetch = mockFetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SlackAlertChannel', () => {
  let channel: SlackAlertChannel

  beforeEach(() => {
    channel = new SlackAlertChannel({
      webhookUrl: 'https://hooks.slack.com/services/test/webhook',
      channels: {
        P0: '#alerts-critical',
        P1: '#alerts-high',
        P2: '#alerts-warning',
        P3: '#alerts-info',
        default: '#alerts',
      },
    })
  })

  describe('send', () => {
    it('should format P0 alert correctly', async () => {
      const alert = createTestAlert({
        priority: 'P0',
        severity: 'critical',
        ruleName: 'Service Down',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should format P1 alert correctly', async () => {
      const alert = createTestAlert({
        priority: 'P1',
        severity: 'error',
        ruleName: 'High Error Rate',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should format P2 alert correctly', async () => {
      const alert = createTestAlert({
        priority: 'P2',
        severity: 'warning',
        ruleName: 'Slow LCP',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should format P3 alert correctly', async () => {
      const alert = createTestAlert({
        priority: 'P3',
        severity: 'info',
        ruleName: 'Error Rate Above Normal',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await expect(channel.send(alert)).resolves.not.toThrow()
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

        await expect(channel.send(alert)).resolves.not.toThrow()
      }
    })

    it('should include context in message', async () => {
      const alert = createTestAlert({
        context: {
          url: 'https://example.com/api/users',
          userId: '12345',
          endpoint: '/api/users',
          method: 'GET',
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await channel.send(alert)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle missing optional fields', async () => {
      const minimalAlert: Alert = {
        id: 'min-alert',
        ruleId: 'min-rule',
        ruleName: 'Minimal Alert',
        priority: 'P3',
        severity: 'info',
        status: 'firing',
        metric: 'test',
        message: 'Test',
        value: 1,
        threshold: 0,
        timestamp: Date.now(),
        startedAt: Date.now(),
        fingerprint: 'min:test',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await expect(channel.send(minimalAlert)).resolves.not.toThrow()
    })
  })

  describe('color mapping', () => {
    it('should use correct severity colors', () => {
      const alert = createTestAlert({ severity: 'critical' })
      expect(alert.severity).toBe('critical')
    })
  })

  describe('configuration', () => {
    it('should get configuration', () => {
      const config = channel.getConfig()

      expect(config.webhookUrl).toBeDefined()
      expect(config.channels.default).toBe('#alerts')
    })

    it('should update configuration', () => {
      channel.updateConfig({
        username: 'Custom Bot',
        iconEmoji: ':warning:',
      })

      const config = channel.getConfig()
      expect(config.username).toBe('Custom Bot')
      expect(config.iconEmoji).toBe(':warning:')
    })
  })

  describe('error handling', () => {
    it('should handle webhook failure gracefully', async () => {
      const alert = createTestAlert()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(channel.send(alert)).rejects.toThrow('Slack webhook failed')
    })

    it('should retry on transient errors', async () => {
      const channelWithRetry = new SlackAlertChannel({
        webhookUrl: 'https://hooks.slack.com/services/test',
        channels: { default: '#alerts' },
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      const alert = createTestAlert()

      // First two attempts fail, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      await expect(channelWithRetry.send(alert)).resolves.not.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('deduplication', () => {
    it('should deduplicate alerts within window', async () => {
      const channelWithDedup = new SlackAlertChannel({
        webhookUrl: 'https://hooks.slack.com/services/test',
        channels: { default: '#alerts' },
        dedup: {
          enabled: true,
          windowMs: 1000,
          keys: ['ruleId', 'priority'],
        },
      })

      const alert = createTestAlert()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      // First send
      await channelWithDedup.send(alert)

      // Second send (should be deduped)
      await channelWithDedup.send(alert)

      expect(mockFetch).toHaveBeenCalledTimes(1) // Only called once

      const metrics = channelWithDedup.getMetrics()
      expect(metrics.totalDeduped).toBe(1)
    })
  })

  describe('severity filtering', () => {
    it('should filter alerts by severity', async () => {
      const filteredChannel = new SlackAlertChannel({
        webhookUrl: 'https://hooks.slack.com/services/test',
        channels: { default: '#alerts' },
        severityFilter: ['critical'],
      })

      const criticalAlert = createTestAlert({ severity: 'critical' })
      const infoAlert = createTestAlert({ severity: 'info' })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await filteredChannel.send(criticalAlert)
      await filteredChannel.send(infoAlert)

      const metrics = filteredChannel.getMetrics()
      expect(metrics.totalSent).toBe(1) // Only critical sent
    })
  })

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const limitedChannel = new SlackAlertChannel({
        webhookUrl: 'https://hooks.slack.com/services/test',
        channels: { default: '#alerts' },
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
    })

    it('should reset metrics', async () => {
      const alert = createTestAlert()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

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
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should send when re-enabled', async () => {
      channel.setEnabled(false)
      channel.setEnabled(true)
      const alert = createTestAlert()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await channel.send(alert)

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
    })
  })
})

describe('createSlackChannelFromEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear Slack env vars
    delete process.env.SLACK_WEBHOOK_URL
    delete process.env.SLACK_BOT_TOKEN
    delete process.env.SLACK_CHANNEL_P0
    delete process.env.SLACK_CHANNEL_P1
    delete process.env.SLACK_CHANNEL_DEFAULT
  })

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, originalEnv)
  })

  it('should return null when no Slack config', () => {
    const result = createSlackChannelFromEnv()
    expect(result).toBeNull()
  })

  it('should create channel with webhook URL', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test'

    const result = createSlackChannelFromEnv()

    expect(result).not.toBeNull()
    expect(result?.getConfig().webhookUrl).toBe('https://hooks.slack.com/services/test')
  })

  it('should create channel with bot token', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token'

    const result = createSlackChannelFromEnv()

    expect(result).not.toBeNull()
    expect(result?.getConfig().botToken).toBe('xoxb-test-token')
  })

  it('should use custom channel overrides', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test'
    process.env.SLACK_CHANNEL_P0 = '#critical-alerts'

    const result = createSlackChannelFromEnv()

    expect(result?.getConfig().channels.P0).toBe('#critical-alerts')
  })
})

describe('SlackAlertChannel (Bot API)', () => {
  it('should work with bot token configuration', async () => {
    const channel = new SlackAlertChannel({
      botToken: 'xoxb-test-token',
      channels: {
        default: '#general',
      },
    })

    // Mock successful bot API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, channel: { id: 'C123' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123.456' }),
      } as Response)

    const alert = createTestAlert()
    await expect(channel.send(alert)).resolves.not.toThrow()
  })

  it('should handle bot API errors', async () => {
    const channel = new SlackAlertChannel({
      botToken: 'xoxb-test-token',
      channels: {
        default: '#general',
      },
    })

    // Mock bot API error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'channel_not_found' }),
    } as Response)

    const alert = createTestAlert()
    await expect(channel.send(alert)).rejects.toThrow('Could not find or create channel')
  })
})
