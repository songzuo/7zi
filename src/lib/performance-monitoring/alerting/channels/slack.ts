/**
 * Slack Alert Channel
 * Sends performance alerts to Slack via webhooks
 */

import type { PerformanceAlert } from '../alerter';

// ========================================
// Types
// ========================================

export interface SlackConfig {
  /** Slack webhook URL */
  webhookUrl: string;
  /** Channel to send to (overrides webhook default) */
  channel?: string;
  /** Username for the bot */
  username?: string;
  /** Icon emoji for the bot */
  iconEmoji?: string;
  /** Icon URL for the bot */
  iconUrl?: string;
}

export interface SlackAlertOptions {
  /** Override channel for this alert */
  channel?: string;
  /** Include detailed fields */
  includeFields?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Custom mention (user or group) */
  mention?: string;
  /** Custom message prefix */
  messagePrefix?: string;
  /** Custom footer text */
  footer?: string;
}

interface SlackAttachment {
  color: string;
  title: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
  mrkdwn_in?: string[];
}

interface SlackMessage {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  text?: string;
  attachments: SlackAttachment[];
}

// ========================================
// SlackChannel Class
// ========================================

export class SlackChannel {
  name = 'slack';
  private webhookUrl: string;
  private defaultConfig: SlackConfig;
  private options: SlackAlertOptions;

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.webhookUrl = config.webhookUrl;
    this.defaultConfig = config;
    this.options = options || {};
  }

  /**
   * Send alert to Slack
   */
  async send(alert: PerformanceAlert): Promise<void> {
    const slackMessage = this.buildSlackMessage(alert);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack webhook failed: ${response.status} ${errorText}`);
      }

      console.log(`[SlackChannel] Alert sent to Slack: ${alert.id}`);
    } catch (error) {
      console.error('[SlackChannel] Failed to send alert:', error);
      throw error;
    }
  }

  /**
   * Build Slack message
   */
  private buildSlackMessage(alert: PerformanceAlert): SlackMessage {
    const levelEmoji = this.getLevelEmoji(alert.level);
    const levelColor = this.getLevelColor(alert.level);

    // Build mention
    let mention = '';
    if (this.options.mention) {
      mention = `${this.options.mention} `;
    }

    // Build text
    const text = `${mention}${levelEmoji} *${alert.title}*`;

    // Build fields
    const fields = this.options.includeFields !== false ? this.buildFields(alert) : [];

    // Build metadata fields
    if (this.options.includeMetadata && alert.metadata) {
      fields.push({
        title: 'Metadata',
        value: `\`\`\`${JSON.stringify(alert.metadata, null, 2)}\`\`\``,
        short: false,
      });
    }

    // Build attachment
    const attachment: SlackAttachment = {
      color: levelColor,
      title: alert.message,
      text: alert.metric && alert.currentValue && alert.threshold
        ? `*Metric:* ${alert.metric}\n*Current:* ${alert.currentValue}\n*Threshold:* ${alert.threshold}`
        : undefined,
      fields: fields.length > 0 ? fields : undefined,
      footer: this.options.footer || 'Performance Alerting System',
      ts: Math.floor(alert.createdAt / 1000),
      mrkdwn_in: ['title', 'text', 'fields'],
    };

    // Build message
    const message: SlackMessage = {
      username: this.defaultConfig.username || 'Performance Alerter',
      icon_emoji: this.defaultConfig.iconEmoji || ':warning:',
      icon_url: this.defaultConfig.iconUrl,
      text,
      attachments: [attachment],
    };

    // Only add channel if specified
    if (this.options.channel) {
      message.channel = this.options.channel;
    } else if (this.defaultConfig.channel) {
      message.channel = this.defaultConfig.channel;
    }

    return message;
  }

  /**
   * Build Slack fields
   */
  private buildFields(alert: PerformanceAlert): Array<{
    title: string;
    value: string;
    short?: boolean;
  }> {
    const fields: Array<{
      title: string;
      value: string;
      short?: boolean;
    }> = [];

    // Severity
    fields.push({
      title: 'Severity',
      value: `*${alert.level.toUpperCase()}*`,
      short: true,
    });

    // Category
    fields.push({
      title: 'Category',
      value: alert.category,
      short: true,
    });

    // Source
    fields.push({
      title: 'Source',
      value: alert.source,
      short: true,
    });

    // Status
    fields.push({
      title: 'Status',
      value: `*${alert.status}*`,
      short: true,
    });

    // Occurrences
    if (alert.occurrenceCount > 1) {
      fields.push({
        title: 'Occurrences',
        value: `${alert.occurrenceCount}`,
        short: true,
      });
    }

    // Alert ID
    fields.push({
      title: 'Alert ID',
      value: `\`${alert.id}\``,
      short: true,
    });

    // Time
    fields.push({
      title: 'Time',
      value: `<!date^${Math.floor(alert.createdAt / 1000)}^{date_num} {time_secs}|${new Date(alert.createdAt).toLocaleString()}>`,
      short: false,
    });

    // Acknowledged by
    if (alert.acknowledgedBy) {
      fields.push({
        title: 'Acknowledged By',
        value: alert.acknowledgedBy,
        short: true,
      });
    }

    // Resolved at
    if (alert.resolvedAt) {
      fields.push({
        title: 'Resolved At',
        value: new Date(alert.resolvedAt).toLocaleString(),
        short: true,
      });
    }

    return fields;
  }

  /**
   * Get emoji for alert level
   */
  private getLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    };
    return emojis[level] || ':warning:';
  }

  /**
   * Get color for alert level
   */
  private getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      info: '#3b82f6',      // blue
      warning: '#f59e0b',   // amber
      error: '#ef4444',     // red
      critical: '#dc2626',  // dark red
    };
    return colors[level] || '#6b7280';
  }

  /**
   * Test webhook connectivity
   */
  async test(): Promise<boolean> {
    try {
      const testMessage: SlackMessage = {
        username: this.defaultConfig.username || 'Performance Alerter',
        icon_emoji: ':white_check_mark:',
        text: ':white_check_mark: *Slack webhook test successful!*',
        attachments: [{
          color: '#22c55e',
          title: 'Performance Alerting System',
          text: 'Your Slack webhook is properly configured.',
          footer: 'Test Message',
          ts: Math.floor(Date.now() / 1000),
        }],
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      if (!response.ok) {
        console.error('[SlackChannel] Webhook test failed:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SlackChannel] Webhook test error:', error);
      return false;
    }
  }

  /**
   * Update channel options
   */
  updateOptions(options: Partial<SlackAlertOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): SlackAlertOptions {
    return { ...this.options };
  }
}
