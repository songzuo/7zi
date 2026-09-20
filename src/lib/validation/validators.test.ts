/**
 * Tests for Validators
 */

import { describe, it, expect } from 'vitest'
import {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  phone,
  url,
  numeric,
  integer,
  range,
  confirmPassword,
  compose,
  validators,
} from './validators'

describe('required validator', () => {
  it('should pass for non-empty string', () => {
    const validator = required()
    expect(validator.rule('hello')).toBe(true)
  })

  it('should pass for non-empty string with spaces', () => {
    const validator = required()
    expect(validator.rule('  hello  ')).toBe(true)
  })

  it('should fail for empty string', () => {
    const validator = required()
    expect(validator.rule('')).toBe(false)
  })

  it('should fail for whitespace only', () => {
    const validator = required()
    expect(validator.rule('   ')).toBe(false)
  })

  it('should fail for null', () => {
    const validator = required()
    expect(validator.rule(null as any)).toBe(false)
  })

  it('should fail for undefined', () => {
    const validator = required()
    expect(validator.rule(undefined as any)).toBe(false)
  })

  it('should pass for number', () => {
    const validator = required()
    expect(validator.rule(123)).toBe(true)
  })

  it('should pass for boolean true', () => {
    const validator = required()
    expect(validator.rule(true)).toBe(true)
  })

  it('should pass for object', () => {
    const validator = required()
    expect(validator.rule({})).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = required('Custom required message')
    expect(validator.message).toBe('Custom required message')
  })
})

describe('email validator', () => {
  it('should pass for valid email', () => {
    const validator = email()
    expect(validator.rule('test@example.com')).toBe(true)
    expect(validator.rule('user.name+tag@domain.co.uk')).toBe(true)
  })

  it('should fail for invalid email', () => {
    const validator = email()
    expect(validator.rule('invalid')).toBe(false)
    expect(validator.rule('@example.com')).toBe(false)
    expect(validator.rule('test@')).toBe(false)
    expect(validator.rule('test@domain')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = email()
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = email('Invalid email format')
    expect(validator.message).toBe('Invalid email format')
  })
})

describe('minLength validator', () => {
  it('should pass for string with length >= min', () => {
    const validator = minLength(5)
    expect(validator.rule('hello')).toBe(true)
    expect(validator.rule('hello world')).toBe(true)
  })

  it('should fail for string with length < min', () => {
    const validator = minLength(5)
    expect(validator.rule('hi')).toBe(false)
    expect(validator.rule('test')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = minLength(5)
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = minLength(5, 'Too short')
    expect(validator.message).toBe('Too short')
  })
})

describe('maxLength validator', () => {
  it('should pass for string with length <= max', () => {
    const validator = maxLength(10)
    expect(validator.rule('hello')).toBe(true)
    expect(validator.rule('hello')).toBe(true)
  })

  it('should fail for string with length > max', () => {
    const validator = maxLength(5)
    expect(validator.rule('hello world')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = maxLength(10)
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = maxLength(10, 'Too long')
    expect(validator.message).toBe('Too long')
  })
})

describe('pattern validator', () => {
  it('should pass for string matching pattern', () => {
    const validator = pattern(/^[A-Z]+$/)
    expect(validator.rule('HELLO')).toBe(true)
    expect(validator.rule('ABC')).toBe(true)
  })

  it('should fail for string not matching pattern', () => {
    const validator = pattern(/^[A-Z]+$/)
    expect(validator.rule('hello')).toBe(false)
    expect(validator.rule('Hello')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = pattern(/^[A-Z]+$/)
    expect(validator.rule('')).toBe(true)
  })

  it('should support complex patterns', () => {
    const validator = pattern(/^\d{3}-\d{3}-\d{4}$/)
    expect(validator.rule('123-456-7890')).toBe(true)
    expect(validator.rule('12-345-6789')).toBe(false)
  })

  it('should use custom error message', () => {
    const validator = pattern(/^[A-Z]+$/, 'Must be uppercase')
    expect(validator.message).toBe('Must be uppercase')
  })
})

describe('phone validator', () => {
  it('should pass for valid Chinese phone number', () => {
    const validator = phone()
    expect(validator.rule('13800138000')).toBe(true)
    expect(validator.rule('18612345678')).toBe(true)
    expect(validator.rule('15098765432')).toBe(true)
  })

  it('should fail for invalid phone number', () => {
    const validator = phone()
    expect(validator.rule('12345678901')).toBe(false)
    expect(validator.rule('1380013800')).toBe(false)
    expect(validator.rule('138001380000')).toBe(false)
    expect(validator.rule('abcdefghijk')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = phone()
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = phone('Invalid phone number')
    expect(validator.message).toBe('Invalid phone number')
  })
})

describe('url validator', () => {
  it('should pass for valid URLs', () => {
    const validator = url()
    expect(validator.rule('http://example.com')).toBe(true)
    expect(validator.rule('https://example.com')).toBe(true)
    expect(validator.rule('https://subdomain.example.com/path?query=1')).toBe(true)
    expect(validator.rule('ftp://example.com')).toBe(true)
  })

  it('should fail for invalid URLs', () => {
    const validator = url()
    expect(validator.rule('not a url')).toBe(false)
    expect(validator.rule('example.com')).toBe(false)
    expect(validator.rule('://example.com')).toBe(false)
  })

  it('should reject unsupported protocols', () => {
    const validator = url()
    expect(validator.rule('javascript:void(0)')).toBe(false)
    expect(validator.rule('file:///path')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = url()
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = url('Invalid URL')
    expect(validator.message).toBe('Invalid URL')
  })
})

describe('numeric validator', () => {
  it('should pass for numeric strings', () => {
    const validator = numeric()
    expect(validator.rule('123')).toBe(true)
    expect(validator.rule('123.45')).toBe(true)
    expect(validator.rule('-123')).toBe(true)
    expect(validator.rule('-123.45')).toBe(true)
    expect(validator.rule('0')).toBe(true)
  })

  it('should fail for non-numeric strings', () => {
    const validator = numeric()
    expect(validator.rule('abc')).toBe(false)
    expect(validator.rule('12a3')).toBe(false)
    expect(validator.rule('12 3')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = numeric()
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = numeric('Must be a number')
    expect(validator.message).toBe('Must be a number')
  })
})

describe('integer validator', () => {
  it('should pass for integer strings', () => {
    const validator = integer()
    expect(validator.rule('123')).toBe(true)
    expect(validator.rule('-123')).toBe(true)
    expect(validator.rule('0')).toBe(true)
  })

  it('should fail for non-integer strings', () => {
    const validator = integer()
    expect(validator.rule('123.45')).toBe(false)
    expect(validator.rule('abc')).toBe(false)
    expect(validator.rule('12a3')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = integer()
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = integer('Must be an integer')
    expect(validator.message).toBe('Must be an integer')
  })
})

describe('range validator', () => {
  it('should pass for value within range', () => {
    const validator = range(1, 10)
    expect(validator.rule('5')).toBe(true)
    expect(validator.rule('1')).toBe(true)
    expect(validator.rule('10')).toBe(true)
  })

  it('should fail for value outside range', () => {
    const validator = range(1, 10)
    expect(validator.rule('0')).toBe(false)
    expect(validator.rule('11')).toBe(false)
  })

  it('should handle decimal values', () => {
    const validator = range(1.5, 10.5)
    expect(validator.rule('5.5')).toBe(true)
    expect(validator.rule('1.5')).toBe(true)
  })

  it('should fail for non-numeric values', () => {
    const validator = range(1, 10)
    expect(validator.rule('abc')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const validator = range(1, 10)
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const validator = range(1, 10, 'Out of range')
    expect(validator.message).toBe('Out of range')
  })
})

describe('confirmPassword validator', () => {
  it('should pass when passwords match', () => {
    const getPassword = () => 'password123'
    const validator = confirmPassword(getPassword)
    expect(validator.rule('password123')).toBe(true)
  })

  it('should fail when passwords do not match', () => {
    const getPassword = () => 'password123'
    const validator = confirmPassword(getPassword)
    expect(validator.rule('different')).toBe(false)
  })

  it('should pass for empty string (handled by required)', () => {
    const getPassword = () => 'password123'
    const validator = confirmPassword(getPassword)
    expect(validator.rule('')).toBe(true)
  })

  it('should use custom error message', () => {
    const getPassword = () => 'password123'
    const validator = confirmPassword(getPassword, 'Passwords do not match')
    expect(validator.message).toBe('Passwords do not match')
  })
})

describe('compose validator', () => {
  it('should pass when all rules pass', () => {
    const composed = compose(required(), email(), minLength(10))
    expect(composed('test@example.com')).toBeNull()
  })

  it('should fail on first failing rule', () => {
    const composed = compose(required(), email(), minLength(10))
    const error = composed('short')
    expect(error).not.toBeNull()
  })

  it('should pass when all rules pass with min length', () => {
    const composed = compose(required(), email(), minLength(10))
    expect(composed('longemail@example.com')).toBeNull()
  })

  it('should work with multiple email rules', () => {
    const composed = compose(required(), email(), minLength(5), maxLength(50))
    expect(composed('test@example.com')).toBeNull()
  })

  it('should fail on max length violation', () => {
    const composed = compose(required(), email(), maxLength(10))
    const error = composed('verylongemail@example.com')
    expect(error).not.toBeNull()
  })
})

describe('validators collection', () => {
  it('should export all validators', () => {
    expect(validators.required).toBeDefined()
    expect(validators.email).toBeDefined()
    expect(validators.minLength).toBeDefined()
    expect(validators.maxLength).toBeDefined()
    expect(validators.pattern).toBeDefined()
    expect(validators.phone).toBeDefined()
    expect(validators.url).toBeDefined()
    expect(validators.numeric).toBeDefined()
    expect(validators.integer).toBeDefined()
    expect(validators.range).toBeDefined()
    expect(validators.confirmPassword).toBeDefined()
    expect(validators.compose).toBeDefined()
  })

  it('should have correct function references', () => {
    expect(validators.required).toBe(required)
    expect(validators.email).toBe(email)
    expect(validators.minLength).toBe(minLength)
  })
})

describe('validator edge cases', () => {
  it('should handle special characters in pattern', () => {
    const validator = pattern(/^[a-zA-Z0-9_\-\.@]+$/)
    expect(validator.rule('user.name-123@example.com')).toBe(true)
    expect(validator.rule('user@name')).toBe(true)
  })

  it('should handle unicode characters', () => {
    const requiredValidator = required()
    expect(requiredValidator.rule('测试')).toBe(true)
  })

  it('should handle very long strings', () => {
    const maxValidator = maxLength(100000)
    const longString = 'a'.repeat(99999)
    expect(maxValidator.rule(longString)).toBe(true)
  })

  it('should handle negative ranges correctly', () => {
    const rangeValidator = range(-100, -50)
    expect(rangeValidator.rule('-75')).toBe(true)
    expect(rangeValidator.rule('-25')).toBe(false)
  })

  it('should handle zero in ranges', () => {
    const rangeValidator = range(0, 10)
    expect(rangeValidator.rule('0')).toBe(true)
    expect(rangeValidator.rule('10')).toBe(true)
  })
})
