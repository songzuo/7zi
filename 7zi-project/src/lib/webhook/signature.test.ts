/**
 * Webhook Signature Tests
 * v1.12.0 - Webhook Event Notification System
 */

import {
  generateSignature,
  generateSignatureHeaders,
  verifySignature,
  verifySignatureFromHeaders,
  hasValidSignatureHeaders,
  extractSignatureHeaders,
  normalizeHeaders,
} from './signature'

describe('Webhook Signature', () => {
  const secret = 'test-secret-12345'
  const payload = { id: '123', type: 'agent.created', data: { name: 'Test' } }

  describe('generateSignature', () => {
    it('should generate a valid signature', () => {
      const signature = generateSignature(payload, secret)

      expect(signature).toBeDefined()
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)
    })

    it('should generate the same signature for same input', () => {
      const timestamp = Date.now()
      const sig1 = generateSignature(payload, secret, timestamp)
      const sig2 = generateSignature(payload, secret, timestamp)

      expect(sig1).toBe(sig2)
    })

    it('should handle string payloads', () => {
      const signature = generateSignature('test-payload', secret)

      expect(signature).toBeDefined()
      expect(signature).toMatch(/^sha256=/)
    })
  })

  describe('generateSignatureHeaders', () => {
    it('should generate all required headers', () => {
      const headers = generateSignatureHeaders(payload, secret)

      expect(headers.signature).toBeDefined()
      expect(headers.timestamp).toBeDefined()
      expect(headers.nonce).toBeDefined()
      expect(headers.signature).toMatch(/^sha256=/)
    })

    it('should generate unique nonces', () => {
      const headers1 = generateSignatureHeaders(payload, secret)
      const headers2 = generateSignatureHeaders(payload, secret)

      expect(headers1.nonce).not.toBe(headers2.nonce)
    })
  })

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const timestamp = Date.now()
      const signature = generateSignature(payload, secret, timestamp)
      const result = verifySignature(payload, signature, secret, timestamp)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const result = verifySignature(payload, 'sha256=invalid', secret, Date.now())

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject signature with wrong secret', () => {
      const signature = generateSignature(payload, secret)
      const result = verifySignature(payload, signature, 'wrong-secret')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Signature mismatch')
    })

    it('should reject signature with wrong format', () => {
      const result = verifySignature(payload, 'invalid-format', secret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid signature format')
    })

    it('should reject timestamp too old', () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000 // 10 minutes ago
      const signature = generateSignature(payload, secret, oldTimestamp)
      const result = verifySignature(payload, signature, secret, oldTimestamp)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Timestamp')
    })

    it('should reject timestamp in future', () => {
      const futureTimestamp = Date.now() + 10 * 60 * 1000 // 10 minutes future
      const signature = generateSignature(payload, secret, futureTimestamp)
      const result = verifySignature(payload, signature, secret, futureTimestamp)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Timestamp')
    })
  })

  describe('verifySignatureFromHeaders', () => {
    it('should verify signature from headers', () => {
      const headers = generateSignatureHeaders(payload, secret)
      const requestHeaders: Record<string, string> = {
        'x-webhook-signature': headers.signature,
        'x-webhook-timestamp': headers.timestamp,
      }

      // Only add nonce if it exists
      if (headers.nonce) {
        requestHeaders['x-webhook-nonce'] = headers.nonce
      }

      const result = verifySignatureFromHeaders(requestHeaders, payload, secret)

      expect(result.valid).toBe(true)
    })

    it('should reject missing signature header', () => {
      const result = verifySignatureFromHeaders({}, payload, secret)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing signature header')
    })
  })

  describe('hasValidSignatureHeaders', () => {
    it('should return true for valid headers', () => {
      const headers = {
        'x-webhook-signature': 'sha256=abc',
        'x-webhook-timestamp': '1234567890',
      }

      expect(hasValidSignatureHeaders(headers)).toBe(true)
    })

    it('should return false for missing headers', () => {
      expect(hasValidSignatureHeaders({})).toBe(false)
      expect(hasValidSignatureHeaders({ 'x-webhook-signature': 'sha256=abc' })).toBe(false)
    })
  })

  describe('extractSignatureHeaders', () => {
    it('should extract all signature headers', () => {
      const headers = {
        'x-webhook-signature': 'sha256=abc',
        'x-webhook-timestamp': '1234567890',
        'x-webhook-nonce': 'xyz123',
      }

      const extracted = extractSignatureHeaders(headers)

      expect(extracted).toBeDefined()
      expect(extracted?.signature).toBe('sha256=abc')
      expect(extracted?.timestamp).toBe('1234567890')
      expect(extracted?.nonce).toBe('xyz123')
    })

    it('should return null for missing required headers', () => {
      expect(extractSignatureHeaders({})).toBeNull()
    })
  })

  describe('normalizeHeaders', () => {
    it('should normalize headers to lowercase', () => {
      const headers = {
        'X-Webhook-Signature': 'sha256=abc',
        'X-WEBHOOK-TIMESTAMP': '1234567890',
      }

      const normalized = normalizeHeaders(headers)

      expect(normalized['x-webhook-signature']).toBe('sha256=abc')
      expect(normalized['x-webhook-timestamp']).toBe('1234567890')
    })

    it('should handle array values', () => {
      const headers = {
        'Set-Cookie': ['cookie1', 'cookie2'],
      }

      const normalized = normalizeHeaders(headers)

      expect(normalized['set-cookie']).toBe('cookie1')
    })

    it('should skip undefined values', () => {
      const headers = {
        'x-webhook-signature': 'sha256=abc',
        'x-empty': undefined,
      }

      const normalized = normalizeHeaders(headers)

      expect(normalized['x-webhook-signature']).toBe('sha256=abc')
      expect(normalized['x-empty']).toBeUndefined()
    })
  })
})
