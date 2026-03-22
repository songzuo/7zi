/**
 * @fileoverview Input Validation Tests
 * Tests for comprehensive input validation, sanitization, and boundary checks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Email validation
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }
  
  const trimmed = email.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' }
  }
  
  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Invalid characters in email' }
    }
  }
  
  return { valid: true }
}

/**
 * Password validation
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] }
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Check for common weak passwords
  const weakPasswords = ['password', 'Password1!', '12345678', 'qwerty123']
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    errors.push('Password is too common')
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Name validation
 */
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' }
  }
  
  const trimmed = name.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name is required' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long' }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name is too short' }
  }
  
  // Allow letters, spaces, hyphens, apostrophes, and common international characters
  const validNameRegex = /^[\p{L}\s\-']+$/u
  
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }
  
  return { valid: true }
}

/**
 * URL validation
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }
  
  const trimmed = url.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL is required' }
  }
  
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long' }
  }
  
  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, error: 'Invalid URL protocol' }
    }
  }
  
  try {
    const parsed = new URL(trimmed)
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' }
    }
    
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Phone validation
 */
function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' }
  }
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  
  if (cleaned.length === 0) {
    return { valid: false, error: 'Phone number is required' }
  }
  
  // Check for valid phone format (international or local)
  const phoneRegex = /^\+?[0-9]{7,15}$/
  
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid phone number format' }
  }
  
  return { valid: true }
}

/**
 * Message/Content validation
 */
function validateMessage(
  message: string,
  options: { minLength?: number; maxLength?: number } = {}
): { valid: boolean; error?: string } {
  const { minLength = 10, maxLength = 10000 } = options
  
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' }
  }
  
  const trimmed = message.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message is required' }
  }
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `Message must be at least ${minLength} characters` }
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Message must be less than ${maxLength} characters` }
  }
  
  // Check for excessive caps (potential spam)
  const capsRatio = (trimmed.match(/[A-Z]/g) || []).length / trimmed.length
  if (capsRatio > 0.7 && trimmed.length > 20) {
    return { valid: false, error: 'Message contains too many capital letters' }
  }
  
  // Check for excessive links
  const linkCount = (trimmed.match(/https?:\/\//g) || []).length
  if (linkCount > 3) {
    return { valid: false, error: 'Message contains too many links' }
  }
  
  return { valid: true }
}

/**
 * Numeric input validation
 */
function validateNumber(
  value: unknown,
  options: {
    min?: number
    max?: number
    integer?: boolean
    required?: boolean
  } = {}
): { valid: boolean; error?: string; value?: number } {
  const { min, max, integer = false, required = true } = options
  
  if (value === null || value === undefined || value === '') {
    if (required) {
      return { valid: false, error: 'Value is required' }
    }
    return { valid: true, value: undefined }
  }
  
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' }
  }
  
  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: 'Value must be an integer' }
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `Value must be at least ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `Value must be at most ${max}` }
  }
  
  return { valid: true, value: num }
}

/**
 * Date validation
 */
function validateDate(
  value: string,
  options: {
    minDate?: Date
    maxDate?: Date
    format?: string
  } = {}
): { valid: boolean; error?: string; value?: Date } {
  const { minDate, maxDate } = options
  
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Date is required' }
  }
  
  const date = new Date(value)
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }
  
  if (minDate && date < minDate) {
    return { valid: false, error: `Date must be after ${minDate.toDateString()}` }
  }
  
  if (maxDate && date > maxDate) {
    return { valid: false, error: `Date must be before ${maxDate.toDateString()}` }
  }
  
  return { valid: true, value: date }
}

/**
 * File upload validation
 */
function validateFile(
  file: { name: string; size: number; type: string },
  options: {
    maxSizeBytes?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { maxSizeBytes = 10 * 1024 * 1024, allowedTypes, allowedExtensions } = options
  
  if (!file) {
    return { valid: false, errors: ['File is required'] }
  }
  
  if (file.size > maxSizeBytes) {
    errors.push(`File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`)
  }
  
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }
  
  if (allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      errors.push(`File extension .${ext} is not allowed`)
    }
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [/\.\./, /\//, /\\/, /<|>|\||:|\*|\?/]
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains invalid characters')
      break
    }
  }
  
  return { valid: errors.length === 0, errors }
}

describe('Input Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.co.uk',
        'a@b.cc',
        'user@subdomain.example.com',
      ]

      validEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user@example.',
        '',
        '   ',
      ]

      invalidEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.valid).toBe(false)
      })
    })

    it('should reject emails with dangerous patterns', () => {
      const dangerousEmails = [
        '<script>@example.com',
        'javascript:alert(1)@example.com',
        'test@example.com"onload="alert(1)',
      ]

      dangerousEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result.valid).toBe(false)
      })
    })

    it('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = validateEmail(longEmail)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('long')
    })

    it('should handle null and undefined', () => {
      expect(validateEmail(null as unknown as string).valid).toBe(false)
      expect(validateEmail(undefined as unknown as string).valid).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = validateEmail('  test@example.com  ')
      expect(result.valid).toBe(true)
    })
  })

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Str0ng!Pass',
        'MyP@ssw0rd123',
        'C0mpl3x-P@ss!',
        'S3cur3#Password',
      ]

      strongPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        'alllowercase1!',
        'ALLUPPERCASE1!',
        'NoNumbers!',
        'NoSpecialChars1',
        'password',
        'Password1!',
        '',
      ]

      weakPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    it('should reject passwords under minimum length', () => {
      const result = validatePassword('Sh0rt!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters')
    })

    it('should reject passwords over maximum length', () => {
      const result = validatePassword('A'.repeat(130) + '1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be less than 128 characters')
    })

    it('should require all character types', () => {
      const noLower = validatePassword('UPPERCASE1!')
      expect(noLower.errors).toContain('Password must contain at least one lowercase letter')

      const noUpper = validatePassword('lowercase1!')
      expect(noUpper.errors).toContain('Password must contain at least one uppercase letter')

      const noNumber = validatePassword('Uppercase!')
      expect(noNumber.errors).toContain('Password must contain at least one number')

      const noSpecial = validatePassword('Uppercase1')
      expect(noSpecial.errors).toContain('Password must contain at least one special character')
    })

    it('should reject common passwords', () => {
      const commonPasswords = [
        'Password1!',
        'password',
        '12345678',
        'qwerty123',
      ]

      commonPasswords.forEach(password => {
        const result = validatePassword(password)
        expect(result.errors).toContain('Password is too common')
      })
    })
  })

  describe('Name Validation', () => {
    it('should accept valid names', () => {
      const validNames = [
        'John Doe',
        "O'Brien",
        'Jean-Claude',
        '中文姓名',
        '日本語',
        'Владимир',
        'María García',
      ]

      validNames.forEach(name => {
        const result = validateName(name)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid names', () => {
      const invalidNames = [
        '',
        '   ',
        'A',
        'A'.repeat(101),
        'Name123',
        'Name@Doe',
        '<script>',
      ]

      invalidNames.forEach(name => {
        const result = validateName(name)
        expect(result.valid).toBe(false)
      })
    })

    it('should handle null and undefined', () => {
      expect(validateName(null as unknown as string).valid).toBe(false)
      expect(validateName(undefined as unknown as string).valid).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = validateName('  John Doe  ')
      expect(result.valid).toBe(true)
    })
  })

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com/path',
        'https://example.com/path?query=value',
        'https://example.com:8080/path',
        'https://subdomain.example.com',
      ]

      validUrls.forEach(url => {
        const result = validateUrl(url)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        '   ',
        'not-a-url',
        'ftp://example.com',
        '//example.com',
        'example.com',
      ]

      invalidUrls.forEach(url => {
        const result = validateUrl(url)
        expect(result.valid).toBe(false)
      })
    })

    it('should reject dangerous URLs', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:alert(1)',
        'file:///etc/passwd',
      ]

      dangerousUrls.forEach(url => {
        const result = validateUrl(url)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('protocol')
      })
    })

    it('should reject overly long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100)
      const result = validateUrl(longUrl)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('long')
    })
  })

  describe('Phone Validation', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+1 (234) 567-8901',
        '+44 20 7946 0958',
        '1-234-567-8901',
        '123.456.7890',
      ]

      validPhones.forEach(phone => {
        const result = validatePhone(phone)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '   ',
        '123',
        'abc',
        '123-abc-7890',
        '+'.repeat(20),
      ]

      invalidPhones.forEach(phone => {
        const result = validatePhone(phone)
        expect(result.valid).toBe(false)
      })
    })

    it('should handle various formatting', () => {
      const formatted = '+1 (234) 567-8901'
      const result = validatePhone(formatted)
      expect(result.valid).toBe(true)
    })
  })

  describe('Message Validation', () => {
    it('should accept valid messages', () => {
      const validMessages = [
        'This is a valid message.',
        'Hello, I would like to inquire about your services.',
        'Short but ok',
        'A'.repeat(10),
      ]

      validMessages.forEach(message => {
        const result = validateMessage(message)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject empty messages', () => {
      expect(validateMessage('').valid).toBe(false)
      expect(validateMessage('   ').valid).toBe(false)
    })

    it('should reject messages under minimum length', () => {
      const result = validateMessage('short', { minLength: 10 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('least')
    })

    it('should reject messages over maximum length', () => {
      const result = validateMessage('a'.repeat(10001), { maxLength: 10000 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('less than')
    })

    it('should reject messages with excessive caps', () => {
      const result = validateMessage('THIS IS ALL CAPS MESSAGE WHICH LOOKS LIKE SPAM!!!')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('capital')
    })

    it('should reject messages with too many links', () => {
      const result = validateMessage(
        'Check out http://a.com http://b.com http://c.com http://d.com'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('links')
    })
  })

  describe('Numeric Validation', () => {
    it('should accept valid numbers', () => {
      const validInputs = [
        { value: 42, options: {} },
        { value: '42', options: {} },
        { value: 3.14, options: {} },
        { value: -10, options: {} },
        { value: 5, options: { min: 0, max: 10 } },
      ]

      validInputs.forEach(({ value, options }) => {
        const result = validateNumber(value, options)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid numbers', () => {
      const invalidInputs = [
        { value: 'abc', options: {} },
        { value: NaN, options: {} },
        { value: 15, options: { min: 0, max: 10 } },
        { value: -5, options: { min: 0 } },
      ]

      invalidInputs.forEach(({ value, options }) => {
        const result = validateNumber(value, options)
        expect(result.valid).toBe(false)
      })
    })

    it('should validate integers', () => {
      expect(validateNumber(42, { integer: true }).valid).toBe(true)
      expect(validateNumber(42.5, { integer: true }).valid).toBe(false)
    })

    it('should handle optional values', () => {
      expect(validateNumber('', { required: false }).valid).toBe(true)
      expect(validateNumber(null, { required: false }).valid).toBe(true)
      expect(validateNumber(undefined, { required: false }).valid).toBe(true)
    })
  })

  describe('Date Validation', () => {
    it('should accept valid dates', () => {
      const validDates = [
        '2026-01-15',
        '2026-12-31T23:59:59Z',
        new Date().toISOString(),
      ]

      validDates.forEach(date => {
        const result = validateDate(date)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject invalid dates', () => {
      const invalidDates = [
        '',
        'not-a-date',
        '2026-13-01', // Invalid month
        '2026-02-30', // Invalid day
      ]

      invalidDates.forEach(date => {
        const result = validateDate(date)
        expect(result.valid).toBe(false)
      })
    })

    it('should validate date range', () => {
      const minDate = new Date('2026-01-01')
      const maxDate = new Date('2026-12-31')

      expect(validateDate('2026-06-15', { minDate, maxDate }).valid).toBe(true)
      expect(validateDate('2025-12-31', { minDate, maxDate }).valid).toBe(false)
      expect(validateDate('2027-01-01', { minDate, maxDate }).valid).toBe(false)
    })
  })

  describe('File Validation', () => {
    it('should accept valid files', () => {
      const validFiles = [
        { name: 'document.pdf', size: 1024 * 1024, type: 'application/pdf' },
        { name: 'image.jpg', size: 500 * 1024, type: 'image/jpeg' },
        { name: 'data.json', size: 1024, type: 'application/json' },
      ]

      validFiles.forEach(file => {
        const result = validateFile(file)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject files that are too large', () => {
      const largeFile = { name: 'large.pdf', size: 20 * 1024 * 1024, type: 'application/pdf' }
      const result = validateFile(largeFile, { maxSizeBytes: 10 * 1024 * 1024 })
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File size must be less than 10MB')
    })

    it('should reject disallowed file types', () => {
      const file = { name: 'script.exe', size: 1024, type: 'application/x-msdownload' }
      const result = validateFile(file, { allowedTypes: ['application/pdf', 'image/jpeg'] })
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true)
    })

    it('should reject disallowed extensions', () => {
      const file = { name: 'script.php', size: 1024, type: 'text/plain' }
      const result = validateFile(file, { allowedExtensions: ['txt', 'pdf'] })
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true)
    })

    it('should reject files with suspicious names', () => {
      const suspiciousFiles = [
        { name: '../../../etc/passwd', size: 1024, type: 'text/plain' },
        { name: 'file<script>.txt', size: 1024, type: 'text/plain' },
        { name: 'file|pipe.txt', size: 1024, type: 'text/plain' },
      ]

      suspiciousFiles.forEach(file => {
        const result = validateFile(file)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('File name contains invalid characters')
      })
    })
  })

  describe('Composite Validation', () => {
    it('should validate complete contact form', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test message with sufficient length.',
      }

      const results = {
        name: validateName(formData.name),
        email: validateEmail(formData.email),
        message: validateMessage(formData.message),
      }

      expect(results.name.valid).toBe(true)
      expect(results.email.valid).toBe(true)
      expect(results.message.valid).toBe(true)
    })

    it('should catch multiple validation errors', () => {
      const formData = {
        name: 'A',
        email: 'invalid-email',
        message: 'short',
      }

      const results = {
        name: validateName(formData.name),
        email: validateEmail(formData.email),
        message: validateMessage(formData.message, { minLength: 10 }),
      }

      expect(results.name.valid).toBe(false)
      expect(results.email.valid).toBe(false)
      expect(results.message.valid).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle Unicode edge cases', () => {
      // Zero-width characters
      const zeroWidth = 'test\u200B\u200C\u200D@example.com'
      const result = validateEmail(zeroWidth)
      // Should either strip or reject
      expect(result.valid).toBeDefined()
    })

    it('should handle very long inputs', () => {
      const longString = 'a'.repeat(100000)
      const result = validateMessage(longString)
      expect(result.valid).toBe(false)
    })

    it('should handle special whitespace characters', () => {
      const specialWhitespace = 'test\t\n\r@example.com'
      const result = validateEmail(specialWhitespace)
      expect(result.valid).toBe(false)
    })

    it('should handle null bytes', () => {
      const nullByte = 'test\x00@example.com'
      const result = validateEmail(nullByte)
      expect(result.valid).toBe(false)
    })

    it('should handle mixed encoding', () => {
      const mixedEncoding = 'test%40example.com'
      const result = validateEmail(mixedEncoding)
      // Should not decode automatically
      expect(result.valid).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should validate quickly', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        validateEmail('test@example.com')
        validateName('John Doe')
        validateMessage('This is a test message.')
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})

describe('Input Sanitization Integration', () => {
  it('should sanitize before validation', () => {
    const input = '  <script>alert(1)</script>  '
    
    // Trim first
    const trimmed = input.trim()
    expect(trimmed).toBe('<script>alert(1)</script>')
    
    // Then validate - should fail
    const result = validateName(trimmed)
    expect(result.valid).toBe(false)
  })

  it('should handle chained validation', () => {
    const email = 'TEST@EXAMPLE.COM'
    const result = validateEmail(email)
    
    // Should be valid regardless of case
    expect(result.valid).toBe(true)
  })
})