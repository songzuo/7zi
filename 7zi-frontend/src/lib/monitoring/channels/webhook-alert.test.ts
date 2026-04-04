/**
 * Webhook Alert Channel Tests
 * Webhook 告警渠道测试
 *
 * Tests:
 * - Webhook payload building
 * - HTTP communication
 * - Custom payload templates
 * - Connection testing
 * - Configuration updates
 * - Timeout handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebhookAlertChannel } from './webhook-alert'
import { Alert } from '../alert-engine'

// Mock fetch
global.fetch = vi.fn()

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
  labels: {
    environment: 'production',
    team: 'platform',
  },
  ...overrides,
})

describe('WebhookAlertChannel', () => {
  let channel: WebhookAlertChannel

  const defaultConfig = {
    url: 'https://webhook.example.com/alerts',
    method: 'POST' as const,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
  }

  beforeEach(() => {
    channel = new WebhookAlertChannel(defaultConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Webhook Payload Building', () => {
    it('should build standard payload with all required fields', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload).toMatchObject({
        alert_id: 'alert-1',
        rule_id: 'rule-1',
        rule_name: 'CPU Usage High',
        priority: 'P1',
        severity: 'error',
        status: 'firing',
        metric: 'cpu_usage',
        message: 'CPU usage exceeded threshold',
        value: 90,
        threshold: 80,
      })
    })

    it('should include timestamp in ISO format', async () => {
      const timestamp = Date.now()
      const alert = createMockAlert({ timestamp })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.timestamp).toBe(timestamp)
      expect(payload.timestamp_iso).toBe(new Date(timestamp).toISOString())
    })

    it('should include started_at in ISO format', async () => {
      const startedAt = Date.now()
      const alert = createMockAlert({ startedAt })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.started_at).toBe(startedAt)
      expect(payload.started_at_iso).toBe(new Date(startedAt).toISOString())
    })

    it('should include ended_at when present', async () => {
      const endedAt = Date.now()
      const alert = createMockAlert({ endedAt })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.ended_at).toBe(endedAt)
      expect(payload.ended_at_iso).toBe(new Date(endedAt).toISOString())
    })

    it('should include context when configured', async () => {
      const alert = createMockAlert({
        context: {
          host: 'server-1',
          region: 'us-east-1',
          cpu_cores: 8,
        },
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.context).toEqual({
        host: 'server-1',
        region: 'us-east-1',
        cpu_cores: 8,
      })
    })

    it('should exclude context when not configured', async () => {
      const channelWithoutContext = new WebhookAlertChannel({
        ...defaultConfig,
        includeContext: false,
      })

      const alert = createMockAlert({
        context: {
          host: 'server-1',
        },
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channelWithoutContext.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.context).toBeUndefined()
    })

    it('should include labels when present', async () => {
      const alert = createMockAlert({
        labels: {
          environment: 'production',
          team: 'platform',
        },
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.labels).toEqual({
        environment: 'production',
        team: 'platform',
      })
    })
  })

  describe('Custom Payload Builder', () => {
    it('should use custom payload builder when provided', async () => {
      const customPayload = vi.fn((alert: Alert) => ({
        custom_field: 'custom_value',
        alert_id: alert.id,
        custom_metric: `${alert.metric}:${alert.value}`,
      }))

      const channelWithCustomPayload = new WebhookAlertChannel({
        ...defaultConfig,
        customPayload,
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channelWithCustomPayload.send(alert)

      expect(customPayload).toHaveBeenCalledWith(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload).toEqual({
        custom_field: 'custom_value',
        alert_id: 'alert-1',
        custom_metric: 'cpu_usage:90',
      })
    })

    it('should build custom payload with alert data', async () => {
      const customPayload = (alert: Alert) => ({
        event_type: 'alert',
        severity: alert.severity.toUpperCase(),
        data: {
          rule: alert.ruleName,
          metric: alert.metric,
          current: alert.value,
          expected: alert.threshold,
        },
      })

      const channelWithCustomPayload = new WebhookAlertChannel({
        ...defaultConfig,
        customPayload,
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channelWithCustomPayload.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.event_type).toBe('alert')
      expect(payload.severity).toBe('ERROR')
      expect(payload.data).toEqual({
        rule: 'CPU Usage High',
        metric: 'cpu_usage',
        current: 90,
        expected: 80,
      })
    })
  })

  describe('HTTP Communication', () => {
    it('should send POST request by default', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should send GET request when configured', async () => {
      const channelWithGet = new WebhookAlertChannel({
        ...defaultConfig,
        method: 'GET',
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channelWithGet.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should include custom headers', async () => {
      const channelWithCustomHeaders = new WebhookAlertChannel({
        ...defaultConfig,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer custom-token',
          'X-Custom-Header': 'custom-value',
        },
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channelWithCustomHeaders.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer custom-token',
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })

    it('should handle successful webhook response', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should throw error on failed webhook response', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(channel.send(alert)).rejects.toThrow('Webhook returned 500: Internal Server Error')
    })

    it('should handle network errors', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(channel.send(alert)).rejects.toThrow('Network error')
    })
  })

  describe('Timeout Handling', () => {
    it('should use default timeout', async () => {
      const alert = createMockAlert()

      ;(global.fetch as any).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ success: true }),
            })
          }, 5000)
        })
      })

      await expect(channel.send(alert)).resolves.not.toThrow()
    })

    it('should use custom timeout when configured', async () => {
      const channelWithTimeout = new WebhookAlertChannel({
        ...defaultConfig,
        timeout: 2000,
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ success: true }),
            })
          }, 1000)
        })
      })

      await expect(channelWithTimeout.send(alert)).resolves.not.toThrow()
    })

    it('should throw error on timeout', async () => {
      vi.useRealTimers() // Need real timers for timeout

      const channelWithShortTimeout = new WebhookAlertChannel({
        ...defaultConfig,
        timeout: 100,
      })

      const alert = createMockAlert()

      ;(global.fetch as any).mockImplementation(() => {
        return new Promise(() => {
          // Never resolve
        })
      })

      try {
        await expect(channelWithShortTimeout.send(alert)).rejects.toThrow()
      } finally {
        vi.useFakeTimers() // Restore fake timers
      }
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })

      const result = await channel.testConnection()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      )
    })

    it('should handle connection test failure', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })

    it('should handle connection test network error', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('Configuration Updates', () => {
    it('should update webhook URL', () => {
      channel.updateConfig({ url: 'https://new-webhook.example.com/alerts' })

      const config = channel.getConfig()
      expect(config.url).toBe('https://new-webhook.example.com/alerts')
    })

    it('should update HTTP method', () => {
      channel.updateConfig({ method: 'PUT' })

      const config = channel.getConfig()
      expect(config.method).toBe('PUT')
    })

    it('should update headers', () => {
      channel.updateConfig({
        headers: {
          'Authorization': 'Bearer new-token',
          'X-New-Header': 'new-value',
        },
      })

      const config = channel.getConfig()
      expect(config.headers?.['Authorization']).toBe('Bearer new-token')
      expect(config.headers?.['X-New-Header']).toBe('new-value')
    })

    it('should update includeContext option', () => {
      channel.updateConfig({ includeContext: false })

      const config = channel.getConfig()
      expect(config.includeContext).toBe(false)
    })

    it('should update timeout', () => {
      channel.updateConfig({ timeout: 30000 })

      const config = channel.getConfig()
      expect(config.timeout).toBe(30000)
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
      const newDedupConfig = {
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
      expect(config.url).toBe('https://webhook.example.com/alerts')
      expect(config.method).toBe('POST')
      expect(config.headers).toBeDefined()
      expect(config.includeContext).toBe(true)
      expect(config.timeout).toBe(10000)
    })

    it('should return a copy of configuration', () => {
      const config1 = channel.getConfig()
      const config2 = channel.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('Channel Key for Dedup and Rate Limit', () => {
    it('should use URL in channel key', () => {
      const channelKey = (channel as any).getChannelKey()

      expect(channelKey).toBe('webhook:https://webhook.example.com/alerts')
    })

    it('should use different channel keys for different URLs', () => {
      const channel1 = new WebhookAlertChannel({
        ...defaultConfig,
        url: 'https://webhook1.example.com/alerts',
      })

      const channel2 = new WebhookAlertChannel({
        ...defaultConfig,
        url: 'https://webhook2.example.com/alerts',
      })

      const key1 = (channel1 as any).getChannelKey()
      const key2 = (channel2 as any).getChannelKey()

      expect(key1).not.toBe(key2)
    })
  })

  describe('Integration Tests', () => {
    it('should handle alert with context, labels, and ended time', async () => {
      const alert = createMockAlert({
        endedAt: Date.now(),
        context: {
          host: 'server-1',
          region: 'us-east-1',
        },
        labels: {
          environment: 'production',
        },
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(fetchCall[1].body)

      expect(payload.context).toBeDefined()
      expect(payload.labels).toBeDefined()
      expect(payload.ended_at).toBeDefined()
      expect(payload.ended_at_iso).toBeDefined()
    })
  })
})