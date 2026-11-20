/**
 * Alerting Module - Email Integration
 *
 * Provides email alerting capabilities for the performance monitoring system
 *
 * @module lib/alerting
 */

// ========================================
// Re-export from submodules
// ========================================

export { EmailAlertService, createEmailAlertService } from './EmailAlertService'
export type { EmailAlertOptions, EmailSendResult, EmailServiceStatus } from './EmailAlertService'

export { SlackAlertService, createSlackAlertService, parseSlackConfig } from './SlackAlertService'
export type { SlackAlertConfig, SlackSendResult, SlackServiceStatus } from './SlackAlertService'

export { renderAlertEmail } from './templates/alert-template'
export type { AlertEmailContent } from './templates/alert-template'

export { parseEmailConfig, getDefaultEmailConfig, validateEmailConfig } from '@/config/email'
export type {
  EmailAlertConfig,
  SMTPConnection,
  SMTPAuth,
  SMTPTLSOptions,
  EmailSender,
  EmailRecipient,
} from '@/config/email'

// ========================================
// Import for default export
// ========================================
import {
  EmailAlertService as EmailAlertServiceImpl,
  createEmailAlertService,
} from './EmailAlertService'
import {
  SlackAlertService as SlackAlertServiceImpl,
  createSlackAlertService,
} from './SlackAlertService'
import { renderAlertEmail } from './templates/alert-template'

// ========================================
// Integration Helpers
// ========================================

import { performanceAlerter } from '@/lib/performance/alerting/alerter'
import type { EmailAlertConfig } from '@/config/email'
import type { SlackAlertConfig } from './SlackAlertService'

/**
 * Setup email alerting with the performance alerter
 */
export function setupEmailAlerting(config: EmailAlertConfig): EmailAlertServiceImpl {
  const emailService = new EmailAlertServiceImpl(config)
  performanceAlerter.registerChannel(emailService)
  return emailService
}

/**
 * Setup email alerting from environment variables
 */
export function setupEmailAlertingFromEnv(): EmailAlertServiceImpl | null {
  try {
    // Dynamic import to avoid circular dependencies
    const { parseEmailConfig } = require('@/config/email')
    const config = parseEmailConfig()

    if (!config.enabled) {
      console.log('[Alerting] Email alerting is disabled')
      return null
    }

    return setupEmailAlerting(config)
  } catch (error) {
    console.error(
      '[Alerting] Failed to setup email alerting:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return null
  }
}

/**
 * Setup Slack alerting with the performance alerter
 */
export function setupSlackAlerting(config: SlackAlertConfig): SlackAlertServiceImpl | null {
  if (!config.webhookUrl || !config.enabled) {
    console.log('[Alerting] Slack alerting is not configured or disabled')
    return null
  }

  const slackService = new SlackAlertServiceImpl(config)
  performanceAlerter.registerChannel(slackService)
  return slackService
}

/**
 * Setup Slack alerting from environment variables
 */
export function setupSlackAlertingFromEnv(): SlackAlertServiceImpl | null {
  try {
    return createSlackAlertService()
  } catch (error) {
    console.error(
      '[Alerting] Failed to setup Slack alerting:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return null
  }
}

/**
 * Setup all alerting channels from environment variables
 */
export function setupAllAlertingFromEnv(): {
  email: EmailAlertServiceImpl | null
  slack: SlackAlertServiceImpl | null
} {
  return {
    email: setupEmailAlertingFromEnv(),
    slack: setupSlackAlertingFromEnv(),
  }
}

// ========================================
// Default Export
// ========================================

export default {
  EmailAlertService: EmailAlertServiceImpl,
  createEmailAlertService,
  renderAlertEmail,
  setupEmailAlerting,
  setupEmailAlertingFromEnv,
  SlackAlertService: SlackAlertServiceImpl,
  createSlackAlertService,
  setupSlackAlerting,
  setupSlackAlertingFromEnv,
  setupAllAlertingFromEnv,
}
