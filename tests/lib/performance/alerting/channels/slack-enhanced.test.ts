/**
 * SlackChannel Enhanced Integration Tests
 * Tests for Slack channel with LevelRouter, Throttler, and Retryer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ========================================
// Types (matching design document)
// ========================================

type AlertLevel = 'info' | 'warning' | 'error' | 'critical'
type AlertCategory = 'performance' | 'availability' | 'error' | 'resource' | 'security' | 'custom'
type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed'

interface PerformanceAlert {
  id: string
  title: string
  message: string
  level: AlertLevel
  category: AlertCategory
  status: AlertStatus
  source: string
  metric?: string
  currentValue?: number
  threshold?: number
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt?: number
  acknowledgedAt?: number
  acknowledgedBy?: string
  resolvedAt?: number
  occurrenceCount: number
  tags?: string[]
}

interface LevelChannelMapping {
  info?: string
  warning?: string
  error?: string
  critical?: string
}

interface ThrottleConfig {
  windowMs: number
  maxPerWindow: number
}

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

interface SlackConfig {
  webhookUrl: string
  levelChannels?: LevelChannelMapping
  username?: string
  iconEmoji?: string
}

interface SlackAlertOptions {
  channel?: string
  mention?: string
  throttle?: ThrottleConfig
  retry?: RetryConfig
}

// ========================================
// Component Implementations
// ========================================

class LevelRouter {
  private mapping: LevelChannelMapping

  constructor(mapping: LevelChannelMapping) {
    this.mapping = mapping
  }

  getChannel(level: AlertLevel): string | undefined {
    return this.mapping[level]
  }
}

class Throttler {
  private config: ThrottleConfig
  private history: Map<string, number[]> = new Map()

  constructor(config: ThrottleConfig) {
    this.config = config
  }

  shouldThrottle(key: string): boolean {
    const now = Date.now()
    const timestamps = this.history.get(key) || []
    const validTimestamps = timestamps.filter(ts => now - ts < this.config.windowMs)

    if (validTimestamps.length >= this.config.maxPerWindow) {
      return true
    }

    validTimestamps.push(now)
    this.history.set(key, validTimestamps)
    return false
  }

  reset(key?: string): void {
    if (key) {
      this.history.delete(key)
    } else {
      this.history.clear()
    }
  }
}

class Retryer {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt < this.config.maxAttempts) {
          const delay = Math.min(
            this.config.baseDelayMs * Math.pow(2, attempt - 1),
            this.config.maxDelayMs
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}

// ========================================
// Enhanced SlackChannel
// ========================================

class SlackChannelEnhanced {
  name = 'slack'
  
  private webhookUrl: string
  private levelRouter: LevelRouter
  private throttler: Throttler
  private retryer: Retryer
  private options: SlackAlertOptions
  private username: string
  private iconEmoji: string

  // Track sent messages for testing
  public sentMessages: Array<{
    channel?: string
    text: string
    alert: PerformanceAlert
  }> = []

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.webhookUrl = config.webhookUrl
    this.levelRouter = new LevelRouter(config.levelChannels || {})
    this.throttler = new Throttler(
      options?.throttle || { windowMs: 60000, maxPerWindow: 1 }
    )
    this.retryer = new Retryer(
      options?.retry || { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
    )
    this.options = options || {}
    this.username = config.username || 'Performance Alerter'
    this.iconEmoji = config.iconEmoji || ':warning:'
  }

  async send(alert: PerformanceAlert): Promise<void> {
    // 1. Check throttling
    const throttleKey = `${alert.level}:${alert.source}:${alert.metric || 'default'}`
    if (this.throttler.shouldThrottle(throttleKey)) {
      console.log(`[SlackChannel] Alert throttled: ${throttleKey}`)
      return
    }

    // 2. Get target channel
    const channel = this.options.channel || this.levelRouter.getChannel(alert.level)

    // 3. Build message
    const text = `${this.getLevelEmoji(alert.level)} *${alert.title}*`

    // 4. Send with retry
    await this.retryer.execute(async () => {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          username: this.username,
          icon_emoji: this.iconEmoji,
          text,
          attachments: [{
            color: this.getLevelColor(alert.level),
            title: alert.message,
            fields: [
              { title: 'Severity', value: alert.level.toUpperCase(), short: true },
              { title: 'Source', value: alert.source, short: true },
            ],
            footer: 'Performance Alerting System',
            ts: Math.floor(alert.createdAt / 1000),
          }],
        }),
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`)
      }

      // Track for testing
      this.sentMessages.push({ channel, text, alert })
    })
  }

  private getLevelEmoji(level: AlertLevel): string {
    const emojis: Record<AlertLevel, string> = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    }
    return emojis[level] || ':warning:'
  }

  private getLevelColor(level: AlertLevel): string {
    const colors: Record<AlertLevel, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    }
    return colors[level] || '#6b7280'
  }

  resetThrottler(): void {
    this.throttler.reset()
  }
}

// ========================================
// Helper Functions
// ========================================

function createTestAlert(overrides: Partial<PerformanceAlert> = {}): PerformanceAlert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'Test Alert',
    message: 'This is a test alert',
    level: 'warning',
    category: 'performance',
    status: 'active',
    source: 'test-server',
    createdAt: Date.now(),
    occurrenceCount: 1,
    ...overrides,
  }
}

// ========================================
// Tests
// ========================================

describe('SlackChannelEnhanced', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let channel: SlackChannelEnhanced

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch

    // Create channel with test config
    channel = new SlackChannelEnhanced(
      {
        webhookUrl: 'https://hooks.slack.com/services/test',
        levelChannels: {
          critical: '#incidents',
          error: '#alerts-error',
          warning: '#alerts-warning',
          info: '#alerts-info',
        },
        username: 'Test Alerter',
        iconEmoji: ':test:',
      },
      {
        throttle: { windowMs: 60000, maxPerWindow: 1 },
        retry: { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normal alert sending', () => {
    it('should send alert successfully', async () => {
      const alert = createTestAlert({ level: 'error' })
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(channel.sentMessages).toHaveLength(1)
    })

    it('should send to correct channel based on level', async () => {
      const criticalAlert = createTestAlert({ level: 'critical' })
      const errorAlert = createTestAlert({ level: 'error' })
      const warningAlert = createTestAlert({ level: 'warning' })
      const infoAlert = createTestAlert({ level: 'info' })
      
      await channel.send(criticalAlert)
      await channel.send(errorAlert)
      await channel.send(warningAlert)
      await channel.send(infoAlert)
      
      expect(channel.sentMessages[0].channel).toBe('#incidents')
      expect(channel.sentMessages[1].channel).toBe('#alerts-error')
      expect(channel.sentMessages[2].channel).toBe('#alerts-warning')
      expect(channel.sentMessages[3].channel).toBe('#alerts-info')
    })

    it('should include correct webhook URL', async () => {
      const alert = createTestAlert()
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.any(Object)
      )
    })

    it('should include correct headers', async () => {
      const alert = createTestAlert()
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should format alert with correct emoji', async () => {
      const criticalAlert = createTestAlert({ level: 'critical' })
      
      await channel.send(criticalAlert)
      
      expect(channel.sentMessages[0].text).toContain(':rotating_light:')
    })

    it('should format alert with correct color', async () => {
      const errorAlert = createTestAlert({ level: 'error' })
      
      await channel.send(errorAlert)
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.attachments[0].color).toBe('#ef4444')
    })
  })

  describe('throttling', () => {
    it('should throttle duplicate alerts', async () => {
      const alert = createTestAlert({
        level: 'error',
        source: 'server-1',
        metric: 'cpu',
      })
      
      // First should pass
      await channel.send(alert)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      
      // Second should be throttled
      await channel.send(alert)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should allow different alerts to pass', async () => {
      const alert1 = createTestAlert({
        level: 'error',
        source: 'server-1',
        metric: 'cpu',
      })
      const alert2 = createTestAlert({
        level: 'error',
        source: 'server-1',
        metric: 'memory', // Different metric
      })
      
      await channel.send(alert1)
      await channel.send(alert2)
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should allow same alert after reset', async () => {
      const alert = createTestAlert({
        level: 'warning',
        source: 'api-gateway',
        metric: 'latency',
      })
      
      await channel.send(alert)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      
      channel.resetThrottler()
      
      await channel.send(alert)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throttle by level+source+metric combination', async () => {
      const alerts = [
        createTestAlert({ level: 'error', source: 's1', metric: 'm1' }),
        createTestAlert({ level: 'error', source: 's1', metric: 'm2' }),
        createTestAlert({ level: 'error', source: 's2', metric: 'm1' }),
        createTestAlert({ level: 'warning', source: 's1', metric: 'm1' }),
      ]
      
      for (const alert of alerts) {
        await channel.send(alert)
      }
      
      // All different combinations should pass
      expect(mockFetch).toHaveBeenCalledTimes(4)
      
      // Same combination should be throttled
      await channel.send(alerts[0])
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('retry mechanism', () => {
    it('should retry on temporary failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true })
      
      const alert = createTestAlert({ level: 'error' })
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry multiple times', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ ok: true })
      
      const alert = createTestAlert({ level: 'warning' })
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent failure'))
      
      const alert = createTestAlert({ level: 'error' })
      
      await expect(channel.send(alert)).rejects.toThrow('Persistent failure')
      expect(mockFetch).toHaveBeenCalledTimes(3) // maxAttempts
    })

    it('should not retry on success', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      
      const alert = createTestAlert({ level: 'info' })
      
      await channel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('level routing', () => {
    it('should route critical to #incidents', async () => {
      const alert = createTestAlert({ level: 'critical' })
      
      await channel.send(alert)
      
      expect(channel.sentMessages[0].channel).toBe('#incidents')
    })

    it('should route error to #alerts-error', async () => {
      const alert = createTestAlert({ level: 'error' })
      
      await channel.send(alert)
      
      expect(channel.sentMessages[0].channel).toBe('#alerts-error')
    })

    it('should route warning to #alerts-warning', async () => {
      const alert = createTestAlert({ level: 'warning' })
      
      await channel.send(alert)
      
      expect(channel.sentMessages[0].channel).toBe('#alerts-warning')
    })

    it('should route info to #alerts-info', async () => {
      const alert = createTestAlert({ level: 'info' })
      
      await channel.send(alert)
      
      expect(channel.sentMessages[0].channel).toBe('#alerts-info')
    })

    it('should use default channel when level not configured', async () => {
      const channelWithoutLevelRouting = new SlackChannelEnhanced(
        { webhookUrl: 'https://hooks.slack.com/services/test' },
        { throttle: { windowMs: 60000, maxPerWindow: 1 } }
      )
      
      const alert = createTestAlert({ level: 'warning' })
      
      await channelWithoutLevelRouting.send(alert)
      
      // Channel should be undefined (use webhook default)
      expect(channelWithoutLevelRouting.sentMessages[0].channel).toBeUndefined()
    })

    it('should allow channel override', async () => {
      const channelWithOverride = new SlackChannelEnhanced(
        {
          webhookUrl: 'https://hooks.slack.com/services/test',
          levelChannels: { error: '#alerts-error' },
        },
        { channel: '#override-channel' }
      )
      
      const alert = createTestAlert({ level: 'error' })
      
      await channelWithOverride.send(alert)
      
      // Override should take precedence
      expect(channelWithOverride.sentMessages[0].channel).toBe('#override-channel')
    })
  })

  describe('error handling', () => {
    it('should handle 500 error from Slack', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })
      
      const alert = createTestAlert({ level: 'error' })
      
      await expect(channel.send(alert)).rejects.toThrow('Slack webhook failed: 500')
    })

    it('should handle 403 forbidden error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })
      
      const alert = createTestAlert({ level: 'warning' })
      
      await expect(channel.send(alert)).rejects.toThrow('Slack webhook failed: 403')
    })

    it('should handle network timeout', async () => {
      const timeoutError = new Error('Network timeout')
      ;(timeoutError as any).code = 'ETIMEDOUT'
      
      mockFetch.mockRejectedValue(timeoutError)
      
      const alert = createTestAlert({ level: 'critical' })
      
      await expect(channel.send(alert)).rejects.toThrow('Network timeout')
    })

    it('should handle invalid webhook URL', async () => {
      const error = new Error('Invalid URL')
      mockFetch.mockRejectedValue(error)
      
      const alert = createTestAlert({ level: 'info' })
      
      await expect(channel.send(alert)).rejects.toThrow('Invalid URL')
    })
  })

  describe('configuration', () => {
    it('should use custom username', async () => {
      const customChannel = new SlackChannelEnhanced(
        {
          webhookUrl: 'https://hooks.slack.com/services/test',
          username: 'Custom Bot',
        }
      )
      
      const alert = createTestAlert()
      
      await customChannel.send(alert)
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.username).toBe('Custom Bot')
    })

    it('should use custom icon emoji', async () => {
      const customChannel = new SlackChannelEnhanced(
        {
          webhookUrl: 'https://hooks.slack.com/services/test',
          iconEmoji: ':robot_face:',
        }
      )
      
      const alert = createTestAlert()
      
      await customChannel.send(alert)
      
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.icon_emoji).toBe(':robot_face:')
    })

    it('should use custom throttle config', async () => {
      const customChannel = new SlackChannelEnhanced(
        { webhookUrl: 'https://hooks.slack.com/services/test' },
        { throttle: { windowMs: 30000, maxPerWindow: 3 } }
      )
      
      const alert = createTestAlert({ source: 'test', metric: 'test' })
      
      // Should allow 3 messages
      await customChannel.send(alert)
      await customChannel.send(alert)
      await customChannel.send(alert)
      
      expect(mockFetch).toHaveBeenCalledTimes(3)
      
      // 4th should be throttled
      await customChannel.send(alert)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should use custom retry config', async () => {
      const customChannel = new SlackChannelEnhanced(
        { webhookUrl: 'https://hooks.slack.com/services/test' },
        { retry: { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 100 } }
      )
      
      mockFetch.mockRejectedValue(new Error('Fail'))
      
      const alert = createTestAlert()
      
      await expect(customChannel.send(alert)).rejects.toThrow('Fail')
      
      expect(mockFetch).toHaveBeenCalledTimes(5) // Custom maxAttempts
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple alerts in sequence', async () => {
      const alerts = [
        createTestAlert({ level: 'info', source: 'app-1', metric: 'health' }),
        createTestAlert({ level: 'warning', source: 'app-2', metric: 'latency' }),
        createTestAlert({ level: 'error', source: 'db-1', metric: 'connections' }),
        createTestAlert({ level: 'critical', source: 'server-1', metric: 'disk' }),
      ]
      
      for (const alert of alerts) {
        await channel.send(alert)
      }
      
      expect(mockFetch).toHaveBeenCalledTimes(4)
      expect(channel.sentMessages).toHaveLength(4)
    })

    it('should handle alert storm with throttling', async () => {
      const alert = createTestAlert({ level: 'error', source: 'server', metric: 'cpu' })
      
      // Send 10 alerts rapidly
      for (let i = 0; i < 10; i++) {
        await channel.send(alert)
      }
      
      // Only first should pass
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should recover from temporary Slack outage', async () => {
      // Simulate temporary outage
      mockFetch
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValue({ ok: true })
      
      const alert1 = createTestAlert({ level: 'error', source: 's1', metric: 'm1' })
      const alert2 = createTestAlert({ level: 'error', source: 's2', metric: 'm2' })
      
      await channel.send(alert1)
      await channel.send(alert2)
      
      expect(mockFetch).toHaveBeenCalledTimes(4) // 3 retries + 1 success
    })
  })
})

// ========================================
// Integration Tests (requires real webhook)
// ========================================

describe('SlackChannel Integration (requires SLACK_TEST_WEBHOOK_URL)', () => {
  it.skip('should send real alert to Slack', async () => {
    const webhookUrl = process.env.SLACK_TEST_WEBHOOK_URL
    if (!webhookUrl) {
      console.log('Skipping: SLACK_TEST_WEBHOOK_URL not set')
      return
    }
    
    const channel = new SlackChannelEnhanced(
      {
        webhookUrl,
        levelChannels: { info: '#test-alerts' },
      }
    )
    
    const alert = createTestAlert({
      title: 'Integration Test Alert',
      message: 'This is a test from unit tests',
      level: 'info',
      source: 'test-runner',
    })
    
    await channel.send(alert)
    
    // Manual verification needed in Slack
    expect(channel.sentMessages).toHaveLength(1)
  })
})
