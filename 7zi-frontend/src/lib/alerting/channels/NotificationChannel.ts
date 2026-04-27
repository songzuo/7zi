/**
 * NotificationChannel 接口定义
 * 所有通知渠道必须实现此接口
 */

export type ChannelType = 'email' | 'slack' | 'discord' | 'webhook';

/**
 * 通知负载
 */
export interface NotificationPayload {
  /** 标题 */
  title: string;
  /** 内容 */
  message: string;
  /** 严重级别 */
  severity?: 'info' | 'warning' | 'error' | 'critical';
  /** 额外数据 */
  data?: Record<string, any>;
  /** 时间戳 */
  timestamp?: Date;
}

/**
 * 发送结果
 */
export interface SendResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
  /** 响应数据（成功时） */
  data?: unknown;
  /** 渠道类型 */
  channelType: ChannelType;
}

/**
 * 渠道配置
 */
export type ChannelConfig =
  | EmailChannelConfig
  | SlackChannelConfig
  | DiscordChannelConfig
  | WebhookChannelConfig;

/**
 * Email 渠道配置
 */
export interface EmailChannelConfig {
  type: 'email';
  to: string | string[];
  subject?: string;
  from?: string;
}

/**
 * Slack 渠道配置
 */
export interface SlackChannelConfig {
  type: 'slack';
  /** Incoming Webhook URL */
  webhookUrl: string;
  /** 目标频道（可选） */
  channel?: string;
  /** 发送者用户名 */
  username?: string;
  /** 图标 URL */
  iconUrl?: string;
  /** 图标 emoji */
  iconEmoji?: string;
}

/**
 * Discord 渠道配置
 */
export interface DiscordChannelConfig {
  type: 'discord';
  /** Webhook URL */
  webhookUrl: string;
  /** 发送者用户名 */
  username?: string;
  /** 头像 URL */
  avatarUrl?: string;
}

/**
 * Webhook 渠道配置
 */
export interface WebhookChannelConfig {
  type: 'webhook';
  /** Webhook URL */
  url: string;
  /** HTTP 方法 */
  method?: 'POST' | 'PUT' | 'PATCH';
  /** 自定义 Headers */
  headers?: Record<string, string>;
  /** 消息模板（JSON 字符串，支持占位符） */
  bodyTemplate?: string;
  /** 重试次数 */
  retries?: number;
}

/**
 * 通知渠道接口
 */
export interface NotificationChannel {
  /** 渠道类型 */
  readonly type: ChannelType;

  /**
   * 发送通知
   * @param payload 通知负载
   * @returns 发送结果
   */
  send(payload: NotificationPayload): Promise<SendResult>;

  /**
   * 验证配置
   * @param config 渠道配置
   * @returns 是否有效
   */
  validateConfig(config: ChannelConfig): boolean;
}