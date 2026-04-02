/**
 * Slack Alert Channel
 * 专用 Slack 告警渠道实现
 *
 * 功能：
 * - Webhook URL 配置 (SLACK_WEBHOOK_URL)
 * - 富文本消息格式化 (blocks, attachments)
 * - 告警级别颜色编码 (critical=red, warning=orange, info=blue)
 * - @channel / @here 提及支持
 * - 消息模板 (标题、描述、触发时间、严重级别)
 */

import { AlertSeverity } from '../../alerts'

// ========================================
// Types
// ========================================

export interface SlackAlertPayload {
  title: string
  message: string
  severity: AlertSeverity
  details?: Record<string, string | number>
  timestamp?: Date
  tags?: string[]
  url?: string
  mention?: SlackMention
  channel?: string // Override default channel (for Web API)
}

export interface SlackMention {
  channel?: boolean // @channel
  here?: boolean // @here
  users?: string[] // @user1, @user2
  teams?: string[] // !subteam
}

export interface SlackBlock {
  type: string
  text?: {
    type: string
    text: string
    emoji?: boolean
  }
  elements?: Array<{
    type: string
    text?: string
    url?: string
  }>
  fields?: Array<{
    type: string
    text: string
  }>
}

export interface SlackAttachment {
  color: string
  title: string
  text: string
  fields?: Array<{
    title: string
    value: string
    short: boolean
  }>
  actions?: Array<{
    type: string
    text: string
    url: string
    style?: string
  }>
  footer: string
  ts: number
}

export interface SlackMessage {
  text?: string // Fallback text
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

export interface SlackChannelConfig {
  webhookUrl: string
  username?: string
  iconEmoji?: string
  defaultChannel?: string
  mentionOnCritical?: boolean // Automatically @channel for P0 alerts
}

// ========================================
// Severity Mapping
// ========================================

export const SLACK_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  p0: '#FF0000', // Red - Critical
  p1: '#FFA500', // Orange - High/Warning
  p2: '#FFFF00', // Yellow - Warning (though often shown as orange in Slack)
  p3: '#36a64f', // Green - Info
}

export const SLACK_SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  p0: '🚨',
  p1: '🔴',
  p2: '🟡',
  p3: '🟢',
}

export const SLACK_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  p0: 'CRITICAL',
  p1: 'HIGH',
  p2: 'WARNING',
  p3: 'INFO',
}

// ========================================
// Slack Alert Channel Class
// ========================================

export class SlackAlertChannel {
  private webhookUrl: string
  private username: string
  private iconEmoji: string
  private defaultChannel?: string
  private mentionOnCritical: boolean

  constructor(config: SlackChannelConfig) {
    this.webhookUrl = config.webhookUrl
    this.username = config.username || 'Alert Bot'
    this.iconEmoji = config.iconEmoji || ':warning:'
    this.defaultChannel = config.defaultChannel
    this.mentionOnCritical = config.mentionOnCritical ?? true
  }

  /**
   * Create channel from environment variables
   */
  static fromEnvironment(): SlackAlertChannel | null {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return null
    }

    return new SlackAlertChannel({
      webhookUrl,
      username: process.env.SLACK_USERNAME || 'Alert Bot',
      iconEmoji: process.env.SLACK_ICON_EMOJI || ':warning:',
      defaultChannel: process.env.SLACK_CHANNEL,
      mentionOnCritical: process.env.SLACK_MENTION_CRITICAL !== 'false',
    })
  }

  /**
   * Send an alert to Slack
   */
  async send(payload: SlackAlertPayload): Promise<boolean> {
    try {
      const message = this.formatMessage(payload)
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
      return false
    }
  }

  /**
   * Send alert from AlertConfig format
   */
  async sendAlert(config: {
    severity: AlertSeverity
    title: string
    message: string
    details?: Record<string, string | number>
    timestamp?: Date
    tags?: string[]
    url?: string
  }): Promise<boolean> {
    return this.send({
      title: config.title,
      message: config.message,
      severity: config.severity,
      details: config.details,
      timestamp: config.timestamp,
      tags: config.tags,
      url: config.url,
      mention: config.severity === 'p0' && this.mentionOnCritical ? { channel: true } : undefined,
    })
  }

  /**
   * Format message using Block Kit
   */
  formatMessage(payload: SlackAlertPayload): SlackMessage {
    const { title, message, severity, details, timestamp, tags, url, mention } = payload
    const color = SLACK_SEVERITY_COLORS[severity]
    const emoji = SLACK_SEVERITY_EMOJI[severity]
    const severityLabel = SLACK_SEVERITY_LABELS[severity]

    // Build mention text
    const mentionText = this.formatMention(mention, severity)

    // Build blocks
    const blocks: SlackBlock[] = []

    // Header block with emoji and title
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
        emoji: true,
      },
    })

    // Severity badge
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Severity:* \`${severityLabel}\` | *Level:* \`${severity.toUpperCase()}\`${mentionText ? `\n\n${mentionText}` : ''}`,
      },
    })

    // Divider
    blocks.push({
      type: 'divider',
    })

    // Description
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Description:*\n${message}`,
      },
    })

    // Details if present
    if (details && Object.keys(details).length > 0) {
      const fields: Array<{ type: string; text: string }> = Object.entries(details)
        .slice(0, 10) // Max 10 fields
        .map(([key, value]) => ({
          type: 'mrkdwn' as const,
          text: `*${key}*\n\`${value}\``,
        }))

      blocks.push({
        type: 'section',
        fields,
      })
    }

    // Tags if present
    if (tags && tags.length > 0) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Tags:* ${tags.map(t => `\`${t}\``).join(', ')}`,
          },
        ],
      })
    }

    // Action buttons
    if (url) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ' ',
        },
        elements: [
          {
            type: 'button',
            text: 'View Details',
            url,
          },
        ],
      })
    }

    // Footer with timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `7zi-frontend Monitoring | ${timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()}`,
        },
      ],
    })

    // Create attachment for color
    const attachment: SlackAttachment = {
      color,
      title,
      text: message,
      fields: details
        ? Object.entries(details)
            .slice(0, 5)
            .map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            }))
        : undefined,
      actions: url
        ? [
            {
              type: 'button',
              text: 'View Details',
              url,
              style: severity === 'p0' ? 'danger' : 'primary',
            },
          ]
        : undefined,
      footer: '7zi-frontend Monitoring',
      ts: Math.floor((timestamp ? new Date(timestamp) : new Date()).getTime() / 1000),
    }

    return {
      text: `${emoji} [${severityLabel}] ${title}`, // Fallback
      blocks,
      attachments: [attachment],
    }
  }

  /**
   * Format mention text
   */
  private formatMention(mention?: SlackMention, severity?: AlertSeverity): string {
    if (!mention) return ''

    const parts: string[] = []

    if (mention.channel) {
      parts.push('<!channel>')
    }

    if (mention.here) {
      parts.push('<!here>')
    }

    if (mention.users && mention.users.length > 0) {
      parts.push(...mention.users.map(u => `<@${u}>`))
    }

    if (mention.teams && mention.teams.length > 0) {
      parts.push(...mention.teams.map(t => `<!subteam^${t}>`))
    }

    if (parts.length === 0) return ''

    // Add urgency prefix for critical alerts
    if (severity === 'p0') {
      return `<!channel> *Urgent attention required!*`
    }

    return parts.join(' ')
  }
}

// ========================================
// Convenience Functions
// ========================================

let slackChannelInstance: SlackAlertChannel | null = null

/**
 * Get singleton Slack channel instance
 */
export function getSlackChannel(): SlackAlertChannel | null {
  if (!slackChannelInstance) {
    slackChannelInstance = SlackAlertChannel.fromEnvironment()
  }
  return slackChannelInstance
}

/**
 * Send a quick Slack alert
 */
export async function sendSlackAlertMessage(
  title: string,
  message: string,
  severity: AlertSeverity = 'p3',
  options?: {
    details?: Record<string, string | number>
    tags?: string[]
    url?: string
    mention?: SlackMention
  }
): Promise<boolean> {
  const channel = getSlackChannel()

  if (!channel) {
    console.warn('Slack channel not configured (missing SLACK_WEBHOOK_URL)')
    return false
  }

  return channel.send({
    title,
    message,
    severity,
    details: options?.details,
    tags: options?.tags,
    url: options?.url,
    mention: options?.mention,
    timestamp: new Date(),
  })
}

// ========================================
// Alert Helper Functions
// ========================================

export const slackAlerts = {
  /**
   * Critical alert (P0) - Red, auto @channel
   */
  critical: (title: string, message: string, details?: Record<string, string | number>) =>
    sendSlackAlertMessage(title, message, 'p0', {
      details,
      mention: { channel: true },
    }),

  /**
   * High alert (P1) - Orange
   */
  high: (title: string, message: string, details?: Record<string, string | number>) =>
    sendSlackAlertMessage(title, message, 'p1', { details }),

  /**
   * Warning alert (P2) - Yellow/Orange
   */
  warning: (title: string, message: string, details?: Record<string, string | number>) =>
    sendSlackAlertMessage(title, message, 'p2', { details }),

  /**
   * Info alert (P3) - Green
   */
  info: (title: string, message: string, details?: Record<string, string | number>) =>
    sendSlackAlertMessage(title, message, 'p3', { details }),

  /**
   * Custom mention alert
   */
  mention: (
    title: string,
    message: string,
    severity: AlertSeverity,
    mention: SlackMention,
    details?: Record<string, string | number>
  ) =>
    sendSlackAlertMessage(title, message, severity, {
      details,
      mention,
    }),
}

// ========================================
// Export Types
// ========================================

export type { AlertSeverity }
