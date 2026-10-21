/**
 * Validation Types
 * 
 * Core type definitions for the form validation system
 */

import type { ZodSchema, ZodError } from 'zod'

// ============================================================================
// Validation Rule Types
// ============================================================================

/** Base interface for all validation rules */
export interface ValidationRule<T = unknown> {
  /** Unique identifier for the rule */
  name: string
  /** Validate the value */
  validate: (value: T, context?: ValidationContext) => ValidationResult
  /** Error message (can be a i18n key) */
  message: string
  /** Whether to skip this rule if value is empty */
  skipIfEmpty?: boolean
}

/** Validation context passed to validators */
export interface ValidationContext {
  /** All form values */
  values: Record<string, unknown>
  /** Current field name being validated */
  fieldName: string
  /** All field names */
  fieldNames: string[]
  /** Custom context data */
  [key: string]: unknown
}

/** Validation result */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Error message if invalid */
  message?: string
  /** Rule name that failed */
  rule?: string
}

/** Field-level validation error */
export interface FieldError {
  /** Field name */
  field: string
  /** Error message */
  message: string
  /** Rule that caused the error */
  rule?: string
}

/** Form-level validation result */
export interface FormValidationResult {
  /** Whether the entire form is valid */
  valid: boolean
  /** Field-level errors */
  errors: Record<string, string[]>
  /** Form-level errors */
  formErrors: string[]
  /** First error message (for convenience) */
  firstError?: string
}

/** Validation state for a field */
export interface FieldState {
  /** Current value */
  value: unknown
  /** Whether the field has been touched */
  touched: boolean
  /** Whether validation has been run */
  validated: boolean
  /** Error messages */
  errors: string[]
  /** Whether validation is in progress (for async) */
  validating: boolean
}

/** Validation trigger types */
export type ValidationTrigger = 'onChange' | 'onBlur' | 'onSubmit' | 'onMount'

/** Validation configuration for a field */
export interface FieldConfig {
  /** Field name */
  name: string
  /** Initial value */
  initialValue?: unknown
  /** Validation rules */
  rules?: ValidationRule[]
  /** When to trigger validation */
  trigger?: ValidationTrigger | ValidationTrigger[]
  /** Whether to validate immediately on change */
  immediate?: boolean
  /** Custom error messages (rule name -> message) */
  customMessages?: Record<string, string>
}

/** Form validation configuration */
export interface FormConfig {
  /** Form name/identifier */
  name?: string
  /** Field configurations */
  fields: FieldConfig[]
  /** Form-level validation rules */
  formRules?: FormValidationRule[]
  /** Default validation trigger */
  defaultTrigger?: ValidationTrigger
  /** Whether to validate on mount */
  validateOnMount?: boolean
  /** Custom i18n function */
  t?: (key: string, params?: Record<string, string | number>) => string
}

/** Form-level validation rule */
export interface FormValidationRule {
  /** Unique identifier */
  name: string
  /** Validation function that returns error message or true */
  validate: (values: Record<string, unknown>) => string | true
  /** Error message */
  message: string
}

// ============================================================================
// Async Validation Types
// ============================================================================

/** Async validation function */
export interface AsyncValidator<T = unknown> {
  /** Unique identifier */
  name: string
  /** Async validation function */
  validate: (value: T, context?: ValidationContext) => Promise<ValidationResult>
  /** Error message */
  message: string
  /** Debounce delay in ms */
  debounce?: number
  /** Whether to validate on server */
  serverSide?: boolean
}

/** Async validation state */
export interface AsyncValidationState {
  /** Whether validation is in progress */
  validating: boolean
  /** Current error */
  error?: string
  /** Last validated value (to avoid re-validation) */
  lastValue?: unknown
  /** Timer for debounce */
  timer?: ReturnType<typeof setTimeout>
}

// ============================================================================
// Chained Validator Types
// ============================================================================

/** Chained validator interface */
export interface ChainedValidator<T = unknown> {
  /** Add a required rule */
  required(message?: string): ChainedValidator<T>
  /** Add email validation */
  email(message?: string): ChainedValidator<T>
  /** Add min length validation */
  minLength(min: number, message?: string): ChainedValidator<T>
  /** Add max length validation */
  maxLength(max: number, message?: string): ChainedValidator<T>
  /** Add pattern validation */
  pattern(pattern: RegExp, message?: string): ChainedValidator<T>
  /** Add min value validation (for numbers) */
  min(min: number, message?: string): ChainedValidator<T>
  /** Add max value validation (for numbers) */
  max(max: number, message?: string): ChainedValidator<T>
  /** Add custom rule */
  custom(name: string, validate: (value: T) => boolean, message?: string): ChainedValidator<T>
  /** Add async validation */
  asyncValidate(
    name: string,
    validate: (value: T) => Promise<boolean>,
    message?: string,
    debounce?: number
  ): ChainedValidator<T>
  /** Build the final validator */
  build(): ValidationRule<T>[]
}

// ============================================================================
// Schema Validation Types
// ============================================================================

/** Zod-based field schema */
export interface ZodFieldSchema<T = unknown> {
  /** Zod schema */
  schema: ZodSchema<T>
  /** Error messages mapping */
  messages?: Record<string, string>
  /** Transform value before validation */
  transform?: (value: unknown) => T
}

// ============================================================================
// i18n Types
// ============================================================================

/** Translation function type */
export type Translator = (key: string, params?: Record<string, string | number>) => string

/** Default error messages (i18n ready) */
export const DEFAULT_MESSAGES = {
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
} as const

/** Type for default message keys */
export type DefaultMessageKey = keyof typeof DEFAULT_MESSAGES
