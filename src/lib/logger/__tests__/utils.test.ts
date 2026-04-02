/**
// @ts-expect-error - Mock type compatibility issues
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  createLogEntry,
  sanitize,
  shouldLog,
  LOG_LEVEL_PRIORITY,
  STYLE_PREFIXES,
  type LogLevel,
  type LogCategory,
  type LoggerConfig,
} from '../utils'

describe('logger/utils', () => {
  describe('LOG_LEVEL_PRIORITY', () => {
    it('should have correct priority levels', () => {
      expect(LOG_LEVEL_PRIORITY.debug).toBe(0)
      expect(LOG_LEVEL_PRIORITY.info).toBe(1)
      expect(LOG_LEVEL_PRIORITY.warn).toBe(2)
      expect(LOG_LEVEL_PRIORITY.error).toBe(3)
      expect(LOG_LEVEL_PRIORITY.fatal).toBe(4)
    })

    it('should have ascending priorities', () => {
      expect(LOG_LEVEL_PRIORITY.debug < LOG_LEVEL_PRIORITY.info).toBe(true)
      expect(LOG_LEVEL_PRIORITY.info < LOG_LEVEL_PRIORITY.warn).toBe(true)
      expect(LOG_LEVEL_PRIORITY.warn < LOG_LEVEL_PRIORITY.error).toBe(true)
      expect(LOG_LEVEL_PRIORITY.error < LOG_LEVEL_PRIORITY.fatal).toBe(true)
    })
  })

  describe('STYLE_PREFIXES', () => {
    it('should have ANSI color codes for all log levels', () => {
      expect(STYLE_PREFIXES.debug).toContain('\x1b[36m') // Cyan
      expect(STYLE_PREFIXES.info).toContain('\x1b[32m') // Green
      expect(STYLE_PREFIXES.warn).toContain('\x1b[33m') // Yellow
      expect(STYLE_PREFIXES.error).toContain('\x1b[31m') // Red
      expect(STYLE_PREFIXES.fatal).toContain('\x1b[35m') // Magenta
    })

    it('should contain level names in brackets', () => {
      expect(STYLE_PREFIXES.debug).toContain('[DEBUG]')
      expect(STYLE_PREFIXES.info).toContain('[INFO]')
      expect(STYLE_PREFIXES.warn).toContain('[WARN]')
      expect(STYLE_PREFIXES.error).toContain('[ERROR]')
      expect(STYLE_PREFIXES.fatal).toContain('[FATAL]')
    })

    it('should reset ANSI codes', () => {
      Object.values(STYLE_PREFIXES).forEach(prefix => {
        expect(prefix).toContain('\x1b[0m')
      })
    })
  })

  describe('createLogEntry', () => {
    it('should create a basic log entry', () => {
      const entry = createLogEntry('info', 'app', 'Test message')

      expect(entry.level).toBe('info')
      expect(entry.category).toBe('app')
      expect(entry.message).toBe('Test message')
      expect(entry.timestamp).toBeDefined()
      expect(entry.data).toBeUndefined()
      expect(entry.error).toBeUndefined()
      expect(entry.context).toBeUndefined()
    })

    it('should create log entry with data', () => {
      const data = { userId: '123', action: 'login' }
      const entry = createLogEntry('info', 'app', 'User logged in', data)

      expect(entry.data).toEqual(data)
      expect(entry.data).toBeDefined()
    })

    it('should create log entry with error', () => {
      const error = new Error('Test error')
      const entry = createLogEntry('error', 'app', 'An error occurred', undefined, error)

      expect(entry.error).toBe(error)
      expect(entry.error).toBeDefined()
    })

    it('should create log entry with context', () => {
      const context = { userId: '123', requestId: 'abc' }
      const entry = createLogEntry('info', 'app', 'Test message', undefined, undefined, context)

      expect(entry.context).toEqual(context)
      expect(entry.context).toBeDefined()
    })

    it('should create log entry with all parameters', () => {
      const data = { test: 'value' }
      const error = new Error('Test')
      const context = { userId: '123' }
      const entry = createLogEntry('warn', 'api', 'Warning message', data, error, context)

      expect(entry.level).toBe('warn')
      expect(entry.category).toBe('api')
      expect(entry.message).toBe('Warning message')
      expect(entry.data).toEqual(data)
      expect(entry.error).toBe(error)
      expect(entry.context).toEqual(context)
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should generate ISO 8601 timestamp', () => {
      const beforeTime = Date.now()
      const entry = createLogEntry('info', 'app', 'Test')
      const afterTime = Date.now()

      const entryTime = new Date(entry.timestamp).getTime()
      expect(entryTime).toBeGreaterThanOrEqual(beforeTime)
      expect(entryTime).toBeLessThanOrEqual(afterTime)
    })

    it('should sanitize data with default empty sanitize fields', () => {
      const data = { password: 'secret', token: 'abc123' }
      const entry = createLogEntry('info', 'app', 'Test', data)

      // Default sanitize fields is empty, so no redaction
      expect(entry.data).toEqual(data)
    })
  })

  describe('sanitize', () => {
    it('should not modify data when sanitize fields is empty', () => {
      const data = { password: 'secret', token: 'abc123' }
      const sanitized = sanitize(data, [])

      expect(sanitized).toEqual(data)
    })

    it('should redact password field', () => {
      const data = { password: 'secret123', username: 'john' }
      const sanitized = sanitize(data, ['password'])

      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.username).toBe('john')
    })

    it('should redact multiple sensitive fields', () => {
      const data = {
        password: 'secret',
        token: 'abc123',
        username: 'john',
        apiKey: 'xyz789',
      }
      const sanitized = sanitize(data, ['password', 'token', 'apiKey'])

      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.username).toBe('john')
    })

    it('should be case-insensitive when matching field names', () => {
      const data = {
        Password: 'secret',
        PASSWORD: 'secret',
        password: 'secret',
        Username: 'john',
      }
      const sanitized = sanitize(data, ['password']) as typeof data

      expect(sanitized.Password).toBe('[REDACTED]')
      expect(sanitized.PASSWORD).toBe('[REDACTED]')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.Username).toBe('john')
    })

    it('should match field names that contain the sensitive keyword', () => {
      const data = {
        userPassword: 'secret',
        passwordHash: 'hash',
        newPassword: 'new',
        username: 'john',
      }
      const sanitized = sanitize(data, ['password'])

      expect(sanitized.userPassword).toBe('[REDACTED]')
      expect(sanitized.passwordHash).toBe('[REDACTED]')
      expect(sanitized.newPassword).toBe('[REDACTED]')
      expect(sanitized.username).toBe('john')
    })

    it('should recursively sanitize nested objects', () => {
      const data = {
        user: {
          username: 'john',
          password: 'secret',
          settings: {
            apiKey: 'abc123',
          },
        },
      }
      const sanitized = sanitize(data, ['password', 'apiKey'])

      expect(sanitized.user.username).toBe('john')
      expect((sanitized.user as any).password).toBe('[REDACTED]')
      expect((sanitized.user.settings as any).apiKey).toBe('[REDACTED]')
    })

    it('should handle deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                password: 'secret',
                normal: 'value',
              },
            },
          },
        },
      }
      const sanitized = sanitize(data, ['password'])

      expect((sanitized.level1.level2.level3.level4 as any).password).toBe('[REDACTED]')
      expect((sanitized.level1.level2.level3.level4 as any).normal).toBe('value')
    })

    it('should handle arrays of objects', () => {
      const data = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      }
      const sanitized = sanitize(data, ['password'])

      expect((sanitized.users as any)[0].name).toBe('John')
      expect((sanitized.users as any)[0].password).toBe('[REDACTED]')
      expect((sanitized.users as any)[1].name).toBe('Jane')
      expect((sanitized.users as any)[1].password).toBe('[REDACTED]')
    })

    it('should handle mixed data structures', () => {
      const data = {
        strings: 'test',
        numbers: 123,
        booleans: true,
        nulls: null,
        objects: { password: 'secret' },
      }
      const sanitized = sanitize(data, ['password'])

      expect(sanitized.strings).toBe('test')
      expect(sanitized.numbers).toBe(123)
      expect(sanitized.booleans).toBe(true)
      expect(sanitized.nulls).toBe(null)
      expect(sanitized.objects.password).toBe('[REDACTED]')
    })

    it('should not modify original data object', () => {
      const data = { password: 'secret', username: 'john' }
      const originalPassword = data.password
      const sanitized = sanitize(data, ['password'])

      expect(data.password).toBe(originalPassword)
      expect(sanitized).not.toBe(data) // Different reference
    })

    it('should handle empty object', () => {
      const data = {}
      const sanitized = sanitize(data, ['password'])

      expect(sanitized).toEqual({})
    })

    it('should handle null and undefined values', () => {
      const data = {
        password: null,
        token: undefined,
        username: 'john',
      }
      const sanitized = sanitize(data, ['password', 'token'])

      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.username).toBe('john')
    })

    it('should redact common sensitive fields', () => {
      const data = {
        password: 'pass',
        token: 'token',
        secret: 'secret',
        apiKey: 'key',
        api_key: 'key2',
        authorization: 'auth',
        cookie: 'cookie',
        creditCard: '1234',
        ssn: '123-45-6789',
        normalField: 'normal',
      }
      const sanitizeFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
        'authorization',
        'cookie',
        'creditCard',
        'ssn',
      ]

      const sanitized = sanitize(data, sanitizeFields)

      Object.keys(sanitized).forEach(key => {
        if (key === 'normalField') {
          expect((sanitized as any)[key]).toBe('normal')
        } else {
          expect((sanitized as any)[key]).toBe('[REDACTED]')
        }
      })
    })
  })

  describe('shouldLog', () => {
    it('should log when level is equal to min level', () => {
      expect(shouldLog('info', 'info')).toBe(true)
      expect(shouldLog('warn', 'warn')).toBe(true)
      expect(shouldLog('error', 'error')).toBe(true)
    })

    it('should log when level is higher than min level', () => {
      expect(shouldLog('warn', 'info')).toBe(true)
      expect(shouldLog('error', 'info')).toBe(true)
      expect(shouldLog('fatal', 'info')).toBe(true)
      expect(shouldLog('error', 'warn')).toBe(true)
      expect(shouldLog('fatal', 'warn')).toBe(true)
      expect(shouldLog('fatal', 'error')).toBe(true)
    })

    it('should not log when level is lower than min level', () => {
      expect(shouldLog('debug', 'info')).toBe(false)
      expect(shouldLog('debug', 'warn')).toBe(false)
      expect(shouldLog('debug', 'error')).toBe(false)
      expect(shouldLog('info', 'warn')).toBe(false)
      expect(shouldLog('info', 'error')).toBe(false)
      expect(shouldLog('warn', 'error')).toBe(false)
    })

    it('should handle all level combinations correctly', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']

      levels.forEach(minLevel => {
        levels.forEach(level => {
          const expected = LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel]
          expect(shouldLog(level, minLevel)).toBe(expected)
        })
      })
    })
  })
})

describe('Integration Tests', () => {
  it('should create and sanitize log entries with sensitive data', () => {
    const sensitiveData = {
      user: {
        username: 'john',
        password: 'secret123',
        apiKey: 'abc-123-xyz',
      },
      request: {
        url: '/api/login',
        method: 'POST',
      },
    }

    const sanitizeFields = ['password', 'apiKey']
    const entry = createLogEntry('info', 'auth', 'User login attempt', sensitiveData)

    const sanitizedData = sanitize(entry.data!, sanitizeFields) as typeof entry.data

    expect((sanitizedData as any).user.username).toBe('john')
    expect((sanitizedData as any).user.password).toBe('[REDACTED]')
    expect((sanitizedData as any).user.apiKey).toBe('[REDACTED]')
    expect((sanitizedData as any).request.url).toBe('/api/login')
    expect((sanitizedData as any).request.method).toBe('POST')
  })

  it('should respect log level filtering', () => {
    const minLevel: LogLevel = 'warn'

    expect(shouldLog('debug', minLevel)).toBe(false)
    expect(shouldLog('info', minLevel)).toBe(false)
    expect(shouldLog('warn', minLevel)).toBe(true)
    expect(shouldLog('error', minLevel)).toBe(true)
    expect(shouldLog('fatal', minLevel)).toBe(true)
  })

  it('should handle complex nested data structures with multiple sensitive fields', () => {
    const complexData = {
      users: [
        {
          id: 1,
          name: 'User 1',
          credentials: {
            password: 'pass1',
            token: 'token1',
          },
        },
        {
          id: 2,
          name: 'User 2',
          credentials: {
            password: 'pass2',
            token: 'token2',
          },
        },
      ],
      metadata: {
        apiKey: 'master-key',
        timestamp: new Date().toISOString(),
      },
    }

    const sanitized = sanitize(complexData, ['password', 'token', 'apiKey']) as typeof complexData

    expect(sanitized.users[0].name).toBe('User 1')
    expect(sanitized.users[0].credentials.password).toBe('[REDACTED]')
    expect(sanitized.users[0].credentials.token).toBe('[REDACTED]')
    expect(sanitized.users[1].name).toBe('User 2')
    expect(sanitized.users[1].credentials.password).toBe('[REDACTED]')
    expect(sanitized.users[1].credentials.token).toBe('[REDACTED]')
    expect(sanitized.metadata.apiKey).toBe('[REDACTED]')
    expect(sanitized.metadata.timestamp).toBeDefined()
  })

  it('should create log entries with all possible parameters', () => {
    const data = { action: 'test' }
    const error = new Error('Test error')
    const context = { userId: '123', requestId: 'abc' }

    const entry = createLogEntry('error', 'api', 'API request failed', data, error, context)

    expect(entry.level).toBe('error')
    expect(entry.category).toBe('api')
    expect(entry.message).toBe('API request failed')
    expect(entry.data).toEqual(data)
    expect(entry.error).toBe(error)
    expect(entry.context).toEqual(context)
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})
