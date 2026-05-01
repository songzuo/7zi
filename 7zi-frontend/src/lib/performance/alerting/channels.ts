/**
 * Alert Channels Implementation
 * 告警渠道实现
 */

import { PerformanceAlert, AlertChannel, AlertChannelConfig, AlertSeverity } from './types'
import { logger } from '@/lib/logger'

/**
 * Email Channel - Email notifications
 */
export class EmailChannel implements AlertChannel {
  private config: Required<Pick<AlertChannelConfig['config'], 'recipients' | 'subject'>>

  constructor(config: { recipients: string[]; subject?: string }) {
    this.config = {
      recipients: config.recipients,
      subject: config.subject || 'Performance Alert',
    }
  }

  async send(alert: PerformanceAlert): Promise<void> {
    logger.debug(`[EMAIL] To: ${this.config.recipients.join(', ')}`)
    logger.debug(
      `[EMAIL] Subject: [${alert.severity.toUpperCase()}] ${this.config.subject} - ${alert.metric}`
    )
    logger.debug(`[EMAIL] Message: ${alert.message}`)
    logger.debug(`[EMAIL] Value: ${alert.value}, Threshold: ${alert.threshold}`)
    logger.debug(`[EMAIL] Timestamp: ${new Date(alert.timestamp).toISOString()}`)

    if (alert.context) {
      logger.debug(`[EMAIL] Context:`, JSON.stringify(alert.context, null, 2))
    }

    // TODO: Integrate with actual email service
    // Example with nodemailer:
    // await this.transporter.sendMail({
    //   from: this.config.from,
    //   to: this.config.recipients.join(', '),
    //   subject: `[${alert.severity.toUpperCase()}] ${this.config.subject} - ${alert.metric}`,
    //   text: alert.message,
    //   html: this.generateEmailHtml(alert)
    // });
  }

  private generateEmailHtml(alert: PerformanceAlert): string {
    return `
      <h2>Performance Alert: ${alert.metric}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Value:</strong> ${alert.value}</p>
      <p><strong>Threshold:</strong> ${alert.threshold}</p>
      <p><strong>Timestamp:</strong> ${new Date(alert.timestamp).toISOString()}</p>
      ${alert.context ? `<p><strong>Context:</strong> <pre>${JSON.stringify(alert.context, null, 2)}</pre></p>` : ''}
    `
  }
}

/**
 * Slack Channel - Slack webhook notifications
 */
export class SlackChannel implements AlertChannel {
  private config: Required<Pick<AlertChannelConfig['config'], 'webhookUrl' | 'channel'>>

  constructor(config: { webhookUrl: string; channel?: string }) {
    this.config = {
      webhookUrl: config.webhookUrl,
      channel: config.channel || '#alerts',
    }
  }

  async send(alert: PerformanceAlert): Promise<void> {
    const color = this.getColorForSeverity(alert.severity)
    const payload = {
      channel: this.config.channel,
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] Performance Alert`,
          fields: [
            {
              title: 'Metric',
              value: alert.metric,
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity,
              short: true,
            },
            {
              title: 'Value',
              value: alert.value.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.threshold.toString(),
              short: true,
            },
          ],
          text: alert.message,
          ts: Math.floor(alert.timestamp / 1000),
          footer: alert.context ? JSON.stringify(alert.context) : undefined,
        },
      ],
    }

    logger.debug(`[SLACK] Webhook: ${this.config.webhookUrl}`)
    logger.debug(`[SLACK] Channel: ${this.config.channel}`)
    logger.debug(`[SLACK] Payload:`, JSON.stringify(payload, null, 2))

    // TODO: Send actual webhook
    // await fetch(this.config.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
  }

  private getColorForSeverity(severity: AlertSeverity): string {
    switch (severity) {
      case 'info':
        return '#36a64f' // green
      case 'warning':
        return '#ff9800' // orange
      case 'error':
        return '#f44336' // red
      case 'critical':
        return '#9c27b0' // purple
      default:
        return '#2196f3' // blue
    }
  }
}

/**
 * Dashboard Channel - In-app notifications
 */
export class DashboardChannel implements AlertChannel {
  private config: Required<Pick<AlertChannelConfig['config'], 'showToast' | 'playSound'>>

  constructor(config: { showToast?: boolean; playSound?: boolean }) {
    this.config = {
      showToast: config.showToast ?? true,
      playSound: config.playSound ?? false,
    }
  }

  async send(alert: PerformanceAlert): Promise<void> {
    logger.debug(`[DASHBOARD] Severity: ${alert.severity.toUpperCase()}`)
    logger.debug(`[DASHBOARD] Metric: ${alert.metric}`)
    logger.debug(`[DASHBOARD] Message: ${alert.message}`)
    logger.debug(`[DASHBOARD] Value: ${alert.value}, Threshold: ${alert.threshold}`)
    logger.debug(`[DASHBOARD] Show Toast: ${this.config.showToast}`)
    logger.debug(`[DASHBOARD] Play Sound: ${this.config.playSound}`)

    if (this.config.showToast) {
      // TODO: Integrate with toast notification system
      // Example with react-toastify:
      // toast(alert.message, {
      //   type: this.getToastType(alert.severity),
      //   position: 'top-right',
      //   autoClose: alert.severity === 'critical' ? false : 5000
      // });
    }

    if (this.config.playSound && (alert.severity === 'error' || alert.severity === 'critical')) {
      // TODO: Play notification sound
      // Example with Howler.js:
      // new Howl({ src: ['/sounds/alert.mp3'] }).play();
    }
  }

  private getToastType(
    severity: AlertSeverity
  ): 'success' | 'info' | 'warning' | 'error' | 'default' {
    switch (severity) {
      case 'info':
        return 'info'
      case 'warning':
        return 'warning'
      case 'error':
      case 'critical':
        return 'error'
      default:
        return 'default'
    }
  }
}

/**
 * Webhook Channel - Generic webhook notifications
 */
export class WebhookChannel implements AlertChannel {
  private config: Required<Pick<AlertChannelConfig['config'], 'url' | 'method' | 'headers'>>

  constructor(config: { url: string; method?: 'GET' | 'POST'; headers?: Record<string, string> }) {
    this.config = {
      url: config.url,
      method: config.method ?? 'POST',
      headers: config.headers ?? { 'Content-Type': 'application/json' },
    }
  }

  async send(alert: PerformanceAlert): Promise<void> {
    const payload = {
      id: alert.id,
      severity: alert.severity,
      metric: alert.metric,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: alert.context,
    }

    logger.debug(`[WEBHOOK] URL: ${this.config.url}`)
    logger.debug(`[WEBHOOK] Method: ${this.config.method}`)
    logger.debug(`[WEBHOOK] Headers:`, this.config.headers)
    logger.debug(`[WEBHOOK] Payload:`, JSON.stringify(payload, null, 2))

    // TODO: Send actual webhook
    // await fetch(this.config.url, {
    //   method: this.config.method,
    //   headers: this.config.headers,
    //   body: JSON.stringify(payload)
    // });
  }
}

/**
 * Telegram Channel - Telegram bot notifications
 */
export class TelegramChannel implements AlertChannel {
  private config: Required<Pick<AlertChannelConfig['config'], 'botToken' | 'chatId'>>

  constructor(config: { botToken: string; chatId: string }) {
    this.config = {
      botToken: config.botToken,
      chatId: config.chatId,
    }
  }

  async send(alert: PerformanceAlert): Promise<void> {
    const emoji = this.getEmojiForSeverity(alert.severity)
    const message = `
${emoji} <b>Performance Alert</b>

<b>Metric:</b> ${alert.metric}
<b>Severity:</b> ${alert.severity}
<b>Value:</b> ${alert.value}
<b>Threshold:</b> ${alert.threshold}

${alert.message}

<i>${new Date(alert.timestamp).toISOString()}</i>
    `.trim()

    logger.debug(`[TELEGRAM] Bot Token: ${this.config.botToken}`)
    logger.debug(`[TELEGRAM] Chat ID: ${this.config.chatId}`)
    logger.debug(`[TELEGRAM] Message:`, message)

    // TODO: Send actual Telegram message
    // await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     chat_id: this.config.chatId,
    //     text: message,
    //     parse_mode: 'HTML'
    //   })
    // });
  }

  private getEmojiForSeverity(severity: AlertSeverity): string {
    switch (severity) {
      case 'info':
        return 'ℹ️'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'critical':
        return '🚨'
      default:
        return '🔔'
    }
  }
}
