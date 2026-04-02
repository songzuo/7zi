/**
 * Message Formatter - Unified Alert Message Formatting Utilities
 * 统一告警消息格式化工具
 *
 * This module provides standardized message formatting functions
 * used across alerting channels (email, slack, pagerduty, etc.).
 *
 * @module lib/utils/formatting/message-formatter
 */

// ============================================
// Types
// ============================================

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'
export type AlertCategory =
  | 'performance'
  | 'availability'
  | 'error'
  | 'resource'
  | 'security'
  | 'custom'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed'

/**
 * Alert data interface - common properties for all alert types
 */
export interface AlertData {
  id: string
  title: string
  message: string
  level: AlertLevel
  category: AlertCategory
  status: AlertStatus
  source: string
  metric?: string
  currentValue?: number
  threshold?: number
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt?: number
  acknowledgedAt?: number
  acknowledgedBy?: string
  resolvedAt?: number
  occurrenceCount: number
  tags?: string[]
}

/**
 * Formatting options
 */
export interface FormatOptions {
  /** Include timestamp in output */
  includeTimestamp?: boolean
  /** Include metadata in output */
  includeMetadata?: boolean
  /** Include metric details in output */
  includeMetric?: boolean
  /** Include alert ID in output */
  includeId?: boolean
  /** Use short format (minimal information) */
  shortFormat?: boolean
}

/**
 * Slack-specific formatting options
 */
export interface SlackFormatOptions extends FormatOptions {
  /** Mention a user or group */
  mention?: string
  /** Custom emoji prefix override */
  emojiPrefix?: string
}

/**
 * Email-specific formatting options
 */
export interface EmailFormatOptions extends FormatOptions {
  /** Email priority override */
  priority?: 'high' | 'normal' | 'low'
  /** Include HTML formatting */
  html?: boolean
}

// ============================================
// Constants
// ============================================

const LEVEL_ICONS: Record<AlertLevel, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
}

const SLACK_LEVEL_EMOJIS: Record<AlertLevel, string> = {
  info: ':information_source:',
  warning: ':warning:',
  error: ':x:',
  critical: ':rotating_light:',
}

const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: '#3b82f6', // blue
  warning: '#f59e0b', // amber
  error: '#ef4444', // red
  critical: '#dc2626', // dark red
}

// ============================================
// Core Formatting Functions
// ============================================

/**
 * Get the emoji icon for an alert level
 * 获取告警级别的 emoji 图标
 *
 * @param level - Alert level
 * @returns Emoji string
 *
 * @example
 * ```ts
 * getLevelEmoji('warning') // => '⚠️'
 * ```
 */
export function getLevelEmoji(level: AlertLevel): string {
  return LEVEL_ICONS[level] || '⚠️'
}

/**
 * Get the Slack emoji for an alert level
 * 获取 Slack 告警级别的 emoji
 *
 * @param level - Alert level
 * @returns Slack emoji string
 *
 * @example
 * ```ts
 * getSlackLevelEmoji('critical') // => ':rotating_light:'
 * ```
 */
export function getSlackLevelEmoji(level: AlertLevel): string {
  return SLACK_LEVEL_EMOJIS[level] || ':warning:'
}

/**
 * Get the color for an alert level (for Slack/Discord attachments)
 * 获取告警级别的颜色（用于 Slack/Discord）
 *
 * @param level - Alert level
 * @returns Hex color string
 *
 * @example
 * ```ts
 * getLevelColor('error') // => '#ef4444'
 * ```
 */
export function getLevelColor(level: AlertLevel): string {
  return LEVEL_COLORS[level] || '#6b7280'
}

/**
 * Format a timestamp for display
 * 格式化时间戳用于显示
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatTimestamp(Date.now()) // => '2024/4/2 18:30:00'
 * ```
 */
export function formatTimestamp(timestamp: number, locale: string = 'en-US'): string {
  return new Date(timestamp).toLocaleString(locale)
}

/**
 * Format a short timestamp (just time)
 * 格式化短时间戳（仅时间）
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Time string (HH:MM:SS)
 *
 * @example
 * ```ts
 * formatTime(Date.now()) // => '18:30:00'
 * ```
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format alert data as plain text
 * 将告警数据格式化为纯文本
 *
 * @param alert - Alert data
 * @param options - Formatting options
 * @returns Formatted text string
 *
 * @example
 * ```ts
 * formatTextAlert({
 *   id: 'alert-1',
 *   title: 'High CPU Usage',
 *   message: 'CPU usage exceeded 90%',
 *   level: 'warning',
 *   category: 'performance',
 *   status: 'active',
 *   source: 'server-1',
 *   metric: 'cpu',
 *   currentValue: 95,
 *   threshold: 90,
 *   createdAt: Date.now(),
 *   occurrenceCount: 3,
 * })
 * ```
 */
export function formatTextAlert(alert: AlertData, options: FormatOptions = {}): string {
  const {
    includeTimestamp = true,
    includeMetadata = false,
    includeMetric = true,
    includeId = false,
    shortFormat = false,
  } = options

  const levelEmoji = getLevelEmoji(alert.level)

  const lines: string[] = []

  // Title (always include)
  lines.push(`${levelEmoji} ${alert.title}`)

  if (!shortFormat) {
    // Level and category
    lines.push(`Level: ${alert.level.toUpperCase()}`)
    lines.push(`Category: ${alert.category}`)
    lines.push(`Source: ${alert.source}`)

    // Status
    lines.push(`Status: ${alert.status}`)

    // Occurrence count
    if (alert.occurrenceCount > 1) {
      lines.push(`Occurrences: ${alert.occurrenceCount}`)
    }

    // Metric details
    if (
      includeMetric &&
      alert.metric &&
      alert.currentValue !== undefined &&
      alert.threshold !== undefined
    ) {
      lines.push(`Metric: ${alert.metric}`)
      lines.push(`Current Value: ${alert.currentValue}`)
      lines.push(`Threshold: ${alert.threshold}`)
    }

    // Timestamp
    if (includeTimestamp) {
      lines.push(`Time: ${formatTimestamp(alert.createdAt)}`)
    }
  }

  // Message (primary content)
  lines.push(``) // Empty line before message
  lines.push(alert.message)

  // Metadata
  if (includeMetadata && alert.metadata && Object.keys(alert.metadata).length > 0) {
    lines.push(``)
    lines.push('Metadata:')
    for (const [key, value] of Object.entries(alert.metadata)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`)
    }
  }

  // Alert ID
  if (includeId) {
    lines.push(``)
    lines.push(`Alert ID: ${alert.id}`)
  }

  return lines.join('\n')
}

/**
 * Format alert data as Slack message
 * 将告警数据格式化为 Slack 消息
 *
 * @param alert - Alert data
 * @param options - Slack-specific formatting options
 * @returns Formatted Slack message object
 *
 * @example
 * ```ts
 * const slackMsg = formatSlackAlert(alert, { mention: '@oncall' })
 * await fetch(webhookUrl, { body: JSON.stringify(slackMsg) })
 * ```
 */
export function formatSlackAlert(
  alert: AlertData,
  options: SlackFormatOptions = {}
): {
  text: string
  attachments: Array<{
    color: string
    title: string
    text: string
    fields: Array<{ title: string; value: string; short: boolean }>
    footer: string
    ts: number
    mrkdwn_in: string[]
  }>
} {
  const { mention, includeMetadata = false, includeMetric = true } = options
  const levelEmoji = getSlackLevelEmoji(alert.level)
  const levelColor = getLevelColor(alert.level)

  // Build mention
  const mentionPrefix = mention ? `${mention} ` : ''

  // Build text
  const text = `${mentionPrefix}${levelEmoji} *${alert.title}*`

  // Build main attachment
  const attachment = {
    color: levelColor,
    title: alert.message,
    text:
      includeMetric &&
      alert.metric &&
      alert.currentValue !== undefined &&
      alert.threshold !== undefined
        ? `*Metric:* ${alert.metric}\n*Current:* ${alert.currentValue}\n*Threshold:* ${alert.threshold}`
        : '',
    fields: [] as Array<{ title: string; value: string; short: boolean }>,
    footer: 'Performance Alerting System',
    ts: Math.floor(alert.createdAt / 1000),
    mrkdwn_in: ['title', 'text', 'fields'] as string[],
  }

  // Add fields
  attachment.fields.push({
    title: 'Severity',
    value: `*${alert.level.toUpperCase()}*`,
    short: true,
  })
  attachment.fields.push({
    title: 'Category',
    value: alert.category,
    short: true,
  })
  attachment.fields.push({
    title: 'Source',
    value: alert.source,
    short: true,
  })
  attachment.fields.push({
    title: 'Status',
    value: `*${alert.status}*`,
    short: true,
  })

  if (alert.occurrenceCount > 1) {
    attachment.fields.push({
      title: 'Occurrences',
      value: `${alert.occurrenceCount}`,
      short: true,
    })
  }

  attachment.fields.push({
    title: 'Time',
    value: `<!date^${Math.floor(alert.createdAt / 1000)}^{date_num} {time_secs}|${formatTimestamp(alert.createdAt)}>`,
    short: false,
  })

  // Metadata
  if (includeMetadata && alert.metadata && Object.keys(alert.metadata).length > 0) {
    attachment.fields.push({
      title: 'Metadata',
      value: '```' + JSON.stringify(alert.metadata, null, 2) + '```',
      short: false,
    })
  }

  return { text, attachments: [attachment] }
}

/**
 * Format alert data as HTML email content
 * 将告警数据格式化为 HTML 邮件内容
 *
 * @param alert - Alert data
 * @param options - Email-specific formatting options
 * @returns Object with subject, text, and HTML content
 *
 * @example
 * ```ts
 * const email = formatEmailAlert(alert, { html: true })
 * await sendEmail({ subject: email.subject, text: email.text, html: email.html })
 * ```
 */
export function formatEmailAlert(
  alert: AlertData,
  options: EmailFormatOptions = {}
): { subject: string; text: string; html: string } {
  const { includeMetadata = false, includeMetric = true, priority } = options
  const levelEmoji = getLevelEmoji(alert.level)
  const timestamp = formatTimestamp(alert.createdAt)

  // Subject
  const subject = `${levelEmoji} [${alert.level.toUpperCase()}] ${alert.title}`

  // Plain text content
  const text = formatTextAlert(alert, {
    includeTimestamp: true,
    includeMetadata,
    includeMetric,
    includeId: true,
  })

  // HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin-bottom: 20px;
    }
    .level-info { background: #eff6ff; color: #1e40af; }
    .level-warning { background: #fffbeb; color: #92400e; }
    .level-error { background: #fef2f2; color: #991b1b; }
    .level-critical { background: #fee2e2; color: #7f1d1d; }
    .level-icon { font-size: 48px; }
    .level-title { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .content {
      background: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .field {
      margin-bottom: 15px;
    }
    .field-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
    }
    .field-value {
      font-size: 16px;
    }
    .metric {
      background: #fff;
      padding: 10px;
      border-radius: 4px;
      border-left: 4px solid;
      margin: 15px 0;
    }
    .metric-info { border-color: #3b82f6; }
    .metric-warning { border-color: #f59e0b; }
    .metric-error { border-color: #ef4444; }
    .metric-critical { border-color: #dc2626; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: #e5e7eb;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="header level-${alert.level}">
    <div class="level-icon">${levelEmoji}</div>
    <div class="level-title">${alert.title}</div>
  </div>

  <div class="content">
    <div class="field">
      <div class="field-label">Severity</div>
      <div class="field-value">
        <span class="badge">${alert.level.toUpperCase()}</span>
        <span class="badge">${alert.category}</span>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Message</div>
      <div class="field-value">${alert.message}</div>
    </div>

    <div class="field">
      <div class="field-label">Source</div>
      <div class="field-value">${alert.source}</div>
    </div>

    <div class="field">
      <div class="field-label">Time</div>
      <div class="field-value">${timestamp}</div>
    </div>

    <div class="field">
      <div class="field-label">Occurrences</div>
      <div class="field-value">${alert.occurrenceCount}</div>
    </div>

    <div class="field">
      <div class="field-label">Status</div>
      <div class="field-value">${alert.status}</div>
    </div>

    ${
      includeMetric &&
      alert.metric &&
      alert.currentValue !== undefined &&
      alert.threshold !== undefined
        ? `
    <div class="metric metric-${alert.level}">
      <div class="field-label">Metric</div>
      <div class="field-value">${alert.metric}</div>
      <div class="field-label">Current Value</div>
      <div class="field-value">${alert.currentValue}</div>
      <div class="field-label">Threshold</div>
      <div class="field-value">${alert.threshold}</div>
    </div>
    `
        : ''
    }

    ${
      includeMetadata && alert.metadata
        ? `
    <div class="field">
      <div class="field-label">Metadata</div>
      <div class="field-value">
        <pre style="background: #fff; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
      </div>
    </div>
    `
        : ''
    }
  </div>

  <div class="footer">
    <div>Alert ID: ${alert.id}</div>
    <div style="margin-top: 10px;">Performance Alerting System</div>
  </div>
</body>
</html>
`.trim()

  return { subject, text, html }
}

// ============================================
// Markdown Formatting
// ============================================

/**
 * Format alert data as Markdown
 * 将告警数据格式化为 Markdown
 *
 * @param alert - Alert data
 * @param options - Formatting options
 * @returns Formatted Markdown string
 *
 * @example
 * ```ts
 * const md = formatMarkdownAlert(alert)
 * console.log(md)
 * ```
 */
export function formatMarkdownAlert(alert: AlertData, options: FormatOptions = {}): string {
  const {
    includeTimestamp = true,
    includeMetadata = true,
    includeMetric = true,
    includeId = true,
  } = options
  const levelEmoji = getLevelEmoji(alert.level)

  const lines: string[] = []

  // Title with level
  lines.push(`### ${levelEmoji} ${alert.title}`)
  lines.push('')

  // Metadata table
  lines.push('| Field | Value |')
  lines.push('|-------|-------|')
  lines.push(`| Severity | **${alert.level.toUpperCase()}** |`)
  lines.push(`| Category | ${alert.category} |`)
  lines.push(`| Source | ${alert.source} |`)
  lines.push(`| Status | **${alert.status}** |`)
  lines.push(`| Occurrences | ${alert.occurrenceCount} |`)

  if (includeTimestamp) {
    lines.push(`| Time | ${formatTimestamp(alert.createdAt)} |`)
  }

  if (
    includeMetric &&
    alert.metric &&
    alert.currentValue !== undefined &&
    alert.threshold !== undefined
  ) {
    lines.push(`| Metric | ${alert.metric} |`)
    lines.push(`| Current Value | ${alert.currentValue} |`)
    lines.push(`| Threshold | ${alert.threshold} |`)
  }

  if (includeId) {
    lines.push(`| Alert ID | \`${alert.id}\` |`)
  }

  lines.push('')

  // Message
  lines.push('**Message:**')
  lines.push(alert.message)

  // Additional metadata
  if (includeMetadata && alert.metadata && Object.keys(alert.metadata).length > 0) {
    lines.push('')
    lines.push('**Metadata:**')
    lines.push('```json')
    lines.push(JSON.stringify(alert.metadata, null, 2))
    lines.push('```')
  }

  return lines.join('\n')
}

// ============================================
// Exports
// ============================================

export default {
  getLevelEmoji,
  getSlackLevelEmoji,
  getLevelColor,
  formatTimestamp,
  formatTime,
  formatTextAlert,
  formatSlackAlert,
  formatEmailAlert,
  formatMarkdownAlert,
}
