'use strict'

/**
 * WebSocket server configuration.
 *
 * Pure module: reads from an injectable env object so it can be unit tested
 * without touching process.env.
 */

const DEFAULT_PORT = 3002
const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000'
const DEFAULT_LOG_LEVEL = 'info'

function loadConfig(env = process.env) {
  const rawPort = env.PORT
  const parsedPort = Number.parseInt(rawPort, 10)

  return {
    PORT: Number.isFinite(parsedPort) ? parsedPort : DEFAULT_PORT,
    ALLOWED_ORIGIN: env.NEXT_PUBLIC_SITE_URL || DEFAULT_ALLOWED_ORIGIN,
    LOG_LEVEL: env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
  }
}

module.exports = {
  loadConfig,
  DEFAULT_PORT,
  DEFAULT_ALLOWED_ORIGIN,
  DEFAULT_LOG_LEVEL,
}
