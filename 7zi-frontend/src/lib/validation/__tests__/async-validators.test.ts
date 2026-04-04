/**
 * Unit Tests for Async Validators
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAsyncValidator,
  uniqueEmail,
  availableUsername,
  validPhone,
  validCaptcha,
  createRetryableAsyncValidator,
  createCachedAsyncValidator,
} from '../async-validators'

describe('Async Validators', () => {
  describe('createAsyncValidator', () => {
    it('should create an async validator', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = createAsyncValidator('test', checkFn, 'Validation failed')

      const result = await validator.validate('test')
      expect(result.valid).toBe(true)
      expect(checkFn).toHaveBeenCalledWith('test', undefined)
    })

    it('should return error message on failure', async () => {
      const checkFn = vi.fn().mockResolvedValue(false)
      const validator = createAsyncValidator('test', checkFn, 'Custom error')

      const result = await validator.validate('test')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Custom error')
    })

    it('should handle errors gracefully', async () => {
      const checkFn = vi.fn().mockRejectedValue(new Error('API error'))
      const validator = createAsyncValidator('test', checkFn, 'Validation failed')

      const result = await validator.validate('test')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Validation failed')
    })

    it('should pass context to validation function', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = createAsyncValidator('test', checkFn, 'Validation failed')

      const context = { country: 'US' }
      await validator.validate('test', context)
      expect(checkFn).toHaveBeenCalledWith('test', context)
    })
  })

  describe('uniqueEmail', () => {
    it('should validate unique email', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = uniqueEmail(checkFn, 'Email already exists')

      const result = await validator.validate('new@example.com')
      expect(result.valid).toBe(true)
    })

    it('should fail for duplicate email', async () => {
      const checkFn = vi.fn().mockResolvedValue(false)
      const validator = uniqueEmail(checkFn, 'Email already exists')

      const result = await validator.validate('existing@example.com')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Email already exists')
    })

    it('should skip validation for empty email', async () => {
      const checkFn = vi.fn()
      const validator = uniqueEmail(checkFn, 'Email already exists')

      const result = await validator.validate('')
      expect(result.valid).toBe(true)
      expect(checkFn).not.toHaveBeenCalled()
    })

    it('should skip validation for invalid email format', async () => {
      const checkFn = vi.fn()
      const validator = uniqueEmail(checkFn, 'Email already exists')

      const result = await validator.validate('not-an-email')
      expect(result.valid).toBe(true)
      expect(checkFn).not.toHaveBeenCalled()
    })
  })

  describe('availableUsername', () => {
    it('should validate available username', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = availableUsername(checkFn, 'Username taken')

      const result = await validator.validate('newuser')
      expect(result.valid).toBe(true)
    })

    it('should fail for taken username', async () => {
      const checkFn = vi.fn().mockResolvedValue(false)
      const validator = availableUsername(checkFn, 'Username taken')

      const result = await validator.validate('existing')
      expect(result.valid).toBe(false)
    })

    it('should skip validation for short username', async () => {
      const checkFn = vi.fn()
      const validator = availableUsername(checkFn, 'Username taken')

      const result = await validator.validate('ab')
      expect(result.valid).toBe(true)
      expect(checkFn).not.toHaveBeenCalled()
    })
  })

  describe('validPhone', () => {
    it('should validate phone number', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = validPhone(checkFn, 'Invalid phone')

      const result = await validator.validate('13812345678')
      expect(result.valid).toBe(true)
    })

    it('should skip validation for empty phone', async () => {
      const checkFn = vi.fn()
      const validator = validPhone(checkFn, 'Invalid phone')

      const result = await validator.validate('')
      expect(result.valid).toBe(true)
      expect(checkFn).not.toHaveBeenCalled()
    })
  })

  describe('validCaptcha', () => {
    it('should validate captcha', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = validCaptcha(checkFn, 'CAPTCHA failed')

      const result = await validator.validate('valid-token')
      expect(result.valid).toBe(true)
    })

    it('should fail for empty captcha', async () => {
      const checkFn = vi.fn()
      const validator = validCaptcha(checkFn, 'CAPTCHA failed')

      const result = await validator.validate('')
      expect(result.valid).toBe(false)
    })

    it('should have no debounce', () => {
      const checkFn = vi.fn()
      const validator = validCaptcha(checkFn, 'CAPTCHA failed')
      expect(validator.debounce).toBe(0)
    })
  })

  describe('createRetryableAsyncValidator', () => {
    it('should retry on failure', async () => {
      let attempts = 0
      const checkFn = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary error')
        }
        return Promise.resolve(true)
      })

      const validator = createRetryableAsyncValidator(
        'test',
        checkFn,
        'Validation failed',
        { maxRetries: 3, retryDelay: 10 }
      )

      const result = await validator.validate('test')
      expect(result.valid).toBe(true)
      expect(attempts).toBe(3)
    })

    it('should fail after max retries', async () => {
      const checkFn = vi.fn().mockRejectedValue(new Error('Persistent error'))

      const validator = createRetryableAsyncValidator(
        'test',
        checkFn,
        'Validation failed',
        { maxRetries: 2, retryDelay: 10 }
      )

      const result = await validator.validate('test')
      expect(result.valid).toBe(false)
      expect(checkFn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('createCachedAsyncValidator', () => {
    it('should cache validation results', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = createCachedAsyncValidator(
        'test',
        checkFn,
        'Validation failed',
        { cacheTime: 1000 }
      )

      // First call
      await validator.validate('test')
      expect(checkFn).toHaveBeenCalledTimes(1)

      // Second call (should use cache)
      await validator.validate('test')
      expect(checkFn).toHaveBeenCalledTimes(1)
    })

    it('should expire cache after cacheTime', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = createCachedAsyncValidator(
        'test',
        checkFn,
        'Validation failed',
        { cacheTime: 100 }
      )

      // First call
      await validator.validate('test')
      expect(checkFn).toHaveBeenCalledTimes(1)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Second call (should not use cache)
      await validator.validate('test')
      expect(checkFn).toHaveBeenCalledTimes(2)
    })

    it('should cache different values separately', async () => {
      const checkFn = vi.fn().mockResolvedValue(true)
      const validator = createCachedAsyncValidator(
        'test',
        checkFn,
        'Validation failed',
        { cacheTime: 1000 }
      )

      await validator.validate('value1')
      await validator.validate('value2')
      expect(checkFn).toHaveBeenCalledTimes(2)
    })
  })
})