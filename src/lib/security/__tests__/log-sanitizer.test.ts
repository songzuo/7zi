/**
 * Tests for src/lib/security/log-sanitizer.ts
 *
 * Assertions are written against the REAL current behaviour of the module.
 * Where behaviour looks like a bug, the current behaviour is pinned with an
 * explicit assertion and marked with a `// BUG:` comment.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  maskValue,
  maskEmail,
  maskPhone,
  maskCreditCard,
  redactValue,
  isSensitiveField,
  sanitizeValue,
  sanitizeStringValue,
  sanitizeObject,
  sanitizeLogEntry,
  sanitizeHeaders,
  sanitizeURL,
  sanitizeError,
  addSensitivePattern,
  addValuePattern,
  resetPatterns,
} from '../log-sanitizer'

describe('log-sanitizer / maskValue', () => {
  it('masks the middle of a value and preserves prefix/suffix', () => {
    expect(maskValue('hello')).toBe('he********lo')
  })

  it('fully masks values shorter than or equal to prefix+suffix (4)', () => {
    expect(maskValue('abc')).toBe('********')
    expect(maskValue('abcd')).toBe('********')
  })

  it('returns empty strings untouched', () => {
    expect(maskValue('')).toBe('')
  })

  it('honours custom mask configuration', () => {
    expect(maskValue('hello', { preservePrefixLength: 1, preserveSuffixLength: 1, maskLength: 3 })).toBe(
      'h***o'
    )
  })
})

describe('log-sanitizer / maskEmail', () => {
  it('masks local part keeping first and last character', () => {
    expect(maskEmail('user@example.com')).toBe('u***r@example.com')
  })

  it('fully masks very short local parts', () => {
    expect(maskEmail('ab@example.com')).toBe('****@example.com')
  })

  it('falls back to maskValue for non email inputs', () => {
    expect(maskEmail('notanemail')).toBe('no********il')
  })

  it('returns empty input untouched', () => {
    expect(maskEmail('')).toBe('')
  })
})

describe('log-sanitizer / maskPhone', () => {
  it('keeps the last four digits', () => {
    expect(maskPhone('1234567890')).toBe('******-7890')
  })

  it('fully masks phone numbers with fewer than 7 digits', () => {
    expect(maskPhone('12345')).toBe('********')
  })

  it('ignores formatting characters', () => {
    expect(maskPhone('+1 (555) 123-4567')).toBe('******-4567')
  })
})

describe('log-sanitizer / maskCreditCard', () => {
  it('keeps the first and last four digits', () => {
    expect(maskCreditCard('4111111111111111')).toBe('4111********1111')
  })

  it('strips non digit characters', () => {
    expect(maskCreditCard('4111-1111-1111-1111')).toBe('4111********1111')
  })

  it('fully masks cards with fewer than 4 digits', () => {
    expect(maskCreditCard('123')).toBe('********')
  })

  // FIXED (T102): the mask length is clamped with Math.max(0, …) and cards
  // with fewer than 8 digits are masked as a whole instead of throwing.
  it('fully masks 4-7 digit card numbers instead of throwing', () => {
    expect(() => maskCreditCard('1234')).not.toThrow()
    expect(maskCreditCard('1234')).toBe('********')
    expect(maskCreditCard('12345')).toBe('********')
    expect(maskCreditCard('1234567')).toBe('********')
  })

  // FIXED (T102): maskCreditCard now honours the `config` argument.
  it('honours the passed config', () => {
    expect(
      maskCreditCard('4111111111111111', {
        maskChar: '#',
        maskLength: 4,
        preservePrefixLength: 1,
        preserveSuffixLength: 1,
      })
    ).toBe('4111########1111')
  })
})

describe('log-sanitizer / redactValue', () => {
  it('uses the default redaction text', () => {
    expect(redactValue()).toBe('[REDACTED]')
  })

  it('uses a custom redaction text when provided', () => {
    expect(redactValue({ redactedText: 'X' })).toBe('X')
  })
})

describe('log-sanitizer / isSensitiveField', () => {
  it('detects password fields as full redaction', () => {
    const field = isSensitiveField('password')
    expect(field?.type).toBe('password')
    expect(field?.maskType).toBe('full')
  })

  it('detects api key fields as partial masking', () => {
    const field = isSensitiveField('apiKey')
    expect(field?.type).toBe('api-key')
    expect(field?.maskType).toBe('partial')
  })

  it('detects email fields as partial masking', () => {
    const field = isSensitiveField('user_email')
    expect(field?.type).toBe('email')
    expect(field?.maskType).toBe('partial')
  })

  it('detects session id fields as token partial masking', () => {
    const field = isSensitiveField('sessionId')
    expect(field?.type).toBe('token')
    expect(field?.maskType).toBe('partial')
  })

  it('returns undefined for unknown fields', () => {
    expect(isSensitiveField('username')).toBeUndefined()
    expect(isSensitiveField('createdAt')).toBeUndefined()
  })

  // FIXED (T102): the specific /refresh[_-]?token/i pattern is now evaluated
  // before the generic /token/i entry, so refreshToken is fully redacted.
  it('classifies refreshToken as a full-masked token', () => {
    const field = isSensitiveField('refreshToken')
    expect(field?.type).toBe('token')
    expect(field?.maskType).toBe('full')
  })
})

describe('log-sanitizer / sanitizeValue', () => {
  it('redacts password values completely', () => {
    expect(sanitizeValue('password', 'hunter2')).toBe('[REDACTED]')
  })

  it('partially masks email values', () => {
    expect(sanitizeValue('userEmail', 'john@example.com')).toBe('j***n@example.com')
  })

  it('partially masks phone values', () => {
    expect(sanitizeValue('userPhone', '5551234567')).toBe('******-4567')
  })

  it('partially masks credit card values', () => {
    expect(sanitizeValue('creditCardNumber', '4111111111111111')).toBe('4111********1111')
  })

  it('passes null and undefined through', () => {
    expect(sanitizeValue('password', null)).toBeNull()
    expect(sanitizeValue('password', undefined)).toBeUndefined()
  })

  it('scans non sensitive string values for embedded patterns', () => {
    expect(sanitizeValue('notes', 'write to john@example.com please')).toBe(
      'write to j***n@example.com please'
    )
  })

  it('returns non string, non sensitive values untouched', () => {
    expect(sanitizeValue('count', 42)).toBe(42)
    expect(sanitizeValue('flag', true)).toBe(true)
  })
})

describe('log-sanitizer / sanitizeStringValue', () => {
  it('masks emails found in free text', () => {
    expect(sanitizeStringValue('a@b.com')).toBe('****@b.com')
  })

  it('masks credit card numbers found in free text', () => {
    expect(sanitizeStringValue('card 4111111111111111 ok')).toBe('card 4111********1111 ok')
  })

  it('masks JWT tokens found in free text', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const masked = sanitizeStringValue(jwt)
    expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    expect(masked.startsWith('ey')).toBe(true)
    expect(masked.endsWith('8U')).toBe(true)
  })

  it('masks UUIDs found in free text', () => {
    const masked = sanitizeStringValue('id 123e4567-e89b-12d3-a456-426614174000 here')
    expect(masked).not.toContain('123e4567-e89b-12d3-a456-426614174000')
  })

  it('leaves plain text untouched', () => {
    expect(sanitizeStringValue('nothing sensitive here')).toBe('nothing sensitive here')
  })
})

describe('log-sanitizer / sanitizeObject', () => {
  it('redacts sensitive keys recursively', () => {
    expect(sanitizeObject({ user: { password: 'hunter2' } })).toEqual({
      user: { password: '[REDACTED]' },
    })
  })

  it('maps over arrays', () => {
    expect(sanitizeObject([{ password: 'x' }])).toEqual([{ password: '[REDACTED]' }])
  })


  it('returns primitives untouched', () => {
    expect(sanitizeObject(5)).toBe(5)
    expect(sanitizeObject(null)).toBeNull()
    expect(sanitizeObject(undefined)).toBeUndefined()
  })

  it('aborts recursion beyond depth 10', () => {
    let deep: Record<string, unknown> = { value: 'bottom' }
    for (let i = 0; i < 15; i++) {
      deep = { nested: deep }
    }
    const result = sanitizeObject(deep) as Record<string, unknown>
    // Somewhere below depth 10 the value is replaced by the depth guard
    expect(JSON.stringify(result)).toContain('[MAX_DEPTH_EXCEEDED]')
  })
})

describe('log-sanitizer / sanitizeLogEntry', () => {
  it('sanitizes a log entry record', () => {
    expect(
      sanitizeLogEntry({
        level: 'info',
        message: 'login for john@example.com',
        password: 'hunter2',
      })
    ).toEqual({
      level: 'info',
      // FIXED (T102): the value scan is now applied exactly once, so the
      // email is masked a single time and sanitization is idempotent.
      message: 'login for j***n@example.com',
      password: '[REDACTED]',
    })
  })
})

describe('log-sanitizer / sanitizeHeaders', () => {
  it('sanitizes a plain header record', () => {
    expect(sanitizeHeaders({ authorization: 'Bearer abcdefghij', 'x-api-key': '123456789' })).toEqual({
      authorization: 'Be********ij',
      'x-api-key': '12********89',
    })
  })

  it('sanitizes a Headers instance', () => {
    const headers = new Headers({ authorization: 'Bearer abcdefghij' })
    expect(sanitizeHeaders(headers)).toEqual({ authorization: 'Be********ij' })
  })
})

describe('log-sanitizer / sanitizeURL', () => {
  it('sanitizes sensitive query parameters', () => {
    const result = sanitizeURL('https://example.com/api?token=abcdefghij&page=2')
    expect(result).not.toContain('abcdefghij')
    expect(result).toContain('page=2')
  })

  it('returns the origin and pathname when there is no query string', () => {
    expect(sanitizeURL('https://example.com/api/path')).toBe('https://example.com/api/path')
  })

  it('falls back to string sanitization for invalid URLs', () => {
    expect(sanitizeURL('not a url john@example.com')).toContain('j***n@example.com')
  })
})

describe('log-sanitizer / sanitizeError', () => {
  it('sanitizes message and stack of an Error', () => {
    const error = new Error('failed for john@example.com')
    const result = sanitizeError(error)
    expect(result.name).toBe('Error')
    expect(result.message).toBe('failed for j***n@example.com')
    expect(String(result.stack)).toContain('j***n@example.com')
    expect(String(result.stack)).not.toContain('john@example.com')
  })

  it('falls back to sanitizeObject for non Error values', () => {
    const result = sanitizeError({ password: 'hunter2' })
    expect(result).toEqual({ password: '[REDACTED]' })
  })
})

describe('log-sanitizer / custom patterns', () => {
  // NOTE: pattern registries are module level mutable state. resetPatterns()
  // restores a REDUCED default set (see below), so this block intentionally
  // runs last and is not reset to the original full defaults afterwards.
  beforeAll(() => {
    addSensitivePattern({
      pattern: /my[_-]?credential/i,
      type: 'custom',
      maskType: 'full',
    })
    addValuePattern(/SENSITIVE-\d{4}/g, 'token')
  })

  afterAll(() => {
    resetPatterns()
  })

  it('uses patterns added via addSensitivePattern', () => {
    expect(isSensitiveField('myCredential')?.maskType).toBe('full')
    expect(sanitizeValue('myCredential', 'abc')).toBe('[REDACTED]')
  })

  it('uses patterns added via addValuePattern', () => {
    expect(sanitizeStringValue('id SENSITIVE-1234 end')).toBe('id SE********34 end')
  })

  // FIXED (T102): resetPatterns() now restores the COMPLETE default pattern
  // set (the email/phone/ssn/credit-card/authorization/session/database-url
  // patterns used to be permanently lost after a reset).
  it('resetPatterns() restores the complete sensitive pattern set', () => {
    resetPatterns()

    expect(isSensitiveField('password')).toBeDefined()
    expect(isSensitiveField('secret')).toBeDefined()
    expect(isSensitiveField('apiKey')).toBeDefined()
    expect(isSensitiveField('token')).toBeDefined()

    expect(isSensitiveField('email')).toBeDefined()
    expect(isSensitiveField('phone')).toBeDefined()
    expect(isSensitiveField('ssn')).toBeDefined()
    expect(isSensitiveField('creditCard')).toBeDefined()
    expect(isSensitiveField('authorization')).toBeDefined()
    expect(isSensitiveField('sessionId')).toBeDefined()
  })

  // FIXED (T102): resetPatterns() now resets VALUE_PATTERNS as well, so the
  // custom value pattern added above is gone after the reset.
  it('resetPatterns() clears custom value patterns', () => {
    resetPatterns()
    expect(sanitizeStringValue('id SENSITIVE-1234 end')).toBe('id SENSITIVE-1234 end')
  })
})
