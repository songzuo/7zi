/**
 * Core Validators
 * 
 * Built-in validation rules with chainable API
 */

import type {
  ValidationRule,
  ValidationContext,
  ValidationResult,
  AsyncValidator,
  ChainedValidator,
  Translator,
  DEFAULT_MESSAGES,
  DefaultMessageKey,
} from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/** Create a validation result */
export function createResult(valid: boolean, message?: string, rule?: string): ValidationResult {
  return { valid, message, rule }
}

/** Format message with parameters */
function formatMessage(
  message: string,
  params?: Record<string, string | number>,
  t?: Translator
): string {
  if (!params) return message

  let formatted = message
  for (const [key, value] of Object.entries(params)) {
    formatted = formatted.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }

  return formatted
}

/** Get error message with i18n support */
function getErrorMessage(
  key: DefaultMessageKey,
  params?: Record<string, string | number>,
  customMessage?: string,
  t?: Translator
): string {
  if (customMessage) {
    return formatMessage(customMessage, params, t)
  }

  const defaultMessages: typeof DEFAULT_MESSAGES = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minLength: 'Minimum {min} characters required',
    maxLength: 'Maximum {max} characters allowed',
    pattern: 'Invalid format',
    min: 'Value must be at least {min}',
    max: 'Value must be at most {max}',
    url: 'Please enter a valid URL',
    phone: 'Please enter a valid phone number',
    number: 'Please enter a valid number',
    integer: 'Please enter an integer',
    date: 'Please enter a valid date',
    time: 'Please enter a valid time',
    datetime: 'Please enter a valid date and time',
    oneOf: 'Please select one of the valid options',
    notOneOf: 'This value is not allowed',
    equals: 'Values must match',
    notEquals: 'Values must be different',
    positive: 'Value must be positive',
    negative: 'Value must be negative',
    decimal: 'Please enter a valid decimal number',
    alpha: 'Only alphabetic characters allowed',
    alphanumeric: 'Only alphanumeric characters allowed',
    creditCard: 'Please enter a valid credit card number',
    json: 'Please enter valid JSON',
    uuid: 'Please enter a valid UUID',
    ip: 'Please enter a valid IP address',
    ipv4: 'Please enter a valid IPv4 address',
    ipv6: 'Please enter a valid IPv6 address',
    hexColor: 'Please enter a valid hex color',
    file: 'Please select a valid file',
    image: 'Please select a valid image file',
    mimeType: 'File type not allowed',
    maxSize: 'File size exceeds {max} bytes',
    async: 'Validation failed',
  }

  const message = t ? t(`validation.${key}`, params) : defaultMessages[key]
  return formatMessage(message, params, t)
}

// ============================================================================
// Built-in Validators
// ============================================================================

/** Required field validator */
export function required(message?: string): ValidationRule {
  return {
    name: 'required',
    validate: (value: unknown) => {
      if (value === null || value === undefined) {
        return createResult(false, getErrorMessage('required', undefined, message))
      }
      if (typeof value === 'string' && value.trim() === '') {
        return createResult(false, getErrorMessage('required', undefined, message))
      }
      if (Array.isArray(value) && value.length === 0) {
        return createResult(false, getErrorMessage('required', undefined, message))
      }
      return createResult(true)
    },
    message: message || getErrorMessage('required'),
  }
}

/** Email validator */
export function email(message?: string): ValidationRule {
  return {
    name: 'email',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('email', undefined, message))
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('email', undefined, message))
    },
    message: message || getErrorMessage('email'),
    skipIfEmpty: true,
  }
}

/** Minimum length validator */
export function minLength(min: number, message?: string): ValidationRule {
  return {
    name: 'minLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return createResult(true) // Skip if not applicable
      }
      const length = typeof value === 'string' ? value.length : value.length
      return length >= min
        ? createResult(true)
        : createResult(false, getErrorMessage('minLength', { min }, message))
    },
    message: message || getErrorMessage('minLength', { min }),
    skipIfEmpty: true,
  }
}

/** Maximum length validator */
export function maxLength(max: number, message?: string): ValidationRule {
  return {
    name: 'maxLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return createResult(true) // Skip if not applicable
      }
      const length = typeof value === 'string' ? value.length : value.length
      return length <= max
        ? createResult(true)
        : createResult(false, getErrorMessage('maxLength', { max }, message))
    },
    message: message || getErrorMessage('maxLength', { max }),
    skipIfEmpty: true,
  }
}

/** Pattern validator */
export function pattern(regex: RegExp, message?: string): ValidationRule {
  return {
    name: 'pattern',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(true) // Skip if not applicable
      }
      return regex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('pattern', undefined, message))
    },
    message: message || getErrorMessage('pattern'),
    skipIfEmpty: true,
  }
}

/** Minimum value validator (for numbers) */
export function min(min: number, message?: string): ValidationRule {
  return {
    name: 'min',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (typeof num !== 'number' || isNaN(num)) {
        return createResult(true) // Skip if not a number
      }
      return num >= min
        ? createResult(true)
        : createResult(false, getErrorMessage('min', { min }, message))
    },
    message: message || getErrorMessage('min', { min }),
    skipIfEmpty: true,
  }
}

/** Maximum value validator (for numbers) */
export function max(max: number, message?: string): ValidationRule {
  return {
    name: 'max',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (typeof num !== 'number' || isNaN(num)) {
        return createResult(true) // Skip if not a number
      }
      return num <= max
        ? createResult(true)
        : createResult(false, getErrorMessage('max', { max }, message))
    },
    message: message || getErrorMessage('max', { max }),
    skipIfEmpty: true,
  }
}

/** URL validator */
export function url(message?: string): ValidationRule {
  return {
    name: 'url',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('url', undefined, message))
      }
      try {
        const parsed = new URL(value)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
          ? createResult(true)
          : createResult(false, getErrorMessage('url', undefined, message))
      } catch {
        return createResult(false, getErrorMessage('url', undefined, message))
      }
    },
    message: message || getErrorMessage('url'),
    skipIfEmpty: true,
  }
}

/** Phone number validator (China) */
export function phone(message?: string): ValidationRule {
  return {
    name: 'phone',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('phone', undefined, message))
      }
      const phoneRegex = /^1[3-9]\d{9}$/
      return phoneRegex.test(value)
        ? createResult(true)
        : createResult(false, getErrorMessage('phone', undefined, message))
    },
    message: message || getErrorMessage('phone'),
    skipIfEmpty: true,
  }
}

/** Number validator */
export function number(message?: string): ValidationRule {
  return {
    name: 'number',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return typeof num === 'number' && !isNaN(num)
        ? createResult(true)
        : createResult(false, getErrorMessage('number', undefined, message))
    },
    message: message || getErrorMessage('number'),
    skipIfEmpty: true,
  }
}

/** Integer validator */
export function integer(message?: string): ValidationRule {
  return {
    name: 'integer',
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return typeof num === 'number' && !isNaN(num) && Number.isInteger(num)
        ? createResult(true)
        : createResult(false, getErrorMessage('integer', undefined, message))
    },
    message: message || getErrorMessage('integer'),
    skipIfEmpty: true,
  }
}

/** Date validator */
export function date(message?: string): ValidationRule {
  return {
    name: 'date',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return createResult(false, getErrorMessage('date', undefined, message))
      }
      const date = new Date(value)
      return !isNaN(date.getTime())
        ? createResult(true)
        : createResult(false, getErrorMessage('date', undefined, message))
    },
    message: message || getErrorMessage('date'),
    skipIfEmpty: true,
  }
}

/** One of validator */
export function oneOf<T>(options: readonly T[], message?: string): ValidationRule {
  return {
    name: 'oneOf',
    validate: (value: unknown) => {
      return options.includes(value as T)
        ? createResult(true)
        : createResult(false, getErrorMessage('oneOf', undefined, message))
    },
    message: message || getErrorMessage('oneOf'),
    skipIfEmpty: true,
  }
}

/** Not one of validator */
export function notOneOf<T>(options: readonly T[], message?: string): ValidationRule {
  return {
    name: 'notOneOf',
    validate: (value: unknown) => {
      return !options.includes(value as T)
        ? createResult(true)
        : createResult(false, getErrorMessage('notOneOf', undefined, message))
    },
    message: message || getErrorMessage('notOneOf'),
    skipIfEmpty: true,
  }
}

/** Equals validator (for password confirmation, etc.) */
export function equals(fieldName: string, message?: string): ValidationRule {
  return {
    name: 'equals',
    validate: (value: unknown, context?: ValidationContext) => {
      const otherValue = context?.values[fieldName]
      return value === otherValue
        ? createResult(true)
        : createResult(false, getErrorMessage('equals', undefined, message))
    },
    message: message || getErrorMessage('equals'),
    skipIfEmpty: true,
  }
}

/** Custom validator */
export function custom<T = unknown>(
  name: string,
  validateFn: (value: T, context?: ValidationContext) => boolean,
  message?: string
): ValidationRule<T> {
  return {
    name,
    validate: (value: T, context?: ValidationContext) => {
      return validateFn(value, context)
        ? createResult(true)
        : createResult(false, message || `Validation failed: ${name}`)
    },
    message: message || `Validation failed: ${name}`,
    skipIfEmpty: true,
  }
}

// ============================================================================
// Chained Validator Implementation
// ============================================================================

class ChainedValidatorImpl<T = unknown> implements ChainedValidator<T> {
  private rules: ValidationRule<T>[] = []

  required(message?: string): ChainedValidator<T> {
    this.rules.push(required(message) as ValidationRule<T>)
    return this
  }

  email(message?: string): ChainedValidator<T> {
    this.rules.push(email(message) as ValidationRule<T>)
    return this
  }

  minLength(min: number, message?: string): ChainedValidator<T> {
    this.rules.push(minLength(min, message) as ValidationRule<T>)
    return this
  }

  maxLength(max: number, message?: string): ChainedValidator<T> {
    this.rules.push(maxLength(max, message) as ValidationRule<T>)
    return this
  }

  pattern(regex: RegExp, message?: string): ChainedValidator<T> {
    this.rules.push(pattern(regex, message) as ValidationRule<T>)
    return this
  }

  min(min: number, message?: string): ChainedValidator<T> {
    this.rules.push(min(min, message) as ValidationRule<T>)
    return this
  }

  max(max: number, message?: string): ChainedValidator<T> {
    this.rules.push(max(max, message) as ValidationRule<T>)
    return this
  }

  custom(
    name: string,
    validateFn: (value: T) => boolean,
    message?: string
  ): ChainedValidator<T> {
    this.rules.push(custom(name, validateFn, message) as ValidationRule<T>)
    return this
  }

  asyncValidate(
    name: string,
    validateFn: (value: T) => Promise<boolean>,
    message?: string,
    debounce?: number
  ): ChainedValidator<T> {
    const asyncRule: AsyncValidator<T> = {
      name,
      validate: async (value: T) => {
        const isValid = await validateFn(value)
        return isValid
          ? createResult(true)
          : createResult(false, message || getErrorMessage('async'))
      },
      message: message || getErrorMessage('async'),
      debounce,
    }
    this.rules.push(asyncRule as ValidationRule<T>)
    return this
  }

  build(): ValidationRule<T>[] {
    return this.rules
  }
}

/** Create a chained validator */
export function chain<T = unknown>(): ChainedValidator<T> {
  return new ChainedValidatorImpl<T>()
}

// ============================================================================
// Re-exports
// ============================================================================

export { getErrorMessage, formatMessage }