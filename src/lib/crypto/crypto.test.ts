/**
 * crypto 模块测试
 * 测试加密/解密功能的正确性
 */

import { describe, it, expect } from 'vitest'
import {
  encryptApiKey,
  decryptApiKey,
  getEncryptionSecret,
  generateSecureToken,
  encryptSensitiveData,
  decryptSensitiveData,
} from './index'

describe('crypto utils', () => {
  const testSecret = 'test-secret-key-32-chars-long!!'

  describe('encryptApiKey / decryptApiKey', () => {
    it('should encrypt and decrypt API key correctly', () => {
      const apiKey = 'sk-test-12345678901234567890'
      const encrypted = encryptApiKey(apiKey, testSecret)
      const decrypted = decryptApiKey(encrypted, testSecret)
      expect(decrypted).toBe(apiKey)
    })

    it('should produce different ciphertexts for same plaintext (due to IV)', () => {
      const apiKey = 'sk-test-12345678901234567890'
      const encrypted1 = encryptApiKey(apiKey, testSecret)
      const encrypted2 = encryptApiKey(apiKey, testSecret)
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should include IV in encrypted output', () => {
      const apiKey = 'sk-test-12345678901234567890'
      const encrypted = encryptApiKey(apiKey, testSecret)
      const [ivHex, encryptedData] = encrypted.split(':')
      expect(ivHex).toHaveLength(32) // 16 bytes = 32 hex chars
      expect(encryptedData).toBeTruthy()
    })

    it('should throw on invalid ciphertext format', () => {
      expect(() => decryptApiKey('invalid', testSecret)).toThrow()
    })

    it('should throw on tampered ciphertext', () => {
      const apiKey = 'sk-test-12345678901234567890'
      const encrypted = encryptApiKey(apiKey, testSecret)
      const [ivHex, encryptedData] = encrypted.split(':')
      // Tamper with the encrypted data
      const tampered = `${ivHex}:${encryptedData.slice(0, -1)}F`
      expect(() => decryptApiKey(tampered, testSecret)).toThrow()
    })

    it('should fail with wrong secret', () => {
      const apiKey = 'sk-test-12345678901234567890'
      const encrypted = encryptApiKey(apiKey, testSecret)
      const wrongSecret = 'wrong-secret-key-32-chars-long!!'
      expect(() => decryptApiKey(encrypted, wrongSecret)).toThrow()
    })
  })

  describe('getEncryptionSecret', () => {
    it('should return JWT_SECRET if AGENT_ENCRYPTION_SECRET is not set', () => {
      // Save original env
      const original = process.env.AGENT_ENCRYPTION_SECRET
      delete process.env.AGENT_ENCRYPTION_SECRET
      process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long!!!!'

      const secret = getEncryptionSecret()
      expect(secret).toBe('test-jwt-secret-32-chars-long!!!!')

      // Restore
      if (original) process.env.AGENT_ENCRYPTION_SECRET = original
      else delete process.env.JWT_SECRET
    })

    it('should prefer AGENT_ENCRYPTION_SECRET over JWT_SECRET', () => {
      process.env.AGENT_ENCRYPTION_SECRET = 'agent-encryption-secret-32!!!!' // 30 chars
      process.env.JWT_SECRET = 'jwt-secret-32-chars-long-long!!!!'

      const secret = getEncryptionSecret()
      expect(secret).toBe('agent-encryption-secret-32!!!!' + '00') // padded to 32

      // Cleanup
      delete process.env.AGENT_ENCRYPTION_SECRET
      delete process.env.JWT_SECRET
    })

    it('should throw if neither env var is set', () => {
      const original1 = process.env.AGENT_ENCRYPTION_SECRET
      const original2 = process.env.JWT_SECRET
      delete process.env.AGENT_ENCRYPTION_SECRET
      delete process.env.JWT_SECRET

      expect(() => getEncryptionSecret()).toThrow(
        'AGENT_ENCRYPTION_SECRET or JWT_SECRET environment variable is required'
      )

      // Restore
      if (original1) process.env.AGENT_ENCRYPTION_SECRET = original1
      if (original2) process.env.JWT_SECRET = original2
    })

    it('should pad short secrets to 32 characters', () => {
      const original = process.env.AGENT_ENCRYPTION_SECRET
      process.env.AGENT_ENCRYPTION_SECRET = 'short'
      delete process.env.JWT_SECRET

      const secret = getEncryptionSecret()
      expect(secret).toBe('short' + '0'.repeat(27))

      // Cleanup
      if (original) process.env.AGENT_ENCRYPTION_SECRET = original
      else delete process.env.AGENT_ENCRYPTION_SECRET
    })
  })

  describe('generateSecureToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(64)
      expect(/^[a-f0-9]+$/.test(token)).toBe(true)
    })

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('encryptSensitiveData / decryptSensitiveData', () => {
    const testData = 'sensitive-data-123'

    it('should encrypt and decrypt using default secret', () => {
      // Set up env for this test
      const original = process.env.AGENT_ENCRYPTION_SECRET
      process.env.AGENT_ENCRYPTION_SECRET = testSecret

      const encrypted = encryptSensitiveData(testData)
      const decrypted = decryptSensitiveData(encrypted)
      expect(decrypted).toBe(testData)

      // Cleanup
      if (original) process.env.AGENT_ENCRYPTION_SECRET = original
      else delete process.env.AGENT_ENCRYPTION_SECRET
    })

    it('should use custom secret when provided', () => {
      const customSecret = 'custom-secret-key-32-chars-long!!'
      const encrypted = encryptSensitiveData(testData, customSecret)
      const decrypted = decryptSensitiveData(encrypted, customSecret)
      expect(decrypted).toBe(testData)
    })
  })
})