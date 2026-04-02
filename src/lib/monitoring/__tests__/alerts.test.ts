/**
 * Alerting Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  AlertDeduplication,
  AlertAggregator,
  AlertSystem,
  sendSlackAlert,
  sendEmailAlert,
  sendAlert,
  alerts,
  type AlertConfig,
  type AlertSeverity,
} from '../alerts'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AlertDeduplication', () => {
  let deduplication: AlertDeduplication

  beforeEach(() => {
    deduplication = new AlertDeduplication(3600000, 300000) // 1 hour TTL, 5 min cooldown
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createAlert = (title: string, severity: AlertSeverity = 'p2'): AlertConfig => ({
    severity,
    title,
    message: `Message for ${title}`,
  })

  describe('shouldSendAlert', () => {
    it('should send first occurrence of an alert', () => {
      const config = createAlert('Test Alert')
      const shouldSend = deduplication.shouldSendAlert(config)
      expect(shouldSend).toBe(true)
    })

    it('should not send duplicate alerts within cooldown period', () => {
      const config = createAlert('Duplicate Alert')

      // First send should pass
      expect(deduplication.shouldSendAlert(config)).toBe(true)

      // Immediate second send should be blocked
      expect(deduplication.shouldSendAlert(config)).toBe(false)
    })

    it('should send alert after cooldown period', async () => {
      const shortCooldown = new AlertDeduplication(3600000, 100) // 100ms cooldown
      const config = createAlert('Cooldown Test')

      expect(shortCooldown.shouldSendAlert(config)).toBe(true)
      expect(shortCooldown.shouldSendAlert(config)).toBe(false)

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(shortCooldown.shouldSendAlert(config)).toBe(true)
    })

    it('should track alert count', () => {
      const config = createAlert('Count Test')

      deduplication.shouldSendAlert(config)
      deduplication.shouldSendAlert(config)
      deduplication.shouldSendAlert(config)

      const stats = deduplication.getStats('Count Test:Message for Count Test:p2')
      expect(stats?.count).toBe(3)
    })

    it('should respect custom deduplication keys', () => {
      const config1: AlertConfig = {
        ...createAlert('Alert 1'),
        deduplicationKey: 'custom-key',
      }
      const config2: AlertConfig = {
        ...createAlert('Alert 2'),
        deduplicationKey: 'custom-key',
      }

      expect(deduplication.shouldSendAlert(config1)).toBe(true)
      expect(deduplication.shouldSendAlert(config2)).toBe(false)
    })
  })

  describe('clearExpired', () => {
    it('should clear expired entries', async () => {
      const shortTtl = new AlertDeduplication(100, 50) // 100ms TTL

      shortTtl.shouldSendAlert(createAlert('Expiring Alert'))

      // Wait for TTL
      await new Promise(resolve => setTimeout(resolve, 150))

      const cleared = shortTtl.clearExpired()
      expect(cleared).toBe(1)
    })
  })

  describe('getSummary', () => {
    it('should return summary of all alerts', () => {
      deduplication.shouldSendAlert(createAlert('Alert 1'))
      deduplication.shouldSendAlert(createAlert('Alert 2'))
      deduplication.shouldSendAlert(createAlert('Alert 1'))

      const summary = deduplication.getSummary()
      expect(summary.length).toBe(2)
      expect(summary.find(s => s.title === 'Alert 1')?.count).toBe(2)
    })
  })

  describe('clearAll', () => {
    it('should clear all entries', () => {
      deduplication.shouldSendAlert(createAlert('Alert 1'))
      deduplication.shouldSendAlert(createAlert('Alert 2'))

      deduplication.clearAll()

      const summary = deduplication.getSummary()
      expect(summary.length).toBe(0)
    })
  })
})

describe('AlertAggregator', () => {
  let aggregator: AlertAggregator

  beforeEach(() => {
    aggregator = new AlertAggregator(60000) // 1 minute window
  })

  const createAlert = (title: string, tags?: string[]): AlertConfig => ({
    severity: 'p2',
    title,
    message: `Message for ${title}`,
    tags,
    timestamp: new Date(),
  })

  describe('addAlert', () => {
    it('should add alerts to the window', () => {
      aggregator.addAlert(createAlert('Test Alert'))
      expect(aggregator.getCount()).toBe(1)
    })

    it('should aggregate multiple alerts', () => {
      aggregator.addAlert(createAlert('Alert 1'))
      aggregator.addAlert(createAlert('Alert 2'))
      aggregator.addAlert(createAlert('Alert 3'))

      expect(aggregator.getCount()).toBe(3)
    })
  })

  describe('getAggregatedAlerts', () => {
    it('should group alerts by tag', () => {
      aggregator.addAlert(createAlert('Alert 1', ['api']))
      aggregator.addAlert(createAlert('Alert 2', ['api']))
      aggregator.addAlert(createAlert('Alert 3', ['database']))

      const aggregated = aggregator.getAggregatedAlerts()

      expect(aggregated.get('api')?.count).toBe(2)
      expect(aggregated.get('database')?.count).toBe(1)
    })

    it('should group alerts by title when no tags', () => {
      aggregator.addAlert(createAlert('Same Title'))
      aggregator.addAlert(createAlert('Same Title'))
      aggregator.addAlert(createAlert('Different Title'))

      const aggregated = aggregator.getAggregatedAlerts()

      expect(aggregated.get('Same Title')?.count).toBe(2)
    })
  })

  describe('getBySeverity', () => {
    it('should filter alerts by severity', () => {
      aggregator.addAlert({ severity: 'p0', title: 'Critical', message: 'Critical' })
      aggregator.addAlert({ severity: 'p1', title: 'High', message: 'High' })
      aggregator.addAlert({ severity: 'p0', title: 'Critical 2', message: 'Critical' })

      const p0Alerts = aggregator.getBySeverity('p0')
      expect(p0Alerts.length).toBe(2)
    })
  })

  describe('clear', () => {
    it('should clear all alerts', () => {
      aggregator.addAlert(createAlert('Alert 1'))
      aggregator.addAlert(createAlert('Alert 2'))

      aggregator.clear()

      expect(aggregator.getCount()).toBe(0)
    })
  })
})

describe('AlertSystem', () => {
  let alertSystem: AlertSystem

  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })

    alertSystem = new AlertSystem({
      slack: {
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/test',
      },
      email: {
        enabled: true,
        apiKey: 'test-key',
        recipients: ['test@example.com'],
        from: 'alerts@test.com',
      },
      webhook: {
        enabled: true,
        url: 'https://webhook.example.com/alert',
      },
      discord: {
        enabled: true,
        webhookUrl: 'https://discord.com/api/webhooks/test',
      },
      telegram: {
        enabled: true,
        botToken: 'test-token',
        chatId: 'test-chat',
      },
      deduplication: {
        enabled: true,
        ttl: 3600000,
        cooldown: 300000,
      },
      aggregation: {
        enabled: true,
        windowMs: 60000,
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createAlert = (title: string, severity: AlertSeverity = 'p2'): AlertConfig => ({
    severity,
    title,
    message: `Message for ${title}`,
  })

  describe('sendAlert', () => {
    it('should send alert to all enabled channels', async () => {
      const config = createAlert('Test Alert', 'p0')
      const results = await alertSystem.sendAlert(config)

      expect(results.slack).toBe(true)
      expect(results.email).toBe(true)
      expect(results.webhook).toBe(true)
      expect(results.discord).toBe(true)
      expect(results.telegram).toBe(true)

      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('should not send duplicate alerts with deduplication enabled', async () => {
      const config = createAlert('Duplicate Test')

      await alertSystem.sendAlert(config)
      await alertSystem.sendAlert(config)

      // Should only send once (all channels combined)
      expect(mockFetch.mock.calls.length).toBeLessThan(10)
    })

    it('should respect severity threshold', async () => {
      const thresholdSystem = new AlertSystem({
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/test',
          severityThreshold: 'p1',
        },
      })

      // P2 alert should not be sent (below threshold)
      await thresholdSystem.sendAlert(createAlert('Low Priority', 'p2'))

      // P0 alert should be sent
      await thresholdSystem.sendAlert(createAlert('Critical', 'p0'))

      const slackCalls = mockFetch.mock.calls.filter(
        call => call[0] === 'https://hooks.slack.com/test'
      )
      expect(slackCalls.length).toBe(1)
    })

    it('should send to specific channels only', async () => {
      const config: AlertConfig = {
        ...createAlert('Specific Channels'),
        channels: ['slack', 'discord'],
      }

      await alertSystem.sendAlert(config)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('getAggregatedSummary', () => {
    it('should return aggregated alerts', async () => {
      await alertSystem.sendAlert({ ...createAlert('Test'), tags: ['api'] })
      await alertSystem.sendAlert({ ...createAlert('Test'), tags: ['api'] })

      const summary = alertSystem.getAggregatedSummary()
      expect(summary.size).toBeGreaterThan(0)
    })
  })

  describe('getDeduplicationSummary', () => {
    it('should return deduplication summary', async () => {
      await alertSystem.sendAlert(createAlert('Test 1'))
      await alertSystem.sendAlert(createAlert('Test 2'))

      const summary = alertSystem.getDeduplicationSummary()
      expect(summary.length).toBeGreaterThan(0)
    })
  })
})

describe('Backward Compatible Functions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('sendSlackAlert', () => {
    it('should send Slack alert when webhook is configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

      const result = await sendSlackAlert({
        severity: 'p1',
        title: 'Test Alert',
        message: 'Test message',
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return false when webhook is not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL

      const result = await sendSlackAlert({
        severity: 'p1',
        title: 'Test Alert',
        message: 'Test message',
      })

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await sendSlackAlert({
        severity: 'p1',
        title: 'Test Alert',
        message: 'Test message',
      })

      expect(result).toBe(false)
    })
  })

  describe('sendEmailAlert', () => {
    it('should send email alert when API key is configured', async () => {
      process.env.RESEND_API_KEY = 'test-key'

      const result = await sendEmailAlert({
        severity: 'p0',
        title: 'Critical Alert',
        message: 'Critical message',
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return false when API key is not configured', async () => {
      delete process.env.RESEND_API_KEY

      const result = await sendEmailAlert({
        severity: 'p0',
        title: 'Critical Alert',
        message: 'Critical message',
      })

      expect(result).toBe(false)
    })
  })

  describe('sendAlert', () => {
    it('should send to both Slack and email for critical alerts', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
      process.env.RESEND_API_KEY = 'test-key'

      const result = await sendAlert({
        severity: 'p0',
        title: 'Critical Alert',
        message: 'Critical message',
      })

      expect(result.slack).toBe(true)
      expect(result.email).toBe(true)
    })

    it('should only send Slack for non-critical alerts', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
      process.env.RESEND_API_KEY = 'test-key'

      const result = await sendAlert({
        severity: 'p3',
        title: 'Info Alert',
        message: 'Info message',
      })

      expect(result.slack).toBe(true)
      expect(result.email).toBe(false)
    })
  })
})

describe('Alert Helper Functions', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
    process.env.RESEND_API_KEY = 'test-key'
    // NODE_ENV is read-only in strict mode, skip setting it in tests
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('alerts.serviceDown', () => {
    it('should send P0 service down alert', async () => {
      await alerts.serviceDown('api-server', 'Connection refused')

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].title).toContain('Service Down')
      expect(body.attachments[0].title).toContain('CRITICAL')
    })
  })

  describe('alerts.errorRateSpike', () => {
    it('should send P1 error rate spike alert', async () => {
      await alerts.errorRateSpike(5.5, 1.2)

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].title).toContain('Error Rate Spike')
    })
  })

  describe('alerts.performanceDegradation', () => {
    it('should send P2 performance degradation alert', async () => {
      await alerts.performanceDegradation('LCP', 3500, 2500)

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].title).toContain('Performance Degradation')
    })
  })

  describe('alerts.sslExpiring', () => {
    it('should send P1 SSL expiring alert for < 7 days', async () => {
      await alerts.sslExpiring('example.com', 5)

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].title).toContain('SSL Certificate Expiring')
      expect(body.attachments[0].color).toBe('#FFA500') // P1 color
    })

    it('should send P2 SSL expiring alert for > 7 days', async () => {
      await alerts.sslExpiring('example.com', 14)

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].color).toBe('#FFFF00') // P2 color
    })
  })

  describe('alerts.newError', () => {
    it('should send P1 new error alert', async () => {
      await alerts.newError('TypeError: Cannot read property', 'TypeError')

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.attachments[0].title).toContain('New Error Type')
    })
  })
})

describe('Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty details in alert', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

    await sendSlackAlert({
      severity: 'p1',
      title: 'Test',
      message: 'Test',
      details: {},
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.attachments[0].fields).toBeUndefined()
  })

  it('should handle special characters in alert', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

    await sendSlackAlert({
      severity: 'p1',
      title: 'Test "quotes" and <brackets>',
      message: "Test with 'apostrophes' and newlines\n",
    })

    expect(mockFetch).toHaveBeenCalled()
  })

  it('should handle long messages', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

    const longMessage = 'A'.repeat(10000)

    await sendSlackAlert({
      severity: 'p1',
      title: 'Long Message Test',
      message: longMessage,
    })

    expect(mockFetch).toHaveBeenCalled()
  })

  it('should handle non-OK responses', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    const result = await sendSlackAlert({
      severity: 'p1',
      title: 'Test',
      message: 'Test',
    })

    expect(result).toBe(false)
  })
})
