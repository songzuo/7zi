/**
 * Alerting 通知系统模块
 * 支持多渠道通知：Email, Slack, Discord, Webhook
 */

// 渠道相关
export * from './channels';

// 多渠道服务
export {
  MultiChannelAlertService,
  getAlertService,
  createAlertService,
} from './MultiChannelAlertService';

export type {
  ChannelRegistryItem,
  MultiChannelAlertResult,
} from './MultiChannelAlertService';

// 导出所有类型，方便使用
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
} from './channels/NotificationChannel';