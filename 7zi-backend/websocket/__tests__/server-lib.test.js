'use strict'

/**
 * Unit tests for websocket/lib/server.js - the HTTP + Socket.IO server factory.
 *
 * The server is created but never bound to a production port; when a port is
 * needed the test uses port 0 (ephemeral) and closes it immediately.
 */

const http = require('http')
const {
  createTestRoomManager,
  createSilentLogger,
  createRecordingLogger,
} = require('./helpers')

const {
  createServer,
  HEARTBEAT_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  ROOM_CLEANUP_INTERVAL_MS,
} = require('../lib/server')

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, res => {
        let body = ''
        res.on('data', d => {
          body += d.toString()
        })
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
      })
      .on('error', reject)
  })
}

function listen(httpServer) {
  return new Promise(resolve => {
    httpServer.listen(0, '127.0.0.1', () => resolve(httpServer.address().port))
  })
}

describe('lib/server', () => {
  let manager
  let httpServer
  let io

  afterEach(async () => {
    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve))
      httpServer = null
    }
    if (manager) {
      manager.disposeAllTimers()
      manager = null
    }
  })

  function build(overrides = {}) {
    manager = createTestRoomManager()
    const result = createServer({
      roomManager: manager,
      authenticateSocket: (socket, next) => next(),
      logger: createSilentLogger(),
      config: { ALLOWED_ORIGIN: 'http://localhost:3000' },
      ...overrides,
    })
    httpServer = result.httpServer
    io = result.io
    return result
  }

  test('creates an http server that is not listening yet', () => {
    build()
    expect(httpServer).toBeDefined()
    expect(httpServer.listening).toBe(false)
    expect(io).toBeDefined()
  })

  test('serves the /health endpoint', async () => {
    build()
    const port = await listen(httpServer)

    const res = await httpGet(port, '/health')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    const json = JSON.parse(res.body)
    expect(json.status).toBe('ok')
    expect(json.rooms).toBe(0)
    expect(json.roomCount).toBe(0)
    expect(json.connections).toBe(0)
    expect(json.timestamp).toEqual(expect.any(String))
  })

  test('serves the /stats endpoint', async () => {
    build()
    const port = await listen(httpServer)

    const res = await httpGet(port, '/stats')

    expect(res.status).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.connections).toBe(0)
    expect(json.totalUsers).toBe(0)
    // FIXED (was DEFECT-01): the /stats payload used to declare `rooms` twice
    // (rooms.length then rooms), so JSON.stringify kept the LAST one and the
    // room COUNT was unreachable by clients.
    // Now the count lives under `roomCount` and `rooms` holds the array.
    expect(Array.isArray(json.rooms)).toBe(true)
    expect(json.rooms).toEqual([])
    expect(json.roomCount).toBe(0)
  })

  test('/stats exposes the room array AND the room count at the same time', async () => {
    build()
    const roomA = manager.ensureRoom('room-a', 'document', 'd1')
    manager.addUserToRoom(roomA, { id: 'u1', name: 'Alice' })
    const roomB = manager.ensureRoom('room-b', 'document', 'd2')
    manager.addUserToRoom(roomB, { id: 'u2', name: 'Bob' })
    manager.addUserToRoom(roomB, { id: 'u3', name: 'Carol' })
    const port = await listen(httpServer)

    const res = await httpGet(port, '/stats')
    const json = JSON.parse(res.body)

    // 房间数量：与 roomCount 一致，且与数组长度一致
    expect(json.roomCount).toBe(2)
    // 房间数组：仍然是数组，且没有被数量覆盖
    expect(Array.isArray(json.rooms)).toBe(true)
    expect(json.rooms).toHaveLength(json.roomCount)
    expect(json.rooms.map(r => r.id).sort()).toEqual(['room-a', 'room-b'])
    // 用户总数仍然正确
    expect(json.totalUsers).toBe(3)
    // 旧的重复键不能残留
    expect(Object.keys(json).filter(k => k === 'rooms')).toHaveLength(1)
  })

  test('serves a plain-text default response for unknown paths', async () => {
    build()
    const port = await listen(httpServer)

    const res = await httpGet(port, '/whatever')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.body).toMatch(/WebSocket server is running/)
  })

  test('the /stats endpoint reflects the current room state', async () => {
    build()
    const room = manager.ensureRoom('stats-room', 'document', 'd1')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })
    const port = await listen(httpServer)

    const res = await httpGet(port, '/stats')
    const json = JSON.parse(res.body)

    // FIXED (was DEFECT-01): `rooms` is the array, `roomCount` is the count.
    expect(json.totalUsers).toBe(1)
    expect(json.rooms).toHaveLength(1)
    expect(json.rooms[0]).toMatchObject({ id: 'stats-room', userCount: 1 })
    expect(json.roomCount).toBe(1)
  })

  test('the /health endpoint reports the room count', async () => {
    build()
    manager.ensureRoom('health-room', 'document', 'd1')
    const port = await listen(httpServer)

    const res = await httpGet(port, '/health')
    const json = JSON.parse(res.body)
    expect(json.rooms).toBe(1)
    // /health 的房间数量同样以 roomCount 暴露，`rooms` 保留为向后兼容别名
    expect(json.roomCount).toBe(1)
  })

  test('configures Socket.IO with the expected CORS and ping options', () => {
    build({ config: { ALLOWED_ORIGIN: 'https://7zi.com' } })

    const opts = io.opts
    expect(opts.cors.origin).toBe('https://7zi.com')
    expect(opts.cors.methods).toEqual(['GET', 'POST'])
    expect(opts.cors.credentials).toBe(true)
    expect(opts.transports).toEqual(['websocket', 'polling'])
    expect(opts.pingTimeout).toBe(120000)
    expect(opts.pingInterval).toBe(25000)
    expect(opts.maxHttpBufferSize).toBe(1e8)
  })

  test('registers the authentication middleware', async () => {
    const authenticate = jest.fn((socket, next) => next())
    build({ authenticateSocket: authenticate })

    expect(authenticate).not.toHaveBeenCalled()
    expect(io.use).toBeDefined()
  })

  test('works without an authentication middleware', () => {
    expect(() => build({ authenticateSocket: undefined })).not.toThrow()
  })

  test('registers the connection handler that wires the socket handlers', () => {
    const setupSocketHandlers = jest.fn()
    build({ setupSocketHandlers })

    expect(setupSocketHandlers).not.toHaveBeenCalled()
  })

  test('exposes the heartbeat and cleanup interval constants', () => {
    expect(HEARTBEAT_TIMEOUT_MS).toBe(60000)
    expect(HEARTBEAT_INTERVAL_MS).toBe(10000)
    expect(ROOM_CLEANUP_INTERVAL_MS).toBe(60000)
  })

  test('closing the http server stops the internal intervals', async () => {
    const logger = createRecordingLogger()
    build({ logger })
    await listen(httpServer)

    await new Promise(resolve => httpServer.close(resolve))
    httpServer = null

    // The interval callbacks must not run after close.
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(logger.records.warn.filter(r => /heartbeat timeout/.test(r.msg))).toHaveLength(0)
  })

  test('the default logger fallback is console', () => {
    manager = createTestRoomManager()
    const result = createServer({
      roomManager: manager,
      config: {},
    })
    httpServer = result.httpServer
    expect(result.io).toBeDefined()
  })

  describe('background intervals', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('the heartbeat monitor disconnects sockets that stopped sending heartbeats', () => {
      const logger = createRecordingLogger()
      build({ logger })

      const staleSocket = {
        id: 'stale-socket',
        data: { lastHeartbeat: Date.now() - (HEARTBEAT_TIMEOUT_MS + 1000), user: { id: 'u-stale' } },
        disconnect: jest.fn(),
      }
      const freshSocket = {
        id: 'fresh-socket',
        data: { lastHeartbeat: Date.now(), user: { id: 'u-fresh' } },
        disconnect: jest.fn(),
      }

      // Pretend both sockets are connected.
      io.sockets.sockets.set(staleSocket.id, staleSocket)
      io.sockets.sockets.set(freshSocket.id, freshSocket)

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)

      expect(staleSocket.disconnect).toHaveBeenCalledWith(true)
      expect(freshSocket.disconnect).not.toHaveBeenCalled()
      expect(logger.records.warn.map(r => r.msg).join(' ')).toMatch(/heartbeat timeout/)
    })

    test('the heartbeat monitor treats a socket without a heartbeat as stale', () => {
      const logger = createRecordingLogger()
      build({ logger })

      const noHeartbeatSocket = {
        id: 'no-hb-socket',
        data: { user: { id: 'u-nohb' } },
        disconnect: jest.fn(),
      }
      io.sockets.sockets.set(noHeartbeatSocket.id, noHeartbeatSocket)

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)

      expect(noHeartbeatSocket.disconnect).toHaveBeenCalledWith(true)
    })

    test('the room cleanup check logs the current room statistics', () => {
      const logger = createRecordingLogger()
      build({ logger })

      const room = manager.ensureRoom('cleanup-room', 'document', 'd1')
      manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

      jest.advanceTimersByTime(ROOM_CLEANUP_INTERVAL_MS)

      const cleanupLogs = logger.records.debug.filter(r => /Room cleanup check/.test(r.msg))
      expect(cleanupLogs).toHaveLength(1)
      expect(cleanupLogs[0].data).toMatchObject({ roomCount: 1, totalUsers: 1 })
    })

    test('the connection handler invokes the socket handler setup', () => {
      const setupSocketHandlers = jest.fn()
      build({ setupSocketHandlers })

      const fakeSocket = { id: 'conn-socket', data: {} }
      // Drive the local 'connection' listener directly (io.emit would go
      // through the adapter and never reach the in-process listener).
      io.listeners('connection').forEach(listener => listener(fakeSocket))

      expect(setupSocketHandlers).toHaveBeenCalledWith(fakeSocket)
    })

    test('the connection handler tolerates a missing socket handler setup', () => {
      build({ setupSocketHandlers: undefined })
      expect(() =>
        io.listeners('connection').forEach(listener => listener({ id: 'x', data: {} }))
      ).not.toThrow()
    })
  })
})
