/**
 * Slack Alert Channel
 * Sends performance alerts to Slack via webhooks
 */

import {
  formatSlackAlert,
  getSlackLevelEmoji,
  getLevelColor,
  formatTimestamp,
  type AlertLevel,
} from '@/lib/utils/formatting'
import type { PerformanceAlert } from '../alerter'

// ========================================
// Types
// ========================================

export interface SlackConfig {
  /** Slack webhook URL */
  webhookUrl: string
  /** Channel to send to (overrides webhook default) */
  channel?: string
  /** Username for the bot */
  username?: string
  /** Icon emoji for the bot */
  iconEmoji?: string
  /** Icon URL for the bot */
  iconUrl?: string
}

export interface SlackAlertOptions {
  /** Override channel for this alert */
  channel?: string
  /** Include detailed fields */
  includeFields?: boolean
  /** Include metadata */
  includeMetadata?: boolean
  /** Custom mention (user or group) */
  mention?: string
  /** Custom message prefix */
  messagePrefix?: string
  /** Custom footer text */
  footer?: string
}

// ========================================
// SlackChannel Class
// ========================================

export class SlackChannel {
  name = 'slack'
  private webhookUrl: string
  private defaultConfig: SlackConfig
  private options: SlackAlertOptions

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.webhookUrl = config.webhookUrl
    this.defaultConfig = config
    this.options = options || {}
  }

  /**
   * Send alert to Slack
   */
  async send(alert: PerformanceAlert): Promise<void> {
    // Use shared formatter for Slack message
    const slackMessage = formatSlackAlert(
      {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        level: alert.level as AlertLevel,
        category: alert.category,
        status: alert.status,
        source: alert.source,
        metric: alert.metric,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        metadata: alert.metadata,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        resolvedAt: alert.resolvedAt,
        occurrenceCount: alert.occurrenceCount,
        tags: alert.tags,
      },
      {
        mention: this.options.mention,
        includeMetadata: this.options.includeMetadata,
        includeMetric: true,
      }
    )

    // Build the complete message with optional channel
    const message: {
      channel?: string
      username: string
      icon_emoji: string
      icon_url?: string
      text: string
      attachments: typeof slackMessage.attachments
    } = {
      username: this.defaultConfig.username || 'Performance Alerter',
      icon_emoji: this.defaultConfig.iconEmoji || ':warning:',
      icon_url: this.defaultConfig.iconUrl,
      text: slackMessage.text,
      attachments: slackMessage.attachments,
    }

    // Add channel if specified
    if (this.options.channel) {
      message.channel = this.options.channel
    } else if (this.defaultConfig.channel) {
      message.channel = this.defaultConfig.channel
    }

    // Update footer if specified
    if (this.options.footer) {
      message.attachments[0].footer = this.options.footer
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Slack webhook failed: ${response.status} ${errorText}`)
      }

      console.log(`[SlackChannel] Alert sent to Slack: ${alert.id}`)
    } catch (error) {
      console.error('[SlackChannel] Failed to send alert:', error)
      throw error
    }
  }

  /**
   * Test webhook connectivity
   */
  async test(): Promise<boolean> {
    try {
      const testMessage = {
        username: this.defaultConfig.username || 'Performance Alerter',
        icon_emoji: ':white_check_mark:',
        text: ':white_check_mark: *Slack webhook test successful!*',
        attachments: [
          {
            color: '#22c55e',
            title: 'Performance Alerting System',
            text: 'Your Slack webhook is properly configured.',
            footer: 'Test Message',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      })

      if (!response.ok) {
        console.error('[SlackChannel] Webhook test failed:', response.status)
        return false
      }

      return true
    } catch (error) {
      console.error('[SlackChannel] Webhook test error:', error)
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
}
