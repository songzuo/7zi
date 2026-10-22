'use strict'

/**
 * Unit tests for websocket/lib/jwt-secret.js
 *
 * Covers:
 *  - missing JWT_SECRET in production -> FATAL + exit(1)
 *  - missing JWT_SECRET in development -> warn + insecure fallback key
 *  - short secret -> warning, secret still returned
 *  - valid secret returned unchanged
 */

const {
  jwtSecret: { getJWTSecret, MIN_SECRET_LENGTH, DEV_FALLBACK_SECRET },
  createRecordingLogger,
  TEST_SECRET,
} = require('./helpers')

describe('lib/jwt-secret', () => {
  test('returns the configured secret unchanged when it is long enough', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()

    const secret = getJWTSecret({
      env: { JWT_SECRET: TEST_SECRET, NODE_ENV: 'production' },
      exit,
      logger,
    })

    expect(secret).toBe(TEST_SECRET)
    expect(exit).not.toHaveBeenCalled()
    expect(logger.records.warn).toHaveLength(0)
  })

  test('exits with code 1 when JWT_SECRET is missing in production', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()

    getJWTSecret({
      env: { NODE_ENV: 'production' },
      exit,
      logger,
    })

    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(1)
    expect(logger.messages('error')).toMatch(/JWT_SECRET environment variable is required in production/)
    expect(logger.messages('error')).toMatch(/randomBytes\(64\)/)
  })

  test('falls back to an insecure dev key and warns when JWT_SECRET is missing in development', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()

    const secret = getJWTSecret({
      env: { NODE_ENV: 'development' },
      exit,
      logger,
    })

    expect(secret).toBe(DEV_FALLBACK_SECRET)
    expect(exit).not.toHaveBeenCalled()
    expect(logger.messages('warn')).toMatch(/JWT_SECRET not set/)
  })

  test('falls back to the dev key when NODE_ENV is undefined (non-production)', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()

    const secret = getJWTSecret({ env: {}, exit, logger })

    expect(secret).toBe(DEV_FALLBACK_SECRET)
    expect(exit).not.toHaveBeenCalled()
  })

  test('warns but still returns a secret shorter than the recommended minimum', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()
    const short = 'short-secret'

    // 非生产环境：短密钥只告警，不退出（行为不变）
    const secret = getJWTSecret({
      env: { JWT_SECRET: short, NODE_ENV: 'development' },
      exit,
      logger,
    })

    expect(secret).toBe(short)
    expect(exit).not.toHaveBeenCalled()
    expect(logger.messages('warn')).toMatch(/too short/)
    expect(logger.messages('warn')).toContain(String(short.length))
  })

  test('warns but still returns a short secret when NODE_ENV is undefined (non-production)', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()
    const short = 'short-secret'

    const secret = getJWTSecret({
      env: { JWT_SECRET: short },
      exit,
      logger,
    })

    expect(secret).toBe(short)
    expect(exit).not.toHaveBeenCalled()
    expect(logger.messages('warn')).toMatch(/too short/)
  })

  test('exits with code 1 when JWT_SECRET is shorter than the minimum in production', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()
    const short = 'short-secret'

    getJWTSecret({
      env: { JWT_SECRET: short, NODE_ENV: 'production' },
      exit,
      logger,
    })

    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(1)
    expect(logger.messages('error')).toMatch(/too short/)
    expect(logger.messages('error')).toContain(String(short.length))
  })

  test('does not warn (only errors) for a short secret in production', () => {
    const logger = createRecordingLogger()
    const exit = jest.fn()

    getJWTSecret({
      env: { JWT_SECRET: 'x'.repeat(MIN_SECRET_LENGTH - 1), NODE_ENV: 'production' },
      exit,
      logger,
    })

    expect(exit).toHaveBeenCalledWith(1)
    expect(logger.records.warn).toHaveLength(0)
    expect(logger.records.error.length).toBeGreaterThan(0)
  })

  test('does not warn for a secret of exactly the minimum length', () => {
    const logger = createRecordingLogger()
    const exact = 'x'.repeat(MIN_SECRET_LENGTH)

    const secret = getJWTSecret({
      env: { JWT_SECRET: exact, NODE_ENV: 'production' },
      exit: jest.fn(),
      logger,
    })

    expect(secret).toBe(exact)
    expect(logger.records.warn).toHaveLength(0)
  })

  // ── 旧目录 websocket-service/test/jwt-secret.test.js 行为迁移 ──

  test('a token signed with the returned secret can be verified', () => {
    // 迁移自旧目录用例：签发 -> 校验闭环必须成立
    const jwt = require('jsonwebtoken')
    const logger = createRecordingLogger()
    const longSecret = 'a'.repeat(MIN_SECRET_LENGTH)

    const secret = getJWTSecret({
      env: { JWT_SECRET: longSecret, NODE_ENV: 'development' },
      exit: jest.fn(),
      logger,
    })

    const token = jwt.sign({ userId: 'test-user', name: 'Alice' }, secret, { expiresIn: '1h' })
    const decoded = jwt.verify(token, secret)

    expect(decoded.userId).toBe('test-user')
    expect(decoded.name).toBe('Alice')
  })

  test('a token signed with a different secret fails verification', () => {
    // 迁移自旧目录用例：签名校验必须拒绝错误密钥
    const jwt = require('jsonwebtoken')
    const logger = createRecordingLogger()

    const secret = getJWTSecret({
      env: { JWT_SECRET: 'a'.repeat(MIN_SECRET_LENGTH), NODE_ENV: 'development' },
      exit: jest.fn(),
      logger,
    })

    const token = jwt.sign({ userId: 'test-user' }, secret)

    expect(() => jwt.verify(token, 'wrong-secret')).toThrow(/invalid signature/)
  })
})
