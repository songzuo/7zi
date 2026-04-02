/**
 * Alert Channels Implementation
 * 告警渠道实现
 */

import { PerformanceAlert, AlertChannel, AlertChannelConfig, AlertSeverity } from './types'

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
    console.log(`[EMAIL] To: ${this.config.recipients.join(', ')}`)
    console.log(
      `[EMAIL] Subject: [${alert.severity.toUpperCase()}] ${this.config.subject} - ${alert.metric}`
    )
    console.log(`[EMAIL] Message: ${alert.message}`)
    console.log(`[EMAIL] Value: ${alert.value}, Threshold: ${alert.threshold}`)
    console.log(`[EMAIL] Timestamp: ${new Date(alert.timestamp).toISOString()}`)

    if (alert.context) {
      console.log(`[EMAIL] Context:`, JSON.stringify(alert.context, null, 2))
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

    console.log(`[SLACK] Webhook: ${this.config.webhookUrl}`)
    console.log(`[SLACK] Channel: ${this.config.channel}`)
    console.log(`[SLACK] Payload:`, JSON.stringify(payload, null, 2))

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
    console.log(`[DASHBOARD] Severity: ${alert.severity.toUpperCase()}`)
    console.log(`[DASHBOARD] Metric: ${alert.metric}`)
    console.log(`[DASHBOARD] Message: ${alert.message}`)
    console.log(`[DASHBOARD] Value: ${alert.value}, Threshold: ${alert.threshold}`)
    console.log(`[DASHBOARD] Show Toast: ${this.config.showToast}`)
    console.log(`[DASHBOARD] Play Sound: ${this.config.playSound}`)

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

    console.log(`[WEBHOOK] URL: ${this.config.url}`)
    console.log(`[WEBHOOK] Method: ${this.config.method}`)
    console.log(`[WEBHOOK] Headers:`, this.config.headers)
    console.log(`[WEBHOOK] Payload:`, JSON.stringify(payload, null, 2))

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

    console.log(`[TELEGRAM] Bot Token: ${this.config.botToken}`)
    console.log(`[TELEGRAM] Chat ID: ${this.config.chatId}`)
    console.log(`[TELEGRAM] Message:`, message)

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
