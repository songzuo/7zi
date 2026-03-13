/**
 * Contact Form Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  validateContactForm,
  getSubjectOptions,
  FormData,
  ValidationResult,
} from '@/components/contact/validation'

describe('validateContactForm', () => {
  describe('Name Validation', () => {
    it('returns error when name is empty', () => {
      const data: FormData = {
        name: '',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBe('请输入您的姓名')
    })

    it('returns error when name is whitespace only', () => {
      const data: FormData = {
        name: '   ',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBe('请输入您的姓名')
    })

    it('validates successfully with valid name', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
      expect(result.errors.name).toBeUndefined()
    })
  })

  describe('Email Validation', () => {
    it('returns error when email is empty', () => {
      const data: FormData = {
        name: 'John Doe',
        email: '',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('请输入您的邮箱')
    })

    it('returns error when email has no @ symbol', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'invalid-email',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('请输入有效的邮箱地址')
    })

    it('returns error when email has no domain', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('请输入有效的邮箱地址')
    })

    it('returns error when email has no TLD', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('请输入有效的邮箱地址')
    })

    it('validates successfully with valid email', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
      expect(result.errors.email).toBeUndefined()
    })

    it('validates email with subdomain', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@mail.example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
    })

    it('validates email with plus sign', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test+tag@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a test message that is long enough',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('Message Validation', () => {
    it('returns error when message is empty', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: '',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.message).toBe('请输入消息内容')
    })

    it('returns error when message is whitespace only', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: '   ',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.message).toBe('请输入消息内容')
    })

    it('returns error when message is too short', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'Short',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.message).toBe('消息内容至少需要 10 个字符')
    })

    it('returns error when message is exactly 9 characters', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: '123456789',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.message).toBe('Message must be at least 10 characters')
    })

    it('validates successfully with message at minimum length', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: '1234567890',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
    })

    it('validates successfully with long message', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a very long message that contains many characters and should definitely pass validation.',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
      expect(result.errors.message).toBeUndefined()
    })
  })

  describe('Multiple Field Validation', () => {
    it('returns all errors when multiple fields are invalid', () => {
      const data: FormData = {
        name: '',
        email: 'invalid',
        company: 'Test Corp',
        subject: 'project',
        message: '',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBeDefined()
      expect(result.errors.email).toBeDefined()
      expect(result.errors.message).toBeDefined()
    })

    it('returns single error when only one field is invalid', () => {
      const data: FormData = {
        name: '',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: 'project',
        message: 'This is a valid message',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBeDefined()
      expect(result.errors.email).toBeUndefined()
      expect(result.errors.message).toBeUndefined()
    })
  })

  describe('Locale Support', () => {
    it('returns Chinese error messages for zh locale', () => {
      const data: FormData = {
        name: '',
        email: 'invalid',
        company: '',
        subject: '',
        message: '',
      }
      
      const result = validateContactForm(data, 'zh')
      
      expect(result.errors.name).toBe('请输入您的姓名')
      expect(result.errors.email).toBe('请输入有效的邮箱地址')
      expect(result.errors.message).toBe('请输入消息内容')
    })

    it('returns English error messages for en locale', () => {
      const data: FormData = {
        name: '',
        email: 'invalid',
        company: '',
        subject: '',
        message: '',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.errors.name).toBe('Please enter your name')
      expect(result.errors.email).toBe('Please enter a valid email address')
      expect(result.errors.message).toBe('Please enter your message')
    })

    it('defaults to zh locale when not specified', () => {
      const data: FormData = {
        name: '',
        email: '',
        company: '',
        subject: '',
        message: '',
      }
      
      const result = validateContactForm(data)
      
      expect(result.errors.name).toBe('请输入您的姓名')
      expect(result.errors.email).toBe('请输入您的邮箱')
    })
  })

  describe('Optional Fields', () => {
    it('allows empty company field', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: '',
        subject: '',
        message: 'This is a valid message content',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
      expect(result.errors.company).toBeUndefined()
    })

    it('allows empty subject field', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'test@example.com',
        company: 'Test Corp',
        subject: '',
        message: 'This is a valid message content',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('Complete Valid Form', () => {
    it('validates a complete valid form', () => {
      const data: FormData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        company: 'Test Corporation',
        subject: 'project',
        message: 'I am interested in working with you on a new project.',
      }
      
      const result = validateContactForm(data, 'en')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })
})

describe('getSubjectOptions', () => {
  describe('Chinese Locale', () => {
    it('returns Chinese subject options', () => {
      const options = getSubjectOptions('zh')
      
      expect(options).toHaveLength(6)
      expect(options[0]).toEqual({ value: '', label: '选择咨询主题' })
      expect(options[1]).toEqual({ value: 'project', label: '项目咨询' })
      expect(options[2]).toEqual({ value: 'cooperation', label: '商务合作' })
      expect(options[3]).toEqual({ value: 'support', label: '技术支持' })
      expect(options[4]).toEqual({ value: 'careers', label: '加入我们' })
      expect(options[5]).toEqual({ value: 'other', label: '其他' })
    })
  })

  describe('English Locale', () => {
    it('returns English subject options', () => {
      const options = getSubjectOptions('en')
      
      expect(options).toHaveLength(6)
      expect(options[0]).toEqual({ value: '', label: 'Select a topic' })
      expect(options[1]).toEqual({ value: 'project', label: 'Project Inquiry' })
      expect(options[2]).toEqual({ value: 'cooperation', label: 'Business Cooperation' })
      expect(options[3]).toEqual({ value: 'support', label: 'Technical Support' })
      expect(options[4]).toEqual({ value: 'careers', label: 'Join Us' })
      expect(options[5]).toEqual({ value: 'other', label: 'Other' })
    })
  })

  describe('Default Locale', () => {
    it('defaults to Chinese locale', () => {
      const options = getSubjectOptions()
      
      expect(options[0].label).toBe('选择咨询主题')
    })
  })
})
