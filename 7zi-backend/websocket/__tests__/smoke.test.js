'use strict'

/**
 * Smoke test for the WebSocket server (Jest port of the legacy
 * `websocket-service/smoke.js` script).
 *
 * The legacy script was a manual, node-only script living in the old
 * `websocket-service/` directory. It performed five checks against a running
 * server:
 *
 *   1. HTTP health check
 *   2. WebSocket connection (demo mode) -> auth:authenticated
 *   3. Join a room (room:join -> room:joined)
 *   4. Broadcast a cursor move (cursor:move)
 *   5. Leave the room (room:leave -> room:left)
 *
 * Ported here so the behaviour is covered by the Jest suite that replaces the
 * old directory. The server is booted on a random free port on 127.0.0.1, so
 * no production port can ever be touched.
 */

const path = require('path')
const net = require('net')
const { spawn } = require('child_process')

// socket.io-client is provided by the workspace root install (hoisted).
let ioClient = null
try {
  // eslint-disable-next-line global-require
  ioClient = require('socket.io-client')
} catch (_error) {
  ioClient = null
}

const SERVER_ENTRY = path.join(__dirname, '..', '..', '..', 'server', 'websocket-server.js')
const TEST_SECRET = 's'.repeat(64)

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

function startServer(port) {
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: TEST_SECRET,
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const state = { stdout: '', stderr: '' }
  child.stdout.on('data', d => {
    state.stdout += d.toString()
  })
  child.stderr.on('data', d => {
    state.stderr += d.toString()
  })

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 15000)
    const check = setInterval(() => {
      if (state.stdout.includes('WebSocket Server Started')) {
        clearTimeout(timer)
        clearInterval(check)
        resolve({ child, state })
      }
    }, 100)
    child.on('error', reject)
    child.on('exit', code => {
      clearTimeout(timer)
      clearInterval(check)
      reject(new Error(`server exited early (${code}): ${state.stderr}`))
    })
  })
}

function httpHealthCheck(port) {
  return new Promise(resolve => {
    const req = require('http').get(
      { host: '127.0.0.1', port, path: '/health' },
      res => {
        let body = ''
        res.on('data', d => {
          body += d.toString()
        })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }
    )
    req.on('error', () => resolve({ status: 0, body: '' }))
    req.setTimeout(10000, () => {
      req.destroy()
      resolve({ status: 0, body: '' })
    })
  })
}

/** Await a socket event with a timeout, always clearing the timer. */
function waitForEvent(socket, event, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      reject(new Error(`timeout waiting for ${event}`))
    }, timeoutMs)

    function onEvent(payload) {
      clearTimeout(timer)
      resolve(payload)
    }

    socket.on(event, onEvent)
  })
}

const describeSmoke = ioClient ? describe : describe.skip

describeSmoke('websocket server (smoke)', () => {
  jest.setTimeout(30000)

  let server
  let port

  beforeAll(async () => {
    port = await getFreePort()
    server = await startServer(port)
  })

  afterAll(() => {
    if (server) server.child.kill('SIGKILL')
  })

  test('[1/5] HTTP health check returns status ok', async () => {
    const res = await httpHealthCheck(port)

    expect(res.status).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(typeof body.rooms).toBe('number')
    expect(typeof body.connections).toBe('number')
  })

  test('[2/5] connects in demo mode and receives auth:authenticated', async () => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { userId: 'smoke-test-user', userName: 'SmokeTestUser' },
    })

    try {
      const payload = await waitForEvent(socket, 'auth:authenticated')

      expect(payload.userId).toBe('smoke-test-user')
      expect(payload.name).toBe('SmokeTestUser')
    } finally {
      socket.close()
    }
  })

  test('[3/5] joins a room and receives room:joined', async () => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { userId: 'smoke-test-user', userName: 'SmokeTestUser' },
    })

    try {
      await waitForEvent(socket, 'auth:authenticated')

      const joinedPromise = waitForEvent(socket, 'room:joined')
      socket.emit('room:join', {
        roomId: 'smoke-test-room',
        type: 'document',
        documentId: 'smoke-doc-1',
        name: 'Smoke Test Room',
      })
      const joined = await joinedPromise

      expect(joined.roomId).toBe('smoke-test-room')
      expect(joined.users).toHaveLength(1)
    } finally {
      socket.close()
    }
  })

  test('[4/5] broadcasts a cursor move without error', async () => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { userId: 'smoke-test-user', userName: 'SmokeTestUser' },
    })

    try {
      await waitForEvent(socket, 'auth:authenticated')

      const joinedPromise = waitForEvent(socket, 'room:joined')
      socket.emit('room:join', {
        roomId: 'smoke-cursor-room',
        type: 'document',
        documentId: 'smoke-doc-2',
        name: 'Smoke Cursor Room',
      })
      await joinedPromise

      // cursor:move is fire-and-forget: it must not raise a server-side error.
      const errorPromise = new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), 2000)
        socket.on('system:error', err => {
          clearTimeout(timer)
          resolve(err)
        })
      })

      socket.emit('cursor:move', {
        roomId: 'smoke-cursor-room',
        position: 100,
        selection: null,
      })

      expect(await errorPromise).toBeNull()
    } finally {
      socket.close()
    }
  })

  test('[5/5] leaves the room cleanly and receives room:left', async () => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { userId: 'smoke-test-user', userName: 'SmokeTestUser' },
    })

    try {
      await waitForEvent(socket, 'auth:authenticated')

      const joinedPromise = waitForEvent(socket, 'room:joined')
      socket.emit('room:join', {
        roomId: 'smoke-leave-room',
        type: 'document',
        documentId: 'smoke-doc-3',
        name: 'Smoke Leave Room',
      })
      await joinedPromise

      const leftPromise = waitForEvent(socket, 'room:left')
      socket.emit('room:leave', { roomId: 'smoke-leave-room' })
      const left = await leftPromise

      expect(left.roomId).toBe('smoke-leave-room')
    } finally {
      socket.close()
    }
  })
})
