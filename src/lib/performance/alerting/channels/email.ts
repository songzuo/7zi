/**
 * Email Alert Channel
 * Sends performance alerts via email
 */

import nodemailer, { Transporter } from 'nodemailer'
import {
  formatEmailAlert,
  formatTimestamp,
  getLevelEmoji,
  type AlertLevel,
} from '@/lib/utils/formatting'
import type { PerformanceAlert } from '../alerter'

// ========================================
// Types
// ========================================

export interface EmailConfig {
  /** SMTP host */
  host: string
  /** SMTP port */
  port: number
  /** Username */
  user: string
  /** Password */
  password: string
  /** From address */
  from: string
  /** Enable TLS */
  secure?: boolean
  /** Recipients (optional, can be overridden per alert) */
  to?: string[]
  /** CC recipients */
  cc?: string[]
  /** BCC recipients */
  bcc?: string[]
}

export interface EmailAlertOptions {
  /** Override recipients for this alert */
  to?: string[]
  /** Add CC recipients */
  cc?: string[]
  /** Add BCC recipients */
  bcc?: string[]
  /** Email priority (high, normal, low) */
  priority?: 'high' | 'normal' | 'low'
  /** Add custom headers */
  headers?: Record<string, string>
  /** Include detailed metadata */
  includeMetadata?: boolean
}

// ========================================
// EmailChannel Class
// ========================================

export class EmailChannel {
  name = 'email'
  private transporter: Transporter
  private defaultConfig: EmailConfig
  private options: EmailAlertOptions
  private initialized = false

  constructor(config: EmailConfig, options?: EmailAlertOptions) {
    this.defaultConfig = config
    this.options = options || {}
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? true,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
    this.initialized = true
  }

  /**
   * Send alert via email
   */
  async send(alert: PerformanceAlert): Promise<void> {
    if (!this.initialized) {
      throw new Error('EmailChannel not initialized')
    }

    // Build recipients
    const recipients = this.options.to || this.defaultConfig.to || []
    const cc = this.options.cc || this.defaultConfig.cc || []
    const bcc = this.options.bcc || this.defaultConfig.bcc || []

    if (recipients.length === 0) {
      console.warn('[EmailChannel] No recipients configured, skipping email')
      return
    }

    // Use shared formatter for email content
    const { subject, text, html } = formatEmailAlert(
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
        includeMetadata: this.options.includeMetadata,
        includeMetric: true,
        priority: this.options.priority,
        html: true,
      }
    )

    // Build email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: this.defaultConfig.from,
      to: recipients.join(', '),
      cc: cc.length > 0 ? cc.join(', ') : undefined,
      bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
      subject,
      text,
      html,
      priority: this.mapLevelToPriority(alert.level),
      headers: this.options.headers,
    }

    // Send email
    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`[EmailChannel] Email sent for alert ${alert.id}`)
    } catch (error) {
      console.error('[EmailChannel] Failed to send email:', error)
      throw error
    }
  }

  /**
   * Test email connectivity
   */
  async test(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('[EmailChannel] Test failed:', error)
      return false
    }
  }

  /**
   * Map alert level to email priority
   */
  private mapLevelToPriority(level: string): 'high' | 'normal' | 'low' {
    const mapping: Record<string, 'high' | 'normal' | 'low'> = {
      info: 'low',
      warning: 'normal',
      error: 'high',
      critical: 'high',
    }
    return mapping[level] || 'normal'
  }

  /**
   * Update channel options
   */
  updateOptions(options: Partial<EmailAlertOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current options
   */
  getOptions(): EmailAlertOptions {
    return { ...this.options }
  }

  /**
   * Close the transporter
   */
  async close(): Promise<void> {
    await this.transporter.close()
    this.initialized = false
  }
}
