/**
 * Alert Channels - Index
 * 告警通道模块导出
 *
 * NOTE: Email and Slack channels are server-only (nodemailer, fetch).
 * They are exported from ./channels/server/ to prevent client bundle bloat.
 */

// Base channel with common functionality
export {
  BaseAlertChannel,
  DEFAULT_DEDUP_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  getLevelPriority,
  priorityToLevel,
  severityToLevel,
} from './base-alert-channel'

export type {
  AlertLevel,
  BaseChannelConfig,
  ChannelMetrics,
  DedupConfig,
  RateLimitConfig,
  RetryConfig,
  SendResult,
} from './base-alert-channel'

// NOTE: Server-only exports (uncomment if needed in server context)
// export { createEmailChannelFromEnv, EmailAlertChannel } from './email-alert'
// export type { EmailChannelConfig } from './email-alert'
// export { createSlackChannelFromEnv, SlackAlertChannel } from './slack-alert'
// export type { SlackChannelConfig } from './slack-alert'

// Export SMS and Webhook channels
export { createSMSChannelFromEnv, SMSAlertChannel } from './sms-alert'
export type { SMSChannelConfig } from './sms-alert'

export { createWebhookChannelFromEnv, WebhookAlertChannel } from './webhook-alert'
export type { WebhookChannelConfig } from './webhook-alert'
