/**
 * Alerting Service
 * Send alerts to various channels (Slack, Email, etc.)
 */

import { createLogger } from '@/lib/logger';

const alertLogger = createLogger('Alert');

// Alert severity levels
export type AlertSeverity = 'p0' | 'p1' | 'p2' | 'p3';

// Alert configuration
export interface AlertConfig {
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: Record<string, string | number>;
  url?: string;
  timestamp?: Date;
}

// Slack webhook payload
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

// Severity colors
const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  p0: '#FF0000', // Red - Critical
  p1: '#FFA500', // Orange - High
  p2: '#FFFF00', // Yellow - Warning
  p3: '#00FF00', // Green - Info
};

// Severity labels
const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  p0: '🔴 CRITICAL',
  p1: '🟠 HIGH',
  p2: '🟡 WARNING',
  p3: '🟢 INFO',
};

/**
 * Send alert to Slack
 */
export async function sendSlackAlert(config: AlertConfig): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    alertLogger.warn('Slack webhook URL not configured');
    return false;
  }

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
    alertLogger.error('Failed to send Slack alert', error);
    return false;
  }
}

/**
 * Send alert via email (using Resend)
 */
export async function sendEmailAlert(config: AlertConfig): Promise<boolean> {
  // Email sending is handled by Resend or similar service
  // This is a placeholder for server-side email alerts
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    alertLogger.warn('Resend API key not configured');
    return false;
  }

  const emailHtml = generateAlertEmail(config);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'alerts@7zi.studio',
        to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') ?? ['admin@7zi.studio'],
        subject: `[${config.severity.toUpperCase()}] ${config.title}`,
        html: emailHtml,
      }),
    });

    return response.ok;
  } catch (error) {
    alertLogger.error('Failed to send email alert', error);
    return false;
  }
}

/**
 * Generate HTML email for alert
 */
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

/**
 * Send alert to all configured channels
 */
export async function sendAlert(config: AlertConfig): Promise<{
  slack: boolean;
  email: boolean;
}> {
  const results = await Promise.allSettled([
    sendSlackAlert(config),
    // Only send email for P0 and P1
    config.severity === 'p0' || config.severity === 'p1'
      ? sendEmailAlert(config)
      : Promise.resolve(false),
  ]);

  return {
    slack: results[0].status === 'fulfilled' ? results[0].value : false,
    email: results[1].status === 'fulfilled' ? results[1].value : false,
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