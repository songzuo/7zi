/**
 * Email Alert Channel Tests
 * 邮件告警渠道测试
 *
 * Tests:
 * - Email message building
 * - Recipient selection by priority
 * - HTML and text content generation
 * - Connection testing
 * - Configuration updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailAlertChannel } from './email-alert'
import { Alert } from '../alert-engine'
import type { DedupConfig } from './base-alert-channel'

/**
 * P0-3 安全修复：nodemailer 已迁移到服务端路由 `/api/email`，
 * 因此这里 mock 的是 global fetch，而不是 nodemailer。
 */
let fetchMock: ReturnType<typeof vi.fn>

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response

// Mock alert for testing
const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  ruleId: 'rule-1',
  ruleName: 'CPU Usage High',
  priority: 'P1',
  severity: 'error',
  status: 'firing',
  metric: 'cpu_usage',
  message: 'CPU usage exceeded threshold',
  value: 90,
  threshold: 80,
  timestamp: Date.now(),
  startedAt: Date.now(),
  fingerprint: 'cpu_usage:90',
  context: {
    host: 'server-1',
    region: 'us-east-1',
  },
  ...overrides,
})

describe('EmailAlertChannel', () => {
  let channel: EmailAlertChannel

  const defaultConfig = {
    enabled: true,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'password',
    },
    from: 'alerts@example.com',
    recipients: {
      P0: ['admin@example.com'],
      P1: ['ops@example.com'],
      P2: ['dev@example.com'],
      P3: ['info@example.com'],
    },
  }

  beforeEach(() => {
    channel = new EmailAlertChannel(defaultConfig)
    vi.clearAllMocks()
    fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { messageId: 'test-message-id', accepted: [], rejected: [] },
      })
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('Email Message Building', () => {
    it('should build email with correct subject', async () => {
      const alert = createMockAlert()

      // Mock sendInternal to capture the message
      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should include context in email when configured', async () => {
      const configWithContext = {
        ...defaultConfig,
        includeContext: true,
      }

      channel = new EmailAlertChannel(configWithContext)

      const alert = createMockAlert({
        context: {
          host: 'server-1',
          region: 'us-east-1',
          cpu_cores: 8,
        },
      })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should exclude context when not configured', async () => {
      const configWithoutContext = {
        ...defaultConfig,
        includeContext: false,
      }

      channel = new EmailAlertChannel(configWithoutContext)

      const alert = createMockAlert({
        context: {
          host: 'server-1',
        },
      })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('Recipient Selection', () => {
    it('should select recipients based on P0 priority', async () => {
      const alert = createMockAlert({ priority: 'P0' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should select recipients based on P1 priority', async () => {
      const alert = createMockAlert({ priority: 'P1' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should select recipients based on P2 priority', async () => {
      const alert = createMockAlert({ priority: 'P2' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should select recipients based on P3 priority', async () => {
      const alert = createMockAlert({ priority: 'P3' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should include "all" recipients when configured', async () => {
      const configWithAll = {
        ...defaultConfig,
        recipients: {
          ...defaultConfig.recipients,
          all: ['everyone@example.com'],
        },
      }

      channel = new EmailAlertChannel(configWithAll)

      const alert = createMockAlert({ priority: 'P1' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should fallback to P3 recipients when priority not found', async () => {
      const configWithMissingPriority = {
        ...defaultConfig,
        recipients: {
          P0: ['admin@example.com'],
          P1: ['ops@example.com'],
          P2: ['dev@example.com'],
          P3: ['info@example.com'],
        },
      }

      channel = new EmailAlertChannel(configWithMissingPriority)

      const alert = createMockAlert({ priority: 'P1' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('HTML Content Generation', () => {
    it('should generate HTML with severity color', async () => {
      const alert = createMockAlert({ severity: 'critical' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should generate HTML with priority badge', async () => {
      const alert = createMockAlert({ priority: 'P0' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should include metric value in HTML', async () => {
      const alert = createMockAlert({ value: 95.5 })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('Text Content Generation', () => {
    it('should generate text with all alert details', async () => {
      const alert = createMockAlert()

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should format context in text output', async () => {
      const alert = createMockAlert({
        context: {
          host: 'server-1',
          region: 'us-east-1',
          nested: {
            key: 'value',
          },
        },
      })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('Severity and Priority Styling', () => {
    it('should use correct emoji for critical severity', async () => {
      const alert = createMockAlert({ severity: 'critical' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should use correct emoji for error severity', async () => {
      const alert = createMockAlert({ severity: 'error' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should use correct emoji for warning severity', async () => {
      const alert = createMockAlert({ severity: 'warning' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should use correct emoji for info severity', async () => {
      const alert = createMockAlert({ severity: 'info' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should use correct color for P0 priority', async () => {
      const alert = createMockAlert({ priority: 'P0' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })

    it('should use correct color for P1 priority', async () => {
      const alert = createMockAlert({ priority: 'P1' })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully via the server API', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: true, data: { verified: true, host: 'smtp.example.com' } })
      )

      const result = await channel.testConnection()

      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/email')
      expect(JSON.parse(init.body).action).toBe('test')
    })

    it('should handle connection test failure', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: false, error: 'ECONNREFUSED' }, 500))

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })

    it('should handle connection test network error', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('Sending via server API', () => {
    it('should send through POST /api/email without importing nodemailer', async () => {
      const alert = createMockAlert()

      await channel.send(alert)

      expect(fetchMock).toHaveBeenCalled()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/email')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.action).toBe('send')
      expect(body.to).toBe('ops@example.com')
      expect(body.subject).toContain('CPU Usage High')
    })

    it('should fall back to console logging when SMTP is not configured (503)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'SMTP is not configured on the server.' }, 503)
      )

      const alert = createMockAlert()

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should fall back to console logging when the API is unreachable', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const alert = createMockAlert()

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should throw when the server reports a real send failure', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ success: false, error: 'Invalid login credentials' }, 500)
      )

      const alert = createMockAlert()

      await expect(channel.send(alert)).rejects.toThrow('Invalid login credentials')
    })
  })

  describe('Configuration Updates', () => {
    it('should update email configuration', () => {
      const newConfig = {
        from: 'new-alerts@example.com',
        includeContext: false,
      }

      channel.updateConfig(newConfig)

      const config = channel.getConfig()
      expect(config.from).toBe('new-alerts@example.com')
      expect(config.includeContext).toBe(false)
    })

    it('should update recipients configuration', () => {
      const newRecipients = {
        P0: ['new-admin@example.com'],
        P1: ['new-ops@example.com'],
        P2: ['new-dev@example.com'],
        P3: ['new-info@example.com'],
      }

      channel.updateConfig({ recipients: newRecipients })

      const config = channel.getConfig()
      expect(config.recipients.P0).toEqual(['new-admin@example.com'])
    })

    it('should update retry configuration', () => {
      const newRetryConfig = {
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 3,
      }

      channel.updateConfig({ retry: newRetryConfig })

      const config = channel.getConfig()
      expect(config.retry?.maxRetries).toBe(5)
    })

    it('should update dedup configuration', () => {
      const newDedupConfig: DedupConfig = {
        enabled: false,
        windowMs: 30000,
        keys: ['ruleId', 'priority'],
      }

      channel.updateConfig({ dedup: newDedupConfig })

      const config = channel.getConfig()
      expect(config.dedup?.enabled).toBe(false)
    })

    it('should update rate limit configuration', () => {
      const newRateLimitConfig = {
        maxAlertsPerMinute: 5,
        maxAlertsPerHour: 50,
      }

      channel.updateConfig({ rateLimit: newRateLimitConfig })

      const config = channel.getConfig()
      expect(config.rateLimit?.maxAlertsPerMinute).toBe(5)
    })
  })

  describe('Get Configuration', () => {
    it('should return current configuration', () => {
      const config = channel.getConfig()

      expect(config).toBeDefined()
      expect(config.host).toBe('smtp.example.com')
      expect(config.port).toBe(587)
      expect(config.from).toBe('alerts@example.com')
      expect(config.recipients).toBeDefined()
    })

    it('should return a copy of configuration', () => {
      const config1 = channel.getConfig()
      const config2 = channel.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('Alert with Ended Time', () => {
    it('should include ended time in email when present', async () => {
      const alert = createMockAlert({
        endedAt: Date.now(),
      })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })

  describe('Alert with Labels', () => {
    it('should include labels in email when present', async () => {
      const alert = createMockAlert({
        labels: {
          environment: 'production',
          team: 'platform',
        },
      })

      const sendInternalSpy = vi.spyOn(channel as any, 'sendInternal').mockResolvedValue(undefined)

      await channel.send(alert)

      expect(sendInternalSpy).toHaveBeenCalled()
    })
  })
})