/**
 * Auth Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword, verifyPassword } from '../repository'

describe('Auth Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Password Functions', () => {
    it('should hash password correctly', () => {
      const password = 'test123'
      const hashed = hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed).toContain(':')
    })

    it('should generate different hashes for same password', () => {
      const password = 'test123'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should verify correct password', () => {
      const password = 'test123'
      const hashed = hashPassword(password)

      expect(verifyPassword(password, hashed)).toBe(true)
    })

    it('should reject incorrect password', () => {
      const password = 'test123'
      const wrongPassword = 'wrong456'
      const hashed = hashPassword(password)

      expect(verifyPassword(wrongPassword, hashed)).toBe(false)
    })

    it('should handle empty password', () => {
      const password = ''
      const hashed = hashPassword(password)

      expect(verifyPassword('', hashed)).toBe(true)
      expect(verifyPassword('wrong', hashed)).toBe(false)
    })

    it('should handle special characters in password', () => {
      const password = 'p@$$w0rd!#*'
      const hashed = hashPassword(password)

      expect(verifyPassword(password, hashed)).toBe(true)
    })

    it('should handle long passwords', () => {
      const password = 'a'.repeat(1000)
      const hashed = hashPassword(password)

      expect(verifyPassword(password, hashed)).toBe(true)
    })
  })

  describe('Password Hash Format', () => {
    it('should have correct hash format', () => {
      const password = 'test123'
      const hashed = hashPassword(password)

      const parts = hashed.split(':')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toHaveLength(32) // 16 bytes * 2 (hex)
      expect(parts[1]).toHaveLength(128) // 64 bytes * 2 (hex)
    })

    it('should use salt for hashing', () => {
      const password = 'test123'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)

      const salt1 = hash1.split(':')[0]
      const salt2 = hash2.split(':')[0]

      expect(salt1).not.toBe(salt2)
    })
  })

  describe('Password Verification Edge Cases', () => {
    it('should reject malformed hash', () => {
      const password = 'test123'
      const malformedHash = 'invalid:hash'

      expect(verifyPassword(password, malformedHash)).toBe(false)
    })

    it('should reject hash with wrong format', () => {
      const password = 'test123'
      const wrongFormat = 'not_a_hash'

      expect(verifyPassword(password, wrongFormat)).toBe(false)
    })
  })
})
