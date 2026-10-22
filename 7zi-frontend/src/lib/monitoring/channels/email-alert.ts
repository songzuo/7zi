/**
 * Email Alert Channel
 * 邮件告警渠道
 *
 * Sends alerts via the server-side email API (`POST /api/email`).
 *
 * P0-3 安全修复：nodemailer 仅在服务端路由 `src/app/api/email/route.ts`
 * 中加载，本模块不再 import nodemailer，SMTP 凭据不会进入客户端 bundle。
 *
 * Features:
 * - Retry mechanism with exponential backoff
 * - Alert deduplication
 * - Rate limiting
 * - Severity-based filtering
 *
 * @version 2.1.0
 */

import { Alert, AlertChannel } from '../alert-engine'
import { logger } from '@/lib/logger'
import { sendEmailViaApi, testSmtpViaApi } from '@/lib/email/api-client'
import { BaseAlertChannel, BaseChannelConfig } from './base-alert-channel'

export interface EmailChannelConfig extends BaseChannelConfig {
  // SMTP Configuration
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  auth: {
    user: string
    pass: string
  }

  // Email Options
  from: string
  recipients: {
    P0?: string[]
    P1?: string[]
    P2?: string[]
    P3?: string[]
    all?: string[]
  }

  // Template options
  includeContext?: boolean
  includeStackTrace?: boolean
}

interface EmailMessage {
  from: string
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Email Alert Channel
 */
export class EmailAlertChannel extends BaseAlertChannel implements AlertChannel {
  private emailConfig: EmailChannelConfig

  constructor(config: EmailChannelConfig) {
    const baseConfig: BaseChannelConfig = {
      enabled: config.enabled ?? true,
      retry: config.retry,
      dedup: config.dedup,
      rateLimit: config.rateLimit,
      severityFilter: config.severityFilter,
      priorityFilter: config.priorityFilter,
    }

    super(baseConfig)

    this.emailConfig = {
      includeContext: true,
      includeStackTrace: false,
      ...config,
    }
  }

  /**
   * Get channel key for deduplication and rate limiting
   */
  protected getChannelKey(): string {
    return 'email'
  }

  /**
   * Internal send method
   */
  protected async sendInternal(alert: Alert): Promise<void> {
    const message = this.buildEmailMessage(alert)

    // 通过服务端邮件 API 发送（nodemailer 只存在于服务端路由中）
    const result = await sendEmailViaApi({
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      from: this.emailConfig.from,
    })

    if (result.success) {
      logger.debug(`[EmailAlert] Sent: ${message.subject} to ${message.to}`)
      return
    }

    // SMTP 未配置（503）或 API 不可达（网络错误）-> 保留 console fallback 行为
    if (result.status === 503 || result.status === 0) {
      logger.warn(
        `[EmailAlert] Email API unavailable (${result.status || 'network'}): ${result.error}. ` +
          'Falling back to console log.'
      )
      logger.debug(`[EmailAlert] Would send: ${message.subject}`)
      logger.debug(`[EmailAlert] To: ${message.to}`)
      logger.debug(`[EmailAlert] Body:\n${message.text}`)
      return
    }

    // 真实发送失败 -> 抛出错误，交由上层重试机制处理
    logger.error(
      `[EmailAlert] Failed to send: ${result.error || 'unknown error'}`,
      new Error(result.error || 'Failed to send email')
    )
    throw new Error(result.error || 'Failed to send email')
  }

  /**
   * Build email message from alert
   */
  private buildEmailMessage(alert: Alert): EmailMessage {
    const priority = alert.priority || 'P3'
    const recipients = this.getRecipients(priority)

    const severityEmoji = this.getSeverityEmoji(alert.severity)
    const priorityLabel = this.getPriorityLabel(priority)

    const subject = `[${priorityLabel}] ${severityEmoji} ${alert.ruleName}`

    const text = this.buildTextContent(alert)
    const html = this.buildHtmlContent(alert)

    return {
      from: this.emailConfig.from,
      to: recipients.join(', '),
      subject,
      text,
      html,
    }
  }

  /**
   * Get recipients based on priority
   */
  private getRecipients(priority: string): string[] {
    const configPriority = priority as keyof typeof this.emailConfig.recipients
    const recipients = this.emailConfig.recipients[configPriority]

    if (!recipients) {
      return this.emailConfig.recipients.P3 || []
    }

    if (this.emailConfig.recipients.all) {
      // Use Array.from instead of spread to avoid downlevelIteration issue
      return Array.from(new Set([...recipients, ...this.emailConfig.recipients.all]))
    }

    return recipients
  }

  /**
   * Build plain text email content
   */
  private buildTextContent(alert: Alert): string {
    const lines = [
      `═══════════════════════════════════════════════════════════════`,
      `                    PERFORMANCE ALERT`,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      `Rule: ${alert.ruleName}`,
      `Priority: ${alert.priority}`,
      `Severity: ${alert.severity}`,
      `Status: ${alert.status}`,
      ``,
      `────────────────── METRIC ──────────────────`,
      `Metric: ${alert.metric}`,
      `Value: ${alert.value}`,
      `Threshold: ${alert.threshold}`,
      ``,
      `────────────────── DETAILS ──────────────────`,
      `Message: ${alert.message}`,
      ``,
      `────────────────── TIMING ──────────────────`,
      `Triggered: ${new Date(alert.timestamp).toISOString()}`,
      alert.startedAt ? `Started: ${new Date(alert.startedAt).toISOString()}` : '',
      alert.endedAt ? `Ended: ${new Date(alert.endedAt).toISOString()}` : '',
      ``,
    ]

    if (this.emailConfig.includeContext && alert.context) {
      lines.push(`────────────────── CONTEXT ──────────────────`)
      lines.push(...this.formatContext(alert.context))
      lines.push(``)
    }

    lines.push(`═══════════════════════════════════════════════════════════════`)
    lines.push(`Alert ID: ${alert.id}`)
    lines.push(`Rule ID: ${alert.ruleId}`)

    return lines.filter(Boolean).join('\n')
  }

  /**
   * Build HTML email content
   */
  private buildHtmlContent(alert: Alert): string {
    const severityColor = this.getSeverityColor(alert.severity)
    const priorityBgColor = this.getPriorityBgColor(alert.priority)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px; background: ${severityColor}; color: white; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background: #eee; font-weight: 600; }
    .metric-value { font-size: 24px; font-weight: bold; color: ${severityColor}; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-priority { background: ${priorityBgColor}; color: white; }
    .badge-severity { background: ${severityColor}; color: white; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    pre { background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Performance Alert</h1>
      <p>${alert.ruleName}</p>
    </div>
    <div class="content">
      <p>
        <span class="badge badge-priority">${alert.priority}</span>
        <span class="badge badge-severity">${alert.severity.toUpperCase()}</span>
      </p>

      <table>
        <tr>
          <th>Metric</th>
          <td>${alert.metric}</td>
        </tr>
        <tr>
          <th>Value</th>
          <td><span class="metric-value">${alert.value}</span></td>
        </tr>
        <tr>
          <th>Threshold</th>
          <td>${alert.threshold}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td>${alert.status}</td>
        </tr>
        <tr>
          <th>Triggered</th>
          <td>${new Date(alert.timestamp).toLocaleString()}</td>
        </tr>
      </table>

      <h3>Message</h3>
      <p>${alert.message}</p>

      ${
        this.emailConfig.includeContext && alert.context
          ? `
        <h3>Context</h3>
        <pre>${JSON.stringify(alert.context, null, 2)}</pre>
      `
          : ''
      }
    </div>
    <div class="footer">
      <p>Alert ID: ${alert.id}</p>
      <p>Rule ID: ${alert.ruleId}</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Format context for text output
   */
  private formatContext(context: Record<string, unknown>): string[] {
    const lines: string[] = []

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'object') {
        lines.push(`${key}: ${JSON.stringify(value)}`)
      } else {
        lines.push(`${key}: ${value}`)
      }
    }

    return lines
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '🔔'
    }
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#9c27b0'
      case 'error':
        return '#f44336'
      case 'warning':
        return '#ff9800'
      case 'info':
        return '#2196f3'
      default:
        return '#607d8b'
    }
  }

  /**
   * Get priority background color
   */
  private getPriorityBgColor(priority: string): string {
    switch (priority) {
      case 'P0':
        return '#f44336'
      case 'P1':
        return '#ff9800'
      case 'P2':
        return '#ffc107'
      case 'P3':
        return '#4caf50'
      default:
        return '#607d8b'
    }
  }

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: string): string {
    return priority
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await testSmtpViaApi()

      if (result.success) {
        logger.debug('[EmailAlert] Connection verified')
        return true
      }

      logger.error(`[EmailAlert] Connection test failed: ${result.error || 'unknown error'}`)
      return false
    } catch (error) {
      logger.error('[EmailAlert] Connection test failed:', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmailChannelConfig>): void {
    this.emailConfig = { ...this.emailConfig, ...config }

    // Update base config
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
  getConfig(): EmailChannelConfig {
    return { ...this.emailConfig }
  }
}

/**
 * Create email channel from environment variables
 */
export function createEmailChannelFromEnv(): EmailAlertChannel | null {
  // 与服务端 /api/email 路由保持一致：优先 SMTP_*，回退到旧的 EMAIL_* 变量名
  const host = process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT || '587')
  const user = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'alerts@7zi.com'

  if (!host || !user || !pass) {
    logger.warn('[EmailAlert] SMTP not configured, email alerts will be logged only')
    return null
  }

  return new EmailAlertChannel({
    enabled: true,
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
    recipients: {
      P0: (process.env.EMAIL_RECIPIENTS_P0 || '').split(',').filter(Boolean),
      P1: (process.env.EMAIL_RECIPIENTS_P1 || '').split(',').filter(Boolean),
      P2: (process.env.EMAIL_RECIPIENTS_P2 || '').split(',').filter(Boolean),
      P3: (process.env.EMAIL_RECIPIENTS_P3 || '').split(',').filter(Boolean),
      all: (process.env.EMAIL_RECIPIENTS_ALL || '').split(',').filter(Boolean),
    },
  })
}

export default EmailAlertChannel