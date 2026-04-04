/**
 * Async Validators
 * 
 * Asynchronous validation rules for API-based validation
 */

import type {
  AsyncValidator,
  ValidationContext,
  ValidationResult,
} from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/** Create a validation result */
function createResult(valid: boolean, message?: string, rule?: string): ValidationResult {
  return { valid, message, rule }
}

// ============================================================================
// Async Validator Factory
// ============================================================================

/** Create an async validator */
export function createAsyncValidator<T = unknown>(
  name: string,
  validateFn: (value: T, context?: ValidationContext) => Promise<boolean>,
  message: string,
  debounce: number = 300
): AsyncValidator<T> {
  return {
    name,
    validate: async (value: T, context?: ValidationContext) => {
      try {
        const isValid = await validateFn(value, context)
        return isValid ? createResult(true) : createResult(false, message, name)
      } catch (error) {
        console.error(`Async validation error [${name}]:`, error)
        return createResult(false, message, name)
      }
    },
    message,
    debounce,
  }
}

// ============================================================================
// Built-in Async Validators
// ============================================================================

/** Check if email is unique via API */
export function uniqueEmail(
  checkFn: (email: string) => Promise<boolean>,
  message: string = 'This email is already registered'
): AsyncValidator<string> {
  return createAsyncValidator(
    'uniqueEmail',
    async (email: string) => {
      if (!email || !email.includes('@')) return true
      return await checkFn(email)
    },
    message,
    500
  )
}

/** Check if username is available via API */
export function availableUsername(
  checkFn: (username: string) => Promise<boolean>,
  message: string = 'This username is already taken'
): AsyncValidator<string> {
  return createAsyncValidator(
    'availableUsername',
    async (username: string) => {
      if (!username || username.length < 3) return true
      return await checkFn(username)
    },
    message,
    500
  )
}

/** Validate phone number via API */
export function validPhone(
  checkFn: (phone: string) => Promise<boolean>,
  message: string = 'Invalid phone number'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validPhone',
    async (phone: string) => {
      if (!phone) return true
      return await checkFn(phone)
    },
    message,
    300
  )
}

/** Validate postal code via API */
export function validPostalCode(
  checkFn: (code: string, country?: string) => Promise<boolean>,
  message: string = 'Invalid postal code'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validPostalCode',
    async (code: string, context?: ValidationContext) => {
      if (!code) return true
      const country = context?.country as string | undefined
      return await checkFn(code, country)
    },
    message,
    300
  )
}

/** Check if URL is accessible */
export function accessibleUrl(
  checkFn: (url: string) => Promise<boolean>,
  message: string = 'URL is not accessible'
): AsyncValidator<string> {
  return createAsyncValidator(
    'accessibleUrl',
    async (url: string) => {
      if (!url) return true
      return await checkFn(url)
    },
    message,
    500
  )
}

/** Validate CAPTCHA */
export function validCaptcha(
  checkFn: (token: string) => Promise<boolean>,
  message: string = 'CAPTCHA verification failed'
): AsyncValidator<string> {
  const validator = createAsyncValidator(
    'validCaptcha',
    async (token: string) => {
      if (!token) return false
      return await checkFn(token)
    },
    message,
    0 // No debounce for CAPTCHA
  )
  // Override to not skip on empty - CAPTCHA requires a value
  return {
    ...validator,
    validate: async (value: unknown, context?: ValidationContext) => {
      try {
        const isValid = await validator.validate(value, context)
        return isValid
      } catch (error) {
        console.error(`Async validation error [validCaptcha]:`, error)
        return { valid: false, message, rule: 'validCaptcha' }
      }
    },
  }
}

/** Validate file upload */
export function validFileUpload(
  checkFn: (file: File) => Promise<boolean>,
  message: string = 'File validation failed'
): AsyncValidator<File> {
  return createAsyncValidator(
    'validFileUpload',
    async (file: File) => {
      if (!file) return true
      return await checkFn(file)
    },
    message,
    300
  )
}

/** Check if code is valid (e.g., verification code, promo code) */
export function validCode(
  checkFn: (code: string) => Promise<boolean>,
  message: string = 'Invalid code'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validCode',
    async (code: string) => {
      if (!code) return true
      return await checkFn(code)
    },
    message,
    500
  )
}

/** Validate address via geocoding API */
export function validAddress(
  checkFn: (address: string) => Promise<boolean>,
  message: string = 'Invalid address'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validAddress',
    async (address: string) => {
      if (!address) return true
      return await checkFn(address)
    },
    message,
    500
  )
}

/** Validate IBAN */
export function validIban(
  checkFn: (iban: string) => Promise<boolean>,
  message: string = 'Invalid IBAN'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validIban',
    async (iban: string) => {
      if (!iban) return true
      return await checkFn(iban)
    },
    message,
    300
  )
}

/** Validate VAT number */
export function validVatNumber(
  checkFn: (vat: string, country: string) => Promise<boolean>,
  message: string = 'Invalid VAT number'
): AsyncValidator<string> {
  return createAsyncValidator(
    'validVatNumber',
    async (vat: string, context?: ValidationContext) => {
      if (!vat) return true
      const country = context?.country as string | undefined
      return await checkFn(vat, country || '')
    },
    message,
    500
  )
}

// ============================================================================
// Custom Async Validator Builder
// ============================================================================

/** Build a custom async validator with retry logic */
export function createRetryableAsyncValidator<T = unknown>(
  name: string,
  validateFn: (value: T, context?: ValidationContext) => Promise<boolean>,
  message: string,
  options: {
    debounce?: number
    maxRetries?: number
    retryDelay?: number
  } = {}
): AsyncValidator<T> {
  const { debounce = 300, maxRetries = 2, retryDelay = 1000 } = options

  return {
    name,
    validate: async (value: T, context?: ValidationContext) => {
      let lastError: Error | undefined

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const isValid = await validateFn(value, context)
          return isValid ? createResult(true) : createResult(false, message, name)
        } catch (error) {
          lastError = error as Error
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }

      console.error(`Async validation error [${name}] after ${maxRetries} retries:`, lastError)
      return createResult(false, message, name)
    },
    message,
    debounce,
  }
}

/** Build a cached async validator */
export function createCachedAsyncValidator<T = unknown>(
  name: string,
  validateFn: (value: T, context?: ValidationContext) => Promise<boolean>,
  message: string,
  options: {
    debounce?: number
    cacheTime?: number
  } = {}
): AsyncValidator<T> {
  const { debounce = 300, cacheTime = 5000 } = options
  const cache = new Map<string, { result: boolean; timestamp: number }>()

  return {
    name,
    validate: async (value: T, context?: ValidationContext) => {
      const cacheKey = JSON.stringify({ value, context })

      // Check cache
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.result ? createResult(true) : createResult(false, message, name)
      }

      try {
        const isValid = await validateFn(value, context)
        cache.set(cacheKey, { result: isValid, timestamp: Date.now() })
        return isValid ? createResult(true) : createResult(false, message, name)
      } catch (error) {
        console.error(`Async validation error [${name}]:`, error)
        return createResult(false, message, name)
      }
    },
    message,
    debounce,
  }
}