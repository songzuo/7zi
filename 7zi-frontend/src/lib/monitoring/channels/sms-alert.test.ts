/**
 * SMS Alert Channel Tests
 * 短信告警渠道测试
 *
 * Tests:
 * - SMS message building
 * - Recipient selection by priority
 * - Message length truncation
 * - Gateway communication
 * - Connection testing
 * - Configuration updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SMSAlertChannel } from './sms-alert'
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
  ...overrides,
})

describe('SMSAlertChannel', () => {
  let channel: SMSAlertChannel

  const defaultConfig = {
    recipients: {
      P0: ['+1234567890'],
      P1: ['+1234567891'],
      P2: ['+1234567892'],
      P3: ['+1234567893'],
    },
  }

  const gatewayConfig = {
    ...defaultConfig,
    gatewayUrl: 'https://sms-gateway.example.com',
    apiKey: 'test-api-key',
    senderId: 'ALERTS',
  }

  beforeEach(() => {
    channel = new SMSAlertChannel(defaultConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('SMS Message Building', () => {
    it('should build SMS with correct format', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sms-gateway.example.com/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
          body: expect.stringContaining('P1E'),
        })
      )
    })

    it('should include severity abbreviation', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ severity: 'critical' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('P1C'),
        })
      )
    })

    it('should include metric value in message', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ value: 95.5 })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('cpu_usage=95.5'),
        })
      )
    })

    it('should include rule name in message', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ ruleName: 'Memory High' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Memory High'),
        })
      )
    })
  })

  describe('Message Length Truncation', () => {
    it('should truncate message when exceeding max length', async () => {
      channel = new SMSAlertChannel({
        ...gatewayConfig,
        maxLength: 50,
      })

      const alert = createMockAlert({
        ruleName: 'Very Long Rule Name That Exceeds Maximum Length',
        message: 'This is a very long message that should be truncated',
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.message.length).toBeLessThanOrEqual(50)
      expect(body.message).toMatch(/\.\.\.$/)
    })

    it('should not truncate short messages', async () => {
      channel = new SMSAlertChannel({
        ...gatewayConfig,
        maxLength: 160,
      })

      const alert = createMockAlert({
        ruleName: 'Test',
        message: 'Alert',
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCall = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.message.length).toBeLessThan(160)
      expect(body.message).not.toMatch(/\.\.\.$/)
    })
  })

  describe('Recipient Selection', () => {
    it('should send to P0 recipients', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ priority: 'P0' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('+1234567890'),
        })
      )
    })

    it('should send to P1 recipients', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ priority: 'P1' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('+1234567891'),
        })
      )
    })

    it('should send to P2 recipients', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ priority: 'P2' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('+1234567892'),
        })
      )
    })

    it('should send to P3 recipients', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ priority: 'P3' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('+1234567893'),
        })
      )
    })

    it('should include "all" recipients when configured', async () => {
      channel = new SMSAlertChannel({
        ...gatewayConfig,
        recipients: {
          ...gatewayConfig.recipients,
          all: ['+1999999999'],
        },
      })

      const alert = createMockAlert({ priority: 'P1' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      const fetchCalls = (global.fetch as any).mock.calls
      const recipients = fetchCalls.map(call => JSON.parse(call[1].body).to)

      expect(recipients).toContain('+1234567891')
      expect(recipients).toContain('+1999999999')
    })
  })

  describe('Gateway Communication', () => {
    it('should send SMS via gateway when configured', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sms-gateway.example.com/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
          body: expect.stringContaining('"to":'),
        })
      )
    })

    it('should handle gateway errors', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert()

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(channel.send(alert)).rejects.toThrow('SMS gateway returned 500')
    })

    it('should handle network errors', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert()

      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(channel.send(alert)).rejects.toThrow('Network error')
    })

    it('should log to console when gateway not configured', async () => {
      channel = new SMSAlertChannel(defaultConfig)

      const alert = createMockAlert()

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      await channel.send(alert)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SMSAlert] Would send SMS to +1234567891: [P1E] CPU Usage High: CPU usage exceeded threshold cpu_usage=90'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })

      const result = await channel.testConnection()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://sms-gateway.example.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      )
    })

    it('should handle connection test failure', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })

    it('should handle connection test network error', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await channel.testConnection()

      expect(result).toBe(false)
    })

    it('should return false when gateway not configured', async () => {
      const result = await channel.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('Configuration Updates', () => {
    it('should update SMS configuration', () => {
      const newConfig = {
        maxLength: 200,
        senderId: 'NEW-SENDER',
      }

      channel.updateConfig(newConfig)

      const config = channel.getConfig()
      expect(config.maxLength).toBe(200)
    })

    it('should update recipients configuration', () => {
      const newRecipients = {
        P0: ['+1111111111'],
        P1: ['+1222222222'],
        P2: ['+1333333333'],
        P3: ['+1444444444'],
      }

      channel.updateConfig({ recipients: newRecipients })

      const config = channel.getConfig()
      expect(config.recipients.P0).toEqual(['+1111111111'])
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
      expect(config.recipients).toBeDefined()
      expect(config.maxLength).toBe(160)
    })

    it('should return a copy of configuration', () => {
      const config1 = channel.getConfig()
      const config2 = channel.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('Severity Formatting', () => {
    it('should format critical severity as C', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ severity: 'critical' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('P1C'),
        })
      )
    })

    it('should format error severity as E', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ severity: 'error' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('P1E'),
        })
      )
    })

    it('should format warning severity as W', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ severity: 'warning' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('P1W'),
        })
      )
    })

    it('should format info severity as I', async () => {
      channel = new SMSAlertChannel(gatewayConfig)

      const alert = createMockAlert({ severity: 'info' })

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      await channel.send(alert)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('P1I'),
        })
      )
    })
  })
})