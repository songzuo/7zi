'use strict'

/**
 * Unit tests for websocket/lib/auth.js - JWT authentication flow.
 *
 * Strict mode (allowDemoMode: false):
 *   missing / malformed / expired / wrong-signature / userId-less tokens are
 *   rejected; a valid token populates socket.data.user.
 *
 * Demo mode (allowDemoMode: true) reproduces the historical behaviour of
 * websocket-server.js, where invalid tokens were silently accepted.
 */

const jwt = require('jsonwebtoken')
const { auth, TEST_SECRET, createRecordingLogger, signToken } = require('./helpers')

function createSocket(handshakeAuth) {
  return {
    id: 'socket-auth',
    handshake: { auth: handshakeAuth || {} },
    data: {},
  }
}

describe('lib/auth - strict mode', () => {
  function makeAuthenticator(overrides = {}) {
    return auth.createAuthenticator({
      jwtSecret: TEST_SECRET,
      allowDemoMode: false,
      logger: createRecordingLogger(),
      randomId: () => 'random-user-id',
      ...overrides,
    })
  }

  test('rejects a connection with no token', async () => {
    const next = jest.fn()
    const socket = createSocket({})

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/Authentication token required/)
    expect(socket.data.user).toBeUndefined()
  })

  test('rejects a malformed token', async () => {
    const next = jest.fn()
    const socket = createSocket({ token: 'not-a-jwt' })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toMatch(/Invalid token/)
    expect(socket.data.user).toBeUndefined()
  })

  test('rejects a token signed with the wrong secret', async () => {
    const next = jest.fn()
    const socket = createSocket({
      token: jwt.sign({ userId: 'u1' }, 'another-secret-that-is-long-enough-xxxx'),
    })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toMatch(/Invalid token/)
    expect(socket.data.user).toBeUndefined()
  })

  test('rejects an expired token', async () => {
    const next = jest.fn()
    const expired = jwt.sign({ userId: 'u1' }, TEST_SECRET, { expiresIn: '-10s' })
    const socket = createSocket({ token: expired })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toMatch(/Invalid token/)
    expect(socket.data.user).toBeUndefined()
  })

  test('rejects a validly signed token that has no userId claim', async () => {
    const next = jest.fn()
    const socket = createSocket({ token: signToken({ role: 'admin' }) })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toMatch(/Invalid token/)
    expect(socket.data.user).toBeUndefined()
  })

  test('accepts a valid token and populates socket.data.user', async () => {
    const next = jest.fn()
    const socket = createSocket({
      token: signToken({
        userId: 'user-42',
        name: 'Alice',
        email: 'alice@example.com',
        avatar: 'https://example.com/a.png',
      }),
    })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user).toEqual({
      id: 'user-42',
      name: 'Alice',
      email: 'alice@example.com',
      avatar: 'https://example.com/a.png',
    })
    expect(socket.data.rooms).toBeInstanceOf(Set)
    expect(typeof socket.data.lastHeartbeat).toBe('number')
  })

  test('falls back to userId as display name when the token has no name', async () => {
    const next = jest.fn()
    const socket = createSocket({ token: signToken({ userId: 'user-7' }) })

    await makeAuthenticator()(socket, next)

    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user.name).toBe('user-7')
  })

  test('rejects with Invalid token when an unexpected internal error occurs', async () => {
    const next = jest.fn()
    const socket = createSocket({ token: 'anything' })

    // A socket without a `handshake` object makes the middleware throw
    // before it can classify the failure.
    const brokenSocket = { id: 'socket-auth', handshake: null, data: {} }

    await makeAuthenticator()(brokenSocket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toMatch(/Invalid token/)
    expect(socket.data.user).toBeUndefined()
  })
})

describe('lib/auth - demo mode (legacy behaviour)', () => {
  function makeAuthenticator() {
    return auth.createAuthenticator({
      jwtSecret: TEST_SECRET,
      allowDemoMode: true,
      logger: createRecordingLogger(),
      randomId: () => 'random-user-id',
    })
  }

  test('accepts a connection with no token and creates a demo user', async () => {
    const next = jest.fn()
    const socket = createSocket({ userId: 'demo-1', userName: 'Demo' })

    await makeAuthenticator()(socket, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user.id).toBe('demo-1')
    expect(socket.data.user.name).toBe('Demo')
    expect(socket.data.user.email).toBe('demo-1@demo.local')
  })

  test('generates a random demo id when none is supplied', async () => {
    const next = jest.fn()
    const socket = createSocket({})

    await makeAuthenticator()(socket, next)

    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user.id).toBe('random-user-id')
  })

  test('accepts an invalid token and falls back to a demo user', async () => {
    const next = jest.fn()
    const socket = createSocket({ token: 'garbage', userId: 'demo-2' })

    await makeAuthenticator()(socket, next)

    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user.id).toBe('demo-2')
  })

  test('accepts an expired token and falls back to a demo user', async () => {
    const next = jest.fn()
    const expired = jwt.sign({ userId: 'u1' }, TEST_SECRET, { expiresIn: '-10s' })
    const socket = createSocket({ token: expired, userId: 'demo-3' })

    await makeAuthenticator()(socket, next)

    expect(next.mock.calls[0][0]).toBeUndefined()
    expect(socket.data.user.id).toBe('demo-3')
  })
})
