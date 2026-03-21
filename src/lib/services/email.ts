/**
 * Email Notification Service
 *
 * Provides email notification functionality using Resend API
 */

import { logger } from '@/lib/logger';

/**
 * Email configuration
 */
export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  replyTo?: string;
  contactEmail?: string;
}

/**
 * Email recipient
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email notification data
 */
export interface EmailNotification {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Email service class
 */
export class EmailService {
  private config: EmailConfig | null = null;
  private enabled = false;

  /**
   * Initialize email service
   */
  initialize(config: EmailConfig): void {
    this.config = config;
    this.enabled = !!config.apiKey;

    if (this.enabled) {
      logger.info('[EmailService] Email service initialized');
    } else {
      logger.warn('[EmailService] Email service disabled: No API key provided');
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled || !this.config) {
      return {
        success: false,
        error: 'Email service not enabled or not configured',
      };
    }

    try {
      // Validate required fields
      if (!notification.to || (Array.isArray(notification.to) && notification.to.length === 0)) {
        throw new Error('Recipient is required');
      }

      if (!notification.subject) {
        throw new Error('Subject is required');
      }

      if (!notification.html && !notification.text) {
        throw new Error('HTML or text content is required');
      }

      // Prepare recipients
      const to = Array.isArray(notification.to) ? notification.to : [notification.to];

      // Build request
      const requestBody: Record<string, unknown> = {
        from: notification.replyTo || this.config.replyTo || this.config.fromEmail,
        to: to.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        subject: notification.subject,
      };

      if (notification.html) {
        requestBody.html = notification.html;
      }

      if (notification.text) {
        requestBody.text = notification.text;
      }

      if (notification.cc && notification.cc.length > 0) {
        requestBody.cc = notification.cc.map(r => r.name ? `${r.name} <${r.email}>` : r.email);
      }

      if (notification.bcc && notification.bcc.length > 0) {
        requestBody.bcc = notification.bcc.map(r => r.name ? `${r.name} <${r.email}>` : r.email);
      }

      if (notification.tags && notification.tags.length > 0) {
        requestBody.tags = notification.tags;
      }

      // Send via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      logger.log('[EmailService] Email sent successfully:', result.id);

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      logger.error('[EmailService] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification email with standard template
   */
  async sendNotificationEmail(params: {
    to: EmailRecipient | EmailRecipient[];
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    actionUrl?: string;
    actionText?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, title, message, type, actionUrl, actionText, metadata } = params;

    // Type colors
    const colors = {
      info: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    };

    const color = colors[type];

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: ${color};
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 24px;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #374151;
      margin-bottom: 20px;
    }
    .action-button {
      display: inline-block;
      background-color: ${color};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    .action-button:hover {
      background-color: ${color}dd;
    }
    .metadata {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #6b7280;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <div class="message">
        ${message.replace(/\n/g, '<br>')}
      </div>
      ${actionUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${actionUrl}" class="action-button">${actionText || 'View Details'}</a>
        </div>
      ` : ''}
      ${metadata ? `
        <div class="metadata">
          <strong>Details:</strong>
          <pre style="margin: 8px 0; padding: 12px; background: #f3f4f6; border-radius: 4px; overflow-x: auto;">${JSON.stringify(metadata, null, 2)}</pre>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>You received this notification from 7zi Team Management Platform.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://7zi.com'}">Unsubscribe</a> | <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://7zi.com'}">Manage Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `;

    // Build plain text version
    const text = `
${title}
${'='.repeat(title.length)}

${message}

${actionUrl ? `
Action: ${actionText || 'View Details'}
${actionUrl}
` : ''}

${metadata ? `
Details:
${JSON.stringify(metadata, null, 2)}
` : ''}

---
You received this notification from 7zi Team Management Platform.
${process.env.NEXT_PUBLIC_APP_URL || 'https://7zi.com'}
    `;

    return this.sendEmail({
      to,
      subject: `[7zi] ${title}`,
      html,
      text,
    });
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get email service configuration status
   */
  getStatus(): { enabled: boolean; configured: boolean } {
    return {
      enabled: this.enabled,
      configured: !!this.config?.apiKey,
    };
  }
}

// Singleton instance
export const emailService = new EmailService();
 const emailService = new EmailService();
 const emailService = new EmailService();
