/**
 * Slack Alert Channel
 * Slack 告警渠道
 *
 * Sends alerts to Slack via Incoming Webhook or Bot API.
 */

import { Alert, AlertChannel } from "../alert-engine";

export interface SlackChannelConfig {
  // Webhook URL (simpler, no additional config needed)
  webhookUrl?: string;
  
  // Bot Token (for more advanced features)
  botToken?: string;
  
  // Channel overrides by priority
  channels: {
    P0?: string;
    P1?: string;
    P2?: string;
    P3?: string;
    default: string;
  };
  
  // Additional settings
  username?: string; // Bot username (default: "Performance Alerts")
  iconEmoji?: string; // Bot icon (default: :rotating_light:)
  unfurlLinks?: boolean;
  threadAlerts?: boolean; // Thread replies instead of new messages
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: any[];
  accessory?: any;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackAttachment {
  color: string;
  blocks?: SlackBlock[];
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

/**
 * Slack Alert Channel
 */
export class SlackAlertChannel implements AlertChannel {
  private config: SlackChannelConfig;
  private webhookUrl: string | null = null;
  private botToken: string | null = null;

  constructor(config: SlackChannelConfig) {
    this.config = {
      username: "Performance Alerts",
      iconEmoji: ":rotating_light:",
      unfurlLinks: false,
      threadAlerts: false,
      channels: {
        default: "#alerts",
      },
      ...config,
    };

    this.webhookUrl = config.webhookUrl || null;
    this.botToken = config.botToken || null;
  }

  /**
   * Send alert to Slack
   */
  async send(alert: Alert): Promise<void> {
    const payload = this.buildPayload(alert);

    // Try webhook first, then bot API
    if (this.webhookUrl) {
      await this.sendViaWebhook(payload);
    } else if (this.botToken) {
      await this.sendViaBotAPI(alert, payload);
    } else {
      // Fallback to console log
      console.log("[SlackAlert] No webhook URL or bot token configured");
      console.log("[SlackAlert] Would send:", JSON.stringify(payload, null, 2));
    }
  }

  /**
   * Build Slack message payload
   */
  private buildPayload(alert: Alert): any {
    const priority = alert.priority || "P3";
    const channel = this.getChannel(priority);
    const color = this.getColorForSeverity(alert.severity);
    const emoji = this.getEmojiForSeverity(alert.severity);

    const blocks = this.buildBlocks(alert);
    
    const attachments: SlackAttachment[] = [
      {
        color,
        blocks,
        footer: alert.id,
        ts: Math.floor(alert.timestamp / 1000),
      },
    ];

    return {
      channel,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      unfurl_links: this.config.unfurlLinks,
      blocks: this.buildHeaderBlocks(alert, emoji),
      attachments,
    };
  }

  /**
   * Build header blocks
   */
  private buildHeaderBlocks(alert: Alert, emoji: string): SlackBlock[] {
    const priorityColor = this.getPriorityEmoji(alert.priority);
    
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${alert.ruleName}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Priority:*\n${alert.priority || "P3"}`,
          },
          {
            type: "mrkdwn",
            text: `*Severity:*\n${alert.severity}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${alert.status}`,
          },
          {
            type: "mrkdwn",
            text: `*Metric:*\n\`${alert.metric}\``,
          },
        ],
      },
      {
        type: "divider",
      },
    ];
  }

  /**
   * Build message blocks
   */
  private buildBlocks(alert: Alert): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: alert.message,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Value:*\n\`${alert.value}\``,
          },
          {
            type: "mrkdwn",
            text: `*Threshold:*\n\`${alert.threshold}\``,
          },
        ],
      },
    ];

    // Add context if available
    if (alert.context && Object.keys(alert.context).length > 0) {
      const contextText = this.formatContextForSlack(alert.context);
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Context:*\n\`\`\`\n${contextText}\n\`\`\``,
        },
      });
    }

    // Add actions (buttons)
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Dashboard",
            emoji: true,
          },
          url: this.buildDashboardUrl(alert),
          style: "primary",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Acknowledge",
            emoji: true,
          },
          action_id: `acknowledge_${alert.id}`,
        },
      ],
    });

    // Add footer with timing
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Triggered: ${new Date(alert.timestamp).toLocaleString()} | Alert ID: \`${alert.id.slice(0, 8)}\``,
        },
      ],
    });

    return blocks;
  }

  /**
   * Format context for Slack
   */
  private formatContextForSlack(context: Record<string, unknown>): string {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === "object") {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    return lines.join("\n");
  }

  /**
   * Get channel for priority
   */
  private getChannel(priority: string): string {
    const priorityKey = priority as keyof typeof this.config.channels;
    return this.config.channels[priorityKey] || this.config.channels.default;
  }

  /**
   * Get color for severity
   */
  private getColorForSeverity(severity: string): string {
    switch (severity) {
      case "critical":
        return "#9c27b0"; // purple
      case "error":
        return "#f44336"; // red
      case "warning":
        return "#ff9800"; // orange
      case "info":
        return "#4caf50"; // green
      default:
        return "#607d8b"; // grey
    }
  }

  /**
   * Get emoji for severity
   */
  private getEmojiForSeverity(severity: string): string {
    switch (severity) {
      case "critical":
        return "🚨";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "🔔";
    }
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: string | undefined): string {
    switch (priority) {
      case "P0":
        return "🔴";
      case "P1":
        return "🟠";
      case "P2":
        return "🟡";
      case "P3":
        return "🟢";
      default:
        return "⚪";
    }
  }

  /**
   * Build dashboard URL
   */
  private buildDashboardUrl(alert: Alert): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://7zi.com";
    return `${baseUrl}/monitoring/alerts/${alert.id}`;
  }

  /**
   * Send via webhook
   */
  private async sendViaWebhook(payload: any): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log(`[SlackAlert] Sent to ${payload.channel}: ${payload.text}`);
    } catch (error) {
      console.error("[SlackAlert] Webhook error:", error);
      throw error;
    }
  }

  /**
   * Send via Bot API
   */
  private async sendViaBotAPI(alert: Alert, payload: any): Promise<void> {
    if (!this.botToken) return;

    const channel = this.getChannel(alert.priority || "P3");

    try {
      // First, open or get conversation
      const conversationId = await this.getOrCreateConversation(channel);
      
      // Then send message
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel: conversationId,
          ...payload,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      console.log(`[SlackAlert] Sent via bot to ${channel}: ${alert.ruleName}`);
    } catch (error) {
      console.error("[SlackAlert] Bot API error:", error);
      throw error;
    }
  }

  /**
   * Get or create conversation (channel)
   */
  private async getOrCreateConversation(channelName: string): Promise<string> {
    // First try to look up existing channel
    const response = await fetch("https://slack.com/api/conversations.lookupByName", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify({ name: channelName.replace("#", "") }),
    });

    const result = await response.json();

    if (result.ok) {
      return result.channel.id;
    }

    // If not found, try to create
    const createResponse = await fetch("https://slack.com/api/conversations.create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify({ 
        name: channelName.replace("#", ""),
        is_private: false,
      }),
    });

    const createResult = await createResponse.json();

    if (createResult.ok) {
      return createResult.channel.id;
    }

    throw new Error(`Could not find or create channel: ${channelName}`);
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    if (this.botToken) {
      try {
        const response = await fetch("https://slack.com/api/auth.test", {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
          },
        });

        const result = await response.json();
        
        if (result.ok) {
          console.log(`[SlackAlert] Connected as: ${result.user}`);
          return true;
        }
        
        console.error("[SlackAlert] Auth test failed:", result.error);
        return false;
      } catch (error) {
        console.error("[SlackAlert] Connection test failed:", error);
        return false;
      }
    }

    // For webhook, just log
    console.log("[SlackAlert] Using webhook mode, connection test skipped");
    return true;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SlackChannelConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.webhookUrl) {
      this.webhookUrl = config.webhookUrl;
    }
    if (config.botToken) {
      this.botToken = config.botToken;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SlackChannelConfig {
    return { ...this.config };
  }
}

/**
 * Create Slack channel from environment variables
 */
export function createSlackChannelFromEnv(): SlackAlertChannel | null {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;
  
  if (!webhookUrl && !botToken) {
    console.warn("[SlackAlert] Slack not configured, alerts will be logged only");
    return null;
  }

  return new SlackAlertChannel({
    webhookUrl: webhookUrl || undefined,
    botToken: botToken || undefined,
    channels: {
      P0: process.env.SLACK_CHANNEL_P0 || "#alerts-critical",
      P1: process.env.SLACK_CHANNEL_P1 || "#alerts-high",
      P2: process.env.SLACK_CHANNEL_P2 || "#alerts-warning",
      P3: process.env.SLACK_CHANNEL_P3 || "#alerts-info",
      default: process.env.SLACK_CHANNEL_DEFAULT || "#alerts",
    },
    username: process.env.SLACK_USERNAME || "Performance Alerts",
    iconEmoji: process.env.SLACK_ICON || ":rotating_light:",
  });
}

export default SlackAlertChannel;