/**
 * Webhook Alert Channel
 * Webhook 告警渠道
 *
 * Sends alerts via HTTP webhook to external services.
 * Features:
 * - Retry mechanism with exponential backoff
 * - Alert deduplication
 * - Rate limiting
 * - Severity-based filtering
 * - Custom headers and templates
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

export interface WebhookChannelConfig extends BaseChannelConfig {
  // Webhook configuration
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>

  // Template options
  includeContext?: boolean
  customPayload?: (alert: Alert) => Record<string, unknown>

  // Options
  timeout?: number
}

interface WebhookPayload {
  alert_id: string
  rule_id: string
  rule_name: string
  priority: string
  severity: string
  status: string
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: number
  timestamp_iso: string
  started_at: number
  started_at_iso: string
  ended_at?: number
  ended_at_iso?: string
  context?: Record<string, unknown>
  labels?: Record<string, string>
}

/**
 * Webhook Alert Channel
 */
export class WebhookAlertChannel extends BaseAlertChannel implements AlertChannel {
  private webhookConfig: WebhookChannelConfig

  constructor(config: WebhookChannelConfig) {
    const baseConfig: BaseChannelConfig = {
      enabled: true,
      retry: config.retry,
      dedup: config.dedup,
      rateLimit: config.rateLimit,
      severityFilter: config.severityFilter,
      priorityFilter: config.priorityFilter,
    }

    super(baseConfig)

    this.webhookConfig = {
      method: 'POST',
      timeout: 10000,
      includeContext: true,
      ...config,
    }
  }

  /**
   * Get channel key for deduplication and rate limiting
   */
  protected getChannelKey(): string {
    return `webhook:${this.webhookConfig.url}`
  }

  /**
   * Internal send method
   */
  protected async sendInternal(alert: Alert): Promise<void> {
    const payload = this.buildPayload(alert)

    const response = await fetch(this.webhookConfig.url, {
      method: this.webhookConfig.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.webhookConfig.headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.webhookConfig.timeout || 10000),
    })

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
    }

    console.log(`[WebhookAlert] Sent webhook to ${this.webhookConfig.url}`)
  }

  /**
   * Build webhook payload from alert
   */
  private buildPayload(alert: Alert): WebhookPayload | Record<string, unknown> {
    // If custom payload builder is provided, use it
    if (this.webhookConfig.customPayload) {
      return this.webhookConfig.customPayload(alert)
    }

    // Build standard payload
    const payload: WebhookPayload = {
      alert_id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.ruleName,
      priority: alert.priority,
      severity: alert.severity,
      status: alert.status,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      message: alert.message,
      timestamp: alert.timestamp,
      timestamp_iso: new Date(alert.timestamp).toISOString(),
      started_at: alert.startedAt,
      started_at_iso: new Date(alert.startedAt).toISOString(),
    }

    if (alert.endedAt) {
      payload.ended_at = alert.endedAt
      payload.ended_at_iso = new Date(alert.endedAt).toISOString()
    }

    if (this.webhookConfig.includeContext && alert.context) {
      payload.context = alert.context
    }

    if (alert.labels) {
      payload.labels = alert.labels
    }

    return payload
  }

  /**
   * Test webhook connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch(this.webhookConfig.url, {
        method: this.webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.webhookConfig.headers,
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        console.log('[WebhookAlert] Connection verified')
        return true
      }

      console.warn(`[WebhookAlert] Test failed: ${response.status}`)
      return false
    } catch (error) {
      console.error('[WebhookAlert] Connection test failed:', error)
      return false
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WebhookChannelConfig>): void {
    this.webhookConfig = { ...this.webhookConfig, ...config }

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
  getConfig(): WebhookChannelConfig {
    return { ...this.webhookConfig }
  }
}

/**
 * Create webhook channel from environment variables
 */
export function createWebhookChannelFromEnv(): WebhookAlertChannel | null {
  const url = process.env.WEBHOOK_URL

  if (!url) {
    console.warn('[WebhookAlert] Webhook URL not configured')
    return null
  }

  const headers: Record<string, string> = {}
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (webhookSecret) {
    headers['Authorization'] = `Bearer ${webhookSecret}`
  }

  return new WebhookAlertChannel({
    enabled: true,
    url,
    method: (process.env.WEBHOOK_METHOD as 'GET' | 'POST' | 'PUT' | 'PATCH') || 'POST',
    headers,
  })
}

export default WebhookAlertChannel
