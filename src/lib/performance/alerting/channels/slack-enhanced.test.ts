/**
 * Enhanced Slack Channel Tests (v1.9.0)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  EnhancedSlackChannel,
  LevelRouter,
  Throttler,
  Retryer,
} from './slack-enhanced'
import type { PerformanceAlert } from '../alerter'

// Mock fetch
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('ok'),
  } as Response)
)

global.fetch = mockFetch as any

const createMockAlert = (overrides: Partial<PerformanceAlert> = {}): PerformanceAlert => ({
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
  ...overrides,
} as PerformanceAlert)

describe('EnhancedSlackChannel', () => {
  let channel: EnhancedSlackChannel
  let mockAlert: PerformanceAlert

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('ok'),
      } as Response)
    )

    channel = new EnhancedSlackChannel(
      {
        webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        username: 'EnhancedBot',
        iconEmoji: ':robot_face:',
        levelChannels: {
          info: '#info-channel',
          warning: '#warning-channel',
          error: '#error-channel',
          critical: '#critical-channel',
        },
      },
      {
        includeMetadata: true,
        skipThrottle: true,
      }
    )

    mockAlert = createMockAlert()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(channel.name).toBe('slack-enhanced')
    })

    it('should accept custom options', () => {
      const customChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          channel: '#custom-channel',
          mention: '@oncall',
        }
      )

      const options = customChannel.getOptions()
      expect(options.channel).toBe('#custom-channel')
      expect(options.mention).toBe('@oncall')
    })
  })

  describe('send', () => {
    it('should send alert successfully', async () => {
      const result = await channel.send(mockAlert)
      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should route to correct channel based on level', async () => {
      const levels: Array<'info' | 'warning' | 'error' | 'critical'> = [
        'info',
        'warning',
        'error',
        'critical',
      ]

      for (const level of levels) {
        mockFetch.mockClear()
        const alert = createMockAlert({ level })
        await channel.send(alert)

        const callArgs = mockFetch.mock.calls[0] as any
        const body = JSON.parse(callArgs[1].body)
        expect(body.channel).toBe(`#${level}-channel`)
      }
    })

    it('should use default channel when no level mapping', async () => {
      const defaultChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
          defaultChannel: '#default',
        },
        { skipThrottle: true }
      )

      await defaultChannel.send(mockAlert)

      const callArgs = mockFetch.mock.calls[0] as any
      const body = JSON.parse(callArgs[1].body)
      expect(body.channel).toBe('#default')
    })

    it('should include mention when configured', async () => {
      const mentionChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          mention: '@oncall',
          skipThrottle: true,
        }
      )

      await mentionChannel.send(mockAlert)

      const callArgs = mockFetch.mock.calls[0] as any
      const body = JSON.parse(callArgs[1].body)
      expect(body.text).toContain('@oncall')
    })

    it('should handle webhook errors with retry', async () => {
      const retryChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        { skipThrottle: true }
      )

      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('ok'),
        } as Response)

      const result = await retryChannel.send(mockAlert)
      expect(result.success).toBe(true)
      expect(result.retries).toBe(2)
    })

    it('should fail after max retries', async () => {
      const retryChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        { skipThrottle: true }
      )

      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await retryChannel.send(mockAlert)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.retries).toBe(3)
    })

    it('should skip throttling when configured', async () => {
      const skipThrottleChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        {
          skipThrottle: true,
        }
      )

      // Send many alerts quickly
      for (let i = 0; i < 150; i++) {
        const result = await skipThrottleChannel.send(mockAlert)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('throttling', () => {
    it('should reset throttler correctly', async () => {
      const throttleChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        }
      )

      // Reset throttler
      throttleChannel.resetThrottler()

      // Should be able to send
      const result = await throttleChannel.send(mockAlert)
      expect(result.success).toBe(true)
    })
  })

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const retryChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        { skipThrottle: true }
      )

      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('ok'),
        } as Response)

      const result = await retryChannel.send(mockAlert)
      expect(result.success).toBe(true)
      expect(result.retries).toBe(1)
    })

    it('should retry on rate limit errors', async () => {
      const retryChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        { skipThrottle: true }
      )

      mockFetch
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('ok'),
        } as Response)

      const result = await retryChannel.send(mockAlert)
      expect(result.success).toBe(true)
      expect(result.retries).toBe(1)
    })

    it('should not retry on client errors', async () => {
      const retryChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
        },
        { skipThrottle: true }
      )

      mockFetch.mockRejectedValueOnce(new Error('400 Bad Request'))

      const result = await retryChannel.send(mockAlert)
      expect(result.success).toBe(false)
      expect(result.retries).toBe(0)
    })
  })

  describe('message formatting', () => {
    let formatChannel: EnhancedSlackChannel

    beforeEach(() => {
      vi.clearAllMocks()
      mockFetch.mockReset()
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('ok'),
        } as Response)
      )

      formatChannel = new EnhancedSlackChannel(
        {
          webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
          username: 'EnhancedBot',
          iconEmoji: ':robot_face:',
        },
        {
          includeMetadata: true,
          skipThrottle: true,
        }
      )
    })

    it('should include metric fields when available', async () => {
      const alertWithMetric = createMockAlert({
        metric: 'response_time',
        currentValue: 5000,
        threshold: 3000,
      })

      await formatChannel.send(alertWithMetric)

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0] as any
      expect(callArgs).toBeDefined()
      expect(callArgs.length).toBeGreaterThanOrEqual(2)

      const body = JSON.parse(callArgs[1].body)
      const fields = body.attachments[0].fields

      const metricField = fields.find((f: any) => f.title === 'Metric')
      expect(metricField).toBeDefined()
      expect(metricField.value).toBe('response_time')
    })

    it('should include occurrence count when > 1', async () => {
      const alertWithOccurrences = createMockAlert({
        occurrenceCount: 5,
      })

      await formatChannel.send(alertWithOccurrences)

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0] as any
      expect(callArgs).toBeDefined()
      expect(callArgs.length).toBeGreaterThanOrEqual(2)

      const body = JSON.parse(callArgs[1].body)
      const fields = body.attachments[0].fields

      const occField = fields.find((f: any) => f.title === 'Occurrences')
      expect(occField).toBeDefined()
      expect(occField.value).toBe(5)
    })

    it('should include metadata when configured', async () => {
      const alertWithMetadata = createMockAlert({
        metadata: {
          environment: 'production',
          region: 'us-east-1',
        },
      })

      await formatChannel.send(alertWithMetadata)

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0] as any
      expect(callArgs).toBeDefined()
      expect(callArgs.length).toBeGreaterThanOrEqual(2)

      const body = JSON.parse(callArgs[1].body)
      const fields = body.attachments[0].fields

      const envField = fields.find((f: any) => f.title === 'environment')
      const regionField = fields.find((f: any) => f.title === 'region')

      expect(envField).toBeDefined()
      expect(envField.value).toBe('production')
      expect(regionField).toBeDefined()
      expect(regionField.value).toBe('us-east-1')
    })
  })

  describe('test', () => {
    it('should test webhook successfully', async () => {
      const result = await channel.test()
      expect(result).toBe(true)
    })

    it('should handle test failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

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
      expect(options.includeMetadata).toBe(true)
    })
  })
})

describe('LevelRouter', () => {
  it('should route to correct channel for each level', () => {
    const router = new LevelRouter({
      info: '#info',
      warning: '#warning',
      error: '#error',
      critical: '#critical',
    })

    expect(router.getChannelForLevel('info')).toBe('#info')
    expect(router.getChannelForLevel('warning')).toBe('#warning')
    expect(router.getChannelForLevel('error')).toBe('#error')
    expect(router.getChannelForLevel('critical')).toBe('#critical')
  })

  it('should use default channel when no mapping', () => {
    const router = new LevelRouter({}, '#default')

    expect(router.getChannelForLevel('info')).toBe('#default')
    expect(router.getChannelForLevel('warning')).toBe('#default')
  })

  it('should return undefined when no mapping and no default', () => {
    const router = new LevelRouter()

    expect(router.getChannelForLevel('info')).toBeUndefined()
  })
})

describe('Throttler', () => {
  let throttler: Throttler
  const mockAlert = createMockAlert()

  beforeEach(() => {
    throttler = new Throttler({
      maxAlerts: 10,
      windowMs: 60000,
    })
  })

  it('should allow alerts within limit', () => {
    for (let i = 0; i < 10; i++) {
      const result = throttler.shouldAllow(mockAlert)
      expect(result.allowed).toBe(true)
    }
  })

  it('should throttle when limit exceeded', () => {
    for (let i = 0; i < 10; i++) {
      throttler.shouldAllow(mockAlert)
    }

    const result = throttler.shouldAllow(mockAlert)
    expect(result.allowed).toBe(false)
  })

  it('should reset window when expired', async () => {
    const shortThrottler = new Throttler({
      maxAlerts: 5,
      windowMs: 100, // Very short window
    })

    for (let i = 0; i < 5; i++) {
      shortThrottler.shouldAllow(mockAlert)
    }

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150))

    const result = shortThrottler.shouldAllow(mockAlert)
    expect(result.allowed).toBe(true)
  })

  it('should track stats correctly', () => {
    throttler.shouldAllow(mockAlert)
    throttler.shouldAllow(mockAlert)

    const stats = throttler.getStats()
    expect(stats.alertCount).toBe(2)
  })

  it('should reset correctly', () => {
    throttler.shouldAllow(mockAlert)
    throttler.reset()

    const stats = throttler.getStats()
    expect(stats.alertCount).toBe(0)
  })
})

describe('Retryer', () => {
  let retryer: Retryer

  beforeEach(() => {
    retryer = new Retryer({
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
    })
  })

  it('should succeed on first attempt', async () => {
    const operation = vi.fn(() => Promise.resolve('success'))
    const result = await retryer.execute(operation)

    expect(result.success).toBe(true)
    expect(result.retries).toBe(0)
    expect(result.result).toBe('success')
  })

  it('should retry on failure', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')

    const result = await retryer.execute(operation)

    expect(result.success).toBe(true)
    expect(result.retries).toBe(1)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should fail after max retries', async () => {
    const operation = vi.fn(() => Promise.reject(new Error('fail')))
    const result = await retryer.execute(operation)

    expect(result.success).toBe(false)
    expect(result.retries).toBe(3)
    expect(result.error).toBeDefined()
  })

  it('should respect shouldRetry callback', async () => {
    const operation = vi.fn(() => Promise.reject(new Error('non-retryable')))
    const shouldRetry = vi.fn(() => false)

    const result = await retryer.execute(operation, shouldRetry)

    expect(result.success).toBe(false)
    expect(result.retries).toBe(0)
    expect(shouldRetry).toHaveBeenCalled()
  })

  it('should apply exponential backoff', async () => {
    const delays: number[] = []
    const retryerWithBackoff = new Retryer({
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    })

    // Override sleep to track delays
    const originalSleep = retryerWithBackoff['sleep']
    retryerWithBackoff['sleep'] = vi.fn((ms: number) => {
      delays.push(ms)
      return originalSleep.call(retryerWithBackoff, ms)
    })

    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')

    await retryerWithBackoff.execute(operation)

    expect(delays[0]).toBe(10)
    expect(delays[1]).toBe(20)
  })
})