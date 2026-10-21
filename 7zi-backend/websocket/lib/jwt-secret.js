'use strict'

/**
 * JWT secret validation.
 *
 * Extracted from websocket-server.js (getJWTSecret) so it can be unit tested
 * without booting a server. Behaviour is identical to the original inline
 * implementation:
 *
 *   - production + missing secret  -> console.error('[FATAL] ...') + exit(1)
 *   - non-production + missing     -> console.warn + insecure dev fallback key
 *   - secret shorter than 64 chars -> console.warn (does NOT exit)
 *
 * @param {object}  [options]
 * @param {object}  [options.env]      environment to read (default: process.env)
 * @param {function}[options.exit]     exit function (default: process.exit)
 * @param {function}[options.logger]   logger with .warn/.error (default: console)
 * @returns {string} the validated secret
 */
const MIN_SECRET_LENGTH = 64
const DEV_FALLBACK_SECRET = 'dev-only-insecure-key-do-not-use-in-production-xxxxx'

function getJWTSecret(options = {}) {
  const env = options.env || process.env
  const exit = options.exit || process.exit
  const logger = options.logger || console

  const secret = env.JWT_SECRET
  const isProduction = env.NODE_ENV === 'production'

  if (!secret) {
    if (isProduction) {
      logger.error('[FATAL] JWT_SECRET environment variable is required in production.')
      logger.error(
        '[FATAL] Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      )
      exit(1)
      // process.exit() terminates, but keep a return for injected/mock exits.
      return undefined
    }
    logger.warn('[WARN] JWT_SECRET not set. Using insecure development key. DO NOT use in production!')
    return DEV_FALLBACK_SECRET
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    logger.warn(
      `[WARN] JWT_SECRET is too short (${secret.length} chars). Minimum ${MIN_SECRET_LENGTH} recommended for HS256.`
    )
  }

  return secret
}

module.exports = { getJWTSecret, MIN_SECRET_LENGTH, DEV_FALLBACK_SECRET }
