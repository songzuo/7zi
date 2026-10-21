'use strict'

/**
 * Unit tests for websocket/lib/config.js
 */

const { config: { loadConfig, DEFAULT_PORT, DEFAULT_ALLOWED_ORIGIN, DEFAULT_LOG_LEVEL } } = require('./helpers')

describe('lib/config', () => {
  test('uses defaults when no env is provided', () => {
    const cfg = loadConfig({})
    expect(cfg.PORT).toBe(DEFAULT_PORT)
    expect(cfg.ALLOWED_ORIGIN).toBe(DEFAULT_ALLOWED_ORIGIN)
    expect(cfg.LOG_LEVEL).toBe(DEFAULT_LOG_LEVEL)
  })

  test('reads PORT, NEXT_PUBLIC_SITE_URL and LOG_LEVEL from the env', () => {
    const cfg = loadConfig({
      PORT: '4001',
      NEXT_PUBLIC_SITE_URL: 'https://7zi.com',
      LOG_LEVEL: 'debug',
    })
    expect(cfg.PORT).toBe(4001)
    expect(cfg.ALLOWED_ORIGIN).toBe('https://7zi.com')
    expect(cfg.LOG_LEVEL).toBe('debug')
  })

  test('PORT=0 is preserved (ephemeral port for tests)', () => {
    expect(loadConfig({ PORT: '0' }).PORT).toBe(0)
  })

  test('falls back to the default port for a non-numeric PORT', () => {
    expect(loadConfig({ PORT: 'not-a-port' }).PORT).toBe(DEFAULT_PORT)
  })

  test('falls back to the default port for an empty PORT', () => {
    expect(loadConfig({ PORT: '' }).PORT).toBe(DEFAULT_PORT)
  })

  test('reads from process.env by default', () => {
    const original = process.env.PORT
    process.env.PORT = '4321'
    try {
      expect(loadConfig().PORT).toBe(4321)
    } finally {
      if (original === undefined) delete process.env.PORT
      else process.env.PORT = original
    }
  })
})
