/**
 * Alerting System - Main Entry Point
 * 多渠道告警配置系统
 */

// ========================================
// Channels
// ========================================

export {
  AlertChannelManager,
  AlertChannelSender,
  getChannelManager,
  getChannelSender,
  createChannelManager,
  type AlertChannelType,
  type AlertChannelConfig,
  type EmailChannelConfig,
  type SlackChannelConfig,
  type TelegramChannelConfig,
  type WebhookChannelConfig,
  type ChannelRoutingRule,
  type ChannelMatcher,
  type SendResult,
} from './channels/channels'

// ========================================
// Rules
// ========================================

export {
  AlertRuleEngine,
  DEFAULT_THRESHOLD_RULES,
  DEFAULT_TREND_RULES,
  DEFAULT_PERIODIC_RULES,
  createThresholdRule,
  createTrendRule,
  createPeriodicRule,
  type AlertRule,
  type ThresholdRule,
  type TrendRule,
  type PeriodicRule,
  type MetricValue,
  type RuleEvaluationResult,
} from './rules'

// ========================================
// Deduplication & Aggregation
// ========================================

export {
  AlertDeduplicator,
  AlertAggregator,
  AlertDeduplicationManager,
  type AlertContext,
  type DeduplicationEntry,
  type AggregatedAlert,
  type DeduplicatorConfig,
  type AggregatorConfig,
} from './deduplication'

// ========================================
// Re-export from existing alerts.ts
// ========================================

export type { AlertSeverity, AlertChannel } from '../alerts'
export type { AlertConfig } from '../alerts'
export { AlertSystem } from '../alerts'
export { sendSlackAlert, sendEmailAlert, sendAlert } from '../alerts'
export { alerts as alertHelpers } from '../alerts'

// ========================================
// Slack Alert Channel
// ========================================

export {
  SlackAlertChannel,
  getSlackChannel,
  sendSlackAlertMessage,
  slackAlerts,
  type SlackAlertPayload,
  type SlackMention,
  type SlackBlock,
  type SlackAttachment,
  type SlackMessage,
} from './channels/slack'
