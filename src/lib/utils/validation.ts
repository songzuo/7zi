/**
 * Validation utilities
 *
 * @module lib/utils/validation
 */

// Cache email regex to avoid recreating it on every call
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Cache URL regex for faster validation (avoids try-catch overhead)
const URL_REGEX = /^https?:\/\/.+/i

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  return EMAIL_REGEX.test(email)
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  return URL_REGEX.test(url)
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is empty
 * @example
 * isEmpty(null) // true
 * isEmpty('') // true
 * isEmpty([]) // true
 * isEmpty({}) // true
 * isEmpty('hello') // false
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}
