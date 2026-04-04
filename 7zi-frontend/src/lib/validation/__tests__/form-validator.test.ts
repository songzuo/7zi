/**
 * Unit Tests for Form Validator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FormValidator, createFormValidator, createFormRule, validateValue } from '../form-validator'
import { required, email, minLength, maxLength, equals } from '../validators'
import type { FormConfig } from '../types'

describe('FormValidator', () => {
  let validator: FormValidator

  beforeEach(() => {
    const config: FormConfig = {
      fields: [
        {
          name: 'username',
          initialValue: '',
          rules: [required(), minLength(3), maxLength(20)],
          trigger: 'onBlur',
        },
        {
          name: 'email',
          initialValue: '',
          rules: [required(), email()],
          trigger: 'onBlur',
        },
        {
          name: 'password',
          initialValue: '',
          rules: [required(), minLength(8)],
          trigger: 'onChange',
        },
        {
          name: 'confirmPassword',
          initialValue: '',
          rules: [required(), equals('password')],
          trigger: 'onBlur',
        },
      ],
    }
    validator = new FormValidator(config)
  })

  describe('validateField', () => {
    it('should validate a field with all rules', () => {
      const result = validator.validateField('username', 'john_doe')
      expect(result.valid).toBe(true)
      expect(result.errors.username).toBeUndefined()
    })

    it('should fail validation for invalid values', () => {
      const result = validator.validateField('username', 'ab') // Too short
      expect(result.valid).toBe(false)
      expect(result.errors.username?.length).toBeGreaterThan(0)
    })

    it('should validate email correctly', () => {
      const result = validator.validateField('email', 'invalid-email')
      expect(result.valid).toBe(false)
    })

    it('should pass valid email', () => {
      const result = validator.validateField('email', 'test@example.com')
      expect(result.valid).toBe(true)
    })
  })

  describe('validateAll', () => {
    it('should validate all fields', () => {
      const values = {
        username: 'john_doe',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }

      const result = validator.validateAll(values)
      expect(result.valid).toBe(true)
    })

    it('should fail if any field is invalid', () => {
      const values = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }

      const result = validator.validateAll(values)
      expect(result.valid).toBe(false)
      expect(result.errors.username?.length).toBeGreaterThan(0)
    })
  })

  describe('form-level validation', () => {
    it('should run form-level rules', () => {
      const config: FormConfig = {
        fields: [
          { name: 'email', rules: [required(), email()] },
          { name: 'confirmEmail', rules: [required(), equals('email')] },
        ],
        formRules: [
          createFormRule('emails_match', (values) => {
            if (values.email !== values.confirmEmail) {
              return 'Emails must match'
            }
            return true
          }, 'Emails must match'),
        ],
      }

      const formValidator = new FormValidator(config)
      const result = formValidator.validateAll({
        email: 'test@example.com',
        confirmEmail: 'different@example.com',
      })

      expect(result.valid).toBe(false)
      expect(result.formErrors).toContain('Emails must match')
    })
  })

  describe('field state management', () => {
    it('should track field states', () => {
      const state = validator.getFieldState('username')
      expect(state).toBeDefined()
      expect(state?.value).toBe('')
      expect(state?.touched).toBe(false)
    })

    it('should update field value on change', () => {
      validator.handleChange('username', 'john', { username: 'john' })
      const state = validator.getFieldState('username')
      expect(state?.value).toBe('john')
      expect(state?.touched).toBe(true)
    })

    it('should trigger onBlur validation', () => {
      validator.handleChange('username', 'ab', { username: 'ab' })
      validator.handleBlur('username', { username: 'ab' })

      const state = validator.getFieldState('username')
      expect(state?.validated).toBe(true)
      expect(state?.errors.length).toBeGreaterThan(0)
    })
  })

  describe('reset', () => {
    it('should reset all fields to initial state', () => {
      validator.handleChange('username', 'test', { username: 'test' })
      validator.validateField('username', 'ab')

      validator.reset()

      const state = validator.getFieldState('username')
      expect(state?.value).toBe('')
      expect(state?.touched).toBe(false)
      expect(state?.errors).toEqual([])
    })

    it('should reset specific field', () => {
      validator.handleChange('username', 'test', { username: 'test' })
      validator.validateField('username', 'ab')

      validator.resetField('username')

      const state = validator.getFieldState('username')
      expect(state?.value).toBe('')
      expect(state?.touched).toBe(false)
    })
  })

  describe('setFieldValue', () => {
    it('should set field value programmatically', () => {
      validator.setFieldValue('username', 'newuser')
      const state = validator.getFieldState('username')
      expect(state?.value).toBe('newuser')
    })

    it('should set multiple field values', () => {
      validator.setFieldValues({
        username: 'user1',
        email: 'test@example.com',
      })

      expect(validator.getFieldState('username')?.value).toBe('user1')
      expect(validator.getFieldState('email')?.value).toBe('test@example.com')
    })
  })

  describe('isValid / isDirty', () => {
    it('should check if form is valid', () => {
      expect(validator.isValid()).toBe(true)

      validator.validateField('username', 'ab')
      expect(validator.isValid()).toBe(false)
    })

    it('should check if form is dirty', () => {
      expect(validator.isDirty()).toBe(false)

      validator.handleChange('username', 'test', { username: 'test' })
      expect(validator.isDirty()).toBe(true)
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      validator.validateField('username', 'ab')
      expect(validator.getFieldErrors('username').length).toBeGreaterThan(0)

      validator.clearErrors()
      expect(validator.getFieldErrors('username')).toEqual([])
    })
  })
})

describe('validateValue', () => {
  it('should validate a value with rules', () => {
    const rules = [required(), minLength(5), maxLength(10)]
    const result = validateValue('hello', rules)
    expect(result.valid).toBe(true)
  })

  it('should return first error', () => {
    const rules = [required(), minLength(5)]
    const result = validateValue('', rules)
    expect(result.valid).toBe(false)
  })
})

describe('createFormValidator', () => {
  it('should create a form validator instance', () => {
    const config: FormConfig = {
      fields: [{ name: 'test', rules: [required()] }],
    }
    const validator = createFormValidator(config)
    expect(validator).toBeInstanceOf(FormValidator)
  })
})