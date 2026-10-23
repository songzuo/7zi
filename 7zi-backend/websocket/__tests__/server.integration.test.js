'use strict'

/**
 * End-to-end integration test for the WebSocket server entry point.
 *
 * Boots the real server as a child process on a random free port (never a
 * production port) and drives it with a real Socket.IO client.
 *
 * No external network access is required (127.0.0.1 only).
 */

const path = require('path')
const net = require('net')
const http = require('http')
const { spawn } = require('child_process')
const jwt = require('jsonwebtoken')

// socket.io-client is provided by the workspace root install (hoisted).
// If it is unavailable, skip the integration suite instead of failing hard.
let ioClient = null
try {
  ioClient = require('socket.io-client')
} catch {
  ioClient = null
}

const SERVER_ENTRY = path.join(__dirname, '..', '..', '..', 'server', 'websocket-server.js')
const TEST_SECRET = 'i'.repeat(64)

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

function startServer(port, env = {}) {
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: TEST_SECRET,
      LOG_LEVEL: 'error',
      ...env,
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

function httpGet(port, urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: urlPath }, res => {
        let body = ''
        res.on('data', d => {
          body += d.toString()
        })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      })
      .on('error', reject)
  })
}

/**
 * Await a socket event with a timeout that is always cleared, so no timer
 * leaks out of the test (jest would otherwise complain about open handles).
 */
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

const describeIntegration = ioClient ? describe : describe.skip

describeIntegration('websocket server (integration)', () => {
  jest.setTimeout(30000)

  let server
  let port

  beforeAll(async () => {
    port = await getFreePort()
    server = await startServer(port)
  })

  afterAll(async () => {
    if (server) {
      server.child.kill('SIGKILL')
    }
  })

  test('serves the /health endpoint', async () => {
    const res = await httpGet(port, '/health')
    expect(res.status).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.status).toBe('ok')
    expect(json.rooms).toBe(0)
  })

  test('serves the /stats endpoint', async () => {
    const res = await httpGet(port, '/stats')
    expect(res.status).toBe(200)
    const json = JSON.parse(res.body)
    expect(json).toHaveProperty('rooms')
    expect(json).toHaveProperty('connections')
  })

  test('rejects a connection with no token in strict auth mode', async () => {
    const strictPort = await getFreePort()
    const strict = await startServer(strictPort, { WS_STRICT_AUTH: 'true' })

    try {
      const socket = ioClient(`http://127.0.0.1:${strictPort}`, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      })

      const error = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(new Error('timeout waiting for connect_error')), 10000)
        socket.on('connect_error', err => {
          clearTimeout(timer)
          resolve(err)
        })
        socket.on('connect', () => {
          clearTimeout(timer)
          resolve(null)
        })
      })

      expect(error).not.toBeNull()
      expect(error.message).toMatch(/Authentication token required/)
      socket.close()
    } finally {
      strict.child.kill('SIGKILL')
    }
  })

  test('rejects an invalid token in strict auth mode', async () => {
    const strictPort = await getFreePort()
    const strict = await startServer(strictPort, { WS_STRICT_AUTH: 'true' })

    try {
      const socket = ioClient(`http://127.0.0.1:${strictPort}`, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        auth: { token: 'not-a-valid-jwt' },
      })

      const error = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(new Error('timeout waiting for connect_error')), 10000)
        socket.on('connect_error', err => {
          clearTimeout(timer)
          resolve(err)
        })
        socket.on('connect', () => {
          clearTimeout(timer)
          resolve(null)
        })
      })

      expect(error).not.toBeNull()
      expect(error.message).toMatch(/Invalid token/)
      socket.close()
    } finally {
      strict.child.kill('SIGKILL')
    }
  })

  test('accepts a valid token, joins a room and receives room:joined', async () => {
    const token = jwt.sign({ userId: 'e2e-user', name: 'E2E' }, TEST_SECRET, { expiresIn: '5m' })

    const socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: { token },
    })

    try {
      const authPayload = await waitForEvent(socket, 'auth:authenticated')

      expect(authPayload.userId).toBe('e2e-user')
      expect(authPayload.name).toBe('E2E')

      const joinedPromise = waitForEvent(socket, 'room:joined')
      socket.emit('room:join', { roomId: 'e2e-room', type: 'document', documentId: 'd1' })
      const joined = await joinedPromise

      expect(joined.roomId).toBe('e2e-room')
      expect(joined.users).toHaveLength(1)
      expect(joined.users[0].id).toBe('e2e-user')
    } finally {
      socket.close()
    }
  })
})
