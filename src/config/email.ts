/**
 * Email Configuration
 *
 * SMTP configuration interface and environment variable parsing
 * for the Email Alerting System
 *
 * @module config/email
 */

// ========================================
// SMTP Configuration Types
// ========================================

/**
 * SMTP Authentication credentials
 */
export interface SMTPAuth {
  /** SMTP username */
  user: string
  /** SMTP password or API key */
  pass: string
}

/**
 * SMTP TLS/SSL options
 */
export interface SMTPTLSOptions {
  /** Whether to use TLS (default: true for port 587, false for port 25) */
  secure?: boolean
  /** Require STARTTLS */
  requireTLS?: boolean
  /** CA certificate */
  ca?: string
  /** Client certificate */
  cert?: string
  /** Client key */
  key?: string
  /** Skip certificate verification (not recommended for production) */
  rejectUnauthorized?: boolean
}

/**
 * SMTP Connection options
 */
export interface SMTPConnection {
  /** SMTP host */
  host: string
  /** SMTP port (default: 587 for TLS, 25 for plain) */
  port: number
  /** Authentication */
  auth: SMTPAuth
  /** TLS/SSL options */
  tls?: SMTPTLSOptions
}

/**
 * Email sender configuration
 */
export interface EmailSender {
  /** Sender name */
  name: string
  /** Sender email address */
  email: string
}

/**
 * Email recipient configuration
 */
export interface EmailRecipient {
  /** Recipient name (optional) */
  name?: string
  /** Recipient email address */
  email: string
}

/**
 * Complete Email Alerting Configuration
 */
export interface EmailAlertConfig {
  /** SMTP connection settings */
  smtp: SMTPConnection
  /** Default sender */
  sender: EmailSender
  /** Default recipients */
  recipients: EmailRecipient[]
  /** Email subject prefix */
  subjectPrefix?: string
  /** Enable/disable email alerting */
  enabled: boolean
  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number
    /** Retry delay in milliseconds */
    delayMs: number
    /** Backoff multiplier */
    backoffMultiplier: number
  }
}

// ========================================
// Environment Variable Parsing
// ========================================

/**
 * Parse email configuration from environment variables
 */
export function parseEmailConfig(): EmailAlertConfig {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    SMTP_REJECT_UNAUTHORIZED,
    EMAIL_SENDER_NAME,
    EMAIL_SENDER_EMAIL,
    EMAIL_RECIPIENTS,
    EMAIL_SUBJECT_PREFIX,
    EMAIL_ALERTING_ENABLED,
    EMAIL_RETRY_MAX_ATTEMPTS,
    EMAIL_RETRY_DELAY_MS,
    EMAIL_RETRY_BACKOFF_MULTIPLIER,
  } = process.env

  // Validate required SMTP settings
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Missing required SMTP configuration: SMTP_HOST, SMTP_USER, and SMTP_PASS must be defined'
    )
  }

  // Parse SMTP port
  const port = SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587
  if (isNaN(port)) {
    throw new Error(`Invalid SMTP port: ${SMTP_PORT}`)
  }

  // Parse recipients
  const recipients: EmailRecipient[] = []
  if (EMAIL_RECIPIENTS) {
    const emails = EMAIL_RECIPIENTS.split(',').map(e => e.trim())
    for (const email of emails) {
      if (email) {
        // Support "Name <email>" format
        const match = email.match(/^(.+?)\s*<(.+)>$/)
        if (match) {
          recipients.push({
            name: match[1].trim(),
            email: match[2].trim(),
          })
        } else {
          recipients.push({ email })
        }
      }
    }
  }

  // Default to sender if no recipients specified
  const defaultRecipients =
    recipients.length > 0
      ? recipients
      : [
          {
            email: EMAIL_SENDER_EMAIL || 'noreply@example.com',
            name: EMAIL_SENDER_NAME || 'System',
          },
        ]

  return {
    smtp: {
      host: SMTP_HOST,
      port,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        secure: SMTP_SECURE === 'true' || port === 465,
        rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED !== 'false',
      },
    },
    sender: {
      name: EMAIL_SENDER_NAME || '7zi System',
      email: EMAIL_SENDER_EMAIL || 'noreply@example.com',
    },
    recipients: defaultRecipients,
    subjectPrefix: EMAIL_SUBJECT_PREFIX || '[7zi Alert]',
    enabled: EMAIL_ALERTING_ENABLED !== 'false',
    retry: {
      maxAttempts: EMAIL_RETRY_MAX_ATTEMPTS ? parseInt(EMAIL_RETRY_MAX_ATTEMPTS, 10) : 3,
      delayMs: EMAIL_RETRY_DELAY_MS ? parseInt(EMAIL_RETRY_DELAY_MS, 10) : 1000,
      backoffMultiplier: EMAIL_RETRY_BACKOFF_MULTIPLIER
        ? parseFloat(EMAIL_RETRY_BACKOFF_MULTIPLIER)
        : 2,
    },
  }
}

// ========================================
// Default Configuration
// ========================================

/**
 * Get default email configuration (for development/testing)
 */
export function getDefaultEmailConfig(): EmailAlertConfig {
  return {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        secure: false,
        rejectUnauthorized: true,
      },
    },
    sender: {
      name: process.env.EMAIL_SENDER_NAME || '7zi System',
      email: process.env.EMAIL_SENDER_EMAIL || 'noreply@example.com',
    },
    recipients: [],
    subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || '[7zi Alert]',
    enabled: false,
    retry: {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },
  }
}

// ========================================
// Configuration Validation
// ========================================

/**
 * Validate email configuration
 */
export function validateEmailConfig(config: EmailAlertConfig): string[] {
  const errors: string[] = []

  // Validate SMTP host
  if (!config.smtp.host) {
    errors.push('SMTP host is required')
  }

  // Validate SMTP port
  if (!config.smtp.port || config.smtp.port < 1 || config.smtp.port > 65535) {
    errors.push('Valid SMTP port (1-65535) is required')
  }

  // Validate SMTP auth
  if (!config.smtp.auth?.user || !config.smtp.auth?.pass) {
    errors.push('SMTP authentication (user and pass) is required')
  }

  // Validate sender
  if (!config.sender?.email) {
    errors.push('Sender email is required')
  } else if (!isValidEmail(config.sender.email)) {
    errors.push('Invalid sender email format')
  }

  // Validate recipients
  if (config.recipients.length === 0) {
    errors.push('At least one recipient is required')
  }
  for (const recipient of config.recipients) {
    if (!isValidEmail(recipient.email)) {
      errors.push(`Invalid recipient email: ${recipient.email}`)
    }
  }

  // Validate retry configuration
  if (config.retry) {
    if (config.retry.maxAttempts < 0) {
      errors.push('Retry maxAttempts must be non-negative')
    }
    if (config.retry.delayMs < 0) {
      errors.push('Retry delayMs must be non-negative')
    }
    if (config.retry.backoffMultiplier < 1) {
      errors.push('Retry backoffMultiplier must be >= 1')
    }
  }

  return errors
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ========================================
// Export
// ========================================

export default {
  parseEmailConfig,
  getDefaultEmailConfig,
  validateEmailConfig,
}
