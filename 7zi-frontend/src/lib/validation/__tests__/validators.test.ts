/**
 * Unit Tests for Core Validators
 */

import { describe, it, expect } from 'vitest'
import {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  min,
  max,
  url,
  phone,
  number,
  integer,
  date,
  oneOf,
  notOneOf,
  equals,
  custom,
  chain,
} from '../validators'

describe('Core Validators', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      expect(required().validate('hello').valid).toBe(true)
      expect(required().validate(123).valid).toBe(true)
      expect(required().validate([1, 2]).valid).toBe(true)
      expect(required().validate({ key: 'value' }).valid).toBe(true)
    })

    it('should fail for empty values', () => {
      expect(required().validate('').valid).toBe(false)
      expect(required().validate('   ').valid).toBe(false)
      expect(required().validate(null).valid).toBe(false)
      expect(required().validate(undefined).valid).toBe(false)
      expect(required().validate([]).valid).toBe(false)
    })

    it('should use custom message', () => {
      const rule = required('Custom required message')
      const result = rule.validate('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Custom required message')
    })
  })

  describe('email', () => {
    it('should pass for valid emails', () => {
      expect(email().validate('test@example.com').valid).toBe(true)
      expect(email().validate('user.name+tag@domain.co.uk').valid).toBe(true)
    })

    it('should fail for invalid emails', () => {
      expect(email().validate('invalid').valid).toBe(false)
      expect(email().validate('@example.com').valid).toBe(false)
      expect(email().validate('test@').valid).toBe(false)
      expect(email().validate('test @example.com').valid).toBe(false)
    })

    it('should skip if empty', () => {
      expect(email().validate('').valid).toBe(true)
      expect(email().validate(null).valid).toBe(true)
    })
  })

  describe('minLength', () => {
    it('should pass for strings with sufficient length', () => {
      expect(minLength(5).validate('hello').valid).toBe(true)
      expect(minLength(5).validate('hello world').valid).toBe(true)
    })

    it('should fail for strings with insufficient length', () => {
      expect(minLength(5).validate('hi').valid).toBe(false)
      expect(minLength(5).validate('hey').valid).toBe(false)
    })

    it('should work with arrays', () => {
      expect(minLength(3).validate([1, 2, 3]).valid).toBe(true)
      expect(minLength(3).validate([1, 2]).valid).toBe(false)
    })

    it('should skip if empty', () => {
      expect(minLength(5).validate('').valid).toBe(true)
    })
  })

  describe('maxLength', () => {
    it('should pass for strings within limit', () => {
      expect(maxLength(5).validate('hello').valid).toBe(true)
      expect(maxLength(5).validate('hi').valid).toBe(true)
    })

    it('should fail for strings exceeding limit', () => {
      expect(maxLength(5).validate('hello world').valid).toBe(false)
    })

    it('should work with arrays', () => {
      expect(maxLength(3).validate([1, 2, 3]).valid).toBe(true)
      expect(maxLength(3).validate([1, 2, 3, 4]).valid).toBe(false)
    })
  })

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      expect(pattern(/^[a-z]+$/).validate('hello').valid).toBe(true)
      expect(pattern(/^\d+$/).validate('12345').valid).toBe(true)
    })

    it('should fail for non-matching patterns', () => {
      expect(pattern(/^[a-z]+$/).validate('hello123').valid).toBe(false)
      expect(pattern(/^\d+$/).validate('abc').valid).toBe(false)
    })

    it('should skip if empty', () => {
      expect(pattern(/^[a-z]+$/).validate('').valid).toBe(true)
    })
  })

  describe('min', () => {
    it('should pass for numbers above minimum', () => {
      expect(min(5).validate(10).valid).toBe(true)
      expect(min(5).validate(5).valid).toBe(true)
    })

    it('should fail for numbers below minimum', () => {
      expect(min(5).validate(3).valid).toBe(false)
    })

    it('should handle string numbers', () => {
      expect(min(5).validate('10').valid).toBe(true)
      expect(min(5).validate('3').valid).toBe(false)
    })
  })

  describe('max', () => {
    it('should pass for numbers below maximum', () => {
      expect(max(10).validate(5).valid).toBe(true)
      expect(max(10).validate(10).valid).toBe(true)
    })

    it('should fail for numbers above maximum', () => {
      expect(max(10).validate(15).valid).toBe(false)
    })
  })

  describe('url', () => {
    it('should pass for valid URLs', () => {
      expect(url().validate('https://example.com').valid).toBe(true)
      expect(url().validate('http://example.com/path').valid).toBe(true)
    })

    it('should fail for invalid URLs', () => {
      expect(url().validate('not-a-url').valid).toBe(false)
      expect(url().validate('ftp://example.com').valid).toBe(false)
    })

    it('should skip if empty', () => {
      expect(url().validate('').valid).toBe(true)
    })
  })

  describe('phone', () => {
    it('should pass for valid Chinese phone numbers', () => {
      expect(phone().validate('13812345678').valid).toBe(true)
      expect(phone().validate('15987654321').valid).toBe(true)
    })

    it('should fail for invalid phone numbers', () => {
      expect(phone().validate('12345678901').valid).toBe(false)
      expect(phone().validate('1381234567').valid).toBe(false)
    })
  })

  describe('number', () => {
    it('should pass for valid numbers', () => {
      expect(number().validate(123).valid).toBe(true)
      expect(number().validate(12.34).valid).toBe(true)
      expect(number().validate('123').valid).toBe(true)
    })

    it('should fail for non-numbers', () => {
      expect(number().validate('abc').valid).toBe(false)
      expect(number().validate(NaN).valid).toBe(false)
    })
  })

  describe('integer', () => {
    it('should pass for integers', () => {
      expect(integer().validate(123).valid).toBe(true)
      expect(integer().validate('123').valid).toBe(true)
    })

    it('should fail for non-integers', () => {
      expect(integer().validate(12.34).valid).toBe(false)
      expect(integer().validate('12.34').valid).toBe(false)
    })
  })

  describe('date', () => {
    it('should pass for valid dates', () => {
      expect(date().validate('2024-01-01').valid).toBe(true)
      expect(date().validate('2024/01/01').valid).toBe(true)
    })

    it('should fail for invalid dates', () => {
      expect(date().validate('not-a-date').valid).toBe(false)
      expect(date().validate('2024-13-01').valid).toBe(false)
    })
  })

  describe('oneOf', () => {
    it('should pass for values in the list', () => {
      expect(oneOf(['a', 'b', 'c']).validate('a').valid).toBe(true)
      expect(oneOf([1, 2, 3]).validate(2).valid).toBe(true)
    })

    it('should fail for values not in the list', () => {
      expect(oneOf(['a', 'b', 'c']).validate('d').valid).toBe(false)
    })
  })

  describe('notOneOf', () => {
    it('should pass for values not in the list', () => {
      expect(notOneOf(['a', 'b', 'c']).validate('d').valid).toBe(true)
    })

    it('should fail for values in the list', () => {
      expect(notOneOf(['a', 'b', 'c']).validate('a').valid).toBe(false)
    })
  })

  describe('equals', () => {
    it('should pass when values match', () => {
      const context = { values: { password: 'secret123' }, fieldName: 'confirmPassword', fieldNames: ['password', 'confirmPassword'] }
      expect(equals('password').validate('secret123', context).valid).toBe(true)
    })

    it('should fail when values do not match', () => {
      const context = { values: { password: 'secret123' }, fieldName: 'confirmPassword', fieldNames: ['password', 'confirmPassword'] }
      expect(equals('password').validate('different', context).valid).toBe(false)
    })
  })

  describe('custom', () => {
    it('should pass when custom validation returns true', () => {
      const rule = custom('even', (value: number) => value % 2 === 0)
      expect(rule.validate(4).valid).toBe(true)
    })

    it('should fail when custom validation returns false', () => {
      const rule = custom('even', (value: number) => value % 2 === 0)
      expect(rule.validate(3).valid).toBe(false)
    })
  })

  describe('chain', () => {
    it('should build chained validators', () => {
      const rules = chain<string>()
        .required()
        .minLength(5)
        .maxLength(20)
        .build()

      expect(rules.length).toBe(3)
      expect(rules[0].name).toBe('required')
      expect(rules[1].name).toBe('minLength')
      expect(rules[2].name).toBe('maxLength')
    })

    it('should validate with chained rules', () => {
      const rules = chain<string>()
        .required()
        .minLength(5)
        .email()
        .build()

      // All rules pass
      let allValid = true
      for (const rule of rules) {
        const result = rule.validate('test@example.com')
        if (!result.valid) {
          allValid = false
          break
        }
      }
      expect(allValid).toBe(true)

      // First rule fails
      const firstResult = rules[0].validate('')
      expect(firstResult.valid).toBe(false)
    })
  })
})