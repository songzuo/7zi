/**
 * Log Sanitization Module
 *
 * Provides utilities for sanitizing sensitive data in logs
 * Prevents accidental exposure of PII, credentials, and secrets
 */

// ============================================================================
// Types
// ============================================================================

export interface SanitizationConfig {
  maskChar?: string
  maskLength?: number
  preservePrefixLength?: number
  preserveSuffixLength?: number
  redactedText?: string
}

export interface SensitiveField {
  pattern: RegExp
  type: 'email' | 'phone' | 'ssn' | 'credit-card' | 'api-key' | 'password' | 'token' | 'custom'
  maskType?: 'full' | 'partial' | 'hash'
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<SanitizationConfig> = {
  maskChar: '*',
  maskLength: 8,
  preservePrefixLength: 2,
  preserveSuffixLength: 2,
  redactedText: '[REDACTED]',
}

/**
 * Default sensitive field patterns
 */
const SENSITIVE_PATTERNS: SensitiveField[] = [
  // Credentials
  {
    pattern: /password/i,
    type: 'password',
    maskType: 'full',
  },
  {
    pattern: /secret/i,
    type: 'api-key',
    maskType: 'full',
  },
  {
    pattern: /api[_-]?key/i,
    type: 'api-key',
    maskType: 'partial',
  },
  {
    pattern: /token/i,
    type: 'token',
    maskType: 'partial',
  },
  {
    pattern: /authorization/i,
    type: 'token',
    maskType: 'partial',
  },
  {
    pattern: /bearer/i,
    type: 'token',
    maskType: 'partial',
  },
  {
    pattern: /private[_-]?key/i,
    type: 'api-key',
    maskType: 'full',
  },
  {
    pattern: /access[_-]?key/i,
    type: 'api-key',
    maskType: 'full',
  },
  {
    pattern: /refresh[_-]?token/i,
    type: 'token',
    maskType: 'full',
  },
  {
    pattern: /session[_-]?id/i,
    type: 'token',
    maskType: 'partial',
  },

  // PII
  {
    pattern: /email/i,
    type: 'email',
    maskType: 'partial',
  },
  {
    pattern: /phone/i,
    type: 'phone',
    maskType: 'partial',
  },
  {
    pattern: /ssn/i,
    type: 'ssn',
    maskType: 'full',
  },
  {
    pattern: /credit[_-]?card/i,
    type: 'credit-card',
    maskType: 'partial',
  },

  // Common secrets
  {
    pattern: /database[_-]?url/i,
    type: 'password',
    maskType: 'full',
  },
  {
    pattern: /connection[_-]?string/i,
    type: 'password',
    maskType: 'full',
  },
]

/**
 * Regex patterns for detecting sensitive values
 */
const VALUE_PATTERNS = [
  // Email
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    type: 'email' as const,
  },
  // Credit card (basic pattern)
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    type: 'credit-card' as const,
  },
  // SSN (US)
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    type: 'ssn' as const,
  },
  // Phone (US)
  {
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    type: 'phone' as const,
  },
  // JWT tokens
  {
    pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b/g,
    type: 'token' as const,
  },
  // UUID (could be session IDs, etc.)
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    type: 'token' as const,
  },
]

// ============================================================================
// Masking Functions
// ============================================================================

/**
 * Mask a string value
 *
 * @param value - Value to mask
 * @param config - Masking configuration
 * @returns Masked value
 */
export function maskValue(value: string, config: SanitizationConfig = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  if (!value || value.length === 0) {
    return value
  }

  // Full mask
  if (value.length <= finalConfig.preservePrefixLength + finalConfig.preserveSuffixLength) {
    return finalConfig.maskChar.repeat(finalConfig.maskLength)
  }

  // Partial mask
  const prefix = value.substring(0, finalConfig.preservePrefixLength)
  const suffix = value.substring(value.length - finalConfig.preserveSuffixLength)

  return `${prefix}${finalConfig.maskChar.repeat(finalConfig.maskLength)}${suffix}`
}

/**
 * Mask email address
 *
 * @param email - Email to mask
 * @param config - Masking configuration
 * @returns Masked email
 */
export function maskEmail(email: string, config: SanitizationConfig = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  if (!email || !email.includes('@')) {
    return maskValue(email, config)
  }

  const [localPart, domain] = email.split('@')

  const maskedLocal =
    localPart.length > 2
      ? localPart.charAt(0) +
        finalConfig.maskChar.repeat(3) +
        localPart.charAt(localPart.length - 1)
      : finalConfig.maskChar.repeat(4)

  return `${maskedLocal}@${domain}`
}

/**
 * Mask phone number
 *
 * @param phone - Phone number to mask
 * @param config - Masking configuration
 * @returns Masked phone
 */
export function maskPhone(phone: string, config: SanitizationConfig = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const digits = phone.replace(/\D/g, '')

  if (digits.length < 7) {
    return finalConfig.maskChar.repeat(finalConfig.maskLength)
  }

  // Keep last 4 digits
  const lastFour = digits.slice(-4)
  const masked = finalConfig.maskChar.repeat(Math.min(6, digits.length - 4))

  return `${masked}-${lastFour}`
}

/**
 * Mask credit card number
 *
 * @param card - Credit card number to mask
 * @param config - Masking configuration
 * @returns Masked card
 */
export function maskCreditCard(card: string, config: SanitizationConfig = {}): string {
  const digits = card.replace(/\D/g, '')

  if (digits.length < 4) {
    return DEFAULT_CONFIG.maskChar.repeat(DEFAULT_CONFIG.maskLength)
  }

  // Keep first 4 and last 4 digits
  const firstFour = digits.slice(0, 4)
  const lastFour = digits.slice(-4)
  const masked = DEFAULT_CONFIG.maskChar.repeat(digits.length - 8)

  return `${firstFour}${masked}${lastFour}`
}

/**
 * Redact value completely
 *
 * @param config - Sanitization configuration
 * @returns Redacted text
 */
export function redactValue(config: SanitizationConfig = {}): string {
  return config.redactedText || DEFAULT_CONFIG.redactedText
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Check if field name is sensitive
 *
 * @param fieldName - Field name to check
 * @returns Sensitive field info or undefined
 */
export function isSensitiveField(fieldName: string): SensitiveField | undefined {
  const lowerName = fieldName.toLowerCase()

  for (const field of SENSITIVE_PATTERNS) {
    if (field.pattern.test(fieldName) || field.pattern.test(lowerName)) {
      return field
    }
  }

  return undefined
}

/**
 * Sanitize a value based on field name
 *
 * @param fieldName - Field name
 * @param value - Value to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized value
 */
export function sanitizeValue(
  fieldName: string,
  value: unknown,
  config: SanitizationConfig = {}
): unknown {
  if (value === null || value === undefined) {
    return value
  }

  const sensitiveField = isSensitiveField(fieldName)

  if (!sensitiveField) {
    // Check if value matches sensitive patterns
    if (typeof value === 'string') {
      return sanitizeStringValue(value, config)
    }
    return value
  }

  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

  switch (sensitiveField.maskType) {
    case 'full':
      return redactValue(config)

    case 'partial':
      switch (sensitiveField.type) {
        case 'email':
          return maskEmail(stringValue, config)
        case 'phone':
          return maskPhone(stringValue, config)
        case 'credit-card':
          return maskCreditCard(stringValue, config)
        default:
          return maskValue(stringValue, config)
      }

    case 'hash':
      return `[HASH:${stringValue.length} chars]`

    default:
      return maskValue(stringValue, config)
  }
}

/**
 * Sanitize string value by detecting patterns
 *
 * @param value - String value to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized string
 */
export function sanitizeStringValue(value: string, config: SanitizationConfig = {}): string {
  let sanitized = value

  for (const { pattern, type } of VALUE_PATTERNS) {
    sanitized = sanitized.replace(pattern, match => {
      switch (type) {
        case 'email':
          return maskEmail(match, config)
        case 'credit-card':
          return maskCreditCard(match, config)
        case 'phone':
          return maskPhone(match, config)
        default:
          return maskValue(match, config)
      }
    })
  }

  return sanitized
}

/**
 * Sanitize object recursively
 *
 * @param obj - Object to sanitize
 * @param config - Sanitization configuration
 * @param depth - Current recursion depth
 * @returns Sanitized object
 */
export function sanitizeObject(
  obj: unknown,
  config: SanitizationConfig = {},
  depth: number = 0
): unknown {
  // Prevent deep recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]'
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeStringValue(obj, config)
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, config, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(key, sanitizeObject(value, config, depth + 1), config)
  }

  return sanitized
}

/**
 * Sanitize log entry
 *
 * @param entry - Log entry to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized log entry
 */
export function sanitizeLogEntry(
  entry: Record<string, unknown>,
  config: SanitizationConfig = {}
): Record<string, unknown> {
  return sanitizeObject(entry, config) as Record<string, unknown>
}

/**
 * Sanitize HTTP headers
 *
 * @param headers - Headers to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized headers
 */
export function sanitizeHeaders(
  headers: Headers | Record<string, string>,
  config: SanitizationConfig = {}
): Record<string, string> {
  const sanitized: Record<string, string> = {}

  const iterateHeaders = (callback: (key: string, value: string) => void) => {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => callback(key, value))
    } else {
      Object.entries(headers).forEach(([key, value]) => callback(key, value))
    }
  }

  iterateHeaders((key, value) => {
    const sanitizedValue = sanitizeValue(key, value, config)
    sanitized[key] = typeof sanitizedValue === 'string' ? sanitizedValue : String(sanitizedValue)
  })

  return sanitized
}

/**
 * Sanitize URL query parameters
 *
 * @param url - URL to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized URL
 */
export function sanitizeURL(url: string, config: SanitizationConfig = {}): string {
  try {
    const parsedUrl = new URL(url)

    // Sanitize query parameters
    const searchParams = new URLSearchParams()
    parsedUrl.searchParams.forEach((value, key) => {
      const sanitizedValue = sanitizeValue(key, value, config)
      searchParams.set(
        key,
        typeof sanitizedValue === 'string' ? sanitizedValue : String(sanitizedValue)
      )
    })

    return (
      parsedUrl.origin +
      parsedUrl.pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : '')
    )
  } catch (error) {
    // Invalid URL, return sanitized string
    return sanitizeStringValue(url, config)
  }
}

/**
 * Sanitize error object
 *
 * @param error - Error to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized error object
 */
export function sanitizeError(
  error: Error | unknown,
  config: SanitizationConfig = {}
): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeStringValue(error.message, config),
      stack: error.stack ? sanitizeStringValue(error.stack, config) : undefined,
    }
  }

  return sanitizeObject(error, config) as Record<string, unknown>
}

// ============================================================================
// Custom Patterns
// ============================================================================

/**
 * Add custom sensitive field pattern
 *
 * @param pattern - Pattern to add
 */
export function addSensitivePattern(field: SensitiveField): void {
  SENSITIVE_PATTERNS.push(field)
}

/**
 * Add custom value pattern
 *
 * @param pattern - Pattern to add
 * @param type - Pattern type
 */
export function addValuePattern(
  pattern: RegExp,
  type: (typeof VALUE_PATTERNS)[number]['type']
): void {
  VALUE_PATTERNS.push({ pattern, type })
}

/**
 * Reset patterns to defaults (for testing)
 */
export function resetPatterns(): void {
  SENSITIVE_PATTERNS.length = 0
  SENSITIVE_PATTERNS.push(
    ...[
      {
        pattern: /password/i,
        type: 'password' as const,
        maskType: 'full' as const,
      },
      {
        pattern: /secret/i,
        type: 'api-key' as const,
        maskType: 'full' as const,
      },
      {
        pattern: /api[_-]?key/i,
        type: 'api-key' as const,
        maskType: 'partial' as const,
      },
      {
        pattern: /token/i,
        type: 'token' as const,
        maskType: 'partial' as const,
      },
    ]
  )
}
