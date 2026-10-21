'use strict'

const { test, describe, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

// We test the module in isolation by saving/restoring env and mocking process.exit
// Since getJWTSecret() may call process.exit(1) in production, we intercept it.
describe('jwt-secret', () => {
  let originalEnv
  let exitCalls

  beforeEach(() => {
    originalEnv = { ...process.env }
    exitCalls = []
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper: load fresh copy of getJWTSecret with a given env
  function loadWithEnv(env) {
    process.env = { ...originalEnv, ...env }
    // Clear require cache so module reloads with fresh env
    delete require.cache[require.resolve('../src/lib/jwt-secret.js')]
    const mod = require('../src/lib/jwt-secret.js')
    return mod.getJWTSecret
  }

  test('returns secret when JWT_SECRET is set and >= 64 chars', () => {
    const longSecret = 'a'.repeat(64)
    const fn = loadWithEnv({ JWT_SECRET: longSecret, NODE_ENV: 'development' })
    const secret = fn()
    assert.strictEqual(secret, longSecret)
  })

  test('short secret (< 64 chars) in development warns but returns it', () => {
    const shortSecret = 'only-32-chars-secret-key-here-xxxx'
    let warningLogged = false
    const origWarn = console.warn
    console.warn = (msg) => { warningLogged = true }
    try {
      const fn = loadWithEnv({ JWT_SECRET: shortSecret, NODE_ENV: 'development' })
      const secret = fn()
      assert.strictEqual(secret, shortSecret)
      assert.ok(warningLogged, 'Expected WARN for short secret in development')
    } finally {
      console.warn = origWarn
    }
  })

  test('short secret (< 64 chars) in production exits with code 1', () => {
    const shortSecret = 'only-32-chars-secret-key-here-xxxx'
    const origExit = process.exit
    process.exit = (code) => { exitCalls.push(code) }
    try {
      const fn = loadWithEnv({ JWT_SECRET: shortSecret, NODE_ENV: 'production' })
      fn()
      assert.deepStrictEqual(exitCalls, [1], 'Expected process.exit(1) for short secret in production')
    } finally {
      process.exit = origExit
    }
  })

  test('missing JWT_SECRET in development returns fallback and warns', () => {
    delete process.env.JWT_SECRET
    let warningLogged = false
    const origWarn = console.warn
    console.warn = (msg) => { warningLogged = true }
    try {
      const fn = loadWithEnv({ NODE_ENV: 'development' })
      const secret = fn()
      assert.strictEqual(secret, 'dev-only-insecure-key-do-not-use-in-production-xxxxx')
      assert.ok(warningLogged, 'Expected WARN for missing secret in development')
    } finally {
      console.warn = origWarn
    }
  })

  test('missing JWT_SECRET in production exits with code 1', () => {
    delete process.env.JWT_SECRET
    const origExit = process.exit
    process.exit = (code) => { exitCalls.push(code) }
    try {
      const fn = loadWithEnv({ NODE_ENV: 'production' })
      fn()
      assert.deepStrictEqual(exitCalls, [1], 'Expected process.exit(1) for missing secret in production')
    } finally {
      process.exit = origExit
    }
  })

  test('signed token with secret can be verified', () => {
    const jwt = require('jsonwebtoken')
    const longSecret = 'a'.repeat(64)
    const fn = loadWithEnv({ JWT_SECRET: longSecret, NODE_ENV: 'development' })
    const secret = fn()

    const token = jwt.sign({ userId: 'test-user', name: 'Alice' }, secret, { expiresIn: '1h' })
    const decoded = jwt.verify(token, secret)
    assert.strictEqual(decoded.userId, 'test-user')
    assert.strictEqual(decoded.name, 'Alice')
  })

  test('token signed with wrong secret fails verification', () => {
    const jwt = require('jsonwebtoken')
    const fn = loadWithEnv({ JWT_SECRET: 'a'.repeat(64), NODE_ENV: 'development' })
    const secret = fn()

    const token = jwt.sign({ userId: 'test-user' }, secret)
    assert.throws(() => jwt.verify(token, 'wrong-secret'), /invalid signature/)
  })
})
