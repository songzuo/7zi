/**
 * Slack Alert Service
 *
 * Sends alert notifications via Slack Incoming Webhook
 * with formatted messages, error handling, and retry logic
 *
 * @module lib/alerting/SlackAlertService
 */

import type { PerformanceAlert, AlertLevel, AlertChannel } from '@/lib/performance/alerting/alerter'

// ========================================
// Types
// ========================================

/**
 * Slack alert configuration
 */
export interface SlackAlertConfig {
  /** Slack Incoming Webhook URL */
  webhookUrl: string
  /** Enable/disable the service */
  enabled: boolean
  /** Minimum alert level to send (default: 'warning') */
  minLevel?: AlertLevel
  /** Channel override (uses webhook default if not specified) */
  channel?: string
  /** Username override */
  username?: string
  /** Icon emoji override */
  iconEmoji?: string
  /** Retry configuration */
  retry?: {
    maxAttempts: number
    delayMs: number
    backoffMultiplier: number
  }
}

/**
 * Slack attachment field
 */
export interface SlackAttachmentField {
  title: string
  value: string
  short?: boolean
}

/**
 * Slack attachment
 */
export interface SlackAttachment {
  color?: string
  title?: string
  title_link?: string
  text?: string
  fields?: SlackAttachmentField[]
  footer?: string
  footer_icon?: string
  ts?: number
  mrkdwn_in?: string[]
}

/**
 * Slack message payload
 */
export interface SlackMessagePayload {
  text?: string
  channel?: string
  username?: string
  icon_emoji?: string
  attachments?: SlackAttachment[]
}

/**
 * Slack send result
 */
export interface SlackSendResult {
  /** Whether the message was sent successfully */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Number of retry attempts made */
  attempts: number
  /** Timestamp when sent */
  timestamp: number
}

/**
 * Slack service status
 */
export interface SlackServiceStatus {
  /** Whether the service is enabled */
  enabled: boolean
  /** Last successful send timestamp */
  lastSendSuccess?: number
  /** Last failed send timestamp */
  lastSendFailure?: number
  /** Total messages sent */
  totalSent: number
  /** Total messages failed */
  totalFailed: number
  /** Last error message */
  lastError?: string
}

// ========================================
// Alert Level Utilities
// ========================================

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
}

/**
 * Get color for alert level (Slack attachment color)
 */
function getLevelColor(level: AlertLevel): string {
  const colors: Record<AlertLevel, string> = {
    info: '#36a64f', // green
    warning: '#ff9900', // orange
    error: '#ff6b6b', // light red
    critical: '#dc2626', // dark red
  }
  return colors[level]
}

/**
 * Get emoji for alert level
 */
function getLevelEmoji(level: AlertLevel): string {
  const emojis: Record<AlertLevel, string> = {
    info: ':information_source:',
    warning: ':warning:',
    error: ':x:',
    critical: ':rotating_light:',
  }
  return emojis[level]
}

/**
 * Check if a level meets the minimum threshold
 */
function meetsMinLevel(level: AlertLevel, minLevel: AlertLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel]
}

// ========================================
// Slack Alert Service Implementation
// ========================================

/**
 * Slack Alert Service
 *
 * Implements the AlertChannel interface for sending alerts via Slack Incoming Webhook
 */
export class SlackAlertService implements AlertChannel {
  readonly name = 'slack'

  private config: SlackAlertConfig
  private status: SlackServiceStatus = {
    enabled: true,
    totalSent: 0,
    totalFailed: 0,
  }

  constructor(config: SlackAlertConfig) {
    // Validate configuration
    if (!config.webhookUrl) {
      throw new Error('Slack webhook URL is required')
    }

    if (!config.webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid Slack webhook URL. Must start with https://hooks.slack.com/')
    }

    this.config = {
      enabled: true,
      minLevel: 'warning',
      ...config,
    }
    this.status.enabled = this.config.enabled
  }

  // ========================================
  // AlertChannel Interface Implementation
  // ========================================

  /**
   * Send an alert via Slack
   */
  async send(alert: PerformanceAlert): Promise<void> {
    if (!this.status.enabled) {
      console.log('[SlackAlertService] Slack alerting is disabled, skipping')
      return
    }

    // Check minimum level
    if (this.config.minLevel && !meetsMinLevel(alert.level, this.config.minLevel)) {
      console.log(`[SlackAlertService] Alert level ${alert.level} below minimum ${this.config.minLevel}, skipping`)
      return
    }

    const result = await this.sendAlert(alert)

    if (!result.success) {
      throw new Error(result.error || 'Failed to send Slack alert')
    }
  }

  /**
   * Test the webhook connection
   */
  async test(): Promise<boolean> {
    try {
      const testPayload: SlackMessagePayload = {
        text: '🔔 7zi Monitoring - Test Alert',
        attachments: [
          {
            color: '#36a64f',
            title: 'Test Alert',
            text: 'This is a test message from 7zi Monitoring to verify Slack integration.',
            footer: '7zi Monitoring',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      await this.postMessage(testPayload)
      return true
    } catch (error) {
      console.error('[SlackAlertService] Test failed:', error)
      return false
    }
  }

  // ========================================
  // Slack Message Sending
  // ========================================

  /**
   * Send an alert with retry logic
   */
  async sendAlert(alert: PerformanceAlert): Promise<SlackSendResult> {
    const startTime = Date.now()
    let attempts = 0
    const maxAttempts = this.config.retry?.maxAttempts ?? 3
    const baseDelay = this.config.retry?.delayMs ?? 1000
    const backoff = this.config.retry?.backoffMultiplier ?? 2

    const payload = this.formatAlertMessage(alert)

    // Retry loop
    while (attempts < maxAttempts) {
      attempts++

      try {
        await this.postMessage(payload)

        // Success
        this.status.totalSent++
        this.status.lastSendSuccess = Date.now()

        return {
          success: true,
          attempts,
          timestamp: Date.now(),
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.status.lastError = errorMessage

        // Check if we should retry
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          const delay = baseDelay * Math.pow(backoff, attempts - 1)
          console.warn(
            `[SlackAlertService] Attempt ${attempts}/${maxAttempts} failed, retrying in ${delay}ms: ${errorMessage}`
          )
          await this.sleep(delay)
        } else {
          // Final failure
          this.status.totalFailed++
          this.status.lastSendFailure = Date.now()

          return {
            success: false,
            error: errorMessage,
            attempts,
            timestamp: Date.now(),
          }
        }
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: 'Max retry attempts exceeded',
      attempts,
      timestamp: Date.now(),
    }
  }

  /**
   * Post message to Slack webhook
   */
  private async postMessage(payload: SlackMessagePayload): Promise<void> {
    // Apply channel/username overrides if configured
    const finalPayload: SlackMessagePayload = {
      ...payload,
    }

    if (this.config.channel) {
      finalPayload.channel = this.config.channel
    }

    if (this.config.username) {
      finalPayload.username = this.config.username
    }

    if (this.config.iconEmoji) {
      finalPayload.icon_emoji = this.config.iconEmoji
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    })

    // Slack webhook returns "ok" on success
    const text = await response.text()

    if (!response.ok || text !== 'ok') {
      throw new Error(`Slack API error: ${response.status} - ${text}`)
    }
  }

  /**
   * Format alert as Slack message
   */
  private formatAlertMessage(alert: PerformanceAlert): SlackMessagePayload {
    const emoji = getLevelEmoji(alert.level)
    const color = getLevelColor(alert.level)

    const fields: SlackAttachmentField[] = [
      {
        title: 'Level',
        value: `${emoji} ${alert.level.toUpperCase()}`,
        short: true,
      },
      {
        title: 'Category',
        value: alert.category,
        short: true,
      },
    ]

    // Add source
    if (alert.source) {
      fields.push({
        title: 'Source',
        value: alert.source,
        short: true,
      })
    }

    // Add metric info
    if (alert.metric) {
      let metricValue = alert.metric
      if (alert.currentValue !== undefined) {
        metricValue += ` = ${alert.currentValue}`
        if (alert.threshold !== undefined) {
          metricValue += ` (threshold: ${alert.threshold})`
        }
      }
      fields.push({
        title: 'Metric',
        value: metricValue,
        short: true,
      })
    }

    // Add occurrence count if > 1
    if (alert.occurrenceCount > 1) {
      fields.push({
        title: 'Occurrences',
        value: alert.occurrenceCount.toString(),
        short: true,
      })
    }

    // Add tags if present
    if (alert.tags && alert.tags.length > 0) {
      fields.push({
        title: 'Tags',
        value: alert.tags.join(', '),
        short: false,
      })
    }

    const attachment: SlackAttachment = {
      color,
      title: alert.title,
      text: alert.message,
      fields,
      footer: '7zi Monitoring',
      footer_icon: 'https://7zi.com/favicon.ico',
      ts: Math.floor(alert.createdAt / 1000),
      mrkdwn_in: ['text'],
    }

    // Add metadata if present
    if (alert.metadata && Object.keys(alert.metadata).length > 0) {
      const metadataText = Object.entries(alert.metadata)
        .map(([key, value]) => `• *${key}*: ${value}`)
        .join('\n')

      attachment.fields?.push({
        title: 'Details',
        value: metadataText,
        short: false,
      })
    }

    return {
      text: `${emoji} [${alert.level.toUpperCase()}] ${alert.title}`,
      attachments: [attachment],
    }
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true
    }

    const message = error.message.toLowerCase()

    // Network/timeout errors - retry
    if (
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('timeout') ||
      message.includes('network')
    ) {
      return true
    }

    // Rate limiting - retry
    if (message.includes('rate') || message.includes('limit') || message.includes('throttl') || message.includes('429')) {
      return true
    }

    // 5xx errors - retry
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true
    }

    // Invalid webhook - don't retry
    if (message.includes('invalid') || message.includes('not found') || message.includes('404') || message.includes('403')) {
      return false
    }

    // Default: retry
    return true
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ========================================
  // Status & Configuration
  // ========================================

  /**
   * Get current status
   */
  getStatus(): SlackServiceStatus {
    return { ...this.status }
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled: boolean): void {
    this.status.enabled = enabled
    this.config.enabled = enabled
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.status.enabled
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SlackAlertConfig>): Promise<void> {
    if (config.webhookUrl !== undefined && !config.webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid Slack webhook URL')
    }

    this.config = { ...this.config, ...config }
    this.status.enabled = this.config.enabled

    return Promise.resolve()
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<SlackAlertConfig, 'webhookUrl'> & { webhookUrl: string } {
    return {
      ...this.config,
      webhookUrl: this.maskWebhookUrl(this.config.webhookUrl),
    }
  }

  /**
   * Mask webhook URL for logging/display
   */
  private maskWebhookUrl(url: string): string {
    try {
      const parts = url.split('/')
      const token = parts[parts.length - 1]
      if (token && token.length > 8) {
        return `${parts.slice(0, -1).join('/')}/${token.substring(0, 4)}...${token.substring(token.length - 4)}`
      }
      return url
    } catch {
      return '***'
    }
  }
}

// ========================================
// Factory Functions
// ========================================

/**
 * Parse Slack configuration from environment variables
 */
export function parseSlackConfig(): SlackAlertConfig {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL || ''
  const enabled = process.env.SLACK_ALERTING_ENABLED !== 'false' // Default true if webhook is set

  if (!webhookUrl) {
    return {
      webhookUrl: '',
      enabled: false,
    }
  }

  return {
    webhookUrl,
    enabled,
    minLevel: (process.env.SLACK_ALERT_MIN_LEVEL as AlertLevel) || 'warning',
    channel: process.env.SLACK_CHANNEL || undefined,
    username: process.env.SLACK_USERNAME || '7zi Monitoring',
    iconEmoji: process.env.SLACK_ICON_EMOJI || ':bell:',
    retry: {
      maxAttempts: parseInt(process.env.SLACK_RETRY_MAX_ATTEMPTS || '3', 10),
      delayMs: parseInt(process.env.SLACK_RETRY_DELAY_MS || '1000', 10),
      backoffMultiplier: parseFloat(process.env.SLACK_RETRY_BACKOFF || '2'),
    },
  }
}

/**
 * Create a Slack Alert Service from environment variables
 */
export function createSlackAlertService(): SlackAlertService | null {
  const config = parseSlackConfig()

  if (!config.webhookUrl || !config.enabled) {
    console.log('[SlackAlertService] Slack alerting is disabled or not configured')
    return null
  }

  return new SlackAlertService(config)
}

// ========================================
// Export
// ========================================

export default SlackAlertService
