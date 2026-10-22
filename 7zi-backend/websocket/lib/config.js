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
  // 支持两种端口环境变量：
  // - PORT   通用端口变量（优先级最高）
  // - WS_PORT WebSocket 专用端口变量（bin/start-all.sh 注入的就是它）
  // 两者都未设置时使用 DEFAULT_PORT，默认端口语义保持不变。
  const rawPort = env.PORT || env.WS_PORT
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
