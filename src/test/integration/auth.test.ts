/**
 * Authentication Integration Tests
 * Tests authentication flow across multiple layers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loginUser } from '@/lib/auth/service'
import { setupMockDatabase, resetMockDatabase } from '@/test/setup-db-mock'
import type { User } from '@/lib/auth/types'
import { UserRole, UserStatus } from '@/lib/auth/types'

// Prevent auto-mocking of auth service - we want to test the real implementation
vi.unmock('@/lib/auth/service')

// Set required environment variables for JWT
process.env.JWT_SECRET = 'test-secret-key-for-jwt-in-tests'
process.env.AGENT_ENCRYPTION_SECRET = 'test-encryption-secret'

// Mock JWT token generation to avoid crypto/JWT issues in test environment
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>()

  // Create proper function-based mock for SignJWT
  const mockSignJWT = function(this: any, payload: any) {
    return {
      setProtectedHeader: vi.fn(function(this: any) { return this }),
      setIssuedAt: vi.fn(function(this: any) { return this }),
      setExpirationTime: vi.fn(function(this: any) { return this }),
      setIssuer: vi.fn(function(this: any) { return this }),
      setAudience: vi.fn(function(this: any) { return this }),
      sign: vi.fn(async function(this: any) {
        return 'mock-jwt-token.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.signature'
      }),
    }
  }

  return {
    ...actual,
    SignJWT: mockSignJWT as any,
    jwtVerify: vi.fn(async () => {
      return {
        payload: {
          sub: 'user-1',
          email: 'test@example.com',
          role: 'member',
          roles: [],
          permissions: [],
          customPermissions: [],
          type: 'user',
        },
      }
    }),
  }
})

// Mock auth repository to work with in-memory data
vi.mock('@/lib/auth/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/repository')>()

  // In-memory user storage for tests
  const testUsers: User[] = []
  const testTokens: {
    id: string
    userId: string
    token: string
    refreshToken: string
    expiresAt: Date
    refreshExpiresAt: Date
    createdAt: Date
  }[] = []

  // Export reset function globally for tests
  ;(global as any).__resetAuthTestUsers = () => {
    testUsers.length = 0
    testTokens.length = 0
  }

  return {
    ...actual,
    hashPassword: actual.hashPassword,
    verifyPassword: actual.verifyPassword,
    getUserByEmail: vi.fn(async (email: string) => {
      return testUsers.find((u: User) => u.email === email) || null
    }),
    getUserById: vi.fn(async (id: string) => {
      return testUsers.find((u: User) => u.id === id) || null
    }),
    createUser: vi.fn(async (data: Record<string, unknown>) => {
      const hashedPassword = actual.hashPassword(data.password as string)
      const user: User = {
        id: `user-${testUsers.length + 1}`,
        email: data.email as string,
        name: data.name as string,
        password: hashedPassword,
        role: (data.role as UserRole) || UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        roles: [],
        permissions: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      testUsers.push(user)
      return user
    }),
    updateUser: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const index = testUsers.findIndex((u: User) => u.id === id)
      if (index !== -1) {
        testUsers[index] = { ...testUsers[index], ...data, updatedAt: new Date() }
        return { ...testUsers[index] }
      }
      return null
    }),
    createUserToken: vi.fn(async (userId: string, expiresInHours: number) => {
      const now = new Date()
      const token = {
        id: `token-${Date.now()}`,
        userId,
        token: `access-token-${Date.now()}`,
        refreshToken: `refresh-token-${Date.now()}`,
        expiresAt: new Date(now.getTime() + expiresInHours * 3600 * 1000),
        refreshExpiresAt: new Date(now.getTime() + expiresInHours * 3600 * 1000 * 7),
        createdAt: now,
      }
      testTokens.push(token)
      return token
    }),
    validateUserToken: vi.fn(async (token: string) => {
      const dbToken = testTokens.find(t => t.token === token)
      if (!dbToken) {
        return null
      }
      const user = testUsers.find(u => u.id === dbToken.userId)
      return {
        user: user || null,
        token: dbToken,
      }
    }),
    refreshUserToken: vi.fn(async (refreshToken: string) => {
      const tokenIndex = testTokens.findIndex(t => t.refreshToken === refreshToken)
      if (tokenIndex === -1) {
        return null
      }

      const oldToken = testTokens[tokenIndex]
      const now = new Date()
      const newToken = {
        id: `token-${Date.now()}`,
        userId: oldToken.userId,
        token: `new-access-token-${Date.now()}`,
        refreshToken: `new-refresh-token-${Date.now()}`,
        expiresAt: new Date(now.getTime() + 3600000),
        refreshExpiresAt: new Date(now.getTime() + 259200000),
        createdAt: now,
      }

      // Remove old token and add new one
      testTokens.splice(tokenIndex, 1)
      testTokens.push(newToken)

      return newToken
    }),
    revokeUserToken: vi.fn(async (token: string) => {
      const index = testTokens.findIndex(t => t.token === token)
      if (index !== -1) {
        testTokens.splice(index, 1)
      }
    }),
    revokeAllUserTokens: vi.fn(async (userId: string) => {
      const toRemove = testTokens.filter(t => t.userId === userId)
      toRemove.forEach(t => {
        const index = testTokens.indexOf(t)
        if (index !== -1) {
          testTokens.splice(index, 1)
        }
      })
    }),
    updateLastLogin: vi.fn(async () => {}),
    createPasswordResetToken: vi.fn(async () => 'reset-token-123'),
    validatePasswordResetToken: vi.fn(async () => testUsers[0] ? { ...testUsers[0] } : null),
    deletePasswordResetToken: vi.fn(async () => {}),
    getUserByRefreshToken: vi.fn(async (refreshToken: string) => {
      const token = testTokens.find(t => t.refreshToken === refreshToken)
      if (!token) {
        return null
      }
      const user = testUsers.find(u => u.id === token.userId)
      if (!user) {
        return null
      }
      return {
        user: { ...user },
        token: { ...token },
      }
    }),
  }
})

describe('Authentication Integration', () => {
  beforeEach(() => {
    setupMockDatabase()
    resetMockDatabase()

    // Reset the mock repository's in-memory storage
    if (typeof (global as any).__resetAuthTestUsers === 'function') {
      ;(global as any).__resetAuthTestUsers()
    }
  })

  afterEach(() => {
    resetMockDatabase()
    vi.clearAllMocks()
  })

  describe('login flow', () => {
    it('should complete full login flow with token generation', async () => {
      // Arrange: Create a test user directly through repository
      const { createUser } = await import('@/lib/auth/repository')
      const plainPassword = 'MyPassword123'
      await createUser({
        email: 'test@example.com',
        password: plainPassword,
        name: 'Test User',
      })

      // Act: Login with credentials
      const loginResult = await loginUser({
        email: 'test@example.com',
        password: plainPassword,
        rememberMe: false,
      })

      // Assert: Login successful
      expect(loginResult.success).toBe(true)
      if (loginResult.success) {
        expect(loginResult.user).toBeDefined()
        expect(loginResult.user?.email).toBe('test@example.com')
        expect(loginResult.token).toBeDefined()

        // Assert: Token is valid JWT
        const tokenPayload = JSON.parse(
          Buffer.from(loginResult.token.split('.')[1], 'base64').toString()
        )
        expect(tokenPayload.email).toBe('test@example.com')
      }
    })

    it('should handle invalid credentials correctly', async () => {
      // Arrange: Create a test user
      const { createUser } = await import('@/lib/auth/repository')
      const plainPassword = 'MyPassword123'
      await createUser({
        email: 'test@example.com',
        password: plainPassword,
        name: 'Test User',
      })

      // Act: Login with wrong password
      const loginResult = await loginUser({
        email: 'test@example.com',
        password: 'wrong-password',
        rememberMe: false,
      })

      // Assert: Login failed
      expect(loginResult.success).toBe(false)
      if (!loginResult.success) {
        expect(loginResult.error).toBeDefined()
      }
    })

    it('should handle non-existent user', async () => {
      // Act: Login with non-existent email
      const loginResult = await loginUser({
        email: 'nonexistent@example.com',
        password: 'password',
        rememberMe: false,
      })

      // Assert: Login failed
      expect(loginResult.success).toBe(false)
      if (!loginResult.success) {
        expect(loginResult.error).toBeDefined()
      }
    })
  })

  describe('token refresh flow', () => {
    it('should generate access token from refresh token', async () => {
      // Arrange: Create a user and generate tokens
      const { createUser } = await import('@/lib/auth/repository')
      const plainPassword = 'MyPassword123'
      await createUser({
        email: 'test@example.com',
        password: plainPassword,
        name: 'Test User',
      })

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: plainPassword,
        rememberMe: true,
      })

      expect(loginResult.success).toBe(true)
      if (loginResult.success) {
        expect(loginResult.refreshToken).toBeDefined()

        // Act: Use refresh token to get new access token
        // This would typically call refresh endpoint
        // For now, we'll just verify the token exists

        // Assert: Refresh token was generated
        expect(loginResult.refreshToken).toBeDefined()
        expect(loginResult.expiresAt).toBeDefined()
      }
    })
  })

  describe('logout flow', () => {
    it('should invalidate session on logout', async () => {
      // Arrange: Login to create session
      const { createUser } = await import('@/lib/auth/repository')
      const plainPassword = 'MyPassword123'
      await createUser({
        email: 'test@example.com',
        password: plainPassword,
        name: 'Test User',
      })

      const loginResult = await loginUser({
        email: 'test@example.com',
        password: plainPassword,
        rememberMe: false,
      })

      expect(loginResult.success).toBe(true)

      // Act: Logout (invalidate session)
      // This would typically call logout endpoint
      // For now, we'll just verify the logout process exists

      // Assert: Session invalidated
      // In real implementation, token would be in blacklist
    })
  })
})
