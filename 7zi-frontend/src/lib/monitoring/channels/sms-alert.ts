/**
 * SMS Alert Channel
 * 短信告警渠道
 *
 * Sends alerts via SMS using SMS gateway service.
 * Features:
 * - Retry mechanism with exponential backoff
 * - Alert deduplication
 * - Rate limiting
 * - Severity-based filtering
 *
 * @version 1.0.0
 */

import { Alert, AlertChannel } from '../alert-engine'
import {
  BaseAlertChannel,
  BaseChannelConfig,
  RetryConfig,
  DedupConfig,
  RateLimitConfig,
} from './base-alert-channel'

export interface SMSChannelConfig extends BaseChannelConfig {
  // SMS Gateway Configuration
  gatewayUrl?: string
  apiKey?: string
  senderId?: string

  // Recipients
  recipients: {
    P0: string[]
    P1: string[]
    P2: string[]
    P3: string[]
    all?: string[]
  }

  // Template options
  maxLength?: number
}

interface SMSMessage {
  to: string
  message: string
}

/**
 * SMS Alert Channel
 */
export class SMSAlertChannel extends BaseAlertChannel implements AlertChannel {
  private smsConfig: SMSChannelConfig

  constructor(config: SMSChannelConfig) {
    const baseConfig: BaseChannelConfig = {
      enabled: true,
      retry: config.retry,
      dedup: config.dedup,
      rateLimit: config.rateLimit,
      severityFilter: config.severityFilter,
      priorityFilter: config.priorityFilter,
    }

    super(baseConfig)

    this.smsConfig = {
      maxLength: 160,
      ...config,
    }
  }

  /**
   * Get channel key for deduplication and rate limiting
   */
  protected getChannelKey(): string {
    return 'sms'
  }

  /**
   * Internal send method
   */
  protected async sendInternal(alert: Alert): Promise<void> {
    const message = this.buildSMSMessage(alert)
    const recipients = this.getRecipients(alert.priority)

    for (const recipient of recipients) {
      await this.sendSMS(recipient, message)
    }
  }

  /**
   * Send SMS to a recipient
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    // If gateway is configured, try to send via HTTP API
    if (this.smsConfig.gatewayUrl && this.smsConfig.apiKey) {
      try {
        const response = await fetch(`${this.smsConfig.gatewayUrl}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.smsConfig.apiKey}`,
          },
          body: JSON.stringify({
            to,
            from: this.smsConfig.senderId,
            message,
          }),
        })

        if (!response.ok) {
          throw new Error(`SMS gateway returned ${response.status}: ${response.statusText}`)
        }

        console.log(`[SMSAlert] Sent SMS to ${to}`)
        return
      } catch (error) {
        console.error(`[SMSAlert] Failed to send SMS:`, error)
        throw error
      }
    }

    // Fallback to console log if gateway not configured
    console.log(`[SMSAlert] Would send SMS to ${to}: ${message}`)
  }

  /**
   * Build SMS message from alert
   */
  private buildSMSMessage(alert: Alert): string {
    const priority = alert.priority || 'P3'
    const severity = alert.severity.toUpperCase().substring(0, 1)

    let message = `[${priority}${severity}] ${alert.ruleName}: ${alert.message}`

    // Add metric info
    message += ` ${alert.metric}=${alert.value}`

    // Truncate if needed
    if (message.length > (this.smsConfig.maxLength || 160)) {
      message = message.substring(0, (this.smsConfig.maxLength || 160) - 3) + '...'
    }

    return message
  }

  /**
   * Get recipients based on priority
   */
  private getRecipients(priority: string): string[] {
    const configPriority = priority as keyof typeof this.smsConfig.recipients
    const recipients = this.smsConfig.recipients[configPriority]

    if (!recipients) {
      return this.smsConfig.recipients.P3 || []
    }

    if (this.smsConfig.recipients.all) {
      return Array.from(new Set([...recipients, ...this.smsConfig.recipients.all]))
    }

    return recipients
  }

  /**
   * Test SMS connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.smsConfig.gatewayUrl || !this.smsConfig.apiKey) {
      console.warn('[SMSAlert] Gateway not configured, SMS will be logged only')
      return false
    }

    try {
      const response = await fetch(`${this.smsConfig.gatewayUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.smsConfig.apiKey}`,
        },
      })

      if (response.ok) {
        console.log('[SMSAlert] Connection verified')
        return true
      }

      return false
    } catch (error) {
      console.error('[SMSAlert] Connection test failed:', error)
      return false
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SMSChannelConfig>): void {
    this.smsConfig = { ...this.smsConfig, ...config }

    super.updateConfig({
      retry: config.retry,
      dedup: config.dedup,
      rateLimit: config.rateLimit,
      severityFilter: config.severityFilter,
      priorityFilter: config.priorityFilter,
    })
  }

  /**
   * Get configuration
   */
  getConfig(): SMSChannelConfig {
    return { ...this.smsConfig }
  }
}

/**
 * Create SMS channel from environment variables
 */
export function createSMSChannelFromEnv(): SMSAlertChannel | null {
  const gatewayUrl = process.env.SMS_GATEWAY_URL
  const apiKey = process.env.SMS_API_KEY
  const senderId = process.env.SMS_SENDER_ID

  if (!gatewayUrl || !apiKey) {
    console.warn('[SMSAlert] Gateway not configured, SMS alerts will be logged only')
    // Return a default channel with no gateway
    return new SMSAlertChannel({
      enabled: true,
      recipients: {
        P0: [],
        P1: [],
        P2: [],
        P3: [],
      },
    })
  }

  return new SMSAlertChannel({
    enabled: true,
    gatewayUrl,
    apiKey,
    senderId,
    recipients: {
      P0: (process.env.SMS_RECIPIENTS_P0 || '').split(',').filter(Boolean),
      P1: (process.env.SMS_RECIPIENTS_P1 || '').split(',').filter(Boolean),
      P2: (process.env.SMS_RECIPIENTS_P2 || '').split(',').filter(Boolean),
      P3: (process.env.SMS_RECIPIENTS_P3 || '').split(',').filter(Boolean),
      all: (process.env.SMS_RECIPIENTS_ALL || '').split(',').filter(Boolean),
    },
  })
}

export default SMSAlertChannel
