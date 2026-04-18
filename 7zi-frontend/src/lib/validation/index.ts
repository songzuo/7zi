/**
 * Form Validation Library
 * 
 * Comprehensive form validation system with:
 * - Chainable validation rules
 * - Custom validation rules support
 * - Async validation (API validation)
 * - Field-level and form-level validation
 * - Internationalization support
 * - Real-time validation (onChange/onBlur)
 * - Zod schema integration
 */

// ============================================================================
// Types
// ============================================================================

export type {
  ValidationRule,
  ValidationContext,
  ValidationResult,
  FieldError,
  FormValidationResult,
  FieldState,
  ValidationTrigger,
  FieldConfig,
  FormConfig,
  FormValidationRule,
  AsyncValidator,
  AsyncValidationState,
  ChainedValidator,
  ZodFieldSchema,
  Translator,
  DefaultMessageKey,
} from './types'

export { DEFAULT_MESSAGES } from './types'

// ============================================================================
// Core Validators
// ============================================================================

export {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  min,
  max,
  url,
  phone,
  number,
  integer,
  date,
  oneOf,
  notOneOf,
  equals,
  custom,
  chain,
  getErrorMessage,
  formatMessage,
} from './validators'

// ============================================================================
// Form Validator
// ============================================================================

export {
  FormValidator,
  createFormValidator,
  validateValue,
  isEmpty,
  createFormRule,
} from './form-validator'

// ============================================================================
// React Hooks
// ============================================================================

export {
  useValidation,
  useFieldValidation,
} from './use-validation'

export type {
  UseValidationReturn,
  UseFieldValidationReturn,
} from './use-validation'

// ============================================================================
// Async Validators
// ============================================================================

export {
  createAsyncValidator,
  uniqueEmail,
  availableUsername,
  validPhone,
  validPostalCode,
  accessibleUrl,
  validCaptcha,
  validFileUpload,
  validCode,
  validAddress,
  validIban,
  validVatNumber,
  createRetryableAsyncValidator,
  createCachedAsyncValidator,
} from './async-validators'

// ============================================================================
// Zod Integration
// ============================================================================

export {
  zodToRules,
  validateWithZod,
  zodRule,
} from './zod-adapter'
