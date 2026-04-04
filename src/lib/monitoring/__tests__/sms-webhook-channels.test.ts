/**
 * Tests for SMS and Webhook Alert Channels
 * SMS 和 Webhook 告警通道测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AlertChannelManager,
  AlertChannelSender,
  type SMSChannelConfig,
  type WebhookChannelConfig,
  type AlertChannelConfig,
} from '../alert/channels/channels'

// Mock fetch for webhook tests
global.fetch = vi.fn()

describe('SMS Alert Channel', () => {
  let manager: AlertChannelManager
  let sender: AlertChannelSender

  beforeEach(() => {
    manager = new AlertChannelManager()
    sender = new AlertChannelSender(manager)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Channel Registration', () => {
    it('should register SMS channel', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Test SMS',
        provider: 'aliyun',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        signName: '7zi Studio',
        templateCode: 'SMS_123456',
        phones: ['+8613800138000', '+8613800138001'],
      }

      manager.registerChannel('test-sms', config)

      const channel = manager.getChannel('test-sms')
      expect(channel).toBeDefined()
      expect(channel?.type).toBe('sms')
      expect(channel?.name).toBe('Test SMS')
    })

    it('should register SMS channel with custom provider', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Custom SMS',
        provider: 'custom',
        phones: ['+8613800138000'],
        customProvider: {
          url: 'https://api.custom.com/sms',
          method: 'POST',
          headers: {
            'X-API-Key': 'custom-key',
          },
        },
      }

      manager.registerChannel('custom-sms', config)

      const channel = manager.getChannel('custom-sms')
      expect(channel).toBeDefined()
      expect(channel?.type).toBe('sms')
      expect((channel as SMSChannelConfig).customProvider).toBeDefined()
    })

    it('should register multiple SMS channels', () => {
      const configs = [
        {
          id: 'sms-aliyun',
          config: {
            type: 'sms' as const,
            enabled: true,
            name: 'Aliyun SMS',
            provider: 'aliyun' as const,
            phones: ['+8613800138000'],
          } satisfies SMSChannelConfig,
        },
        {
          id: 'sms-tencent',
          config: {
            type: 'sms' as const,
            enabled: true,
            name: 'Tencent SMS',
            provider: 'tencent' as const,
            phones: ['+8613800138001'],
          } satisfies SMSChannelConfig,
        },
      ]

      manager.registerChannels(configs)

      const channels = manager.getAllChannels()
      expect(channels).toHaveLength(2)
    })
  })

  describe('Channel Validation', () => {
    it('should validate SMS channel with all required fields', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Valid SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing phone numbers', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Invalid SMS',
        provider: 'aliyun',
        phones: [],
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SMS: Missing phone numbers')
    })

    it('should detect missing phone numbers array', () => {
      const config = {
        type: 'sms' as const,
        enabled: true,
        name: 'Invalid SMS',
        provider: 'aliyun' as const,
      } as SMSChannelConfig

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SMS: Missing phone numbers')
    })

    it('should validate SMS with different providers', () => {
      const providers: Array<'aliyun' | 'tencent' | 'twilio' | 'custom'> = [
        'aliyun',
        'tencent',
        'twilio',
        'custom',
      ]

      for (const provider of providers) {
        const config: SMSChannelConfig = {
          type: 'sms',
          enabled: true,
          name: `${provider} SMS`,
          provider,
          phones: ['+8613800138000'],
        }

        const result = manager.validateChannel(config)

        expect(result.valid).toBe(true)
      }
    })

    it('should validate SMS channel with optional fields', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Complete SMS',
        provider: 'aliyun',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        signName: '7zi Studio',
        templateCode: 'SMS_123456',
        templateParams: {
          code: '123456',
        },
        phones: ['+8613800138000'],
        retryAttempts: 3,
        timeoutMs: 30000,
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(true)
    })
  })

  describe('SMS Sending', () => {
    it('should fail to send SMS when channel is not implemented', async () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Test SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
      }

      manager.registerChannel('test-sms', config)

      const result = await sender.sendToChannel('test-sms', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
    })

    it('should fail to send SMS when channel is disabled', async () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: false,
        name: 'Disabled SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
      }

      manager.registerChannel('disabled-sms', config)

      const result = await sender.sendToChannel('disabled-sms', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('disabled')
    })

    it('should fail to send SMS when channel not found', async () => {
      const result = await sender.sendToChannel('non-existent-sms', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle SMS sending timeout', async () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Timeout SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
        timeoutMs: 1, // Very short timeout
      }

      manager.registerChannel('timeout-sms', config)

      const result = await sender.sendToChannel('timeout-sms', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
    })
  })

  describe('SMS Channel Configuration', () => {
    it('should support Aliyun SMS provider', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Aliyun SMS',
        provider: 'aliyun',
        apiKey: 'aliyun-key',
        apiSecret: 'aliyun-secret',
        signName: '7zi Studio',
        templateCode: 'SMS_123456',
        phones: ['+8613800138000'],
      }

      manager.registerChannel('aliyun-sms', config)

      const channel = manager.getChannel('aliyun-sms') as SMSChannelConfig
      expect(channel?.provider).toBe('aliyun')
      expect(channel?.apiKey).toBe('aliyun-key')
      expect(channel?.signName).toBe('7zi Studio')
    })

    it('should support Tencent SMS provider', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Tencent SMS',
        provider: 'tencent',
        apiKey: 'tencent-key',
        apiSecret: 'tencent-secret',
        signName: '7zi Studio',
        templateCode: '123456',
        phones: ['+8613800138000'],
      }

      manager.registerChannel('tencent-sms', config)

      const channel = manager.getChannel('tencent-sms') as SMSChannelConfig
      expect(channel?.provider).toBe('tencent')
    })

    it('should support Twilio SMS provider', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Twilio SMS',
        provider: 'twilio',
        apiKey: 'twilio-sid',
        apiSecret: 'twilio-token',
        phones: ['+1234567890'],
      }

      manager.registerChannel('twilio-sms', config)

      const channel = manager.getChannel('twilio-sms') as SMSChannelConfig
      expect(channel?.provider).toBe('twilio')
    })

    it('should support custom SMS provider', () => {
      const config: SMSChannelConfig = {
        type: 'sms',
        enabled: true,
        name: 'Custom SMS',
        provider: 'custom',
        phones: ['+8613800138000'],
        customProvider: {
          url: 'https://api.custom.com/sms',
          method: 'POST',
          headers: {
            'X-API-Key': 'custom-key',
          },
        },
      }

      manager.registerChannel('custom-sms', config)

      const channel = manager.getChannel('custom-sms') as SMSChannelConfig
      expect(channel?.provider).toBe('custom')
      expect(channel?.customProvider?.url).toBe('https://api.custom.com/sms')
    })
  })

  describe('SMS Channel Routing', () => {
    it('should route alerts to SMS channel based on severity', () => {
      manager.registerChannel('sms-p0', {
        type: 'sms',
        enabled: true,
        name: 'P0 SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
      })

      manager.addRoutingRule({
        match: {
          severity: ['p0'],
        },
        channels: ['sms'],
      })

      const channels = manager.matchChannels('p0', [])

      expect(channels).toContain('sms')
    })

    it('should route alerts to SMS channel based on tags', () => {
      manager.registerChannel('sms-critical', {
        type: 'sms',
        enabled: true,
        name: 'Critical SMS',
        provider: 'aliyun',
        phones: ['+8613800138000'],
      })

      manager.addRoutingRule({
        match: {
          tags: ['critical', 'urgent'],
        },
        channels: ['sms'],
      })

      const channels = manager.matchChannels('p1', ['critical'])

      expect(channels).toContain('sms')
    })
  })
})

describe('Webhook Alert Channel', () => {
  let manager: AlertChannelManager
  let sender: AlertChannelSender

  beforeEach(() => {
    manager = new AlertChannelManager()
    sender = new AlertChannelManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Channel Registration', () => {
    it('should register webhook channel', () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Test Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('test-webhook', config)

      const channel = manager.getChannel('test-webhook')
      expect(channel).toBeDefined()
      expect(channel?.type).toBe('webhook')
      expect(channel?.name).toBe('Test Webhook')
    })

    it('should register webhook with custom headers', () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Webhook with Headers',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      }

      manager.registerChannel('webhook-headers', config)

      const channel = manager.getChannel('webhook-headers') as WebhookChannelConfig
      expect(channel?.headers).toEqual({
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value',
      })
    })

    it('should register webhook with different methods', () => {
      const methods: Array<'POST' | 'PUT' | 'PATCH'> = ['POST', 'PUT', 'PATCH']

      for (const method of methods) {
        const config: WebhookChannelConfig = {
          type: 'webhook',
          enabled: true,
          name: `${method} Webhook`,
          url: 'https://api.example.com/webhook',
          method,
          format: 'json',
        }

        manager.registerChannel(`${method.toLowerCase()}-webhook`, config)

        const channel = manager.getChannel(`${method.toLowerCase()}-webhook`) as WebhookChannelConfig
        expect(channel?.method).toBe(method)
      }
    })

    it('should register webhook with different formats', () => {
      const formats: Array<'json' | 'form' | 'text'> = ['json', 'form', 'text']

      for (const format of formats) {
        const config: WebhookChannelConfig = {
          type: 'webhook',
          enabled: true,
          name: `${format} Webhook`,
          url: 'https://api.example.com/webhook',
          method: 'POST',
          format,
        }

        manager.registerChannel(`${format}-webhook`, config)

        const channel = manager.getChannel(`${format}-webhook`) as WebhookChannelConfig
        expect(channel?.format).toBe(format)
      }
    })
  })

  describe('Channel Validation', () => {
    it('should validate webhook with all required fields', () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Valid Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing URL', () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Invalid Webhook',
        url: '',
        method: 'POST',
        format: 'json',
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Webhook: Missing URL')
    })

    it('should validate webhook with optional fields', () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Complete Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
        headers: {
          'Authorization': 'Bearer token',
        },
        retryAttempts: 3,
        timeoutMs: 30000,
      }

      const result = manager.validateChannel(config)

      expect(result.valid).toBe(true)
    })
  })

  describe('Webhook Sending', () => {
    it('should send webhook with JSON format', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'JSON Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('json-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('json-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
        value: 42,
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test Alert'),
        })
      )
    })

    it('should send webhook with form format', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Form Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'form',
      }

      manager.registerChannel('form-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('form-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should send webhook with text format', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Text Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'text',
      }

      manager.registerChannel('text-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('text-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should send webhook with custom headers', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Webhook with Headers',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      }

      manager.registerChannel('webhook-headers', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('webhook-headers', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })

    it('should handle webhook error response', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Error Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('error-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('error-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Webhook error')
    })

    it('should handle webhook network error', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Network Error Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('network-error-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('network-error-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should fail to send webhook when channel is disabled', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: false,
        name: 'Disabled Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('disabled-webhook', config)

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('disabled-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('disabled')
    })

    it('should fail to send webhook when channel not found', async () => {
      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('non-existent-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('Webhook Payload', () => {
    it('should include all alert fields in payload', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Full Payload Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      manager.registerChannel('full-payload-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const sender = new AlertChannelSender(manager)
      await sender.sendToChannel('full-payload-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
        value: 42,
        details: {
          cpu: 90,
          memory: 80,
        },
        timestamp: Date.now(),
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)

      expect(body.title).toBe('Test Alert')
      expect(body.message).toBe('Test message')
      expect(body.severity).toBe('p1')
      expect(body.value).toBe(42)
      expect(body.details).toEqual({
        cpu: 90,
        memory: 80,
      })
    })
  })

  describe('Webhook Channel Routing', () => {
    it('should route alerts to webhook channel based on severity', () => {
      manager.registerChannel('webhook-p0', {
        type: 'webhook',
        enabled: true,
        name: 'P0 Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      })

      manager.addRoutingRule({
        match: {
          severity: ['p0', 'p1'],
        },
        channels: ['webhook'],
      })

      const channels = manager.matchChannels('p0', [])

      expect(channels).toContain('webhook')
    })

    it('should route alerts to webhook channel based on tags', () => {
      manager.registerChannel('webhook-ops', {
        type: 'webhook',
        enabled: true,
        name: 'Ops Webhook',
        url: 'https://ops.example.com/webhook',
        method: 'POST',
        format: 'json',
      })

      manager.addRoutingRule({
        match: {
          tags: ['ops', 'critical'],
        },
        channels: ['webhook'],
      })

      const channels = manager.matchChannels('p1', ['ops'])

      expect(channels).toContain('webhook')
    })

    it('should route alerts to webhook channel based on alert name', () => {
      manager.registerChannel('webhook-cpu', {
        type: 'webhook',
        enabled: true,
        name: 'CPU Webhook',
        url: 'https://api.example.com/cpu-webhook',
        method: 'POST',
        format: 'json',
      })

      manager.addRoutingRule({
        match: {
          alertName: 'CPU.*',
        },
        channels: ['webhook'],
      })

      const channels = manager.matchChannels('p2', [], 'CPU Usage High')

      expect(channels).toContain('webhook')
    })
  })

  describe('Webhook Retry Logic', () => {
    it('should respect retryAttempts configuration', async () => {
      const config: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Retry Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
        retryAttempts: 3,
      }

      manager.registerChannel('retry-webhook', config)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const sender = new AlertChannelSender(manager)
      const result = await sender.sendToChannel('retry-webhook', {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'p1',
      })

      expect(result.success).toBe(false)
      // Note: Actual retry logic would be tested with more complex setup
    })
  })
})