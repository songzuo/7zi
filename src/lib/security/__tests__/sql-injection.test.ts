/**
 * Tests for src/lib/security/sql-injection.ts
 *
 * The module imports the heavyweight logger (which pulls in @sentry/nextjs),
 * so the logger is stubbed with vi.mock in this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const loggerWarn = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    warn: (...args: unknown[]) => loggerWarn(...args),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  checkSQLInjection,
  checkObjectForSQLInjection,
  escapeSQLString,
  removeSQLComments,
  sanitizeSQLInput,
  validateAndSanitizeSQLInput,
  isValidIdentifier,
  isValidSortDirection,
  validateLimit,
  validateOffset,
  buildSafeCondition,
  buildSafeOrder,
  createSQLInjectionMiddleware,
  isRequestSafe,
} from '../sql-injection'

beforeEach(() => {
  loggerWarn.mockClear()
})

describe('sql-injection / checkSQLInjection', () => {
  it('reports safe strings', () => {
    const result = checkSQLInjection('hello world')
    expect(result.safe).toBe(true)
    expect(result.detectedPatterns).toEqual([])
    expect(result.severity).toBe('low')
  })

  it('detects SQL keywords with high severity', () => {
    const result = checkSQLInjection('SELECT * FROM users')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('high')
    expect(result.detectedPatterns.join(' ')).toContain('SQL keyword detected')
  })

  it('detects SQL comments with medium severity', () => {
    const result = checkSQLInjection('value -- comment')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('medium')
    expect(result.detectedPatterns.join(' ')).toContain('SQL comment detected')
  })

  it('detects boolean based injection with critical severity', () => {
    const result = checkSQLInjection("x' OR 1=1 --")
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('critical')
  })

  it('detects union based injection with critical severity', () => {
    const result = checkSQLInjection('1 UNION SELECT password FROM users')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('critical')
    expect(result.detectedPatterns.join(' ')).toContain('UNION-based injection pattern')
  })

  it('detects time based injection', () => {
    const result = checkSQLInjection("SELECT SLEEP(10)")
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('critical')
  })

  it('detects stacked queries', () => {
    const result = checkSQLInjection('1; DROP TABLE users')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('critical')
  })

  it('detects hex encoding with low severity', () => {
    const result = checkSQLInjection('0x414141')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('low')
  })

  it('detects dangerous functions and raises severity to medium', () => {
    const result = checkSQLInjection('EXEC xp')
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('medium')
    expect(result.detectedPatterns.join(' ')).toContain('Dangerous function: EXEC')
  })

  // FIXED (T102): the dangerous function patterns are matched case
  // insensitively with a word boundary, so the lowercase entries
  // ('xp_cmdshell', 'sp_', 'fn_') are detected as well.
  it('detects lowercase dangerous functions', () => {
    expect(checkSQLInjection('xp_cmdshell').safe).toBe(false)
    expect(checkSQLInjection('sp_helper').safe).toBe(false)
    expect(checkSQLInjection('fn_helper').safe).toBe(false)
  })

  it('logs the detection by default', () => {
    checkSQLInjection('SELECT 1')
    expect(loggerWarn).toHaveBeenCalled()
  })

  it('does not log when logDetections is false', () => {
    checkSQLInjection('SELECT 1', { logDetections: false })
    expect(loggerWarn).not.toHaveBeenCalled()
  })

  // FIXED (T102): the word-boundary matching removes the false positives on
  // innocent words ("system" contains "SYS", "copyright" contains "COPY").
  it('does not false-positive on innocent words containing function fragments', () => {
    const systemResult = checkSQLInjection('the system is running')
    expect(systemResult.safe).toBe(true)

    const copyrightResult = checkSQLInjection('copyright 2024')
    expect(copyrightResult.safe).toBe(true)
  })
})

describe('sql-injection / checkObjectForSQLInjection', () => {
  it('reports safe objects', () => {
    const result = checkObjectForSQLInjection({ name: 'john', tags: ['a', 'b'] })
    expect(result.safe).toBe(true)
    expect(result.severity).toBe('low')
  })

  it('reports the path of an offending nested value', () => {
    const result = checkObjectForSQLInjection({ user: { name: "x' OR 1=1 --" } })
    expect(result.safe).toBe(false)
    expect(result.severity).toBe('critical')
    expect(result.detectedPatterns[0]).toContain('root.user.name')
  })

  it('reports the index of an offending array value', () => {
    const result = checkObjectForSQLInjection({ list: ['ok', 'SELECT 1'] })
    expect(result.safe).toBe(false)
    expect(result.detectedPatterns[0]).toContain('root.list[1]')
  })
})

describe('sql-injection / escapeSQLString', () => {
  it('doubles single quotes', () => {
    expect(escapeSQLString("O'Brien")).toBe("O''Brien")
  })

  it('leaves safe strings untouched', () => {
    expect(escapeSQLString('plain')).toBe('plain')
  })
})

describe('sql-injection / removeSQLComments', () => {
  it('removes line comments', () => {
    expect(removeSQLComments('SELECT * FROM users -- c')).toBe('SELECT * FROM users ')
  })

  it('removes hash comments', () => {
    expect(removeSQLComments('SELECT 1 # comment')).toBe('SELECT 1 ')
  })

  it('removes block comments', () => {
    expect(removeSQLComments('SELECT /* x */ 1')).toBe('SELECT  1')
  })
})

describe('sql-injection / sanitizeSQLInput', () => {
  it('escapes quotes and removes null bytes', () => {
    expect(sanitizeSQLInput("a'b\0c")).toBe("a''bc")
  })

  it('removes backslash escapes of percent and underscore', () => {
    expect(sanitizeSQLInput('a\\%b')).toBe('a%b')
    expect(sanitizeSQLInput('a\\_b')).toBe('a_b')
  })
})

describe('sql-injection / validateAndSanitizeSQLInput', () => {
  it('returns the original value for safe input', () => {
    const result = validateAndSanitizeSQLInput('normal value')
    expect(result.safe).toBe(true)
    expect(result.sanitizedValue).toBe('normal value')
  })

  it('sanitizes the value when sanitizeInput is enabled', () => {
    const result = validateAndSanitizeSQLInput("x' OR 1=1 --", { sanitizeInput: true })
    expect(result.safe).toBe(false)
    expect(result.sanitizedValue).toContain("x'' OR 1=1 --")
  })

  it('throws when throwOnDetection is enabled', () => {
    expect(() =>
      validateAndSanitizeSQLInput('SELECT 1', { throwOnDetection: true })
    ).toThrow(/SQL injection detected/)
  })
})

describe('sql-injection / parameter validation', () => {
  it('accepts valid identifiers', () => {
    expect(isValidIdentifier('users')).toBe(true)
    expect(isValidIdentifier('_private')).toBe(true)
    expect(isValidIdentifier('Table1')).toBe(true)
  })

  it('rejects invalid identifiers', () => {
    expect(isValidIdentifier('1table')).toBe(false)
    expect(isValidIdentifier('drop table')).toBe(false)
    expect(isValidIdentifier('user;--')).toBe(false)
    expect(isValidIdentifier('a-b')).toBe(false)
  })

  it('accepts only allowed sort directions', () => {
    expect(isValidSortDirection('asc')).toBe(true)
    expect(isValidSortDirection('ASC')).toBe(true)
    expect(isValidSortDirection('desc')).toBe(true)
    expect(isValidSortDirection('DESC')).toBe(true)
    expect(isValidSortDirection('sideways')).toBe(false)
  })

  it('clamps the limit to the maximum', () => {
    expect(validateLimit(50)).toBe(50)
    expect(validateLimit(5000)).toBe(100)
    expect(validateLimit(5000, 200)).toBe(200)
  })

  it('falls back to the default limit for invalid values', () => {
    expect(validateLimit('abc')).toBe(10)
    expect(validateLimit(0)).toBe(10)
    expect(validateLimit(-5)).toBe(10)
    expect(validateLimit(undefined)).toBe(10)
  })

  it('validates the offset and falls back to zero', () => {
    expect(validateOffset(20)).toBe(20)
    expect(validateOffset('abc')).toBe(0)
    expect(validateOffset(-1)).toBe(0)
  })
})

describe('sql-injection / buildSafeCondition', () => {
  it('builds a valid condition and uppercases the operator', () => {
    expect(buildSafeCondition('name', '=', 'john')).toEqual({
      field: 'name',
      operator: '=',
      value: 'john',
    })
    expect(buildSafeCondition('name', 'like', 'a%')).toEqual({
      field: 'name',
      operator: 'LIKE',
      value: 'a%',
    })
  })

  it('returns null for an invalid field name', () => {
    expect(buildSafeCondition('name; drop', '=', 'x')).toBeNull()
  })

  it('returns null for an invalid operator', () => {
    expect(buildSafeCondition('name', 'DROP', 'x')).toBeNull()
  })

  it('returns null for a value containing an injection', () => {
    expect(buildSafeCondition('name', '=', "x' OR 1=1 --")).toBeNull()
  })
})

describe('sql-injection / buildSafeOrder', () => {
  it('builds a valid order clause', () => {
    expect(buildSafeOrder('name', 'asc')).toEqual({ field: 'name', direction: 'ASC' })
  })

  it('defaults to ASC', () => {
    expect(buildSafeOrder('name')).toEqual({ field: 'name', direction: 'ASC' })
  })

  it('returns null for invalid input', () => {
    expect(buildSafeOrder('name; drop')).toBeNull()
    expect(buildSafeOrder('name', 'sideways')).toBeNull()
  })
})

describe('sql-injection / request helpers', () => {
  it('detects injection in URL parameters', () => {
    const request = new Request('https://example.com/api?id=1%20OR%201=1')
    expect(isRequestSafe(request)).toBe(false)
  })

  it('accepts a request with safe URL parameters', () => {
    const request = new Request('https://example.com/api?id=5')
    expect(isRequestSafe(request)).toBe(true)
  })

  it('middleware rejects requests with injection in the query string', async () => {
    const middleware = createSQLInjectionMiddleware()
    const next = vi.fn(async () => new Response('ok'))

    const response = await middleware(
      new Request('https://example.com/api?id=1%27%20OR%201%3D1'),
      next
    )

    expect(response.status).toBe(400)
    expect(next).not.toHaveBeenCalled()
    const body = (await response.json()) as { error: { type: string } }
    expect(body.error.type).toBe('SECURITY_ERROR')
  })

  it('middleware rejects POST bodies containing injection', async () => {
    const middleware = createSQLInjectionMiddleware()
    const next = vi.fn(async () => new Response('ok'))

    const request = new Request('https://example.com/api', {
      method: 'POST',
      body: JSON.stringify({ name: "x' OR 1=1 --" }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await middleware(request, next)
    expect(response.status).toBe(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('middleware passes safe requests through', async () => {
    const middleware = createSQLInjectionMiddleware()
    const next = vi.fn(async () => new Response('ok'))

    const request = new Request('https://example.com/api', {
      method: 'POST',
      body: JSON.stringify({ name: 'john' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await middleware(request, next)
    expect(response.status).toBe(200)
    expect(next).toHaveBeenCalled()
  })

  it('middleware ignores non JSON bodies', async () => {
    const middleware = createSQLInjectionMiddleware()
    const next = vi.fn(async () => new Response('ok'))

    const request = new Request('https://example.com/api', {
      method: 'POST',
      body: 'plain text body',
      headers: { 'content-type': 'text/plain' },
    })

    const response = await middleware(request, next)
    expect(response.status).toBe(200)
    expect(next).toHaveBeenCalled()
  })
})
