/**
 * Enhanced Input Sanitization Module
 *
 * Provides comprehensive input sanitization and validation:
 * - XSS prevention
 * - SQL injection prevention
 * - NoSQL injection prevention
 * - HTML entity encoding
 * - Path traversal prevention
 * - Command injection prevention
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  // Allow HTML (stripped and sanitized)
  allowHTML?: boolean

  // Allowed HTML tags (when allowHTML is true)
  allowedTags?: string[]

  // Allowed HTML attributes (when allowHTML is true)
  allowedAttributes?: Record<string, string[]>

  // Strip all tags (convert to plain text)
  stripTags?: boolean

  // Trim whitespace
  trim?: boolean

  // Maximum length
  maxLength?: number

  // Minimum length
  minLength?: number

  // Allow specific characters (regex pattern)
  allowPattern?: RegExp

  // Block specific characters (regex pattern)
  blockPattern?: RegExp

  // For numbers
  isNumber?: boolean
  min?: number
  max?: number
  isInteger?: boolean

  // For emails
  isEmail?: boolean

  // For URLs
  isURL?: boolean

  // For UUIDs
  isUUID?: boolean

  // For arrays
  isArray?: boolean
  arrayItemSchema?: SanitizationOptions

  // For objects
  isObject?: boolean
  objectSchema?: Record<string, SanitizationOptions>

  // Custom validator
  customValidator?: (value: unknown) => boolean
}

/**
 * Default allowed HTML tags (whitelist)
 */
const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'i',
  'u',
  'em',
  'strong',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
]

/**
 * Default allowed HTML attributes (whitelist)
 */
const DEFAULT_ALLOWED_ATTRIBUTES = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
}

/**
 * XSS patterns to block
 */
const XSS_PATTERNS = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  /<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gi,
  /javascript:/gi,
  /data:(?!image\/)/gi,
  /on\w+\s*=/gi, // onclick, onerror, etc.
  /<\s*\/?\s*(script|iframe|object|embed|form|input|button)/gi,
]

/**
 * SQL injection patterns (basic detection)
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION)\b)/gi,
  /(--|;|\/\*|\*\/)/g,
  /('.*?(OR|AND).*?'.*?='.*)/gi,
  /(\b(1=1|1 = 1)\b)/gi,
]

/**
 * NoSQL injection patterns (MongoDB)
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$gte/gi,
  /\$lte/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$or/gi,
  /\$and/gi,
  /\$not/gi,
  /\$exists/gi,
  /\$regex/gi,
  /\$expr/gi,
]

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\\/gi,
  /..%2f/gi,
  /..%5c/gi,
]

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/g,
  /\b(cat|ls|pwd|whoami|chmod|chown|rm|mv|cp)\b/gi,
  /\b(nc|netcat|curl|wget|telnet)\b/gi,
]

/**
 * Sanitize a string value
 */
export function sanitizeString(
  value: string,
  options: SanitizationOptions = {}
): { sanitized: string; valid: boolean; error?: string } {
  let sanitized = value

  // Check length constraints
  if (options.maxLength && sanitized.length > options.maxLength) {
    return {
      sanitized: sanitized.substring(0, options.maxLength),
      valid: false,
      error: `Value exceeds maximum length of ${options.maxLength}`,
    }
  }

  if (options.minLength && sanitized.length < options.minLength) {
    return {
      sanitized,
      valid: false,
      error: `Value is below minimum length of ${options.minLength}`,
    }
  }

  // Trim if requested
  if (options.trim !== false) {
    sanitized = sanitized.trim()
  }

  // Check block pattern
  if (options.blockPattern) {
    const matches = sanitized.match(options.blockPattern)
    if (matches) {
      return {
        sanitized,
        valid: false,
        error: 'Value contains blocked characters',
      }
    }
  }

  // Check allow pattern
  if (options.allowPattern) {
    if (!options.allowPattern.test(sanitized)) {
      return {
        sanitized,
        valid: false,
        error: 'Value contains invalid characters',
      }
    }
  }

  // Email validation
  if (options.isEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitized)) {
      return {
        sanitized,
        valid: false,
        error: 'Invalid email format',
      }
    }
  }

  // URL validation
  if (options.isURL) {
    try {
      new URL(sanitized)
    } catch (error) {
      return {
        sanitized,
        valid: false,
        error: 'Invalid URL format',
      }
    }
  }

  // UUID validation
  if (options.isUUID) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sanitized)) {
      return {
        sanitized,
        valid: false,
        error: 'Invalid UUID format',
      }
    }
  }

  // Strip tags if requested
  if (options.stripTags) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Sanitize HTML if allowed
  if (options.allowHTML) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: options.allowedTags || DEFAULT_ALLOWED_TAGS,
      ALLOWED_ATTR: options.allowedAttributes
        ? Object.values(options.allowedAttributes).flat()
        : undefined,
    })
  } else {
    // Remove all HTML tags and decode entities
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] })
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Check for NoSQL injection patterns
  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Check for path traversal patterns
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Check for command injection patterns
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '')
    }
  }

  // Custom validator
  if (options.customValidator && !options.customValidator(sanitized)) {
    return {
      sanitized,
      valid: false,
      error: 'Custom validation failed',
    }
  }

  return {
    sanitized,
    valid: true,
  }
}

/**
 * Sanitize a number value
 */
export function sanitizeNumber(
  value: number,
  options: SanitizationOptions = {}
): { sanitized: number; valid: boolean; error?: string } {
  // Check if it's actually a number
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      sanitized: 0,
      valid: false,
      error: 'Value is not a valid number',
    }
  }

  const sanitized = value

  // Check if integer
  if (options.isInteger && !Number.isInteger(sanitized)) {
    return {
      sanitized: Math.round(sanitized),
      valid: false,
      error: 'Value must be an integer',
    }
  }

  // Check min/max
  if (options.min !== undefined && sanitized < options.min) {
    return {
      sanitized: options.min,
      valid: false,
      error: `Value must be at least ${options.min}`,
    }
  }

  if (options.max !== undefined && sanitized > options.max) {
    return {
      sanitized: options.max,
      valid: false,
      error: `Value must be at most ${options.max}`,
    }
  }

  return {
    sanitized,
    valid: true,
  }
}

/**
 * Sanitize a boolean value
 */
export function sanitizeBoolean(value: unknown): { sanitized: boolean; valid: boolean } {
  if (typeof value === 'boolean') {
    return { sanitized: value, valid: true }
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') {
      return { sanitized: true, valid: true }
    }
    if (lower === 'false' || lower === '0') {
      return { sanitized: false, valid: true }
    }
  }

  if (typeof value === 'number') {
    return { sanitized: value !== 0, valid: true }
  }

  return { sanitized: false, valid: false }
}

/**
 * Sanitize an array
 */
export function sanitizeArray<T>(
  value: unknown[],
  options: SanitizationOptions = {}
): {
  sanitized: T[]
  valid: boolean
  errors: Array<{ index: number; error: string }>
} {
  if (!Array.isArray(value)) {
    return {
      sanitized: [],
      valid: false,
      errors: [{ index: 0, error: 'Value is not an array' }],
    }
  }

  const sanitized: T[] = []
  const errors: Array<{ index: number; error: string }> = []

  value.forEach((item, index) => {
    if (options.arrayItemSchema) {
      const result = sanitizeValue(item, options.arrayItemSchema)
      if (!result.valid) {
        errors.push({ index, error: result.error || 'Invalid item' })
      }
      sanitized.push(result.sanitized as T)
    } else if (typeof item === 'string') {
      const result = sanitizeString(item)
      if (!result.valid) {
        errors.push({ index, error: result.error || 'Invalid string item' })
      }
      sanitized.push(result.sanitized as T)
    } else {
      sanitized.push(item as T)
    }
  })

  return {
    sanitized,
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitize an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
  options: SanitizationOptions = {}
): {
  sanitized: T
  valid: boolean
  errors: Record<string, string>
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      sanitized: {} as T,
      valid: false,
      errors: { _global: 'Value is not an object' },
    }
  }

  const sanitized: Partial<T> = {}
  const errors: Record<string, string> = {}

  // If schema is provided, validate against it
  if (options.objectSchema) {
    for (const [key, schema] of Object.entries(options.objectSchema)) {
      const result = sanitizeValue(value[key], schema)
      if (!result.valid) {
        errors[key] = result.error || 'Invalid value'
      }
      ;(sanitized as Record<string, unknown>)[key] = result.sanitized
    }

    // Check for unknown keys
    const knownKeys = new Set(Object.keys(options.objectSchema))
    const unknownKeys = Object.keys(value).filter(key => !knownKeys.has(key))
    for (const key of unknownKeys) {
      ;(sanitized as Record<string, unknown>)[key] = value[key]
    }
  } else {
    // No schema, just copy and sanitize string values
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') {
        const result = sanitizeString(item)
        if (!result.valid) {
          errors[key] = result.error || 'Invalid string value'
        }
        ;(sanitized as Record<string, unknown>)[key] = result.sanitized
      } else {
        ;(sanitized as Record<string, unknown>)[key] = item
      }
    }
  }

  return {
    sanitized: sanitized as T,
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Generic sanitize function that handles all types
 */
export function sanitizeValue<T = unknown>(
  value: unknown,
  options: SanitizationOptions = {}
): { sanitized: T; valid: boolean; error?: string } {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { sanitized: null as T, valid: true }
  }

  // Handle strings
  if (typeof value === 'string') {
    return sanitizeString(value, options) as unknown as {
      sanitized: T
      valid: boolean
      error?: string
    }
  }

  // Handle numbers
  if (typeof value === 'number' && options.isNumber) {
    return sanitizeNumber(value, options) as unknown as {
      sanitized: T
      valid: boolean
      error?: string
    }
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return { sanitized: value as T, valid: true }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const result = sanitizeArray(value, options)
    return {
      sanitized: result.sanitized as T,
      valid: result.valid,
      error: result.errors[0]?.error,
    }
  }

  // Handle objects
  if (typeof value === 'object') {
    const result = sanitizeObject(value as Record<string, unknown>, options)
    return {
      sanitized: result.sanitized as T,
      valid: result.valid,
      error: Object.values(result.errors)[0],
    }
  }

  // Unknown type
  return {
    sanitized: value as T,
    valid: false,
    error: 'Unsupported type for sanitization',
  }
}

/**
 * Sanitize request body
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  schema: Record<string, SanitizationOptions>
): {
  sanitized: T
  valid: boolean
  errors: Record<string, string>
} {
  return sanitizeObject<T>(body, { objectSchema: schema })
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParams(
  searchParams: URLSearchParams,
  schema: Record<string, SanitizationOptions>
): {
  sanitized: Record<string, unknown>
  valid: boolean
  errors: Record<string, string>
} {
  const sanitized: Record<string, unknown> = {}
  const errors: Record<string, string> = {}

  for (const [key, options] of Object.entries(schema)) {
    const value = searchParams.get(key)
    const result = sanitizeValue(value, options)
    if (!result.valid) {
      errors[key] = result.error || 'Invalid value'
    }
    sanitized[key] = result.sanitized
  }

  return {
    sanitized,
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Quick sanitization helper (default options)
 */
export function sanitize(value: string): string {
  return sanitizeString(value).sanitized
}

/**
 * Validate and sanitize in one step
 */
export function validateAndSanitize<T = unknown>(value: unknown, options: SanitizationOptions): T {
  const result = sanitizeValue<T>(value, options)
  if (!result.valid) {
    throw new Error(result.error || 'Validation failed')
  }
  return result.sanitized
}

/**
 * Check for potential SQL injection
 */
export function detectSQLInjection(value: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Check for potential NoSQL injection
 */
export function detectNoSQLInjection(value: string): boolean {
  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Check for potential XSS
 */
export function detectXSS(value: string): boolean {
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Check for path traversal
 */
export function detectPathTraversal(value: string): boolean {
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Check for command injection
 */
export function detectCommandInjection(value: string): boolean {
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Comprehensive security check
 */
export function securityCheck(value: string): {
  hasSQLInjection: boolean
  hasNoSQLInjection: boolean
  hasXSS: boolean
  hasPathTraversal: boolean
  hasCommandInjection: boolean
  isSafe: boolean
} {
  return {
    hasSQLInjection: detectSQLInjection(value),
    hasNoSQLInjection: detectNoSQLInjection(value),
    hasXSS: detectXSS(value),
    hasPathTraversal: detectPathTraversal(value),
    hasCommandInjection: detectCommandInjection(value),
    isSafe:
      !detectSQLInjection(value) &&
      !detectNoSQLInjection(value) &&
      !detectXSS(value) &&
      !detectPathTraversal(value) &&
      !detectCommandInjection(value),
  }
}
