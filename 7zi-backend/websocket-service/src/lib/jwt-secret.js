'use strict'

/**
 * JWT Secret validation utility.
 *
 * Security policy:
 * - Production (NODE_ENV=production): missing secret → FATAL exit(1); short secret → error log
 * - Development: missing secret → WARN + fallback; short secret → WARN
 * - Minimum recommended key length: 64 chars (for HS256)
 */

const MIN_SECRET_LENGTH = 64

/**
 * Returns the configured JWT_SECRET after validation.
 *
 * In production (NODE_ENV=production):
 *   - Missing secret → console.error FATAL + process.exit(1)
 *   - Secret < 64 chars → console.error + continue (still exits for missing)
 * In development:
 *   - Missing secret → console.warn + returns dev-only fallback
 *   - Secret < 64 chars → console.warn + returns the short secret
 *
 * @returns {string} The validated JWT secret
 */
function getJWTSecret() {
  const secret = process.env.JWT_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  if (!secret) {
    if (isProduction) {
      console.error('[FATAL] JWT_SECRET environment variable is required in production.')
      console.error('[FATAL] Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
      process.exit(1)
    }
    console.warn('[WARN] JWT_SECRET not set. Using insecure development key. DO NOT use in production!')
    return 'dev-only-insecure-key-do-not-use-in-production-xxxxx'
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      console.error(`[ERROR] JWT_SECRET is too short (${secret.length} chars). Minimum ${MIN_SECRET_LENGTH} chars recommended for HS256.`)
      process.exit(1)
    }
    console.warn(`[WARN] JWT_SECRET is too short (${secret.length} chars). Minimum ${MIN_SECRET_LENGTH} chars recommended for HS256.`)
  }

  return secret
}

module.exports = { getJWTSecret, MIN_SECRET_LENGTH }
