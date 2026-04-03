/**
 * Alert Channels Module
 * Exports all alert channel implementations
 */

// ========================================
// Channel Classes
// ========================================

export { EmailChannel } from './email'
export { SlackChannel } from './slack'
export { PagerDutyChannel } from './pagerduty'

// Enhanced Slack Channel (v1.9.0)
export {
  EnhancedSlackChannel,
  LevelRouter,
  Throttler,
  Retryer,
} from './slack-enhanced'

// ========================================
// Types
// ========================================

export type { EmailConfig, EmailAlertOptions } from './email'
export type { SlackConfig, SlackAlertOptions } from './slack'
export type { PagerDutyConfig, PagerDutyAlertOptions } from './pagerduty'

// Enhanced Slack Types
export type {
  LevelChannelMapping,
  ThrottleConfig,
  RetryConfig,
  SendResult,
  SlackConfig as EnhancedSlackConfig,
  SlackAlertOptions as EnhancedSlackAlertOptions,
} from './slack-enhanced'

// ========================================
// Channel Factory
// ========================================

import { EmailChannel } from './email'
import { SlackChannel } from './slack'
import { PagerDutyChannel } from './pagerduty'
import { EnhancedSlackChannel } from './slack-enhanced'
import type { AlertChannel } from '../alerter'
import type { EmailConfig } from './email'
import type { SlackConfig } from './slack'
import type { PagerDutyConfig } from './pagerduty'
import type { SlackConfig as EnhancedSlackConfigType, SlackAlertOptions as EnhancedSlackAlertOptionsType } from './slack-enhanced'

export type ChannelType = 'email' | 'slack' | 'pagerduty' | 'slack-enhanced'

export interface ChannelConfig {
  type: ChannelType
  config: EmailConfig | SlackConfig | PagerDutyConfig | EnhancedSlackConfigType
  options?: Record<string, unknown>
}

/**
 * Create an alert channel from config
 */
export function createChannel(config: ChannelConfig): AlertChannel {
  switch (config.type) {
    case 'email':
      return new EmailChannel(
        config.config as EmailConfig,
        config.options as import('./email').EmailAlertOptions | undefined
      )
    case 'slack':
      return new SlackChannel(
        config.config as SlackConfig,
        config.options as import('./slack').SlackAlertOptions | undefined
      )
    case 'pagerduty':
      return new PagerDutyChannel(
        config.config as PagerDutyConfig,
        config.options as import('./pagerduty').PagerDutyAlertOptions | undefined
      )
    case 'slack-enhanced':
      return new EnhancedSlackChannel(
        config.config as EnhancedSlackConfigType,
        config.options as EnhancedSlackAlertOptionsType | undefined
      ) as unknown as AlertChannel
    default:
      throw new Error(`Unknown channel type: ${(config as ChannelConfig).type}`)
  }
}

/**
 * Create multiple channels from configs
 */
export function createChannels(configs: ChannelConfig[]): AlertChannel[] {
  return configs.map(createChannel)
}
