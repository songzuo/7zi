/**
 * Alert Email Template
 *
 * HTML and text templates for alert notifications
 *
 * @module lib/alerting/templates/alert-template
 */

import type { PerformanceAlert, AlertLevel } from "@/lib/performance/alerting/alerter";

// ========================================
// Types
// ========================================

/**
 * Rendered email content
 */
export interface AlertEmailContent {
  /** HTML version of the email */
  html: string;
  /** Plain text version of the email */
  text: string;
}

// ========================================
// Template Configuration
// ========================================

const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: "#3b82f6",    // Blue
  warning: "#f59e0b", // Amber
  error: "#ef4444",   // Red
  critical: "#dc2626", // Dark red
};

const LEVEL_ICONS: Record<AlertLevel, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "❌",
  critical: "🚨",
};

// ========================================
// Main Render Function
// ========================================

/**
 * Render alert as HTML and plain text email
 */
export function renderAlertEmail(alert: PerformanceAlert): AlertEmailContent {
  const html = renderHtmlEmail(alert);
  const text = renderTextEmail(alert);
  return { html, text };
}

/**
 * Render HTML email
 */
function renderHtmlEmail(alert: PerformanceAlert): string {
  const levelColor = LEVEL_COLORS[alert.level];
  const levelIcon = LEVEL_ICONS[alert.level];
  const formattedTime = formatTimestamp(alert.createdAt);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert: ${escapeHtml(alert.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: ${levelColor};
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header .level-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      margin-top: 8px;
    }
    .content {
      padding: 24px;
    }
    .alert-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 12px 0;
    }
    .alert-message {
      font-size: 16px;
      color: #4b5563;
      margin: 0 0 20px 0;
    }
    .details {
      background-color: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .details-title {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-size: 14px;
      color: #6b7280;
    }
    .detail-value {
      font-size: 14px;
      color: #111827;
      font-weight: 500;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: ${levelColor};
      text-decoration: none;
    }
    .metric-card {
      background: linear-gradient(135deg, ${levelColor}10, ${levelColor}20);
      border-left: 4px solid ${levelColor};
      padding: 12px 16px;
      margin-top: 12px;
      border-radius: 4px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: ${levelColor};
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .occurrence {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${levelIcon} Alert Notification</h1>
        <span class="level-badge">${alert.level.toUpperCase()}</span>
      </div>
      
      <div class="content">
        <h2 class="alert-title">${escapeHtml(alert.title)}</h2>
        <p class="alert-message">${escapeHtml(alert.message)}</p>
        
        ${renderMetricCard(alert)}
        
        <div class="details">
          <h3 class="details-title">Alert Details</h3>
          ${renderDetailRow("Category", alert.category)}
          ${renderDetailRow("Source", alert.source)}
          ${renderDetailRow("Alert ID", alert.id)}
          ${renderDetailRow("Time", formattedTime)}
          ${alert.occurrenceCount > 1 ? renderDetailRow("Occurrences", String(alert.occurrenceCount), `<span class="occurrence">${alert.occurrenceCount}x</span>`) : ""}
          ${alert.status !== "active" ? renderDetailRow("Status", alert.status) : ""}
        </div>
        
        ${renderTags(alert.tags)}
        ${renderMetadata(alert.metadata)}
      </div>
      
      <div class="footer">
        <p>This is an automated alert from 7zi System</p>
        <p>
          <a href="#">View in Dashboard</a> |
          <a href="#">Acknowledge</a> |
          <a href="#">Configure Alerts</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render plain text email
 */
function renderTextEmail(alert: PerformanceAlert): string {
  const levelIcon = LEVEL_ICONS[alert.level];
  const formattedTime = formatTimestamp(alert.createdAt);

  let text = `${levelIcon} ALERT: ${alert.title.toUpperCase()}\n`;
  text += `${"=".repeat(50)}\n\n`;
  text += `Level: ${alert.level.toUpperCase()}\n`;
  text += `Category: ${alert.category}\n`;
  text += `Source: ${alert.source}\n`;
  text += `Time: ${formattedTime}\n`;
  text += `Alert ID: ${alert.id}\n`;

  if (alert.occurrenceCount > 1) {
    text += `Occurrences: ${alert.occurrenceCount}\n`;
  }

  text += `\n${alert.message}\n\n`;

  if (alert.metric) {
    text += `Metric: ${alert.metric}\n`;
    if (alert.currentValue !== undefined) {
      text += `Current Value: ${alert.currentValue}\n`;
    }
    if (alert.threshold !== undefined) {
      text += `Threshold: ${alert.threshold}\n`;
    }
  }

  if (alert.tags && alert.tags.length > 0) {
    text += `\nTags: ${alert.tags.join(", ")}\n`;
  }

  text += `\n${"-".repeat(50)}\n`;
  text += `This is an automated alert from 7zi System\n`;

  return text;
}

// ========================================
// Helper Functions
// ========================================

/**
 * Render metric card HTML
 */
function renderMetricCard(alert: PerformanceAlert): string {
  if (!alert.metric && !alert.currentValue) {
    return "";
  }

  const value = alert.currentValue ?? "N/A";
  const threshold = alert.threshold ? `/ ${alert.threshold}` : "";
  const color = LEVEL_COLORS[alert.level];

  return `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(alert.metric || "Value")}</div>
      <div class="metric-value">${escapeHtml(String(value))} ${threshold ? `<span style="font-size: 16px; color: #6b7280">${threshold}</span>` : ""}</div>
    </div>
  `;
}

/**
 * Render detail row
 */
function renderDetailRow(
  label: string,
  value: string,
  customValue?: string,
): string {
  return `
    <div class="detail-row">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${customValue || escapeHtml(value)}</span>
    </div>
  `;
}

/**
 * Render tags
 */
function renderTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) {
    return "";
  }

  return `
    <div class="details">
      <h3 class="details-title">Tags</h3>
      <div>${tags.map((tag) => `<span style="display: inline-block; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  `;
}

/**
 * Render metadata
 */
function renderMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }

  let rows = "";
  for (const [key, value] of Object.entries(metadata)) {
    rows += renderDetailRow(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }

  return `
    <div class="details">
      <h3 class="details-title">Additional Info</h3>
      ${rows}
    </div>
  `;
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ========================================
// Export
// ========================================

export default {
  renderAlertEmail,
};
