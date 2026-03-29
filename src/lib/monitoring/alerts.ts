/**
 * Alerting Service
 * Send alerts to various channels (Slack, Email, Webhook, Discord)
 */

// ========================================
// Types
// ========================================

// Alert severity levels
export type AlertSeverity = 'p0' | 'p1' | 'p2' | 'p3';

// Alert channel
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'discord' | 'telegram';

// Alert configuration
export interface AlertConfig {
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: Record<string, string | number>;
  url?: string;
  timestamp?: Date;
  channels?: AlertChannel[]; // Which channels to send to
  deduplicationKey?: string; // For deduplication
  tags?: string[]; // For filtering/grouping
}

// Alert deduplication cache entry
interface DeduplicationEntry {
  count: number;
  firstSeen: Date;
  lastSent: Date;
  lastAlert: AlertConfig;
}

// Webhook configuration
interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';
}

// Discord webhook payload
interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline: boolean;
  }>;
  url?: string;
  timestamp?: string;
}

// Telegram message payload
interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

// ========================================
// Severity Configuration
// ========================================

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  p0: '#FF0000', // Red - Critical
  p1: '#FFA500', // Orange - High
  p2: '#FFFF00', // Yellow - Warning
  p3: '#00FF00', // Green - Info
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  p0: '🔴 CRITICAL',
  p1: '🟠 HIGH',
  p2: '🟡 WARNING',
  p3: '🟢 INFO',
};

const SEVERITY_DISCORD_COLORS: Record<AlertSeverity, number> = {
  p0: 0xFF0000, // Red
  p1: 0xFFA500, // Orange
  p2: 0xFFFF00, // Yellow
  p3: 0x00FF00, // Green
};

// ========================================
// Alert Deduplication Manager
// ========================================

export class AlertDeduplication {
  private cache: Map<string, DeduplicationEntry> = new Map();
  private ttl: number; // Time to live in milliseconds
  private cooldown: number; // Minimum time between duplicate alerts

  constructor(ttl: number = 3600000, cooldown: number = 300000) {
    this.ttl = ttl; // 1 hour default
    this.cooldown = cooldown; // 5 minutes default
  }

  /**
   * Check if an alert should be sent (not a duplicate)
   */
  shouldSendAlert(config: AlertConfig): boolean {
    const key = config.deduplicationKey ?? this.generateKey(config);

    const entry = this.cache.get(key);
    const now = new Date();

    if (!entry) {
      // First time seeing this alert
      this.cache.set(key, {
        count: 1,
        firstSeen: now,
        lastSent: now,
        lastAlert: config,
      });
      return true;
    }

    // Check if entry is expired
    if (now.getTime() - entry.firstSeen.getTime() > this.ttl) {
      this.cache.set(key, {
        count: 1,
        firstSeen: now,
        lastSent: now,
        lastAlert: config,
      });
      return true;
    }

    // Check cooldown period
    if (now.getTime() - entry.lastSent.getTime() < this.cooldown) {
      // Still in cooldown, increment count but don't send
      entry.count++;
      return false;
    }

    // Cooldown passed, send alert
    entry.count++;
    entry.lastSent = now;
    entry.lastAlert = config;

    return true;
  }

  /**
   * Get deduplication stats for a key
   */
  getStats(key: string): { count: number; firstSeen: Date; lastSent: Date } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    return {
      count: entry.count,
      firstSeen: entry.firstSeen,
      lastSent: entry.lastSent,
    };
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now.getTime() - entry.firstSeen.getTime() > this.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get aggregated alert summary
   */
  getSummary(): Array<{ key: string; count: number; firstSeen: Date; title: string }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      firstSeen: entry.firstSeen,
      title: entry.lastAlert.title,
    }));
  }

  private generateKey(config: AlertConfig): string {
    return `${config.title}:${config.message}:${config.severity}`;
  }
}

// ========================================
// Alert Aggregator
// ========================================

export interface AggregatedAlert {
  alerts: AlertConfig[];
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  severity: AlertSeverity;
  commonTags: string[];
}

export class AlertAggregator {
  private windowMs: number;
  private alerts: AlertConfig[] = [];

  constructor(windowMs: number = 60000) {
    this.windowMs = windowMs; // 1 minute default
  }

  /**
   * Add an alert to the aggregation window
   */
  addAlert(config: AlertConfig): void {
    this.alerts.push(config);
    this.trimAlerts();
  }

  /**
   * Get aggregated alerts grouped by tag
   */
  getAggregatedAlerts(): Map<string, AggregatedAlert> {
    const grouped = new Map<string, AggregatedAlert>();

    for (const alert of this.alerts) {
      const tags = alert.tags ?? [];
      const key = tags[0] ?? alert.title;

      const existing = grouped.get(key);

      if (existing) {
        existing.alerts.push(alert);
        existing.count++;
        existing.lastSeen = alert.timestamp ?? new Date();
      } else {
        grouped.set(key, {
          alerts: [alert],
          count: 1,
          firstSeen: alert.timestamp ?? new Date(),
          lastSeen: alert.timestamp ?? new Date(),
          severity: alert.severity,
          commonTags: tags,
        });
      }
    }

    return grouped;
  }

  /**
   * Clear all alerts
   */
  clear(): void {
    this.alerts = [];
  }

  /**
   * Get count of alerts in current window
   */
  getCount(): number {
    return this.alerts.length;
  }

  /**
   * Get alerts by severity
   */
  getBySeverity(severity: AlertSeverity): AlertConfig[] {
    return this.alerts.filter((a) => a.severity === severity);
  }

  private trimAlerts(): void {
    const cutoff = new Date(Date.now() - this.windowMs);
    this.alerts = this.alerts.filter(
      (a) => (a.timestamp ?? new Date()).getTime() > cutoff.getTime()
    );
  }
}

// ========================================
// Multi-Channel Alert Manager
// ========================================

export interface AlertChannelConfig {
  enabled: boolean;
  severityThreshold?: AlertSeverity; // Only send alerts at or above this severity
}

export interface SlackConfig extends AlertChannelConfig {
  webhookUrl: string;
}

export interface EmailConfig extends AlertChannelConfig {
  apiKey: string;
  recipients: string[];
  from: string;
}

export interface WebhookConfigFull extends AlertChannelConfig, WebhookConfig {}

export interface DiscordConfig extends AlertChannelConfig {
  webhookUrl: string;
}

export interface TelegramConfig extends AlertChannelConfig {
  botToken: string;
  chatId: string | number;
}

export interface AlertSystemConfig {
  slack?: SlackConfig;
  email?: EmailConfig;
  webhook?: WebhookConfigFull;
  discord?: DiscordConfig;
  telegram?: TelegramConfig;
  deduplication?: {
    enabled: boolean;
    ttl?: number;
    cooldown?: number;
  };
  aggregation?: {
    enabled: boolean;
    windowMs?: number;
  };
}

export class AlertSystem {
  private config: AlertSystemConfig;
  private deduplication?: AlertDeduplication;
  private aggregator?: AlertAggregator;

  constructor(config: AlertSystemConfig) {
    this.config = config;

    if (config.deduplication?.enabled) {
      this.deduplication = new AlertDeduplication(
        config.deduplication.ttl,
        config.deduplication.cooldown
      );
    }

    if (config.aggregation?.enabled) {
      this.aggregator = new AlertAggregator(config.aggregation.windowMs);
    }
  }

  /**
   * Send an alert to configured channels
   */
  async sendAlert(config: AlertConfig): Promise<Record<AlertChannel, boolean>> {
    const results: Partial<Record<AlertChannel, boolean>> = {};

    // Check deduplication
    if (this.deduplication && !this.deduplication.shouldSendAlert(config)) {
      return results as Record<AlertChannel, boolean>;
    }

    // Add to aggregator
    if (this.aggregator) {
      this.aggregator.addAlert(config);
    }

    // Determine which channels to use
    const channels = config.channels ?? this.getDefaultChannels();

    // Send to each enabled channel
    if (channels.includes('slack') && this.config.slack?.enabled && this.shouldSendToChannel('slack', config.severity)) {
      results.slack = await sendSlackAlertInternal(config, this.config.slack.webhookUrl);
    }

    if (channels.includes('email') && this.config.email?.enabled && this.shouldSendToChannel('email', config.severity)) {
      results.email = await sendEmailAlertInternal(config, this.config.email);
    }

    if (channels.includes('webhook') && this.config.webhook?.enabled && this.shouldSendToChannel('webhook', config.severity)) {
      results.webhook = await sendWebhookAlert(config, this.config.webhook);
    }

    if (channels.includes('discord') && this.config.discord?.enabled && this.shouldSendToChannel('discord', config.severity)) {
      results.discord = await sendDiscordAlert(config, this.config.discord.webhookUrl);
    }

    if (channels.includes('telegram') && this.config.telegram?.enabled && this.shouldSendToChannel('telegram', config.severity)) {
      results.telegram = await sendTelegramAlert(config, this.config.telegram);
    }

    return results as Record<AlertChannel, boolean>;
  }

  /**
   * Get aggregated alerts summary
   */
  getAggregatedSummary(): Map<string, AggregatedAlert> {
    return this.aggregator?.getAggregatedAlerts() ?? new Map();
  }

  /**
   * Get deduplication summary
   */
  getDeduplicationSummary(): Array<{ key: string; count: number; firstSeen: Date; title: string }> {
    return this.deduplication?.getSummary() ?? [];
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let cleared = 0;

    if (this.deduplication) {
      cleared += this.deduplication.clearExpired();
    }

    return cleared;
  }

  private getDefaultChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [];

    if (this.config.slack?.enabled) channels.push('slack');
    if (this.config.email?.enabled) channels.push('email');
    if (this.config.webhook?.enabled) channels.push('webhook');
    if (this.config.discord?.enabled) channels.push('discord');
    if (this.config.telegram?.enabled) channels.push('telegram');

    return channels;
  }

  private shouldSendToChannel(channel: AlertChannel, severity: AlertSeverity): boolean {
    const config = this.config[channel as keyof AlertSystemConfig];
    if (!config || typeof config !== 'object' || !('severityThreshold' in config)) {
      return true;
    }

    const severityOrder: Record<AlertSeverity, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };
    const threshold = (config as AlertChannelConfig).severityThreshold;

    if (!threshold) return true;

    return severityOrder[severity] <= severityOrder[threshold];
  }
}

// ========================================
// Slack Integration
// ========================================

interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields?: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  actions?: Array<{
    type: string;
    text: string;
    url: string;
  }>;
  footer: string;
  ts: number;
}

async function sendSlackAlertInternal(config: AlertConfig, webhookUrl: string): Promise<boolean> {
  const attachment: SlackAttachment = {
    color: SEVERITY_COLORS[config.severity],
    title: `${SEVERITY_LABELS[config.severity]} ${config.title}`,
    text: config.message,
    fields: config.details
      ? Object.entries(config.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        }))
      : undefined,
    actions: config.url
      ? [
          {
            type: 'button',
            text: 'View Details',
            url: config.url,
          },
        ]
      : undefined,
    footer: '7zi-frontend Monitoring',
    ts: Math.floor((config.timestamp ?? new Date()).getTime() / 1000),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachments: [attachment],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    return false;
  }
}

// ========================================
// Email Integration (Resend)
// ========================================

async function sendEmailAlertInternal(config: AlertConfig, emailConfig: EmailConfig): Promise<boolean> {
  const emailHtml = generateAlertEmail(config);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailConfig.from,
        to: emailConfig.recipients,
        subject: `[${config.severity.toUpperCase()}] ${config.title}`,
        html: emailHtml,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    return false;
  }
}

function generateAlertEmail(config: AlertConfig): string {
  const severityClass = `alert-${config.severity}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { padding: 20px; border-radius: 8px; }
    .alert-p0 { background: #ffebee; border-left: 4px solid #f44336; }
    .alert-p1 { background: #fff3e0; border-left: 4px solid #ff9800; }
    .alert-p2 { background: #fffde7; border-left: 4px solid #ffeb3b; }
    .alert-p3 { background: #e8f5e9; border-left: 4px solid #4caf50; }
    .severity { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 12px; }
    .message { font-size: 16px; margin-bottom: 16px; }
    .details { background: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; }
    .detail-row { display: flex; padding: 4px 0; }
    .detail-key { font-weight: bold; min-width: 120px; }
    .meta { margin-top: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert ${severityClass}">
      <div class="severity">${SEVERITY_LABELS[config.severity]}</div>
      <div class="title">${config.title}</div>
      <div class="message">${config.message}</div>
      ${config.details ? `
        <div class="details">
          ${Object.entries(config.details).map(([key, value]) => `
            <div class="detail-row">
              <span class="detail-key">${key}:</span>
              <span>${value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${config.url ? `<a href="${config.url}" class="button">View Details</a>` : ''}
      <div class="meta">
        <p>Environment: ${process.env.NODE_ENV}</p>
        <p>Time: ${config.timestamp ?? new Date().toISOString()}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ========================================
// Webhook Integration
// ========================================

async function sendWebhookAlert(config: AlertConfig, webhookConfig: WebhookConfigFull): Promise<boolean> {
  const payload = {
    severity: config.severity,
    title: config.title,
    message: config.message,
    details: config.details,
    url: config.url,
    timestamp: config.timestamp ?? new Date().toISOString(),
    tags: config.tags,
  };

  try {
    const response = await fetch(webhookConfig.url, {
      method: webhookConfig.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webhookConfig.headers,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send webhook alert:', error);
    return false;
  }
}

// ========================================
// Discord Integration
// ========================================

async function sendDiscordAlert(config: AlertConfig, webhookUrl: string): Promise<boolean> {
  const embed: DiscordEmbed = {
    title: `${SEVERITY_LABELS[config.severity]} ${config.title}`,
    description: config.message,
    color: SEVERITY_DISCORD_COLORS[config.severity],
    fields: config.details
      ? Object.entries(config.details).map(([key, value]) => ({
          name: key,
          value: String(value),
          inline: true,
        }))
      : undefined,
    url: config.url,
    timestamp: (config.timestamp ?? new Date()).toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Discord alert:', error);
    return false;
  }
}

// ========================================
// Telegram Integration
// ========================================

async function sendTelegramAlert(config: AlertConfig, telegramConfig: TelegramConfig): Promise<boolean> {
  const text = `${SEVERITY_LABELS[config.severity]} *${config.title}*

${config.message}

${config.details ? Object.entries(config.details)
      .map(([key, value]) => `*${key}:* \`${value}\``)
      .join('\n') : ''}

${config.url ? `🔗 [View Details](${config.url})` : ''}

\`${(config.timestamp ?? new Date()).toISOString()}\``;

  try {
    const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramConfig.chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      } as TelegramMessage),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Telegram alert:', error);
    return false;
  }
}

// ========================================
// Backward Compatibility Functions
// ========================================

/**
 * Send alert to Slack (backward compatible)
 */
export async function sendSlackAlert(config: AlertConfig): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return false;
  }

  return sendSlackAlertInternal(config, webhookUrl);
}

/**
 * Send alert via email (backward compatible)
 */
export async function sendEmailAlert(config: AlertConfig): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('Resend API key not configured');
    return false;
  }

  return sendEmailAlertInternal(config, {
    apiKey,
    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') ?? ['admin@7zi.studio'],
    from: 'alerts@7zi.studio',
    enabled: true,
  });
}

/**
 * Send alert to all configured channels (backward compatible)
 */
export async function sendAlert(config: AlertConfig): Promise<{
  slack: boolean;
  email: boolean;
}> {
  const [slackResult, emailResult] = await Promise.allSettled([
    sendSlackAlert(config),
    // Only send email for P0 and P1
    config.severity === 'p0' || config.severity === 'p1'
      ? sendEmailAlert(config)
      : Promise.resolve(false),
  ]);

  return {
    slack: slackResult.status === 'fulfilled' ? slackResult.value : false,
    email: emailResult?.status === 'fulfilled' ? emailResult.value : false,
  };
}

/**
 * Alert helper functions for common scenarios
 */
export const alerts = {
  /**
   * Service down alert
   */
  serviceDown: (service: string, error?: string) => sendAlert({
    severity: 'p0',
    title: `Service Down: ${service}`,
    message: error ?? 'Service is not responding to health checks',
    details: {
      Service: service,
      Environment: process.env.NODE_ENV ?? 'unknown',
    },
  }),

  /**
   * Error rate spike alert
   */
  errorRateSpike: (currentRate: number, baselineRate: number) => sendAlert({
    severity: 'p1',
    title: 'Error Rate Spike Detected',
    message: `Error rate increased significantly from baseline`,
    details: {
      'Current Rate': `${currentRate.toFixed(2)}%`,
      'Baseline Rate': `${baselineRate.toFixed(2)}%`,
      Increase: `${((currentRate / baselineRate - 1) * 100).toFixed(0)}%`,
    },
  }),

  /**
   * Performance degradation alert
   */
  performanceDegradation: (metric: string, value: number, threshold: number) => sendAlert({
    severity: 'p2',
    title: `Performance Degradation: ${metric}`,
    message: `${metric} exceeded threshold`,
    details: {
      Metric: metric,
      'Current Value': `${value}ms`,
      Threshold: `${threshold}ms`,
    },
  }),

  /**
   * SSL certificate expiring soon
   */
  sslExpiring: (domain: string, daysLeft: number) => sendAlert({
    severity: daysLeft <= 7 ? 'p1' : 'p2',
    title: 'SSL Certificate Expiring Soon',
    message: `SSL certificate for ${domain} will expire in ${daysLeft} days`,
    details: {
      Domain: domain,
      'Days Left': daysLeft,
    },
  }),

  /**
   * New error type detected
   */
  newError: (errorMessage: string, errorType: string) => sendAlert({
    severity: 'p1',
    title: 'New Error Type Detected',
    message: errorMessage,
    details: {
      'Error Type': errorType,
      'First Seen': new Date().toISOString(),
    },
  }),
};