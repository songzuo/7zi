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

  // 回归测试：bin/start-all.sh 注入的是 WS_PORT，之前 config 只读 PORT，
  // 导致 WS_PORT 被静默忽略、WebSocket 落到默认端口 3002。
  describe('WS_PORT support', () => {
    test('reads WS_PORT when PORT is not set', () => {
      expect(loadConfig({ WS_PORT: '3010' }).PORT).toBe(3010)
    })

    test('PORT takes precedence over WS_PORT when both are set', () => {
      expect(loadConfig({ PORT: '4001', WS_PORT: '3010' }).PORT).toBe(4001)
    })

    test('falls back to WS_PORT when PORT is an empty string', () => {
      expect(loadConfig({ PORT: '', WS_PORT: '3010' }).PORT).toBe(3010)
    })

    test('falls back to the default port when neither PORT nor WS_PORT is set', () => {
      expect(loadConfig({}).PORT).toBe(DEFAULT_PORT)
      expect(loadConfig({ PORT: '', WS_PORT: '' }).PORT).toBe(DEFAULT_PORT)
    })

    test('falls back to the default port for a non-numeric WS_PORT', () => {
      expect(loadConfig({ WS_PORT: 'not-a-port' }).PORT).toBe(DEFAULT_PORT)
    })

    test('reads WS_PORT from process.env by default', () => {
      const originalPort = process.env.PORT
      const originalWsPort = process.env.WS_PORT
      delete process.env.PORT
      process.env.WS_PORT = '3010'
      try {
        expect(loadConfig().PORT).toBe(3010)
      } finally {
        if (originalPort === undefined) delete process.env.PORT
        else process.env.PORT = originalPort
        if (originalWsPort === undefined) delete process.env.WS_PORT
        else process.env.WS_PORT = originalWsPort
      }
    })
  })
})
