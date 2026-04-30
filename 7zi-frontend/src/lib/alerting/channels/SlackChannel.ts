/**
 * Slack 通知渠道实现
 * 使用 Slack Incoming Webhook 发送消息
 */

import {
  NotificationChannel,
  NotificationPayload,
  SendResult,
  SlackChannelConfig,
  ChannelConfig,
} from './NotificationChannel';

/**
 * Slack Block Kit message elements
 */
export interface SlackBlockElement {
  type: string;
  text?: { type: string; text: string };
  url?: string;
  action_id?: string;
  value?: string;
  confirm?: SlackConfirmationDialog;
}

/**
 * Slack Block Kit message fields
 */
export interface SlackField {
  type: string;
  text?: string;
  value?: string;
  short?: boolean;
}

/**
 * Slack Block Kit message
 */
export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  accessory?: {
    type: string;
    text?: { type: string; text: string };
    url?: string;
    action_id?: string;
  };
  elements?: SlackBlockElement[];
  fields?: SlackField[];
  color?: string;
}

/**
 * Slack confirmation dialog for interactive elements
 */
export interface SlackConfirmationDialog {
  title?: { type: string; text: string };
  text: { type: string; text: string };
  confirm?: { type: string; text: string };
  deny?: { type: string; text: string };
}

/**
 * Slack message structure
 */
interface SlackMessage {
  blocks: SlackBlock[];
  username?: string;
  channel?: string;
  icon_emoji?: string;
  icon_url?: string;
}

/**
 * Slack 渠道
 */
export class SlackChannel implements NotificationChannel {
  readonly type = 'slack' as const;
  private config: SlackChannelConfig;

  constructor(config: SlackChannelConfig) {
    this.config = config;
  }

  /**
   * 验证配置
   */
  validateConfig(config: ChannelConfig): boolean {
    if (config.type !== 'slack') return false;
    const slackConfig = config as SlackChannelConfig;
    
    // 验证 webhook URL 格式
    if (!slackConfig.webhookUrl) {
      return false;
    }
    
    try {
      const url = new URL(slackConfig.webhookUrl);
      if (!url.href.startsWith('https://hooks.slack.com/')) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * 发送通知
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const message = this.buildMessage(payload);
      
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${errorText}`,
          channelType: this.type,
        };
      }

      return {
        success: true,
        data: { message: 'Slack notification sent successfully' },
        channelType: this.type,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channelType: this.type,
      };
    }
  }

  /**
   * 构建 Slack 消息
   */
  private buildMessage(payload: NotificationPayload): SlackMessage {
    const blocks = this.buildBlocks(payload);

    const message: SlackMessage = {
      blocks,
      username: this.config.username || '7zi Alert',
      // @mention 用户通过 username 参数实现
    };

    if (this.config.channel) {
      message.channel = this.config.channel;
    }

    if (this.config.iconEmoji) {
      message.icon_emoji = this.config.iconEmoji;
    } else if (this.config.iconUrl) {
      message.icon_url = this.config.iconUrl;
    }

    return message;
  }

  /**
   * 构建 Slack Block Kit 消息块
   */
  private buildBlocks(payload: NotificationPayload): SlackBlock[] {
    const blocks: SlackBlock[] = [];

    // 标题块
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: payload.title,
        emoji: true,
      },
    });

    // 颜色条（通过 divider 分隔前的 context 实现）
    const severityColors: Record<string, string> = {
      info: '#36a64f',
      warning: '#ff9800',
      error: '#f44336',
      critical: '#9c27b0',
    };
    const color = severityColors[payload.severity || 'info'];

    // 内容块
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.message,
      },
    });

    // 添加字段（如果有额外数据）
    if (payload.data && Object.keys(payload.data).length > 0) {
      const fields = Object.entries(payload.data).map(([key, value]) => ({
        type: 'mrkdwn' as const,
        text: `*${key}:*\n${JSON.stringify(value, null, 2)}`,
      }));

      blocks.push({
        type: 'section',
        fields: fields.slice(0, 10), // Slack 限制最多 10 个字段
      });
    }

    // Footer 和时间戳
    const timestamp = payload.timestamp || new Date();
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: { type: 'mrkdwn', text: `⏰ ${timestamp.toISOString()}` },
        },
        {
          type: 'mrkdwn',
          text: { type: 'mrkdwn', text: `🔔 Severity: ${payload.severity || 'info'}` },
        },
      ],
    });

    // 分隔块
    blocks.push({
      type: 'divider',
    });

    // Actions 块（可选的操作按钮）
    if (payload.data?.actions) {
      const actionElements = (payload.data.actions as Array<{text: string; url: string}>).map(action => ({
        type: 'button' as const,
        text: { type: 'plain_text' as const, text: action.text, emoji: true },
        url: action.url,
        action_id: `action_${Math.random().toString(36).substr(2, 9)}`,
      }));

      blocks.push({
        type: 'actions',
        elements: actionElements,
      });
    }

    return blocks;
  }

  /**
   * 获取当前配置
   */
  getConfig(): SlackChannelConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SlackChannelConfig>): void {
    this.config = { ...this.config, ...config };
  }
}