/**
 * Email Alert Channel
 * Sends performance alerts via email
 */

import nodemailer, { Transporter } from 'nodemailer';
import type { PerformanceAlert } from '../alerter';

// ========================================
// Types
// ========================================

export interface EmailConfig {
  /** SMTP host */
  host: string;
  /** SMTP port */
  port: number;
  /** Username */
  user: string;
  /** Password */
  password: string;
  /** From address */
  from: string;
  /** Enable TLS */
  secure?: boolean;
  /** Recipients (optional, can be overridden per alert) */
  to?: string[];
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
}

export interface EmailAlertOptions {
  /** Override recipients for this alert */
  to?: string[];
  /** Add CC recipients */
  cc?: string[];
  /** Add BCC recipients */
  bcc?: string[];
  /** Email priority (high, normal, low) */
  priority?: 'high' | 'normal' | 'low';
  /** Add custom headers */
  headers?: Record<string, string>;
  /** Include detailed metadata */
  includeMetadata?: boolean;
}

// ========================================
// EmailChannel Class
// ========================================

export class EmailChannel {
  name = 'email';
  private transporter: Transporter;
  private defaultConfig: EmailConfig;
  private options: EmailAlertOptions;
  private initialized = false;

  constructor(config: EmailConfig, options?: EmailAlertOptions) {
    this.defaultConfig = config;
    this.options = options || {};
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? true,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
    this.initialized = true;
  }

  /**
   * Send alert via email
   */
  async send(alert: PerformanceAlert): Promise<void> {
    if (!this.initialized) {
      throw new Error('EmailChannel not initialized');
    }

    // Build recipients
    const recipients = this.options.to || this.defaultConfig.to || [];
    const cc = this.options.cc || this.defaultConfig.cc || [];
    const bcc = this.options.bcc || this.defaultConfig.bcc || [];

    if (recipients.length === 0) {
      console.warn('[EmailChannel] No recipients configured, skipping email');
      return;
    }

    // Build email content
    const { subject, text, html } = this.buildEmailContent(alert);

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
    };

    // Send email
    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EmailChannel] Email sent for alert ${alert.id}`);
    } catch (_error) {
      console.error('[EmailChannel] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Test email connectivity
   */
  async test(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (_error) {
      console.error('[EmailChannel] Test failed:', error);
      return false;
    }
  }

  /**
   * Build email subject, text, and HTML
   */
  private buildEmailContent(alert: PerformanceAlert): {
    subject: string;
    text: string;
    html: string;
  } {
    const levelEmoji = this.getLevelEmoji(alert.level);
    const timestamp = new Date(alert.createdAt).toLocaleString();

    // Subject
    const subject = `${levelEmoji} [${alert.level.toUpperCase()}] ${alert.title}`;

    // Text content
    const text = `
${levelEmoji} ${alert.title}

Level: ${alert.level.toUpperCase()}
Category: ${alert.category}
Source: ${alert.source}
Time: ${timestamp}
Occurrences: ${alert.occurrenceCount}

${alert.message}
${
  alert.metric && alert.currentValue && alert.threshold
    ? `
Metric: ${alert.metric}
Current Value: ${alert.currentValue}
Threshold: ${alert.threshold}
`
    : ''}
Status: ${alert.status}
Alert ID: ${alert.id}

${
  this.options.includeMetadata && alert.metadata
    ? `
Metadata:
${Object.entries(alert.metadata)
  .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
  .join('\n')}
`
    : ''}
---
Performance Alerting System
`.trim();

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
      alert.metric && alert.currentValue && alert.threshold
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
      this.options.includeMetadata && alert.metadata
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
`.trim();

    return { subject, text, html };
  }

  /**
   * Get emoji for alert level
   */
  private getLevelEmoji(level: string): string {
    const emojis: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojis[level] || '⚠️';
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
    };
    return mapping[level] || 'normal';
  }

  /**
   * Update channel options
   */
  updateOptions(options: Partial<EmailAlertOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): EmailAlertOptions {
    return { ...this.options };
  }

  /**
   * Close the transporter
   */
  async close(): Promise<void> {
    await this.transporter.close();
    this.initialized = false;
  }
}
