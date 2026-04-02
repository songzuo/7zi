/**
 * Email Alert Service
 *
 * Sends alert notifications via email using nodemailer
 * with TLS/SSL support, error handling, and retry logic
 *
 * @module lib/alerting/EmailAlertService
 */

import * as nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import {
  EmailAlertConfig,
  EmailRecipient,
  validateEmailConfig,
} from "@/config/email";
import type {
  PerformanceAlert,
  AlertLevel,
  AlertChannel,
} from "@/lib/performance/alerting/alerter";
import { renderAlertEmail } from "./templates/alert-template";

// ========================================
// Types
// ========================================

/**
 * Email alert options
 */
export interface EmailAlertOptions {
  /** Override recipients */
  recipients?: EmailRecipient[];
  /** Custom subject */
  subject?: string;
  /** Additional reply-to address */
  replyTo?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Priority level (high, normal, low) */
  priority?: "high" | "normal" | "low";
}

/**
 * Email send result
 */
export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts made */
  attempts: number;
  /** Timestamp when sent */
  timestamp: number;
}

/**
 * Email service status
 */
export interface EmailServiceStatus {
  /** Whether the service is enabled */
  enabled: boolean;
  /** Whether the service is connected */
  connected: boolean;
  /** Last successful send timestamp */
  lastSendSuccess?: number;
  /** Last failed send timestamp */
  lastSendFailure?: number;
  /** Total emails sent */
  totalSent: number;
  /** Total emails failed */
  totalFailed: number;
  /** Last error message */
  lastError?: string;
}

// ========================================
// Email Alert Service Implementation
// ========================================

/**
 * Email Alert Service
 *
 * Implements the AlertChannel interface for sending alerts via email
 */
export class EmailAlertService implements AlertChannel {
  readonly name = "email";

  private config: EmailAlertConfig;
  private transporter: Transporter | null = null;
  private status: EmailServiceStatus = {
    enabled: true,
    connected: false,
    totalSent: 0,
    totalFailed: 0,
  };

  constructor(config: EmailAlertConfig) {
    // Validate configuration
    const errors = validateEmailConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid email configuration: ${errors.join(", ")}`);
    }

    this.config = config;
    this.status.enabled = config.enabled;
  }

  // ========================================
  // Connection Management
  // ========================================

  /**
   * Initialize the SMTP transporter
   */
  async connect(): Promise<void> {
    if (this.transporter) {
      return;
    }

    const { host, port, auth, tls } = this.config.smtp;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: tls?.secure ?? (port === 465),
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
      tls: {
        rejectUnauthorized: tls?.rejectUnauthorized ?? true,
      },
      // Connection pool settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10,
    });

    // Verify connection
    try {
      await this.transporter.verify();
      this.status.connected = true;
    } catch (error) {
      this.status.connected = false;
      this.status.lastError =
        error instanceof Error ? error.message : "Unknown connection error";
      throw error;
    }
  }

  /**
   * Disconnect the SMTP transporter
   */
  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.status.connected = false;
    }
  }

  /**
   * Test the connection
   */
  async test(): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.connect();
      }
      await this.transporter!.verify();
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // AlertChannel Interface Implementation
  // ========================================

  /**
   * Send an alert via email
   */
  async send(alert: PerformanceAlert): Promise<void> {
    if (!this.status.enabled) {
      console.log("[EmailAlertService] Email alerting is disabled, skipping");
      return;
    }

    const result = await this.sendAlertEmail(alert);

    if (!result.success) {
      throw new Error(result.error || "Failed to send alert email");
    }
  }

  // ========================================
  // Email Sending
  // ========================================

  /**
   * Send an alert email with retry logic
   */
  async sendAlertEmail(
    alert: PerformanceAlert,
    options: EmailAlertOptions = {},
  ): Promise<EmailSendResult> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.config.retry?.maxAttempts ?? 3;
    const baseDelay = this.config.retry?.delayMs ?? 1000;
    const backoff = this.config.retry?.backoffMultiplier ?? 2;

    // Ensure connected
    if (!this.transporter) {
      try {
        await this.connect();
      } catch (error) {
        return {
          success: false,
          error: `Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`,
          attempts: 0,
          timestamp: startTime,
        };
      }
    }

    // Get recipients
    const recipients = options.recipients ?? this.config.recipients;
    if (recipients.length === 0) {
      return {
        success: false,
        error: "No recipients specified",
        attempts: 0,
        timestamp: startTime,
      };
    }

    // Prepare email
    const { subject, html, text } = this.prepareAlertEmail(alert, options);
    const to = recipients
      .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
      .join(", ");

    // Retry loop
    while (attempts < maxAttempts) {
      attempts++;

      try {
        const mailOptions: SendMailOptions = {
          from: `${this.config.sender.name} <${this.config.sender.email}>`,
          to,
          subject,
          html,
          text,
          replyTo: options.replyTo,
          headers: options.headers,
          priority: options.priority ?? this.getPriorityForLevel(alert.level),
        };

        const info = await this.transporter!.sendMail(mailOptions);

        // Success
        this.status.totalSent++;
        this.status.lastSendSuccess = Date.now();

        return {
          success: true,
          messageId: info.messageId,
          attempts,
          timestamp: Date.now(),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.status.lastError = errorMessage;

        // Check if we should retry
        if (attempts < maxAttempts && this.shouldRetry(error)) {
          const delay = baseDelay * Math.pow(backoff, attempts - 1);
          console.warn(
            `[EmailAlertService] Attempt ${attempts}/${maxAttempts} failed, retrying in ${delay}ms: ${errorMessage}`,
          );
          await this.sleep(delay);
        } else {
          // Final failure
          this.status.totalFailed++;
          this.status.lastSendFailure = Date.now();

          return {
            success: false,
            error: errorMessage,
            attempts,
            timestamp: Date.now(),
          };
        }
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: "Max retry attempts exceeded",
      attempts,
      timestamp: Date.now(),
    };
  }

  /**
   * Prepare alert email content
   */
  private prepareAlertEmail(
    alert: PerformanceAlert,
    options: EmailAlertOptions,
  ): { subject: string; html: string; text: string } {
    const prefix = this.config.subjectPrefix || "";
    const levelEmoji = this.getLevelEmoji(alert.level);
    const subject =
      options.subject ||
      `${prefix} ${levelEmoji} ${alert.level.toUpperCase()}: ${alert.title}`;

    const { html, text } = renderAlertEmail(alert);

    return { subject, html, text };
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true;
    }

    const message = error.message.toLowerCase();

    // Network/timeout errors - retry
    if (
      message.includes("etimedout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("timeout")
    ) {
      return true;
    }

    // Rate limiting - retry
    if (
      message.includes("rate") ||
      message.includes("limit") ||
      message.includes("throttl")
    ) {
      return true;
    }

    // Authentication/authorization errors - don't retry
    if (
      message.includes("auth") ||
      message.includes("credential") ||
      message.includes("invalid user") ||
      message.includes("access denied")
    ) {
      return false;
    }

    // Default: retry
    return true;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========================================
  // Helpers
  // ========================================

  /**
   * Get emoji for alert level
   */
  private getLevelEmoji(level: AlertLevel): string {
    const emojis: Record<AlertLevel, string> = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      critical: "🚨",
    };
    return emojis[level] || "📌";
  }

  /**
   * Get email priority for alert level
   */
  private getPriorityForLevel(level: AlertLevel): "high" | "normal" | "low" {
    const priorities: Record<AlertLevel, "high" | "normal" | "low"> = {
      info: "normal",
      warning: "normal",
      error: "high",
      critical: "high",
    };
    return priorities[level] || "normal";
  }

  // ========================================
  // Status & Configuration
  // ========================================

  /**
   * Get current status
   */
  getStatus(): EmailServiceStatus {
    return { ...this.status };
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled: boolean): void {
    this.status.enabled = enabled;
    this.config.enabled = enabled;
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.status.enabled;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<EmailAlertConfig>): Promise<void> {
    const newConfig = { ...this.config, ...config };

    const errors = validateEmailConfig(newConfig);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(", ")}`);
    }

    // Reconnect if SMTP config changed
    const smtpChanged =
      config.smtp &&
      (config.smtp.host !== this.config.smtp.host ||
        config.smtp.port !== this.config.smtp.port ||
        config.smtp.auth?.user !== this.config.smtp.auth.user);

    this.config = newConfig;
    this.status.enabled = newConfig.enabled;

    if (smtpChanged) {
      await this.disconnect();
      await this.connect();
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<EmailAlertConfig, "smtp"> & {
    smtp: Omit<EmailAlertConfig["smtp"], "auth">;
  } {
    const { auth, ...smtp } = this.config.smtp;
    return {
      ...this.config,
      smtp,
    };
  }
}

// ========================================
// Factory Function
// ========================================

/**
 * Create an Email Alert Service from environment variables
 */
export function createEmailAlertService(): EmailAlertService {
  const { parseEmailConfig } = require("@/config/email");
  const config = parseEmailConfig();
  return new EmailAlertService(config);
}

// ========================================
// Export
// ========================================

export default EmailAlertService;
