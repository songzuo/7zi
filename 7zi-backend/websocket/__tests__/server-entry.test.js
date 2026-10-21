'use strict'

/**
 * Unit tests for the server entry point (server/websocket-server.js).
 *
 * The module is require-able without auto-starting the server (it only boots
 * when executed directly), so it can be imported here with a controlled
 * environment.
 */

const path = require('path')

const ENTRY = path.join(__dirname, '..', '..', '..', 'server', 'websocket-server.js')

const ORIGINAL_ENV = { ...process.env }

function loadServer(env = {}) {
  jest.resetModules()
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 's'.repeat(64),
    LOG_LEVEL: 'error',
    ...env,
  }
  // eslint-disable-next-line global-require
  return require(ENTRY)
}

describe('server/websocket-server.js (entry point)', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    jest.resetModules()
  })

  test('does not start a server when required (only when run directly)', () => {
    const mod = loadServer()
    expect(typeof mod.createServer).toBe('function')
    expect(typeof mod.startServer).toBe('function')
    expect(mod.config.PORT).toBeDefined()
    expect(mod.strictAuth).toBe(false)
  })

  test('WS_STRICT_AUTH=true enables strict authentication', () => {
    const mod = loadServer({ WS_STRICT_AUTH: 'true' })
    expect(mod.strictAuth).toBe(true)
  })

  test('WS_STRICT_AUTH is case-insensitive', () => {
    const mod = loadServer({ WS_STRICT_AUTH: 'TRUE' })
    expect(mod.strictAuth).toBe(true)
  })

  test('exposes the resolved configuration', () => {
    const mod = loadServer({
      PORT: '4567',
      NEXT_PUBLIC_SITE_URL: 'https://example.test',
      LOG_LEVEL: 'debug',
    })
    expect(mod.config.PORT).toBe(4567)
    expect(mod.config.ALLOWED_ORIGIN).toBe('https://example.test')
    expect(mod.config.LOG_LEVEL).toBe('debug')
  })

  test('exposes the validated jwt secret', () => {
    const mod = loadServer({ JWT_SECRET: 'q'.repeat(70) })
    expect(mod.jwtSecret).toBe('q'.repeat(70))
  })

  test('createServer builds an http server without listening on a port', () => {
    const mod = loadServer()
    const httpServer = mod.createServer()
    expect(httpServer).toBeDefined()
    expect(httpServer.listening).toBe(false)
    httpServer.close()
  })

  test('exposes a shared room manager instance', () => {
    const mod = loadServer()
    expect(mod.roomManager).toBeDefined()
    expect(mod.roomManager.rooms.size).toBe(0)
    expect(typeof mod.roomManager.getAllRooms).toBe('function')
  })
})
