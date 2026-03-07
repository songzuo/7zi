/**
 * Email Template System
 * 
 * Provides a flexible email template system for generating various types of emails.
 */

import { BaseTemplate, TemplateContext, TemplateResult } from './types';

/**
 * Email Template Types
 */
export type EmailTemplateType = 
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'notification'
  | 'report'
  | 'invitation'
  | 'alert'
  | 'custom';

/**
 * Email Template Configuration
 */
export interface EmailTemplateConfig {
  type: EmailTemplateType;
  subject: string;
  header?: string;
  footer?: string;
  logoUrl?: string;
  brandName?: string;
  brandColor?: string;
}

/**
 * Email Context Data
 */
export interface EmailContext extends TemplateContext {
  recipientName?: string;
  recipientEmail: string;
  senderName?: string;
  senderEmail?: string;
  actionUrl?: string;
  actionText?: string;
  customContent?: string;
  data?: Record<string, unknown>;
}

/**
 * Email Template Result
 */
export interface EmailResult extends TemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base Email Template Class
 */
export abstract class EmailTemplate implements BaseTemplate<EmailContext, EmailResult> {
  protected config: EmailTemplateConfig;

  constructor(config: EmailTemplateConfig) {
    this.config = {
      brandName: 'OpenClaw',
      brandColor: '#3B82F6',
      footer: `© ${new Date().getFullYear()} OpenClaw. All rights reserved.`,
      ...config,
    };
  }

  abstract render(context: EmailContext): EmailResult;

  /**
   * Generate HTML wrapper
   */
  protected wrapHtml(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: ${this.config.brandColor};
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .logo {
      max-height: 50px;
      margin-bottom: 12px;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .message {
      color: #374151;
      margin-bottom: 24px;
    }
    .action-button {
      display: inline-block;
      background: ${this.config.brandColor};
      color: white;
      padding: 12px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 24px 0;
    }
    .highlight {
      background: #fef3c7;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      ${this.config.header ? `<div class="header">${this.config.header}</div>` : ''}
      ${content}
      ${this.config.footer ? `<div class="footer">${this.config.footer}</div>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Strip HTML tags for plain text version
   */
  protected stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
}

/**
 * Welcome Email Template
 */
export class WelcomeEmailTemplate extends EmailTemplate {
  constructor() {
    super({
      type: 'welcome',
      subject: 'Welcome to OpenClaw!',
      header: '🎉 Welcome!',
    });
  }

  render(context: EmailContext): EmailResult {
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          <p>Welcome to ${this.config.brandName}! We're excited to have you on board.</p>
          <p>With your new account, you can:</p>
          <ul>
            <li>Manage your tasks efficiently</li>
            <li>Track progress in real-time</li>
            <li>Collaborate with your team</li>
            <li>Generate detailed reports</li>
          </ul>
        </div>
        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">Get Started</a>
        ` : ''}
        <div class="divider"></div>
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'welcome' },
    };
  }
}

/**
 * Verification Email Template
 */
export class VerificationEmailTemplate extends EmailTemplate {
  constructor() {
    super({
      type: 'verification',
      subject: 'Verify Your Email Address',
      header: '✉️ Email Verification',
    });
  }

  render(context: EmailContext): EmailResult {
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
          <div class="highlight">
            <strong>Verification Code:</strong> ${context.data?.code || 'N/A'}
          </div>
          <p>Or click the button below to verify automatically:</p>
        </div>
        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">Verify Email</a>
        ` : ''}
        <div class="divider"></div>
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'verification' },
    };
  }
}

/**
 * Password Reset Email Template
 */
export class PasswordResetEmailTemplate extends EmailTemplate {
  constructor() {
    super({
      type: 'password-reset',
      subject: 'Reset Your Password',
      header: '🔐 Password Reset',
    });
  }

  render(context: EmailContext): EmailResult {
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
        </div>
        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">Reset Password</a>
        ` : ''}
        <div class="divider"></div>
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'password-reset' },
    };
  }
}

/**
 * Report Email Template
 */
export class ReportEmailTemplate extends EmailTemplate {
  constructor(reportTitle: string) {
    super({
      type: 'report',
      subject: `Report: ${reportTitle}`,
      header: '📊 Report Ready',
    });
  }

  render(context: EmailContext): EmailResult {
    const reportData = context.data?.report as Record<string, unknown> | undefined;
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          <p>Your report is ready!</p>
          ${reportData ? `
            <div class="highlight">
              <strong>Report:</strong> ${reportData.title || 'Untitled'}<br>
              <strong>Generated:</strong> ${new Date().toLocaleDateString()}
            </div>
            ${reportData.summary ? `<p>${reportData.summary}</p>` : ''}
          ` : ''}
        </div>
        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">View Full Report</a>
        ` : ''}
        <div class="divider"></div>
        <p style="color: #6b7280; font-size: 14px;">
          You're receiving this email because you requested a report.
        </p>
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'report', reportData },
    };
  }
}

/**
 * Alert Email Template
 */
export class AlertEmailTemplate extends EmailTemplate {
  constructor(alertType: string) {
    super({
      type: 'alert',
      subject: `⚠️ Alert: ${alertType}`,
      header: '⚠️ Alert',
      brandColor: '#EF4444',
    });
  }

  render(context: EmailContext): EmailResult {
    const alertData = context.data?.alert as Record<string, unknown> | undefined;
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          <div class="highlight" style="background: #fee2e2; border-left-color: #ef4444;">
            <strong>Alert Type:</strong> ${alertData?.type || 'Unknown'}<br>
            <strong>Severity:</strong> ${alertData?.severity || 'Medium'}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}
          </div>
          ${alertData?.message ? `<p>${alertData.message}</p>` : ''}
        </div>
        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">View Details</a>
        ` : ''}
        <div class="divider"></div>
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated alert. Please take appropriate action.
        </p>
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'alert', alertData },
    };
  }
}

/**
 * Custom Email Template
 */
export class CustomEmailTemplate extends EmailTemplate {
  constructor(config: EmailTemplateConfig) {
    super(config);
  }

  render(context: EmailContext): EmailResult {
    const html = this.wrapHtml(`
      <div class="content">
        <p class="greeting">Hello ${context.recipientName || 'there'},</p>
        <div class="message">
          ${context.customContent || ''}
        </div>
        ${context.actionUrl && context.actionText ? `
          <a href="${context.actionUrl}" class="action-button">${context.actionText}</a>
        ` : ''}
      </div>
    `);

    return {
      subject: this.config.subject,
      html,
      text: this.stripHtml(html),
      metadata: { templateType: 'custom' },
    };
  }
}

/**
 * Email Template Factory
 */
export class EmailTemplateFactory {
  private static templates: Map<EmailTemplateType, () => EmailTemplate> = new Map();

  static register(type: EmailTemplateType, factory: () => EmailTemplate): void {
    this.templates.set(type, factory);
  }

  static create(type: EmailTemplateType, config?: Partial<EmailTemplateConfig>): EmailTemplate {
    const factory = this.templates.get(type);
    if (factory) {
      return factory();
    }

    // Default templates
    switch (type) {
      case 'welcome':
        return new WelcomeEmailTemplate();
      case 'verification':
        return new VerificationEmailTemplate();
      case 'password-reset':
        return new PasswordResetEmailTemplate();
      case 'report':
        return new ReportEmailTemplate(config?.subject || 'Report');
      case 'alert':
        return new AlertEmailTemplate(config?.subject || 'System Alert');
      case 'custom':
        return new CustomEmailTemplate(config as EmailTemplateConfig);
      default:
        throw new Error(`Unknown email template type: ${type}`);
    }
  }

  static getAvailableTypes(): EmailTemplateType[] {
    return ['welcome', 'verification', 'password-reset', 'notification', 'report', 'invitation', 'alert', 'custom'];
  }
}

// Register default templates
EmailTemplateFactory.register('welcome', () => new WelcomeEmailTemplate());
EmailTemplateFactory.register('verification', () => new VerificationEmailTemplate());
EmailTemplateFactory.register('password-reset', () => new PasswordResetEmailTemplate());

export default EmailTemplateFactory;
