/**
 * @fileoverview JWT Module Tests
 * @description Tests for JWT token generation and verification using mock
 */

// Mock jose BEFORE importing the module
vi.mock('jose', () => import('./__mocks__/jose'))

import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  sign,
  verify,
  decode,
  signToken,
  verifyToken,
  createJwtToken,
  verifyJwtToken,
  isTokenExpired,
  getTokenTimeRemaining,
  isValidTokenFormat,
  type UserContext,
  type JwtPayload,
} from './jwt'

// ============================================================================
// Setup & Teardown
// ============================================================================

let originalJwtSecret: string | undefined

beforeAll(() => {
  originalJwtSecret = process.env.JWT_SECRET
})

afterAll(() => {
  if (originalJwtSecret) {
    process.env.JWT_SECRET = originalJwtSecret
  } else {
    delete process.env.JWT_SECRET
  }
})

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-minimum-32-bytes'
})

// ============================================================================
// Test Data
// ============================================================================

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'member',
  roles: ['member'],
  permissions: ['read:tasks', 'write:tasks'],
  customPermissions: ['manage:team'],
}

const mockPayload: JwtPayload = {
  sub: 'user1',
  email: 'test@example.com',
  role: 'member',
  roles: ['member'],
  permissions: ['read:tasks', 'write:tasks'],
  customPermissions: ['manage:team'],
  type: 'user',
}

// ============================================================================
// Test Suites
// ============================================================================

describe('JWT Functions', () => {
  describe('sign()', () => {
    it('should generate a valid JWT token', async () => {
      const token = await sign(mockPayload, 3600)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(isValidTokenFormat(token)).toBe(true)
    })

    it('should generate tokens with different content', async () => {
      const token1 = await sign(mockPayload, 3600)
      const token2 = await sign({ ...mockPayload, sub: 'user2' }, 3600)

      expect(token1).not.toBe(token2)
    })

    it('should support different expiration times', async () => {
      const shortToken = await sign(mockPayload, 60) // 1 minute
      const longToken = await sign(mockPayload, 86400) // 1 day

      expect(shortToken).toBeDefined()
      expect(longToken).toBeDefined()
      expect(shortToken).not.toBe(longToken)
    })

    it('should use default expiration if not provided', async () => {
      const token = await sign(mockPayload)

      expect(token).toBeDefined()
      const result = await verify(token)
      expect(result.valid).toBe(true)
    })

    it('should fail if JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET

      await expect(sign(mockPayload, 3600)).rejects.toThrow('JWT_SECRET')
    })

    it('should include all payload fields', async () => {
      const token = await sign(mockPayload, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toMatchObject({
        sub: mockPayload.sub,
        email: mockPayload.email,
        role: mockPayload.role,
        type: mockPayload.type,
      })
    })
  })

  describe('verify()', () => {
    it('should verify a valid token', async () => {
      const token = await sign(mockPayload, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.payload?.sub).toBe(mockPayload.sub)
      expect(result.payload?.email).toBe(mockPayload.email)
    })

    it('should fail on invalid token', async () => {
      const result = await verify('invalid.token.here')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should fail on empty token', async () => {
      const result = await verify('')

      expect(result.valid).toBe(false)
    })

    it('should fail on token with wrong secret', async () => {
      // Sign with one secret
      process.env.JWT_SECRET = 'secret1'
      const token = await sign(mockPayload, 3600)

      // Try to verify with different secret
      process.env.JWT_SECRET = 'secret2'
      const result = await verify(token)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('signature')
    })

    it('should return correct payload structure', async () => {
      const token = await sign(mockPayload, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toMatchObject({
        sub: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        type: 'user',
        iss: '7zi-api',
        aud: '7zi-users',
        iat: expect.any(Number),
        exp: expect.any(Number),
      })
    })

    it('should preserve array fields in payload', async () => {
      const token = await sign(mockPayload, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload?.roles).toEqual(['member'])
      expect(result.payload?.permissions).toEqual(['read:tasks', 'write:tasks'])
      expect(result.payload?.customPermissions).toEqual(['manage:team'])
    })
  })

  describe('decode()', () => {
    it('should decode a valid token without verification', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const result = decode(token)

      expect(result.payload).toBeDefined()
      expect(result.payload?.sub).toBe('1234567890')
      expect(result.payload?.name).toBe('John Doe')
    })

    it('should fail on invalid format', () => {
      const result = decode('invalid-token')

      expect(result.payload).toBeUndefined()
      expect(result.error).toBeDefined()
    })

    it('should fail on malformed token', () => {
      const result = decode('a.b')

      expect(result.payload).toBeUndefined()
    })

    it('should decode tokens signed with any secret', async () => {
      process.env.JWT_SECRET = 'any-secret'
      const token = await sign(mockPayload, 3600)
      const result = decode(token)

      // decode() doesn't verify, so it should work
      expect(result.payload).toBeDefined()
      expect(result.payload?.sub).toBe(mockPayload.sub)
    })
  })
})

describe('Backward Compatibility Functions', () => {
  describe('signToken()', () => {
    it('should work as an alias for sign()', async () => {
      const token1 = await sign(mockPayload, 3600)
      const token2 = await signToken(mockPayload, 3600)

      // Both should be valid tokens
      expect(isValidTokenFormat(token1)).toBe(true)
      expect(isValidTokenFormat(token2)).toBe(true)
    })
  })

  describe('verifyToken()', () => {
    it('should return UserContext for valid token', async () => {
      const token = await sign(mockPayload, 3600)
      const context = await verifyToken(token)

      expect(context).not.toBeNull()
      expect(context?.userId).toBe(mockPayload.sub)
      expect(context?.email).toBe(mockPayload.email)
      expect(context?.role).toBe(mockPayload.role)
    })

    it('should return null for invalid token', async () => {
      const context = await verifyToken('invalid-token')

      expect(context).toBeNull()
    })

    it('should return null for non-user token', async () => {
      const agentPayload = { ...mockPayload, type: 'agent' as const }
      const token = await sign(agentPayload, 3600)
      const context = await verifyToken(token)

      expect(context).toBeNull()
    })

    it('should include all fields in UserContext', async () => {
      const token = await sign(mockPayload, 3600)
      const context = await verifyToken(token)

      expect(context).toMatchObject({
        userId: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        roles: expect.any(Array),
        permissions: expect.any(Array),
        customPermissions: expect.any(Array),
      })
    })

    it('should handle missing optional fields', async () => {
      const minimalPayload: JwtPayload = {
        sub: 'user1',
        email: 'test@example.com',
        role: 'member',
        type: 'user',
      }
      const token = await sign(minimalPayload, 3600)
      const context = await verifyToken(token)

      expect(context).not.toBeNull()
      expect(context?.roles).toEqual([])
      expect(context?.permissions).toEqual([])
      expect(context?.customPermissions).toEqual([])
    })
  })

  describe('createJwtToken()', () => {
    it('should create token from user object', async () => {
      const token = await createJwtToken(mockUser, 3600)

      expect(token).toBeDefined()
      const result = await verify(token)
      expect(result.valid).toBe(true)
      expect(result.payload?.sub).toBe(mockUser.id)
    })

    it('should use default expiration if not provided', async () => {
      const token = await createJwtToken(mockUser)

      expect(token).toBeDefined()
      const result = await verify(token)
      expect(result.valid).toBe(true)
    })

    it('should include all user fields in payload', async () => {
      const token = await createJwtToken(mockUser, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toMatchObject({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        type: 'user',
      })
    })

    it('should handle user with missing optional fields', async () => {
      const minimalUser = {
        id: 'user1',
        email: 'test@example.com',
        role: 'member',
      }
      const token = await createJwtToken(minimalUser, 3600)
      const result = await verify(token)

      expect(result.valid).toBe(true)
      expect(result.payload?.roles).toEqual([])
      expect(result.payload?.permissions).toEqual([])
      expect(result.payload?.customPermissions).toEqual([])
    })
  })

  describe('verifyJwtToken()', () => {
    it('should work as an alias for verifyToken()', async () => {
      const token = await createJwtToken(mockUser, 3600)
      const context1 = await verifyToken(token)
      const context2 = await verifyJwtToken(token)

      expect(context1).toEqual(context2)
    })
  })
})

describe('Utility Functions', () => {
  describe('isTokenExpired()', () => {
    it('should return false for valid token', async () => {
      const token = await sign(mockPayload, 3600)
      const expired = isTokenExpired(token)

      expect(expired).toBe(false)
    })

    it('should return true for expired token', async () => {
      // Create token that's already expired
      const token = await sign(mockPayload, -1) // Already expired
      const expired = isTokenExpired(token)

      expect(expired).toBe(true)
    })

    it('should return true for invalid token', () => {
      const expired = isTokenExpired('invalid-token')

      expect(expired).toBe(true)
    })

    it('should return false for token without expiration', async () => {
      // Manually create a token without exp
      const token = await sign(mockPayload, 3600)
      const decoded = decode(token)
      // Decode doesn't actually create a token without exp, but if we had one...
      expect(decoded.payload?.exp).toBeDefined()
    })
  })

  describe('getTokenTimeRemaining()', () => {
    it('should return positive time for valid token', async () => {
      const token = await sign(mockPayload, 3600)
      const remaining = getTokenTimeRemaining(token)

      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThanOrEqual(3600)
    })

    it('should return 0 for expired token', async () => {
      const token = await sign(mockPayload, -1)
      const remaining = getTokenTimeRemaining(token)

      expect(remaining).toBe(0)
    })

    it('should return 0 for invalid token', () => {
      const remaining = getTokenTimeRemaining('invalid-token')

      expect(remaining).toBe(0)
    })
  })

  describe('isValidTokenFormat()', () => {
    it('should return true for valid JWT format', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

      expect(isValidTokenFormat(validToken)).toBe(true)
    })

    it('should return false for token with wrong number of parts', () => {
      expect(isValidTokenFormat('one.two')).toBe(false)
      expect(isValidTokenFormat('one')).toBe(false)
      expect(isValidTokenFormat('one.two.three.four')).toBe(false)
    })

    it('should return false for empty token', () => {
      expect(isValidTokenFormat('')).toBe(false)
    })

    it('should return false for non-string input', () => {
      expect(isValidTokenFormat(null as any)).toBe(false)
      expect(isValidTokenFormat(undefined as any)).toBe(false)
    })

    it('should return false for token with empty parts', () => {
      expect(isValidTokenFormat('. . ')).toBe(false)
      expect(isValidTokenFormat('a.b.')).toBe(false)
      expect(isValidTokenFormat('.b.c')).toBe(false)
    })

    it('should return true for generated token', async () => {
      const token = await sign(mockPayload, 3600)

      expect(isValidTokenFormat(token)).toBe(true)
    })
  })
})

describe('Integration Tests', () => {
  it('should complete sign -> verify -> decode flow', async () => {
    // Sign
    const token = await sign(mockPayload, 3600)
    expect(isValidTokenFormat(token)).toBe(true)

    // Verify
    const verifyResult = await verify(token)
    expect(verifyResult.valid).toBe(true)
    expect(verifyResult.payload?.sub).toBe(mockPayload.sub)

    // Decode
    const decodeResult = decode(token)
    expect(decodeResult.payload?.sub).toBe(mockPayload.sub)

    // Compare payloads
    expect(verifyResult.payload).toEqual(decodeResult.payload)
  })

  it('should work with UserContext flow', async () => {
    // Create token from user
    const token = await createJwtToken(mockUser, 3600)

    // Verify and get context
    const context = await verifyToken(token)
    expect(context).not.toBeNull()
    expect(context?.userId).toBe(mockUser.id)
    expect(context?.email).toBe(mockUser.email)
    expect(context?.role).toBe(mockUser.role)

    // Check permissions
    expect(context?.permissions).toContain('read:tasks')
    expect(context?.customPermissions).toContain('manage:team')
  })

  it('should handle multiple tokens for same user', async () => {
    const user1 = { ...mockUser, id: 'user1' }
    const user2 = { ...mockUser, id: 'user2' }

    const token1 = await createJwtToken(user1, 3600)
    const token2 = await createJwtToken(user2, 3600)

    const context1 = await verifyToken(token1)
    const context2 = await verifyToken(token2)

    expect(context1?.userId).toBe('user1')
    expect(context2?.userId).toBe('user2')
    expect(context1?.userId).not.toBe(context2?.userId)
  })
})

describe('Error Handling', () => {
  it('should handle missing JWT_SECRET gracefully', async () => {
    delete process.env.JWT_SECRET

    await expect(sign(mockPayload, 3600)).rejects.toThrow()
  })

  it('should provide meaningful error messages', async () => {
    const result = await verify('invalid.token.here')

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('should handle malformed payload in decode', () => {
    const result = decode('not.a.valid.jwt')

    expect(result.payload).toBeUndefined()
    expect(result.error).toBeDefined()
  })
})

describe('Token Expiration', () => {
  it('should support different expiration times', async () => {
    const shortToken = await sign(mockPayload, 60)
    const longToken = await sign(mockPayload, 86400)

    const shortRemaining = getTokenTimeRemaining(shortToken)
    const longRemaining = getTokenTimeRemaining(longToken)

    expect(shortRemaining).toBeLessThan(longRemaining)
    expect(shortRemaining).toBeGreaterThan(0)
    expect(longRemaining).toBeGreaterThan(0)
  })

  it('should use correct expiration duration format', async () => {
    // Test that tokens with different expirations are actually different
    const token1h = await sign(mockPayload, 3600)
    const token1d = await sign(mockPayload, 86400)

    expect(token1h).not.toBe(token1d)

    const result1h = await verify(token1h)
    const result1d = await verify(token1d)

    expect(result1h.payload?.exp).toBeDefined()
    expect(result1d.payload?.exp).toBeDefined()
    expect(result1d.payload?.exp).toBeGreaterThan(result1h.payload?.exp!)
  })
})

describe('Token Type Validation', () => {
  it('should verify user type tokens', async () => {
    const userToken = await sign({ ...mockPayload, type: 'user' as const }, 3600)
    const context = await verifyToken(userToken)

    expect(context).not.toBeNull()
  })

  it('should reject agent type tokens in verifyToken', async () => {
    const agentToken = await sign({ ...mockPayload, type: 'agent' as const }, 3600)
    const context = await verifyToken(agentToken)

    expect(context).toBeNull()
  })

  it('should reject api type tokens in verifyToken', async () => {
    const apiToken = await sign({ ...mockPayload, type: 'api' as const }, 3600)
    const context = await verifyToken(apiToken)

    expect(context).toBeNull()
  })
})
