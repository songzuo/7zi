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

export {
  EmailAlertService,
  createEmailAlertService,
  type EmailAlertOptions,
  type EmailSendResult,
  type EmailServiceStatus,
} from "./EmailAlertService";

export {
  renderAlertEmail,
  type AlertEmailContent,
} from "./templates/alert-template";

export {
  parseEmailConfig,
  getDefaultEmailConfig,
  validateEmailConfig,
  type EmailAlertConfig,
  type SMTPConnection,
  type SMTPAuth,
  type SMTPTLSOptions,
  type EmailSender,
  type EmailRecipient,
} from "@/config/email";

// ========================================
// Integration Helpers
// ========================================

import { performanceAlerter } from "@/lib/performance/alerting/alerter";
import type { EmailAlertConfig } from "@/config/email";
import { EmailAlertService } from "./EmailAlertService";

/**
 * Setup email alerting with the performance alerter
 */
export function setupEmailAlerting(config: EmailAlertConfig): EmailAlertService {
  const emailService = new EmailAlertService(config);
  performanceAlerter.registerChannel(emailService);
  return emailService;
}

/**
 * Setup email alerting from environment variables
 */
export function setupEmailAlertingFromEnv(): EmailAlertService | null {
  try {
    // Dynamic import to avoid circular dependencies
    const { parseEmailConfig } = require("@/config/email");
    const config = parseEmailConfig();

    if (!config.enabled) {
      console.log("[Alerting] Email alerting is disabled");
      return null;
    }

    return setupEmailAlerting(config);
  } catch (error) {
    console.error(
      "[Alerting] Failed to setup email alerting:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

// ========================================
// Default Export
// ========================================

export default {
  EmailAlertService,
  createEmailAlertService,
  renderAlertEmail,
  setupEmailAlerting,
  setupEmailAlertingFromEnv,
};
