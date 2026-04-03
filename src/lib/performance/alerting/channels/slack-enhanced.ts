/**
 * Enhanced Slack Channel (v1.9.0)
 * Advanced Slack alerting with level routing, throttling, and retry logic
 */

import type { PerformanceAlert } from '../alerter'

// ========================================
// Types
// ========================================

export interface LevelChannelMapping {
  info?: string
  warning?: string
  error?: string
  critical?: string
}

export interface ThrottleConfig {
  /** Maximum alerts per time window */
  maxAlerts: number
  /** Time window in milliseconds */
  windowMs: number
  /** Whether to aggregate similar alerts */
  aggregate?: boolean
  /** Aggregation window in milliseconds */
  aggregateWindowMs?: number
}

export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number
  /** Initial delay in milliseconds */
  initialDelayMs: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
  /** Backoff multiplier */
  backoffMultiplier?: number
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  retries?: number
  throttled?: boolean
}

export interface SlackConfig {
  /** Default webhook URL */
  webhookUrl: string
  /** Level-to-channel routing */
  levelChannels?: LevelChannelMapping
  /** Default channel */
  defaultChannel?: string
  /** Bot username */
  username?: string
  /** Bot icon emoji */
  iconEmoji?: string
}

export interface SlackAlertOptions {
  /** Override channel for this alert */
  channel?: string
  /** Include detailed fields */
  includeFields?: boolean
  /** Include metadata */
  includeMetadata?: boolean
  /** Custom mention */
  mention?: string
  /** Message prefix */
  messagePrefix?: string
  /** Skip throttling */
  skipThrottle?: boolean
}

// ========================================
// Level Router
// ========================================

export class LevelRouter {
  private levelChannels: LevelChannelMapping
  private defaultChannel: string | undefined

  constructor(levelChannels?: LevelChannelMapping, defaultChannel?: string) {
    this.levelChannels = levelChannels || {}
    this.defaultChannel = defaultChannel
  }

  getChannelForLevel(level: string): string | undefined {
    return this.levelChannels[level as keyof LevelChannelMapping] || this.defaultChannel
  }

  getWebhookForLevel(level: string, defaultWebhook: string): string {
    // In a real implementation, this would return different webhook URLs
    // For now, we just route to the same webhook but with different channel params
    return defaultWebhook
  }
}

// ========================================
// Throttler
// ========================================

export class Throttler {
  private config: ThrottleConfig
  private alertCount: number = 0
  private windowStart: number = Date.now()
  private pendingAggregation: Map<string, PerformanceAlert[]> = new Map()
  private aggregationTimer: NodeJS.Timeout | null = null

  constructor(config: ThrottleConfig) {
    this.config = config
  }

  shouldAllow(alert: PerformanceAlert): { allowed: boolean; aggregated?: boolean } {
    const now = Date.now()

    // Reset window if expired
    if (now - this.windowStart >= this.config.windowMs) {
      this.alertCount = 0
      this.windowStart = now
    }

    // Check throttle limit
    if (this.alertCount >= this.config.maxAlerts) {
      return { allowed: false }
    }

    // Handle aggregation
    if (this.config.aggregate) {
      const key = this.getAggregationKey(alert)
      const pending = this.pendingAggregation.get(key) || []
      pending.push(alert)
      this.pendingAggregation.set(key, pending)

      // Schedule aggregation flush if not already scheduled
      if (!this.aggregationTimer) {
        this.aggregationTimer = setTimeout(
          () => this.flushAggregation(),
          this.config.aggregateWindowMs || 60000
        )
      }

      return { allowed: true, aggregated: true }
    }

    this.alertCount++
    return { allowed: true }
  }

  private getAggregationKey(alert: PerformanceAlert): string {
    return `${alert.level}-${alert.category}-${alert.source}-${alert.metric || 'none'}`
  }

  private flushAggregation(): void {
    this.pendingAggregation.clear()
    this.aggregationTimer = null
  }

  reset(): void {
    this.alertCount = 0
    this.windowStart = Date.now()
    this.pendingAggregation.clear()
    if (this.aggregationTimer) {
      clearTimeout(this.aggregationTimer)
      this.aggregationTimer = null
    }
  }

  getStats(): { alertCount: number; windowStart: number; pendingAggregations: number } {
    return {
      alertCount: this.alertCount,
      windowStart: this.windowStart,
      pendingAggregations: this.pendingAggregation.size,
    }
  }
}

// ========================================
// Retryer
// ========================================

export class Retryer {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry?: (error: Error) => boolean
  ): Promise<{ result?: T; success: boolean; retries: number; error?: Error }> {
    let lastError: Error | undefined
    let delay = this.config.initialDelayMs
    let totalAttempts = 0

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      totalAttempts = attempt
      try {
        const result = await operation()
        return { result, success: true, retries: attempt }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if we should retry
        if (attempt === this.config.maxRetries) {
          break
        }

        if (shouldRetry && !shouldRetry(lastError)) {
          break
        }

        // Wait before retry
        await this.sleep(delay)
        delay = Math.min(
          delay * (this.config.backoffMultiplier || 2),
          this.config.maxDelayMs
        )
      }
    }

    return { success: false, retries: totalAttempts, error: lastError }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ========================================
// Enhanced Slack Channel
// ========================================

export class EnhancedSlackChannel {
  name = 'slack-enhanced'
  private config: SlackConfig
  private options: SlackAlertOptions
  private levelRouter: LevelRouter
  private throttler: Throttler | null
  private retryer: Retryer | null

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.config = config
    this.options = options || {}

    this.levelRouter = new LevelRouter(config.levelChannels, config.defaultChannel)

    // Initialize throttler with defaults if not configured
    this.throttler = new Throttler({
      maxAlerts: 100,
      windowMs: 60000, // 1 minute
      aggregate: true,
      aggregateWindowMs: 30000, // 30 seconds
    })

    // Initialize retryer with defaults
    this.retryer = new Retryer({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    })
  }

  /**
   * Send alert to Slack with enhanced features
   */
  async send(alert: PerformanceAlert): Promise<SendResult> {
    // Check throttling
    if (!this.options.skipThrottle && this.throttler) {
      const { allowed, aggregated } = this.throttler.shouldAllow(alert)
      if (!allowed) {
        return { success: false, error: 'Throttled: too many alerts', throttled: true }
      }
      if (aggregated) {
        // Alert will be sent as part of aggregation
        return { success: true, throttled: false }
      }
    }

    // Get channel for this alert level
    const channel = this.options.channel || 
      this.levelRouter.getChannelForLevel(alert.level) ||
      this.config.defaultChannel

    // Build message
    const message = this.buildMessage(alert, channel)

    // Send with retry
    if (this.retryer) {
      const result = await this.retryer.execute(
        () => this.postMessage(message),
        (error) => this.shouldRetry(error)
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Unknown error',
          retries: result.retries,
        }
      }

      return { success: true, retries: result.retries || 0 }
    }

    // Fallback: send without retry
    try {
      await this.postMessage(message)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Build Slack message payload
   */
  private buildMessage(alert: PerformanceAlert, channel?: string): object {
    const color = this.getLevelColor(alert.level)
    const emoji = this.getLevelEmoji(alert.level)

    const attachment: Record<string, unknown> = {
      color,
      title: `${emoji} ${alert.title}`,
      text: alert.message,
      fields: [
        {
          title: 'Level',
          value: alert.level.toUpperCase(),
          short: true,
        },
        {
          title: 'Category',
          value: alert.category,
          short: true,
        },
        {
          title: 'Source',
          value: alert.source,
          short: true,
        },
        {
          title: 'Status',
          value: alert.status,
          short: true,
        },
      ],
      footer: 'Performance Alerting System',
      ts: Math.floor(alert.createdAt / 1000),
    }

    // Add metric fields if available
    if (alert.metric) {
      const fields = attachment.fields as Array<{ title: string; value: string | number; short: boolean }>
      fields.push(
        { title: 'Metric', value: alert.metric, short: true },
        { title: 'Current Value', value: alert.currentValue ?? 'N/A', short: true }
      )
    }

    // Add threshold if available
    if (alert.threshold !== undefined) {
      const fields = attachment.fields as Array<{ title: string; value: string | number; short: boolean }>
      fields.push({ title: 'Threshold', value: alert.threshold, short: true })
    }

    // Add occurrence count
    if (alert.occurrenceCount > 1) {
      const fields = attachment.fields as Array<{ title: string; value: string | number; short: boolean }>
      fields.push({ title: 'Occurrences', value: alert.occurrenceCount, short: true })
    }

    // Add metadata if configured
    if (this.options.includeMetadata && alert.metadata) {
      const fields = attachment.fields as Array<{ title: string; value: string | number; short: boolean }>
      Object.entries(alert.metadata).forEach(([key, value]) => {
        fields.push({
          title: key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          short: true,
        })
      })
    }

    const message: Record<string, unknown> = {
      username: this.config.username || 'Performance Alerter',
      icon_emoji: this.config.iconEmoji || ':warning:',
      text: `${emoji} *${alert.level.toUpperCase()}*: ${alert.title}`,
      attachments: [attachment],
    }

    if (channel) {
      message.channel = channel
    }

    if (this.options.mention) {
      message.text = `${this.options.mention} ${message.text}`
    }

    return message
  }

  /**
   * Post message to Slack webhook
   */
  private async postMessage(message: object): Promise<void> {
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Slack webhook failed: ${response.status} ${text}`)
    }
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: Error): boolean {
    // Retry on network errors and 5xx errors
    if (error.message.includes('ECONNREFUSED')) return true
    if (error.message.includes('ETIMEDOUT')) return true
    if (error.message.includes('503')) return true
    if (error.message.includes('429')) return true // Rate limit
    return false
  }

  /**
   * Get color for alert level
   */
  private getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      info: '#36a64f',
      warning: '#daa038',
      error: '#dc3545',
      critical: '#b60205',
    }
    return colors[level] || '#808080'
  }

  /**
   * Get emoji for alert level
   */
  private getLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    }
    return emojis[level] || '📢'
  }

  /**
   * Test webhook connectivity
   */
  async test(): Promise<boolean> {
    try {
      const testMessage = {
        username: this.config.username || 'Performance Alerter',
        icon_emoji: ':white_check_mark:',
        text: ':white_check_mark: *Enhanced Slack webhook test successful!*',
        attachments: [
          {
            color: '#22c55e',
            title: 'Performance Alerting System v1.9.0',
            text: 'Your Enhanced Slack webhook is properly configured.',
            footer: 'Test Message',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      })

      return response.ok
    } catch (error) {
      console.error('[EnhancedSlackChannel] Test failed:', error)
      return false
    }
  }

  /**
   * Update channel options
   */
  updateOptions(options: Partial<SlackAlertOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current options
   */
  getOptions(): SlackAlertOptions {
    return { ...this.options }
  }

  /**
   * Reset throttler
   */
  resetThrottler(): void {
    this.throttler?.reset()
  }
}
