// @ts-nocheck
/**
 * Tests for Alert Channels Configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  AlertChannelManager,
  AlertChannelSender,
  type AlertChannelConfig,
  type EmailChannelConfig,
  type SlackChannelConfig,
  type TelegramChannelConfig,
  type WebhookChannelConfig,
} from '../channels/channels'

describe('AlertChannelManager', () => {
  let manager: AlertChannelManager

  beforeEach(() => {
    manager = new AlertChannelManager()
  })

  afterEach(() => {
    manager = new AlertChannelManager() // Reset
  })

  describe('Channel Registration', () => {
    it('should register a single channel', () => {
      const emailConfig: EmailChannelConfig = {
        type: 'email',
        enabled: true,
        name: 'Test Email',
        provider: 'resend',
        apiKey: 'test-key',
        from: 'test@example.com',
        recipients: ['admin@example.com'],
      }

      manager.registerChannel('test-email', emailConfig)

      const channel = manager.getChannel('test-email')
      expect(channel).toBeDefined()
      expect(channel?.type).toBe('email')
      expect(channel?.name).toBe('Test Email')
    })

    it('should register multiple channels', () => {
      const configs = [
        {
          id: 'slack-1',
          config: {
            type: 'slack' as const,
            enabled: true,
            name: 'Slack Primary',
            webhookUrl: 'https://hooks.slack.com/test',
          } satisfies SlackChannelConfig,
        },
        {
          id: 'slack-2',
          config: {
            type: 'slack' as const,
            enabled: false,
            name: 'Slack Backup',
            webhookUrl: 'https://hooks.slack.com/test2',
          } satisfies SlackChannelConfig,
        },
      ]

      manager.registerChannels(configs)

      const channels = manager.getAllChannels()
      expect(channels).toHaveLength(2)
    })

    it('should unregister a channel', () => {
      const config: TelegramChannelConfig = {
        type: 'telegram',
        enabled: true,
        name: 'Telegram',
        botToken: 'test-token',
        chatId: '123456',
      }

      manager.registerChannel('telegram-1', config)
      expect(manager.getChannel('telegram-1')).toBeDefined()

      const result = manager.unregisterChannel('telegram-1')
      expect(result).toBe(true)
      expect(manager.getChannel('telegram-1')).toBeUndefined()
    })

    it('should get enabled channels only', () => {
      manager.registerChannel('enabled-1', {
        type: 'slack',
        enabled: true,
        name: 'Enabled Slack',
        webhookUrl: 'https://test.com',
      })
      manager.registerChannel('disabled-1', {
        type: 'slack',
        enabled: false,
        name: 'Disabled Slack',
        webhookUrl: 'https://test2.com',
      })

      const enabled = manager.getEnabledChannels()
      expect(enabled).toHaveLength(1)
      expect(enabled[0].id).toBe('enabled-1')
    })

    it('should get channels by type', () => {
      manager.registerChannel('email-1', {
        type: 'email',
        enabled: true,
        name: 'Email 1',
        provider: 'resend',
        apiKey: 'key',
        from: 'test@test.com',
        recipients: ['admin@test.com'],
      })
      manager.registerChannel('slack-1', {
        type: 'slack',
        enabled: true,
        name: 'Slack 1',
        webhookUrl: 'https://test.com',
      })
      manager.registerChannel('slack-2', {
        type: 'slack',
        enabled: true,
        name: 'Slack 2',
        webhookUrl: 'https://test2.com',
      })

      const slackChannels = manager.getChannelsByType('slack')
      expect(slackChannels).toHaveLength(2)

      const emailChannels = manager.getChannelsByType('email')
      expect(emailChannels).toHaveLength(1)
    })
  })

  describe('Channel Validation', () => {
    it('should validate email channel config', () => {
      const validConfig: EmailChannelConfig = {
        type: 'email',
        enabled: true,
        name: 'Valid Email',
        provider: 'resend',
        apiKey: 'test-key',
        from: 'test@example.com',
        recipients: ['admin@example.com'],
      }

      const result = manager.validateChannel(validConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing email API key', () => {
      const invalidConfig: EmailChannelConfig = {
        type: 'email',
        enabled: true,
        name: 'Invalid Email',
        provider: 'resend',
        apiKey: '',
        from: 'test@example.com',
        recipients: ['admin@example.com'],
      }

      const result = manager.validateChannel(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Email: Missing API key')
    })

    it('should validate slack channel config', () => {
      const validConfig: SlackChannelConfig = {
        type: 'slack',
        enabled: true,
        name: 'Valid Slack',
        webhookUrl: 'https://hooks.slack.com/test',
      }

      const result = manager.validateChannel(validConfig)
      expect(result.valid).toBe(true)
    })

    it('should detect missing slack webhook URL', () => {
      const invalidConfig: SlackChannelConfig = {
        type: 'slack',
        enabled: true,
        name: 'Invalid Slack',
        webhookUrl: '',
      }

      const result = manager.validateChannel(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Slack: Missing webhook URL')
    })

    it('should validate telegram channel config', () => {
      const validConfig: TelegramChannelConfig = {
        type: 'telegram',
        enabled: true,
        name: 'Valid Telegram',
        botToken: '123:ABC',
        chatId: '-100123456789',
      }

      const result = manager.validateChannel(validConfig)
      expect(result.valid).toBe(true)
    })

    it('should detect missing telegram credentials', () => {
      const invalidConfig: TelegramChannelConfig = {
        type: 'telegram',
        enabled: true,
        name: 'Invalid Telegram',
        botToken: '',
        chatId: '',
      }

      const result = manager.validateChannel(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Telegram: Missing bot token')
      expect(result.errors).toContain('Telegram: Missing chat ID')
    })

    it('should validate webhook channel config', () => {
      const validConfig: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Valid Webhook',
        url: 'https://api.example.com/webhook',
        method: 'POST',
        format: 'json',
      }

      const result = manager.validateChannel(validConfig)
      expect(result.valid).toBe(true)
    })

    it('should detect missing webhook URL', () => {
      const invalidConfig: WebhookChannelConfig = {
        type: 'webhook',
        enabled: true,
        name: 'Invalid Webhook',
        url: '',
        method: 'POST',
        format: 'json',
      }

      const result = manager.validateChannel(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Webhook: Missing URL')
    })
  })

  describe('Routing Rules', () => {
    beforeEach(() => {
      // Register some channels
      manager.registerChannel('slack-main', {
        type: 'slack',
        enabled: true,
        name: 'Main Slack',
        webhookUrl: 'https://test.com',
      })
      manager.registerChannel('email-critical', {
        type: 'email',
        enabled: true,
        name: 'Critical Email',
        provider: 'resend',
        apiKey: 'key',
        from: 'test@test.com',
        recipients: ['admin@test.com'],
      })
      manager.registerChannel('webhook-ops', {
        type: 'webhook',
        enabled: true,
        name: 'Ops Webhook',
        url: 'https://ops.test.com/webhook',
        method: 'POST',
        format: 'json',
      })
    })

    it('should match channels by severity', () => {
      manager.addRoutingRule({
        match: {
          severity: ['p0', 'p1'],
        },
        channels: ['email', 'slack', 'webhook'],
      })

      const channels = manager.matchChannels('p0', [])
      expect(channels).toContain('email')
      expect(channels).toContain('slack')
      expect(channels).toContain('webhook')
    })

    it('should match channels by tags', () => {
      manager.addRoutingRule({
        match: {
          tags: ['critical', 'security'],
        },
        channels: ['email', 'slack'],
      })

      const channels = manager.matchChannels('p2', ['critical'])
      expect(channels).toContain('email')
      expect(channels).toContain('slack')
    })

    it('should match channels by alert name regex', () => {
      manager.addRoutingRule({
        match: {
          alertName: 'CPU.*',
        },
        channels: ['webhook'],
      })

      const channels = manager.matchChannels('p2', [], 'CPU Usage High')
      expect(channels).toContain('webhook')

      const noMatch = manager.matchChannels('p2', [], 'Memory Low')
      expect(noMatch).not.toContain('webhook')
    })

    it('should return all enabled channels when no rules match', () => {
      const channels = manager.matchChannels('p3', [])
      // Should return default channels (all enabled)
      expect(channels.length).toBeGreaterThan(0)
    })
  })

  describe('Config Import/Export', () => {
    it('should export configuration', () => {
      manager.registerChannel('test-email', {
        type: 'email',
        enabled: true,
        name: 'Test Email',
        provider: 'resend',
        apiKey: 'key',
        from: 'test@test.com',
        recipients: ['admin@test.com'],
      })

      manager.addRoutingRule({
        match: { severity: ['p0'] },
        channels: ['email', 'slack'],
      })

      const exported = manager.exportConfig()

      expect(exported.channels).toHaveProperty('test-email')
      expect(exported.routingRules).toHaveLength(1)
    })

    it('should import configuration', () => {
      const config = {
        channels: {
          'imported-slack': {
            type: 'slack' as const,
            enabled: true,
            name: 'Imported Slack',
            webhookUrl: 'https://imported.com',
          },
        },
        routingRules: [
          {
            match: { severity: ['p1'] as Array<'p0' | 'p1' | 'p2' | 'p3'> },
            channels: ['slack' as const],
          },
        ],
      }

      manager.importConfig(config)

      const channel = manager.getChannel('imported-slack')
      expect(channel).toBeDefined()
      expect(channel?.name).toBe('Imported Slack')
    })
  })
})

describe('AlertChannelSender', () => {
  let manager: AlertChannelManager
  let sender: AlertChannelSender

  beforeEach(() => {
    manager = new AlertChannelManager()
    sender = new AlertChannelSender(manager)
  })

  describe('Send Operations', () => {
    it('should fail for non-existent channel', async () => {
      const result = await sender.sendToChannel('non-existent', {
        title: 'Test',
        message: 'Test message',
        severity: 'p2',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Channel not found')
    })

    it('should fail for disabled channel', async () => {
      manager.registerChannel('disabled-channel', {
        type: 'slack',
        enabled: false,
        name: 'Disabled Channel',
        webhookUrl: 'https://test.com',
      })

      const result = await sender.sendToChannel('disabled-channel', {
        title: 'Test',
        message: 'Test message',
        severity: 'p2',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Channel is disabled')
    })
  })
})

describe('Environment Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should load email config from environment', () => {
    process.env.EMAIL_ENABLED = 'true'
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.EMAIL_API_KEY = 'test-key'
    process.env.EMAIL_FROM = 'test@example.com'
    process.env.EMAIL_RECIPIENTS = 'admin1@example.com,admin2@example.com'

    const manager = AlertChannelManager.fromEnvironment()
    const channel = manager.getChannel('default-email')

    expect(channel).toBeDefined()
    expect(channel?.type).toBe('email')
    expect((channel as EmailChannelConfig).recipients).toHaveLength(2)
  })

  it('should load slack config from environment', () => {
    process.env.SLACK_ENABLED = 'true'
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'

    const manager = AlertChannelManager.fromEnvironment()
    const channel = manager.getChannel('default-slack')

    expect(channel).toBeDefined()
    expect(channel?.type).toBe('slack')
  })

  it('should load telegram config from environment', () => {
    process.env.TELEGRAM_ENABLED = 'true'
    process.env.TELEGRAM_BOT_TOKEN = '123:ABC'
    process.env.TELEGRAM_CHAT_ID = '-100123456789'

    const manager = AlertChannelManager.fromEnvironment()
    const channel = manager.getChannel('default-telegram')

    expect(channel).toBeDefined()
    expect(channel?.type).toBe('telegram')
  })

  it('should load webhook config from environment', () => {
    process.env.WEBHOOK_ENABLED = 'true'
    process.env.WEBHOOK_URL = 'https://api.example.com/webhook'
    process.env.WEBHOOK_METHOD = 'POST'
    process.env.WEBHOOK_FORMAT = 'json'

    const manager = AlertChannelManager.fromEnvironment()
    const channel = manager.getChannel('default-webhook')

    expect(channel).toBeDefined()
    expect(channel?.type).toBe('webhook')
  })

  it('should add default routing rules', () => {
    process.env.EMAIL_ENABLED = 'true'
    process.env.EMAIL_API_KEY = 'key'
    process.env.EMAIL_FROM = 'test@test.com'
    process.env.EMAIL_RECIPIENTS = 'admin@test.com'

    const manager = AlertChannelManager.fromEnvironment()

    // Check default routing rules exist
    const p0Channels = manager.matchChannels('p0', [])
    expect(p0Channels).toContain('email')
  })
})
