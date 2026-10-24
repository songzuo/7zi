/**
 * Tests for src/lib/security/prototype-pollution-guard.ts
 *
 * NOTE: the module used to call protectPrototype() at import time when
 * `window` was defined (it is, in the jsdom test environment), which froze
 * Object.prototype for the whole test file. The auto-init was removed in
 * T102 — `initPrototypeProtection()` is now exported and has to be called
 * explicitly by the application entry point.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  protectPrototype,
  initPrototypeProtection,
  sanitizeObjectFromPrototypePollution,
  safeAssign,
  safeMerge,
  safeParseJSON,
  isPolluted,
} from '../prototype-pollution-guard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('prototype-pollution-guard / protectPrototype', () => {
  it('does not freeze Object.prototype as a side effect of the import', () => {
    // MUST be the first test in this file: protectPrototype() is irreversible.
    expect(Object.isFrozen(Object.prototype)).toBe(false)
  })

  it('does not throw when called', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => protectPrototype()).not.toThrow()
    warn.mockRestore()
  })

  it('exposes an explicit initializer instead of freezing on import', () => {
    // NOTE: the initializer is deliberately NOT invoked here — freezing
    // Object.prototype is irreversible and would leak into every other test
    // in this file (and into the whole worker).
    expect(typeof initPrototypeProtection).toBe('function')
  })
})

describe('prototype-pollution-guard / sanitizeObjectFromPrototypePollution', () => {
  it('returns non objects untouched', () => {
    expect(sanitizeObjectFromPrototypePollution(null as never)).toBeNull()
    expect(sanitizeObjectFromPrototypePollution('str' as never)).toBe('str')
  })

  it('removes the __proto__ key', () => {
    const input = JSON.parse('{"__proto__":{"polluted":true},"safe":1}') as Record<string, unknown>
    const result = sanitizeObjectFromPrototypePollution(input)
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false)
    expect(result.safe).toBe(1)
  })

  it('removes the constructor and prototype keys', () => {
    const input = JSON.parse('{"constructor":{"x":1},"prototype":{"y":2},"keep":3}') as Record<
      string,
      unknown
    >
    const result = sanitizeObjectFromPrototypePollution(input)
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false)
    expect(result.keep).toBe(3)
  })

  it('cleans nested objects recursively', () => {
    const input = JSON.parse(
      '{"level1":{"__proto__":{"polluted":true},"level2":{"value":1}}}'
    ) as Record<string, unknown>
    const result = sanitizeObjectFromPrototypePollution(input) as Record<
      string,
      Record<string, unknown>
    >
    expect(
      Object.prototype.hasOwnProperty.call(result.level1, '__proto__')
    ).toBe(false)
    const level2 = result.level1.level2 as Record<string, unknown>
    expect(level2.value).toBe(1)
  })

  it('does not pollute Object.prototype', () => {
    const input = JSON.parse('{"__proto__":{"pollutedByGuard":true}}') as Record<string, unknown>
    sanitizeObjectFromPrototypePollution(input)
    expect(({} as Record<string, unknown>).pollutedByGuard).toBeUndefined()
  })
})

describe('prototype-pollution-guard / safeAssign', () => {
  it('copies own properties into a new object', () => {
    expect(safeAssign<Record<string, unknown>>({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('does not mutate the target', () => {
    const target = { a: 1 }
    const result = safeAssign<Record<string, unknown>>(target, { b: 2 })
    expect(target).toEqual({ a: 1 })
    expect(result).not.toBe(target)
  })

  it('skips the dangerous keys', () => {
    const source = JSON.parse('{"__proto__":{"x":1},"constructor":1,"prototype":1,"ok":2}') as Record<
      string,
      unknown
    >
    const result = safeAssign({} as Record<string, unknown>, source)
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false)
    expect(result.ok).toBe(2)
  })

  it('ignores non object sources', () => {
    expect(safeAssign({ a: 1 }, null as never, undefined as never)).toEqual({ a: 1 })
  })
})

describe('prototype-pollution-guard / safeMerge', () => {
  it('merges plain objects', () => {
    expect(safeMerge<Record<string, unknown>>({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('overwrites scalar values from the source', () => {
    expect(safeMerge<Record<string, unknown>>({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
  })

  it('deep merges nested plain objects', () => {
    expect(
      safeMerge<Record<string, unknown>>({ nested: { a: 1, b: 2 } }, { nested: { b: 3 } })
    ).toEqual({
      nested: { a: 1, b: 3 },
    })
  })

  it('skips the dangerous keys', () => {
    const source = JSON.parse('{"__proto__":{"x":1},"constructor":1,"prototype":1,"ok":2}') as Record<
      string,
      unknown
    >
    const result = safeMerge({} as Record<string, unknown>, source)
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false)
    expect(result.ok).toBe(2)
  })

  it('returns a copy of the target for invalid sources', () => {
    expect(safeMerge<Record<string, unknown>>({ a: 1 }, null as never)).toEqual({ a: 1 })
  })
})

describe('prototype-pollution-guard / safeParseJSON', () => {
  it('parses valid JSON', () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null for invalid JSON', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(safeParseJSON('{invalid')).toBeNull()
    error.mockRestore()
  })

  it('removes the __proto__ key from parsed JSON', () => {
    const result = safeParseJSON<Record<string, unknown>>('{"__proto__":{"polluted":true},"ok":1}')
    expect(result).not.toBeNull()
    expect(Object.prototype.hasOwnProperty.call(result as object, '__proto__')).toBe(false)
    expect((result as Record<string, unknown>).ok).toBe(1)
  })

  it('returns primitives unchanged', () => {
    expect(safeParseJSON('42')).toBe(42)
    expect(safeParseJSON('"text"')).toBe('text')
  })
})

describe('prototype-pollution-guard / isPolluted', () => {
  it('returns false for non objects', () => {
    expect(isPolluted(null)).toBe(false)
    expect(isPolluted('string')).toBe(false)
    expect(isPolluted(42)).toBe(false)
  })

  it('returns true for an object with an own __proto__ key', () => {
    const input = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>
    expect(isPolluted(input)).toBe(true)
  })

  it('returns false for plain objects (no own malicious key)', () => {
    expect(isPolluted({})).toBe(false)
    expect(isPolluted({ a: 1 })).toBe(false)
  })

  it('returns true for an object with an own constructor key', () => {
    const input = JSON.parse('{"constructor":{"x":1}}') as Record<string, unknown>
    expect(isPolluted(input)).toBe(true)
  })

  it('returns true for an object whose prototype was replaced', () => {
    const input = Object.create({ injected: true }) as Record<string, unknown>
    expect(isPolluted(input)).toBe(true)
  })
})
