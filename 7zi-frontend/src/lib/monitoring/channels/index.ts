/**
 * Alert Channels - Index
 * 告警通道模块导出
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

// Email channel
export { createEmailChannelFromEnv, EmailAlertChannel } from './email-alert'
export type { EmailChannelConfig } from './email-alert'

// Slack channel
export { createSlackChannelFromEnv, SlackAlertChannel } from './slack-alert'
export type { SlackChannelConfig } from './slack-alert'
