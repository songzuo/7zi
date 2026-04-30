/**
 * 通知渠道模块导出
 * 提供渠道工厂函数和类型导出
 */

import {
  NotificationChannel,
  ChannelType,
  ChannelConfig,
  NotificationPayload,
  SendResult,
  EmailChannelConfig,
  SlackChannelConfig,
  DiscordChannelConfig,
  WebhookChannelConfig,
} from './NotificationChannel';

import { SlackChannel } from './SlackChannel';
import { DiscordChannel } from './DiscordChannel';
import { WebhookChannel } from './WebhookChannel';

/**
 * 已知通道类型的工厂函数映射
 */
type ChannelFactory = {
  [K in ChannelType]: (config: ChannelConfig) => NotificationChannel | null;
};

/**
 * 渠道工厂函数
 * 根据类型和配置创建对应的渠道实例
 */
export function createChannel(type: ChannelType, config: ChannelConfig): NotificationChannel | null {
  // 验证配置类型匹配
  if (config.type !== type) {
    console.error(`Config type mismatch: expected ${type}, got ${config.type}`);
    return null;
  }

  const factories: ChannelFactory = {
    email: () => {
      // Email 渠道可以后续添加 SMTP 实现
      console.warn('Email channel not yet implemented');
      return null;
    },
    slack: () => {
      const channel = new SlackChannel(config as SlackChannelConfig);
      if (!channel.validateConfig(config)) {
        console.error('Invalid Slack configuration');
        return null;
      }
      return channel;
    },
    discord: () => {
      const channel = new DiscordChannel(config as DiscordChannelConfig);
      if (!channel.validateConfig(config)) {
        console.error('Invalid Discord configuration');
        return null;
      }
      return channel;
    },
    webhook: () => {
      const channel = new WebhookChannel(config as WebhookChannelConfig);
      if (!channel.validateConfig(config)) {
        console.error('Invalid Webhook configuration');
        return null;
      }
      return channel;
    },
  };

  const factory = factories[type];
  return factory ? factory(config) : null;
}

/**
 * 创建 Slack 渠道
 */
export function createSlackChannel(config: SlackChannelConfig): SlackChannel | null {
  const channel = new SlackChannel(config);
  if (!channel.validateConfig(config)) {
    return null;
  }
  return channel;
}

/**
 * 创建 Discord 渠道
 */
export function createDiscordChannel(config: DiscordChannelConfig): DiscordChannel | null {
  const channel = new DiscordChannel(config);
  if (!channel.validateConfig(config)) {
    return null;
  }
  return channel;
}

/**
 * 创建 Webhook 渠道
 */
export function createWebhookChannel(config: WebhookChannelConfig): WebhookChannel | null {
  const channel = new WebhookChannel(config);
  if (!channel.validateConfig(config)) {
    return null;
  }
  return channel;
}

// 重新导出类型和类
export type {
  NotificationChannel,
  ChannelType,
  ChannelConfig,
  NotificationPayload,
  SendResult,
  EmailChannelConfig,
  SlackChannelConfig,
  DiscordChannelConfig,
  WebhookChannelConfig,
};

export {
  SlackChannel,
  DiscordChannel,
  WebhookChannel,
};

// 导出 Discord Mention 工具
export { DiscordMention } from './DiscordChannel';
