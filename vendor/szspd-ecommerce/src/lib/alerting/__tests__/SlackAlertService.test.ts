/**
 * Slack Alert Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackAlertService, parseSlackConfig, createSlackAlertService } from '../SlackAlertService'
import type { PerformanceAlert } from '@/lib/performance/alerting/alerter'
import type { SlackAttachmentField } from '../SlackAlertService'

// ========================================
// Mock fetch
// ========================================

const mockFetch = vi.fn()
global.fetch = mockFetch

// ========================================
// Test Data
// ========================================

const mockWebhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'

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

const mockAlertWithTags: PerformanceAlert = {
  ...mockAlert,
  tags: ['production', 'critical'],
}

// ========================================
// Tests
// ========================================

describe('SlackAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create service with valid config', () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      expect(service.name).toBe('slack')
      expect(service.isEnabled()).toBe(true)
    })

    it('should throw error without webhook URL', () => {
      expect(() => {
        new SlackAlertService({
          webhookUrl: '',
          enabled: true,
        })
      }).toThrow('Slack webhook URL is required')
    })

    it('should throw error with invalid webhook URL', () => {
      expect(() => {
        new SlackAlertService({
          webhookUrl: 'https://example.com/webhook',
          enabled: true,
        })
      }).toThrow('Invalid Slack webhook URL')
    })

    it('should use default values for optional config', () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      expect(service.isEnabled()).toBe(true)
    })
  })

  describe('send()', () => {
    it('should send alert successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      await expect(service.send(mockAlert)).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        mockWebhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)

      expect(payload.text).toContain('CPU Usage High')
      expect(payload.attachments).toHaveLength(1)
      expect(payload.attachments[0].color).toBe('#dc2626') // critical color
      expect(payload.attachments[0].title).toBe('CPU Usage High')
      expect(payload.attachments[0].footer).toBe('7zi Monitoring')
    })

    it('should skip sending when disabled', async () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: false,
      })

      await expect(service.send(mockAlert)).resolves.not.toThrow()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should skip alerts below minimum level', async () => {
      const infoAlert: PerformanceAlert = {
        ...mockAlert,
        level: 'info',
      }

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        minLevel: 'warning',
      })

      await expect(service.send(infoAlert)).resolves.not.toThrow()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should include metadata in message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      await service.send(mockAlertWithMetadata)

      const callArgs = mockFetch.mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)

      const detailsField = payload.attachments[0].fields.find((f: SlackAttachmentField) => f.title === 'Details')
      expect(detailsField).toBeDefined()
      expect(detailsField.value).toContain('server')
      expect(detailsField.value).toContain('prod-01')
    })

    it('should include tags in message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      await service.send(mockAlertWithTags)

      const callArgs = mockFetch.mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)

      const tagsField = payload.attachments[0].fields.find((f: SlackAttachmentField) => f.title === 'Tags')
      expect(tagsField).toBeDefined()
      expect(tagsField.value).toBe('production, critical')
    })

    it('should use custom channel and username', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        channel: '#alerts',
        username: 'Custom Bot',
        iconEmoji: ':robot_face:',
      })

      await service.send(mockAlert)

      const callArgs = mockFetch.mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)

      expect(payload.channel).toBe('#alerts')
      expect(payload.username).toBe('Custom Bot')
      expect(payload.icon_emoji).toBe(':robot_face:')
    })

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'ok',
        })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        retry: {
          maxAttempts: 3,
          delayMs: 10,
          backoffMultiplier: 2,
        },
      })

      await expect(service.send(mockAlert)).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('ETIMEDOUT'))

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        retry: {
          maxAttempts: 2,
          delayMs: 10,
          backoffMultiplier: 2,
        },
      })

      await expect(service.send(mockAlert)).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on invalid webhook errors', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid webhook URL'))

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        retry: {
          maxAttempts: 3,
          delayMs: 10,
          backoffMultiplier: 2,
        },
      })

      await expect(service.send(mockAlert)).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('test()', () => {
    it('should test webhook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      const result = await service.test()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const callArgs = mockFetch.mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)

      expect(payload.text).toContain('Test Alert')
    })

    it('should return false on test failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      const result = await service.test()

      expect(result).toBe(false)
    })
  })

  describe('getStatus()', () => {
    it('should return current status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      await service.send(mockAlert)

      const status = service.getStatus()

      expect(status.enabled).toBe(true)
      expect(status.totalSent).toBe(1)
      expect(status.totalFailed).toBe(0)
      expect(status.lastSendSuccess).toBeDefined()
    })

    it('should track failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        retry: {
          maxAttempts: 1,
          delayMs: 10,
          backoffMultiplier: 2,
        },
      })

      try {
        await service.send(mockAlert)
      } catch {
        // Expected to fail
      }

      const status = service.getStatus()

      expect(status.totalFailed).toBe(1)
      expect(status.lastSendFailure).toBeDefined()
      expect(status.lastError).toBeDefined()
    })
  })

  describe('setEnabled()', () => {
    it('should enable/disable service', () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      service.setEnabled(false)
      expect(service.isEnabled()).toBe(false)

      service.setEnabled(true)
      expect(service.isEnabled()).toBe(true)
    })
  })

  describe('updateConfig()', () => {
    it('should update configuration', async () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      await expect(
        service.updateConfig({
          channel: '#new-channel',
          username: 'New Bot',
        })
      ).resolves.not.toThrow()

      const config = service.getConfig()
      expect(config.channel).toBe('#new-channel')
      expect(config.username).toBe('New Bot')
    })

    it('should reject invalid webhook URL', async () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
      })

      expect(() =>
        service.updateConfig({
          webhookUrl: 'https://example.com/webhook',
        })
      ).toThrow('Invalid Slack webhook URL')
    })
  })

  describe('getConfig()', () => {
    it('should return config with masked webhook URL', () => {
      const service = new SlackAlertService({
        webhookUrl: mockWebhookUrl,
        enabled: true,
        channel: '#alerts',
      })

      const config = service.getConfig()

      expect(config.webhookUrl).toContain('...')
      expect(config.channel).toBe('#alerts')
    })
  })
})

describe('parseSlackConfig()', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.SLACK_WEBHOOK_URL
    delete process.env.SLACK_ALERTING_ENABLED
    delete process.env.SLACK_ALERT_MIN_LEVEL
    delete process.env.SLACK_CHANNEL
    delete process.env.SLACK_USERNAME
    delete process.env.SLACK_ICON_EMOJI
    delete process.env.SLACK_RETRY_MAX_ATTEMPTS
    delete process.env.SLACK_RETRY_DELAY_MS
    delete process.env.SLACK_RETRY_BACKOFF
  })

  it('should parse config from environment variables', () => {
    process.env.SLACK_WEBHOOK_URL = mockWebhookUrl
    process.env.SLACK_ALERTING_ENABLED = 'true'
    process.env.SLACK_ALERT_MIN_LEVEL = 'error'
    process.env.SLACK_CHANNEL = '#alerts'
    process.env.SLACK_USERNAME = 'Test Bot'
    process.env.SLACK_ICON_EMOJI = ':test:'
    process.env.SLACK_RETRY_MAX_ATTEMPTS = '5'
    process.env.SLACK_RETRY_DELAY_MS = '2000'
    process.env.SLACK_RETRY_BACKOFF = '3'

    const config = parseSlackConfig()

    expect(config.webhookUrl).toBe(mockWebhookUrl)
    expect(config.enabled).toBe(true)
    expect(config.minLevel).toBe('error')
    expect(config.channel).toBe('#alerts')
    expect(config.username).toBe('Test Bot')
    expect(config.iconEmoji).toBe(':test:')
    expect(config.retry?.maxAttempts).toBe(5)
    expect(config.retry?.delayMs).toBe(2000)
    expect(config.retry?.backoffMultiplier).toBe(3)
  })

  it('should return disabled config when webhook URL is missing', () => {
    const config = parseSlackConfig()

    expect(config.webhookUrl).toBe('')
    expect(config.enabled).toBe(false)
  })

  it('should use default values when env vars are not set', () => {
    process.env.SLACK_WEBHOOK_URL = mockWebhookUrl

    const config = parseSlackConfig()

    expect(config.enabled).toBe(true)
    expect(config.minLevel).toBe('warning')
    expect(config.username).toBe('7zi Monitoring')
    expect(config.iconEmoji).toBe(':bell:')
    expect(config.retry?.maxAttempts).toBe(3)
    expect(config.retry?.delayMs).toBe(1000)
    expect(config.retry?.backoffMultiplier).toBe(2)
  })

  it('should handle explicit false for enabled', () => {
    process.env.SLACK_WEBHOOK_URL = mockWebhookUrl
    process.env.SLACK_ALERTING_ENABLED = 'false'

    const config = parseSlackConfig()

    expect(config.enabled).toBe(false)
  })
})

describe('createSlackAlertService()', () => {
  beforeEach(() => {
    delete process.env.SLACK_WEBHOOK_URL
    delete process.env.SLACK_ALERTING_ENABLED
  })

  it('should create service when configured', () => {
    process.env.SLACK_WEBHOOK_URL = mockWebhookUrl
    process.env.SLACK_ALERTING_ENABLED = 'true'

    const service = createSlackAlertService()

    expect(service).toBeInstanceOf(SlackAlertService)
    expect(service?.isEnabled()).toBe(true)
  })

  it('should return null when not configured', () => {
    const service = createSlackAlertService()

    expect(service).toBeNull()
  })

  it('should return null when disabled', () => {
    process.env.SLACK_WEBHOOK_URL = mockWebhookUrl
    process.env.SLACK_ALERTING_ENABLED = 'false'

    const service = createSlackAlertService()

    expect(service).toBeNull()
  })
})

describe('Message Formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should format info level correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
      minLevel: 'info', // Allow info level
    })

    const infoAlert: PerformanceAlert = {
      ...mockAlert,
      level: 'info',
    }

    await service.send(infoAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    expect(payload.attachments[0].color).toBe('#36a64f') // green
    expect(payload.text).toContain(':information_source:')
  })

  it('should format warning level correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
    })

    const warningAlert: PerformanceAlert = {
      ...mockAlert,
      level: 'warning',
    }

    await service.send(warningAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    expect(payload.attachments[0].color).toBe('#ff9900') // orange
    expect(payload.text).toContain(':warning:')
  })

  it('should format error level correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
    })

    const errorAlert: PerformanceAlert = {
      ...mockAlert,
      level: 'error',
    }

    await service.send(errorAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    expect(payload.attachments[0].color).toBe('#ff6b6b') // light red
    expect(payload.text).toContain(':x:')
  })

  it('should format critical level correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
    })

    await service.send(mockAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    expect(payload.attachments[0].color).toBe('#dc2626') // dark red
    expect(payload.text).toContain(':rotating_light:')
  })

  it('should include metric information', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
    })

    await service.send(mockAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    const metricField = payload.attachments[0].fields.find((f: SlackAttachmentField) => f.title === 'Metric')
    expect(metricField).toBeDefined()
    expect(metricField.value).toContain('cpu_usage')
    expect(metricField.value).toContain('95')
    expect(metricField.value).toContain('90')
  })

  it('should include occurrence count when > 1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    })

    const service = new SlackAlertService({
      webhookUrl: mockWebhookUrl,
      enabled: true,
    })

    const recurringAlert: PerformanceAlert = {
      ...mockAlert,
      occurrenceCount: 5,
    }

    await service.send(recurringAlert)

    const callArgs = mockFetch.mock.calls[0]
    const payload = JSON.parse(callArgs[1].body)

    const occurrencesField = payload.attachments[0].fields.find((f: SlackAttachmentField) => f.title === 'Occurrences')
    expect(occurrencesField).toBeDefined()
    expect(occurrencesField.value).toBe('5')
  })
})