/**
 * Alert Channels Module
 * Exports all alert channel implementations
 */

// ========================================
// Channel Classes
// ========================================

export { EmailChannel } from './email';
export { SlackChannel } from './slack';
export { PagerDutyChannel } from './pagerduty';

// ========================================
// Types
// ========================================

export type { EmailConfig, EmailAlertOptions } from './email';
export type { SlackConfig, SlackAlertOptions } from './slack';
export type { PagerDutyConfig, PagerDutyAlertOptions } from './pagerduty';

// ========================================
// Channel Factory
// ========================================

import { EmailChannel } from './email';
import { SlackChannel } from './slack';
import { PagerDutyChannel } from './pagerduty';
import type { AlertChannel } from '../alerter';
import type { EmailConfig } from './email';
import type { SlackConfig } from './slack';
import type { PagerDutyConfig } from './pagerduty';

export type ChannelType = 'email' | 'slack' | 'pagerduty';

export interface ChannelConfig {
  type: ChannelType;
  config: EmailConfig | SlackConfig | PagerDutyConfig;
  options?: Record<string, unknown>;
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
      );
    case 'slack':
      return new SlackChannel(
        config.config as SlackConfig,
        config.options as import('./slack').SlackAlertOptions | undefined
      );
    case 'pagerduty':
      return new PagerDutyChannel(
        config.config as PagerDutyConfig,
        config.options as import('./pagerduty').PagerDutyAlertOptions | undefined
      );
    default:
      throw new Error(`Unknown channel type: ${(config as ChannelConfig).type}`);
  }
}

/**
 * Create multiple channels from configs
 */
export function createChannels(configs: ChannelConfig[]): AlertChannel[] {
  return configs.map(createChannel);
}
