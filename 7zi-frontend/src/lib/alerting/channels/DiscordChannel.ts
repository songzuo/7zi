/**
 * Discord 通知渠道实现
 * 使用 Discord Webhook API 发送消息
 */

import {
  NotificationChannel,
  NotificationPayload,
  SendResult,
  DiscordChannelConfig,
  ChannelConfig,
} from './NotificationChannel';

/**
 * Discord Embed 结构
 */
export interface DiscordEmbed {
  /** 嵌入标题 */
  title?: string;
  /** 嵌入描述 */
  description?: string;
  /** 嵌入颜色（十进制） */
  color?: number;
  /** 嵌入字段 */
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  /** 嵌入页脚 */
  footer?: {
    text: string;
    icon_url?: string;
  };
  /** 嵌入时间戳 */
  timestamp?: string;
  /** 嵌入缩略图 */
  thumbnail?: {
    url: string;
  };
  /** 嵌入图片 */
  image?: {
    url: string;
  };
  /** 嵌入作者 */
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
}

/**
 * Discord Webhook 消息
 */
export interface DiscordWebhookMessage {
  /** 覆盖用户名 */
  username?: string;
  /** 覆盖头像 */
  avatar_url?: string;
  /** 消息内容 */
  content?: string;
  /** 嵌入 */
  embeds?: DiscordEmbed[];
  /** 是否等待消息确认 */
  wait?: boolean;
}

/**
 * Discord 渠道
 */
export class DiscordChannel implements NotificationChannel {
  readonly type = 'discord' as const;
  private config: DiscordChannelConfig;

  constructor(config: DiscordChannelConfig) {
    this.config = config;
  }

  /**
   * 验证配置
   */
  validateConfig(config: ChannelConfig): boolean {
    if (config.type !== 'discord') return false;
    const discordConfig = config as DiscordChannelConfig;
    
    // 验证 webhook URL 格式
    if (!discordConfig.webhookUrl) {
      return false;
    }
    
    try {
      const url = new URL(discordConfig.webhookUrl);
      if (!url.href.startsWith('https://discord.com/api/webhooks/') &&
          !url.href.startsWith('https://ptb.discord.com/api/webhooks/') &&
          !url.href.startsWith('https://canary.discord.com/api/webhooks/')) {
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
          error: `Discord API error: ${response.status} - ${errorText}`,
          channelType: this.type,
        };
      }

      return {
        success: true,
        data: { message: 'Discord notification sent successfully' },
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
   * 构建 Discord 消息
   */
  private buildMessage(payload: NotificationPayload): DiscordWebhookMessage {
    const embed = this.buildEmbed(payload);
    
    const message: DiscordWebhookMessage = {
      embeds: [embed],
      username: this.config.username || '7zi Alert',
      avatar_url: this.config.avatarUrl,
    };

    // @mentions 可以在 content 中使用
    // 例如：<@USER_ID> 或 <@&ROLE_ID>
    // 也可以通过 payload.data.mentions 数组
    if (payload.data?.mentions) {
      const mentions = (payload.data.mentions as string[]).join(' ');
      message.content = mentions;
    }

    return message;
  }

  /**
   * 构建 Discord Embed
   */
  private buildEmbed(payload: NotificationPayload): DiscordEmbed {
    const embed: DiscordEmbed = {
      title: payload.title,
      description: payload.message,
      color: this.getSeverityColor(payload.severity),
      timestamp: (payload.timestamp || new Date()).toISOString(),
      footer: {
        text: '7zi Alert System',
      },
    };

    // 添加字段
    if (payload.data && Object.keys(payload.data).length > 0) {
      const fields = Object.entries(payload.data)
        .filter(([key]) => key !== 'mentions' && key !== 'actions') // 排除特殊字段
        .map(([key, value]) => ({
          name: key,
          value: JSON.stringify(value, null, 2).substring(0, 1024), // Discord 限制 1024 字符
          inline: true,
        }));

      if (fields.length > 0) {
        embed.fields = fields.slice(0, 25); // Discord 限制最多 25 个字段
      }
    }

    // 缩略图
    if (payload.data?.thumbnailUrl) {
      embed.thumbnail = {
        url: payload.data.thumbnailUrl as string,
      };
    }

    // 图片
    if (payload.data?.imageUrl) {
      embed.image = {
        url: payload.data.imageUrl as string,
      };
    }

    return embed;
  }

  /**
   * 根据严重级别获取颜色
   */
  private getSeverityColor(severity?: string): number {
    const colors: Record<string, number> = {
      info: 0x3498db,      // 蓝色
      warning: 0xf39c12,   // 橙色
      error: 0xe74c3c,     // 红色
      critical: 0x9b59b6,  // 紫色
    };

    return colors[severity || 'info'] || 0x3498db;
  }

  /**
   * 获取当前配置
   */
  getConfig(): DiscordChannelConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DiscordChannelConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Discord mention 工具函数
 */
export class DiscordMention {
  /**
   * 用户 mention: <@USER_ID>
   */
  static user(userId: string): string {
    return `<@${userId}>`;
  }

  /**
   * 角色 mention: <@&ROLE_ID>
   */
  static role(roleId: string): string {
    return `<@&${roleId}>`;
  }

  /**
   * 频道 mention: <#CHANNEL_ID>
   */
  static channel(channelId: string): string {
    return `<#${channelId}>`;
  }

  /**
   * 通用 mention（自动判断类型）
   */
  static mention(id: string, type: 'user' | 'role' | 'channel'): string {
    switch (type) {
      case 'user':
        return this.user(id);
      case 'role':
        return this.role(id);
      case 'channel':
        return this.channel(id);
      default:
        return this.user(id);
    }
  }
}